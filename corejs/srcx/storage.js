/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

var requirejs = require("requirejs");

requirejs.config({
	nodeRequire : require
});

requirejs([ "assert", "mongodb", "config" ], function(ASSERT, MONGODB, CONFIG) {
	"use strict";

	var client = MONGODB.
});
