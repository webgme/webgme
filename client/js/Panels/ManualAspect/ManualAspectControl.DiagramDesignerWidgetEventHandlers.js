"use strict";

define(['util/guid',
        './ManualAspectConstants'], function (generateGuid,
                                              ManualAspectConstants) {

    var MetaEditorControlDiagramDesignerWidgetEventHandlers;

    MetaEditorControlDiagramDesignerWidgetEventHandlers = function () {
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype.attachDiagramDesignerWidgetEventHandlers = function () {
        var self = this;

        /*OVERRIDE DESIGNER CANVAS METHODS*/
        this._widget.onTabAddClicked = function () {
            self._onTabAddClicked();
        };

        this._widget.onTabTitleChanged = function (tabID, oldValue, newValue) {
            self._onTabTitleChanged(tabID, oldValue, newValue);
        };

        this._widget.onTabDeleteClicked = function (tabID) {
            self._onTabDeleteClicked(tabID);
        };

        this._widget.onTabsSorted = function (newTabIDOrder) {
            self._onTabsSorted(newTabIDOrder);
        };

        this.logger.debug("attachDesignerCanvasEventHandlers finished");
    };

    //adding new meta aspect sheet
    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onTabAddClicked = function () {
        var manualAspectContainerID = this._memberListContainerID,
            manualAspectContainer,
            manualAspectsRegistry,
            i,
            len,
            newAspectID;

        if (manualAspectContainerID) {
            manualAspectContainer = this._client.getNode(manualAspectContainerID);
            manualAspectsRegistry = manualAspectContainer.getEditableRegistry(ManualAspectConstants.MANUAL_ASPECTS_REGISTRY_KEY) || [];

            manualAspectsRegistry.sort(function (a, b) {
                if (a.order < b.order) {
                    return -1;
                } else {
                    return 1;
                }
            });

            len = manualAspectsRegistry.length;
            for (i = 0; i < len; i += 1) {
                manualAspectsRegistry[i].order = i;
            }

            //start transaction
            this._client.startTransaction();

            //create new aspect set in  meta container node
            newAspectID = ManualAspectConstants.MANUAL_ASPECT_NAME_PREFIX + generateGuid();
            this._client.createSet(manualAspectContainerID, newAspectID);

            var newAspectDesc = {'SetID': newAspectID,
                'order': manualAspectsRegistry.length,
                'title': 'Aspect ' + manualAspectsRegistry.length};

            manualAspectsRegistry.push(newAspectDesc);

            this._client.setRegistry(manualAspectContainerID, ManualAspectConstants.MANUAL_ASPECTS_REGISTRY_KEY, manualAspectsRegistry);

            //force switching to the new sheet
            this._selectedMemberListID = newAspectID;

            //finish transaction
            this._client.completeTransaction();
        }
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onTabTitleChanged = function (tabID, oldValue, newValue) {
        /*var aspectNodeID = this.metaAspectContainerNodeID,
            aspectNode = this._client.getNode(aspectNodeID),
            manualAspectsRegistry = aspectNode.getEditableRegistry(ManualAspectConstants.META_SHEET_REGISTRY_KEY) || [],
            i,
            len,
            setID;

        if (this._sheets[tabID]) {
            setID = this._sheets[tabID];

            len = manualAspectsRegistry.length;
            for (i = 0; i < len; i += 1) {
                if (manualAspectsRegistry[i].SetID === setID) {
                    manualAspectsRegistry[i].title = newValue;
                    break;
                }
            }

            this._client.setRegistry(aspectNodeID, ManualAspectConstants.META_SHEET_REGISTRY_KEY, manualAspectsRegistry);
        }*/
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onTabDeleteClicked = function (tabID) {
    };


    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onTabsSorted = function (newTabIDOrder) {
        /*var aspectNodeID = this.metaAspectContainerNodeID,
            aspectNode = this._client.getNode(aspectNodeID),
            manualAspectsRegistry = aspectNode.getEditableRegistry(ManualAspectConstants.META_SHEET_REGISTRY_KEY) || [],
            i,
            j,
            setID;

        for (i = 0; i < newTabIDOrder.length; i += 1) {
            //i is the new order number
            //newTabIDOrder[i] is the sheet identifier
            setID = this._sheets[newTabIDOrder[i]];
            for (j = 0; j < manualAspectsRegistry.length; j += 1) {
                if (manualAspectsRegistry[j].SetID === setID) {
                    manualAspectsRegistry[j].order = i;
                    break;
                }
            }
        }

        manualAspectsRegistry.sort(function (a, b) {
            if (a.order < b.order) {
                return -1;
            } else {
                return 1;
            }
        });

        this._client.startTransaction();
        this._client.setRegistry(aspectNodeID, ManualAspectConstants.META_SHEET_REGISTRY_KEY, manualAspectsRegistry);
        this._client.completeTransaction();*/
    };


    return MetaEditorControlDiagramDesignerWidgetEventHandlers;
});
