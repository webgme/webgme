/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Miklos Maroti
 */

var requirejs = require("requirejs");

requirejs.config({
	nodeRequire: require,
	baseUrl: __dirname + "/.."
});

requirejs([ "util/assert", "core/tasync", "util/common" ], function (ASSERT, TASYNC, COMMON) {
	"use strict";

	TASYNC.trycatch(main, function (error) {
		console.log(error.trace || error.stack);

		COMMON.closeDatabase();
	});

	function main () {
		if (COMMON.getParameters("help") !== null) {
			console.log("Usage: node database_info.js [options]");
			console.log("");
			console.log("Prints out the projects and branches in the given database. The possible");
			console.log("options are the following:");
			console.log("");
			console.log("  -mongo [database [host [port]]]\topens a mongo database");
			console.log("  -socketio [host [port]]\t\topens a conneciton to a socket.io server");
			console.log("  -help\t\t\t\t\tprints out this help message");
			console.log("");
			return;
		}

		var done = TASYNC.call(COMMON.openDatabase);
		done = TASYNC.call(printDatabaseInfo, done);
		done = TASYNC.call(COMMON.closeDatabase, done);

		return done;
	}

	// --- print

	function print (what) {
		console.log(what);
	}

	// --- database

	function printDatabaseInfo () {
		var database = COMMON.getDatabase();

		var names = database.getProjectNames();
		return TASYNC.call(printDatabaseInfo2, database, names);
	}

	function printDatabaseInfo2 (database, names) {
		ASSERT(names instanceof Array);

		if (names.length === 0) {
			console.log("No project found");
		} else {
			var done = true;
			for (var i = 0; i < names.length; ++i) {
				var name = names[i], project = database.openProject(name);
				done = TASYNC.call(printProjectInfo, project, name, done);
			}
			return done;
		}
	}

	// --- project

	function printProjectInfo (project, name) {
		project.getBranchNames = TASYNC.wrap(project.getBranchNames);
		project.loadObject = TASYNC.wrap(project.loadObject);

		var branches = project.getBranchNames();
		var done = TASYNC.call(printProjectInfo2, project, name, branches);
		return TASYNC.call(project.closeProject, done);
	}

	function printProjectInfo2 (project, name, branches) {
		var done = print("project " + name);

		for (var branch in branches) {
			done = TASYNC.call(printCommitInfo, project, branch, branches[branch], done);
		}

		return done;
	}

	// --- commit

	function printCommitInfo (project, branch, hash) {
		return TASYNC.trycatch(function () {
			var object = project.loadObject(hash);
			return TASYNC.call(printCommitInfo2, branch, hash, object);
		}, function (err) {
			console.log("  " + branch + ":\t" + hash + " (load error)");
		});
	}

	function printCommitInfo2 (branch, hash, object) {
		ASSERT(typeof object === "object");

		var done = true;
		if (object === null) {
			console.log("  " + branch + ":\t" + hash + " (not found)");
		} else {
			var d = new Date();
			d.setTime(object.time);
			d = d.toDateString();
			console.log("  " + branch + ":\t" + hash + " (" + d + ")");
		}

		return done;
	}
});
