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

requirejs([ "util/assert", "util/sax", "fs", "core/core", "core/tasync", "storage/mongo", "storage/cache" ], function (ASSERT, SAX, FS, Core, TASYNC, Mongo, Cache) {
	"use strict";

	TASYNC.trycatch(main, function (error) {
		console.log(error.trace || error.stack);

		setProgress(null);
		closeProject();
		closeDatabase();
	});

	function main () {
		var argv = process.argv.slice(2);

		if (argv.length < 1) {
			console.log("Usage: node parse_cyphy.js xmlroot [project] [database] [host] [port]");
			return;
		}

		var xmlroot = argv[0];
		var project = argv[1] || "test";
		var database = argv[2] || "webgme";
		var host = argv[3] || "localhost";
		var port = argv[4];

		var done = TASYNC.call(openDatabase, host, port, database);
		done = TASYNC.call(openProject, project, done);
		done = TASYNC.call(parse, xmlroot, done);
		done = TASYNC.call(persist, done);
		done = TASYNC.call(closeProject, done);
		done = TASYNC.call(closeDatabase, done);

		return done;
	}

	// --- database

	var database;

	function openDatabase (host, port, name) {
		console.log("Opening database " + name + " on " + host);

		var database = new Cache(new Mongo({
			host: host,
			port: port,
			database: name
		}), {});

		database.openDatabase = TASYNC.wrap(database.openDatabase);
		database.openProject = TASYNC.wrap(database.openProject);
		database.closeDatabase = TASYNC.wrap(database.closeDatabase);

		return TASYNC.call(openDatabase2, database, database.openDatabase());
	}

	function openDatabase2 (d) {
		database = d;
	}

	function closeDatabase () {
		if (database) {
			console.log("Closing database");

			var d = database;
			database = null;

			return d.closeDatabase();
		}
	}

	// --- project

	var project, core;

	function openProject (name) {
		TASYNC.call(openProject2, database.openProject(name));
	}

	function openProject2 (p) {
		p.closeProject = TASYNC.wrap(p.closeProject);
		p.dumpObjects = TASYNC.wrap(p.dumpObjects);
		p.findHash = TASYNC.wrap(p.findHash);
		p.setBranchHash = TASYNC.wrap(p.setBranchHash);
		p.getBranchHash = TASYNC.wrap(p.getBranchHash);

		project = p;

		core = new Core(project, {
			autopersist: true
		});

		core.persist = TASYNC.wrap(core.persist);
		core.loadByPath = TASYNC.wrap(core.loadByPath);
		core.loadRoot = TASYNC.wrap(core.loadRoot);
		core.loadChildren = TASYNC.wrap(core.loadChildren);
	}

	function closeProject () {
		if (project) {
			var p = project;
			project = null;

			return p.closeProject();
		}
	}

	// --- progress

	var progress;

	function setProgress (func) {
		if (progress) {
			clearInterval(progress);
		}

		if (func) {
			progress = setInterval(func, 2000);
		}
	}

	// --- parse main

	var xmlroot;

	function parse (hash) {
		ASSERT(typeof hash === "string");

		if (hash.charAt(0) !== "#") {
			hash = "#" + hash;
		}

		hash = project.findHash(hash);
		var xmlroot = TASYNC.call(core.loadRoot, hash);
		return TASYNC.call(parse2, xmlroot);
	}

	function parse2 (_xmlroot) {
		console.log("Building gme project ...");

		xmlroot = _xmlroot;

		if (core.getAttribute(xmlroot, "#tag") !== "project") {
			throw new Error("The root is not a parsed xme file");
		}

		return traverseNode(xmlroot);
	}

	var traverseNode = TASYNC.throttle(function (xmlnode) {
		var done;

		done = TASYNC.call(traverseChildren, core.loadChildren(xmlnode));
		done = TASYNC.join(done, parseNode(xmlnode));

		return done;
	}, 1000);

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

	function parseFco2 (xmlnode, gmeparent) {
		var gmenode = core.createNode(gmeparent);

		copyAttributes(xmlnode, gmenode, {
			id: "#id",
			relid: "#relid",
			kind: "#kind",
			guid: "#guid",
			"#tag": "#tag",
			"#line": "#line"
		});

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
