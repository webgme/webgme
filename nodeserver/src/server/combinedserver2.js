var FS = require('fs');
var requirejs = require("requirejs");

requirejs.config({
    nodeRequire: require,
    baseUrl: "..",
    paths: {
        "core": "../../corejs/core",
        "logManager": "common/LogManager"
    }
});

requirejs(['server/proxysrv',
            'logManager',
            'common/CommonUtil'],function(PROXY,
                                           logManager,
                                           commonUtil){
    logManager.setLogLevel(logManager.logLevels.WARNING);
    logManager.useColors(true);
    var Server = function(parameters){
        var logger = logManager.create("combined-server");
        var iologger = logManager.create("socket.io");
        var iopar =  commonUtil.combinedserver.srvsocketpar;
        iopar.logger = iopar.logger || iologger;
        var waitingList = [];
        var ongoingReads = 0;
        var maxParalellReads = 10;
        var readFileEnded = function(){
            var next = waitingList.pop();
            if(next){
                readFileWork(next.path,next.req,next.res,readFileEnded)
            } else {
                ongoingReads--;
            }
        };

        var readFile = function(filepath,request,response){
            if(ongoingReads<maxParalellReads){
                ongoingReads++;
                readFileWork(filepath,request,response,readFileEnded)
            } else {
                waitingList.push({path:filepath,req:request,res:response});
            }
        };

        var readFileWork = function(filepath,request,response,callback){
            FS.readFile(filepath, function(err,data){
                if(err){
                    response.writeHead(500);
                    logger.error("Error getting the file:" +__dirname + clientsrcfolder +request.url);
                    response.end('Error loading ' + request.url);
                } else {
                    if(request.url.indexOf('.js')>0){
                        logger.debug("HTTP RESP - "+request.url);
                        response.writeHead(200, {
                            'Content-Length': data.length,
                            'Content-Type': 'application/x-javascript' });

                    } else if (request.url.indexOf('.css')>0) {
                        logger.debug("HTTP RESP - "+request.url);
                        response.writeHead(200, {
                            'Content-Length': data.length,
                            'Content-Type': 'text/css' });

                    }
                    else{
                        response.writeHead(200);
                    }
                    response.end(data);
                }
                callback();
            });
        };


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

            readFile(__dirname + clientsrcfolder +req.url,req,res);

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



