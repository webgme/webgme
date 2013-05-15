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
		if (delay >= 0) {
			setTimeout(callback, delay, null, value);
		} else if (delay === -1) {
			callback(null, value);
		} else if (delay === -2) {
			setTimeout(callback, 1000, new Error(value));
		} else if (delay === -3) {
			setTimeout(function () {
				callback(new Error(value));
			}, 1000);
		} else if (delay === -4) {
			callback(new Error(value));
		} else {
			throw new Error(value);
		}
	});

	function adder (a, b) {
//		throw new Error("1");
		return delayed(500, a + b);
	}

	var a = delayed(500, 1);
	var b = delayed(1000, 2);
	var c = FUTURE.invoke(adder, a, b);
	var d = delayed(100, 3);
	var e = FUTURE.invoke(adder, c, d);

	FUTURE.then(e, function (err, value) {
		console.log(err && err.stack, value);
	});
});
