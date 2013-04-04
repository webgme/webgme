"use strict";

define(['clientUtil',
    'js/DataGrid/DataGridView'], function (clientUtil,
                                                    DataGridView) {

    var HierarchyGridViewCanvas,
        __parent__ = DataGridView,
        __parent_proto__ = DataGridView.prototype;

    HierarchyGridViewCanvas = function (options) {
        options[DataGridView.OPTIONS.LOGGER_INSTANCE_NAME] = options[DataGridView.OPTIONS.LOGGER_INSTANCE_NAME] || "HierarchyGridViewCanvas";
        __parent__.apply(this, [options]);

        this.logger.debug("HierarchyGridViewCanvas ctor");
    };

    _.extend(HierarchyGridViewCanvas.prototype, DataGridView.prototype);

    return HierarchyGridViewCanvas;
});