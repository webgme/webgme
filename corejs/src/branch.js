/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert", "pertree" ], function (ASSERT, PerTree) {
	"use strict";

	// ----------------- RELID -----------------

	var RELID = {
		// maxRelid: Math.pow(2, 31),
		maxRelid: 1000,

		create: function (data, relid) {
			ASSERT(data && typeof data === "object");
			ASSERT(relid === undefined || typeof relid === "string");

			if( !relid || data[relid] !== undefined ) {
				// TODO: detect infinite cycle?
				do {
					relid = (Math.floor(Math.random() * RELID.maxRelid)).toString();
				} while( data[relid] !== undefined );
			}

			return relid;
		},

		isValid: function (relid) {
			return parseInt(relid, 10).toString() === relid;
		}
	};

	// ----------------- Branch -----------------

	var Branch = function (storage) {

		var pertree = new PerTree(storage);

		var ATTRIBUTES = "attr";
		var POINTERS = "ptr";
		var COLLECTIONS = "coll";
		var REGISTRY = "reg";

		this.getKey = pertree.getKey;

		this.loadRoot = pertree.loadRoot;

		this.createNode = function () {
			var root = pertree.createRoot();
			pertree.createChild(root, ATTRIBUTES);
			pertree.createChild(root, REGISTRY);
			pertree.createChild(root, POINTERS);
			pertree.createChild(root, COLLECTIONS);

			return root;
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

		this.loadChildren = function (node, callback) {
			ASSERT(node && callback);

			var loader = new ChildrenLoader(callback);

			for( var relid in node.data ) {
				if( RELID.isValid(relid) ) {
					loader.start();
					pertree.loadChild(node, relid, loader.done);
				}
			}

			loader.done(null);
		};

		this.loadChild = pertree.loadChild;

		this.getParent = pertree.getParent;
		this.getRelid = pertree.getRelid;
		this.getRoot = pertree.getRoot;
		this.getPath = pertree.getStringPath;

		this.detach = function (node) {
			ASSERT(pertree.getParent(node) !== null);

			pertree.delParent(node);
		};

		this.attach = function (node, parent) {
			ASSERT(node && parent);
			ASSERT(pertree.getParent(node) === null);

			var relid = RELID.create(parent.data);
			pertree.setParent(node, parent, relid);
		};

		this.copy = function (node, parent) {
			ASSERT(node && parent);

			var relid = RELID.create(parent.data);
			pertree.copy(node, parent, relid);
		};

		this.getAttribute = function (node, name) {
			return pertree.getProperty2(node, ATTRIBUTES, name);
		};

		this.delAttribute = function (node, name) {
			pertree.delProperty2(node, ATTRIBUTES, name);
		};

		this.setAttribute = function (node, name, value) {
			pertree.setProperty2(node, ATTRIBUTES, name, value);
		};

		this.getRegistry = function (node, name) {
			return pertree.getProperty2(node, REGISTRY, name);
		};

		this.delRegistry = function (node, name) {
			pertree.delProperty2(node, REGISTRY, name);
		};

		this.setRegistry = function (node, name, value) {
			pertree.setProperty2(node, REGISTRY, name, value);
		};

		this.persist = function (root, callback) {
			ASSERT(root && callback);
			ASSERT(pertree.getParent(root) === null);

			pertree.persist(root, callback);
		};

		this.loadPointer = function (node, name, callback) {
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

		this.setPointer = function (node, name, target, callback) {
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

		this.delPointer = function (node, name, callback) {
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

		this.dumpTree = pertree.dumpTree;
	};

	return Branch;
});
