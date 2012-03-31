/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

var fs = require('fs');

var server = require("http").createServer(function(req, res) {
	console.log("http get: " + req.url);
	if (req.url === "/") {
		req.url = "/index.html";
	}
	fs.readFile(__dirname + req.url, function(err, data) {
		if (err) {
			res.writeHead(500);
			res.end("Error loading " + req.url);
		} else {
			if (req.url.indexOf(".js") > 0) {
				res.writeHead(200, {
					"Content-Length" : data.length,
					"Content-Type" : "application/x-javascript"
				});
			} else {
				res.writeHead(200);
			}

		}
		res.end(data);
	});
});

server.listen(8082);
console.log("webgme: listening on port 8082...");

var io = require("socket.io").listen(server, {
	log : false
});

io.sockets.on("connection", function(socket) {
	console.log("socket: connected from " + socket.handshake.address.address);
	socket.emit("message", "welcome to the webgme server");
});
