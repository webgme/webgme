/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "util/assert", "core/core", "core/tasync" ], function(ASSERT, Core, TASYNC) {
	"use strict";

	// ----------------- CoreType -----------------

	var CoreType = function(oldcore) {
		// copy all operations
		var core = {};
		for ( var key in oldcore) {
			core[key] = oldcore[key];
		}

		// ----- validity

		function __test(text, cond) {
			if (!cond) {
				throw new Error(text);
			}
		}

		function isValidNode(node) {
			try {
				__test("core", oldcore.isValidNode(node));
				__test("base", typeof node.base === "object");
				return true;
			} catch (error) {
				console.log("Wrong node", error.stack);
				return false;
			}
		}

		core.isValidNode = isValidNode;

		// ----- navigation

		core.getBase = function(node) {
			ASSERT(isValidNode(node));

			// TODO: check if base has moved
			return node.base;
		};

		core.loadRoot = function(hash) {
			TASYNC.call(__loadRoot2, oldcore.loadRoot(hash));
		};

		function __loadRoot2(node) {
			ASSERT(typeof node.base === "undefined");

			node.base = null;
			return node;
		}

		core.loadChild = function(node, relid) {
			ASSERT(isValidNode(node));
			return TASYNC.call(__loadBase, oldcore.loadChild(node, relid));
		};

		core.loadByPath = function(node, path) {
			ASSERT(isValidNode(node));
			return TASYNC.call(__loadBase, oldcore.loadByPath(node, path));
		};

		core.loadPointer = function(node, name) {
			ASSERT(isValidNode(node));
			return TASYNC.call(__loadBase, oldcore.loadPointer(node, name));
		};

		function __loadBase(node) {
			ASSERT(typeof node.base === "undefined" || typeof node.base === "object");

			if (typeof node.base === "undefined") {
				return TASYNC.call(__loadBase2, node, oldcore.loadPointer(node, "base"));
			} else {
				// TODO: check if base has moved
				return node;
			}
		}

		function __loadBase2(node, target) {
			ASSERT(typeof node.base === "undefined");

			node.base = target || null;
			return node;
		}

		core.loadChildren = function(node) {
			ASSERT(isValidNode(node));
			return TASYNC.call(__loadBaseArray, oldcore.loadChildren(node));
		};

		core.loadCollection = function(node, name) {
			ASSERT(isValidNode(node));
			return TASYNC.call(__loadBaseArray, oldcore.loadCollection(node, name));
		};

		function __loadBaseArray(nodes) {
			ASSERT(nodes instanceof Array);

			for ( var i = 0; i < nodes.length; ++i)
				nodes[i] = __loadBase(nodes[i]);

			return TASYNC.lift(nodes);
		}

		// ----- properties

		core.getAttributeNames = function(node) {
			ASSERT(isValidNode(node));

			var merged = {};
			do {
				var names = oldcore.getAttributeNames(node);
				for ( var i = 0; i < names.length; ++i) {
					if (!(names[i] in merged)) {
						merged[names[i]] = true;
					}
				}

				node = node.base;
			} while (node);

			return Object.keys(merged);
		};

		return core;
	};

	return CoreType;
});
