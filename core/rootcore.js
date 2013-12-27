/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ "util/assert", 'core/tasync'], function (ASSERT,TASYNC) {
    "use strict";

    var VISIBLE_ROOT_PATH = 'root';
    var ACTUAL_ROOT_PATH = '';
    var toVisiblePath = function(actualPath){
        if(actualPath === ACTUAL_ROOT_PATH){
            actualPath = VISIBLE_ROOT_PATH;
        }
        return actualPath;
    };
    var toActualPath = function(visiblePath){
        if(visiblePath === VISIBLE_ROOT_PATH){
            visiblePath = ACTUAL_ROOT_PATH;
        }
        return visiblePath;
    };

    function RootCore(innerCore){
        var rootcore = {};
        for(var i in innerCore){
            rootcore[i] = innerCore[i];
        }

        //overloading functions so that they can be called without passing the root node and converting between the visible and valid root pathes
        // check
        rootcore.loadByPath = function(node, path){
            return innerCore.loadByPath(node,toActualPath(path));
        };
        rootcore.getPath = function(node,base){
            return toVisiblePath(innerCore.getPath(node,base));
        };
        rootcore.getPointerPath = function(node,name){
            return toVisiblePath(innerCore.getPointerPath(node,name));
        };
        rootcore.getOutsidePointerPath = function (node, name, source){
            return toVisiblePath(innerCore.getOutsidePointerPath(node,name,toActualPath(source)));
        };
        rootcore.getCollectionPaths = function(node,name){
            var sources = innerCore.getCollectionPaths(node,name);
            for(var i=0;i<sources.length;i++){
                sources[i] = toVisiblePath(sources[i]);
            }
            return sources;
        };
        rootcore.getCommonPathPrefixData = function(first,second){
            return toVisiblePath(innerCore.getCommonPathPrefixData(toActualPath(first),toActualPath(second)));
        };

        rootcore.toVisiblePath = toVisiblePath;
        rootcore.toActualPath = toActualPath;
        return rootcore;
    }

    return RootCore;
});



