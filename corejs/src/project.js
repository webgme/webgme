/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "gmeassert" ], function (ASSERT) {
	"use strict";

	var Project = function() {
	};

	Project.prototype.open = function (connection) {
	};
	
	Project.prototype.onOpen = function() {
	};
	
	Project.prototype.close = function () {
	};

	/**
	 * Creates a new query object.
	 */
	Project.prototype.createQuery = function() {
	};

	Project.prototype.deleteQuery = function() {
	};
	
	Project.prototype.getQueries = function() {
	};
	
	return Project;
});
