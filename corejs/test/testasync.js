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

requirejs([ "async" ], function (async) {
	"use strict";

	async.parallel([ function (callback) {
		console.log("a");
		callback(null, "a");
	}, function (callback) {
		console.log("b");
		callback(null, "b");
	} ], function (err, results) {
		console.log("c", results);
	});

	console.log("hihi");
});
