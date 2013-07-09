"use strict";

define(['logManager',
    'clientUtil',
    'js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants'], function (logManager,
                                                        util,
                                                        CONSTANTS,
                                                        nodePropertyNames,
                                                        DiagramDesignerWidgetConstants) {

    var ModelEditorControlDiagramDesignerWidgetEventHandlers,
        ATTRIBUTES_STRING = "attributes",
        REGISTRY_STRING = "registry",
        CONNECTION_SOURCE_NAME = "source",
        CONNECTION_TARGET_NAME = "target",
        DEFAULT_LINE_STYLE = {};

        DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.WIDTH] = 2;
        DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.COLOR] = "#000000";
        DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.PATTERN] = "";
        DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.TYPE] = "";
        DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.START_ARROW] = "none";
        DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.END_ARROW] = "none";
        DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.POINTS] = [];

    ModelEditorControlDiagramDesignerWidgetEventHandlers = function () {
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype.attachDiagramDesignerWidgetEventHandlers = function () {
        var self = this;

        /*OVERRIDE DESIGNER CANVAS METHODS*/
        this.designerCanvas.onDesignerItemsMove = function (repositionDesc) {
            self._onDesignerItemsMove(repositionDesc);
        };

        this.designerCanvas.onDesignerItemsCopy = function (copyDesc) {
            self._onDesignerItemsCopy(copyDesc);
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

        this.designerCanvas.onModifyConnectionEnd = function (params) {
            self._onModifyConnectionEnd(params);
        };

        this.designerCanvas.onRegisterSubcomponent = function (objID, sCompID, metaInfo) {
            self._onRegisterSubcomponent(objID, sCompID, metaInfo);
        };

        this.designerCanvas.onUnregisterSubcomponent = function (objID, sCompID) {
            self._onUnregisterSubcomponent(objID, sCompID);
        };

        this.designerCanvas.onBackgroundDroppableAccept = function (helper) {
            return self._onBackgroundDroppableAccept(helper);
        };

        this.designerCanvas.onBackgroundDrop = function (helper, position) {
            self._onBackgroundDrop(helper, position);
        };

        this.designerCanvas.onSelectionChanged = function (selectedIds) {
            self._onSelectionChanged(selectedIds);
        };

        this.designerCanvas.onClipboardCopy = function (selectedIds) {
            self._onClipboardCopy(selectedIds);
        };

        this.designerCanvas.onClipboardPaste = function () {
            self._onClipboardPaste();
        };

        this.designerCanvas.onConnectionSegmentPointsChange = function (params) {
            self._onConnectionSegmentPointsChange(params);
        };

        this.designerCanvas.onFilterNewConnectionDroppableEnds = function (params) {
            return self._onFilterNewConnectionDroppableEnds(params);
        };

        this.designerCanvas.onFilterReconnectionDroppableEnds = function (params) {
            return self._onFilterReconnectionDroppableEnds(params);
        };

        this.designerCanvas.onDragStartDesignerItemDraggable = function (itemID) {
            return self._onDragStartDesignerItemDraggable(itemID);
        };

        this.designerCanvas.onDragStartDesignerItemCopyable = function (itemID) {
            return self._onDragStartDesignerItemCopyable(itemID);
        };

        this.designerCanvas.onDragStartDesignerConnectionCopyable = function (connectionID) {
            return self._onDragStartDesignerConnectionCopyable(connectionID);
        };

        this.logger.debug("attachDiagramDesignerWidgetEventHandlers finished");
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onDesignerItemsMove = function (repositionDesc) {
        var id;

        this._client.startTransaction();
        for (id in repositionDesc) {
            if (repositionDesc.hasOwnProperty(id)) {
                this._client.setRegistry(this._ComponentID2GmeID[id], nodePropertyNames.Registry.position, { "x": repositionDesc[id].x, "y": repositionDesc[id].y });
            }
        }
        this._client.completeTransaction();
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onDesignerItemsCopy = function (copyDesc) {
        var copyOpts = { "parentId": this.currentNodeInfo.id },
            id,
            desc,
            gmeID;

        this.designerCanvas.beginUpdate();

        for (id in copyDesc.items) {
            if (copyDesc.items.hasOwnProperty(id)) {
                desc = copyDesc.items[id];
                gmeID = this._ComponentID2GmeID[desc.oItemId];

                copyOpts[gmeID] = {};
                copyOpts[gmeID][ATTRIBUTES_STRING] = {};
                copyOpts[gmeID][REGISTRY_STRING] = {};

                copyOpts[gmeID][REGISTRY_STRING][nodePropertyNames.Registry.position] = { "x": desc.posX, "y": desc.posY };

                //remove the component from UI
                //it will be recreated when the GME client calls back with the result
                this.designerCanvas.deleteComponent(id);
            }
        }

        for (id in copyDesc.connections) {
            if (copyDesc.connections.hasOwnProperty(id)) {
                desc = copyDesc.connections[id];
                gmeID = this._ComponentID2GmeID[desc.oConnectionId];

                copyOpts[gmeID] = {};

                //remove the component from UI
                //it will be recreated when the GME client calls back with the result
                this.designerCanvas.deleteComponent(id);
            }
        }

        this.designerCanvas.endUpdate();

        this._client.intellyPaste(copyOpts);
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onCreateNewConnection = function (params) {
        var sourceId,
            targetId;

        if (params.srcSubCompId !== undefined) {
            sourceId = this._Subcomponent2GMEID[params.src][params.srcSubCompId];
        } else {
            sourceId = this._ComponentID2GmeID[params.src];
        }

        if (params.dstSubCompId !== undefined) {
            targetId = this._Subcomponent2GMEID[params.dst][params.dstSubCompId];
        } else {
            targetId = this._ComponentID2GmeID[params.dst];
        }

        var registry = {};
        registry[nodePropertyNames.Registry.lineStyle] = {};
        _.extend(registry[nodePropertyNames.Registry.lineStyle], DEFAULT_LINE_STYLE);

        var p = {   "parentId": this.currentNodeInfo.id,
            "sourceId": sourceId,
            "targetId": targetId,
            "registry": registry};

        this.logger.warning("_onCreateNewConnection: " + JSON.stringify(p));

        this._client.makeConnection(p);
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectionDelete = function (idList) {
        var objIdList = [],
            i = idList.length;

        while(i--) {
            objIdList.pushUnique(this._ComponentID2GmeID[idList[i]]);
        }

        if (objIdList.length > 0) {
            this._client.delMoreNodes(objIdList);
        }
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onDesignerItemDoubleClick = function (id, event) {
        var gmeID = this._ComponentID2GmeID[id];

        if (gmeID) {
            this.logger.debug("Opening model with id '" + gmeID + "'");
            this._client.setSelectedObjectId(gmeID);
        }
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onModifyConnectionEnd = function (params) {
        var gmeID = this._ComponentID2GmeID[params.id],
            oldDesc = params.old,
            newDesc = params.new,
            newEndPointGMEID;

        if (gmeID) {
            this._client.startTransaction();

            //update connection endpoint - SOURCE
            if (oldDesc.srcObjId !== newDesc.srcObjId ||
                oldDesc.srcSubCompId !== newDesc.srcSubCompId) {
                if (newDesc.srcSubCompId !== undefined ) {
                    newEndPointGMEID = this._Subcomponent2GMEID[newDesc.srcObjId][newDesc.srcSubCompId];
                } else {
                    newEndPointGMEID = this._ComponentID2GmeID[newDesc.srcObjId];
                }
                this._client.makePointer(gmeID, CONNECTION_SOURCE_NAME, newEndPointGMEID);
            }

            //update connection endpoint - TARGET
            if (oldDesc.dstObjId !== newDesc.dstObjId ||
                oldDesc.dstSubCompId !== newDesc.dstSubCompId) {
                if (newDesc.dstSubCompId !== undefined ) {
                    newEndPointGMEID = this._Subcomponent2GMEID[newDesc.dstObjId][newDesc.dstSubCompId];
                } else {
                    newEndPointGMEID = this._ComponentID2GmeID[newDesc.dstObjId];
                }
                this._client.makePointer(gmeID, CONNECTION_TARGET_NAME, newEndPointGMEID);
            }

            this._client.completeTransaction();
        }
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onRegisterSubcomponent = function (objID, sCompID, metaInfo) {
        //store that a subcomponent with a given ID has been added to object with objID
        this._GMEID2Subcomponent[metaInfo[CONSTANTS.GME_ID]] = this._GMEID2Subcomponent[metaInfo[CONSTANTS.GME_ID]] || {};
        this._GMEID2Subcomponent[metaInfo[CONSTANTS.GME_ID]][objID] = sCompID;

        this._Subcomponent2GMEID[objID] = this._Subcomponent2GMEID[objID] || {};
        this._Subcomponent2GMEID[objID][sCompID] = metaInfo[CONSTANTS.GME_ID];
        //TODO: add event handling here that a subcomponent appeared
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onUnregisterSubcomponent = function (objID, sCompID) {
        var gmeID = this._Subcomponent2GMEID[objID][sCompID];

        delete this._Subcomponent2GMEID[objID][sCompID];
        delete this._GMEID2Subcomponent[gmeID][objID];
        //TODO: add event handling here that a subcomponent disappeared
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._switchToNextDecorator = function (id) {
        var objDesc = this._getObjectDescriptor(id),
            nextDec = "DecoratorWithPorts";

        switch (objDesc.decorator) {
            case "DefaultDecorator":
                nextDec = "CircleDecorator";
                break;
            case "CircleDecorator":
                nextDec = "DecoratorWithPorts";
                break;
            case "DecoratorWithPorts":
                nextDec = "AttributesDecorator";
                break;
            case "AttributesDecorator":
                nextDec = "DefaultDecorator";
                break;
            default:
                break;
        }

        this._client.startTransaction();
        this._client.setRegistry(id, nodePropertyNames.Registry.decorator, nextDec);
        this._client.completeTransaction();
    };


    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onBackgroundDroppableAccept = function (helper) {
        var metaInfo = helper.data("metaInfo");
        if (metaInfo) {
            if (metaInfo.hasOwnProperty(CONSTANTS.GME_ID)) {
                return true;
            }
        }

        return false;
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onBackgroundDrop = function (helper, position) {
        var metaInfo = helper.data("metaInfo"),
            intellyPasteOpts,
            gmeID,
            i;

        if (metaInfo) {
            if (metaInfo.hasOwnProperty(CONSTANTS.GME_ID)) {

                intellyPasteOpts = { "parentId": this.currentNodeInfo.id };

                gmeID = metaInfo[CONSTANTS.GME_ID];

                if (_.isArray(gmeID)) {
                    for (i = 0; i < gmeID.length; i+= 1) {
                        intellyPasteOpts[gmeID[i]] = { "attributes": {}, registry: {} };
                        intellyPasteOpts[gmeID[i]].registry[nodePropertyNames.Registry.position] = { "x": position.x,
                            "y": position.y };

                        position.x += 20;
                        position.y += 20;
                    }
                } else {
                    intellyPasteOpts[gmeID] = { "attributes": {}, registry: {} };
                    intellyPasteOpts[gmeID].registry[nodePropertyNames.Registry.position] = { "x": position.x,
                        "y": position.y };
                }

                this._client.intellyPaste(intellyPasteOpts);
            }
        }
    };


    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectionChanged = function (selectedIds) {
        var gmeIDs = [],
            len = selectedIds.length,
            id,
            connectionSelected = false;

        while (len--) {
            id = this._ComponentID2GmeID[selectedIds[len]];
            if (id) {
                gmeIDs.push(id);
            }

            if (this.designerCanvas.connectionIds.indexOf(selectedIds[len]) !== -1) {
                connectionSelected = true;
            }
        }

        this.$btnConnectionVisualStyleRegistryFields.enabled(connectionSelected);
        this.$btnConnectionRemoveSegmentPoints.enabled(connectionSelected);

        //nobody is selected on the canvas
        //set the active selection to the opened guy
        if (gmeIDs.length === 0 && this.currentNodeInfo.id) {
            gmeIDs.push(this.currentNodeInfo.id);
        }

        if (gmeIDs.length !== 0) {
            this._client.setPropertyEditorIdList(gmeIDs);
        }
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onClipboardCopy = function (selectedIds) {
        var gmeIDs = [],
            len = selectedIds.length,
            id;

        while (len--) {
            id = this._ComponentID2GmeID[selectedIds[len]];
            if (id) {
                gmeIDs.push(id);
            }
        }

        if (gmeIDs.length !== 0) {
            this._client.copyNodes(gmeIDs);
        }
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onClipboardPaste = function () {
        if (this.currentNodeInfo.id) {
            this._client.pasteNodes(this.currentNodeInfo.id);
        }
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onConnectionSegmentPointsChange = function (params) {
        var connID = params.connectionID,
            points = params.points,
            gmeID = this._ComponentID2GmeID[connID],
            nodeObj,
            lineStyle;

        if (gmeID) {
            nodeObj = this._client.getNode(gmeID);
            if (nodeObj) {
                lineStyle = nodeObj.getRegistry(nodePropertyNames.Registry.lineStyle) || {};
                lineStyle[DiagramDesignerWidgetConstants.LINE_POINTS] = points;

                this._client.setRegistry(gmeID, nodePropertyNames.Registry.lineStyle, lineStyle);
            }
        }
    };


    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onFilterNewConnectionDroppableEnds = function (params) {
        var availableConnectionEnds = params.availableConnectionEnds,
            result = [],
            i = availableConnectionEnds.length,
            sourceId,
            targetId;

        if (params.srcSubCompId !== undefined) {
            sourceId = this._Subcomponent2GMEID[params.srcId][params.srcSubCompId];
        } else {
            sourceId = this._ComponentID2GmeID[params.srcId];
        }

        //need to test for each source-destination pair if the connection can be made or not?
        while (i--) {
            var p = availableConnectionEnds[i];
            if (p.dstSubCompID !== undefined) {
                targetId = this._Subcomponent2GMEID[p.dstItemID][p.dstSubCompID];
            } else {
                targetId = this._ComponentID2GmeID[p.dstItemID];
            }

            if (this._client.canMakeConnection({   "parentId": this.currentNodeInfo.id,
                "sourceId": sourceId,
                "targetId": targetId }) ) {
                result.push(availableConnectionEnds[i]);
            }
        }

        return result;
    };


    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onFilterReconnectionDroppableEnds = function (params) {
        var connID = params.connId,
            srcDragged = params.draggedEnd === DiagramDesignerWidgetConstants.CONNECTION_END_SRC,
            srcItemID = params.srcItemID,
            srcSubCompID = params.srcSubCompID,
            dstItemID = params.dstItemID,
            dstSubCompID = params.dstSubCompID,
            availableConnectionEnds = params.availableConnectionEnds,
            availableConnectionSources = params.availableConnectionSources,
            i,
            gmeID = this._ComponentID2GmeID[connID],
            result = [],
            newEndPointGMEID;

        if (srcDragged === true) {
            //'src' end of the connection is being dragged
            //'dst end is fix
            //need to check for all possible 'src' if the connection's end could be changed to that value
            i = availableConnectionSources.length;
            while (i--) {
                srcItemID = availableConnectionSources[i].srcItemID;
                srcSubCompID = availableConnectionSources[i].srcSubCompID;
                if (srcSubCompID !== undefined ) {
                    newEndPointGMEID = this._Subcomponent2GMEID[srcItemID][srcSubCompID];
                } else {
                    newEndPointGMEID = this._ComponentID2GmeID[srcItemID];
                }
                if (this._client.canMakePointer(gmeID, CONNECTION_SOURCE_NAME, newEndPointGMEID)) {
                    result.push(availableConnectionSources[i]);
                }
            }
        } else {
            //'dst' end of the connection is being dragged
            //'src end is fix
            //need to check for all possible 'dst' if the connection's end could be changed to that value
            i = availableConnectionEnds.length;
            while (i--) {
                dstItemID = availableConnectionEnds[i].dstItemID;
                dstSubCompID = availableConnectionEnds[i].dstSubCompID;
                if (dstSubCompID !== undefined ) {
                    newEndPointGMEID = this._Subcomponent2GMEID[dstItemID][dstSubCompID];
                } else {
                    newEndPointGMEID = this._ComponentID2GmeID[dstItemID];
                }
                if (this._client.canMakePointer(gmeID, CONNECTION_TARGET_NAME, newEndPointGMEID)) {
                    result.push(availableConnectionEnds[i]);
                }
            }
        }

        return result;
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onDragStartDesignerItemDraggable = function (itemID) {
        var nodeObj = this._client.getNode(this._ComponentID2GmeID[itemID]),
            result = true;

        if (nodeObj) {
            result = this._client.canSetRegistry(nodeObj.getId(), nodePropertyNames.Registry.position);
        }

        return result;
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onDragStartDesignerItemCopyable = function (itemID) {
        var nodeObj = this._client.getNode(this._ComponentID2GmeID[itemID]),
            result = true;

        if (nodeObj) {
            result = nodeObj.getAttribute('copy') != "false";
        }

        return result;
    };


    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onDragStartDesignerConnectionCopyable = function (connectionID) {
        return this._onDragStartDesignerItemCopyable(connectionID);
    };

    return ModelEditorControlDiagramDesignerWidgetEventHandlers;
});
