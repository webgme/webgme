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

requirejs([ "core/assert", "mongodb" ], function (ASSERT, MONGODB) {
	"use strict";

	var COUNT = 100000;
	var HOST = "localhost";	// "129.59.105.195"

	var database = new MONGODB.Db("test", new MONGODB.Server(HOST, 27017));
	database.open(function (err) {
		ASSERT(!err);

		database.collection("garbage", function (err, collection) {
			ASSERT(!err);
			console.log("opened");

			var saveMissing = COUNT;
			var saveDone = function (err) {
				ASSERT(!err);
				if( --saveMissing === 0 ) {
					console.log("saved");

					var loadMissing = COUNT;
					var loadOne = function (j) {
						collection.findOne({
							_id: "*obj" + j
						}, function (err, obj) {
							ASSERT(!err);

							ASSERT(obj.value === j);
							if( --loadMissing === 0 ) {
								console.log("loaded");

								database.close(function () {
									console.log("closed");
								});
							}
						});
					};

					for( var j = 0; j < COUNT; ++j ) {
						loadOne(j);
					}
				}
			};

			for( var i = 0; i < COUNT; ++i ) {
				collection.save({
					_id: "*obj" + i,
					value: i
				}, saveDone);
			}
		});
	});
});
