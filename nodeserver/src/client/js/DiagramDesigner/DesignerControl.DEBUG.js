"use strict";

define([], function () {

    var DesignerControlDEBUG,
        DEBUG_MODEL_TYPE = "MODEL",
        DEBUG_CONNECTION_TYPE = "CONNECTION",
        CONNECTIONSTEP = 10,
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

        this._debugTempDecorators = ['DefaultDecorator', 'CircleDecorator'/*, 'SlowRenderDecorator'*/];
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
    };

    DesignerControlDEBUG.prototype._onDebugCreateItems = function (options) {
        var items = options.items || 0,
            conns = options.connections || 0,
            id,
            events = [],
            newEvent;

        this.logger.debug("DesignerControlDEBUG _onDebugCreateItems: " + JSON.stringify(options));

        this._debugObjectDescriptors = this._debugObjectDescriptors || {};
        this._debugItemIDs = this._debugItemIDs || [];
        this._debugConnectionsIDs = this._debugConnectionsIDs || [];

        this._debugX = this._debugX || 10;
        this._debugY = this._debugY || 10;
        this._debugItemCounter = this._debugItemCounter || 0;
        this._connectionEndIDCounter = this._connectionEndIDCounter || 0;

        //get descriptor for each item
        while (items--) {
            id = this._debugItemCounter + "";

            this._debugObjectDescriptors[id] = this._generateObjectDescriptorDEBUG(id, DEBUG_MODEL_TYPE);
            this._debugItemIDs.push(id);

            //create new event for this item
            newEvent = {};
            newEvent[EVENT_TYPE_NAME] = LOAD_EVENT_NAME;
            newEvent[EVENT_ID_NAME] = id;
            newEvent[EVENT_DEBUG_TYPE] = true;

            events.push( newEvent );

            this._debugItemCounter += 1;
        }

        while (conns--) {
            id = this._debugItemCounter + "";

            this._debugObjectDescriptors[id] = this._generateObjectDescriptorDEBUG(id, DEBUG_CONNECTION_TYPE);
            this._debugConnectionsIDs.push(id);

            //create new event for this connection
            newEvent = {};
            newEvent[EVENT_TYPE_NAME] = LOAD_EVENT_NAME;
            newEvent[EVENT_ID_NAME] = id;
            newEvent[EVENT_DEBUG_TYPE] = true;

            events.push( newEvent );

            this._debugItemCounter += 1;
        }

        this.onOneEvent(events);
    };

    DesignerControlDEBUG.prototype._generateObjectDescriptorDEBUG = function (id, type) {
        var objDescriptor;

        objDescriptor = this._debugObjectDescriptors[id] || {};

        if (_.isEmpty(objDescriptor)) {

            objDescriptor.id = id;
            objDescriptor.name =  type + "_" + id;
            objDescriptor.kind = type;
            objDescriptor.parentId = null;  //TODO: no parent yet

            //fill the descriptor based on its type
            if (type === DEBUG_CONNECTION_TYPE) {
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
                objDescriptor.position = { "x": this._debugX, "y": this._debugY};

                this._debugX += 100;

                if (this._debugX > 1500) {
                    this._debugX = 10;
                    this._debugY += 100;
                }

                objDescriptor.decorator = this._debugTempDecorators[id % this._debugTempDecoratorsCount];
            }
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
                    //filteredIDs = this._filterItems(DEBUG_CONNECTION_TYPE, selectedIDs);
                    break;
                case "connectionsreconnect":
                    //filteredIDs = this._filterItems(DEBUG_CONNECTION_TYPE, selectedIDs);
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


    /******************** DEBUG DELETE HANDLERS ***********************/

    DesignerControlDEBUG.prototype._onDebugDeleteItems = function (type, selectedIDs) {
        var i = selectedIDs.length,
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
