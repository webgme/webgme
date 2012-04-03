/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Tamas Kecskes, Miklos Maroti
 */

define([ "assert" ], function (ASSERT) {
	"use strict";

	var Query = function (project) {
		ASSERT(project);
		this.project = project;

		this.patterns = {};
		this.ui = undefined;
	};

	// TODO: should be named as setPattern (since it overwrites everything)
	Query.prototype.addPattern = function (nodeid, type) {
		if( nodeid !== undefined ) {
			this.patterns[nodeid] = type || {
				self: true
			};
			this.project.onQueryChange(this);
		}
	};

	// TODO: why did it have a type parameter?
	Query.prototype.deletePattern = function (nodeid) {
		delete this.patterns[nodeid];
		this.project.onQueryChange(this);
	};

	Query.prototype.getPatterns = function () {
		return this.patterns;
	};

	Query.prototype.setPatterns = function (patterns) {
		this.patterns = patterns;
	};

	Query.prototype.onRefresh = function (nodes) {
		console.log("query onrefresh");
	};

	return Query;
});
