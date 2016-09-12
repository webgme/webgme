/*globals define, _*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'jquery',
    'js/Constants',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    'js/Panels/MetaEditor/MetaEditorConstants',
    'js/Utils/DisplayFormat'
], function (_jquery,
             CONSTANTS,
             nodePropertyNames,
             REGISTRY_KEYS,
             MetaEditorConstants,
             displayFormat) {

    'use strict';

    var _client,
        DEFAULT_LINE_STYLE = {};

    DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.WIDTH] = 1;
    DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.COLOR] = '#000000';
    DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.PATTERN] = CONSTANTS.LINE_STYLE.PATTERNS.SOLID;
    DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.TYPE] = CONSTANTS.LINE_STYLE.TYPES.NONE;
    DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.START_ARROW] = CONSTANTS.LINE_STYLE.LINE_ARROWS.NONE;
    DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.END_ARROW] = CONSTANTS.LINE_STYLE.LINE_ARROWS.NONE;
    DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.CUSTOM_POINTS] = [];

    var _initialize = function (client) {
        if (!_client) {
            _client = client;
        }
    };

    var _getConnectionVisualProperties = function (objID) {
        var obj = _client.getNode(objID),
            result = {},
            getValue,
            val;

        getValue = function (srcObj, regKey, type) {
            var result,
                regValue;

            if (srcObj) {
                regValue = srcObj.getRegistry(regKey);
                if (regValue) {
                    switch (type) {
                        case 'int':
                            try {
                                result = parseInt(regValue, 10);
                            } catch (e) {
                                result = undefined;
                            }
                            break;
                        case 'array':
                            try {
                                if (!_.isArray(regValue)) {
                                    result = JSON.parse(regValue);
                                } else {
                                    result = regValue.slice(0);
                                }

                                if (!_.isArray(result)) {
                                    result = undefined;
                                }
                            } catch (e) {
                                result = undefined;
                            }
                            break;
                        default:
                            result = regValue;
                    }
                }
            }

            return result;
        };

        if (obj) {
            _.extend(result, DEFAULT_LINE_STYLE);

            val = getValue(obj, REGISTRY_KEYS.LINE_LABEL_PLACEMENT);

            switch (val) {
                case 'src':
                    result.srcText = displayFormat.resolve(obj);
                    break;
                case 'dst':
                    result.dstText = displayFormat.resolve(obj);
                    break;
                default:
                    result.name = displayFormat.resolve(obj);
            }

            //line width
            val = getValue(obj, REGISTRY_KEYS.LINE_WIDTH, 'int');
            if (val) {
                result[CONSTANTS.LINE_STYLE.WIDTH] = val;
            }

            //color
            val = getValue(obj, REGISTRY_KEYS.COLOR);
            if (val && val !== '') {
                result[CONSTANTS.LINE_STYLE.COLOR] = val;
            }

            //pattern
            val = getValue(obj, REGISTRY_KEYS.LINE_STYLE);
            if (val !== undefined && val !== null) {
                result[CONSTANTS.LINE_STYLE.PATTERN] = val;
            }

            //line type
            val = getValue(obj, REGISTRY_KEYS.LINE_TYPE);
            if (val !== undefined && val !== null) {
                result[CONSTANTS.LINE_STYLE.TYPE] = val;
            }

            //start arrow
            val = getValue(obj, REGISTRY_KEYS.LINE_START_ARROW);
            if (val) {
                result[CONSTANTS.LINE_STYLE.START_ARROW] = val;
            }

            //end arrow
            val = getValue(obj, REGISTRY_KEYS.LINE_END_ARROW);
            if (val) {
                result[CONSTANTS.LINE_STYLE.END_ARROW] = val;
            }
        }

        return result;
    };

    //return utility functions
    return {
        initialize: _initialize,
        getConnectionVisualProperties: _getConnectionVisualProperties
    };
});