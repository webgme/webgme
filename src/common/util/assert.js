/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define(function () {
	"use strict";

	var assert = function (cond, msg) {
		if( !cond ) {
			var error = new Error(msg || "ASSERT failed");

			if (typeof TESTING === 'undefined') {
				console.log("Throwing", error.stack);
			 	console.log();
			}
			
			throw error;
		}
	};

	return assert;
});
