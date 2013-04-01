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
        var options = $.extend({}, opts);

        options.loggerName = options.loggerName || "SetEditorCanvas";

        __parent__.apply(this, [options]);

        this.logger.debug("SetEditorCanvas ctor");
    };

    _.extend(SetEditorCanvas.prototype, DesignerCanvas.prototype);

    SetEditorCanvas.prototype.initializeUI = function (containerElement) {
        __parent_proto__.initializeUI.apply(this, arguments);
        this.logger.debug("SetEditorCanvas.initializeUI");

        this._setEditorBackGroundText();
    };

    SetEditorCanvas.prototype._resizeItemContainer =  function (width, height) {
        __parent_proto__._resizeItemContainer.apply(this, arguments);

        this._setEditorBackGroundText();
    };

    SetEditorCanvas.prototype._setEditorBackGroundText = function () {
        this.setBackgroundText("SetEditor", {"color": "#DEDEDE",
                                                "font-size": ""});
    };

    return SetEditorCanvas;
});
