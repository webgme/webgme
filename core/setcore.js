/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert"], function (ASSERT) {
    "use strict";

    // ----------------- SetCore -----------------

    // this layer is to simplify the calls for the client a bit ;)
    var SETS_ID = '_sets';

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
            var setBase = _innerCore.getChild(node,SETS_ID);
            var relIds = _innerCore.getChildrenRelids(setBase);
            return relIds.length;
        };

        var getMemberRelId = function(node,setName,memberPath){
            ASSERT(typeof setName === 'string');
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

        var createNewMemberRelid = function(setNode){
            var MAX_RELID = Math.pow(2, 31);
            var existingRelIds = _innerCore.getChildrenRelids(setNode);
            var relid;
            do{
                relid = Math.floor(Math.random() * MAX_RELID);
            } while (existingRelIds.indexOf(relid) !== -1);
            return "" + relid;
        };
        var addMember = function(node,setName,member){
            ASSERT(typeof setName === 'string');
            var setBase = _innerCore.getChild(node,SETS_ID);
            var setNode = _innerCore.getChild(setBase,setName);
            if(getMemberRelId(node,setName,member) === null){
                var setMember =  _innerCore.getChild(setNode,createNewMemberRelid(setNode));
                _innerCore.setPointer(setMember,'member',member);
                _innerCore.setRegistry(setMember,'h','h'); //TODO hack
                _innerCore.setRegistry(node,'_hash_'+setName,'#'+_innerCore.getSingleNodeHash(setNode));
            }
        };

        var delMember = function(node,setName,member){
            ASSERT(typeof setName === 'string');
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
        };

        var getMemberPaths = function(node,setName){
            ASSERT(typeof setName === 'string');
            var memberPaths = [];
            var setBase = _innerCore.getChild(node,SETS_ID);
            var setNode = _innerCore.getChild(setBase,setName);

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
        _core.getMemberRelId = getMemberRelId;
        _core.addMember = addMember;
        _core.delMember = delMember;
        _core.getMemberPaths = getMemberPaths;
        _core.getSetNames = getSetNames;


        return _core;
    };

    return SetCore;
});

