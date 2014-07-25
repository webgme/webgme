/*globals define, _, requirejs, WebGMEGlobal*/

define(['./DragConstants',
        './DragEffects'], function (DragConstants, DragEffects) {

    "use strict";

    var _getParams = function (dragInfo, params, defaultValue) {
        var result = defaultValue;

        if (dragInfo && params) {
            if (dragInfo.hasOwnProperty(params)) {
                result = dragInfo[params];
            }
        }

        return result;
    };

    var _getDragItems = function (dragInfo) {
        return _getParams(dragInfo, DragConstants.DRAG_ITEMS, []);
    };

    var _getDragEffects = function (dragInfo) {
        return _getParams(dragInfo, DragConstants.DRAG_EFFECTS, []);
    };

    var _getDragParams = function (dragInfo) {
        return _getParams(dragInfo, DragConstants.DRAG_PARAMS, undefined);
    };


    return {getDragItems: _getDragItems,
            getDragEffects: _getDragEffects,
            getDragParams: _getDragParams,
            DRAG_EFFECTS: DragEffects};
});