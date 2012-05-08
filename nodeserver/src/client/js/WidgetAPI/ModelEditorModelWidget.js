"use strict";

define(['./../../../common/LogManager.js',
    './../../../common/EventDispatcher.js',
    './../util.js',
    './WidgetBase.js'], function (logManager,
                                   EventDispatcher,
                                   util,
                                   WidgetBase) {

    //load its own CSS file (css/ModelEditorSVGWidget.css)
    util.loadCSS('css/ModelEditorModelWidget.css');

    var ModelEditorModelWidget = function () {
        var logger,
            originalRenderUI,
            self = this;

        $.extend(this, new WidgetBase());

        //get logger instance for this component
        logger = logManager.create("ModelEditorModelWidget");

        originalRenderUI = this.renderUI;
        this.renderUI = function () {
            //for now the original renderUI works just fine, but need to modify the style
            originalRenderUI.call(self);

            $(self.el).addClass("model");
            $(self.skinParts.title).addClass("modelTitle");
        };
    };

    return ModelEditorModelWidget;
});