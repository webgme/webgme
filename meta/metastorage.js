/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
define([], function () {
    "use strict";

    function metaStorage () {

        function isValidMeta(nodes,meta){
            /*if( typeof meta === 'object'){
                if(
                    //children
                    typeof meta.children === 'object' &&
                    (meta.children.types === null || typeof meta.children.types === 'array') &&
                    (typeof meta.children.min === 'undefined' || typeof meta.children.min === 'number') &&
                    (typeof meta.children.max === 'undefined' || typeof meta.children.max === 'number')){

                    //attributes
                }
            }

            return false;*/
            //TODO implement it :)
            return true;
        }

        function isValidAttributeSchema(atrSchema){
            //TODO implement :)
            return true;
        }

        //TODO this may change
        function pathToRefObject(path){
            var ref = {};
            ref['$ref'] = "#"+path;
            return ref;
        }

        //TODO this may change
        function refObjectToPath(ref){
            if(typeof ref['$ref'] === 'string'){
                return ref['$ref'].substring(1);
            } else {
                return null;
            }
        }

        function getMeta(core,nodes,path){
            var meta = {children:{},attributes:{},pointers:{}};
            var node = nodes[path] || null;
            if(node){
                var metaNode = core.getChild(node,"_meta");
                var childrenNode = core.getChild(metaNode,"children");
                //children
                if(core.isEmpty(childrenNode)){
                    meta.children = {"types":null};
                } else {
                    meta.children = {};
                    meta.types = core.getMemberPaths(childrenNode,"types");
                    meta.min = core.getAttribute(childrenNode,"min");
                    meta.max = core.getAttribute(childrenNode,"max");
                    //TODO to make minItems and maxItems really available we should extend the functionality of our setmeta
                }

                //attributes - they are simple json objects from our point of view
                var atrNames = core.getAttributeNames(metaNode);
                for(var i=0;i<atrNames.length;i++){
                    meta.attributes[i] = JSON.parse(JSON.stringify(core.getAttribute(metaNode,atrNames[i])));
                }

                //pointers and pointer lists
                var pointerNames = core.getRegistry(metaNode,"pointerNames");
                for(var i=0;i<pointerNames.length;i++){
                    var pointerNode = core.getChild(metaNode,"_p_"+pointerNames[i]);
                    var pointer = {};
                    pointer.types = core.getMemberPaths(pointerNode,"types");
                    pointer.min = core.getAttribute(pointerNode,"min");
                    pointer.max = core.getAttribute(pointerNode,"max");

                    for(var j=0;j<pointer.types.length;j++){
                        pointer.types[j] = pathToRefObject(pointer.types[j]);
                    }

                    meta.pointers[pointerNames[i]] = pointer;
                }
                return meta;
            } else {
                return null;
            }
        }

        function setMeta(core,nodes,path,meta){
            if(!isValidMeta){
                return;
            }
            var node = nodes[path] || null;
            if(node){
                var metaNode = core.getChild(node,"_meta");
                core.deleteNode(metaNode);
                metaNode = core.getChild(node,"_meta");
                if(meta.children){
                    var childrenNode = core.getChild(metaNode,"children");
                    if(typeof meta.children.types === 'array'){
                        if(meta.children.min){
                            core.setAttribute(childrenNode,"min",meta.children.min);
                        }
                        if(meta.children.max){
                            core.setAttribute(childrenNode,"min",meta.children.max);
                        }

                        for(var i=0;i<meta.children.types.length;i++){
                            var targetPath = refObjectToPath(meta.children.types[i]);
                            if(targetPath && nodes[targetPath] && nodes[targetPath].node){
                                core.addMember(childrenNode,"types",nodes[targetPath].node);
                            }
                        }

                    } else {
                        core.deleteNode(childrenNode);
                    }
                }

                if(meta.attributes){
                    for(var i in meta.attributes){
                        core.setAttribute(metaNode,i,meta.attributes[i]);
                    }
                }

                if(meta.pointers){
                    var pointerNames = [];
                    for(var i in meta.pointers){
                        pointerNames.push(i);
                        var pointerNode = core.getChild(metaNode,"_p_"+i);
                        if(typeof meta.pointers[i].types === 'array'){
                            if(meta.pointers[i].min){
                                core.setAttribute(pointerNode,"min",meta.pointers[i].min);
                            }
                            if(meta.pointers[i].max){
                                core.setAttribute(pointerNode,"min",meta.pointers[i].max);
                            }

                            for(var j=0;j<meta.pointers[i].types.length;j++){
                                var targetPath = refObjectToPath(meta.pointers[i].types[j]);
                                if(targetPath && nodes[targetPath] && nodes[targetPath].node){
                                    core.addMember(pointerNode,"types",nodes[targetPath].node);
                                }
                            }

                        }
                    }

                    core.setRegistry(metaNode,"pointerNames",pointerNames);
                }
            }
        }

        return {
            getMeta : getMeta,
            setMeta : setMeta
        };
    }

    return metaCore;
});
