"use strict";

define(['logManager',
        'clientUtil',
        'js/ModelEditor3/DesignerControl'], function (logManager,
                                                    clientUtil,
                                                    DesignerControl) {

    var ModelDesignerControl,
        __parent__ = DesignerControl,
        __parent_proto__ = DesignerControl.prototype;

    ModelDesignerControl = function (options) {
        options.loggerName = options.loggerName || "ModelDesignerControl";

        __parent__.apply(this, [options]);

        this.logger.debug("ModelDesignerControl ctor");
    };

    _.extend(ModelDesignerControl.prototype, __parent_proto__);

    return ModelDesignerControl;
});