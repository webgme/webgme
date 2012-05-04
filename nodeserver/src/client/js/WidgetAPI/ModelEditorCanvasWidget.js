"use strict";

define(['./../../../common/LogManager.js', './../../../common/EventDispatcher.js', './../util.js', './WidgetBase.js'], function (logManager, EventDispatcher, util, WidgetBase) {

    var ModelEditorCanvasWidget = function () {
        var logger;

        $.extend(this, new WidgetBase());

        //get logger instance for this component
        logger = logManager.create("ModelEditorCanvasWidget");
    };

    return ModelEditorCanvasWidget;
});