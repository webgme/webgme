/*globals define, WebGMEGlobal, _, $*/
/*jshint browser: true */
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger',
    'js/util',
    'common/util/guid',
    'js/Constants',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    'js/Utils/GMEConcepts',
    './MetaRelations',
    './MetaEditorConstants',
    './MetaDocItem',
    'js/DragDrop/DragHelper',
    'js/Dialogs/Confirm/ConfirmDialog',
    'js/Widgets/MetaEditor/MetaEditorPointerNamesDialog'
], function (Logger,
             util,
             generateGuid,
             CONSTANTS,
             nodePropertyNames,
             REGISTRY_KEYS,
             GMEConcepts,
             MetaRelations,
             MetaEditorConstants,
             MetaDocItem,
             DragHelper,
             ConfirmDialog,
             MetaEditorPointerNamesDialog) {

    'use strict';

    var MetaEditorControlDiagramDesignerWidgetEventHandlers,
        DRAG_PARAMS_META_CONTAINER_ID = 'metaContainerID',
        DRAG_PARAMS_ACTIVE_META_ASPECT = 'DRAG_PARAMS_ACTIVE_META_ASPECT',
        MENU_RENAME_CONCEPT = 'conceptRename',
        MENU_RENAME_DEFINITION = 'definitionRename';

    MetaEditorControlDiagramDesignerWidgetEventHandlers = function () {
        this.logger = Logger.create('gme:Panels:MetaEditor:MetaEditorControl.DiagramDesignerWidgetEventHandlers',
            WebGMEGlobal.gmeConfig.client.log);
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers
        .prototype.attachDiagramDesignerWidgetEventHandlers = function () {
        var self = this;

        /*OVERRIDE DESIGNER CANVAS METHODS*/
        this.diagramDesigner.onDesignerItemsMove = function (repositionDesc) {
            self._onDesignerItemsMove(repositionDesc);
        };

        this.diagramDesigner.onCreateNewConnection = function (params) {
            var sourceId = self._ComponentID2GMEID[params.src],
                targetId = self._ComponentID2GMEID[params.dst],
                mixinCheckResult,
                node,
                baseNode,
                confirmDialog = new ConfirmDialog(),
                oldBaseNode;

            if (self._connType === MetaRelations.META_RELATIONS.INHERITANCE) {
                //check if base will be changed so we should notify user about it
                node = self._client.getNode(sourceId);
                if (node) {
                    if (sourceId === targetId) {
                        confirmDialog.show({
                            title: 'Invalid base modification',
                            question: 'The base of an object cannot be itself!',
                            noCancelButton: true
                        }, function () {
                        });
                        return;
                    }

                    if (targetId !== node.getBaseId()) {
                        //TODO probably come up with some detailed list,
                        // what will the target loose and what will it gain

                        baseNode = self._client.getNode(targetId);
                        oldBaseNode = self._client.getNode(node.getBaseId());

                        if (baseNode && oldBaseNode) {
                            if (baseNode.getChildrenIds().length > 0 || oldBaseNode.getChildrenIds().length > 0) {
                                confirmDialog.show({
                                    title: 'Invalid base modification',
                                    question: 'Currently, modification from or to a base ' +
                                    'which has children is not allowed!',
                                    noCancelButton: true
                                }, function () {
                                });
                                return;
                            } else {
                                do {
                                    if (baseNode.getId() === sourceId) {
                                        confirmDialog.show({
                                            title: 'Invalid base modification',
                                            question: 'Change of base node would create circular inheritance!',
                                            noCancelButton: true
                                        }, function () {
                                        });
                                        return;
                                    }
                                    baseNode = self._client.getNode(baseNode.getBaseId());
                                } while (baseNode);
                            }

                            confirmDialog.show({
                                title: 'Confirm base change',
                                question: 'Changing a base can cause invalid data ' +
                                'in the target node and its descendants!'
                            }, function () {
                                self._onCreateNewConnection(params);
                            });
                        } else if (!oldBaseNode) {
                            confirmDialog.show({
                                title: 'Invalid base modification',
                                question: 'Cannot change the base of the FCO!',
                                noCancelButton: true
                            }, function () {
                            });
                        }
                    } else {
                        confirmDialog.show({
                            title: 'Invalid base modification',
                            question: 'Base already set to the new base!',
                            noCancelButton: true
                        }, function () {
                        });
                    }
                } else {
                    self.logger.error('cannot edit base of an unknown node [' + sourceId + ']');
                }
                return;
            } else if (self._connType === MetaRelations.META_RELATIONS.MIXIN) {
                node = self._client.getNode(sourceId);
                if (node) {
                    mixinCheckResult = node.canSetAsMixin(targetId);

                    if (mixinCheckResult.isOk === false) {
                        self.logger.warn('cannot set [' + targetId + '] as mixin for [' + sourceId + ']',
                            mixinCheckResult);
                        confirmDialog.show({
                            title: 'Invalid mixin target',
                            question: mixinCheckResult.reason,
                            noCancelButton: true
                        }, function () {
                        });
                        return;
                    }
                } else {
                    self.logger.error('cannot edit mixin of an unknown node [' + sourceId + ']');
                }
            }

            //not inheritance type connection creation
            self._onCreateNewConnection(params);
        };

        this.diagramDesigner.onSelectionDelete = function (idList) {
            self._onSelectionDelete(idList);
        };

        this.diagramDesigner.onBackgroundDroppableAccept = function (event, dragInfo) {
            return self._onBackgroundDroppableAccept(event, dragInfo);
        };

        this.diagramDesigner.onBackgroundDrop = function (event, dragInfo, position) {
            self._onBackgroundDrop(event, dragInfo, position);
        };

        this.diagramDesigner.onCheckChanged = function (value, isChecked) {
            self._onConnectionTypeFilterCheckChanged(value, isChecked);
        };

        this.diagramDesigner.onConnectionDstTextChanged = function (connId, oldValue, newValue) {
            self._onConnectionDstTextChanged(connId, oldValue, newValue);
        };

        this._oGetDragParams = this.diagramDesigner.getDragParams;
        this.diagramDesigner.getDragParams = function (selectedElements, event) {
            return self._getDragParams(selectedElements, event);
        };

        this.diagramDesigner.getDragItems = function (selectedElements) {
            return self._getDragItems(selectedElements);
        };

        this.diagramDesigner.onSelectionChanged = function (selectedIds) {
            self._onSelectionChanged(selectedIds);
        };

        //oeverriding this just to avoid warning message from DiagramDesignerWidget
        //we don't need to filter it, everybody can be connected to everybody
        this.diagramDesigner.onFilterNewConnectionDroppableEnds = function (params) {
            return params.availableConnectionEnds;
        };

        this.diagramDesigner.onTabAddClicked = function () {
            self._onTabAddClicked();
        };

        this.diagramDesigner.onTabTitleChanged = function (tabID, oldValue, newValue) {
            self._onTabTitleChanged(tabID, oldValue, newValue);
        };

        this.diagramDesigner.onSelectedTabChanged = function (tabID) {
            self._onSelectedTabChanged(tabID);
        };

        this.diagramDesigner.onTabDeleteClicked = function (tabID) {
            self._onTabDeleteClicked(tabID);
        };

        this.diagramDesigner.onTabsSorted = function (newTabIDOrder) {
            self._onTabsSorted(newTabIDOrder);
        };

        this.diagramDesigner.onSelectionFillColorChanged = function (selectedElements, color) {
            self._onSelectionFillColorChanged(selectedElements, color);
        };

        this.diagramDesigner.onSelectionBorderColorChanged = function (selectedElements, color) {
            self._onSelectionBorderColorChanged(selectedElements, color);
        };

        this.diagramDesigner.onSelectionTextColorChanged = function (selectedElements, color) {
            self._onSelectionTextColorChanged(selectedElements, color);
        };

        this.diagramDesigner.onSelectionAlignMenu = function (selectedIds, mousePos) {
            self._onSelectionAlignMenu(selectedIds, mousePos);
        };

        this.diagramDesigner.onAlignSelection = function (selectedIds, type) {
            self._onAlignSelection(selectedIds, type);
        };

        this.diagramDesigner.onInconsistencyLinkClicked = function (gmeId) {
            return self._onInconsistencyLinkClicked(gmeId);
        };

        this.diagramDesigner.onSelectionContextMenu = function (selectedIds, mousePos) {
            self._onSelectionContextMenu(selectedIds, mousePos);
        };
        this.logger.debug('attachDesignerCanvasEventHandlers finished');
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype.__getDocItem = function (docId) {
        return this._metaDocItemsPerSheet[this._selectedMetaAspectSet][docId];
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onDesignerItemsMove = function (repositionDesc) {
        var id,
            posX,
            posY,
            docItem;

        this._client.startTransaction();
        for (id in repositionDesc) {
            posX = repositionDesc[id].x;
            posY = repositionDesc[id].y;

            if (this._ComponentID2GMEID[id]) {
                this._client.setMemberRegistry(this.metaAspectContainerNodeID,
                    this._ComponentID2GMEID[id],
                    this._selectedMetaAspectSet,
                    REGISTRY_KEYS.POSITION,
                    {x: posX, y: posY}
                );
            } else if (this._ComponentID2DocItemID[id]) {
                docItem = this.__getDocItem(this._ComponentID2DocItemID[id]);
                docItem.setProperty('position', {x: posX, y: posY});
            }
        }

        this._client.completeTransaction();
    };

    /**********************************************************/
    /*  HANDLE OBJECT DRAG & DROP ACCEPTANCE                  */
    /**********************************************************/
    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onBackgroundDroppableAccept = function (event,
                                                                                                           dragInfo) {
        var gmeIDList = DragHelper.getDragItems(dragInfo),
            params = DragHelper.getDragParams(dragInfo),
            dragEffects = DragHelper.getDragEffects(dragInfo),
            i,
            accept = false;

        if (this._selectedMetaAspectSet) {
            //accept is self reposition OR dragging from somewhere else and the items are not on the sheet yet
            if (params && params.hasOwnProperty(DRAG_PARAMS_META_CONTAINER_ID)) {
                accept = true;
            } else if (params === MetaEditorConstants.CREATE_META_DOC) {
                accept = true;
            } else {
                if (dragEffects.length === 1 && dragEffects[0] === DragHelper.DRAG_EFFECTS.DRAG_CREATE_INSTANCE) {
                    //dragging from PartBrowser
                    accept = true;
                } else {
                    //return true if there is at least one item among the dragged ones that is not on the sheet yet
                    if (gmeIDList.length > 0 && gmeIDList.indexOf(CONSTANTS.PROJECT_ROOT_ID) === -1) {
                        for (i = 0; i < gmeIDList.length; i += 1) {
                            if (this._metaAspectMembersPerSheet[this._selectedMetaAspectSet].indexOf(gmeIDList[i]) === -1) {
                                accept = true;
                                break;
                            }
                        }
                    }
                }
            }
        }

        return accept;
    };
    /**********************************************************/
    /*  END OF --- HANDLE OBJECT DRAG & DROP ACCEPTANCE       */
    /**********************************************************/

    /**********************************************************/
    /*  HANDLE OBJECT DRAG & DROP TO SHEET                    */
    /**********************************************************/
    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onBackgroundDrop = function (event, dragInfo,
                                                                                                position) {
        var client = this._client,
            aspectNodeID = this.metaAspectContainerNodeID,
            gmeIDList = DragHelper.getDragItems(dragInfo),
            params = DragHelper.getDragParams(dragInfo),
            dragEffects = DragHelper.getDragEffects(dragInfo),
            gmeOrDocId,
            i,
            selectedIDs = [],
            componentID,
            posX,
            posY,
            createParams,
            docItem,
            newGmeID,
            origNode,
            newName;

        //check to see it self drop and reposition or dropping from somewhere else
        if (params === MetaEditorConstants.CREATE_META_DOC) {
            if (this._selectedMetaAspectSet) {
                client.startTransaction();
                MetaDocItem.addNew(client, aspectNodeID, this._selectedMetaAspectSet, position);
                setTimeout(function () {
                    client.completeTransaction();
                }, 10);
            }
        } else if (params &&
            params.hasOwnProperty(DRAG_PARAMS_META_CONTAINER_ID) &&
            params[DRAG_PARAMS_META_CONTAINER_ID] === aspectNodeID &&
            params[DRAG_PARAMS_ACTIVE_META_ASPECT] === this._selectedMetaAspectSet) {

            //params.position holds the old coordinates of the items being dragged
            //update UI
            client.startTransaction();
            this.diagramDesigner.beginUpdate();

            for (gmeOrDocId in params.positions) {
                if (params.positions.hasOwnProperty(gmeOrDocId)) {

                    posX = position.x + params.positions[gmeOrDocId].x;
                    posY = position.y + params.positions[gmeOrDocId].y;

                    if (this._GMEID2ComponentID[gmeOrDocId]) {
                        componentID = this._GMEID2ComponentID[gmeOrDocId];

                        client.setMemberRegistry(aspectNodeID,
                            gmeOrDocId,
                            this._selectedMetaAspectSet,
                            REGISTRY_KEYS.POSITION,
                            {
                                x: posX,
                                y: posY
                            });
                    } else if (this._DocItemID2ComponentID[gmeOrDocId]) {
                        componentID = this._DocItemID2ComponentID[gmeOrDocId];
                        docItem = this.__getDocItem(gmeOrDocId);
                        docItem.setProperty('position', {x: posX, y: posY});
                    }

                    if (componentID) {
                        selectedIDs.push(componentID);
                        this.diagramDesigner.updateDesignerItem(componentID, {position: {x: posX, y: posY}});
                    }
                }
            }

            this.diagramDesigner.endUpdate();
            this.diagramDesigner.select(selectedIDs);

            setTimeout(function () {
                client.completeTransaction();
            }, 10);
        } else {
            if (dragEffects.length === 1 &&
                dragEffects[0] === DragHelper.DRAG_EFFECTS.DRAG_CREATE_INSTANCE &&
                gmeIDList.length === 1) {
                //dragging from PartBrowser
                //create instance of the dragged item with the parent being the MetaContainer,
                //  and add it to the current metasheet + allmetasheet
                client.startTransaction();

                //if the item is not currently in the current META Aspect sheet, add it
                componentID = gmeIDList[0];
                createParams = {
                    parentId: aspectNodeID,
                    baseId: componentID
                };

                newGmeID = client.createChild(createParams);

                if (newGmeID) {
                    //store new position
                    client.setRegistry(newGmeID, REGISTRY_KEYS.POSITION, {
                        x: position.x,
                        y: position.y
                    });

                    //try to set name
                    origNode = client.getNode(componentID);
                    if (origNode) {
                        newName = origNode.getAttribute(nodePropertyNames.Attributes.name) + '_instance';
                        client.setAttribute(newGmeID, nodePropertyNames.Attributes.name, newName);
                    }

                    client.addMember(aspectNodeID, newGmeID, this._selectedMetaAspectSet);
                    client.setMemberRegistry(aspectNodeID,
                        newGmeID,
                        this._selectedMetaAspectSet,
                        REGISTRY_KEYS.POSITION,
                        {
                            x: position.x,
                            y: position.y
                        });

                    //this item has not been part of the META Aspect at all, add it
                    client.addMember(aspectNodeID, newGmeID, MetaEditorConstants.META_ASPECT_SET_NAME);
                    client.setMemberRegistry(aspectNodeID,
                        newGmeID,
                        MetaEditorConstants.META_ASPECT_SET_NAME,
                        REGISTRY_KEYS.POSITION,
                        {
                            x: position.x,
                            y: position.y
                        });
                }

                client.completeTransaction();
            } else {
                //dragging from not the PartBrowser
                client.startTransaction();

                //if the item is not currently in the current META Aspect sheet, add it
                if (gmeIDList.length > 0) {
                    for (i = 0; i < gmeIDList.length; i += 1) {
                        componentID = gmeIDList[i];
                        if (this._metaAspectMembersPerSheet[this._selectedMetaAspectSet].indexOf(componentID) === -1) {

                            posX = position.x;
                            posY = position.y;

                            //when dragging between META ASPECT sheets, read position from dragParams
                            if (params &&
                                params.hasOwnProperty(DRAG_PARAMS_META_CONTAINER_ID) &&
                                params[DRAG_PARAMS_META_CONTAINER_ID] === aspectNodeID &&
                                params[DRAG_PARAMS_ACTIVE_META_ASPECT] !== this._selectedMetaAspectSet) {

                                if (params && params.positions && params.positions[componentID]) {
                                    posX += params.positions[componentID].x;
                                }

                                if (params && params.positions && params.positions[componentID]) {
                                    posY += params.positions[componentID].y;
                                }
                            } else {
                                position.x += 20;
                                position.y += 20;
                            }

                            client.addMember(aspectNodeID, componentID, this._selectedMetaAspectSet);
                            client.setMemberRegistry(aspectNodeID,
                                componentID,
                                this._selectedMetaAspectSet,
                                REGISTRY_KEYS.POSITION,
                                {
                                    x: posX,
                                    y: posY
                                });

                            //if this item has not been part of the META Aspect at all, add it
                            if (this._metaAspectMembersAll.indexOf(componentID) === -1) {
                                client.addMember(aspectNodeID, componentID, MetaEditorConstants.META_ASPECT_SET_NAME);
                                client.setMemberRegistry(aspectNodeID,
                                    componentID,
                                    MetaEditorConstants.META_ASPECT_SET_NAME,
                                    REGISTRY_KEYS.POSITION,
                                    {
                                        x: posX,
                                        y: posY
                                    });
                            }
                        }
                    }
                }

                setTimeout(function () {
                    client.completeTransaction();
                }, 10);
            }
        }
    };
    /**********************************************************/
    /*  END OF --- HANDLE OBJECT DRAG & DROP TO SHEET         */
    /**********************************************************/

    /*************************************************************/
    /*  HANDLE OBJECT / CONNECTION DELETION IN THE ASPECT ASPECT */
    /*************************************************************/
    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectionDelete = function (idList) {
        var client = this._client,
            aspectNodeID = this.metaAspectContainerNodeID,
            len,
            gmeID,
            idx,
            deleteConnection,
            self = this,
            metaInfoToBeLost = [],
            toRemoveFromMeta = [],
            doDelete,
            confirmDialog,
            confirmMsg,
            itemNames,
            nodeObj;

        function clearAllMetaReferences(id) {
            var allMeta = [],
                i,
                metaNodes;

            metaNodes = client.getAllMetaNodes();

            for (i = 0; i < metaNodes.length; i += 1) {
                if (metaNodes[i].isReadOnly()) {
                    //library node
                    continue;
                }
                allMeta.push({
                    node: metaNodes[i],
                    metaJson: metaNodes[i].getOwnJsonMeta()
                });
            }

            allMeta.forEach(function (metaInfo) {
                var sourceID = metaInfo.node.getId();

                if (metaInfo.metaJson.children && metaInfo.metaJson.children.items.indexOf(id) > -1) {
                    client.delChildMeta(sourceID, id);
                }

                if (metaInfo.metaJson.pointers) {
                    Object.keys(metaInfo.metaJson.pointers)
                        .forEach(function (prtOrSetName) {
                            var isSet = true,
                                pointerMetaDescriptor;

                            if (metaInfo.metaJson.pointers[prtOrSetName].items.indexOf(id) > -1) {
                                if (metaInfo.metaJson.pointers[prtOrSetName].min === 1 &&
                                    metaInfo.metaJson.pointers[prtOrSetName].max === 1) {
                                    // Pointer
                                    isSet = false;
                                }

                                client.delPointerMetaTarget(sourceID, prtOrSetName, id);

                                // Check if this were the last rule.
                                pointerMetaDescriptor = client.getValidTargetItems(sourceID, prtOrSetName);
                                if (!pointerMetaDescriptor || pointerMetaDescriptor.length === 0) {
                                    if (isSet === false) {
                                        self._client.delPointerMeta(sourceID, prtOrSetName);
                                        self._client.delPointer(sourceID, prtOrSetName);
                                    } else {
                                        self._client.delPointerMeta(sourceID, prtOrSetName);
                                        self._client.deleteSet(sourceID, prtOrSetName);
                                    }
                                }
                            }
                        });
                }

                if (metaInfo.metaJson.aspects) {
                    Object.keys(metaInfo.metaJson.aspects)
                        .forEach(function (aspectName) {
                            if (metaInfo.metaJson.aspects[aspectName].items.indexOf(id) > -1) {
                                // TODO: Remove validAspectTarget.
                            }
                        });
                }
            });
        }

        this.logger.debug('_onSelectionDelete', idList);

        deleteConnection = function (connectionID) {
            var connDesc = self._connectionListByID[connectionID];

            if (connDesc.type === MetaRelations.META_RELATIONS.CONTAINMENT) {
                self._deleteContainmentRelationship(connDesc.GMESrcId, connDesc.GMEDstId);
            } else if (connDesc.type === MetaRelations.META_RELATIONS.POINTER) {
                self._deletePointerRelationship(connDesc.GMESrcId, connDesc.GMEDstId, connDesc.name, false);
            } else if (connDesc.type === MetaRelations.META_RELATIONS.INHERITANCE) {
                self._deleteInheritanceRelationship(connDesc.GMESrcId, connDesc.GMEDstId);
            } else if (connDesc.type === MetaRelations.META_RELATIONS.MIXIN) {
                self._deleteMixinRelationship(connDesc.GMESrcId, connDesc.GMEDstId);
            } else if (connDesc.type === MetaRelations.META_RELATIONS.SET) {
                self._deletePointerRelationship(connDesc.GMESrcId, connDesc.GMEDstId, connDesc.name, true);
            }
        };

        doDelete = function (itemsToDelete) {
            client.startTransaction();

            len = itemsToDelete.length;
            while (len--) {
                gmeID = self._ComponentID2GMEID[itemsToDelete[len]];
                if (!gmeID && self._ComponentID2DocItemID[itemsToDelete[len]] && self._selectedMetaAspectSet) {
                    MetaDocItem.delete(client, aspectNodeID, self._selectedMetaAspectSet,
                        self._ComponentID2DocItemID[itemsToDelete[len]]);
                    continue;
                }
                idx = self._GMENodes.indexOf(gmeID);
                if (idx !== -1) {
                    //entity is a box --> delete GME object from the aspect's members list
                    client.removeMember(aspectNodeID, gmeID, self._selectedMetaAspectSet);

                    //if the items is not present anywhere else, remove it from the META's global sheet too
                    if (self._metaAspectSheetsPerMember[gmeID].length === 1) {
                        nodeObj = client.getNode(gmeID);
                        if (nodeObj && (nodeObj.isLibraryElement() || nodeObj.isLibraryRoot())) {
                            //library elements will not be lost at all
                            // TODO: If no longer present - shouldn't we clean-up the inverse relations?
                        } else {
                            // TODO: Clean up all meta-nodes with rules referencing this node.

                            toRemoveFromMeta.push(gmeID);
                        }
                    }
                } else if (self._connectionListByID.hasOwnProperty(itemsToDelete[len])) {
                    //entity is a connection, just simply delete it
                    deleteConnection(itemsToDelete[len]);
                }
            }

            // Here we remove all nodes from the meta (after meta-nodes referring to them have been cleaned).
            toRemoveFromMeta.forEach(function (id) {
                client.removeMember(aspectNodeID, id, MetaEditorConstants.META_ASPECT_SET_NAME);
                client.setMeta(id, {});
            });

            client.completeTransaction();
        };

        //first figure out if the deleted-to-be items are present in any other meta sheet
        //if not, ask the user to confirm delete
        len = idList.length;
        while (len--) {
            gmeID = this._ComponentID2GMEID[idList[len]];
            idx = this._GMENodes.indexOf(gmeID);
            if (idx !== -1) {
                //entity is a box
                //check to see if this gmeID is present on any other sheet at all
                if (this._metaAspectSheetsPerMember[gmeID].length === 1) {
                    nodeObj = client.getNode(gmeID);
                    if (nodeObj && (nodeObj.isLibraryElement() || nodeObj.isLibraryRoot())) {
                        //library elements will not be lost at all
                    } else {
                        metaInfoToBeLost.push(gmeID);
                    }
                }
            }
        }

        if (metaInfoToBeLost.length > 0) {
            //need user confirmation because there is some meta info to be lost
            confirmMsg = 'The following items you are about to delete are not present on any other sheet and will ' +
                'be permanently removed from the META aspect:<br><br>';
            itemNames = [];
            len = metaInfoToBeLost.length;
            while (len--) {
                gmeID = metaInfoToBeLost[len];
                nodeObj = client.getNode(gmeID);
                if (nodeObj) {
                    itemNames.push(nodeObj.getAttribute(nodePropertyNames.Attributes.name));
                } else {
                    itemNames.push(gmeID);
                }
            }
            itemNames.sort();
            for (len = 0; len < itemNames.length; len += 1) {
                confirmMsg += '- <b>' + itemNames[len] +
                    '</b>  (all associated meta rules will be deleted for this element)<br>';
            }
            confirmMsg += '<br>Are you sure you want to delete?';

            confirmDialog = new ConfirmDialog();
            confirmDialog.show({
                title: 'Confirm delete',
                htmlQuestion: confirmMsg
            }, function () {
                doDelete(idList);
            });
        } else {
            //trivial deletion
            doDelete(idList);
        }
    };
    /************************************************************************/
    /*  END OF --- HANDLE OBJECT / CONNECTION DELETION IN THE ASPECT ASPECT */
    /************************************************************************/

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._getDragParams = function (selectedElements, event) {
        var oParams = this._oGetDragParams.call(this.diagramDesigner, selectedElements, event),
            params = {positions: {}},
            i;

        params[DRAG_PARAMS_META_CONTAINER_ID] = this.metaAspectContainerNodeID;
        params[DRAG_PARAMS_ACTIVE_META_ASPECT] = this._selectedMetaAspectSet;

        for (i in oParams.positions) {
            if (oParams.positions.hasOwnProperty(i)) {
                params.positions[this._ComponentID2GMEID[i] || this._ComponentID2DocItemID[i]] = oParams.positions[i];
            }
        }

        return params;
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._getDragItems = function (selectedElements) {
        var draggedItems = [],
            len,
            gmeID;

        //get the GME ID's of the dragged items
        len = selectedElements.length;
        while (len--) {
            gmeID = this._ComponentID2GMEID[selectedElements[len]];
            if (this._GMENodes.indexOf(gmeID) !== -1) {
                draggedItems.push(gmeID);
            } else if (this._ComponentID2DocItemID[selectedElements[len]]) {
                draggedItems.push(this._ComponentID2DocItemID[selectedElements[len]]);
            }
        }

        return draggedItems;
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectionChanged = function (selectedIds) {
        var gmeIDs = [],
            len = selectedIds.length,
            id,
            onlyConnectionTypeSelected = selectedIds.length > 0;

        while (len--) {
            id = this._ComponentID2GMEID[selectedIds[len]];
            if (id &&
                this.diagramDesigner.itemIds.indexOf(selectedIds[len]) !== -1) {
                gmeIDs.push(id);

                onlyConnectionTypeSelected = onlyConnectionTypeSelected && GMEConcepts.isConnectionType(id);
            } else {
                onlyConnectionTypeSelected = false;
            }
        }

        WebGMEGlobal.State.registerActiveSelection(gmeIDs, {invoker: this});
    };

    //adding new meta aspect sheet
    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onTabAddClicked = function () {
        var aspectNodeID = this.metaAspectContainerNodeID,
            aspectNode = this._client.getNode(aspectNodeID),
            metaAspectSheetsRegistry = aspectNode.getEditableRegistry(REGISTRY_KEYS.META_SHEETS) || [],
            i,
            len,
            newSetID,
            componentID,
            pos,
            newSheetDesc;

        metaAspectSheetsRegistry.sort(function (a, b) {
            if (a.order < b.order) {
                return -1;
            } else {
                return 1;
            }
        });

        len = metaAspectSheetsRegistry.length;
        for (i = 0; i < len; i += 1) {
            metaAspectSheetsRegistry[i].order = i;
        }

        //start transaction
        this._client.startTransaction();

        //create new aspect set in  meta container node
        newSetID = MetaEditorConstants.META_ASPECT_SHEET_NAME_PREFIX + generateGuid();
        this._client.createSet(aspectNodeID, newSetID);

        newSheetDesc = {
            SetID: newSetID,
            order: metaAspectSheetsRegistry.length,
            title: 'New sheet'
        };

        metaAspectSheetsRegistry.push(newSheetDesc);

        //migrating projects that already have META aspect members but did not have sheets before
        //TODO: not needed in the future,
        //  TODO: but before version 0.4.3 users were able to create META definitions without meta sheets
        //TODO: that needed to be carried over
        //TODO: can be removed sometimes in the future
        if (metaAspectSheetsRegistry.length === 1) {
            len = this._metaAspectMembersAll.length;
            pos = 100;
            while (len--) {
                componentID = this._metaAspectMembersAll[len];
                this._client.addMember(aspectNodeID, componentID, newSetID);
                if (this._metaAspectMembersCoordinatesGlobal[componentID]) {
                    this._client.setMemberRegistry(aspectNodeID,
                        componentID,
                        newSetID,
                        REGISTRY_KEYS.POSITION,
                        {
                            x: this._metaAspectMembersCoordinatesGlobal[componentID].x,
                            y: this._metaAspectMembersCoordinatesGlobal[componentID].y
                        });
                } else {
                    this._client.setMemberRegistry(aspectNodeID,
                        componentID,
                        newSetID,
                        REGISTRY_KEYS.POSITION,
                        {
                            x: pos,
                            y: pos
                        });
                    pos += 30;
                }
            }
        }

        this._client.setRegistry(aspectNodeID, REGISTRY_KEYS.META_SHEETS, metaAspectSheetsRegistry);

        //force switching to the new sheet
        this._selectedMetaAspectSet = newSetID;

        //finish transaction
        this._client.completeTransaction();
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onTabTitleChanged = function (tabID, oldValue,
                                                                                                 newValue) {
        var aspectNodeID = this.metaAspectContainerNodeID,
            aspectNode = this._client.getNode(aspectNodeID),
            metaAspectSheetsRegistry = aspectNode.getEditableRegistry(REGISTRY_KEYS.META_SHEETS) || [],
            i,
            len,
            setID;

        if (this._sheets[tabID]) {
            setID = this._sheets[tabID];

            len = metaAspectSheetsRegistry.length;
            for (i = 0; i < len; i += 1) {
                if (metaAspectSheetsRegistry[i].SetID === setID) {
                    metaAspectSheetsRegistry[i].title = newValue;
                    break;
                }
            }

            this._client.setRegistry(aspectNodeID, REGISTRY_KEYS.META_SHEETS, metaAspectSheetsRegistry);
        }
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectedTabChanged = function (tabID) {
        if (this._sheets && tabID && this._selectedMetaAspectSet !== this._sheets[tabID]) {
            this._selectedMetaAspectSet = this._sheets[tabID];
            this._selectedSheetID = tabID.toString();
            this.logger.debug('selectedAspectChanged: ' + this._selectedMetaAspectSet);

            WebGMEGlobal.State.registerActiveTab(tabID, {invoker: this});
            this._initializeSelectedSheet();
            this.diagramDesigner.selectTab(this._selectedSheetID);
        }
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onTabDeleteClicked = function (tabID) {
        //deleting a sheet invilves deleting all the items present on that sheet
        //if there is an item on this sheet that's not present on any other sheet
        //it needs to be removed from the META Aspect (when user confirms DELETE)
        var aspectToDelete = this._sheets[tabID],
            itemsOfAspect = this._metaAspectMembersPerSheet[aspectToDelete],
            aspectNodeID = this.metaAspectContainerNodeID,
            aspectNode = this._client.getNode(aspectNodeID),
            metaAspectSheetsRegistry = aspectNode.getEditableRegistry(REGISTRY_KEYS.META_SHEETS) || [],
            len,
            gmeID,
            idx,
            metaAspectMemberToBeLost = [],
            _client = this._client,
            doDeleteTab,
            i,
            confirmDialog,
            confirmDialogParams = {title: 'Confirm delete'},
            itemNames,
            nodeObj;

        this.logger.debug('_onTabDeleteClicked', tabID);

        doDeleteTab = function () {
            _client.startTransaction();

            //delete the members of the META aspect who are not present on any other sheet
            len = metaAspectMemberToBeLost.length;
            while (len--) {
                gmeID = metaAspectMemberToBeLost[len];
                _client.removeMember(aspectNodeID, gmeID, MetaEditorConstants.META_ASPECT_SET_NAME);
                _client.setMeta(gmeID, {});
            }

            //delete the sheet
            len = metaAspectSheetsRegistry.length;
            while (len--) {
                if (metaAspectSheetsRegistry[len].SetID === aspectToDelete) {
                    metaAspectSheetsRegistry.splice(len, 1);
                    break;
                }
            }

            //update remaining sheets' order
            metaAspectSheetsRegistry.sort(function (a, b) {
                if (a.order < b.order) {
                    return -1;
                } else {
                    return 1;
                }
            });

            len = metaAspectSheetsRegistry.length;
            for (i = 0; i < len; i += 1) {
                metaAspectSheetsRegistry[i].order = i;
            }

            _client.setRegistry(aspectNodeID, REGISTRY_KEYS.META_SHEETS, metaAspectSheetsRegistry);

            //finally delete the sheet's SET
            _client.deleteSet(aspectNodeID, aspectToDelete);

            _client.completeTransaction();
        };

        //first figure out if the deleted-to-be items are present in any other meta sheet
        //if not, ask the user to confirm delete
        len = itemsOfAspect.length;
        while (len--) {
            gmeID = itemsOfAspect[len];
            idx = this._GMENodes.indexOf(gmeID);
            if (idx !== -1) {
                //entity is a box
                //check to see if this gmeID is present on any other sheet at all
                if (this._metaAspectSheetsPerMember[gmeID].length === 1) {
                    nodeObj = _client.getNode(gmeID);
                    if (nodeObj && (nodeObj.isLibraryElement() || nodeObj.isLibraryRoot())) {
                        //library elements will not be lost
                    } else {
                        metaAspectMemberToBeLost.push(gmeID);
                    }
                }
            }
        }

        if (metaAspectMemberToBeLost.length > 0) {
            //need user confirmation because there is some meta info to be lost
            confirmDialogParams.htmlQuestion = 'You are about to delete a sheet that contains the following items that are not present ' +
                'on any other sheet and will be permanently removed from the META aspect:<br><br>';
            itemNames = [];
            len = metaAspectMemberToBeLost.length;
            while (len--) {
                gmeID = metaAspectMemberToBeLost[len];
                nodeObj = _client.getNode(gmeID);
                if (nodeObj) {
                    itemNames.push(nodeObj.getAttribute(nodePropertyNames.Attributes.name));
                } else {
                    itemNames.push(gmeID);
                }
            }
            itemNames.sort();
            for (len = 0; len < itemNames.length; len += 1) {
                confirmDialogParams.htmlQuestion += '- <b>' + itemNames[len] +
                    '</b> (all associated meta rules will be deleted for this element)<br>';
            }
            confirmDialogParams.htmlQuestion += '<br>Are you sure you want to delete the sheet anyway?';
        } else {
            //no meta member will be lost permanently but make sure that the user really wants to delete the sheet
            confirmDialogParams.question = 'Are you sure you want to delete this sheet?';
        }

        confirmDialog = new ConfirmDialog();
        confirmDialog.show(confirmDialogParams, function () {
            doDeleteTab();
        });
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onTabsSorted = function (newTabIDOrder) {
        var aspectNodeID = this.metaAspectContainerNodeID,
            aspectNode = this._client.getNode(aspectNodeID),
            metaAspectSheetsRegistry = aspectNode.getEditableRegistry(REGISTRY_KEYS.META_SHEETS) || [],
            urlTab = WebGMEGlobal.State.getActiveTab(),
            i,
            j,
            setID;

        for (i = 0; i < newTabIDOrder.length; i += 1) {
            //i is the new order number
            //newTabIDOrder[i] is the sheet identifier
            if (urlTab.toString() === newTabIDOrder[i]) {
                WebGMEGlobal.State.registerActiveTab(i, {invoker: this});
            }
            setID = this._sheets[newTabIDOrder[i]];
            for (j = 0; j < metaAspectSheetsRegistry.length; j += 1) {
                if (metaAspectSheetsRegistry[j].SetID === setID) {
                    metaAspectSheetsRegistry[j].order = i;
                    break;
                }
            }
        }

        metaAspectSheetsRegistry.sort(function (a, b) {
            if (a.order < b.order) {
                return -1;
            } else {
                return 1;
            }
        });

        this._client.setRegistry(aspectNodeID, REGISTRY_KEYS.META_SHEETS, metaAspectSheetsRegistry);
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers
        .prototype._onSelectionFillColorChanged = function (selectedElements, color) {
        this._onSelectionSetColor(selectedElements, color, REGISTRY_KEYS.COLOR);
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers
        .prototype._onSelectionBorderColorChanged = function (selectedElements, color) {
        this._onSelectionSetColor(selectedElements, color, REGISTRY_KEYS.BORDER_COLOR);
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers
        .prototype._onSelectionTextColorChanged = function (selectedElements, color) {
        this._onSelectionSetColor(selectedElements, color, REGISTRY_KEYS.TEXT_COLOR);
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers
        .prototype._onSelectionSetColor = function (selectedIds, color, regKey) {
        var i = selectedIds.length,
            docItem,
            gmeID;

        this._client.startTransaction();
        while (i--) {
            gmeID = this._ComponentID2GMEID[selectedIds[i]];

            if (gmeID) {
                if (color) {
                    this._client.setMemberRegistry(this.metaAspectContainerNodeID,
                        gmeID,
                        MetaEditorConstants.META_ASPECT_SET_NAME,
                        regKey,
                        color);
                } else {
                    this._client.delMemberRegistry(this.metaAspectContainerNodeID,
                        gmeID,
                        MetaEditorConstants.META_ASPECT_SET_NAME,
                        regKey);
                }
            } else if (this._ComponentID2DocItemID[selectedIds[i]]) {
                docItem = this.__getDocItem(this._ComponentID2DocItemID[selectedIds[i]]);
                if (color) {
                    docItem.setProperty(regKey, color);
                } else {
                    docItem.deleteProperty(regKey);
                }
            }
        }

        this._client.completeTransaction();
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectionAlignMenu = function (selectedIds,
                                                                                                    mousePos) {
        var menuPos = this.diagramDesigner.posToPageXY(mousePos.mX, mousePos.mY),
            self = this,
            itemsIds = selectedIds.filter(function (itemId) {
                return self.diagramDesigner.itemIds.indexOf(itemId) > -1;
            });

        this._alignMenu.show(itemsIds, menuPos, function (key) {
            self._onAlignSelection(itemsIds, key);
        });
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onAlignSelection = function (selectedIds, type) {
        var self = this,
            selectedModels,
            allModels,
            result;

        function getItemData(itemId) {
            var item = self.diagramDesigner.items[itemId];

            return {
                id: itemId,
                x: item.positionX,
                y: item.positionY,
                width: item._width,
                height: item._height
            };
        }

        function isItemId(itemId) {
            return self.diagramDesigner.itemIds.indexOf(itemId) > -1;
        }

        selectedModels = selectedIds.filter(isItemId).map(getItemData);

        if (selectedModels.length === 0) {
            // No models were selected...
            return;
        }

        allModels = self.diagramDesigner.itemIds.map(getItemData);

        result = this._alignMenu.getNewPositions(allModels, selectedModels, type);
        if (Object.keys(result).length > 0) {
            self._onDesignerItemsMove(result);
        }
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onInconsistencyLinkClicked = function (gmeId) {
        WebGMEGlobal.State.registerActiveSelection([gmeId]);
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._getNewNameAndPropagationConsent = function
        (srcPath, dstPath, type, key, currentName, callback) {
        var self = this,
            renameDialog = new MetaEditorPointerNamesDialog(),
            confirmDialog = new ConfirmDialog(),
            srcNode = self._client.getNode(srcPath),
            infoText,
            headerLabel,
            existingNames = [],
            notAllowedNames = [];

        if (srcNode === null) {
            callback(false, null, false);
            return;
        }
        switch (type) {
            case 'pointer':
                existingNames = _.without(srcNode.getValidPointerNames(), currentName);
                notAllowedNames = _.union(srcNode.getValidPointerNames(), srcNode.getValidAspectNames(), [currentName]);
                headerLabel = 'Rename Pointer';
                break;
            case 'set':
                existingNames = _.without(srcNode.getValidSetNames(), currentName);
                notAllowedNames = _.union(srcNode.getValidPointerNames(), srcNode.getValidAspectNames(), [currentName]);
                headerLabel = 'Rename Set';
                break;
            default:
                callback(false, null, false);
                return;
        }

        if (key === MENU_RENAME_DEFINITION) {
            infoText = 'This will rename this particular definition of "' + currentName + '".';
        } else if (key === MENU_RENAME_CONCEPT) {
            infoText = 'This will rename this definition of "' + currentName + '" together with all other ' +
                'definitions of "' + currentName + '" defined between any of the bases and instances ' +
                '(including mixins) of the owner and target.';
        }

        renameDialog.show({
            existingNames: existingNames,
            notAllowedNames: notAllowedNames,
            header: headerLabel,
            infoText: infoText,
            newBtnLabel: 'Rename',
            onHideFn: function (newName) {
                if (newName === null) {
                    callback(false, null, false);
                } else {
                    confirmDialog.show({
                        title: 'Propagate Renaming',
                        iconClass: 'fa fa-sitemap',
                        htmlQuestion: $('<div>By default the renaming of a meta definition will only alter the ' +
                            'stored values at the owner of the definition. This can lead to meta-violations by ' +
                            'derived nodes inside the project. <br/><br/>' +
                            'Would you like to propagate the renaming throughout the entire project?</div>'),
                        okLabel: 'Yes',
                        cancelLabel: 'No, only rename the definition',
                        severity: 'info',
                        onHideFn: function (oked) {
                            callback(true, newName, oked);
                        }
                    }, function () {
                    });
                }
            }
        }, function () {
        });
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectionContextMenu = function (selectedIds,
                                                                                                      mousePos) {
        var menuItems = {},
            self = this,
            srcPath,
            dstPath,
            oldName,
            type;

        function afterRenameFn(prevName, newName) {
            return function (err) {
                if (err) {
                    self._client.notifyUser({
                        severity: 'error',
                        message: 'Rename propagation failed with error: ' + err
                    });
                } else {
                    self._client.notifyUser({
                        severity: 'success',
                        message: 'Successfully propagated name change from [' +
                        prevName + '] to [' + newName + '].'
                    });
                }

                self.diagramDesigner.hideProgressbar();
            };
        }

        if (selectedIds.length === 1) {
            if (self._connectionListByID.hasOwnProperty(selectedIds[0]) &&
                (self._connectionListByID[selectedIds[0]].type === 'pointer' ||
                self._connectionListByID[selectedIds[0]].type === 'set')) {
                type = self._connectionListByID[selectedIds[0]].type;
                srcPath = self._connectionListByID[selectedIds[0]].GMESrcId;
                dstPath = self._connectionListByID[selectedIds[0]].GMEDstId;
                oldName = self._connectionListByID[selectedIds[0]].name;

                menuItems[MENU_RENAME_CONCEPT] = {
                    name: 'Rename concept ...'//,
                    // icon: 'glyphicon glyphicon-ok-sign'
                };
                menuItems[MENU_RENAME_DEFINITION] = {
                    name: 'Rename definition ...'//,
                    // icon: 'glyphicon glyphicon-ok-sign'
                };

                this.diagramDesigner.createMenu(menuItems, function (key) {
                        if (key === MENU_RENAME_DEFINITION || key === MENU_RENAME_CONCEPT) {
                            self._getNewNameAndPropagationConsent(srcPath, dstPath, type, key, oldName,
                                function (approved, newName, shouldPropagate) {

                                    if (approved !== true) {
                                        return;
                                    }

                                    if (key === MENU_RENAME_CONCEPT) {
                                        if (shouldPropagate) {
                                            self.diagramDesigner.showProgressbar();
                                            self._client.workerRequests.renameConcept(srcPath, type, oldName, newName,
                                                afterRenameFn(oldName, newName));
                                        } else {
                                            self._client.movePointerMetaTarget(srcPath, dstPath, oldName, newName);
                                        }
                                    } else if (key === MENU_RENAME_DEFINITION) {
                                        if (shouldPropagate) {
                                            self.diagramDesigner.showProgressbar();
                                            self._client.workerRequests.renamePointerTargetDefinition(srcPath, dstPath,
                                                oldName, newName, type === 'set', afterRenameFn(oldName, newName));
                                        } else {
                                            self._client.movePointerMetaTarget(srcPath, dstPath, oldName, newName);
                                        }
                                    }
                                }
                            );
                        }

                    },
                    this.diagramDesigner.posToPageXY(mousePos.mX,
                        mousePos.mY));
            }
        }

    };

    return MetaEditorControlDiagramDesignerWidgetEventHandlers;
});