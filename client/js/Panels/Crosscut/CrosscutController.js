"use strict";

define(['logManager',
    'js/RegistryKeys',
    'js/Constants',
    './CrosscutConstants',
    'js/DragDrop/DragHelper',
    'js/Utils/GMEConcepts',
    'js/Panels/ControllerBase/DiagramDesignerWidgetMultiTabMemberListControllerBase'], function (logManager,
                                             REGISTRY_KEYS,
                                             CONSTANTS,
                                               CrosscutConstants,
                                               DragHelper,
                                               GMEConcepts,
                                               DiagramDesignerWidgetMultiTabMemberListControllerBase) {

    var CrosscutController;

    CrosscutController = function (options) {
        options = options || {};
        options.loggerName = "CrosscutController";

        DiagramDesignerWidgetMultiTabMemberListControllerBase.call(this, options);

        this.logger.debug("CrosscutController ctor finished");
    };

    _.extend(CrosscutController.prototype, DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype);

    //enable every node
    CrosscutController.prototype._validateNodeId = function (nodeId) {
        return nodeId;
    };

    CrosscutController.prototype._updateSelectedMemberListMembersTerritoryPatterns = function () {
        var currentlyDisplayedMembers = (this._selectedMemberListMembers || []).slice(0),
            actualMembers = (this._memberListMembers[this._selectedMemberListID] || []).slice(0),
            diff,
            len,
            territoryChanged = false,
            territoryId = this._selectedMemberListMembersTerritoryId,
            territoryPatterns = this._selectedMemberListMembersTerritoryPatterns,
            client = this._client,
            desc,
            obj;

        //let's see who has been deleted
        diff = _.difference(currentlyDisplayedMembers, actualMembers);
        len = diff.length;
        while (len--) {
            delete territoryPatterns[diff[len]];
            territoryChanged = true;
        }

        //let's see who has been added
        diff = _.difference(actualMembers, currentlyDisplayedMembers);
        len = diff.length;
        while (len--) {
            territoryPatterns[diff[len]] = { "children": 0 };
            territoryChanged = true;
        }

        //let's update the one that has not been changed but their position might have
        diff = _.intersection(actualMembers, currentlyDisplayedMembers);
        len = diff.length;
        this._widget.beginUpdate();
        while (len--) {
            this._onUpdate(diff[len]);
        }
        this._widget.endUpdate();

        //save current list of members
        this._selectedMemberListMembers = actualMembers;

        if (territoryChanged) {
            setTimeout( function () {
                client.updateTerritory(territoryId, territoryPatterns);
            }, 10);
        }
    };

    CrosscutController.prototype.getOrderedMemberListInfo = function (memberListContainerObject) {
        var result = [],
            crosscutsRegistry = memberListContainerObject.getRegistry(REGISTRY_KEYS.CROSSCUTS) || [],
            len = crosscutsRegistry.length;

        while (len--) {
            result.push({'memberListID': crosscutsRegistry[len].SetID,
                'title': crosscutsRegistry[len].title,
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


    CrosscutController.prototype.getMemberListSetsRegistryKey = function () {
        return REGISTRY_KEYS.CROSSCUTS;
    };


    CrosscutController.prototype.getNewSetNamePrefixDesc = function () {
        return {'SetID': CrosscutConstants.CROSSCUT_NAME_PREFIX,
            'Title': 'Crosscut '};
    };

    /*
     * Overwrite 'no tab' warning message to the user
     */
    CrosscutController.prototype.displayNoTabMessage = function () {
        this._widget.setBackgroundText('No crosscuts defined yet. Press the + button in the top-left corner to create one...');
    };


    /**********************************************************/
    /*         HANDLE OBJECT DRAG & DROP ACCEPTANCE           */
    /**********************************************************/
    CrosscutController.prototype._onBackgroundDroppableAccept = function(event, dragInfo) {
        var gmeIDList = DragHelper.getDragItems(dragInfo),
            accept = DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onBackgroundDroppableAccept.call(this, event, dragInfo);

        if (accept === true) {
            //if based on the DiagramDesignerWidgetMultiTabMemberListControllerBase check it could be accepted, ie items are not members of the set so far
            //we need to see if we can accept them based on the META rules
            accept = GMEConcepts.isValidChildrenTypeInCrossCut(this._memberListContainerID, gmeIDList);
        }

        return accept;
    };
    /**********************************************************/
    /*  END OF --- HANDLE OBJECT DRAG & DROP ACCEPTANCE       */
    /**********************************************************/


    return CrosscutController;
});
