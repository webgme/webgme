/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/pertree", "core/util" ], function (ASSERT, PerTree, UTIL) {
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

	var isValidRelid = function (relid) {
		return typeof relid === "number" || parseInt(relid, 10).toString() === relid;
	};

	var ATTRIBUTES = "atr";
	var REGISTRY = "reg";
	var OVERLAYS = "ovr";

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

		var removeNode = function (node) {
			var parent = pertree.getParent();
			ASSERT(parent !== null);

			pertree.delParent(node);
		};

		var copyNode = function (node, parent) {
			ASSERT(node && parent);

			var relid = createRelid(parent.data);
			pertree.copy(node, parent, relid);
		};

		var persist = function (root, callback) {
			ASSERT(root && callback);
			ASSERT(pertree.getParent(root) === null);

			pertree.persist(root, callback);
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
			ASSERT(node && callback);

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
			ASSERT(node);

			var source = EMPTY_STRING;
			var names = [];

			do {
				var child = pertree.getProperty2(node, OVERLAYS, source);
				if( child ) {
					for( var name in child ) {
						ASSERT(names.indexOf(name) === -1);
						if( name.slice(-5) !== "-coll" ) {
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

		var loadPointer = function (node, name, callback) {
			ASSERT(node && name && callback);

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

		var deletePointer = function (node, name) {
			ASSERT(node && name);

			var source = EMPTY_STRING;
			var target;

			do {
				var refs = pertree.getChild(node, OVERLAYS);
				ASSERT(refs);

				var child = pertree.getChild(refs, source);
				if( child ) {
					target = pertree.getProperty(child, name);
					if( target ) {
						pertree.delProperty(child, name);
						if( pertree.isEmpty(child) ) {
							pertree.detach(child);
						}

						child = pertree.getChild(refs, target);
						ASSERT(child);

						name = name + "-coll";

						var array = pertree.getProperty(child, name);
						ASSERT(array && array.constructor === Array && array.length >= 1);

						if( array.length === 1 ) {
							ASSERT(array[0] === source);

							pertree.delProperty(child, name);
							if( pertree.isEmpty(child) ) {
								pertree.detach(child);
							}
						}
						else {
							var index = array.indexOf(source);
							ASSERT(index >= 0);

							array = array.slice(0);
							array.splice(index, 1);

							pertree.setProperty(child, name, array);
						}

						return true;
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

			return false;
		};

		var setPointer = function (node, name, target) {
			ASSERT(node && name && target);

			deletePointer(node, name);

			var ancestor = pertree.getCommonAncestor(node, target);
			ASSERT(ancestor[0] === ancestor[1]);

			var relpaths = [ pertree.getStringPath(node, ancestor[0]),
				pertree.getStringPath(target, ancestor[1]) ];

			var refs = pertree.getChild(ancestor[0], OVERLAYS);
			ASSERT(refs);

			var child = pertree.getChild(refs, relpaths[0]);
			if( !child ) {
				child = pertree.createChild(refs, relpaths[0]);
			}

			ASSERT(pertree.getProperty(child, name) === undefined);
			pertree.setProperty(child, name, relpaths[1]);

			child = pertree.getChild(refs, relpaths[1]);
			if( !child ) {
				child = pertree.createChild(refs, relpaths[1]);
			}

			name = name + "-coll";

			var array = pertree.getProperty(child, name);
			ASSERT(array === undefined || array.constructor === Array);

			if( !array ) {
				array = [ relpaths[0] ];
			}
			else {
				array = array.slice(0);
				array.push(relpaths[0]);
			}

			pertree.setProperty(child, name, array);
		};

		return {
			getKey: pertree.getKey,
			loadRoot: pertree.loadRoot,
			createNode: createNode,
			getChildrenRelids: getChildrenRelids,
			loadChildren: loadChildren,
			loadChild: pertree.loadChild,
			getParent: pertree.getParent,
			getRoot: pertree.getRoot,
			getLevel: pertree.getLevel,
			getStringPath: pertree.getStringPath,
			removeNode: removeNode,
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
			loadPointer: loadPointer,
			deletePointer: deletePointer,
			setPointer: setPointer,
			dumpTree: pertree.dumpTree
		};
	};

	return Core;
});
