var FS = require('fs');
var LOGMANAGER = require('./../common/LogManager.js');
var commonUtil = require('./../common/CommonUtil.js');

LOGMANAGER.setLogLevel( LOGMANAGER.logLevels.ALL/*1*/ );
LOGMANAGER.useColors( true );
var logger = LOGMANAGER.create( "server" );

var Server = function(parameters){
    var http = require('http').createServer(function(req, res){
            logger.debug("HTTP REQ - "+req.url);

            if(req.url==='/'){
                req.url = '/indexstda.html';
            }

            if (req.url.indexOf('/common/') === 0 ) {
                clientsrcfolder = "/..";
            } else {
                clientsrcfolder = "/../client";
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
        project = new (require('forever').Monitor) (require('path').join(__dirname,'proj3ct.js'),{'options':[parameters.ProjectPort,parameters.ProjectName,parameters.BranchName]});
        io = require('socket.io').listen(http),
        clientsrcfolder = "/../client";

    io.set('log level', 1); // reduce logging
    http.listen(parameters.ServerPort);
    project.start();

    io.sockets.on('connection', function(socket){
        logger.debug("someone connected to the static server!!!!");
    });
};

var server = new Server(commonUtil.standalone);
