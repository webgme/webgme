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

requirejs([ "util/assert", "core/tasync", "cli/common" ], function (ASSERT, TASYNC, COMMON) {
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
			console.log("  -help\t\t\t\t\tprints out this help message");
			console.log("");
			return;
		}

		var done = TASYNC.call(COMMON.openDatabase);
		done = TASYNC.call(printDatabaseInfo, done);
		done = TASYNC.call(COMMON.closeDatabase, done);

		return done;
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
			var done, i;
			for (i = 0; i < names.length; ++i) {
				done = TASYNC.join(done, printProjectInfo(database, names[i]));
			}
			return done;
		}
	}

	// --- project

	function printProjectInfo (database, name) {
		var project = database.openProject(name);

		return TASYNC.call(printProjectInfo2, project, name);
	}

	function printProjectInfo2 (project, name) {
		project.getBranchNames = TASYNC.wrap(project.getBranchNames);

		var branches = project.getBranchNames();
		return TASYNC.call(printProjectInfo3, project, name, branches);
	}

	function printProjectInfo3 (project, name, branches) {
		console.log("project " + name);
		var branch;
		for (branch in branches) {
			console.log("  branch " + branch + "\t" + branches[branch]);
		}
		return project.closeProject();
	}
});
