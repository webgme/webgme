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

        function isFalseNode(node) {
            //TODO this hack should be removed, but now it seems just fine :)
            if(typeof core.getPointerPath(node,"base") === "undefined" /*&& node.base !== null*/){
                return true;
            }
            return false;
        }

		core.isValidNode = isValidNode;
        core.isFalseNode = isFalseNode;

		// ----- navigation

		core.getBase = function(node) {
			ASSERT(isValidNode(node));

			// TODO: check if base has moved
			return node.base;
		};

		core.loadRoot = function(hash) {
			return TASYNC.call(__loadRoot2, oldcore.loadRoot(hash));
		};

		function __loadRoot2(node) {
            ASSERT(typeof node.base === "undefined" || node.base === null); //kecso

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
			ASSERT(typeof node.base === "undefined" || node.base === null); //kecso

            if(target === null){
                node.base = null;
                return node;
            } else {
                return TASYNC.call(function(n,b){n.base = b; return n;},node,__loadBase(target));
            }
		}

        core.getChildrenRelids = function(node){
            var inheritRelIds = node.base === null ? [] : oldcore.getChildrenRelids(core.getBase(node));
            var ownRelIds = oldcore.getChildrenRelids(node);
            for(var i=0;i<inheritRelIds.length;i++){
                if(ownRelIds.indexOf(inheritRelIds[i]) === -1){
                    ownRelIds.push(inheritRelIds[i]);
                }
            }
            return ownRelIds;
        };
		core.loadChildren = function(node) {
			ASSERT(isValidNode(node));

            //now we made it not recursive so we only check the children of the base
            var inhertChildren = node.base === null ? [] : TASYNC.call(__loadBaseArray, oldcore.loadChildren(core.getBase(node)));
            var ownChildren = TASYNC.call(__loadBaseArray, oldcore.loadChildren(node));
            var findChild = function(children,relid){
                for(var i=0;i<children.length;i++){
                    if(core.getRelid(children[i]) === relid){
                        return children[i];
                    }
                }
                return null;
            };
            var createMissingChildren = function(own,inherited){
                //we should create inherited children which missing
                var inheritRelIds = node.base === null ? [] : oldcore.getChildrenRelids(core.getBase(node));
                var ownRelIds = oldcore.getChildrenRelids(node);
                var missingChildren = [];
                for(var i=0;i<inheritRelIds.length;i++){
                    if(ownRelIds.indexOf(inheritRelIds[i]) === -1){
                        missingChildren.push(inheritRelIds[i]);
                    }
                }

                var presize = own.length;
                for(var i=0;i<missingChildren.length;i++){
                    var newChild = core.createNode(node,findChild(inherited,missingChildren[i]),missingChildren[i]);
                    own.push(newChild);
                }

                if(own.length > presize){
                    core.persist(core.getRoot(node));
                }
                return own;
            };
            return TASYNC.call(createMissingChildren,ownChildren,inhertChildren);
		};
        /*core.loadChildren = function(node) {
            ASSERT(isValidNode(node));
            return TASYNC.call(__loadBaseArray, oldcore.loadChildren(node));
        };*/


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

		// ----- creation

		core.createNode = function(parent, base, relid) {
			ASSERT(!parent || isValidNode(parent));
			ASSERT(!base || isValidNode(base));
			ASSERT(typeof relid === "undefined" || typeof relid === "string");

			var node = oldcore.createNode(parent, relid);
			if (!!base) {
				oldcore.setPointer(node, "base", base);
                //TODO maybe this is not the best way, needs to be double checked
                node.base = base;
			} else {
                node.base = null;
                oldcore.setPointer(node,"base",null);
            }

			return node;
		};

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

		core.getRegistryNames = function(node) {
			ASSERT(isValidNode(node));

			var merged = {};
			do {
				var names = oldcore.getRegistryNames(node);
				for ( var i = 0; i < names.length; ++i) {
					if (!(names[i] in merged)) {
						merged[names[i]] = true;
					}
				}

				node = node.base;
			} while (node);

			return Object.keys(merged);
		};

		core.getAttribute = function(node, name) {
			ASSERT(isValidNode(node));
            var value;
			do {
				value = oldcore.getAttribute(node, name);
				node = node.base;
			} while (typeof value === "undefined" && node !== null);

			return value;
		};

		core.getRegistry = function(node, name) {
			ASSERT(isValidNode(node));
            var value;
			do {
				value = oldcore.getRegistry(node, name);
				node = node.base;
			} while (typeof value === "undefined" && node !== null);

			return value;
		};

		// ----- pointers

		core.getPointerNames = function(node) {
			ASSERT(isValidNode(node));

			var merged = {};
			do {
				var names = oldcore.getPointerNames(node);
				for ( var i = 0; i < names.length; ++i) {
					if (!(names[i] in merged)) {
						merged[names[i]] = true;
					}
				}

				node = node.base;
			} while (node);

			return Object.keys(merged);
		};

		core.getPointer = function(node, name) {
			ASSERT(isValidNode(node));
            var value;
			do {
				value = oldcore.getPointer(node, name);
				node = node.base;
			} while (typeof value === "undefined" && node !== null);

			return value;
		};

        // -------- kecso
        core.setBase = function(node,base){
            ASSERT(isValidNode(node) && (isValidNode(base) || base === undefined || base === null));
            if(!!base){
                oldcore.setPointer(node, "base", base);
                //TODO maybe this is not the best way, needs to be double checked
                node.base = base;
            } else {
                oldcore.delPointer(node,'base');
                delete node.base;
            }
        };

        core.getChild = function(node,relid){
            ASSERT(isValidNode(node) && (typeof node.base === 'undefined' || typeof node.base === 'object'));
            var child = oldcore.getChild(node,relid);
            if(node.base !== null && node.base !== undefined){
                if(child.base === null || child.base === undefined){
                    child.base = core.getChild(node.base,relid);
                }
            } else {
                child.base = null;
            }
            return child;
        };
        core.moveNode = function(node,parent){
            var base = node.base;
            var moved = oldcore.moveNode(node,parent);
            moved.base = base;
            return moved;
        };
        core.copyNode = function(node,parent){
            var base = node.base;
            var newnode = oldcore.copyNode(node,parent);
            newnode.base = base;
            return newnode;
        };
        // -------- kecso

		return core;
	};

	return CoreType;
});
