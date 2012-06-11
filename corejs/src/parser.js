/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

var requirejs = require("requirejs");

requirejs.config({
	nodeRequire: require
});

requirejs(
[ "assert", "lib/sax", "fs", "mongo", "core", "config", "util", "metabuilder" ],
function (ASSERT, SAX, FS, Mongo, Core, CONFIG, UTIL, metabuilder) {
	"use strict";

	// ------- parser -------

	var parse = function (storage, filename, callback) {
		ASSERT(storage && filename && callback);

		var ids = {};
		var idCount = 0;

		var timerhandle = setInterval(function () {
			console.log("  at line " + parser._parser.line + " (" + total + " objects, " + idCount
			+ " ids)");
		}, CONFIG.parser.reportingTime);

		var core = new Core(storage);

		var exit = function (err, result) {
			if( timerhandle ) {
				clearInterval(timerhandle);
				timerhandle = undefined;
			}

			if( callback ) {
				callback(err, result);
				callback = undefined;
			}
		};

		var tags = [];

		var persisting = 1;
		var persist = function () {
			ASSERT(tags.length !== 0);
			ASSERT(persisting >= 1);

			core.persist(tags[0].node, function (err) {
				if( err ) {
					exit(err);
				}
				else if( --persisting === 0 ) {
					var key = core.getKey(tags[0].node);

					console.log("Parsing done (" + total + " objects, " + idCount + " ids)");
					console.log("Root key = " + key);

					tags = null;
					core = null;

					exit(null, key);
				}
			});
		};

		var total = 0;
		var counter = 0;

		var addTag = function (tag) {
			var node = core.createNode();

			if( tags.length !== 0 ) {
				core.attach(node, tags[tags.length - 1].node);
			}

			for( var key in tag.attributes ) {
				core.setAttribute(node, key, tag.attributes[key]);
			}

			core.setAttribute(node, "#tag", tag.name);

			if( tag.attributes.id ) {
				ASSERT(ids[tag.attributes.id] === undefined);

				ids[tag.attributes.id] = core.getStringPath(node);
				++idCount;
			}

			tag.text = "";
			tag.node = node;

			++total;
			if( ++counter >= CONFIG.parser.persistingLimit ) {
				++persisting;
				persist();
				counter = 0;
			}

			tags.push(tag);
		};

		addTag({
			name: "Root",
			attributes: {
				created: (new Date()).toString()
			}
		});

		var parser = SAX.createStream(true, {
			trim: true
		});

		parser.on("opentag", addTag);

		parser.on("closetag", function (name) {
			ASSERT(tags.length >= 2);

			var tag = tags.pop();
			ASSERT(tag.name === name);

			if( tag.text !== "" ) {
				core.setAttribute(tag.node, "#text", tag.text);
			}
		});

		parser.on("text", function (text) {
			if( tags.length !== 0 ) {
				var tag = tags[tags.length - 1];
				tag.text += text;
			}
		});

		parser.on("error", function (err) {
			exit("Unknown parser error: " + JSON.stringify(err));
		});

		parser.on("end", function () {
			ASSERT(tags.length === 1);
			core.setAttribute(tags[0].node, "#ids", ids);
			persist();
		});

		var stream = FS.createReadStream(filename);

		stream.on("error", function (err) {
			exit(err.code === "ENOENT" ? "File not found: " + filename : "Unknown file error: "
			+ JSON.stringify(err));
		});

		stream.on("open", function () {
			console.log("Parsing xml file ...");
			stream.pipe(parser);
		});
	};

	// ------- reader -------

	var comparePaths = function (a, b) {
		ASSERT(a.constructor === Array);
		ASSERT(b.constructor === Array);

		var c = a.length;
		var d = b.length;

		while( --c >= 0 && --d >= 0 ) {
			var t = a[c] - b[d];
			if( t !== 0 ) {
				return t;
			}
		}

		return a.length - b.length;
	};

	var reader = function (storage, key, callback) {
		var core = new Core(storage);
		var count = 0;

		var timerhandle;

		var enqueue = UTIL.priorityEnqueue(CONFIG.reader.concurrentReads, comparePaths,
		function (err) {
			clearInterval(timerhandle);
			console.log("Reading done (" + count + " objects)");
			callback(err);
		});

		var process = function (path, done, node) {
			// console.log(node);
			++count;
			core.loadChildren(node, function (err, children) {
				if( !err ) {
					for( var i = 0; i < children.length; ++i ) {
						var child = children[i];
						enqueue(core.getPath(child), process, child);
					}
				}
				done(err);
			});
		};

		core.loadRoot(key, function (err, node) {
			if( err ) {
				callback(err);
			}
			else {
				console.log("Reading tree ...");
				timerhandle = setInterval(function () {
					console.log("  reading " + count + " objects");
				}, CONFIG.reader.reportingTime);

				enqueue(core.getPath(node), process, node);
			}
		});
	};

	// ------- database -------

	var mongo = new Mongo();

	var closeDatabase = function () {
		if( mongo.opened() ) {
			mongo.close();
		}
	};

	var openDatabase = function (callback) {
		ASSERT(callback);

		console.log("Opening database");
		mongo.open(function (err1) {
			if( err1 ) {
				closeDatabase();
				callback("Could not open database: " + err1);
			}
			else {
				console.log("Clearing database");
				mongo.removeAll(function (err2) {
					if( err2 ) {
						closeDatabase();
						callback("Could not remove previous objects: " + JSON.stringify(err2));
					}
					else {
						callback();
					}
				});
			}
		});
	};

	// ------- main -------

	var filename = process.argv[2];
	if( !filename ) {
		console.log("Usage: node parser.js <file.xml>");
	}
	else {
		openDatabase(function (err1) {
			if( err1 ) {
				console.log(err1);
			}
			else {
				parse(mongo, filename, function (err2, key) {
					if( err2 ) {
						console.log(err2);
					}

					metabuilder(mongo, key, function (err3) {
//					reader(mongo, key, function(err3) {
						console.log("Closing database");
						closeDatabase();
					});
				});
			}
		});
	}
});
