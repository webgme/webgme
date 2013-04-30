/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "util/assert", "util/sax", "fs", "core/core", "core/tasync" ], function (ASSERT, SAX, FS, Core, TASYNC) {
	"use strict";

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

	return function (project, xmlfile) {
		ASSERT(project && typeof xmlfile === "string");

		var core = new Core(project, {
			autopersist: true
		});

		core.persist = TASYNC.wrap(core.persist);
		core.loadByPath = TASYNC.wrap(core.loadByPath);

		var paths = {};
		var idCount = 0, objectCount = 0, resolved = 0;
		var unresolved = [];

		var parse = TASYNC.wrap(function (xmlfile, callback) {
			var tags = [];

			var reporter = setInterval(function () {
				console.log("  at line " + parser._parser.line + " (" + objectCount + " xml objects, " + idCount + " ids, " + unresolved.length + " idrefs)");
			}, 2000);

			var parser = SAX.createStream(true, {
				trim: true
			});

			var addTag = function (tag) {
				var node = core.createNode(tags.length === 0 ? null : tags[tags.length - 1].node);

				var hasIdrefs = false;
				for ( var key in tag.attributes) {
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

				++objectCount;
				tags.push(tag);
			};

			function getDate () {
				var date = new Date();
				var d = date.getDate();
				var m = date.getMonth() + 1;
				var y = date.getFullYear();
				return "" + y + "-" + (m <= 9 ? "0" + m : m) + '-' + (d <= 9 ? "0" + d : d);
			}

			addTag({
				name: "Root",
				attributes: {
					created: getDate()
				}
			});

			parser.on("opentag", addTag);

			parser.on("closetag", function (name) {
				ASSERT(tags.length >= 2);

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
				clearInterval(reporter);
				callback(error);
			});

			parser.on("end", function () {
				clearInterval(reporter);
				console.log("Waiting for objects to be saved ...");

				ASSERT(tags.length === 1);

				TASYNC.unwrap(core.persist)(tags[0].node, function (err) {
					if (err) {
						callback(err);
					} else {
						var root = tags[0].node;
						callback(null, root);
					}
				});
			});

			var stream = FS.createReadStream(xmlfile);

			stream.on("error", function (err) {
				clearInterval(reporter);
				callback(err.code === "ENOENT" ? "File not found: " + xmlfile : "Unknown file error: " + JSON.stringify(err));
			});

			stream.on("open", function () {
				console.log("Parsing xml file ...");
				stream.pipe(parser);
			});
		});

		var globalRoot;

		function resolve (root) {
			console.log("Resolving " + unresolved.length + " objects with idrefs ...");

			globalRoot = root;

			var reporter = setInterval(function () {
				console.log("  at object " + resolved + " out of " + unresolved.length);
			}, 2000);

			return TASYNC.trycatch(function () {
				var i, done;
				for (i = 0; i < unresolved.length; ++i) {
					done = TASYNC.join(done, resolveObject(unresolved[i]));
				}

				return TASYNC.call(function () {
					return TASYNC.call(function () {
						clearInterval(reporter);
						console.log("Parsing done (" + objectCount + " xml objects, " + idCount + " ids, " + resolved + " idrefs)");

						return core.getKey(root);
					}, core.persist(root));
				}, done);
			}, function (error) {
				clearInterval(reporter);
				throw error;
			});
		}

		var resolveObject = TASYNC.throttle(function (path) {
			ASSERT(typeof path === "string");

			++resolved;
			return TASYNC.call(resolveObject2, core.loadByPath(globalRoot, path));
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
					if (path === undefined) {
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
						if (path === undefined) {
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
			ASSERT(typeof path === "string");
			return TASYNC.call(core.setPointer, node, name, core.loadByPath(globalRoot, path));
		}

		return TASYNC.call(resolve, parse(xmlfile));
	};
});
