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

    var _SetCore = function (_innerCore) {

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


        var getChildrenNumber = function(node){
            var relIds = _innerCore.getChildrenRelids(node);
            return relIds.length;
        };

        var getSetsNumber = function(node){
            var relIds = getSetRelids(node);
            return relIds.length;
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
        var getSetName = function(nameOrRelId){
            var index = VALIDSETIDS.indexOf(nameOrRelId);
            if(index === -1){
                index = VALIDSETNAMES.indexOf(nameOrRelId);
            }

            if(index === -1){
                return VALIDSETNAMES[0];
            } else {
                return VALIDSETNAMES[index];
            }
        };

        var getMemberRelId = function(node,setName,memberPath){
            var setBase = _innerCore.getChild(node,SETS_ID);
            var setNode = _innerCore.getChild(setBase,getSetRelid(setName));
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
            var setNode = _innerCore.getChild(setBase,getSetRelid(setName));
            if(getMemberRelId(node,getSetRelid(setName),member) === null){
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
            var setNode = _innerCore.getChild(setBase,getSetRelid(setName));
            var setMemberRelId = getMemberRelId(node,getSetRelid(setName),member);
            if(setMemberRelId){
                var setMemberNode = _innerCore.getChild(setNode,setMemberRelId);
                _innerCore.deleteNode(setMemberNode);
                _innerCore.setRegistry(node,'_hash_'+setName,'#'+_innerCore.getSingleNodeHash(setNode));
            }
        };

        var getMemberPaths = function(node,setName){
            var memberPaths = [];
            var setBase = _innerCore.getChild(node,SETS_ID);
            var setNode = _innerCore.getChild(setBase,getSetRelid(setName));

            var elements = _innerCore.getChildrenRelids(setNode);
            for(var i=0;i<elements.length;i++){
                var element = _innerCore.getChild(setNode,elements[i]);
                var path = _innerCore.getPointerPath(element,'member');
                if(path === rootPath){
                    path = visibleRootPath;
                }
                if(path){
                    memberPaths.push(path);
                }
            }
            return memberPaths;
        };
        var getSetNames = function(node){
            var names = _innerCore.getChildrenRelids(_innerCore.getChild(node,SETS_ID));
            for(var i=0;i<names.length;i++){
                names[i] = VALIDSETNAMES[VALIDSETIDS.indexOf(names[i])];
            }
            return names;
        };


        return {
            // check
            isValidNode: _innerCore.isValidNode,
            isValidRelid: _innerCore.isValidRelid,
            isValidPath: _innerCore.isValidPath,

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
            getChildrenRelids: _innerCore.getChildrenRelids,
            getChildrenPaths: _innerCore.getChildrenPaths,
            getChildrenNumber: getChildrenNumber,
            loadChild: _innerCore.loadChild,
            loadByPath: loadByPath,
            loadChildren: _innerCore.loadChildren,

            // sets
            addMember : addMember,
            delMember : delMember,
            getMemberPaths : getMemberPaths,
            getSetNames : getSetNames,
            getSetName : getSetName,
            getSetRelid : getSetRelid,

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
    var SetCore = function (_innerCore){

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

        var getChildrenNumber = function(node){
            var relIds = _innerCore.getChildrenRelids(node);
            return relIds.length;
        };

        var getSetsNumber = function(node){
            var relIds = getSetRelids(node);
            return relIds.length;
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

        var getSetName = function(nameOrRelId){
            var index = VALIDSETIDS.indexOf(nameOrRelId);
            if(index === -1){
                index = VALIDSETNAMES.indexOf(nameOrRelId);
            }

            if(index === -1){
                return VALIDSETNAMES[0];
            } else {
                return VALIDSETNAMES[index];
            }
        };

        var getMemberRelId = function(node,setName,memberPath){
            var setBase = _innerCore.getChild(node,SETS_ID);
            var setNode = _innerCore.getChild(setBase,getSetRelid(setName));
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
            var setNode = _innerCore.getChild(setBase,getSetRelid(setName));
            if(getMemberRelId(node,getSetRelid(setName),member) === null){
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
            var setNode = _innerCore.getChild(setBase,getSetRelid(setName));
            var setMemberRelId = getMemberRelId(node,getSetRelid(setName),member);
            if(setMemberRelId){
                var setMemberNode = _innerCore.getChild(setNode,setMemberRelId);
                _innerCore.deleteNode(setMemberNode);
                _innerCore.setRegistry(node,'_hash_'+setName,'#'+_innerCore.getSingleNodeHash(setNode));
            }
        };

        var getMemberPaths = function(node,setName){
            var memberPaths = [];
            var setBase = _innerCore.getChild(node,SETS_ID);
            var setNode = _innerCore.getChild(setBase,getSetRelid(setName));

            var elements = _innerCore.getChildrenRelids(setNode);
            for(var i=0;i<elements.length;i++){
                var element = _innerCore.getChild(setNode,elements[i]);
                var path = _innerCore.getPointerPath(element,'member');
                if(path === rootPath){
                    path = visibleRootPath;
                }
                if(path){
                    memberPaths.push(path);
                }
            }
            return memberPaths;
        };

        var getSetNames = function(node){
            var names = _innerCore.getChildrenRelids(_innerCore.getChild(node,SETS_ID));
            for(var i=0;i<names.length;i++){
                names[i] = VALIDSETNAMES[VALIDSETIDS.indexOf(names[i])];
            }
            return names;
        };

        //main
        //adding new functions and overriding some lower level ones
        var _core = {};
        for(var i in _innerCore){
            _core[i] = _innerCore[i];
        }

        _core.loadRoot = loadRoot;
        _core.createNode = createNode;
        _core.persist = persist;
        _core.getRoot = getRoot;
        _core.getPath = getPath;
        _core.loadByPath = loadByPath;
        _core.getChildrenNumber = getChildrenNumber;
        _core.getSetsNumber = getSetsNumber;
        _core.getSetRelid = getSetRelid;
        _core.getSetName = getSetName;
        _core.getMemberRelId = getMemberRelId;
        _core.addMember = addMember;
        _core.delMember = delMember;
        _core.getMemberPaths = getMemberPaths;
        _core.getSetNames = getSetNames;


        return _core;
    };

    return SetCore;
});

