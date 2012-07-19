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

requirejs(
[ "core/assert", "core/mongo", "core/pertree", "core/core2", "core/util", "cmd/readxml", "cmd/parsemeta", "cmd/tests" ],
function (ASSERT, Mongo, PerTree, Core, UTIL, readxml, parsemeta, tests) {
	"use strict";

	var argv = process.argv.slice(2);

	if( argv.length <= 0 || argv[0] === "-help") {
		console.log("Usage: node main.js [commands]");
		console.log("");
		console
		.log("This script executes a sequence of core commands that can be chained together,");
		console.log("where each command is one of the following.");
		console.log("");
		console.log("  -help\t\t\t\tprints out this help");
		console.log("  -mongo <host> [<port> [<db>]]\tchanges the default mongodb parameters");
		console.log("  -dumpmongo\t\t\tdumps the content of the database");
		console.log("  -eraseall\t\t\tremoves all objects from the database");
		console.log("  -readxml <file>\t\treads and parses the given xml file");
		console.log("  -root <sha1>\t\t\tselects a new root by hash");
		console.log("  -dumptree\t\t\tdumps the current root as a json object");
		console.log("  -traverse\t\t\tloads all core objects from the current tree");
		console.log("  -parsemeta\t\t\tparses the current xml root as a meta project");
		console.log("  -test <integer>\t\texecutes a test program (see tests.js)");
		console.log("");
	}
	else {
		var mongo, root, i = 0, opt, core;

		var parm = function (def) {
			return (i < argv.length && argv[i].charAt(0) !== "-") ? argv[i++] : def;
		};

		var next = function () {
			ASSERT(i < argv.length);

			var cmd = argv[i++];
			if( cmd === "-mongo" ) {
				console.log("Opening database");

				opt = {
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
					opt = parm();

					if( !opt ) {
						console.log("Error: XML filename is not specified");
						argv.splice(i, 0, "-end");
						next();
					}
					else {
						readxml(mongo, opt, function (err, key) {
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
			else if( cmd === "-root" ) {
				if( !mongo ) {
					argv.splice(--i, 0, "-mongo");
					next();
				}
				else {
					opt = parm();

					if( !opt ) {
						console.log("Error: root id fragment is not specified");
						argv.splice(i, 0, "-end");
						next();
					}
					else {
						if( opt.charAt(0) !== "#" ) {
							opt = "#" + opt;
						}

						mongo.searchId(opt, function (err, key) {
							if( err ) {
								console.log(err);
								argv.splice(i, 0, "-end");
							}
							else {
								console.log("Found root = " + key);
								root = key;
							}
							next();
						});
					}
				}
			}
			else if( cmd === "-dumptree" ) {
				if( !mongo ) {
					argv.splice(--i, 0, "-mongo");
					next();
				}
				else if( !root ) {
					console.log("Root not selected");
					argv.splice(i, 0, "-end");
					next();
				}
				else {
					console.log("Dumping tree ...");
					var pertree = new PerTree(mongo);
					pertree.dumpTree(root, function (err) {
						console.log(err ? err : "Dumping done");
						next();
					});
				}
			}
			else if( cmd === "-traverse" ) {
				if( !mongo ) {
					argv.splice(--i, 0, "-mongo");
					next();
				}
				else if( !root ) {
					console.log("Root not selected");
					argv.splice(i, 0, "-end");
					next();
				}
				else {
					core = new Core(mongo);
					var count = 0;

					core.loadRoot(root, function (err, node) {
						if( err ) {
							console.log(err);
							next();
						}
						else {
							console.log("Reading core tree ...");
							UTIL.depthFirstSearch(core.loadChildren, node, function (child,
							callback2) {
								++count;
								callback2(null);
							}, function (child, callback2) {
								callback2(null);
							}, function (err2) {
								console.log(err ? err : "Reading done (" + count + " objects)");
								next();
							});
						}
					});
				}
			}
			else if( cmd === "-parsemeta" ) {
				if( !mongo ) {
					argv.splice(--i, 0, "-mongo");
					next();
				}
				else if( !root ) {
					console.log("Root not selected");
					argv.splice(i, 0, "-end");
					next();
				}
				else {
					parsemeta(mongo, root, function(err, key) {
						if(err) {
							console.log(err);
							argv.splice(i, 0, "-end");
						}
						else {
							console.log("Root key = " + key);
							root = key;
						}
						next();
					});
				}
			}
			else if( cmd === "-test" ) {
				if( !mongo ) {
					argv.splice(--i, 0, "-mongo");
					next();
				}
				else {
					opt = parm();

					if( !opt ) {
						console.log("Error: test number is not selected");
						argv.splice(i, 0, "-end");
						next();
					}
					else {
						tests(opt, mongo, root, function(err, newroot) {
							if( err ) {
								console.log("Test error: " + err);
								argv.splice(i, 0, "-end");
							}
							else if( typeof newroot === "string" ){
								console.log("New root = " + newroot);
								root = newroot;
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
