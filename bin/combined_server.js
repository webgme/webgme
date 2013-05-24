/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

var requirejs = require("requirejs");

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
        "cli": 'cli'
    }
});

requirejs(['logManager',
    'bin/getconfig',
    'storage/socketioserver',
    'storage/cache',
    'storage/mongo',
    'storage/log',
    'util/common'],function(
    logManager,
    CONFIG,
    Server,
    Cache,
    Mongo,
    Log,
    COMMON){

    var Combined = function(parameters){
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
        iopar.logger = iopar.logger || iologger;
        var http = require('http').createServer(function(req, res){
            logger.debug("HTTP REQ - "+req.url);

            if(req.url==='/'){
                req.url = '/index.html';
            }

            var dirname = __dirname;
            if(dirname.charAt(dirname.length-1) !== '/') {
                dirname += '/';
            }
            dirname += "./../";

            if (!(  req.url.indexOf('/common/') === 0 ||
                    req.url.indexOf('/util/') === 0 ||
                    req.url.indexOf('/storage/') === 0 ||
                    req.url.indexOf('/core/') === 0 ||
                    req.url.indexOf('/user/') === 0 ||
                    req.url.indexOf('/config/') === 0 ||
                    req.url.indexOf('/bin/') === 0)){
                dirname += "client";
            }

            require('fs').readFile(dirname + req.url, function(err,data){
                if(err){
                    res.writeHead(500);
                    console.log(req.url);
                    logger.error("Error getting the file:" + dirname + req.url);
                    return res.end('Error loading ' + req.url);
                }

                if(req.url.indexOf('.js')>0){
                    logger.debug("HTTP RESP - "+req.url);
                    res.writeHead(200, {
                        'Content-Length': data.length,
                        'Content-Type': 'application/x-javascript' });

                } else if (req.url.indexOf('.css')>0) {
                    logger.debug("HTTP RESP - "+req.url);
                    res.writeHead(200, {
                        'Content-Length': data.length,
                        'Content-Type': 'text/css' });

                }
                else{
                    res.writeHead(200);
                }
                res.end(data);
            });
        }).listen(parameters.port);

        var storage = new Server(new Log(new Cache(new Mongo({
            host: parameters.mongoip,
            port: parameters.mongoport,
            database: parameters.mongodatabase
        }),{}),{log:logManager.create('combined-server-storage')}),{combined:http,logger:iologger});

        storage.open();
    };

    function main(){
        if (COMMON.getParameters("help") !== null) {
            console.log("Usage: node combined_server.js [options]");
            console.log("");
            console.log("Starts a combined http + webgme server.");
            console.log("options are the following:");
            console.log("");
            console.log("  -help\t\t\t\t\tprints out this help message");
            console.log("");
            return;
        }

        var server = new Combined(CONFIG);

    }

    main();
});

