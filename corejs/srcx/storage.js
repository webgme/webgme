/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert", "mongodb", "config" ], function (ASSERT, MONGODB, CONFIG) {
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

		this.get = function (id, callback) {
			ASSERT(typeof id === "string");
			ASSERT(collection && callback);

			collection.findOne({
				_id: id
			}, function (err, result) {
				callback(err, result ? result.object : undefined);
			});
		};

		this.set = function (id, object, callback) {
			ASSERT(typeof id === "string");
			ASSERT(collection && callback);

			if( object ) {
				collection.save({
					_id: id,
					object: object
				}, callback);
			}
			else {
				collection.remove({
					_id: id
				}, callback);
			}
		};

		this.dump = function (callback) {
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

		this.getRelid = function (node) {
			return node.relid;
		};

		this.getChildren = function (node) {
			return node.data.children;
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
			return node.children;
		};

		this.makeDirty = function (node) {
			ASSERT(node);

			while( node && (!node.children) ) {
				node = node.parent;
			}
		};

		this.setData = function (node, data) {
			this.makeDirty(node);
			node.data = data;
		};

		this.getRoot = function (hash, callback) {
			ASSERT(typeof hash === "string");

			storage.get(function (err, obj) {
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

			callback(null, child);
		};
	};

	return {
		Mongo: Mongo,
		Branch: ReadBranch
	};
});
