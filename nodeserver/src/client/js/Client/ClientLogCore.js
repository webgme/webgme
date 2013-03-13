/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
var COREVERSION = 3;
define(['commonUtil','core/core'+COREVERSION,'core/assert','logManager'], function (CU,CORE,ASSERT,logManager) {
    'use strict';
    var GUID = CU.guid;
    var TSSTRING = function(){
        return "["+CU.timestamp()+"]";
    };
    var TIMESTAMP = CU.timestamp;
    var ETIMESTRING = function(start){
        return "{"+ (TIMESTAMP()-start) + "ms}";
    };

    // ----------------- Core -----------------

    var ClientLogCore = function (options) {
        ASSERT(options && options.storage);
        var log = null,
            logger = logManager.create("CORE"),
            core = new CORE(options.storage);
        log = function(msg){
            logger.debug(msg);
        };

        //check
        var isValidRelid = function (relid) {
            log("isValidRelid("+relid+")");
            return core.isValidRelid(relid);
        };
        var isValidPath = function (path) {
            log("isValidPath("+path+")");
            return core.isValidPath(path);
        };
        var isValidNode = function (node) {
            log("isValidNode("+core.getKey(node)+")");
            return core.isValidNode(node);
        };

        //root
        var getKey = function (node) {
            log("getKey("+core.getKey(node)+"))");
            return core.getKey(node);
        };
        var loadRoot = function (key, callback) {
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"loadRoot("+key+")";
            log(text);
            core.loadRoot(key,function(err,node){
                log(text+ETIMESTRING(start));
                callback(err,node);
            });
        };
        var persist = function (root, callback) {
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"persist("+core.getKey(root)+")";
            log(text);
            return core.persist(root,function(err){
                log(text+ETIMESTRING(start));
                callback(err);
            });
        };
        var getRoot = function (node) {
            log("getRoot("+core.getKey(node)+")");
            return core.getRoot(node);
        };

        // containment
        var getLevel = function (node, base) {
            log("getLevel("+core.getKey(node)+","+core.getKey(base)+")");
            return core.getLevel(node,base);
        };
        var getRelid = function (node) {
            log("getRelid("+core.getKey(node)+")");
            return core.getRelid(node);
        };
        var getStringPath = function (node, base) {
            log("getStringPath("+core.getKey(node)+","+ ( base === undefined ? base : core.getKey(base)) +")");
            return core.getStringPath(node,base);
        };
        var parseStringPath = function (path) {
            log("parseStringPath("+path+")");
            return core.parseStringPath(path);
        };
        var getParent = function (node) {
            log("getParent("+core.getKey(node)+")");
            return core.getParent(node);
        };
        var getChildrenRelids = function (node) {
            log("getChildrenRelids("+core.getKey(node)+")");
            return core.getChildrenRelids(node);
        };
        var getChildrenPaths = function (node) {
            log("getChildrenPaths("+core.getKey(node)+")");
            return core.getChildrenPaths(node);
        };
        var loadChild = function (node, relid, callback) {
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"loadChild("+core.getKey(node)+","+relid+")";
            log(text);
            core.loadChild(node,relid,function(err,child){
                log(text+ETIMESTRING(start));
                callback(err,child);
            });
        };
        var loadByPath = function (node, path, callback) {
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"loadByPath("+core.getKey(node)+","+path+")";
            log(text);
            core.loadByPath(node,path,function(err,node){
                log(text+ETIMESTRING(start));
                callback(err,node);
            });
        };
        var loadChildren = function (node, callback) {
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"loadChildren("+core.getKey(node)+")";
            log(text);
            core.loadChildren(node,function(err,children){
                log(text+ETIMESTRING(start));
                callback(err,children);
            });
        };

        // modify
        var createNode = function (parent, relid) {
            if(parent){
                log("createNode("+core.getKey(parent)+","+relid+")");
            } else {
                log("createNode(null,"+relid+")");
            }
            return core.createNode(parent,relid);
        };
        var deleteNode = function (node) {
            log("deleteNode("+core.getKey(node)+")");
            return core.deleteNode(node);
        };
        var copyNode = function (node, parent) {
            log("copyNode("+core.getKey(node)+","+core.getKey(parent)+")");
            return core.copyNode(node,parent);
        };
        var moveNode = function (node, parent) {
            log("moveNode("+core.getKey(node)+","+core.getKey(parent)+")");
            return core.moveNode(node,parent);
        };

        // attributes
        var getAttributeNames = function (node) {
            log("getAttributeNames("+core.getKey(node)+")");
            return core.getAttributeNames(node);
        };

        var getAttribute = function (node, name) {
            log("getAttribute("+core.getKey(node)+","+name+")");
            return core.getAttribute(node,name);
        };

        var delAttribute = function (node, name) {
            log("delAttribute("+core.getKey(node)+","+name+")");
            return core.delAttribute(node,name);

        };

        var setAttribute = function (node, name, value) {
            log("setAttribute("+core.getKey(node)+","+name+","+value+")");
            return core.setAttribute(node,name,value);
        };

        var getRegistryNames = function (node) {
            log("getRegistryNames("+core.getKey(node)+")");
            return core.getRegistryNames(node);
        };

        var getRegistry = function (node, name) {
            log("getRegistry("+core.getKey(node)+","+name+")");
            return core.getRegistry(node,name);
        };

        var delRegistry = function (node, name) {
            log("delRegistry("+core.getKey(node)+","+name+")");
            return core.delRegistry(node,name);
        };

        var setRegistry = function (node, name, value) {
            log("setRegistry("+core.getKey(node)+","+name+","+value+")");
            return core.setRegistry(node,name,value);
        };

        // relations
        var getPointerNames = function (node) {
            log("getPointerNames("+core.getKey(node)+")");
            return core.getPointerNames(node);
        };
        var getPointerPath = function (node, name) {
            log("getPointerPath("+core.getKey(node)+","+name+")");
            return core.getPointerPath(node,name);
        };
        var getOutsidePointerPath = function (node, name, source) {
            log("getOutsidePointerPath("+core.getKey(node)+","+name+","+core.getKey(source)+")");
            return core.getOutsidePointerPath(node,name,source);
        };
        var loadPointer = function (node, name, callback) {
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"loadPointer("+core.getKey(node)+","+name+")";
            log(text);
            core.loadPointer(node,name,function(err,target){
                log(text+ETIMESTRING(start));
                callback(err,target);
            });
        };
        var deletePointer = function (node, name) {
            log("deletePointer("+core.getKey(node)+","+name+")");
            return core.deletePointer(node,name);
        };
        var setPointer = function (node, name, target) {
            log("setPointer("+core.getKey(node)+","+name+","+core.getKey(target)+")");
            return core.setPointer(node,name,target);
        };
        var getCollectionNames = function (node) {
            log("getCollectionNames("+core.getKey(node)+")");
            return core.getCollectionNames(node);
        };
        var getCollectionPaths = function (node, name) {
            log("getCollectionPaths("+core.getKey(node)+","+name+")");
            return core.getCollectionPaths(node,name);
        };
        var loadCollection = function (node, name, callback) {
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"loadCollection("+core.getKey(node)+","+name+")";
            log(text);
            core.loadCollection(node,name,function(err,collection){
                log(text+ETIMESTRING(start));
                callback(err,collection);
            });
        };

        var getSingleNodeHash = function (node) {
            log("getSingleNodeHash("+core.getKey(node)+")");
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
            getRelid: getRelid,
            getStringPath: getStringPath,
            parseStringPath: parseStringPath,
            getParent: getParent,
            getChildrenRelids: getChildrenRelids,
            getChildrenPaths: getChildrenPaths,
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
            getRegistryNames: getRegistryNames,

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

            getSingleNodeHash: getSingleNodeHash,

            getVersion: function(){return COREVERSION;}
        };
    };

    return ClientLogCore;
});


