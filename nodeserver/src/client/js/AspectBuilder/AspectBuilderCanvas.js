"use strict";

define(['logManager',
    'clientUtil',
    'js/DiagramDesigner/DesignerCanvas'], function (logManager,
                                                    clientUtil,
                                                    DesignerCanvas) {

    var AspectBuilderCanvas,
        __parent__ = DesignerCanvas,
        __parent_proto__ = DesignerCanvas.prototype;

    AspectBuilderCanvas = function (opts) {
        var options = $.extend({}, opts);

        options.loggerName = options.loggerName || "AspectBuilderCanvas";

        __parent__.apply(this, [options]);

        this.logger.debug("MetaDesignerCanvas ctor");
    };

    _.extend(AspectBuilderCanvas.prototype, DesignerCanvas.prototype);

    AspectBuilderCanvas.prototype.initializeUI = function (containerElement) {
        __parent_proto__.initializeUI.apply(this, arguments);
        this.logger.debug("AspectBuilderCanvas.initializeUI");

        this._num = 0;
        this._backGroundText();
    };

    AspectBuilderCanvas.prototype._resizeItemContainer =  function (width, height) {
        __parent_proto__._resizeItemContainer.apply(this, arguments);

        this._backGroundText();
    };

    AspectBuilderCanvas.prototype._backGroundText = function () {
        var text;

        if (this._num === 0) {
            text = "Your aspect is empty... Drag & drop objects from the tree...";
        } else {
            text = "Your aspect contains: " + this._num + " elements";
        }

        if (this._bgText) {
            this._bgText.attr({"x": this._actualSize.w / 2,
                "y": this._actualSize.h / 2,
                "text": text});
        } else {
            this._bgText = this.skinParts.SVGPaper.text(this._actualSize.w / 2, this._actualSize.h / 2, text);
            this._bgText.attr({"fill": "#DEDEDE",
                               "font-size": "55"});
        }
    };

    AspectBuilderCanvas.prototype.setAspectMemberNum = function (num) {
        if (this._num !== num) {
            this._num = num;
            this._backGroundText();
        }
    };

    return AspectBuilderCanvas;
});