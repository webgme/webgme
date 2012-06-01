/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert" ], function (ASSERT) {
	"use strict";

	// ----------------- RELID -----------------

	var RELID = {
//		maxRelid: Math.pow(2, 31),
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

	var Branch = function (tree) {

		var ATTRIBUTES = "attr";
		var POINTERS = "ptr";
		var COLLECTIONS = "coll";
		var REGISTRY = "reg";
		
		this.getKey = tree.getKey;

		this.loadRoot = tree.loadRoot;

		this.createNode = function () {
			var root = tree.createRoot();
			tree.createChild(root, ATTRIBUTES);
			tree.createChild(root, REGISTRY);
			tree.createChild(root, POINTERS);
			tree.createChild(root, COLLECTIONS);

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
					tree.loadChild(node, relid, loader.done);
				}
			}

			loader.done(null);
		};

		this.loadChild = tree.loadChild;

		this.getParent = tree.getParent;
		this.getRelid = tree.getRelid;
		this.getRoot = tree.getRoot;
		this.getPath = tree.getStringPath;

		this.detach = function (node) {
			ASSERT(tree.getParent(node) !== null);

			tree.delParent(node);
		};

		this.attach = function (node, parent) {
			ASSERT(node && parent);
			ASSERT(tree.getParent(node) === null);

			var relid = RELID.create(parent.data);
			tree.setParent(node, parent, relid);
		};

		this.copy = function (node, parent) {
			ASSERT(node && parent);

			var relid = RELID.create(parent.data);
			tree.copy(node, parent, relid);
		};

		this.getAttribute = function (node, name) {
			return tree.getProperty2(node, ATTRIBUTES, name);
		};

		this.delAttribute = function (node, name) {
			tree.delProperty2(node, ATTRIBUTES, name);
		};

		this.setAttribute = function (node, name, value) {
			tree.setProperty2(node, ATTRIBUTES, name, value);
		};

		this.getRegistry = function (node, name) {
			return tree.getProperty2(node, REGISTRY, name);
		};

		this.delRegistry = function (node, name) {
			tree.delProperty2(node, REGISTRY, name);
		};

		this.setRegistry = function (node, name, value) {
			tree.setProperty2(node, REGISTRY, name, value);
		};

		this.persist = function (root, callback) {
			ASSERT(root && callback);
			ASSERT(tree.getParent(root) === null);

			tree.persist(root, callback);
		};

		this.loadPointer = function (node, name, callback) {
			ASSERT(node && name && callback);

			var path = tree.getProperty2(node, POINTERS, name);
			if( path === undefined ) {
				callback(null, null);
			}
			else {
				ASSERT(typeof path === "string");

				var root = tree.getRoot(node);
				tree.loadByPath(root, path, callback);
			}
		};

		this.setPointer = function (node, name, target, callback) {
			ASSERT(node && name && target && callback);

			var array, collections, targetpath;

			var root = tree.getRoot(node);
			var pointers = tree.getChild(node, POINTERS);
			var nodepath = tree.getStringPath(node);

			var setter = function () {
				collections = tree.getChild(target, COLLECTIONS);

				array = tree.getProperty(collections, name);
				ASSERT(array === undefined || array.constructor === Array);

				if( array ) {
					array = array.slice(0);
					array.push(nodepath);
				}
				else {
					array = [ nodepath ];
				}

				tree.setProperty(collections, name, array);

				targetpath = tree.getStringPath(target);
				tree.setProperty(pointers, name, targetpath);

				callback(null);
			};

			targetpath = tree.getProperty(pointers, name);
			ASSERT(targetpath === undefined || typeof targetpath === "string");

			if( targetpath ) {
				tree.loadByPath(root, targetpath, function (err, oldtarget) {
					if( err ) {
						callback(err);
					}
					else {
						collections = tree.getChild(oldtarget, COLLECTIONS);

						array = tree.getProperty(collections, name);
						ASSERT(array.constructor === Array);

						var index = array.indexOf(nodepath);
						ASSERT(index >= 0);

						array.slice(0);
						array.splice(index, 1);

						tree.setProperty(collections, name, array);
						tree.delProperty(pointers, name);

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

			var pointers = tree.getChild(node, POINTERS);

			var targetpath = tree.getProperty(pointers, name);
			ASSERT(targetpath === undefined || typeof targetpath === "string");

			if( targetpath ) {
				var root = tree.getRoot(node);
				tree.loadByPath(root, targetpath, function (err, target) {
					if( err ) {
						callback(err);
					}
					else {
						var collections = tree.getChild(target, COLLECTIONS);

						var array = tree.getProperty(collections, name);
						ASSERT(array.constructor === Array);

						var nodepath = tree.getStringPath(node);
						var index = array.indexOf(nodepath);
						ASSERT(index >= 0);

						array.slice(0);
						array.splice(index, 1);

						tree.setProperty(collections, name, array);
						tree.delProperty(pointers, name);

						callback(null);
					}
				});
			}
		};
	};

	return Branch;
});
