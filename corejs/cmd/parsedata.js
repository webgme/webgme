/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/core3", "core/util", "core/config", "core/cache" ], function (ASSERT,
Core, UTIL, CONFIG, Cache) {
	"use strict";

	var supportedAspects = [ "SignalFlowAspect", "Architectural" ];
	var supportedPortRoles = [ "InputSignals", "OutputSignals", "Metric", "Parameter", "Property",
		"CADParameter", "CADProperty", "ComplexityMetric", "CyberParameter",
		"ValueFlowTypeSpecification", "CADModelInputPort" ];

	return function (storage, key, callback) {
		var cache = new Cache(storage);
		var core = new Core(cache);

		var oldLoadChildren = core.loadChildren;
		core.loadChildren = function (node, callback) {
			oldLoadChildren(node, function (err, children) {
				setTimeout(callback, 0, err, children);
			});
		};

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

		var loadSelfRegistry = function (xmlNode, callback2) {
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
			&& (core.getAttribute(xmlNode, "isopaque") === "yes" || core.getAttribute(xmlNode,
			"status") === "meta") ) {
				addValue(xmlNode, "", join.add());
			}

			var addValues = function (xmlNode, prefix, callback3) {
				ASSERT(xmlNode && prefix && callback3);

				loadSelfRegistry(xmlNode, function (err, reg) {
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
						if( core.getAttribute(xmlChild, "#tag") === "regnode" && name ) {
							addValues(xmlChild, name, join.add());
						}
					}
					join.wait();
				}
			});
		};

		var loadAllRegistry = function (xmlNode, callback2) {
			ASSERT(xmlNode && callback2);
			ASSERT(typeof core.getAttribute(xmlNode, "guid") === "string");

			var loadBaseRegistry = function (xmlNode, callback2) {
				ASSERT(xmlNode && callback2);

				core.loadPointer(xmlNode, "derivedfrom", function (err, xmlBase) {
					if( err ) {
						callback2(err);
					}
					else if( !xmlBase ) {
						callback2(err, {});
					}
					else {
						loadAllRegistry(xmlBase, callback2);
					}
				});
			};

			var join = new UTIL.AsyncObject(function (err, obj) {
				if( err ) {
					callback2(err);
				}
				else {
					var registry = {};

					for( var key in obj.base ) {
						registry[key] = obj.base[key];
					}
					for( key in obj.self ) {
						registry[key] = obj.self[key];
					}

					callback2(null, registry);
				}
			});

			loadSelfRegistry(xmlNode, join.asyncSet("self"));
			loadBaseRegistry(xmlNode, join.asyncSet("base"));

			join.wait();
		};

		var positionKeyRegExp = new RegExp("^PartRegs\\.([^\\.]*)\\.Position$");
		var positionValRegExp = new RegExp("^([0-9]*),([0-9]*)$");

		var parseRegistry = function (xmlNode, dataNode, callback2) {
			ASSERT(xmlNode && dataNode && callback2);

			core.setRegistry(dataNode, "position", {
				x: 0,
				y: 0
			});

			loadSelfRegistry(xmlNode, function (err, registry) {
				// loadAllRegistry(xmlNode, function (err, registry) {
				if( !err ) {
					for( var key in registry ) {
						var matchKey = positionKeyRegExp.exec(key);
						if( matchKey && supportedAspects.indexOf(matchKey[1]) >= 0 ) {
							var matchVal = positionValRegExp.exec(registry[key]);
							if( matchVal ) {
								core.setRegistry(dataNode, "position", {
									x: parseInt(matchVal[1], 10),
									y: parseInt(matchVal[2], 10)
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
				"#tag": "#type",
				guid: "#guid"
			});

			UTIL.immediateCallback(callback2, null, project);
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
						callback2(err, err ? null : model);
					});

					copyAttributes(xmlNode, model, {
						kind: "#kind",
						role: "#role",
						"#tag": "#type",
						guid: "#guid"
					});

					parseAttributes(xmlNode, model, join.add());
					parseRegistry(xmlNode, model, join.add());

					var tag = core.getRegistry(model, "#type");
					core.setRegistry(model, "isConnection", tag === "connection");

					var role = core.getRegistry(model, "#role");
					core.setAttribute(model, "isPort", supportedPortRoles.indexOf(role) >= 0);

					if( tag === "connection" || tag === "reference"
					|| core.hasPointer(xmlNode, "derivedfrom") ) {
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

		parsers.name = function (xmlNode, callback2) {
			var tag = core.getAttribute(xmlNode, "#tag");
			parseXmlNode(core.getParent(xmlNode), function (err, parent) {
				if( !err && parent ) {
					var value = core.getAttribute(xmlNode, "#text") || "";
					core.setAttribute(parent, tag, value);
				}
				UTIL.immediateCallback(callback2, err);
			});
		};
		parsers.author = parsers.name;
		parsers.comment = parsers.name;

		var parseXmlBase = function (xmlNode, callback2) {
			ASSERT(xmlNode && callback2);

			core.loadPointer(xmlNode, "derivedfrom", function (err, xmlType) {
				if( err ) {
					callback2(err);
				}
				else if( !xmlType ) {
					UTIL.immediateCallback(callback2, null, null);
				}
				else {
					parseXmlNode(xmlType, callback2);
				}
			});
		};

		var parsedCount = 0;
		var alreadyParsed = {};
		var unsavedObjects = 0;
		var persisting = false;

		var executeParser = function (path, parserFunction, xmlNode, callback2) {
			ASSERT(typeof path === "string" && parserFunction && xmlNode && callback2);
			ASSERT(alreadyParsed[path] === undefined);

			if( ++unsavedObjects >= 5000 && !persisting ) {
				persisting = true;
				core.persist(project, function (err) {
					persisting = false;
					if( err ) {
						console.log("Error during intermediate persisting" + err);
					}
				});
				unsavedObjects = 0;
			}

			alreadyParsed[path] = {
				parsing: true,
				callbacks: [ callback2 ]
			};

			parserFunction(xmlNode, function (err, dataNode) {
				ASSERT(!err || dataNode === undefined);
				ASSERT(alreadyParsed[path].parsing);

				var callbacks = alreadyParsed[path].callbacks;
				ASSERT(callbacks.length >= 1);

				if( err || !dataNode ) {
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

		var parseXmlNode = function (xmlNode, callback2) {
			ASSERT(xmlNode && callback2);

			var path = core.getStringPath(xmlNode);
			var data = alreadyParsed[path];
			if( data ) {
				if( data.parsing && data.callbacks ) {
					data.callbacks.push(callback2);
				}
				else {
					UTIL.immediateCallback(callback2, null, data);
				}
			}
			else {
				var tag = core.getAttribute(xmlNode, "#tag");
				if( parsers[tag] ) {
					executeParser(path, parsers[tag], xmlNode, callback2);
				}
				else {
					UTIL.immediateCallback(callback2, null, null);
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
				UTIL.immediateCallback(callback, null, node);
			}
		};

		var resolveConnectionPointers = function (xmlNode, dataNode, callback2) {
			ASSERT(xmlNode && dataNode && callback2 instanceof Function);

			core.loadChildren(xmlNode, function (err, xmlChildren) {
				if( err ) {
					callback2(err);
				}
				else {
					var xmlSourcePath, xmlTargetPath;

					for( var i = 0; i < xmlChildren.length; ++i ) {
						var xmlChild = xmlChildren[i];
						if( core.getAttribute(xmlChild, "#tag") === "connpoint" ) {
							var role = core.getAttribute(xmlChild, "role");

							// var pointerNames =
							// core.getPointerNames(xmlChild);
							// if( pointerNames.indexOf("refs-") < 0 ) {
							if( role === "src" ) {
								xmlSourcePath = core.getPointerPath(xmlChild, "target");
								ASSERT(typeof xmlSourcePath === "string");
							}
							else if( role === "dst" ) {
								xmlTargetPath = core.getPointerPath(xmlChild, "target");
								ASSERT(typeof xmlTargetPath === "string");
							}
							else {
								console.log("Warning: unknown connection role: " + role);
							}
							// }
						}
					}

					if( xmlSourcePath !== undefined && xmlTargetPath !== undefined ) {
						var dataSource = alreadyParsed[xmlSourcePath];
						var dataTarget = alreadyParsed[xmlTargetPath];

						if( dataSource && dataTarget ) {
							var ownPath = core.getStringPath(dataNode);
							var rel1 = core.getCommonPathPrefixData(ownPath, core
							.getStringPath(dataSource));
							var rel2 = core.getCommonPathPrefixData(ownPath, core
							.getStringPath(dataTarget));

							// console.log(rel1.firstLength, rel1.secondLength,
							// rel2.firstLength, rel2.secondLength);
							if( rel1.firstLength <= 2 && rel1.secondLength <= 2
							&& rel2.firstLength <= 2 && rel2.secondLength <= 2 ) {
								core.setPointer(dataNode, "source", dataSource);
								core.setPointer(dataNode, "target", dataTarget);
							}
						}
						else {
							if( !dataSource ) {
								console.log("Warning: connection source at " + xmlSourcePath + " not parsed");
							}
							if( !dataTarget ) {
								console.log("Warning: connection target at " + xmlSourcePath + " not parsed");
							}
						}
					}

					UTIL.immediateCallback(callback2, null);
				}
			});
		};

		var resolveBaseType = function (xmlNode, dataNode) {
			ASSERT(xmlNode && dataNode);

			var xmlBasePath = core.getPointerPath(xmlNode, "derivedfrom");
			ASSERT(typeof xmlBasePath === "string");

			var dataBase = alreadyParsed[xmlBasePath];
			ASSERT(dataBase);

			core.setPointer(dataNode, "base", dataBase);

			/*
			 * This does not work yet, infinite cycle, base is not yet
			 * processed, etc. // inherit registry var xmlBase = dataBase; for( ;; ) {
			 * var names = core.getRegistryNames(base); for( var i = 0; i <
			 * names.length; ++i ) { var name = names[i]; if(
			 * core.getRegistry(dataNode, name) === undefined ) {
			 * core.setRegistry(dataNode, name, core.getRegistry(base, name)); } }
			 * 
			 * xmlBasePath = core.getPointerPath(xmlNode, "derivedfrom"); if(
			 * typeof xmlBasePath !== "string" ) { break; }
			 * 
			 * base = alreadyParsed[xmlBasePath]; ASSERT(base); }
			 */
		};

		var resolvePointers = function (xmlNode, callback2) {
			ASSERT(xmlNode && callback2 instanceof Function);

			var dataNode = alreadyParsed[core.getStringPath(xmlNode)];
			ASSERT(dataNode);

			var join = new UTIL.AsyncJoin(callback2);

			var tag = core.getAttribute(xmlNode, "#tag");
			if( tag === "connection" ) {
				resolveConnectionPointers(xmlNode, dataNode, join.add());
			}

			// if( core.hasPointer(xmlNode, "derivedfrom") ) {
			// resolveBaseType(xmlNode, dataNode);
			// }

			join.wait();
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
						UTIL.immediateCallback(callback2, null);
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
			for( var i = 0; i < 200 && done < unresolved.length; ++i ) {
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
					callback3(new Error("Not a gme project"));
				}
				else {
					parseXmlNode(node, callback3);
				}
			}, function (node, callback3) {
				UTIL.immediateCallback(callback3, null);
			}, function (err2) {
				if( timerHandle ) {
					clearInterval(timerHandle);
					timerHandle = null;
				}

				if( err2 ) {
					callback2(new Error("Building error: " + err2));
				}
				else {
					console.log("Building done (" + parsedCount + " gme objects, "
					+ unresolved.length + " unresolved)");
					resolveUnresolved(function (err2) {
						if( err2 ) {
							callback2(new Error("Resolving error: " + err2));
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
