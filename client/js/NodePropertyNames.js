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
                            "isAbstract": "isAbstract",
                            "lineStyle": "lineStyle",
                            "ProjectRegistry": "ProjectRegistry",
                            "DisplayFormat": "DisplayFormat"};

    return { "Attributes": attributeNames,
             "Registry": registryNames };
});