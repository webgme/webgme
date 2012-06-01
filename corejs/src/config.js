/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define(function () {
	"use strict";

	return {
		mongodb: {
			host: "localhost",
			port: 27017,
			database: "test",
			collection: "storage"
		},
		
		copy: function(defaults, options) {
			options = options || {};
			for(var key in defaults) {
				if(!options.hasOwnProperty(key)) {
					options[key] = defaults[key];
				}
			}
			return options;
		}
	};
});
