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

requirejs([ "core/assert", "core/coretree", "core/mongo" ], function (ASSERT, CoreTree, Mongo) {
	"use strict";

	var func = function(a) {
		arguments[0] = "hihi";
		console.log(arguments, arguments[0], a);
	};
	
	func(1);
});
