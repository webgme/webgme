/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/core2", "core/util", "core/config", "core/cache" ], function (ASSERT,
Core, UTIL, CONFIG, Cache) {
	"use strict";

	return function (storage, key, callback) {
		var core = new Core(new Cache(storage));

		var project = core.createNode();

		var copyAttributes = function (xmlNode, dataNode, attrs) {
			ASSERT(xmlNode && dataNode && attrs);

			for( var key in attrs ) {
				var value = core.getAttribute(xmlNode, key);
				if( value !== undefined ) {
					if( attrs[key].charAt(0) !== "#" ) {
						core.setAttribute(dataNode, attrs[key], value);
					}
					else {
						core.setRegistry(dataNode, attrs[key], value);
					}
				}
			}
		};

		var loadXmlChildByTag = function (xmlNode, tagName, callback2) {
			core.loadChildren(xmlNode, function (err, children) {
				if( err ) {
					callback2(err);
				}
				else {
					for( var i = 0; i < children.length; ++i ) {
						if( core.getAttribute(children[i], "#tag") === tagName ) {
							callback2(null, children[i]);
							return;
						}
					}
					callback2(null, null);
				}
			});
		};

		var copyChildTexts = function (xmlNode, dataNode, attrs, callback2) {
			ASSERT(xmlNode && dataNode && attrs && callback2);

			var join = new UTIL.AsyncJoin(callback2);

			var load = function (tagName, attrName, callback3) {
				ASSERT(typeof tagName === "string");
				ASSERT(typeof attrName === "string");
				ASSERT(callback3 instanceof Function);

				loadXmlChildByTag(xmlNode, tagName, function (err, node) {
					if( !err && node ) {
						var text = core.getAttribute(node, "#text") || "";
						core.setAttribute(dataNode, attrName, text);
					}

					callback3(err);
				});
			};

			for( var tagName in attrs ) {
				load(tagName, attrs[tagName], join.add());
			}

			join.wait();
		};

		var parseAttributes = function (xmlNode, dataNode, callback2) {
			ASSERT(xmlNode && dataNode && callback2);

			core.loadChildren(xmlNode, function (err, children) {
				if( err ) {
					callback2(err);
				}
				else {
					var join = new UTIL.AsyncJoin(callback2);

					for( var i = 0; i < children.length; ++i ) {
						var child = children[i];
						if( core.getAttribute(child, "#tag") === "attribute" ) {
							var name = core.getAttribute(child, "kind");
							copyChildTexts(child, dataNode, {
								value: name
							}, join.add());
						}
					}

					join.wait();
				}
			});
		};

		var loadRegistryNodes = function (xmlNode, callback2) {
			ASSERT(xmlNode && callback2);

			var registry = {};
			var join = new UTIL.AsyncJoin(function (err) {
				callback2(err, err ? undefined : registry);
			});

			var addValue = function (xmlNode, name, callback3) {
				ASSERT(xmlNode && typeof name === "string" && callback3);

				loadXmlChildByTag(xmlNode, "value", function (err, value) {
					if( !err ) {
						value = core.getAttribute(value, "#text") || "";
						ASSERT(registry[name] === undefined);
						registry[name] = value;
					}
					callback3(err);
				});
			};

			if( core.getAttribute(xmlNode, "#tag") === "regnode"
			&& core.getAttribute(xmlNode, "isopaque") === "yes" ) {
				addValue(xmlNode, "", join.add());
			}

			var addValues = function (xmlNode, prefix, callback3) {
				ASSERT(xmlNode && prefix && callback3);

				loadRegistryNodes(xmlNode, function (err, reg) {
					if( !err ) {
						for( var key in reg ) {
							var name = key ? prefix + "." + key : prefix;
							ASSERT(registry[name] === undefined);
							registry[name] = reg[key];
						}
					}
					callback3(err);
				});
			};

			core.loadChildren(xmlNode, function (err, xmlChildren) {
				if( err ) {
					join.fail(err);
				}
				else {
					for( var i = 0; i < xmlChildren.length; ++i ) {
						var xmlChild = xmlChildren[i];
						var name = core.getAttribute(xmlChild, "name");
						if( name ) {
							addValues(xmlChild, name, join.add());
						}
					}
					join.wait();
				}
			});
		};

		var positionRegexp = new RegExp("^([0-9]*),([0-9]*)$");

		var parseRegistry = function (xmlNode, dataNode, callback2) {
			ASSERT(xmlNode && dataNode && callback2);
			loadRegistryNodes(xmlNode, function (err, registry) {
				if( !err ) {
					for( var key in registry ) {
						if( key.substr(-9) === ".Position" ) {
							var match = positionRegexp.exec(registry[key]);
							if( match ) {
								core.setRegistry(dataNode, "position", {
									x: match[1],
									y: match[2]
								});
							}
						}
					}
				}
				callback2(err);
			});
		};

		var parsers = {};

		parsers.project = function (xmlNode, callback2) {
			copyAttributes(xmlNode, project, {
				cdate: "created",
				mdate: "modified",
				metaname: "#metaname",
				"#tag": "#type"
			});

			copyChildTexts(xmlNode, project, {
				name: "name",
				comment: "comment",
				author: "author"
			}, function (err) {
				callback2(err, err ? undefined : project);
			});
		};

		var unresolved = [];

		parsers.model = function (xmlNode, callback2) {
			parseXmlNode(core.getParent(xmlNode), function (err, parent) {
				if( err ) {
					callback2(err);
				}
				else {
					var model = core.createNode(parent);

					var join = new UTIL.AsyncJoin(function (err) {
						if( err ) {
							callback2(err);
						}
						else {
							callback2(null, model);
						}
					});

					copyAttributes(xmlNode, model, {
						kind: "#kind",
						role: "#role",
						"#tag": "#type"
					});

					copyChildTexts(xmlNode, model, {
						name: "name"
					}, join.add());

					parseAttributes(xmlNode, model, join.add());
					parseRegistry(xmlNode, model, join.add());

					var tag = core.getAttribute(xmlNode, "#tag");

					core.setRegistry(model, "isConnection", tag === "connection");

					if( tag === "connection" || tag === "reference" ) {
						unresolved.push(xmlNode);
					}

					join.wait();
				}
			});
		};

		parsers.folder = parsers.model;
		parsers.atom = parsers.model;
		parsers.connection = parsers.model;
		parsers.reference = parsers.model;

		var parsedCount = 0;
		var alreadyParsed = {};

		var executeParser = function (path, parserFunction, xmlNode, callback2) {
			ASSERT(typeof path === "string" && parserFunction && xmlNode && callback2);
			ASSERT(alreadyParsed[path] === undefined);

			alreadyParsed[path] = {
				parsing: true,
				callbacks: [ callback2 ]
			};

			parserFunction(xmlNode, function (err, dataNode) {
				ASSERT(!err || dataNode === undefined);
				ASSERT(alreadyParsed[path].parsing);

				var callbacks = alreadyParsed[path].callbacks;
				ASSERT(callbacks.length >= 1);

				if( err ) {
					delete alreadyParsed[path];
				}
				else {
					parsedCount += 1;
					alreadyParsed[path] = dataNode;
				}

				for( var i = 0; i < callbacks.length; ++i ) {
					callbacks[i](err, dataNode);
				}
			});
		};

		var parseXmlNode = function (node, callback2) {
			ASSERT(node && callback2);

			var path = core.getStringPath(node);
			var data = alreadyParsed[path];
			if( data ) {
				if( data.parsing && data.callbacks ) {
					data.callbacks.push(callback2);
				}
				else {
					callback2(null, data);
				}
			}
			else {
				var tag = core.getAttribute(node, "#tag");
				if( parsers[tag] ) {
					executeParser(path, parsers[tag], node, callback2);
				}
				else {
					callback2(null, null);
				}
			}
		};

		var timerHandle, objectCount = 0;

		// We do our caching to avoid concurrent modifications on doubly loaded
		// nodes
		var loadedNodes = {};

		var resolveNotifyCallbacks = function (path, err, node) {
			var callbacks = loadedNodes[path];
			ASSERT(Array.isArray(callbacks));

			loadedNodes[path] = err ? undefined : node;

			for( var i = 0; i < callbacks.length; ++i ) {
				callbacks[i](err, node);
			}
		};

		var resolveLoadByPath = function (path, callback) {
			ASSERT(typeof path === "string");

			var node = loadedNodes[path];

			if( node === undefined ) {
				ASSERT(path !== "");

				loadedNodes[path] = [ callback ];

				var index = path.lastIndexOf("/");
				var base = index >= 0 ? path.substr(0, index) : "";
				var relid = index >= 0 ? path.substr(index + 1) : path;
				ASSERT(relid !== "");

				resolveLoadByPath(base, function (err, parent) {
					if( err ) {
						resolveNotifyCallbacks(path, err);
					}
					else {
						core.loadChild(parent, relid, function (err, node) {
							resolveNotifyCallbacks(path, err, node);
						});
					}
				});
			}
			else if( Array.isArray(node) ) {
				node.push(callback);
			}
			else {
				ASSERT(typeof node === "object");
				callback(null, node);
			}
		};

		var resolveSetPointer = function (xmlNode, ptrName, dataNode, ptrName2, callback2) {
			ASSERT(xmlNode && ptrName && dataNode && ptrName2 && callback);

			core.loadPointer(xmlNode, ptrName, function (err, xmlTarget) {
				if( !err ) {
					var dataTarget = alreadyParsed[core.getStringPath(xmlTarget)];
					ASSERT(dataTarget);
					
					core.setPointer(dataNode, ptrName2, dataTarget);
				}
				callback2(err);
			});
		};

		var resolvePointers = function (xmlNode, callback2) {
			ASSERT(xmlNode && callback2 instanceof Function);

			var dataNode = alreadyParsed[core.getStringPath(xmlNode)];
			ASSERT(dataNode);

			var tag = core.getAttribute(xmlNode, "#tag");
			if( tag === "connection" ) {
				core.loadChildren(xmlNode, function (err, xmlChildren) {
					if( err ) {
						callback2(err);
					}
					else {
						var join = new UTIL.AsyncJoin(callback2);

						for( var i = 0; i < xmlChildren.length; ++i ) {
							var xmlChild = xmlChildren[i];
							if( core.getAttribute(xmlChild, "#tag") === "connpoint" ) {
								var role = core.getAttribute(xmlChild, "role");
								if( role === "src" ) {
									resolveSetPointer(xmlChild, "target", dataNode, "source", join
									.add());
								}
								else if( role === "dst" ) {
									resolveSetPointer(xmlChild, "target", dataNode, "target", join
									.add());
								}
								else {
									console.log("Warning: unknown connection role: " + role);
								}
							}
						}

						join.wait();
					}
				});
			}
			else {
				callback2(null);
			}
		};

		var resolveUnresolved = function (callback2) {
			ASSERT(callback2 instanceof Function);

			console.log("Resolving " + unresolved.length + " connections and references ...");

			var done = 0;
			var index = 0;
			var next = function (err) {
				if( done < unresolved.length ) {
					if( err ) {
						if( timerHandle ) {
							clearInterval(timerHandle);
							timerHandle = null;
						}
						callback2(err);
					}
					else if( ++done === unresolved.length ) {
						ASSERT(index === done);
						if( timerHandle ) {
							clearInterval(timerHandle);
							timerHandle = null;
						}
						callback2(null);
					}
					else if( index < unresolved.length ) {
						var xmlNode = unresolved[index++];
						resolvePointers(xmlNode, next);
					}
				}
			};

			ASSERT(!timerHandle);
			timerHandle = setInterval(function () {
				console.log("  at object " + index + " out of " + unresolved.length);
			}, CONFIG.parser.reportingTime);

			// resolve concurrently
			for( var i = 0; i < 20 && done < unresolved.length; ++i ) {
				--done;
				next(null);
			}
		};

		var parseXmlProject = function (root, callback2) {
			console.log("Building gme project ...");

			timerHandle = setInterval(function () {
				console.log("  at object " + objectCount);
			}, CONFIG.parser.reportingTime);

			UTIL.depthFirstSearch(core.loadChildren, root, function (node, callback3) {
				++objectCount;
				if( core.getLevel(node) === 1 && core.getAttribute(node, "#tag") !== "project" ) {
					callback3("Not a gme project");
				}
				else {
					parseXmlNode(node, callback3);
				}
			}, function (node, callback3) {
				callback3(null);
			}, function (err2) {
				if( timerHandle ) {
					clearInterval(timerHandle);
					timerHandle = null;
				}

				if( err2 ) {
					callback2("Building error: " + err2);
				}
				else {
					console.log("Building done (" + parsedCount + " gme objects, "
					+ unresolved.length + " unresolved)");
					resolveUnresolved(function (err2) {
						if( err2 ) {
							callback2("Resolving error: " + err2);
						}
						else {
							console.log("Resolving done");
							console.log("Saving project ... ");
							core.persist(project, function (err3) {
								console.log("Saving " + (err3 ? " error:" + err3 : "done"));
								callback2(err3, core.getKey(project));
							});
						}
					});
				}
			});
		};

		core.loadRoot(key, function (err, root) {
			if( err ) {
				callback(err);
			}
			else {
				parseXmlProject(root, callback);
			}
		});
	};
});
