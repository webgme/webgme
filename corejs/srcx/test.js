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
		var graph = new STORAGE.Graph(mongo);
		var tree = new STORAGE.Tree(graph);

		mongo.removeAll(function (err) {

			var root = graph.createNode();
//			graph.setData(root, "name", "root");
			var child = graph.createLeaf();
			graph.setData(child, "name", "child");
			graph.setChild(root, "1", child);
			graph.setChild(root, "2", child);

			graph.persist(root, function (err) {

				tree.getRoot(graph.getKey(root), function (err, rnode) {
					tree.getChild(rnode, "1", function (err, cnode) {

						tree.mutate(cnode);
						tree.setData(cnode, "name", "hihi");

						tree.persist(rnode, function (err) {
							mongo.dumpAll(function () {
								mongo.close();
							});
						});
					});

				});
			});
		});

	});
});
