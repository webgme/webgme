"use strict";

define(['js/Constants',
        'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants'], function (CONSTANTS,
                                                                                 DiagramDesignerWidgetConstants) {
 
    var CONTAINMENT_TYPE_LINE_END = "diamond2-xxwide-xxlong",
        POINTER_TYPE_LINE_END = "open-xwide-xlong",
        INHERITANCE_TYPE_LINE_END = "inheritance-xxwide-xxlong",
        SET_TYPE_LINE_END = "classic-xwide-xlong",
        SET_TYPE_LINE_START = "oval-wide-long",
        NO_END = "none";

    var _meta_relations = {
            CONTAINMENT : "containment",
            POINTER : "pointer",
            INHERITANCE : "inheritance",
            SET : "set"
    };

    var _connection_meta_info = {
        TYPE: "type"
    };

    var _getLineVisualDescriptor = function (sName) {
        var params = {};

        params[DiagramDesignerWidgetConstants.LINE_WIDTH] = 1;
        params[DiagramDesignerWidgetConstants.LINE_START_ARROW] = NO_END;
        params[DiagramDesignerWidgetConstants.LINE_END_ARROW] = NO_END;
        params[DiagramDesignerWidgetConstants.LINE_COLOR] = "#AAAAAA";
        params[DiagramDesignerWidgetConstants.LINE_PATTERN] = DiagramDesignerWidgetConstants.LINE_PATTERNS.SOLID;

        switch (sName) {
            case _meta_relations.CONTAINMENT:
                params[DiagramDesignerWidgetConstants.LINE_START_ARROW] = CONTAINMENT_TYPE_LINE_END;
                params[DiagramDesignerWidgetConstants.LINE_END_ARROW] = NO_END;
                params[DiagramDesignerWidgetConstants.LINE_COLOR] = "#000000";
                break;
            case _meta_relations.POINTER:
                params[DiagramDesignerWidgetConstants.LINE_START_ARROW] = NO_END;
                params[DiagramDesignerWidgetConstants.LINE_END_ARROW] = POINTER_TYPE_LINE_END;
                params[DiagramDesignerWidgetConstants.LINE_COLOR] = "#0000FF";
                break;
            case _meta_relations.INHERITANCE:
                params[DiagramDesignerWidgetConstants.LINE_START_ARROW] = INHERITANCE_TYPE_LINE_END;
                params[DiagramDesignerWidgetConstants.LINE_END_ARROW] = NO_END;
                params[DiagramDesignerWidgetConstants.LINE_COLOR] = "#FF0000";
                break;
            case _meta_relations.SET:
                params[DiagramDesignerWidgetConstants.LINE_START_ARROW] = SET_TYPE_LINE_START;
                params[DiagramDesignerWidgetConstants.LINE_END_ARROW] = SET_TYPE_LINE_END;
                params[DiagramDesignerWidgetConstants.LINE_COLOR] = "#FF00FF";
                break;
            default:
                break;
        }

        return params;
    };

    var _convertToButtonLineEndStyle = function (lineEndStyle) {
        if (lineEndStyle === INHERITANCE_TYPE_LINE_END) {
            return lineEndStyle.replace("xwide", "wide").replace("xlong", "long");
        }

        return lineEndStyle;
    };

    var _createButtonIcon = function (btnSize, connType) {
        var el = $('<div/>'),
            path,
            paper = Raphael(el[0], btnSize, btnSize),
            pathParams = _getLineVisualDescriptor(connType);

        if (connType === _meta_relations.CONTAINMENT ||
            connType === _meta_relations.INHERITANCE) {
            pathParams[DiagramDesignerWidgetConstants.LINE_START_ARROW] = _convertToButtonLineEndStyle(pathParams[DiagramDesignerWidgetConstants.LINE_START_ARROW]);
            pathParams[DiagramDesignerWidgetConstants.LINE_END_ARROW] = _convertToButtonLineEndStyle(pathParams[DiagramDesignerWidgetConstants.LINE_END_ARROW]);
        } else {
            //for pointer and pointer list we have to flip the line end visual styles
            var temp = pathParams[DiagramDesignerWidgetConstants.LINE_START_ARROW];
            pathParams[DiagramDesignerWidgetConstants.LINE_START_ARROW] = pathParams[DiagramDesignerWidgetConstants.LINE_END_ARROW];
            pathParams[DiagramDesignerWidgetConstants.LINE_END_ARROW] = temp;
        }

        el.attr({"style": "height: " + btnSize + "px; margin-top: 2px; margin-bottom: 2px;"});

        path = paper.path("M" + (Math.round(btnSize / 2) + 0.5) + ",0, L" + (Math.round(btnSize / 2) + 0.5) + "," + btnSize);

        path.attr({ "arrow-start": pathParams[DiagramDesignerWidgetConstants.LINE_START_ARROW],
            "arrow-end": pathParams[DiagramDesignerWidgetConstants.LINE_END_ARROW],
            "stroke":  pathParams[DiagramDesignerWidgetConstants.LINE_COLOR],
            "stroke-width": pathParams[DiagramDesignerWidgetConstants.LINE_WIDTH],
            "stroke-dasharray": pathParams[DiagramDesignerWidgetConstants.LINE_PATTERN]});

        return el;
    };

    return {
        META_RELATIONS: _meta_relations,

        getLineVisualDescriptor : _getLineVisualDescriptor,

        createButtonIcon : _createButtonIcon,

        CONNECTION_META_INFO: _connection_meta_info
    }
});