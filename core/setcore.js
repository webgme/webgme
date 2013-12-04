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
                setModified(node,setName);
            }
        };
        setcore.addMember = function(node,setName,member){
            ASSERT(typeof setName === 'string');
            var setNode = innerCore.getChild(innerCore.getChild(node,SETS_ID),setName);
            var setMemberRelId = getMemberRelId(node,setName,setcore.getPath(member));
            if(setMemberRelId === null){
                var setMember =  innerCore.getChild(setNode,createNewMemberRelid(setNode));
                innerCore.setPointer(setMember,'member',member);
                innerCore.setRegistry(setMember,"_","_");//TODO hack, somehow the empty children have been removed during persist
                setModified(node,setName);
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
            }
        };
        setcore.delMemberAttribute = function(node,setName,memberPath,attrName){
            ASSERT(typeof setName === 'string' && typeof attrName === 'string');
            var memberRelId = getMemberRelId(node,setName,memberPath);
            if(memberRelId){
                var memberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),memberRelId);
                innerCore.delAttribute(memberNode,attrName);
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
            }
        };
        setcore.delMemberRegistry = function(node,setName,memberPath,regName){
            ASSERT(typeof setName === 'string' && typeof regName === 'string');
            var memberRelId = getMemberRelId(node,setName,memberPath);
            if(memberRelId){
                var memberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),memberRelId);
                innerCore.delAttribute(memberNode,regName);
            }
        };

        return setcore;

    }

    return SetCore;
});


