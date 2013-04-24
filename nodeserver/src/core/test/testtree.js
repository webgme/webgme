/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

var requirejs = require("requirejs");

requirejs.config({
	nodeRequire: require,
	baseUrl: "../.."
});

requirejs([ "util/assert", "core/coretree", "storage/mongo", "core/tasync", "core/future" ], function (ASSERT, CoreTree, Mongo, TASYNC, FUTURE) {
	"use strict";

	function test1 (coretree) {
		console.log("test1");

		var r1 = coretree.createRoot();
		var a1 = coretree.getChild(r1, "a");
		var b1 = coretree.getChild(r1, "b");
		var c1 = coretree.getChild(r1, "c");

		coretree.setProperty(r1, "d", {});
		coretree.setProperty(c1, "name", "c");
		coretree.setHashed(c1, true);
		var d1 = coretree.getChild(r1, "d");

		console.log(coretree.getPath(d1));

		// console.log(r1);

		a1 = coretree.getChild(r1, "a");

		// coretree.normalize(b1);

		var done = TASYNC.adapt(FUTURE.unadapt(coretree.persist))(r1);

		return TASYNC.call(function () {
			b1 = coretree.getChild(r1, "b");
			c1 = coretree.getChild(r1, "c");

			console.log(coretree.getKeys(r1));

			done = TASYNC.adapt(FUTURE.unadapt(coretree.loadRoot))(coretree.getHash(r1));
			return TASYNC.call(function (node) {
				console.log(node);
			}, done);
		}, done);
	}

	// ------- setup

	function setup (test) {
		ASSERT(typeof test === "function");

		var database = new Mongo({});

		console.log("opening database");
		var done = TASYNC.adapt(database.openDatabase)();

		done = TASYNC.call(function () {
			console.log("opening project");
			return TASYNC.adapt(database.openProject)("test");
		}, done);

		var project;
		done = TASYNC.call(function (p) {
			console.log("testing");
			project = p;
			var coretree = new CoreTree(project, {});
			return test(coretree);
		}, done);

		done = TASYNC.call(function () {
			console.log("closing project");
			return TASYNC.adapt(project.closeProject)();
		}, done);

		done = TASYNC.call(function () {
			console.log("closing database");
			return TASYNC.adapt(database.closeDatabase)();
		}, done);

		TASYNC.trycatch(function () {
			TASYNC.call(function () {
			}, done);
		}, function (err) {
			if (err) {
				console.log(err && (err.trace || err.stack));
			}
			console.log("done");
		});
	}

	setup(test1);
});
