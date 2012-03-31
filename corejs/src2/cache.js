/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert" ], function (ASSERT) {
	"use strict";

	/**
	 * We store storage objects here indexed by hash. The storage objects will
	 * have an invisible refcount property to manage the lifetime of objects.
	 * All projects and branches share a common cache.
	 */
	var cache = {};

	// detect memory leaks
	if( window ) {
		var oldUnload = window.onunload;
		window.onunload = function () {
			if( oldUnload ) {
				oldUnload();
			}

			var hash;
			for( hash in cache ) {
				window.alert("Warning, you have a memory leak");
				break;
			}
		};
	}

	// ----------------- Public Interface -----------------

	return {
		/**
		 * Returns true if the object given by its hash is in the cache.
		 * 
		 * @param hash the has of the object
		 * @returns true if the object is in the cache, false otherwise
		 */
		has: function (hash) {
			ASSERT(typeof hash === "string");
			return cache[hash] !== undefined;
		},

		/**
		 * Returns the object with the given hash and increments its hidden
		 * reference count property.
		 * 
		 * @param hash the has of the object
		 * @returns the object with the give hash
		 */
		get: function (hash) {
			ASSERT(typeof hash === "string");
			var obj = cache[hash];
			if( obj ) {
				ASSERT(obj.hash === hash);
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
			ASSERT(typeof obj.hash === "string");
			ASSERT(obj.refcount >= 1);
			ASSERT(cache[obj.hash] === obj);

			if( --obj.refcount === 0 ) {
				delete cache[obj.hash];
			}
		},

		/**
		 * Takes an object with a hash property and puts it into the cache. If
		 * the cache already contains an object with the same hash, then that
		 * object is returned.
		 * 
		 * @param obj the object to be stored in the cache
		 * @returns an object in the cache that has the same hash as the given
		 *          one
		 */
		add: function (obj) {
			ASSERT(!obj.hasOwnProperty("refcount"));

			var hash = obj.hash;
			ASSERT(obj.hasOwnProperty("hash"));
			ASSERT(typeof hash === "string");

			if( cache[hash] ) {
				obj = cache[hash];
				ASSERT(obj.hash === hash);
				ASSERT(obj.refcount >= 1);
				++obj.refcount;
			}
			else {
				Object.defineProperty(obj, "refcount", {
					value: 1,
					enumerable: false,
					writable: true
				});
				cache[hash] = obj;
			}

			return obj;
		}
	};
});
