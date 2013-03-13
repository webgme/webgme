"use strict";

define([], function () {

    var DesignerControlDEBUG,
        DEBUG_MODEL_TYPE = "MODEL",
        DEBUG_CONNECTION_TYPE = "CONNECTION",
        CONNECTIONSTEP = 11,
        LOAD_EVENT_NAME = "load",
        UPDATE_EVENT_NAME = "update",
        UNLOAD_EVENT_NAME = "unload",
        EVENT_TYPE_NAME = "etype",
        EVENT_ID_NAME = "eid",
        EVENT_DEBUG_TYPE = "debugEvent";

    DesignerControlDEBUG = function () {
    };

    DesignerControlDEBUG.prototype._addDebugModeExtensions = function () {
        var self = this;

        this.logger.warning("DesignerControlDEBUG _addDebugModeExtensions activated...");

        this._debugObjectDescriptors = this._debugObjectDescriptors || {};
        this._debugItemIDs = this._debugItemIDs || [];
        this._debugConnectionsIDs = this._debugConnectionsIDs || [];

        this._debugItemCounter = this._debugItemCounter || 0;

        this._debugTempDecorators = ['DefaultDecorator', 'CircleDecorator', 'DecoratorWithPorts'];
        this._debugTempDecoratorsCount = this._debugTempDecorators.length;

        //DEBUG mode extensions
        this.designerCanvas.onDebugCreateItems = function (options) {
            self._onDebugCreateItems(options);
        };

        this.designerCanvas.onDebugUpdateItems = function (type, selectedIDs) {
            self._onDebugUpdateItems(type, selectedIDs);
        };

        this.designerCanvas.onDebugDeleteItems = function (type, selectedIDs) {
            self._onDebugDeleteItems(type, selectedIDs);
        };

        /*********** OVERRIDE NON-DEBUG HANDLERS ***************/

        this.designerCanvas._onDesignerItemsMove = this.designerCanvas.onDesignerItemsMove;
        this.designerCanvas.onDesignerItemsMove = function (repositionDesc) {
            var UIid,
                objId,
                desc,
                debugIDs = [];

            for (UIid in repositionDesc) {
                if (repositionDesc.hasOwnProperty(UIid)) {
                    objId = self.componentsMapRev[UIid];
                    if (commonUtil.DEBUG === true && self._debugItemIDs.indexOf(objId) !== -1) {
                        desc = self._generateObjectDescriptorDEBUG(objId);

                        desc.position.x = repositionDesc[UIid].x;
                        desc.position.y = repositionDesc[UIid].y;

                        delete repositionDesc[UIid];

                        debugIDs.push(objId);
                    }
                }
            }

            self._dispatchUpdateEvent(debugIDs);

            self.designerCanvas._onDesignerItemsMove(repositionDesc);
        };

        this.designerCanvas._onCreateNewConnection = this.designerCanvas.onCreateNewConnection;
        this.designerCanvas.onCreateNewConnection = function (params) {
            var src = self.componentsMapRev[params.src],
                dst = self.componentsMapRev[params.dst],
                desc;

            if (commonUtil.DEBUG && (self._debugItemIDs.indexOf(src) !== -1 || self._debugItemIDs.indexOf(dst) !== -1)) {

                desc =  self._generateObjectDescriptorDEBUG(-1, DEBUG_CONNECTION_TYPE);

                desc.source = src;
                desc.target = dst;

                self._dispatchCreateEvent([desc.id]);

            } else {
                self.designerCanvas._onCreateNewConnection(params);
            }
        };

        this.designerCanvas._onSelectionDelete = this.designerCanvas.onSelectionDelete;
        this.designerCanvas.onSelectionDelete = function (idList) {
            var i = idList.length,
                debugIDs = [],
                realIDs = [];

            while(i--) {
                if (commonUtil.DEBUG && (self._debugItemIDs.indexOf(self.componentsMapRev[idList[i]]) !== -1 || self._debugConnectionsIDs.indexOf(self.componentsMapRev[idList[i]]) !== -1)) {
                    debugIDs.push(self.componentsMapRev[idList[i]]);
                } else {
                    realIDs.push(idList[i]);
                }

            }

            self._onDebugDeleteItems("connections", debugIDs);
            self._onDebugDeleteItems("items", debugIDs);

            self.designerCanvas._onSelectionDelete(realIDs);
        };

        this.__getObjectDescriptor = this._getObjectDescriptor;
        this._getObjectDescriptor = function (nodeId) {
            if (this._debugObjectDescriptors[nodeId]) {
                return this._getObjectDescriptorDEBUG(nodeId);
            } else {
                return this.__getObjectDescriptor(nodeId);
            }
        };

        /*********/
        this.designerCanvas._onDesignerItemsCopy = this.designerCanvas.onDesignerItemsCopy;
        this.designerCanvas.onDesignerItemsCopy = function (copyDesc) {
            var id,
                uidesc,
                newObjDesc,
                oldObjDesc,
                objectIDs = [],
                lookUpTable = {},
                newId;

            for (id in copyDesc.items) {
                uidesc = copyDesc.items[id];

                if (self._debugItemIDs.indexOf(self.componentsMapRev[uidesc.oItemId]) !== -1) {
                    oldObjDesc = self._generateObjectDescriptorDEBUG(self.componentsMapRev[uidesc.oItemId]);

                    newObjDesc = self._generateObjectDescriptorDEBUG(-1, DEBUG_MODEL_TYPE);

                    newObjDesc.position.x = uidesc.posX;
                    newObjDesc.position.y = uidesc.posY;

                    newObjDesc.name =  oldObjDesc.name;
                    newObjDesc.kind = oldObjDesc.kind;
                    newObjDesc.parentId = oldObjDesc.parentId;

                    newObjDesc.decorator = oldObjDesc.decorator;

                    objectIDs.push(newObjDesc.id);

                    lookUpTable[id] = newObjDesc.id;

                    //remove UI object
                    self.designerCanvas.deleteComponent(id);

                    //remove entry from copyDesc
                    delete copyDesc.items[id];
                }
            }

            for (id in copyDesc.connections) {
                uidesc = copyDesc.connections[id];

                if (self._debugConnectionsIDs.indexOf(self.componentsMapRev[uidesc.oConnectionId]) !== -1) {
                    oldObjDesc = self._generateObjectDescriptorDEBUG(self.componentsMapRev[uidesc.oConnectionId]);

                    newObjDesc = self._generateObjectDescriptorDEBUG(-1, DEBUG_CONNECTION_TYPE);

                    newId = newObjDesc.id;

                    //copy over properties from the old one
                    _.extend(newObjDesc, oldObjDesc);

                    newObjDesc.id = newId;

                    if (lookUpTable.hasOwnProperty(uidesc.src)) {
                        newObjDesc.source = lookUpTable[uidesc.src];
                    } else {
                        newObjDesc.source = self.componentsMapRev[uidesc.src];
                    }

                    if (lookUpTable.hasOwnProperty(uidesc.dst)) {
                        newObjDesc.target = lookUpTable[uidesc.dst];
                    } else {
                        newObjDesc.target = self.componentsMapRev[uidesc.dst];
                    }

                    objectIDs.push(newObjDesc.id);

                    //remove UI object
                    self.designerCanvas.deleteComponent(id);

                    //remove entry from copyDesc
                    delete copyDesc.connections[id];
                }
            }

            self._dispatchCreateEvent(objectIDs);

            self.designerCanvas._onDesignerItemsCopy(copyDesc);
        };
        /*********/
    };

    DesignerControlDEBUG.prototype._dispatchUpdateEvent = function (idList) {
        var i = idList.length,
            newEvent,
            events = [];

        if (i > 0) {
            while(i--) {
                newEvent = {};
                newEvent[EVENT_TYPE_NAME] = UPDATE_EVENT_NAME;
                newEvent[EVENT_ID_NAME] = idList[i];
                newEvent[EVENT_DEBUG_TYPE] = true;

                events.push( newEvent );
            }

            this.onOneEvent(events);
        }
    };

    DesignerControlDEBUG.prototype._dispatchCreateEvent = function (idList) {
        var i = idList.length,
            newEvent,
            events = [];

        if (i > 0) {
            while(i--) {
                newEvent = {};
                newEvent[EVENT_TYPE_NAME] = LOAD_EVENT_NAME;
                newEvent[EVENT_ID_NAME] = idList[i];
                newEvent[EVENT_DEBUG_TYPE] = true;

                events.push( newEvent );
            }

            this.onOneEvent(events);
        }
    };

    DesignerControlDEBUG.prototype._onDebugCreateItems = function (options) {
        var items = options.items || 0,
            conns = options.connections || 0,
            desc,
            events = [],
            newEvent;

        this.logger.debug("DesignerControlDEBUG _onDebugCreateItems: " + JSON.stringify(options));

        this._debugX = this._debugX || 10;
        this._debugY = this._debugY || 10;
        this._connectionEndIDCounter = this._connectionEndIDCounter || 0;

        //get descriptor for each item
        while (items--) {
            desc = this._generateObjectDescriptorDEBUG(-1, DEBUG_MODEL_TYPE);

            //create new event for this item
            newEvent = {};
            newEvent[EVENT_TYPE_NAME] = LOAD_EVENT_NAME;
            newEvent[EVENT_ID_NAME] = desc.id;
            newEvent[EVENT_DEBUG_TYPE] = true;

            events.push( newEvent );
        }

        while (conns--) {
            desc = this._generateObjectDescriptorDEBUG(-1, DEBUG_CONNECTION_TYPE);

            //create new event for this connection
            newEvent = {};
            newEvent[EVENT_TYPE_NAME] = LOAD_EVENT_NAME;
            newEvent[EVENT_ID_NAME] = desc.id;
            newEvent[EVENT_DEBUG_TYPE] = true;

            events.push( newEvent );
        }

        this.onOneEvent(events);
    };

    DesignerControlDEBUG.prototype._generateObjectDescriptorDEBUG = function (id, type) {
        var objDescriptor;

        if (id === null || id === undefined || id === -1) {
            id = this._debugItemCounter + "";
            this._debugItemCounter += 1;
        }

        objDescriptor = this._debugObjectDescriptors[id] || {};

        if (_.isEmpty(objDescriptor)) {

            objDescriptor.id = id;
            objDescriptor.name =  type + "_" + id;
            objDescriptor.kind = type;
            objDescriptor.parentId = null;  //TODO: no parent yet

            //fill the descriptor based on its type
            if (type === DEBUG_CONNECTION_TYPE) {

                this._debugConnectionsIDs.push(id);

                objDescriptor.source = this._debugItemIDs[this._connectionEndIDCounter];
                objDescriptor.target = this._debugItemIDs[(this._connectionEndIDCounter + CONNECTIONSTEP) % this._debugItemIDs.length];

                this._connectionEndIDCounter += 1;
                if (this._connectionEndIDCounter >= this._debugItemIDs.length) {
                    this._connectionEndIDCounter = 0;
                }

                objDescriptor.lineType = this._connectionEndIDCounter % 2 === 0 ? "B" : "L";
                //TODO: add a few segments, why not
                /*objDescriptor.segmentPoints = nodeObj.getRegistry(nodePropertyNames.Registry.segmentPoints);*/
            } else {
                this._debugItemIDs.push(id);

                objDescriptor.position = { "x": this._debugX, "y": this._debugY};

                this._debugX += 100;

                if (this._debugX > 1500) {
                    this._debugX = 10;
                    this._debugY += 100;
                }

                objDescriptor.decorator = this._debugTempDecorators[id % this._debugTempDecoratorsCount];
            }

            this._debugObjectDescriptors[id] = objDescriptor;
        }

        return objDescriptor;
    };

    DesignerControlDEBUG.prototype._getObjectDescriptorDEBUG = function (id) {
        return this._debugObjectDescriptors[id];
    };

    DesignerControlDEBUG.prototype._filterItems = function (type, itemIDs) {
        var len = itemIDs.length,
            filteredIDs = [],
            id;

        while (len--) {
            id = itemIDs[len];

            if (type === DEBUG_MODEL_TYPE) {
                if (this._debugItemIDs.indexOf(id) !== -1) {
                    filteredIDs.push(id);
                }
            }

            if (type === DEBUG_CONNECTION_TYPE) {
                if (this._debugConnectionsIDs.indexOf(id) !== -1) {
                    filteredIDs.push(id);
                }
            }
        }

        return filteredIDs;
    };

    DesignerControlDEBUG.prototype._onDebugUpdateItems = function (type, selectedIDs) {
        var i = selectedIDs.length,
            filteredIDs = [],
            events = [],
            newEvent;

        if (i > 0) {
            switch (type) {
                case "moveitems":
                    filteredIDs = this._filterItems(DEBUG_MODEL_TYPE, selectedIDs);
                    this._onDebugUpdateItems_MoveItems(filteredIDs);
                    break;
                case "renameitems":
                    filteredIDs = this._filterItems(DEBUG_MODEL_TYPE, selectedIDs);
                    this._onDebugUpdateItems_RenameItems(filteredIDs);
                    break;
                case "updateitemsdecorator":
                    filteredIDs = this._filterItems(DEBUG_MODEL_TYPE, selectedIDs);
                    this._onDebugUpdateItems_UpdateItemsDecorator(filteredIDs);
                    break;
                case "connections":
                    filteredIDs = this._filterItems(DEBUG_CONNECTION_TYPE, selectedIDs);
                    this._onDebugUpdateItems_UpdateConnections(filteredIDs);
                    break;
                case "connectionsreconnect":
                    filteredIDs = this._filterItems(DEBUG_CONNECTION_TYPE, selectedIDs);
                    this._onDebugUpdateItems_ReconnectConnections(filteredIDs);
                    break;
            }

            i = filteredIDs.length;
            if (i > 0) {
                while(i--) {
                    newEvent = {};
                    newEvent[EVENT_TYPE_NAME] = UPDATE_EVENT_NAME;
                    newEvent[EVENT_ID_NAME] = filteredIDs[i];
                    newEvent[EVENT_DEBUG_TYPE] = true;

                    events.push( newEvent );
                }

                this.onOneEvent(events);
            }
        }
    };

    DesignerControlDEBUG.prototype._onDebugUpdateItems_MoveItems = function (itemIDs) {
        var i = itemIDs.length,
            itemDesc,
            moveBy = 70;

        while (i--) {
            itemDesc = this._debugObjectDescriptors[itemIDs[i]];

            itemDesc.position.x += moveBy;
            itemDesc.position.y += moveBy;
        }
    };

    DesignerControlDEBUG.prototype._onDebugUpdateItems_RenameItems = function (itemIDs) {
        var i = itemIDs.length,
            itemDesc,
            postFix = "_ABC";

        while (i--) {
            itemDesc = this._debugObjectDescriptors[itemIDs[i]];

            itemDesc.name += postFix;
        }
    };

    DesignerControlDEBUG.prototype._onDebugUpdateItems_UpdateItemsDecorator = function (itemIDs) {
        var decorator,
            i = itemIDs.length,
            itemDesc;

        this._debugDecoratorChangeCounter = this._debugDecoratorChangeCounter || 0;
        decorator = this._debugTempDecorators[this._debugDecoratorChangeCounter % this._debugTempDecoratorsCount];

        this._debugDecoratorChangeCounter += 1;

        while (i--) {
            itemDesc = this._debugObjectDescriptors[itemIDs[i]];

            itemDesc.decorator = decorator;
        }
    };

    DesignerControlDEBUG.prototype._onDebugUpdateItems_UpdateConnections = function (connectionIDs) {
        var i = connectionIDs.length,
            connDesc;

        this._debugConnectionSegmentPointX = this._debugConnectionSegmentPointX || 10;
        this._debugConnectionSegmentPointY = this._debugConnectionSegmentPointY || 10;

        while (i--) {
            connDesc = this._debugObjectDescriptors[connectionIDs[i]];

            connDesc.segmentPoints = connDesc.segmentPoints || [];
            connDesc.segmentPoints.push({"x": this._debugConnectionSegmentPointX,
                                         "y": this._debugConnectionSegmentPointY });

            this._debugConnectionSegmentPointX += 20;
            if (this._debugConnectionSegmentPointX > 1000) {
                this._debugConnectionSegmentPointX = 10;
                this._debugConnectionSegmentPointY += 30;
            }
        }
    };

    DesignerControlDEBUG.prototype._onDebugUpdateItems_ReconnectConnections = function (connectionIDs) {
        var i = connectionIDs.length,
            connDesc;

        while (i--) {
            connDesc = this._debugObjectDescriptors[connectionIDs[i]];

            connDesc.target = this._debugItemIDs[(this._connectionEndIDCounter + CONNECTIONSTEP + i) % this._debugItemIDs.length];
        }
    };


    /******************** DEBUG DELETE HANDLERS ***********************/

    DesignerControlDEBUG.prototype._onDebugDeleteItems = function (type, selectedIDs) {
        var i,
            filteredIDs = [],
            events = [],
            newEvent,
            idx,
            id;


        switch (type) {
            case "items":
                filteredIDs = this._filterItems(DEBUG_MODEL_TYPE, selectedIDs);
                break;
            case "connections":
                filteredIDs = this._filterItems(DEBUG_CONNECTION_TYPE, selectedIDs);
                break;
            case "all":
                filteredIDs = this._debugItemIDs.concat(this._debugConnectionsIDs);
                break;
        }

        i = filteredIDs.length;
        if (i > 0) {
            while(i--) {
                newEvent = {};
                newEvent[EVENT_TYPE_NAME] = UNLOAD_EVENT_NAME;
                newEvent[EVENT_ID_NAME] = filteredIDs[i];
                newEvent[EVENT_DEBUG_TYPE] = true;

                events.push( newEvent );

                id = filteredIDs[i];

                delete this._debugObjectDescriptors[id];

                idx = this._debugItemIDs.indexOf(id);
                if (idx !== -1) {
                    this._debugItemIDs.splice(idx,1);
                } else {
                    idx = this._debugConnectionsIDs.indexOf(id);
                    if (idx !== -1) {
                        this._debugConnectionsIDs.splice(idx,1);
                    }
                }
            }

            this.onOneEvent(events);
        }
    };


    return DesignerControlDEBUG;
});
