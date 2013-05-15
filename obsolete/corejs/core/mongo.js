/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "mongodb", "core/config" ], function (ASSERT, MONGODB, CONFIG) {
	"use strict";

	var Mongo = function (options) {
		var database = null, collection = null;

		options = CONFIG.copyOptions(CONFIG.mongodb, options);

		var open = function (callback) {
			database = new MONGODB.Db(options.database, new MONGODB.Server(options.host,
			options.port), {
				w: 1
			});

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
			return collection !== null && collection !== undefined;
		};

		var close = function (callback) {
			ASSERT(database && collection);

			fsync(function () {
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

		var idregexp = new RegExp("^[#0-9a-zA-Z_]*$");

		var searchId = function (beginning, callback) {
			ASSERT(collection && typeof beginning === "string" && callback);

			if( !idregexp.test(beginning) ) {
				callback(new Error("mongodb id " + beginning + " not valid"));
			}
			else {
				collection.find({
					_id: {
						$regex: "^" + beginning
					}
				}, {
					limit: 2
				}).toArray(function (err, docs) {
					if( err ) {
						callback(err);
					}
					else if( docs.length === 0 ) {
						callback(new Error("mongodb id " + beginning + " not found"));
					}
					else if( docs.length !== 1 ) {
						callback(new Error("mongodb id " + beginning + " not unique"));
					}
					else {
						callback(null, docs[0]._id);
					}
				});
			}
		};

		var fsync = function (callback) {
			ASSERT(typeof callback === "function");

			var conns = database.serverConfig.allRawConnections();
			ASSERT(Array.isArray(conns) && conns.length >= 1);

			var error = null;
			var synced = 0;

			var fsyncOne = function (conn) {
				database.lastError({
					fsync: true
				}, {
					connection: conn
				}, function (err, res) {
					error = error || err || res[0].err;
					if( ++synced === conns.length ) {
						callback(error);
					}
				});
			};

			for( var i = 0; i < conns.length; ++i ) {
				fsyncOne(conns[i]);
			}
		};

		var find = function (criteria, callback) {
			ASSERT(criteria && typeof criteria === "object");
			ASSERT(collection);
			collection.find(criteria).toArray(callback);
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
			removeAll: removeAll,
			searchId: searchId,
			fsync: fsync,
			find: find
		};
	};

	return Mongo;
});
