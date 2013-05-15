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

requirejs([ "core/assert", "core/future" ], function (ASSERT, FUTURE) {
	"use strict";

	var a = FUTURE.delay(1000, 1);
	var b = FUTURE.delay(2000, 2);

	var f = FUTURE.wrap(function(a, b) {
		console.log(a, b);
	});

	var g = FUTURE.wrap(function(a) {
		console.log(a);
	});

	g(b);
	f(a, b);
});
