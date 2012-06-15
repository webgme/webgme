/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert", "pertree" ], function (ASSERT, PerTree, UTIL) {
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

		var removeNode = function (node, callback) {
			var parent = pertree.getParent();
			ASSERT(parent !== null);

			UTIL.depthFirstSearch(loadChildren, node, function (node2, callback2) {
				callback2(null);
			}, function (node2, callback2) {
				callback2(null);
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

		var attachNode = function (node, parent) {
			ASSERT(node && parent);
			ASSERT(pertree.getParent(node) === null);

			var relid = createRelid(parent.data);
			pertree.setParent(node, parent, relid);
		};

		var copyNode = function (node, parent) {
			ASSERT(node && parent);

			var relid = createRelid(parent.data);
			pertree.copy(node, parent, relid);
		};

		var persist = function (root, callback) {
			ASSERT(root && callback);
			ASSERT(pertree.getParent(root) === null);

			pertree.persist(root, callback);
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

		var getPointerNames = function (node) {
			ASSERT(node);

			return Object.keys(pertree.getProperty(node, POINTERS));
		};
		
		var setPointer = function (node, name, target, callback) {
			ASSERT(node && name && target && callback);

			var array, collections, targetpath;

			var root = pertree.getRoot(node);
			var pointers = pertree.getChild(node, POINTERS);
			var nodepath = pertree.getStringPath(node);

			var setter = function () {
				collections = pertree.getChild(target, COLLECTIONS);

				array = pertree.getProperty(collections, name);
				ASSERT(array === undefined || array.constructor === Array);

				if( array ) {
					array = array.slice(0);
					array.push(nodepath);
				}
				else {
					array = [ nodepath ];
				}

				pertree.setProperty(collections, name, array);

				targetpath = pertree.getStringPath(target);
				pertree.setProperty(pointers, name, targetpath);

				callback(null);
			};

			targetpath = pertree.getProperty(pointers, name);
			ASSERT(targetpath === undefined || typeof targetpath === "string");

			if( targetpath ) {
				pertree.loadByPath(root, targetpath, function (err, oldtarget) {
					if( err ) {
						callback(err);
					}
					else {
						collections = pertree.getChild(oldtarget, COLLECTIONS);

						array = pertree.getProperty(collections, name);
						ASSERT(array.constructor === Array);

						var index = array.indexOf(nodepath);
						ASSERT(index >= 0);

						array.slice(0);
						array.splice(index, 1);

						pertree.setProperty(collections, name, array);
						pertree.delProperty(pointers, name);

						setter();
					}
				});
			}
			else {
				setter();
			}
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
						ASSERT(array.constructor === Array);

						var nodepath = pertree.getStringPath(node);
						var index = array.indexOf(nodepath);
						ASSERT(index >= 0);

						array.slice(0);
						array.splice(index, 1);

						pertree.setProperty(collections, name, array);
						pertree.delProperty(pointers, name);

						callback(null);
					}
				});
			}
		};

		return {
			getKey: pertree.getKey,
			loadRoot: pertree.loadRoot,
			createNode: createNode,
			loadChildren: loadChildren,
			loadChild: pertree.loadChild,
			getParent: pertree.getParent,
			getRoot: pertree.getRoot,
			getLevel: pertree.getLevel,
			getStringPath: pertree.getStringPath,
			removeNode: removeNode,
			attachNode: attachNode,
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
			loadPointer: loadPointer,
			deletePointer: deletePointer,
			setPointer: setPointer,
			dumpTree: pertree.dumpTree
		};
	};

	return Core;
});
