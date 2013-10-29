/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */


"use strict";

define(['./DragEffects',
        './DragConstants'], function (DragEffects, DragConstants) {

    var DEFAULT_Z_INDEX = 100000,
        DEFAULT_APPEND_TO = $('body'),
        DEFAULT_CURSOR_AT = { left: 10, top: 10 };


    var _makeDraggable = function (el, params) {
        el.draggable({
            zIndex: DEFAULT_Z_INDEX,
            appendTo: DEFAULT_APPEND_TO,
            cursorAt: DEFAULT_CURSOR_AT,
            helper: function (event) {
                var helperEl;

                if (params && _.isFunction(params.helper)) {
                    helperEl = params.helper.call(el, event);
                } else {
                    helperEl = el.clone();
                }

                //prevent dragged helper to catch any pointer events
                helperEl.css({'pointer-events':'none'});

                //add DRAG info
                helperEl.data(DragConstants.DRAG_INFO, _createDragInfo(el, params));

                return helperEl;
            }
        });
    };


    var _destroyDraggable = function (el) {
        if (_isDraggable(el)) {
            el.draggable("destroy");
        }
    };

    var _enableDraggable = function (el, enabled) {
        var enabledStr = enabled ? 'enable' : 'disable';

        if (_isDraggable(el)) {
            el.draggable(enabledStr);
        }
    };

    var _isDraggable = function (el) {
        return el.hasClass('ui-draggable');
    };

    var _createDragInfo = function (el, params) {
        var dragInfo = {};

        dragInfo[DragConstants.DRAG_ITEMS] = [];
        if (params && _.isFunction(params.dragItems)) {
            dragInfo[DragConstants.DRAG_ITEMS] = params.dragItems(el) || [];
        }

        dragInfo[DragConstants.DRAG_EFFECTS] = [];
        if (params && _.isFunction(params.dragEffects)) {
            dragInfo[DragConstants.DRAG_EFFECTS] = params.dragEffects(el) || [];
        }

        dragInfo[DragConstants.DRAG_PARAMS] = undefined;
        if (params && _.isFunction(params.dragParams)) {
            dragInfo[DragConstants.DRAG_PARAMS] = params.dragParams(el);
        }

        return dragInfo;
    };

    return {
        DRAG_EFFECTS: DragEffects,
        makeDraggable: _makeDraggable,
        destroyDraggable: _destroyDraggable,
        enableDraggable: _enableDraggable
    };
});