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

requirejs([ "core/assert", "core/coretree", "core/mongo", "core/future" ], function (ASSERT,
CoreTree, Mongo, FUTURE) {
	"use strict";

	var mongo = new Mongo();
	var coretree = new CoreTree(mongo);

	var done = FUTURE.adapt(mongo.open)();

	var r1, a1, b1, c1, d1;

	done = FUTURE.call(done, function () {
		console.log("opened");

		r1 = coretree.createRoot();
		a1 = coretree.getChild(r1, "a");
		b1 = coretree.getChild(r1, "b");
		c1 = coretree.getChild(r1, "c");

		coretree.setProperty(r1, "d", {});
		coretree.setProperty(c1, "name", "c");
		coretree.setHashed(c1, true);
		d1 = coretree.getChild(r1, "d");
		
		console.log(coretree.getPath(d1));

		// console.log(r1);

		a1 = coretree.getChild(r1, "a");

		// coretree.normalize(b1);
		return coretree.persist(r1);
	});

	done = FUTURE.call(done, function () {
		b1 = coretree.getChild(r1, "b");
		c1 = coretree.getChild(r1, "c");

		console.log(r1);

		return coretree.load(c1);
	});

	done = FUTURE.hide(done);

	done = FUTURE.call(done, function () {
		console.log("closed");
		return FUTURE.adapt(mongo.close)();
	});
});
