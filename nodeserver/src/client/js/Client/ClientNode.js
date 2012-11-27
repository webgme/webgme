define([],
    function( ){
        'use strict';
        var ClientNode = function(node,core,meta){
            var self = this,
                ownpath = core.getStringPath(node),
                ownpathpostfix = ownpath === "" ? "" : "/";

            var getParentId = function(){
                var parent = core.getParent(node);
                if(parent){
                    var parentpath = core.getStringPath(parent);
                    if(parentpath === ""){
                        parentpath = "root";
                    }
                    return parentpath;
                } else {
                    return null;
                }
            };
            var getId = function(){
                return getClientNodePath(node);
            };
            var getChildrenIds = function(){
                var children = core.getChildrenRelids(node);
                for(var i=0;i<children.length;i++){
                    children[i]=ownpath+ownpathpostfix+children[i];
                }
                return children;
            };
            var getBaseId = function(){
                if(core.getRegistry(node,"isConnection") === true){
                    return "connection";
                } else {
                    return "object";
                }
            };
            var getInheritorIds = function(){
                return null;
            };
            var getAttribute = function(name){
                return core.getAttribute(node,name);
            };
            var getRegistry = function(name){
                return core.getRegistry(node,name);
            };
            var getPointer = function(name){
                return {to:core.getPointerPath(node,name),from:[]};
            };
            var getPointerNames = function(){
                return core.getPointerNames(node);
            };
            var getAttributeNames = function(){
                return core.getAttributeNames(node);
            };
            var getRegistryNames = function(){
                return core.getRegistryNames(node);
            };

            var getClientNodePath = function(){
                var path = ownpath;
                if(path === ""){
                    path = "root";
                }
                return path;
            };

            //META
            var getValidChildrenTypes = function(){
                return meta.getValidChildrenTypes(self);
            };

            var printData = function(){
                //TODO it goes to console now...
                console.log("nodeprint###\n"+JSON.stringify(node)+"\nendnodeprint###\n");
            };

            return {
                getParentId : getParentId,
                getId       : getId,
                getChildrenIds : getChildrenIds,
                getBaseId : getBaseId,
                getInheritorIds : getInheritorIds,
                getAttribute : getAttribute,
                getRegistry : getRegistry,
                getPointer : getPointer,
                getPointerNames : getPointerNames,
                getAttributeNames : getAttributeNames,
                getRegistryNames : getRegistryNames,
                //helping functions
                printData : printData,
                //META functions
                getValidChildrenTypes : getValidChildrenTypes
            }
        };
        return ClientNode;
    });
