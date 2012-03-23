/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "gmeassert", "loader" ], function (ASSERT, loader) {
	"use strict";

	// ----------------- data -----------------

	var getHash = function (data) {
		ASSERT(typeof data.hash === "string");
		return data.hash;
	};
	
	var getName = function (data) {
		ASSERT(data);
		var attr = data.attributes || {};
		return attr.name || "unknown";
	};

	var hasChildren = function (data) {
		ASSERT(data);

		var relid;
		for( relid in data.children ) {
			return true;
		}

		return false;
	};

	// ----------------- node -----------------

	var nodeProto = {};

	Object.defineProperties(nodeProto, {
		relid: {
			enumerable: true,
			get: function () {
				ASSERT(this.parent !== undefined);
				if( this.parent === null ) {
					return "";
				}
				ASSERT(this.parent.children);
				for( var relid in this.parent.children ) {
					if( this.parent.children[relid] === this ) {
						return relid;
					}
				}
				ASSERT(false);
			}
		},

		path: {
			enumerable: true,
			get: function () {
				return this.parent === null ? "" : this.parent.getPath() + "/"
				+ this.relid;
			}
		},

		name: {
			enumerable: true,
			get: function () {
				return getName(this.data);
			}
		},

		isExpanded: {
			enumerable: true,
			get: function () {
				return !!this.children;
			}
		},

		hasChildren: {
			enumerable: true,
			get: function () {
				hasChildren(this.data);
			}
		}
	});

	/**
	 * Called just after a new child node is added to an expanded parent because
	 * of a database update.
	 */
	nodeProto.onAdded = function () {
		console.log("node added " + this.path);
	};

	/**
	 * Called just before a child node and all its children are removed from an
	 * expanded parent because of a database update. This event is not recursive,
	 * so it is not called for the children of the removed node, even though
	 * those nodes will be also removed.
	 */
	nodeProto.onRemoved = function () {
		console.log("node removed " + this.path);
	};

	/**
	 * This event is fired when the name of a node has changed because of a
	 * database update.
	 */
	nodeProto.onNameChanged = function () {
		console.log("node changed " + this.path + " with name " + this.name);
	};

	/**
	 * This event is fired on a non-expanded node when the hasChildren property
	 * has changed because of a database update.
	 */
	nodeProto.onHasChildrenChanged = function () {
		console.log("node changed " + this.path + " with name " + this.name);
	};

	/**
	 * Takes a data hash value describing the full subtree hierarchy and updates
	 * the subtree to reflect the new state. This method will not only modify
	 * the subtree but also will call the appropriate events above. If data is
	 * missing, then it will request the necessary data from the storage and complete
	 * the update in possibly several steps.
	 * 
	 * @param hash the new hash value to be set at this node
	 */
	nodeProto.update = function (hash) {
		ASSERT(this.data);

		// if nothing changed, then stop traversing
		if( getHash(this.data) === hash ) {
			return;
		}

		var that = this;
		loader.load(hash, function (new_data) {
			var relid;
			
			var old_data = that.data;
			that.data = new_data;

			if( getName(old_data) !== getName(new_data) ) {
				that.onNameChanged();
			}

			if( that.children ) {
				var new_children = new_data.children || {};
				for( relid in that.children ) {
					if( !(relid in new_children) ) {
						that.children[relid].onRemoved();
						delete that.children[relid];
					}
				}

				for( relid in new_children ) {
					if( relid in that.children ) {
						that.children[relid].update(new_children[relid]);
					}
					else {

					}
				}
			}
			else {
				if( hasChildren(old_data) !== hasChildren(new_data) ) {
					that.onHasChildrenChanged();
				}
			}
		});
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

	// ----------------- interface -----------------

	return createTree;
});
