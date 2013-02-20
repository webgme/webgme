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

requirejs([ "storage/mongo2" ], function (MONGO) {
	"use strict";

	console.log("start");
	var database = new MONGO.Database({});
	database.openDatabase(function (err) {
		console.log(err);
		database.getProjectNames(function (err, names) {
			console.log(err, names);
			database.openProject("hihi", function (err, project) {
				console.log(err);
				project.closeProject(function (err) {
					database.closeDatabase(function (err) {
						console.log(err);
					});
				});
			});
		});
	});
});
