/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert"], function (ASSERT) {
    "use strict";

    var SETS_ID = '_sets';

    function SetCore(innerCore){

        //help functions
        var setModified = function(node,setName){
            var sethashregid = '_hash_'+setName;
            innerCore.setRegistry(node,sethashregid,(innerCore.getRegistry(node,sethashregid) || 0)+1);
        };
        var getMemberRelId = function(node,setName,memberPath){
            ASSERT(typeof setName === 'string');
            var setNode = innerCore.getChild(innerCore.getChild(node,SETS_ID),setName);
            var elements = innerCore.getChildrenRelids(setNode);

            for(var i=0;i<elements.length;i++){
                if(innerCore.getPointerPath(innerCore.getChild(setNode,elements[i]),'member') === memberPath){
                    return elements[i];
                }
            }
            return null;
        };
        var createNewMemberRelid = function(setNode){
            var MAX_RELID = Math.pow(2, 31);
            var existingRelIds = innerCore.getChildrenRelids(setNode);
            var relid;
            do{
                relid = Math.floor(Math.random() * MAX_RELID);
            } while (existingRelIds.indexOf(relid) !== -1);
            return "" + relid;
        };

        //copy lower layer
        var setcore = {};
        for(var i in innerCore){
            setcore[i] = innerCore[i];
        }

        //adding new functions
        setcore.getSetsNumber = function(node){
            return (innerCore.getChildrenRelids(innerCore.getChild(node,SETS_ID))).length;
        };
        setcore.getSetsName = function(node){
            return  innerCore.getChildrenRelids(innerCore.getChild(node,SETS_ID))|| [];
        };
        setcore.getMemberPaths = function(node,setName){
            ASSERT(typeof setName === 'string');
            var setNode = innerCore.getChild(innerCore.getChild(node,SETS_ID),setName);
            var members = [];
            var elements = innerCore.getChildrenRelids(setNode);
            for(var i=0;i<elements.length;i++){
                var path = innerCore.getPointerPath(innerCore.getChild(setNode,elements[i]),'member');
                if(path){
                    members.push(path);
                }
            }
            return members;
        };
        setcore.delMember = function(node,setName,member){
            ASSERT(typeof setName === 'string');
            //we only need the path of the member so we allow to enter only it
            if(typeof member !== 'string'){
                member = innerCore.getPath(member);
            }

            var setMemberRelId = getMemberRelId(node,setName,member);
            if(setMemberRelId){
                var setMemberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),setMemberRelId);
                innerCore.deleteNode(setMemberNode);
                setModified(node,setName);
            }
        };
        setcore.addMember = function(node,setName,member){
            ASSERT(typeof setName === 'string');
            var setNode = innerCore.getChild(innerCore.getChild(node,SETS_ID),setName);
            if(getMemberRelId(node,setName,member) === null){
                var setMember =  innerCore.getChild(setNode,createNewMemberRelid(setNode));
                innerCore.setPointer(setMember,'member',member);
                innerCore.setRegistry(setMember,"_","_");//TODO hack, somehow the empty children have been removed during persist
                setModified(node,setName);
            }
        };

        return setcore;

    }

    return SetCore;
});


