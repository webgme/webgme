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
            var sNames = _core.getOwnAttributeNames(source),
                tNames = _core.getOwnAttributeNames(target),
                i,
                diff = {updated:{},removed:[],added:[]};

            for(i=0;i<sNames.length;i++){
                if(tNames.indexOf(sNames[i]) === -1){
                    diff.removed.push(sNames[i]);
                }
            }


        }
        function reg_diff(source,target){

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
