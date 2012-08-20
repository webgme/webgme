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
			var message = "ASSERT failed at " + error.stack;

            if(typeof(process) === "undefined" && typeof(console) !== "undefined"){
                console.log(message);
            }
            
            throw error;
		}
	}; 
	
	return assert;
});
