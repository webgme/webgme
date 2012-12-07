/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/coretree", "core/util", "core/lib/sha1" ], function (ASSERT,
CoreTree, UTIL, SHA1) {
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

		var coretree = new CoreTree(storage);

		var isValidNode = coretree.isValidNode;

		var getAttributeNames = function (node) {
			ASSERT(isValidNode(node));

			var keys = Object.keys(coretree.getProperty(node, ATTRIBUTES));
			var i = keys.length;
			while( --i >= 0 ) {
				if( keys[i].charAt(0) === "" ) {
					keys.splice(i, 1);
				}
			}

			return keys;
		};

		var getRegistryNames = function (node) {
			ASSERT(isValidNode(node));

			var keys = Object.keys(coretree.getProperty(node, REGISTRY));
			var i = keys.length;
			while( --i >= 0 ) {
				if( keys[i].charAt(0) === "" ) {
					keys.splice(i, 1);
				}
			}

			return keys;
		};

		var getAttribute = function (node, name) {
			return coretree.getProperty2(node, ATTRIBUTES, name);
		};

		var delAttribute = function (node, name) {
			coretree.delProperty2(node, ATTRIBUTES, name);
		};

		var setAttribute = function (node, name, value) {
			coretree.setProperty2(node, ATTRIBUTES, name, value);
		};

		var getRegistry = function (node, name) {
			return coretree.getProperty2(node, REGISTRY, name);
		};

		var delRegistry = function (node, name) {
			coretree.delProperty2(node, REGISTRY, name);
		};

		var setRegistry = function (node, name, value) {
			coretree.setProperty2(node, REGISTRY, name, value);
		};

		var overlayInsert = function (overlays, source, name, target) {
			ASSERT(isValidNode(overlays) && coretree.getRelid(overlays) === OVERLAYS);
			ASSERT(isValidPath(source) && isValidPath(target) && isPointerName(name));
			ASSERT(coretree.getCommonPathPrefixData(source, target).common === "");

			var node = coretree.getChild(overlays, source);
			if( !node ) {
				node = coretree.createChild(overlays, source);
			}

			ASSERT(coretree.getProperty(node, name) === undefined);
			coretree.setProperty(node, name, target);

			node = coretree.getChild(overlays, target);
			if( !node ) {
				node = coretree.createChild(overlays, target);
			}

			name = name + COLLSUFFIX;

			var array = coretree.getProperty(node, name);
			if( array ) {
				ASSERT(array.indexOf(source) < 0);

				array = array.slice(0);
				array.push(source);
			}
			else {
				array = [ source ];
			}

			coretree.setProperty(node, name, array);
		};

		var overlayRemove = function (overlays, source, name, target) {
			ASSERT(isValidNode(overlays) && coretree.getRelid(overlays) === OVERLAYS);
			ASSERT(isValidPath(source) && isValidPath(target) && isPointerName(name));
			ASSERT(coretree.getCommonPathPrefixData(source, target).common === "");

			var node = coretree.getChild(overlays, source);
			ASSERT(node && coretree.getProperty(node, name) === target);
			coretree.delProperty(node, name);
			if( coretree.isEmpty(node) ) {
				coretree.detach(node);
			}

			node = coretree.getChild(overlays, target);
			ASSERT(node);

			name = name + COLLSUFFIX;

			var array = coretree.getProperty(node, name);
			ASSERT(Array.isArray(array) && array.length >= 1);

			if( array.length === 1 ) {
				ASSERT(array[0] === source);

				coretree.delProperty(node, name);
				if( coretree.isEmpty(node) ) {
					coretree.detach(node);
				}
			}
			else {
				var index = array.indexOf(source);
				ASSERT(index >= 0);

				array = array.slice(0);
				array.splice(index, 1);

				coretree.setProperty(node, name, array);
			}
		};

		var overlayQuery = function (overlays, prefix) {
			ASSERT(isValidNode(overlays) && typeof prefix === "string");

			var list = [];

			var paths = coretree.getChildrenRelids(overlays);
			for( var i = 0; i < paths.length; ++i ) {
				var path = paths[i];
				if( path.substr(0, prefix.length) === prefix ) {
					var node = coretree.getChild(overlays, path);
					var names = coretree.getChildrenRelids(node);
					for( var j = 0; j < names.length; ++j ) {
						var name = names[j];
						if( isPointerName(name) ) {
							list.push({
								s: path,
								n: name,
								t: coretree.getProperty(node, name),
								p: true
							});
						}
						else {
							var array = coretree.getProperty(node, name);
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

		var createNode = function (parent, relid) {
			ASSERT(!parent || isValidNode(parent));

			var node = coretree.createRoot();
			coretree.createChild(node, ATTRIBUTES);
			coretree.createChild(node, REGISTRY);
			coretree.createChild(node, OVERLAYS);

			if( parent ) {
				relid = relid || createRelid(parent.data);
				coretree.setParent(node, parent, relid);
			}

			return node;
		};

		var getSingleNodeHash = function (node) {
			ASSERT(isValidNode(node));

			var data = {
				attributes: coretree.getProperty(node, ATTRIBUTES),
				registry: coretree.getProperty(node, REGISTRY),
				children: coretree.getChildrenRelids(node)
			};
			var prefix = "";

			while( node ) {
				var rels = coretree.getProperty2(node, OVERLAYS, prefix);
				data[prefix] = rels;

				if( prefix === "" ) {
					prefix = coretree.getRelid(node);
				}
				else {
					prefix = coretree.getRelid(node) + "/" + prefix;
				}
				node = coretree.getParent(node);
			}

			return SHA1(JSON.stringify(data));
		};

		var deleteNode = function (node) {
			ASSERT(isValidNode(node));

			var parent = coretree.getParent(node);
			var prefix = coretree.getRelid(node);
			ASSERT(parent !== null);

			coretree.delParent(node);

			while( parent ) {
				var overlays = coretree.getChild(parent, OVERLAYS);

				var list = overlayQuery(overlays, prefix);
				for( var i = 0; i < list.length; ++i ) {
					var entry = list[i];
					overlayRemove(overlays, entry.s, entry.n, entry.t);
				}

				prefix = coretree.getRelid(parent) + "/" + prefix;
				parent = coretree.getParent(parent);
			}
		};

		var copyNode = function (node, parent) {
			ASSERT(isValidNode(node));
			ASSERT(!parent || isValidNode(parent));

			var newNode;

			if( parent ) {
				var ancestor = coretree.getCommonAncestor(node, parent);
				// TODO: fix these
				// ASSERT(ancestor[0] === ancestor[1]);

				// cannot copy inside of itself
				if( ancestor[0] === node ) {
					return null;
				}

				newNode = coretree.copyNode(node);
				coretree.setParent(newNode, parent, createRelid(parent.data));

				var ancestorOverlays = coretree.getChild(ancestor[0], OVERLAYS);
				var ancestorNewPath = coretree.getStringPath(newNode, ancestor[0]);

				var base = coretree.getParent(node);
				var baseOldPath = coretree.getRelid(node);
				var aboveAncestor = 1;

				while( base ) {
					var baseOverlays = coretree.getChild(base, OVERLAYS);
					var list = overlayQuery(baseOverlays, baseOldPath);

					aboveAncestor = (base === ancestor[0] ? 0 : (aboveAncestor === 0 ? -1 : 1));

					var relativePath = aboveAncestor > 0 ? coretree
					.getStringPath(base, ancestor[0]) : coretree.getStringPath(ancestor[0], base);

					for( var i = 0; i < list.length; ++i ) {
						var entry = list[i];

						if( entry.p ) {
							ASSERT(entry.s.substr(0, baseOldPath.length) === baseOldPath);
							ASSERT(entry.s === baseOldPath
							|| entry.s.charAt(baseOldPath.length) === "/");

							var source, target, overlays;

							if( aboveAncestor > 0 ) {
								source = ancestorNewPath + entry.s.substr(baseOldPath.length);
								target = coretree.joinStringPaths(relativePath, entry.t);
								overlays = ancestorOverlays;
							}
							else if( aboveAncestor === 0 ) {
								var data = coretree.getCommonPathPrefixData(ancestorNewPath,
								entry.t);

								overlays = newNode;
								while( data.firstLength-- > 0 ) {
									overlays = coretree.getParent(overlays);
								}
								overlays = coretree.getChild(overlays, OVERLAYS);

								source = coretree.joinStringPaths(data.first, entry.s
								.substr(baseOldPath.length + 1));
								target = data.second;
							}
							else {
								ASSERT(entry.s.substr(0, baseOldPath.length) === baseOldPath);

								source = relativePath + "/" + ancestorNewPath
								+ entry.s.substr(baseOldPath.length);
								target = entry.t;
								overlays = baseOverlays;
							}

							overlayInsert(overlays, source, entry.n, target);
						}
					}

					baseOldPath = coretree.getRelid(base) + "/" + baseOldPath;
					base = coretree.getParent(base);
				}
			}
			else {
				newNode = coretree.copyNode(node);
			}

			return newNode;
		};

		var moveNode = function (node, parent) {
			ASSERT(isValidNode(node) && isValidNode(parent));

			var ancestor = coretree.getCommonAncestor(node, parent);
			// TODO: fix these
			// ASSERT(ancestor[0] === ancestor[1]);

			// cannot move inside of itself
			if( ancestor[0] === node ) {
				return null;
			}

			var base = coretree.getParent(node);
			var baseOldPath = coretree.getRelid(node);
			var aboveAncestor = 1;

			coretree.delParent(node);
			coretree.setParent(node, parent, createRelid(parent.data, baseOldPath));

			var ancestorOverlays = coretree.getChild(ancestor[0], OVERLAYS);
			var ancestorNewPath = coretree.getStringPath(node, ancestor[0]);

			while( base ) {
				var baseOverlays = coretree.getChild(base, OVERLAYS);
				var list = overlayQuery(baseOverlays, baseOldPath);

				aboveAncestor = (base === ancestor[0] ? 0 : (aboveAncestor === 0 ? -1 : 1));

				var relativePath = aboveAncestor > 0 ? coretree.getStringPath(base, ancestor[0])
				: coretree.getStringPath(ancestor[0], base);

				for( var i = 0; i < list.length; ++i ) {
					var entry = list[i];

					overlayRemove(baseOverlays, entry.s, entry.n, entry.t);

					var tmp;
					if( !entry.p ) {
						tmp = entry.s;
						entry.s = entry.t;
						entry.t = tmp;
					}

					ASSERT(entry.s.substr(0, baseOldPath.length) === baseOldPath);
					ASSERT(entry.s === baseOldPath || entry.s.charAt(baseOldPath.length) === "/");

					var source, target, overlays;

					if( aboveAncestor > 0 ) {
						source = ancestorNewPath + entry.s.substr(baseOldPath.length);
						target = coretree.joinStringPaths(relativePath, entry.t);
						overlays = ancestorOverlays;
					}
					else if( aboveAncestor === 0 ) {
						var data = coretree.getCommonPathPrefixData(ancestorNewPath, entry.t);

						overlays = node;
						while( data.firstLength-- > 0 ) {
							overlays = coretree.getParent(overlays);
						}
						overlays = coretree.getChild(overlays, OVERLAYS);

						source = coretree.joinStringPaths(data.first, entry.s
						.substr(baseOldPath.length + 1));
						target = data.second;
					}
					else {
						ASSERT(entry.s.substr(0, baseOldPath.length) === baseOldPath);

						source = relativePath + "/" + ancestorNewPath
						+ entry.s.substr(baseOldPath.length);
						target = entry.t;
						overlays = baseOverlays;
					}

					if( !entry.p ) {
						tmp = entry.s;
						entry.s = entry.t;
						entry.t = tmp;

						tmp = source;
						source = target;
						target = tmp;
					}

					overlayInsert(overlays, source, entry.n, target);
				}

				baseOldPath = coretree.getRelid(base) + "/" + baseOldPath;
				base = coretree.getParent(base);
			}

			return node;
		};

		var persist = function (root, callback) {
			ASSERT(isValidNode(root) && typeof callback === "function");
			ASSERT(coretree.getParent(root) === null);

			return coretree.persist(root, callback);
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
					coretree.loadChild(node, relid, children.asyncPush());
				}
			}

			children.wait();
		};

		var getPointerNames = function (node) {
			ASSERT(isValidNode(node));

			var source = "";
			var names = [];

			do {
				var child = coretree.getProperty2(node, OVERLAYS, source);
				if( child ) {
					for( var name in child ) {
						ASSERT(names.indexOf(name) === -1);
						if( isPointerName(name) ) {
							names.push(name);
						}
					}
				}

				if( source === "" ) {
					source = coretree.getRelid(node);
				}
				else {
					source = coretree.getRelid(node) + "/" + source;
				}

				node = coretree.getParent(node);
			} while( node );

			return names;
		};

		var getPointerPath = function (node, name) {
			ASSERT(isValidNode(node) && typeof name === "string");

			var source = "";
			var target;

			do {
				var child = coretree.getChild(node, OVERLAYS);
				ASSERT(child);

				child = coretree.getChild(child, source);
				if( child ) {
					target = coretree.getProperty(child, name);
					if( target !== undefined ) {
						break;
					}
				}

				if( source === "" ) {
					source = coretree.getRelid(node);
				}
				else {
					source = coretree.getRelid(node) + "/" + source;
				}

				node = coretree.getParent(node);
			} while( node );

			if( target !== undefined ) {
				ASSERT(node);
				target = coretree.joinStringPaths(coretree.getStringPath(node), target);
			}

			return target;
		};

		var hasPointer = function (node, name) {
			ASSERT(isValidNode(node) && typeof name === "string");

			var source = "";

			do {
				var child = coretree.getChild(node, OVERLAYS);
				ASSERT(child);

				child = coretree.getChild(child, source);
				if( child && coretree.getProperty(child, name) !== undefined ) {
					return true;
				}

				if( source === "" ) {
					source = coretree.getRelid(node);
				}
				else {
					source = coretree.getRelid(node) + "/" + source;
				}

				node = coretree.getParent(node);
			} while( node );

			return false;
		};

		var getOutsidePointerPath = function (node, name, source) {
			ASSERT(isValidNode(node) && typeof name === "string");
			ASSERT(typeof source === "string");

			var target;

			do {
				var child = coretree.getChild(node, OVERLAYS);
				ASSERT(child);

				child = coretree.getChild(child, source);
				if( child ) {
					target = coretree.getProperty(child, name);
					if( target !== undefined ) {
						break;
					}
				}

				if( source.length === 0 ) {
					source = coretree.getRelid(node);
				}
				else {
					source = coretree.getRelid(node) + "/" + source;
				}

				node = coretree.getParent(node);
			} while( node );

			if( target !== undefined ) {
				ASSERT(node);
				target = coretree.joinStringPaths(coretree.getStringPath(node), target);
			}

			return target;
		};

		var loadPointer = function (node, name, callback) {
			ASSERT(isValidNode(node) && name && typeof callback === "function");

			var source = "";
			var target;

			do {
				var child = coretree.getChild(node, OVERLAYS);
				ASSERT(child);

				child = coretree.getChild(child, source);
				if( child ) {
					target = coretree.getProperty(child, name);
					if( target !== undefined ) {
						break;
					}
				}

				if( source === "" ) {
					source = coretree.getRelid(node);
				}
				else {
					source = coretree.getRelid(node) + "/" + source;
				}

				node = coretree.getParent(node);
			} while( node );

			if( target !== undefined ) {
				ASSERT(typeof target === "string" && node);
				coretree.loadByPath(node, target, callback);
			}
			else {
				UTIL.immediateCallback(callback, null, null);
			}
		};

		var getCollectionNames = function (node) {
			ASSERT(isValidNode(node));

			var target = "";
			var names = [];

			do {
				var child = coretree.getProperty2(node, OVERLAYS, target);
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

				if( target === "" ) {
					target = coretree.getRelid(node);
				}
				else {
					target = coretree.getRelid(node) + "/" + target;
				}

				node = coretree.getParent(node);
			} while( node );

			return names;
		};

		var loadCollection = function (node, name, callback) {
			ASSERT(isValidNode(node) && name && typeof callback === "function");

			name += COLLSUFFIX;

			var result = new UTIL.AsyncArray(callback);
			var target = "";

			do {
				var child = coretree.getChild(node, OVERLAYS);

				child = coretree.getChild(child, target);
				if( child ) {
					var sources = coretree.getProperty(child, name);
					if( sources ) {
						ASSERT(Array.isArray(sources) && sources.length >= 1);

						for( var i = 0; i < sources.length; ++i ) {
							coretree.loadByPath(node, sources[i], result.asyncPush());
						}
					}
				}

				if( target === "" ) {
					target = coretree.getRelid(node);
				}
				else {
					target = coretree.getRelid(node) + "/" + target;
				}

				node = coretree.getParent(node);
			} while( node );

			result.wait();
		};

		var getCollectionPaths = function (node, name) {
			ASSERT(isValidNode(node) && name);

			name += COLLSUFFIX;

			var result = [];
			var target = "";

			do {
				var child = coretree.getChild(node, OVERLAYS);

				child = coretree.getChild(child, target);
				if( child ) {
					var sources = coretree.getProperty(child, name);
					if( sources ) {
						ASSERT(Array.isArray(sources) && sources.length >= 1);

						var prefix = coretree.getStringPath(node);

						for( var i = 0; i < sources.length; ++i ) {
							result.push(coretree.joinStringPaths(prefix, sources[i]));
						}
					}
				}

				if( target === "" ) {
					target = coretree.getRelid(node);
				}
				else {
					target = coretree.getRelid(node) + "/" + target;
				}

				node = coretree.getParent(node);
			} while( node );

			return result;
		};

		var deletePointer = function (node, name) {
			ASSERT(isValidNode(node) && typeof name === "string");

			var source = "";

			do {
				var overlays = coretree.getChild(node, OVERLAYS);
				ASSERT(overlays);

				var target = coretree.getProperty2(overlays, source, name);
				if( target !== undefined ) {
					overlayRemove(overlays, source, name, target);
					return true;
				}

				if( source === "" ) {
					source = coretree.getRelid(node);
				}
				else {
					source = coretree.getRelid(node) + "/" + source;
				}

				node = coretree.getParent(node);
			} while( node );

			return false;
		};

		var setPointer = function (node, name, target) {
			ASSERT(isValidNode(node) && typeof name === "string"
			&& (!target || isValidNode(target)));

			deletePointer(node, name);

			if( target ) {
				var ancestor = coretree.getCommonAncestor(node, target);
				// TODO: fix these
				// ASSERT(ancestor[0] === ancestor[1]);

				var overlays = coretree.getChild(ancestor[0], OVERLAYS);
				var sourcePath = coretree.getStringPath(node, ancestor[0]);
				var targetPath = coretree.getStringPath(target, ancestor[1]);

				overlayInsert(overlays, sourcePath, name, targetPath);
			}
		};

		return {
			// check
			isValidNode: isValidNode,
			isValidRelid: isValidRelid,
			isValidPath: isValidPath,

			// root
			getKey: coretree.getKey,
			loadRoot: coretree.loadRoot,
			persist: persist,
			getRoot: coretree.getRoot,

			// containment
			getLevel: coretree.getLevel,
			getStringPath: coretree.getStringPath,
			getParent: coretree.getParent,
			getChildrenRelids: getChildrenRelids,
			loadChild: coretree.loadChild,
			loadByPath: coretree.loadByPath,
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
			getRegistryNames: getRegistryNames,
			getRegistry: getRegistry,
			setRegistry: setRegistry,
			delRegistry: delRegistry,

			// relations
			getPointerNames: getPointerNames,
			getPointerPath: getPointerPath,
			hasPointer: hasPointer,
			getOutsidePointerPath: getOutsidePointerPath,
			loadPointer: loadPointer,
			deletePointer: deletePointer,
			setPointer: setPointer,
			getCollectionNames: getCollectionNames,
			getCollectionPaths: getCollectionPaths,
			loadCollection: loadCollection,

			getSingleNodeHash: getSingleNodeHash
		};
	};

	return Core;
});
