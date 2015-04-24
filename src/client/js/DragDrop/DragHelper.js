/*globals define */
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['./DragConstants',
    './DragEffects'
], function (DragConstants, DragEffects) {

    'use strict';

    function getParams(dragInfo, params, defaultValue) {
        var result = defaultValue;

        if (dragInfo && params) {
            if (dragInfo.hasOwnProperty(params)) {
                result = dragInfo[params];
            }
        }

        return result;
    }

    function getDragItems(dragInfo) {
        return getParams(dragInfo, DragConstants.DRAG_ITEMS, []);
    }

    function getDragEffects(dragInfo) {
        return getParams(dragInfo, DragConstants.DRAG_EFFECTS, []);
    }

    function getDragParams(dragInfo) {
        return getParams(dragInfo, DragConstants.DRAG_PARAMS, undefined);
    }


    return {
        getDragItems: getDragItems,
        getDragEffects: getDragEffects,
        getDragParams: getDragParams,
        DRAG_EFFECTS: DragEffects
    };
});