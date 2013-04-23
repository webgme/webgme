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

requirejs([ "util/assert", "storage/mongo", "storage/cache", "core/tasync" ], function (ASSERT, Mongo, Cache, TASYNC) {
	"use strict";

	var argv = process.argv.slice(2), argvIndex = 0;

	function nextParam (defValue) {
		return (argvIndex < argv.length && argv[argvIndex].charAt(0) !== "-") ? argv[argvIndex++] : defValue;
	}

	var commands = {};
	
	commands.help = function() {
		console.log("Usage: node main.js [commands]");
		console.log("");
		console.log("This script executes a sequence of core commands that can be chained together,");
		console.log("where each command is one of the following.");
		console.log("");
		console.log("  -help\t\t\t\tprints out this help");
		console.log("  -mongo <host> [<db> [<proj>]]\topens the database and project");
		console.log("  -dump\t\t\t\tdumps the content of the project");
		console.log("  -erase\t\t\tremoves all objects from the project");
		console.log("  -readxml <file>\t\treads and parses the given xml file");
		console.log("  -root <sha1>\t\t\tselects a new root by hash");
		console.log("  -dumptree\t\t\tdumps the current root as a json object");
		console.log("  -traverse\t\t\tloads all core objects from the current tree");
		console.log("  -parsemeta\t\t\tparses the current xml root as a meta project");
		console.log("  -parsedata\t\t\tparses the current xml root as a gme project");
		console.log("  -test <integer>\t\texecutes a test program (see tests.js)");
		console.log("  -writeroot\t\t\twrites the current root for visualization");
		console.log("  -readroot\t\t\treads the current root for visualization");
		console.log("  -wait <secs>\t\t\twaits the given number of seconds");
		console.log("");
	};
	
	var database = null, project = null, projectName;
	commands.mongo = function () {
		ASSERT(!database && !project);
		
		var opt = {};
		opt.host = nextParam("localhost");
		opt.database = nextParam("webgme");
		projectName = nextParam("test");
		opt.port = nextParam();
		opt.port = opt.port && parseInt(opt.port, 10);

		console.log("Opening project " + opt.database + "/" + opt.project + " on " + opt.host);

		var d = new Cache(new Mongo(opt), {});
		d.openDatabase = TASYNC.adapt(d.openDatabase);
		d.openProject = TASYNC.adapt(d.openProject);
		d.deleteProject = TASYNC.adapt(d.deleteProject);
		d.closeDatabase = TASYNC.adapt(d.closeDatabase);

		return TASYNC.call(function () {
			return TASYNC.call(function (p) {
				p.closeProject = TASYNC.adapt(p.closeProject);
				p.dumpObjects = TASYNC.adapt(p.dumpObjects);
				
				database = d;
				project = p;
			}, d.openProject(projectName));
		}, d.openDatabase());
	};

	commands.close = function() {
		var p = project, d = database;
		project = null;
		database = null;
		
		if(p) {
			console.log("Closing project");

			return TASYNC.call(function() {
				return d.closeDatabase();
			}, p.closeProject());
		}
	};
	
	commands.wait = function() {
		var opt = nextParam();

		if (typeof opt === "string") {
			opt = parseInt(opt, 10);
		}
		
		if (typeof opt !== "number" || opt < 0) {
			opt = 1;
		}

		console.log("Waiting " + opt + " seconds ...");
		return TASYNC.delay(1000 * opt);
	};

	commands.dump = function() {
		ASSERT(project);
		
		console.log("Dumping all data ...");
		return TASYNC.call(function() {
			console.log("Dumping done");
		}, project.dumpObjects());
	};

	commands.erase = function() {
		ASSERT(database);
		
		console.log("Deleting project: " + projectName);
		return database.deleteProject(projectName);
	};
	
	// --- main 
	
	function runNextCommand() {
		if( argvIndex >= argv.length) {
			return;
		}
		
		var name = argv[argvIndex++];
		if( name.charAt(0) !== "-" ) {
			throw new Error("Command does not start with a dash: " + name);
		}

		var cmd = commands[name.substr(1)];
		if( typeof cmd !== "function" ) {
			throw new Error("Unknown command: " + name);
		}

		var done = cmd();
		return TASYNC.call(runNextCommand, done);
	}
	
	if( argv.length <= 0 ) {
		commands.help();
	}
	else {
		argv.push("-close");	
		TASYNC.trycatch(runNextCommand, function(err) {
			console.log(err.trace || err.stack);
			
			if(database) {
				return commands.close();
			}
		});
	}
});

return;
	
	if (argv.length <= 0 || argv[0] === "-help") {
	} else {

		var next = function () {
			ASSERT(i < argv.length);

			var cmd = argv[i++];
			if (cmd === "-mongo") {
			} else if (cmd === "-readxml") {
				if (!mongo) {
					argv.splice(--i, 0, "-mongo");
					next();
				} else {
					opt = parm();

					if (!opt) {
						console.log("Error: XML filename is not specified");
						argv.splice(i, 0, "-end");
						next();
					} else {
						readxml(mongo, opt, function (err, key) {
							if (err) {
								console.log("XML parsing", err.stack);
								argv.splice(i, 0, "-end");
							} else {
								ASSERT(typeof key === "string");
								root = key;
							}
							next();
						});
					}
				}
			} else if (cmd === "-readxml2") {
				if (!mongo) {
					argv.splice(--i, 0, "-mongo");
					next();
				} else {
					opt = parm();

					if (!opt) {
						console.log("Error: XML filename is not specified");
						argv.splice(i, 0, "-end");
						next();
					} else {
						readxml2(mongo, opt, function (err, key) {
							if (err) {
								console.log("XML parsing", err.stack);
								argv.splice(i, 0, "-end");
							} else {
								ASSERT(typeof key === "string");
								root = key;
							}
							next();
						});
					}
				}
			} else if (cmd === "-root") {
				if (!mongo) {
					argv.splice(--i, 0, "-mongo");
					next();
				} else {
					opt = parm();

					if (!opt) {
						console.log("Error: root id fragment is not specified");
						argv.splice(i, 0, "-end");
						next();
					} else {
						if (opt.charAt(0) !== "#") {
							opt = "#" + opt;
						}

						mongo.searchId(opt, function (err, key) {
							if (err) {
								console.log(err);
								argv.splice(i, 0, "-end");
							} else {
								console.log("Found root = " + key);
								ASSERT(typeof key === "string");
								root = key;
							}
							next();
						});
					}
				}
			} else if (cmd === "-dumptree") {
				if (!mongo) {
					argv.splice(--i, 0, "-mongo");
					next();
				} else if (!root) {
					console.log("Root not selected");
					argv.splice(i, 0, "-end");
					next();
				} else {
					console.log("Dumping tree ...");
					DUMPTREE.dump(mongo, root, function (err) {
						console.log(err ? err : "Dumping done");
						next();
					});
				}
			} else if (cmd === "-traverse") {
				if (!mongo) {
					argv.splice(--i, 0, "-mongo");
					next();
				} else if (!root) {
					console.log("Root not selected");
					argv.splice(i, 0, "-end");
					next();
				} else {
					core = new Core(mongo);
					var count = 0;

					core.loadRoot(root, function (err, node) {
						if (err) {
							console.log(err);
							next();
						} else {
							console.log("Reading core tree ...");
							UTIL.depthFirstSearch(core.loadChildren, node, function (child, callback2) {
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
			} else if (cmd === "-parsemeta") {
				if (!mongo) {
					argv.splice(--i, 0, "-mongo");
					next();
				} else if (!root) {
					console.log("Root not selected");
					argv.splice(i, 0, "-end");
					next();
				} else {
					parsemeta(mongo, root, function (err, key) {
						if (err) {
							console.log(err);
							argv.splice(i, 0, "-end");
						} else {
							console.log("Root key = " + key);
							ASSERT(typeof key === "string");
							root = key;
						}
						next();
					});
				}
			} else if (cmd === "-parsedata") {
				if (!mongo) {
					argv.splice(--i, 0, "-mongo");
					next();
				} else if (!root) {
					console.log("Root not selected");
					argv.splice(i, 0, "-end");
					next();
				} else {
					parsedata(mongo, root, function (err, key) {
						if (err) {
							console.log(err);
							argv.splice(i, 0, "-end");
						} else {
							console.log("Root key = " + key);
							ASSERT(typeof key === "string");
							root = key;
						}
						next();
					});
				}
			} else if (cmd === "-test") {
				if (!mongo) {
					argv.splice(--i, 0, "-mongo");
					next();
				} else {
					opt = parm();

					if (!opt) {
						console.log("Error: test number is not selected");
						argv.splice(i, 0, "-end");
						next();
					} else {
						tests(opt, mongo, root, function (err, newroot) {
							if (err) {
								console.log(err.toString());
								argv.splice(i, 0, "-end");
							} else if (typeof newroot === "string") {
								console.log("New root = " + newroot);
								root = newroot;
							}
							next();
						});
					}
				}
			} else if (cmd === "-writeroot") {
				if (!mongo) {
					argv.splice(--i, 0, "-mongo");
					next();
				} else if (!root) {
					console.log("Root not selected");
					argv.splice(i, 0, "-end");
					next();
				} else {
					mongo.save({
						_id: "***root***",
						value: [ root ]
					}, function (err) {
						if (err) {
							console.log("Could not write root: " + err);
						} else {
							console.log("***root*** set to " + root);
						}
						next();
					});
				}
			} else if (cmd === "-readroot") {
				if (!mongo) {
					argv.splice(--i, 0, "-mongo");
					next();
				} else {
					mongo.load("***root***", function (err, data) {
						if (err) {
							console.log(err);
							argv.splice(i, 0, "-end");
						} else if (typeof data !== "object" || data === null || !Array.isArray(data.value) || data.value.length !== 1) {
							console.log("Incorrect ***root*** in database", data);
							argv.splice(i, 0, "-end");
						} else {
							root = data.value[0];
							console.log("Found root = " + root);
							ASSERT(typeof root === "string");
						}
						next();
					});
				}
			} else {
				if (cmd !== "-end") {
					console.log("Error: unknown command " + cmd);
				}

				if (mongo && mongo.opened()) {
					if (cmd === "-end") {
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

