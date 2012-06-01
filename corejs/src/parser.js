/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

var requirejs = require("requirejs");

requirejs.config({
	nodeRequire: require
});

requirejs([ "assert", "lib/sax", "fs", "mongo", "pertree", "branch" ], function (ASSERT, SAX, FS,
Mongo, PerTree, Branch) {
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
				console.log("Parsing start");
				input.stream.pipe(parser);
			});

			parser.on("error", function (err) {
				exit("Unknown parser error: " + JSON.stringify(err));
			});

			parser.on("end", callback);
		}
	};

	// ------- branch -------

	var pertree = new PerTree(database.mongo);
	var branch = new Branch(pertree);

	var root;
	var meta;

	// ------- parser -------

	var nodes = [];

	var parser = SAX.createStream(true, {});
	parser.on("opentag", function (data) {
		data.text = "";
		nodes.push(data);

		console.log("open:", data.name);
	});

	parser.on("text", function (data) {
		if( nodes.length !== 0 ) {
			var node = nodes[nodes.length - 1];
			node.text += data;
		}
	});

	parser.on("closetag", function (data) {
		ASSERT(nodes.length !== 0);

		var node = nodes.pop();
		ASSERT(node.name === data);

		console.log("close:", node);
	});

	// ------- main -------

	var filename = process.argv[2];
	if( !filename ) {
		exit("Usage: node parser.js <metafile.xmp>");
	}
	else {
		database.open(function () {

			root = branch.createNode();
			branch.setAttribute(root, "name", "root");

			meta = branch.createNode();
			branch.attach(meta, root);

			input.open(filename, parser, function () {
				console.log("Parsing done");
				
				console.log("Saving objects");
				branch.persist(root, function (err) {
					if( err ) {
						exit("Database error: " + JSON.stringify(err));
					}
					else {
						console.log("Saving done");

						pertree.dumpTree(branch.getKey(root), function(err2) {
							ASSERT(!err2);

							close();
						});
					}
				});
			});
		});
	}
});
