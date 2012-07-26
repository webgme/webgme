/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/core2", "core/util" ], function (ASSERT, CoreRels, UTIL) {
	"use strict";

	var PROTOTYPE = "typ";

	var findAndRemove = function(nodes, relid) {
		for(var i = 0; i < nodes.length; ++i) {
			if(nodes[i].relid === relid) {
				var node = nodes[i];
				nodes.splice(i, 1);
				return node;
			}
		}
		return null;
	};
	
	var CoreType = function (storage) {

		var corerels = new CoreRels(storage);

		var isValidNode = function (node) {
			while( node ) {
				if( node.data && !corerels.isValid(node) ) {
					return false;
				}
				if( node.type === undefined ) {
					return false;
				}
				node = node.type;
			}
			return true;
		};

		var getKey = function (node) {
			ASSERT(isValidNode(node));

			return node.type ? undefined : corerels.getKey(node);
		};

		var loadRoot = function (key, callback) {
			corerels.loadRoot(key, function(err, node) {
				if(node) {
					node.type = null;
				}
				callback(err, node);
			});
		};

		var getChildrenRelids = function (node) {
			ASSERT(isValidNode(node));

			var relids = [];
			do {
				if( node.data ) {
					relids.concat(corerels.getChildrenRelids(node));
				}

				node = node.type;
			} while( node );

			return relids;
		};

		var setupPrototype = function (node, callback) {
			ASSERT(corerels.isValidNode(node));
			
			if(node.type !== undefined) {
				callback(null);
			}
			else {
				ASSERT(node.parent);

				var join = UTIL.AsyncObject(function(err, obj) {
					if(err) {
						callback(err);
					}
					else if(obj.type) {
						node.type = obj.type;
						setupPrototype(node.type, callback);
					}
					else if(node.parent.type) {
						corerels.loadChild(node.parent.type, node.relid, function(err, type) {
							if(err) {
								callback(err);
							}
							else {
								node.type = type;
								setupPrototype(node.type, callback);
							}
						});
					}
					else {
						node.type = null;
						callback(null);
					}
				});
				
				setupPrototype(node.parent, join.asyncSet("void"));
				corerels.loadPointer(node, PROTOTYPE, join.asyncSet("type"));
				join.wait();
			}
		};

		var setupPrototypeSingle = function(callback) {
			return function(err, node) {
				if(err || !node) {
					callback(err, node);
				}
				else {
					setupPrototype(node, callback);
				}
			};
		};
		
		var setupPrototypeArray = function(callback) {
			return function(err, nodes) {
				if(err || !nodes.length) {
					callback(err, nodes);
				}
				else {
					var join = new UTIL.AsyncArray(callback);
					
					for(var i = 0; i < nodes.length; ++i) {
						setupPrototype(nodes[i], join.asyncPush());
					}
					
					join.wait();
				}
			};
		};
		
		var loadChild = function (node, relid, callback) {
			corerels.loadChild(node, relid, setupPrototypeSingle(callback));
		};
		
		var loadByPath = function (node, path, callback) {
			corerels.loadByPath(node, path, setupPrototypeSingle(callback));
		};

		var loadChildren = function (node, callback) {
			corerels.loadChildren(node, setupPrototypeArray(callback));
		};
		
		return {
			// check
			isValidNode: isValidNode,
			isValidRelid: corerels.isValidRelid,
			isValidPath: corerels.isValidPath,

			// root
			getKey: getKey,
			loadRoot: loadRoot,
			persist: corerels.persist,
			getRoot: corerels.getRoot,

			// containment
			getLevel: corerels.getLevel,
			getStringPath: corerels.getStringPath,
			parseStringPath: corerels.parseStringPath,
			getParent: corerels.getParent,
			getChildrenRelids: getChildrenRelids,
			loadChild: loadChild,
			loadByPath: loadByPath,
			loadChildren: loadChildren

		// createNode: createNode,
		// deleteNode: deleteNode,
		// copyNode: copyNode,
		// moveNode: moveNode,

		// getAttributeNames: getAttributeNames,
		// getAttribute: getAttribute,
		// setAttribute: setAttribute,
		// delAttribute: delAttribute,
		// getRegistry: getRegistry,
		// setRegistry: setRegistry,
		// delRegistry: delRegistry,

		// getPointerNames: getPointerNames,
		// getPointerPath: getPointerPath,
		// loadPointer: loadPointer,
		// deletePointer: deletePointer,
		// setPointer: setPointer,
		// loadCollection: loadCollection,
		// getCollectionNames: getCollectionNames,
		// getCollectionPaths: getCollectionPaths,
		// dumpTree: pertree.dumpTree
		};
	};

	return CoreType;
});
