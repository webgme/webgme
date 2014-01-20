"use strict";

define(['logManager',
    './ManualAspectConstants',
    './ManualAspectControl.DiagramDesignerWidgetEventHandlers',
    'js/Panels/ControllerBase/DiagramDesignerWidgetMultiTabMemberListControllerBase'], function (logManager,
                                               ManualAspectConstants,
                                               ManualAspectControlDiagramDesignerWidgetEventHandlers,
                                               DiagramDesignerWidgetMultiTabMemberListControllerBase) {

    var ManualAspectController;

    ManualAspectController = function (options) {
        options = options || {};
        options.loggerName = "ManualAspectController";

        DiagramDesignerWidgetMultiTabMemberListControllerBase.call(this, options);

        this.attachDiagramDesignerWidgetEventHandlers();

        this.logger.debug("ManualAspectController ctor finished");
    };

    _.extend(ManualAspectController.prototype, DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype);
    _.extend(ManualAspectController.prototype, ManualAspectControlDiagramDesignerWidgetEventHandlers.prototype);

    ManualAspectController.prototype.getOrderedMemberListInfo = function (memberListContainerObject) {
        var result = [],
            manualAspectsRegistry = memberListContainerObject.getRegistry(ManualAspectConstants.MANUAL_ASPECTS_REGISTRY_KEY) || [],
            len = manualAspectsRegistry.length;

        while (len--) {
            result.push({'memberListID': manualAspectsRegistry[len].SetID,
                'title': manualAspectsRegistry[len].title,
                'enableDeleteTab': true,
                'enableRenameTab': true});
        }

        result.sort(function (a,b) {
            if (a.order < b.order) {
                return -1;
            } else {
                return 1;
            }
        });

        return result;
    };

    ManualAspectController.prototype.getMemberListMemberPositionsRegistryKey = function () {
        return ManualAspectConstants.MANUAL_ASPECT_MEMBER_POSITION_REGISTRY_KEY;
    };

    ManualAspectController.prototype.getMemberListSetsRegistryKey = function () {
        return ManualAspectConstants.MANUAL_ASPECTS_REGISTRY_KEY;
    };


    return ManualAspectController;
});
