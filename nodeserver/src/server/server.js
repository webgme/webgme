/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Tamas Kecskes
 */
/*
 * --------SERVER-------
 */

var HT = require('http');
var IO = require('socket.io');
var LI = require('./serverlibrarian.js');
var FS = require('fs');
var LOGMANAGER = require('./../common/logmanager.js');

var http = HT.createServer(httpGet);
var io = IO.listen(http);
io.set('log level', 1); // reduce logging
var librarian = new LI.Librarian();

var _clientSourceFolder = "/../client";

LOGMANAGER.setLogLevel( LOGMANAGER.logLevels.ALL );
LOGMANAGER.useColors( true );
var logger = LOGMANAGER.create( "server" );

http.listen(8081);
function httpGet(req, res){
    logger.debug("HTTP REQ - "+req.url);

	if(req.url==='/'){
		req.url = '/index.html';
	}

    if (req.url.indexOf('/common/') === 0 ) {
        _clientSourceFolder = "/..";
    } else {
        _clientSourceFolder = "/../client";
    }

	FS.readFile(__dirname + _clientSourceFolder +req.url, function(err,data){
		if(err){
			res.writeHead(500);
            logger.error("Error getting the file:" +__dirname + _clientSourceFolder +req.url);
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
};

io.sockets.on('connection', function(socket){
	var projid = "sample";
    logger.debug("Adding client to project: "+JSON.stringify(socket.handshake));
	var proj = librarian.open(projid);
	proj.addClient(socket);
});
