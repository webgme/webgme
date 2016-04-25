/*globals define, _, $ */
/*jshint browser: true*/
/**
 * Helpers for making an element draggable in the sense of jquery-ui (https://jqueryui.com/droppable/).
 *
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['./DragEffects',
    './DragConstants'
], function (DragEffects, DragConstants) {

    'use strict';

    var DEFAULT_Z_INDEX = 100000,
        DEFAULT_APPEND_TO = $('body'),
        DEFAULT_CURSOR_AT = {left: 10, top: 10};


    function _makeDraggable(el, params) {
        el.draggable({
            zIndex: DEFAULT_Z_INDEX,
            appendTo: DEFAULT_APPEND_TO,
            cursorAt: params.cursorAt || DEFAULT_CURSOR_AT,
            helper: function (event) {
                var helperEl,
                    dragInfo = _createDragInfo(el, params, event);

                if (params && _.isFunction(params.helper)) {
                    helperEl = params.helper.call(el, event, dragInfo);
                } else {
                    helperEl = el.clone();
                }

                //prevent dragged helper to catch any pointer events
                helperEl.css({'pointer-events': 'none'});

                //add DRAG info
                helperEl.data(DragConstants.DRAG_INFO, dragInfo);

                return helperEl;
            },
            start: function (event, ui) {
                if (params && _.isFunction(params.start)) {
                    return params.start.call(el, event, ui);
                }
            },
            drag: function (event, ui) {
                if (params && _.isFunction(params.drag)) {
                    return params.drag.call(el, event, ui);
                }
            },
            stop: function (event /*, ui */) {
                if (params && _.isFunction(params.stop)) {
                    return params.stop.call(el, event);
                }
            }
        });
    }


    function _destroyDraggable(el) {
        if (_isDraggable(el)) {
            el.draggable('destroy');
        }
    }

    function _enableDraggable(el, enabled) {
        var enabledStr = enabled ? 'enable' : 'disable';

        if (_isDraggable(el)) {
            el.draggable(enabledStr);
        }
    }

    function _isDraggable(el) {
        return el.hasClass('ui-draggable');
    }

    function _createDragInfo(el, params, event) {
        var dragInfo = {};

        dragInfo[DragConstants.DRAG_ITEMS] = [];
        if (params && _.isFunction(params.dragItems)) {
            dragInfo[DragConstants.DRAG_ITEMS] = params.dragItems(el) || [];
        }

        dragInfo[DragConstants.DRAG_EFFECTS] = [];
        if (params && _.isFunction(params.dragEffects)) {
            dragInfo[DragConstants.DRAG_EFFECTS] = params.dragEffects(el, event) || [];
        }

        dragInfo[DragConstants.DRAG_PARAMS] = undefined;
        if (params && _.isFunction(params.dragParams)) {
            dragInfo[DragConstants.DRAG_PARAMS] = params.dragParams(el, event);
        }

        return dragInfo;
    }

    return {
        DRAG_EFFECTS: DragEffects,
        DEFAULT_CURSOR_AT: {
            left: DEFAULT_CURSOR_AT.left,
            top: DEFAULT_CURSOR_AT.top
        },
        makeDraggable: _makeDraggable,
        destroyDraggable: _destroyDraggable,
        enableDraggable: _enableDraggable
    };
});
