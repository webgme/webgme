/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/core2", "core/util" ], function (ASSERT, Core, UTIL) {
	"use strict";

	var tests = {};

	var core;
	var nodes = {};

	var createNode = function (child, parent) {
		ASSERT(core && !nodes[child]);

		nodes[child] = core.createNode(nodes[parent]);
		core.setAttribute(nodes[child], "name", child);
	};

	tests[1] = function (storage, root, callback) {
		core = new Core(storage);

		createNode("a");
		createNode("b", "a");
		createNode("c", "a");
		createNode("d", "b");
		createNode("e", "b");

		core.setPointer(nodes.d, "ptr", nodes.c);
		// core.setPointer(nodes.c, "ptr", nodes.a);
		// core.deletePointer(nodes.c, "ptr");

		// core.deleteNode(nodes.b);

//		nodes.e = core.copyNode(nodes.b, nodes.c);
//		core.setAttribute(nodes.e, "name", "e");

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

		var loadChildren = function(node, callback2) {
			core.loadChildren(node, function(err, array) {
				if( !err ) {
					ASSERT( array.constructor === Array );
					array.sort(function(nodea, nodeb) {
						var namea = core.getAttribute(nodea, "name");
						var nameb = core.getAttribute(nodeb, "name");
						ASSERT(typeof namea === "string" && typeof nameb === "string");
					
						return namea.localeCompare(nameb);
					});
				}
				callback2(err, array);
			});
		};
		
		var getNodeName = function(node) {
			var name = "";
			while( node ) {
				name = core.getAttribute(node, "name") + name;
				node = core.getParent(node);
			}
			return name;
		};
		
		console.log("Printing out tree in alphanumerical order");
		core.loadRoot(root, function(err, node) {
			UTIL.depthFirstSearch(loadChildren, node, function(child, callback2) {
				
				var line = getNodeName(child) + ":";
				console.log("x", line);

				var finish = new UTIL.AsyncJoin(function(err2) {
					console.log(line);
//					callback2(err2);
				});
				
				var addName = function(callback3, what, err, target) {
					if( !err ) {
						line += " " + what + "=" + getNodeName(target);
					}
					
					callback3(err);
				};
				
				var pointers = core.getPointerNames(child);
				for(var i = 0; i < pointers.length; ++i) {
					core.loadPointer(child, pointers[i], addName.bind(null, finish.add(), pointers[i]));
				}
				finish.start();
			}, function(child, callback2) {
				callback2(null);
			}, function(err) {
				console.log("Printing done");
				callback(err, root);
			});
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
