/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert"], function (ASSERT) {
    "use strict";

    var SETS_ID = '_sets';
    var REL_ID = 'member';

    function SetCore(innerCore){

        //help functions
        var setModified = function(node){
            //innerCore.setRegistry(node,'_sets_',(innerCore.getRegistry(node,'_sets_') || 0)+1);
        };
        var getMemberPath = function(node,setElementNode){
            var ownPath = innerCore.getPath(node),
                memberPath = innerCore.getPointerPath(setElementNode,REL_ID);
            ownPath = ownPath.substring(0,ownPath.indexOf('/_')); //TODO this is a hack and should be solved some other way if possible
            if(ownPath !== memberPath){
                return memberPath;
            }

            //now we should check who really set this member as its own
            while(innerCore.getBase(node) !== null && innerCore.getBase(setElementNode) !== null && innerCore.getRegistry(innerCore.getBase(setElementNode),'_') === '_'){
                node = innerCore.getBase(node);
                setElementNode = innerCore.getBase(setElementNode);
                ownPath = innerCore.getPath(node);
                ownPath = ownPath.substring(0,ownPath.indexOf('/_')); //TODO this is a hack and should be solved some other way if possible
            }
            memberPath = innerCore.getPointerPath(setElementNode,REL_ID);


            return memberPath;

        };
        var getMemberRelId = function(node,setName,memberPath){
            ASSERT(typeof setName === 'string');
            var setNode = innerCore.getChild(innerCore.getChild(node,SETS_ID),setName);
            var elements = innerCore.getChildrenRelids(setNode);

            for(var i=0;i<elements.length;i++){
                if(getMemberPath(node,innerCore.getChild(setNode,elements[i])) === memberPath){
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
        setcore.getPointerNames = function(node){
            var sorted = [],
                raw = innerCore.getPointerNames(node);
            for(var i=0;i<raw.length;i++){
                if(raw[i].indexOf(REL_ID) === -1){
                    sorted.push(raw[i]);
                }
            }
            return sorted;
        };
        setcore.getCollectionNames = function(node){
            var sorted = [],
                raw = innerCore.getCollectionNames(node);
            for(var i=0;i<raw.length;i++){
                if(raw[i].indexOf(REL_ID) === -1){
                    sorted.push(raw[i]);
                }
            }
            return sorted;
        };
        setcore.getMemberPaths = function(node,setName){
            ASSERT(typeof setName === 'string');
            var setNode = innerCore.getChild(innerCore.getChild(node,SETS_ID),setName);
            var members = [];
            var elements = innerCore.getChildrenRelids(setNode);
            elements = elements.sort(); //TODO this should be removed at some point
            for(var i=0;i<elements.length;i++){
                var path = getMemberPath(node,innerCore.getChild(setNode,elements[i]));
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
                return innerCore.getRegistry(memberNode,regName);
            }
        };
        setcore.setMemberRegistry = function(node,setName,memberPath,regName,regValue){
            ASSERT(typeof setName === 'string' && typeof regName === 'string' && regValue !== undefined);
            var memberRelId = getMemberRelId(node,setName,memberPath);
            if(memberRelId){
                var memberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),memberRelId);
                innerCore.setRegistry(memberNode,regName,regValue);
                setModified(node);
            }
        };
        setcore.delMemberRegistry = function(node,setName,memberPath,regName){
            ASSERT(typeof setName === 'string' && typeof regName === 'string');
            var memberRelId = getMemberRelId(node,setName,memberPath);
            if(memberRelId){
                var memberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),memberRelId);
                innerCore.delRegistry(memberNode,regName);
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

        setcore.isMemberOf = function(node){
            //TODO we should find a proper way to do this - or at least some support from lower layers would be fine
            var coll = setcore.getCollectionPaths(node,REL_ID);
            var sets = {};
            for(var i=0;i<coll.length;i++){
                var pathArray = coll[i].split('/');
                if(pathArray.indexOf('_meta') === -1){
                    //now we simply skip META sets...
                    var index = pathArray.indexOf(SETS_ID);
                    if(index>0 && pathArray.length>index+1){
                        //otherwise it is not a real set
                        var ownerPath = pathArray.slice(0,index).join('/');
                        if(sets[ownerPath] === undefined){
                            sets[ownerPath] = [];
                        }
                        sets[ownerPath].push(pathArray[index+1]);
                    }
                }
            }
            return sets;
        };

        setcore.getSingleNodeHash = function(node){
            //TODO this function only needed while the inheritance is not in its final form!!!
            //bb377d14fd57cbe2b0a2ad297a7a303b7a5fccf3
            ASSERT(setcore.isValidNode(node));
            function xorHashes (a, b) {
                var outHash = "";
                if(a.length === b.length){
                    for(var i=0;i< a.length;i++){
                        outHash += (parseInt(a.charAt(i),16) ^ parseInt(b.charAt(i),16)).toString(16);
                    }
                }
                return outHash;
            }
            //var hash = "0000000000000000000000000000000000000000";
            var hash = innerCore.getSingleNodeHash(node);

            //now we should stir all the sets hashes into the node's hash to get changes deep inside
            var names = setcore.getSetNames(node);
            for(var i=0;i<names.length;i++){
                var setNode = setcore.getChild(setcore.getChild(node,SETS_ID),names[i]);
                var memberRelids = setcore.getChildrenRelids(setNode);
                for(var j=0;j<memberRelids.length;j++){
                    hash = xorHashes(hash,innerCore.getSingleNodeHash(setcore.getChild(setNode,memberRelids[j])));
                }
            }

            return hash;
        };

        return setcore;

    }

    return SetCore;
});


