"use strict";

define(['js/DragDrop/DragHelper'], function (DragHelper) {

    var SnapEditorWidget;

    SnapEditorWidget = function (container, params) {
        params = params || {};
        params.loggerName = "SnapEditorWidget";

        this.logger.debug("SnapEditorWidget ctor");
    };


    SnapEditorWidget.prototype.getDragEffects = function (selectedElements, event) ; //TODO

    SnapEditorWidget.prototype._dragHelper = function (el, event, dragInfo) ; //TODO

    return SnapEditorWidget;
});
