/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert", "cache", "sha1" ], function (ASSERT, cache) {
	"use strict";

	var relidPow = Math.pow(36, 6);
	var generateRelid = function () {
		return Math.floor(Math.random() * relidPow).toString(36);
	};

	// ----------------- node -----------------

	/**
	 * Each node object is derived from this object. This object contains only
	 * the shared methods. The static variables are stored in a unique derived
	 * object for each subtree. Regular node variables are initialized by the
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

		Object.defineProperties(node, {
			parent: {
				value: parent,
				enumerable: false,
				writable: false,
				configurable: true
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
			children: {
				value: {},
				enumerable: true,
				writable: true,
				configurable: true
			}
		});
	};

	/**
	 * Initializes the content of this node to be empty with no attributes and
	 * makes it dirty.
	 */
	var initData = function (node) {
		ASSERT(!node.data);

		node.data = {
			attributes: {},
			children: {}
		};
	};

	/**
	 * This method loads the data specified by the hash into this node object.
	 */
	var loadData = function (node, hash) {
		ASSERT(node && !node.data);
		ASSERT(typeof hash === "string");

		node.data = cache.get(hash);
		ASSERT(node.data && node.data.hash === hash);
	};

	/**
	 * This method returns true if this node is dirty (that is either this node
	 * or any of its children has been modified).
	 */
	var isDirty = function (node) {
		ASSERT(node && node.data);
		ASSERT(node.data.hash === undefined
		|| typeof node.data.hash === "string");

		return !node.data.hash;
	};

	/**
	 * This method makes a copy of the data object and allows subsequent
	 * modification. It also makes the parent dirty recursively all the way up
	 * to the root.
	 */
	var makeDirty = function (node) {
		ASSERT(node.data);

		while( node.data.hash ) {
			ASSERT(!isDirty(node));

			var old = node.data;
			var copy = {
				attributes: {}
			};

			for( var name in old.attributes ) {
				copy.attributes[name] = old.attributes[name];
			}
			node.data = copy;

			cache.release(old);

			// go to the parent
			node = node.parent;
			if( node === null ) {
				break;
			}

			ASSERT(node.data);
		}
	};

	var saveData = function (node) {
		ASSERT(isDirty(node));

		for( var relid in node.children ) {
			if( isDirty(node.children[relid]) ) {
				saveData(node.children[relid]);
			}

			ASSERT(node.data.children[relid] === undefined
			|| node.data.children[relid] === node.children[relid].data.hash);

			node.data.children[relid] = node.children[relid].data.hash;
		}

		var json = JSON.stringify(node.data);

		Object.defineProperties(node.data, {
			json: {
				value: json,
				enumerable: false,
				writable: false
			},
			hash: {
				value: SHA1(json),
				enumerable: true,
				writable: false
			}
		});

		node.data = cache.add(node.data);
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
			ASSERT(other && node);
			other = other.parent;
			node = node.parent;
		} while( other !== node && other.relid === node.relid );

		return other === node;
	};

	/**
	 * Returns the child (or grand child, etc) of this node given by a relative
	 * path. If the relative path is the empty "" string, then this node is
	 * returned. If the relative path is the "/relid", then a child is returned.
	 * If the relative path is "/relid1/relid2", then a grand child is returned,
	 * etc.
	 */
	var getChildByPath = function (node, path) {
		ASSERT(typeof path === "string");

		var relids = path.split("/");
		ASSERT(relids[0] === "");

		for( var i = 1; node && i < relids.length; ++i ) {
			node = node.children[relids[i]];
		}

		return node;
	};

	/**
	 * Returns the value of the given attribute stored in this object.
	 */
	nodeProto.getAttribute = function (name) {
		ASSERT(this.data && this.data.attributes);

		return this.data.attributes[name];
	};

	/**
	 * Modifies the given attribute of the node. Note, that changes in this
	 * subgraph fragment does not and should not propagate to other fragments
	 * even they are in the same client. Inside the same subgraph fragment the
	 * attribute values can (but do not have to) propagate in the prototype
	 * hierarchy.
	 */
	nodeProto.setAttribute = function (name, value) {
		ASSERT(this.data && this.data.attributes);

		makeDirty(this);
		this.data.attributes[name] = value;
	};

	/**
	 * Deletes the attribute value, and if this node is a subtype of another
	 * node, then the value returned for this attribute will be the one stored
	 * by the prototype. The same rules apply as for setAttribute, that is, this
	 * propagation need not be performed automatically.
	 */
	nodeProto.deleteAttribute = function (name) {
		ASSERT(this.data && this.data.attributes);

		makeDirty(this);
		delete this.data.attributes[name];
	};

	nodeProto.getParent = function () {
		return this.parent;
	};

	/**
	 * Moves the current node to the new location
	 */
	nodeProto.setParent = function (parent) {
		ASSERT(nodeProto.isPrototypeOf(parent));
		ASSERT(this.parent === undefined);

		var relid = generateRelid();
		initParent(this, parent, relid);
		parent.children[relid] = this;
	};

	/**
	 * This method returns the list of loaded children. The children list is
	 * always partial. The actual number of children is always stored in the
	 * data property (with hashes or undefined).
	 */
	nodeProto.getChildren = function () {
		return this.children;
	};

	/**
	 * Unloads this node and its children recursively
	 */
	var unloadNode = function(node) {
		ASSERT(node.children);
		ASSERT(node.data);
		
		for(var relid in node.children) {
			unloadNode(node.children[relid]);
		}

		if( node.data.hash ) {
			cache.release(node.data);
		}

		delete node.children;
		delete node.parent;
		delete node.data;
	};

	// ----------------- subgraph -----------------

	var subgraphProto = {};
	
	var initSubgraph = function (subgraph) {
		/**
		 * We have our own node prototype to store the owner graph
		 */
		subgraph.nodeProto = Object.create(nodeProto, {
			subgraph: {
				value: subgraph,
				enumerable: false,
				writable: false
			}
		});
	};

	/**
	 * We look up in this subgraph the node with the given node id. If the
	 * subgraph does not contain (either because it is not loaded or this
	 * version does not even have that a node with that node id) a node with the
	 * given id, then undefined is returned.
	 * 
	 * This implementation looks up the node by its path
	 */
	subgraphProto.getNode = function (nodeid) {
		ASSERT(this.isOpened());
		
		ASSERT(typeof nodeid === "string");
		return getChildByPath(this.root, nodeid);
	};

	subgraphProto.createNode = function () {
		ASSERT(this.isOpened());

		var node = Object.create(this.nodeProto);

		initData(node);
		return node;
	};

	subgraphProto.isOpened = function() {
		return !!this.root;
	};
	
	subgraphProto.open = function (commitid) {
		ASSERT(!this.isOpened());
		
		if(commitid === undefined) {
			this.root = Object.create(this.nodeProto);
			initParent(this.root, null, "");
			initData(this.root);
		}
		else {
			ASSERT(false);
		}
	};
	
	subgraphProto.save = function () {
		ASSERT(this.isOpened());

		if( isDirty(this.root) ) {
			saveData(this.root);
		}
	};
	
	subgraphProto.close = function () {
		ASSERT(this.isOpened());
		
		unloadNode(this.root);
		delete this.root;
	};
	
	// ----------------- public interface -----------------

	var Subgraph = function() {
		initSubgraph(this);
	};

	Subgraph.prototype = subgraphProto;
	
	return Subgraph;
});
