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

        function atr_diff(source,target){
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

        }
        function pointer_diff(source,target){

        }
        function ovr_diff(source,target){

        }
    }

    return nullPointerCore;
});
