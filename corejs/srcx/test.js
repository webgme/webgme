/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

var requirejs = require("requirejs");

requirejs.config({
	nodeRequire : require
});

requirejs([ "assert", "storage" ], function(ASSERT, STORAGE) {
	"use strict";

	var mongo = new STORAGE.Mongo();
	mongo.open(function(err) {
		
/*		
		storage.get("headx", function(err, result) {
			console.log(err);
			console.log(result);
			storage.close();
		});
*/

		mongo.dump(function(err) {
			mongo.close();
		});

	});
});
