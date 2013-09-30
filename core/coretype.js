/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "util/assert", "core/core", "core/tasync" ], function (ASSERT, Core, TASYNC) {
	"use strict";

	// ----------------- CoreType -----------------

	var CoreType = function (core) {

		var __test = function (text, cond) {
			if (!cond) {
				throw new Error(text);
			}
		};

		var isValidNode = function (node) {
			try {
				__test("core", core.isValidNode(node));
				return true;
			} catch (error) {
				console.log("Wrong node", error.stack);
				return false;
			}
		};

		return {
			// check
			isValidNode: isValidNode,
			isValidRelid: core.isValidRelid,
			isValidPath: core.isValidPath,

			// root
			getHash: core.getHash,
			isEmpty: core.isEmpty,

			loadRoot: core.loadRoot,
			persist: core.persist,
			getRoot: core.getRoot,

			// containment
			getLevel: core.getLevel,
			getPath: core.getPath,
			getParent: core.getParent,
			getRelid: core.getRelid,
			getChildrenRelids: core.getChildrenRelids,
			getChildrenPaths: core.getChildrenPaths,

            getChild: core.getChild,
			loadChild: core.loadChild,
			loadByPath: core.loadByPath,
			loadChildren: core.loadChildren,

			// modify
			createNode: core.createNode,
			deleteNode: core.deleteNode,
			copyNode: core.copyNode,
			moveNode: core.moveNode,

			// attributes
			getAttributeNames: core.getAttributeNames,
			getAttribute: core.getAttribute,
			setAttribute: core.setAttribute,
			delAttribute: core.delAttribute,
			getRegistryNames: core.getRegistryNames,
			getRegistry: core.getRegistry,
			setRegistry: core.setRegistry,
			delRegistry: core.delRegistry,

			// relations
			getPointerNames: core.getPointerNames,
			getPointerPath: core.getPointerPath,
			hasPointer: core.hasPointer,
			getOutsidePointerPath: core.getOutsidePointerPath,
			loadPointer: core.loadPointer,
			deletePointer: core.deletePointer,
			setPointer: core.setPointer,
			getCollectionNames: core.getCollectionNames,
			getCollectionPaths: core.getCollectionPaths,
			loadCollection: core.loadCollection,

			getSingleNodeHash: core.getSingleNodeHash,
			getCommonPathPrefixData: core.getCommonPathPrefixData
		};
	};

	return CoreType;
});
