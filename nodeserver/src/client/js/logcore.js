/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([], function () {
    "use strict";


    // ----------------- Core -----------------

    var LogCore = function (core,logger) {
        var log = function(msg){
            if(logger){
                logger.log("[LogCore][FC]"+msg);
            }
        };

        //check
        var isValidRelid = function (relid) {
            log("isValidRelid("+JSON.stringify(relid)+")");
            return core.isValidRelid(relid);
        };
        var isValidPath = function (path) {
            log("isValidPath("+JSON.stringify(path)+")");
            return core.isValidPath(path);
        };
        var isValidNode = function (node) {
            log("isValidNode("+JSON.stringify(node)+")");
            return core.isValidNode(node);
        };

        //root
        var getKey = function (node) {
            log("getKey("+JSON.stringify(node)+")");
            return core.getKey(node);
        };
        var loadRoot = function (key, callback) {
            log("loadRoot("+JSON.stringify(key)+")");
            return core.loadRoot(key,callback);
        };
        var persist = function (root, callback) {
            log("persist("+JSON.stringify(root)+")");
            return core.persist(root,callback);
        };
        var getRoot = function (node) {
            log("getRoot("+JSON.stringify(node)+")");
            return core.getRoot(node);
        };

        // containment
        var getLevel = function (node, base) {
            log("getLevel("+JSON.stringify(node)+","+JSON.stringify(base)+")");
            return core.getLevel(node,base);
        };
        var getStringPath = function (node, base) {
            log("getStringPath("+JSON.stringify(node)+","+JSON.stringify(base)+")");
            return core.getStringPath(node,base);
        };
        var parseStringPath = function (path) {
            log("parseStringPath("+JSON.stringify(path)+")");
            return core.parseStringPath(path);
        };
        var getParent = function (node) {
            log("getParent("+JSON.stringify(node)+")");
            return core.getParent(node);
        };
        var getChildrenRelids = function (node) {
            log("getChildrenRelids("+JSON.stringify(node)+")");
            return core.getChildrenRelids(node);
        };
        var loadChild = function (node, relid, callback) {
            log("loadChild("+JSON.stringify(node)+","+JSON.stringify(relid)+")");
            return core.loadChild(node,relid,callback);
        };
        var loadByPath = function (node, path, callback) {
            log("loadByPath("+JSON.stringify(node)+","+JSON.stringify(path)+")");
            return core.loadByPath(node,path,callback);
        };
        var loadChildren = function (node, callback) {
            log("loadChildren("+JSON.stringify(node)+")");
            return core.loadChildren(node,callback);
        };

        // modify
        var createNode = function (parent, relid) {
            log("createNode("+JSON.stringify(parent)+","+JSON.stringify(relid)+")");
            return core.createNode(parent,relid);
        };
        var deleteNode = function (node) {
            log("deleteNode("+JSON.stringify(node)+")");
            return core.deleteNode(node);
        };
        var copyNode = function (node, parent) {
            log("copyNode("+JSON.stringify(node)+","+JSON.stringify(parent)+")");
            return core.copyNode(node,parent);
        };
        var moveNode = function (node, parent) {
            log("moveNode("+JSON.stringify(node)+","+JSON.stringify(parent)+")");
            return core.moveNode(node,parent);
        };

        // attributes
        var getAttributeNames = function (node) {
            log("getAttributeNames("+JSON.stringify(node)+")");
            return core.getAttributeNames(node);
        };

        var getAttribute = function (node, name) {
            log("getAttribute("+JSON.stringify(node)+","+JSON.stringify(name)+")");
            return core.getAttribute(node,name);
        };

        var delAttribute = function (node, name) {
            log("delAttribute("+JSON.stringify(node)+","+JSON.stringify(name)+")");
            return core.delAttribute(node,name);

        };

        var setAttribute = function (node, name, value) {
            log("setAttribute("+JSON.stringify(node)+","+JSON.stringify(name)+","+JSON.stringify(value)+")");
            return core.setAttribute(node,name,value);
        };

        var getRegistry = function (node, name) {
            log("getRegistry("+JSON.stringify(node)+","+JSON.stringify(name)+")");
            return core.getRegistry(node,name);
        };

        var delRegistry = function (node, name) {
            log("delRegistry("+JSON.stringify(node)+","+JSON.stringify(name)+")");
            return core.delRegistry(node,name);
        };

        var setRegistry = function (node, name, value) {
            log("setRegistry("+JSON.stringify(node)+","+JSON.stringify(name)+","+JSON.stringify(value)+")");
            return core.setRegistry(node,name,value);
        };

        // relations
        var getPointerNames = function (node) {
            log("getPointerNames("+JSON.stringify(node)+")");
            return core.getPointerNames(node);
        };
        var getPointerPath = function (node, name) {
            log("getPointerPath("+JSON.stringify(node)+","+JSON.stringify(name)+")");
            return core.getPointerPath(node,name);
        };
        var getOutsidePointerPath = function (node, name, source) {
            log("getOutsidePointerPath("+JSON.stringify(node)+","+JSON.stringify(name)+","+JSON.stringify(source)+")");
            return core.getOutsidePointerPath(node,name,source);
        };
        var loadPointer = function (node, name, callback) {
            log("loadPointer("+JSON.stringify(node)+","+JSON.stringify(name)+")");
            return core.loadPointer(node,name,callback);
        };
        var deletePointer = function (node, name) {
            log("deletePointer("+JSON.stringify(node)+","+JSON.stringify(name)+")");
            return core.deletePointer(node,name);
        };
        var setPointer = function (node, name, target) {
            log("setPointer("+JSON.stringify(node)+","+JSON.stringify(name)+","+JSON.stringify(target)+")");
            return core.setPointer(node,name,target);
        };
        var getCollectionNames = function (node) {
            log("getCollectionNames("+JSON.stringify(node)+")");
            return core.getCollectionNames(node);
        };
        var getCollectionPaths = function (node, name) {
            log("getCollectionPaths("+JSON.stringify(node)+","+JSON.stringify(name)+")");
            return core.getCollectionPaths(node,name);
        };
        var loadCollection = function (node, name, callback) {
            log("loadCollection("+JSON.stringify(node)+","+JSON.stringify(name)+")");
            return core.loadCollection(node,name,callback);
        };

        var getSingleNodeHash = function (node) {
            log("getSingleNodeHash("+JSON.stringify(node)+")");
            return core.getSingleNodeHash(node);
        };

        return {
            // check
            isValidNode: isValidNode,
            isValidRelid: isValidRelid,
            isValidPath: isValidPath,

            // root
            getKey: getKey,
            loadRoot: loadRoot,
            persist: persist,
            getRoot: getRoot,

            // containment
            getLevel: getLevel,
            getStringPath: getStringPath,
            parseStringPath: parseStringPath,
            getParent: getParent,
            getChildrenRelids: getChildrenRelids,
            loadChild: loadChild,
            loadByPath: loadByPath,
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
            getRegistry: getRegistry,
            setRegistry: setRegistry,
            delRegistry: delRegistry,

            // relations
            getPointerNames: getPointerNames,
            getPointerPath: getPointerPath,
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

    return LogCore;
});

