/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

var requirejs = require("requirejs");

requirejs.config({
	nodeRequire: require,
	baseUrl: __dirname + "/.."
});

requirejs([ "util/assert", "core/tasync", "util/common" ], function (ASSERT, TASYNC, COMMON) {
	"use strict";

	TASYNC.trycatch(main, function (error) {
		console.log(error.trace || error.stack);

		COMMON.closeProject();
		COMMON.closeDatabase();
	});

	function main () {
		var argv = COMMON.getParameters(null);

		if (argv.length < 1 || COMMON.getParameters("help") !== null) {
			console.log("Usage: node print_object.js <selector> [options]");
			console.log("");
			console.log("Prints out the storage objects starting from the selected object. The selector");
			console.log("is a string that starts with a hash fragment, optionally followed by a relid");
			console.log("path. The possible options are the following:");
			console.log("");
			console.log("  -mongo [database [host [port]]]\topens a mongo database");
			console.log("  -proj <project>\t\t\tselects the given project");
			console.log("  -depth <depth>\t\t\tlimits the printout depth");
			console.log("  -help\t\t\t\t\tprints out this help message");
			console.log("");
			return;
		}

		var selector = argv[0];

		var depth = COMMON.getParameters("depth");
		depth = depth ? depth[0] : "0";
		depth = parseInt(depth, 10);

		var done = TASYNC.call(COMMON.openDatabase);
		done = TASYNC.call(COMMON.openProject, done);
		done = TASYNC.call(dump, selector, depth, done);
		done = TASYNC.call(COMMON.closeProject, done);
		done = TASYNC.call(COMMON.closeDatabase, done);

		return done;
	}

	var project = null;

	function dump (selector, depth) {
		ASSERT(typeof selector === "string");
		ASSERT(typeof depth === "number");

		project = COMMON.getProject();

		selector = selector.split("/");
		var hash = findHash(selector[0]);

		var i;
		for (i = 1; i < selector.length; ++i) {
			hash = TASYNC.call(findChild, hash, selector[i]);
		}

		return TASYNC.call(dumpObject, hash, depth);
	}

	function findHash (hash) {

		if (hash.charAt(0) !== "#") {
			hash = "#" + hash;
		}

		return project.findHash(hash);
	}

	function findChild (hash, relid) {
		var object = project.loadObject(hash);
		return TASYNC.call(findChild2, object, relid);
	}

	function findChild2 (object, relid) {
		var hash = object[relid];

		if (typeof hash !== "string" || hash.charAt(0) !== "#") {
			throw new Error("invalid path at relid " + relid);
		}

		return hash;
	}

	function dumpObject (hash, depth) {
		var object = project.loadObject(hash);
		return TASYNC.call(dumpObject2, object, depth);
	}

	function dumpObject2 (object, depth) {
		console.log(object);

		if (depth > 0) {
			var done = true;
			for (var relid in object) {
				var hash = object[relid];
				if (typeof hash === "string" && hash.charAt(0) === "#") {
					done = TASYNC.join(done, dumpObject(hash, depth - 1));
				}
			}
			return done;
		}
	}
});
