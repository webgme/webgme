"use strict";

define(['logManager',
    'clientUtil',
    'js/Constants',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    'js/Utils/GMEConcepts',
    'js/Utils/ExportManager',
    'js/Widgets/SnapEditor/SnapEditorWidget.Constants',
    'js/DragDrop/DragHelper'], function (logManager,
                                         util,
                                         CONSTANTS,
                                         nodePropertyNames,
                                         REGISTRY_KEYS,
                                         GMEConcepts,
                                         ExportManager,
                                         SNAP_CONSTANTS,
                                         DragHelper) {

    var SnapEditorControlWidgetEventHandlers,
        ATTRIBUTES_STRING = "attributes",
        REGISTRY_STRING = "registry";

    SnapEditorControlWidgetEventHandlers = function(){
    }

    SnapEditorControlWidgetEventHandlers.prototype.attachSnapEditorEventHandlers = function () {
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

        this.snapCanvas.onItemDrop = function (dragged, receiver, ptr, role) {
            self._onItemDrop(dragged, receiver, ptr, role);
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

        this.logger.debug("attachSnapEditorWidgetEventHandlers finished");
 
    };

    SnapEditorControlWidgetEventHandlers.prototype._onDesignerItemsMove = function (repositionDesc) {
        var id;

        this._client.startTransaction();
        for (id in repositionDesc) {
            if (repositionDesc.hasOwnProperty(id)) {
                this._client.setRegistry(this._ComponentID2GmeID[id], REGISTRY_KEYS.POSITION, { "x": repositionDesc[id].x, "y": repositionDesc[id].y });
            }
        }
        this._client.completeTransaction();
    };

    SnapEditorControlWidgetEventHandlers.prototype._onDesignerItemsCopy = function (copyDesc) {
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

                //remove the component from UI
                //it will be recreated when the GME client calls back with the result
                this.snapCanvas.deleteComponent(id);
            }
        }

        for (id in copyDesc.connections) {
            if (copyDesc.connections.hasOwnProperty(id)) {
                desc = copyDesc.connections[id];
                gmeID = this._ComponentID2GmeID[desc.oConnectionId];

                copyOpts[gmeID] = {};

                //remove the component from UI
                //it will be recreated when the GME client calls back with the result
                this.snapCanvas.deleteComponent(id);
            }
        }

        this.snapCanvas.endUpdate();

        this._client.intellyPaste(copyOpts);
    };


    SnapEditorControlWidgetEventHandlers.prototype._onSelectionDelete = function (idList) {
        var objIdList = [],
            i = idList.length,
            objID;

        while(i--) {
            objID = this._ComponentID2GmeID[idList[i]];
            //temporary fix to not allow deleting ROOT AND FCO
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
    SnapEditorControlWidgetEventHandlers.prototype._onDesignerItemDoubleClick = function (id, event) {
        var gmeID = this._ComponentID2GmeID[id];

        if (gmeID) {
            this.logger.debug("Opening model with id '" + gmeID + "'");
            WebGMEGlobal.State.setActiveObject(gmeID);
        }
    };
    */

    SnapEditorControlWidgetEventHandlers.prototype._onRegisterSubcomponent = function (objID, sCompID, metaInfo) {
        //store that a subcomponent with a given ID has been added to object with objID
        this._GMEID2Subcomponent[metaInfo[CONSTANTS.GME_ID]] = this._GMEID2Subcomponent[metaInfo[CONSTANTS.GME_ID]] || {};
        this._GMEID2Subcomponent[metaInfo[CONSTANTS.GME_ID]][objID] = sCompID;

        this._Subcomponent2GMEID[objID] = this._Subcomponent2GMEID[objID] || {};
        this._Subcomponent2GMEID[objID][sCompID] = metaInfo[CONSTANTS.GME_ID];
        //FIXME Change this to Snap! logic
        //TODO: add event handling here that a subcomponent appeared
    };

    SnapEditorControlWidgetEventHandlers.prototype._onUnregisterSubcomponent = function (objID, sCompID) {
        var gmeID = this._Subcomponent2GMEID[objID][sCompID];

        delete this._Subcomponent2GMEID[objID][sCompID];
        if (this._GMEID2Subcomponent[gmeID]) {
            delete this._GMEID2Subcomponent[gmeID][objID];
        }
        //FIXME Change this to Snap! logic
        //TODO: add event handling here that a subcomponent disappeared
    };


    SnapEditorControlWidgetEventHandlers.prototype._getPossibleDropActions = function (dragInfo) {
        var items = DragHelper.getDragItems(dragInfo),
            dragEffects = DragHelper.getDragEffects(dragInfo),
            dragParams = DragHelper.getDragParams(dragInfo),
            possibleDropActions = [],
            parentID = this.currentNodeInfo.id,
            i,
            validPointerTypes,
            j,
            validPointerTypes = [],
            baseTypeID,
            baseTypeNode,
            dragAction,
            aspect = this._selectedAspect;

        //check to see what DROP actions are possible
        if (items.length > 0) {
            i = dragEffects.length;
            while (i--) {
                switch(dragEffects[i]) {
                    case DragHelper.DRAG_EFFECTS.DRAG_MOVE:
                        //check to see if dragParams.parentID and this.parentID are the same
                        //if so, it's not a real move, it is a reposition
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
                                //each valid pointer type is an object {'baseId': objId, 'pointer': pointerName}
                                while (j--) {
                                    baseTypeID = validPointerTypes[j].baseId;
                                    baseTypeNode = this._client.getNode(baseTypeID);
                                    validPointerTypes[j].name = baseTypeID;
                                    if (baseTypeNode) {
                                        validPointerTypes[j].name = baseTypeNode.getAttribute(nodePropertyNames.Attributes.name);
                                    }
                                }

                                validPointerTypes.sort(function (a,b) {
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
                                });

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

    SnapEditorControlWidgetEventHandlers.prototype._onBackgroundDroppableAccept = function (event, dragInfo) {
        var accept;

        accept = this._getPossibleDropActions(dragInfo).length > 0;

        return accept;
    };

    SnapEditorControlWidgetEventHandlers.prototype._onBackgroundDrop = function (event, dragInfo, position) {
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
                //this.snapCanvas.posToPageXY(position.x, position.y)
            );
        }
    };

    SnapEditorControlWidgetEventHandlers.prototype._handleDropAction = function (dropAction, dragInfo, position) {
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
                //check to see if dragParams.parentID and this.parentID are the same
                //if so, it's not a real move, it is a reposition
                
                //We will remove pointers into the items
                var isHierarchicalMove = dragParams && dragParams.parentID !== parentID;

                //Is a hierarchical move if 
                isHierarchicalMove = this._areContainedInAnother(items) || isHierarchicalMove;

                this._removeExtraPointers(items);
                if (!isHierarchicalMove) {
                    //it is a reposition
                    this._repositionItems(items, dragParams.positions, position);
                } else {
                    //it is a real hierarchical move
                    //This should move all nodes pointed to by any sibling_ptr also
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
                    var idMap = this._client.moveMoreNodes(params);
                    //Update the Gme ids and component ids
                    //this._updateGmeAndComponentIds(items, idMap);
                    this._client.completeTransaction();
                }
                break;
            case DragHelper.DRAG_EFFECTS.DRAG_CREATE_INSTANCE:
                params = { "parentId": parentID };
                i = items.length;
                while(i--){
                    oldPos = dragParams && dragParams.positions[items[i]] || {'x': 0, 'y': 0};
                    params[items[i]] = { registry: { position:{ x: position.x + oldPos.x, y: position.y + oldPos.y }}};
                    //old position is not in drag-params
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
                    //check if old position is in drag-params
                    oldPos = dragParams && dragParams.positions[items[0]] || {'x':0, 'y': 0};
                    //store new position
                    this._client.setRegistry(gmeID, REGISTRY_KEYS.POSITION, {'x': position.x + oldPos.x,
                        'y': position.y + oldPos.y});

                    //set reference
                    this._client.makePointer(gmeID, dropAction.pointer, items[0]);

                    //try to set name
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

    SnapEditorControlWidgetEventHandlers.prototype._addSiblingDependents = function (items) {
        //add sibling dependents to items using BFS
        var ptrs = SNAP_CONSTANTS.SIBLING_PTRS,
            j = -1,
            node,
            tgt,
            i;

        while (++j < items.length){
            i = ptrs.length;
            while (i--){
                node = this._client.getNode(items[j]);
                tgt = node.getPointer(ptrs[i]).to;
                if (tgt && items.indexOf(tgt) === -1){
                    items.push(tgt);
                }
            }
        }

        return items;
    };

    SnapEditorControlWidgetEventHandlers.prototype._updateGmeAndComponentIds = function (ids, idMap) {
        //Update the id's of the node
        var i = ids.length,
            componentId,
            newGmeId,
            oldGmeId;

        while (i--){
            if (this._ComponentID2GmeID[ids[i]]){//ids[i] is a component id
                componentId = ids[i];
                oldGmeId = this._ComponentID2GmeID[ids[i]];
            } else {//ids[i] is a Gme id
                oldGmeId = ids[i];
                componentId = this._GmeID2ComponentID[ids[i]];
            }

            newGmeId = idMap[oldGmeId];

            //Update the dictionaries
            delete this._GmeID2ComponentID[oldGmeId];
            this._GmeID2ComponentID[newGmeId] = componentId;
            this._ComponentID2GmeID[componentId] = newGmeId;
        }
    };

    SnapEditorControlWidgetEventHandlers.prototype._onItemDrop = function (droppedItem, receiver, ptr, role) {
        //Dropping the droppedItems on the receiver
        //receiver has an activeConnectionArea
        var receiverId = this._ComponentID2GmeID[receiver],
            node = this._client.getNode(receiverId),
            receiverParentId = node.getParentId(),
            nextId = node.getPointer(ptr).to,//item currently pointed to by receiver
            droppedItems = this._addSiblingDependents([this._ComponentID2GmeID[droppedItem]]),
            droppedParentId,
            firstId = this._ComponentID2GmeID[droppedItem],
            lastId,
            newIds,
            i;

        node = this._client.getNode(this._ComponentID2GmeID[droppedItem]);
        droppedParentId = node.getParentId();

        this._client.startTransaction();

        //If the ptr is not PTR_NEXT, we should move all dragged items into the receiver
        //in terms of hierarchy
        this._removeExtraPointers([this._ComponentID2GmeID[droppedItem]]);

        if (SNAP_CONSTANTS.SIBLING_PTRS.indexOf(ptr) === -1 
                || receiverParentId !== droppedParentId){

            var params,
                i = droppedItems.length,
                ptrs2Create = {},
                gmeId,
                newId,
                oldId,
                ptrs,
                ptrInfo,
                id,
                p;

            if (SNAP_CONSTANTS.SIBLING_PTRS.indexOf(ptr) === -1){
                params = { "parentId": receiverId };
            } else {
                params = { "parentId": receiverParentId };
            }

            while (i--) {
                gmeId = droppedItems[i];
                params[gmeId] = {};

                //Record pointers to create
                node = this._client.getNode(gmeId);
                ptrs = node.getPointerNames();
                id = node.getId();
                ptrs2Create[id] = [];

                while (ptrs.length){
                    p = ptrs.pop();
                    ptrs2Create[id].push({ ptr: p, to: node.getPointer(p).to });
                }
            }

            newIds = this._client.moveMoreNodes(params);
            //this._updateGmeAndComponentIds(droppedItems, newIds);
            /*

            //Update the id's of the node
            i = droppedItems.length;
            while (i--){
                newId = newIds[this._ComponentID2GmeID[droppedItems[i]]];
                oldId = this._ComponentID2GmeID[droppedItems[i]];

                //Update the dictionaries
                delete this._GmeID2ComponentID[oldId];
                this._GmeID2ComponentID[newId] = droppedItems[i];
                this._ComponentID2GmeID[droppedItems[i]] = newId;
            }
            */

            //For each of the droppedItems, I will need to update the ptrs
            var keys = Object.keys(ptrs2Create);

            while (keys.length){
                id = keys.pop();
                ptrs = ptrs2Create[id];

                while (ptrs.length){
                    ptrInfo = ptrs.pop();
                    oldId = ptrInfo.to;
                    newId = newIds[oldId];

                    if (newId){
                        this._client.makePointer(newIds[id], ptrInfo.ptr, newId);
                    }
                }
            }
            firstId = newIds[firstId];
        }

        //check to see if we should splice 
        /*
        if (nextId){
            var lastNode = this._client.getNode(lastId),
                ptrs = lastNode.getPointerNames();

            if(ptrs.indexOf(ptr) !== -1 && !lastNode.getPointer(ptr).to){//lastNode can be connected to 
                this._client.makePointer(lastId, ptr, nextId);
            }
        }
        */

        //Set the first pointer
        if (role === SNAP_CONSTANTS.CONN_ACCEPTING){
            this._client.makePointer(firstId, ptr, receiverId);
        } else {
            this._client.makePointer(receiverId, ptr, firstId);
        }

        //this.snapCanvas.connect(droppedItem, receiver);

        this._client.completeTransaction();
    };

    SnapEditorControlWidgetEventHandlers.prototype._areContainedInAnother = function (items) {
        //This should tell us if the items are contained in another item rather than
        //just the parentId
        var i = items.length,
            currentDepth = this.currentNodeInfo.id.split("/").length + 1;

        while (i--){
            if (items[i].split("/").length > currentDepth){
                return true;
            }
            /*
            id = this._GmeID2ComponentID[items[i]];
            ptrs = this.snapCanvas.getItemsPointingTo(id);
            j = ptrs.length;
            while (j--){
                if (SNAP_CONSTANTS.SIBLING_PTRS.indexOf(ptrs[j]) === -1){
                    return true;
                }
            }
            */
        }
        return false;
    };

    SnapEditorControlWidgetEventHandlers.prototype._removeExtraPointers = function (items) {
        //Consider the set of items in 'items' and not in 'items'. This method will remove
        //pointers from NOT 'items' into 'items'
        var ptrs2Remove,
            i = items.length,
            ptrs,
            keys,
            gmeId,
            id,
            ptr;

        this._client.startTransaction();
        while (i--){
            id = this._GmeID2ComponentID[items[i]];
            ptrs2Remove = this.snapCanvas.getItemsPointingTo(id);
            ptrs = Object.keys(ptrs2Remove);

            //Update the database
            while (ptrs.length){
                ptr = ptrs.pop();
                gmeId = this._ComponentID2GmeID[ptrs2Remove[ptr].id];

                if (items.indexOf(gmeId) === -1){//Remove the ptr
                    this._client.makePointer(gmeId, ptr, null);
                }
            }
        }

        this._client.completeTransaction();
    };

    SnapEditorControlWidgetEventHandlers.prototype._repositionItems = function (items, dragPositions, dropPosition) {
        var i = items.length,
            oldPos,
            componentID,
            gmeID,
            selectedIDs = [],
            len,
            self = this;

        if (dragPositions && !_.isEmpty(dragPositions)) {
            //update UI
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
                    this.snapCanvas.updateClickableItem(componentID, { "position": {"x": dropPosition.x + oldPos.x, "y": dropPosition.y + oldPos.y }});
                }
            }

            this.snapCanvas.endUpdate();
            this.snapCanvas.select(selectedIDs);

            //update object internals
            setTimeout(function () {
                self._saveReposition(items, dragPositions, dropPosition);
            }, 10);
        }
    };

    SnapEditorControlWidgetEventHandlers.prototype._saveReposition = function (items, dragPositions, dropPosition) {
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
            //aspect specific coordinate
            if (selectedAspect === CONSTANTS.ASPECT_ALL) {
                client.setRegistry(gmeID, REGISTRY_KEYS.POSITION, { "x": dropPosition.x + oldPos.x, "y": dropPosition.y + oldPos.y });
            } else {
                client.addMember(modelID, gmeID, selectedAspect);
                client.setMemberRegistry(modelID, gmeID, selectedAspect, REGISTRY_KEYS.POSITION, {'x': dropPosition.x + oldPos.x, 'y': dropPosition.y + oldPos.y} );
            }
        }

        client.completeTransaction();
    };

    SnapEditorControlWidgetEventHandlers.prototype._onSelectionChanged = function (selectedId) {
        var gmeID = null,
            id = this._ComponentID2GmeID[selectedId];

        if (id) {
            gmeID = id;

        }

        //nobody is selected on the canvas
        //set the active selection to the opened guy
        if (!gmeID && (this.currentNodeInfo.id || this.currentNodeInfo.id === CONSTANTS.PROJECT_ROOT_ID)) {
            gmeID = this.currentNodeInfo.id;
        }

        this._settingActiveSelection = true;
        WebGMEGlobal.State.setActiveSelection([gmeID]);
        this._settingActiveSelection = false;
    };


    SnapEditorControlWidgetEventHandlers.prototype._onClipboardCopy = function (selectedIds) {
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

    SnapEditorControlWidgetEventHandlers.prototype._onClipboardPaste = function () {
        if (this.currentNodeInfo.id) {
            this._client.pasteNodes(this.currentNodeInfo.id);
        }
    };

    SnapEditorControlWidgetEventHandlers.prototype._onDragStartDesignerItemDraggable = function (itemID) {
        var nodeObj = this._client.getNode(this._ComponentID2GmeID[itemID]),
            result = true;

        if (nodeObj) {
            result = this._client.canSetRegistry(nodeObj.getId(), REGISTRY_KEYS.POSITION);
        }

        return result;
    };

    SnapEditorControlWidgetEventHandlers.prototype._onDragStartDesignerItemCopyable = function (itemID) {
        var nodeObj = this._client.getNode(this._ComponentID2GmeID[itemID]),
            result = true;

        if (nodeObj) {
            result = nodeObj.getAttribute('copy') != "false";
        }

        return result;
    };


    SnapEditorControlWidgetEventHandlers.prototype._onCopy = function () {
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


    SnapEditorControlWidgetEventHandlers.prototype._onPaste = function (data) {
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


    SnapEditorControlWidgetEventHandlers.prototype._getDragItems = function (selectedElements) {
        var res = [],
            i = selectedElements.length;

        while(i--) {
            res.push(this._ComponentID2GmeID[selectedElements[i]]);
        }

        return res;
    };

    SnapEditorControlWidgetEventHandlers.prototype._getDragParams = function (selectedElements, event) {
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

    SnapEditorControlWidgetEventHandlers.prototype._onSelectionContextMenu = function (selectedIds, mousePos) {
        var menuItems = {},
            MENU_EXPORT = 'export',
            MENU_EXINTCONF = 'exintconf', //kecso
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
                } else if (key === MENU_EXINTCONF){
                    self._exIntConf(selectedIds)
                }
            },
            this.snapCanvas.posToPageXY(mousePos.mX,
                mousePos.mY)
        );
    };

    SnapEditorControlWidgetEventHandlers.prototype._exportItems = function (selectedIds) {
        var i = selectedIds.length,
            gmeIDs = [];

        while(i--) {
            gmeIDs.push(this._ComponentID2GmeID[selectedIds[i]]);
        }

        ExportManager.exportMultiple(gmeIDs);
    };

    //kecso
    SnapEditorControlWidgetEventHandlers.prototype._exIntConf = function (selectedIds) {
        var i = selectedIds.length,
            gmeIDs = [];

        while(i--) {
            gmeIDs.push(this._ComponentID2GmeID[selectedIds[i]]);
        }

        ExportManager.exIntConf(gmeIDs);
    };

    SnapEditorControlWidgetEventHandlers.prototype._onSelectionFillColorChanged = function (selectedElements, color) {
        this._onSelectionSetColor(selectedElements, color, REGISTRY_KEYS.COLOR);
    };

    SnapEditorControlWidgetEventHandlers.prototype._onSelectionBorderColorChanged = function (selectedElements, color) {
        this._onSelectionSetColor(selectedElements, color, REGISTRY_KEYS.BORDER_COLOR);
    };

    SnapEditorControlWidgetEventHandlers.prototype._onSelectionTextColorChanged = function (selectedElements, color) {
        this._onSelectionSetColor(selectedElements, color, REGISTRY_KEYS.TEXT_COLOR);
    };

    SnapEditorControlWidgetEventHandlers.prototype._onSelectionSetColor = function (selectedIds, color, regKey) {
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


    SnapEditorControlWidgetEventHandlers.prototype._onSelectedTabChanged = function (tabID) {
        if (this._aspects[tabID] && this._selectedAspect !== this._aspects[tabID]) {
            this._selectedAspect = this._aspects[tabID];

            this.logger.debug('selectedAspectChanged: ' + this._selectedAspect);

            this._initializeSelectedAspect();
        }
    };


    return SnapEditorControlWidgetEventHandlers;
});
