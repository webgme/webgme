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

	var count = 100;

	var database = new MONGODB.Db("test", new MONGODB.Server("129.59.105.195", 27017));
	database.open(function (err) {
		console.log("db open err:", err);
		database.collection("storage", function (err, collection) {
			console.log("db collection err:", err);
			collection.drop(function(err) {
				console.log("db coll drop err:", err);
				testcase(collection, function () {
					database.close(function (err) {
						console.log("db close err:", err);
					});
				});
			});
		});
	});

	var testcase = function (collection, callback) {
		writeAll(collection, function () {
			readAll(collection, callback);
		});
	};

	var random = Math.random();
	console.log("Random payload", random);

	var writeAll = function (collection, callback) {
		var saved = 0;

		var write = function (index) {
			collection.save({
				_id: "#" + index,
				value: random
			}, function (err, obj) {
//				console.log("saved", index, err, obj);
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

	var readAll = function (collection, callback) {
		var loaded = 0;

		var read = function (index) {
			collection.findOne({
				_id: "#" + index
			}, function (err, obj) {
//				console.log("loaded", index, err, obj);
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
		for( var i = count-1; i >= 0; --i ) {
			read(i);
		}
	};
});
