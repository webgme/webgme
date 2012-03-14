/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "gmeassert" ], function (ASSERT) {
	"use strict";

	// ----------------- project -----------------

	var CLOSED = "closed";
	var OPENED = "opened";

	var CoreProject = function () {
		this.status = CLOSED;
		this.root = null;
	};

	CoreProject.prototype.open = function (connection) {
		ASSERT(connection === "server");

		var that = this;
		window.setTimeout(function () {
			that.status = OPENED;
			that.onopen();
		}, 100);
	};

	CoreProject.prototype.close = function (callback) {
		var that = this;
		window.setTimeout(function () {
			that.status = CLOSED;
			that.onclose();
		}, 100);
	};

	CoreProject.prototype.onopen = function () {
		window.alert("GmeCore: unhandled onopen");
	};
	
	CoreProject.prototype.onerror = function () {
		window.alert("GmeCore: unhandled onerror");
	};
	
	CoreProject.prototype.onclose = function () {
		window.alert("GmeCore: unhandled onclose");
	};

	CoreProject.prototype.modify = function () {
	};

	CoreProject.prototype.commit = function () {
	};
	
	CoreProject.prototype.abort = function () {
	};
	
	// ----------------- public interface -----------------

	return {
		Project: CoreProject
	};
});
