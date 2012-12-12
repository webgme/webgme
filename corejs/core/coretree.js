/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/lib/sha1", "core/util", "core/future" ], function (ASSERT, SHA1,
UTIL, FUTURE) {
	"use strict";

	var HASH_REGEXP = new RegExp("#[0-9a-f]{40}");
	var isValidHash = function (key) {
		return typeof key === "string" && key.length === 41 && HASH_REGEXP.test(key);
	};

	var MAX_RELID = Math.pow(2, 31);
	var createRelid = function (data) {
		ASSERT(data && typeof data === "object");

		var relid;
		do {
			relid = Math.floor(Math.random() * MAX_RELID);
			// relid = relid.toString();
		} while( data[relid] !== undefined );

		return "" + relid;
	};

	// make relids deterministic
	if( false ) {
		var nextRelid = 0;
		createRelid = function (data) {
			ASSERT(data && typeof data === "object");

			var relid;
			do {
				relid = (nextRelid += -1);
			} while( data[relid] !== undefined );

			return "" + relid;
		};
	}

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

		var getPath = function (node, base) {
			var path = "";
			while( node.relid !== null && node !== base ) {
				path = "/" + node.relid + path;
				node = node.parent;
			}
			return path;
		};

		// ------- memory management

		var __detachChildren = function (node) {
			console.log(node);
			ASSERT(node.children instanceof Array && node.age >= MAX_AGE - 1);

			var children = node.children;
			node.children = null;
			node.age = MAX_AGE;

			for( var i = 0; i < children.length; ++i ) {
				__detachChildren(children[i]);
			}
		};

		var __ageNodes = function (nodes) {
			ASSERT(nodes instanceof Array);

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
			ASSERT(children instanceof Array && typeof relid === "string");

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

		var createRoot = function () {
			__ageRoots();

			var root = {
				parent: null,
				relid: null,
				age: 0,
				children: [],
				data: {
					_mutable: true
				}
			};
			root.data[HASH_ID] = "";

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
				data: __getChildData(node.data, relid)
			};

			node.children.push(child);
			return child;
		};

		var createChild = function (node) {
			node = normalize(node);

			if( typeof node.data !== "object" || node.data === null ) {
				throw new Error("invalid node data");
			}

			var relid = createRelid(node.data);

			__ageRoots();
			var child = {
				parent: node,
				relid: relid,
				age: 0,
				children: [],
				data: EMPTY_DATA
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

		var isObject = function (node) {
			node = normalize(node);

			return typeof node.data === "object" && node.data !== null;
		};

		var isEmpty = function (node) {
			if( typeof node.data !== "object" || node.data === null ) {
				return false;
			}

			return __isEmptyData(node.data);
		};

		var __isEmptyData = function (data) {
			for( var keys in data ) {
				return false;
			}
			return true;
		};

		var __areEquivalent = function (data1, data2) {
			return data1 === data2
			|| (typeof data1 === "string" && data1 === __getChildData(data2, HASH_ID))
			|| (__isEmptyData(data1) && __isEmptyData(data2));
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

			ASSERT(copy._mutable === true);

			if( typeof data[HASH_ID] === "string" ) {
				copy[HASH_ID] = "";
			}

			if( node.parent !== null ) {
				ASSERT(__areEquivalent(__getChildData(node.parent.data, node.relid), node.data));
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
			ASSERT(data !== null && typeof data !== "undefined");

			node = normalize(node);
			if( node.parent !== null ) {
				if( !mutate(node.parent) ) {
					throw new Error("incorrect node data");
				}

				node.parent.data[node.relid] = data;
			}

			node.data = data;
			__reloadChildrenData(node);
		};

		var deleteData = function (node) {
			node = normalize(node);

			if( node.parent !== null ) {
				if( !mutate(node.parent) ) {
					throw new Error("incorrect node data");
				}

				delete node.parent.data[node.relid];
			}

			var data = node.data;

			node.data = EMPTY_DATA;
			__reloadChildrenData(node);

			return data;
		};

		var copyData = function (node) {
			node = normalize(node);

			if( typeof node.data !== "object" || node.data === null ) {
				return node.data;
			}

			return JSON.parse(JSON.stringify(node.data));
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
			ASSERT(!__isMutableData(data) && data !== null && data !== undefined);

			node = normalize(node);
			if( !mutate(node) ) {
				throw new Error("incorrect node data");
			}

			node.data[name] = data;

			var child = __getChildNode(node.children, name);
			if( child !== null ) {
				child.data = data;
				__reloadChildrenData(child);
			}
		};

		var deleteProperty = function (node, name) {
			ASSERT(typeof name === "string" && name !== HASH_ID);

			node = normalize(node);
			if( !mutate(node) ) {
				throw new Error("incorrect node data");
			}

			delete node.data[name];

			var child = __getChildNode(node.children, name);
			if( child !== null ) {
				child.data = EMPTY_DATA;
				__reloadChildrenData(child);
			}
		};

		var getKeys = function (node) {
			node = normalize(node);

			if( typeof node.data !== "object" || node.data === null ) {
				return null;
			}

			var keys = Object.keys(node.data);

			var i = keys.length;
			while( --i >= 0 && keys[i].charAt(0) === "_" ) {
				keys.pop();
			}

			while( --i >= 0 ) {
				if( keys[i].charAt(0) === "_" ) {
					keys[i] = keys.pop();
				}
			}

			return keys;
		};

		// ------- persistence

		var getHash = function (node) {
			node = normalize(node);
			var hash = __getChildData(node.data, HASH_ID);

			ASSERT(typeof hash === "string" || typeof hash === "undefined");
			return hash;
		};

		var isHashed = function (node) {
			node = normalize(node);
			var hash = __getChildData(node.data, HASH_ID);

			ASSERT(typeof hash === "string" || typeof hash === "undefined");
			return typeof hash === "string";
		};

		var setHashed = function (node, hashed) {
			ASSERT(typeof hashed === "boolean");

			node = normalize(node);
			if( !mutate(node) ) {
				throw new Error("incorrect node data");
			}

			if( hashed ) {
				node.data[HASH_ID] = "";
			}
			else {
				delete node.data[HASH_ID];
			}

			ASSERT(typeof node.children[HASH_ID] === "undefined");
		};

		var __storageSave = FUTURE.adapt(storage.save);
		var __saveData = function (data, promises) {
			ASSERT(__isMutableData(data));

			var relid, hash, child, nonempty = false;
			delete data._mutable;

			for( relid in data ) {
				child = data[relid];
				if( __isMutableData(child) ) {
					if( __saveData(child, promises) ) {
						nonempty = true;
						if( typeof child[HASH_ID] === "string" ) {
							data[relid] = child[HASH_ID];
						}
					}
					else {
						delete data[relid];
					}
				}
				else {
					nonempty = true;
				}
			}

			if( nonempty ) {
				hash = data[HASH_ID];
				ASSERT(hash === "" || typeof key === "undefined");

				if( hash === "" ) {
					hash = "#" + SHA1(JSON.stringify(data));
					data[HASH_ID] = hash;

					promises.push(__storageSave(data));
				}
			}

			return nonempty;
		};

		var persist = function (node) {
			node = normalize(node);

			if( !__isMutableData(node.data) ) {
				return false;
			}

			var promises = [];
			__saveData(node.data, promises);

			return FUTURE.array(promises);
		};

		var __storageLoad = FUTURE.adapt(storage.load);
		var loadRoot = function (hash) {
			ASSERT(isValidHash(hash));

			return FUTURE.call(__storageLoad(hash), __loadRoot2);
		};

		var __loadRoot2 = function (data) {
			__ageRoots();

			var root = {
				parent: null,
				relid: null,
				age: 0,
				children: [],
				data: data
			};

			roots.push(root);
			return root;
		};

		var loadChild = function (node, relid) {
			if( node === null ) {
				return null;
			}

			node = getChild(node, relid);

			if( isValidHash(node.data) ) {
				return FUTURE.call(node, __storageLoad(node.data), __loadChild2);
			}
			else {
				return typeof node.data === "object" && node.data !== null ? node : null;
			}
		};

		var __loadChild2 = function (node, newdata) {
			node = normalize(node);

			node.data = newdata;
			__reloadChildrenData(node);

			return node;
		};

		var loadDescendantByPath = function (node, path) {
			ASSERT(path === "" || path.charAt(0) === "/");

			path = path.split("/");

			for( var i = 1; i < path.length; ++i ) {
				node = loadChild(node, path[i]);
			}

			return node;
		};

		// ------- valid -------

		var __test = function (text, cond) {
			if( !cond ) {
				throw new Error(text);
			}
		};

		var isValidNode = function (node) {
			try {
				__test("object", typeof node === "object" && node !== null);
				__test("parent", typeof node.parent === "object");
				__test("relid", typeof node.relid === "string" || node.relid === null);
				__test("parent 2", (node.parent === null) === (node.relid === null));
				__test("age", node.age >= 0 && node.age <= MAX_AGE);
				__test("children", node.children === null || node.children instanceof Array);
				__test("children 2", (node.age === MAX_AGE) === (node.children === null));
				__test("data", typeof node.data === "object" || typeof node.data === "string"
				|| typeof node.data === "number");

				if( node.parent !== null ) {
					__test("age 2", node.age >= node.parent.age);
					__test("mutable", !__isMutableData(node.parent.data)
					|| __isMutableData(node.data));
				}

				return true;
			}
			catch(error) {
				return false;
			}
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
			createChild: createChild,
			getChild: getChild,
			getDescendant: getDescendant,
			getDescendantByPath: getDescendantByPath,

			isMutable: isMutable,
			isObject: isObject,
			isEmpty: isEmpty,
			mutate: mutate,
			getData: getData,
			setData: setData,
			deleteData: deleteData,
			copyData: copyData,
			getProperty: getProperty,
			setProperty: setProperty,
			deleteProperty: deleteProperty,
			getKeys: getKeys,

			isHashed: isHashed,
			setHashed: setHashed,
			getHash: getHash,
			persist: persist,
			loadRoot: loadRoot,
			loadChild: loadChild,
			loadDescendantByPath: loadDescendantByPath,

			isValidNode: isValidNode
		};
	};
});
