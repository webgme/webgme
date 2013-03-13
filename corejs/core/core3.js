/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/coretree", "core/lib/sha1", "core/future" ], function (ASSERT,
CoreTree, SHA1, FUTURE) {
	"use strict";

	// ----------------- RELID -----------------

	var isValidRelid = function (relid) {
		return typeof relid === "string" && parseInt(relid, 10).toString() === relid;
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

	var Core = function (storage, options) {

		var coretree = new CoreTree(storage, options);

		var isValidNode = coretree.isValidNode;
		var isValidPath = coretree.isValidPath;

		var getCommonPathPrefixData = function (first, second) {
			ASSERT(typeof first === "string" && typeof second === "string");

			first = coretree.splitPath(first);
			second = coretree.splitPath(second);

			var common = [];
			for( var i = 0; first[i] === second[i] && i < first.length; ++i ) {
				common.push(first[i]);
			}

			return {
				common: coretree.buildPath(common),
				first: coretree.buildPath(first.slice(i)),
				firstLength: first.length - i,
				second: coretree.buildPath(second.slice(i)),
				secondLength: second.length - i
			};
		};

		var getAttributeNames = function (node) {
			ASSERT(isValidNode(node));

			node = coretree.getChild(node, ATTRIBUTES);
			var keys = coretree.getKeys(node);
			var i = keys.length;
			while( --i >= 0 ) {
				if( keys[i].charAt(0) === "" ) {
					console.log("***** This happens?");
					keys.splice(i, 1);
				}
			}

			return keys;
		};

		var getRegistryNames = function (node) {
			ASSERT(isValidNode(node));

			node = coretree.getChild(node, REGISTRY);
			var keys = coretree.getKeys(node);
			var i = keys.length;
			while( --i >= 0 ) {
				if( keys[i].charAt(0) === "" ) {
					console.log("***** This happens?");
					keys.splice(i, 1);
				}
			}

			return keys;
		};

		var getAttribute = function (node, name) {
			node = coretree.getChild(node, ATTRIBUTES);
			return coretree.getProperty(node, name);
		};

		var delAttribute = function (node, name) {
			node = coretree.getChild(node, ATTRIBUTES);
			coretree.deleteProperty(node, name);
		};

		var setAttribute = function (node, name, value) {
			node = coretree.getChild(node, ATTRIBUTES);
			coretree.setProperty(node, name, value);
		};

		var getRegistry = function (node, name) {
			node = coretree.getChild(node, REGISTRY);
			return coretree.getProperty(node, name);
		};

		var delRegistry = function (node, name) {
			node = coretree.getChild(node, REGISTRY);
			coretree.deleteProperty(node, name);
		};

		var setRegistry = function (node, name, value) {
			node = coretree.getChild(node, REGISTRY);
			coretree.setProperty(node, name, value);
		};

		var overlayInsert = function (overlays, source, name, target) {
			ASSERT(isValidNode(overlays) && coretree.getRelid(overlays) === OVERLAYS);
			ASSERT(isValidPath(source) && isValidPath(target) && isPointerName(name));
			ASSERT(getCommonPathPrefixData(source, target).common === "");

			// console.log("insert", overlays.parent.data.atr.name, source, name, target);
			
			var node = coretree.getChild(overlays, source);

			ASSERT(coretree.getProperty(node, name) === undefined);
			coretree.setProperty(node, name, target);

			node = coretree.getChild(overlays, target);
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
			ASSERT(getCommonPathPrefixData(source, target).common === "");

			// console.log("remove", overlays.parent.data.atr.name, source, name, target);
			
			var node = coretree.getChild(overlays, source);
			ASSERT(node && coretree.getProperty(node, name) === target);
			coretree.deleteProperty(node, name);

			node = coretree.getChild(overlays, target);
			ASSERT(node);

			name = name + COLLSUFFIX;

			var array = coretree.getProperty(node, name);
			ASSERT(Array.isArray(array) && array.length >= 1);

			if( array.length === 1 ) {
				ASSERT(array[0] === source);

				coretree.deleteProperty(node, name);
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
			ASSERT(isValidNode(overlays) && isValidPath(prefix));

			var prefix2 = prefix + "/";
			var list = [];
			var paths = coretree.getKeys(overlays);
			
			for( var i = 0; i < paths.length; ++i ) {
				var path = paths[i];
				if( path === prefix || path.substr(0, prefix2.length) === prefix2 ) {
					var node = coretree.getChild(overlays, path);
					var names = coretree.getKeys(node);
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

			// console.log("query", overlays.parent.data.atr.name, prefix, list);

			return list;
		};

		var createNode = function (parent, relid) {
			ASSERT(!parent || isValidNode(parent));

			var node;
			if( parent ) {
				if( relid ) {
					node = coretree.getChild(parent, relid);
				}
				else {
					node = coretree.createChild(parent);
				}
				coretree.setHashed(node, true);
			}
			else {
				node = coretree.createRoot();
			}

			return node;
		};

		var getSingleNodeHash = function (node) {
			ASSERT(isValidNode(node));

			var data = {
				attributes: coretree.getProperty(node, ATTRIBUTES),
				registry: coretree.getProperty(node, REGISTRY),
				children: coretree.getKeys(node)
			};
			var prefix = "";

			while( node ) {
				var overlays = coretree.getChild(node, OVERLAYS);
				var rels = coretree.getProperty(overlays, prefix);
				data[prefix] = rels;

				prefix = "/" + coretree.getRelid(node) + prefix;
				node = coretree.getParent(node);
			}

			return SHA1(JSON.stringify(data));
		};

		var deleteNode = function (node) {
			ASSERT(isValidNode(node));

			var parent = coretree.getParent(node);
			var prefix = "/" + coretree.getRelid(node);
			ASSERT(parent !== null);

			coretree.deleteProperty(parent, coretree.getRelid(node));

			while( parent ) {
				var overlays = coretree.getChild(parent, OVERLAYS);

				var list = overlayQuery(overlays, prefix);
				for( var i = 0; i < list.length; ++i ) {
					var entry = list[i];
					overlayRemove(overlays, entry.s, entry.n, entry.t);
				}

				prefix = "/" + coretree.getRelid(parent) + prefix;
				parent = coretree.getParent(parent);
			}
		};

		var copyNode = function (node, parent) {
			ASSERT(isValidNode(node));
			ASSERT(!parent || isValidNode(parent));

			node = coretree.normalize(node);
			var newNode;

			if( parent ) {
				var ancestor = coretree.getAncestor(node, parent);

				// cannot copy inside of itself
				if( ancestor === node ) {
					return null;
				}

				newNode = coretree.createChild(parent);
				coretree.setHashed(newNode, true);
				coretree.setData(newNode, coretree.copyData(node));

				var ancestorOverlays = coretree.getChild(ancestor, OVERLAYS);
				var ancestorNewPath = coretree.getPath(newNode, ancestor);

				var base = coretree.getParent(node);
				var baseOldPath = "/" + coretree.getRelid(node);
				var aboveAncestor = 1;

				while( base ) {
					var baseOverlays = coretree.getChild(base, OVERLAYS);
					var list = overlayQuery(baseOverlays, baseOldPath);

					aboveAncestor = (base === ancestor ? 0 : (aboveAncestor === 0 ? -1 : 1));

					var relativePath = aboveAncestor > 0 ? coretree.getPath(base, ancestor)
					: coretree.getPath(ancestor, base);

					for( var i = 0; i < list.length; ++i ) {
						var entry = list[i];

						if( entry.p ) {
							ASSERT(entry.s.substr(0, baseOldPath.length) === baseOldPath);
							ASSERT(entry.s === baseOldPath
							|| entry.s.charAt(baseOldPath.length) === "/");

							var source, target, overlays;

							if( aboveAncestor > 0 ) {
								source = ancestorNewPath + entry.s.substr(baseOldPath.length);
								target = coretree.joinPaths(relativePath, entry.t);
								overlays = ancestorOverlays;
							}
							else if( aboveAncestor === 0 ) {
								var data = getCommonPathPrefixData(ancestorNewPath, entry.t);

								overlays = newNode;
								while( data.firstLength-- > 0 ) {
									overlays = coretree.getParent(overlays);
								}
								overlays = coretree.getChild(overlays, OVERLAYS);

								source = coretree.joinPaths(data.first, entry.s
								.substr(baseOldPath.length));
								target = data.second;
							}
							else {
								ASSERT(entry.s.substr(0, baseOldPath.length) === baseOldPath);

								source = relativePath + ancestorNewPath
								+ entry.s.substr(baseOldPath.length);
								target = entry.t;
								overlays = baseOverlays;
							}

							overlayInsert(overlays, source, entry.n, target);
						}
					}

					baseOldPath = "/" + coretree.getRelid(base) + baseOldPath;
					base = coretree.getParent(base);
				}
			}
			else {
				newNode = coretree.createRoot();
				coretree.setData(newNode, coretree.copyData(node));
			}

			return newNode;
		};

		var moveNode = function (node, parent) {
			ASSERT(isValidNode(node) && isValidNode(parent));

			node = coretree.normalize(node);
			var ancestor = coretree.getAncestor(node, parent);

			// cannot move inside of itself
			if( ancestor === node ) {
				return null;
			}

			var base = coretree.getParent(node);
			var baseOldPath = "/" + coretree.getRelid(node);
			var aboveAncestor = 1;

			var oldNode = node;
			node = coretree.getChild(parent, coretree.getRelid(oldNode));
			if( !coretree.isEmpty(node) ) {
				// we have to change the relid of the node, to fit into its new
				// place...
				node = coretree.createChild(parent);
			}
			coretree.setHashed(node, true);
			coretree.setData(node, coretree.copyData(oldNode));

			var ancestorOverlays = coretree.getChild(ancestor, OVERLAYS);
			var ancestorNewPath = coretree.getPath(node, ancestor);

			while( base ) {
				var baseOverlays = coretree.getChild(base, OVERLAYS);
				var list = overlayQuery(baseOverlays, baseOldPath);

				aboveAncestor = (base === ancestor ? 0 : (aboveAncestor === 0 ? -1 : 1));

				var relativePath = aboveAncestor > 0 ? coretree.getPath(base, ancestor) : coretree
				.getPath(ancestor, base);

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
						target = coretree.joinPaths(relativePath, entry.t);
						overlays = ancestorOverlays;
					}
					else if( aboveAncestor === 0 ) {
						var data = getCommonPathPrefixData(ancestorNewPath, entry.t);

						overlays = node;
						while( data.firstLength-- > 0 ) {
							overlays = coretree.getParent(overlays);
						}
						overlays = coretree.getChild(overlays, OVERLAYS);

						source = coretree.joinPaths(data.first, entry.s
						.substr(baseOldPath.length));
						target = data.second;
					}
					else {
						ASSERT(entry.s.substr(0, baseOldPath.length) === baseOldPath);

						source = relativePath + ancestorNewPath
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

					console.log(source, target);
					overlayInsert(overlays, source, entry.n, target);
				}

				baseOldPath = "/" + coretree.getRelid(base) + baseOldPath;
				base = coretree.getParent(base);
			}

			deleteNode(oldNode);
			
			return node;
		};

		var getChildrenRelids = function (node) {
			ASSERT(isValidNode(node));

			return coretree.getKeys(node, isValidRelid);
		};

		var getChildrenPaths = function (node) {
			var path = coretree.getPath(node);

			var relids = getChildrenRelids(node);
			for( var i = 0; i < relids.length; ++i ) {
				relids[i] = path + "/" + relids[i];
			}

			return relids;
		};

		var loadChildren = function (node) {
			ASSERT(isValidNode(node));

			var children = coretree.getKeys(node, isValidRelid);
			for( var i = 0; i < children.length; ++i ) {
				children[i] = coretree.loadChild(node, children[i]);
			}

			return FUTURE.array(children);
		};

		var getPointerNames = function (node) {
			ASSERT(isValidNode(node));

			var source = "";
			var names = [];

			do {
				var child = coretree.getProperty(coretree.getChild(node, OVERLAYS), source);
				if( child ) {
					for( var name in child ) {
						ASSERT(names.indexOf(name) === -1);
						if( isPointerName(name) ) {
							names.push(name);
						}
					}
				}

				source = "/" + coretree.getRelid(node) + source;
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

				source = "/" + coretree.getRelid(node) + source;
				node = coretree.getParent(node);
			} while( node );

			if( target !== undefined ) {
				ASSERT(node);
				target = coretree.joinPaths(coretree.getPath(node), target);
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

				source = "/" + coretree.getRelid(node) + source;
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

				source = "/" + coretree.getRelid(node) + source;
				node = coretree.getParent(node);
			} while( node );

			if( target !== undefined ) {
				ASSERT(node);
				target = coretree.joinPaths(coretree.getPath(node), target);
			}

			return target;
		};

		var loadPointer = function (node, name) {
			ASSERT(isValidNode(node) && name);

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

				source = "/" + coretree.getRelid(node) + source;
				node = coretree.getParent(node);
			} while( node );

			if( target !== undefined ) {
				ASSERT(typeof target === "string" && node);
				return coretree.loadByPath(node, target);
			}
			else {
				return null;
			}
		};

		var getCollectionNames = function (node) {
			ASSERT(isValidNode(node));

			var target = "";
			var names = [];

			do {
				var child = coretree.getProperty(coretree.getChild(node, OVERLAYS), target);
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

				target = "/" + coretree.getRelid(node) + target;
				node = coretree.getParent(node);
			} while( node );

			return names;
		};

		var loadCollection = function (node, name) {
			ASSERT(isValidNode(node) && name);

			name += COLLSUFFIX;

			var collection = [];
			var target = "";

			do {
				var child = coretree.getChild(node, OVERLAYS);

				child = coretree.getChild(child, target);
				if( child ) {
					var sources = coretree.getProperty(child, name);
					if( sources ) {
						ASSERT(Array.isArray(sources) && sources.length >= 1);

						for( var i = 0; i < sources.length; ++i ) {
							collection.push(coretree.loadByPath(node, sources[i]));
						}
					}
				}

				target = "/" + coretree.getRelid(node) + target;
				node = coretree.getParent(node);
			} while( node );

			return FUTURE.array(collection);
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

						var prefix = coretree.getPath(node);

						for( var i = 0; i < sources.length; ++i ) {
							result.push(coretree.joinPaths(prefix, sources[i]));
						}
					}
				}

				target = "/" + coretree.getRelid(node) + target;
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

				var target = coretree.getProperty(coretree.getChild(overlays, source), name);
				if( target !== undefined ) {
					overlayRemove(overlays, source, name, target);
					return true;
				}

				source = "/" + coretree.getRelid(node) + source;
				node = coretree.getParent(node);
			} while( node );

			return false;
		};

		var setPointer = function (node, name, target) {
			ASSERT(isValidNode(node) && typeof name === "string"
			&& (!target || isValidNode(target)));

			deletePointer(node, name);

			if( target ) {
				var ancestor = coretree.getAncestor(node, target);

				var overlays = coretree.getChild(ancestor, OVERLAYS);
				var sourcePath = coretree.getPath(node, ancestor);
				var targetPath = coretree.getPath(target, ancestor);

				overlayInsert(overlays, sourcePath, name, targetPath);
			}
		};

		return {
			// check
			isValidNode: isValidNode,
			isValidRelid: isValidRelid,
			isValidPath: isValidPath,

			// root
			getKey: coretree.getHash,
			loadRoot: FUTURE.unadapt(coretree.loadRoot),

			persist: function (node, callback) {
				var finished = coretree.persist(node);

				FUTURE.call(finished, function () {
					// TODO: we need to do something with error
					callback(null);
				});

				return coretree.getHash(node);
			},

			getRoot: coretree.getRoot,

			// containment
			getLevel: coretree.getLevel,
			getStringPath: coretree.getPath,
			getParent: coretree.getParent,
			getRelid: coretree.getRelid,
			getChildrenRelids: getChildrenRelids,
			getChildrenPaths: getChildrenPaths,
			loadChild: FUTURE.unadapt(coretree.loadChild),
			loadByPath: FUTURE.unadapt(coretree.loadByPath),
			loadChildren: FUTURE.unadapt(loadChildren),

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
			loadPointer: FUTURE.unadapt(loadPointer),
			deletePointer: deletePointer,
			setPointer: setPointer,
			getCollectionNames: getCollectionNames,
			getCollectionPaths: getCollectionPaths,
			loadCollection: FUTURE.unadapt(loadCollection),

			getSingleNodeHash: getSingleNodeHash,
			getCommonPathPrefixData: getCommonPathPrefixData
		};
	};

	return Core;
});
