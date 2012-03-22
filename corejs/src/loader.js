/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "gmeassert", "cache", "gmestorage" ],
function (ASSERT, cache, storage) {
	"use strict";

	// ----------------- Public Interface -----------------

	return {
		/**
		 * Makes sure that the specified hashes are loaded from the database and
		 * then calls the given callback function.
		 * 
		 * @param hashes a single hash (string) or an array of hashes
		 * @param callback the function to be called when all the specified
		 *        hashes are available
		 * @returns nothing
		 */
		load: function (hashes, callback) {
			callback();
		},

		get: function (hash) {
			return cache.get(hash);
		}
	};
});
