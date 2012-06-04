/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

var requirejs = require("requirejs");

requirejs.config({
	nodeRequire: require
});

requirejs([ "assert", "lib/sax", "fs", "mongo", "branch" ], function (ASSERT, SAX, FS, Mongo,
Branch) {
	"use strict";

	// ------- exit -------

	var close = function () {
		if( database.mongo.opened() ) {
			database.mongo.close();
		}
	};

	var exit = function (error) {
		console.log(error);
		close();
		// process.exit(1);
	};

	// ------- database -------

	var database = {
		mongo: new Mongo(),

		open: function (callback) {
			ASSERT(callback);

			database.mongo.open(function (err1) {
				if( err1 ) {
					exit("Could not connect to database: " + JSON.stringify(err1));
				}
				else {
					database.mongo.removeAll(function (err2) {
						if( err2 ) {
							exit("Could not previous objects: " + JSON.stringify(err2));
						}
						else {
							callback();
						}
					});
				}
			});
		}
	};

	// ------- input -------

	var input = {
		stream: null,

		open: function (filename, parser, callback) {
			ASSERT(filename && parser && callback);

			input.stream = FS.createReadStream(filename);
			input.stream.on("error", function (err) {
				exit(err.code === "ENOENT" ? "File not found: " + filename : "Unknown file error: "
				+ JSON.stringify(err));
			});

			input.stream.on("open", function () {
				console.log("Parsing xml file");
				input.stream.pipe(parser);
			});

			parser.on("error", function (err) {
				exit("Unknown parser error: " + JSON.stringify(err));
			});

			parser.on("end", function () {
				console.log("Parsing done");
				callback();
			});
		}
	};

	// ------- parser -------

	var branch = new Branch(database.mongo);

	var tags = [ {
		name: "root",
		attributes: {
			created: (new Date()).toString()
		}
	} ];

	var createNode = function (tag) {
		var node = branch.createNode();

		for( var key in tag.attributes ) {
			branch.setAttribute(node, key, tag.attributes[key]);
		}

		branch.setAttribute(node, "tag", tag.name);

		tag.text = "";
		tag.node = node;
	};

	createNode(tags[0]);

	var counter = 0;
	
	var parser = SAX.createStream(true, {
		trim: true
	});

	parser.on("opentag", function (tag) {
		createNode(tag);
		branch.attach(tag.node, tags[tags.length-1].node);
		tags.push(tag);
	});

	parser.on("closetag", function (name) {
		ASSERT(tags.length >= 2);

		var tag = tags.pop();
		ASSERT(tag.name === name);

		if(tag.text !== "") {
			branch.setAttribute(tag.node, "text", tag.text);
		}
	});

	parser.on("text", function (text) {
		if( tags.length !== 0 ) {
			var tag = tags[tags.length - 1];
			tag.text += text;
		}
	});

	// ------- main -------

	var filename = process.argv[2];
	if( !filename ) {
		exit("Usage: node genparser.js <file.xml>");
	}
	else {
		database.open(function () {

			var timerhandle = setInterval(function() {
				console.log("  at line " + parser._parser.line);
			}, 1000);

			input.open(filename, parser, function () {
				ASSERT(tags.length === 1);

				clearInterval(timerhandle);
				
				console.log("Saving objects");
				branch.persist(tags[0].node, function (err) {
					if( err ) {
						exit("Database error: " + JSON.stringify(err));
					}
					else {
						console.log("Saving done");

						branch.dumpTree(branch.getKey(tags[0].node), function (err2) {
							ASSERT(!err2);

							close();
						});
					}
				});
			});
		});
	}
});
