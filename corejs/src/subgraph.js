/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "gmeassert" ], function (ASSERT) {
	"use strict";

	// ----------------- node -----------------

	var nodeCount = 0;

	var Node = function () {
		Object.defineProperties(this, {
			/**
			 * Every node has a hidden private id property that uniquely
			 * identifies the node in the graph within a given revision. This
			 * property could be used to compare nodes in different subgraph
			 * fragments coming from even different revisions, however you
			 * should use the compare method.
			 */
			__id__: {
				value: ++nodeCount,
				writable: false,
				enumerable: false
			},

			/**
			 * This is a hidden field containing the attributes of the node. You
			 * should use the public getter and setter methods to access the
			 * attributes.
			 */
			__attributes__: {
				value: {},
				writable: true,
				enumerable: false
			}
		});
	};

	/**
	 * Returns true if this node is conceptually the same as the one passed in
	 * as an argument. Each client side fragment is a subgraph of the same
	 * object graph stored on the server. The same server side node in different
	 * fragment subgraphs are represented by different client side javascipt
	 * objects, but their identities are the same and this method must return
	 * true for them. The identity of an object never changes between revisions
	 * except when the object is deleted or in some implementations when it is
	 * moved in the containment hierarchy. With regular access it is impossible
	 * to recreate an object with the same identity as another one (only backup
	 * and restore functions should be able to do that).
	 */
	Node.prototype.compare = function (node) {
		return this.__id__ === node.__id__;
	};

	/**
	 * Returns the value of the given attribute stored in this object.
	 */
	Node.prototype.getAttribute = function (name) {
		return this.__attributes__[name];
	};

	/**
	 * Modifies the given attribute of the node. Note, that changes in this
	 * subgraph fragment does not and should not propagate to other fragments
	 * even they are in the same client. Inside the same subgraph fragment the
	 * attribute values can (but do not have to) propagate in the prototype
	 * hierarchy.
	 */
	Node.prototype.setAttribute = function (name, value) {
		this.__attributes__[name] = value;
	};

	/**
	 * Deletes the attribute value, and if this node is a subtype of another
	 * node, then the value returned for this attribute will be the one stored
	 * by the prototype. The same rules apply as for setAttribute, that is, this
	 * propagation need not be performed automatically.
	 */
	Node.prototype.deleteAttribute = function (name) {
		delete this.__attributes__[name];
	};

	Node.prototype.getPointer = function (name) {
	};

	Node.prototype.setPointer = function (name, node) {
	};

	Node.prototype.deletePointer = function (name) {
	};

	/**
	 * Returns a unordered set of objects indexed by their id.
	 */
	Node.prototype.getCollection = function (name) {
	};

	Node.prototype.loadPointer = function (name, callback) {
	};

	Node.prototype.loadCollection = function (name, callback) {
	};

// ----------------- subgraph -----------------

	var Subgraph = function (revid) {
	};

	Subgraph.getNode = function (id) {
	};

	Subgraph.getRevisionId = function () {
	};
	
});
