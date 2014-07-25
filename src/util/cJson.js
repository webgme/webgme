/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
define([], function() {
    var _types = {
        null      : "[object Null]",
        array     : "[object Array]",
        object    : "[object Object]",
        number    : "[object Number]",
        string    : "[object String]",
        regexp    : "[object RegExp]",
        date      : "[object Date]",
        boolean   : "[object Boolean]",
        undefined : "[object Undefined]"
        },
        _direction = {
            deep : "deep",
            same : "same",
            shallow : "shallow"
        };
    function _type(value){
        if(value===null)return "[object Null]";
        return Object.prototype.toString.call(value);
    }

    function stringify(value,indent){
        var outStr,
            keys,
            indentStep = "  ";
        indent = indent || "";
        switch(_type(value)){
            case _types.array:
                outStr = "["+"\n"+indent;
                for(var i=0;i<value.length;i++){
                    outStr += stringify(value[i],indent+indentStep);
                    if(i<value.length-1){
                        outStr += ","+"\n"+indent;
                    }
                }
                outStr += "\n"+indent+"]";
                return outStr;
            case _types.object:
                keys = Object.keys(value);
                outStr = "{"+"\n"+indent;
                keys.sort();
                for(var i=0;i<keys.length;i++){
                    outStr += "\""+keys[i]+"\":";
                    outStr += stringify(value[keys[i]],indent+indentStep);
                    if(i<keys.length-1){
                        outStr += ","+"\n"+indent;
                    }
                }
                outStr += "\n"+indent+"}";
                return outStr;
            case _types.boolean:
                if(value === true){
                    return "true";
                }
                return "false";
            case _types.null:
                return "null";
            case _types.number:
                return ""+value;
            case _types.regexp:
            case _types.string:
            case _types.date: //we will lose the date type, but in our case it doesn't really matter as we never store a date really
            default:
                return "\""+value+"\"";

        }
    }
    return stringify;
});
