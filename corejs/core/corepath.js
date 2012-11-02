/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/util" ], function (ASSERT, UTIL) {
	"use strict";

	// ----------------- PersistentTree -----------------

	var isValidRelid = function (relid) {
		return typeof relid === "string" /* && relid !== "" */;
	};

	var isValidNode = function (node) {
		try {
			var verify = function (text, cond) {
				if( !cond ) {
					throw text;
				}
			};

			verify("non-object", typeof node === "object");

			verify("relid", (node.relid === undefined && node.parent === null)
			|| (isValidRelid(node.relid) && typeof node.parent === "object"));

			verify("children 1", Array.isArray(node.children));

			verify("children 2", node.parent === null || Array.isArray(node.parent.children));

			verify("contained", node.parent === null
			|| node.parent.children[node.relid] === undefined
			|| node.parent.children[node.relid] === node);
		}
		catch(error) {
			console.log("WRONG NODE: " + error, node);
			return false;
		}

		return true;
	};

	var getPath = function (node, base) {
		ASSERT(isValidNode(node));
		ASSERT(base === undefined || isValidNode(base));

		var path = "";
		while( node.parent && node !== base ) {
			if( path === "" ) {
				path = node.relid;
			}
			else {
				path = node.relid + "/" + path;
			}
			node = node.parent;
		}
		return path;
	};

	var joinPaths = function (first, second) {
		ASSERT(typeof first === "string" && typeof second === "string");
		return second ? (first ? first + "/" + second : second) : first;
	};

	var getParent = function (node) {
		ASSERT(isValidNode(node));
		return node.parent;
	};

	var getRelid = function (node) {
		ASSERT(isValidNode(node));
		return node.relid;
	};

	var getLevel = function (node, base) {
		ASSERT(isValidNode(node));
		ASSERT(base === undefined || isValidNode(base));

		var level = 0;
		while( node.parent && node !== base ) {
			++level;
			node = node.parent;
		}

		return level;
	};

	var isAncestorOf = function (first, second) {
		ASSERT(isValidNode(first) && isValidNode(second));

		var a = [];
		while( (first = first.parent) !== undefined ) {
			a.push(first);
		}

		var b = [];
		while( (second = second.parent) !== undefined ) {
			b.push(second);
		}

		if( a.length > b.length ) {
			return false;
		}

		for( var i = 0; i < a.length; ++i ) {
			if( a[i].relid !== b[i].relid ) {
				return false;
			}
		}

		return true;
	};

	var createRoot = function () {
		return {
			parent: null,
			relid: undefined,
			age: 0,
			children: []
		};
	};

	var getChild = function (node, relid) {
		ASSERT(isValidNode(node) && isValidRelid(relid));

		var child = node.children[relid];
		if( child === undefined ) {
			child = {
				parent: node,
				relid: relid,
				age: 0,
				children: []
			};
			node.children[relid] = child;
		}

		return child;
	};

	var getByPath = function (node, path) {
		ASSERT(isValidNode(node) && typeof path === "string");

		path = path ? path.split("/") : [];

		for( var i = 0; i < path.length; ++i ) {
			node = getChild(node, path[i]);
		}

		return node;
	};

	var getByInterval = function (node, end, base) {
		ASSERT(isValidNode(node) && isValidNode(end));
		ASSERT(base === undefined || isValidNode(base));

		var path = [];
		while( end.parent && end !== base ) {
			path.push(end.relid);
			end = end.parent;
		}

		var i = path.length;
		while( --i >= 0 ) {
			node = getChild(node, path[i]);
		}

		return node;
	};

	var CorePath = function (storage) {
		ASSERT(storage);

		var delParent = function (node) {
			ASSERT(isValidNode(node));
			ASSERT(isValidNode(node.parent));

			mutate(node.parent);
			delete node.parent.data[node.relid];

			node.parent = null;
			node.relid = undefined;
		};

		var setParent = function (node, parent, relid) {
			ASSERT(isValidNode(node) && isValidRelid(relid));
			ASSERT(node.parent === null && !node.relid);
			ASSERT(parent.data[relid] === undefined);

			mutate(parent);
			parent.data[relid] = node.data[KEYNAME] || node.data;

			node.parent = parent;
			node.relid = relid;
		};

		var getRoot = function (node) {
			ASSERT(isValidNode(node));

			while( node.parent ) {
				node = node.parent;
			}

			return node;
		};

		var getCommonAncestor = function (first, second) {
			ASSERT(isValidNode(first) && isValidNode(second));

			var a = [];
			do {
				a.push(first);
				first = first.parent;
			} while( first );

			var b = [];
			do {
				b.push(second);
				second = second.parent;
			} while( second );

			var i = a.length - 1;
			var j = b.length - 1;
			while( i >= 1 && j >= 1 && a[i - 1].relid === b[j - 1].relid ) {
				--i;
				--j;
			}

			return [ a[i], b[j] ];
		};

		var getCommonPathPrefixData = function (first, second) {
			ASSERT(typeof first === "string" && typeof second === "string");

			first = first ? first.split("/") : [];
			second = second ? second.split("/") : [];

			var common = [];
			for( var i = 0; first[i] === second[i] && i < first.length; ++i ) {
				common.push(first[i]);
			}

			return {
				common: common.join("/"),
				first: first.slice(i).join("/"),
				firstLength: first.length - i,
				second: second.slice(i).join("/"),
				secondLength: second.length - i
			};
		};

		return {
			isValidNode: isValidNode,
			createRoot: createRoot,
			getChild: getChild,
			loadByPath: loadByPath,
			getParent: getParent,
			setParent: setParent,
			delParent: delParent,
			getLevel: getLevel,
			getPath: getPath,
			joinPaths: joinPaths,
			getCommonPathPrefixData: getCommonPathPrefixData,
			getRoot: getRoot,
			getRelid: getRelid,
			getCommonAncestor: getCommonAncestor,
			isAncestorOf: isAncestorOf
		};
	};

	return CorePath;
});
