/*globals define, WebGMEGlobal, _, alert*/
/*jshint browser: true*/
/*jscs:disable maximumLineLength*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger',
    'js/util',
    'js/Constants',
    'js/UIEvents',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    'js/Utils/GMEConcepts',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    'js/DragDrop/DragHelper',
    'js/Dialogs/ReplaceBase/ReplaceBaseDialog',
    'js/Utils/Exporters',
    'js/Dialogs/ImportModel/ImportModelDialog',
], function (Logger,
             util,
             CONSTANTS,
             UI_EVENTS,
             nodePropertyNames,
             REGISTRY_KEYS,
             GMEConcepts,
             DiagramDesignerWidgetConstants,
             DragHelper,
             ReplaceBaseDialog,
             exporters,
             ImportModelDialog) {

    'use strict';

    var ModelEditorControlDiagramDesignerWidgetEventHandlers,
        ATTRIBUTES_STRING = 'attributes',
        REGISTRY_STRING = 'registry',
        SRC_POINTER_NAME = CONSTANTS.POINTER_SOURCE,
        DST_POINTER_NAME = CONSTANTS.POINTER_TARGET;

    ModelEditorControlDiagramDesignerWidgetEventHandlers = function () {
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype.attachDiagramDesignerWidgetEventHandlers = function () {
        var self = this;

        /*OVERRIDE DESIGNER CANVAS METHODS*/
        this.designerCanvas.onDesignerItemsMove = function (repositionDesc) {
            self._onDesignerItemsMove(repositionDesc);
        };
        /*
         this.designerCanvas.onDesignerItemsCopy = function (copyDesc) {
         self._onDesignerItemsCopy(copyDesc);
         };*/

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

        this.designerCanvas.onBackgroundDroppableAccept = function (event, dragInfo) {
            return self._onBackgroundDroppableAccept(event, dragInfo);
        };

        this.designerCanvas.onBackgroundDrop = function (event, dragInfo, position) {
            self._onBackgroundDrop(event, dragInfo, position);
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

        this.designerCanvas.onSelectionRotated = function (deg, selectedIds) {
            return self._onSelectionRotated(deg, selectedIds);
        };

        this.designerCanvas.onSetConnectionProperty = function (params) {
            self._onSetConnectionProperty(params);
        };

        this.designerCanvas.onCopy = function () {
            return self._onCopy();
        };

        this.designerCanvas.onPaste = function (data) {
            return self._onPaste(data);
        };

        this.designerCanvas.getDragItems = function (selectedElements) {
            return self._getDragItems(selectedElements);
        };

        this._oGetDragParams = this.designerCanvas.getDragParams;
        this.designerCanvas.getDragParams = function (selectedElements, event) {
            return self._getDragParams(selectedElements, event);
        };

        this.designerCanvas.onSelectionContextMenu = function (selectedIds, mousePos) {
            self._onSelectionContextMenu(selectedIds, mousePos);
        };

        this.designerCanvas.onSelectionAlignMenu = function (selectedIds, mousePos) {
            self._onSelectionAlignMenu(selectedIds, mousePos);
        };

        this.designerCanvas.onSelectionFillColorChanged = function (selectedElements, color) {
            self._onSelectionFillColorChanged(selectedElements, color);
        };

        this.designerCanvas.onSelectionBorderColorChanged = function (selectedElements, color) {
            self._onSelectionBorderColorChanged(selectedElements, color);
        };

        this.designerCanvas.onSelectionTextColorChanged = function (selectedElements, color) {
            self._onSelectionTextColorChanged(selectedElements, color);
        };

        this.designerCanvas.onSelectedTabChanged = function (tabID) {
            self._onSelectedTabChanged(tabID);
        };

        this.designerCanvas.onAlignSelection = function (selectedIds, type) {
            self._onAlignSelection(selectedIds, type);
        };

        this.logger.debug('attachDiagramDesignerWidgetEventHandlers finished');
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onDesignerItemsMove = function (repositionDesc) {
        var id,
            modelId = this.currentNodeInfo.id,
            newPos;

        this._client.startTransaction();
        for (id in repositionDesc) {
            if (repositionDesc.hasOwnProperty(id)) {
                newPos = {
                    x: repositionDesc[id].x,
                    y: repositionDesc[id].y
                };

                if (this._selectedAspect === CONSTANTS.ASPECT_ALL) {
                    this._client.setRegistry(this._ComponentID2GMEID[id], REGISTRY_KEYS.POSITION, newPos);
                } else {
                    this._client.addMember(modelId, this._ComponentID2GMEID[id], this._selectedAspect);
                    this._client.setMemberRegistry(modelId, this._ComponentID2GMEID[id], this._selectedAspect,
                        REGISTRY_KEYS.POSITION, newPos);
                }
            }
        }
        this._client.completeTransaction();
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onDesignerItemsCopy = function (copyDesc) {
        var copyOpts = {parentId: this.currentNodeInfo.id},
            id,
            desc,
            gmeID;

        this.designerCanvas.beginUpdate();

        for (id in copyDesc.items) {
            if (copyDesc.items.hasOwnProperty(id)) {
                desc = copyDesc.items[id];
                gmeID = this._ComponentID2GMEID[desc.oItemId];

                copyOpts[gmeID] = {};
                copyOpts[gmeID][ATTRIBUTES_STRING] = {};
                copyOpts[gmeID][REGISTRY_STRING] = {};

                copyOpts[gmeID][REGISTRY_STRING][REGISTRY_KEYS.POSITION] = {x: desc.posX, y: desc.posY};

                //remove the component from UI
                //it will be recreated when the GME client calls back with the result
                this.designerCanvas.deleteComponent(id);
            }
        }

        for (id in copyDesc.connections) {
            if (copyDesc.connections.hasOwnProperty(id)) {
                desc = copyDesc.connections[id];
                gmeID = this._ComponentID2GMEID[desc.oConnectionId];

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
            targetId,
            parentId = this.currentNodeInfo.id,
            createConnection,
            _client = this._client,
            CONTEXT_POS_OFFSET = 10,
            menuItems = {},
            i,
            connTypeObj,
            aspect = this._selectedAspect,
            newConnID,
            validConnectionTypes,
            dstPosition;

        //local callback to create the connection
        createConnection = function (connTypeToCreate) {
            if (connTypeToCreate) {
                _client.startTransaction();

                //create new object
                newConnID = _client.createChild({parentId: parentId, baseId: connTypeToCreate});

                //set source and target pointers
                _client.makePointer(newConnID, CONSTANTS.POINTER_SOURCE, sourceId);
                _client.makePointer(newConnID, CONSTANTS.POINTER_TARGET, targetId);

                _client.completeTransaction();
            }
        };

        if (params.srcSubCompId !== undefined) {
            sourceId = this._Subcomponent2GMEID[params.src][params.srcSubCompId];
        } else {
            sourceId = this._ComponentID2GMEID[params.src];
        }

        if (params.dstSubCompId !== undefined) {
            targetId = this._Subcomponent2GMEID[params.dst][params.dstSubCompId];
        } else {
            targetId = this._ComponentID2GMEID[params.dst];
        }

        //get the list of valid connection types
        validConnectionTypes = GMEConcepts.getValidConnectionTypesInAspect(sourceId, targetId, parentId, aspect);
        //filter them to see which of those can actually be created as a child of the parent
        i = validConnectionTypes.length;
        while (i--) {
            if (!GMEConcepts.canCreateChild(parentId, validConnectionTypes[i])) {
                validConnectionTypes.splice(i, 1);
            }
        }

        if (validConnectionTypes.length === 1) {
            createConnection(validConnectionTypes[0]);
        } else if (validConnectionTypes.length > 1) {
            //show available connection types to the user to select one
            for (i = 0; i < validConnectionTypes.length; i += 1) {
                connTypeObj = this._client.getNode(validConnectionTypes[i]);
                menuItems[validConnectionTypes[i]] = {
                    name: 'Create type \'' +
                    (connTypeObj ?
                        connTypeObj.getAttribute(nodePropertyNames.Attributes.name) : validConnectionTypes[i]) +
                    '\'',
                    icon: false
                };
            }

            dstPosition = this.designerCanvas.items[params.dst].getBoundingBox();

            this.designerCanvas.createMenu(menuItems, function (key) {
                    createConnection(key);
                },
                this.designerCanvas.posToPageXY(dstPosition.x - CONTEXT_POS_OFFSET,
                    dstPosition.y - CONTEXT_POS_OFFSET)
            );
        }
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectionDelete = function (idList) {
        var objIdList = [],
            i = idList.length,
            objID;

        while (i--) {
            objID = this._ComponentID2GMEID[idList[i]];
            //temporary fix to not allow deleting ROOT AND FCO
            if (GMEConcepts.canDeleteNode(objID)) {
                objIdList.pushUnique(objID);
            } else {
                this.logger.warn('Can not delete item with ID: ' + objID + '. Possibly it is the ROOT or FCO');
            }
        }

        if (objIdList.length > 0) {
            this._client.delMoreNodes(objIdList);
        }
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onDesignerItemDoubleClick = function (id /*, event */) {
        var gmeID = this._ComponentID2GMEID[id];

        if (gmeID) {
            this.logger.debug('Opening model with id "' + gmeID + '"');
            WebGMEGlobal.State.registerActiveObject(gmeID);
        }
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onModifyConnectionEnd = function (params) {
        var gmeID = this._ComponentID2GMEID[params.id],
            oldDesc = params.old,
            newDesc = params.new,
            newEndPointGMEID;

        if (gmeID) {
            this._client.startTransaction();

            //update connection endpoint - SOURCE
            if (oldDesc.srcObjId !== newDesc.srcObjId ||
                oldDesc.srcSubCompId !== newDesc.srcSubCompId) {
                if (newDesc.srcSubCompId !== undefined) {
                    newEndPointGMEID = this._Subcomponent2GMEID[newDesc.srcObjId][newDesc.srcSubCompId];
                } else {
                    newEndPointGMEID = this._ComponentID2GMEID[newDesc.srcObjId];
                }
                this._client.makePointer(gmeID, SRC_POINTER_NAME, newEndPointGMEID);
            }

            //update connection endpoint - TARGET
            if (oldDesc.dstObjId !== newDesc.dstObjId ||
                oldDesc.dstSubCompId !== newDesc.dstSubCompId) {
                if (newDesc.dstSubCompId !== undefined) {
                    newEndPointGMEID = this._Subcomponent2GMEID[newDesc.dstObjId][newDesc.dstSubCompId];
                } else {
                    newEndPointGMEID = this._ComponentID2GMEID[newDesc.dstObjId];
                }
                this._client.makePointer(gmeID, DST_POINTER_NAME, newEndPointGMEID);
            }

            this._client.completeTransaction();
        }
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onRegisterSubcomponent = function (objID, sCompID,
                                                                                                       metaInfo) {
        //store that a subcomponent with a given ID has been added to object with objID
        this._GMEID2Subcomponent[metaInfo[CONSTANTS.GME_ID]] = this._GMEID2Subcomponent[metaInfo[CONSTANTS.GME_ID]] ||
            {};
        this._GMEID2Subcomponent[metaInfo[CONSTANTS.GME_ID]][objID] = sCompID;

        this._Subcomponent2GMEID[objID] = this._Subcomponent2GMEID[objID] || {};
        this._Subcomponent2GMEID[objID][sCompID] = metaInfo[CONSTANTS.GME_ID];
        //TODO: add event handling here that a subcomponent appeared
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onUnregisterSubcomponent = function (objID,
                                                                                                         sCompID) {
        var gmeID = this._Subcomponent2GMEID[objID][sCompID];

        delete this._Subcomponent2GMEID[objID][sCompID];
        if (this._GMEID2Subcomponent[gmeID]) {
            delete this._GMEID2Subcomponent[gmeID][objID];
        }
        //TODO: add event handling here that a subcomponent disappeared
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._getPossibleDropActions = function (dragInfo) {
        var items = DragHelper.getDragItems(dragInfo),
            dragEffects = DragHelper.getDragEffects(dragInfo),
            dragParams = DragHelper.getDragParams(dragInfo),
            possibleDropActions = [],
            parentID = this.currentNodeInfo.id,
            i,
            j,
            FCOamongItems = false,
            validPointerTypes = [],
            baseTypeID,
            baseTypeNode,
            dragAction,
            aspect = this._selectedAspect,
            pointerSorter = function (a, b) {
                var baseAName = a.name.toLowerCase(),
                    baseBName = b.name.toLowerCase(),
                    ptrAName = a.pointer.toLowerCase(),
                    ptrBName = b.pointer.toLowerCase();

                if (ptrAName < ptrBName) {
                    return -1;
                } else if (ptrAName > ptrBName) {
                    return 1;
                } else {
                    //ptrAName = ptrBName
                    if (baseAName < baseBName) {
                        return -1;
                    } else {
                        return 1;
                    }
                }
            };

        //check if FCO is among the items as it may change the outcome
        for (i = 0; i < items.length; i += 1) {
            if (GMEConcepts.isProjectFCO(items[i])) {
                FCOamongItems = true;
                break;
            }
        }

        //check to see what DROP actions are possible
        if (items.length > 0) {
            i = dragEffects.length;
            while (i--) {
                switch (dragEffects[i]) {
                    case DragHelper.DRAG_EFFECTS.DRAG_MOVE:
                        //check to see if dragParams.parentID and this.parentID are the same
                        //if so, it's not a real move, it is a reposition
                        if ((dragParams && dragParams.parentID === parentID) ||
                            (GMEConcepts.canCreateChildrenInAspect(parentID, items, aspect) &&
                            GMEConcepts.canMoveNodeHere(parentID, items) && !FCOamongItems)) {
                            dragAction = {dragEffect: dragEffects[i]};
                            possibleDropActions.push(dragAction);
                        }
                        break;
                    case DragHelper.DRAG_EFFECTS.DRAG_COPY:
                        if (GMEConcepts.canCreateChildrenInAspect(parentID, items, aspect) && !FCOamongItems) {
                            dragAction = {dragEffect: dragEffects[i]};
                            possibleDropActions.push(dragAction);
                        }
                        break;
                    case DragHelper.DRAG_EFFECTS.DRAG_CREATE_INSTANCE:
                        if (GMEConcepts.canCreateChildrenInAspect(parentID, items, aspect)) {
                            dragAction = {dragEffect: dragEffects[i]};
                            possibleDropActions.push(dragAction);
                        }
                        break;
                    case DragHelper.DRAG_EFFECTS.DRAG_CREATE_POINTER:
                        if (items.length === 1) {
                            validPointerTypes = GMEConcepts.getValidPointerTypes(parentID, items[0]);
                            if (validPointerTypes.length > 0) {
                                j = validPointerTypes.length;
                                //each valid pointer type is an object {'baseId': objId, 'pointer': pointerName}
                                while (j--) {
                                    baseTypeID = validPointerTypes[j].baseId;
                                    baseTypeNode = this._client.getNode(baseTypeID);
                                    validPointerTypes[j].name = baseTypeID;
                                    if (baseTypeNode) {
                                        validPointerTypes[j].name = baseTypeNode.getAttribute(
                                            nodePropertyNames.Attributes.name);
                                    }
                                }

                                validPointerTypes.sort(pointerSorter);

                                for (j = 0; j < validPointerTypes.length; j += 1) {
                                    dragAction = {
                                        dragEffect: DragHelper.DRAG_EFFECTS.DRAG_CREATE_POINTER,
                                        name: validPointerTypes[j].name,
                                        baseId: validPointerTypes[j].baseId,
                                        pointer: validPointerTypes[j].pointer
                                    };
                                    possibleDropActions.push(dragAction);
                                }
                            }
                        }
                        break;
                }
            }
        }

        this.logger.debug('possibleDropActions: ' + JSON.stringify(possibleDropActions));

        return possibleDropActions;
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onBackgroundDroppableAccept = function (event,
                                                                                                            dragInfo) {
        var accept;

        accept = this._getPossibleDropActions(dragInfo).length > 0;

        return accept;
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onBackgroundDrop = function (event, dragInfo,
                                                                                                 position) {
        var possibleDropActions = this._getPossibleDropActions(dragInfo),
            len = possibleDropActions.length,
            i,
            selectedAction,
            self = this,
            menuItems;

        if (len === 1) {
            selectedAction = possibleDropActions[0];
            this._handleDropAction(selectedAction, dragInfo, position);
        } else {
            menuItems = {};

            for (i = 0; i < possibleDropActions.length; i += 1) {
                switch (possibleDropActions[i].dragEffect) {
                    case DragHelper.DRAG_EFFECTS.DRAG_COPY:
                        menuItems[i] = {
                            name: 'Copy here',
                            icon: 'glyphicon glyphicon-plus'
                        };
                        break;
                    case DragHelper.DRAG_EFFECTS.DRAG_MOVE:
                        menuItems[i] = {
                            name: 'Move here',
                            icon: 'glyphicon glyphicon-move'
                        };
                        break;
                    case DragHelper.DRAG_EFFECTS.DRAG_CREATE_INSTANCE:
                        menuItems[i] = {
                            name: 'Create instance here',
                            icon: 'glyphicon glyphicon-share-alt'
                        };
                        break;
                    case DragHelper.DRAG_EFFECTS.DRAG_CREATE_POINTER:
                        menuItems[i] = {
                            name: 'Create pointer "' + possibleDropActions[i].pointer + '" of type "' +
                            possibleDropActions[i].name + '"',
                            icon: 'glyphicon glyphicon-share'
                        };
                        break;
                    default:
                        break;
                }
            }

            this.designerCanvas.createMenu(menuItems, function (key) {
                    selectedAction = possibleDropActions[parseInt(key, 10)];
                    self._handleDropAction(selectedAction, dragInfo, position);
                },
                this.designerCanvas.posToPageXY(position.x, position.y)
            );
        }
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._handleDropAction = function (dropAction, dragInfo,
                                                                                                 position) {
        var dragEffect = dropAction.dragEffect,
            items = DragHelper.getDragItems(dragInfo),
            dragParams = DragHelper.getDragParams(dragInfo),
            parentID = this.currentNodeInfo.id,
            i,
            gmeID,
            params,
            POS_INC = 20,
            oldPos,
            origNode,
            ptrName;

        this.logger.debug('dropAction: ' + JSON.stringify(dropAction));
        this.logger.debug('dragInfo: ' + JSON.stringify(dragInfo));
        this.logger.debug('position: ' + JSON.stringify(position));

        switch (dragEffect) {
            case DragHelper.DRAG_EFFECTS.DRAG_COPY:
                params = {parentId: parentID};
                i = items.length;
                while (i--) {
                    gmeID = items[i];

                    params[gmeID] = {};

                    oldPos = dragParams && dragParams.positions[gmeID] || {x: 0, y: 0};
                    params[gmeID][REGISTRY_STRING] = {};
                    params[gmeID][REGISTRY_STRING][REGISTRY_KEYS.POSITION] = {
                        x: position.x + oldPos.x,
                        y: position.y + oldPos.y
                    };
                }
                this._client.startTransaction();
                this._client.copyMoreNodes(params);
                this._client.completeTransaction();
                break;
            case DragHelper.DRAG_EFFECTS.DRAG_MOVE:
                //check to see if dragParams.parentID and this.parentID are the same
                //if so, it's not a real move, it is a reposition
                if (dragParams && dragParams.parentID === parentID) {
                    //it is a reposition
                    this._repositionItems(items, dragParams.positions, position);
                } else {
                    //it is a real hierarchical move

                    params = {parentId: parentID};
                    i = items.length;
                    while (i--) {
                        gmeID = items[i];

                        params[gmeID] = {};

                        oldPos = dragParams && dragParams.positions[gmeID] || {x: 0, y: 0};
                        params[gmeID][REGISTRY_STRING] = {};
                        params[gmeID][REGISTRY_STRING][REGISTRY_KEYS.POSITION] = {
                            x: position.x + oldPos.x,
                            y: position.y + oldPos.y
                        };
                    }

                    this._client.moveMoreNodes(params);
                }
                break;
            case DragHelper.DRAG_EFFECTS.DRAG_CREATE_INSTANCE:
                params = {parentId: parentID};
                i = items.length;
                while (i--) {
                    oldPos = dragParams && dragParams.positions[items[i]] || {x: 0, y: 0};
                    params[items[i]] = {registry: {position: {x: position.x + oldPos.x, y: position.y + oldPos.y}}};
                    //old position is not in drag-params
                    if (!(dragParams && dragParams.positions[items[i]])) {
                        position.x += POS_INC;
                        position.y += POS_INC;
                    }
                }
                this._client.createChildren(params);
                break;

            case DragHelper.DRAG_EFFECTS.DRAG_CREATE_POINTER:
                params = {
                    parentId: parentID,
                    baseId: dropAction.baseId
                };

                this._client.startTransaction();

                gmeID = this._client.createChild(params);

                if (gmeID) {
                    //check if old position is in drag-params
                    oldPos = dragParams && dragParams.positions[items[0]] || {x: 0, y: 0};
                    //store new position
                    this._client.setRegistry(gmeID, REGISTRY_KEYS.POSITION, {
                        x: position.x + oldPos.x,
                        y: position.y + oldPos.y
                    });

                    //set reference
                    this._client.makePointer(gmeID, dropAction.pointer, items[0]);

                    //try to set name
                    origNode = this._client.getNode(items[0]);
                    if (origNode) {
                        ptrName = origNode.getAttribute(nodePropertyNames.Attributes.name) + '-' +
                            dropAction.pointer;
                        this._client.setAttributes(gmeID, nodePropertyNames.Attributes.name, ptrName);
                    }
                }

                this._client.completeTransaction();

                break;
            default:
                break;
        }
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._repositionItems = function (items, dragPositions,
                                                                                                dropPosition) {
        var i = items.length,
            oldPos,
            componentID,
            gmeID,
            selectedIDs = [],
            len,
            self = this;

        if (dragPositions && !_.isEmpty(dragPositions)) {
            //update UI
            this.designerCanvas.beginUpdate();

            while (i--) {
                gmeID = items[i];
                oldPos = dragPositions[gmeID];
                if (!oldPos) {
                    oldPos = {x: 0, y: 0};
                }

                if (this._GMEID2ComponentID.hasOwnProperty(gmeID)) {
                    len = this._GMEID2ComponentID[gmeID].length;
                    while (len--) {
                        componentID = this._GMEID2ComponentID[gmeID][len];
                        selectedIDs.push(componentID);
                        this.designerCanvas.updateDesignerItem(componentID,
                            {position: {x: dropPosition.x + oldPos.x, y: dropPosition.y + oldPos.y}});
                    }
                }
            }

            this.designerCanvas.endUpdate();
            this.designerCanvas.select(selectedIDs);

            //update object internals
            setTimeout(function () {
                self._saveReposition(items, dragPositions, dropPosition);
            }, 10);
        }
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._saveReposition = function (items, dragPositions,
                                                                                               dropPosition) {
        var gmeID,
            oldPos,
            i,
            modelID = this.currentNodeInfo.id,
            selectedAspect = this._selectedAspect,
            client = this._client;

        client.startTransaction();
        i = items.length;
        while (i--) {
            gmeID = items[i];
            oldPos = dragPositions[gmeID];
            if (!oldPos) {
                oldPos = {x: 0, y: 0};
            }
            //aspect specific coordinate
            if (selectedAspect === CONSTANTS.ASPECT_ALL) {
                client.setRegistry(gmeID,
                    REGISTRY_KEYS.POSITION,
                    {
                        x: dropPosition.x + oldPos.x,
                        y: dropPosition.y + oldPos.y
                    });
            } else {
                client.addMember(modelID, gmeID, selectedAspect);
                client.setMemberRegistry(modelID,
                    gmeID,
                    selectedAspect,
                    REGISTRY_KEYS.POSITION,
                    {
                        x: dropPosition.x + oldPos.x,
                        y: dropPosition.y + oldPos.y
                    });
            }
        }

        client.completeTransaction();
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectionChanged = function (selectedIds) {
        var gmeIDs = [],
            len = selectedIds.length,
            id,
            onlyConnectionSelected = selectedIds.length > 0;

        while (len--) {
            id = this._ComponentID2GMEID[selectedIds[len]];
            if (id) {
                gmeIDs.push(id);

                onlyConnectionSelected = onlyConnectionSelected && GMEConcepts.isConnectionType(id);
            }
        }

        this.designerCanvas.toolbarItems.ddbtnConnectionArrowStart.enabled(onlyConnectionSelected);
        this.designerCanvas.toolbarItems.ddbtnConnectionPattern.enabled(onlyConnectionSelected);
        this.designerCanvas.toolbarItems.ddbtnConnectionArrowEnd.enabled(onlyConnectionSelected);
        this.designerCanvas.toolbarItems.ddbtnConnectionLineType.enabled(onlyConnectionSelected);
        this.designerCanvas.toolbarItems.ddbtnConnectionLineWidth.enabled(onlyConnectionSelected);
        this.designerCanvas.toolbarItems.ddbtnConnectionLabelPlacement.enabled(onlyConnectionSelected);

        this.$btnConnectionRemoveSegmentPoints.enabled(onlyConnectionSelected);

        this._settingActiveSelection = true;
        WebGMEGlobal.State.registerActiveSelection(gmeIDs);
        this._settingActiveSelection = false;
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onClipboardCopy = function (selectedIds) {
        var gmeIDs = [],
            len = selectedIds.length,
            id;

        while (len--) {
            id = this._ComponentID2GMEID[selectedIds[len]];
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
            gmeID = this._ComponentID2GMEID[connID],
            nodeObj;

        if (gmeID) {
            nodeObj = this._client.getNode(gmeID);
            if (nodeObj) {
                this._client.setRegistry(gmeID, REGISTRY_KEYS.LINE_CUSTOM_POINTS, points);
            }
        }
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onFilterNewConnectionDroppableEnds = function (params) {
        var availableConnectionEnds = params.availableConnectionEnds,
            result = [],
            i,
            sourceId,
            targetId,
            validConnectionTypes,
            j,
            parentID = this.currentNodeInfo.id,
            client = this._client,
            aspect = this._selectedAspect,
            p;

        if (params.srcSubCompId === undefined) {
            sourceId = this._ComponentID2GMEID[params.srcId];
        } else {
            sourceId = this._Subcomponent2GMEID[params.srcId][params.srcSubCompId];
        }

        //need to test for each source-destination pair if the connection can be made or not?
        //there is at least one valid connection type definition in the parent
        //  that could be created between the source and target
        //there is at least one valid connection type that really can be created in the parent (max chilren num...)
        validConnectionTypes = GMEConcepts.getValidConnectionTypesFromSourceInAspect(sourceId, parentID, aspect);

        //filter them to see which of those can actually be created as a child of the parent
        i = validConnectionTypes.length;
        while (i--) {
            if (!GMEConcepts.canCreateChild(parentID, validConnectionTypes[i])) {
                validConnectionTypes.splice(i, 1);
            }
        }

        i = availableConnectionEnds.length;
        while (i--) {
            p = availableConnectionEnds[i];
            if (p.dstSubCompID === undefined) {
                targetId = this._ComponentID2GMEID[p.dstItemID];
            } else {
                targetId = this._Subcomponent2GMEID[p.dstItemID][p.dstSubCompID];
            }

            j = validConnectionTypes.length;
            while (j--) {
                if (client.isValidTarget(validConnectionTypes[j], CONSTANTS.POINTER_TARGET, targetId)) {
                    result.push(availableConnectionEnds[i]);
                    break;
                }
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
            result = [],
            newEndPointGMEID,
            oldEndPointGMEID,
            connectionGMEID = this._ComponentID2GMEID[connID];

        if (srcDragged === true) {
            //'src' end of the connection is being dragged
            //'dst end is fix
            if (dstSubCompID !== undefined) {
                oldEndPointGMEID = this._Subcomponent2GMEID[dstItemID][dstSubCompID];
            } else {
                oldEndPointGMEID = this._ComponentID2GMEID[dstItemID];
            }
            //need to check for all possible 'src' if the connection's end could be changed to that value
            i = availableConnectionSources.length;
            while (i--) {
                srcItemID = availableConnectionSources[i].srcItemID;
                srcSubCompID = availableConnectionSources[i].srcSubCompID;
                if (srcSubCompID !== undefined) {
                    newEndPointGMEID = this._Subcomponent2GMEID[srcItemID][srcSubCompID];
                } else {
                    newEndPointGMEID = this._ComponentID2GMEID[srcItemID];
                }

                if (GMEConcepts.isValidConnection(newEndPointGMEID, oldEndPointGMEID, connectionGMEID) === true) {
                    result.push(availableConnectionSources[i]);
                }
            }
        } else {
            //'dst' end of the connection is being dragged
            //'src end is fix
            if (srcSubCompID !== undefined) {
                oldEndPointGMEID = this._Subcomponent2GMEID[srcItemID][srcSubCompID];
            } else {
                oldEndPointGMEID = this._ComponentID2GMEID[srcItemID];
            }
            //need to check for all possible 'dst' if the connection's end could be changed to that value
            i = availableConnectionEnds.length;
            while (i--) {
                dstItemID = availableConnectionEnds[i].dstItemID;
                dstSubCompID = availableConnectionEnds[i].dstSubCompID;
                if (dstSubCompID !== undefined) {
                    newEndPointGMEID = this._Subcomponent2GMEID[dstItemID][dstSubCompID];
                } else {
                    newEndPointGMEID = this._ComponentID2GMEID[dstItemID];
                }
                if (GMEConcepts.isValidConnection(oldEndPointGMEID, newEndPointGMEID, connectionGMEID) === true) {
                    result.push(availableConnectionEnds[i]);
                }
            }
        }

        return result;
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onDragStartDesignerItemDraggable = function (/*itemID*/) {
        var result = true;

        return result;
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onDragStartDesignerItemCopyable = function (itemID) {
        var nodeObj = this._client.getNode(this._ComponentID2GMEID[itemID]),
            result = true;

        if (nodeObj) {
            result = nodeObj.getAttribute('copy') !== 'false';
        }

        return result;
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onDragStartDesignerConnectionCopyable = function (connectionID) {
        return this._onDragStartDesignerItemCopyable(connectionID);
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectionRotated = function (degree,
                                                                                                   selectedIds) {
        var i = selectedIds.length,
            regDegree,
            newDegree,
            ownDegree,
            node,
            setNewValue = true,
            transaction = false,
            gmeID;

        while (i--) {
            gmeID = this._ComponentID2GMEID[selectedIds[i]];
            node = this._client.getNode(gmeID);
            if (node) {
                regDegree = node.getEditableRegistry(REGISTRY_KEYS.ROTATION) || 0;
                ownDegree = node.getOwnEditableRegistry(REGISTRY_KEYS.ROTATION);

                if (degree === DiagramDesignerWidgetConstants.ROTATION_RESET) {
                    newDegree = 0;
                } else if (degree === DiagramDesignerWidgetConstants.ROTATION_TOLEFT) {
                    newDegree = regDegree - (regDegree % 90);
                } else if (degree === DiagramDesignerWidgetConstants.ROTATION_TORIGHT) {
                    newDegree = regDegree % 90 > 0 ? regDegree + 90 - (regDegree % 90) : regDegree;
                } else if (degree === DiagramDesignerWidgetConstants.ROTATION_CLEAR) {
                    setNewValue = false;
                } else {
                    newDegree = (regDegree + degree) % 360;
                }

                if (setNewValue && newDegree !== ownDegree) {
                    if (!transaction) {
                        transaction = true;
                        this._client.startTransaction();
                    }
                    this._client.setRegistry(gmeID, REGISTRY_KEYS.ROTATION, newDegree);
                } else if (!setNewValue && ownDegree !== undefined) {
                    if (!transaction) {
                        transaction = true;
                        this._client.startTransaction();
                    }
                    this._client.delRegistry(gmeID, REGISTRY_KEYS.ROTATION);
                }
            }

        }

        if (transaction) {
            this._client.completeTransaction();
        }
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSetConnectionProperty = function (params) {
        var items = params.items,
            visualParams = params.params,
            gmeIDs = [],
            len = items.length,
            id,
            setObjRegistry,
            client = this._client;

        setObjRegistry = function (objID, paramKey, registryKey) {
            if (visualParams.hasOwnProperty(paramKey)) {
                client.setRegistry(objID, registryKey, visualParams[paramKey]);
            }
        };

        while (len--) {
            id = this._ComponentID2GMEID[items[len]];
            if (id) {
                gmeIDs.push(id);
            }
        }

        len = gmeIDs.length;
        if (len > 0) {
            this._client.startTransaction();

            while (len--) {
                id = gmeIDs[len];
                //set visual properties
                setObjRegistry(id, CONSTANTS.LINE_STYLE.START_ARROW, REGISTRY_KEYS.LINE_START_ARROW);
                setObjRegistry(id, CONSTANTS.LINE_STYLE.END_ARROW, REGISTRY_KEYS.LINE_END_ARROW);
                setObjRegistry(id, CONSTANTS.LINE_STYLE.TYPE, REGISTRY_KEYS.LINE_TYPE);
                setObjRegistry(id, CONSTANTS.LINE_STYLE.PATTERN, REGISTRY_KEYS.LINE_STYLE);
                setObjRegistry(id, CONSTANTS.LINE_STYLE.WIDTH, REGISTRY_KEYS.LINE_WIDTH);
                setObjRegistry(id, CONSTANTS.LINE_STYLE.LABEL_PLACEMENT, REGISTRY_KEYS.LINE_LABEL_PLACEMENT);
            }

            this._client.completeTransaction();
        }
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onCopy = function () {
        var res = [],
            selectedIDs = this.designerCanvas.selectionManager.getSelectedElements(),
            i = selectedIDs.length,
            gmeID,
            obj,
            nodeObj,
            cpData = {
                project: this._client.getActiveProjectId(),
                items: []
            };

        while (i--) {
            gmeID = this._ComponentID2GMEID[selectedIDs[i]];
            obj = {
                ID: gmeID,
                Name: undefined,
                Position: undefined
            };

            nodeObj = this._client.getNode(gmeID);
            if (nodeObj) {
                obj.Name = nodeObj.getAttribute(nodePropertyNames.Attributes.name);
                obj.Position = nodeObj.getRegistry(REGISTRY_KEYS.POSITION);
            }

            res.push(obj);
        }

        cpData.items = res;

        return cpData;
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onPaste = function (data) {
        var len,
            objDesc,
            parentID = this.currentNodeInfo.id,
            params = {parentId: parentID},
            projectName = this._client.getActiveProjectId(),
            childrenIDs = [],
            aspect = this._selectedAspect;

        if (parentID) {
            try {
                data = JSON.parse(data);
            } catch (e) {
                this.logger.error('Invalid clipboard data: "' + data + '"');
                data = undefined;
            }

            if (data && data.project && data.items) {
                if (projectName !== data.project) {
                    alert('Trying to copy from project \'' + data.project + '\' to project \'' + projectName +
                        '\' which is not supported... Copy&Paste is supported in the same project only.');
                } else {
                    if (_.isArray(data.items)) {
                        data = data.items;
                        len = data.length;

                        while (len--) {
                            objDesc = data[len];

                            if (objDesc && objDesc.ID) {
                                params[objDesc.ID] = {};
                                childrenIDs.push(objDesc.ID);
                            }
                        }

                        if (GMEConcepts.canCreateChildrenInAspect(parentID, childrenIDs, aspect)) {
                            this._client.startTransaction();
                            this._client.copyMoreNodes(params);
                            this._client.completeTransaction();
                            this.logger.warn('Pasted ' + childrenIDs.length + ' items successfully into node (' +
                                parentID + ')');
                        } else {
                            this.logger.warn('Can not paste items because not all the items on the clipboard can be ' +
                                'created as a child of the currently opened node (' + parentID + ')');
                        }
                    }
                }
            }
        }
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._getDragItems = function (selectedElements) {
        var res = [],
            i = selectedElements.length;

        while (i--) {
            res.push(this._ComponentID2GMEID[selectedElements[i]]);
        }

        return res;
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._getDragParams = function (selectedElements, event) {
        var oParams = this._oGetDragParams.call(this.designerCanvas, selectedElements, event),
            params = {
                positions: {},
                parentID: this.currentNodeInfo.id
            },
            i;

        for (i in oParams.positions) {
            if (oParams.positions.hasOwnProperty(i)) {
                params.positions[this._ComponentID2GMEID[i]] = oParams.positions[i];
            }
        }

        return params;
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectionContextMenu = function (selectedIds,
                                                                                                       mousePos) {
        var menuItems = {},
            MENU_CONSTRAINTS_NODE = 'connode',
            MENU_CONSTRAINTS_MODEL = 'conmodel',
            MENU_META_RULES_NODE = 'metaRulesNode',
            MENU_META_RULES_MODEL = 'metaRulesModel',
            MENU_EDIT_REPLACEABLE = 'editReplaceable',
            MENU_EXPORT_MODELS = 'exportModels',
            MENU_IMPORT_MODELS = 'importModels',
            node,
            i,
            paths,
            libraryContentSelected = false,
            self = this;

        if (selectedIds.length === 1) {
            menuItems[UI_EVENTS.LOCATE_NODE] = {
                name: 'Locate in tree browser',
                doNotHide: true,
                icon: 'glyphicon glyphicon-screenshot'
            };

            if (GMEConcepts.isReplaceable(self._ComponentID2GMEID[selectedIds[0]])) {
                menuItems[MENU_EDIT_REPLACEABLE] = {
                    name: 'Replace base ...',
                    icon: 'glyphicon glyphicon-transfer'
                };
            }

            menuItems[MENU_META_RULES_NODE] = {
                name: 'Check Meta rules for node',
                icon: 'glyphicon glyphicon-ok-sign'
            };
            menuItems[MENU_META_RULES_MODEL] = {
                name: 'Check Meta rules for node and its children',
                icon: 'glyphicon glyphicon-ok-sign'
            };
            if (self._client.gmeConfig.core.enableCustomConstraints === true) {
                menuItems[MENU_CONSTRAINTS_NODE] = {
                    name: 'Check Custom Constraints for node',
                    icon: 'glyphicon glyphicon-fire'
                };
                menuItems[MENU_CONSTRAINTS_MODEL] = {
                    name: 'Check Custom Constraints for node and its children',
                    icon: 'glyphicon glyphicon-fire'
                };
            }

            node = self._client.getNode(self._ComponentID2GMEID[selectedIds[0]]);

            if (node.isLibraryElement() === false && node.isLibraryRoot() === false) {
                menuItems[MENU_EXPORT_MODELS] = {
                    name: 'Export selected model',
                    icon: 'glyphicon glyphicon-export'
                };
                menuItems[MENU_IMPORT_MODELS] = {
                    name: 'Import models into',
                    icon: 'glyphicon glyphicon-import'
                };
            }

        } else if (selectedIds.length > 1) {
            menuItems[MENU_META_RULES_NODE] = {
                name: 'Check Meta rules for nodes',
                icon: 'glyphicon glyphicon-ok-sign'
            };
            menuItems[MENU_META_RULES_MODEL] = {
                name: 'Check Meta rules for nodes and their children',
                icon: 'glyphicon glyphicon-ok-sign'
            };
            if (self._client.gmeConfig.core.enableCustomConstraints === true) {
                menuItems[MENU_CONSTRAINTS_NODE] = {
                    name: 'Check Custom Constraints for nodes',
                    icon: 'glyphicon glyphicon-fire'
                };
                menuItems[MENU_CONSTRAINTS_MODEL] = {
                    name: 'Check Custom Constraints for nodes and their children',
                    icon: 'glyphicon glyphicon-fire'
                };
            }

            for (i = 0; i < selectedIds.length; i += 1) {
                node = self._client.getNode(self._ComponentID2GMEID[selectedIds[i]]);
                if (node.isLibraryElement() || node.isLibraryRoot()) {
                    libraryContentSelected = true;
                    break;
                }
            }

            if (libraryContentSelected === false) {
                menuItems[MENU_EXPORT_MODELS] = {
                    name: 'Export selected models',
                    icon: 'glyphicon glyphicon-export'
                };
            }
        }

        this.designerCanvas.createMenu(menuItems, function (key) {
                if (key === MENU_CONSTRAINTS_NODE) {
                    self._nodeConCheck(selectedIds, false);
                } else if (key === MENU_CONSTRAINTS_MODEL) {
                    self._nodeConCheck(selectedIds, true);
                } else if (key === MENU_META_RULES_NODE) {
                    self._metaRulesCheck(selectedIds, false);
                } else if (key === MENU_META_RULES_MODEL) {
                    self._metaRulesCheck(selectedIds, true);
                } else if (key === UI_EVENTS.LOCATE_NODE) {
                    self._client.dispatchEvent(UI_EVENTS.LOCATE_NODE, {
                        nodeId: self._ComponentID2GMEID[selectedIds[0]]
                    });
                } else if (key === MENU_EDIT_REPLACEABLE) {
                    self._replaceBaseDialog(self._ComponentID2GMEID[selectedIds[0]]);
                } else if (key === MENU_EXPORT_MODELS) {
                    paths = [];
                    for (i = 0; i < selectedIds.length; i += 1) {
                        paths.push(self._ComponentID2GMEID[selectedIds[i]]);
                    }

                    exporters.exportModels(self._client, self.logger, paths);
                } else if (key === MENU_IMPORT_MODELS) {
                    var importDialog = new ImportModelDialog(self._client, self._logger.fork('ImportModel'));
                    importDialog.show(self._ComponentID2GMEID[selectedIds[0]]);
                }
            },
            this.designerCanvas.posToPageXY(mousePos.mX,
                mousePos.mY)
        );
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._replaceBaseDialog = function (selectedId) {
        var dialog;
        if (typeof selectedId === 'string' && this._client.getNode(selectedId)) {
            dialog = new ReplaceBaseDialog();
            dialog.show({client: this._client, nodeId: selectedId});
        }
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectionAlignMenu = function (selectedIds,
                                                                                                     mousePos) {
        var menuPos = this.designerCanvas.posToPageXY(mousePos.mX, mousePos.mY),
            self = this;

        this._alignMenu.show(selectedIds, menuPos, function (key) {
            self._onAlignSelection(selectedIds, key);
        });
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._metaRulesCheck = function (selectedIds,
                                                                                               includeChildren) {
        var i = selectedIds.length,
            gmeIDs = [];

        while (i--) {
            gmeIDs.push(this._ComponentID2GMEID[selectedIds[i]]);
        }

        if (gmeIDs.length > 0) {
            this._client.checkMetaRules(gmeIDs, includeChildren);
        }
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._nodeConCheck = function (selectedIds,
                                                                                             includeChildren) {
        var i = selectedIds.length,
            gmeIDs = [];

        while (i--) {
            gmeIDs.push(this._ComponentID2GMEID[selectedIds[i]]);
        }

        if (gmeIDs.length > 0) {
            this._client.checkCustomConstraints(gmeIDs, includeChildren);
        }
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectionFillColorChanged = function (selectedElements,
                                                                                                            color) {
        this._onSelectionSetColor(selectedElements, color, REGISTRY_KEYS.COLOR);
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectionBorderColorChanged = function (selectedElements,
                                                                                                              color) {
        this._onSelectionSetColor(selectedElements, color, REGISTRY_KEYS.BORDER_COLOR);
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectionTextColorChanged = function (selectedElements,
                                                                                                            color) {
        this._onSelectionSetColor(selectedElements, color, REGISTRY_KEYS.TEXT_COLOR);
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectionSetColor = function (selectedIds, color,
                                                                                                    regKey) {
        var i = selectedIds.length,
            gmeID;

        this._client.startTransaction();
        while (i--) {
            gmeID = this._ComponentID2GMEID[selectedIds[i]];

            if (color) {
                this._client.setRegistry(gmeID, regKey, color);
            } else {
                this._client.delRegistry(gmeID, regKey);
            }
        }
        this._client.completeTransaction();
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectedTabChanged = function (tabID) {
        if (this._aspects[tabID] && this._selectedAspect !== this._aspects[tabID]) {
            this._selectedAspect = this._aspects[tabID];

            this.logger.debug('selectedAspectChanged: ' + this._selectedAspect);

            this._initializeSelectedAspect(tabID);
        }
    };

    ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype._onAlignSelection = function (selectedIds, type) {
        var selectedModels = [],
            allModels = [],
            target,
            changeXAxis,
            modelId = this.currentNodeInfo.id,
            self = this;

        // Get the gmeIds and filter out connections.
        selectedIds.forEach(function (id) {
            var gmeId = self._ComponentID2GMEID[id],
                objDesc;
            if (self._GMEModels.indexOf(gmeId) > -1) {
                objDesc = self._getObjectDescriptor(gmeId);
                if (objDesc) {
                    selectedModels.push(objDesc);
                } else {
                    self.logger.warn('_onAlignSelection, could not get objectDescriptor for a selectedIds', gmeId);
                }
            }
        });

        if (selectedModels.length === 0) {
            // No models were selected...
            return;
        }

        if (type.indexOf('MOVE_TO_') === 0) {
            self._GMEModels.forEach(function (gmeId) {
                var objDesc = self._getObjectDescriptor(gmeId);
                if (objDesc) {
                    allModels.push(objDesc);
                } else {
                    self.logger.warn('_onAlignSelection, could not get objectDescriptor for a _GMEModels', gmeId);
                }
            });

            target = self._alignMenu.getExtremePosition(allModels, type);
        } else {
            target = selectedModels[0];
        }

        if (!target) {
            return;
        }

        changeXAxis = self._alignMenu.isXAxisType(type);

        this._client.startTransaction();
        selectedModels.forEach(function (modelDesc) {
            var newPos = modelDesc.position;
            if (target.id === modelDesc.id) {
                return;
            }

            if (changeXAxis === true) {
                newPos.x = target.position.x;
            } else {
                newPos.y = target.position.y;
            }

            if (self._selectedAspect === CONSTANTS.ASPECT_ALL) {
                self._client.setRegistry(modelDesc.id, REGISTRY_KEYS.POSITION, newPos);
            } else {
                self._client.addMember(modelId, modelDesc.id, self._selectedAspect);
                self._client.setMemberRegistry(modelId, modelDesc.id, self._selectedAspect, REGISTRY_KEYS.POSITION,
                    newPos);
            }
        });

        this._client.completeTransaction();
    };

    return ModelEditorControlDiagramDesignerWidgetEventHandlers;
});
