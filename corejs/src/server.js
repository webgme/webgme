/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

var requirejs = require("requirejs");

requirejs.config({
	nodeRequire: require
});

requirejs([ "fs", "http", "socket.io" ], function (fs, http, socketio) {
	"use strict";

	var server = http.createServer(function (req, res) {
		console.log("http get: " + req.url);
		if( req.url === "/" ) {
			req.url = "/index.html";
		}

		var notFound = function () {
			console.log("not found: " + req.url);
			res.writeHead(404);
			res.end("Error loading " + req.url);
		};

		var pattern = /^\/[a-zA-Z0-9]+\.(html|js)$/;
		if( req.url.search(pattern) !== 0 ) {
			notFound();
		}
		else {
			fs.readFile(__dirname + req.url, function (err, data) {
				if( err ) {
					notFound();
				}
				else {
					if( req.url.indexOf(".js") > 0 ) {
						res.writeHead(200, {
							"Content-Length": data.length,
							"Content-Type": "application/x-javascript"
						});
					}
					else {
						res.writeHead(200);
					}

				}
				res.end(data);
			});
		}
	});

	server.listen(8082);
	console.log("webgme: listening on port 8082...");

	var io = socketio.listen(server, {
		log: false
	});

	io.sockets.on("connection", function (socket) {
		console.log("socket: connected from "
		+ socket.handshake.address.address);
		socket.emit("message", "welcome to the webgme server");
	});
});
