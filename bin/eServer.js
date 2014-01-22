/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

var requirejs = require("requirejs"),
    express = require('express'),
    passport = require('passport'),
    stratGugli = require('passport-google').Strategy,
    path = require('path'),
    https = require('https'),
    http = require('http');


requirejs.config({
    nodeRequire: require,
    baseUrl: __dirname + "/..",
    paths: {
        "core":"core",
        "logManager": "common/LogManager",
        "util": "util",
        "storage": "storage",
        "user": "user",
        "config": 'config',
        "cli": 'cli',
        "bin": 'bin',
        "auth": 'auth',
        "coreclient": 'coreclient'

    }
});

requirejs(['logManager',
    'bin/getconfig',
    'storage/serverstorage',
    'storage/server',
    'storage/cache',
    'storage/mongo',
    'storage/log',
    'auth/sessionstore',
    'auth/vehicleforgeauth',
    'auth/gmeauth',
    'util/newrest'],function(
    logManager,
    CONFIG,
    Storage,
    Server,
    Cache,
    Mongo,
    Log,
    SStore,
    VFAUTH,
    GMEAUTH,
    REST){
    var parameters = CONFIG;
    var logLevel = parameters.loglevel || logManager.logLevels.WARNING;
    var logFile = parameters.logfile || 'server.log';
    logManager.setLogLevel(logLevel);
    logManager.useColors(true);
    logManager.setFileLogPath(logFile);
    var logger = logManager.create("enhancedServer");
    var iologger = logManager.create("socket.io");
    var sitekey = null;
    var sitecertificate = null;
    var _REST = null;
    if(parameters.httpsecure){
        sitekey = require('fs').readFileSync("proba-key.pem");
        sitecertificate = require('fs').readFileSync("proba-cert.pem");
    }
    var app = express();

    var __sessionStore = new SStore();

    var forge = new VFAUTH({session:__sessionStore});
    var gme = new GMEAUTH({session:__sessionStore,host:parameters.mongoip,port:parameters.mongoport,database:parameters.mongodatabase,guest:parameters.guest});

    var globalAuthorization = function(sessionId,projectName,type,callback){
        __sessionStore.get(sessionId,function(err,data){
            if(!err && data){
                switch (data.userType){
                    case 'GME':
                        gme.authorize(sessionId,projectName,type,callback);
                        break;
                    case 'vehicleForge':
                        forge.authorize(sessionId,projectName,type,callback);
                        break;
                    default:
                        callback('unknown user type',false);
                }
            } else {
                err = err || 'session not found';
                callback(err,false);
            }
        });
    };



    //for session handling we save the user data to the memory and reuse them in case of need
    var _users = {};
    passport.serializeUser(function(user, done) {
        _users[user.id] = user;
        done(null, user.id);
    });
    passport.deserializeUser(function(id, done) {
        done(null,_users[id]);
    });

    var googleAuthenticaitonSet = false;
    function checkGoogleAuthentication(req,res,next){
        if(googleAuthenticaitonSet === true){
            return next();
        } else {
            var protocolPrefix = parameters.httpsecure === true ? 'https://' : 'http://';
            passport.use(new stratGugli({
                    returnURL: protocolPrefix+req.headers.host +'/login/google/return',
                    realm: protocolPrefix+req.headers.host
                },
                function(identifier, profile, done) {
                    return done(null,{id:profile.emails[0].value});
                }
            ));
            googleAuthenticaitonSet = true;
            return next();
        }
    }

    function checkREST(req,res,next){
        if(_REST === null){
            var protocolPrefix = parameters.httpsecure === true ? 'https://' : 'http://';
            _REST = new REST({host:parameters.mongoip,port:parameters.mongoport,database:parameters.mongodatabase,baseUrl:protocolPrefix+req.headers.host+'/rest'});
        }
        return next();
    }


    function ensureAuthenticated(req, res, next) {
        if(true === parameters.authentication){
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


    var staticclientdirpath = path.resolve(__dirname+'./../client');
    var staticdirpath = path.resolve(__dirname+'./..');



    app.configure(function(){
        app.use(express.logger());
        app.use(express.cookieParser());
        app.use(express.bodyParser());
        app.use(express.methodOverride());
        app.use(express.session({store: __sessionStore, secret: parameters.sessioncookiesecret, key: parameters.sessioncookieid}));
        app.use(passport.initialize());
        app.use(passport.session());
        app.use(app.router);
    });
    //GET


    //starting point
    app.get('/',checkVF,ensureAuthenticated,function(req,res){
        res.sendfile(staticclientdirpath+'/index.html',{user:req.user},function(err){
            res.send(404);
        });
    });


    //authentication related routing
    app.get('/logout', function(req, res){
        res.clearCookie('webgme');
        res.clearCookie('isisforge'); //todo is this really needed
        req.logout();
        req.session.authenticated = false;
        req.session.userType = 'unknown';
        res.redirect('/');
    });
    app.get('/login',function(req,res){
        res.sendfile(staticclientdirpath+'/login.html',{},function(err){
            res.send(404);
        });
    });
    app.post('/login',gme.authenticate,function(req,res){
        res.cookie('webgme',req.session.udmId);
        res.redirect('/');
    });
    app.get('/login/google',checkGoogleAuthentication,passport.authenticate('google'));
    app.get('/login/google/return',gme.authenticate,function(req,res){
        res.cookie('webgme',req.session.udmId);
        res.redirect('/');
    });
    app.get('/login/forge',forge.authenticate,function(req,res){
        res.cookie('webgme',req.session.udmId);
        res.redirect('/');
    });


    //static contents
    //javascripts - core and transportation related files
    app.get(/^\/(common|util|storage|core|config|auth|bin|coreclient)\/.*\.js$/,ensureAuthenticated,function(req,res){
        res.sendfile(path.join(staticdirpath,req.path),function(err){
            res.send(404);
        });
    });
    //client contents - js/html/css
    //css classified as not secure content
    app.get(/^\/.*\.(css|ico)$/,function(req,res){
        res.sendfile(staticclientdirpath+req.path,function(err){
            res.send(404);
        });
    });
    app.get(/^\/.*\.(js|html|gif|png|bmp|svg|json)$/,ensureAuthenticated,function(req,res){
        //package.json
        if(req.path === '/package.json') {
            res.sendfile(staticdirpath+req.path,function(err){
                res.send(404);
            });
        } else {
            res.sendfile(staticclientdirpath+req.path,function(err){
                res.send(404);
            });
        }
    });
    //rest functionality
    app.get('/rest/*',checkREST,function(req,res){

        var urlArray = req.url.split('/');
        if(urlArray.length > 2){
            var command = urlArray[2];
            var parameters = urlArray.slice(3);
            _REST.initialize(function(err){
                if(err){
                    res.send(500);
                } else {
                    _REST.doRESTCommand(_REST.request.GET,command,parameters,function(httpStatus,object){
                        if(command === _REST.command.etf){
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
                            res.end(JSON.stringify(object,null,2));
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
    //other get
    app.get('*',function(req,res){
        res.send(400);
    });

    var httpServer = null;
    if(parameters.httpsecure){
        httpServer = https.createServer({key:sitekey,cert:sitecertificate}, app).listen(parameters.port);
    } else {
        httpServer = http.createServer(app).listen(parameters.port);
    }


    var storage = null;
    var __storageOptions = {combined:httpServer,logger:iologger,session:false,cookieID:parameters.sessioncookieid};
    if(true === parameters.authentication){
        __storageOptions.session = true;
        __storageOptions.sessioncheck = __sessionStore.check;
        __storageOptions.secret = parameters.sessioncookiesecret;
        __storageOptions.authorization = globalAuthorization;
        __storageOptions.authInfo = gme.getAuthorizationInfo;
    }

    __storageOptions.host = parameters.mongoip;
    __storageOptions.port = parameters.mongoport;
    __storageOptions.database = parameters.mongodatabase;
    __storageOptions.log = logManager.create('combined-server-storage');

    storage = Storage(__storageOptions);

    storage.open();

    //debug information
    if(parameters.debug === true){
        console.log('parameters of webgme server:');
        console.log(parameters);
    }
    var networkIfs = require('os').networkInterfaces();
    for(var dev in networkIfs){
        networkIfs[dev].forEach(function(netIf){
            if(netIf.family === 'IPv4'){
                var address = parameters.httpsecure ? 'https' : 'http' + '://' + netIf.address + ':' + parameters.port;
                logger.info(address);
                if(parameters.debug === true){
                    console.log('valid address of webgme server: '+address);
                }
            }
        });
    }
});