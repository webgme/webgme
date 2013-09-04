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
    path = require('path'),
    https = require('https');


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

    var users = {
        kecso : {
            password: 'pass',
            id:42
        }
    };

    function findUser(username, callback){
        if(users[username]){
            callback(null,users[username]);
        } else {
            callback('no user',null);
        }
    }

    function findById(id, callback){
        for(var i in users){
            if (users[i].id === id){
                return callback(null,users[i]);
            }
        }
        return callback(null,null);
    }

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        findById(id, function (err, user) {
            done(err, user);
        });
    });
    passport.use(new strategy(
        function(username, password, done) {
            // asynchronous verification, for effect...
            process.nextTick(function () {

                // Find the user by username.  If there is no user with the given
                // username, or the password is not correct, set the user to `false` to
                // indicate failure and set a flash message.  Otherwise, return the
                // authenticated `user`.
                findUser(username, function(err, user) {
                    if (err) { return done(err); }
                    if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
                    if (user.password != password) { return done(null, false, { message: 'Invalid password' }); }
                    return done(null, user);
                });
            });
        }
    ));

    function ensureAuthenticated(req, res, next) {
        if (req.isAuthenticated()) { return next(); }
        res.redirect('/login')
    }


    var staticclientdirpath = path.resolve(__dirname+'./../client');
    var staticdirpath = path.resolve(__dirname+'./..');
    console.log(staticdirpath);
    console.log(staticclientdirpath);

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
            console.log(err);
            res.send(404);
        });
    });
    app.get('/login',function(req,res){
        res.sendfile(staticclientdirpath+'/login.html',{user:req.user,message:req.flash('error')},function(err){
            console.log(err);
            res.send(404);
        });
    });
    app.post('/login',function(req,res,next){
        console.log(req.param('username'),req.param('password'));
        passport.authenticate('local', function(err, user, info) {
            if (err) { return next(err) }
            if (!user) {
                req.flash('error', info.message);
                return res.redirect('/login')
            }
            req.logIn(user, function(err) {
                if (err) { return next(err); }
                return res.redirect('/');
            });
        })(req, res, next);
    });


    //static contents
    //javascripts - core and transportation related files
    app.get(/^\/(common|util|storage|core|config|auth|bin)\/.*\.js/,ensureAuthenticated,function(req,res){
        res.sendfile(path.join(staticdirpath,req.path),function(err){
            console.log(err);
            res.send(404);
        });
    });
    //client contents - js/html/css/scss
    app.get(/^\/.*\.(js|css|scss|html|gif|png|bmp)/,ensureAuthenticated,function(req,res){
        res.sendfile(staticclientdirpath+req.path,function(err){
            console.log(err);
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

    var httpsServer = https.createServer({key:sitekey,cert:sitecertificate}, app).listen(parameters.port);
    var udm = new UDM();

    var storage = new Server(new SServer(new Log(new Cache(new Mongo({
        host: parameters.mongoip,
        port: parameters.mongoport,
        database: parameters.mongodatabase
    }),{}),{log:logManager.create('combined-server-storage')}),{udm:udm,crypto:CRYPTO}),{combined:httpsServer,logger:iologger});

    udm.initialize(function(err){
        if(!err){
            storage.open();
        } else {
            throw "cannot initialize UserDataManager";
        }
    });
});