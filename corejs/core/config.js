/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define(function () {
	"use strict";

	return {
		mongodb: {
//			host: "localhost",
//			host: "129.59.104.16",		// kecso
			host: "129.59.105.195",		// cloud
			port: 27017,
			database: "test2",
			collection: "storage"
		},

		parser: {
			persistingLimit: 1000,
			reportingTime: 2000 
		},

		reader: {
			concurrentReads: 20,
			reportingTime: 2000
		},
		
		callbacks: {
			maxDepth: 5
		}
	};
});
