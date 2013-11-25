"use strict";

define(['logManager',
    'clientUtil',
    'js/Constants',
    'js/NodePropertyNames',
    'js/Utils/GMEConcepts',
    './MetaRelations',
    'js/DragDrop/DragHelper'], function (logManager,
                                        util,
                                        CONSTANTS,
                                        nodePropertyNames,
                                        GMEConcepts,
                                        MetaRelations,
                                        DragHelper) {

    var MetaEditorControlDiagramDesignerWidgetEventHandlers,
        DRAG_PARAMS_META_CONTAINER_ID = 'metaContainerID';

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

        this.logger.debug("attachDesignerCanvasEventHandlers finished");
    };

    /**********************************************************/
    /*  HANDLE OBJECT DRAG & DROP ACCEPTANCE                  */
    /**********************************************************/
    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onBackgroundDroppableAccept = function (event, dragInfo) {
        var gmeIDList = DragHelper.getDragItems(dragInfo),
            params = DragHelper.getDragParams(dragInfo),
            i,
            accept = false;

        //accept is self reposition OR dragging from somewhere else and the items are not on the sheet yet
        if (params && params.hasOwnProperty(DRAG_PARAMS_META_CONTAINER_ID)) {
            if (gmeIDList.length === 0) {
                accept = true;
            }
        } else {
            //return true if there is at least one item among the dragged ones that is not on the sheet yet
            if (gmeIDList.length > 0) {
                for (i = 0; i < gmeIDList.length; i+= 1) {
                    if (this._GMENodes.indexOf(gmeIDList[i]) === -1 ) {
                        accept = true;
                        break;
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
        var gmeIDList = DragHelper.getDragItems(dragInfo),
            params = DragHelper.getDragParams(dragInfo),
            cNode = this._client.getNode(this.currentNodeInfo.id),
            registry = cNode.getEditableRegistry(this._META_EDITOR_REGISTRY_KEY) || this._emptyMetaEditorRegistry(),
            i,
            addMember,
            repositionMember,
            selectedIDs = [],
            componentID;

        addMember = function (gmeID, position) {
            var added = false;

            if (registry.Members.indexOf(gmeID) === -1) {
                registry.Members.push(gmeID);
                registry.MemberCoord[gmeID] = { "x": position.x,
                    "y": position.y};

                added = true;
            }

            return added;
        };

        repositionMember = function (gmeID, position) {
            if (registry.Members.indexOf(gmeID) !== -1) {
                registry.MemberCoord[gmeID] = { "x": position.x,
                    "y": position.y};
            }
        };

        //check to see it self drop and reposition or dropping fro somewhere else
        if (params && params.hasOwnProperty(DRAG_PARAMS_META_CONTAINER_ID) && params[DRAG_PARAMS_META_CONTAINER_ID] === this.currentNodeInfo.id) {
            if (gmeIDList.length === 0) {
                //params.position holds the old coordinates of the items being dragged
                //update UI
                this.diagramDesigner.beginUpdate();

                for (i in params.positions) {
                    if (params.positions.hasOwnProperty(i)) {
                        repositionMember(i, {'x': position.x + params.positions[i].x,
                                             'y': position.y + params.positions[i].y});

                        componentID = this._GMEID2ComponentID[i];

                        selectedIDs.push(componentID);
                        this.diagramDesigner.updateDesignerItem(componentID, { "position": {"x": position.x + params.positions[i].x, "y": position.y + params.positions[i].y }});
                    }
                }

                this.diagramDesigner.endUpdate();
                this.diagramDesigner.select(selectedIDs);
            }
        } else {
            //return true if there is at least one item among the dragged ones that is not on the sheet yet
            if (gmeIDList.length > 0) {
                for (i = 0; i < gmeIDList.length; i += 1) {
                    if (addMember(gmeIDList[i], position)) {
                        position.x += 20;
                        position.y += 20;
                    }
                }
            }
        }

        this._client.setRegistry(this.currentNodeInfo.id, this._META_EDITOR_REGISTRY_KEY, registry);
    };
    /**********************************************************/
    /*  END OF --- HANDLE OBJECT DRAG & DROP TO SHEET         */
    /**********************************************************/


    /**********************************************************/
    /*  HANDLE OBJECT REPOSITION IN THE ASPECT ASPECT         */
    /**********************************************************/
    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onDesignerItemsMove = function (repositionDesc) {
        var cNode = this._client.getNode(this.currentNodeInfo.id),
            registry = cNode.getEditableRegistry(this._META_EDITOR_REGISTRY_KEY) || this._emptyMetaEditorRegistry(),
            id,
            gmeID;

        for (id in repositionDesc) {
            if (repositionDesc.hasOwnProperty(id)) {
                gmeID = this._ComponentID2GMEID[id];
                if (registry.Members.indexOf(gmeID) !== -1) {
                    registry.MemberCoord[gmeID] = { "x": repositionDesc[id].x,
                        "y": repositionDesc[id].y};
                }
            }
        }

        this._client.setRegistry(this.currentNodeInfo.id, this._META_EDITOR_REGISTRY_KEY, registry);
    };
    /************************************************************/
    /* END OF --- HANDLE OBJECT REPOSITION IN THE ASPECT ASPECT */
    /************************************************************/


    /*************************************************************/
    /*  HANDLE OBJECT / CONNECTION DELETION IN THE ASPECT ASPECT */
    /*************************************************************/
    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectionDelete = function (idList) {
        var cNode = this._client.getNode(this.currentNodeInfo.id),
            registry = cNode.getEditableRegistry(this._META_EDITOR_REGISTRY_KEY) || this._emptyMetaEditorRegistry(),
            len = idList.length,
            gmeID,
            idx,
            getAssociatedConnections,
            connectionListBySrcGMEID = this._connectionListBySrcGMEID,
            connectionListByDstGMEID = this._connectionListByDstGMEID,
            aConnections,
            deleteConnection,
            i,
            self = this;

        getAssociatedConnections = function (objectID) {
            var associatedConnectionIDs = [],
                otherID,
                connType,
                len,
                cID,
                checkConnections;

            checkConnections = function (cList) {
                //check objectID as source
                if (cList.hasOwnProperty(objectID)) {
                    for (otherID in cList[objectID]) {
                        if (cList[objectID].hasOwnProperty(otherID)) {
                            for (connType in cList[objectID][otherID]) {
                                if (cList[objectID][otherID].hasOwnProperty(connType)) {
                                    len = cList[objectID][otherID][connType].length;
                                    while (len--) {
                                        cID = cList[objectID][otherID][connType][len];
                                        if (associatedConnectionIDs.indexOf(cID) === -1) {
                                            associatedConnectionIDs.push(cID);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            checkConnections(connectionListBySrcGMEID);
            checkConnections(connectionListByDstGMEID);

            return associatedConnectionIDs;
        };

        deleteConnection = function (connectionID) {
            var connDesc = self._connectionListByID[connectionID];

            if (connDesc.type === MetaRelations.META_RELATIONS.CONTAINMENT) {
                self._deleteContainmentRelationship(connDesc.GMESrcId, connDesc.GMEDstId);
            } else if (connDesc.type === MetaRelations.META_RELATIONS.POINTER) {
                self._deletePointerRelationship(connDesc.GMESrcId, connDesc.GMEDstId, connDesc.name);
            } else if (connDesc.type === MetaRelations.META_RELATIONS.INHERITANCE) {
                self._deleteInheritanceRelationship(connDesc.GMESrcId, connDesc.GMEDstId);
            }
            //TODO: PointerList deletion not yet handled
        };

        this._client.startTransaction();

        while (len--) {
            gmeID = this._ComponentID2GMEID[idList[len]];
            idx = registry.Members.indexOf(gmeID);
            if ( idx !== -1) {
                //entity is a box --> delete GME object from the sheet member's list and delete relationship definitions as well

                //handle associated connections
                //if GMEObject is a source of a connection (Containment / Pointer / PointerList relationship)
                // --> DELETE these relationship definitions from the node
                //if GMEObject is a destination of a connection (Inheritance)
                // --> inheritance is stored on the 'other' end, need to delete from the 'other' node
                aConnections = getAssociatedConnections(gmeID);
                i = aConnections.length;
                while (i--) {
                    deleteConnection(aConnections[i]);
                }

                //finally remove from members list
                registry.Members.splice(idx, 1);
                delete registry.MemberCoord[gmeID];
            } else if (this._connectionListByID.hasOwnProperty(idList[len])) {
                //entity is a connection, just simply delete it
                deleteConnection(idList[len]);
            }
        }

        this._client.setRegistry(this.currentNodeInfo.id, this._META_EDITOR_REGISTRY_KEY, registry);

        this._client.completeTransaction();
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
            gmeIDs = [],
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

    return MetaEditorControlDiagramDesignerWidgetEventHandlers;
});
