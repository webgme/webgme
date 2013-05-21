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
                            "segmentPoints": "segmentPoints",
                            "lineType": "lineType" };

    return { "Attributes": attributeNames,
             "Registry": registryNames };
});