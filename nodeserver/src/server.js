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

var http = HT.createServer(httpGet);
var io = IO.listen(http);
io.set('log level', 1); // reduce logging
var librarian = new LI.Librarian();

http.listen(8081);
function httpGet(req, res){
	console.log("httpGet - start - "+req.url);
	if(req.url==='/'){
		req.url = '/index.html';
	}
	FS.readFile(__dirname+req.url, function(err,data){
		if(err){
			res.writeHead(500);
			return res.end('Error loading ' + req.url);
		}
		if(req.url.indexOf('.js')>0){
			console.log("sending back js :"+req.url);
			res.writeHead(200, {
  				'Content-Length': data.length,
  				'Content-Type': 'application/x-javascript' });

		} else if (req.url.indexOf('.css')>0) {
            console.log("sending back css :"+req.url);
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
	console.log("adding client to project: "+JSON.stringify(socket.handshake));
	var proj = librarian.open(projid);
	proj.addClient(socket);
});
