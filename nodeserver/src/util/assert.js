/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define(function () {
	"use strict";

	var assert = function (cond) {
		if( !cond ) {
			var error = new Error("ASSERT failed");

			console.log("Throwing", error.stack);
			console.log();
			
			throw error;
		}
	};

	return assert;
});
