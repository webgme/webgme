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

	// ------- parser -------

	var parse = function (storage, filename, callback) {
		ASSERT(storage && filename && callback);

		var timerhandle = setInterval(function () {
			console.log("  at line " + parser._parser.line + " (" + total + " objects)");
		}, 5000);

		var branch = new Branch(storage);

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

		var tags = [ {
			name: "Root",
			attributes: {
				created: (new Date()).toString()
			}
		} ];

		var persisting = 1;
		var persist = function () {
			ASSERT(tags.length !== 0);
			ASSERT(persisting >= 1);

			branch.persist(tags[0].node, function (err) {
				if( err ) {
					exit(err);
				}
				else if( --persisting === 0 ) {
					console.log("Parsing done (" + total + " objects)");

					var key = branch.getKey(tags[0].node);
					tags = null;
					branch = null;
					
					exit(null, key);
				}
			});
		};

		var total = 0;
		var counter = 0;

		var createNode = function (tag) {
			var node = branch.createNode();

			for( var key in tag.attributes ) {
				branch.setAttribute(node, key, tag.attributes[key]);
			}

			branch.setAttribute(node, "tag", tag.name);

			tag.text = "";
			tag.node = node;

			++total;
			if( ++counter >= 20000 ) {
				++persisting;
				persist();
				counter = 0;
			}
		};

		createNode(tags[0]);

		var parser = SAX.createStream(true, {
			trim: true
		});

		parser.on("opentag", function (tag) {
			createNode(tag);
			branch.attach(tag.node, tags[tags.length - 1].node);
			tags.push(tag);
		});

		parser.on("closetag", function (name) {
			ASSERT(tags.length >= 2);

			var tag = tags.pop();
			ASSERT(tag.name === name);

			if( tag.text !== "" ) {
				branch.setAttribute(tag.node, "text", tag.text);
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

	// ------- paths -------
	
	var binarySearch = function(array, element) {
		ASSERT(array.constructor === Array);
		ASSERT(path.constructor === Array);
		
		var low = 0;
		var high = array.length-1;
		
		while( low < high ) {
			var mid = Math.floor((low + high) / 2);
			ASSERT(mid < high);

			
		}
		
		return low;
	};
	
	var mergePath = function(array, path) {
	};
	
	// ------- reader -------

	var reader = function(storage, key, callback) {
		var branch = new Branch(storage);
		
		var error = null;
		var count = 0;

		var timerhandle = setInterval(function () {
			console.log("  reading " + count + " objects");
		}, 5000);

		var missing = 1;
		var missingDone = function() {
			if( --missing === 0 ) {
				console.log("Reading done (" + count + " objects)");
				callback(error);
				callback = null;

				clearInterval(timerhandle);
			}
		};
		
		var processNode = function(node) {
			count += 1;
			missing += 1;
			branch.loadChildren(node, function(err, children) {
				error = error || err;
				if( !err ) {
					for(var i = 0; i < children.length; ++i) {
						processNode(children[i]);
					}
				}
				missingDone();
			});
		};
		
		console.log("Reading tree ...");
		
		branch.loadRoot(key, function(err, node) {
			error = error || err;
			if( node ) {
				processNode(node);
			}
			missingDone();
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
				callback("Could not connect to database: " + JSON.stringify(err1));
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
					
					reader(mongo, key, function(err3) {
						ASSERT(!err3);
						
						console.log("Closing database");
						closeDatabase();
					});
				});
			}
		});
	}
});
