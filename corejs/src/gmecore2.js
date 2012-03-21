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
		removed: "removed",
		unloaded: "unloaded",
		loaded: "loaded"
	};

	var nodeCount = 0;

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
			nodeid: {
				value: ++nodeCount,
				enumerable: true,
				writable: false
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

	Node.prototype.oncreated = function () {
		ASSERT(this.state === NODE.unloaded);
		console.log("node " + this.nodeid + " created");
	};

	Node.prototype.onremoved = function () {
		ASSERT(this.state === NODE.removed);
		console.log("node " + this.nodeid + " removed");
	};

	Node.prototype.onloaded = function () {
		ASSERT(this.state === NODE.loaded);
		console.log("node " + this.nodeid + " " + this.hash + " loaded");
	};

	Node.prototype.onunloaded = function () {
		ASSERT(this.state === NODE.unloaded);
		console.log("node " + this.nodeid + " " + this.hash + " unloaded");
	};

	Node.prototype.onmodified = function () {
		ASSERT(this.state === NODE.unloaded || this.state === NODE.loaded);
		console.log("node " + this.nodeid + " " + this.hash + " modified");
	};

	var removeNode = function (node) {
		ASSERT(node instanceof Node);
		ASSERT(node.state === NODE.loaded || node.state === NODE.unloaded);

		if( node.state === NODE.loaded ) {
			unloadNode(node);
		}

		ASSERT(typeof node.hash === "string");
		delete node.hash;

		node.state = NODE.removed;
		node.onremoved();
	};

	var createNode = function (parent, relid, hash) {
		ASSERT(parent instanceof Node);
		ASSERT(typeof hash === "string");
		
		var node = new Node(parent, relid);
		node.state = NODE.unloaded;
		node.hash = hash;
		
		node.oncreated();
		return node;
	};
	
	var unloadNode = function (node) {
		ASSERT(node instanceof Node);
		ASSERT(node.state === NODE.loaded);
		ASSERT(node.children !== undefined);

		for( var relid in node.children ) {
			removeNode(node.children[relid]);
		}

		delete node.children;
		delete node.attributes;
		ASSERT(typeof node.hash === "string");

		node.state = NODE.unloaded;
		node.onunloaded();
	};

	var loadNode = function (node) {
		ASSERT(node instanceof Node);
		ASSERT(node.state === NODE.unloaded);
		ASSERT(typeof node.hash === "string");
	};

	var modifyNode = function (node, hash) {
		ASSERT(node instanceof Node);
		ASSERT(typeof hash === "string");
	};
	
	var modifyChildren = function (node, data) {
		var data_children = data.children || {};
		var node_children = node.children;
		var children = {};

		for( var relid in data_children ) {
			var hash = data_children[relid];
			ASSERT(typeof hash === "string");

			var child = node_children[relid];
			if( !child ) {
				ASSERT(child === undefined);
				child = createNode(node, relid, hash);
			}
			else {
				ASSERT(child instanceof Node);
				if( child.hash !== hash ) {
					modifyNode(child, hash);
				}
				delete node_children[relid];
			}

			children[relid] = child;
		}

		for( relid in node_children ) {
			removeNode(node_children[relid]);
		}

		node.children = children;
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
