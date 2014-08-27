/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
define(['util/canon'], function (CANON) {
    "use strict";


    function nullPointerCore(_innerCore) {
        var _core = {};
        for (var i in _innerCore) {
            _core[i] = _innerCore[i];
        }

        function normalize(obj){
            var keys = Object.keys(obj),
                i;
            for(i=0;i<keys.length;i++){
                if(Array.isArray(obj[keys[i]])){
                    if(obj[keys[i]].length === 0){
                        delete obj[keys[i]];
                    }
                } else if(typeof obj[keys[i]] === 'object'){
                    normalize(obj[keys[i]]);
                    if(Object.keys(obj[keys[i]]).length === 0){
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
                i,
                diff = {added:[],removed:[]};

            for(i=0;i<sRelids.length;i++){
                if(tRelids.indexOf(sRelids[i]) === -1){
                    diff.removed.push(sRelids[i]);
                }
            }

            for(i=0;i<tRelids.length;i++){
                if(sRelids.indexOf(tRelids[i]) === -1){
                    diff.added.push(tRelids[i]);
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

        }
        function isEmptyDiff(diff){
            if(diff.removed && diff.removed.length > 0){
                return false;
            }
            if(diff.added && diff.added.length > 0 ){
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
        _core.nodeDiff = function(source,target){
            var diff = {
                children : children_diff(source,target),
                attr     : attr_diff(source,target),
                reg      : reg_diff(source,target),
                pointer  : pointer_diff(source,target),
                set      : set_diff(source,target)
            };
            normalize(diff);
            return isEmptyNodeDiff(diff) ? null : diff;
        };

        _core.generateTreeDiff = function(sourceRoot,targetRoot,callback){
            callback(new Error("not implemented"),null);
        };
        return _core;
    }

    return nullPointerCore;
});
