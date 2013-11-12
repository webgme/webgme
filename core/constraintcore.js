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
name:string
}
provided API:
getConstraint(node,name) -> constraintObj
setConstraint(node,constraintObj)
getConstraintNames(node)
 */
define([ "util/assert" ], function (ASSERT) {
    "use strict";
    var CONSTRAINTS_RELID = "_constraints";
    var C_RELID_PREFIX = "_c_";
    var C_DEF_PRIORITY = 1;
    function constraintCore (_innerCore) {
        var _core = {};
        for(var i in _innerCore){
            _core[i] = _innerCore[i];
        }

        _core.getConstraint = function(node,name){
            ASSERT(_innerCore.isValidNode(node));
            var constraints = _innerCore.getChild(node,CONSTRAINTS_RELID);
            var constraintNode = _innerCore.getChild(constraints,C_RELID_PREFIX+name);
            var constraintObj = {name:name};
            constraintObj.script = _innerCore.getAttribute(constraintNode,"script");
            constraintObj.priority = _innerCore.getAttribute(constraintNode,"priority");
            return constraintObj;
        };

        _core.setConstraint = function(node,constraintObj){
            ASSERT(_innerCore.isValidNode(node));
            ASSERT(typeof constraintObj === 'object' && typeof constraintObj.name === 'string' && typeof constraintObj.script === 'string');
            var constraints = _innerCore.getChild(node,CONSTRAINTS_RELID);
            var constraintNode = _innerCore.getChild(constraints,C_RELID_PREFIX+constraintObj.name);
            constraintNode.priority = constraintNode.priority || C_DEF_PRIORITY;
            _innerCore.setAttribute(constraintNode,"script",constraintObj.script);
            _innerCore.setAttribute(constraintNode,"priority",constraintObj.priority);
        };

        _core.getConstraintNames = function(node){
            ASSERT(_innerCore.isValidNode(node));
            var constraints = _innerCore.getChild(node,CONSTRAINTS_RELID);
            var relids = _innerCore.getChildrenRelids(constraints);
            var names = [];
            for(var i=0;i<relids.length;i++){
                names.push(relids[i].substring(3));
            }
            return names;
        };

        return _core;
    }

    return constraintCore;
});
