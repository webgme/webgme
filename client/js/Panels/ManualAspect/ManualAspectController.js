"use strict";

define(['logManager',
    'js/RegistryKeys',
    './ManualAspectConstants',
    'js/Panels/ControllerBase/DiagramDesignerWidgetMultiTabMemberListControllerBase'], function (logManager,
                                             REGISTRY_KEYS,
                                               ManualAspectConstants,
                                               DiagramDesignerWidgetMultiTabMemberListControllerBase) {

    var ManualAspectController;

    ManualAspectController = function (options) {
        options = options || {};
        options.loggerName = "ManualAspectController";

        DiagramDesignerWidgetMultiTabMemberListControllerBase.call(this, options);

        this.logger.debug("ManualAspectController ctor finished");
    };

    _.extend(ManualAspectController.prototype, DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype);

    ManualAspectController.prototype.getOrderedMemberListInfo = function (memberListContainerObject) {
        var result = [],
            manualAspectsRegistry = memberListContainerObject.getRegistry(REGISTRY_KEYS.MANUAL_ASPECTS) || [],
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


    ManualAspectController.prototype.getMemberListSetsRegistryKey = function () {
        return REGISTRY_KEYS.MANUAL_ASPECTS;
    };


    ManualAspectController.prototype.getNewSetNamePrefixDesc = function () {
        return {'SetID': ManualAspectConstants.MANUAL_ASPECT_NAME_PREFIX,
            'Title': 'Aspect '};
    };

    /*
     * Overwrite 'no tab' warning message to the user
     */
    ManualAspectController.prototype.displayNoTabMessage = function () {
        this._widget.setBackgroundText('No custom aspects defined yet. Press the + button in the top-left corner to create one...');
    };


    return ManualAspectController;
});
