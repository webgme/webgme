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
        //TODO: connection deletion not yet handled
    MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype._onSelectionDelete = function (idList) {
        var cNode = this._client.getNode(this.currentNodeInfo.id),
            registry = cNode.getEditableRegistry(this._META_EDITOR_REGISTRY_KEY) || this._emptyMetaEditorRegistry(),
            len = idList.length,
            gmeID,
            idx,
            connDesc;

        this._client.startTransaction();

        while (len--) {
            gmeID = this._ComponentID2GMEID[idList[len]];
            idx = registry.Members.indexOf(gmeID);
            if ( idx !== -1) {
                //connected entity is a box --> GME object
                registry.Members.splice(idx, 1);
                delete registry.MemberCoord[gmeID];
            } else if (this._connectionListByID.hasOwnProperty(idList[len])) {
                //TODO: connection delete handler
                connDesc = this._connectionListByID[idList[len]];

                if (connDesc.type === MetaRelations.META_RELATIONS.CONTAINMENT) {
                    this._deleteContainmentRelationship(connDesc.GMESrcId, connDesc.GMEDstID);
                } else if (connDesc.type === MetaRelations.META_RELATIONS.POINTER) {
                    this._deletePointerRelationship(connDesc.GMESrcId, connDesc.GMEDstID, connDesc.name);
                } else {
                    /*if (connDesc.type.indexOf(POINTER_PREFIX) === 0) {
                        //deleted connection is a POINTER
                        this.logger.debug("Deleting Pointer '" + connDesc.type + "' from GMEObject :'" + connDesc.GMESrcId + "'");
                        this._client.delPointer(connDesc.GMESrcId, connDesc.type.replace(POINTER_PREFIX, ''));
                    } else if (connDesc.type.indexOf(SET_PREFIX) === 0) {
                        //deleted connection is a SET member relationship
                        this.logger.debug("Deleting SET membership owner:'" + connDesc.GMESrcId + "' member: '" + connDesc.GMEDstID + "', set:'" + connDesc.type + "'");
                        this._client.removeMember(connDesc.GMESrcId, connDesc.GMEDstID, connDesc.type.replace(SET_PREFIX, ''));
                    }*/
                }
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
