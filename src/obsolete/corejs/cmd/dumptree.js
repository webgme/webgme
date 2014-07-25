/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/coretree", "core/future", "core/util" ], function (ASSERT, CoreTree,
FUTURE, UTIL) {
	"use strict";

	var dumpTree = function (key, callback) {
	};

	var dump = function (storage, key, callback) {
		var isValidHash = (new CoreTree(storage)).isValidHash;

		ASSERT(typeof key === "string" && typeof callback === "function");

		var root = null;
		var error = null;
		var counter = 1;

		var decrease = function () {
			if( --counter === 0 ) {
				console.log(JSON.stringify(root, null, '\t'));

				callback(error, root);
				callback = null;
			}
		};

		var load = function (data, relid) {
			ASSERT(data && typeof data === "object");

			var key = data[relid];
			ASSERT(isValidHash(key));

			++counter;

			storage.load(key, function (err, child) {
				ASSERT(err || child);

				if( !err ) {
					var copy = UTIL.deepCopy(child);

					data[relid] = copy;
					scan(copy);

					// copy.id = child[KEYNAME];
					decrease();
				}
				else {
					error = error || err;
				}
			});
		};

		var scan = function (data) {
			ASSERT(data && typeof data === "object");

			for( var relid in data ) {
				var child = data[relid];

				if( relid !== "_id" && isValidHash(child) ) {
					load(data, relid);
				}
				else if( child && typeof child === "object" ) {
					scan(child);
				}
			}
		};

		storage.load(key, function (err, data) {
			ASSERT(err || data._id === key);

			root = UTIL.deepCopy(data);
			scan(root);

			decrease();
		});
	};

	return {
		dump: dump
	};
});
