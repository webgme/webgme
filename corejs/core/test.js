/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

var requirejs = require("requirejs");

requirejs.config({
	nodeRequire: require
});

requirejs([ "core/assert", "core/mongo", "core/core" ], function (ASSERT, Mongo, Core) {
	"use strict";

	var mongo = new Mongo();
	mongo.open(function (err) {
		ASSERT(!err);
		
		mongo.removeAll(function (err) {
			ASSERT(!err);
			
			var core = new Core(mongo);
			var root = core.createNode();
			core.setAttribute(root, "name", "root");
			
			var first = core.createNode(root);
			core.setAttribute(first, "name", "first");
			
			var second = core.createNode(root);
			core.setAttribute(second, "name", "second");
			
			core.setPointer(first, "ref", second, function(err) {
				ASSERT(!err);

				core.persist(root, function(err) {
					ASSERT(!err);

					core.loadRoot(core.getKey(root), function(err, root) {
						ASSERT(!err);
						
						core.setAttribute(root, "name", "root hmm");
						core.loadChildren(root, function(err, children) {
							ASSERT(!err);

							for(var i = 0; i < children.length; ++i) {
								var child = children[i];

								if(core.getAttribute(child, "name") === "first") {
									first = child;
								}
								
								core.setAttribute(child, "name", core.getAttribute(child, "name") + " hihi");
							}

							core.loadPointer(first, "ref", function(err, second) {
								ASSERT(!err);
								
								core.setAttribute(second, "apple", "apple");
								
								core.persist(root, function(err) {
									ASSERT(!err);
									
//									mongo.dumpAll(function () {
									core.dumpTree(core.getKey(root), function(err) {
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
