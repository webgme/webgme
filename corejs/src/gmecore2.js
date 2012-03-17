/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "gmeassert" ], function (ASSERT) {
	"use strict";

	// ----------------- Cache -----------------

	/**
	 * We store storage objects here indexed by hash. The storage objects will
	 * have an invisible refcount property to manage the lifetime of objects.
	 * All projects and branches share a common cache.
	 */
	var cache = {};

	// detect memory leaks
	if( window ) {
		var oldUnload = window.onunload;
		window.onunload = function () {
			if( oldUnload ) {
				oldUnload();
			}

			var hash;
			for( hash in cache ) {
				window.alert("Warning, you have a memory leak");
				break;
			}
		};
	}

	// ----------------- Node -----------------

	var NODE = {
		unknown: "unknown"
	};

	var Node = function (parent, relid) {
		ASSERT(typeof relid === "string");
		ASSERT(parent === null || parent instanceof Node);

		Object.defineProperties(this, {
			parent: {
				value: parent,
				enumerable: false,
				writable: false
			},
			level: {
				value: parent === null ? 0 : parent.level + 1,
				enumerable: true,
				writable: false
			},
			relid: {
				value: relid,
				enumerable: true,
				writable: false
			},
			state: {
				value: NODE.unknown,
				enumerable: true,
				writable: true
			}
		});
	};

	Object.defineProperties(Node.prototype, {
		path: {
			get: function () {
				return this.parent === null ? "" : this.parent.getPath() + "."
						+ this.relid;
			}
		},
		root: {
			get: function () {
				var node = this;
				while( node.parent !== null ) {
					node = node.parent;
				}
				return node;
			}
		}
	});

	var loadNode = function (node, hash) {
		ASSERT(node instanceof Node);
		ASSERT(typeof hash === "string");

	};

	// ----------------- Project -----------------

	var PROJECT = {
		closed: "closed",
		opened: "opened"
	};

	var Project = function () {
		this.status = PROJECT.closed;
		this.root = null;
	};

	Project.prototype.open = function (connection) {
		ASSERT(connection === "server");

		var that = this;
		window.setTimeout(function () {
			that.status = PROJECT.opened;
			that.onopen();
		}, 100);
	};

	Project.prototype.close = function (callback) {
		var that = this;
		window.setTimeout(function () {
			that.status = PROJECT.closed;
			that.onclose();
		}, 100);
	};

	Project.prototype.onopen = function () {
		window.alert("GmeCore: unhandled onopen");
	};

	Project.prototype.onerror = function () {
		window.alert("GmeCore: unhandled onerror");
	};

	Project.prototype.onclose = function () {
		window.alert("GmeCore: unhandled onclose");
	};

	Project.prototype.modify = function () {
	};

	Project.prototype.commit = function () {
	};

	Project.prototype.abort = function () {
	};

	// ----------------- Public Interface -----------------

	return {
		Project: Project
	};
});
