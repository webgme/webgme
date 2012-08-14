/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/core2", "core/util", "core/coretype" ], function (ASSERT, Core, UTIL,
CoreType) {
	"use strict";

	var tests = {};

	var core;
	var nodes = {};

	var attributeNames = null; // [ "name", "text" ];
	var pointerNames = null; // [ "ptr", "typ" ];

	var createNode = function (child, parent, type) {
		ASSERT(core && !nodes[child]);

		nodes[child] = core.createNode(nodes[parent], nodes[type]);
		core.setAttribute(nodes[child], "name", child);
	};

	var getNodeName = function (node) {
		if( node === null ) {
			return "null";
		}
		else if( node === undefined ) {
			return "undefined";
		}

		var name = "";
		while( node ) {
			name = core.getAttribute(node, "name") + name;
			node = core.getParent(node);
		}
		return name;
	};

	var getNodeNameArray = function (array) {
		if( Array.isArray(array) ) {
			return "[" + array.map(getNodeName).join(",") + "]";
		}
		else {
			return "" + array;
		}
	};

	var loadChildren = function (node, callback2) {
		core.loadChildren(node, function (err, array) {
			if( !err ) {
				ASSERT(Array.isArray(array));
				array.sort(function (nodea, nodeb) {
					var namea = core.getAttribute(nodea, "name");
					var nameb = core.getAttribute(nodeb, "name");
					ASSERT(typeof namea === "string" && typeof nameb === "string");

					return namea.localeCompare(nameb);
				});
			}
			callback2(err, array);
		});
	};

	var getAttributeInfo = function (node) {
		var line = "";
		var names = attributeNames || core.getAttributeNames(node);
		for( var i = 0; i < names.length; ++i ) {
			line += " " + names[i] + "=" + core.getAttribute(node, names[i]);
		}
		return line;
	};

	var loadPointerInfo = function (node, callback) {
		var join = new UTIL.AsyncArray(function (err, array) {
			if( err ) {
				callback(err);
			}
			else {
				callback(null, array.join(", "));
			}
		});

		var addData = function (name, callback) {
			core.loadPointer(node, name, function (err, target) {
				if( err ) {
					callback(err);
				}
				else {
					callback(null, name + "=" + getNodeName(target));
				}
			});
		};

		var names = pointerNames || core.getPointerNames(node);
		for( var i = 0; i < names.length; ++i ) {
			addData(names[i], join.asyncPush());
		}

		join.wait();
	};

	var loadCollectionInfo = function (node, callback) {
		var join = new UTIL.AsyncArray(function (err, array) {
			if( err ) {
				callback(err);
			}
			else {
				callback(null, array.join(", "));
			}
		});

		var addData = function (name, callback) {
			core.loadCollection(node, name, function (err, targets) {
				if( err ) {
					callback(err);
				}
				else {
					callback(null, name + "-inv=" + getNodeNameArray(targets));
				}
			});
		};

		var names = pointerNames || core.getCollectionNames(node);
		for( var i = 0; i < names.length; ++i ) {
			addData(names[i], join.asyncPush());
		}

		join.wait();
	};

	var loadNodeInfo = function (node, callback) {
		var join = new UTIL.AsyncArray(function (err, array) {
			if( err ) {
				callback(err);
			}
			else {
				var line = getNodeName(node) + ":\t";
				for( var i = 0; i < array.length; ++i ) {
					if( i > 0 && array[i] !== "" ) {
						line += ", ";
					}
					line += array[i];
				}
				callback(null, line);
			}
		});

		join.push(getAttributeInfo(node));
		loadPointerInfo(node, join.asyncPush());
		// loadCollectionInfo(node, join.asyncPush());

		join.wait();
	};

	var printTreeInfo = function (node, callback) {
		console.log("Printing tree info");

		UTIL.depthFirstSearch(loadChildren, node, function (child, callback) {
			loadNodeInfo(child, function (err, line) {
				if( !err ) {
					console.log(line);
				}
				callback(err);
			});
		}, function (child, callback) {
			callback(null);
		}, function (err) {
			if( !err ) {
				console.log("Printing done");
			}
			callback(err);
		});
	};

	tests[1] = function (storage, root, callback) {
		core = new Core(storage);

		createNode("a");
		createNode("b", "a");
		createNode("c", "b");
		createNode("d", "c");
		createNode("e", "a");
		createNode("f", "b");

		for(var i in nodes) {
			for(var j in nodes) {
				core.setPointer(nodes[i], "ptr" + j, nodes[j]);
			}
		}
		
		//core.deleteNode(nodes.d);

		core.moveNode(nodes.c, nodes.f);
//		core.setAttribute(nodes.g, "name", "g");

		core.persist(nodes.a, function (err) {
			callback(err, core.getKey(nodes.a));
		});
	};

	tests[2] = function (storage, root, callback) {
		core = new Core(storage);

		var findNameByPath = function (path) {
			if( path === undefined ) {
				return null;
			}

			for( var name in nodes ) {
				if( path === core.getStringPath(nodes[name]) ) {
					return name;
				}
			}
			return "unknown";
		};

		var printStats = function (what, func) {
			ASSERT(core);

			console.log("Printing " + what + ":");
			for( var name in nodes ) {
				console.log(name + ":", func(nodes[name]));
			}
			console.log();
		};

		printStats("attribute names", core.getAttributeNames);
		printStats("node names", function (node) {
			return core.getAttribute(node, "name");
		});
		printStats("pointer names", core.getPointerNames);
		printStats("collection names", core.getCollectionNames);
		printStats("pointer paths", function (node) {
			return core.getPointerPath(node, "ptr");
		});
		printStats("pointer targets", function (node) {
			return findNameByPath(core.getPointerPath(node, "ptr"));
		});
		printStats("collection count", function (node) {
			return core.getCollectionPaths(node, "ptr").length;
		});
		printStats("children count", function (node) {
			return core.getChildrenRelids(node).length;
		});
		printStats("lavels", core.getLevel);

		callback(null);
	};

	tests[3] = function (storage, root, callback) {
		core = new Core(storage);

		console.log("Printing out tree in alphanumerical order");
		core.loadRoot(root, function (err, node) {
			UTIL.depthFirstSearch(loadChildren, node, function (child, callback2) {

				var line = getNodeName(child) + ":";
				// line += " path=" + core.getStringPath(child);

				var finish = new UTIL.AsyncJoin(function (err2) {
					console.log(line);
					callback2(err2);
				});

				var addPointer = function (callback3, what, err, target) {
					if( !err ) {
						line += " " + what + "=" + getNodeName(target);
					}

					callback3(err);
				};

				var addCollection = function (callback3, what, err, sources) {
					if( !err ) {
						var s = "";
						for( var j = 0; j < sources.length; ++j ) {
							if( j !== 0 ) {
								s += ",";
							}
							s += getNodeName(sources[j]);
						}
						line += " " + what + "-inv=[" + s + "]";
					}

					callback3(err);
				};

				var names = core.getAttributeNames(child);
				for( var i = 0; i < names.length; ++i ) {
					line += " " + names[i] + "=" + core.getAttribute(child, names[i]);
				}

				names = core.getPointerNames(child);
				for( i = 0; i < names.length; ++i ) {
					core
					.loadPointer(child, names[i], addPointer.bind(null, finish.add(), names[i]));
					// line += " " + names[i] + "-path=" +
					// core.getPointerPath(child, names[i]);
				}

				names = core.getCollectionNames(child);
				for( i = 0; i < names.length; ++i ) {
					core.loadCollection(child, names[i], addCollection.bind(null, finish.add(),
					names[i]));
				}

				finish.wait();
			}, function (child, callback2) {
				callback2(null);
			}, function (err) {
				console.log("Printing done");
				callback(err, root);
			});
		});
	};

	tests[4] = function (storage, root, callback) {
		core = new CoreType(storage);

		nodes.a = core.createNode();
		core.setAttribute(nodes.a, "name", "a");

		nodes.b = core.createNode(nodes.a);
		core.setAttribute(nodes.b, "name", "b");

		nodes.c = core.createNode(nodes.a, nodes.b);
		core.setAttribute(nodes.c, "name", "c");

		core.setAttribute(nodes.b, "text", "b");

		nodes.d = core.createNode(nodes.b);
		core.setAttribute(nodes.d, "name", "d");

		core.persist(nodes.a, function (err) {
			callback(err, core.getKey(nodes.a));
		});
	};

	tests[5] = function (storage, root, callback) {
		core = new Core(storage);

		core.loadRoot(root, function (err, node) {
			if( err ) {
				callback(err);
			}
			else {
				printTreeInfo(node, function (err) {
					if( err ) {
						callback(err);
					}
					else {
						callback(null, root);
					}
				});
			}
		});
	};

	return function (number, storage, root, callback) {
		if( !tests[number] ) {
			callback("no such test program");
		}
		else {
			console.log("Running test " + number);
			tests[number](storage, root, callback);
		}
	};
});
