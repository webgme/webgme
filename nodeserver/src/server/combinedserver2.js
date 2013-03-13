var FS = require('fs');
var commonUtil = require('./../common/CommonUtil.js');
var requirejs = require("requirejs");

requirejs.config({
    nodeRequire: require,
    baseUrl: "..",
    paths: {
        "core": "../../corejs/core",
        "logManager": "../../nodeserver/src/common/LogManager"
    }
});

requirejs(['server/proxysrv','logManager'],function(PROXY,logManager){
    logManager.setLogLevel(logManager.logLevels.WARNING);
    logManager.useColors(true);
    var Server = function(parameters){
        var logger = logManager.create("combined-server");
        var iologger = logManager.create("socket.io");
        var iopar =  commonUtil.combinedserver.srvsocketpar;
        iopar.logger = iopar.logger || iologger;
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

            io = require('socket.io').listen(http,iopar);

        //io.set('log level', 1); // reduce logging

        http.listen(parameters.port);
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



    };

    var server = new Server(commonUtil.combinedserver);
});



