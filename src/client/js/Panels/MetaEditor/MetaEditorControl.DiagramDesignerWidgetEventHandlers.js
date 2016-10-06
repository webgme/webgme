/*globals define, WebGMEGlobal*/
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
    'js/DragDrop/DragHelper',
    'js/Controls/Dialog'
], function (Logger,
             util,
             generateGuid,
             CONSTANTS,
             nodePropertyNames,
             REGISTRY_KEYS,
             GMEConcepts,
             MetaRelations,
             MetaEditorConstants,
             DragHelper,
             dialog) {

    'use strict';

    var MetaEditorControlDiagramDesignerWidgetEventHandlers,
        DRAG_PARAMS_META_CONTAINER_ID = 'metaContainerID',
        DRAG_PARAMS_ACTIVE_META_ASPECT = 'DRAG_PARAMS_ACTIVE_META_ASPECT';

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
                oldBaseNode;

            if (self._connType === MetaRelations.META_RELATIONS.INHERITANCE) {
                //check if base will be changed so we should notify user about it
                node = self._client.getNode(sourceId);
                if (node) {
                    if (sourceId === targetId) {
                        dialog.alert('Invalid base modification',
                            'The base of an object cannot be itself!',
                            function () {
                            }
                        );
                        return;
                    }

                    if (targetId !== node.getBaseId()) {
                        //TODO probably come up with some detailed list,
                        // what will the target loose and what will it gain

                        baseNode = self._client.getNode(targetId);
                        oldBaseNode = self._client.getNode(node.getBaseId());

                        if (baseNode && oldBaseNode) {
                            if (baseNode.getChildrenIds().length > 0 || oldBaseNode.getChildrenIds().length > 0) {
                                dialog.alert('Invalid base modification',
                                    'Currently, modification from or to a base which has children is not allowed!',
                                    function () {

                                    }
                                );
                                return;
                            } else {
                                do {
                                    if (baseNode.getId() === sourceId) {
                                        dialog.alert('Invalid base modification',
                                            'Change of base node would create circular inheritance!',
                                            function () {

                                            }
                                        );
                                        return;
                                    }
                                    baseNode = self._client.getNode(baseNode.getBaseId());
                                } while (baseNode);
                            }

                            dialog.confirm('Confirm base change',
                                'Changing a base can cause invalid data in the target node and its descendants!',
                                function () {
                                    self._onCreateNewConnection(params);
                                }
                            );
                        } else if (!oldBaseNode) {
                            dialog.alert('Invalid base modification',
                                'Cannot change the base of the FCO!',
                                function () {
                                }
                            );
                        }
                    } else {
                        dialog.alert('Invalid base modification',
                            'Base already set to the new base!',
                            function () {
                            }
                        );
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
                        dialog.alert('Invalid mixin target',
                            mixinCheckResult.reason,
                            function () {

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

        this.logger.debug('attachDesignerCanvasEventHandlers finished');
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onDesignerItemsMove = function (repositionDesc) {
        var id;

        this._client.startTransaction();
        for (id in repositionDesc) {
            if (repositionDesc.hasOwnProperty(id)) {
                this._client.setMemberRegistry(this.metaAspectContainerNodeID,
                    this._ComponentID2GMEID[id],
                    this._selectedMetaAspectSet,
                    REGISTRY_KEYS.POSITION,
                    {
                        x: repositionDesc[id].x,
                        y: repositionDesc[id].y
                    });
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
            } else {
                if (dragEffects.length === 1 &&
                    dragEffects[0] === DragHelper.DRAG_EFFECTS.DRAG_CREATE_INSTANCE) {
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
        var _client = this._client,
            aspectNodeID = this.metaAspectContainerNodeID,
            gmeIDList = DragHelper.getDragItems(dragInfo),
            params = DragHelper.getDragParams(dragInfo),
            i,
            selectedIDs = [],
            componentID,
            posX,
            posY,
            dragEffects = DragHelper.getDragEffects(dragInfo),
            createParams,

            newGmeID,
            origNode,
            newName;

        //check to see it self drop and reposition or dropping from somewhere else
        if (params &&
            params.hasOwnProperty(DRAG_PARAMS_META_CONTAINER_ID) &&
            params[DRAG_PARAMS_META_CONTAINER_ID] === aspectNodeID &&
            params[DRAG_PARAMS_ACTIVE_META_ASPECT] === this._selectedMetaAspectSet) {

            //params.position holds the old coordinates of the items being dragged
            //update UI
            _client.startTransaction();
            this.diagramDesigner.beginUpdate();

            for (i in params.positions) {
                if (params.positions.hasOwnProperty(i)) {

                    posX = position.x + params.positions[i].x;
                    posY = position.y + params.positions[i].y;
                    _client.setMemberRegistry(aspectNodeID,
                        i,
                        this._selectedMetaAspectSet,
                        REGISTRY_KEYS.POSITION,
                        {
                            x: posX,
                            y: posY
                        });

                    componentID = this._GMEID2ComponentID[i];

                    selectedIDs.push(componentID);
                    this.diagramDesigner.updateDesignerItem(componentID, {position: {x: posX, y: posY}});
                }
            }

            this.diagramDesigner.endUpdate();
            this.diagramDesigner.select(selectedIDs);

            setTimeout(function () {
                _client.completeTransaction();
            }, 10);
        } else {
            if (dragEffects.length === 1 &&
                dragEffects[0] === DragHelper.DRAG_EFFECTS.DRAG_CREATE_INSTANCE &&
                gmeIDList.length === 1) {
                //dragging from PartBrowser
                //create instance of the dragged item with the parent being the MetaContainer,
                //  and add it to the current metasheet + allmetasheet
                _client.startTransaction();

                //if the item is not currently in the current META Aspect sheet, add it
                componentID = gmeIDList[0];
                createParams = {
                    parentId: aspectNodeID,
                    baseId: componentID
                };

                newGmeID = _client.createChild(createParams);

                if (newGmeID) {
                    //store new position
                    _client.setRegistry(newGmeID, REGISTRY_KEYS.POSITION, {
                        x: position.x,
                        y: position.y
                    });

                    //try to set name
                    origNode = _client.getNode(componentID);
                    if (origNode) {
                        newName = origNode.getAttribute(nodePropertyNames.Attributes.name) + '_instance';
                        _client.setAttributes(newGmeID, nodePropertyNames.Attributes.name, newName);
                    }

                    _client.addMember(aspectNodeID, newGmeID, this._selectedMetaAspectSet);
                    _client.setMemberRegistry(aspectNodeID,
                        newGmeID,
                        this._selectedMetaAspectSet,
                        REGISTRY_KEYS.POSITION,
                        {
                            x: position.x,
                            y: position.y
                        });

                    //this item has not been part of the META Aspect at all, add it
                    _client.addMember(aspectNodeID, newGmeID, MetaEditorConstants.META_ASPECT_SET_NAME);
                    _client.setMemberRegistry(aspectNodeID,
                        newGmeID,
                        MetaEditorConstants.META_ASPECT_SET_NAME,
                        REGISTRY_KEYS.POSITION,
                        {
                            x: position.x,
                            y: position.y
                        });
                }

                _client.completeTransaction();
            } else {
                //dragging from not the PartBrowser
                _client.startTransaction();

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

                            _client.addMember(aspectNodeID, componentID, this._selectedMetaAspectSet);
                            _client.setMemberRegistry(aspectNodeID,
                                componentID,
                                this._selectedMetaAspectSet,
                                REGISTRY_KEYS.POSITION,
                                {
                                    x: posX,
                                    y: posY
                                });

                            //if this item has not been part of the META Aspect at all, add it
                            if (this._metaAspectMembersAll.indexOf(componentID) === -1) {
                                _client.addMember(aspectNodeID, componentID, MetaEditorConstants.META_ASPECT_SET_NAME);
                                _client.setMemberRegistry(aspectNodeID,
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
                    _client.completeTransaction();
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
        var _client = this._client,
            aspectNodeID = this.metaAspectContainerNodeID,
            len,
            gmeID,
            idx,
            deleteConnection,
            self = this,
            metaInfoToBeLost = [],
            doDelete,

            confirmMsg,
            itemNames,
            nodeObj;

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
            _client.startTransaction();

            len = itemsToDelete.length;
            while (len--) {
                gmeID = self._ComponentID2GMEID[itemsToDelete[len]];
                idx = self._GMENodes.indexOf(gmeID);
                if (idx !== -1) {
                    //entity is a box --> delete GME object from the aspect's members list
                    _client.removeMember(aspectNodeID, gmeID, self._selectedMetaAspectSet);

                    //if the items is not present anywhere else, remove it from the META's global sheet too
                    if (self._metaAspectSheetsPerMember[gmeID].length === 1) {
                        nodeObj = _client.getNode(gmeID);
                        if (nodeObj && (nodeObj.isLibraryElement() || nodeObj.isLibraryRoot())) {
                            //library elements will not be lost at all
                        } else {
                            _client.removeMember(aspectNodeID, gmeID, MetaEditorConstants.META_ASPECT_SET_NAME);
                            _client.setMeta(gmeID, {});
                        }
                    }
                } else if (self._connectionListByID.hasOwnProperty(itemsToDelete[len])) {
                    //entity is a connection, just simply delete it
                    deleteConnection(itemsToDelete[len]);
                }
            }

            _client.completeTransaction();
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
                    nodeObj = _client.getNode(gmeID);
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
                nodeObj = _client.getNode(gmeID);
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
            dialog.confirm('Confirm delete', confirmMsg, function () {
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
                params.positions[this._ComponentID2GMEID[i]] = oParams.positions[i];
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

        // lineStyleControls are disabled in meta-editor.

        //this.diagramDesigner.toolbarItems.ddbtnConnectionArrowStart.enabled(onlyConnectionTypeSelected);
        //this.diagramDesigner.toolbarItems.ddbtnConnectionPattern.enabled(onlyConnectionTypeSelected);
        //this.diagramDesigner.toolbarItems.ddbtnConnectionArrowEnd.enabled(onlyConnectionTypeSelected);
        //this.diagramDesigner.toolbarItems.ddbtnConnectionLineType.enabled(onlyConnectionTypeSelected);
        //this.diagramDesigner.toolbarItems.ddbtnConnectionLineWidth.enabled(onlyConnectionTypeSelected);
        this._settingActiveSelection = true;
        WebGMEGlobal.State.registerActiveSelection(gmeIDs);
        this._settingActiveSelection = false;
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

            WebGMEGlobal.State.registerActiveTab(tabID);
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
            confirmMsg,
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
            confirmMsg = 'You are about to delete a sheet that contains the following items that are not present ' +
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
                confirmMsg += '- <b>' + itemNames[len] +
                    '</b> (all associated meta rules will be deleted for this element)<br>';
            }
            confirmMsg += '<br>Are you sure you want to delete the sheet anyway?';
            dialog.confirm('Confirm delete', confirmMsg, function () {
                doDeleteTab();
            });
        } else {
            //no meta member will be lost permanently but make sure that the user really wants to delete the sheet
            confirmMsg = 'Are you sure you want to delete this sheet?';
            dialog.confirm('Confirm delete', confirmMsg, function () {
                doDeleteTab();
            });
        }
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onTabsSorted = function (newTabIDOrder) {
        var aspectNodeID = this.metaAspectContainerNodeID,
            aspectNode = this._client.getNode(aspectNodeID),
            metaAspectSheetsRegistry = aspectNode.getEditableRegistry(REGISTRY_KEYS.META_SHEETS) || [],
            i,
            j,
            urlTab = WebGMEGlobal.State.getActiveTab(),
            setID;

        for (i = 0; i < newTabIDOrder.length; i += 1) {
            //i is the new order number
            //newTabIDOrder[i] is the sheet identifier
            if (urlTab === newTabIDOrder[i]) {
                WebGMEGlobal.State.registerActiveTab(i);
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
            gmeID;

        this._client.startTransaction();
        while (i--) {
            gmeID = this._ComponentID2GMEID[selectedIds[i]];

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
        }
        this._client.completeTransaction();
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectionAlignMenu = function (selectedIds,
                                                                                                    mousePos) {
        var menuPos = this.diagramDesigner.posToPageXY(mousePos.mX, mousePos.mY),
            self = this;

        this._alignMenu.show(selectedIds, menuPos, function (key) {
            self._onAlignSelection(selectedIds, key);
        });
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onAlignSelection = function (selectedIds, type) {
        var params = {
            client: this._client,
            modelId: this.metaAspectContainerNodeID,
            idMap: this._ComponentID2GMEID,
            setName: this._selectedMetaAspectSet,
            coordinates: this._metaAspectMembersCoordinatesPerSheet[this._selectedMetaAspectSet]
        };

        if (params.coordinates) {
            this._alignMenu.alignSetSelection(params, selectedIds, type);
        }
    };

    return MetaEditorControlDiagramDesignerWidgetEventHandlers;
});
