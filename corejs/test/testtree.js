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

	var mongo = new Mongo();
	var coretree = new CoreTree(mongo);

	var r1 = coretree.createRoot();
	var a1 = coretree.getChild(r1, "a");
	var b1 = coretree.getChild(r1, "b");
	var c1 = coretree.getChild(r1, "c");

	coretree.setData(r1, 1);
	coretree.setData(r1, {
		a: 1,
		b: 2
	});
	coretree.setProperty(r1, "d", 4);
	coretree.setHashed(c1, true);

	coretree.normalize(a1);

	console.log(r1);
	console.log(r1.data.c === c1.data);
});
