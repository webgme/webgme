/*globals define, $, Raphael */
/*jshint browser: true */
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/Constants',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants'
], function (CONSTANTS,
             DiagramDesignerWidgetConstants) {

    'use strict';

    var CONTAINMENT_TYPE_LINE_END = 'diamond2-xxwide-xxlong',
        POINTER_TYPE_LINE_END = 'open-xwide-xlong',
        INHERITANCE_TYPE_LINE_END = 'inheritance-xxwide-xxlong',
        MIXIN_TYPE_LINE_END = 'open-xxwide-xxlong',
        SET_TYPE_LINE_END = 'classic-xwide-xlong',
        SET_TYPE_LINE_START = 'oval-wide-long',
        NO_END = 'none',

        metaRelations = {
            CONTAINMENT: 'containment',
            POINTER: 'pointer',
            INHERITANCE: 'inheritance',
            MIXIN: 'mixin',
            SET: 'set'
        },

        connectionMetaInfo = {
            TYPE: 'type'
        };

    function getLineVisualDescriptor(sName) {
        var params = {};

        params[DiagramDesignerWidgetConstants.LINE_WIDTH] = 1;
        params[DiagramDesignerWidgetConstants.LINE_START_ARROW] = NO_END;
        params[DiagramDesignerWidgetConstants.LINE_END_ARROW] = NO_END;
        params[DiagramDesignerWidgetConstants.LINE_COLOR] = '#AAAAAA';
        params[DiagramDesignerWidgetConstants.LINE_PATTERN] = DiagramDesignerWidgetConstants.LINE_PATTERNS.SOLID;

        switch (sName) {
            case metaRelations.CONTAINMENT:
                params[DiagramDesignerWidgetConstants.LINE_START_ARROW] = CONTAINMENT_TYPE_LINE_END;
                params[DiagramDesignerWidgetConstants.LINE_END_ARROW] = NO_END;
                params[DiagramDesignerWidgetConstants.LINE_COLOR] = '#000000';
                break;
            case metaRelations.POINTER:
                params[DiagramDesignerWidgetConstants.LINE_START_ARROW] = NO_END;
                params[DiagramDesignerWidgetConstants.LINE_END_ARROW] = POINTER_TYPE_LINE_END;
                params[DiagramDesignerWidgetConstants.LINE_COLOR] = '#0000FF';
                break;
            case metaRelations.INHERITANCE:
                params[DiagramDesignerWidgetConstants.LINE_START_ARROW] = NO_END;
                params[DiagramDesignerWidgetConstants.LINE_END_ARROW] = INHERITANCE_TYPE_LINE_END;
                params[DiagramDesignerWidgetConstants.LINE_COLOR] = '#FF0000';
                break;
            case metaRelations.MIXIN:
                params[DiagramDesignerWidgetConstants.LINE_START_ARROW] = NO_END;
                params[DiagramDesignerWidgetConstants.LINE_END_ARROW] = MIXIN_TYPE_LINE_END;
                params[DiagramDesignerWidgetConstants.LINE_COLOR] = '#FF0000';
                params[DiagramDesignerWidgetConstants.LINE_PATTERN] = DiagramDesignerWidgetConstants.LINE_PATTERNS.LONGDASH;
                break;
            case metaRelations.SET:
                params[DiagramDesignerWidgetConstants.LINE_START_ARROW] = SET_TYPE_LINE_START;
                params[DiagramDesignerWidgetConstants.LINE_END_ARROW] = SET_TYPE_LINE_END;
                params[DiagramDesignerWidgetConstants.LINE_COLOR] = '#FF00FF';
                break;
            default:
                break;
        }

        return params;
    }

    function convertToButtonLineEndStyle(lineEndStyle) {
        if (lineEndStyle === INHERITANCE_TYPE_LINE_END) {
            return lineEndStyle.replace('xwide', 'wide').replace('xlong', 'long');
        }
        return lineEndStyle;
    }

    function createButtonIcon(connType) {
        var el = $('<div/>'),
            path,
            btnSize = 16, //TODO check if it is a possibility that it will be different for any calls
            paper = Raphael(el[0], btnSize, btnSize),
            pathParams = getLineVisualDescriptor(connType),
            temp;

        if (connType === metaRelations.CONTAINMENT) {

            pathParams[DiagramDesignerWidgetConstants.LINE_START_ARROW] =
                convertToButtonLineEndStyle(pathParams[DiagramDesignerWidgetConstants.LINE_START_ARROW]);
            pathParams[DiagramDesignerWidgetConstants.LINE_END_ARROW] =
                convertToButtonLineEndStyle(pathParams[DiagramDesignerWidgetConstants.LINE_END_ARROW]);

        } else {
            //for pointer and pointer list we have to flip the line end visual styles
            temp = pathParams[DiagramDesignerWidgetConstants.LINE_START_ARROW];
            pathParams[DiagramDesignerWidgetConstants.LINE_START_ARROW] =
                pathParams[DiagramDesignerWidgetConstants.LINE_END_ARROW];
            pathParams[DiagramDesignerWidgetConstants.LINE_END_ARROW] = temp;

            if (connType === metaRelations.MIXIN) {
                pathParams[DiagramDesignerWidgetConstants.LINE_START_ARROW] =
                    convertToButtonLineEndStyle(pathParams[DiagramDesignerWidgetConstants.LINE_START_ARROW]);
            }
        }

        el.attr({style: 'height: ' + btnSize + 'px; margin-top: 2px; margin-bottom: 2px;'});

        path = paper.path('M' + (Math.round(btnSize / 2) + 0.5) + ',0, L' + (Math.round(btnSize / 2) + 0.5) + ',' +
            btnSize);

        path.attr({
            'arrow-start': pathParams[DiagramDesignerWidgetConstants.LINE_START_ARROW],
            'arrow-end': pathParams[DiagramDesignerWidgetConstants.LINE_END_ARROW],
            'stroke': pathParams[DiagramDesignerWidgetConstants.LINE_COLOR],
            'stroke-width': pathParams[DiagramDesignerWidgetConstants.LINE_WIDTH],
            'stroke-dasharray': pathParams[DiagramDesignerWidgetConstants.LINE_PATTERN]
        });

        return el;
    }

    return {
        META_RELATIONS: metaRelations,

        getLineVisualDescriptor: getLineVisualDescriptor,

        createButtonIcon: createButtonIcon,

        CONNECTION_META_INFO: connectionMetaInfo
    };
});
