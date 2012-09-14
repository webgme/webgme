/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

var requirejs = require("requirejs");

requirejs.config({
	nodeRequire: require,
	baseUrl: ".."
});

requirejs([ "mongodb" ], function (MONGODB) {
	"use strict";

	var count = 100000;

	var database = new MONGODB.Db("test2", new MONGODB.Server("129.59.105.195", 27017, {
		poolSize: 5
	}));
	var collection;

	database.open(function (err) {
		console.log("db open err:", err);
		database.collection("storage", function (err, coll) {
			collection = coll;
			console.log("db collection err:", err);
			collection.drop(function (err) {
				console.log("db coll drop err:", err);
				testcase(function () {
					database.close(function (err) {
						console.log("db close err:", err);
					});
				});
			});
		});
	});

	var testcase = function (callback) {
		writeAll(function () {
			syncAll(function () {
				readAll(callback);
			});
		});
	};

	var random = Math.random();
	console.log("Random payload", random);

	var writeAll = function (callback) {
		var saved = 0;

		var write = function (index) {
			collection.save({
				_id: "#" + index,
				value: random
			}, {
//			safe: true
			}, function (err, obj) {
				// console.log("saved", index, err, obj);
				if( ++saved === count ) {
					console.log("Saving done");
					callback();
				}
			});
		};

		console.log("Saving " + count + " objects");
		for( var i = 0; i < count; ++i ) {
			write(i);
		}
	};

	var syncAll = function (callback) {
		var conns = database.serverConfig.allRawConnections();
		var error = null;

		var synced = 0; 
		var syncConn = function(conn) {
			database.lastError({
				fsync: true
			}, {
				connection: conn
			}, function (err, res) {
				error = error || err || res[0].err;
				if( ++synced === conns.length ) {
					console.log("db lastErrors err:", error);
					callback();
				}
			});
		};
		
		for(var i = 0; i < conns.length; ++i) {
			syncConn(conns[i]);
		}
	};

	var readAll = function (callback) {
		var loaded = 0;

		var read = function (index) {
			collection.findOne({
				_id: "#" + index
			}, function (err, obj) {
				// console.log("loaded", index, err, obj);
				if( typeof obj !== "object" || obj === null || obj.value !== random ) {
					console.log("LOAD ERROR", index, err, obj);
				}
				if( ++loaded === count ) {
					console.log("Loading done");
					callback();
				}
			});
		};

		console.log("Loading " + count + " objects");
		for( var i = count - 1; i >= 0; --i ) {
			read(i);
		}
	};
});
