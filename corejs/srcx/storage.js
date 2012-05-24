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

	// ----------------- Graph2 -----------------

	var Graph2 = function (storage) {
		ASSERT(storage);

		this.getKey = storage.getKey;

		this.isMutable = function (node) {
			return !storage.getKey(node);
		};

		this.isLeaf = function (node) {
			return node._leaf;
		};

		this.createNode = function () {
			return {};
		};

		this.createLeaf = function () {
			return {
				_leaf: true
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
			var key = storage.getKey(node);
			if( !key ) {
				if( !node._leaf ) {
					for( var relid in node ) {
						var child = node[relid];
						if( typeof child !== "string" ) {
							child = this.save(child);
							ASSERT(typeof child === "string");
							node[relid] = child;
						}
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

		this.getChildren = function (node) {
			ASSERT(node && !node._leaf);

			return node;
		};

		this.getChild = function (node, relid, callback) {
			ASSERT(node && !node._leaf);

			var child = node[relid];
			if( typeof child === "string" ) {
				storage.load(child, callback);
			}
			else {
				ASSERT(child);
				ASSERT(this.isMutable(node));

				callback(null, child);
			}
		};

		this.setChild = function (node, relid, child) {
			ASSERT(node && !node._leaf && child);
			ASSERT(this.isMutable(node));

			node[relid] = child;
		};

		this.delChild = function (node, relid) {
			ASSERT(node && !node._leaf);
			ASSERT(this.isMutable(node));

			delete node[relid];
		};

		this.getData = function (node, name) {
			ASSERT(node && node._leaf);
			ASSERT(typeof name === "string");

			return node[name];
		};

		this.setData = function (node, name, data) {
			ASSERT(node && node._leaf);
			ASSERT(this.isMutable(node));
			ASSERT(typeof name === "string");

			node[name] = data;
		};

		this.delData = function (node, name) {
			ASSERT(node && node._leaf);
			ASSERT(this.isMutable(node));
			ASSERT(typeof name === "string");

			delete node[name];
		};
	};

	// ----------------- Tree2 -----------------

	var Tree2 = function (graph) {
		ASSERT(graph);

		this.isMutable = function (node) {
			ASSERT(node && node.data);
			return graph.isMutable(node.data);
		};

		this.isLeaf = function (node) {
			ASSERT(node && node.data);
			return graph.isLeaf(node.data);
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
				ASSERT(typeof node.relid === "string" && !graph.isLeaf(node.parent.data));
				var child = node.parent.data[node.relid];

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
			ASSERT(!this.isLeaf(node));

			return graph.getChildren(node.data);
		};

		this.getChild = function (node, relid, callback) {
			ASSERT(this.isValid(node));
			ASSERT(!this.isLeaf(node));
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
			ASSERT(!this.isLeaf(node));
			ASSERT(this.isValid(child));
			ASSERT(this.isMutable(node));

			graph.setChild(node.data, relid, child.data);
		};

		this.delChild = function (node, relid) {
			ASSERT(this.isValid(node));
			ASSERT(!this.isLeaf(node));
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

	// ----------------- PersistentGraph -----------------

	var PersistentGraph = function (storage) {
		ASSERT(storage);

		this.getKey = storage.getKey;

		this.hasKey = function (node) {
			return storage.getKey(node) !== undefined;
		};

		this.addKey = function (node) {
			storage.setKey(node, false);
		}; 
		
		this.delKey = storage.delKey;
		
		this.load = storage.load;

		this.isMutable = function (node) {
			ASSERT(this.hasKey(node));
			return storage.getKey(node) === false;
		};

		this.mutate = function (node) {
			ASSERT(this.hasKey(node));
			
			node = deepclone(node);
			
			ASSERT(storage.getKey(node) === undefined);
			storage.setKey(node, false);

			return node;
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

		// TODO: try to catch cycles in the graph
		Saver.prototype.save = function (node) {
			ASSERT(node && typeof node === "object");
			ASSERT(typeof storage.getKey(node) !== "string");

			var relid, child, key;

			for( relid in node ) {
				child = node[relid];
				if( child && typeof child === "object" ) {

					key = storage.getKey(child);
					ASSERT(key === undefined || key === false || typeof key === "string");

					if( !key ) {
						key = this.save(child);
					}

					ASSERT(key === undefined || typeof key === "string");
					if( key ) {
						node[relid] = key;
					}
				}
			}

			key = storage.getKey(node);
			if( key === false ) {

				key = SHA1(JSON.stringify(node));
				storage.setKey(node, key);

				this.start();
				storage.save(node, this.done);
			}

			ASSERT(key === undefined || typeof key === "string");
			return key;
		};

		this.persist = function (node, callback) {
			ASSERT(this.isMutable(node));
			ASSERT(callback);

			var saver = new Saver(callback);
			var key = saver.save(node);
			saver.done(null);

			return key;
		};
	};

	// ----------------- PersistentTree -----------------

	var PersistentTree = function (graph) {
		ASSERT(graph);

		this.getKey = function (handle) {
			ASSERT(handle && handle.node);
			return graph.getKey(handle.node);
		};

		this.hasKey = function (handle) {
			ASSERT(handle && handle.node);
			return graph.hasKey(handle.node);
		};

		this.isMutable = function (handle) {
			ASSERT(handle && handle.node);
			return graph.isMutable(handle.node);
		};

		this.mutate = function (node) {
			ASSERT(this.isNode(node));

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
			ASSERT(this.isMutable(node));
			graph.persist(node.node, callback);
		};

		this.getRoot = function (key, callback) {
			ASSERT(typeof key === "string");
			ASSERT(callback);

			graph.load(key, function (err, data) {
				callback(err, err ? undefined : {
					data: data,
					parent: null
				});
			});
		};

		this.getParent = function (node) {
			ASSERT(node && node.data);
			return node.parent;
		};
		
		this.getData = function (node) {
			ASSERT(node && node.data);
			return node.data;
		};
		
		this.getChild = function (node, relid) {
			ASSERT(node && node.data);
			
			var child = node.data[relid];
			ASSERT(child && typeof child === "object");

			return {
				data: child,
				parent: node,
				relid: relid
			};
		};

		this.create = function() {
			var handle = {
				node: {},
				parent: null
			};

			graph.make(handle.node);
			return handle;
		};
		
	};

	// ----------------- ReferenceTree -----------------

	var ReferenceTree = function (parenttree) {

		this.getKey = function (node) {
		};

		this.getRoot = function (key, callback) {
		};

		this.createRoot = function () {
		};

		this.getParent = function (node) {
		};

		this.setParent = function (node, target) {
		};

		this.getChildren = function (node) {
		};

		this.getPointer = function (node, name, callback) {
		};

		this.setPointer = function (node, name, target) {
		};

		this.getCollection = function (node, name) {
		};
	};

	// ----------------- Interface -----------------

	return {
		Mongo: Mongo,
		Graph: Graph2,
		Tree: Tree2
	};
});
