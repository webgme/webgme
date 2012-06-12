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

		var open = function (callback) {
			database = new MONGODB.Db(options.database, new MONGODB.Server(options.host,
			options.port));

			var abort = function (err) {
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

		var opened = function () {
			return collection !== null;
		};

		var close = function (callback) {
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

		var load = function (key, callback) {
			ASSERT(typeof key === "string");
			ASSERT(collection && callback);

			collection.findOne({
				_id: key
			}, callback);
		};

		var save = function (node, callback) {
			ASSERT(node && typeof node === "object");
			ASSERT(typeof node._id === "string");
			ASSERT(collection && callback);

			collection.save(node, callback);
		};

		var remove = function (key, callback) {
			ASSERT(typeof key === "string");
			ASSERT(collection && callback);

			collection.remove({
				_id: key
			}, callback);
		};

		var dumpAll = function (callback) {
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

		var removeAll = function (callback) {
			ASSERT(collection && callback);

			collection.drop(function (err) {
				if( err && err.errmsg === "ns not found" ) {
					err = null;
				}
				callback(err);
			});
		};

		return {
			open: open,
			opened: opened,
			close: close,
			KEYNAME: "_id",
			load: load,
			save: save,
			remove: remove,
			dumpAll: dumpAll,
			removeAll: removeAll
		};
	};

	return Mongo;
});
