var FS = require('fs');
var LOGMANAGER = require('./../common/LogManager.js');
var commonUtil = require('./../common/CommonUtil.js');
LOGMANAGER.setLogLevel( LOGMANAGER.logLevels.ALL/*1*/ );
LOGMANAGER.useColors( true );
var logger = LOGMANAGER.create( "server" );
//var MNGSRV = require('./mngsrv.js');
var requirejs = require("requirejs");

requirejs.config({
    nodeRequire: require,
    baseUrl: "..",
    paths: {
        "core": "../../corejs/core"
    }
});

requirejs(['server/proxysrv'],function(PROXY){
    var Server = function(parameters){
        var http = require('http').createServer(function(req, res){
            logger.debug("HTTP REQ - "+req.url);

            if(req.url==='/'){
                req.url = '/index.html';
            }

            if (req.url.indexOf('/common/') === 0 ) {
                clientsrcfolder = "/..";
            } else {
                clientsrcfolder = "/../client";
            }

            if(req.url.indexOf('/core/') === 0) {
                logger.debug("req.url");
                clientsrcfolder = "/../../../corejs";
            }

            FS.readFile(__dirname + clientsrcfolder +req.url, function(err,data){
                if(err){
                    res.writeHead(500);
                    logger.error("Error getting the file:" +__dirname + clientsrcfolder +req.url);
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
        }),
            io = require('socket.io').listen(http,commonUtil.combinedserver.srvsocketpar);

        //io.set('log level', 1); // reduce logging
        http.listen(parameters.port);


        var logserver = io.of('/log');

        console.log('parameters',parameters);
        var proxy = PROXY({
            io        : io,
            namespace : parameters.projsrv,
            options   : parameters.srvsocketpar,
            projects  : parameters.projects,
            mongo     : {
                database   : parameters.mongodatabase,
                host       : parameters.mongoip,
                port       : parameters.mongoport,
                options    : parameters.mongoopt
            }
        });

        logserver.on('connection',function(socket){
            console.log("new connection to logserver!!!");
            socket.on('log',function(msg){
                if(parameters.logging){
                    if(parameters.logfile && FS.appendFileSync){
                        FS.appendFileSync("../test/"+parameters.logfile,"["+socket.id+"] "+msg+"\n","utf8");
                    } else{
                        console.log("["+socket.id+"] "+msg);
                    }
                }
            });
        });

        var log = function(msg){
            if(parameters.logging){
                if(canlog){
                    internallogconn.emit('log',msg);
                } else {
                    if(internallogconn === null){
                        internallogconn = require('socket.io-client').connect('http://localhost:'+parameters.port+parameters.logsrv);
                        internallogconn.on('connect',function(){
                            canlog = true;
                            log(msg);
                        });
                    }
                }
            }
        };
    };

    var server = new Server(commonUtil.combinedserver);
});



