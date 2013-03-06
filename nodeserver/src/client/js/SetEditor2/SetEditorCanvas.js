"use strict";

define(['logManager',
        'clientUtil',
        'js/DiagramDesigner/DesignerCanvas'], function (logManager,
                                                            clientUtil,
                                                            DesignerCanvas) {

    var SetEditorCanvas,
        __parent__ = DesignerCanvas,
        __parent_proto__ = DesignerCanvas.prototype;

    SetEditorCanvas = function (opts) {
        var options = {};

        if (typeof opts === "string") {
            options.containerElement = opts;
        }
        options.loggerName = options.loggerName || "SetEditorCanvas";

        __parent__.apply(this, [options]);

        this.logger.debug("SetEditorCanvas ctor");
    };

    _.extend(SetEditorCanvas.prototype, DesignerCanvas.prototype);

    SetEditorCanvas.prototype.initializeUI = function () {
        __parent_proto__.initializeUI.apply(this, arguments);
        this.logger.debug("SetEditorCanvas.initializeUI");

        var text = this.skinParts.SVGPaper.text(this._actualSize.w / 2, this._actualSize.h / 2, "SetEditor");
        text.attr({"fill": "#DEDEDE"});
    };

    return SetEditorCanvas;
});
