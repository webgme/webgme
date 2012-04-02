/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Tamas Kecskes, Miklos Maroti
 */

define([ "assert" ], function (ASSERT) {
	"use strict";

	var Query = function (project) {
		ASSERT(project);
		this.patterns = {};

		this.project = project;
		this.ui = undefined;
	};

	// TODO: should be named as setPattern (since it overwrites everything)
	Query.prototype.addPattern = function (nodeid, type) {
		if( nodeid !== undefined ) {
			this.patterns[nodeid] = type || {
				self: true
			};
			this.project.onQueryChange(this.id);
		}
	};

	// TODO: why did it have a type parameter?
	Query.prototype.deletePattern = function (nodeid) {
		delete this.patterns[nodeid];
		this.project.onQueryChange(this.id);
	};

	/* helper to send the query to the server */
	Query.prototype.get = function () {
		var query = {};
		query.id = this.id;
		query.query = {};
		query.query.patterns = this.patterns;
		return query;
	};

	/* data from server */
	Query.prototype.onRefresh = function (nodes) {
		if( this.ui ) {
			this.ui.onRefresh(nodes);
		}
	};

	Query.prototype.addUI = function (ui) {
		this.ui = ui;
	};

	return Query;
});
