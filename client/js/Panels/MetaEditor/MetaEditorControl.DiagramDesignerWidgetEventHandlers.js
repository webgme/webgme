"use strict";

define(['logManager',
    'clientUtil',
    'js/Constants',
    'js/NodePropertyNames',
    'js/Utils/GMEConcepts',
    './MetaRelations',
    './MetaEditorConstants',
    'js/DragDrop/DragHelper'], function (logManager,
                                        util,
                                        CONSTANTS,
                                        nodePropertyNames,
                                        GMEConcepts,
                                        MetaRelations,
                                        MetaEditorConstants,
                                        DragHelper) {

    var MetaEditorControlDiagramDesignerWidgetEventHandlers,
        DRAG_PARAMS_META_CONTAINER_ID = 'metaContainerID',
        META_RULES_CONTAINER_NODE_ID = MetaEditorConstants.META_ASPECT_CONTAINER_ID;

    MetaEditorControlDiagramDesignerWidgetEventHandlers = function () {
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype.attachDiagramDesignerWidgetEventHandlers = function () {
        var self = this;

        /*OVERRIDE DESIGNER CANVAS METHODS*/
        this.diagramDesigner.onDesignerItemsMove = function (repositionDesc) {
            self._onDesignerItemsMove(repositionDesc);
        };

        this.diagramDesigner.onCreateNewConnection = function (params) {
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

        this.diagramDesigner.onSetConnectionProperty = function (params) {
            self._onSetConnectionProperty(params);
        };

        //oeverriding this just to avoid warning message from DiagramDesignerWidget
        //we don't need to filter it, everybody can be connected to everybody
        this.diagramDesigner.onFilterNewConnectionDroppableEnds = function (params) {
            return params.availableConnectionEnds;
        };

        this.diagramDesigner.onSheetAddClicked = function () {
            self._onSheetAddClicked();
        };

        this.diagramDesigner.onSheetTitleChanged = function (sheetID, oldValue, newValue) {
            self._onSheetTitleChanged(sheetID, oldValue, newValue);
        };

        this.diagramDesigner.onSelectedSheetChanged = function (sheetID) {
            self._onSelectedSheetChanged(sheetID);
        };

        this.logger.debug("attachDesignerCanvasEventHandlers finished");
    };

    /**********************************************************/
    /*  HANDLE OBJECT DRAG & DROP ACCEPTANCE                  */
    /**********************************************************/
    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onBackgroundDroppableAccept = function (event, dragInfo) {
        var gmeIDList = DragHelper.getDragItems(dragInfo),
            params = DragHelper.getDragParams(dragInfo),
            dragEffects = DragHelper.getDragEffects(dragInfo),
            i,
            accept = false;

        if (this._selectedMetaAspectSet) {
            //accept is self reposition OR dragging from somewhere else and the items are not on the sheet yet
            if (params && params.hasOwnProperty(DRAG_PARAMS_META_CONTAINER_ID)) {
                if (gmeIDList.length === 0) {
                    accept = true;
                }
            } else {
                if (dragEffects.length === 1 &&
                    dragEffects[0] === DragHelper.DRAG_EFFECTS.DRAG_CREATE_INSTANCE) {
                    //dragging from PartBrowser
                    accept = false;
                } else {
                    //return true if there is at least one item among the dragged ones that is not on the sheet yet
                    if (gmeIDList.length > 0) {
                        for (i = 0; i < gmeIDList.length; i+= 1) {
                            if (this._metaAspectMembersPerSheet[this._selectedMetaAspectSet].indexOf(gmeIDList[i]) === -1 ) {
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
    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onBackgroundDrop = function (event, dragInfo, position) {
        var _client = this._client,
            aspectNodeID = this.currentNodeInfo.id,
            gmeIDList = DragHelper.getDragItems(dragInfo),
            params = DragHelper.getDragParams(dragInfo),
            i,
            selectedIDs = [],
            componentID,
            posX,
            posY;

        //check to see it self drop and reposition or dropping from somewhere else
        if (params && params.hasOwnProperty(DRAG_PARAMS_META_CONTAINER_ID) && params[DRAG_PARAMS_META_CONTAINER_ID] === aspectNodeID) {
            if (gmeIDList.length === 0) {
                //params.position holds the old coordinates of the items being dragged
                //update UI
                _client.startTransaction();
                this.diagramDesigner.beginUpdate();

                for (i in params.positions) {
                    if (params.positions.hasOwnProperty(i)) {

                        posX = position.x + params.positions[i].x;
                        posY = position.y + params.positions[i].y;
                        _client.setMemberRegistry(aspectNodeID, i, this._selectedMetaAspectSet, MetaEditorConstants.META_ASPECT_MEMBER_POSITION_REGISTRY_KEY, {'x': posX, 'y': posY} );

                        componentID = this._GMEID2ComponentID[i];

                        selectedIDs.push(componentID);
                        this.diagramDesigner.updateDesignerItem(componentID, { "position": {'x': posX, 'y': posY}});
                    }
                }

                this.diagramDesigner.endUpdate();
                this.diagramDesigner.select(selectedIDs);

                _client.completeTransaction();
            }
        } else {
            _client.startTransaction();

            //if the item is not currently in the current META Aspect sheet, add it
            if (gmeIDList.length > 0) {
                for (i = 0; i < gmeIDList.length; i += 1) {
                    componentID = gmeIDList[i];
                    if (this._metaAspectMembersPerSheet[this._selectedMetaAspectSet].indexOf(componentID) === -1) {
                        _client.addMember(aspectNodeID, componentID, this._selectedMetaAspectSet);
                        _client.setMemberRegistry(aspectNodeID, componentID, this._selectedMetaAspectSet, MetaEditorConstants.META_ASPECT_MEMBER_POSITION_REGISTRY_KEY, {'x': position.x, 'y': position.y} );

                        //if this item has not been part of the META Aspect at all, add it
                        if (this._metaAspectMembersAll.indexOf(componentID) === -1) {
                            _client.addMember(aspectNodeID, componentID, MetaEditorConstants.META_ASPECT_SET_NAME);
                            _client.setMemberRegistry(aspectNodeID, componentID, MetaEditorConstants.META_ASPECT_SET_NAME, MetaEditorConstants.META_ASPECT_MEMBER_POSITION_REGISTRY_KEY, {'x': position.x, 'y': position.y} );
                        }

                        position.x += 20;
                        position.y += 20;
                    }
                }
            }

            _client.completeTransaction();
        }
    };
    /**********************************************************/
    /*  END OF --- HANDLE OBJECT DRAG & DROP TO SHEET         */
    /**********************************************************/


    /**********************************************************/
    /*  HANDLE OBJECT REPOSITION IN THE ASPECT ASPECT         */
    /**********************************************************/
    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onDesignerItemsMove = function (repositionDesc) {
        var _client = this._client,
            aspectNodeID = this.currentNodeInfo.id,
            members = this.currentNodeInfo.members,
            id,
            gmeID;

        _client.startTransaction();

        for (id in repositionDesc) {
            if (repositionDesc.hasOwnProperty(id)) {
                gmeID = this._ComponentID2GMEID[id];
                if (members.indexOf(gmeID) !== -1) {
                    _client.setMemberRegistry(aspectNodeID, gmeID, MetaEditorConstants.META_ASPECT_SET_NAME, MetaEditorConstants.META_ASPECT_MEMBER_POSITION_REGISTRY_KEY, { "x": repositionDesc[id].x,"y": repositionDesc[id].y} );
                }
            }
        }

        _client.completeTransaction();
    };
    /************************************************************/
    /* END OF --- HANDLE OBJECT REPOSITION IN THE ASPECT ASPECT */
    /************************************************************/


    /*************************************************************/
    /*  HANDLE OBJECT / CONNECTION DELETION IN THE ASPECT ASPECT */
    /*************************************************************/
    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectionDelete = function (idList) {
        var _client = this._client,
            aspectNodeID = this.currentNodeInfo.id,
            len = idList.length,
            gmeID,
            idx,
            deleteConnection,
            self = this;

        deleteConnection = function (connectionID) {
            var connDesc = self._connectionListByID[connectionID];

            if (connDesc.type === MetaRelations.META_RELATIONS.CONTAINMENT) {
                self._deleteContainmentRelationship(connDesc.GMESrcId, connDesc.GMEDstId);
            } else if (connDesc.type === MetaRelations.META_RELATIONS.POINTER) {
                self._deletePointerRelationship(connDesc.GMESrcId, connDesc.GMEDstId, connDesc.name, false);
            } else if (connDesc.type === MetaRelations.META_RELATIONS.INHERITANCE) {
                self._deleteInheritanceRelationship(connDesc.GMESrcId, connDesc.GMEDstId);
            } else if (connDesc.type === MetaRelations.META_RELATIONS.POINTERLIST) {
                self._deletePointerRelationship(connDesc.GMESrcId, connDesc.GMEDstId, connDesc.name, true);
            }
        };

        _client.startTransaction();

        while (len--) {
            gmeID = this._ComponentID2GMEID[idList[len]];
            idx = this.currentNodeInfo.members.indexOf(gmeID);
            if ( idx !== -1) {
                //entity is a box --> delete GME object from the aspect's members list
                _client.removeMember(aspectNodeID, gmeID, MetaEditorConstants.META_ASPECT_SET_NAME);
            } else if (this._connectionListByID.hasOwnProperty(idList[len])) {
                //entity is a connection, just simply delete it
                deleteConnection(idList[len]);
            }
        }

        _client.completeTransaction();
    };
    /************************************************************************/
    /*  END OF --- HANDLE OBJECT / CONNECTION DELETION IN THE ASPECT ASPECT */
    /************************************************************************/


    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._getDragParams = function (selectedElements, event) {
        var oParams = this._oGetDragParams.call(this.diagramDesigner, selectedElements, event),
            params = { 'positions': {} },
            i;

        params[DRAG_PARAMS_META_CONTAINER_ID] = this.currentNodeInfo.id;

        for (i in oParams.positions) {
            if (oParams.positions.hasOwnProperty(i)) {
                params.positions[this._ComponentID2GMEID[i]] = oParams.positions[i];
            }
        }

        return params;
    };


    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._getDragItems = function (selectedElements) {
        return [];
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

        this.diagramDesigner.toolbarItems.ddbtnConnectionArrowStart.enabled(onlyConnectionTypeSelected);
        this.diagramDesigner.toolbarItems.ddbtnConnectionPattern.enabled(onlyConnectionTypeSelected);
        this.diagramDesigner.toolbarItems.ddbtnConnectionArrowEnd.enabled(onlyConnectionTypeSelected);
        this.diagramDesigner.toolbarItems.ddbtnConnectionLineType.enabled(onlyConnectionTypeSelected);

        //nobody is selected on the canvas
        //set the active selection to the opened guy
        if (gmeIDs.length === 0 && this.currentNodeInfo.id) {
            gmeIDs.push(this.currentNodeInfo.id);
        }

        if (gmeIDs.length !== 0) {
            this._client.setPropertyEditorIdList(gmeIDs);
        }
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSetConnectionProperty = function (params) {
        var items = params.items,
            visualParams = params.params,
            len = items.length,
            id,
            connRegLineStyle;

        this._client.startTransaction();

        while (len--) {
            id = this._ComponentID2GMEID[items[len]];
            if (id && GMEConcepts.isConnectionType(id)) {
                connRegLineStyle = this._client.getNode(id).getEditableRegistry(nodePropertyNames.Registry.lineStyle);
                if (connRegLineStyle && !_.isEmpty(connRegLineStyle)) {
                    _.extend(connRegLineStyle, visualParams);
                    this._client.setRegistry(id, nodePropertyNames.Registry.lineStyle, connRegLineStyle);
                }
            }
        }

        this._client.completeTransaction();
    };

    //adding new meta aspect sheet
    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSheetAddClicked = function () {
        var aspectNodeID = this.currentNodeInfo.id,
            aspectNode = this._client.getNode(aspectNodeID),
            metaAspectSheetsRegistry = aspectNode.getEditableRegistry(MetaEditorConstants.META_SHEET_REGISTRY_KEY) || [],
            i,
            len,
            sheetID,
            newSetID;

        metaAspectSheetsRegistry.sort(function (a, b) {
            if (a.order < b.order) {
                return -1;
            } else {
                return 1;
            }
        });

        len = metaAspectSheetsRegistry.length;
        for (i = 0; i < len; i += 1) {
            metaAspectSheetsRegistry.order = i;
        }

        //start transaction
        this._client.startTransaction();

        //create new aspect set in  meta container node
        newSetID = MetaEditorConstants.META_ASPECT_SHEET_NAME_PREFIX + (aspectNode.getSetNames().length + 1);
        this._client.createSet(aspectNodeID, newSetID);

        var newSheetDesc = {'SetID': newSetID,
                            'order': metaAspectSheetsRegistry.length,
                            'title': 'New sheet'};

        metaAspectSheetsRegistry.push(newSheetDesc);

        this._client.setRegistry(aspectNodeID, MetaEditorConstants.META_SHEET_REGISTRY_KEY, metaAspectSheetsRegistry);

        //finish transaction
        this._client.completeTransaction();
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSheetTitleChanged = function (sheetID, oldValue, newValue) {
        var aspectNodeID = this.currentNodeInfo.id,
            aspectNode = this._client.getNode(aspectNodeID),
            metaAspectSheetsRegistry = aspectNode.getEditableRegistry(MetaEditorConstants.META_SHEET_REGISTRY_KEY) || [],
            i,
            len,
            setID;

        if (this._sheets[sheetID]) {
            setID = this._sheets[sheetID];

            len = metaAspectSheetsRegistry.length;
            for (i = 0; i < len; i += 1) {
                if (metaAspectSheetsRegistry[i].SetID === setID) {
                    metaAspectSheetsRegistry[i].title = newValue;
                    break;
                }
            }

            this._client.setRegistry(aspectNodeID, MetaEditorConstants.META_SHEET_REGISTRY_KEY, metaAspectSheetsRegistry);
        }
    };

    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectedSheetChanged = function (sheetID) {
        if (this._sheets[sheetID] && this._selectedMetaAspectSet !== this._sheets[sheetID]) {
            this._selectedMetaAspectSet = this._sheets[sheetID];

            this.logger.warning('selectedAspectChanged: ' + this._selectedMetaAspectSet);

            this.selectedObjectChanged(META_RULES_CONTAINER_NODE_ID);
        }
    };


    return MetaEditorControlDiagramDesignerWidgetEventHandlers;
});
