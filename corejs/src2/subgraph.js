/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert", "cache" ], function (ASSERT, cache) {
	"use strict";

	// ----------------- node -----------------

	/**
	 * Each node object is derived from this object. This object contains only
	 * the shared methods. The static variables are stored on a unique derived
	 * object for each subtree. Then node variables are initialized by the
	 * initParent function.
	 */
	var nodeProto = {};

	/**
	 * This method will be called on freshly created objects to set up their
	 * identity.
	 */
	var initParent = function (node, parent, relid) {
		ASSERT(nodeProto.isPrototypeOf(node));
		ASSERT(typeof relid === "string");
		ASSERT(parent === null || nodeProto.isPrototypeOf(node));

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
			}
		});
	};

	/**
	 * Every node has a nodeid property that uniquely identifies the node in the
	 * graph within a given revision. This property could be used to compare
	 * nodes in different subgraph fragments coming from even different
	 * revisions (use the compare method which is faster) or to load the same
	 * object in a different subgraph.
	 * 
	 * Each client side fragment is a subgraph of the same object graph stored
	 * on the server. The same server side node in different fragment subgraphs
	 * are represented by different client side javascipt objects, but their
	 * identities are the same and this method must return true for them. The
	 * identity of an object never changes between revisions except when the
	 * object is deleted or in some implementations when it is moved in the
	 * containment hierarchy. With regular access it is impossible to recreate
	 * an object with the same identity as another one (only backup and restore
	 * functions should be able to do that).
	 * 
	 * This implementation returns the path of the node in the containment
	 * hierarchy.
	 */
	Object.defineProperty(nodeProto, "id", {
		get: function () {
			return this.parent === null ? "" : this.parent.getPath() + "."
			+ this.relid;
		}
	});

	/**
	 * Returns true if this node is conceptually the same as the one passed in
	 * as an argument.
	 */
	nodeProto.compare = function (node) {
		ASSERT(node.isProrotypeOf(nodeProto));

		if( this.relid !== node.relid || this.level !== node.level ) {
			return false;
		}

		var other = this;
		do {
			other = other.parent;
			node = node.parent;
		} while( other !== node && other.relid === node.relid );

		return other === node;
	};

	/**
	 * Returns the value of the given attribute stored in this object.
	 */
	nodeProto.getAttribute = function (name) {
		ASSERT(this.data && this.data.attr);
		return this.data.attr[name];
	};

	/**
	 * This method makes a copy of the data object and allows subsequent 
	 * modification.
	 */
	var makeDirty = function() {
		ASSERT(this.data);
		
		if(this.data.hash) {
			ASSERT(typeof this.data.hash === "string");

			var old = this.data;
			var copy = {
				attr: {}
			};
			
			for(var name in old.attr) {
				copy.attr[name] = old.attr[name];
			}
			
			cache.release(old);
		}
	};

	/**
	 * Modifies the given attribute of the node. Note, that changes in this
	 * subgraph fragment does not and should not propagate to other fragments
	 * even they are in the same client. Inside the same subgraph fragment the
	 * attribute values can (but do not have to) propagate in the prototype
	 * hierarchy.
	 */
	nodeProto.setAttribute = function (name, value) {
		makeDirty(this);
		this.data.attr[name] = value;
	};

	/**
	 * Deletes the attribute value, and if this node is a subtype of another
	 * node, then the value returned for this attribute will be the one stored
	 * by the prototype. The same rules apply as for setAttribute, that is, this
	 * propagation need not be performed automatically.
	 */
	nodeProto.deleteAttribute = function (name) {
		makeDirty(this);
		delete this.data.attr[name];
	};

	nodeProto.getPointer = function (name) {
		if(name === "parent") {
			return this.parent;
		}
		
		return undefined;
	};

	nodeProto.setPointer = function (name, node) {
		ASSERT(false);
	};

	nodeProto.deletePointer = function (name) {
		ASSERT(false);
	};

	/**
	 * Returns a unordered set of objects indexed by their id.
	 */
	nodeProto.getCollection = function (name) {
		if(name === "children") {
			return this.children;
		}

		return undefined;
	};

	nodeProto.getCollectionCount = function (name) {
	};

	nodeProto.loadPointer = function (name, callback) {
	};

	nodeProto.loadCollection = function (name, callback) {
	};

	nodeProto.loadCollectionCount = function (name, callback) {
	};

	// ----------------- subgraph -----------------

	var Subgraph = function (revid) {
	};

	Subgraph.getNode = function (nodeid) {
	};

	Subgraph.getRevisionId = function () {
	};

});
