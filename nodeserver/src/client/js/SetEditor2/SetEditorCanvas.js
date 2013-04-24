"use strict";

define(['logManager',
        'clientUtil',
        'js/DiagramDesigner/DesignerCanvas'], function (logManager,
                                                            clientUtil,
                                                            DesignerCanvas) {

    var SetEditorCanvas,
        __parent__ = DesignerCanvas,
        __parent_proto__ = DesignerCanvas.prototype;

    SetEditorCanvas = function (options) {
        options[DesignerCanvas.OPTIONS.LOGGER_INSTANCE_NAME] = options[DesignerCanvas.OPTIONS.LOGGER_INSTANCE_NAME] || "SetEditorCanvas";
        __parent__.apply(this, [options]);

        this.logger.debug("SetEditorCanvas ctor");
    };

    _.extend(SetEditorCanvas.prototype, DesignerCanvas.prototype);

    return SetEditorCanvas;
});
