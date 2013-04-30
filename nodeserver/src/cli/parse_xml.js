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
			console.log("Usage: node parse_xml.js <xmlfile> [project] [database] [host] [port]");
			return;
		}

		var xmlfile = argv[0];
		var project = argv[1] || "test";
		var database = argv[2] || "webgme";
		var host = argv[3] || "localhost";
		var port = argv[4];

		var done = TASYNC.call(openDatabase, host, port, database);
		done = TASYNC.call(openProject, project, done);
		done = TASYNC.call(function () {
			return parse(xmlfile);
		}, done);
		done = TASYNC.call(resolve, done);
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
	}

	function closeProject () {
		if (project) {
			var p = project;
			project = null;

			return p.closeProject();
		}
	}

	// --- DTD

	var ID = "id", IDREF = "idref", IDREFS = "idrefs";
	var DTD = {
		folder: {
			id: ID
		},
		model: {
			id: ID,
			derivedfrom: IDREF
		},
		atom: {
			id: ID,
			derivedfrom: IDREF
		},
		reference: {
			id: ID,
			derivedfrom: IDREF,
			referred: IDREF
		},
		set: {
			id: ID,
			derivedfrom: IDREF,
			members: IDREFS
		},
		connection: {
			id: ID,
			derivedfrom: IDREF
		},
		connpoint: {
			target: IDREF,
			refs: IDREFS
		}
	};

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

	// --- parser

	var objects = 0, idCount = 0, paths = {}, unresolved = [], root;

	var parse = TASYNC.wrap(function (xmlfile, callback) {
		var tags = [];

		function addTag (tag) {
			var node;
			if (tags.length === 0) {
				node = core.createNode();
				root = node;
			} else {
				node = core.createNode(tags[tags.length - 1].node);
			}

			var hasIdrefs = false, key;
			for (key in tag.attributes) {
				var value = tag.attributes[key];
				core.setAttribute(node, key, value);

				var type = (DTD[tag.name] || {})[key];
				if (type === ID) {
					ASSERT(paths[value] === undefined);

					paths[value] = core.getStringPath(node);
					++idCount;
				} else if (type === IDREF || type === IDREFS) {
					hasIdrefs = true;
				}

				if (key === "id" && type !== ID) {
					console.log("ID not defined in DTD", tag.name, value, type);
				}
			}

			if (hasIdrefs) {
				unresolved.push(core.getStringPath(node));
			}

			core.setAttribute(node, "#tag", tag.name);

			tag.text = "";
			tag.node = node;

			++objects;
			tags.push(tag);
		}

		setProgress(function () {
			console.log("  at line " + parser._parser.line + " (" + objects + " xml objects, " + idCount + " ids, " + unresolved.length + " idrefs)");
		});

		var parser = SAX.createStream(true, {
			trim: true
		});

		parser.on("opentag", addTag);

		parser.on("closetag", function (name) {
			ASSERT(tags.length >= 1);

			var tag = tags.pop();
			ASSERT(tag.name === name);

			if (tag.text !== "") {
				core.setAttribute(tag.node, "#text", tag.text);
			}
		});

		parser.on("text", function (text) {
			if (tags.length !== 0) {
				var tag = tags[tags.length - 1];
				tag.text += text;
			}
		});

		parser.on("error", function (error) {
			setProgress(null);
			callback(error);
		});

		parser.on("end", function () {
			ASSERT(tags.length === 0);

			setProgress(null);
			callback(null);
		});

		var stream = FS.createReadStream(xmlfile);

		stream.on("error", function (err) {
			setProgress(null);
			callback(err.code === "ENOENT" ? "File not found: " + xmlfile : "Unknown file error: " + JSON.stringify(err));
		});

		stream.on("open", function () {
			console.log("Parsing xml file ...");
			stream.pipe(parser);
		});
	});

	// --- persist

	function persist () {
		console.log("Waiting for objects to be saved ...");
		return core.persist(root);
	}

	// --- resolve

	var resolved = 0;

	function resolve () {
		console.log("Resolving " + unresolved.length + " objects with idrefs ...");

		setProgress(function () {
			console.log("  at object " + resolved + " out of " + unresolved.length);
		});

		var i, done;
		for (i = 0; i < unresolved.length; ++i) {
			done = TASYNC.join(done, resolveObject(unresolved[i]));
		}

		return TASYNC.call(resolve2, done);
	}

	function resolve2 () {
		setProgress(null);
		return TASYNC.call(resolve3, persist());
	}

	function resolve3 () {
		console.log("Parsing done (" + objects + " xml objects, " + idCount + " ids, " + resolved + " idrefs)");
		console.log("Root is " + core.getKey(root));
	}

	var resolveObject = TASYNC.throttle(function (path) {
		ASSERT(typeof path === "string");

		++resolved;
		return TASYNC.call(resolveObject2, core.loadByPath(root, path));
	}, 10);

	function resolveObject2 (node) {
		var done, id, path;

		var tag = core.getAttribute(node, "#tag");
		var names = core.getAttributeNames(node);

		for ( var i = 0; i < names.length; ++i) {
			var name = names[i];
			var type = (DTD[tag] || {})[name];
			if (type === IDREF) {
				id = core.getAttribute(node, name);
				path = paths[id];
				if (typeof path !== "string") {
					console.log("Missing id " + id);
				} else {
					done = TASYNC.join(done, resolvePointer(node, name, path));
				}
			} else if (type === IDREFS) {
				id = core.getAttribute(node, name);
				ASSERT(typeof id === "string");

				id = id === "" ? [] : id.split(" ");
				for ( var j = 0; j < id.length; ++j) {
					path = paths[id[j]];
					if (typeof path !== "string") {
						console.log("Missing id " + id[j]);
					} else {
						done = TASYNC.join(done, resolvePointer(node, name + "-" + j, path));
					}
				}
			}
		}

		return done;
	}

	function resolvePointer (node, name, path) {
		return TASYNC.call(core.setPointer, node, name, core.loadByPath(root, path));
	}
});
