/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert" ], function (ASSERT) {
	"use strict";

	// ------- finding memory leaks

	var caches = [];

	var exiting = function () {
		if( caches.length !== 0 ) {
			console.log("You have an unclosed cache");
		}
	};

	if( window ) {
		var old = window.onbeforeunload;
		window.onbeforeunload = function () {
			exiting();
			if( old ) {
				return old();
			}
		};
	}
	else if( process ) {
		process.on('exit', exiting);
	}

	// ------- cache

	var Cache = function (storage) {
		ASSERT(storage !== null);

		var cache = {};

		this.open = function (callback) {
			ASSERT(!storage.opened());
			ASSERT(this.isempty());

			storage.open(function (err) {
				if( !err ) {
					ASSERT(storage.opened());

					ASSERT(caches.indexOf(this) < 0);
					caches.push(this);
				}
				callback(err);
			});
		};

		this.opened = function () {
			return storage.opened();
		};

		this.isempty = function () {
			for( var s in cache ) {
				return false;
			}
			return true;
		};

		this.close = function (callback) {
			ASSERT(storage.opened());
			ASSERT(this.isempty());

			storage.close(function () {
				ASSERT(!storage.opened());

				var index = caches.indexof(this);
				ASSERT(index >= 0);

				if( index >= 0 ) {
					caches.splice(index, 1);
				}

				callback();
			});
		};

		this.get = function (id, callback) {
			ASSERT(typeof id === "string");
			ASSERT(this.opened());

			var item = cache[id];
			if( item !== undefined ) {
				ASSERT( item.hasOwnProperty("value") || item.callbacks );

				if( item.callbacks ) {
					item.callbacks.push(callback);
				}
				else {
					callback(item);
				}
			}
			else {
				item = {
					id: id,
					refcount: 1,
					callbacks: [ callback ]
				};
				cache[id] = item;
				
				storage.get(id, function(err, obj) {
					ASSERT( err || obj );
					
					var callbacks = item.callbacks;
					if( callbacks ) {
						ASSERT( cache[id] === item );
						delete item.callbacks;
						
						item.value = obj;
						
					}
				});
			}
		};
		
		this.get3 = function (id, callback) {
			ASSERT(typeof id === "string");
			ASSERT(this.opened());

			var item = cache[id];
			if( item !== undefined ) {
				if( item instanceof Array ) {
					item.push(callback);
				}
				else {
					ASSERT(item.id === id);
					callback(null, item);
				}
			}
			else {
				item = [ callback ];
				cache[id] = item;

				storage.get(id, function (err, obj) {
					ASSERT( err || obj );
					ASSERT( cache[id] === item );
					ASSERT( item instanceof Array );
					
					if( err ) {
						delete cache[id];
					}
					else {
						ASSERT(!obj.hasOwnProperty("refcount"));
						ASSERT(!obj.hasOwnProperty("id"));

						Object.defineProperties(obj, {
							refcount: {
								value: item.length,
								enumerable: false,
								writable: true
							},
							id: {
								value: id,
								enumerable: false,
								writable: false
							}
						});

						cache[id] = obj;
					}
					
					for(var i = 0; i < item.length; ++i) {
						item[i](err, obj);
					}
				});
			}
		};

		this.release = function (object) {
			ASSERT(typeof id === "string");
			ASSERT(this.opened());
			ASSERT(object.refcount >= 1);

			if( --object.refcount === 0 ) {
				ASSERT(cache[object.id] === object);

				// TODO: be lazy to speed up reloads
				delete cache[object.id];
			}
		};

		this.set = function (id, object, callback) {
			ASSERT(typeof id === "string");
			ASSERT(this.opened());

			var old = cache[id];
			if( old instanceof Array ) {
				callback("concurrent load");
			}
				
			
		};
	};

	/**
	 * We store storage objects here indexed by id. The storage objects will
	 * have an invisible refcount property to manage the lifetime of objects.
	 * All projects and branches share a common cache.
	 */
	var cache = {};

	// detect memory leaks
	if( window ) {
		var oldUnload = window.onbeforeunload;
		window.onbeforeunload = function () {
			var id;
			for( id in cache ) {
				window.alert("Warning, you have a memory leak");
				break;
			}

			if( oldUnload ) {
				return oldUnload();
			}
		};
	}

	// ----------------- Public Interface -----------------

	return {
		/**
		 * Returns true if the object given by its id is in the cache.
		 * 
		 * @param id the has of the object
		 * @returns true if the object is in the cache, false otherwise
		 */
		has: function (id) {
			ASSERT(typeof id === "string");
			return cache[id] !== undefined;
		},

		/**
		 * Returns the object with the given id and increments its hidden
		 * reference count property.
		 * 
		 * @param id the has of the object
		 * @returns the object with the give id
		 */
		get: function (id) {
			ASSERT(typeof id === "string");
			var obj = cache[id];
			if( obj ) {
				ASSERT(obj.id === id);
				++obj.refcount;
				return obj;
			}
			return null;
		},

		/**
		 * Decrements the reference count of the given object and if that
		 * reaches zero, then removes it from the cache.
		 * 
		 * @param obj the object currently in the cache
		 * @returns nothing
		 */
		release: function (obj) {
			ASSERT(typeof obj.id === "string");
			ASSERT(obj.refcount >= 1);
			ASSERT(cache[obj.id] === obj);

			if( --obj.refcount === 0 ) {
				delete cache[obj.id];
			}
		},

		/**
		 * Takes an object with a id property and puts it into the cache. If the
		 * cache already contains an object with the same id, then that object
		 * is returned.
		 * 
		 * @param obj the object to be stored in the cache
		 * @returns an object in the cache that has the same id as the given one
		 */
		add: function (obj) {
			ASSERT(!obj.hasOwnProperty("refcount"));

			var id = obj.id;
			ASSERT(obj.hasOwnProperty("id"));
			ASSERT(typeof id === "string");

			if( cache[id] ) {
				obj = cache[id];
				ASSERT(obj.id === id);
				ASSERT(obj.refcount >= 1);
				++obj.refcount;
			}
			else {
				Object.defineProperty(obj, "refcount", {
					value: 1,
					enumerable: false,
					writable: true
				});
				cache[id] = obj;
			}

			return obj;
		}
	};
});
