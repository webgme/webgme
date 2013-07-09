"use strict";

define(['js/Constants',
        'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants'], function (CONSTANTS,
                                                                                 DiagramDesignerWidgetConstants) {
 
    var VALIDCHILDREN_TYPE_LINE_END = "diamond-wide-long",
        VALIDINHERITOR_TYPE_LINE_END = "block-wide-long",
        VALIDSOURCE_TYPE_LINE_END = "oval-wide-long",
        VALIDDESTINATION_TYPE_LINE_END = "open-wide-long",
        GENERAL_TYPE_LINE_END = "classic-wide-long",
        NO_END = "none";

    return {
        getLineVisualDescriptor : function (sName) {
            var params = {};

            params[DiagramDesignerWidgetConstants.LINE_WIDTH] = 2;
            params[DiagramDesignerWidgetConstants.LINE_START_ARROW] = NO_END;
            params[DiagramDesignerWidgetConstants.LINE_END_ARROW] = NO_END;
            params[DiagramDesignerWidgetConstants.LINE_COLOR] = "#AAAAAA";

            switch (sName) {
                case CONSTANTS.SET_VALIDCHILDREN:
                    params[DiagramDesignerWidgetConstants.LINE_START_ARROW] = VALIDCHILDREN_TYPE_LINE_END;
                    params[DiagramDesignerWidgetConstants.LINE_END_ARROW] = NO_END;
                     params[DiagramDesignerWidgetConstants.LINE_COLOR] = "#FF0000";
                    break;
                case CONSTANTS.SET_VALIDINHERITOR:
                    params[DiagramDesignerWidgetConstants.LINE_START_ARROW] = VALIDINHERITOR_TYPE_LINE_END;
                     params[DiagramDesignerWidgetConstants.LINE_END_ARROW] = NO_END;
                     params[DiagramDesignerWidgetConstants.LINE_COLOR] = "#0000FF";
                    break;
                case CONSTANTS.SET_VALIDSOURCE:
                    params[DiagramDesignerWidgetConstants.LINE_START_ARROW] = VALIDSOURCE_TYPE_LINE_END;
                     params[DiagramDesignerWidgetConstants.LINE_END_ARROW] = NO_END;
                     params[DiagramDesignerWidgetConstants.LINE_COLOR] = "#00FF00";
                    break;
                case CONSTANTS.SET_VALIDDESTINATION:
                    params[DiagramDesignerWidgetConstants.LINE_START_ARROW] = VALIDDESTINATION_TYPE_LINE_END;
                     params[DiagramDesignerWidgetConstants.LINE_END_ARROW] = NO_END;
                     params[DiagramDesignerWidgetConstants.LINE_COLOR] = "#AA03C3";
                    break;
                case CONSTANTS.SET_GENERAL:
                    params[DiagramDesignerWidgetConstants.LINE_START_ARROW] = GENERAL_TYPE_LINE_END;
                     params[DiagramDesignerWidgetConstants.LINE_END_ARROW] = NO_END;
                     params[DiagramDesignerWidgetConstants.LINE_COLOR] = "#000000";
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

            path.attr({ "arrow-start": pathParams[DiagramDesignerWidgetConstants.LINE_START_ARROW],
                "arrow-end": pathParams[DiagramDesignerWidgetConstants.LINE_END_ARROW],
                "stroke":  pathParams[DiagramDesignerWidgetConstants.LINE_COLOR],
                "stroke-width": pathParams[DiagramDesignerWidgetConstants.LINE_WIDTH]});

            return el;
        }
    }
});