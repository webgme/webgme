/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert", "query" ], function (ASSERT, Query) {
	"use strict";

	var Project = function () {
		this.queries = [];
	};

	Project.prototype.open = function () {
	};

	Project.prototype.close = function () {
	};

	Project.prototype.onOpen = function () {
		console.log("project onopen");
	};

	Project.prototype.onError = function (reason) {
		console.log("project onerror");
	};

	Project.prototype.onClose = function () {
		console.log("project onclose");
	};
	
	Project.prototype.createQuery = function () {
		var query = new Query(this);
		this.queries.push(new Query(this));
		return query;
	};

	Project.prototype.deleteQuery = function (query) {
		ASSERT(query instanceof Query);
		ASSERT(query.project === this);
		
		var index = this.queries.indexOf(query);
		ASSERT(index >= 0 );
		
		this.queries.splice(index, 1);
	};

	Project.prototype.onQueryChange = function (queryid) {
		/*
		 * currently this event shoots only in case of extension of the query as
		 * the client keep all objects and try to keep them up-to-date
		 */
		var querymessage = this.queries[queryid].get();
		if( this.socket !== undefined && querymessage !== undefined ) {
			this.socket.queryUpdate(querymessage);
		}
	};

	return Project;
});
