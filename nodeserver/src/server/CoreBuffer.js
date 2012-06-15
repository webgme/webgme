define(['CommonUtil'],function(commonUtil){
    "use strict";
    var ASSERT = commonUtil.assert;
    var Buffer = function(storage){
        ASSERT(storage);
        
        var objects = {};

        var isValid = function(node){
            ASSERT(node);
            
            var valid=true;

        };
        var getAttribute = function(node,name){
            ASSERT(node);
            ASSERT(node._id);
            ASSERT(objects[node._id]);
            ASSERT(typeof name === "string");

            var object = objects[node._id];
            var found = false;
            var attribute = null;

            while(!found){
                if(object.attributes[name] !== undefined){
                    found = true;
                    attribute = object.attributes[name];
                }
                else{
                    if(object.relations.baseId){
                        object = objects{object.relations.baseId};
                    }
                    else{
                        attribute = undefined;
                        found = true;
                    }
                }
            }
            return attribute;
        };
        return {

        };
    };
    return Buffer;
});
