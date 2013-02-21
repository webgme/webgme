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

requirejs([ "storage/mongo2", "util/future2" ], function (MONGO, FUTURE) {
	"use strict";

	function test1 () {
		var database = new MONGO.Database({});
		database.openDatabase(function (err) {
			console.log("openDatabase", err);
			database.getProjectNames(function (err, names) {
				console.log("getProjectNames", err, names);
				database.getDatabaseStatus(null, function (err, data) {
					console.log("getDatabaseStatus", err, data);
				});
				database.openProject("hihi", function (err, project) {
					console.log("openProject", err);
					project.dumpObjects(function (err) {
						console.log("dumpObjects", err);
						project.closeProject(function (err) {
							console.log("closeProject", err);
							database.closeDatabase(function (err) {
								console.log("closeDatabase", err);
							});
						});
					});
				});
			});
		});
	}

	function test2 () {
		var database = new MONGO.Database({});
		var done = FUTURE.ncall(database.openDatabase, database);
		var names = FUTURE.ncall(database.getProjectNames, FUTURE.join(database, done));
		FUTURE.fcall(function (names) {
			console.log(names);
		}, null, names);
		done = FUTURE.ncall(database.closeDatabase, FUTURE.join(database, done));
	}

	test2();
});
