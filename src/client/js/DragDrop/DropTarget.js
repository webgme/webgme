/*globals define, _ */
/*jshint browser: true*/
/**
 * Helpers for making an element a drop-target in the sense of jquery-ui (https://jqueryui.com/droppable/).
 * If the dragged/dropped element was made draggable via DragSource the dispatched events will contain gme-
 * specific dragInfo regarding the node.
 *
 * N.B. Other UI pieces with the jquery-ui class 'ui-draggable' defined will also trigger events. These are not
 * filtered here - but will contain no dragInfo (it will be undefined).
 *
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['./DragEffects', './DragConstants'], function (DragEffects, DragConstants) {

    'use strict';

    function _makeDroppable(el, params) {
        var doCallBack;

        doCallBack = function (fn, event, ui) {
            var helper = ui.helper,
                dragInfo;

            if (helper) {
                dragInfo = helper.data(DragConstants.DRAG_INFO);
            }

            if (params && _.isFunction(params[fn])) {
                params[fn].call(el, event, dragInfo);
            }
        };

        el.droppable({
            tolerance: 'pointer',
            over: function (event, ui) {
                doCallBack('over', event, ui);
            },
            out: function (event, ui) {
                doCallBack('out', event, ui);
            },
            drop: function (event, ui) {
                doCallBack('drop', event, ui);
            },
            activate: function (event, ui) {
                doCallBack('activate', event, ui);
            },
            deactivate: function (event, ui) {
                doCallBack('deactivate', event, ui);
            }
        });
    }


    function _destroyDroppable(el) {
        if (_isDroppable(el)) {
            el.droppable('destroy');
        }
    }


    function _enableDroppable(el, enabled) {
        var enabledStr = enabled ? 'enable' : 'disable';

        if (_isDroppable(el)) {
            el.droppable(enabledStr);
        }
    }


    function _isDroppable(el) {
        return el.hasClass('ui-droppable');
    }


    return {
        makeDroppable: _makeDroppable,
        destroyDroppable: _destroyDroppable,
        enableDroppable: _enableDroppable
    };
});