define([ "util/assert", "core/core", "core/tasync", "util/jjv" ], function(ASSERT, Core, TASYNC, JsonValidator) {
    "use strict";

    // ----------------- CoreType -----------------

    var MetaCore = function(oldcore) {
        // copy all operations
        var core = {};
        for ( var key in oldcore) {
            core[key] = oldcore[key];
        }

        var sameNode = function(nodeA,nodeB){
            if(core.getPath(nodeA) === core.getPath(nodeB)){
                return true;
            }
            return false;
        };

        var realNode = function(node){ //TODO we have to make some more sophisticated distinction
            if(core.getPath(node).indexOf('_') !== -1){
                return false;
            }
            return true;
        };

        var MetaNode = function(node){
            return core.getChild(node,"_meta");
        };
        var MetaChildrenNode = function(node){
            return core.getChild(core.getChild(node,"_meta"),"children");
        };
        var MetaPointerNode = function(node,name){
            var meta = MetaNode(node),
                pointerNames = core.getPointerNames(meta) || [];
            if(pointerNames.indexOf(name) !== -1){
                return core.getChild(meta,"_p_"+name);
            }
            return null;
        };

        //now the additional functions
        core.isTypeOf = function(node, typeNode){
            if(!realNode(node)){
                return false;
            }
            while(node){
                if(sameNode(node,typeNode)){
                    return true;
                }
                node = core.getBase(node);
            }
            return false;
        };

        core.isValidChildOf = function(node,parentNode){
            if(!realNode(node)){
                return true;
            }
            var validChildTypePaths = core.getMemberPaths(MetaChildrenNode(parentNode),"items") || [];
            while(node){
                if(validChildTypePaths.indexOf(core.getPath(node)) !== -1){
                    return true;
                }
                node = core.getBase(node);
            }
            return false;
        };

        core.isValidTargetOf = function(node,source,name){
            if(!realNode(source)){
                return true;
            }
            var pointerMetaNode = MetaPointerNode(node,name);
            if(pointerMetaNode){
                var validTargetTypePaths = core.getMemberPaths(pointerMetaNode,"items") || [];
                while(node){
                    if(validTargetTypePaths.indexOf(core.getPath(node)) !== -1){
                        return true;
                    }
                }
            }
            return false;
        };

        core.isValidAttributeValueOf = function(node,name,value){
            if(!realNode(node)){
                return true;
            }
            var validator = JsonValidator(),
                meta = MetaNode(node),
                atrNames = core.getAttributeNames(meta) || [],
                error = null;

            if(atrNames.indexOf(name) !== -1){
                validator.addSchema(name,core.getAttribute(meta,name));
                error = validator.validate(name,value);
                if(error === null){
                    return true;
                }
            }
            return false;
        };

        //now the overridden functions to check as many meta rules as possible before making the actual modification
        core.setAttribute = function(node,name,value){
            if(core.isValidAttributeValueOf(node,name,value)){
                return oldcore.setAttribute(node,name,value);
            } else {
                return new Error('meta validation failed');
            }
        };

        core.createNode = function(parameters){
            var valid = true,
                validChildrenTypes = [];
            if(parameters && parameters.parent){
                if(parameters.base){
                    valid = core.isValidChildOf(parameters.base,parameters.parent);
                } else {
                    validChildrenTypes = core.getMemberPaths(MetaChildrenNode(parameters.parent),"items");
                    if(validChildrenTypes.length > 0){
                        valid = false;
                    }
                }
            }

            if(valid){
                return oldcore.createNode(parameters);
            } else {
                return null; //TODO how to give back an error in this case??
            }
        };

        core.setPointer = function(node,name,target){
            if(core.isValidTargetOf(target,node,name)){
                return oldcore.setPointer(node,name,target);
            } else {
                return new Error('meta validation failed');
            }
        };

        return core;

    };

    return MetaCore;
});
