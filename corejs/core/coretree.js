/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define(
[ "core/assert", "core/lib/sha1", "core/util" ],
function (ASSERT, SHA1, UTIL) {
	"use strict";

	var HASH_REGEXP = new RegExp("#[0-9a-f]{40}");
	var isValidHash = function (key) {
		return typeof key === "string" && key.length === 41 && HASH_REGEXP.test(key);
	};

	return function (storage) {

		var roots = [];
		var ticks = 0;

		var MAX_AGE = 2;
		var MAX_TICKS = 1;
		var HASH_ID = "_id";
		var EMPTY_DATA = {};

		// ------- static methods

		var getParent = function (node) {
			ASSERT(typeof node.parent === "object");
			return node.parent;
		};

		var getRelid = function (node) {
			ASSERT(node.relid === null || typeof node.relid === "string");
			return node.relid;
		};

		var getLevel = function (node) {
			var level = 0;
			while( node.parent !== null ) {
				++level;
				node = node.parent;
			}
			return level;
		};

		var getRoot = function (node) {
			while( node.parent !== null ) {
				node = node.parent;
			}
			return node;
		};

		var getPath = function (node) {
			var path = "";
			while( node.relid !== null ) {
				path = "/" + node.relid + path;
				node = node.parent;
			}
			return path;
		};

		// ------- memory management

		var __detachChildren = function (node) {
			ASSERT(Array.isArray(node.children) && node.age >= MAX_AGE - 1);

			var children = node.children;
			node.children = null;
			node.age = MAX_AGE;

			for( var relid in children ) {
				__detachChildren(children[relid]);
			}
		};

		var __ageNodes = function (nodes) {
			ASSERT(Array.isArray(nodes));

			var i = nodes.length;
			while( --i >= 0 ) {
				var node = nodes[i];

				ASSERT(node.age < MAX_AGE);
				if( ++node.age >= MAX_AGE ) {
					nodes.splice(i, 1);
					__detachChildren(node);
				}
				else {
					__ageNodes(node.children);
				}
			}
		};

		var __ageRoots = function () {
			if( ++ticks >= MAX_TICKS ) {
				ticks = 0;
				__ageNodes(roots);
			}
		};

		var __getChildNode = function (children, relid) {
			ASSERT(Array.isArray(children) && typeof relid === "string");

			for( var i = 0; i < children.length; ++i ) {
				var child = children[i];
				if( child.relid === relid ) {
					child.age = 0;
					return child;
				}
			}

			return null;
		};

		var __getChildData = function (data, relid) {
			ASSERT(typeof relid === "string");

			if( typeof data === "object" && data !== null ) {
				data = data[relid];
				return typeof data === "undefined" ? EMPTY_DATA : data;
			}
			else {
				return null;
			}
		};

		var normalize = function (node) {
			var parent;

			if( node.children === null ) {
				ASSERT(node.age === MAX_AGE);

				if( node.parent !== null ) {
					parent = normalize(node.parent);
					node.parent = parent;

					var temp = __getChildNode(parent.children, node.relid);
					if( temp !== null ) {
						// make old node closer to the correct one
						node.data = temp.data;
						return temp;
					}

					temp = __getChildData(parent.data, node.relid);
					if( !isValidHash(temp) || temp !== __getChildData(node.data, HASH_ID) ) {
						node.data = temp;
					}

					node.parent = parent;
					parent.children.push(node);
				}
				else {
					roots.push(node);
				}

				node.age = 0;
				node.children = [];
			}
			else if( node.age !== 0 ) {
				parent = node;
				do {
					parent.age = 0;
					parent = parent.parent;
				} while( parent !== null && parent.age !== 0 );
			}

			return node;
		};

		// ------- hierarchy

		var getAncestor = function (first, second) {
			ASSERT(getRoot(first) === getRoot(second));

			first = normalize(first);
			second = normalize(second);

			var a = [];
			do {
				a.push(first);
				first = first.parent;
			} while( first !== null );

			var b = [];
			do {
				b.push(second);
				second = second.parent;
			} while( second !== null );

			var i = a.length - 1;
			var j = b.length - 1;
			while( i !== 0 && j !== 0 && a[i - 1] === b[j - 1] ) {
				--i;
				--j;
			}

			ASSERT(a[i] === b[j]);
			return a[i];
		};

		var isAncestor = function (node, ancestor) {
			ASSERT(getRoot(node) === getRoot(ancestor));

			node = normalize(node);
			ancestor = normalize(ancestor);

			do {
				if( node === ancestor ) {
					return true;
				}

				node = node.parent;
			} while( node !== null );

			return false;
		};

		var createRoot = function (hash) {
			ASSERT(typeof hash === "undefined" || isValidHash(hash));

			__ageRoots();
			var root = {
				parent: null,
				relid: null,
				age: 0,
				children: [],
				data: typeof hash !== "undefined" ? hash : EMPTY_DATA
			};

			roots.push(root);
			return root;
		};

		var getChild = function (node, relid) {
			ASSERT(typeof relid === "string" && relid !== HASH_ID);

			node = normalize(node);

			var child = __getChildNode(node.children, relid);
			if( child !== null ) {
				return child;
			}

			__ageRoots();
			child = {
				parent: node,
				relid: relid,
				age: 0,
				children: [],
				data: __getChildData(node, relid)
			};

			node.children.push(child);
			return child;
		};

		var getDescendant = function (node, head, base) {
			ASSERT(typeof base === "undefined" || isAncestor(head, base));

			node = normalize(node);
			head = normalize(head);
			base = typeof base === "undefined" ? null : normalize(base.parent);

			var path = [];
			while( head.parent !== base ) {
				path.push(head.relid);
				head = head.parent;
			}

			var i = path.length;
			while( --i >= 0 ) {
				node = getChild(node, path[i]);
			}

			return node;
		};

		var getDescendantByPath = function (node, path) {
			ASSERT(path === "" || path.charAt(0) === "/");

			path = path.split("/");

			for( var i = 1; i < path.length; ++i ) {
				node = getChild(node, path[i]);
			}

			return node;
		};

		// ------- data manipulation

		var __isMutableData = function (data) {
			return typeof data === "object" && data !== null && data._mutable === true;
		};

		var isMutable = function (node) {
			node = normalize(node);
			return __isMutableData(node.data);
		};

		var mutate = function (node) {
			node = normalize(node);
			var data = node.data;

			if( typeof data !== "object" || data === null ) {
				return false;
			}
			else if( data._mutable === true ) {
				return true;
			}
			else if( node.parent !== null && !mutate(node.parent) ) {
				// this should never happen
				return false;
			}

			var copy = {
				_mutable: true
			};

			for( var key in data ) {
				copy[key] = data[key];
			}

			if( typeof data[HASH_ID] === "string" ) {
				copy[HASH_ID] = "";
			}

			// make sure we did not overwrite it
			ASSERT(copy._mutable === true);

			if( node.parent !== null ) {
				// ugly check, but it is correct
				ASSERT(__getChildData(node.parent.data, node.relid) === node.data
				|| (isValidHash(node.parent.data[node.relid]) && node.parent.data[node.relid] === __getChildData(
				node.data, HASH_ID)));

				node.parent.data[node.relid] = copy;
			}

			node.data = copy;
			return true;
		};

		var getData = function (node) {
			node = normalize(node);

			ASSERT(!__isMutableData(node.data));
			return node.data;
		};

		var __reloadChildrenData = function (node) {
			for( var i = 0; i < node.children.length; ++i ) {
				var child = node.children[i];

				var data = __getChildData(node.data, child.relid);
				if( !isValidHash(data) || data !== __getChildData(child.data, HASH_ID) ) {
					child.data = data;
					__reloadChildrenData(child);
				}
			}
		};

		var setData = function (node, data) {
			ASSERT(!__isMutableData(data) && data !== null);

			node = normalize(node);
			if( node.parent !== null ) {
				if( !mutate(node.parent) ) {
					throw new Error("incorrect path");
				}

				node.parent.data[node.relid] = data;
			}

			node.data = data;
			__reloadChildrenData(node);
		};

		var getProperty = function (node, name) {
			ASSERT(typeof name === "string" && name !== HASH_ID);

			node = normalize(node);
			var data = __getChildData(node.data, name);

			ASSERT(!__isMutableData(node.data));
			return data;
		};

		var setProperty = function (node, name, data) {
			ASSERT(typeof name === "string" && name !== HASH_ID);
			ASSERT(!__isMutableData(data) && data !== null);

			node = normalize(node);
			if( !mutate(node) ) {
				throw new Error("incorrect path");
			}

			node.data[name] = data;

			var child = __getChildNode(node.children, name);
			if( child !== null ) {
				child.data = data;
				__reloadChildrenData(child);
			}
		};

		var isHashed = function (node) {
			node = normalize(node);
			var data = __getChildData(node.data, HASH_ID);

			ASSERT(typeof data === "string" || typeof data === "undefined");
			return typeof data === "string";
		};

		var setHashed = function (node, hashed) {
			ASSERT(typeof hashed === "boolean");

			node = normalize(node);
			if( !mutate(node) ) {
				throw new Error("incorrect path");
			}

			if( hashed ) {
				node.data[HASH_ID] = "";
			}
			else {
				delete node.data[HASH_ID];
			}

			ASSERT(typeof node.children[HASH_ID] === "undefined");
		};

		return {
			getParent: getParent,
			getRelid: getRelid,
			getLevel: getLevel,
			getRoot: getRoot,
			getPath: getPath,

			normalize: normalize,
			getAncestor: getAncestor,
			isAncestor: isAncestor,
			createRoot: createRoot,
			getChild: getChild,
			getDescendant: getDescendant,
			getDescendantByPath: getDescendantByPath,

			isMutable: isMutable,
			mutate: mutate,
			getData: getData,
			setData: setData,
			getProperty: getProperty,
			setProperty: setProperty,
			isHashed: isHashed,
			setHashed: setHashed,

			nothing: null
		};
	};
});
