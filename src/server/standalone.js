/*globals requireJS*/
/*jshint node:true*/

/**
 * @module Server:StandAlone
 * @author kecso / https://github.com/kecso
 */

'use strict';

var Path = require('path'),
    FS = require('fs'),
    OS = require('os'),
    Q = require('q'),
    Express = require('express'),
    session = require('express-session'),
    compression = require('compression'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    multipart = require('connect-multiparty'),
    Passport = require('passport'),
    PassGoogle = require('passport-google'),
    Http = require('http'),
    Https = require('https'),
    URL = require('url'),
    contentDisposition = require('content-disposition'),

    Mongo = require('./storage/mongo'),
    Storage = require('./storage/safestorage'),
    WebSocket = require('./storage/websocket'),

// Middleware
    BlobServer = require('./middleware/blob/BlobServer'),
    ExecutorServer = require('./middleware/executor/ExecutorServer'),
    api = require('./api'),

//Storage = require('./storage/serverstorage'),
    getClientConfig = require('../../config/getclientconfig'),
    GMEAUTH = require('./middleware/auth/gmeauth'),
    SSTORE = require('./middleware/auth/sessionstore'),
    Logger = require('./logger'),

    ServerWorkerManager = require('./worker/serverworkermanager'),

    webgmeUtils = require('../utils'),

    servers = [],

    mainLogger;


process.on('SIGINT', function () {
    var i,
        error = false,
        numStops = 0;

    function serverOnStop(server) {
        server.stop(function (err) {
            numStops -= 1;
            if (err) {
                error = true;
                server.logger.error('Stopping server failed', {metadata: err});
            } else {
                server.logger.info('Server stopped.');
            }

            if (numStops === 0) {
                if (error) {
                    exit(1);
                } else {
                    exit(0);
                }

            }
        });
    }

    for (i = 0; i < servers.length; i += 1) {
        // stop server gracefully on ctrl+C or cmd+c
        if (servers[i].isRunning) {
            servers[i].logger.info('Requesting server to stop ...');
            numStops += 1;
            serverOnStop(servers[i]);
        }
    }

    function exit(code) {
        process.exit(code);
    }

    if (numStops === 0) {
        exit(0);
    }

});

function StandAloneServer(gmeConfig) {
    var self = this,
        clientConfig = getClientConfig(gmeConfig),
        excludeRegExs = [],
        sockets = [];

    self.id = Math.random().toString(36).slice(2, 11);

    if (mainLogger) {

    } else {
        mainLogger = Logger.createWithGmeConfig('gme', gmeConfig, true);
    }

    this.serverUrl = '';
    this.isRunning = false;

    servers.push(this);

    /**
     * Gets the server's url based on the gmeConfig that was given to the constructor.
     * @returns {string}
     */
    function getUrl() {
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
        var serverDeferred = Q.defer(),
            storageDeferred = Q.defer(),
            gmeAuthDeferred = Q.defer();

        if (typeof callback !== 'function') {
            callback = function () {
            };
        }

        if (self.isRunning) {
            // FIXME: should this be an error?
            callback();
            return;
        }

        sockets = {};


        if (gmeConfig.server.https.enable) {
            __httpServer = Https.createServer({
                key: __secureSiteInfo.key,
                cert: __secureSiteInfo.certificate
            }, __app).listen(gmeConfig.server.port, function () {
                // Note: the listening function does not return with an error, errors are handled by the error event
                logger.debug('Https server is listening on ', {metadata: {port: gmeConfig.server.port}});
                serverDeferred.resolve();
            });
        } else {
            __httpServer = Http.createServer(__app).listen(gmeConfig.server.port, function () {
                // Note: the listening function does not return with an error, errors are handled by the error event
                logger.debug('Http server is listening on ', {metadata: {port: gmeConfig.server.port}});
                serverDeferred.resolve();
            });
        }
        __httpServer.on('connection', function (socket) {
            var socketId = socket.remoteAddress + ':' + socket.remotePort;

            sockets[socketId] = socket;
            logger.debug('socket connected (added to list) ' + socketId);

            socket.on('close', function () {
                if (sockets.hasOwnProperty(socketId)) {
                    logger.debug('socket closed (removed from list) ' + socketId);
                    delete sockets[socketId];
                }
            });
        });

        __httpServer.on('error', function (err) {
            if (err.code === 'EADDRINUSE') {
                logger.error('Failed to start server', {metadata: {port: gmeConfig.server.port, error: err}});
                serverDeferred.reject(err);
            } else {
                logger.error('Server raised an error', {metadata: {port: gmeConfig.server.port, error: err}});
            }
        });

        __storage.openDatabase(function (err) {
            if (err) {
                storageDeferred.reject(err);
            } else {
                __webSocket.start(__httpServer);
                storageDeferred.resolve();
            }
        });

        __gmeAuth.connect(function (err) {
            if (err) {
                logger.error(err);
                gmeAuthDeferred.reject(err);
            } else {
                logger.debug('gmeAuth is ready');
                gmeAuthDeferred.resolve();
            }
        });

        __workerManager.start();

        Q.all([serverDeferred.promise, storageDeferred.promise, gmeAuthDeferred.promise, apiReady])
            .nodeify(function (err) {
                self.isRunning = true;
                callback(err);
            });
    }

    function stop(callback) {
        var key;

        if (self.isRunning === false) {
            // FIXME: should this be an error?
            callback();
            return;
        }

        self.isRunning = false;

        try {
            if (gmeConfig.executor.enable) {
                ExecutorServer.stop();
            }
            // FIXME: is this call synchronous?
            __webSocket.stop();
            //kill all remaining workers
            __workerManager.stop(function (err) {
                var numDestroyedSockets = 0;

                // close storage
                __storage.closeDatabase(function (err1) {
                    __gmeAuth.unload(function (err2) {
                        logger.debug('gmeAuth unloaded');
                        // request server close - do not accept any new connections.
                        // first we have to request the close then we can destroy the sockets.
                        __httpServer.close(function (err3) {
                            logger.info('http server closed');
                            logger.debug('http server closed');
                            callback(err || err1 || err2 || err3 || null);
                        });

                        // destroy all open sockets i.e. keep-alive and socket-io connections, etc.
                        for (key in sockets) {
                            if (sockets.hasOwnProperty(key)) {
                                sockets[key].destroy();
                                delete sockets[key];
                                logger.debug('destroyed open socket ' + key);
                                numDestroyedSockets += 1;
                            }
                        }

                        logger.debug('destroyed # of sockets: ' + numDestroyedSockets);
                    });
                });
            });
        } catch (e) {
            //ignore errors
            callback(e);
        }
    }

    this.start = start;
    this.stop = stop;


    //internal functions
    function getRedirectUrlParameter(req) {
        //return '?redirect=' + URL.addSpecialChars(req.url);
        return '?redirect=' + encodeURIComponent(req.originalUrl);
    }

    function redirectUrl(req, res) {
        if (req.query.redirect) {
            //res.redirect(URL.removeSpecialChars(req.query.redirect));
            res.redirect(decodeURIComponent(req.query.redirect));
        } else {
            res.redirect('/');
        }
    }


    // TODO: add this back, when google authentication works again
    //function checkGoogleAuthentication(req, res, next) {
    //    if (__googleAuthenticationSet === true) {
    //        return next();
    //    } else {
    //        var protocolPrefix = gmeConfig.server.https.enable === true ? 'https://' : 'http://';
    //        Passport.use(new PassGoogle.Strategy({
    //                returnURL: protocolPrefix + req.headers.host + '/login/google/return',
    //                realm: protocolPrefix + req.headers.host
    //            },
    //            function (identifier, profile, done) {
    //                return done(null, {id: profile.emails[0].value});
    //            }
    //        ));
    //        __googleAuthenticationSet = true;
    //        return next();
    //    }
    //}

    function ensureAuthenticated(req, res, next) {
        var authorization = req.get('Authorization'),
            username,
            password,
            split;

        if (authorization && authorization.indexOf('Basic ') === 0) {
            logger.debug('Basic authentication request');
            // FIXME: ':' should not be in username nor in password
            split = new Buffer(authorization.substr('Basic '.length), 'base64').toString('utf8').split(':');
            username = split[0];
            password = split[1];
            if (username && password) {
                // no empty username no empty password
                __gmeAuth.authenticateUserById(username, password, 'gme', '/', req, res, next);
                return;
            } else {
                res.status(401);
                return next(new Error('Basic authentication failed'));
            }
        }

        if (true === gmeConfig.authentication.enable) {
            if (req.isAuthenticated() || (req.session && true === req.session.authenticated)) {
                return next();
            } else {
                //client oriented new session
                if (req.headers.webgmeclientsession) {
                    // FIXME: used by blob/plugin/executor ???
                    __sessionStore.get(req.headers.webgmeclientsession, function (err, clientSession) {
                        if (!err) {
                            if (clientSession.authenticated) {
                                req.session.authenticated = true;
                                req.session.udmId = clientSession.udmId;
                                res.cookie('webgme', req.session.udmId);
                                return next();
                            } else {
                                res.sendStatus(401); //TODO find proper error code
                            }
                        } else {
                            res.sendStatus(401); //TODO find proper error code
                        }
                    });
                } else if (gmeConfig.authentication.allowGuests) {
                    req.session.authenticated = true;
                    req.session.udmId = gmeConfig.authentication.guestAccount;
                    res.cookie('webgme', req.session.udmId);
                    return next();
                } else if (res.getHeader('X-WebGME-Media-Type')) {
                    // do not redirect with direct api access
                    res.status(401);
                    return next(new Error());
                } else {
                    res.redirect('/login' + getRedirectUrlParameter(req));
                }

            }
        } else {
            // if authentication is turned off we treat everybody as a guest user
            req.session.authenticated = true;
            req.session.udmId = gmeConfig.authentication.guestAccount;
            res.cookie('webgme', req.session.udmId);
            return next();
        }
    }

    function getRouteFor(component, basePaths) {
        //first we try to give back the common plugin/modules
        return function(req, res) {
            res.sendFile(Path.join(__baseDir, req.path), function (err) {
                if (err && err.code !== 'ECONNRESET') {
                    //this means that it is probably plugin/pluginName or plugin/pluginName/relativePath format
                    // so we try to look for those in our config
                    //first we check if we have the plugin registered in our config
                    var urlArray = req.url.split('/'),
                        pluginName = urlArray[2] || null,
                        basePath,
                        relPath = '';

                    urlArray.shift();
                    urlArray.shift();
                    urlArray.shift();
                    relPath = urlArray.join('/');
                    if (!Path.extname(relPath)) {  // js file by default
                        relPath += '.js';
                    }
                    basePath = getBasePathByName(pluginName, basePaths);

                    if (typeof basePath === 'string' && typeof relPath === 'string') {
                        expressFileSending(res, Path.resolve(Path.join(basePath, relPath)));
                    } else {
                        res.sendStatus(404);
                    }
                }
            });
        };
    }

    function getBasePathByName(pluginName, basePaths) {
        for (var i = 0; i < basePaths.length; i++) {
            var additional = FS.readdirSync(basePaths[i]);
            for (var j = 0; j < additional.length; j++) {
                if (additional[j] === pluginName) {
                    if (webgmeUtils.isGoodExtraAsset(additional[j], Path.join(basePaths[i], additional[j]))) {
                        return basePaths[i];
                    }
                }
            }
        }
    }



    function setupExternalRestModules() {
        var restComponent,
            keys = Object.keys(gmeConfig.rest.components),
            i;
        logger.debug('initializing external REST modules');
        for (i = 0; i < keys.length; i++) {
            restComponent = require(gmeConfig.rest.components[keys[i]]);
            if (restComponent) {
                logger.debug('adding rest component [' + gmeConfig.rest.components[keys[i]] + '] to' +
                    ' - /rest/external/' + keys[i]);
                if (restComponent.hasOwnProperty('initialize') && restComponent.hasOwnProperty('router')) {
                    // FIXME: initialize may return with a promise
                    restComponent.initialize(middlewareOpts);
                    __app.use('/rest/external/' + keys[i], restComponent.router);
                } else {
                    __app.use('/rest/external/' + keys[i], restComponent(gmeConfig, ensureAuthenticated, logger));
                }
            } else {
                throw new Error('Loading rest component ' + gmeConfig.rest.components[keys[i]] + ' failed.');
            }
        }
    }

    function expressFileSending(httpResult, path) {
        httpResult.sendFile(path, function (err) {
            //TODO we should check for all kind of error that should be handled differently
            if (err) {
                if (err.code === 'EISDIR') {
                    // NOTE: on Linux status is 404 on Windows status is not set
                    err.status = err.status || 404;
                }
                logger.warn('expressFileSending failed for: ' + path + ': ' + (err.stack ? err.stack : err));
                if (httpResult.headersSent === false) {
                    httpResult.sendStatus(err.status || 500);
                }
            }
        });
    }

    //here starts the main part
    //variables
    var logger = null,
        __storage = null,
        __database = null,
        __webSocket = null,
        __gmeAuth = null,
        apiReady,
        __secureSiteInfo = {},
        __app = null,
        __sessionStore,
        __workerManager,
        __users = {},
    //__googleAuthenticationSet = false,
    //__canCheckToken = true,
        __httpServer = null,
        __logoutUrl = gmeConfig.authentication.logOutUrl || '/',
        __baseDir = requireJS.s.contexts._.config.baseUrl,// TODO: this is ugly
        __clientBaseDir = Path.resolve(gmeConfig.client.appDir),
        __requestCounter = 0,
        __reportedRequestCounter = 0,
        __requestCheckInterval = 2500,
        middlewareOpts;

    //creating the logger
    logger = mainLogger.fork('server:standalone');
    self.logger = logger;

    logger.debug('starting standalone server initialization');
    //initializing https extra infos
    if (gmeConfig.server.https.enable === true) { //TODO move this from here
        __secureSiteInfo.key = FS.readFileSync(gmeConfig.server.https.keyFile);
        __secureSiteInfo.certificate = FS.readFileSync(gmeConfig.server.https.certificateFile);
    }

    logger.debug('initializing session storage');
    __sessionStore = new SSTORE(logger, gmeConfig);

    logger.debug('initializing server worker manager');
    __workerManager = new ServerWorkerManager({
        sessionToUser: __sessionStore.getSessionUser,
        globConf: gmeConfig,
        logger: logger
    });

    logger.debug('initializing authentication modules');
    //TODO: do we need to create this even though authentication is disabled?
    // FIXME: we need to connect with gmeAUTH again! start/stop/start/stop
    __gmeAuth = new GMEAUTH(__sessionStore, gmeConfig);

    logger.debug('initializing passport module for user management');
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

    logger.debug('initializing static server');
    __app = new Express();

    __database = new Mongo(logger, gmeConfig);
    __storage = new Storage(__database, logger, gmeConfig, __gmeAuth);
    __webSocket = new WebSocket(__storage, logger, gmeConfig, __gmeAuth, __workerManager);

    middlewareOpts = {  //TODO: Pass this to every middleware They must not modify the options!
        gmeConfig: gmeConfig,
        logger: logger,
        ensureAuthenticated: ensureAuthenticated,
        gmeAuth: __gmeAuth,
        safeStorage: __storage,
        workerManager: __workerManager
    };

    //__app.configure(function () {
    //counting of requests works only in debug mode
    if (gmeConfig.debug === true) {
        setInterval(function () {
            if (__reportedRequestCounter !== __requestCounter) {
                __reportedRequestCounter = __requestCounter;
                logger.debug('...handled ' + __reportedRequestCounter + ' requests so far...');
            }
        }, __requestCheckInterval);
        __app.use(function (req, res, next) {
            __requestCounter++;
            next();
        });
    }

    __app.use(compression());
    __app.use(cookieParser());
    __app.use(bodyParser.json());
    __app.use(bodyParser.urlencoded({
        extended: true
    }));
    __app.use(methodOverride());
    __app.use(multipart({defer: true})); // required to upload files. (body parser should not be used!)
    __app.use(session({
        store: __sessionStore,
        secret: gmeConfig.server.sessionStore.cookieSecret,
        key: gmeConfig.server.sessionStore.cookieKey,
        saveUninitialized: true,
        resave: true
    }));
    __app.use(Passport.initialize());
    __app.use(Passport.session());

    // FIXME: do we need this code to make sure that we serve requests only if the session is available?
    // Examples: can we lose the connection to mongo or redis, if they are used for storing the sessions?
    //__app.use(function (req, res, next) {
    //    var tries = 3;
    //
    //    if (req.session !== undefined) {
    //        return next();
    //    }
    //
    //    function lookupSession(error) {
    //        if (error) {
    //            return next(error);
    //        }
    //
    //        tries -= 1;
    //
    //        if (req.session !== undefined) {
    //            return next();
    //        }
    //
    //        if (tries < 0) {
    //            return next(new Error('oh no session is not available'));
    //        }
    //
    //        __sessionStore(req, res, lookupSession);
    //    }
    //
    //    lookupSession();
    //});

    if (gmeConfig.executor.enable) {
        ExecutorServer.initialize(middlewareOpts);
        __app.use('/rest/executor', ExecutorServer.router);
    } else {
        logger.debug('Executor not enabled. Add \'executor.enable: true\' to configuration to activate.');
    }

    setupExternalRestModules();

    // Basic authentication

    logger.debug('creating login routing rules for the static server');
    __app.get('/', ensureAuthenticated, Express.static(__clientBaseDir));
    __app.get('/logout', function (req, res) {
        res.clearCookie('webgme');
        req.logout();
        req.session.authenticated = false;
        delete req.session.udmId;
        res.redirect(__logoutUrl);
    });

    __app.get('/login', Express.static(__clientBaseDir, {extensions: ['html'], index: false}));

    __app.post('/login', function (req, res, next) {
        var queryParams = [],
            url = URL.parse(req.url, true);
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
    }, __gmeAuth.authenticate, function (req, res) {
        res.cookie('webgme', req.session.udmId);
        redirectUrl(req, res);
    });

    // TODO: review/revisit this part when google authentication is used.
    //__app.get('/login/google', checkGoogleAuthentication, Passport.authenticate('google'));
    //__app.get('/login/google/return', __gmeAuth.authenticate, function (req, res) {
    //    res.cookie('webgme', req.session.udmId);
    //    redirectUrl(req, res);
    //});

    //TODO: only node_worker/index.html and common/util/common are using this
    //logger.debug('creating decorator specific routing rules');
    __app.get('/bin/getconfig.js', ensureAuthenticated, function (req, res) {
        res.status(200);
        res.setHeader('Content-type', 'application/javascript');
        res.end('define([],function(){ return ' + JSON.stringify(clientConfig) + ';});');
    });

    logger.debug('creating gmeConfig.json specific routing rules');
    __app.get('/gmeConfig.json', ensureAuthenticated, function (req, res) {
        res.status(200);
        res.setHeader('Content-type', 'application/json');
        res.end(JSON.stringify(clientConfig));
    });

    logger.debug('creating decorator specific routing rules');
    __app.get(/^\/decorators\/.*/, ensureAuthenticated, function (req, res) {
        var tryNext = function (index) {
            var resolvedPath;
            if (index < gmeConfig.visualization.decoratorPaths.length) {
                resolvedPath = Path.resolve(gmeConfig.visualization.decoratorPaths[index]);
                resolvedPath = Path.join(resolvedPath, req.url.substring('/decorators/'.length));
                res.sendFile(resolvedPath, function (err) {
                    logger.debug('sending decorator', resolvedPath);
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

    // Plugin paths
    logger.debug('creating plugin specific routing rules');
    __app.get(/^\/plugin\/.*/, getRouteFor('plugin', gmeConfig.plugin.basePaths));

    // Layout paths
    logger.debug('creating layout specific routing rules');
    __app.get(/^\/layout\/.*/, getRouteFor('layout', gmeConfig.visualization.layout.basePaths));

    logger.debug('creating external library specific routing rules');
    gmeConfig.server.extlibExcludes.forEach(function (regExStr) {
        logger.debug('Adding exclude rule to "/extlib" path: ', regExStr);
        excludeRegExs.push(new RegExp(regExStr));
    });

    __app.get(/^\/extlib\/.*/, ensureAuthenticated, function (req, res) {
        var i;
        for (i = 0; i < excludeRegExs.length; i += 1) {
            if (excludeRegExs[i].test(req.url)) {
                logger.warn('Request attempted to access excluded path "' + req.url + '", caught by "' +
                    gmeConfig.server.extlibExcludes[i] + '" from gmeConfig.');
                res.sendStatus(403);
                return;
            }
        }

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

    logger.debug('creating basic static content related routing rules');
    //static contents
    //javascripts - core and transportation related files //TODO: remove config, middleware and bin
    __app.get(/^\/(common|config|bin|middleware)\/.*\.js$/, Express.static(__baseDir, {index: false}));

    //TODO remove this part as this is only temporary!!!
    __app.get('/docs/*', Express.static(Path.join(__baseDir, '..'), {index: false}));

    __app.use('/rest/blob', BlobServer.createExpressBlob(middlewareOpts));

    //client contents - js/html/css
    __app.get(/^\/.*\.(css|ico|ttf|woff|js|cur)$/, Express.static(__clientBaseDir));


    __app.get('/package.json', ensureAuthenticated, Express.static(Path.join(__baseDir, '..')));
    __app.get(/^\/.*\.(_js|html|gif|png|bmp|svg|json|map)$/, ensureAuthenticated, Express.static(__clientBaseDir));

    logger.debug('creating API related routing rules');

    apiReady = api.createAPI(__app, '/api', middlewareOpts);

    // everything else is 404
    logger.debug('creating all other request rule - error 404 -');
    __app.use('*', function (req, res) {
        res.sendStatus(404);
    });

    // catches all next(new Error()) from previous rules, you can set res.status() before you call next(new Error())
    __app.use(function (err, req, res, next) {
        if (res.statusCode === 200) {
            res.status(err.status || 500);
        }
        res.sendStatus(res.statusCode);
        //res.send(err.stack ? err.stack : err); // FIXME: in dev mode
    });

    logger.debug('gmeConfig of webgme server', {metadata: gmeConfig});
    var networkIfs = OS.networkInterfaces(),
        addresses = 'Valid addresses of gme web server: ',
        forEveryNetIf = function (netIf) {
            if (netIf.family === 'IPv4') {
                var address = (gmeConfig.server.https.enable ? 'https' : 'http') + '://' +
                    netIf.address + ':' + gmeConfig.server.port;
                addresses = addresses + '  ' + address;
            }
        };
    for (var dev in networkIfs) {
        networkIfs[dev].forEach(forEveryNetIf);
    }

    logger.info(addresses);

    logger.debug('standalone server initialization completed');

    return {
        getUrl: getUrl,
        start: start,
        stop: stop
    };
}

module.exports = StandAloneServer;
