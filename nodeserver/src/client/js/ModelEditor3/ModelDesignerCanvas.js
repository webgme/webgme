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
        var options = $.extend({}, opts);

        options.loggerName = options.loggerName || "ModelDesignerCanvas";

        __parent__.apply(this, [options]);

        this.logger.debug("ModelDesignerCanvas ctor");
    };

    _.extend(ModelDesignerCanvas.prototype, DesignerCanvas.prototype);

    ModelDesignerCanvas.prototype.initializeUI = function (containerElement) {
        __parent_proto__.initializeUI.apply(this, arguments);
        this.logger.debug("ModelDesignerCanvas.initializeUI");

        this._backGroundText();
    };

    ModelDesignerCanvas.prototype._resizeItemContainer =  function (width, height) {
        __parent_proto__._resizeItemContainer.apply(this, arguments);

        this._backGroundText();
    };

    ModelDesignerCanvas.prototype._backGroundText = function () {
        if (this._bgText) {
            this._bgText.attr({"x": this._actualSize.w / 2,
                               "y": this._actualSize.h / 2});
        } else {
            this._bgText = this.skinParts.SVGPaper.text(this._actualSize.w / 2, this._actualSize.h / 2, "ModelEditor");
            this._bgText.attr({"fill": "#DEDEDE"});
        }
    };

    return ModelDesignerCanvas;
});