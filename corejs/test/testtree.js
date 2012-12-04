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

requirejs([ "core/assert", "core/coretree", "core/mongo", "core/future" ], function (ASSERT, CoreTree, Mongo, FUTURE) {
	"use strict";

	var mongo = new Mongo();
	mongo.open(function(err) {
		
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
		coretree.setProperty(r1, "d", {});
		coretree.setHashed(c1, false);
		var d1 = coretree.getChild(r1, "d");
		coretree.setHashed(d1, false);
		
//		console.log(r1);

		coretree.normalize(a1);
		coretree.persist(r1);

		console.log(r1);

		coretree.mutate(d1);
		
		mongo.close();
	});
});
