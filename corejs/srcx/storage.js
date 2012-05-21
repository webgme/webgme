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
			return node._id;
		};

		this.setKey = function (node, key) {
			ASSERT(node);
			ASSERT(typeof key === "string");

			node._id = key;
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
			ASSERT(node);
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
				++counter;
			};

			this.done = function (err) {
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

		this.mutate = function (node) {
			ASSERT(node && node.data);

			if( !graph.isMutable(node.data) ) {
				/**
				 * If this fails, then this child has already been modified
				 * through another copy. Do not keep references to old nodes, or
				 * persist them.
				 */
				ASSERT(!node.parent
				|| graph.getChildren(node.parent.data)[node.relid] === graph.getKey(node.data));

				node.data = graph.mutate(node.data);
				if( node.parent ) {
					this.mutate(node.parent);
					graph.setChild(node.parent.data, node.relid, node.data);
				}
			}
		};

		this.persist = function (node) {
			ASSERT(node && node.data);
			ASSERT(this.isMutable(node));

			ASSERT(!node.parent || graph.getChildren(node.parent.data)[node.relid] === node.data);
			
			node.data = graph.persist(node.data);
			
		};

		this.getChildren = function (node) {
			ASSERT(node && node.data);

			return graph.getChildren(node.data);
		};

		this.getChild = function (node, relid, callback) {
			ASSERT(node && node.data);
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
			ASSERT(node && node.data);
			ASSERT(child && child.data);
			ASSERT(this.isMutable(node));

			graph.setChild(node.data, relid, child.data);
		};

		this.delChild = function (node, relid) {
			ASSERT(node && node.data);
			ASSERT(this.isMutable(node));

			graph.delChild(node.data, relid);
		};

		this.getData = function (node, name) {
			ASSERT(node && node.data);

			graph.getData(node.data, name);
		};

		this.setData = function (node, name, data) {
			ASSERT(node && node.data);
			ASSERT(this.isMutable(node));

			graph.setData(node.data, name, data);
		};
	};

	// ----------------- ReadBranch -----------------

	var ReadBranch = function (storage) {
		ASSERT(storage !== null);

		this.opened = function () {
			return storage.opened();
		};

		this.getRoot = function (hash, callback) {
			ASSERT(typeof hash === "string");

			storage.get(function (err, obj) {
				if( !err ) {
					obj = {
						data: obj,
						parent: null,
						relid: null
					};
				}
				callback(err, obj);
			});
		};

		this.getChild = function (node, relid, callback) {
			ASSERT(node && node.data);
			ASSERT(typeof relid === "string");

			var children = node.data.children;
			var hash = children || children[relid];
			if( !hash ) {
				callback(null, null);
			}
			else {
				ASSERT(typeof hash === "string");
				storage.get(hash, function (err, obj) {
					if( !err ) {
						obj = {
							data: obj,
							parent: node,
							relid: relid
						};
					}
					callback(err, obj);
				});
			}
		};
	};

	// ----------------- WriteBranch -----------------

	var WriteBranch = function (storage) {
		ASSERT(storage !== null);

		this.opened = function () {
			return storage.opened();
		};

		this.isDirty = function (node) {
			ASSERT(node);
			ASSERT((node.children !== undefined) === (node.data.hash === undefined));

			return !!node.children;
		};

		this.makeDirty = function (node) {
			ASSERT(node);
			if( !node.children ) {
				if( node.parent ) {
					this.makeDirty(node.parent);

					ASSERT(!node.parent.children[node.relid]);
					ASSERT(node.parent.data.children[node.relid] === node.data.hash);
				}
			}
		};

		this.setData = function (node, data) {
			this.makeDirty(node);
			node.data = data;
		};

		this.getRoot = function (hash, callback) {
			ASSERT(typeof hash === "string");

			storage.get(hash, function (err, obj) {
				if( !err ) {
					obj = {
						hash: hash,
						data: obj,
						parent: null
					};
				}
				callback(err, obj);
			});
		};

		this.deleteChild = function (node, relid) {
		};

		this.getChild = function (node, relid, callback) {
			ASSERT(node && node.data);
			ASSERT(typeof relid === "string");

			if( node.children ) {
				var child = node.children[relid];
				if( !child ) {
					var children = node.data.children;
					var hash = children || children[relid];
					if( hash ) {
						ASSERT(typeof hash === "string");
						storage.get(hash, function (err, obj) {
							if( !err ) {
								// we might have it already
								child = node.$children[relid];
								if( !child ) {
									child = {
										data: obj,
										parent: node,
										children: {}
									};
									node.children[relid] = child;
								}
							}
							callback(err, child);
						});
						return;
					}
				}
			}

			// callback(null, child);
		};
	};

	return {
		Mongo: Mongo,
		Graph: Graph,
		Tree: Tree,
		Branch: ReadBranch
	};
});
