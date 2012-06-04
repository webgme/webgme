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

	// ------- branch -------

	var branch = new Branch(database.mongo);

	var root = branch.createNode();
	branch.setAttribute(root, "name", "root");
	branch.setAttribute(root, "created", (new Date()).toString());

	var meta = branch.createNode();
	branch.attach(meta, root);

	// ------- parser -------

	var nodes = [];
	var nameLookup = [];

	var getPath = function () {
		var path = [];
		for( var i = 0; i < nodes.length; ++i ) {
			var node = nodes[i];

			ASSERT(node.attributes.name);
			path.push(node.attributes.name);
		}
		return path;
	};

	var parser = SAX.createStream(true, {
		trim: true
	});
	parser.on("opentag", function (node) {
		node.text = "";
		nodes.push(node);

		var obj;

		if( node.name === "paradigm" ) {
			node._obj = meta;

			branch.setAttribute(meta, "name", node.attributes.name);
			branch.setAttribute(meta, "created", node.attributes.cdate);
			branch.setAttribute(meta, "modified", node.attributes.mdate);

			branch.setRegistry(meta, "metatype", "paradigm");
			branch.setRegistry(meta, "guid", node.attributes.guid);

		}
		else if( node.name === "attrdef" ) {
			obj = branch.createNode();
			branch.attach(obj, meta);
			node._obj = obj;

			nameLookup.push({
				path: getPath(),
				obj: obj
			});

			branch.setAttribute(obj, "name", node.attributes.name);
			branch.setAttribute(obj, "value", node.attributes.defvalue);

			branch.setRegistry(obj, "metatype", "attrdef");
			branch.setRegistry(obj, "metaref", node.attributes.metaref);
			branch.setRegistry(obj, "valuetype", node.attributes.valuetype);
		}
		else if( node.name === "atom" || node.name === "connection" || node.name === "model"
		|| node.name === "folder" ) {
			obj = branch.createNode();
			branch.attach(obj, meta);
			node._obj = obj;

			nameLookup.push({
				path: getPath(),
				obj: obj
			});

			branch.setAttribute(obj, "name", node.attributes.name);

			branch.setRegistry(obj, "metatype", node.name);
			branch.setRegistry(obj, "metaref", node.attributes.metaref);
		}
	});

	parser.on("closetag", function (data) {
		ASSERT(nodes.length !== 0);

		var node = nodes.pop();
		ASSERT(node.name === data);

		var top = nodes[nodes.length - 1];

		if( node.name === "comment" ) {
			ASSERT(top.name === "paradigm");

			branch.setAttribute(meta, "comment", node.text);
		}
		else if( node.name === "author" ) {
			ASSERT(top.name === "paradigm");

			branch.setAttribute(meta, "author", node.text);
		}
		else if( node.name === "regnode" ) {
			if( top._obj ) {
				branch.setRegistry(top._obj, node.attributes.name, node.attributes.value);
			}
			else {
				console.log("Warning, dropped regnode:", node);
			}
		}
		else if( node.name === "dispname" ) {
			if( top._obj ) {
				branch.setRegistry(top._obj, "dispname", node.text);
			}
			else {
				console.log("Warning, dropped dispname:", node);
			}
		}
	});

	parser.on("text", function (data) {
		if( nodes.length !== 0 ) {
			var node = nodes[nodes.length - 1];
			node.text += data;
		}
	});

	// ------- main -------

	var filename = process.argv[2];
	if( !filename ) {
		exit("Usage: node parser.js <metafile.xmp>");
	}
	else {
		database.open(function () {

			input.open(filename, parser, function () {

				console.log("Saving objects");
				branch.persist(root, function (err) {
					if( err ) {
						exit("Database error: " + JSON.stringify(err));
					}
					else {
						console.log("Saving done");

						branch.dumpTree(branch.getKey(root), function (err2) {
							ASSERT(!err2);

							close();
						});
					}
				});
			});
		});
	}
});
