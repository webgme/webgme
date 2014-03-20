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
    'os'
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
        OS
    ){

    function StandAloneServer(CONFIG){
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

            __storageOptions.basedir =  CONFIG.basedir;

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
            if(req.session.originalQuery === undefined){
                var index = req.url.indexOf('?');
                req.session.originalQuery = index === -1 ? "" : req.url.substring(index);
            }
            next();
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
            __httpServer = null;

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
            __app.use(Express.session({store: __sessionStore, secret: CONFIG.sessioncookiesecret, key: CONFIG.sessioncookieid}));
            __app.use(Passport.initialize());
            __app.use(Passport.session());
            __app.use(__app.router);
        });

        __logger.info("creating login routing rules for the static server");
        __app.get('/',storeQueryString,checkVF,ensureAuthenticated,function(req,res){
            res.sendfile(CONFIG.clientbasedir+'/index.html',{user:req.user},function(err){
                res.send(404);
            });
        });
        __app.get('/logout', function(req, res){
            res.clearCookie('webgme');
            res.clearCookie('isisforge'); //todo is this really needed
            req.logout();
            req.session.authenticated = false;
            req.session.userType = 'unknown';
            res.redirect('/');
        });
        __app.get('/login',storeQueryString,function(req,res){
            res.location('/login');
            res.sendfile(CONFIG.clientbasedir+'/login.html',{},function(err){
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
        __app.get(/^\/interpreters\/.*/,ensureAuthenticated,function(req,res){
            var tryNext = function(index){
                if(index<CONFIG.interpreterpaths.length){
                    console.log('interperter...',Path.join(CONFIG.interpreterpaths[index],req.url.substring(14)));
                    res.sendfile(Path.join(CONFIG.interpreterpaths[index],req.url.substring(14))+'.js',function(err){
                        tryNext(index+1);
                    });
                } else {
                    res.send(404);
                }
            };

            if(CONFIG.interpreterpaths && CONFIG.interpreterpaths.length){
                tryNext(0);
            } else {
                res.send(404);
            }
        });

        __logger.info("creating basic static content related routing rules");
        //static contents
        //javascripts - core and transportation related files
        __app.get(/^\/(common|util|storage|core|config|auth|bin|coreclient)\/.*\.js$/,ensureAuthenticated,function(req,res){
            res.sendfile(Path.join(CONFIG.basedir,req.path),function(err){
                res.send(404);
            });
        });
        //client contents - js/html/css
        //css classified as not secure content
        __app.get(/^\/.*\.(css|ico)$/,function(req,res){
            res.sendfile(Path.join(CONFIG.clientbasedir,req.path),function(err){
                res.send(404);
            });
        });
        __app.get(/^\/.*\.(js|html|gif|png|bmp|svg|json)$/,ensureAuthenticated,function(req,res){
            //package.json
            if(req.path === '/package.json') {
                res.sendfile(Path.join(CONFIG.basedir,req.path),function(err){
                    res.send(404);
                });
            } else {
                res.sendfile(Path.join(CONFIG.clientbasedir,req.path),function(err){
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
        __app.get('/listAllInterpreters',ensureAuthenticated,function(req,res){
            var names = []; //we add only the "*.js" files from the directories
            if(CONFIG.interpreterpaths && CONFIG.interpreterpaths.length){
                for(var i=0;i<CONFIG.interpreterpaths.length;i++){
                    var additional = FS.readdirSync(CONFIG.interpreterpaths[i]);
                    for(var j=0;j<additional.length;j++){
                        if(names.indexOf(additional[j]) === -1){
                            if(isGoodExtraAsset(additional[j],Path.join(CONFIG.interpreterpaths[i],additional[j]))){
                                names.push(additional[j]);
                            }
                        }
                    }
                }
            }
            res.status(200);
            res.end("define([],function(){ return "+JSON.stringify(names)+";});");
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
