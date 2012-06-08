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
//			host: "129.59.104.16",
			port: 27017,
			database: "test",
			collection: "storage"
		},
		
		parser: {
			persistingLimit: 5000,
			reportingTime: 2000 
		},
		
		reader: {
			concurrentReads: 1,
			reportingTime: 2000
		}
	};
});
