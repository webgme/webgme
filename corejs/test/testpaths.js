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

requirejs([ "core/assert", "core/corepath" ], function (ASSERT, PATH) {
	"use strict";

	var paths = new PATH({agingLimit:1});

	var root = paths.createRoot();
	var a = paths.getChild(root, "a");
	var b = paths.getChild(root, "b");
	var c = paths.getChild(root, "c");
	a = paths.actualize(a);
	console.log(root);
});
