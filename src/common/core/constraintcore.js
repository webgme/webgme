/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
/*
example constraint structure for the outside world:
{
script:string,
priority:integer,
name:string,
message:string
}
provided API:
getConstraint(node,name) -> constraintObj
setConstraint(node,constraintObj)
getConstraintNames(node)
delConstraint(node,name)
 */
define([ "util/assert" ], function (ASSERT) {
    "use strict";
    var CONSTRAINTS_RELID = "_constraints";
    var C_DEF_PRIORITY = 1;
    function constraintCore (_innerCore) {
        var _core = {};
        for(var i in _innerCore){
            _core[i] = _innerCore[i];
        }

        var createNewConstraintRelId = function(constraintsNode){
            var max = Math.pow(2, 31);
            var existingRelIds = _innerCore.getChildrenRelids(constraintsNode);
            var relId;
            do{
                relId = Math.floor(Math.random() * max);
            } while (existingRelIds.indexOf(relId) !== -1);
            return "" + relId;
        };

        var getConstraintRelId = function(constraintsNode,name){
            var relIds = _innerCore.getChildrenRelids(constraintsNode);
            var relId;
            for(var i=0;i<relIds.length;i++){
                if(name === _innerCore.getAttribute(_innerCore.getChild(constraintsNode,relIds[i]),"name")){
                    relId = relIds[i];
                    break;
                }
            }
            return relId;
        };
        var getRegConstName = function(name){
            return "_ch#_"+name;
        };
        
        _core.getConstraint = function(node,name){
            ASSERT(_innerCore.isValidNode(node));
            var constraintsNode = _innerCore.getChild(node,CONSTRAINTS_RELID);
            var constRelId = getConstraintRelId(constraintsNode,name);
            if(constRelId){
                var constraintNode = _innerCore.getChild(constraintsNode,constRelId);
                return {
                    "script":_innerCore.getAttribute(constraintNode,"script"),
                    "priority":_innerCore.getAttribute(constraintNode,"priority"),
                    "message":_innerCore.getAttribute(constraintNode,"message")
                };
            } else {
                return null;
            }
        };

        _core.setConstraint = function(node,name,constraintObj){
            ASSERT(_innerCore.isValidNode(node));
            ASSERT(typeof constraintObj === 'object' && typeof name === 'string');
            var constraintsNode = _innerCore.getChild(node,CONSTRAINTS_RELID);
            var constRelId = getConstraintRelId(constraintsNode,name);
            if(!constRelId){
                //we should create a new one
                constRelId = createNewConstraintRelId(constraintsNode);
            }

            var constraintNode = _innerCore.getChild(constraintsNode,constRelId);
            constraintObj.priority = constraintObj.priority || C_DEF_PRIORITY;
            constraintObj.script = constraintObj.script || "console.log(\"empty constraint\");";
            constraintObj.message = constraintObj.message || "";
            _innerCore.setAttribute(constraintNode,"name",name);
            _innerCore.setAttribute(constraintNode,"script",constraintObj.script);
            _innerCore.setAttribute(constraintNode,"priority",constraintObj.priority);
            _innerCore.setAttribute(constraintNode,"message",constraintObj.message);
            _innerCore.setRegistry(node,getRegConstName(name),(_innerCore.getRegistry(node,getRegConstName(name)) || 0)+1);
        };

        _core.delConstraint = function(node,name){
            ASSERT(_innerCore.isValidNode(node));
            var constraintsNode = _innerCore.getChild(node,CONSTRAINTS_RELID);
            var constRelId = getConstraintRelId(constraintsNode,name);
            if(constRelId){
                var constraintNode = _innerCore.getChild(constraintsNode,constRelId);
                _innerCore.deleteNode(constraintNode);
            }
            _innerCore.delRegistry(node,getRegConstName(name));
        };

        _core.getConstraintNames = function(node){
            ASSERT(_innerCore.isValidNode(node));
            var constraintsNode = _innerCore.getChild(node,CONSTRAINTS_RELID);
            var relIds = _innerCore.getChildrenRelids(constraintsNode);
            var names = [];
            for(var i=0;i<relIds.length;i++){
                names.push(_innerCore.getAttribute(_innerCore.getChild(constraintsNode,relIds[i]),"name"));
            }
            return names;
        };

        return _core;
    }

    return constraintCore;
});
