/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert"], function (ASSERT) {
    "use strict";

    // ----------------- SetCore -----------------

    // this layer is to simplify the calls for the client a bit ;)
    var VALIDSETIDS = ["2200000000","2200000001","2200000002","2200000003","2200000004"];
    var VALIDSETNAMES = ['General','ValidChildren','ValidSource','ValidDestination','ValidInheritor'];
    var SETS_ID = '_sets';

    var SetCore = function (_innerCore) {

        var root = null;
        var rootPath = "";
        var visibleRootPath = "root";

        var loadRoot = function(hash,callback){
            _innerCore.loadRoot(hash,function(err,node){
                if(!err && node){
                    root = node;
                }
                callback(err,node);
            });
        };

        var createNode = function(parent,relid){
            var node = _innerCore.createNode(parent,relid);
            if(root === null && !parent){
                root = node;
            }
            return node;
        };

        var persist = function(node,callback){
            if( (callback === null || callback === undefined) && typeof node === 'function'){
                callback = node;
                node = root;
            }
            return _innerCore.persist(node,callback);
        };

        var getRoot = function(){
            ASSERT(typeof root === 'object');
            return root;
        };

        var getPath = function(node){
            var path = _innerCore.getPath(node,root);
            if(path === rootPath){
                return visibleRootPath;
            } else {
                return path;
            }
        };

        var loadByPath = function(path,callback){
            ASSERT(typeof root === 'object');
            if(path === visibleRootPath){
                callback(null,root);
            } else {
                _innerCore.loadByPath(root,path,callback);
            }
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
            var relIds = getChildrenRelids(node);
            return relIds.length;
        };

        var getSetsNumber = function(node){
            var relIds = getSetRelids(node);
            return relIds.length;
        };

        var getSetPath = function(node,nameOrRelId){
            var index = VALIDSETNAMES.indexOf(nameOrRelId);
            if(index === -1){
                index = VALIDSETIDS.indexOf(nameOrRelId);
            }

            if(index === -1){
                return null;
            } else {
                var relid = VALIDSETIDS[index];
                var relids = getSetRelids(node);
                var paths = getSetPaths(node);
                index = relids.indexOf(relid);
                if(index === -1){
                    return null;
                } else {
                    return paths[index];
                }
            }
        };

        var getSetRelid = function(nameOrRelId){
            var index = VALIDSETNAMES.indexOf(nameOrRelId);
            if(index === -1){
                index = VALIDSETIDS.indexOf(nameOrRelId);
            }

            if(index === -1){
                return VALIDSETIDS[0];
            } else {
                return VALIDSETIDS[index];
            }
        };

        var isSetNode = function(node){
            var parent = _innerCore.getParent(node);
            if(parent){
                var path = getPath(node);
                var sets = getSetPaths(parent);
                return sets.indexOf(path) !== -1;
            } else {
                return false;
            }
        };

        var getSetOwnerPath = function(path){
            //return null if the original path is not set
            if(path.length>10){
                var ending = path.slice(path.length-10);
                if(VALIDSETIDS.indexOf(ending) !== -1){
                    var parent = path.replace('/'+ending,'');
                    return parent === rootPath ? visibleRootPath : parent;
                } else {
                    return null;
                }
            } else {
                return null;
            }
        };

        //set functionality again :)
        var getMemberRelId = function(node,setName,memberPath){
            var setBase = _innerCore.getChild(node,SETS_ID);
            var setNode = _innerCore.getChild(setBase,setName);
            var elements = _innerCore.getChildrenRelids(setNode);

            for(var i=0;i<elements.length;i++){
                if(_innerCore.getPointerPath(_innerCore.getChild(setNode,elements[i]),'member') === memberPath){
                    return elements[i];
                }
            }

            return null;

        };

        var addMember = function(node,setName,member){
            var MAX_RELID = Math.pow(2, 31);
            var setBase = _innerCore.getChild(node,SETS_ID);
            var setNode = _innerCore.getChild(setBase,setName);
            if(getMemberRelId(node,setName,member) === null){
                var relId;
                do {
                    relId = Math.floor(Math.random() * MAX_RELID);
                    relId +="";
                } while (!_innerCore.isEmpty(_innerCore.getChild(setNode,relId)));

                var setMember =  _innerCore.getChild(setNode,relId);
                _innerCore.setPointer(setMember,'member',member);
                _innerCore.setRegistry(setMember,'h','h'); //TODO hack
                _innerCore.setRegistry(node,'_hash_'+setName,'#'+_innerCore.getSingleNodeHash(setNode));
            }
        };

        var delMember = function(node,setName,member){
            //we only need the path of the member so we allow to enter only it
            if(typeof member !== 'string'){
                member = _innerCore.getPath(member);
            }
            var setBase = _innerCore.getChild(node,SETS_ID);
            var setNode = _innerCore.getChild(setBase,setName);
            var setMemberRelId = getMemberRelId(node,setName,member);
            if(setMemberRelId){
                var setMemberNode = _innerCore.getChild(setNode,setMemberRelId);
                _innerCore.deleteNode(setMemberNode);
                _innerCore.setRegistry(node,'_hash_'+setName,'#'+_innerCore.getSingleNodeHash(setNode));
            }

            /*var elements = _innerCore.getChildrenRelids(setNode);
            if(elements.length === 0){
                _innerCore.deleteNode(setNode);
                _innerCore.delRegistry(node,'_hash_'+setName);
            }*/
        };

        var getMemberPaths = function(node,setName){
            var memberPaths = [];
            var setBase = _innerCore.getChild(node,SETS_ID);
            var setNode = _innerCore.getChild(setBase,setName);

            var elements = _innerCore.getChildrenRelids(setNode);
            for(var i=0;i<elements.length;i++){
                var element = _innerCore.getChild(setNode,elements[i]);
                var path = _innerCore.getPointerPath(element,'member');
                if(path){
                    memberPaths.push(path);
                }
            }
            /*if(elements.length === 0){
                _innerCore.deleteNode(setNode);
            }*/
            return memberPaths;
        };
        var getSetNames = function(node){
            return _innerCore.getChildrenRelids(_innerCore.getChild(node,SETS_ID));
        };


        return {
            // check
            isValidNode: _innerCore.isValidNode,
            isValidRelid: _innerCore.isValidRelid,
            isValidPath: _innerCore.isValidPath,
            isSetNode: isSetNode,
            getSetOwnerPath: getSetOwnerPath,

            // root
            getHash: _innerCore.getHash,
            loadRoot: loadRoot,

            persist:persist,

            getRoot: getRoot,

            // containment
            getLevel: _innerCore.getLevel,
            getPath: getPath,
            getParent: _innerCore.getParent,
            getRelid: _innerCore.getRelid,
            getChildrenRelids: getChildrenRelids,
            getChildrenPaths: getChildrenPaths,
            getChildrenNumber: getChildrenNumber,
            loadChild: _innerCore.loadChild,
            loadByPath: loadByPath,
            loadChildren: loadChildren,

            // sets
            getSetRelid: getSetRelid,
            getSetRelids: getSetRelids,
            getSetPath: getSetPath,
            getSetPaths: getSetPaths,
            getSetsNumber: getSetsNumber,
            loadSets : loadSets,
            loadSet : _innerCore.loadChild,
            addMember : addMember,
            delMember : delMember,
            getMemberPaths : getMemberPaths,
            getSetNames : getSetNames,

            // modify
            createNode: createNode,
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

