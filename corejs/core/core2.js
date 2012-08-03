/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define(
[ "core/assert", "core/pertree", "core/util" ],
function (ASSERT, PerTree, UTIL) {
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

		return "" + relid;
	};

	// make relids deterministic
	if( true ) {
		var nextRelid = 0;
		createRelid = function (data, relid) {
			ASSERT(data && typeof data === "object");
			ASSERT(relid === undefined || isValidRelid(relid));

			if( !relid || data[relid] !== undefined ) {
				do {
					relid = (nextRelid += -1);
				} while( data[relid] !== undefined );
			}

			return "" + relid;
		};
	}

	var isValidRelid = function (relid) {
		return typeof relid === "string" && parseInt(relid, 10).toString() === relid;
	};

	var isValidPath = function (path) {
		return typeof path === "string";
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

		var isValidNode = pertree.isValidNode;
		var parseStringPath = pertree.parseStringPath;

		var getAttributeNames = function (node) {
			ASSERT(isValidNode(node));

			var keys = Object.keys(pertree.getProperty(node, ATTRIBUTES));
			var i = keys.length;
			while( --i >= 0 ) {
				if( keys[i].charAt(0) === "_" ) {
					keys.splice(i, 1);
				}
			}

			return keys;
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
			ASSERT(isValidNode(overlays) && pertree.getRelid(overlays) === OVERLAYS);
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
			ASSERT(isValidNode(overlays) && pertree.getRelid(overlays) === OVERLAYS);
			ASSERT(isValidPath(source) && isValidPath(target) && isPointerName(name));

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
			ASSERT(Array.isArray(array) && array.length >= 1);

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
		};

		var overlayQuery = function (overlays, prefix) {
			ASSERT(isValidNode(overlays) && typeof prefix === "string");

			var list = [];

			var paths = pertree.getChildrenRelids(overlays);
			for( var i = 0; i < paths.length; ++i ) {
				var path = paths[i];
				if( path.substr(0, prefix.length) === prefix ) {
					var node = pertree.getChild(overlays, path);
					var names = pertree.getChildrenRelids(node);
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
							ASSERT(Array.isArray(array));
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
			ASSERT(!parent || isValidNode(parent));

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
			ASSERT(isValidNode(node));

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
			ASSERT(isValidNode(node) && isValidNode(parent));

			var newnode;

			if( parent ) {
				var ancestor = pertree.getCommonAncestor(node, parent);
				ASSERT(ancestor[0] === ancestor[1]);

				// cannot copy inside of itself
				if( ancestor[0] === node ) {
					return null;
				}

				newnode = pertree.copyNode(node);
				var relid = createRelid(parent.data, node.relid);
				pertree.setParent(newnode, parent, relid);

				var ancestorOverlays = pertree.getChild(ancestor[0], OVERLAYS);
				var ancestorNewNodePath = pertree.getStringPath(newnode, ancestor[0]);

				var base = pertree.getParent(node);
				var baseOldNodePath = pertree.getRelid(node);
				var baseBelowAncestor = false;

				while( base ) {
					var baseOverlays = pertree.getChild(base, OVERLAYS);
					var list = overlayQuery(baseOverlays, baseOldNodePath);

					var ancestorBasePath = baseBelowAncestor ? pertree.getStringPath(ancestor[0],
					base) : pertree.getStringPath(base, ancestor[0]);

					for( var i = 0; i < list.length; ++i ) {
						var entry = list[i];
						if( entry.p ) {
							var newSource, newTarget;

							if( baseBelowAncestor ) {
								ASSERT(entry.s.substr(0, ancestorBasePath.length) === ancestorBasePath);

								newSource = ancestorBasePath + "/" + ancestorNewNodePath
								+ entry.s.substr(ancestorBasePath.length);

								overlayInsert(baseOverlays, newSource, entry.n, entry.t);
							}
							else {
								ASSERT(entry.s.substr(0, baseOldNodePath.length) === baseOldNodePath);

								newSource = ancestorNewNodePath
								+ entry.s.substr(baseOldNodePath.length);
								newTarget = ancestorBasePath + entry.t;

								overlayInsert(ancestorOverlays, newSource, entry.n, newTarget);
							}
						}
					}

					if( base === ancestor[0] ) {
						baseBelowAncestor = true;
					}

					baseOldNodePath = pertree.getRelid(base) + "/" + baseOldNodePath;
					base = pertree.getParent(base);
				}
			}
			else {
				newnode = pertree.copyNode(node);
			}

			return newnode;
		};

		// TODO: this is the lazy solution, make it fast
		var moveNode = function (node, parent) {
			ASSERT(isValidNode(node) && isValidNode(parent));

			if( parent === pertree.getParent(node) ) {
				return node;
			}

			var newnode = copyNode(node, parent);
			if( newnode ) {
				deleteNode(node);
			}

			return newnode;
		};

		var persist = function (root, callback) {
			ASSERT(isValidNode(root) && typeof callback === "function");
			ASSERT(pertree.getParent(root) === null);

			return pertree.persist(root, callback);
		};

		var getChildrenRelids = function (node) {
			ASSERT(isValidNode(node));

			var relids = [];
			for( var relid in node.data ) {
				if( isValidRelid(relid) ) {
					relids.push(relid);
				}
			}

			return relids;
		};

		var loadChildren = function (node, callback) {
			ASSERT(isValidNode(node) && typeof callback === "function");

			var children = new UTIL.AsyncArray(callback);

			for( var relid in node.data ) {
				if( isValidRelid(relid) ) {
					pertree.loadChild(node, relid, children.asyncPush());
				}
			}

			children.wait();
		};

		var EMPTY_STRING = "";

		var getPointerNames = function (node) {
			ASSERT(isValidNode(node));

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
			ASSERT(isValidNode(node) && typeof name === "string");

			var source = EMPTY_STRING;
			var target;

			do {
				var child = pertree.getChild(node, OVERLAYS);
				ASSERT(child);

				child = pertree.getChild(child, source);
				if( child ) {
					target = pertree.getProperty(child, name);
					if( target !== undefined ) {
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

			if( target !== undefined ) {
				ASSERT(node);
				target = pertree.joinStringPaths(pertree.getStringPath(node), target);
			}

			return target;
		};

		var getOutsidePointerPath = function (node, name, source) {
			ASSERT(isValidNode(node) && typeof name === "string");
			ASSERT(typeof source === "string");

			var target;

			do {
				var child = pertree.getChild(node, OVERLAYS);
				ASSERT(child);

				child = pertree.getChild(child, source);
				if( child ) {
					target = pertree.getProperty(child, name);
					if( target !== undefined ) {
						break;
					}
				}

				if( source.length === 0 ) {
					source = pertree.getRelid(node);
				}
				else {
					source = pertree.getRelid(node) + "/" + source;
				}

				node = pertree.getParent(node);
			} while( node );

			if( target !== undefined ) {
				ASSERT(node);
				target = pertree.joinStringPaths(pertree.getStringPath(node), target);
			}

			return target;
		};

		var loadPointer = function (node, name, callback) {
			ASSERT(isValidNode(node) && name && typeof callback === "function");

			var source = EMPTY_STRING;
			var target;

			do {
				var child = pertree.getChild(node, OVERLAYS);
				ASSERT(child);

				child = pertree.getChild(child, source);
				if( child ) {
					target = pertree.getProperty(child, name);
					if( target !== undefined ) {
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

			if( target !== undefined ) {
				ASSERT(typeof target === "string" && node);
				pertree.loadByPath(node, target, callback);
			}
			else {
				callback(null, null);
			}
		};

		var getCollectionNames = function (node) {
			ASSERT(isValidNode(node));

			var target = EMPTY_STRING;
			var names = [];

			do {
				var child = pertree.getProperty2(node, OVERLAYS, target);
				if( child ) {
					for( var name in child ) {
						if( !isPointerName(name) ) {
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
			ASSERT(isValidNode(node) && name && typeof callback === "function");

			name += COLLSUFFIX;

			var result = new UTIL.AsyncArray(callback);
			var target = EMPTY_STRING;

			do {
				var child = pertree.getChild(node, OVERLAYS);

				child = pertree.getChild(child, target);
				if( child ) {
					var sources = pertree.getProperty(child, name);
					if( sources ) {
						ASSERT(Array.isArray(sources) && sources.length >= 1);

						for( var i = 0; i < sources.length; ++i ) {
							pertree.loadByPath(node, sources[i], result.asyncPush());
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

			result.wait();
		};

		var getCollectionPaths = function (node, name) {
			ASSERT(isValidNode(node) && name);

			name += COLLSUFFIX;

			var result = [];
			var target = EMPTY_STRING;

			do {
				var child = pertree.getChild(node, OVERLAYS);

				child = pertree.getChild(child, target);
				if( child ) {
					var sources = pertree.getProperty(child, name);
					if( sources ) {
						ASSERT(Array.isArray(sources) && sources.length >= 1);

						var prefix = pertree.getStringPath(node);

						for( var i = 0; i < sources.length; ++i ) {
							result.push(pertree.joinStringPaths(prefix, sources[i]));
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

			return result;
		};

		var deletePointer = function (node, name) {
			ASSERT(isValidNode(node) && typeof name === "string");

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
			ASSERT(isValidNode(node) && typeof name === "string"
			&& (!target || isValidNode(target)));

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
			// check
			isValidNode: isValidNode,
			isValidRelid: isValidRelid,
			isValidPath: isValidPath,

			// root
			getKey: pertree.getKey,
			loadRoot: pertree.loadRoot,
			persist: persist,
			getRoot: pertree.getRoot,

			// containment
			getLevel: pertree.getLevel,
			getStringPath: pertree.getStringPath,
			parseStringPath: pertree.parseStringPath,
			getParent: pertree.getParent,
			getChildrenRelids: getChildrenRelids,
			loadChild: pertree.loadChild,
			loadByPath: pertree.loadByPath,
			loadChildren: loadChildren,

			// modify
			createNode: createNode,
			deleteNode: deleteNode,
			copyNode: copyNode,
			moveNode: moveNode,

			// attributes
			getAttributeNames: getAttributeNames,
			getAttribute: getAttribute,
			setAttribute: setAttribute,
			delAttribute: delAttribute,
			getRegistry: getRegistry,
			setRegistry: setRegistry,
			delRegistry: delRegistry,

			// relations
			getPointerNames: getPointerNames,
			getPointerPath: getPointerPath,
			getOutsidePointerPath: getOutsidePointerPath,
			loadPointer: loadPointer,
			deletePointer: deletePointer,
			setPointer: setPointer,
			getCollectionNames: getCollectionNames,
			getCollectionPaths: getCollectionPaths,
			loadCollection: loadCollection
		};
	};

	return Core;
});
