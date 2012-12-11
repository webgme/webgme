/*
 * NodePropertyNames
 */
define([], function () {
    "use strict";

    var attributeNames = {  "name" : "name",
                            "isPort": "isPort",
                            "directed": "directed" },
        registryNames = {   "position" : "position",
                            "decorator": "decorator",
                            "segmentPoints": "segmentPoints",
                            "lineType": "lineType" };

    return { "Attributes": attributeNames,
             "Registry": registryNames };
});