/*globals define, _, requirejs, WebGMEGlobal*/

define(['js/Constants',
    'js/NodePropertyNames',
    'js/RegistryKeys'], function (CONSTANTS,
                                       nodePropertyNames,
                                       REGISTRY_KEYS) {

    "use strict";

    var ATTRIBUTE_MARKER = CONSTANTS.DISPLAY_FORMAT_ATTRIBUTE_MARKER;

    var displayFormatKey = REGISTRY_KEYS.DISPLAY_FORMAT;

    var _resolve = function (obj) {
        var result = "",
            displayFormat,
            regAttr = new RegExp((ATTRIBUTE_MARKER + '\\w+').replace('$', '\\$'), "g"),
            attrKeyValues = {},
            m,
            key,
            re;

        if (obj) {
            displayFormat = obj.getRegistry(displayFormatKey);

            //get all the attribute keys
            do {
                m = regAttr.exec(displayFormat);
                if (m) {
                    attrKeyValues[m[0]] = undefined;
                }
            } while (m);

            result = displayFormat;

            for(key in attrKeyValues) {
                if (attrKeyValues.hasOwnProperty(key)) {
                    re = new RegExp(key.replace('$', '\\$'), "g");
                    attrKeyValues[key] = obj.getAttribute(key.replace(ATTRIBUTE_MARKER, ""));

                    if (attrKeyValues[key] !== undefined && attrKeyValues[key] !== null) {
                        result = result.replace(re, attrKeyValues[key]);
                    }
                }
            }
        }

        return result;
    };

    return { resolve: _resolve };
});