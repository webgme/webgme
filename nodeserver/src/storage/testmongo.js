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

requirejs([ "storage/mongo" ], function (Mongo) {
	"use strict";

	function test1 () {
		var database = new Mongo({
			timeout: 1000
		});
		database.openDatabase(function (err) {
			console.log("openDatabase", err);
			database.getProjectNames(function (err, names) {
				console.log("getProjectNames", err, names);
				database.getDatabaseStatus("connected", function (err, data) {
					console.log("getDatabaseStatus", err, data);
				});
				database.openProject("hihi", function (err, project) {
					console.log("openProject1", err);
					project.dumpObjects(function (err) {
						console.log("dumpObjects", err);
						project.closeProject(function (err) {
							console.log("closeProject1", err);
							database.closeDatabase(function (err) {
								console.log("closeDatabase", err);
							});
						});
					});
				});
				database.openProject("hihi", function (err, project) {
					console.log("openProject2", err);
					project.closeProject(function (err) {
						console.log("closeProject2", err);
					});
				});
			});
		});
	}

	function test2 () {
		var database = new Mongo({
			timeout: 1000
		});
		database.openDatabase(function (err) {
			console.log("openDatabase", err);
			database.getProjectNames(function (err, names) {
				database.openProject("hihi", function (err, project) {
					console.log("openProject", err);
					project.getBranchNames(function (err, branches) {
						console.log("getBranchNames", err, branches);
						project.getBranchHash("*test", "", function (err, hash) {
							console.log("getBranchHash", err, hash);
							project.setBranchHash("*test", "#1", "", function (err) {
								console.log("setBranchHash", err);
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
			});
		});
	}

	test1();
});
