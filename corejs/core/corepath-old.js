/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/config" ], function (ASSERT, CONFIG) {
	"use strict";

	// ----------------- CorePath -----------------

	var CorePath = function (attacher, detacher, options) {
		options = CONFIG.copyOptions(CONFIG.corepath, options);

		var maxAge = options.maxAge;
		var agingLimit = options.agingLimit;
		var agingCount = 0;
		var roots = [];

		var isValidNode = function (node) {
			try {
				var verify = function (text, cond) {
					if( !cond ) {
						throw text;
					}
				};

				verify("node", typeof node === "object" && node !== null);

				verify("parent", typeof node.parent === "object");

				verify("age", typeof node.age === "number" && node.age >= 0 && node.age <= maxAge);

				verify("relid", (typeof node.relid === "string" && node.parent !== null)
				|| (node.relid === null && node.parent === null && node.age === 0));

				verify("children", typeof node.children === "object");

				verify("aging", node.parent === null || node.age >= node.parent.age);

				verify("detached", (node.children === null && node.age === maxAge)
				|| (node.children !== null && node.age < maxAge));

				verify("containment", node.parent === null || node.parent.children === null
				|| typeof node.parent.children[node.relid] === "undefined"
				|| node.parent.children[node.relid].relid === node.relid);
			}
			catch(error) {
				console.log("WRONG NODE: " + error + " error", node);
				return false;
			}

			return true;
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

		var getRoot = function (node) {
			ASSERT(isValidNode(node));

			while( node.parent ) {
				node = node.parent;
			}

			return node;
		};

		var getAncestor = function (first, second) {
			ASSERT(isValidNode(first) && isValidNode(second));
			ASSERT(getRoot(first) === getRoot(second));

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

			// you must be in the same tree
			ASSERT(a[a.length - 1] === b[b.length - 1]);

			var i = a.length - 1;
			var j = b.length - 1;
			while( i !== 0 && a[i - 1] === b[--j] ) {
				--i;
			}

			return a[i];
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

		var isAttached = function (node) {
			ASSERT(isValidNode(node));

			return node.children !== null;
		};

		var attach = function (node) {
			ASSERT(isValidNode(node));

			var parent;

			if( node.children !== null ) {
				parent = node;

				while( parent.age !== 0 ) {
					parent.age = 0;
					parent = parent.parent;
				}

				return node;
			}

			ASSERT(node.parent !== null);
			parent = attach(node.parent);

			var child = parent.children[node.relid];
			if( typeof child === "undefined" ) {
				parent.children[node.relid] = node;

				node.parent = parent;
				node.children = {};
				node.age = 0;
				attacher(node);

				return node;
			}
			else {
				child.age = 0;
				return child;
			}
		};

		// does not remove itself from parent
		var detach = function (node) {
			var children = node.children;

			detacher(node);
			node.children = null;
			node.age = maxAge;

			for( var relid in children ) {
				detach(children[relid]);
			}
		};

		var ageNode = function (node) {
			ASSERT(node.age >= 0 && node.age < maxAge);

			if( ++node.age >= maxAge ) {
				ASSERT(node.parent.children[node.relid] === node);
				delete node.parent.children[node.relid];

				detach(node);
			}
			else {
				var children = node.children;
				for( var relid in children ) {
					ageNode(children[relid]);
				}
			}
		};

		var ageRoots = function () {
			if( ++agingCount >= agingLimit ) {
				agingCount = 0;

				for( var i = 0; i < roots.length; ++i ) {
					ASSERT(roots[i].age === 0);

					var children = roots[i].children;
					for( var relid in children ) {
						ageNode(children[relid]);
					}
				}
			}
		};

		var createRoot = function () {
			ageRoots();

			var root = {
				parent: null,
				relid: null,
				age: 0,
				children: {}
			};

			roots.push(root);
			return root;
		};

		var getChild = function (node, relid) {
			ASSERT(isValidNode(node) && typeof relid === "string");

			var child = node.children[relid];
			if( typeof child === "undefined" ) {
				ageRoots();
				node = attach(node);

				child = {
					parent: node,
					relid: relid,
					age: 0,
					children: {}
				};

				node.children[relid] = child;
			}
			else {
				child = attach(child);
			}

			return child;
		};

		var getDescendant = function (node, head, base) {
			ASSERT(isValidNode(node) && isValidNode(head));
			ASSERT(base === undefined || isValidNode(base));

			var path = [];
			while( head.parent && head !== base ) {
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
			ASSERT(isValidNode(node) && typeof path === "string");

			path = path ? path.split("/") : [];

			for( var i = 0; i < path.length; ++i ) {
				node = getChild(node, path[i]);
			}

			return node;
		};

		return {
			isValidNode: isValidNode,
			getParent: getParent,
			getRelid: getRelid,
			getRoot: getRoot,
			getLevel: getLevel,
			createRoot: createRoot,
			getChild: getChild,
			getAncestor: getAncestor,
			getDescendant: getDescendant,
			isAttached: isAttached,
			attach: attach,
			getPath: getPath,
			joinPaths: joinPaths,
			getDescendantByPath: getDescendantByPath
		};
	};

	return CorePath;
});
