/*globals define,_,WebGMEGlobal,alert*/
/*
 * @author brollb / https:// github/brollb
 */

define(['js/logger',
    'js/util',
    'js/Constants',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    'js/Utils/GMEConcepts',
    'js/Utils/ExportManager',
    'js/Widgets/BlockEditor/BlockEditorWidget.Constants',
    'js/Widgets/BlockEditor/BlockEditorWidget.Utils',
    'js/DragDrop/DragHelper'], function (Logger,
                                         util,
                                         CONSTANTS,
                                         nodePropertyNames,
                                         REGISTRY_KEYS,
                                         GMEConcepts,
                                         ExportManager,
                                         BLOCK_CONSTANTS,
                                         Utils,
                                         DragHelper) {
    "use strict";

    var BlockEditorControlWidgetEventHandlers,
        ATTRIBUTES_STRING = "attributes",
        REGISTRY_STRING = "registry";

    BlockEditorControlWidgetEventHandlers = function() {
    };

    BlockEditorControlWidgetEventHandlers.prototype.attachBlockEditorEventHandlers = function () {
        var self = this;

        this.snapCanvas.onSelectionDelete = function (idList) {
            self._onSelectionDelete(idList);
        };

        /*
         * Uncomment for hierarchy
        this.snapCanvas.onDesignerItemDoubleClick = function (id, event) {
            self._onDesignerItemDoubleClick(id, event);
        };
        */

        this.snapCanvas.onRegisterSubcomponent = function (objID, sCompID, metaInfo) {
            self._onRegisterSubcomponent(objID, sCompID, metaInfo);
        };

        this.snapCanvas.onUnregisterSubcomponent = function (objID, sCompID) {
            self._onUnregisterSubcomponent(objID, sCompID);
        };

        this.snapCanvas.onBackgroundDroppableAccept = function (event, dragInfo) {
            return self._onBackgroundDroppableAccept(event, dragInfo);
        };

        this.snapCanvas.onBackgroundDrop = function (event, dragInfo, position) {
            self._onBackgroundDrop(event, dragInfo, position);
        };

        this.snapCanvas.onItemDrop = function (params) {
            self._onItemDrop(params);
        };

        this.snapCanvas.onSelectionChanged = function (selectedIds) {
            self._onSelectionChanged(selectedIds);
        };

        this.snapCanvas.onClipboardCopy = function (selectedIds) {
            self._onClipboardCopy(selectedIds);
        };

        this.snapCanvas.onClipboardPaste = function () {
            self._onClipboardPaste();
        };

        this.snapCanvas.onDragStartDesignerItemDraggable = function (itemID) {
            return self._onDragStartDesignerItemDraggable(itemID);
        };

        this.snapCanvas.onDragStartDesignerItemCopyable = function (itemID) {
            return self._onDragStartDesignerItemCopyable(itemID);
        };

        this.snapCanvas.onCopy = function () {
            return self._onCopy();
        };

        this.snapCanvas.onPaste = function (data) {
            return self._onPaste(data);
        };

        this.snapCanvas.getDragItems = function (selectedElements) {
            return self._getDragItems(selectedElements);
        };

        this._oGetDragParams = this.snapCanvas.getDragParams;
        this.snapCanvas.getDragParams = function (selectedElements, event) {
            return self._getDragParams(selectedElements, event);
        };

        this.snapCanvas.onSelectionContextMenu = function (selectedIds, mousePos) {
            self._onSelectionContextMenu(selectedIds, mousePos);
        };

        this.snapCanvas.onSelectionFillColorChanged = function (selectedElements, color) {
            self._onSelectionFillColorChanged(selectedElements, color);
        };

        this.snapCanvas.onSelectionBorderColorChanged = function (selectedElements, color) {
            self._onSelectionBorderColorChanged(selectedElements, color);
        };

        this.snapCanvas.onSelectionTextColorChanged = function (selectedElements, color) {
            self._onSelectionTextColorChanged(selectedElements, color);
        };

        this.snapCanvas.onSelectedTabChanged = function (tabID) {
            self._onSelectedTabChanged(tabID);
        };

        this.snapCanvas.getValidPointerTypes = function (srcItem, dstItem) {
            return self._getValidPointerTypes(srcItem, dstItem);
        };

        this.logger.debug("attachBlockEditorWidgetEventHandlers finished");
 
    };

    BlockEditorControlWidgetEventHandlers.prototype._onDesignerItemsMove = function (repositionDesc) {
        var id;

        this._client.startTransaction();
        for (id in repositionDesc) {
            if (repositionDesc.hasOwnProperty(id)) {
                this._client.setRegistry(this._ComponentID2GmeID[id], REGISTRY_KEYS.POSITION, { "x": repositionDesc[id].x, "y": repositionDesc[id].y });
            }
        }
        this._client.completeTransaction();
    };

    BlockEditorControlWidgetEventHandlers.prototype._onDesignerItemsCopy = function (copyDesc) {
        var copyOpts = { "parentId": this.currentNodeInfo.id },
            id,
            desc,
            gmeID;

        this.snapCanvas.beginUpdate();

        for (id in copyDesc.items) {
            if (copyDesc.items.hasOwnProperty(id)) {
                desc = copyDesc.items[id];
                gmeID = this._ComponentID2GmeID[desc.oItemId];

                copyOpts[gmeID] = {};
                copyOpts[gmeID][ATTRIBUTES_STRING] = {};
                copyOpts[gmeID][REGISTRY_STRING] = {};

                copyOpts[gmeID][REGISTRY_STRING][REGISTRY_KEYS.POSITION] = { "x": desc.posX, "y": desc.posY };

                // remove the component from UI
                // it will be recreated when the GME client calls back with the result
                this.snapCanvas.deleteComponent(id);
            }
        }

        for (id in copyDesc.connections) {
            if (copyDesc.connections.hasOwnProperty(id)) {
                desc = copyDesc.connections[id];
                gmeID = this._ComponentID2GmeID[desc.oConnectionId];

                copyOpts[gmeID] = {};

                // remove the component from UI
                // it will be recreated when the GME client calls back with the result
                this.snapCanvas.deleteComponent(id);
            }
        }

        this.snapCanvas.endUpdate();

        this._client.intellyPaste(copyOpts);
    };


    BlockEditorControlWidgetEventHandlers.prototype._onSelectionDelete = function (idList) {
        var objIdList = [],
            i = idList.length,
            objID;

        while(i--) {
            objID = this._ComponentID2GmeID[idList[i]];
            // temporary fix to not allow deleting ROOT AND FCO
            if (GMEConcepts.canDeleteNode(objID)) {
                objIdList.pushUnique(objID);
            } else {
                this.logger.warning('Can not delete item with ID: ' + objID + '. Possibly it is the ROOT or FCO');
            }
        }

        if (objIdList.length > 0) {
            this._client.delMoreNodes(objIdList);
        }
    };


    /*
     * Uncomment this for hierarchy
    BlockEditorControlWidgetEventHandlers.prototype._onDesignerItemDoubleClick = function (id, event) {
        var gmeID = this._ComponentID2GmeID[id];

        if (gmeID) {
            this.logger.debug("Opening model with id '" + gmeID + "'");
            WebGMEGlobal.State.setActiveObject(gmeID);
        }
    };
    */

    BlockEditorControlWidgetEventHandlers.prototype._onRegisterSubcomponent = function (objID, sCompID, metaInfo) {
        // store that a subcomponent with a given ID has been added to object with objID
        this._GMEID2Subcomponent[metaInfo[CONSTANTS.GME_ID]] = this._GMEID2Subcomponent[metaInfo[CONSTANTS.GME_ID]] || {};
        this._GMEID2Subcomponent[metaInfo[CONSTANTS.GME_ID]][objID] = sCompID;

        this._Subcomponent2GMEID[objID] = this._Subcomponent2GMEID[objID] || {};
        this._Subcomponent2GMEID[objID][sCompID] = metaInfo[CONSTANTS.GME_ID];
        // FIXME Change this to Block! logic
        // TODO: add event handling here that a subcomponent appeared
    };

    BlockEditorControlWidgetEventHandlers.prototype._onUnregisterSubcomponent = function (objID, sCompID) {
        var gmeID = this._Subcomponent2GMEID[objID][sCompID];

        delete this._Subcomponent2GMEID[objID][sCompID];
        if (this._GMEID2Subcomponent[gmeID]) {
            delete this._GMEID2Subcomponent[gmeID][objID];
        }
        // FIXME Change this to Block! logic
        // TODO: add event handling here that a subcomponent disappeared
    };


    BlockEditorControlWidgetEventHandlers.prototype._getPossibleDropActions = function (dragInfo) {
        var items = DragHelper.getDragItems(dragInfo),
            dragEffects = DragHelper.getDragEffects(dragInfo),
            dragParams = DragHelper.getDragParams(dragInfo),
            possibleDropActions = [],
            parentID = this.currentNodeInfo.id,
            validPointerTypes = [],
            i,
            j,
            baseTypeID,
            baseTypeNode,
            dragAction,
            aspect = this._selectedAspect;

        // check to see what DROP actions are possible
        if (items.length > 0) {
            i = dragEffects.length;
            while (i--) {
                switch(dragEffects[i]) {
                    case DragHelper.DRAG_EFFECTS.DRAG_MOVE:
                        // check to see if dragParams.parentID and this.parentID are the same
                        // if so, it's not a real move, it is a reposition
                        if ((dragParams && dragParams.parentID === parentID) ||
                            GMEConcepts.canCreateChildrenInAspect(parentID, items, aspect)) {
                            dragAction = {'dragEffect': dragEffects[i]};
                            possibleDropActions.push(dragAction);
                        }
                        break;
                    case DragHelper.DRAG_EFFECTS.DRAG_COPY:
                        if (GMEConcepts.canCreateChildrenInAspect(parentID, items, aspect)) {
                            dragAction = {'dragEffect': dragEffects[i]};
                            possibleDropActions.push(dragAction);
                        }
                        break;
                    case DragHelper.DRAG_EFFECTS.DRAG_CREATE_INSTANCE:
                        if (GMEConcepts.canCreateChildrenInAspect(parentID, items, aspect)) {
                            dragAction = {'dragEffect': dragEffects[i]};
                            possibleDropActions.push(dragAction);
                        }
                        break;
                    case DragHelper.DRAG_EFFECTS.DRAG_CREATE_POINTER:
                        if (items.length === 1) {
                            validPointerTypes = GMEConcepts.getValidPointerTypes(parentID, items[0]);
                            if (validPointerTypes.length > 0) {
                                j = validPointerTypes.length;
                                // each valid pointer type is an object {'baseId': objId, 'pointer': pointerName}
                                while (j--) {
                                    baseTypeID = validPointerTypes[j].baseId;
                                    baseTypeNode = this._client.getNode(baseTypeID);
                                    validPointerTypes[j].name = baseTypeID;
                                    if (baseTypeNode) {
                                        validPointerTypes[j].name = baseTypeNode.getAttribute(nodePropertyNames.Attributes.name);
                                    }
                                }

                                validPointerTypes.sort(this.__pointerSortCriteria);

                                for (j = 0; j < validPointerTypes.length; j += 1) {
                                    dragAction = { 'dragEffect': DragHelper.DRAG_EFFECTS.DRAG_CREATE_POINTER,
                                        'name': validPointerTypes[j].name,
                                        'baseId': validPointerTypes[j].baseId,
                                        'pointer': validPointerTypes[j].pointer};
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

    BlockEditorControlWidgetEventHandlers.prototype.__pointerSortCriteria = function (a,b) {
        var baseAName = a.name.toLowerCase(),
            baseBName = b.name.toLowerCase(),
            ptrAName = a.pointer.toLowerCase(),
            ptrBName = b.pointer.toLowerCase();

        if (ptrAName < ptrBName) {
            return -1;
        } else if (ptrAName > ptrBName) {
            return 1;
        } else {
            // ptrAName = ptrBName
            if (baseAName < baseBName) {
                return -1;
            } else {
                return 1;
            }
        }
    };

    BlockEditorControlWidgetEventHandlers.prototype._onBackgroundDroppableAccept = function (event, dragInfo) {
        var accept;

        accept = this._getPossibleDropActions(dragInfo).length > 0;

        return accept;
    };

    BlockEditorControlWidgetEventHandlers.prototype._onBackgroundDrop = function (event, dragInfo, position) {
        var possibleDropActions = this._getPossibleDropActions(dragInfo),
            len = possibleDropActions.length,
            i,
            selectedAction,
            self = this;

        if (len === 1) {
            selectedAction = possibleDropActions[0];
            this._handleDropAction(selectedAction, dragInfo, position);
        } else {
            var menuItems = {};

            for (i = 0; i < possibleDropActions.length; i += 1) {
                switch (possibleDropActions[i].dragEffect) {
                    case DragHelper.DRAG_EFFECTS.DRAG_COPY:
                        menuItems[i] = {
                            "name": "Copy here",
                            "icon": 'icon-plus'
                        };
                        break;
                    case DragHelper.DRAG_EFFECTS.DRAG_MOVE:
                        menuItems[i] = {
                            "name": "Move here",
                            "icon": 'icon-move'
                        };
                        break;
                    case DragHelper.DRAG_EFFECTS.DRAG_CREATE_INSTANCE:
                        menuItems[i] = {
                            "name": "Create instance here",
                            "icon": 'icon-share-alt'
                        };
                        break;
                    case DragHelper.DRAG_EFFECTS.DRAG_CREATE_POINTER:
                        menuItems[i] = {
                            "name": "Create pointer '" + possibleDropActions[i].pointer + "' of type '" + possibleDropActions[i].name + "'",
                            "icon": 'icon-share'
                        };
                        break;
                    default:
                }
            }

            this.snapCanvas.createMenu(menuItems, function (key) {
                    selectedAction = possibleDropActions[parseInt(key, 10)];
                    self._handleDropAction(selectedAction, dragInfo, position);
                }, position
                // this.snapCanvas.posToPageXY(position.x, position.y)
            );
        }
    };

    BlockEditorControlWidgetEventHandlers.prototype._handleDropAction = function (dropAction, dragInfo, position) {
        var dragEffect = dropAction.dragEffect,
            items = DragHelper.getDragItems(dragInfo),
            dragParams = DragHelper.getDragParams(dragInfo),
            parentID = this.currentNodeInfo.id,
            i,
            gmeID,
            params,
            POS_INC = 20,
            oldPos;

        this.logger.debug('dropAction: ' + JSON.stringify(dropAction));
        this.logger.debug('dragInfo: ' + JSON.stringify(dragInfo));
        this.logger.debug('position: ' + JSON.stringify(position));

        switch (dragEffect) {
            case DragHelper.DRAG_EFFECTS.DRAG_COPY:
                params = { "parentId": parentID };
                i = items.length;
                while (i--) {
                    gmeID = items[i];

                    params[gmeID] = {};

                    oldPos = dragParams && dragParams.positions[gmeID] || {'x':0, 'y': 0};
                    params[gmeID][REGISTRY_STRING] = {};
                    params[gmeID][REGISTRY_STRING][REGISTRY_KEYS.POSITION] = { "x": position.x + oldPos.x, "y": position.y + oldPos.y };
                }
                this._client.startTransaction();
                this._client.copyMoreNodes(params);
                this._client.completeTransaction();
                break;
            case DragHelper.DRAG_EFFECTS.DRAG_MOVE:
                // check to see if dragParams.parentID and this.parentID are the same
                // if so, it's not a real move, it is a reposition
                
                // We will remove pointers into the items
                var isHierarchicalMove = dragParams && dragParams.parentID !== parentID;

                // Is a hierarchical move if 
                isHierarchicalMove = this._areContainedInAnother(items) || isHierarchicalMove;

                this._removeIncomingPointers(items);
                if (!isHierarchicalMove) {
                    // it is a reposition
                    this._repositionItems(items, dragParams.positions, position);
                } else {
                    // it is a real hierarchical move
                    // This should move all nodes pointed to by any sibling_ptr also
                    items = this._addSiblingDependents(items);

                    params = { "parentId": parentID };
                    i = items.length;
                    while (i--) {
                        gmeID = items[i];

                        params[gmeID] = {};

                        oldPos = dragParams && dragParams.positions[gmeID] || {'x':0, 'y': 0};
                        params[gmeID][REGISTRY_STRING] = {};
                        params[gmeID][REGISTRY_STRING][REGISTRY_KEYS.POSITION] = { "x": position.x + oldPos.x, "y": position.y + oldPos.y };
                    }

                    this._client.startTransaction();
                    this._client.moveMoreNodes(params);
                    // Update the Gme ids and component ids
                    this._client.completeTransaction();
                }
                break;
            case DragHelper.DRAG_EFFECTS.DRAG_CREATE_INSTANCE:
                params = { "parentId": parentID };
                i = items.length;
                while(i--) {
                    oldPos = dragParams && dragParams.positions[items[i]] || {'x': 0, 'y': 0};
                    params[items[i]] = { registry: { position:{ x: position.x + oldPos.x, y: position.y + oldPos.y }}};
                    // old position is not in drag-params
                    if (!(dragParams && dragParams.positions[items[i]])) {
                        position.x += POS_INC;
                        position.y += POS_INC;
                    }
                }
                this._client.createChildren(params);
                break;

            case DragHelper.DRAG_EFFECTS.DRAG_CREATE_POINTER:
                params = { "parentId": parentID,
                           "baseId": dropAction.baseId };

                this._client.startTransaction();

                gmeID = this._client.createChild(params);

                if (gmeID) {
                    // check if old position is in drag-params
                    oldPos = dragParams && dragParams.positions[items[0]] || {'x':0, 'y': 0};
                    // store new position
                    this._client.setRegistry(gmeID, REGISTRY_KEYS.POSITION, {'x': position.x + oldPos.x,
                        'y': position.y + oldPos.y});

                    // set reference
                    this._client.makePointer(gmeID, dropAction.pointer, items[0]);

                    // try to set name
                    var origNode = this._client.getNode(items[0]);
                    if (origNode) {
                        var ptrName = origNode.getAttribute(nodePropertyNames.Attributes.name) + "-" + dropAction.pointer;
                        this._client.setAttributes(gmeID, nodePropertyNames.Attributes.name, ptrName);
                    }
                }

                this._client.completeTransaction();

                break;
        }
    };

    BlockEditorControlWidgetEventHandlers.prototype._addSiblingDependents = function (items) {
        // add sibling dependents to items using BFS
        var ptrs = BLOCK_CONSTANTS.SIBLING_PTRS,
            j = -1,
            node,
            tgt,
            i;

        while (++j < items.length) {
            i = ptrs.length;
            while (i--) {
                node = this._client.getNode(items[j]);
                tgt = node.getPointer(ptrs[i]).to;
                if (tgt && items.indexOf(tgt) === -1) {
                    items.push(tgt);
                }
            }
        }

        return items;
    };

    BlockEditorControlWidgetEventHandlers.prototype._updateGmeAndComponentIds = function (ids) {
        var oldIds = Object.keys(ids),
            newId,
            componentId;

        for (var i = oldIds.length-1; i >= 0; i--) {
            newId = ids[oldIds[i]];
            componentId = this._GmeID2ComponentID[oldIds[i]];

            delete this._GmeID2ComponentID[oldIds[i]];
            this._GmeID2ComponentID[newId] = componentId;
            this._ComponentID2GmeID[componentId] = newId;
        }
    };

    BlockEditorControlWidgetEventHandlers.prototype._onItemDrop = function (params) {
        // ptr, role are relative to the receiver
        // receiver has an activeConnectionArea
        var droppedItem = params.firstItem,
            activeItem = this._ComponentID2GmeID[params.activeItem.id],
            receiver = params.receiver,
            ptr = params.ptr,
            role = params.role,
            receiverId = this._ComponentID2GmeID[receiver],
            receiverItem = this.snapCanvas.items[receiver],

            node = this._client.getNode(receiverId),
            receiverParentId = node.getParentId(),

            droppedItems = this._addSiblingDependents([this._ComponentID2GmeID[droppedItem]]),
            droppedParentId,
            firstId = this._ComponentID2GmeID[droppedItem],
            newIds = {},
            moveItems,

            splicing = false,// check to see if we should splice 
            prevItem,
            isSiblingPtr = BLOCK_CONSTANTS.SIBLING_PTRS.indexOf(ptr) > -1,
            nextItem = this.snapCanvas.items[droppedItem],
            conn = receiverItem.activeConnectionArea,
            i;

        node = this._client.getNode(firstId);
        droppedParentId = node.getParentId();

        this._client.startTransaction();

        // Remove incoming pointers to the dragged item
        this._removeIncomingPointers([this._ComponentID2GmeID[droppedItem]]);

        // Check if we should perform hierarchical move
        if (!isSiblingPtr || receiverParentId !== droppedParentId) {
            var options = {items: droppedItems};
            if (isSiblingPtr) {
                options.parentId = receiverParentId;
            } else {
                options.parentId = receiverId;
            }
            newIds = this._moveNodesAndUpdate(options);
            // Update receiverId/firstId as needed
            firstId = newIds[firstId] || firstId;
            activeItem = newIds[activeItem] || activeItem;
            receiverId = newIds[receiverId] || receiverId;
        }

        // SPLICING
        splicing = this._tryToSpliceItems({item: params.activeItem,
                                           rootId: droppedItem,
                                           receiverItem: receiverItem,
                                           ids: newIds,
                                           ptr: ptr,
                                           offset: params.offset,
                                           role: role});

        // Set the first pointer
        if (role === BLOCK_CONSTANTS.CONN_INCOMING) {
            this._client.makePointer(activeItem, ptr, receiverId);

            if (!splicing) {
                // Move firstId to the correct location
                var options = {src: activeItem.id, 
                               dst: this._GmeID2ComponentID[receiverId], 
                               ptr: ptr},
                    distance = this.snapCanvas.getConnectionDistance(options),
                    position;

                node = this._client.getNode(firstId);
                position = _.extend({}, node.getRegistry(REGISTRY_KEYS.POSITION));
                position.x += distance.dx;
                position.y += distance.dy;

                this._client.setRegistry(firstId, REGISTRY_KEYS.POSITION, position);
            }
            
        } else {
            this._client.makePointer(receiverId, ptr, firstId);
        }

        this._updateGmeAndComponentIds(newIds);

        this._client.completeTransaction();
    };

    BlockEditorControlWidgetEventHandlers.prototype._moveNodesAndUpdate = function (options) {
        var items = options.items,
            gmeId,
            node,
            ids,
            oldId,
            id,
            ptrs2Create = {},
            ptrInfo,
            ptrs,
            newIds,
            newId,
            i,
            params = {parentId: options.parentId};

        for (i = items.length-1; i >= 0; i--) {
            gmeId = items[i];
            params[gmeId] = {};

            // Record pointers to update after the move
            node = this._client.getNode(gmeId);
            ptrs = node.getPointerNames();
            id = node.getId();
            ptrs2Create[id] = [];

            for (var j = ptrs.length-1; j >= 0; j--) {
                ptrs2Create[id].push({ ptr: ptrs[j], to: node.getPointer(ptrs[j]).to });
            }
        }

        newIds = this._client.moveMoreNodes(params);

        // For each of the items, update the ptrs
        ids = Object.keys(ptrs2Create);

        for (i = ids.length-1; i >= 0; i--) {
            while (ptrs2Create[ids[i]].length) {
                ptrInfo = ptrs2Create[ids[i]].pop();
                oldId = ptrInfo.to;
                newId = newIds[oldId];

                if (newId) {
                    this._client.makePointer(newIds[ids[i]], ptrInfo.ptr, newId);
                }
            }
        }

        return newIds;
    };

    BlockEditorControlWidgetEventHandlers.prototype._tryToSpliceItems = function (params) {
        var end,
            offset = params.offset || [0,0],
            ptr = params.ptr,
            role = params.role,
            ids = params.ids,
            rootId = params.rootId || params.item.id,
            isSiblingPtr = false,
            splicing,
            receiverItem = params.receiverItem,
            receiverConnId = receiverItem.activeConnectionArea.id,
            prevItemId,
            prevGmeId,
            spliceToItem,
            spliceToId,
            otherPtr;

        spliceToItem = receiverItem.conn2Item[receiverConnId];

        if (!spliceToItem) {  // check if there is an item to splice btwn
            return false;
        }

        // Set isSiblingPtr
        for (var i = BLOCK_CONSTANTS.SIBLING_PTRS.length-1; i >= 0; i--) {
            if (BLOCK_CONSTANTS.SIBLING_PTRS[i] === ptr) {
                isSiblingPtr = true;
            }
        }

        spliceToId = this._ComponentID2GmeID[spliceToItem.id];
        spliceToId = ids[spliceToId] || spliceToId;  // Look up new ids if either have been moved

        // Remove ptr to/from spliceToItem
        if (role === BLOCK_CONSTANTS.CONN_INCOMING) {
            this._client.makePointer(spliceToId, ptr, null);
        } else {
            var receiverGmeId = this._ComponentID2GmeID[receiverItem.id];

            // In case it has been moved:
            receiverGmeId = ids[receiverGmeId] || receiverGmeId;

            this._client.makePointer(receiverGmeId, ptr, null);
        }


        // Need to see if we can connect 'spliceToItem' to a 'spliceFromItem' with either 
        // ptr or a sibling pointer

        // We will first get all possible spliceFromItems
        var spliceFromItems,
            spliceInfo;

        if (role === BLOCK_CONSTANTS.CONN_INCOMING) {
            var prevItem = params.item;
            while (prevItem.parent && prevItem.id !== rootId) {
                prevItem = prevItem.parent;
            }
            spliceFromItems = [prevItem];
            
        } else if (role === BLOCK_CONSTANTS.CONN_OUTGOING) {
            // Get all the sibling leaves of the tree

            spliceFromItems = this._getAllSiblingLeaves(params.item);
        }

        // For each of the spliceFromItems, get the closest valid sibling connection
        spliceInfo = this._getBestItemAndConnection({items: spliceFromItems,
                                                     receiver: spliceToItem,
                                                     allowsChildrenPtrs: isSiblingPtr,
                                                     ids: ids,
                                                     dx: offset[0],
                                                     dy: offset[1],
                                                     role: role});
        
        if (spliceInfo.item) {

            prevItemId = spliceInfo.item.id;
            prevGmeId = this._ComponentID2GmeID[prevItemId];
            prevGmeId = ids[prevGmeId] || prevGmeId;
            ptr = spliceInfo.ptr;

            if (role === BLOCK_CONSTANTS.CONN_INCOMING) {
                this._client.makePointer(spliceToId, ptr, prevGmeId);
            } else {
                this._client.makePointer(prevGmeId, ptr, spliceToId);
            }

            return true;
        }

        return false;
    };

    BlockEditorControlWidgetEventHandlers.prototype._getAllSiblingLeaves = function (item) {
        var current = [item],
            next = [],
            leaves = [],
            isLeaf,
            ptr;

        while (current.length) {
            // Check each of the pointers for an item
            for (var i = current.length-1; i >= 0; i--) {
                isLeaf = true;
                for (var p = BLOCK_CONSTANTS.SIBLING_PTRS.length-1; p >= 0; p--) {
                    ptr = BLOCK_CONSTANTS.SIBLING_PTRS[p];
                    if (current[i].ptrs[ptr]) {
                        next.push(current[i].ptrs[ptr]);
                        isLeaf = false;
                    }
                }

                if (isLeaf) {
                    leaves.push(current[i]);
                }
            }
            current = next;
            next = [];
        }
    
        return leaves;
    };

    /**
     * Get the item and ptr type of the closest valid sibling connection.
     *
     * @param {Object} params
     * @return {Object} {itemId, ptr}
     */
    BlockEditorControlWidgetEventHandlers.prototype._getBestItemAndConnection = function(params) {
        var items = params.items,
            receiver = params.receiver,
            receiverId = params.receiverId,
            allowsChildrenPtrs = params.allowsChildrenPtrs || false,
            receiverAreas = receiver.getConnectionAreas(),
            rAreas,
            dx = params.dx || 0,
            dy = params.dy || 0,
            key,
            index,
            ptrs,
            ptrOptions,
            filterOptions = {},
            receiverOptions = {areas: receiverAreas},
            otherKey,
            connInfo,
            incomingArea,
            closest = {distance: Infinity},
            areas = [],
            self = this,
            getGmeId = function(componentId) {
                var id = self._ComponentID2GmeID[componentId];
                return params.ids[id] || id;
            };

        if (params.role === BLOCK_CONSTANTS.CONN_INCOMING) {  // relative to 'items'
            key = 'from';
            otherKey = 'to';
            index = 1;
            ptrOptions = [getGmeId(receiver.id), null];
        } else if (params.role === BLOCK_CONSTANTS.CONN_OUTGOING) {
            key = 'to';
            otherKey = 'from';
            index = 0;
            ptrOptions = [null, getGmeId(receiver.id)];
        }

        for (var i = items.length-1; i >= 0; i--) {
            // Get the valid ptrs wrt the item
            ptrOptions[index] = getGmeId(items[i].id);
            ptrs = GMEConcepts.getValidPointerTypesFromSourceToTarget
                              .apply(GMEConcepts, ptrOptions);

            // Remove any non-sibling pointers
            if (!allowsChildrenPtrs) {
                for (var j = ptrs.length-1; j >= 0; j--) {
                    if (BLOCK_CONSTANTS.SIBLING_PTRS.indexOf(ptrs[j]) === -1) {
                        ptrs.splice(j,1);
                    }
                }
            }

            // Get connection areas of a given item
            areas = items[i].getFreeConnectionAreas();

            // Add incoming connection area
            incomingArea = items[i].getConnectionArea({role: BLOCK_CONSTANTS.CONN_INCOMING});
            if (areas.indexOf(incomingArea) === -1) {
                areas.push(incomingArea);
            }

            // Shift the connection areas to correct locations
            areas = Utils.shiftConnAreas({areas: areas, dx: dx, dy: dy});

            // Filter the areas
            filterOptions.areas = areas;
            filterOptions[key] = ptrs;
            areas = Utils.filterAreasByPtrs(filterOptions);

            receiverOptions[otherKey] = ptrs;
            rAreas = Utils.filterAreasByPtrs(receiverOptions);

            // Get the closest connection area
            connInfo = Utils.getClosestCompatibleConn(rAreas, areas);

            if (connInfo.distance < closest.distance) {
                closest = connInfo;
            }
        }

        if (closest.distance !== Infinity) {
            var item = this.snapCanvas.items[closest.area.parentId];
            return {ptr: closest.ptr, item: item};
        }

        return {item: null};
    };

    /**
     * Follow the given pointer from the given node as far as possible.
     *
     * @param {Object} params
     * @return {Object} {item, connection}
     */
    BlockEditorControlWidgetEventHandlers.prototype._followPtrToEnd = function (params) {
        var nextItem = params.item, 
            items = params.items,
            role = params.role || BLOCK_CONSTANTS.CONN_OUTGOING,
            ptr = params.ptr,
            getNextConnArea = function(item) {
                var area;
                if (role === BLOCK_CONSTANTS.CONN_INCOMING) {
                    if (item.parent && item.parent.item2Conn[item.id].ptr === ptr) {
                        area = item.getConnectionArea({role: role});
                    } else {
                        area = null;
                    }
                } else {
                    area = item.getConnectionArea({ptr: ptr, role: role});
                }
                return area;
            },
            conn = getNextConnArea(nextItem),
            prevItem,
            gmeId;

        while (nextItem && conn) {
            conn = getNextConnArea(nextItem);
            if (conn) {
                prevItem = nextItem;
                nextItem = nextItem.getItemAtConnId(conn.id);
                if (nextItem) {
                    gmeId = this._ComponentID2GmeID[nextItem.id];

                    // Make sure the item is one of the dragged items
                    if (items && items.indexOf(gmeId) === -1) {
                        nextItem = null;
                    }
                }
            }
        }

        return {item: nextItem, connection: conn};
    };

    BlockEditorControlWidgetEventHandlers.prototype._areContainedInAnother = function (items) {
        // This should tell us if the items are contained in another item rather than
        // just the parentId
        var i = items.length,
            currentDepth = this.currentNodeInfo.id.split("/").length + 1;

        while (i--) {
            if (items[i].split("/").length > currentDepth) {
                return true;
            }
        }
        return false;
    };

    BlockEditorControlWidgetEventHandlers.prototype._removeIncomingPointers = function (items) {
        // Consider the set of items in 'items' and not in 'items'. This method will remove
        // pointers from NOT 'items' into 'items'
        var parentInfo,
            i = items.length,
            gmeId,
            id,
            ptr;

        // this._client.startTransaction();
        while (i--) {
            id = this._GmeID2ComponentID[items[i]];

            // Update the database
            parentInfo = this.snapCanvas.getParentInfo(id);
            if (parentInfo) {
                ptr = parentInfo.ptr;
                gmeId = this._ComponentID2GmeID[parentInfo.id];

                if (items.indexOf(gmeId) === -1) {// Remove the ptr
                    this._client.makePointer(gmeId, ptr, null);
                }
            }
        }
    };

    BlockEditorControlWidgetEventHandlers.prototype._repositionItems = function (items, dragPositions, dropPosition) {
        var i = items.length,
            oldPos,
            componentID,
            gmeID,
            selectedIDs = [],
            self = this;

        if (dragPositions && !_.isEmpty(dragPositions)) {
            // update UI
            this.snapCanvas.beginUpdate();

            while (i--) {
                gmeID = items[i];
                oldPos = dragPositions[gmeID];
                if (!oldPos) {
                    oldPos = {'x': 0, 'y': 0};
                }

                if (this._GmeID2ComponentID.hasOwnProperty(gmeID)) {
                    componentID = this._GmeID2ComponentID[gmeID];
                    selectedIDs.push(componentID);
                    this.snapCanvas.updateLinkableItem(componentID, { "position": {"x": dropPosition.x + oldPos.x, "y": dropPosition.y + oldPos.y }});
                }
            }

            this.snapCanvas.endUpdate();
            this.snapCanvas.select(selectedIDs);

            // update object internals
            setTimeout(function () {
                self._saveReposition(items, dragPositions, dropPosition);
            }, 10);
        }
    };

    BlockEditorControlWidgetEventHandlers.prototype._saveReposition = function (items, dragPositions, dropPosition) {
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
                oldPos = {'x': 0, 'y': 0};
            }
            // aspect specific coordinate
            if (selectedAspect === CONSTANTS.ASPECT_ALL) {
                client.setRegistry(gmeID, REGISTRY_KEYS.POSITION, { "x": dropPosition.x + oldPos.x, "y": dropPosition.y + oldPos.y });
            } else {
                client.addMember(modelID, gmeID, selectedAspect);
                client.setMemberRegistry(modelID, gmeID, selectedAspect, REGISTRY_KEYS.POSITION, {'x': dropPosition.x + oldPos.x, 'y': dropPosition.y + oldPos.y} );
            }
        }

        client.completeTransaction();
    };

    BlockEditorControlWidgetEventHandlers.prototype._onSelectionChanged = function (selectedId) {
        var gmeID = null,
            id = this._ComponentID2GmeID[selectedId];

        if (id) {
            gmeID = id;

        }

        // nobody is selected on the canvas
        // set the active selection to the opened guy
        if (!gmeID && (this.currentNodeInfo.id || this.currentNodeInfo.id === CONSTANTS.PROJECT_ROOT_ID)) {
            gmeID = this.currentNodeInfo.id;
        }

        this._settingActiveSelection = true;
        WebGMEGlobal.State.registerActiveSelection([gmeID]);
        this._settingActiveSelection = false;
    };


    BlockEditorControlWidgetEventHandlers.prototype._onClipboardCopy = function (selectedIds) {
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

    BlockEditorControlWidgetEventHandlers.prototype._onClipboardPaste = function () {
        if (this.currentNodeInfo.id) {
            this._client.pasteNodes(this.currentNodeInfo.id);
        }
    };

    BlockEditorControlWidgetEventHandlers.prototype._onDragStartDesignerItemDraggable = function (itemID) {
        var nodeObj = this._client.getNode(this._ComponentID2GmeID[itemID]),
            result = true;

        if (nodeObj) {
            result = this._client.canSetRegistry(nodeObj.getId(), REGISTRY_KEYS.POSITION);
        }

        return result;
    };

    BlockEditorControlWidgetEventHandlers.prototype._onDragStartDesignerItemCopyable = function (itemID) {
        var nodeObj = this._client.getNode(this._ComponentID2GmeID[itemID]),
            result = true;

        if (nodeObj) {
            result = nodeObj.getAttribute('copy') !== "false";
        }

        return result;
    };


    BlockEditorControlWidgetEventHandlers.prototype._onCopy = function () {
        var res = [],
            selectedIDs = this.snapCanvas.selectionManager.getSelectedElements(),
            i = selectedIDs.length,
            gmeID,
            obj,
            nodeObj,
            cpData = {'project': this._client.getActiveProject(),
                      'items' : []};

        while(i--) {
            gmeID = this._ComponentID2GmeID[selectedIDs[i]];
            obj = {'ID': gmeID,
                   'Name': undefined,
                   'Position': undefined};

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


    BlockEditorControlWidgetEventHandlers.prototype._onPaste = function (data) {
        var len,
            objDesc,
            parentID = this.currentNodeInfo.id,
            params = { "parentId": parentID },
            projectName = this._client.getActiveProject(),
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
                    alert('Trying to copy from project \'' + data.project + '\' to project \'' + projectName + '\' which is not supported... Copy&Paste is supported in the same project only.');
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
                            this.logger.warning('Pasted ' + childrenIDs.length + ' items successfully into node (' + parentID + ')');
                        } else {
                            this.logger.warning('Can not paste items because not all the items on the clipboard can be created as a child of the currently opened node (' + parentID + ')');
                        }
                    }
                }
            }
        }
    };


    BlockEditorControlWidgetEventHandlers.prototype._getDragItems = function (selectedElements) {
        var res = [],
            i = selectedElements.length;

        while(i--) {
            res.push(this._ComponentID2GmeID[selectedElements[i]]);
        }

        return res;
    };

    BlockEditorControlWidgetEventHandlers.prototype._getDragParams = function (selectedElements, event) {
        var oParams = this._oGetDragParams.call(this.snapCanvas, selectedElements, event),
            params = { 'positions': {},
                       'parentID': this.currentNodeInfo.id },
            i;

        for (i in oParams.positions) {
            if (oParams.positions.hasOwnProperty(i)) {
                params.positions[this._ComponentID2GmeID[i]] = oParams.positions[i];
            }
        }

        return params;
    };

    BlockEditorControlWidgetEventHandlers.prototype._onSelectionContextMenu = function (selectedIds, mousePos) {
        var menuItems = {},
            MENU_EXPORT = 'export',
            MENU_EXINTCONF = 'exintconf', // kecso
            self = this;

        menuItems[MENU_EXPORT] = {
            "name": 'Export selected...',
            "icon": 'icon-share'
        };
        menuItems[MENU_EXINTCONF] = {
            "name": 'Export model context...',
            "icon": 'icon-cog'
        };

        this.snapCanvas.createMenu(menuItems, function (key) {
                if (key === MENU_EXPORT) {
                    self._exportItems(selectedIds);
                } else if (key === MENU_EXINTCONF) {
                    self._exIntConf(selectedIds);
                }
            },
            this.snapCanvas.posToPageXY(mousePos.mX,
                mousePos.mY)
        );
    };

    BlockEditorControlWidgetEventHandlers.prototype._exportItems = function (selectedIds) {
        var i = selectedIds.length,
            gmeIDs = [];

        while(i--) {
            gmeIDs.push(this._ComponentID2GmeID[selectedIds[i]]);
        }

        ExportManager.exportMultiple(gmeIDs);
    };

    // kecso
    BlockEditorControlWidgetEventHandlers.prototype._exIntConf = function (selectedIds) {
        var i = selectedIds.length,
            gmeIDs = [];

        while(i--) {
            gmeIDs.push(this._ComponentID2GmeID[selectedIds[i]]);
        }

        ExportManager.exIntConf(gmeIDs);
    };

    BlockEditorControlWidgetEventHandlers.prototype._onSelectionFillColorChanged = function (selectedElements, color) {
        this._onSelectionSetColor(selectedElements, color, REGISTRY_KEYS.COLOR);
    };

    BlockEditorControlWidgetEventHandlers.prototype._onSelectionBorderColorChanged = function (selectedElements, color) {
        this._onSelectionSetColor(selectedElements, color, REGISTRY_KEYS.BORDER_COLOR);
    };

    BlockEditorControlWidgetEventHandlers.prototype._onSelectionTextColorChanged = function (selectedElements, color) {
        this._onSelectionSetColor(selectedElements, color, REGISTRY_KEYS.TEXT_COLOR);
    };

    BlockEditorControlWidgetEventHandlers.prototype._onSelectionSetColor = function (selectedIds, color, regKey) {
        var i = selectedIds.length,
            gmeID;

        this._client.startTransaction();
        while(i--) {
            gmeID = this._ComponentID2GmeID[selectedIds[i]];

            if (color) {
                this._client.setRegistry(gmeID, regKey, color);
            } else {
                this._client.delRegistry(gmeID, regKey);
            }
        }
        this._client.completeTransaction();
    };


    BlockEditorControlWidgetEventHandlers.prototype._onSelectedTabChanged = function (tabID) {
        if (this._aspects[tabID] && this._selectedAspect !== this._aspects[tabID]) {
            this._selectedAspect = this._aspects[tabID];

            this.logger.debug('selectedAspectChanged: ' + this._selectedAspect);

            this._initializeSelectedAspect();
        }
    };


    return BlockEditorControlWidgetEventHandlers;
});
