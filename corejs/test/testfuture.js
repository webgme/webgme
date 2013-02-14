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

	var delayed = FUTURE.futurify(function delayed (delay, value, callback) {
		setTimeout(callback, delay, null, value);
	});

	var thrower = FUTURE.futurify(function thrower(delay, value, callback) {
		setTimeout(function () {
			callback(new Error(value));
		}, delay);
	});

	var adder = FUTURE.async(function adder (c, d) {
		return c[0] + c[1] + d;
	});

	var test = FUTURE.callbackify(function test () {
		var a = delayed(1000, 1);
		var b = thrower(1000, "b");
		var c = FUTURE.lift([a, b]);
		var d = delayed(2000, 2);
		return adder(c, d);
	});

	test(function (err, value) {
		console.log(err && err.stack);
		console.log(value);
	});
});
