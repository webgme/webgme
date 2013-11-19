/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
define([], function () {
    "use strict";

    function metaStorage () {
        var _core = null,
            _nodes = null,
            _initialized = false;

        function initialize(core,nodes){
            _core = core;
            _nodes = nodes;
            _initialized = true;
        }

        function isValidMeta(meta){
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

        //getter setter functions
        function getMeta(path){
            var meta = {children:{},attributes:{},pointers:{}};
            var node = _nodes[path] || null;
            if(node){
                var metaNode = _core.getChild(node,"_meta");
                var childrenNode = _core.getChild(metaNode,"children");
                //children
                if(_core.isEmpty(childrenNode)){
                    meta.children = {"types":null};
                } else {
                    meta.children = {};
                    meta.children.types = _core.getMemberPaths(childrenNode,"types");
                    for(var i=0;i<meta.children.types.length;i++){
                        meta.children.types[i] = pathToRefObject(meta.children.types[i]);
                    }
                    meta.children.min = _core.getAttribute(childrenNode,"min");
                    meta.children.max = _core.getAttribute(childrenNode,"max");
                    //TODO to make minItems and maxItems really available we should extend the functionality of our setmeta
                }

                //attributes - they are simple json objects from our point of view
                var atrNames = _core.getAttributeNames(metaNode);
                for(var i=0;i<atrNames.length;i++){
                    meta.attributes[atrNames[i]] = JSON.parse(JSON.stringify(_core.getAttribute(metaNode,atrNames[i])));
                }

                //pointers and pointer lists
                var pointerNames = _core.getRegistry(metaNode,"pointerNames") || [];
                for(var i=0;i<pointerNames.length;i++){
                    var pointerNode = _core.getChild(metaNode,"_p_"+pointerNames[i]);
                    var pointer = {};
                    pointer.types = _core.getMemberPaths(pointerNode,"types");
                    pointer.min = _core.getAttribute(pointerNode,"min");
                    pointer.max = _core.getAttribute(pointerNode,"max");

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
        function setMeta(path,meta){
            if(!isValidMeta){
                return;
            }
            var node = _nodes[path] || null;
            if(node){
                var metaNode = _core.getChild(node,"_meta");
                _core.deleteNode(metaNode);
                metaNode = _core.getChild(node,"_meta");
                if(meta.children){
                    var childrenNode = _core.getChild(metaNode,"children");
                    if(meta.children.types && meta.children.types.length){
                        if(meta.children.min){
                            _core.setAttribute(childrenNode,"min",meta.children.min);
                        }
                        if(meta.children.max){
                            _core.setAttribute(childrenNode,"max",meta.children.max);
                        }

                        for(var i=0;i<meta.children.types.length;i++){
                            var targetPath = refObjectToPath(meta.children.types[i]);
                            if(targetPath && _nodes[targetPath]){
                                _core.addMember(childrenNode,"types",_nodes[targetPath]);
                            }
                        }

                    } else {
                        _core.deleteNode(childrenNode);
                    }
                }

                if(meta.attributes){
                    for(var i in meta.attributes){
                        _core.setAttribute(metaNode,i,meta.attributes[i]);
                    }
                }

                if(meta.pointers){
                    var pointerNames = [];
                    for(var i in meta.pointers){
                        pointerNames.push(i);
                        var pointerNode = _core.getChild(metaNode,"_p_"+i);
                        if(meta.pointers[i].types && meta.pointers[i].types.length){
                            if(meta.pointers[i].min){
                                _core.setAttribute(pointerNode,"min",meta.pointers[i].min);
                            }
                            if(meta.pointers[i].max){
                                _core.setAttribute(pointerNode,"max",meta.pointers[i].max);
                            }

                            for(var j=0;j<meta.pointers[i].types.length;j++){
                                var targetPath = refObjectToPath(meta.pointers[i].types[j]);
                                if(targetPath && _nodes[targetPath]){
                                    _core.addMember(pointerNode,"types",_nodes[targetPath]);
                                }
                            }

                        }
                    }

                    _core.setRegistry(metaNode,"pointerNames",pointerNames);
                }
            }
        }


        //validation functions
        function getBaseChain(path,node){
            var chain = [];
            var node = _nodes[path];
            if(node){
                while(node !== null){
                    chain.push(_core.getPath(node));
                    node = _core.getBase(node);
                }
            }
            return chain;
        }
        function isTypeOf(path,typePath){
            var node = _nodes[path];
            if(node){
                var chain = getBaseChain(_core,node);
                if(chain.indexOf(typePath) !== -1){
                    return true;
                }
            }
            return false;
        }
        function isValidTypeOfArray(path,typePathArray){
            var i=0, isGood=false;
            while(i<typePathArray.length && !isGood){
                isGood = isTypeOf(path,typePathArray[i]);
            }
            return isGood;
        }

        function isValidChild(path,childPath){
            var node = _nodes[path];
            var child = _nodes[childPath];
            if(node && child){
                var metaNode = _core.getChild(node,"_meta");
                var childrenNode = _core.getChild(metaNode,"children");
                var types = _core.getMemberPaths(childrenNode,"types");
                return isValidTypeOfArray(childPath,types);
            }
            return false;
        }

        function isValidTarget(path,name,targetPath){
            var node = _nodes[path];
            var target = _nodes[targetPath];
            if(node && target){
                var meta = _core.getChild(node,"_meta");
                var pointer = _core.getChild(meta,"_p_"+name);
                var types = _core.getMemberPaths(pointer,"types");
                return isValidTypeOfArray(targetPath,types);
            }
            return false;
        }

        function isValidAttribute(path,name,attribute){
            //TODO we should check against schema
            return true;
        }

        function getValidChildrenTypes(path){
            var node = _nodes[path];
            if(node){
                return _core.getMemberPaths(_core.getChild(_core.getChild(node,"_meta"),"children"),"types");
            }
            return [];
        }

        function getValidTargetTypes(path,name){
            var node = _nodes[path];
            if(node){
                return _core.getMemberPaths(_core.getChild(_core.getChild(node,"_meta"),"_p_"+name),"types");
            }
            return [];
        }

        function hasOwnMetaRules(path){
            var node = _nodes[path];
            if(node){
                var own = getMeta(path);
                var base = getMeta(_core.getPath(_core.getBase(node)));
                return own === base;
            }
            return false;
        }

        function filterValidTarget(path,name,paths){
            var targets = [];
            for(var i=0;i<paths.length;i++){
                if(isValidTarget(path,name,paths[i])){
                    targets.push(paths[i]);
                }
            }
            return targets;
        }

        function getOwnValidChildrenTypes(path){
            var node = _nodes[path];
            var types = [];
            if(node){
                var own = getValidChildrenTypes(path);
                var base = getValidChildrenTypes(_core.getPath(_core.getBase(node)));
                for(var i= 0;i<own.length;i++){
                    if(base.indexOf(own[i]) === -1){
                        types.push(own[i]);
                    }
                }
            }
            return types;
        }

        function getOwnValidTargetTypes(path,name){
            var node = _nodes[path];
            var types = [];
            if(node){
                var own = getValidTargetTypes(path,name);
                var base = getValidTargetTypes(_core.getPath(_core.getBase(node)),name);
                for(var i= 0;i<own.length;i++){
                    if(base.indexOf(own[i]) === -1){
                        types.push(own[i]);
                    }
                }
            }
            return types;
        }

        return {
            initialize: initialize,
            getMeta : getMeta,
            setMeta : setMeta,
            isValidChild: isValidChild,
            isValidTarget: isValidTarget,
            isValidAttribute: isValidAttribute,
            getValidChildrenTypes: getValidChildrenTypes,
            getValidTargetTypes: getValidTargetTypes,
            hasOwnMetaRules : hasOwnMetaRules,
            filterValidTarget : filterValidTarget,
            getOwnValidChildrenTypes: getOwnValidChildrenTypes,
            getOwnValidTargetTypes: getOwnValidTargetTypes
        };
    }

    return metaStorage();
});
