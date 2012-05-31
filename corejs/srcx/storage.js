/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert", "mongodb", "sha1", "config" ], function (ASSERT, MONGODB, SHA1, CONFIG) {
	"use strict";

	// ----------------- Mongo -----------------

	var Mongo = function () {
		var database = null, collection = null;

		this.open = function (callback) {
			database = new MONGODB.Db(CONFIG.mongodb.database, new MONGODB.Server(
			CONFIG.mongodb.host, CONFIG.mongodb.port));

			var abort = function (err) {
				console.log("could not open mongodb: " + err);
				database.close();
				database = null;
				callback(err);
			};

			database.open(function (err) {
				if( err ) {
					abort(err);
				}
				else {
					database.collection(CONFIG.mongodb.collection, function (err, result) {
						if( err ) {
							abort(err);
						}
						else {
							collection = result;
							callback(null);
						}
					});
				}
			});
		};

		this.opened = function () {
			return collection !== null;
		};

		this.close = function (callback) {
			ASSERT(database && collection);

			database.close(function () {
				collection = null;
				database = null;
				if( callback ) {
					callback();
				}
			});
		};

		this.getKey = function (node) {
			ASSERT(node && typeof node === "object");

			return node._id;
		};

		this.setKey = function (node, key) {
			ASSERT(node && typeof node === "object");
			ASSERT(key === false || typeof key === "string");

			node._id = key;
		};

		this.delKey = function (node) {
			ASSERT(node && typeof node === "object");

			delete node._id;
		};

		this.load = function (key, callback) {
			ASSERT(typeof key === "string");
			ASSERT(collection && callback);

			collection.findOne({
				_id: key
			}, function (err, node) {
				if( node ) {
					Object.defineProperty(node, "_id", {
						writable: false,
						enumerable: false
					});
				}
				callback(err, node);
			});
		};

		this.save = function (node, callback) {
			ASSERT(node && typeof node === "object");
			ASSERT(typeof node._id === "string");
			ASSERT(collection && callback);

			collection.save(node, callback);
		};

		this.remove = function (key, callback) {
			ASSERT(typeof key === "string");
			ASSERT(collection && callback);

			collection.remove({
				_id: key
			}, callback);
		};

		this.dumpAll = function (callback) {
			ASSERT(collection && callback);

			collection.find().each(function (err, item) {
				if( err || item === null ) {
					callback(err);
				}
				else {
					console.log(item);
				}
			});
		};

		this.removeAll = function (callback) {
			ASSERT(collection && callback);

			collection.remove({}, callback);
		};
	};

	// ----------------- deepclone -----------------

	var deepclone = function (o) {
		var c, k;
		if( o && typeof o === "object" ) {
			if( o.constructor !== Array ) {
				c = {};
				for( k in o ) {
					c[k] = deepclone(o[k]);
				}
			}
			else {
				c = [];
				for( k = 0; k < o.length; ++k ) {
					c.push(deepclone(o[k]));
				}
			}
			return c;
		}
		return o;
	};

	// ----------------- PersistentTree -----------------

	var PersistentTree = function (storage) {
		ASSERT(storage);

		var ASSERT_NODE = function (node) {
			// console.log(node);

			ASSERT(node && node.data && typeof node.data === "object");
			ASSERT(node.parent === null
			|| (node.parent.data && typeof node.parent.data === "object"));

			ASSERT(node.data._mutable === undefined || node.data._mutable === true);
			ASSERT(node.parent === null || node.data._mutable === undefined
			|| node.parent.data._mutable === true);

			var key = storage.getKey(node.data);
			ASSERT(key === undefined || key === false
			|| (typeof key === "string" && key.length === 40));

			ASSERT(node.parent === null || !key || node.parent.data[node.relid] === key);
			ASSERT(node.parent === null || key || node.parent.data[node.relid] === node.data);
			ASSERT(!node.data._mutable || typeof key !== "string");
		};

		this.getKey = function (node) {
			ASSERT_NODE(node);
			return storage.getKey(node.data);
		};

		this.addKey = function (node) {
			ASSERT_NODE(node);
			ASSERT(this.isMutable(node));

			return storage.setKey(node.data, false);
		};

		this.delKey = function (node) {
			ASSERT_NODE(node);
			ASSERT(this.isMutable(node));

			return storage.delKey(node.data);
		};

		this.createRoot = function () {
			var data = {
				_mutable: true
			};
			storage.setKey(data, false);

			return {
				data: data,
				parent: null,
				relid: undefined
			};
		};

		this.createChild = function (node, relid) {
			ASSERT_NODE(node);
			ASSERT(typeof relid === "string");

			this.mutate(node);

			var data = {
				_mutable: true
			};
			node.data[relid] = data;

			return {
				data: data,
				parent: node,
				relid: relid
			};
		};

		this.getChild = function (node, relid) {
			ASSERT_NODE(node);
			ASSERT(typeof relid === "string");

			var child = node.data[relid];
			ASSERT(child && typeof child === "object");

			return {
				data: child,
				parent: node,
				relid: relid
			};
		};

		this.deleteChild = function (node, relid) {
			ASSERT_NODE(node);
			ASSERT(this.isMutable(node));
			ASSERT(typeof relid === "string");

			delete node.data[relid];
		};

		this.loadRoot = function (key, callback) {
			ASSERT(typeof key === "string");
			ASSERT(callback);

			storage.load(key, function (err, data) {
				ASSERT(err || storage.getKey(data) === key);
				callback(err, err ? undefined : {
					data: data,
					parent: null,
					relid: undefined
				});
			});
		};

		this.loadChild = function (node, relid, callback) {
			ASSERT_NODE(node);
			ASSERT(typeof relid === "string");

			var child = node.data[relid];
			ASSERT(child && typeof child === "obejct" || typeof child === "string");
			ASSERT(typeof child !== "string" || child.length === 40);

			if( typeof child === "string" ) {
				storage.load(child, function (err, data) {
					ASSERT(err || storage.getKey(data) === child);
					callback(err, err ? undefined : {
						data: data,
						parent: node,
						relid: relid
					});
				});
			}
			else {
				callback(null, {
					data: child,
					parent: node,
					relid: relid
				});
			}
		};

		this.loadByPath = function (node, path, callback) {
			ASSERT_NODE(node);
			ASSERT(typeof path === "string" || path.constructor === Array);
			ASSERT(callback);

			if( typeof path === "string" ) {
				path = this.parseStringPath(path);
			}

			var index = path.length;
			var relid;

			var done = function (err, data) {
				if( err ) {
					callback(err);
					return;
				}

				ASSERT(storage.getKey(data) === node.data[relid]);
				node = {
					data: data,
					parent: node,
					relid: relid
				};

				next();
			};

			var next = function () {
				while( index !== 0 ) {
					ASSERT_NODE(node);

					relid = path[--index];
					ASSERT(typeof relid === "string");

					var child = node.data[relid];
					ASSERT(child && (typeof child === "object" || typeof child === "string"));

					if( typeof child === "string" ) {
						storage.load(child, done);
						return;
					}

					node = {
						data: child,
						parent: node,
						relid: relid
					};
				}
				callback(null, node);
			};

			next();
		};

		this.getParent = function (node) {
			ASSERT_NODE(node);
			return node.parent;
		};

		this.delParent = function (node) {
			ASSERT_NODE(node);
			ASSERT_NODE(node.parent);

			this.mutate(node.parent);
			delete node.parent.data[node.relid];

			node.parent = null;
			node.relid = undefined;
		};

		this.setParent = function (node, parent, relid) {
			ASSERT_NODE(node);
			ASSERT(node.parent === null && !node.relid);
			ASSERT(relid && typeof relid === "string");

			this.mutate(parent);
			parent.data[relid] = node.data;

			node.parent = parent;
			node.relid = relid;
		};

		this.getPath = function (node) {
			ASSERT_NODE(node);

			var path = [];
			while( node.parent ) {
				path.push(node.relid);
				node = node.parent;
			}

			return path;
		};

		this.getStringPath = function (node) {
			ASSERT_NODE(node);

			var empty = "";
			var path = empty;
			while( node.parent ) {
				if( path === empty ) {
					path = node.relid;
				}
				else {
					path = path + "/" + node.relid;
				}
				node = node.parent;
			}

			return path;
		};

		this.parseStringPath = function (path) {
			ASSERT(path && typeof path === "string");

			return path.length === 0 ? [] : path.split("/");
		};

		this.getRelid = function (node) {
			ASSERT_NODE(node);
			return node.relid;
		};

		this.getRoot = function (node) {
			ASSERT_NODE(node);

			while( node.parent ) {
				node = node.parent;
			}

			return node;
		};

		this.isMutable = function (node) {
			ASSERT_NODE(node);
			return node.data._mutable;
		};

		this.mutate = function (node) {
			ASSERT_NODE(node);

			var data = node.data;
			if( !data._mutable ) {
				var copy = {
					_mutable: true
				};

				for( var key in data ) {
					copy[key] = data[key];
				}

				if( storage.getKey(data) !== undefined ) {
					storage.setKey(copy, false);
				}

				ASSERT(copy._mutable === true);

				node.data = copy;

				if( node.parent ) {
					this.mutate(node.parent);

					node.parent.data[node.relid] = copy;
				}
			}
		};

		var Saver = function (callback) {
			ASSERT(callback);

			var counter = 1;
			var error = null;

			this.start = function () {
				ASSERT(callback && counter >= 1);

				++counter;
			};

			this.done = function (err) {
				ASSERT(callback && counter >= 1);

				error = error || err;

				if( --counter === 0 ) {
					callback(error);
					callback = null;
				}
			};
		};

		Saver.prototype.save = function (data) {
			ASSERT(data && typeof data === "object" && data._mutable === true);

			var relid, key, child;

			delete data._mutable;

			for( relid in data ) {
				child = data[relid];
				if( child._mutable ) {
					key = this.save(child);
					ASSERT(key === undefined || typeof key === "string");

					if( key ) {
						data[relid] = key;
					}
				}
			}

			key = storage.getKey(data);
			ASSERT(key === false || key === undefined);

			if( key === false ) {
				key = SHA1(JSON.stringify(data));
				storage.setKey(data, key);

				this.start();
				storage.save(data, this.done);
			}

			return key;
		};

		this.persist = function (node, callback) {
			ASSERT_NODE(node);
			ASSERT(this.isMutable(node));

			var saver = new Saver(callback);
			var key = saver.save(node.data);
			saver.done(null);

			if( node.parent ) {
				node.parent.data[node.relid] = key;
			}

			return key;
		};

		this.getProperty = function (node, name) {
			ASSERT_NODE(node);
			ASSERT(typeof name === "string");

			return node.data[name];
		};

		this.setProperty = function (node, name, value) {
			ASSERT_NODE(node);
			ASSERT(typeof name === "string");

			this.mutate(node);
			node.data[name] = value;
		};

		this.delProperty = function (node, name) {
			ASSERT_NODE(node);
			ASSERT(typeof name === "string");

			this.mutate(node);
			delete node.data[name];
		};

		this.getProperty2 = function (node, name1, name2) {
			ASSERT_NODE(node);
			ASSERT(typeof name1 === "string");
			ASSERT(typeof name2 === "string");

			return node.data[name1][name2];
		};

		this.setProperty2 = function (node, name1, name2, value) {
			ASSERT_NODE(node);
			ASSERT(typeof name1 === "string");
			ASSERT(typeof name2 === "string");

			node = this.getChild(node, name1);
			this.mutate(node);
			node.data[name2] = value;
		};

		this.delProperty2 = function (node, name1, name2) {
			ASSERT_NODE(node);
			ASSERT(typeof name1 === "string");
			ASSERT(typeof name2 === "string");

			node = this.getChild(node, name1);
			this.mutate(node);
			delete node.data[name2];
		};

		this.dumpTree = function (key, callback) {
			ASSERT(key && typeof key === "string");
			ASSERT(callback);

			var root = null;
			var error = null;
			var counter = 1;

			var decrease = function () {
				if( --counter === 0 ) {
					console.log(JSON.stringify(root, null, '\t'));

					callback(error, root);
					callback = null;
				}
			};

			var load = function (data, relid) {
				ASSERT(data && typeof data === "object");
				ASSERT(typeof relid === "string");

				var key = data[relid];
				ASSERT(typeof key === "string" && key.length === 40);

				++counter;
				storage.load(key, function (err, child) {
					error = error || err;

					var copy = deepclone(child);

					data[relid] = copy;
					scan(copy);

					// copy.id = storage.getKey(child);
					decrease();
				});
			};

			var scan = function (data) {
				ASSERT(data && typeof data === "object");

				for( var relid in data ) {
					var child = data[relid];

					if( typeof child === "string" && child.length === 40 ) {
						load(data, relid);
					}
					else if( child && typeof child === "object" ) {
						scan(child);
					}
				}
			};

			storage.load(key, function (err, data) {
				ASSERT(err || storage.getKey(data) === key);

				root = deepclone(data);
				scan(root);

				decrease();
			});
		};
	};

	// ----------------- RELID -----------------

	var RELID = (function () {
		// var maxRelid = Math.pow(2, 31);
		var maxRelid = 1000;

		return {
			create: function (data, relid) {
				ASSERT(data && typeof data === "object");
				ASSERT(relid === undefined || typeof relid === "string");

				if( !relid || data[relid] !== undefined ) {
					// TODO: detect infinite cycle?
					do {
						relid = (Math.floor(Math.random() * maxRelid)).toString();
					} while( data[relid] !== undefined );
				}

				return relid;
			},

			isValid: function (relid) {
				return parseInt(relid, 10).toString() === relid;
			}
		};
	})();

	// ----------------- Branch -----------------

	var Branch = function (tree) {

		this.getKey = tree.getKey;

		this.loadRoot = tree.loadRoot;

		this.createNode = function () {
			var root = tree.createRoot();
			tree.createChild(root, "attributes");
			tree.createChild(root, "pointers");
			tree.createChild(root, "collections");

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
			return tree.getProperty2(node, "attributes", name);
		};

		this.delAttribute = function (node, name) {
			tree.delProperty2(node, "attributes", name);
		};

		this.setAttribute = function (node, name, value) {
			tree.setProperty2(node, "attributes", name, value);
		};

		this.persist = function (root, callback) {
			ASSERT(root && callback);
			ASSERT(tree.getParent(root) === null);

			tree.persist(root, callback);
		};

		this.loadPointer = function (node, name, callback) {
			ASSERT(node && name && callback);

			var path = tree.getProperty2(node, "pointers", name);
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
			var pointers = tree.getChild(node, "pointers");
			var nodepath = tree.getStringPath(node);

			var setter = function() {
				collections = tree.getChild(target, "collections");

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
				tree.loadByPath(root, targetpath, function (err, target) {
					if( err ) {
						callback(err);
					}
					else {
						collections = tree.getChild(target, "collections");

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

			var pointers = tree.getChild(node, "pointers");

			var targetpath = tree.getProperty(pointers, name);
			ASSERT(targetpath === undefined || typeof targetpath === "string");

			if( targetpath ) {
				var root = tree.getRoot(node);
				tree.loadByPath(root, targetpath, function (err, target) {
					if( err ) {
						callback(err);
					}
					else {
						var collections = tree.getChild(target, "collections");

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

	// ----------------- Interface -----------------

	return {
		Mongo: Mongo,
		PersistentTree: PersistentTree,
		Branch: Branch
	};
});
