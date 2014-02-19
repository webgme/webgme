"use strict";

define(['js/Utils/GMEConcepts',
    'js/DragDrop/DragHelper',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    './../ManualAspect/ManualAspectConstants',
    'js/Panels/ControllerBase/DiagramDesignerWidgetMultiTabMemberListControllerBase'], function (
                                               GMEConcepts,
                                               DragHelper,
                                               nodePropertyNames,
                                               REGISTRY_KEYS,
                                               ManualAspectConstants,
                                               DiagramDesignerWidgetMultiTabMemberListControllerBase) {

    var PointerListEditorController;

    PointerListEditorController = function (options) {
        options = options || {};
        options.loggerName = "PointerListEditorController";

        DiagramDesignerWidgetMultiTabMemberListControllerBase.call(this, options);

        this.logger.debug("PointerListEditorController ctor finished");
    };

    _.extend(PointerListEditorController.prototype, DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype);

    PointerListEditorController.prototype.getOrderedMemberListInfo = function (memberListContainerObject) {
        var result = [],
            setNames = memberListContainerObject.getSetNames() || [],
            manualAspectsRegistry = memberListContainerObject.getRegistry(REGISTRY_KEYS.MANUAL_ASPECTS) || [],
            manualAspectSetNames = [],
            len;

        //filter out ManualAspects from the list
        _.each(manualAspectsRegistry, function (element/*, index, list*/) {
            manualAspectSetNames.push(element.SetID);
        });

        setNames = _.difference(setNames, manualAspectSetNames);

        len = setNames.length;
        while (len--) {
            result.push({'memberListID': setNames[len],
                'title': setNames[len],
                'enableDeleteTab': false,
                'enableRenameTab': false});
        }

        result.sort(function (a,b) {
            if (a.title.toLowerCase() < b.title.toLowerCase()) {
                return -1;
            } else {
                return 1;
            }
        });

        return result;
    };


    /**********************************************************/
    /*         HANDLE OBJECT DRAG & DROP ACCEPTANCE           */
    /**********************************************************/
    PointerListEditorController.prototype._onBackgroundDroppableAccept = function(event, dragInfo) {
        var gmeIDList = DragHelper.getDragItems(dragInfo),
            accept = DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onBackgroundDroppableAccept.call(this, event, dragInfo);

        if (accept === true) {
            //if based on the DiagramDesignerWidgetMultiTabMemberListControllerBase check it could be accepted, ie items are not members of the set so far
            //we need to see if we can accept them based on the META rules
            accept = GMEConcepts.canAddToPointerList(this._memberListContainerID, this._selectedMemberListID, gmeIDList);
        }

        return accept;
    };
    /**********************************************************/
    /*  END OF --- HANDLE OBJECT DRAG & DROP ACCEPTANCE       */
    /**********************************************************/

    /*
     * Overwrite 'no tab' warning message to the user
     */
    PointerListEditorController.prototype.displayNoTabMessage = function () {
        var msg = 'The currently selected object does not contain any pointer lists.';

        this._widget.setBackgroundText(msg);
    };

    return PointerListEditorController;
});
