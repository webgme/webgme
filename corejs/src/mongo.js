/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert", "mongodb", "config", "util" ], function (ASSERT, MONGODB, CONFIG, UTIL) {
	"use strict";

	var Mongo = function (options) {
		var database = null, collection = null;

		options = UTIL.copyOptions(CONFIG.mongodb, options);

		this.open = function (callback) {
			database = new MONGODB.Db(options.database, new MONGODB.Server(options.host,
			options.port));

			var abort = function (err) {
				console.log("could not open mongodb: " + err);
				database.close();
				database = null;
				callback(err);
			};

			database.open(function (err1) {
				if( err1 ) {
					abort(err1);
				}
				else {
					database.collection(options.collection, function (err2, result) {
						if( err2 ) {
							abort(err2);
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

			// to sync data
			database.lastError({
				fsync: true
			}, function (err, data) {
				database.close(function () {
					collection = null;
					database = null;
					if( callback ) {
						callback();
					}
				});
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

			collection.drop(function (err) {
				if(err && err.errmsg === "ns not found") {
					err = null;
				}
				callback(err);
			});
		};
	};

	return Mongo;
});
