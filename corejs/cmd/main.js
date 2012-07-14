/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

var requirejs = require("requirejs");

requirejs.config({
	nodeRequire: require,
	baseUrl: ".."
});

requirejs([ "core/assert", "core/mongo", "cmd/readxml" ], function (ASSERT, Mongo, readxml) {
	"use strict";

	var argv = process.argv.slice(2);

	if( argv.length <= 0 ) {
		console.log("Usage: node core.js [commands]");
		console.log("");
		console.log("This script executes a sequence of commands that can be chained together,");
		console.log("where each command is one of the following.");
		console.log("");
		console.log("  -mongo <host> [<port> [<db>]]\tchanges the default mongodb parameters");
		console.log("  -dumpmongo\t\t\tdumps the content of the database");
		console.log("  -eraseall\t\t\tremoves all objects from the database");
		console.log("  -readxml <file>\t\treads and parses the given xml file");
		console.log("  -root <sha1>\t\t\tselects a new root by hash");
		console.log("  -dumptree [<file>]\t\tdumps the current root as a json object");
		console.log("  -parsemeta\t\t\tparses the current xml root as a meta project");
		console.log("  -traverse\t\t\tloads all objects from the current tree");
		console.log("");
	}
	else {
		var mongo, root, i = 0;

		var parm = function (def) {
			return (i < argv.length && argv[i].charAt(0) !== "-") ? argv[i++] : def;
		};

		var next = function () {
			ASSERT(i < argv.length);

			var cmd = argv[i++];
			if( cmd === "-mongo" ) {
				console.log("Opening database");

				var opt = {
					host: parm(),
					port: parm(),
					database: parm(),
					collection: parm()
				};
				opt.port = opt.port && parseInt(opt.port, 10);

				mongo = new Mongo(opt);
				mongo.open(function (err) {
					if( err ) {
						console.log("Could not open database: " + err);
						argv.splice(i, 0, "-end");
					}
					next();
				});
			}
			else if( cmd === "-dumpmongo" ) {
				if( !mongo ) {
					argv.splice(--i, 0, "-mongo");
					next();
				}
				else {
					console.log("Dumping all data from database...");
					mongo.dumpAll(function (err) {
						if( err ) {
							console.log("Database error: " + err);
							argv.splice(i, 0, "-end");
						}
						else {
							console.log("Dumping done");
						}
						next();
					});
				}
			}
			else if( cmd === "-eraseall" ) {
				if( !mongo ) {
					argv.splice(--i, 0, "-mongo");
					next();
				}
				else {
					console.log("Erasing all data from database...");
					mongo.removeAll(function (err) {
						if( err ) {
							console.log("Database error: " + err);
							argv.splice(i, 0, "-end");
						}
						else {
							console.log("Erasing done");
						}
						next();
					});
				}
			}
			else if( cmd === "-readxml" ) {
				if( !mongo ) {
					argv.splice(--i, 0, "-mongo");
					next();
				}
				else {
					var filename = parm();

					if( !filename ) {
						console.log("Error: XML filename is not specified");
						argv.splice(i, 0, "-end");
						next();
					}
					else {
						readxml(mongo, filename, function (err, key) {
							if( err ) {
								console.log("XML parsing error: " + err);
								argv.splice(i, 0, "-end");
							}
							else {
								root = key;
							}
							next();
						});
					}
				}
			}
			else {
				if( cmd !== "-end" ) {
					console.log("Error: unknown command " + cmd);
				}

				if( mongo && mongo.opened() ) {
					if( cmd === "-end" ) {
						console.log("Closing database");
					}
					mongo.close();
					mongo = undefined;
				}
			}
		};

		argv.push("-end");
		i = 0;
		next();
	}
});
