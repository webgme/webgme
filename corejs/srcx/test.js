/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

var requirejs = require("requirejs");

requirejs.config({
	nodeRequire: require
});

requirejs([ "assert", "storage" ], function (ASSERT, STORAGE) {
	"use strict";

	var mongo = new STORAGE.Mongo();
	mongo.open(function (err) {
		ASSERT(!err);
		
		mongo.removeAll(function (err) {
			ASSERT(!err);
			
			var branch = new STORAGE.Branch(new STORAGE.PersistentTree(mongo));
			var root = branch.create();
			branch.setAttribute(root, "name", "root");
			
			var first = branch.create();
			branch.setAttribute(first, "name", "first");
			branch.attach(first, root);
			
			var second = branch.create();
			branch.setAttribute(second, "name", "second");
			branch.attach(second, root);
			
			branch.persist(root, function(err) {
				ASSERT(!err);

				branch.load(branch.getKey(root), function(err, root) {
					ASSERT(!err);
					
					branch.setAttribute(root, "name", "root2");
					branch.persist(root, function(err) {
						ASSERT(!err);
						
						mongo.dumpAll(function () {
							mongo.close();
						});
					});
				});
			});
		});
	});
});
