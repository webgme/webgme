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

	var commands = {};

	commands.help = function () {
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
		console.log("  -setbranch [<branch>]\t\twrites the current root to the given branch");
		console.log("  -getbranch [<branch>]\t\treads the current root for the given branch");
		console.log("  -wait <secs>\t\t\twaits the given number of seconds");
		console.log("");
	};

	var database = null, project = null, projectName, root = "";

	commands.mongo = function (host, databaseName, projectName, port) {
		ASSERT(!databaseName && !project);

		var opt = {
			host: host || "localhost",
			database: databaseName || "webgme",
			port: port && parseInt(port, 10)
		};
		projectName = projectName || "test";

		console.log("Opening project " + opt.database + "/" + projectName + " on " + opt.host);

		var d = new Cache(new Mongo(opt), {});
		d.openDatabase = TASYNC.wrap(d.openDatabase);
		d.openProject = TASYNC.wrap(d.openProject);
		d.deleteProject = TASYNC.wrap(d.deleteProject);
		d.closeDatabase = TASYNC.wrap(d.closeDatabase);

		return TASYNC.call(function () {
			database = d;
			return TASYNC.call(function (p) {
				p.closeProject = TASYNC.wrap(p.closeProject);
				p.dumpObjects = TASYNC.wrap(p.dumpObjects);
				p.findHash = TASYNC.wrap(p.findHash);
				p.setBranchHash = TASYNC.wrap(p.setBranchHash);
				p.getBranchHash = TASYNC.wrap(p.getBranchHash);

				project = p;
			}, d.openProject(projectName));
		}, d.openDatabase());
	};

	commands.close = function () {
		var done;

		if (project) {
			console.log("Closing project");
			done = project.closeProject();
			project = null;
		}

		if (database) {
			done = TASYNC.call(function (database) {
				return database.closeDatabase();
			}, database, done);
			database = null;
		}

		return done;
	};

	commands.wait = function (delay) {
		delay = (delay && parseInt(delay, 10)) || 1;

		console.log("Waiting " + delay + " seconds ...");
		return TASYNC.delay(1000 * delay);
	};

	commands.dump = function () {
		ASSERT(project);

		console.log("Dumping all data ...");
		return TASYNC.call(function () {
			console.log("Dumping done");
		}, project.dumpObjects());
	};

	commands.erase = function () {
		ASSERT(database);

		console.log("Deleting project: " + projectName);
		return database.deleteProject(projectName);
	};

	commands.root = function (start) {
		ASSERT(project);

		if (!start || start === "") {
			console.log("Root is cleared");
			root = "";
			return;
		}

		if (start.charAt(0) !== "#") {
			start = "#" + start;
		}

		return TASYNC.trycatch(function () {
			return TASYNC.call(function (hash) {
				console.log("Root set to " + hash);
				root = hash;
			}, project.findHash(start));
		}, function (error) {
			console.log("Error: " + error.message);
		});
	};

	commands.setbranch = function (branch) {
		ASSERT(project);

		branch = branch || "*master";
		if (branch.charAt(0) !== "*") {
			branch = "*" + branch;
		}

		if (root === "") {
			console.log("Clearing branch " + branch);
		} else {
			console.log("Setting branch " + branch + " to " + root);
		}

		return TASYNC.call(function (oldhash) {
			return project.setBranchHash(branch, oldhash, root);
		}, project.getBranchHash(branch, null));
	};

	commands.getbranch = function (branch) {
		ASSERT(project);

		branch = branch || "*master";
		if (branch.charAt(0) !== "*") {
			branch = "*" + branch;
		}

		console.log("Getting branch " + branch);

		return TASYNC.call(function (oldhash) {
			if (oldhash !== "") {
				console.log("Root set to " + oldhash);
			} else {
				console.log("Root is cleared");
			}
			root = oldhash;
		}, project.getBranchHash(branch, null));
	};

	var external = TASYNC.wrap(function (module, args, callback) {
		requirejs([ module ], function (func) {
			if (typeof func !== "function") {
				callback(new Error("invalid cli module"));
			} else {
				func = TASYNC.unwrap(func);
				args.push(callback);
				func.apply(null, args);
			}
		});
	});

	commands.readxml = function (xmlfile) {
		return external("cli/readxml", [ project, xmlfile ]);
	};

	// --- main 

	TASYNC.trycatch(function () {
		var argv = process.argv.slice(2);

		if (argv.length === 0 || argv[0].charAt(0) !== "-") {
			return commands.help();
		}

		var index = 0, done;
		while (index < argv.length) {
			var cmd = argv[index++];
			ASSERT(cmd.charAt(0) === "-");

			var func = commands[cmd.substr(1)];
			if (typeof func !== "function") {
				throw new Error("Unknown command: " + cmd);
			}

			var args = [];
			while (index < argv.length && argv[index].charAt(0) !== "-") {
				args.push(argv[index++]);
			}

			args.push(done);
			done = TASYNC.apply(func, args);
		}

		return TASYNC.call(commands.close, done);
	}, function (error) {
		console.log(error.trace || error.stack);

		return commands.close();
	});
});
