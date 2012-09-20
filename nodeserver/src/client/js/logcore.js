/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define(['commonUtil'], function (CU) {
    "use strict";
    var GUID = CU.guid;
    var TSSTRING = function(){
        return "["+CU.timestamp()+"]";
    };
    var TIMESTAMP = CU.timestamp;
    var ETIMESTRING = function(start){
        return "{"+ (TIMESTAMP()-start) + "ms}";
    };

    // ----------------- Core -----------------

    var LogCore = function (core,logger) {
        var log = function(msg){
            if(logger){
                logger.log(TSSTRING()+"[LogCore]"+msg);
            } else {
                console.log(TSSTRING()+"[LogCore]"+msg);
            }
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
            log("isValidNode("+node["data"]["_id"]+")");
            return core.isValidNode(node);
        };

        //root
        var getKey = function (node) {
            log("getKey("+node["data"]["_id"]+"))");
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
            var text = guid+"persist("+root["_id"]+")";
            log(text);
            return core.persist(root,function(err){
                log(text+ETIMESTRING(start));
                callback(err);
            });
        };
        var getRoot = function (node) {
            log("getRoot("+node["data"]["_id"]+")");
            return core.getRoot(node);
        };

        // containment
        var getLevel = function (node, base) {
            log("getLevel("+node["data"]["_id"]+","+base["_id"]+")");
            return core.getLevel(node,base);
        };
        var getStringPath = function (node, base) {
            log("getStringPath("+node["data"]["_id"]+","+ ( base === undefined ? base : base["_id"] ) +")");
            return core.getStringPath(node,base);
        };
        var parseStringPath = function (path) {
            log("parseStringPath("+path+")");
            return core.parseStringPath(path);
        };
        var getParent = function (node) {
            log("getParent("+node["data"]["_id"]+")");
            return core.getParent(node);
        };
        var getChildrenRelids = function (node) {
            log("getChildrenRelids("+node["data"]["_id"]+")");
            return core.getChildrenRelids(node);
        };
        var loadChild = function (node, relid, callback) {
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"loadChild("+node["data"]["_id"]+","+relid+")";
            log(text);
            core.loadChild(node,relid,function(err,child){
                log(text+ETIMESTRING(start));
                callback(err,child);
            });
        };
        var loadByPath = function (node, path, callback) {
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"loadByPath("+node["data"]["_id"]+","+path+")";
            log(text);
            core.loadByPath(node,path,function(err,node){
                log(text+ETIMESTRING(start));
            });
        };
        var loadChildren = function (node, callback) {
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"loadChildren("+node["data"]["_id"]+")";
            log(text);
            core.loadChildren(node,function(err,children){
                log(text+ETIMESTRING(start));
                callback(err,children);
            });
        };

        // modify
        var createNode = function (parent, relid) {
            log("createNode("+parent["_id"]+","+relid+")");
            return core.createNode(parent,relid);
        };
        var deleteNode = function (node) {
            log("deleteNode("+node["data"]["_id"]+")");
            return core.deleteNode(node);
        };
        var copyNode = function (node, parent) {
            log("copyNode("+node["data"]["_id"]+","+parent["_id"]+")");
            return core.copyNode(node,parent);
        };
        var moveNode = function (node, parent) {
            log("moveNode("+node["data"]["_id"]+","+parent["_id"]+")");
            return core.moveNode(node,parent);
        };

        // attributes
        var getAttributeNames = function (node) {
            log("getAttributeNames("+node["data"]["_id"]+")");
            return core.getAttributeNames(node);
        };

        var getAttribute = function (node, name) {
            log("getAttribute("+node["data"]["_id"]+","+name+")");
            return core.getAttribute(node,name);
        };

        var delAttribute = function (node, name) {
            log("delAttribute("+node["data"]["_id"]+","+name+")");
            return core.delAttribute(node,name);

        };

        var setAttribute = function (node, name, value) {
            log("setAttribute("+node["data"]["_id"]+","+name+","+value+")");
            return core.setAttribute(node,name,value);
        };

        var getRegistry = function (node, name) {
            log("getRegistry("+node["data"]["_id"]+","+name+")");
            return core.getRegistry(node,name);
        };

        var delRegistry = function (node, name) {
            log("delRegistry("+node["data"]["_id"]+","+name+")");
            return core.delRegistry(node,name);
        };

        var setRegistry = function (node, name, value) {
            log("setRegistry("+node["data"]["_id"]+","+name+","+value+")");
            return core.setRegistry(node,name,value);
        };

        // relations
        var getPointerNames = function (node) {
            log("getPointerNames("+node["data"]["_id"]+")");
            return core.getPointerNames(node);
        };
        var getPointerPath = function (node, name) {
            log("getPointerPath("+node["data"]["_id"]+","+name+")");
            return core.getPointerPath(node,name);
        };
        var getOutsidePointerPath = function (node, name, source) {
            log("getOutsidePointerPath("+node["data"]["_id"]+","+name+","+source["_id"]+")");
            return core.getOutsidePointerPath(node,name,source);
        };
        var loadPointer = function (node, name, callback) {
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"loadPointer("+node["data"]["_id"]+","+name+")";
            log(text);
            core.loadPointer(node,name,function(err,target){
                log(text+ETIMESTRING(start));
                callback(err,target);
            });
        };
        var deletePointer = function (node, name) {
            log("deletePointer("+node["data"]["_id"]+","+name+")");
            return core.deletePointer(node,name);
        };
        var setPointer = function (node, name, target) {
            log("setPointer("+node["data"]["_id"]+","+name+","+target["_id"]+")");
            return core.setPointer(node,name,target);
        };
        var getCollectionNames = function (node) {
            log("getCollectionNames("+node["data"]["_id"]+")");
            return core.getCollectionNames(node);
        };
        var getCollectionPaths = function (node, name) {
            log("getCollectionPaths("+node["data"]["_id"]+","+name+")");
            return core.getCollectionPaths(node,name);
        };
        var loadCollection = function (node, name, callback) {
            var start = TIMESTAMP();
            var guid = "["+GUID()+"]";
            var text = guid+"loadCollection("+node["data"]["_id"]+","+name+")";
            log(text);
            core.loadCollection(node,name,function(err,collection){
                log(text+ETIMESTRING(start));
                callback(err,collection);
            });
        };

        var getSingleNodeHash = function (node) {
            log("getSingleNodeHash("+node["data"]["_id"]+")");
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

