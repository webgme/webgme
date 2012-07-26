/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "core/assert", "core/core2", "core/util", "core/monadjs" ], function (ASSERT, CoreRels,
UTIL, MONADJS) {
	"use strict";

	var PROTOTYPE = "typ";
	
	var CoreType = function (storage) {

		var corerels = new CoreRels(storage);

		var isValid = function (node) {
			while( node ) {
				if( !corerels.isValid(node) ) {
					return false;
				}
				node = node.type;
			}
			return true;
		};

		var getKey = function (node) {
			ASSERT(isValid(node));

			return node.type ? undefined : corerels.getKey(node);
		};

		var loadChild = function (node, relid, callback) {
			ASSERT(isValid(node) && typeof callback === "function");

			var childType = node.type ? coreTypeLoadChild(node.type, relid) : null;
			var childNode = node.data ? coreRelsLoadChild(node, relid) : null;

			var result = MONADJS.call([ childType, childNode ], function (childType, childNode) {
				if( childNode === null && childType === null ) {
					return null;
				}

				if( !childNode ) {
					return childType ? {
						parent: node,
						type: childType
					} : null;
				}

				if( childType ) {
					ASSERT(corerels.getPointerPath(childNode, PROTOTYPE) === undefined);
					
					childNode.type = childType;
					return childNode;
				}
				
				childType = coreRelsLoadPointer(childNode, PROTOTYPE);
				return MONADJS.call([childType], function(childType) {
					
				});
			});
			result.register(callback);
		};

		var coreRelsLoadPointer = MONADJS.wrap(corerels.loadPointer);
		var coreRelsLoadChild = MONADJS.wrap(corerels.loadChild);
		var coreTypeLoadChild = MONADJS.wrap(loadChild);

		return {
			isValid: isValid,

			// root management
			getKey: getKey,
			loadRoot: corerels.loadRoot,
			persist: corerels.persist,
			getRoot: corerels.getRoot,

			// containment
			getParent: corerels.getParent,
//			loadChildren: loadChildren,
//			getChildrenRelids: getChildrenRelids,
			loadChild: loadChild,
			getLevel: corerels.getLevel,
			getStringPath: corerels.getStringPath

//			createNode: createNode,
//			deleteNode: deleteNode,
//			copyNode: copyNode,
//			moveNode: moveNode,

//			getAttributeNames: getAttributeNames,
//			getAttribute: getAttribute,
//			setAttribute: setAttribute,
//			delAttribute: delAttribute,
//			getRegistry: getRegistry,
//			setRegistry: setRegistry,
//			delRegistry: delRegistry,

//			getPointerNames: getPointerNames,
//			getPointerPath: getPointerPath,
//			loadPointer: loadPointer,
//			deletePointer: deletePointer,
//			setPointer: setPointer,
//			loadCollection: loadCollection,
//			getCollectionNames: getCollectionNames,
//			getCollectionPaths: getCollectionPaths,
//			dumpTree: pertree.dumpTree
		};
	};

	return CoreType;
});
