"use strict";

define(['logManager',
    'clientUtil',
    'js/Constants',
    'js/NodePropertyNames',
    './MetaRelations'], function (logManager,
                                        util,
                                        CONSTANTS,
                                        nodePropertyNames,
                                        MetaRelations) {

    var MetaEditorControlDiagramDesignerWidgetEventHandlers;

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

        this.diagramDesigner.onBackgroundDroppableAccept = function (helper) {
            return self._onBackgroundDroppableAccept(helper);
        };

        this.diagramDesigner.onBackgroundDrop = function (helper, position) {
            self._onBackgroundDrop(helper, position);
        };

        this.diagramDesigner.onCheckChanged = function (value, isChecked) {
            self._onConnectionTypeFilterCheckChanged(value, isChecked);
        };

        this.diagramDesigner.onConnectionDstTextChanged = function (connId, oldValue, newValue) {
            self._onConnectionDstTextChanged(connId, oldValue, newValue);
        };


        this.logger.debug("attachDesignerCanvasEventHandlers finished");
    };

    /**********************************************************/
    /*  HANDLE OBJECT DRAG & DROP ACCEPTANCE                  */
    /**********************************************************/
    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onBackgroundDroppableAccept = function (helper) {
        var metaInfo = helper.data(CONSTANTS.META_INFO),
            gmeIDList,
            i;

        //return true if there is at least one item among the dragged ones that is not on the sheet yet
        if (metaInfo) {
            if (metaInfo.hasOwnProperty(CONSTANTS.GME_ID)) {
                gmeIDList = metaInfo[CONSTANTS.GME_ID];

                if (_.isArray(gmeIDList)) {
                    for (i = 0; i < gmeIDList.length; i+= 1) {
                        if (this._GMENodes.indexOf(gmeIDList[i]) === -1 ) {
                            return true;
                        }
                    }
                } else {
                    if (this._GMENodes.indexOf(gmeIDList) === -1 ) {
                        return true;
                    }
                }
            }
        }

        return false;
    };
    /**********************************************************/
    /*  END OF --- HANDLE OBJECT DRAG & DROP ACCEPTANCE       */
    /**********************************************************/


    /**********************************************************/
    /*  HANDLE OBJECT DRAG & DROP TO SHEET                    */
    /**********************************************************/
    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onBackgroundDrop = function (helper, position) {
        var metaInfo = helper.data(CONSTANTS.META_INFO),
            gmeIDList,
            cNode = this._client.getNode(this.currentNodeInfo.id),
            registry = cNode.getEditableRegistry(this._META_EDITOR_REGISTRY_KEY) || this._emptyMetaEditorRegistry(),
            i,
            addMember;

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

        if (metaInfo) {
            if (metaInfo.hasOwnProperty(CONSTANTS.GME_ID)) {
                gmeIDList = metaInfo[CONSTANTS.GME_ID];

                if (_.isArray(gmeIDList)) {
                    for (i = 0; i < gmeIDList.length; i += 1) {
                        if (addMember(gmeIDList[i], position)) {
                            position.x += 20;
                            position.y += 20;
                        }
                    }
                } else {
                    addMember(gmeIDList, position);
                }

                this._client.setRegistry(this.currentNodeInfo.id, this._META_EDITOR_REGISTRY_KEY, registry);
            }
        }
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

    return MetaEditorControlDiagramDesignerWidgetEventHandlers;
});
