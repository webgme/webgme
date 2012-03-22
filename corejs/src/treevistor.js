/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "gmeassert", "loader" ], function (ASSERT, loader) {
	"use strict";

	var Node = function (parent) {
		ASSERT(parent === null || parent instanceof Node);
		Object.defineProperties(this, {
			parent: {
			value: parent,
			enumerable: false, // to allow serialization
			writable: false
			}
		});
	};

	var updateNode = function (node, hash) {
		ASSERT(node.data);

		// if nothing changed, then stop traversing
		if( node.data.hash === hash ) {
			return;
		}

		loader.load(hash, function (new_data) {
			var relid;
			var new_children = new_data.children || {};
			for( relid in node.children ) {
				if( !(relid in new_children) ) {
					// emit event
					delete node.children[relid];
				}
			}
			for( relid in new_children ) {
				if( relid in node.children ) {
					updateNode(node.children[relid], new_children[relid]);
				}
			}
		});
	};

	// ----------------- node -----------------

	/**
	 * Called just after a new child node is added to an expanded parent because
	 * of a database update.
	 */
	nodeProto.onAdded = function () {
		console.log("node added " + this.path);
	};

	var nodeProto = {
/*
 * // ------- getters -------
 * 
 * get relid() { ASSERT(this.parent !== undefined); if (this.parent === null) {
 * return ""; } ASSERT(this.parent.children); for (var relid in
 * this.parent.children) { if (this.parent.children [ relid ] === this) { return
 * relid; } } ASSERT(false); },
 * 
 * get path() { return this.parent === null ? "" : this.parent.getPath() + "/" +
 * this.relid; },
 * 
 * get expanded() { return !!this.children; },
 * 
 * get name() { var data = this.data || {}; var attr = data.attributes || {};
 * return attr.name || "unknown"; },
 */
	// ------- default event handlers -------
	/**
	 * Called just before a child node and all its children are removed from an
	 * expanded parent because of a database update. This call is not recursive,
	 * so it is not called for the children of the removed node.
	 */
	onRemoved: function () {
		console.log("node removed " + this.path);
	},

	/**
	 * This event is fired when the name of a node has changed because of a
	 * database update.
	 */
	onChanged: function () {
		console.log("node changed " + this.path + " with name " + this.name);
	},

	// ------- commands -------

	expand: function () {
	}
	};

	// ----------------- tree -----------------

	var treeProto = {};

	var createTree = function () {
		var tree = Object.create(treeProto);

		/**
		 * We create an event handler node whose instances will be the contained
		 * nodes.
		 */
		tree.handler = Object.create(nodeProto);

		tree.root = Object.create(tree.handler);

		return tree;
	};

	// ----------------- Public Interface -----------------

	return createTree;

});
