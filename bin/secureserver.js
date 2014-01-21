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
    'storage/sioserver',
    'storage/cache',
    'storage/mongo',
    'storage/log',
    'auth/securityserver',
    'auth/udm',
    'auth/crypto',
    'util/common',
    'util/rest'],function(
    logManager,
    CONFIG,
    Server,
    Cache,
    Mongo,
    Log,
    SServer,
    UDM,
    CRYPTO,
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
        var sitekey = require('fs').readFileSync("proba-key.pem");
        var sitecertificate = require('fs').readFileSync("proba-cert.pem");
        var http = require('https').createServer({key:sitekey,cert:sitecertificate},function(req, res){
            var sendNegativeResponse = function(respCode,respBody){
                res.writeHead(respCode);
                return res.end(JSON.stringify(respBody));
            };
            var processRest = function(body){
                var goOn = function(){
                    switch(req.method){
                        case 'GET':
                            rest.processGET(req.url,sendRestResponse);
                            break;
                        case 'DELETE':
                            rest.processDELETE(req.url,sendRestResponse);
                            break;
                        case 'POST':
                            rest.processPOST(req.url,body,sendRestResponse);
                            break;
                        case 'PUT':
                            rest.processPUT(req.url,body,sendRestResponse);
                            break;
                    }
                };
                if(req.url.indexOf('/rest/') >=0){
                    if(restOpened){
                        goOn();
                    } else {
                        rest.open(function(err){
                            if(!err){
                                restOpened = true;
                                goOn();
                            } else {
                                sendNegativeResponse(500,'rest interface cannot be opened');
                            }
                        });
                    }
                } else {
                    sendNegativeResponse(400,'');
                }
            };
            var sendRestResponse = function(err,data){
                var responseData = {error:null,msg:'',data:null};
                if(err){
                    //TODO how and where to make proper error handling???
                    responseData.error = 'error during request processing';
                    responseData.msg = JSON.stringify(err);
                }
                if(data){
                    responseData.data = data;
                }

                responseData = JSON.stringify(responseData);
                res.writeHead(200, {
                    'Content-Length': responseData.length,
                    'Content-Type': 'application/json' });
                res.end(responseData);
            };

            switch(req.method){
                case 'POST':
                case 'PUT':
                    var body = '';
                    req.on('data', function (data) {
                        body += data;
                    });
                    req.on('end', function () {
                        processRest(body);
                    });
                    break;
                case 'DELETE':
                    processRest(null);
                    break;
                case 'GET':
                    if(req.url.indexOf('/rest/') >=0){
                        processRest(null);
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
                            req.url.indexOf('/bin/') === 0 ||
                            req.url.indexOf('/auth/') === 0)){
                            dirname += "client";
                        }

                        require('fs').readFile(dirname + req.url, function(err,data){
                            if(err){
                                logger.error("Error getting the file:" + dirname + req.url);
                                sendNegativeResponse(404,'Error loading ' + req.url);
                            } else {
                                if(req.url.indexOf('.js')>0){
                                    logger.debug("HTTPS RESP - "+req.url);
                                    res.writeHead(200, {
                                        'Content-Length': data.length,
                                        'Content-Type': 'application/x-javascript' });

                                } else if (req.url.indexOf('.css')>0) {
                                    logger.debug("HTTPS RESP - "+req.url);
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

        var udm = new UDM();

        var storage = new Server(new SServer(new Log(new Cache(new Mongo({
            host: parameters.mongoip,
            port: parameters.mongoport,
            database: parameters.mongodatabase
        }),{}),{log:logManager.create('combined-server-storage')}),{udm:udm,crypto:CRYPTO}),{combined:http,logger:iologger});

        udm.initialize(function(err){
            if(!err){
                storage.open();
            } else {
                throw "cannot initialize UserDataManager";
            }
        });
    };

    function main(){
        if (COMMON.getParameters("help") !== null) {
            console.log("Usage: node secureserver.js [options]");
            console.log("");
            console.log("Starts a combined https + webgme server with user authentication support.");
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
