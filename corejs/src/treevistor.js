/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "gmeassert", "loader" ], function(ASSERT, loader) {
	"use strict";

	var Node = function(parent) {
		ASSERT(parent === null || parent instanceof Node);

		Object.defineProperties(this, {
			parent : {
				value : parent,
				enumerable : false, // to allow serialization
				writable : false
			}
		});
	};

	Object.defineProperties(Node.prototype, {
		expand : {
			value : function() {
				if (this.children)
					return;

				this.children = {};

			}
		}
	});

	var updateNode = function(node, hash) {
		ASSERT(node.data);

		// if nothing changed, then stop traversing
		if (node.data.hash === hash) {
			return;
		}

		loader.load(hash, function(new_data) {
			var relid;
			var new_children = new_data.children || {};

			for (relid in node.children) {
				if (!(relid in new_children)) {
					// emit event
					delete node.children[relid];
				}
			}

			for (relid in new_children) {
				if (relid in node.children) {
					updateNode(node.children[relid], new_children[relid]);
				}
			}
		});
	};

	// ----------------- node -----------------

	var nodeMethods = {

		/**
		 * Returns the relid of this node.
		 * 
		 * @return the relid of this node.
		 */
		get relid() {
			ASSERT(this.parent !== undefined);
			if (this.parent === null) {
				return "";
			}

			ASSERT(this.parent.children);
			for ( var relid in this.parent.children) {
				if (this.parent.children[relid] === this)
					return relid;
			}

			ASSERT(false);
		},

		/**
		 * Returns the path of this object by walking to the root of the
		 * tree and querying the relid.
		 * 
		 * @return the path of this node
		 */
		get path() {
			return this.parent === null ? "" : this.parent.getPath() + "/"
					+ this.relid;
		},

		get : function() {
			}
		},
		
		/**
		 * Returns true if this node is expanded, that is if we track its children.
		 * 
		 * @return true if this node is expanded
		 */
		get isExpanded() {
			return !!this.children;
		},
			
		get name() {
			var data = this.data || {};
			var attr = data.attributes || {};
			return attr.name || "unknown";
		},
			
		/**
		 * Called just after a new child node is added to an expanded parent
		 * because of a database update.
		 * 
		 * @param node
		 *            the new child node
		 */
		onAdded : function() {
			console.log("node added " + this.path);
		},

		/**
		 * Called just before a child node and all its children are removed from
		 * an expanded parent because of a database update. This call is not
		 * recursive, so it is not called for the children of the removed node.
		 * 
		 * @param node
		 *            the node that is being removed
		 */
		onRemoved : function() {
			console.log("node removed " + this.path);
		},

		/**
		 * This event is fired when the name of a node has changed because of a
		 * database update.
		 * 
		 * @param node
		 *            the node whose name has changed
		 */
		onChanged : function() {
			console.log("node changed " + this.path + " with name "
					+ this.name);
		},
		
		expand : function() {
		}
		
	};

	// ----------------- tree -----------------

	var treeProto = {

		/**
		 * This method must be called from the GUI when we want to load the
		 * children of the current node. The onNodeAdded event will be called
		 * for each new child once they are loaded from the database.
		 * 
		 * @param node
		 *            the node to be expanded
		 */
		expandNode : function(node) {
			ASSERT(node.tree === this);
		}
	};

	var createTree = function() {
		var tree = Object.create(treeProto);

		/**
		 * We create an event handler node object whose instances will be the
		 * contained nodes.
		 */
		tree.nodeEvents = Object.create(nodeMethods);

		tree.root = Object.create(tree.handler);

		return tree;
	};

	// ----------------- Public Interface -----------------

	return {
		create : function() {
			return new Tree();
		}
	};
});
