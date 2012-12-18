"use strict";

define([], function () {

    var DesignerControlDEBUG,
        DEBUG_MODEL_TYPE = "MODEL",
        DEBUG_CONNECTION_TYPE = "CONNECTION",
        CONNECTIONSTEP = 10,
        LOAD_EVENT_NAME = "load",
        EVENT_TYPE_NAME = "etype",
        EVENT_ID_NAME = "eid",
        EVENT_DEBUG_TYPE = "debugEvent";

    DesignerControlDEBUG = function () {
    };

    DesignerControlDEBUG.prototype._addDebugModeExtensions = function () {
        this.logger.warning("DesignerControlDEBUG _addDebugModeExtensions activated...");

        this._debugTempDecorators = ['DefaultDecorator', 'CircleDecorator'/*, 'SlowRenderDecorator'*/];
        this._debugTempDecoratorsCount = this._debugTempDecorators.length;
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
            id = this._debugItemCounter;

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
            id = this._debugItemCounter;

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

    return DesignerControlDEBUG;
});
