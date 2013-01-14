"use strict";

define(['logManager',
    'clientUtil',
    'js/DiagramDesigner/DesignerControl'], function (logManager,
                                                     clientUtil,
                                                     DesignerControl) {

    var MetaDesignerControl,
        __parent__ = DesignerControl,
        __parent_proto__ = DesignerControl.prototype;

    MetaDesignerControl = function (options) {
        var self = this;

        options.loggerName = options.loggerName || "MetaDesignerControl";

        __parent__.apply(this, [options]);

        this.designerCanvas.onSelectionDelete = function (idList) {
            self.logger.warning("MetaDesignerControl.onSelectionDelete NOT YET IMPLEMENTED: " + idList);
        };

        this.logger.debug("MetaDesignerControl ctor");
    };

    _.extend(MetaDesignerControl.prototype, __parent_proto__);

    return MetaDesignerControl;
});