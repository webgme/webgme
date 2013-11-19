/*
 * NodePropertyNames
 */
define([], function () {
    "use strict";

    var attributeNames = {  "name" : "name",
                            "directed": "directed"},
        registryNames = {   "position" : "position",
                            "rotation": "rotation",
                            "decorator": "decorator",
                            "isPort": "isPort",
                            "lineStyle": "lineStyle" };

    return { "Attributes": attributeNames,
             "Registry": registryNames };
});