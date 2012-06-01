/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

var requirejs = require("requirejs");

requirejs.config({
	nodeRequire: require
});

requirejs([ "assert", "lib/sax", "fs" ], function (ASSERT, SAX, FS) {
	"use strict";

	var filename = process.argv[2];
	if(!filename) {
		console.log("Usage: node parser.js <filename>");
		return;
	}
	
	var stream = FS.createReadStream(filename);
	stream.on("error", function(err) {
		console.log(err.code === "ENOENT" ? "File not found: " + filename : "Unknown file error: " + JSON.stringify(err));
		return;
	});
	
	var parser = SAX.createStream(true, {});

	parser.on("error", function(err) {
		console.log("Unknown parser error: " + JSON.stringify(err));
		return;
	});

	parser.on("end", function() {
		console.log("Parsing done");
	});
	
	parser.on("opentag", function(data) {
		console.log("opentag:", data);
	});
	
	parser.on("closetag", function(data) {
		console.log("closetag:", data);
	});
	
	parser.on("text", function(data) {
		console.log("text:", data);
	});
	
	console.log("Parsing start");
	stream.pipe(parser);
});
