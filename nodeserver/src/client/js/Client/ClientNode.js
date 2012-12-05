define(['commonUtil'],
    function( commonUtil){
        'use strict';
        var SETTOREL = commonUtil.setidtorelid;
        var RELTOSET = commonUtil.relidtosetid;
        var ISSET = commonUtil.issetrelid;
        var ClientNode = function(parameters){
            var self = this,
                node = parameters.node,
                core = parameters.core,
                actor = parameters.actor,
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
                var childrenin = core.getChildrenRelids(node);
                var childrenout = [];
                for(var i=0;i<childrenin.length;i++){
                    if(!ISSET(childrenin[i])){
                        childrenout.push(ownpath+ownpathpostfix+childrenin[i]);
                    }
                }
                return childrenout;
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

            //SET
            var getMemberIds = function(setid){
                setid = SETTOREL(setid);
                return actor.getMemberIds(getClientNodePath(),setid);
            };
            var getSetIds = function(){
                var childrenin = core.getChildrenRelids(node);
                var childrenout = [];
                for(var i=0;i<childrenin.length;i++){
                    if(ISSET(childrenin[i])){
                        var setid = RELTOSET(childrenin[i]);
                        if(setid){
                            childrenout.push(setid);
                        }
                    }
                }
                return childrenout;
            };
            //META
            var getValidChildrenTypes = function(){
                return getMemberIds('ValidChildren');
            };

            var printData = function(){
                //TODO it goes to console now...
                console.log("###node###"+ownpath);
                var mynode = {};
                mynode.node = node;
                var mysets = getSetIds();
                mynode.sets = {};
                for(var i=0;i<mysets.length;i++){
                    mynode.sets[mysets[i]] = getMemberIds(mysets[i]);
                }
                console.dir(mynode);

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
                getValidChildrenTypes : getValidChildrenTypes,
                getMemberIds          : getMemberIds
            }
        };
        return ClientNode;
    });
