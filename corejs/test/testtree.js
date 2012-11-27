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

requirejs([ "core/assert", "core/coretree" ], function (ASSERT, CoreTree) {
	"use strict";

	var coretree = new CoreTree(null);

	var r1 = coretree.createRoot();
	var a1 = coretree.getChild(r1, "a");
	var b1 = coretree.getChild(r1, "b");
	var c1 = coretree.getChild(r1, "c");
	coretree.normalize(a1);

	coretree.mutate(a1);
	
	console.log(r1);
	console.log(a1.data === r1.data.a);
});
