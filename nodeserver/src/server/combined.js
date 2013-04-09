var FS = require('fs');
var requirejs = require("requirejs");

requirejs.config({
    nodeRequire: require,
    baseUrl: "..",
    paths: {
        "core":"../../nodeserver/src/core",
        "logManager": "common/LogManager",
        "util": "../../nodeserver/src/util",
        "storage": "../../nodeserver/src/storage",
        "user": "../../nodeserver/src/user"
    }
});

requirejs(['logManager',
    'common/CommonUtil',
    'storage/socketioserver',
    'storage/cache',
    'storage/mongo'],function(
    logManager,
    commonUtil,
    Server,
    Cache,
    Mongo){
    logManager.setLogLevel(logManager.logLevels.WARNING);
    logManager.useColors(true);
    var Combined = function(parameters){
        var logger = logManager.create("combined-server");
        var iologger = logManager.create("socket.io");
        var iopar =  commonUtil.combinedserver.srvsocketpar;
        iopar.logger = iopar.logger || iologger;
        var http = require('http').createServer(function(req, res){
            logger.debug("HTTP REQ - "+req.url);

            if(req.url==='/'){
                req.url = '/index.html';
            }

            if (req.url.indexOf('/common/') === 0 || req.url.indexOf('/util/') === 0 || req.url.indexOf('/storage/') === 0 || req.url.indexOf('/core/') === 0 || req.url.indexOf('/user/') === 0) {
                clientsrcfolder = "/..";
            } else {
                clientsrcfolder = "/../client";
            }

            req.url.replace('index','index2');

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
        }).listen(80);

        var storage = new Server(new Cache(new Mongo({
            host: "129.59.105.239",
            port: 27017,
            database: "multi",
            timeout: 10000,
            local: "memory"
        }),{}),{combined:http});

        storage.open();
    };

    var server = new Combined(commonUtil.combinedserver);

});
