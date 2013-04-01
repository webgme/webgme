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

        this._modelDesignerBackGroundText();
    };

    ModelDesignerCanvas.prototype._resizeItemContainer =  function (width, height) {
        __parent_proto__._resizeItemContainer.apply(this, arguments);

        this._modelDesignerBackGroundText();
    };

    ModelDesignerCanvas.prototype._modelDesignerBackGroundText = function () {
        this.setBackgroundText("ModelEditor", {"color": "#DEDEDE",
                                                "font-size": ""});
    };

    return ModelDesignerCanvas;
});