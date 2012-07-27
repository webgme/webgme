/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/core2", "core/util" ], function (ASSERT, CoreRels, UTIL) {
	"use strict";

	var PROTOTYPE = "typ";

	var findAndRemove = function (nodes, relid) {
		for( var i = 0; i < nodes.length; ++i ) {
			if( nodes[i].relid === relid ) {
				var node = nodes[i];
				nodes.splice(i, 1);
				return node;
			}
		}
		return null;
	};

	var CoreType = function (storage) {

		var corerels = new CoreRels(storage);

		var EMPTYNODE = corerels.createNode();

		// TODO: we need this in memory only, not in the database 
		corerels.persist(EMPTYNODE, function (err) {
			if(err) {
				console.log(err);
			}
		});

		var isValidNode = function (node) {
			while( node ) {
				if( node.data !== EMPTYNODE.data && !corerels.isValidNode(node) ) {
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
			corerels.loadRoot(key, function (err, node) {
				if( node ) {
					node.type = null;
				}
				callback(err, node);
			});
		};

		var getChildrenRelids = function (node) {
			ASSERT(isValidNode(node));

			var relids = [];

			do {
				var ids = corerels.getChildrenRelids(node);
				for( var i = 0; i < ids.length; ++i ) {
					UTIL.binaryInsertUnique(relids, ids[i], UTIL.stringComparator);
				}

				node = node.type;
			} while( node );

			return relids;
		};

		var setupPrototype = function (node, callback) {
			ASSERT(corerels.isValidNode(node));

			if( node.type !== undefined ) {
				callback(null);
			}
			else {
				ASSERT(node.parent);

				var join = UTIL.AsyncObject(function (err, obj) {
					if( err ) {
						callback(err);
					}
					else if( obj.type ) {
						node.type = obj.type;
						setupPrototype(node.type, callback);
					}
					else if( node.parent.type ) {
						corerels.loadChild(node.parent.type, node.relid, function (err, type) {
							if( err ) {
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

		var setupPrototypeSingle = function (callback) {
			return function (err, node) {
				if( err || !node ) {
					callback(err, node);
				}
				else {
					setupPrototype(node, callback);
				}
			};
		};

		var setupPrototypeArray = function (callback) {
			return function (err, nodes) {
				if( err || !nodes.length ) {
					callback(err, nodes);
				}
				else {
					var join = new UTIL.AsyncArray(callback);

					for( var i = 0; i < nodes.length; ++i ) {
						setupPrototype(nodes[i], join.asyncPush());
					}

					join.wait();
				}
			};
		};

		var loadChild = function (node, relid, callback) {
			ASSERT(isValidNode(node) && typeof callback === "function");
			
			// TODO: we need to check EMPTYNODE data
			
			corerels.loadChild(node, relid, setupPrototypeSingle(callback));
		};

		var loadByPath = function (node, path, callback) {
			ASSERT(isValidNode(node) && typeof callback === "function");
			corerels.loadByPath(node, path, setupPrototypeSingle(callback));
		};

		var loadChildren = function (node, callback) {
			ASSERT(isValidNode(node) && typeof callback === "function");
			corerels.loadChildren(node, setupPrototypeArray(callback));
		};

		var getPrototype = function (node) {
			ASSERT(isValidNode(node));
			return node.type;
		};

		var getAttributeNames = function (node) {
			ASSERT(isValidNode(node));

			var names = [];

			do {
				var ns = corerels.getAttributeNames(node);
				for( var i = 0; i < ns.length; ++i ) {
					UTIL.binaryInsertUnique(names, ns[i], UTIL.stringComparator);
				}

				node = node.type;
			} while( node );

			return names;
		};

		var getAttribute = function (node, name) {
			ASSERT(isValidNode(node) && typeof name === "string");

			do {
				var value = corerels.getAttribute(node, name);
				if( value !== undefined ) {
					return value;
				}

				node = node.type;
			} while( node );

			return undefined;
		};

		var getRegistry = function (node, name) {
			ASSERT(isValidNode(node) && typeof name === "string");

			do {
				if( node.data ) {
					var value = corerels.getRegistry(node, name);
					if( value !== undefined ) {
						return value;
					}
				}

				node = node.type;
			} while( node );

			return undefined;
		};

		var getPointerNames = function (node) {
			ASSERT(isValidNode(node));

			var names = [];

			do {
				if( node.data ) {
					var ns = corerels.getPointerNames(node);
					for( var i = 0; i < ns.length; ++i ) {
						UTIL.binaryInsertUnique(names, ns[i], UTIL.stringComparator);
					}
				}

				node = node.type;
			} while( node );

			return names;
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
			loadChildren: loadChildren,

			// inheritance
			getPrototype: getPrototype,
			// loadSubtypes: loadSubtypes

			// createNode: createNode,
			// deleteNode: deleteNode,
			// copyNode: copyNode,
			// moveNode: moveNode,

			getAttributeNames: getAttributeNames,
			getAttribute: corerels.getAttribute,
			setAttribute: corerels.setAttribute,
			delAttribute: corerels.delAttribute,
			getRegistry: corerels.getRegistry,
			setRegistry: corerels.setRegistry,
			delRegistry: corerels.delRegistry,

			getPointerNames: getPointerNames
		// getPointerPath: getPointerPath,
		// loadPointer: loadPointer,
		// deletePointer: deletePointer,
		// setPointer: setPointer,
		// loadCollection: loadCollection,
		// getCollectionNames: getCollectionNames,
		// getCollectionPaths: getCollectionPaths,
		};
	};

	return CoreType;
});
