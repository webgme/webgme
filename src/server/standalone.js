define(['logManager',
    'storage/serverstorage',
    'fs',
    'express',
    'express-session',
    'compression',
    'cookie-parser',
    'body-parser',
    'method-override',
    'connect-multiparty',
    'auth/gmeauth',
    'auth/sessionstore',
    'passport',
    'passport-google',
    'util/newrest',
    'util/cJson',
    'path',
    'http',
    'https',
    'os',
    'mime',
    'blob/BlobMetadata',
    'blob/BlobFSBackend',
    'blob/BlobS3Backend',
    'blob/BlobServer',
    'util/guid',
    'util/assert',
    'url'
], function (LogManager,
             Storage,
             FS,
             Express,
             session,
             compression,
             cookieParser,
             bodyParser,
             methodOverride,
             multipart,
             GMEAUTH,
             SSTORE,
             Passport,
             PassGoogle,
             REST,
             CANON,
             Path,
             Http,
             Https,
             OS,
             mime,
             BlobMetadata,
             BlobFSBackend,
             BlobS3Backend,
             BlobServer,
             GUID,
             ASSERT,
             URL) {
    'use strict';
    function StandAloneServer(gmeConfig) {
        var self = this,
            clientConfig = require(Path.join(requirejs.s.contexts._.config.baseUrl,
                '../config/getclientconfig'))(gmeConfig);
        this.serverUrl = '';

        /**
         * Gets the server's url based on the gmeConfig that was given to the constructor.
         * @returns {string}
         */
        function getUrl () {
            var url = '';

            // use the cached version if we already built the string
            if (self.serverUrl) {
                return self.serverUrl;
            }

            if (gmeConfig.server.https.enable) {
                url += 'https://';
            } else {
                url += 'http://';
            }

            url += '127.0.0.1';
            url += ':';
            url += gmeConfig.server.port;

            // cache it
            self.serverUrl = url;
            return self.serverUrl;
        }

        //public functions
        function start(callback) {
            if (typeof callback !== 'function') {
                callback = function () {
                };
            }
            if (gmeConfig.server.https.enable) {
                __httpServer = Https.createServer({
                    key: __secureSiteInfo.key,
                    cert: __secureSiteInfo.certificate
                }, __app).listen(gmeConfig.server.port, callback);
            } else {
                __httpServer = Http.createServer(__app).listen(gmeConfig.server.port, callback);
            }
            //creating the proper storage for the standalone server
            __storageOptions = {
                combined: __httpServer,
                logger: LogManager.create('StandAloneWebGMEServer-socket.io')
            };
            if (true === gmeConfig.authentication.enable) {
                __storageOptions.sessioncheck = __sessionStore.check;
                __storageOptions.authorization = globalAuthorization;
                __storageOptions.auth_deleteProject = __gmeAuth.deleteProject;
                __storageOptions.getAuthorizationInfo = __gmeAuth.getProjectAuthorizationBySession;
            }

            __storageOptions.log = LogManager.create('StandAloneWebGMEServer-storage');
            __storageOptions.getToken = __gmeAuth.getToken;

            __storageOptions.sessionToUser = __sessionStore.getSessionUser;

            __storageOptions.globConf = gmeConfig;
            __storage = Storage(__storageOptions); // FIXME: why do not we use the 'new' keyword here?
            //end of storage creation
            __storage.open();
        }

        function stop(callback) {
            try {
                __storage.close();
                __httpServer.close(callback);
            } catch (e) {
                //ignore errors
                callback(e);
            }
        }

        //internal functions
        function globalAuthorization(sessionId, projectName, type, callback) {
            __sessionStore.get(sessionId, function (err, data) {
                if (!err && data) {
                    switch (data.userType) {
                        case 'GME':
                            if (type === 'create') {
                                __gmeAuth.getAllUserAuthInfoBySession(sessionId)
                                    .then(function (authInfo) {
                                        if (authInfo.canCreate !== true) {
                                            return false;
                                        }
                                        return __gmeAuth.authorize(sessionId, projectName, 'create')
                                            .then(function () {
                                                return true;
                                            });
                                }).nodeify(callback);
                            } else {
                                __gmeAuth.getProjectAuthorizationBySession(sessionId, projectName, function (err, authInfo) {
                                    callback(err, authInfo[type] === true);
                                });
                            }
                            break;
                        default:
                            callback('unknown user type', false);
                    }
                } else {
                    err = err || 'session not found';
                    callback(err, false);
                }
            });
        }
        function getRedirectUrlParameter(req){
            //return '?redirect=' + URL.addSpecialChars(req.url);
            return '?redirect=' + encodeURIComponent(req.originalUrl);
        }
        function redirectUrl(req,res){
            if(req.query.redirect){
                //res.redirect(URL.removeSpecialChars(req.query.redirect));
                res.redirect(decodeURIComponent(req.query.redirect));
            } else {
                res.redirect('/');
            }
        }


        function checkGoogleAuthentication(req, res, next) {
            if (__googleAuthenticationSet === true) {
                return next();
            } else {
                var protocolPrefix = gmeConfig.server.https.enable === true ? 'https://' : 'http://';
                Passport.use(new __googleStrategy({
                        returnURL: protocolPrefix + req.headers.host + '/login/google/return',
                        realm: protocolPrefix + req.headers.host
                    },
                    function (identifier, profile, done) {
                        return done(null, {id: profile.emails[0].value});
                    }
                ));
                __googleAuthenticationSet = true;
                return next();
            }
        }

        function checkREST(req, res, next) {
            var baseUrl = gmeConfig.server.https.enable === true ? 'https://' : 'http://' + req.headers.host + '/rest';
            if (__REST === null) {
                var restAuthorization;
                if (gmeConfig.authentication.enable === true) {
                    restAuthorization = __gmeAuth.tokenAuthorization;
                }
                __REST = new REST({
                    globConf: gmeConfig,
                    baseUrl: baseUrl,
                    authorization: restAuthorization
                });
            } else {
                __REST.setBaseUrl(baseUrl);
            }
            return next();
        }


        function ensureAuthenticated(req, res, next) {
            if (true === gmeConfig.authentication.enable) {
                if (req.isAuthenticated() || (req.session && true === req.session.authenticated)) {
                    return next();
                } else {
                    //client oriented new session
                    if (req.headers.webgmeclientsession) {
                        __sessionStore.get(req.headers.webgmeclientsession, function (err, clientSession) {
                            if (!err) {
                                if (clientSession.authenticated) {
                                    req.session.authenticated = true;
                                    req.session.udmId = clientSession.udmId;
                                    res.cookie('webgme', req.session.udmId);
                                    return next();
                                } else {
                                    res.sendStatus(400); //TODO find proper error code
                                }
                            } else {
                                res.sendStatus(400); //TODO find proper error code
                            }
                        });
                    }
                    //request which use token may be authenticated directly
                    else if (req.headers.webGMEToken) {
                        __gmeAuth.checkToken(req.headers.webGMEToken, function (isOk, userId) {
                            if (isOk) {
                                req.session.authenticated = true;
                                req.session.udmId = userId;
                                res.cookie('webgme', req.session.udmId);
                                return next();
                            } else {
                                res.sendStatus(400); //no use for redirecting in this case
                            }
                        });
                    } else if (gmeConfig.authentication.allowGuests) {
                        req.session.authenticated = true;
                        req.session.udmId = gmeConfig.authentication.guestAccount;
                        req.session.userType = 'GME';
                        res.cookie('webgme', req.session.udmId);
                        return next();
                    } else {
                        res.redirect('/login'+getRedirectUrlParameter(req));
                    }
                }
            } else {
                return next();
            }
        }

        function prepClientLogin(req, res, next) {
            req.__gmeAuthFailUrl__ = '/login/client/fail';
            next();
        }

        function isGoodExtraAsset(name, path) {
            try {
                var file = FS.readFileSync(path + '/' + name + '.js', 'utf-8');
                if (file === undefined || file === null) {
                    return false;
                } else {
                    return true;
                }
            } catch (e) {
                return false;
            }
        }

        function getPluginBasePathByName(pluginName) {
            for (var i = 0; i < gmeConfig.plugin.basePaths.length; i++) {
                var additional = FS.readdirSync(gmeConfig.plugin.basePaths[i]);
                for (var j = 0; j < additional.length; j++) {
                    if (additional[j] === pluginName) {
                        if (isGoodExtraAsset(additional[j], Path.join(gmeConfig.plugin.basePaths[i], additional[j]))) {
                            return gmeConfig.plugin.basePaths[i];
                        }
                    }
                }
            }
        }

        function getVisualizersDescriptor() {
            //we merge the contents of the CONFIG.visualizerDescriptors by id
            var indexById = function (objectArray, id) {
                    var i,
                        index = -1;
                    for (i = 0; i < objectArray.length; i++) {
                        if (objectArray[i].id === id) {
                            index = i;
                            break;
                        }
                    }

                    return index;
                },
                getVisualizerDescriptor = function (path) {
                    try {
                        var descriptor = FS.readFileSync(path, 'utf-8');
                        descriptor = JSON.parse(descriptor);
                        return descriptor;
                    } catch (e) {
                        //we do not care much of the error just give back an empty array
                        return [];
                    }
                },
                allVisualizersDescriptor = [],
                i, j;

            for (i = 0; i < gmeConfig.visualization.visualizerDescriptors.length; i++) {
                var descriptor = getVisualizerDescriptor(gmeConfig.visualization.visualizerDescriptors[i]);
                if (descriptor.length) {
                    for (j = 0; j < descriptor.length; j++) {
                        var index = indexById(allVisualizersDescriptor, descriptor[j].id);
                        if (index !== -1) {
                            allVisualizersDescriptor[index] = descriptor[j];
                        } else {
                            allVisualizersDescriptor.push(descriptor[j]);
                        }
                    }
                }
            }
            return allVisualizersDescriptor;
        }

        function setupExternalRestModules() {
            var restComponent,
                keys = Object.keys(gmeConfig.rest.components),
                i;
            __logger.info('initializing external REST modules');
            for (i = 0; i < keys.length; i++) {
                restComponent = requirejs(gmeConfig.rest.components[keys[i]]);
                if (restComponent) {
                    __logger.info('adding rest component [' + gmeConfig.rest.components[keys[i]] + '] to' +
                        ' - /rest/external/' + keys[i]);
                    __app.use('/rest/external/' + keys[i], restComponent(gmeConfig, ensureAuthenticated));
                } else {
                    throw new Error('Loading ' + gmeConfig.rest.components[keys[i]] + ' failed.');
                }
            }
        }

        function expressFileSending(httpResult, path) {
            httpResult.sendFile(path, function (err) {
                //TODO we should check for all kind of error that should be handled differently
                if (err && err.code !== 'ECONNRESET') {
                    httpResult.sendStatus(404);
                }
            });
        }

        //here starts the main part
        //variables
        var __logger = null,
            __storage = null,
            __storageOptions = {},
            __gmeAuth = null,
            __secureSiteInfo = {},
            __app = null,
            __sessionStore,
            __users = {},
            __googleAuthenticationSet = false,
            __googleStrategy = PassGoogle.Strategy,
            __REST = null,
            __canCheckToken = true,
            __httpServer = null,
            __logoutUrl = gmeConfig.authentication.logOutUrl || '/',
            __baseDir = requirejs.s.contexts._.config.baseUrl,// TODO: this is ugly
            __clientBaseDir = gmeConfig.client.appDir,
            __requestCounter = 0,
            __reportedRequestCounter = 0,
            __requestCheckInterval = 2500;

        //creating the logmanager
        LogManager.setLogLevel(gmeConfig.log.level);
        LogManager.useColors(true);
        LogManager.setFileLogPath(gmeConfig.log.file);
        __logger = LogManager.create("StandAloneWebGMEServer-main");
        //end of logmanager initializing stuff

        __logger.info("starting standalone server initialization");
        //initializing https extra infos
        if (gmeConfig.server.https.enable === true) { //TODO move this from here
            __secureSiteInfo.key = FS.readFileSync(gmeConfig.server.https.keyFile);
            __secureSiteInfo.certificate = FS.readFileSync(gmeConfig.server.https.certificateFile);
        }

        __logger.info("initializing session storage");
        __sessionStore = new SSTORE();

        __logger.info("initializing authentication modules");
        //TODO: do we need to create this even though authentication is disabled?
        __gmeAuth = new GMEAUTH(__sessionStore, gmeConfig);

        __logger.info("initializing passport module for user management");
        //TODO in the long run this also should move to some database
        Passport.serializeUser(
            function (user, done) {
                __users[user.id] = user;
                done(null, user.id);
            });
        Passport.deserializeUser(
            function (id, done) {
                done(null, __users[id]);
            });

        __logger.info("initializing static server");
        __app = Express();

        //__app.configure(function () {
            //counting of requests works only in debug mode
            if (gmeConfig.debug === true) {
                setInterval(function () {
                    if (__reportedRequestCounter !== __requestCounter) {
                        __reportedRequestCounter = __requestCounter;
                        console.log("...handled " + __reportedRequestCounter + " requests so far...");
                    }
                }, __requestCheckInterval);
                __app.use(function (req, res, next) {
                    __requestCounter++;
                    next();
                });
            }
            __app.use(function (req, res, next) {
                var infoguid = GUID(),
                    infotxt = "request[" + infoguid + "]:" + req.headers.host + " - " + req.protocol.toUpperCase() + "(" + req.httpVersion + ") - " + req.method.toUpperCase() + " - " + req.originalUrl + " - " + req.ip + " - " + req.headers['user-agent'],
                    infoshort = "incoming[" + infoguid + "]: " + req.originalUrl;
                __logger.info(infoshort);
                var end = res.end;
                res.end = function (chunk, encoding) {
                    res.end = end;
                    res.end(chunk, encoding);
                    infotxt += " -> " + res.statusCode;
                    __logger.info(infotxt);
                };
                next();
            });

            __app.use(compression());
            __app.use(cookieParser());
            __app.use(bodyParser.urlencoded({
                extended: true
            }));
            __app.use(bodyParser.json());
            __app.use(methodOverride());
            __app.use(multipart({defer: true})); // required to upload files. (body parser should not be used!)
            __app.use(session({
                store: __sessionStore,
                secret: gmeConfig.server.sessionCookieSecret,
                key: gmeConfig.server.sessionCookieId,
                saveUninitialized: true,
                resave: true
            }));
            __app.use(Passport.initialize());
            __app.use(Passport.session());

            if (gmeConfig.executor.enable) {
                var executorRest = requirejs('executor/Executor');
                __app.use('/rest/executor', executorRest(gmeConfig));
                __logger.info('Executor listening at rest/executor');
            } else {
                __logger.info('Executor not enabled. Add "enableExecutor: true" to config.js for activation.');
            }

            setupExternalRestModules();

        //});

        __logger.info("creating login routing rules for the static server");
        __app.get('/',ensureAuthenticated,function(req,res){
            expressFileSending(res, __clientBaseDir + '/index.html');
        });
        __app.get('/logout', function (req, res) {
            res.clearCookie('webgme');
            res.clearCookie('isisforge'); //todo is this really needed
            req.logout();
            req.session.authenticated = false;
            req.session.userType = 'loggedout';
            res.redirect(__logoutUrl);
        });
        __app.get('/login',function(req,res){
            res.location('/login');
            expressFileSending(res, __clientBaseDir + '/login.html');
        });
        __app.post('/login', function(req, res, next) {
            var queryParams = [];
            var url = URL.parse(req.url, true);
            if (req.body && req.body.username) {
                queryParams.push('username=' + encodeURIComponent(req.body.username));
            }
            if (url && url.query && url.query.redirect) {
                queryParams.push('redirect=' + encodeURIComponent(req.query.redirect));
            }
            req.__gmeAuthFailUrl__ = '/login';
            if (queryParams.length) {
                req.__gmeAuthFailUrl__ += '?' + queryParams.join('&');
            }
            req.__gmeAuthFailUrl__ += '#failed';
            next();
        }, __gmeAuth.authenticate, function(req,res){
            res.cookie('webgme', req.session.udmId);
            redirectUrl(req,res);
        });
        __app.post('/login/client', prepClientLogin, __gmeAuth.authenticate, function (req, res) {
            res.cookie('webgme', req.session.udmId);
            res.sendStatus(200);
        });
        __app.get('/login/client/fail', function (req, res) {
            res.clearCookie('webgme');
            res.sendStatus(401);
        });
        __app.get('/login/google',checkGoogleAuthentication,Passport.authenticate('google'));
        __app.get('/login/google/return',__gmeAuth.authenticate,function(req,res){
            res.cookie('webgme', req.session.udmId);
            redirectUrl(req,res);
        });

        //TODO: only node_worker/index.html and common/util/common are using this
        __logger.info("creating decorator specific routing rules");
        __app.get('/bin/getconfig.js', ensureAuthenticated, function (req, res) {
            res.status(200);
            res.setHeader('Content-type', 'application/javascript');
            res.end("define([],function(){ return " + JSON.stringify(clientConfig) + ";});");
        });

        __logger.info("creating gmeConfig.json specific routing rules");
        __app.get('/gmeConfig.json', ensureAuthenticated, function (req, res) {
            res.status(200);
            res.end(JSON.stringify(clientConfig));
        });

        __logger.info("creating decorator specific routing rules");
        __app.get(/^\/decorators\/.*/, ensureAuthenticated, function (req, res) {
            var tryNext = function (index) {
                if (index < gmeConfig.visualization.decoratorPaths.length) {
                    res.sendFile(Path.join(gmeConfig.visualization.decoratorPaths[index], req.url.substring(12)), function (err) {
                        if (err && err.code !== 'ECONNRESET') {
                            tryNext(index + 1);
                        }
                    });
                } else {
                    res.sendStatus(404);
                }
            };

            if (gmeConfig.visualization.decoratorPaths && gmeConfig.visualization.decoratorPaths.length) {
                tryNext(0);
            } else {
                res.sendStatus(404);
            }
        });

        __logger.info("creating plug-in specific routing rules");
        __app.get(/^\/plugin\/.*/, function (req, res) {
            //first we try to give back the common plugin/modules
            res.sendFile(Path.join(__baseDir, req.path), function (err) {
                if (err && err.code !== 'ECONNRESET') {
                    //this means that it is probably plugin/pluginName or plugin/pluginName/relativePath format so we try to look for those in our config
                    //first we check if we have the plugin registered in our config
                    var urlArray = req.url.split('/'),
                        pluginName = urlArray[2] || null,
                        basePath = getPluginBasePathByName(pluginName),
                        relPath = "";
                    urlArray.shift();
                    urlArray.shift();
                    urlArray.shift();
                    relPath = urlArray.join('/');
                    if (relPath.indexOf('.js') === -1) {
                        relPath += '.js';
                    }

                    if (typeof basePath === 'string' && typeof relPath === 'string') {
                        expressFileSending(res, Path.resolve(Path.join(basePath, relPath)));
                    } else {
                        res.sendStatus(404);
                    }
                }
            });
        });

        __logger.info("creating external library specific routing rules");
        __app.get(/^\/extlib\/.*/, ensureAuthenticated, function (req, res) {
            //first we try to give back the common extlib/modules

            var urlArray = req.path.split('/');
            urlArray[1] = '.';
            urlArray.shift();

            var relPath = urlArray.join('/');
            var absPath = Path.resolve(Path.join(process.cwd(), relPath));
            // must pass the full path
            if (relPath.lastIndexOf('/') === relPath.length - 1) {
                // if URL ends with /, append / to support sending index.html
                absPath = absPath + '/';
            }

            expressFileSending(res, absPath);
        });

        __logger.info("creating basic static content related routing rules");
        //static contents
        //javascripts - core and transportation related files
        __app.get(/^\/(common|config|bin|middleware)\/.*\.js$/, function (req, res) {
            expressFileSending(res, Path.join(__baseDir, req.path));
        });

        //TODO remove this part as this is only temporary!!!
        __app.get('/docs/*', function (req, res) {
            expressFileSending(res, Path.join(__baseDir, '..', req.path));
        });


        __logger.info("creating blob related rules");

        var blobBackend;

        if (gmeConfig.blob.type === 'FS') {
            blobBackend = new BlobFSBackend(gmeConfig);
        } else if (gmeConfig.blob.type === 'S3') {
            //var blobBackend = new BlobS3Backend(gmeConfig);
            throw new Error('S3 blob not fully supported');
        } else {
            throw new Error('Only FS and S3 blobs valid blob types.');
        }

        BlobServer.createExpressBlob(__app, blobBackend, ensureAuthenticated, __logger);

        //client contents - js/html/css
        //stuff that considered not protected 
        __app.get(/^\/.*\.(css|ico|ttf|woff|js|cur)$/, function (req, res) {
            expressFileSending(res, Path.join(__clientBaseDir, req.path));
        });


        __app.get(/^\/.*\.(_js|html|gif|png|bmp|svg|json|map)$/, ensureAuthenticated, function (req, res) {
            //package.json
            if (req.path === '/package.json') {
                expressFileSending(res, Path.join(__baseDir, '..', req.path));
            } else {
                expressFileSending(res, Path.join(__clientBaseDir, req.path));
            }
        });

        __logger.info("creating token related routing rules");
        __app.get('/gettoken',ensureAuthenticated,function(req,res){
            if (gmeConfig.rest.secure) {
                __gmeAuth.getToken(req.session.id, function (err, token) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send(token);
                    }
                });
            } else {
                res.sendStatus(410); //special error for the interpreters to know there is no need for token
            }
        });
        __app.get('/checktoken/:token', function (req, res) {
            if (gmeConfig.authentication.enable === true) { // FIXME do we need to check CONFIG.authentication or session.authenticated?
                if (__canCheckToken === true) {
                    setTimeout(function () {
                        __canCheckToken = true;
                    }, 10000);
                    __canCheckToken = false;
                    __gmeAuth.checkToken(req.params.token, function (isValid) {
                        if (isValid === true) {
                            res.sendStatus(200);
                        } else {
                            res.sendStatus(403);
                        }
                    });
                } else {
                    res.sendStatus(403);
                }
            } else {
                res.sendStatus(410); //special error for the interpreters to know there is no need for token
            }
        });

        //TODO: needs to refactor for the /rest/... format
        __logger.info("creating REST related routing rules");
        __app.get('/rest/:command',ensureAuthenticated,checkREST,function(req,res){
            __REST.initialize(function (err) {
                if (err) {
                    res.sendStatus(500);
                } else {
                    __REST.doRESTCommand(__REST.request.GET, req.params.command, req.headers.webGMEToken, req.query, function (httpStatus, object) {

                        res.header("Access-Control-Allow-Origin", "*");
                        res.header("Access-Control-Allow-Headers", "X-Requested-With");
                        if (req.params.command === __REST.command.etf) {
                            if (httpStatus === 200) {
                                var filename = 'exportedNode.json';
                                if (req.query.output) {
                                    filename = req.query.output;
                                }
                                if (filename.indexOf('.') === -1) {
                                    filename += '.json';
                                }
                                res.header("Content-Type", "application/json");
                                res.header("Content-Disposition", "attachment;filename=\"" + filename + "\"");
                                res.status(httpStatus);
                                res.end(/*CANON*/JSON.stringify(object, null, 2));
                            } else {
                                console.log(httpStatus, JSON.stringify(object, null, 2));
                                res.status(httpStatus).send(object);
                            }
                        } else {
                            res.json(httpStatus, object || null);
                        }
                    });
                }
            });
        });


        __logger.info("creating server-worker related routing rules");
        __app.get('/worker/simpleResult/*', function (req, res) {
            var urlArray = req.url.split('/');
            if (urlArray.length > 3) {
                __storage.getWorkerResult(urlArray[3], function (err, result) {
                    if (err) {
                        res.sendStatus(500);
                    } else {
                        var filename = 'exportedNodes.json';
                        if (urlArray[4]) {
                            filename = urlArray[4];
                        }
                        if (filename.indexOf('.') === -1) {
                            filename += '.json';
                        }
                        res.header("Content-Type", "application/json");
                        res.header("Content-Disposition", "attachment;filename=\"" + filename + "\"");
                        res.status(200);
                        res.end(JSON.stringify(result, null, 2));
                    }
                });
            } else {
                res.sendStatus(404);
            }
        });


        __logger.info("creating list asset rules");
        __app.get('/listAllDecorators', ensureAuthenticated, function (req, res) {
            var names = []; //TODO we add everything in the directories!!!
            for (var i = 0; i < gmeConfig.visualization.decoratorPaths.length; i++) {
                var additional = FS.readdirSync(gmeConfig.visualization.decoratorPaths[i]);
                for (var j = 0; j < additional.length; j++) {
                    if (names.indexOf(additional[j]) === -1) {
                        if (isGoodExtraAsset(additional[j], Path.join(gmeConfig.visualization.decoratorPaths[i], additional[j]))) {
                            names.push(additional[j]);
                        }
                    }
                }
            }
            res.status(200);
            res.setHeader('Content-type', 'application/javascript');
            //res.end("define([],function(){ return "+JSON.stringify(names)+";});");
            res.end("(function(){ WebGMEGlobal.allDecorators = " + JSON.stringify(names) + ";}());");
        });
        __app.get('/listAllPlugins', ensureAuthenticated, function (req, res) {
            var names = []; //we add only the "*.js" files from the directories
            for (var i = 0; i < gmeConfig.plugin.basePaths.length; i++) {
                var additional = FS.readdirSync(gmeConfig.plugin.basePaths[i]);
                for (var j = 0; j < additional.length; j++) {
                    if (names.indexOf(additional[j]) === -1) {
                        if (isGoodExtraAsset(additional[j], Path.join(gmeConfig.plugin.basePaths[i], additional[j]))) {
                            names.push(additional[j]);
                        }
                    }
                }
            }
            res.status(200);
            res.setHeader('Content-type', 'application/javascript');
            //res.end("define([],function(){ return "+JSON.stringify(names)+";});");
            res.end("(function(){ WebGMEGlobal.allPlugins = " + JSON.stringify(names) + ";}());");
        });
        __app.get('/listAllVisualizerDescriptors', ensureAuthenticated, function (req, res) {
            var allVisualizerDescriptors = getVisualizersDescriptor();
            res.status(200);
            res.setHeader('Content-type', 'application/javascript');
            res.end("define([],function(){ return " + JSON.stringify(allVisualizerDescriptors) + ";});");
        });


        __logger.info("creating all other request rule - error 404 -");
        __app.get('*', function (req, res) {
            res.sendStatus(404);
        });

        if (gmeConfig.debug === true) {
            console.log('gmeConfig of webgme server:');
            console.log(gmeConfig);
        }
        var networkIfs = OS.networkInterfaces();
        var addresses = 'Valid addresses of webgme server: ';
        for (var dev in networkIfs) {
            networkIfs[dev].forEach(function (netIf) {
                if (netIf.family === 'IPv4') {
                    var address = (gmeConfig.server.https.enable ? 'https' : 'http') + '://' +
                        netIf.address + ':' + gmeConfig.server.port;
                    addresses = addresses + '  ' + address;
                }
            });
        }

        __logger.info(addresses);
        console.log(addresses);

        __logger.info("standalone server initialization completed");

        return {

            getUrl: getUrl,
            start: start,
            stop: stop
        }
    }

    return StandAloneServer;
});
