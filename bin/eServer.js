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
    'storage/sioserver',
    'storage/cache',
    'storage/mongo',
    'storage/log',
    'auth/securityserver',
    'auth/udm',
    'auth/udmpass',
    'auth/crypto',
    'util/common'],function(
    logManager,
    CONFIG,
    Server,
    Cache,
    Mongo,
    Log,
    SServer,
    UDM,
    UDMPASS,
    CRYPTO,
    COMMON){
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
        'log level'          : 1
    };
    var sitekey = require('fs').readFileSync("proba-key.pem");
    var sitecertificate = require('fs').readFileSync("proba-cert.pem");
    var app = express();
    var udm = null;
    var udmpass = null;
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
            if (req.isAuthenticated()) { return next(); }
            res.redirect('/login')
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
        app.use(express.session({ secret: 'keyboard cat' }));
        app.use(passport.initialize());
        app.use(passport.session());
        app.use(app.router);
    });
    //GET


    //starting point
    app.get('/',ensureAuthenticated,function(req,res){
        res.sendfile(staticclientdirpath+'/index.html',{user:req.user},function(err){
            res.send(404);
        });
    });


    app.get('/login',function(req,res){
        res.sendfile(staticclientdirpath+'/login.html',{user:req.user,message:req.flash('error')},function(err){
            res.send(404);
        });
    });
    app.post('/login',passport.authenticate('local',{failureRedirect: '/login'}), function(req,res){
        res.cookie('webgme',req.user.id);
        res.redirect('/');
    });
    app.get('/login/google',passport.authenticate('google'));
    app.get('/login/google/return',passport.authenticate('google',{failureRedirect: '/login'}),function(req,res){
        res.cookie('webgme',req.user.id);
        res.redirect('/');
    });




    //static contents
    //javascripts - core and transportation related files
    app.get(/^\/(common|util|storage|core|config|auth|bin)\/.*\.js/,ensureAuthenticated,function(req,res){
        res.sendfile(path.join(staticdirpath,req.path),function(err){
            res.send(404);
        });
    });
    //client contents - js/html/css
    //css classified as not secure content
    app.get(/^\/.*\.(css)/,function(req,res){
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

    console.log(parameters);
    var httpServer = null;
    if(parameters.httpsecure){
        httpServer = https.createServer({key:sitekey,cert:sitecertificate}, app).listen(parameters.port);
    } else {
        httpServer = http.createServer(app).listen(parameters.port);
    }


    var storage = null;
    if(parameters.authentication === null || parameters.authentication === undefined || parameters.authentication === 'none'){
        storage = new Server(new Log(new Cache(new Mongo({
            host: parameters.mongoip,
            port: parameters.mongoport,
            database: parameters.mongodatabase
        }),{}),{log:logManager.create('combined-server-storage')}),{combined:httpServer,logger:iologger,session:false});
    } else {
        storage = new Server(new SServer(new Log(new Cache(new Mongo({
            host: parameters.mongoip,
            port: parameters.mongoport,
            database: parameters.mongodatabase
        }),{}),{log:logManager.create('combined-server-storage')}),{udm:udm,crypto:CRYPTO}),{combined:httpServer,logger:iologger,session:true});
    }

    storage.open();
});