/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert" ], function (ASSERT) {
	"use strict";

	var Cache = function (storage) {
		ASSERT(storage !== null);

		var KEYNAME = storage.KEYNAME;

		var cache = {};

		var isEmpty = function () {
			var s;
			for( s in cache ) {
				return false;
			}
			return true;
		};

		var open = function (callback) {
			ASSERT(!storage.opened() && isEmpty());

			storage.open(callback);
		};

		var close = function (callback) {
			ASSERT(storage.opened());

			cache = {};
			storage.close(callback);
		};

		var load = function (key, callback) {
			ASSERT(typeof key === "string");

			var obj = cache[key];
			if( obj !== undefined ) {
				if( obj.loading && obj.callbacks ) {
					obj.callbacks.push(callback);
				}
				else {
					ASSERT(obj[KEYNAME] === key);
					callback(null, obj);
				}
			}
			else {
				var callbacks = [ callback ];

				cache[key] = {
					loading: true,
					callbacks: callbacks
				};

				storage.load(key, function (err, obj2) {
					ASSERT(err || obj2);

					obj = cache[key];
					if( obj && obj.callbacks ) {
						ASSERT(obj.callbacks === callbacks);

						if( err ) {
							delete cache[key];
						}
						else {
							cache[key] = obj2;
						}

						for( var i = 0; i < callbacks.length; ++i ) {
							callbacks[i](err, obj2);
						}
					}
				});
			}
		};

		var keyregexp = new RegExp("#[0-9a-f]{40}");

		var save = function (obj, callback) {
			var key = obj[KEYNAME];
			ASSERT(key && typeof key === "string");

			var item = cache[key];
			cache[key] = obj;

			if( item && item.loading && item.callbacks ) {
				var callbacks = item.callbacks;
				for( var i = 0; i < callbacks.length; ++i ) {
					callbacks[i](null, obj);
				}
			}

			// TODO: hack, the higher level layer decides what is permanent
			if( item && key.length === 41 && keyregexp.test(key) ) {
				ASSERT(item[KEYNAME] === key);
				callback(null);
			}
			else {
				storage.save(obj, callback);
			}
		};

		var remove = function (key, callback) {
			ASSERT(key && typeof key === "string");

			var item = cache[key];
			delete cache[key];

			if( item && item.loading && item.callbacks ) {
				var callbacks = item.callbacks;
				for( var i = 0; i < callbacks.length; ++i ) {
					callbacks[i](null, null);
				}
			}

			storage.remove(key, callback);
		};

		var removeAll = function (callback) {
			cache = {};
			storage.removeAll(callback);
		};

		return {
			open: open,
			opened: storage.opened,
			close: close,
			KEYNAME: KEYNAME,
			load: load,
			save: save,
			remove: remove,
			dumpAll: storage.dumpAll,
			removeAll: removeAll
		};
	};

	return Cache;
});
