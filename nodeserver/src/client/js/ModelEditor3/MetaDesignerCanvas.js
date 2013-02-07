"use strict";

define(['logManager',
        'clientUtil',
        'js/DiagramDesigner/DesignerCanvas'], function (logManager,
                                                            clientUtil,
                                                            DesignerCanvas) {

    var MetaDesignerCanvas,
        __parent__ = DesignerCanvas,
        __parent_proto__ = DesignerCanvas.prototype;

    MetaDesignerCanvas = function (opts) {
        var options = {};

        if (typeof opts === "string") {
            options.containerElement = opts;
        }
        options.loggerName = options.loggerName || "MetaDesignerCanvas";

        __parent__.apply(this, [options]);

        this.logger.debug("MetaDesignerCanvas ctor");
    };

    _.extend(MetaDesignerCanvas.prototype, DesignerCanvas.prototype);

    MetaDesignerCanvas.prototype.initializeUI = function () {
        __parent_proto__.initializeUI.apply(this, arguments);
        this.logger.debug("MetaDesignerCanvas.initializeUI");

        this.skinParts.SVGPaper.text(this._actualSize.w / 2, this._actualSize.h / 2, "MetaDesignerCanvas");

        //META SPECIFIC parts
    };

    return MetaDesignerCanvas;
});
