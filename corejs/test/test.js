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

	var print = FUTURE.func(function (a) {
		console.log(a);
	});

	var add = FUTURE.func(function(a, b) {
		return a + b;
	});
	
	var a = FUTURE.wait(1000, 1);
	var b = FUTURE.wait(2000, 2);
	
	print(a);
});
