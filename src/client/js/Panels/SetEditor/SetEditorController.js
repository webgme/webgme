/*globals define, _ */
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/Utils/GMEConcepts',
    'js/DragDrop/DragHelper',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    './../Crosscut/CrosscutConstants',
    'js/Panels/ControllerBase/DiagramDesignerWidgetMultiTabMemberListControllerBase'
], function (GMEConcepts,
             DragHelper,
             nodePropertyNames,
             REGISTRY_KEYS,
             ManualAspectConstants,
             DiagramDesignerWidgetMultiTabMemberListControllerBase) {

    'use strict';

    var SetEditorController,
        DRAG_PARAMS_MULTI_TAB_MEMBER_LIST_CONTAINER_ID = 'DRAG_PARAMS_MULTI_TAB_MEMBER_LIST_CONTAINER_ID';

    SetEditorController = function (options) {
        options = options || {};
        options.loggerName = 'gme:Panels:SetEditor:SetEditorController';

        // Set-editor should not render connections in a special way.
        options.disableConnectionRendering = true;

        DiagramDesignerWidgetMultiTabMemberListControllerBase.call(this, options);

        this.logger.debug('SetEditorController ctor finished');
    };

    _.extend(SetEditorController.prototype, DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype);

    SetEditorController.prototype.getOrderedMemberListInfo = function (/* memberListContainerObject */) {
        var result = [],
            memberListContainerID = this._memberListContainerID,
            setNames = GMEConcepts.getSets(memberListContainerID),
            nodeObj = this._client.getNode(memberListContainerID),
            validSetNames,
            len;

        if (nodeObj) {
            validSetNames = nodeObj.getValidSetNames();
        } else {
            validSetNames = [];
        }

        len = setNames.length;
        while (len--) {
            result.push({
                memberListID: setNames[len],
                title: setNames[len],
                enableDeleteTab: validSetNames.indexOf(setNames[len]) === -1,
                enableRenameTab: false
            });
        }

        result.sort(function (a, b) {
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
    SetEditorController.prototype._onBackgroundDroppableAccept = function (event, dragInfo) {
        var gmeIDList = DragHelper.getDragItems(dragInfo),
            accept = false,
            params;

        if (DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype.
            _onBackgroundDroppableAccept.call(this, event, dragInfo)) {
            // If based on the DiagramDesignerWidgetMultiTabMemberListControllerBase check it could be accepted
            // we need to check if it is a position move of a member and if not accept them based on the META rules
            params = DragHelper.getDragParams(dragInfo);

            if (params &&
                params.hasOwnProperty(DRAG_PARAMS_MULTI_TAB_MEMBER_LIST_CONTAINER_ID) &&
                params[DRAG_PARAMS_MULTI_TAB_MEMBER_LIST_CONTAINER_ID] === this._getDragParamsDataID()) {

                accept = true;
            } else {
                accept = GMEConcepts.canAddToSet(this._memberListContainerID, this._selectedMemberListID, gmeIDList);
            }
        }

        return accept;
    };
    /**********************************************************/
    /*  END OF --- HANDLE OBJECT DRAG & DROP ACCEPTANCE       */
    /**********************************************************/

    /*
     * Overwrite 'no tab' warning message to the user
     */
    SetEditorController.prototype.displayNoTabMessage = function () {
        var msg = 'The currently selected object does not contain any sets.';

        this._widget.setBackgroundText(msg);
    };

    return SetEditorController;
});
