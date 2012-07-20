/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/core2", "core/util" ], function (ASSERT, Core, UTIL) {
	"use strict";

	var tests = {};

	var core;
	var nodes = {};

	var createNode = function (child, parent) {
		ASSERT(core && !nodes[child]);

		nodes[child] = core.createNode(nodes[parent]);
		core.setAttribute(nodes[child], "name", child);
	};

	var printStats = function (what, func) {
		ASSERT(core);

		console.log("Printing " + what + ":");
		for( var name in nodes ) {
			console.log(name + ":", func(nodes[name]));
		}
		console.log();
	};

	tests[1] = function (storage, root, callback) {
		core = new Core(storage);

		createNode("a");
		createNode("b", "a");
		createNode("c", "a");

		core.setPointer(nodes.b, "ptr", nodes.c);
		core.setPointer(nodes.c, "ptr", nodes.a);
		core.deletePointer(nodes.c, "ptr");

		core.persist(nodes.a, function (err) {

			printStats("attribute names", core.getAttributeNames);
			printStats("pointer names", core.getPointerNames);
			printStats("collection names", core.getCollectionNames);
			printStats("pointer paths", function (node) {
				return core.getPointerPath(node, "ptr");
			});

			callback(err, core.getKey(nodes.a));
		});
	};

	tests[2] = function (storage, root, callback) {
	};

	return function (number, storage, root, callback) {
		if( !tests[number] ) {
			callback("no such test program");
		}
		else {
			tests[number](storage, root, callback);
		}
	};
});
