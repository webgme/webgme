"use strict";

define(['logManager',
    'clientUtil',
    'js/DiagramDesigner/NodePropertyNames'], function (logManager,
                                                       util,
                                                       nodePropertyNames) {

    var SetEditorControlDesignerCanvasEventHandlers,
        ATTRIBUTES_STRING = "attributes",
        REGISTRY_STRING = "registry",
        GME_ID = "GME_ID",
        CONNECTION_SOURCE_NAME = "source",
        CONNECTION_TARGET_NAME = "target";

    SetEditorControlDesignerCanvasEventHandlers = function () {
    };

    SetEditorControlDesignerCanvasEventHandlers.prototype.attachDesignerCanvasEventHandlers = function () {
        var self = this;

        /*OVERRIDE DESIGNER CANVAS METHODS*/
        this.designerCanvas.onDesignerItemsMove = function (repositionDesc) {
            self._onDesignerItemsMove(repositionDesc);
        };

        this.designerCanvas.onDesignerItemsCopy = function (copyDesc) {
            self.logger.error("onDesignerItemsCopy  should never happen in this mode!!!!");
        };

        this.designerCanvas.onCreateNewConnection = function (params) {
            self._onCreateNewConnection(params);
        };

        this.designerCanvas.onSelectionDelete = function (idList) {
            self._onSelectionDelete(idList);
        };

        this.designerCanvas.onDesignerItemDoubleClick = function (id, event) {
            self._onDesignerItemDoubleClick(id, event);
        };

        this.logger.debug("attachDesignerCanvasEventHandlers finished");
    };

    SetEditorControlDesignerCanvasEventHandlers.prototype._onDesignerItemsMove = function (repositionDesc) {
        var id,
            gmeID,
            controllerRegistryEntry;

        this._client.startTransaction();
        for (id in repositionDesc) {
            if (repositionDesc.hasOwnProperty(id)) {
                gmeID = this._ComponentID2GmeID[id];
                controllerRegistryEntry = this._client.getNode(gmeID).getRegistry(this.CONTROLLER_REGISTRY_ENTRY_NAME);
                if (!controllerRegistryEntry) {
                    controllerRegistryEntry = { "position": { "x": 100, "y": 100 } };
                }
                controllerRegistryEntry.position = { "x": repositionDesc[id].x, "y": repositionDesc[id].y };
                this._client.setRegistry(gmeID, this.CONTROLLER_REGISTRY_ENTRY_NAME, controllerRegistryEntry);
            }
        }
        this._client.completeTransaction();
    };

    SetEditorControlDesignerCanvasEventHandlers.prototype._onCreateNewConnection = function (params) {
        var type = params.metaInfo.type,
            sourceId = this._ComponentID2GmeID[params.src],
            targetId = this._ComponentID2GmeID[params.dst];

        //connDesc.type has special meaning: inheritance, containment, etc
        if (type) {
            this._client.addMember(sourceId, targetId, type);
        }

    };

    SetEditorControlDesignerCanvasEventHandlers.prototype._onSelectionDelete = function (idList) {
        /*
         var len = idList.length,
         desc;

         while (len--) {
         if (self._setRelations[idList[len]]) {
         desc = self._setRelations[idList[len]];
         self._client.removeMember(desc.owner, desc.member, desc.set);
         delete self._setRelations[idList[len]];
         self.designerCanvas.deleteComponent(idList[len]);

         }
         }
        * */
    };

    SetEditorControlDesignerCanvasEventHandlers.prototype._onDesignerItemDoubleClick = function (id, event) {
        var gmeID = this._ComponentID2GmeID[id];

        if (gmeID) {
            this.logger.debug("Opening model with id '" + gmeID + "'");
            this._client.setSelectedObjectId(gmeID);
        }
    };

    return SetEditorControlDesignerCanvasEventHandlers;
});
