/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

/*
 * Utility helper functions implementing GME concepts...
 */

define(['jquery',
        'logManager',
        'js/Constants',
        'js/NodePropertyNames',
        'js/Utils/METAAspectHelper',
        'js/Panels/MetaEditor/MetaEditorConstants',
        'js/Utils/DisplayFormat'], function (_jquery,
                                           logManager,
                                           CONSTANTS,
                                           nodePropertyNames,
                                           METAAspectHelper,
                                           MetaEditorConstants,
                                           displayFormat) {

    var _client,
        _logger = logManager.create('GMEVisualConcepts'),
        DEFAULT_LINE_STYLE = {};

    DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.WIDTH] = 1;
    DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.COLOR] = "#000000";
    DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.PATTERN] = CONSTANTS.LINE_STYLE.PATTERNS.SOLID;
    DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.TYPE] = CONSTANTS.LINE_STYLE.TYPES.NONE;
    DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.START_ARROW] = CONSTANTS.LINE_STYLE.LINE_ARROWS.NONE;
    DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.END_ARROW] = CONSTANTS.LINE_STYLE.LINE_ARROWS.NONE;
    DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.POINTS] = [];

    var _initialize = function (client) {
        if (!_client) {
            _client = client;
        }
    };

    var _getConnectionVisualProperties = function (objID) {
        var obj = _client.getNode(objID),
            result = {},
            regLineStyle,
            getValue;

        getValue = function (srcObj, key, dstObj, type) {
            if (srcObj) {
                if (srcObj[key]) {
                    switch(type) {
                        case 'int':
                            try {
                                dstObj[key] = parseInt(srcObj[key], 10);
                            } catch (e) {

                            }
                            break;
                        case 'array':
                            try {
                                if (!_.isArray(srcObj[key])) {
                                    dstObj[key] = JSON.parse(srcObj[key]);
                                } else {
                                    dstObj[key] = srcObj[key].slice(0);
                                }

                                if (!_.isArray(dstObj[key])) {
                                    delete dstObj[key];
                                }
                            } catch (e) {

                            }
                            break;
                        default:
                            dstObj[key] = srcObj[key];
                    }
                }
            }
        };

        if (obj) {
            _.extend(result, DEFAULT_LINE_STYLE);
            result.name = displayFormat.resolve(obj);

            regLineStyle =  obj.getRegistry(nodePropertyNames.Registry.lineStyle);

            getValue(regLineStyle, CONSTANTS.LINE_STYLE.WIDTH, result, 'int');
            getValue(regLineStyle, CONSTANTS.LINE_STYLE.COLOR, result);
            getValue(regLineStyle, CONSTANTS.LINE_STYLE.PATTERN, result);
            getValue(regLineStyle, CONSTANTS.LINE_STYLE.TYPE, result);
            getValue(regLineStyle, CONSTANTS.LINE_STYLE.START_ARROW, result);
            getValue(regLineStyle, CONSTANTS.LINE_STYLE.END_ARROW, result);
            getValue(regLineStyle, CONSTANTS.LINE_STYLE.POINTS, result, 'array');
        }

        return result;
    };

    //return utility functions
    return {
        initialize: _initialize,
        getConnectionVisualProperties: _getConnectionVisualProperties
    }
});