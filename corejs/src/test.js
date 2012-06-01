/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

var requirejs = require("requirejs");

requirejs.config({
	nodeRequire: require
});

requirejs([ "assert", "mongo", "pertree", "branch" ], function (ASSERT, Mongo, PerTree, Branch) {
	"use strict";

	var mongo = new Mongo();
	mongo.open(function (err) {
		ASSERT(!err);
		
		mongo.removeAll(function (err) {
			ASSERT(!err);
			
			var tree = new PerTree(mongo);
			var branch = new Branch(tree);
			var root = branch.createNode();
			branch.setAttribute(root, "name", "root");
			
			var first = branch.createNode();
			branch.setAttribute(first, "name", "first");
			branch.attach(first, root);
			
			var second = branch.createNode();
			branch.setAttribute(second, "name", "second");
			branch.attach(second, root);
			
			branch.setPointer(first, "ref", second, function(err) {
				ASSERT(!err);

				branch.persist(root, function(err) {
					ASSERT(!err);

					branch.loadRoot(branch.getKey(root), function(err, root) {
						ASSERT(!err);
						
						branch.setAttribute(root, "name", "root hmm");
						branch.loadChildren(root, function(err, children) {
							ASSERT(!err);

							for(var i = 0; i < children.length; ++i) {
								var child = children[i];

								if(branch.getAttribute(child, "name") === "first") {
									first = child;
								}
								
								branch.setAttribute(child, "name", branch.getAttribute(child, "name") + " hihi");
							}

							branch.loadPointer(first, "ref", function(err, second) {
								ASSERT(!err);
								
								branch.setAttribute(second, "apple", "apple");
								
								branch.persist(root, function(err) {
									ASSERT(!err);
									
//									mongo.dumpAll(function () {
									tree.dumpTree(branch.getKey(root), function(err) {
										ASSERT(!err);
										mongo.close();
									});
								});
							});
						});
					});
				});
			});
		});
	});
});
