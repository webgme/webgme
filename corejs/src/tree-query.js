/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Tamas Kecskes, Miklos Maroti
 */

define([ "assert", "tree-ids" ], function (ASSERT, Tree) {
	"use strict";

	var Query = function (project) {
		ASSERT(project);
		this.project = project;

		this.ui = undefined;
		this.tree = new Tree();
	};

	Query.prototype.setDirty = function (node) {
		for( ;; ) {
			var data = this.tree.getData(node);

			if( data.dirty ) {
				return;
			}
			else {
				data.dirty = true;
			}
			
			node = node.parent;
		}
	};

	Query.prototype.isDirty = function (node) {
		var data = this.tree.peekData(node);
		return data && data.dirty;
	};

	Query.prototype.setPattern = function (node, type) {

		this.tree.setData(node, type || {
			self: true
		});
	
		this.setDirty(node);
	};

	Query.prototype.deletePattern = function (node) {
		ASSERT(node.tree === tree);

		node[this.property] = {};

		while( !node[this.property].dirty ) {
			node[this.property].dirty = true;
			node = node.parent;
		}
	};

	Query.prototype.savePatterns = function () {

	};

	Query.prototype.onRefresh = function (nodes) {
		console.log("query onrefresh");
	};

	return Query;
});
