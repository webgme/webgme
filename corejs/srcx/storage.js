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
		var c = {};
		for( var k in o ) {
			var v = o[k];
			c[k] = (v && typeof v === "object") ? deepclone(v) : v;
		}
		return c;
	};

	// ----------------- Graph -----------------

	var Graph = function (storage) {
		ASSERT(storage);

		this.getKey = storage.getKey;

		this.isMutable = function (node) {
			return !storage.getKey(node);
		};

		this.create = function () {
			return {
				children: {}
			};
		};

		this.getNode = storage.load;

		this.mutate = deepclone;

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

		Saver.prototype.save = function (node) {
			ASSERT(node && node.children);

			var key = storage.getKey(node);
			if( !key ) {
				var children = node.children;
				for( var relid in children ) {
					var child = children[relid];
					if( typeof child !== "string" ) {
						child = this.save(child);
						ASSERT(typeof child === "string");
						children[relid] = child;
					}
				}

				key = SHA1(JSON.stringify(node));

				ASSERT(!storage.getKey(node));
				storage.setKey(node, key);

				this.start();
				storage.save(node, this.done);
			}
			return key;
		};

		this.persist = function (node, callback) {
			ASSERT(node && callback);

			var saver = new Saver(callback);
			saver.save(node);
			saver.done(null);
		};

		this.getData = function (node, name) {
			ASSERT(typeof name === "string");
			ASSERT(name !== "children");

			return node[name];
		};

		this.setData = function (node, name, data) {
			ASSERT(this.isMutable(node));
			ASSERT(typeof name === "string");
			ASSERT(name !== "children");

			node[name] = data;
		};

		this.delData = function (node, name) {
			ASSERT(this.isMutable(node));
			ASSERT(typeof name === "string");
			ASSERT(name !== "children");

			delete node[name];
		};

		this.getChildren = function (node) {
			ASSERT(node && node.children);

			return node.children;
		};

		this.getChild = function (node, relid, callback) {
			ASSERT(node && node.children);

			var child = node.children[relid];
			if( typeof child === "string" ) {
				storage.load(child, callback);
			}
			else {
				ASSERT(child && child.children);
				ASSERT(this.isMutable(node));

				callback(null, child);
			}
		};

		this.setChild = function (node, relid, child) {
			ASSERT(node && node.children);
			ASSERT(child && child.children);
			ASSERT(this.isMutable(node));

			node.children[relid] = child;
		};

		this.delChild = function (node, relid) {
			ASSERT(node && node.children);
			ASSERT(this.isMutable(node));

			delete node.children[relid];
		};
	};

	// ----------------- Tree -----------------

	var Tree = function (graph) {
		ASSERT(graph);

		this.isMutable = function (node) {
			ASSERT(node && node.data);
			return graph.isMutable(node.data);
		};

		this.getRoot = function (key, callback) {
			ASSERT(callback);

			graph.getNode(key, function (err, data) {
				callback(err, err ? undefined : {
					data: data,
					parent: null
				});
			});
		};

		/**
		 * Nodes can become invalid in two ways. 1) We request the same child of
		 * a parent twice and modify one of them, then the other will not
		 * reflect the same modified data but the stale old data. 2) We could
		 * remove nodes or change branches completely which creates dangling
		 * nodes.
		 */
		this.isValid = function (node) {
			ASSERT(node && node.data);

			while( node.parent ) {
				ASSERT(typeof node.relid === "string" && node.parent.data);
				var child = graph.getChildren(node.parent.data)[node.relid];

				if( typeof child === "string" ) {
					ASSERT(child === graph.getKey(node.data));
				}
				else if( child !== node.data ) {
					return false;
				}

				node = node.parent;
			}

			return true;
		};

		this.mutate = function (node) {
			ASSERT(this.isValid(node));

			if( !graph.isMutable(node.data) ) {
				node.data = graph.mutate(node.data);

				while( node.parent && !graph.isMutable(node.parent.data) ) {
					node.parent.data = graph.mutate(node.parent.data);
					graph.setChild(node.parent.data, node.relid, node.data);

					node = node.parent;
				}
			}
		};

		this.persist = function (node, callback) {
			ASSERT(this.isValid(node));
			ASSERT(this.isMutable(node));

			graph.persist(node.data, callback);
		};

		this.getChildren = function (node) {
			ASSERT(this.isValid(node));

			return graph.getChildren(node.data);
		};

		this.getChild = function (node, relid, callback) {
			ASSERT(this.isValid(node));
			ASSERT(callback);

			graph.getChild(node.data, relid, function (err, data) {
				callback(err, err ? undefined : {
					data: data,
					parent: node,
					relid: relid
				});
			});
		};

		this.setChild = function (node, relid, child) {
			ASSERT(this.isValid(node));
			ASSERT(this.isValid(child));
			ASSERT(this.isMutable(node));

			graph.setChild(node.data, relid, child.data);
		};

		this.delChild = function (node, relid) {
			ASSERT(this.isValid(node));
			ASSERT(this.isMutable(node));

			graph.delChild(node.data, relid);
		};

		this.getData = function (node, name) {
			ASSERT(this.isValid(node));

			graph.getData(node.data, name);
		};

		this.setData = function (node, name, data) {
			ASSERT(this.isValid(node));
			ASSERT(this.isMutable(node));

			graph.setData(node.data, name, data);
		};

		this.delData = function (node, name) {
			ASSERT(this.isValid(node));
			ASSERT(this.isMutable(node));

			graph.delData(node.data, name);
		};
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
				parent: null
			};
		};

		this.createChild = function (node, relid, data) {
			ASSERT_NODE(node);
			ASSERT(this.isMutable(node));
			ASSERT(typeof relid === "string");
			ASSERT(!data || typeof data === "object");

			if( data ) {
				data._mutable = true;
			}
			else {
				data = {
					_mutable: true
				};
			}

			node.data[relid] = data;

			return {
				data: data,
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
					parent: null
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

		this.getParent = function (node) {
			ASSERT_NODE(node);
			return node.parent;
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

			return key;
		};

		this.getProperty = function (node, name) {
			ASSERT_NODE(node);
			ASSERT(typeof name === "string");

			return node.data[name];
		};

		this.setProperty = function (node, name, value) {
			ASSERT_NODE(node);
			ASSERT(this.isMutable(node));
			ASSERT(typeof name === "string");

			node.data[name] = value;
		};

		this.delProperty = function (node, name) {
			ASSERT_NODE(node);
			ASSERT(this.isMutable(node));
			ASSERT(typeof name === "string");

			delete node.data[name];
		};
	};

	// ----------------- RELID -----------------

	var RELID = (function () {
		var maxRelid = Math.pow(2, 31);

		return {
			create: function (data, relid) {
				ASSERT(data && typeof data === "object");
				ASSERT(relid === undefined || typeof relid === "string");

				if( !relid || data[relid] !== undefined ) {
					// TODO: infinite cycle?
					do {
						relid = Math.floor(Math.random() * RELID.maxRelid);
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

		this.create = function () {
			return {
				parent: null,
				data: {
					_mutable: true,
					children: {},
					attributes: {
						_mutable: true
					}
				}
			};
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
				if( !err ) {
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

		// --- containment

		this.getPath = function (node) {
			ASSERT(node);

			var path = [];
			while( node.parent ) {
				path.push(node.relid);
				node = node.parent;
			}
			return path;
		};

		this.getParent = function (node) {
			ASSERT(node);

			return node.parent;
		};

		this.getRelid = function (node) {
			ASSERT(node);

			return node.relid;
		};

		this.detach = function (node) {
			ASSERT(node && node.parent && node.relid);

			tree.mutate(node.parent);
			tree.deleteChild(node.parent, node.relid);

			node.parent = null;
			delete node.relid;
		};

		this.attach = function (parent, node) {
			ASSERT(parent && node);
			ASSERT(node.parent === null && !node.relid);

			node.relid = RELID.create(parent.data);

			tree.mutate(parent);
			tree.addChild(parent, node.relid, node.data);

			node.parent = parent;
		};

		this.move = function (parent, node) {
		};

		this.copy = function (parent, node) {
		};
	};

	// ----------------- Interface -----------------

	return {
		Mongo: Mongo,
		Graph: Graph,
		Tree: Tree,
		PersistentTree: PersistentTree
	};
});
