/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert", "pertree" ], function (ASSERT, PerTree) {
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

		var getAttributes = function (node) {
			return pertree.getProperty(node, ATTRIBUTES);
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

		var loadChildren = function (node, callback) {
			ASSERT(node && callback);

			var counter = 1;
			var children = [];

			var done = function (err, child) {
				ASSERT(counter >= 1);

				if( child ) {
					children.push(child);
				}

				if( callback && (err || --counter === 0) ) {
					callback(err, children);
					callback = null;
				}
			};

			for( var relid in node.data ) {
				if( isValidRelid(relid) ) {
					++counter;
					pertree.loadChild(node, relid, done);
				}
			}

			done(null);
		};

		var removeNode = function (node) {
			var parent = pertree.getParent();
			ASSERT(parent !== null);

			
			
			pertree.delParent(node);
		};

		var attachNode = function (node, parent) {
			ASSERT(node && parent);
			ASSERT(pertree.getParent(node) === null);

			var relid = createRelid(parent.data);
			pertree.setParent(node, parent, relid);
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

		var EMPTY_STRING = "";

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

			if( target === undefined ) {
				callback(null, null);
			}
			else {
				ASSERT(typeof target === "string");
				pertree.loadByPath(node, target, callback);
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

		var getCommonAncestor = function (first, second) {
			ASSERT(first && second);

			var a = [];
			do {
				a.push(first);
				first = pertree.getParent(first);
			} while( first );

			var b = [];
			do {
				b.push(second);
				second = pertree.getParent(second);
			} while( second );

			ASSERT(a[a.length - 1] === b[b.length - 1]);

			var i = a.length - 1;
			var j = b.length - 1;
			while( i >= 1 && j >= 1 && pertree.getRelid(a[i - 1]) === pertree.getRelid(b[j - 1]) ) {
				--i;
				--j;
			}

			first = a[i];
			second = b[j];

			var firstPath = EMPTY_STRING;
			while( --i >= 0 ) {
				if( firstPath === EMPTY_STRING ) {
					firstPath = pertree.getRelid(a[i]);
				}
				else {
					firstPath = firstPath + "/" + pertree.getRelid(a[i]);
				}
			}

			var secondPath = EMPTY_STRING;
			while( --j >= 0 ) {
				if( secondPath === EMPTY_STRING ) {
					secondPath = pertree.getRelid(b[j]);
				}
				else {
					secondPath = secondPath + "/" + pertree.getRelid(b[j]);
				}
			}

			return {
				first: first,
				firstPath: firstPath,
				second: second,
				secondPath: secondPath
			};
		};

		var setPointer = function (node, name, target) {
			ASSERT(node && name && target);

			deletePointer(node, name);

			var common = getCommonAncestor(node, target);

			var refs = pertree.getChild(common.first, OVERLAYS);
			ASSERT(refs);

			var child = pertree.getChild(refs, common.firstPath);
			if( !child ) {
				child = pertree.createChild(refs, common.firstPath);
			}

			ASSERT(pertree.getProperty(child, name) === undefined);
			pertree.setProperty(child, name, common.secondPath);

			child = pertree.getChild(refs, common.secondPath);
			if( !child ) {
				child = pertree.createChild(refs, common.secondPath);
			}

			name = name + "-coll";
			
			var array = pertree.getProperty(child, name);
			ASSERT(array === undefined || array.constructor === Array);
			
			if( !array ) {
				array = [common.firstPath];
			}
			else {
				array = array.slice(0);
				array.push(common.firstPath);
			}
			
			pertree.setProperty(child, name, array);
		};

		return {
			getKey: pertree.getKey,
			loadRoot: pertree.loadRoot,
			createNode: createNode,
			loadChildren: loadChildren,
			loadChild: pertree.loadChild,
			getParent: pertree.getParent,
			getRoot: pertree.getRoot,
			getPath: pertree.getPath,
			getLevel: pertree.getLevel,
			getStringPath: pertree.getStringPath,
			removeNode: removeNode,
			attachNode: attachNode,
			copyNode: copyNode,
			getAttributes: getAttributes,
			getAttribute: getAttribute,
			setAttribute: setAttribute,
			delAttribute: delAttribute,
			getRegistry: getRegistry,
			setRegistry: setRegistry,
			delRegistry: delRegistry,
			persist: persist,
			loadPointer: loadPointer,
			deletePointer: deletePointer,
			setPointer: setPointer,
			dumpTree: pertree.dumpTree
		};
	};

	return Core;
});
