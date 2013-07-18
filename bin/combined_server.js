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
    'util/common',
    'util/rest'],function(
    logManager,
    CONFIG,
    Server,
    Cache,
    Mongo,
    Log,
    COMMON,
    REST){

    var Combined = function(parameters){
        var logLevel = parameters.loglevel || logManager.logLevels.WARNING;
        var logFile = parameters.logfile || 'server.log';
        var rest = REST({ip:parameters.mongoip,port:parameters.mongoport,database:parameters.mongodatabase});
        var restOpened = false;
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
            var sendNegativeResponse = function(respCode,respBody){
                res.writeHead(respCode);
                return res.end(JSON.stringify(respBody));
            };

            switch(req.method){
                case 'POST':
                    var body = '';
                    req.on('data', function (data) {
                        body += data;
                    });
                    req.on('end', function () {
                        var go = function(){
                            rest.processPOST(req.url,body,function(err,data){
                                if(err){
                                    sendNegativeResponse(500,err);
                                } else {
                                    if(data){
                                        data = JSON.stringify(data);
                                        res.writeHead(200, {
                                            'Content-Length': data.length,
                                            'Content-Type': 'application/json' });
                                        res.end(data);
                                    } else {
                                        res.writeHead(200, {
                                            'Content-Length': 0,
                                            'Content-Type': 'application/json' });
                                        res.end();
                                    }
                                }
                            });
                        };
                        if(restOpened){
                            go();
                        } else {
                            rest.open(function(err){
                                if(!err){
                                    restOpened = true;
                                    go();
                                } else {
                                    sendNegativeResponse(500,'rest interface cannot be opened');
                                }
                            });
                        }
                    });
                    break;
                case 'DELETE':
                    if(req.url.indexOf('/rest/') >=0){
                        var goOn = function(){
                            rest.processDELETE(req.url,function(err,data){
                                if(err){
                                    sendNegativeResponse(500,err);
                                } else {
                                    if(data){
                                        data = JSON.stringify(data);
                                        res.writeHead(200, {
                                            'Content-Length': data.length,
                                            'Content-Type': 'application/json' });
                                        res.end(data);
                                    } else {
                                        res.writeHead(200, {
                                            'Content-Length': 0,
                                            'Content-Type': 'application/json' });
                                        res.end();
                                    }
                                }
                            });
                        };
                        if(restOpened){
                            goOn();
                        } else {
                            rest.open(function(err){
                                console.log(err);
                                if(!err){
                                    restOpened = true;
                                    goOn();
                                }
                            });
                        }
                    } else {
                       sendNegativeResponse(400,'');
                    }
                    break;
                case 'PUT':
                    var body = '';
                    req.on('data', function (data) {
                        body += data;
                    });
                    req.on('end', function () {
                        var go = function(){
                            rest.processPUT(req.url,body,function(err,data){
                                if(err){
                                    sendNegativeResponse(500,err);
                                } else {
                                    if(data){
                                        data = JSON.stringify(data);
                                        res.writeHead(200, {
                                            'Content-Length': data.length,
                                            'Content-Type': 'application/json' });
                                        res.end(data);
                                    } else {
                                        res.writeHead(200, {
                                            'Content-Length': 0,
                                            'Content-Type': 'application/json' });
                                        res.end();
                                    }
                                }
                            });
                        };
                        if(restOpened){
                            go();
                        } else {
                            rest.open(function(err){
                                if(!err){
                                    restOpened = true;
                                    go();
                                } else {
                                    sendNegativeResponse(500,'rest interface cannot be opened');
                                }
                            });
                        }
                    });
                    break;
                default: //GET
                    logger.debug("HTTP REQ - "+req.url);
                    if(req.url.indexOf('/rest/') >=0){
                        var goOn = function(){
                            rest.processGET(req.url,function(err,data){
                                if(err){
                                    sendNegativeResponse(500,err);
                                } else {
                                    data = JSON.stringify(data);
                                    res.writeHead(200, {
                                        'Content-Length': data.length,
                                        'Content-Type': 'application/json' });
                                    res.end(data);
                                }
                            });
                        };
                        if(restOpened){
                            goOn();
                        } else {
                            rest.open(function(err){
                                console.log(err);
                                if(!err){
                                    restOpened = true;
                                    goOn();
                                }
                            });
                        }
                    } else {
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
                                logger.error("Error getting the file:" + dirname + req.url);
                                sendNegativeResponse(404,'Error loading ' + req.url);
                            } else {
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
                            }
                        });
                    }
                    break;
            }
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

