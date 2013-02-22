/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/util", "core/config" ], function (ASSERT, UTIL, CONFIG) {
	"use strict";

	var Cache = function (storage, options) {
		ASSERT(storage !== null);

		options = CONFIG.copyOptions(CONFIG.cache, options);

		var KEYNAME = storage.KEYNAME;
		var missing = {};
		var backup = {};
		var cache = {};
		var cacheSize = 0;

		var open = function (callback) {
			ASSERT(!storage.opened() && cacheSize === 0);

			storage.open(callback);
		};

		var close = function (callback) {
			ASSERT(storage.opened());

			storage.close(function () {
				for ( var key in missing) {
					var callbacks = missing[key];

					var cb;
					while ((cb = callbacks.pop())) {
						cb(new Error("storage closed"));
					}
				}

				missing = {};
				backup = {};
				cache = {};
				cacheSize = 0;

				callback();
			});
		};

		var cacheInsert = function (key, obj) {
			ASSERT(cache[key] === undefined && obj[KEYNAME] === key);

			cache[key] = obj;
			if (++cacheSize >= options.maxSize) {
				backup = cache;
				cache = {};
				cacheSize = 0;
			}
		};

		var load = function (key, callback) {
			ASSERT(typeof key === "string" && typeof callback === "function");

			if (key.charAt(0) === "#") {
				var obj = cache[key];
				if (obj === undefined) {
					obj = backup[key];
					if (obj === undefined) {
						obj = missing[key];
						if (obj === undefined) {
							obj = [ callback ];
							missing[key] = obj;
							storage.load(key, function (err, obj2) {
								ASSERT(typeof obj2 === "object" || obj2 === undefined);

								if (obj.length !== 0) {
									ASSERT(missing[key] === obj);

									delete missing[key];
									if (!err && obj2) {
										cacheInsert(key, obj2);
									}

									var cb;
									while ((cb = obj.pop())) {
										cb(err, obj2);
									}
								}
							});
						} else {
							obj.push(callback);
						}
						return;
					} else {
						cacheInsert(key, obj);
					}
				}

				ASSERT(typeof obj === "object" && obj !== null && obj[KEYNAME] === key);
				UTIL.immediateCallback(callback, null, obj);
			} else {
				storage.load(key, callback);
			}
		};

		var save = function (obj, callback) {
			ASSERT(typeof obj === "object" && obj !== null && typeof callback === "function");

			var key = obj[KEYNAME];
			ASSERT(typeof key === "string");

			if (key.charAt(0) === "#") {
				if (cache[key] !== undefined) {
					UTIL.immediateCallback(callback);
					return;
				} else {
					var item = backup[key];
					cacheInsert(key, obj);

					if (item !== undefined) {
						UTIL.immediateCallback(callback);
						return;
					} else {
						item = missing[key];
						if (item !== undefined) {
							delete missing[key];

							var cb;
							while ((cb = item.pop())) {
								cb(null, obj);
							}
						}
					}
				}
			}

			storage.save(obj, callback);
		};

		var remove = function (key, callback) {
			ASSERT(typeof key === "string" && typeof callback === "function");

			var item = cache[key];

			delete cache[key];
			delete backup[key];

			var callbacks = missing[key];
			if (callbacks) {
				delete missing[key];

				var cb;
				while ((cb = callbacks.pop())) {
					cb(null, null);
				}
			}

			storage.remove(key, callback);
		};

		var removeAll = function (callback) {
			ASSERT(typeof callback === "function");

			for ( var key in missing) {
				var callbacks = missing[key];

				var cb;
				while ((cb = callbacks.pop())) {
					cb(null, null);
				}
			}

			missing = {};
			backup = {};
			cache = {};
			cacheSize = 0;

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
			removeAll: removeAll,
			searchId: storage.searchId,
			fsync: storage.fsync,
			find: storage.find, //TODO: it should work more like load, but for now it is okay as it is
			requestPoll: storage.requestPoll,
			createBranch: storage.createBranch,
			deleteBranch: storage.deleteBranch,
			updateBranch: storage.updateBranch
		};
	};

	return Cache;
});
