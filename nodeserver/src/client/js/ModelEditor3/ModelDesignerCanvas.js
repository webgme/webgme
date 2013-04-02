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

    return ModelDesignerCanvas;
});