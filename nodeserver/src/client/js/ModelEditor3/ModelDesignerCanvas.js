"use strict";

define(['logManager',
    'clientUtil',
    'js/DiagramDesigner/DesignerCanvas'], function (logManager,
                                                    clientUtil,
                                                    DesignerCanvas) {

    var ModelDesignerCanvas,
        __parent__ = DesignerCanvas,
        __parent_proto__ = DesignerCanvas.prototype;

    ModelDesignerCanvas = function (opts) {
        var options = {};

        if (typeof opts === "string") {
            options.containerElement = opts;
        }
        options.loggerName = options.loggerName || "ModelDesignerCanvas";

        __parent__.apply(this, [options]);

        this.logger.debug("MetaDesignerCanvas ctor");
    };

    _.extend(ModelDesignerCanvas.prototype, DesignerCanvas.prototype);

    ModelDesignerCanvas.prototype.initializeUI = function (containerElement) {
        __parent_proto__.initializeUI.apply(this, arguments);
        this.logger.debug("ModelDesignerCanvas.initializeUI");

        var text = this.skinParts.SVGPaper.text(this._actualSize.w / 2, this._actualSize.h / 2, "ModelEditor");
        text.attr({"fill": "#DEDEDE"});
    };

    return ModelDesignerCanvas;
});