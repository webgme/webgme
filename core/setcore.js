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
        var setModified = function(node){
            innerCore.setRegistry(node,'_sets_',(innerCore.getRegistry(node,'_sets_') || 0)+1);
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
        setcore.getSetNumbers = function(node){
            return this.getSetNames(node).length;
        };
        setcore.getSetNames = function(node){
            return  innerCore.getPointerNames(innerCore.getChild(node,SETS_ID))|| [];
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
        setcore.delMember = function(node,setName,memberPath){
            ASSERT(typeof setName === 'string');
            //we only need the path of the member so we allow to enter only it
            if(typeof memberPath !== 'string'){
                memberPath = innerCore.getPath(memberPath);
            }

            var setMemberRelId = getMemberRelId(node,setName,memberPath);
            if(setMemberRelId){
                var setMemberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),setMemberRelId);
                innerCore.deleteNode(setMemberNode);
                setModified(node);
            }
        };
        setcore.addMember = function(node,setName,member){
            ASSERT(typeof setName === 'string');
            var setsNode = innerCore.getChild(node,SETS_ID);
            //TODO decide if the member addition should really create the set or it should fail...
            if(innerCore.getPointerPath(setsNode,setName) === undefined){
                setcore.createSet(node,setName);
            }
            var setNode = innerCore.getChild(setsNode,setName);
            var setMemberRelId = getMemberRelId(node,setName,setcore.getPath(member));
            if(setMemberRelId === null){
                var setMember =  innerCore.getChild(setNode,createNewMemberRelid(setNode));
                innerCore.setPointer(setMember,'member',member);
                innerCore.setRegistry(setMember,"_","_");//TODO hack, somehow the empty children have been removed during persist
                setModified(node);
            }
        };

        setcore.getMemberAttributeNames = function(node,setName,memberPath){
            ASSERT(typeof setName === 'string');
            var memberRelId = getMemberRelId(node,setName,memberPath);
            if(memberRelId){
                var memberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),memberRelId);
                return innerCore.getAttributeNames(memberNode);
            }
            return [];
        };
        setcore.getMemberAttribute = function(node,setName,memberPath,attrName){
            ASSERT(typeof setName === 'string' && typeof attrName === 'string');
            var memberRelId = getMemberRelId(node,setName,memberPath);
            if(memberRelId){
                var memberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),memberRelId);
                return innerCore.getAttribute(memberNode,attrName);
            }
        };
        setcore.setMemberAttribute = function(node,setName,memberPath,attrName,attrValue){
            ASSERT(typeof setName === 'string' && typeof attrName === 'string' && attrValue !== undefined);
            var memberRelId = getMemberRelId(node,setName,memberPath);
            if(memberRelId){
                var memberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),memberRelId);
                innerCore.setAttribute(memberNode,attrName,attrValue);
                setModified(node);
            }
        };
        setcore.delMemberAttribute = function(node,setName,memberPath,attrName){
            ASSERT(typeof setName === 'string' && typeof attrName === 'string');
            var memberRelId = getMemberRelId(node,setName,memberPath);
            if(memberRelId){
                var memberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),memberRelId);
                innerCore.delAttribute(memberNode,attrName);
                setModified(node);
            }
        };

        setcore.getMemberRegistryNames = function(node,setName,memberPath){
            ASSERT(typeof setName === 'string');
            var memberRelId = getMemberRelId(node,setName,memberPath);
            if(memberRelId){
                var memberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),memberRelId);
                return innerCore.getRegistryNames(memberNode);
            }
            return [];
        };
        setcore.getMemberRegistry = function(node,setName,memberPath,regName){
            ASSERT(typeof setName === 'string' && typeof regName === 'string');
            var memberRelId = getMemberRelId(node,setName,memberPath);
            if(memberRelId){
                var memberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),memberRelId);
                return innerCore.getAttribute(memberNode,regName);
            }
        };
        setcore.setMemberRegistry = function(node,setName,memberPath,regName,regValue){
            ASSERT(typeof setName === 'string' && typeof regName === 'string' && regValue !== undefined);
            var memberRelId = getMemberRelId(node,setName,memberPath);
            if(memberRelId){
                var memberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),memberRelId);
                innerCore.setAttribute(memberNode,regName,regValue);
                setModified(node);
            }
        };
        setcore.delMemberRegistry = function(node,setName,memberPath,regName){
            ASSERT(typeof setName === 'string' && typeof regName === 'string');
            var memberRelId = getMemberRelId(node,setName,memberPath);
            if(memberRelId){
                var memberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),memberRelId);
                innerCore.delAttribute(memberNode,regName);
                setModified(node);
            }
        };
        setcore.createSet = function(node,setName) {
            ASSERT(typeof setName === 'string');
            var setsNode = innerCore.getChild(node,SETS_ID),
                setNode = innerCore.getChild(setsNode,setName);
            innerCore.setRegistry(setNode,"_","_");//TODO hack, somehow the empty children have been removed during persist
            innerCore.setPointer(innerCore.getChild(node,SETS_ID), setName, null);
            setModified(node);
        };
        setcore.deleteSet = function(node,setName) {
            ASSERT(typeof setName === 'string');
            var setsNode = innerCore.getChild(node,SETS_ID),
                setNode = innerCore.getChild(setsNode,setName);
            innerCore.deletePointer(setsNode,setName);
            innerCore.deleteNode(setNode);
            setModified(node);
        };

        return setcore;

    }

    return SetCore;
});


