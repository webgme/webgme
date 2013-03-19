/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "core/assert"], function (ASSERT) {
    "use strict";

    // ----------------- SetCore -----------------

    // this layer is to simplify the calls for the client a bit ;)
    var VALIDSETIDS = ["2200000000","2200000001","2200000002","2200000003","2200000004"];

    var SetCore = function (_innerCore) {

        var root = null;

        var loadRoot = function(hash,callback){
            _innerCore.loadRoot(hash,function(err,node){
                if(!err && node){
                    root = node;
                }
                callback(err);
            });
        };

        var persist = function(callback){
            return _innerCore.persist(root,callback);
        };

        var getRoot = function(){
            return root;
        };

        var getStringPath = function(node){
            return _innerCore.getStringPath(node,root);
        };

        var loadByPath = function(path,callback){
            _innerCore.loadByPath(root,path,callback);
        };

        var getChildrenRelids = function(node){
            var allChildren = _innerCore.getChildrenRelids(node);
            var children = [];
            for(var i=0;i<allChildren.length;i++){
                if(VALIDSETIDS.indexOf(allChildren[i]) === -1){
                    children.push(allChildren[i]);
                }
            }
            return children;
        };

        var getSetRelids = function(node){
            var allChildren = _innerCore.getChildrenRelids(node);
            var children = [];
            for(var i=0;i<allChildren.length;i++){
                if(VALIDSETIDS.indexOf(allChildren[i]) > -1){
                    children.push(allChildren[i]);
                }
            }
            return children;
        };

        var getChildrenPaths = function(node){
            var allrelids = _innerCore.getChildrenRelids(node);
            var allpaths = _innerCore.getChildrenPaths(node);
            var paths = [];
            for(var i=0;i<allrelids.length;i++){
                if(VALIDSETIDS.indexOf(allrelids[i]) === -1){
                    paths.push(allpaths[i]);
                }
            }
            return paths;
        };

        var getSetPaths = function(node){
            var allrelids = _innerCore.getChildrenRelids(node);
            var allpaths = _innerCore.getChildrenPaths(node);
            var paths = [];
            for(var i=0;i<allrelids.length;i++){
                if(VALIDSETIDS.indexOf(allrelids[i]) > -1){
                    paths.push(allpaths[i]);
                }
            }
            return paths;
        };

        var loadChildren = function(node,callback){
            _innerCore.loadChildren(node,function(err,allchildren){
                if(!err && allchildren){
                    var children = [];
                    for(var i=0;i<allchildren.length;i++){
                        if(VALIDSETIDS.indexOf(_innerCore.getRelid(allchildren[i])) === -1){
                            children.push(allchildren[i]);
                        }
                    }
                    callback(err,children);
                } else {
                    callback(err,null);
                }
            });
        };

        var loadSets = function(node,callback){
            _innerCore.loadChildren(node,function(err,allchildren){
                if(!err && allchildren){
                    var children = [];
                    for(var i=0;i<allchildren.length;i++){
                        if(VALIDSETIDS.indexOf(_innerCore.getRelid(allchildren[i])) > -1){
                            children.push(allchildren[i]);
                        }
                    }
                    callback(err,children);
                } else {
                    callback(err,null);
                }
            });
        };

        var getChildrenNumber = function(node){
            var allrelids = _innerCore.getChildrenRelids(node);
            var relids = [];
            for(var i=0;i<allrelids.length;i++){
                if(VALIDSETIDS.indexOf(allrelids[i]) === -1){
                    relids.push(allrelids[i]);
                }
            }

            return relids.length;
        };

        var getSetsNumber = function(node){
            var allrelids = _innerCore.getChildrenRelids(node);
            var relids = [];
            for(var i=0;i<allrelids.length;i++){
                if(VALIDSETIDS.indexOf(allrelids[i]) > -1){
                    relids.push(allrelids[i]);
                }
            }

            return relids.length;
        };

        return {
            // check
            isValidNode: _innerCore.isValidNode,
            isValidRelid: _innerCore.isValidRelid,
            isValidPath: _innerCore.isValidPath,

            // root
            getKey: _innerCore.getKey,
            loadRoot: loadRoot,

            persist:persist,

            getRoot: getRoot,

            // containment
            getLevel: _innerCore.getLevel,
            getStringPath: getStringPath,
            getParent: _innerCore.getParent,
            getRelid: _innerCore.getRelid,
            getChildrenRelids: getChildrenRelids,
            getChildrenPaths: getChildrenPaths,
            getChildrenNumber: getChildrenNumber,
            loadChild: _innerCore.loadChild,
            loadByPath: loadByPath,
            loadChildren: loadChildren,

            // sets
            getSetRelids: getSetRelids,
            getSetPaths: getSetPaths,
            getSetsNumber: getSetsNumber,
            loadSets : loadSets,
            loadSet : _innerCore.loadChild,

            // modify
            createNode: _innerCore.createNode,
            deleteNode: _innerCore.deleteNode,
            copyNode: _innerCore.copyNode,
            moveNode: _innerCore.moveNode,

            // attributes
            getAttributeNames: _innerCore.getAttributeNames,
            getAttribute: _innerCore.getAttribute,
            setAttribute: _innerCore.setAttribute,
            delAttribute: _innerCore.delAttribute,
            getRegistryNames: _innerCore.getRegistryNames,
            getRegistry: _innerCore.getRegistry,
            setRegistry: _innerCore.setRegistry,
            delRegistry: _innerCore.delRegistry,

            // relations
            getPointerNames: _innerCore.getPointerNames,
            getPointerPath: _innerCore.getPointerPath,
            hasPointer: _innerCore.hasPointer,
            getOutsidePointerPath: _innerCore.getOutsidePointerPath,
            loadPointer: _innerCore.loadPointer,
            deletePointer: _innerCore.deletePointer,
            setPointer: _innerCore.setPointer,
            getCollectionNames: _innerCore.getCollectionNames,
            getCollectionPaths: _innerCore.getCollectionPaths,
            loadCollection: _innerCore.loadCollection,

            getSingleNodeHash: _innerCore.getSingleNodeHash,
            getCommonPathPrefixData: _innerCore.getCommonPathPrefixData
        };
    };

    return SetCore;
});

