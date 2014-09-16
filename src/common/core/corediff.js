/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
define(['util/canon','core/tasync'], function (CANON,TASYNC) {
    "use strict";


    function nullPointerCore(_innerCore) {
        var _core = {};
        for (var i in _innerCore) {
            _core[i] = _innerCore[i];
        }

        function normalize(obj){
            if(!obj){
                return obj;
            }
            var keys = Object.keys(obj),
                i;
            for(i=0;i<keys.length;i++){
                if(Array.isArray(obj[keys[i]])){
                    if(obj[keys[i]].length === 0){
                        delete obj[keys[i]];
                    }
                } else if(typeof obj[keys[i]] === 'object'){
                    normalize(obj[keys[i]]);
                    if(obj[keys[i]] && Object.keys(obj[keys[i]]).length === 0){
                        delete obj[keys[i]];
                    }
                }
            }
        }
        function attr_diff(source,target){
            var sNames = _core.getAttributeNames(source),
                tNames = _core.getAttributeNames(target),
                i,
                diff = {updated:{},removed:[],added:[]};

            for(i=0;i<sNames.length;i++){
                if(tNames.indexOf(sNames[i]) === -1){
                    diff.removed.push(sNames[i]);
                }
            }

            for(i=0;i<tNames.length;i++){
                if(_core.getAttribute(source,tNames[i]) === undefined){
                    diff.updated[tNames[i]] = _core.getAttribute(target,tNames[i]);
                    diff.added.push(tNames[i]);
                } else {
                    if(CANON.stringify(_core.getAttribute(source,tNames[i])) !== CANON.stringify(_core.getAttribute(target,tNames[i]))){
                        diff.updated[tNames[i]] = _core.getAttribute(target,tNames[i]);
                    }
                }
            }

            return diff;
        }
        function reg_diff(source,target){
            var sNames = _core.getRegistryNames(source),
                tNames = _core.getRegistryNames(target),
                i,
                diff = {updated:{},removed:[],added:[]};

            for(i=0;i<sNames.length;i++){
                if(tNames.indexOf(sNames[i]) === -1){
                    diff.removed.push(sNames[i]);
                }
            }

            for(i=0;i<tNames.length;i++){
                if(_core.getRegistry(source,tNames[i]) === undefined){
                    diff.updated[tNames[i]] = _core.getRegistry(target,tNames[i]);
                    diff.added.push(tNames[i]);
                } else {
                    if(CANON.stringify(_core.getRegistry(source,tNames[i])) !== CANON.stringify(_core.getRegistry(target,tNames[i]))){
                        diff.updated[tNames[i]] = _core.getRegistry(target,tNames[i]);
                    }
                }
            }

            return diff;
        }
        function children_diff(source,target){
            var sRelids = _core.getChildrenRelids(source),
                tRelids = _core.getChildrenRelids(target),
                tHashes = _core.getChildrenHashes(target),
                sHashes = _core.getChildrenHashes(source),
                i,
                diff = {added:[],removed:[]};

            for(i=0;i<sRelids.length;i++){
                if(tRelids.indexOf(sRelids[i]) === -1){
                    diff.removed.push({relid:sRelids[i],hash:sHashes[sRelids[i]]});
                }
            }

            for(i=0;i<tRelids.length;i++){
                if(sRelids.indexOf(tRelids[i]) === -1){
                    diff.added.push({relid:tRelids[i],hash:tHashes[tRelids[i]]});
                }
            }

            return diff;

        }
        function pointer_diff(source,target){
            var sNames = _core.getPointerNames(source),
                tNames = _core.getPointerNames(target),
                i,
                diff = {added:[],updated:{},removed:[]};

            for(i=0;i<sNames.length;i++){
                if(tNames.indexOf(sNames[i]) === -1){
                    diff.removed.push(sNames[i]);
                }
            }

            for(i=0;i<tNames.length;i++){
                if(sNames.indexOf(tNames[i]) === -1){
                    diff.added.push(tNames[i]);
                    diff.updated[tNames[i]] = _core.getPointerPath(target,tNames[i]);
                } else {
                    if(_core.getPointerPath(source,tNames[i]) !== _core.getPointerPath(target,tNames[i])){
                        diff.updated[tNames[i]] = _core.getPointerPath(target,tNames[i]);
                    }
                }
            }

            return diff;
        }
        function set_diff(source,target){
            var sNames = _core.getSetNames(source),
                tNames = _core.getSetNames(target),
                sMembers, tMembers,i, j,memberDiff,
                diff = {added:[],updated:{},removed:[]};

            for(i=0;i<sNames.length;i++){
                if(tNames.indexOf(sNames[i]) === -1){
                    diff.removed.push(sNames[i]);
                }
            }

            for(i=0;i<tNames.length;i++){
                if(sNames.indexOf(tNames[i]) === -1){
                    diff.added.push(tNames[i]);
                    diff.updated[tNames[i]] = _core.getMemberPaths(target,tNames[i]);
                } else {
                    sMembers = _core.getMemberPaths(source,tNames[i]);
                    tMembers = _core.getMemberPaths(target,tNames[i]);
                    memberDiff = {added:[],removed:[]}; //TODO are we interested in member change (when some data of the member changes
                    for(j=0;j<sMembers.length;j++){
                        if(tMembers.indexOf(sMembers[j]) === -1){
                            memberDiff.removed.push(sMembers[j]);
                        }
                    }
                    for(j=0;j<tMembers.length;j++){
                        if(sMembers.indexOf(tMembers[j]) === -1){
                            memberDiff.added.push(tMembers[j]);
                        }
                    }

                    if(!isEmptyDiff(memberDiff)){
                        diff.updated[tNames[i]] = memberDiff;
                    }
                }
            }

            return diff;
        }
        function ovr_diff(source,target){
            // structure: path:{pointername:"targetpath"}
            // diff structure: path:{pointername:{target:path,type:updated/removed/added}}
            var i, j,paths,pNames,
                diff={},
                basePath = _core.getPath(source),
                sOvr = _core.getProperty(source,'ovr') || {},
                tOvr = _core.getProperty(target,'ovr') || {};

            //removals
            paths = Object.keys(sOvr);
            for(i=0;i<paths.length;i++){
                if(paths[i].indexOf("_") === -1){
                    //we do not care about technical relations - sets are handled elsewhere
                    pNames = Object.keys(sOvr[paths[i]]);
                    for(j=0;j<pNames.length;j++){
                        if(pNames[j].slice(-4) !== "-inv"){
                            //we only care about direct pointer changes and to real nodes
                            if(sOvr[paths[i]][pNames[j]].indexOf("_") === -1){
                                if(!(tOvr[paths[i]] && tOvr[paths[i]][pNames[j]])){
                                    diff[paths[i]] = diff[paths[i]] || {};
                                    diff[paths[i]][pNames[j]] = {target:null,type:"removed"};
                                }
                            }

                        }
                    }
                }

            }

            //updates and additions
            paths = Object.keys(tOvr);
            for(i=0;i<paths.length;i++){
                if(paths[i].indexOf("_") === -1) {
                    //we do not care about technical relations - sets are handled elsewhere
                    pNames = Object.keys(tOvr[paths[i]]);
                    for(j=0;j<pNames.length;j++){
                        if(pNames[j].slice(-4) !== "-inv"){
                            //we only care about direct pointer changes and to real nodes
                            if(tOvr[paths[i]][pNames[j]].indexOf("_") === -1){
                                if(!(sOvr[paths[i]] && sOvr[paths[i]][pNames[j]])){
                                    diff[paths[i]] = diff[paths[i]] || {};
                                    diff[paths[i]][pNames[j]] = {target:_core.joinPaths(basePath,tOvr[paths[i]][pNames[j]]),type:"added"};
                                } else if(sOvr[paths[i]][pNames[j]] !== tOvr[paths[i]][pNames[j]]){
                                    diff[paths[i]] = diff[paths[i]] || {};
                                    diff[paths[i]][pNames[j]] = {target:_core.joinPaths(basePath,tOvr[paths[i]][pNames[j]]),type:"updated"};
                                }
                            }
                        }
                    }
                }

            }

            return diff;
        }

        function metaRulesChanged(source,target){
            return CANON.stringify(_core.getJsonMeta(source)) !== CANON.stringify(_core.getJsonMeta(target));
        }
        function isEmptyDiff(diff){
            if(diff.removed && diff.removed.length > 0){
                return false;
            }
            if(diff.added && (diff.added.length > 0 || Object.keys(diff.added).length > 0)){
                return false;
            }
            if(diff.updated && Object.keys(diff.updated).length > 0){
                return false;
            }
            return true;
        }
        function isEmptyNodeDiff(diff){
            if(isEmptyDiff(diff.children || {})){
                if(isEmptyDiff(diff.attr || {})){
                    if(isEmptyDiff(diff.reg || {})){
                        if(isEmptyDiff(diff.pointer || {})){
                            if(isEmptyDiff(diff.set || {})){
                                return true;
                            }
                        }
                    }
                }
            }
            return false;
        }

        function extendDiffWithOvr(diff,oDiff){
            var patharray,
                i, j,
                keys = Object.keys(oDiff),
                names,
                wholeNodeDelete = false,
                tDiff;

            for(i=0;i<keys.length;i++){
                tDiff = diff;
                wholeNodeDelete = false;
                names = Object.keys(oDiff[keys[i]]);
                patharray = keys[i].split('/');
                patharray.shift();
                if(patharray.length > 0){
                    for(j=0;j<patharray.length;j++){
                        if(tDiff.children && tDiff.children.removed && tDiff.children.removed.indexOf(patharray[j]) !== -1){
                            wholeNodeDelete = true;
                        }
                        if(!tDiff[patharray[j]]){
                            tDiff[patharray[j]] = {};
                        }
                        tDiff = tDiff[patharray[j]];
                    }
                    //now we should iterate through all pointers in the oDiff
                    if(!wholeNodeDelete){
                        for(j=0;j<names.length;j++){
                            switch(oDiff[keys[i]][names[j]].type){
                                case "added":
                                    if(!(tDiff.pointer && tDiff.pointer.added && tDiff.pointer.added.indexOf(names[j]) !== -1)){
                                        if(tDiff.pointer && tDiff.pointer.removed && tDiff.pointer.removed.indexOf(names[j]) !== -1){
                                            //the relation got updated but it switched level regarding the containment
                                            tDiff.pointer.removed.splice(tDiff.pointer.removed.indexOf(names[j]),1);
                                            if(tDiff.pointer.removed.length === 0){ delete tDiff.pointer.removed; }
                                            if(Object.keys(tDiff.pointer).length === 0) { delete tDiff.pointer; }
                                            tDiff.pointer = tDiff.pointer || {};
                                            tDiff.pointer.updated = tDiff.pointer.updated || {};
                                            tDiff.pointer.updated[names[j]] = oDiff[keys[i]][names[j]].target;
                                        } else {
                                            //this is the first encounter of the pointer
                                            tDiff.pointer = tDiff.pointer || {};
                                            tDiff.pointer.added = tDiff.pointer.added || {};
                                            tDiff.pointer.added[names[j]] = oDiff[keys[i]][names[j]].target;
                                        }
                                    }
                                    break;
                                case "updated":
                                    //if it is an update in the ovr than it must be an update anywhere
                                    if(!(tDiff.pointer && tDiff.pointer.updated && tDiff.pointer.updated[names[j]])){
                                        tDiff.pointer = tDiff.pointer || {};
                                        tDiff.pointer.updated = tDiff.pointer.updated || {};
                                        tDiff.pointer.updated[names[j]] = oDiff[keys[i]][names[j]].target;
                                    }
                                    break;
                                case "removed":
                                    if(!(tDiff.pointer && tDiff.pointer.removed && tDiff.pointer.removed.indexOf(names[j]) !== -1)){
                                        if(tDiff.pointer && tDiff.pointer.added && tDiff.pointer.added.indexOf(names[j]) !== -1){
                                            //the relation got updated but it switched level regarding the containment
                                            tDiff.pointer.added.splice(tDiff.pointer.added.indexOf(names[j]),1);
                                            if(tDiff.pointer.added.length === 0){ delete tDiff.pointer.added; }
                                            if(Object.keys(tDiff.pointer).length === 0) { delete tDiff.pointer; }
                                            tDiff.pointer = tDiff.pointer || {};
                                            tDiff.pointer.updated = tDiff.pointer.updated || {};
                                            tDiff.pointer.updated[names[j]] = oDiff[keys[i]][names[j]].target;
                                        } else {
                                            //this is the first encounter of the pointer
                                            tDiff.pointer = tDiff.pointer || {};
                                            tDiff.pointer.removed = tDiff.pointer.removed || [];
                                            tDiff.pointer.removed.push(names[j]);
                                        }
                                    }
                                    break;
                            }
                        }
                    }

                }
            }
        }

        /*function extendDiffWithGuidInfo(source,target,diff){
            //it is an async function
            var childLoaded = function(child,relid,isAdded){

                },
                i,
                addedKeys = diff.children ? Object.keys(diff.children.added) : [],
                removedKeys = diff.children ? Object.keys(diff.childre.re);
        }*/

        _core.nodeDiff = function(source,target){
            var diff = {
                children : children_diff(source,target),
                attr     : attr_diff(source,target),
                reg      : reg_diff(source,target),
                pointer  : pointer_diff(source,target),
                set      : set_diff(source,target)
            };
            if(metaRulesChanged(source,target)){
                diff.meta = true;
            }
            normalize(diff);
            return isEmptyNodeDiff(diff) ? null : diff;
        };

        _core.generateTreeDiff = function(sourceRoot,targetRoot){
            var sChildrenHashes = _core.getChildrenHashes(sourceRoot),
                tChildrenHAshes = _core.getChildrenHashes(targetRoot),
                sRelids = Object.keys(sChildrenHashes),
                tRelids = Object.keys(tChildrenHAshes),
                diff = _core.nodeDiff(sourceRoot,targetRoot) || {},
                oDiff = ovr_diff(sourceRoot,targetRoot),
                sChildren = _core.loadChildren(sourceRoot),
                tChildren = _core.loadChildren(targetRoot),
                getChild = function(childArray,relid){
                    for(var i=0;i<childArray.length;i++){
                        if(_core.getRelid(childArray[i]) === relid){
                            return childArray[i];
                        }
                    }
                    return null;
                };
            return TASYNC.call(function(){
                var i,sChild, done,tDiff;
                //fill the guid of removed children
                tDiff = diff.children ? diff.children.removed || [] : [];
                for(i=0;i<tDiff.length;i++){
                    tDiff[i].guid = _core.getGuid(getChild(sChildren,tDiff[i].relid));
                }
                //fill the guid of added children
                tDiff = diff.children ? diff.children.added || [] : [];
                for(i=0;i<tDiff.length;i++){
                    tDiff[i].guid = _core.getGuid(getChild(tChildren,tDiff[i].relid));
                }

                for(i=0;i<tChildren.length;i++){
                    sChild = getChild(sChildren,_core.getRelid(tChildren[i]));
                    if(sChild && _core.getHash(tChildren[i]) !== _core.getHash(sChild)){
                        done = TASYNC.call(function(cDiff,relid){
                            diff[relid] = cDiff;
                        },_core.generateTreeDiff(sChild,tChildren[i]),_core.getRelid(sChild),done);
                    }
                }
                return TASYNC.call(function(){
                    normalize(diff);
                    if(Object.keys(diff).length > 0){
                        diff.guid = _core.getGuid(targetRoot);
                    }
                    return diff;
                },done);
            },sChildren,tChildren);

        };
        return _core;
    }

    return nullPointerCore;
});
