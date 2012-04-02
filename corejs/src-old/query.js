/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "gmeassert" ], function (ASSERT) {
	"use strict";

	var Query = function() {
	};

	Query.prototype.addPattern = function(nodeid, type) {
	};
	
	Query.prototype.deletePattern = function(nodeid, type) {
	};
	
	Query.prototype.getPatterns = function () {
	};

	/**
	 * Returns the project this query belongs to.
	 */
	Query.prototype.project = function () {
	};

	/**
	 * Returns the given node if it is loaded into the client, undefined
	 * otherwise (it might not exists or not loaded yet). There is a special
	 * starting node id, which is "root" if one wants to explore all nodes.
	 * 
	 * @param nodeid the nodeid of the node to be loaded
	 */
	Query.prototype.getNode = function(nodeid) {
	};
	
	/**
	 * Called by the entity manager when a new revision is available.
	 *
	 * @param subgraph a new subgraph with a new revision
	 */
	Query.prototype.onRefresh = function () {
	};
});
