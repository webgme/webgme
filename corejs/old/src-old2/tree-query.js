/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert", "treemap" ], function (ASSERT, Treemap) {
	"use strict";

	var Query = function (project) {
		ASSERT(project);

		this.project = project;
		this.ui = undefined;

		// initialize the superclass
		Treemap.call(this);
	};

	(function () {
		for( var a in Treemap.prototype ) {
			Query.prototype[a] = Treemap.prototype[a];
		}
	}());

	Query.prototype.isDirty = function (node) {
		var data = this.getData(node);
		return data && data.dirty;
	};

	Query.prototype.setPattern = function (node, type) {
		ASSERT(type);

		type.dirty = true;
		this.setData(node, type);

		node = node.parent;
		while( node && !this.hasData(node) ) {
			this.setData(node, {
				dirty: true
			});
			node = node.parent;
		}

		var data;
		while( node && !(data = this.getData(node)).dirty ) {
			data.dirty = true;
			node = node.parent;
		}
	};

	Query.prototype.deletePattern = function (node) {
		if( this.hasData(node) )
		{
			this.deleteData(node);
		
			node = node.parent;

			var data;
			while( node && !(data = this.getData(node)).dirty ) {
				data.dirty = true;
				node = node.parent;
			}
		}
	};

	Query.prototype.onRefresh = function (nodes) {
		console.log("query onrefresh");
	};

	return Query;
});
