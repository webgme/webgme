"use strict";

define(['js/Constants'], function (CONSTANTS) {
 
    var VALIDCHILDREN_TYPE_LINE_END = "diamond-wide-long",
        VALIDINHERITOR_TYPE_LINE_END = "block-wide-long",
        VALIDSOURCE_TYPE_LINE_END = "oval-wide-long",
        VALIDDESTINATION_TYPE_LINE_END = "open-wide-long",
        GENERAL_TYPE_LINE_END = "classic-wide-long",
        NO_END = "none";

    return {
        getLineVisualDescriptor : function (sName) {
            var params = { "arrowStart" : NO_END,
                            "arrowEnd" : NO_END,
                            "width" : "2",
                            "color" :"#AAAAAA" };

            switch (sName) {
                case CONSTANTS.SET_VALIDCHILDREN:
                    params.arrowStart = VALIDCHILDREN_TYPE_LINE_END;
                    params.arrowEnd = NO_END;
                    params.color = "#FF0000";
                    break;
                case CONSTANTS.SET_VALIDINHERITOR:
                    params.arrowStart = VALIDINHERITOR_TYPE_LINE_END;
                    params.arrowEnd = NO_END;
                    params.color = "#0000FF";
                    break;
                case CONSTANTS.SET_VALIDSOURCE:
                    params.arrowStart = VALIDSOURCE_TYPE_LINE_END;
                    params.arrowEnd = NO_END;
                    params.color = "#00FF00";
                    break;
                case CONSTANTS.SET_VALIDDESTINATION:
                    params.arrowStart = VALIDDESTINATION_TYPE_LINE_END;
                    params.arrowEnd = NO_END;
                    params.color = "#AA03C3";
                    break;
                case CONSTANTS.SET_GENERAL:
                    params.arrowStart = GENERAL_TYPE_LINE_END;
                    params.arrowEnd = NO_END;
                    params.color = "#000000";
                    break;
                default:
                    break;
            }

            return params;
        },

        createButtonIcon : function (btnSize, pathParams) {
            var el = $('<div/>'),
                path,
                paper = Raphael(el[0], btnSize, btnSize);

            el.attr({"style": "height: " + btnSize + "px; margin-top: 2px; margin-bottom: 2px;"});

            path = paper.path("M" + btnSize / 2 + ",0, L" + btnSize / 2 + "," + btnSize);

            path.attr({ "arrow-start": pathParams.arrowStart,
                "arrow-end": pathParams.arrowEnd,
                "stroke": pathParams.color,
                "stroke-width": pathParams.width});

            return el;
        }
    }
});