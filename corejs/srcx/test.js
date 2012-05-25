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
			
			var tree = new STORAGE.PersistentTree(mongo);
			var root = tree.createRoot();
			tree.setProperty(root, "name", "root");
			var first = tree.createChild(root, "1");
			tree.addKey(first);
			tree.setProperty(first, "name", "first");
			
			tree.persist(root, function(err) {
				ASSERT(!err);

				tree.loadRoot(tree.getKey(root), function(err, root) {
					ASSERT(!err);

					tree.mutate(root);
					var second = tree.createChild(root, "2");
					tree.addKey(second);
					
					tree.persist(root, function(err) {
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
