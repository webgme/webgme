/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define(function () {
	"use strict";

	return function (cond) {
		if( !cond ) {
			var error = new Error("ASSERT failed");
			var message = "ASSERT failed at " + error.stack;

			if( console && !process ) {
				console.log(message);
			}

			throw error;
		}
	};
});
