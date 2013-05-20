/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

if (typeof define !== "function") {
	var requirejs = require("requirejs");

	requirejs.config({
		nodeRequire: require,
		baseUrl: ".."
	});

	requirejs([ "cli/common", "util/assert", "core/tasync", "cli/parse_xme" ], function (COMMON, ASSERT, TASYNC, parser) {
		"use strict";

		TASYNC.trycatch(main, function (error) {
			console.log(error.trace || error.stack);

			COMMON.setProgress(null);
			COMMON.closeProject();
			COMMON.closeDatabase();
		});

		function main () {
			var args = COMMON.getParameters(null);

			if (args.length < 1 || COMMON.getParameters("help") !== null) {
				console.log("Usage: node parse_xme.js <xmlfile> [options]");
				console.log("");
				console.log("Parses a GME xme file and stores it int a WEBGME database. Possible options:");
				console.log("");
				console.log("  -mongo [database [host [port]]]\topens a mongo database");
				console.log("  -proj <project>\t\t\tselects the given project");
				console.log("  -help\t\t\t\t\tprints out this help message");
				console.log("");
				return;
			}

			var done = TASYNC.call(COMMON.openDatabase);
			done = TASYNC.call(COMMON.openProject, done);
			done = TASYNC.call(function () {
				return parser(args[0], COMMON.getCore());
			}, done);
			done = TASYNC.call(COMMON.closeProject, done);
			done = TASYNC.call(COMMON.closeDatabase, done);

			return done;
		}
	});

	return;
}

define([ "util/assert", "core/tasync", "cli/common" ], function (ASSERT, TASYNC, COMMON) {

	function parse (xmlfile) {
		return COMMON.saxParse(xmlfile, {
			opentag: function (tag) {
				//				console.log("open", tag);
			},
			closetag: function (name) {
				//				console.log("close", name);
			},
			text: function (text) {
				//				console.log("text", text);
			},
			getstat: function () {
			}
		});
	}

	return function (xmlfile, core) {
		return parse(xmlfile);
	};
});
