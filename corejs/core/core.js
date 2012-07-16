/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/pertree", "core/util" ], function (ASSERT, PerTree, UTIL) {
	"use strict";

	// ----------------- RELID -----------------

	var maxRelid = Math.pow(2, 31);

	var createRelid = function (data, relid) {
		ASSERT(data && typeof data === "object");
		ASSERT(relid === undefined || isValidRelid(relid));

		if( !relid || data[relid] !== undefined ) {
			// TODO: detect infinite cycle?
			do {
				relid = Math.floor(Math.random() * maxRelid);
				// relid = relid.toString();
			} while( data[relid] !== undefined );
		}

		return relid;
	};

	var isValidRelid = function (relid) {
		return typeof relid === "number" || parseInt(relid, 10).toString() === relid;
	};

	var ATTRIBUTES = "attr";
	var POINTERS = "ptr";
	var COLLECTIONS = "coll";
	var REGISTRY = "reg";

	// ----------------- Core -----------------

	var Core = function (storage) {

		var pertree = new PerTree(storage);

		var getAttributeNames = function (node) {
			return Object.keys(pertree.getProperty(node, ATTRIBUTES));
		};

		var getAttribute = function (node, name) {
			return pertree.getProperty2(node, ATTRIBUTES, name);
		};

		var delAttribute = function (node, name) {
			pertree.delProperty2(node, ATTRIBUTES, name);
		};

		var setAttribute = function (node, name, value) {
			pertree.setProperty2(node, ATTRIBUTES, name, value);
		};

		var getRegistry = function (node, name) {
			return pertree.getProperty2(node, REGISTRY, name);
		};

		var delRegistry = function (node, name) {
			pertree.delProperty2(node, REGISTRY, name);
		};

		var setRegistry = function (node, name, value) {
			pertree.setProperty2(node, REGISTRY, name, value);
		};

		var loadChildren = function (node, callback) {
			ASSERT(node && callback);

			var counter = 1;
			var children = [];

			var done = function (err, child) {
				ASSERT(counter >= 1);

				if( child ) {
					children.push(child);
				}

				if( callback && (err || --counter === 0) ) {
					callback(err, children);
					callback = null;
				}
			};

			for( var relid in node.data ) {
				if( isValidRelid(relid) ) {
					++counter;
					pertree.loadChild(node, relid, done);
				}
			}

			done(null);
		};

		var createNode = function (parent) {
			var node = pertree.createRoot();
			pertree.createChild(node, ATTRIBUTES);
			pertree.createChild(node, REGISTRY);
			pertree.createChild(node, POINTERS);
			pertree.createChild(node, COLLECTIONS);

			if( parent ) {
				var relid = createRelid(parent.data);
				pertree.setParent(node, parent, relid);
			}

			return node;
		};

		var copyNode = function (node, parent) {
			ASSERT(node && parent);

			var relid = createRelid(parent.data);
			pertree.copy(node, parent, relid);
		};

		var removeNode = function (node, callback) {
			var parent = pertree.getParent();
			ASSERT(parent !== null);

			// TODO: there is a race between deleting collections and pointers 
			UTIL.depthFirstSearch(loadChildren, node, function (node2, callback2) {
				callback2(null);
			}, function (node2, callback2) {
				deleteAllReferences(node2, callback2);
			}, function (err) {
				if( err ) {
					callback(err);
				}
				else {
					pertree.delParent(node);
					callback(null);
				}
			});
		};

		var persist = function (root, callback) {
			ASSERT(root && callback);
			ASSERT(pertree.getParent(root) === null);

			pertree.persist(root, callback);
		};

		var getPointerNames = function (node) {
			ASSERT(node);

			return Object.keys(pertree.getProperty(node, POINTERS));
		};

		var getCollectionNames = function (node) {
			ASSERT(node);

			return Object.keys(pertree.getProperty(node, COLLECTIONS));
		};

		var loadPointer = function (node, name, callback) {
			ASSERT(node && name && callback);

			var path = pertree.getProperty2(node, POINTERS, name);
			if( path === undefined ) {
				callback(null, null);
			}
			else {
				ASSERT(typeof path === "string");

				var root = pertree.getRoot(node);
				pertree.loadByPath(root, path, callback);
			}
		};

		var loadCollection = function (node, name, callback) {
			ASSERT(node && name && callback);

			var root = pertree.getRoot(node);
			var paths = pertree.getProperty2(node, COLLECTIONS, name);

			var array = new UTIL.AsyncArray(callback);

			for( var i = 0; i < paths.length; ++i ) {
				pertree.loadByPath(root, paths[i], array.add());
			}

			array.start();
		};

		var deletePointer = function (node, name, callback) {
			ASSERT(node && name && callback);

			var pointers = pertree.getChild(node, POINTERS);

			var targetpath = pertree.getProperty(pointers, name);
			ASSERT(targetpath === undefined || typeof targetpath === "string");

			if( targetpath ) {
				var root = pertree.getRoot(node);
				pertree.loadByPath(root, targetpath, function (err, target) {
					if( err ) {
						callback(err);
					}
					else {
						var collections = pertree.getChild(target, COLLECTIONS);

						var array = pertree.getProperty(collections, name);
						ASSERT(array.constructor === Array && array.length >= 1);

						var nodepath = pertree.getStringPath(node);
						var index = array.indexOf(nodepath);
						if( index < 0 ) {
							callback("core data corruption: pointer not found in collection");
						}
						else {
							if( array.length === 1 ) {
								ASSERT(index === 0);
								pertree.delProperty(collections, name);
							}
							else {
								array.slice(0);
								array.splice(index, 1);

								pertree.setProperty(collections, name, array);
							}

							pertree.delProperty(pointers, name);
							callback(null);
						}
					}
				});
			}
			else {
				callback(null);
			}
		};

		var deleteCollection = function (node, name, callback) {
			ASSERT(node && name && callback);

			var nodepath = pertree.getStringPath(node);
			var collections = pertree.getChild(node, COLLECTIONS);

			var paths = pertree.getProperty(collections, name);
			ASSERT(paths === undefined || paths.constructor === Array);

			var missing = paths.length;
			var handle = function (err, source) {
				if( missing > 0 ) {
					if( err ) {
						missing = 0;
						callback(err);
					}
					else {
						var path = pertree.getProperty2(source, POINTERS, name);
						if( path === nodepath ) {
							pertree.delProperty2(source, POINTERS, name);
							if( --missing === 0 ) {
								callback(null);
							}
						}
						else {
							missing = 0;
							callback("core data corruption: incorrect pointer value");
						}
					}
				}
			};

			if( paths ) {
				var root = pertree.getRoot(node);
				for( var i = 0; i < paths.length; ++i ) {
					pertree.loadByPath(root, paths[i], handle);
				}
				pertree.delProperty(collections, name);
			}

			if( missing === 0 ) {
				callback(null);
			}
		};

		var setPointer = function (node, name, target, callback) {
			ASSERT(node && name && target && callback);

			deletePointer(node, name, function (err) {
				if( err ) {
					callback(err);
				}
				else {
					var pointers = pertree.getChild(node, POINTERS);
					var nodepath = pertree.getStringPath(node);

					var collections = pertree.getChild(target, COLLECTIONS);

					var array = pertree.getProperty(collections, name);
					ASSERT(array === undefined || array.constructor === Array);

					if( array ) {
						array = array.slice(0);
						array.push(nodepath);
					}
					else {
						array = [ nodepath ];
					}

					pertree.setProperty(collections, name, array);

					var targetpath = pertree.getStringPath(target);
					pertree.setProperty(pointers, name, targetpath);

					callback(null);
				}
			});
		};

		var deleteAllReferences = function (node, callback) {
			ASSERT(node && callback);

			var join = new UTIL.AsyncJoin(callback);

			var names = getPointerNames(node);
			for( var i = 0; i < names.length; ++i ) {
				deletePointer(node, names[i], join.add());
			}

			names = getCollectionNames(node);
			for( i = 0; i < names.length; ++i ) {
				deleteCollection(node, names[i], join.add());
			}

			join.start();
		};

		return {
			getKey: pertree.getKey,
			loadRoot: pertree.loadRoot,
			loadChildren: loadChildren,
			loadChild: pertree.loadChild,
			getParent: pertree.getParent,
			getRoot: pertree.getRoot,
			getLevel: pertree.getLevel,
			getStringPath: pertree.getStringPath,
			createNode: createNode,
			removeNode: removeNode,
			copyNode: copyNode,
			getAttributeNames: getAttributeNames,
			getAttribute: getAttribute,
			setAttribute: setAttribute,
			delAttribute: delAttribute,
			getRegistry: getRegistry,
			setRegistry: setRegistry,
			delRegistry: delRegistry,
			persist: persist,
			getPointerNames: getPointerNames,
			getCollectionNames: getCollectionNames,
			loadPointer: loadPointer,
			deletePointer: deletePointer,
			setPointer: setPointer,
			loadCollection: loadCollection,
			deleteCollection: deleteCollection,
			dumpTree: pertree.dumpTree
		};
	};

	return Core;
});
