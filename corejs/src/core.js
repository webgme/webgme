/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert", "pertree" ], function (ASSERT, PerTree) {
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
//				relid = relid.toString();
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
		//var pertree = new PerTree(storage);

		var getAttributes = function (node) {
			return pertree.getProperty(node, ATTRIBUTES);
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

		var createNode = function (parent, basetype) {
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

		var ChildrenLoader = function (callback) {
			ASSERT(callback);

			var counter = 1;
			var error = null;
			var children = [];

			this.start = function () {
				ASSERT(callback && counter >= 1);

				++counter;
			};

			this.done = function (err, child) {
				ASSERT(callback && counter >= 1);

				error = error || err;
				if( child ) {
					children.push(child);
				}

				if( --counter === 0 ) {
					callback(error, children);
					callback = null;
				}
			};
		};

		var loadChildren = function (node, callback) {
			ASSERT(node && callback);

			var loader = new ChildrenLoader(callback);

			for( var relid in node.data ) {
				if( isValidRelid(relid) ) {
					loader.start();
					pertree.loadChild(node, relid, loader.done);
				}
			}

			loader.done(null);
		};

		var detach = function (node) {
			ASSERT(pertree.getParent(node) !== null);

			pertree.delParent(node);
		};

		var attach = function (node, parent) {
			ASSERT(node && parent);
			ASSERT(pertree.getParent(node) === null);

			var relid = createRelid(parent.data);
			pertree.setParent(node, parent, relid);
		};

		var copy = function (node, parent) {
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

		var delPointer = function (node, name, callback) {
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
			getRelid: pertree.getRelid,
			getRoot: pertree.getRoot,
			getPath: pertree.getPath,
			getStringPath: pertree.getStringPath,
			getLevel: pertree.getLevel,
			detach: detach,
			attach: attach,
			copy: copy,
			getAttributes: getAttributes,
			getAttribute: getAttribute,
			setAttribute: setAttribute,
			delAttribute: delAttribute,
			getRegistry: getRegistry,
			setRegistry: setRegistry,
			delRegistry: delRegistry,
			persist: persist,
			loadPointer: loadPointer,
			setPointer: setPointer,
			delPointer: delPointer,
			dumpTree: pertree.dumpTree
		};
	};

	return Core;
});
