/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "js/assert", "js/pertree", "js/utilm" ], function (ASSERT, PerTree, UTIL) {
	"use strict";

	// ----------------- RELID -----------------

	var maxRelid = Math.pow(2, 31);

	var createRelid = function (data, relid) {
		ASSERT(data && typeof data === "object");
		ASSERT(relid === undefined || isValidRelid(relid));

		if( !relid || data[relid] !== undefined ) {
			// TODO: detect infinite cycle?
			do {
				relid = Math.floor(Math.random() * maxRelid);
				// relid = relid.toString();
			} while( data[relid] !== undefined );
		}

		return relid;
	};

	// make relids deterministic
	if( false ) {
		var nextRelid = 0;
		createRelid = function (data, relid) {
			ASSERT(data && typeof data === "object");
			ASSERT(relid === undefined || isValidRelid(relid));

			if( !relid || data[relid] !== undefined ) {
				do {
					relid = (nextRelid += -1);
				} while( data[relid] !== undefined );
			}

			return relid;
		};
	}

	var isValidRelid = function (relid) {
		return typeof relid === "number" || parseInt(relid, 10).toString() === relid;
	};

	var isValidPath = function (path) {
		return typeof path === "string" || typeof path === "number";
	};

	var ATTRIBUTES = "atr";
	var REGISTRY = "reg";
	var OVERLAYS = "ovr";
	var COLLSUFFIX = "-inv";

	var isPointerName = function (name) {
		ASSERT(typeof name === "string");

		return name.slice(-COLLSUFFIX.length) !== COLLSUFFIX;
	};

	var isEmpty = function (data) {
		ASSERT(typeof data === "object");

		var s;
		for( s in data ) {
			return false;
		}

		return true;
	};

	// ----------------- Core -----------------

	var Core = function (storage) {

		var pertree = new PerTree(storage);

		var isValid = pertree.isValid;

		var getAttributeNames = function (node) {
			return Object.keys(pertree.getProperty(node, ATTRIBUTES));
		};

		var getAttribute = function (node, name) {
			return pertree.getProperty2(node, ATTRIBUTES, name);
		};

		var delAttribute = function (node, name) {
			pertree.delProperty2(node, ATTRIBUTES, name);
		};

		var setAttribute = function (node, name, value) {
			pertree.setProperty2(node, ATTRIBUTES, name, value);
		};

		var getRegistry = function (node, name) {
			return pertree.getProperty2(node, REGISTRY, name);
		};

		var delRegistry = function (node, name) {
			pertree.delProperty2(node, REGISTRY, name);
		};

		var setRegistry = function (node, name, value) {
			pertree.setProperty2(node, REGISTRY, name, value);
		};

		var overlayInsert = function (overlays, source, name, target) {
			ASSERT(isValid(overlays) && pertree.getRelid(overlays) === OVERLAYS);
			ASSERT(isValidPath(source) && isValidPath(target) && isPointerName(name));

			var node = pertree.getChild(overlays, source);
			if( !node ) {
				node = pertree.createChild(overlays, source);
			}

			ASSERT(pertree.getProperty(node, name) === undefined);
			pertree.setProperty(node, name, target);

			node = pertree.getChild(overlays, target);
			if( !node ) {
				node = pertree.createChild(overlays, target);
			}

			name = name + COLLSUFFIX;

			var array = pertree.getProperty(node, name);
			if( array ) {
				ASSERT(array.indexOf(source) < 0);

				array = array.slice(0);
				array.push(source);
			}
			else {
				array = [ source ];
			}

			pertree.setProperty(node, name, array);
		};

		var overlayRemove = function (overlays, source, name, target) {
			ASSERT(isValid(overlays) && pertree.getRelid(overlays) === OVERLAYS);
			ASSERT(isValidPath(source) && isValidPath(target) && isPointerName(name));

			console.log("HUHU", '"' + source + '"', name, '"' + target + '"');
			console.log("-----------");
			console.log(overlays);
			
			var node = pertree.getChild(overlays, source);
			ASSERT(node && pertree.getProperty(node, name) === target);
			pertree.delProperty(node, name);
			if( pertree.isEmpty(node) ) {
				pertree.detach(node);
			}

			node = pertree.getChild(overlays, target);
			ASSERT(node);

			name = name + COLLSUFFIX;

			var array = pertree.getProperty(node, name);
			ASSERT(array && array.constructor === Array && array.length >= 1);

			if( array.length === 1 ) {
				ASSERT(array[0] === source);

				pertree.delProperty(node, name);
				if( pertree.isEmpty(node) ) {
					pertree.detach(node);
				}
			}
			else {
				var index = array.indexOf(source);
				ASSERT(index >= 0);

				array = array.slice(0);
				array.splice(index, 1);

				pertree.setProperty(node, name, array);
			}

			console.log("-----------");
			console.log(overlays);
			console.log("-----------");
		};

		var overlayQuery = function (overlays, prefix) {
			ASSERT(isValid(overlays) && typeof prefix === "string");

			var list = [];

			var paths = pertree.getChildrenRelid(overlays);
			for( var i = 0; i < paths.length; ++i ) {
				var path = paths[i];
				if( path.substr(0, prefix.length) === prefix ) {
					var node = pertree.getChild(overlays, path);
					var names = pertree.getChildrenRelid(node);
					for( var j = 0; j < names.length; ++j ) {
						var name = names[j];
						if( isPointerName(name) ) {
							list.push({
								s: path,
								n: name,
								t: pertree.getProperty(node, name),
								p: true
							});
						}
						else {
							var array = pertree.getProperty(node, name);
							ASSERT(array && array.constructor === Array);
							name = name.slice(0, -COLLSUFFIX.length);
							for( var k = 0; k < array.length; ++k ) {
								list.push({
									s: array[k],
									n: name,
									t: path,
									p: false
								});
							}
						}
					}
				}
			}

			return list;
		};

		var createNode = function (parent) {
			ASSERT(!parent || isValid(parent));

			var node = pertree.createRoot();
			pertree.createChild(node, ATTRIBUTES);
			pertree.createChild(node, REGISTRY);
			pertree.createChild(node, OVERLAYS);

			if( parent ) {
				var relid = createRelid(parent.data);
				pertree.setParent(node, parent, relid);
			}

			return node;
		};

		var deleteNode = function (node) {
			ASSERT(isValid(node));

			var parent = pertree.getParent(node);
			var prefix = pertree.getRelid(node);
			ASSERT(parent !== null);

			pertree.delParent(node);

			while( parent ) {
				var overlays = pertree.getChild(parent, OVERLAYS);

				var list = overlayQuery(overlays, prefix);
				for( var i = 0; i < list.length; ++i ) {
					var entry = list[i];
					overlayRemove(overlays, entry.s, entry.n, entry.t);
				}

				prefix = pertree.getRelid(parent) + "/" + prefix;
				parent = pertree.getParent(parent);
			}
		};

		var copyNode = function (node, parent) {
			ASSERT(isValid(node) && (!parent || isValid(parent)));

			var newnode;

			if( parent ) {
				var ancestor = pertree.getCommonAncestor(node, parent);
				ASSERT(ancestor[0] === ancestor[1]);

				// cannot copy inside of itself
				if( ancestor[0] === node ) {
					return null;
				}

				newnode = pertree.copyNode(node);
				var relid = createRelid(parent.data);
				pertree.setParent(newnode, parent, relid);

				var ancestorOverlays = pertree.getChild(ancestor[0], OVERLAYS);
				var ancestorNewPrefix = pertree.getStringPath(node, ancestor[0]);

				var base = pertree.getParent(node);
				var basePrefix = pertree.getRelid(node);

				while( base !== ancestor[0] ) {

					var baseOverlays = pertree.getChild(base, OVERLAYS);
					var list = overlayQuery(baseOverlays, basePrefix);
					var ancestorOldPrefix = pertree.getStringPath(base, ancestor[0]);

					for( var i = 0; i < list.length; ++i ) {
						var entry = list[i];
						if( entry.p ) {
							ASSERT(entry.s.substr(0, basePrefix.length) === basePrefix);

							var newSource = ancestorNewPrefix + entry.s.substr(basePrefix.length);
							var newTarget = ancestorOldPrefix + entry.t;

							overlayInsert(ancestorOverlays, newSource, entry.n, newTarget);
						}
					}

					basePrefix = pertree.getRelid(base) + "/" + basePrefix;
					base = pertree.getParent(base);
				}
			}
			else {
				newnode = pertree.copyNode(node);
			}

			return newnode;
		};

		var persist = function (root, callback) {
			ASSERT(isValid(root) && typeof callback === "function");
			ASSERT(pertree.getParent(root) === null);

			return pertree.persist(root, callback);
		};

		var getChildrenRelids = function (node) {
			ASSERT(isValid(node));

			var relids = [];
			for( var relid in node.data ) {
				if( isValidRelid(relid) ) {
					relids.push(relid);
				}
			}

			return relids;
		};

		var loadChildren = function (node, callback) {
			ASSERT(isValid(node) && typeof callback === "function");

			var children = new UTIL.AsyncArray(callback);

			for( var relid in node.data ) {
				if( isValidRelid(relid) ) {
					pertree.loadChild(node, relid, children.add());
				}
			}

			children.start();
		};

		var EMPTY_STRING = "";

		var getPointerNames = function (node) {
			ASSERT(isValid(node));

			var source = EMPTY_STRING;
			var names = [];

			do {
				var child = pertree.getProperty2(node, OVERLAYS, source);
				if( child ) {
					for( var name in child ) {
						ASSERT(names.indexOf(name) === -1);
						if( isPointerName(name) ) {
							names.push(name);
						}
					}
				}

				if( source === EMPTY_STRING ) {
					source = pertree.getRelid(node);
				}
				else {
					source = pertree.getRelid(node) + "/" + source;
				}

				node = pertree.getParent(node);
			} while( node );

			return names;
		};

		var getPointerPath = function (node, name) {
			ASSERT(isValid(node) && typeof name === "string");

			var source = EMPTY_STRING;
			var target;

			do {
				var child = pertree.getChild(node, OVERLAYS);
				ASSERT(child);

				child = pertree.getChild(child, source);
				if( child ) {
					target = pertree.getProperty(child, name);
					if( target ) {
						break;
					}
				}

				if( source === EMPTY_STRING ) {
					source = pertree.getRelid(node);
				}
				else {
					source = pertree.getRelid(node) + "/" + source;
				}

				node = pertree.getParent(node);
			} while( node );

			if( target ) {
				target = pertree.joinStringPaths(pertree.getStringPath(node), target);
			}

			return target;
		};

		var loadPointer = function (node, name, callback) {
			ASSERT(isValid(node) && name && typeof callback === "function");

			var source = EMPTY_STRING;
			var target;

			do {
				var child = pertree.getChild(node, OVERLAYS);
				ASSERT(child);

				child = pertree.getChild(child, source);
				if( child ) {
					target = pertree.getProperty(child, name);
					if( target ) {
						break;
					}
				}

				if( source === EMPTY_STRING ) {
					source = pertree.getRelid(node);
				}
				else {
					source = pertree.getRelid(node) + "/" + source;
				}

				node = pertree.getParent(node);
			} while( node );

			if( target ) {
				ASSERT(typeof target === "string");
				pertree.loadByPath(node, target, callback);
			}
			else {
				callback(null, null);
			}
		};

		var getCollectionNames = function (node) {
			ASSERT(isValid(node));

			var target = EMPTY_STRING;
			var names = [];

			do {
				var child = pertree.getProperty2(node, OVERLAYS, target);
				if( child ) {
					for( var name in child ) {
						if( ! isPointerName(name) ) {
							name = name.slice(0, -COLLSUFFIX.length);
							if( names.indexOf(name) < 0 ) {
								names.push(name);
							}
						}
					}
				}

				if( target === EMPTY_STRING ) {
					target = pertree.getRelid(node);
				}
				else {
					target = pertree.getRelid(node) + "/" + target;
				}

				node = pertree.getParent(node);
			} while( node );

			return names;
		};

		var loadCollection = function (node, name, callback) {
			ASSERT(isValid(node) && name && typeof callback === "function");

			name += COLLSUFFIX;

			var result = new UTIL.AsyncArray(callback);
			var target = EMPTY_STRING;

			do {
				var child = pertree.getChild(node, OVERLAYS);

				child = pertree.getChild(child, target);
				if( child ) {
					var sources = pertree.getProperty(target, name);
					if( sources ) {
						ASSERT(sources.constructor === Array);
						ASSERT(sources.length >= 1);

						for( var i = 0; i < sources.length; ++i ) {
							pertree.loadByPath(node, sources[i], result.add());
						}
					}
				}

				if( target === EMPTY_STRING ) {
					target = pertree.getRelid(node);
				}
				else {
					target = pertree.getRelid(node) + "/" + target;
				}

				node = pertree.getParent(node);
			} while( node );

			result.start();
		};

		var deletePointer = function (node, name) {
			ASSERT(isValid(node) && typeof name === "string");

			var source = EMPTY_STRING;

			do {
				var overlays = pertree.getChild(node, OVERLAYS);
				ASSERT(overlays);
				
				var target = pertree.getProperty2(overlays, source, name);
				if( target !== undefined ) {
					overlayRemove(overlays, source, name, target);
					return true;
				}

				if( source === EMPTY_STRING ) {
					source = pertree.getRelid(node);
				}
				else {
					source = pertree.getRelid(node) + "/" + source;
				}

				node = pertree.getParent(node);
			} while( node );

			return false;
		};

		var setPointer = function (node, name, target) {
			ASSERT(isValid(node) && typeof name === "string" && (!target || isValid(target)));

			deletePointer(node, name);

			if( target ) {
				var ancestor = pertree.getCommonAncestor(node, target);
				ASSERT(ancestor[0] === ancestor[1]);

				var overlays = pertree.getChild(ancestor[0], OVERLAYS);
				var sourcePath = pertree.getStringPath(node, ancestor[0]);
				var targetPath = pertree.getStringPath(target, ancestor[1]);

				overlayInsert(overlays, sourcePath, name, targetPath);
			}
		};

		return {
			getKey: pertree.getKey,
			loadRoot: pertree.loadRoot,
			loadChildren: loadChildren,
			getChildrenRelids: getChildrenRelids,
			loadChild: pertree.loadChild,
			getParent: pertree.getParent,
			getRoot: pertree.getRoot,
			getLevel: pertree.getLevel,
			getStringPath: pertree.getStringPath,
			createNode: createNode,
			deleteNode: deleteNode,
			copyNode: copyNode,
			getAttributeNames: getAttributeNames,
			getAttribute: getAttribute,
			setAttribute: setAttribute,
			delAttribute: delAttribute,
			getRegistry: getRegistry,
			setRegistry: setRegistry,
			delRegistry: delRegistry,
			persist: persist,
			getPointerNames: getPointerNames,
			getPointerPath: getPointerPath,
			loadPointer: loadPointer,
			deletePointer: deletePointer,
			setPointer: setPointer,
			loadCollection: loadCollection,
			getCollectionNames: getCollectionNames,
			dumpTree: pertree.dumpTree
		};
	};

	return Core;
});
