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
    'blob/BlobManagerFS'
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
        BlobManagerFS
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
                if(CONFIG.secureREST === true){
                    restAuthorization = __gmeAuth.tokenAuthorization;
                    baseUrl += '/token';
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
                }

                res.redirect('/login');
            } else {
                return next();
            }
        }
        function checkVF(req,res,next){
            console.log('check Vehicle Forge framework');
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
            __clientBaseDir = __baseDir+'/client';

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
            __app.use(Express.logger());
            __app.use(Express.cookieParser());
            __app.use(Express.bodyParser());
            __app.use(Express.methodOverride());
            __app.use(Express.multipart({defer: true})); // required to upload files. (body parser should not be used!)
            __app.use(Express.session({store: __sessionStore, secret: CONFIG.sessioncookiesecret, key: CONFIG.sessioncookieid}));
            __app.use(Passport.initialize());
            __app.use(Passport.session());
            __app.use(__app.router);
        });

        __logger.info("creating login routing rules for the static server");
        __app.get('/',storeQueryString,checkVF,ensureAuthenticated,function(req,res){
            res.sendfile(__clientBaseDir+'/index.html',{user:req.user},function(err){
                res.send(404);
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
        __app.get('/login',storeQueryString,function(req,res){
            res.location('/login');
            res.sendfile(__clientBaseDir+'/login.html',{},function(err){
                res.send(404);
            });
        });
        __app.post('/login',storeQueryString,__gmeAuth.authenticate,function(req,res){
            res.cookie('webgme',req.session.udmId);
            res.redirect('/'+req.session.originalQuery || "");
        });
        __app.post('/login/client',prepClientLogin,__gmeAuth.authenticate,function(req,res){
            res.cookie('webgme',req.session.udmId);
            res.send(200);
        });
        __app.get('/login/client/fail',function(req,res){
            res.clearCookie('webgme');
            res.send(401);
        });
        __app.get('/login/google',storeQueryString,checkGoogleAuthentication,Passport.authenticate('google'));
        __app.get('/login/google/return',storeQueryString,__gmeAuth.authenticate,function(req,res){
            res.cookie('webgme',req.session.udmId);
            res.redirect('/'+req.session.originalQuery || "");
        });
        __app.get('/login/forge',storeQueryString,__forgeAuth.authenticate,function(req,res){
            res.cookie('webgme',req.session.udmId);
            res.redirect('/');
        });

        __logger.info("creating decorator specific routing rules");
        __app.get('/bin/getconfig.js',ensureAuthenticated,function(req,res){
            res.status(200);
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
                res.send(404);
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
        __app.get(/^\/(common|util|storage|core|config|auth|bin|coreclient)\/.*\.js$/,ensureAuthenticated,function(req,res){
            res.sendfile(Path.join(__baseDir,req.path),function(err){
                res.send(404);
            });
        });

        //TODO remove this part as this is only temporary!!!
        __app.get('/docs/*',function(req,res){
            res.sendfile(Path.join(__baseDir,req.path),function(err){
                res.send(404);
            });
        });

        //client contents - js/html/css
        //css classified as not secure content
        __app.get(/^\/.*\.(css|ico)$/,function(req,res){
            res.sendfile(Path.join(__clientBaseDir,req.path),function(err){
                res.send(404);
            });
        });
        __app.get(/^\/.*\.(js|html|gif|png|bmp|svg|json)$/,ensureAuthenticated,function(req,res){
            //package.json
            if(req.path === '/package.json') {
                res.sendfile(Path.join(__baseDir,req.path),function(err){
                    res.send(404);
                });
            } else {
                res.sendfile(Path.join(__clientBaseDir,req.path),function(err){
                    res.send(404);
                });
            }
        });

        __logger.info("creating token related routing rules");
        __app.get('/gettoken',ensureAuthenticated,function(req,res){
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
        __app.get('/checktoken/*',function(req,res){
            if(CONFIG.secureREST == true){
                if(__canCheckToken == true){
                    var token = req.url.split('/');
                    if(token.length === 3){
                        token = token[2];
                        setTimeout(function(){__canCheckToken = true;},10000);
                        __canCheckToken = false;
                        __gmeAuth.checkToken(token,function(isValid){
                            if(isValid === true){
                                res.send(200);
                            } else {
                                res.send(403);
                            }
                        });
                    } else {
                        res.send(400);
                    }
                } else {
                    res.send(403);
                }
            } else {
                res.send(410); //special error for the interpreters to know there is no need for token
            }
        });

        __logger.info("creating REST related routing rules");
        __app.get('/rest/*',checkREST,function(req,res){

            var commandpos = CONFIG.secureREST === true ? 3 : 2,
                minlength = CONFIG.secureREST === true ? 3 : 2,
                urlArray = req.url.split('/');
            if(urlArray.length > minlength){
                var command = urlArray[commandpos],
                    token = CONFIG.secureREST === true ? urlArray[2] : "",
                    parameters = urlArray.slice(commandpos+1);
                __REST.initialize(function(err){
                    if(err){
                        res.send(500);
                    } else {
                        __REST.doRESTCommand(__REST.request.GET,command,token,parameters,function(httpStatus,object){
                            if(command === __REST.command.etf){
                                var filename = 'exportedNode.json';
                                if(parameters[3]){
                                    filename = parameters[3];
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
            } else {
                res.send(400);
            }
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
            res.end("define([],function(){ return "+JSON.stringify(names)+";});");
        });
        __app.get('/listAllVisualizerDescriptors',ensureAuthenticated,function(req,res){
            var allVisualizerDescriptors = getVisualizersDescriptor();
            res.status(200);
            res.end("define([],function(){ return "+JSON.stringify(allVisualizerDescriptors)+";});");
        });

        __logger.info("creating blob related rules");
        // TODO: pick here which blob manager to use based on the config.
        var blobStorage = new BlobManagerFS();

        __app.get('/blob/infos',ensureAuthenticated,function(req,res){
            blobStorage.loadInfos(null, function (err, infos) {
                if (err) {
                    res.send(500);
                } else {
                    res.status(200);
                    res.end(JSON.stringify(infos, null, 4));

                }
            });
        });

        var addFileToBlob = function (req, res) {
            var filename = 'not_defined.txt';

            if (req.params.filename !== null && req.params.filename !== '') {
                filename = req.params.filename
            }

            var uploadedFile = {};
            var d;
            var size;

            req.on('data', function (data) {
                // TODO: do not save data, just forward it to the place where it has to be stored.
                // TODO: update hash here in place
                if (d) {
                    d += data;
                } else {
                    d = data;
                }

                size += data.length;
                //console.log('Got chunk: ' + data.length + ' total: ' + size);
            });

            req.on('end', function () {
                //console.log("total size = " + size);

                blobStorage.save({name:filename, complex: req.query.complex === 'true' || false}, d, function (err, hash) {
                    if (err) {
                        res.send(500);
                    } else {

                        uploadedFile[hash] = blobStorage.getInfo(hash);
                        // TODO: delete temp file

                        console.log(uploadedFile);
                        res.send(uploadedFile);
                    }
                });
            });

            req.on('error', function(e) {
                //console.log("ERROR ERROR: " + e.message);
            });

            // FIXME: use pipe - i.e. streams


        };

        __app.put('/blob/create/:filename',ensureAuthenticated,function(req, res) {
            addFileToBlob(req, res);
        });

        __app.post('/blob/create/:filename',ensureAuthenticated,function(req,res){
            //the structure of data should be something like {info:{},data:binary/string}
            addFileToBlob(req, res);
        });

        __app.get('/blob/download/:blob_hash',ensureAuthenticated,function(req,res){
            // TODO: use pipe/streams
            blobStorage.getContent(req.params.blob_hash, function (err, blob, filename) {
                if (err) {
                    res.send(500);
                } else {
                    // FIXME: set the mime-type based on the info/file type
                    var mimetype = mime.lookup(filename);

                    res.setHeader('Content-disposition', 'attachment; filename=' + filename);
                    res.setHeader('Content-type', mimetype);

                    res.status(200);
                    res.end(blob);
                }
            });
        });

        __app.get('/blob/info/:blob_hash',ensureAuthenticated,function(req,res){
            // TODO: we should be able to ask only for a single hash
            blobStorage.loadInfos(null, function (err, infos) {
                if (err) {
                    res.send(500);
                } else {
                    if (infos.hasOwnProperty(req.params.blob_hash)) {
                        res.status(200);
                        res.end(JSON.stringify(infos[req.params.blob_hash], null, 4));
                    } else {
                        res.end(404);
                    }

                }
            });
        });

        __app.get('/blob/view/:id',ensureAuthenticated,function(req,res){
            // TODO: use pipe/streams
            blobStorage.load(req.params.id, function (err, blob, filename) {
                if (err) {
                    res.send(500);
                } else {
                    var mimetype = mime.lookup(filename);
                    res.setHeader('Content-type', mimetype);
                    res.status(200);
                    res.end(blob);
                }
            });
        });


        // TODO: browse
        // example: /blob/view/b3a23bf0eb934793a97426fd8d4b22a7d1dc089d/path/in/complex/content.txt
        __app.get(/^\/blob\/view\/([0-9a-f]{40,40})\/(.+)$/,ensureAuthenticated,function(req,res){
            var hash = req.params[0];
            var subpartPath = req.params[1];
            blobStorage.loadInfos(null, function (err, infos) {
                if (err) {
                    res.send(500);
                } else {
                    if (infos.hasOwnProperty(hash)) {
                        if (infos[hash].complex) {

                            blobStorage.load(hash, function (err, blob, filename) {
                                if (err) {
                                    res.send(500);
                                    return;
                                }
                                var descriptor = JSON.parse(blob);
                                // FIXME: how to deal with leading slashes?
                                if (descriptor.hasOwnProperty(subpartPath)) {

                                    blobStorage.load(descriptor[subpartPath], function (err, blob, filename) {
                                        if (err) {
                                            res.send(500);
                                            return;
                                        }

                                        var mimetype = mime.lookup(filename);
                                        res.setHeader('Content-type', mimetype);
                                        res.status(200);
                                        res.end(blob);
                                    });
                                } else {
                                    // requested path does not exist in resource
                                    res.send(404);
                                }
                            });
                        } else {
                            res.send(400);
                        }
                    } else {
                        res.end(404);
                    }
                }
            });
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


        // other initializations
        __logger.info("initializing blob storage");
        blobStorage.initialize(function (err) {
            if (err) {
                __logger.error("failed to initialize blob storage");
            } else {
                __logger.info("blob storage is ready to use");
            }
        });

        return {

            start: start,
            stop: stop
        }
    }

    return StandAloneServer;
});
