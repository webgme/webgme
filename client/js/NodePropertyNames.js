/*
 * NodePropertyNames
 */
define([], function () {
    "use strict";

    var attributeNames = {  "name" : "name",
                            "directed": "directed" },
        registryNames = {   "position" : "position",
                            "decorator": "decorator",
                            "isPort": "isPort",
                            "lineStyle": "lineStyle" };

    return { "Attributes": attributeNames,
             "Registry": registryNames };
});