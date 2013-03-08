"use strict";

define(['logManager',
    'clientUtil',
    'js/DataGrid/DataGridView'], function (logManager,
                                                    clientUtil,
                                                    DataGridView) {

    var HierarchyGridViewCanvas,
        __parent__ = DataGridView,
        __parent_proto__ = DataGridView.prototype;

    HierarchyGridViewCanvas = function (opts) {
        var options = $.extend({}, opts);

        options.loggerName = options.loggerName || "HierarchyGridViewCanvas";

        __parent__.apply(this, [options]);

        this.logger.debug("HierarchyGridViewCanvas ctor");
    };

    _.extend(HierarchyGridViewCanvas.prototype, DataGridView.prototype);

    HierarchyGridViewCanvas.prototype.initializeUI = function (containerElement) {
        __parent_proto__.initializeUI.apply(this, arguments);
        this.logger.debug("HierarchyGridViewCanvas.initializeUI");
    };

    return HierarchyGridViewCanvas;
});