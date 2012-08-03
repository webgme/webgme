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
			if( err ) {
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
					node.depth = 0;
				}
				callback(err, node);
			});
		};

		var createNode = function (parent, type) {
			ASSERT(!parent || isValidNode(parent));
			ASSERT(!type || isValidNode(type));
			ASSERT(!type || parent);

			var node = corerels.createNode(parent);

			if( type ) {
				corerels.setPointer(node, PROTOTYPE, type);
			}

			node.type = type || null;
			node.depth = 0;

			return node;
		};

		var getChildrenRelids = function (node) {
			ASSERT(isValidNode(node));

			var relids = [];

			do {
				if( node.data !== EMPTYNODE.data ) {
					var ids = corerels.getChildrenRelids(node);
					for( var i = 0; i < ids.length; ++i ) {
						UTIL.binaryInsertUnique(relids, ids[i], UTIL.stringComparator);
					}
				}
				node = node.type;
			} while( node );

			return relids;
		};

		var loadChild = function (node, relid, callback) {
			ASSERT(isValidNode(node) && corerels.isValidRelid(relid)
			&& typeof callback === "function");

			var join = new UTIL.AsyncObject(function (err, obj) {

				if( err ) {
					callback(err);
					return;
				}

				if( obj.ptr ) {
					if( obj.type ) {
						callback(new Error("core relid conflict for derived object"));
						return;
					}
					else if( !obj.child ) {
						callback(new Error("core pointer for nonexistent object"));
						return;
					}

					obj.type = obj.ptr;
				}

				if( obj.type || obj.child ) {
					if( !obj.child ) {
						obj.child = {
							parent: node,
							relid: relid,
							data: EMPTYNODE.data
						};
					}

					if( obj.type ) {
						obj.child.type = obj.type;
						obj.child.depth = obj.type.depth;
					}
					else {
						obj.child.type = null;
						obj.child.depth = 0;
					}

				}

				callback(null, obj.child);
			});

			corerels.loadChild(node, relid, join.asyncSet("child"));

			if( node.type ) {
				loadChild(node.type, relid, join.asyncSet("type"));
			}

			var path = corerels.getOutsidePointerPath(node, PROTOTYPE, relid);

			if( typeof path === "string" ) {
				// TODO, we should share as much of the lower part as possible
				loadByPath(corerels.getRoot(node), path, join.asyncSet("ptr"));
			}

			join.wait();
		};

		var loadByPath = function (node, path, callback) {
			ASSERT(isValidNode(node) && typeof callback === "function");
			ASSERT(corerels.isValidPath(path));

			path = corerels.parseStringPath(path);

			var loadNext = function (err, node) {
				if( err ) {
					callback(err);
				}
				else if( !node || path.length === 0 ) {
					callback(null, node);
				}
				else {
					var relid = path.pop();
					loadChild(node, relid, loadNext);
				}
			};

			loadNext(null, node);
		};

		var loadChildren = function (node, callback) {
			ASSERT(isValidNode(node) && typeof callback === "function");

			var relids = getChildrenRelids(node);
			var join = new UTIL.AsyncArray(callback);

			for( var i = 0; i < relids.length; ++i ) {
				loadChild(node, relids[i], join.asyncPush());
			}

			join.wait();
		};

		var getPrototype = function (node) {
			ASSERT(isValidNode(node));

			return node.type;
		};

		var getAttributeNames = function (node) {
			ASSERT(isValidNode(node));

			var names = [];

			do {
				if( node.data !== EMPTYNODE.data ) {
					var ns = corerels.getAttributeNames(node);
					for( var i = 0; i < ns.length; ++i ) {
						UTIL.binaryInsertUnique(names, ns[i], UTIL.stringComparator);
					}
				}
				node = node.type;
			} while( node );

			return names;
		};

		var getAttribute = function (node, name) {
			ASSERT(isValidNode(node) && typeof name === "string");

			do {
				if( node.data !== EMPTYNODE.data ) {
					var value = corerels.getAttribute(node, name);
					if( value !== undefined ) {
						return value;
					}
				}
				node = node.type;
			} while( node );

			return undefined;
		};

		var getRegistry = function (node, name) {
			ASSERT(isValidNode(node) && typeof name === "string");

			do {
				if( node.data !== EMPTYNODE.data ) {
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

			var names = [ PROTOTYPE ];

			do {
				if( node.data !== EMPTYNODE.data ) {
					var ns = corerels.getPointerNames(node);
					for( var i = 0; i < ns.length; ++i ) {
						UTIL.binaryInsertUnique(names, ns[i], UTIL.stringComparator);
					}
				}

				node = node.type;
			} while( node );

			names.splice(UTIL.binarySearch(names, PROTOTYPE, UTIL.stringComparator), 1);

			return names;
		};

		var getParent = function (node) {
			ASSERT(isValidNode(node));
			return node.parent;
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
			getParent: getParent,
			getChildrenRelids: getChildrenRelids,
			loadChild: loadChild,
			loadByPath: loadByPath,
			loadChildren: loadChildren,

			// inheritance
			getPrototype: getPrototype,
			// loadSubtypes: loadSubtypes

			createNode: createNode,
			// deleteNode: deleteNode,
			// copyNode: copyNode,
			// moveNode: moveNode,

			getAttributeNames: getAttributeNames,
			getAttribute: getAttribute,
			setAttribute: corerels.setAttribute,
			delAttribute: corerels.delAttribute,
			getRegistry: getRegistry,
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
