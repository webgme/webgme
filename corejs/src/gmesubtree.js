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

	// ----------------- Nodes -----------------

	/**
	 * Unloads the storage objects associated with this object and all of its
	 * children.
	 */
	var unloadTree = function (node) {
		// unload children first
		ASSERT(node.children);
		for( var relid in node.children ) {
			unloadTree(node.children[relid]);
		}
		delete node.children;

		// unload object from cache
		ASSERT(typeof node.data === "object");
		ASSERT(node.data.refcount >= 1);
		if( --node.data.refcount === 0 ) {
			ASSERT(cache[node.data.hash] === node.data);
			delete cache[node.data.hash];
		}
		delete node.data;

		// detach parent
		delete node.parent;
	};

	// ----------------- Loader -----------------

	/**
	 * Loader class loads objects in a territory specified by the given pattern
	 * using a storage request.
	 */
	var Loader = function (request) {
		this.request = request;

		/*
		 * This array contains the nodes whose data is not yet loaded and
		 * contains only the hash of the data. Also, these nodes have an array
		 * of patterns that need to be executed once the data is available.
		 */
		this.missing = [];
	};

	/**
	 * Returns the storage data identified by the hash value and
	 * increases the refcount on the object.
	 *  
	 * @param hash the hash of the storage data
	 * @returns the storage data or undefined
	 */
	Loader.prototype.getData = function (hash) {
		ASSERT(typeof hash === "string");

		// check in the cache
		var data = cache[hash];
		if( data ) {
			ASSERT(data.hash === hash);
			ASSERT(data.refcount >= 1);

			++data.refcount;
		}
		else {
			// check in the request
			data = this.request.objects[hash];
			if( data ) {
				ASSERT(!data.hasOwnProperty("refcount"));
				Object.defineProperty(data, "refcount", {
					value: 1,
					writable: true,
					enumerable: false
				});
				cache[hash] = data;
			}
		}
		
		return data;
	};
	
	/**
	 * Returns the child node with the specified relid/hash, and schedules it to
	 * be loaded if it is missing.
	 */
	Loader.prototype.getChild = function (node, relid) {
		var child = node.children[relid];

		if( !child ) {
			// create the new child
			child = {
				children: {},
				parent: node
			};
			node.children[relid] = child;

			var hash = node.data[relid];
			ASSERT(typeof hash === "string");

			var data = this.getData(hash);

			if( data ) {
				ASSERT(data.hash === hash);
				child.data = data;
			}
			else {
				// schedule it to be loaded
				this.request.loadObject(hash);
				child.data = hash;
				child.patterns = [];
				this.missing.push(child);
			}
		}

		return child;
	};

	/**
	 * Processes a node with the given visitor pattern. The following patterns
	 * are defined: <code>
	 * 
	 * [ subpattern1, subpattern2 ]
	 * 
	 * children: subpattern
	 * 
	 * recursive-children: undefined
	 * 
	 * relids: {
	 *     relid1: subpattern1,
	 *     relid2: subpattern2
	 * }
	 *  
	 * </code>
	 * 
	 * @param node the node to be processed
	 * @param pattern the pattern to be executed
	 */
	Loader.prototype.processNode = function (node, pattern) {
		var i, cmd, relid, child;

		// if data is yet available
		if( typeof node.data === "string" ) {
			ASSERT(this.missing.indexOf(node) !== -1);
			node.patterns.push(pattern);
		}
		else if( pattern instanceof Array ) {
			// pattern is an array
			for( i = 0; i !== pattern.length; ++i ) {
				this.processNode(node, pattern[i]);
			}
		}
		else {
			for( cmd in pattern ) {
				if( cmd === "children" ) {
					for( relid in node.data.children ) {
						child = this.getChild(node, relid);
						this.processNode(child, pattern[cmd]);
					}
				} else if( cmd === "recursive-children" ) {
					for( relid in node.data.children ) {
						child = this.getChild(node, relid);
						this.processNode(child, pattern);
					}
				} else if( cmd === "relids" ) {
					for( relid in pattern[cmd] ) {
						child = this.getChild(node, relid);
						this.processNode(child, pattern[cmd][relid]);
					}
				}
			}
		}
	};

	/**
	 * Returns the tree specified by a root object and a pattern
	 *  
	 * @param hash the hash of the root object
	 * @param pattern the pattern to be executed
	 */
	Loader.prototype.loadTree = function (hash, pattern) {
		ASSERT(this.missing.length === 0);
		
		// Load the root object with a fake parent
		var root = this.getChild({
			data: {
				root: hash
			},
			children: {}
		}, "root");
		delete root.parent;

		this.processNode(root, pattern);
		
		// load additional data as needed
		while( this.missing.length > 0 ) {
			var processing = this.missing;
			this.missing = [];
			for( var i = 0; i !== processing.length; ++i ) {
				var obj = processing[i];
				
				hash = obj.data;
				ASSERT(typeof hash === "string");
				
				obj.data = this.getData(hash);
				ASSERT(obj.data.hash === hash);

				var patterns = obj.patterns;
				ASSERT(patterns.length >= 1);

				delete obj.patterns;
				this.processNode(obj, patterns);
			}
		}

		return root;
	};

	// ----------------- Interface -----------------

	return {
		unloadTree: function (tree) {
			ASSERT(tree.parent === undefined);
			unloadTree(tree);
		},
		loadTree: function (request, hash, pattern) {
			var loader = new Loader(request);
			return loader.loadTree(hash, pattern);
		}
	};
});
