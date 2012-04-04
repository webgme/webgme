/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert" ], function (ASSERT) {
	"use strict";

	// ----------------- node -----------------

	var Node = function (parent, relid, level) {
		ASSERT(parent === null || parent instanceof Node);
		ASSERT(typeof relid === "string");

		this.parent = parent;
		this.relid = relid;
		this.level = level;
		this.refcount = 0;
		this.children = {};
	};

	/**
	 * Special root object that is never deleted
	 */
	var root = new Node(null, "", 0);
	root.refcount = 1;

	var emptyNodes;

	var removeEmptyNodes = function () {
		ASSERT(emptyNodes);

		while( emptyNodes.length ) {
			var node = emptyNodes.pop();
			ASSERT(node.refcount === undefined || node.refcount >= 0);
			ASSERT(node !== root);

			if( node.refcount === 0 ) {
				/**
				 * We carefully adding nodes to the empty list
				 * so that every removable object should have all
				 * its children already removed. If the next assertion
				 * fails, then someone has added data to a node, not
				 * to the parent. 
				 */
				ASSERT(node.leaf);

				ASSERT(node.parent.children[node.relid] === node);

				// remove from parent
				delete node.parent.children[node.relid];

				// to avoid to delete the same node multiple times
				delete node.parent;
				delete node.refcount;
			}
		}

		emptyNodes = undefined;
	};

	var addEmptyNode = function (node) {
		ASSERT(node instanceof Node);
		ASSERT(node.refcount === 0);
		ASSERT(node !== root);

		if( emptyNodes ) {
			emptyNodes.push(node);
		}
		else {
			emptyNodes = [ node ];
			setTimeout(removeEmptyNodes, 0);
		}
	};

	// create getter methods
	Object.defineProperties(Node.prototype, {
		/**
		 * The leaf property is true if the node has no children
		 */
		leaf: {
			get: function () {
				var relid;
				for( relid in this.children ) {
					return false;
				}
				return true;
			}
		},

		/**
		 * The empty property is true if the node has no associated data
		 */
		empty: {
			get: function () {
				return this.refcount === 0;
			}
		},

		/**
		 * The path property contains the path of this node. This is a slow
		 * method, you should not use it.
		 */
		path: {
			get: function () {
				return this.parent ? this.parent.path + "/" + this.relid : "";
			}
		}
	});

	Node.prototype.getChild = function (relid) {
		ASSERT(typeof relid === "string");

		var node = this.children[relid];
		ASSERT(node === undefined || node instanceof Node);

		if( !node ) {
			node = new Node(this, relid, this.level + 1);
			addEmptyNode(node);
			this.children[relid] = node;
		}

		return node;
	};

	// ----------------- treemap -----------------

	var unusedIds = [];
	var idCount = 0;

	var Treemap = function () {
		this.id = unusedIds.length !== 0 ? unusedIds.pop() : "+" + idCount++;
		this.root = root;
	};

	/**
	 * Removes all data associated with this treemap and destroys this tree
	 * object.
	 */
	Treemap.prototype.destroy = function () {
		this.clearAll();

		unusedIds.push(this.id);
		delete this.id;
	};

	/**
	 * Removes all node data associated with this tree object
	 */
	Treemap.prototype.clearAll = function () {
		this.deleteData(root);
	};

	/**
	 * Returns the node at the given path. This is a slow method, you should not
	 * use it.
	 */
	Treemap.prototype.getNode = function (path) {
		ASSERT(this.id);
		ASSERT(typeof path === "string");

		var relids = path.split("/");
		ASSERT(relids[0] === "");

		var node = root;
		for( var i = 1; node && i < relids.length; ++i ) {
			node = node.getChild(relids[i]);
		}

		return node;
	};

	Treemap.prototype.hasData = function (node) {
		ASSERT(this.id && node instanceof Node);

		return node.hasOwnProperty(this.id);
	};

	/**
	 * Assigns new data to this node. Note, that you MUST
	 * make sure that the parent will have data assigned as well,
	 * otherwise many methods will not work (e.g. deleteData,
	 * and removeEmptyNodes).
	 */
	Treemap.prototype.setData = function (node, data) {
		ASSERT(this.id && node instanceof Node);

		if( !node.hasOwnProperty(this.id) ) {
			++node.refcount;
		}

		node[this.id] = data;
	};

	Treemap.prototype.getData = function (node) {
		ASSERT(this.id && node instanceof Node);

		return node[this.id];
	};

	/**
	 * Recursively deletes data associated with this node and all of its
	 * descendants.
	 */
	Treemap.prototype.deleteData = function (node) {
		ASSERT(this.id && node instanceof Node);

		if( node.hasOwnProperty(this.id) ) {
			delete node[this.id];

			// we have to push parent empty nodes first
			if( --node.refcount === 0 ) {
				addEmptyNode(node);
			}

			for( var relid in node.children ) {
				this.deleteData(node.children[relid]);
			}
		}
	};

	var stringifyNode = function (node, id) {
		ASSERT(node instanceof Node);
		ASSERT(node.hasOwnProperty(id));

		var c = "";
		for( var relid in node.children ) {
			var child = node.children[relid];
			if( child.hasOwnProperty(id) ) {
				c += (c ? ',"' : '"') + relid + '":' + stringifyNode(child, id);
			}
		}

		if( c ) {
			c = ",children:{" + c + "}";
		}

		return "{data:" + JSON.stringify(node[id]) + c + "}";
	};

	/**
	 * Returns the JSON representation of this tree.
	 */
	Treemap.prototype.saveToJSON = function () {
		ASSERT(this.id);

		if( root.hasOwnProperty(this.id) ) {
			return stringifyNode(root, this.id);
		}
		else {
			return "{}";
		}
	};

	// ----------------- public interface -----------------

	return Treemap;
});
