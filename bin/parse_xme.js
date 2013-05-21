/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

if (typeof define !== "function") {
	var requirejs = require("requirejs");

	requirejs.config({
		nodeRequire: require,
		baseUrl: __dirname + "/.."
	});

	requirejs([ "cli/common", "util/assert", "core/tasync", "bin/parse_xme" ], function (COMMON, ASSERT, TASYNC, parser) {
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
			var core = TASYNC.call(COMMON.getCore, done);
			var hash = TASYNC.call(parser, args[0], core);
			done = TASYNC.call(printHash, hash);
			done = TASYNC.call(COMMON.closeProject, done);
			done = TASYNC.call(COMMON.closeDatabase, done);

			return done;
		}
		
		function printHash(hash) {
			console.log(hash);
		}
	});

	return;
}

define([ "util/assert", "core/tasync", "cli/common" ], function (ASSERT, TASYNC, COMMON) {
	function parser (xmlfile, core) {
		var root = core.createNode();
		var stack = [], objects = 1;

		function opentag (tag) {
			var name = tag.name;

			if (name === "project") {
				ASSERT(stack.length === 0);
				tag.node = root;
			} else if (name === "folder" || name === "model" || name === "atom" || name === "connection" || name === "reference" || name === "set") {
				ASSERT(stack.length >= 1);
				tag.node = core.createNode(stack[stack.length - 1].node);
				objects += 1;
			}

			tag.parent = stack.length === 0 ? null : stack[stack.length - 1];
			tag.text = "";
			stack.push(tag);
		}

		function addtext (text) {
			if (stack.length !== 0) {
				var tag = stack[stack.length - 1];
				tag.text += text;
			}
		}

		function getstat () {
			return objects + " gme objects";
		}

		function closetag (name) {
			ASSERT(stack.length >= 1);

			var tag = stack.pop();
			ASSERT(tag.name === name);

			if (name === "project" || name === "folder" || name === "model" || name === "atom" || name === "connection" || name === "reference" || name === "set") {
				parseObject(core, tag);
			} else if (name === "author" || name === "comment") {
				parseComment(core, tag);
			} else if (name === "name") {
				parseName(core, tag);
			} else if (name === "value") {
				parseValue(core, tag);
			} else {
				ASSERT(name === "attribute" || name === "regnode" || name === "connpoint");
			}
		}

		var done = COMMON.saxParse(xmlfile, {
			opentag: opentag,
			closetag: closetag,
			text: addtext,
			getstat: getstat
		});

		var hash = TASYNC.call(persist, core, root, done);
		hash = TASYNC.call(makeCommit, xmlfile, hash);

		return hash;
	}

	function persist (core, root) {
		console.log("Waiting for objects to be saved ...");
		var done = core.persist(root);
		var hash = core.getKey(root);
		return TASYNC.join(hash, done);
	}

	function makeCommit (xmlfile, hash) {
		console.log("Writing commit ...");
		var project = COMMON.getProject();
		hash = project.makeCommit([], hash, xmlfile + " parsed on " + new Date());
		return hash;
	}

	var registry = {
		guid: "guid",
		cdate: "created",
		mdate: "modified",
		version: "version",
		metaname: "metaname",
		metaguid: "metaguid",
		metaversion: "metaversion",
		id: "id",
		relid: "relid",
		kind: "kind",
		role: "role",
		isinstance: "isinstance",
		isprimary: "isprimary"
	};

	function parseObject (core, tag) {
		var key;
		for (key in registry) {
			if (typeof tag.attributes[key] !== "undefined") {
				core.setRegistry(tag.node, registry[key], tag.attributes[key]);
			}
		}

		core.setRegistry(tag.node, "metameta", tag.name);
	}

	function parseComment (core, tag) {
		ASSERT(tag.parent);
		core.setRegistry(tag.parent.node, tag.name, tag.text);
	}

	function parseName (core, tag) {
		ASSERT(tag.parent);
		core.setAttribute(tag.parent.node, tag.name, tag.text);
	}

	function parseValue (core, tag) {
		ASSERT(tag.parent);

		if (tag.parent.name === "attribute") {
			ASSERT(tag.parent.parent.node);
			core.setAttribute(tag.parent.parent.node, tag.parent.name, tag.text);
		} else {
			ASSERT(tag.parent.name === "regnode");
			var status = tag.parent.attributes.status || "defined";
			if (status !== "undefined") {
				var parent = tag.parent;
				var path = parent.attributes.name;

				while (parent.name === "regnode") {
					path = parent.attributes.name + "/" + path;
					parent = parent.parent;
				}

				ASSERT(parent.node);
				core.setRegistry(parent.node, path, tag.text);
			}
		}
	}

	return parser;
});
