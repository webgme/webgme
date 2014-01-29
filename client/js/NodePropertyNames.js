/*
 * NodePropertyNames
 */
define(['js/Constants'], function (CONSTANTS) {
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
                            "DisplayFormat": "DisplayFormat",
                            "FillColor": CONSTANTS.FILL_COLOR,
                            "TextColor": CONSTANTS.TEXT_COLOR,
                            "LineColor": CONSTANTS.LINE_COLOR};

    return { "Attributes": attributeNames,
             "Registry": registryNames };
});