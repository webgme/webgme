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
		var oldOnunload = window.onunload;
		window.onunload = function () {
			if( oldOnunload ) {
				oldOnunload();
			}

			var hash;
			for(hash in cache) {
				window.alert("Warning, you have a MEMORY LEAK:\ngmesubtree cache is not empty.");
				break;
			}
		};
	}

	// ----------------- Project -----------------
	
	var Project = function(subproject) {
		ASSERT(subproject);
		
		this.subproject = subproject;

		var that = this;

		subproject.onopen = function () {
			that.onopen();
		};
		
		subproject.onclose = function () {
			that.onclose();
		};
		
		subproject.onerror = function () {
			that.onerror();
		};
	};

	Project.prototype.open = function (connection) {
		this.subproject.open(connection);
	};
	
	Project.prototype.close = function () {
		this.subproject.close();
	};
	
	Project.prototype.onopen = function () {
		console.log("onopen");
	};

	Project.prototype.onclose = function () {
		console.log("onclose");
	};

	Project.prototype.onerror = function () {
		console.log("onerror");
	};

	// ----------------- Unloader -----------------

	/**
	 * Unloads the storage objects associated with this object and all of its
	 * children.
	 */
	var unloadNode = function (node) {
		// unload children first
		ASSERT(node.children);
		for( var relid in node.children ) {
			unloadNode(node.children[relid]);
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

	Project.prototype.unloadTree = function (tree) {
		// make sure that a root node is passed 
		ASSERT(tree.parent === undefined);
		unloadNode(tree);
	};
	
	// ----------------- Loader -----------------

	/**
	 * The Loader class loads objects specified by 
	 * the given pattern using the given project and extra
	 * objects.
	 */
	var Loader = function (subproject, extra) {
		ASSERT(subproject);
		this.subproject = subproject;

		// use an empty set of not specified
		this.extra = extra || {};

		/*
		 * This array contains the nodes whose data is not yet loaded and
		 * contains only the hash of the data. Also, these nodes have an array
		 * of patterns that need to be executed once the data is available.
		 */
		this.missing = [];
		
		/*
		 * We do not use closures to avoid the creation of function objects
		 * for each call. Of course this cannot be in the prototype. 
		 */
		var that = this;
		this.onRequestDone = function () {
			that.processMissing(this.objects);
		};
	};

	/**
	 * Returns the child node with the specified relid, and schedules it to
	 * be loaded if its data is missing.
	 */
	Loader.prototype.getChild = function (node, relid) {
		ASSERT(typeof node.data === "object");
		
		var child = node.children[relid];
		if( !child ) {
			child = {
				children: {}
			};
			node.children[relid] = child;

			// make the parent invisible, so it can be serialized/displayed
			Object.defineProperty(child, "parent", {
				value: node,
				writable: true,
				enumerable: false,
				configurable: true
			});

			var hash = node.data.children[relid];
			ASSERT(typeof hash === "string");

			var data = cache[hash];
			if( data ) {
				ASSERT(data.hash === hash);
				ASSERT(data.refcount >= 1);

				++data.refcount;
				child.data = data;
			}
			else {
				// check among the extra objects
				data = this.extra[hash];
				if( data ) {
					ASSERT(!data.hasOwnProperty("refcount"));
					Object.defineProperty(data, "refcount", {
						value: 1,
						writable: true,
						enumerable: false
					});
					cache[hash] = data;
					child.data = data;
				}
				else {
					// schedule it to be loaded
					child.data = hash;
					child.patterns = [];
					this.missing.push(child);
				}
			}
		}

		ASSERT(child.data);
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

		// data is either the hash or the storage object
		ASSERT(node.data);
		
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
				}
				else if( cmd === "recursive_children" ) {
					for( relid in node.data.children ) {
						child = this.getChild(node, relid);
						this.processNode(child, pattern);
					}
				}
				else if( cmd === "relids" ) {
					for( relid in pattern[cmd] ) {
						child = this.getChild(node, relid);
						this.processNode(child, pattern[cmd][relid]);
					}
				}
				else {
					console.log("unknown pattern: " + cmd);
					ASSERT(false);
				}
			}
		}
	};

	/**
	 * This method is called from the request ondone event. It is
	 * not dynamically created as a closure to speed up execution and
	 * not to create deep recursion.
	 * 
	 * @param newobjects a set of newly loaded storage objects
	 */
	Loader.prototype.processMissing = function (newobjects) {
		ASSERT(this.missing.length !== 0 );
		ASSERT(newobjects.length !== 0);

		var processing = this.missing;
		this.missing = [];

		var i, node;

		/*
		 * First we update all missing data so subsequent traversals
		 * that need some of the currently obtained data will not load it
		 * it again. 
		 */
		for(i = 0; i !== processing.length; ++i) {
			node = processing[i];
			var hash = node.data;

			ASSERT(typeof hash === "string");
			var data = newobjects[hash];
			ASSERT(data.hash === hash);

			/*
			 * The same hash can appear multiple times in the processing list
			 * so we might have already added it to the cache. 
			 */
			if(data.hasOwnProperty("refcount")) {
				ASSERT(hash in cache);
				ASSERT(data.refcount >= 1);
				data.refcount += 1;
			}
			else {
				ASSERT(!(hash in cache));
				Object.defineProperty(data, "refcount", {
					value: 1,
					writable: true,
					enumerable: false
				});
				cache[hash] = data;
			}

			node.data = data;
		}

		/*
		 * Now process the missing patterns over the same set of nodes 
		 */
		for(i = 0; i !== processing.length; ++i) {	
			node = processing[i];
			var patterns = node.patterns;
			ASSERT(patterns.length !== 0);

			delete node.patterns;
			
			for(var j = 0; j !== patterns.length; ++j) {
				this.processNode(node, patterns[j]);
			}
		}

		this.requestMissing();
	};
	
	/**
	 * Loads the missing objects into a request
	 */
	Loader.prototype.requestMissing = function ()
	{
		if(this.missing.length === 0) {
			this.ondone(this.root);
		}
		else {
			var hashes = {};
			
			var request = this.subproject.createRequest();
			var missing = this.missing;
			for(var i = 0; i !== missing.length; ++i) {
				var hash = missing[i].data;
				ASSERT(typeof hash === "string");
				if(!(hash in hashes)) {
					hashes[hash] = true;
					request.loadObject(hash);
				}
			}
			
			hashes = null;
			
			request.ondone = this.onRequestDone; 
			request.send();
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
		this.root = this.getChild({
			data: {
				children: {
					root: hash
				}
			},
			children: {}
		}, "root");
		delete this.root.parent;

		this.processNode(this.root, pattern);
		this.requestMissing();
	};

	Loader.prototype.ondone = function (root) {
		console.log("ondone: " + JSON.stringify(root));
	};

	/**
	 * Loads the given subtree and calls the callback when finished
	 * 
	 * @param hash the has of the root object
	 * @param pattern the pattern describing the subtree to be loaded
	 * @param callback the callback to be called when finished
	 */
	Project.prototype.loadTree = function(hash, pattern, callback) {
		var loader = new Loader(this.subproject);
		loader.ondone = function (root) {
			callback(root);
		};
		loader.loadTree(hash, pattern);
	};
	
	// ----------------- Interface -----------------

	return {
		createProject: function (subproject) {
			return new Project(subproject);
		}
	};
});
