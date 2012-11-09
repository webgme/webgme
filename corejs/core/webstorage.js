define([ "core/assert", "core/config" ], function (ASSERT, CONFIG) {
	"use strict";

	var MStorage = function (collectionname) {
		var storage = {};
		var load = function (key, callback) {
			setTimeout(function () {
				var data = storage[key];
				if( data ) {
					callback(null, data);
				}
				else {
					callback(new Error("not found"));
				}
			}, 0);
		};
		var save = function (node, callback) {
			setTimeout(function () {
				storage[node._id] = node;
				callback(null);
			}, 0);
		};
		var remove = function (key, callback) {
			setTimeout(function () {
				delete storage[key];
				callback(null);
			}, 0);
		};
		var dumpAll = function (callback) {
			setTimeout(function () {
				for( var i in storage ) {
					console.log(JSON.stringify(storage[i]));
				}
				callback(null);
			}, 0);
		};
		var removeAll = function (callback) {
			setTimeout(function () {
				storage = {};
				callback(null);
			}, 0);
		};
		var searchId = function (beginning, callback) {
			setTimeout(function () {
				var count = 0;
				var lastmatch = "";
				for( var i in storage ) {
					if( i.indexOf(beginning) === 0 ) {
						lastmatch = i;
						count++;
					}

					if( count > 1 ) {
						break;
					}
				}
				if( count === 1 ) {
					callback(null, storage[lastmatch]);
				}
				else {
					callback(new Error(count > 1 ? "not unique" : "not found"));
				}
			}, 0);
		};
		return {
			load: load,
			save: save,
			remove: remove,
			dumpAll: dumpAll,
			removeAll: removeAll,
			searchId: searchId
		};
	};

	var LStorage = function (collectionname, type) {
		var storage = type === "session" ? window.sessionStorage : window.localStorage;
		var load = function (key, callback) {
			setTimeout(function () {
				var data = JSON.parse(storage.getItem(collectionname + key));
				if( data ) {
					callback(null, data);
				}
				else {
					callback(new Error("not found"));
				}
			}, 0);
		};
		var save = function (node, callback) {
			setTimeout(function () {
				storage.setItem(collectionname + node._id, JSON.stringify(node));
				callback(null);
			}, 0);
		};
		var remove = function (key, callback) {
			setTimeout(function () {
				storage.removeItem(collectionname + key);
				callback(null);
			}, 0);
		};
		var dumpAll = function (callback) {
			setTimeout(function () {
				for( var i = 0; i <= storage.length - 1; i++ ) {
					var key = storage.key(i);
					if( key.indexOf(collectionname) === 0 ) {
						console.log(storage.getItem(key));
					}
				}
				callback(null);
			}, 0);
		};
		var removeAll = function (callback) {
			setTimeout(function () {
				var ids = [];
				for( var i = 0; i < storage.length - 1; i++ ) {
					var key = storage.key(i);
					if( key.indexOf(collectionname) === 0 ) {
						ids.push(key);
					}
				}
				for( i = 0; i < ids.length; i++ ) {
					storage.removeItem(ids[i]);
				}
				callback(null);
			}, 0);
		};
		var searchId = function (beginning, callback) {
			setTimeout(function () {
				var count = 0;
				var lastmatch = "";
				for( var i = 0; i <= storage.length - 1; i++ ) {
					var key = storage.key(i);
					if( key.indexOf(collectionname + beginning) === 0 ) {
						lastmatch = key;
						count++;
					}
					if( count > 1 ) {
						break;
					}
				}
				if( count === 1 ) {
					callback(null, storage.getItem(lastmatch));
				}
				else {
					callback(new Error(count > 1 ? "not unique" : "not found"));
				}
			}, 0);
		};

		return {
			load: load,
			save: save,
			remove: remove,
			dumpAll: dumpAll,
			removeAll: removeAll,
			searchId: searchId
		};
	};

	var Mongo = function (options) {

		var _storage = null;

		options = CONFIG.copyOptions(CONFIG.mongodb, options);

		var open = function (callback) {
			setTimeout(function () {
				switch( options.database ) {
				case "local":
					_storage = new LStorage(options.collection, "local");
					break;
				case "session":
					_storage = new LStorage(options.collection, "session");
					break;
				default:
					_storage = new MStorage(options.collection);
				}
				callback(null);
			}, 0);
		};

		var opened = function () {
			return _storage !== null;
		};

		var close = function (callback) {
			_storage = null;
			if( callback ) {
				callback(null);
			}
		};
		var load = function (key, callback) {
			ASSERT(_storage);
			_storage.load(key, callback);
		};
		var save = function (node, callback) {
			ASSERT(_storage);
			_storage.save(node, callback);
		};
		var remove = function (key, callback) {
			ASSERT(_storage);
			_storage.remove(key, callback);
		};
		var dumpAll = function (callback) {
			ASSERT(_storage);
			_storage.dumpAll(callback);
		};
		var removeAll = function (callback) {
			ASSERT(_storage);
			_storage.removeAll(callback);
		};
		var searchId = function (beggining, callback) {
			ASSERT(_storage);
			_storage.searchId(beggining, callback);
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
			searchId: searchId
		};
	};

	return Mongo;
});
