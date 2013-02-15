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

requirejs([ "core/future2" ], function (FUTURE) {
	"use strict";

	var delayed = FUTURE.wrap(function (delay, value, callback) {
		setTimeout(callback, delay, null, value);
	});

	var thrower = FUTURE.wrap(function (delay, value, callback) {
		setTimeout(function () {
			callback(new Error(value));
		}, delay);
	});

	function adder (a, b) {
		return a + b;
	}

	var a = thrower(1000, 0), b;
	for (b = 1; b <= 3; ++b) {
		a = FUTURE.invoke(adder, b, a);
	}

	FUTURE.then(a, function (err, value) {
		console.log(err && err.stack, value);
	});
});
