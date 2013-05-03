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

requirejs([ "cli/common", "util/assert", "util/sax", "fs", "core/tasync" ], function (COMMON, ASSERT, SAX, FS, TASYNC) {
	"use strict";

	TASYNC.trycatch(main, function (error) {
		console.log(error.trace || error.stack);

		COMMON.setProgress(null);
		COMMON.closeProject();
		COMMON.closeDatabase();
	});

	function main () {
		var argv = process.argv.slice(2);

		if (argv.length < 1 || COMMON.getParameters("help") !== null) {
			console.log("Usage: node parse_cyphy.js xmlroot  [options]");
			console.log("");
			console.log("Transforms an xme tree into a gme tree. Possible options:");
			console.log("");
			console.log("  -mongo [database [host [port]]]\topens a mongo database");
			console.log("  -proj <project>\t\t\tselects the given project");
			console.log("");
			return;
		}

		var xmlroot = argv[0];

		var done = TASYNC.call(COMMON.openDatabase, argv);
		done = TASYNC.call(COMMON.openProject, argv, done);
		done = TASYNC.call(parse, xmlroot, done);
		done = TASYNC.call(persist, done);
		done = TASYNC.call(COMMON.closeProject, done);
		done = TASYNC.call(COMMON.closeDatabase, done);

		return done;
	}

	// --- parse main

	var core, xmlroot;

	function parse (hash) {
		ASSERT(typeof hash === "string");

		core = COMMON.getCore();
		core.loadChildren = TASYNC.throttle(core.loadChildren, 10);

		if (hash.charAt(0) !== "#") {
			hash = "#" + hash;
		}

		hash = COMMON.getProject().findHash(hash);
		var xmlroot = TASYNC.call(core.loadRoot, hash);
		return TASYNC.call(parse2, xmlroot);
	}

	var xmlobjects = 0, gmeobjects = 0;

	function parse2 (xr) {
		console.log("Building gme project ...");

		xmlroot = xr;

		if (core.getAttribute(xmlroot, "#tag") !== "project") {
			throw new Error("The root is not a parsed xme file");
		}

		COMMON.setProgress(function () {
			console.log("  at xml object " + xmlobjects + " (" + gmeobjects + " gme objects, " + unresolved.length + " pointers)");
		});
		var done = traverseNode(xmlroot);
		done = TASYNC.call(COMMON.setProgress, null, done);

		return done;
	}

	function traverseNode (xmlnode) {
		var done;

		++xmlobjects;

		done = TASYNC.call(traverseChildren, core.loadChildren(xmlnode));
		done = TASYNC.join(done, parseNode(xmlnode));

		return done;
	}

	function traverseChildren (children) {
		var done, i = 0;
		for (i = 0; i < children.length; ++i) {
			done = TASYNC.join(done, traverseNode(children[i]));
		}
		return done;
	}

	var parsedNodes = {};

	function parseNode (xmlnode) {
		ASSERT(xmlnode);

		var path = core.getStringPath(xmlnode);
		var gmenode = parsedNodes[path];
		if (gmenode) {
			return gmenode;
		} else {
			var parser, tag = core.getAttribute(xmlnode, "#tag");

			// FCOs

			if (tag === "project") {
				parser = parseProject;
			} else if (tag === "folder" || tag === "model" || tag === "atom" || tag === "connection" || tag === "reference" || tag === "set") {
				parser = parseFco;
			}

			if (parser) {
				++gmeobjects;

				gmenode = parser(xmlnode, tag);

				ASSERT(typeof parsedNodes[path] === "undefined");
				parsedNodes[path] = gmenode;

				return TASYNC.call(parseNode2, path, gmenode);
			}

			// embedded attributes

			if (tag === "name" || tag === "author" || tag === "comment") {
				parser = parseName;
			} else if (tag === "value") {
				parser = parseValue;
			}

			if (parser) {
				return parser(xmlnode, tag);
			}

			if (tag === "attribute" || tag === "regnode" || tag === "connpoint") {
				return;
			}

			console.log("Warning: unknown xml tag: " + tag + " at line " + core.getAttribute(xmlnode, "#line"));
		}
	}

	function parseNode2 (path, gmenode) {
		parsedNodes[path] = gmenode;
		return gmenode;
	}

	// --- project

	var gmeroot;

	function parseProject (xmlroot) {
		gmeroot = core.createNode();

		copyAttributes(xmlroot, gmeroot, {
			cdate: "created",
			mdate: "modified",
			metaname: "#metaname",
			guid: "#guid",
			"#tag": "#type",
			"#line": "#line"
		});

		return gmeroot;
	}

	function parseFco (xmlnode) {
		var xmlparent = core.getParent(xmlnode);
		var gmeparent = parseNode(xmlparent);

		return TASYNC.call(parseFco2, xmlnode, gmeparent);
	}

	var unresolved = [];

	function parseFco2 (xmlnode, gmeparent) {
		var gmenode = core.createNode(gmeparent);

		copyAttributes(xmlnode, gmenode, {
			id: "#id",
			relid: "#relid",
			kind: "#kind",
			role: "#role",
			isinstance: "#isinstance",
			isprimary: "#isprimary",
			guid: "#guid",
			"#tag": "#tag",
			"#line": "#line"
		});

		var names = core.getPointerNames(xmlnode);
		if (names.length !== 0) {
			var i, gmesource = core.getStringPath(gmenode);
			for (i = 0; i < names.length; ++i) {
				var xmltarget = core.getPointerPath(xmlnode, names[i]);
				unresolved.push({
					gmesource: gmesource,
					name: names[i],
					xmltarget: xmltarget
				});
			}
		}

		return gmenode;
	}

	// --- name

	function parseName (xmlnode, tag) {
		var parent = core.getParent(xmlnode);
		return TASYNC.call(parseName2, xmlnode, tag, parseNode(parent));
	}

	function parseName2 (xmlnode, tag, gmenode) {
		if (gmenode) {
			var value = core.getAttribute(xmlnode, "#text") || "";
			core.setAttribute(gmenode, tag, value);
		}
	}

	// --- value

	function parseValue (xmlnode) {
		var xmlparent = core.getParent(xmlnode);
		var value, name, gmenode;

		var tag = core.getAttribute(xmlparent, "#tag");
		if (tag === "attribute") {
			value = core.getAttribute(xmlnode, "#text") || "";
			name = core.getAttribute(xmlparent, "kind");
			ASSERT(typeof name === "string");

			gmenode = parseNode(core.getParent(xmlparent));
			return TASYNC.call(setGmeAttribute, gmenode, name, value);
		} else if (tag === "regnode") {
			value = core.getAttribute(xmlnode, "#text") || "";
			var status = core.getAttribute(xmlparent, "status") || "defined";
			if (status !== "undefined" || value !== "") {
				do {
					var part = core.getAttribute(xmlparent, "name");
					ASSERT(typeof part === "string");

					if (typeof name === "string") {
						// MONGODB does not accept . in the name
						name = part + "/" + name;
					} else {
						name = part;
					}

					xmlparent = core.getParent(xmlparent);
				} while (core.getAttribute(xmlparent, "#tag") === "regnode");

				gmenode = parseNode(core.getParent(xmlparent));
				return TASYNC.call(setGmeRegistry, gmenode, name, value);
			}
		} else {
			console.log("Warning: value in unknown node " + tag + " at line " + core.getAttribute(xmlnode, "#line"));
		}
	}

	function setGmeAttribute (gmenode, name, value) {
		if (gmenode) {
			core.setAttribute(gmenode, name, value);
		} else {
			console.log("Warning: trying to set attributes for nonexisting object");
		}
	}

	function setGmeRegistry (gmenode, name, value) {
		if (gmenode) {
			core.setRegistry(gmenode, name, value);
		} else {
			console.log("Warning: trying to set attributes for nonexisting object");
		}
	}

	// --- helpers

	function copyAttributes (xmlnode, gmenode, attrs) {
		ASSERT(xmlnode && gmenode && attrs);

		var key;
		for (key in attrs) {
			var value = core.getAttribute(xmlnode, key);
			if (value !== undefined) {
				if (attrs[key].charAt(0) !== "#") {
					core.setAttribute(gmenode, attrs[key], value);
				} else {
					core.setRegistry(gmenode, attrs[key], value);
				}
			}
		}
	}

	// --- persist 

	function persist () {
		console.log("Waiting for objects to be saved ...");
		return TASYNC.call(persist2, core.persist(gmeroot));
	}

	function persist2 () {
		console.log("Parsing done");
		console.log("Root is " + core.getKey(gmeroot));
	}
});
