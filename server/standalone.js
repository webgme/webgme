define(['logManager',
    'storage/serverstorage',
    'fs',
    'express',
    'auth/gmeauth',
    'auth/vehicleforgeauth',
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
    'util/guid'
    ],function(
        LogManager,
        Storage,
        FS,
        Express,
        GMEAUTH,
        VFAUTH,
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
        GUID
    ){

    function StandAloneServer(CONFIG){
        // if the config is not set we use the global
        CONFIG = CONFIG || webGMEGlobal.getConfig();
        //public functions
        function start(){
            if(CONFIG.httpsecure){
                __httpServer = Https.createServer({key:__secureSiteInfo.key,cert:__secureSiteInfo.certificate}, __app).listen(CONFIG.port);
            } else {
                __httpServer = Http.createServer(__app).listen(CONFIG.port);
            }
            //creating the proper storage for the standalone server
            __storageOptions = {combined:__httpServer,logger:LogManager.create("StandAloneWebGMEServer-socket.io"),session:false,cookieID:CONFIG.sessioncookieid};
            if(true === CONFIG.authentication){
                __storageOptions.session = true;
                __storageOptions.sessioncheck = __sessionStore.check;
                __storageOptions.secret = CONFIG.sessioncookiesecret;
                __storageOptions.authorization = globalAuthorization;
                __storageOptions.authInfo = __gmeAuth.getAuthorizationInfo;
            }

            __storageOptions.host = CONFIG.mongoip;
            __storageOptions.port = CONFIG.mongoport;
            __storageOptions.database = CONFIG.mongodatabase;
            __storageOptions.log = LogManager.create('StandAloneWebGMEServer-storage');
            __storageOptions.getToken = __gmeAuth.getToken;

            __storageOptions.intoutdir = CONFIG.intoutdir;
            __storageOptions.pluginBasePaths = CONFIG.pluginBasePaths;

            __storageOptions.webServerPort = CONFIG.port;

            __storageOptions.sessionToUser = __sessionStore.getSessionUser;

            __storage = Storage(__storageOptions);
            //end of storage creation
            __storage.open();
        }
        function stop(){
            __storage.close();
            __httpServer.close();
        }
        //internal functions
        function globalAuthorization(sessionId,projectName,type,callback){
            __sessionStore.get(sessionId,function(err,data){
                if(!err && data){
                    switch (data.userType){
                        case 'GME':
                            __gmeAuth.authorize(sessionId,projectName,type,callback);
                            break;
                        case 'vehicleForge':
                            __forgeAuth.authorize(sessionId,projectName,type,callback);
                            break;
                        default:
                            callback('unknown user type',false);
                    }
                } else {
                    err = err || 'session not found';
                    callback(err,false);
                }
            });
        }

        function storeQueryString(req,res,next){
            if( req && req.session && req.session.originalQuery === undefined){
                var index = req.url.indexOf('?');
                req.session.originalQuery = index === -1 ? "" : req.url.substring(index);
            }
            if( req && req.session && req.session.originalUrl === undefined){
                req.session.originalUrl = req.url;
            }
            if(typeof CONFIG.defaultUser === 'string' && req.session.authenticated !== true){
                //TODO: this has do be done in some other way
                if(req.param('user') === CONFIG.defaultUser){
                    req.session.udmId = CONFIG.defaultUser;
                    req.session.authenticated = true;
                    req.session.userType = 'GME';
                    //probably this is the last step in authentication so we should set cookies as well
                    res.cookie('webgme',req.session.udmId);
                    next();
                } else {
                    next();
                }
            } else {
                next();
            }
        }


        function checkGoogleAuthentication(req,res,next){
            if(__googleAuthenticationSet === true){
                return next();
            } else {
                var protocolPrefix = CONFIG.httpsecure === true ? 'https://' : 'http://';
                Passport.use(new __googleStrategy({
                        returnURL: protocolPrefix+req.headers.host +'/login/google/return',
                        realm: protocolPrefix+req.headers.host
                    },
                    function(identifier, profile, done) {
                        return done(null,{id:profile.emails[0].value});
                    }
                ));
                __googleAuthenticationSet = true;
                return next();
            }
        }

        function checkREST(req,res,next){
            var baseUrl = CONFIG.httpsecure === true ? 'https://' : 'http://'+req.headers.host+'/rest';
            if(__REST === null){
                var restAuthorization;
                if(CONFIG.authentication === true){
                    restAuthorization = __gmeAuth.tokenAuthorization;
                }
                __REST = new REST({host:CONFIG.mongoip,port:CONFIG.mongoport,database:CONFIG.mongodatabase,baseUrl:baseUrl,authorization:restAuthorization});
            } else {
                __REST.setBaseUrl(baseUrl);
            }
            return next();
        }


        function ensureAuthenticated(req, res, next) {
            if(true === CONFIG.authentication){
                if(req.isAuthenticated() || (req.session && true === req.session.authenticated)){
                    return next();
                } else{
                    //client oriented new session
                    if(req.headers.webgmeclientsession){
                        __sessionStore.get(req.headers.webgmeclientsession,function(err,clientSession){
                            if(!err){
                                if(clientSession.authenticated){
                                    req.session.authenticated = true;
                                    req.session.udmId = clientSession.udmId;
                                    res.cookie('webgme',req.session.udmId);
                                    return next();
                                } else {
                                    res.send(400); //TODO find proper error code
                                }
                            }    else{
                                res.send(400); //TODO find proper error code
                            }
                        });
                    }
                    //request which use token may be authenticated directly
                    else if(req.headers.webGMEToken){
                        __gmeAuth.checkToken(req.headers.webGMEToken,function(isOk,userId){
                            if(isOk){
                                req.session.authenticated = true;
                                req.session.udmId = userId;
                                res.cookie('webgme',req.session.udmId);
                                return next();
                            } else{
                                res.send(400); //no use for redirecting in this case
                            }
                        });
                    } else {
                        res.redirect('/login');
                    }
                }
            } else {
                return next();
            }
        }
        function checkVF(req,res,next){
            if(req.isAuthenticated() || (req.session && true === req.session.authenticated)){
                return next();
            } else {
                if(req.cookies['isisforge']){
                    res.redirect('/login/forge');
                } else {
                    return next();
                }
            }
        }

        function prepClientLogin(req,res,next){
            req.__gmeAuthFailUrl__ = '/login/client/fail';
            next();
        }

        function isGoodExtraAsset(name,path){
            try{
                var file = FS.readFileSync(path+'/'+name+'.js','utf-8');
                if(file === undefined || file === null){
                    return false;
                } else {
                    return true;
                }
            } catch(e){
                return false;
            }
        }

        function getPluginBasePathByName(pluginName){
            if(CONFIG.pluginBasePaths && CONFIG.pluginBasePaths.length){
                for(var i=0;i<CONFIG.pluginBasePaths.length;i++){
                    var additional = FS.readdirSync(CONFIG.pluginBasePaths[i]);
                    for(var j=0;j<additional.length;j++){
                        if(additional[j] === pluginName){
                            if(isGoodExtraAsset(additional[j],Path.join(CONFIG.pluginBasePaths[i],additional[j]))){
                                return CONFIG.pluginBasePaths[i];
                            }
                        }
                    }
                }
            } else {
                return null;
            }
        }

        function getVisualizersDescriptor(){
            //we merge the contents of the CONFIG.visualizerDescriptors by id
            var indexById = function(objectArray,id){
                    var i,
                        index = -1;
                    for(i=0;i<objectArray.length;i++){
                        if(objectArray[i].id === id){
                            index = i;
                            break;
                        }
                    }

                    return index;
                },
                getVisualizerDescriptor = function(path){
                    try{
                        var descriptor = FS.readFileSync(path,'utf-8');
                        descriptor = JSON.parse(descriptor);
                        return descriptor;
                    } catch (e) {
                        //we do not care much of the error just give back an empty array
                        return [];
                    }
                },
                allVisualizersDescriptor = [],
                i,j;

            for(i=0;i<CONFIG.visualizerDescriptors.length;i++){
                var descriptor = getVisualizerDescriptor(CONFIG.visualizerDescriptors[i]);
                if(descriptor.length){
                    for(j=0;j<descriptor.length;j++){
                        var index = indexById(allVisualizersDescriptor,descriptor[j].id);
                        if(index !== -1){
                            allVisualizersDescriptor[index] = descriptor[j];
                        } else {
                            allVisualizersDescriptor.push(descriptor[j]);
                        }
                    }
                }
            }
            return allVisualizersDescriptor;
        }

        function setupExternalRestModules(){
            __logger.info('initializing external REST modules');
            CONFIG.rextrast = CONFIG.rextrast || {};
            var keys = Object.keys(CONFIG.rextrast),
                i;
            for(i=0;i<keys.length;i++){
                var modul = require(CONFIG.rextrast[keys[i]]);
                if(modul){
                    __logger.info('adding RExtraST ['+CONFIG.rextrast[keys[i]]+'] to - /rest/external/'+keys[i]);
                    __app.use('/rest/external/'+keys[i],modul);
                }
            }
        }
        //here starts the main part
        //variables
        var __logger = null,
            __storage = null,
            __storageOptions = {},
            __gmeAuth = null,
            __forgeAuth = null,
            __secureSiteInfo = {},
            __app = null,
            __sessionStore,
            __users = {},
            __googleAuthenticationSet = false,
            __googleStrategy = PassGoogle.Strategy,
            __REST = null,
            __canCheckToken = true,
            __httpServer = null,
            __logoutUrl = CONFIG.logoutUrl || '/',
            __baseDir = webGMEGlobal.baseDir,
            __clientBaseDir = __baseDir+'/client',
            __requestCounter = 0,
            __reportedRequestCounter = 0,
            __requestCheckInterval = 2500;

        //creating the logmanager
        LogManager.setLogLevel(CONFIG.loglevel || LogManager.logLevels.WARNING);
        LogManager.useColors(true);
        LogManager.setFileLogPath(CONFIG.logfile || 'server.log');
        __logger = LogManager.create("StandAloneWebGMEServer-main");
        //end of logmanager initializing stuff

        __logger.info("starting standalone server initialization");
        //initializing https extra infos
        if(CONFIG.httpsecure === true){ //TODO we should make it also configurable
            __secureSiteInfo.key = FS.readFileSync("proba-key.pem");
            __secureSiteInfo.certificate = FS.readFileSync("proba-cert.pem");
        }

        __logger.info("initializing session storage");
        __sessionStore = new SSTORE()

        __logger.info("initializing authentication modules");
        __gmeAuth = new GMEAUTH({session:__sessionStore,host:CONFIG.mongoip,port:CONFIG.mongoport,database:CONFIG.mongodatabase,guest:CONFIG.guest});
        __forgeAuth = new VFAUTH({session:__sessionStore});

        __logger.info("initializing passport module for user management");
        //TODO in the long run this also should move to some database
        Passport.serializeUser(
            function(user, done) {
                __users[user.id] = user;
                done(null, user.id);
        });
        Passport.deserializeUser(
            function(id, done) {
                done(null,__users[id]);
        });

        __logger.info("initializing static server");
        __app = Express();

        __app.configure(function(){
            //counting of requests works only in debug mode
            if(CONFIG.debug === true){
                setInterval(function(){
                    if(__reportedRequestCounter !== __requestCounter){
                        __reportedRequestCounter = __requestCounter;
                        console.log("...handled "+__reportedRequestCounter+" requests so far...");
                    }
                },__requestCheckInterval);
                __app.use(function(req,res,next){
                    __requestCounter++;
                    next();
                });
            }
            __app.use(function(req,res,next){
                var infoguid = GUID(),
                    infotxt = "request["+infoguid+"]:"+req.headers.host+" - "+req.protocol.toUpperCase()+"("+req.httpVersion+") - "+req.method.toUpperCase()+" - "+req.originalUrl+" - "+req.ip+" - "+req.headers['user-agent'],
                    infoshort = "incoming["+infoguid+"]: "+req.originalUrl;
                __logger.info(infoshort);
                var end = res.end;
                res.end = function(chunk,encoding){
                    res.end = end;
                    res.end(chunk,encoding);
                    infotxt += " -> "+res.statusCode;
                    __logger.info(infotxt);
                };
                next();
            });

            __app.use(Express.cookieParser());
            __app.use(Express.bodyParser());
            __app.use(Express.methodOverride());
            __app.use(Express.multipart({defer: true})); // required to upload files. (body parser should not be used!)
            __app.use(Express.session({store: __sessionStore, secret: CONFIG.sessioncookiesecret, key: CONFIG.sessioncookieid}));
            __app.use(Passport.initialize());
            __app.use(Passport.session());

            setupExternalRestModules();
        });

        __logger.info("creating login routing rules for the static server");
        __app.get('/',storeQueryString,checkVF,ensureAuthenticated,function(req,res){
            res.sendfile(__clientBaseDir+'/index.html',{user:req.user},function(err){
                if (err) {
                    res.send(404);
                }
            });
        });
        __app.get('/logout', function(req, res){
            res.clearCookie('webgme');
            res.clearCookie('isisforge'); //todo is this really needed
            req.logout();
            req.session.authenticated = false;
            req.session.userType = 'unknown';
            res.redirect(__logoutUrl);
        });
        __app.get('/login'/*,storeQueryString*/,function(req,res){
            res.location('/login');
            res.sendfile(__clientBaseDir+'/login.html',{},function(err){
                if (err) {
                    res.send(404);
                }
            });
        });
        __app.post('/login'/*,storeQueryString*/,__gmeAuth.authenticate,function(req,res){
            res.cookie('webgme',req.session.udmId);
            //res.redirect('/'+req.session.originalQuery || "");
            res.redirect(req.session.originalUrl);
        });
        __app.post('/login/client',prepClientLogin,__gmeAuth.authenticate,function(req,res){
            res.cookie('webgme',req.session.udmId);
            res.send(200);
        });
        __app.get('/login/client/fail',function(req,res){
            res.clearCookie('webgme');
            res.send(401);
        });
        __app.get('/login/google'/*,storeQueryString*/,checkGoogleAuthentication,Passport.authenticate('google'));
        __app.get('/login/google/return'/*,storeQueryString*/,__gmeAuth.authenticate,function(req,res){
            res.cookie('webgme',req.session.udmId);
            res.redirect('/'+req.session.originalQuery || "");
        });
        __app.get('/login/forge'/*,storeQueryString*/,__forgeAuth.authenticate,function(req,res){
            res.cookie('webgme',req.session.udmId);
            res.redirect('/');
        });

        __logger.info("creating decorator specific routing rules");
        __app.get('/bin/getconfig.js',ensureAuthenticated,function(req,res){
            res.status(200);
            res.setHeader('Content-type', 'application/json');
            res.end("define([],function(){ return "+JSON.stringify(CONFIG)+";});");
        });
        __logger.info("creating decorator specific routing rules");
        __app.get(/^\/decorators\/.*/,ensureAuthenticated,function(req,res){
            var tryNext = function(index){
                if(index<CONFIG.decoratorpaths.length){
                    res.sendfile(Path.join(CONFIG.decoratorpaths[index],req.url.substring(12)),function(err){
                        tryNext(index+1);
                    });
                } else {
                    res.send(404);
                }
            };

            if(CONFIG.decoratorpaths && CONFIG.decoratorpaths.length){
                tryNext(0);
            } else {
                res.send(404);
            }
        });

        __logger.info("creating plug-in specific routing rules");
        __app.get(/^\/plugin\/.*/,ensureAuthenticated,function(req,res){
            //first we try to give back the common plugin/modules
            res.sendfile(Path.join(__baseDir,req.path),function(err){
                if(err){
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
                    if(relPath.indexOf('.js') === -1){
                        relPath+='.js';
                    }

                    if(typeof basePath === 'string' && typeof relPath === 'string'){
                        res.sendfile(Path.resolve(Path.join(basePath,relPath)),function(err){
                            if(err){
                                res.send(404);
                            }
                        });
                    } else {
                        res.send(404);
                    }
                }
            });
        });
        __app.get(/^\/pluginoutput\/.*/,ensureAuthenticated,function(req,res){
            var filepath = req.path.replace('/pluginoutput',CONFIG.intoutdir);
            res.sendfile(filepath,function(err){
                if (err) {
                    res.send(404);
                }
            });
        });


        __logger.info("creating external library specific routing rules");
        __app.get(/^\/extlib\/.*/,ensureAuthenticated,function(req,res){
            //first we try to give back the common extlib/modules

            var urlArray = req.path.split('/');
            urlArray[1] = '.';
            urlArray.shift();

            var relPath = urlArray.join('/');

            res.sendfile(relPath,function(err){
                if(err){
                    res.send(404);
                }
            });
        });

        __logger.info("creating basic static content related routing rules");
        //static contents
        //javascripts - core and transportation related files
        __app.get(/^\/(common|util|storage|core|config|auth|bin|coreclient|blob)\/.*\.js$/,ensureAuthenticated,function(req,res){
            res.sendfile(Path.join(__baseDir,req.path),function(err){
                if (err) {
                    res.send(404);
                }
            });
        });

        //TODO remove this part as this is only temporary!!!
        __app.get('/docs/*',function(req,res){
            res.sendfile(Path.join(__baseDir,req.path),function(err){
                if (err) {
                    res.send(404);
                }
            });
        });


        __logger.info("creating blob related rules");

        var blobBackend = new BlobFSBackend();
        //var blobBackend = new BlobS3Backend();

        __app.get('/rest/blob/metadata', ensureAuthenticated, function(req, res) {
            blobBackend.listAllMetadata(req.query.all, function (err, metadata) {
                if (err) {
                    // FIXME: make sure we set the status code correctly like 404 etc.
                    res.status(500);
                    res.send(err);
                } else {
                    res.status(200);
                    res.end(JSON.stringify(metadata, null, 4));

                }
            });
        });

        __app.get('/rest/blob/metadata/:metadataHash', ensureAuthenticated, function(req, res) {
            blobBackend.getMetadata(req.params.metadataHash, function (err, hash, metadata) {
                if (err) {
                    // FIXME: make sure we set the status code correctly like 404 etc.
                    res.status(500);
                    res.send(err);
                } else {
                    res.status(200);
                    res.setHeader('Content-type', 'application/json');
                    res.end(JSON.stringify(metadata, null, 4));

                }
            });
        });

        __app.post('/rest/blob/createFile/:filename', ensureAuthenticated, function(req, res) {
            __logger.info('file creation request: user['+req.session.udmId+'], filename['+req.params.filename+']');
            var filename = 'not_defined.txt';

            if (req.params.filename !== null && req.params.filename !== '') {
                filename = req.params.filename
            }

            // regular file
            // TODO: add tags and isPublic flag
            blobBackend.putFile(filename, req, function (err, hash) {
                __logger.info('file creation request finished: user['+req.session.udmId+'], filename['+req.params.filename+'], error['+err+'], hash:['+hash+']');
                if (err) {
                    // FIXME: make sure we set the status code correctly like 404 etc.
                    res.status(500);
                    res.send(err);
                } else {
                    // FIXME: it should be enough to send back the hash only
                    blobBackend.getMetadata(hash, function (err, metadataHash, metadata) {
                        if (err) {
                            // FIXME: make sure we set the status code correctly like 404 etc.
                            res.status(500);
                            res.send(err);
                        } else {
                            res.status(200);
                            res.setHeader('Content-type', 'application/json');
                            var info = {};
                            info[hash] = metadata;
                            res.end(JSON.stringify(info, null, 4));
                        }
                    });
                }
            });

        });

        __app.post('/rest/blob/createMetadata', ensureAuthenticated, function(req, res) {

            var data = '';

            req.addListener('data', function(chunk) {
                data += chunk;
            });

            req.addListener('end', function() {
                var metadata = new BlobMetadata(JSON.parse(data));
                blobBackend.putMetadata(metadata, function (err, hash) {
                    if (err) {
                        // FIXME: make sure we set the status code correctly like 404 etc.
                        res.status(500);
                        res.send(err);
                    } else {
                        // FIXME: it should be enough to send back the hash only
                        blobBackend.getMetadata(hash, function (err, metadataHash, metadata) {
                            if (err) {
                                // FIXME: make sure we set the status code correctly like 404 etc.
                                res.status(500);
                                res.send(err);
                            } else {
                                res.status(200);
                                res.setHeader('Content-type', 'application/json');
                                var info = {};
                                info[hash] = metadata;
                                res.end(JSON.stringify(info, null, 4));
                            }
                        });
                    }
                });
            });
        });

        var sendBlobContent = function (req, res, metadataHash, subpartPath, download) {

            blobBackend.getMetadata(metadataHash, function (err, hash, metadata) {
                if (err) {
                    // FIXME: make sure we set the status code correctly like 404 etc.
                    res.status(500);
                    res.send(err);
                } else {
                    var filename = metadata.name;

                    if (subpartPath) {
                        filename = subpartPath.substring(subpartPath.lastIndexOf('/') + 1);
                    }

                    var mimeType = mime.lookup(filename);

                    if (download || mimeType === 'application/octet-stream' || mimeType === 'application/zip') {
                        res.setHeader('Content-disposition', 'attachment; filename=' + filename);
                    }
                    res.setHeader('Content-type', mimeType);


                    // TODO: we need to get the content and save as a local file.
                    // if we just proxy the stream we cannot set errors correctly.

                    blobBackend.getFile(metadataHash, subpartPath, res, function (err, hash) {
                        if (err) {
                            // give more precise description about the error type and message. Resource if not available etc.
                            res.send(500);
                        } else {
                            //res.send(200);
                        }
                    });
                }
            });
        };

        __app.get(/^\/rest\/blob\/download\/([0-9a-f]{40,40})(\/(.*))?$/, ensureAuthenticated, function(req, res) {
            var metadataHash = req.params[0];
            var subpartPath = req.params[2];

            sendBlobContent(req, res, metadataHash, subpartPath, true);
        });

        __app.get(/^\/rest\/blob\/view\/([0-9a-f]{40,40})(\/(.*))?$/, ensureAuthenticated, function(req, res) {
            var metadataHash = req.params[0];
            var subpartPath = req.params[2];

            sendBlobContent(req, res, metadataHash, subpartPath, false);
        });

        // end of blob rules

        //client contents - js/html/css
        //css classified as not secure content
        __app.get(/^\/.*\.(css|ico)$/,function(req,res){
            res.sendfile(Path.join(__clientBaseDir,req.path),function(err){
                if (err) {
                    res.send(404);
                }
            });
        });
        __app.get(/^\/.*\.(js|html|gif|png|bmp|svg|json)$/,ensureAuthenticated,function(req,res){
            //package.json
            if(req.path === '/package.json') {
                res.sendfile(Path.join(__baseDir,req.path),function(err){
                    if (err) {
                        res.send(404);
                    }
                });
            } else {
                res.sendfile(Path.join(__clientBaseDir,req.path),function(err){
                    if (err) {
                        res.send(404);
                    }
                });
            }
        });

        __logger.info("creating token related routing rules");
        __app.get('/gettoken',storeQueryString,ensureAuthenticated,function(req,res){
            if(CONFIG.secureREST == true){
                __gmeAuth.getToken(req.session.id,function(err,token){
                    if(err){
                        res.send(err);
                    } else {
                        res.send(token);
                    }
                });
            } else {
                res.send(410); //special error for the interpreters to know there is no need for token
            }
        });
        __app.get('/checktoken/:token',function(req,res){
            if(CONFIG.authenticated == true){
                if(__canCheckToken == true){
                    setTimeout(function(){__canCheckToken = true;},10000);
                    __canCheckToken = false;
                    __gmeAuth.checkToken(req.params.token,function(isValid){
                        if(isValid === true){
                            res.send(200);
                        } else {
                            res.send(403);
                        }
                    });
                } else {
                    res.send(403);
                }
            } else {
                res.send(410); //special error for the interpreters to know there is no need for token
            }
        });

        //TODO: needs to refactor for the /rest/... format
        __logger.info("creating REST related routing rules");
        __app.get('/rest/:command',storeQueryString,ensureAuthenticated,checkREST,function(req,res){
            __REST.initialize(function(err){
                if(err){
                    res.send(500);
                } else {
                    __REST.doRESTCommand(__REST.request.GET,req.params.command,req.headers.webGMEToken,req.query,function(httpStatus,object){
                        if(req.params.command === __REST.command.etf){
                            var filename = 'exportedNode.json';
                            if(req.query.output){
                                filename = req.query.output;
                            }
                            if(filename.indexOf('.') === -1){
                                filename += '.json';
                            }
                            res.header("Content-Type", "application/json");
                            res.header("Content-Disposition", "attachment;filename=\""+filename+"\"");
                            res.status(httpStatus);
                            res.end(CANON(object));
                        } else {
                            res.json(httpStatus, object || null);
                        }
                    });
                }
            });
        });



        __logger.info("creating server-worker related routing rules");
        __app.get('/worker/simpleResult/*',function(req,res){
            var urlArray = req.url.split('/');
            if(urlArray.length > 3){
                __storage.getWorkerResult(urlArray[3],function(err,result){
                    if(err){
                        res.send(500);
                    } else {
                        var filename = 'exportedNodes.json';
                        if(urlArray[4]){
                            filename = urlArray[4];
                        }
                        if(filename.indexOf('.') === -1){
                            filename += '.json';
                        }
                        res.header("Content-Type", "application/json");
                        res.header("Content-Disposition", "attachment;filename=\""+filename+"\"");
                        res.status(200);
                        res.end(JSON.stringify(result,null,2));
                    }
                });
            } else {
                res.send(404);
            }
        });


        __logger.info("creating list asset rules");
        __app.get('/listAllDecorators',ensureAuthenticated,function(req,res){
            var names = []; //TODO we add everything in the directories!!!
            if(CONFIG.decoratorpaths && CONFIG.decoratorpaths.length){
                for(var i=0;i<CONFIG.decoratorpaths.length;i++){
                    var additional = FS.readdirSync(CONFIG.decoratorpaths[i]);
                    for(var j=0;j<additional.length;j++){
                        if(names.indexOf(additional[j]) === -1){
                            if(isGoodExtraAsset(additional[j],Path.join(CONFIG.decoratorpaths[i],additional[j]))){
                                names.push(additional[j]);
                            }
                        }
                    }
                }
            }
            res.status(200);
            res.setHeader('Content-type', 'application/json');
            res.end("define([],function(){ return "+JSON.stringify(names)+";});");
        });
        __app.get('/listAllPlugins',ensureAuthenticated,function(req,res){
            var names = []; //we add only the "*.js" files from the directories
            if(CONFIG.pluginBasePaths && CONFIG.pluginBasePaths.length){
                for(var i=0;i<CONFIG.pluginBasePaths.length;i++){
                    var additional = FS.readdirSync(CONFIG.pluginBasePaths[i]);
                    for(var j=0;j<additional.length;j++){
                        if(names.indexOf(additional[j]) === -1){
                            if(isGoodExtraAsset(additional[j],Path.join(CONFIG.pluginBasePaths[i],additional[j]))){
                                names.push(additional[j]);
                            }
                        }
                    }
                }
            }
            res.status(200);
            res.setHeader('Content-type', 'application/json');
            res.end("define([],function(){ return "+JSON.stringify(names)+";});");
        });
        __app.get('/listAllVisualizerDescriptors',ensureAuthenticated,function(req,res){
            var allVisualizerDescriptors = getVisualizersDescriptor();
            res.status(200);
            res.setHeader('Content-type', 'application/json');
            res.end("define([],function(){ return "+JSON.stringify(allVisualizerDescriptors)+";});");
        });


        __logger.info("creating all other request rule - error 400 -");
        __app.get('*',function(req,res){
            res.send(400);
        });

        if(CONFIG.debug === true){
            console.log('parameters of webgme server:');
            console.log(CONFIG);
        }
        var networkIfs = OS.networkInterfaces();
        for(var dev in networkIfs){
            networkIfs[dev].forEach(function(netIf){
                if(netIf.family === 'IPv4'){
                    var address = CONFIG.httpsecure ? 'https' : 'http' + '://' + netIf.address + ':' + CONFIG.port;
                    __logger.info(address);
                    if(CONFIG.debug === true){
                        console.log('valid address of webgme server: '+address);
                    }
                }
            });
        }

        __logger.info("standalone server initialization completed");

        return {

            start: start,
            stop: stop
        }
    }

    return StandAloneServer;
});
