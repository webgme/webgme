/*globals define, _, requirejs, WebGMEGlobal*/

define(['./DragEffects',
    './DragConstants'], function (DragEffects, DragConstants) {

    "use strict";

    var _makeDroppable = function (el, params) {
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
            tolerance: "pointer",
            over: function( event, ui ) {
                doCallBack('over', event, ui);
            },
            out: function( event, ui ) {
                doCallBack('out', event, ui);
            },
            drop: function (event, ui) {
                doCallBack('drop', event, ui);
            },
            activate: function(event, ui) {
                doCallBack('activate', event, ui);
            },
            deactivate: function(event, ui) {
                doCallBack('deactivate', event, ui);
            }
        });
    };


    var _destroyDroppable = function (el) {
        if (_isDroppable(el)) {
            el.droppable("destroy");
        }
    };


    var _enableDroppable = function (el, enabled) {
        var enabledStr = enabled ? 'enable' : 'disable';

        if (_isDroppable(el)) {
            el.droppable(enabledStr);
        }
    };


    var _isDroppable = function (el) {
        return el.hasClass('ui-droppable');
    };


    return {makeDroppable: _makeDroppable,
            destroyDroppable: _destroyDroppable,
            enableDroppable: _enableDroppable};
});