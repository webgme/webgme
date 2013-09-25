/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

var requirejs = require("requirejs"),
    express = require('express'),
    passport = require('passport'),
    flash = require('connect-flash'),
    strategy = require('passport-local').Strategy,
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
        "auth": 'auth'

    }
});

requirejs(['logManager',
    'bin/getconfig',
    'storage/server',
    'storage/cache',
    'storage/mongo',
    'storage/log',
    'auth/gmeauth',
    'auth/udm',
    'auth/udmpass',
    'auth/sessionstore',
    'auth/vehicleforgeauth',
    'auth/ownauth'],function(
    logManager,
    CONFIG,
    Server,
    Cache,
    Mongo,
    Log,
    gAuthorization,
    UDM,
    UDMPASS,
    SStore,
    VFAUTH,
    OWNAUTH){
    var parameters = CONFIG;
    var logLevel = parameters.loglevel || logManager.logLevels.WARNING;
    var logFile = parameters.logfile || 'server.log';
    logManager.setLogLevel(logLevel);
    logManager.useColors(true);
    logManager.setFileLogPath(logFile);
    var logger = logManager.create("combined-server");
    var iologger = logManager.create("socket.io");
    var iopar =  {
        'heartbeat timeout'  : 240,
        'heartbeat interval' : 60,
        'heartbeats'         : true,
        'log level'          : 5
    };
    var sitekey = null;
    var sitecertificate = null;
    if(parameters.httpsecure){
        sitekey = require('fs').readFileSync("proba-key.pem");
        sitecertificate = require('fs').readFileSync("proba-cert.pem");
    }
    var app = express();
    var udm = null;
    var udmpass = null;

    var __sessionStore = new SStore();
    var __cookiekey = 'webgmeSid';
    var __cookiesecret = 'meWebGMEez';
    var __authorization = new gAuthorization(udm,__sessionStore);

    var forge = new VFAUTH({});
    var own = new OWNAUTH({session:__sessionStore,host:parameters.mongoip,port:parameters.mongoport,database:parameters.mongodatabase});
    if(parameters.authentication === 'gme'){
        udm = new UDM({
            host: parameters.udmip || parameters.mongoip,
            port: parameters.udmport || parameters.mongoport || 27017,
            database: parameters.udmdb || parameters.mongodatabase,
            collection: parameters.udmcollection || 'users',
            refresh: parameters.udmrefresh || 100000
        });
        udmpass = new UDMPASS(udm);
    }


    //for session handling we save the user data to the memory and reuse them in case of need
    var _users = {};
    passport.serializeUser(function(user, done) {
        _users[user.id] = user;
        done(null, user.id);
    });
    passport.deserializeUser(function(id, done) {
        done(null,_users[id]);
    });

    passport.use(new strategy(
        function(username, password, done) {
            udmpass.findUser(username,function(err,authData){
                if(err) { return done(err);}
                if(!authData) { return done(null,false, { message: 'Unknown user ' + username }); }
                if(authData.pass !== password) { return done(null, false, { message: 'Invalid password' }); }
                return done(null,authData);
            });
        }
    ));

    passport.use(new stratGugli({
            returnURL: parameters.host+':'+parameters.port+'/login/google/return',
            realm: parameters.host+':'+parameters.port
        },
        function(identifier, profile, done) {
            return done(null,{id:profile.emails[0].value});
        }
    ));

    function ensureAuthenticated(req, res, next) {
        if(parameters.authentication === null || parameters.authentication === undefined || parameters.authentication === 'none'){
            return next();
        } else {
            if(req.isAuthenticated()){
                return next();
            } else {
                if(req.session && req.session.authenticated === true){
                    return next();
                }
            }
            res.redirect('/login')
        }
    }
    function checkVF(req,res,next){
        console.log('check Vehicle Forge framework');
        if(req.cookies['isisforge']){
            res.redirect('/login/forge');
        } else {
            return next();
        }
    }


    var staticclientdirpath = path.resolve(__dirname+'./../client');
    var staticdirpath = path.resolve(__dirname+'./..');



    app.configure(function(){
        app.use(flash());
        app.use(express.logger());
        app.use(express.cookieParser());
        app.use(express.bodyParser());
        app.use(express.methodOverride());
        app.use(express.session({store: __sessionStore, secret: __cookiesecret, key: __cookiekey }));
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


    if(parameters.authentication !== 'none'){
        app.get('/logout', function(req, res){
            res.clearCookie('webgme');
            req.logout();
            req.session.authenticated = false;
            res.redirect('/');
        });
        app.get('/login',function(req,res){
            res.sendfile(staticclientdirpath+'/login.html',{user:req.user,message:req.flash('error')},function(err){
                res.send(404);
            });
        });
        app.post('/login',own.authenticate,function(req,res){
            res.redirect('/');
        });
        /*app.post('/login',passport.authenticate('local',{failureRedirect: '/login'}), function(req,res){
            req.session.authenticated = true;
            req.session.udmId = req.user.id;
            res.cookie('webgme',req.session.udmId);
            res.redirect('/');
        });*/
        app.get('/login/google',passport.authenticate('google'));
        app.get('/login/google/return',passport.authenticate('google',{failureRedirect: '/login'}),function(req,res){
            udm.getUserByEmail(req.user.id,function(err,data){
                if(!err && data){
                    req.session.udmId = data.id;
                    req.session.authenticated = true;
                    res.cookie('webgme',req.session.udmId);
                    res.redirect('/');
                } else {
                    if(parameters.guest === true){
                        udm.getUser('guest',function(err,data){
                            if(!err && data){
                                req.session.udmId = data.id;
                                req.session.authenticated = true;
                                res.cookie('webgme',req.session.udmId);
                                res.redirect('/');
                            }
                        });
                    } else {
                        req.session.authenticated = false;
                        res.redirect('/login');
                    }
                }
            });
        });
        app.get('/login/forge',forge.authenticate,function(req,res){
            res.redirect('/');
        });
    }





    //static contents
    //javascripts - core and transportation related files
    app.get(/^\/(common|util|storage|core|config|auth|bin)\/.*\.js/,ensureAuthenticated,function(req,res){
        res.sendfile(path.join(staticdirpath,req.path),function(err){
            res.send(404);
        });
    });
    //client contents - js/html/css
    //css classified as not secure content
    app.get(/^\/.*\.(css|ico)/,function(req,res){
        res.sendfile(staticclientdirpath+req.path,function(err){
            res.send(404);
        });
    });
    app.get(/^\/.*\.(js|html|gif|png|bmp)/,ensureAuthenticated,function(req,res){
        res.sendfile(staticclientdirpath+req.path,function(err){
            res.send(404);
        });
    });
    //rest functionality
    app.get('/rest/*',function(req,res){
        res.send(500);
    });
    //other get
    app.get('*',function(req,res){
        res.send(500);
    });

    var httpServer = null;
    if(parameters.httpsecure){
        httpServer = https.createServer({key:sitekey,cert:sitecertificate}, app).listen(parameters.port);
    } else {
        httpServer = http.createServer(app).listen(parameters.port);
    }


    var storage = null;
    var __storageOptions = {combined:httpServer,logger:iologger,session:false,cookieID:__cookiekey};
    if(parameters.authentication === null || parameters.authentication === undefined || parameters.authentication === 'none'){
        //nothing we go with the default options
    } else {
        __storageOptions = {combined:httpServer,logger:iologger,session:true,sessioncheck:__sessionStore.check,secret:__cookiesecret,cookieID:__cookiekey,authorization:/*__authorization.authorization*/own.authorize};
    }
    storage = new Server(new Log(new Cache(new Mongo({
        host: parameters.mongoip,
        port: parameters.mongoport,
        database: parameters.mongodatabase
    }),{}),{log:logManager.create('combined-server-storage')}),__storageOptions);


    storage.open();
});