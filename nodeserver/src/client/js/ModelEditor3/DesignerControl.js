"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'js/Constants',
    'js/NodePropertyNames',
    'js/ModelEditor3/DesignerControl.DesignerCanvasEventHandlers',
    'js/ModelEditor3/DesignerControl.DEBUG'], function (logManager,
                                                        util,
                                                        commonUtil,
                                                        CONSTANTS,
                                                        nodePropertyNames,
                                                        DesignerControlDesignerCanvasEventHandlers,
                                                        DesignerControlDEBUG) {

    var DesignerControl,
        DECORATOR_PATH = "js/ModelEditor3/Decorators/",      //TODO: fix path;
        GME_ID = "GME_ID";

    DesignerControl = function (options) {
        var self = this,
            $btnGroupAutoRename,
            $btnGroupAutoCreateModel,
            $btnGroupPrintNodeData,
            $btnGroupAutoCreateConnection;

        this.logger = options.logger || logManager.create(options.loggerName || "DesignerControl");

        if (options.client === undefined) {
            this.logger.error("DesignerControl's client is not specified...");
            throw ("DesignerControl can not be created");
        }

        if (options.widget === undefined) {
            this.logger.error("DesignerControl's DesignerCanvas is not specified...");
            throw ("DesignerControl can not be created");
        }

        //initialize core collections and variables
        this.designerCanvas = options.widget;

        this._client = options.client;
        this._selfPatterns = {};
        this._components = {};
        this._GmeID2ComponentID = {};
        this._ComponentID2GmeID = {};
        this.decoratorClasses = {};
        this.eventQueue = [];

        //local variable holding info about the currently opened node
        this.currentNodeInfo = {"id": null, "children" : [], "parentId": null };



        /****************** ADD BUTTONS AND THEIR EVENT HANDLERS TO DESIGNER CANVAS ******************/

        /************** GOTO PARENT IN HIERARCHY BUTTON ****************/
        this.$btnGroupModelHierarchyUp = this.designerCanvas.addButtonGroup(function (/*event, data*/) {
            self._onModelHierarchyUp();
        });

        this.designerCanvas.addButton({ "title": "Go to parent",
            "icon": "icon-circle-arrow-up"}, this.$btnGroupModelHierarchyUp );

        this.$btnGroupModelHierarchyUp.hide();

        /************** END OF - GOTO PARENT IN HIERARCHY BUTTON ****************/




        if (commonUtil.DEBUG === true) {
            /************** AUTO RENAME GME NODES *****************/
            $btnGroupAutoRename = this.designerCanvas.addButtonGroup(function (/*event, data*/) {
                self._autoRenameGMEObjects();
            });
            this.designerCanvas.addButton({ "title": "Auto rename",
                "icon": "icon-th-list"}, $btnGroupAutoRename );

            /************** END OF - AUTO RENAME GME NODES *****************/

            /************** AUTO CREATE NEW NODES *****************/
            $btnGroupAutoCreateModel = this.designerCanvas.addButtonGroup(function (event, data) {
                self._createGMEModels(data.num);
            });

            this.designerCanvas.addButton({ "title": "Create 1",
                "icon": "icon-plus-sign",
                "text": "1",
                "data": { "num": 1 }}, $btnGroupAutoCreateModel );

            this.designerCanvas.addButton({ "title": "Create 5",
                "icon": "icon-plus-sign",
                "text": "5",
                "data": { "num": 5 }}, $btnGroupAutoCreateModel );

            this.designerCanvas.addButton({ "title": "Create 10",
                "icon": "icon-plus-sign",
                "text": "10",
                "data": { "num": 10 }}, $btnGroupAutoCreateModel );

            /************** END OF - AUTO CREATE NEW NODES *****************/

            /************** AUTO CREATE NEW CONNECTIONS *****************/
            $btnGroupAutoCreateConnection = this.designerCanvas.addButtonGroup(function (event, data) {
                self._createGMEConnections(data.num);
            });

            this.designerCanvas.addButton({ "title": "Create 1 connection",
                "icon": "icon-resize-horizontal",
                "text": "1",
                "data": { "num": 1 }}, $btnGroupAutoCreateConnection );

            this.designerCanvas.addButton({ "title": "Create 5 connections",
                "icon": "icon-resize-horizontal",
                "text": "5",
                "data": { "num": 5 }}, $btnGroupAutoCreateConnection );

            this.designerCanvas.addButton({ "title": "Create 10 connections",
                "icon": "icon-resize-horizontal",
                "text": "10",
                "data": { "num": 10 }}, $btnGroupAutoCreateConnection );

            this.designerCanvas.addButton({ "title": "Create 50 connections",
                "icon": "icon-resize-horizontal",
                "text": "50",
                "data": { "num": 50 }}, $btnGroupAutoCreateConnection );

            this.designerCanvas.addButton({ "title": "Create 100 connections",
                "icon": "icon-resize-horizontal",
                "text": "100",
                "data": { "num": 100 }}, $btnGroupAutoCreateConnection );

            /************** END OF - AUTO CREATE NEW CONNECTIONS *****************/

            /************** PRINT NODE DATA *****************/
            $btnGroupPrintNodeData = this.designerCanvas.addButtonGroup(function (/*event, data*/) {
                self._printNodeData();
            });

            this.designerCanvas.addButton({ "title": "Print node data",
                "icon": "icon-share"}, $btnGroupPrintNodeData );

            /************** END OF - PRINT NODE DATA *****************/
        }

        /****************** END OF - ADD BUTTONS AND THEIR EVENT HANDLERS TO DESIGNER CANVAS ******************/



        //attach all the event handlers for event's coming from DesignerCanvas
        this.attachDesignerCanvasEventHandlers();

        this.logger.debug("DesignerControl ctor finished");
    };

    DesignerControl.prototype.selectedObjectChanged = function (nodeId) {
        var desc = this._getObjectDescriptor(nodeId);

        this.logger.debug("SELECTEDOBJECT_CHANGED nodeId '" + nodeId + "'");

        //delete everything from model editor
        this.designerCanvas.clear();

        //clean up local hash map
        this._components = {};
        
        this._GMEModels = [];
        this._GMEConnections = [];
        
        this._GmeID2ComponentID = {};
        this._ComponentID2GmeID = {};

        this._GMEID2Subcomponent = {};
        this._Subcomponent2GMEID = {};

        //remove current territory patterns
        if (this.currentNodeInfo.id) {
            this._client.removeUI(this._territoryId);
        }

        if (nodeId) {
            this.currentNodeInfo.id = nodeId;
            this.currentNodeInfo.parentId = desc.parentId;

            if (this.currentNodeInfo.parentId) {
                this.$btnGroupModelHierarchyUp.show();
            } else {
                this.$btnGroupModelHierarchyUp.hide();
            }


            //put new node's info into territory rules
            this._selfPatterns = {};
            this._selfPatterns[nodeId] = { "children": 2 };

            this.designerCanvas.setTitle(desc.name);

            this.designerCanvas.showPogressbar();

            this._territoryId = this._client.addUI(this, true);
            //update the territory
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        }
    };

    DesignerControl.prototype._getObjectDescriptor = function (nodeId) {
        var nodeObj = this._client.getNode(nodeId),
            objDescriptor,
            pos;

        if (nodeObj) {
            objDescriptor = {};

            objDescriptor.id = nodeObj.getId();
            objDescriptor.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name);
            objDescriptor.parentId = nodeObj.getParentId();

            //fill the descriptor based on its type
            if (nodeObj.getBaseId() === "connection") {
                objDescriptor.kind = "CONNECTION";
                objDescriptor.source = nodeObj.getPointer("source").to;
                objDescriptor.target = nodeObj.getPointer("target").to;
                if (nodeObj.getAttribute(nodePropertyNames.Attributes.directed) === true) {
                    objDescriptor.arrowEnd = "block";
                }
                objDescriptor.lineType =  nodeObj.getRegistry(nodePropertyNames.Registry.lineType) || "L";
                objDescriptor.segmentPoints = nodeObj.getRegistry(nodePropertyNames.Registry.segmentPoints);
            } else {
                objDescriptor.kind = "MODEL";
                pos = nodeObj.getRegistry(nodePropertyNames.Registry.position);

                objDescriptor.position = { "x": pos.x, "y": pos.y};

                if (objDescriptor.position.hasOwnProperty("x")) {
                    objDescriptor.position.x = this._getDefaultValueForNumber(objDescriptor.position.x, 0);
                } else {
                    objDescriptor.position.x = 0;
                }

                if (objDescriptor.position.hasOwnProperty("y")) {
                    objDescriptor.position.y = this._getDefaultValueForNumber(objDescriptor.position.y, 0);
                } else {
                    objDescriptor.position.y = 0;
                }

                objDescriptor.decorator = nodeObj.getRegistry(nodePropertyNames.Registry.decorator);
                if (objDescriptor.decorator !== "DefaultDecorator" &&
                    objDescriptor.decorator !== "CircleDecorator" &&
                    objDescriptor.decorator !== "DecoratorWithPorts") {
                    objDescriptor.decorator = "DecoratorWithPorts";
                }
                /*objDescriptor.decorator = "DefaultDecorator";*/
            }
        }

        return objDescriptor;
    };

    DesignerControl.prototype._getDefaultValueForNumber = function (cValue, defaultValue) {
        if (_.isNumber(cValue)) {
            if (_.isNaN(cValue)) {
                return defaultValue;
            }
        } else {
            return defaultValue;
        }

        //cValue is a number, simply return it
        return cValue;
    };

    // PUBLIC METHODS
    DesignerControl.prototype.onOneEvent = function (events) {
        var i = events ? events.length : 0;

        this.logger.debug("onOneEvent '" + i + "' items");

        if (i > 0) {
            this.eventQueue.push(events);
            this.processNextInQueue();
        }

        this.logger.debug("onOneEvent '" + events.length + "' items - DONE");
    };

    DesignerControl.prototype.processNextInQueue = function () {
        var nextBatchInQueue,
            len = this.eventQueue.length,
            decoratorsToDownload = [],
            itemDecorator;

        if (len > 0) {
            nextBatchInQueue = this.eventQueue.pop();

            len = nextBatchInQueue.length;

            while (len--) {
                if ( (nextBatchInQueue[len].etype === CONSTANTS.TERRITORY_EVENT_LOAD) || (nextBatchInQueue[len].etype === CONSTANTS.TERRITORY_EVENT_UPDATE)) {
                    nextBatchInQueue[len].desc = nextBatchInQueue[len].debugEvent ? _.extend({}, this._getObjectDescriptorDEBUG(nextBatchInQueue[len].eid) ) : this._getObjectDescriptor(nextBatchInQueue[len].eid);

                    itemDecorator = nextBatchInQueue[len].desc.decorator;

                    if (itemDecorator && itemDecorator !== "") {
                        if (!this.decoratorClasses.hasOwnProperty(itemDecorator)) {
                            decoratorsToDownload.pushUnique(itemDecorator);

                            //TODO: hack
                            decoratorsToDownload.pushUnique("DefaultDecorator");
                            decoratorsToDownload.pushUnique("CircleDecorator");
                        }
                    }
                }
            }

            if (decoratorsToDownload.length === 0) {
                //all the required decorators are already available
                this._dispatchEvents(nextBatchInQueue);
            } else {
                //few decorators need to be downloaded
                this._downloadDecorators(decoratorsToDownload, { "fn": this._dispatchEvents,
                                                                 "context": this,
                                                                 "data": nextBatchInQueue });
            }
        }
    };

    DesignerControl.prototype._downloadDecorators = function (decoratorList, callBack) {
        var len = decoratorList.length,
            decoratorName,
            processRemainingList,
            self = this;

        processRemainingList = function () {
            var len = decoratorList.length;

            if (len > 0) {
                self._downloadDecorators(decoratorList, callBack);
            } else {
                self.logger.debug("All downloaded...");
                callBack.fn.call(callBack.context, callBack.data);
            }
        };

        this.logger.debug("Remaining: " + len);

        if (len > 0) {
            decoratorName = decoratorList.pop();

            require([DECORATOR_PATH + decoratorName + "/" + decoratorName],
                function (decoratorClass) {
                    self.logger.warning("downloaded:" + decoratorName);
                    self.decoratorClasses[decoratorName] = decoratorClass;
                    /*self.decoratorClasses[decoratorName].prototype.setControlSpecificAttributes = function () {
                        this.designerControl = self;
                    };*/
                    processRemainingList();
                },
                function (err) {
                    //for any error store undefined in the list and the default decorator will be used on the canvas
                    self.logger.error("Failed to load decorator because of '" + err.requireType + "' with module '" + err.requireModules[0] + "'. Fallback to default...");
                    self.decoratorClasses[decoratorName] = undefined;
                    processRemainingList();
                });
        }
    };

    DesignerControl.prototype._dispatchEvents = function (events) {
        var i = events.length,
            e;

        this.logger.debug("_dispatchEvents '" + i + "' items");

        this.designerCanvas.beginUpdate();

        this.delayedEvents = [];

        this.firstRun = true;

        while (i--) {
            e = events[i];
            switch (e.etype) {
                case CONSTANTS.TERRITORY_EVENT_LOAD:
                    this._onLoad(e.eid, e.desc);
                    break;
                case CONSTANTS.TERRITORY_EVENT_UPDATE:
                    this._onUpdate(e.eid, e.desc);
                    break;
                case CONSTANTS.TERRITORY_EVENT_UNLOAD:
                    this._onUnload(e.eid);
                    break;
            }
        }

        this.firstRun = false;

        i = this.delayedEvents.length;

        while (i--) {
            e = this.delayedEvents[i];
            switch (e.etype) {
                case CONSTANTS.TERRITORY_EVENT_LOAD:
                    this._onLoad(e.eid, e.desc);
                    break;
            }
        }



        this.delayedEvents = [];

        this.designerCanvas.endUpdate();

        this.designerCanvas.hidePogressbar();

        this.logger.debug("_dispatchEvents '" + events.length + "' items - DONE");

        //continue processing event queue
        this.processNextInQueue();
    };

    // PUBLIC METHODS
    DesignerControl.prototype._onLoad = function (gmeID, objD) {
        var uiComponent,
            i,
            GMESrcId,
            GMEDstId,
            decClass,
            objDesc,
            sources = [],
            destinations = [];

        //component loaded
        //we are interested in the load of sub_components of the opened component
        if (this.currentNodeInfo.id !== gmeID) {
            if (objD) {
                if (objD.parentId == this.currentNodeInfo.id) {
                    objDesc = _.extend({}, objD);
                    this._GmeID2ComponentID[gmeID] = [];

                    if (objDesc.kind === "MODEL") {

                        this._GMEModels.push(gmeID);

                        decClass = this.decoratorClasses[objDesc.decorator];

                        objDesc.decoratorClass = decClass;
                        objDesc.control = this;
                        objDesc.metaInfo = {};
                        objDesc.metaInfo[CONSTANTS.GME_ID] = gmeID;

                        uiComponent = this.designerCanvas.createDesignerItem(objDesc);

                        this._GmeID2ComponentID[gmeID].push(uiComponent.id);
                        this._ComponentID2GmeID[uiComponent.id] = gmeID;
                    }

                    if (objDesc.kind === "CONNECTION") {
                        if (this.firstRun === true) {
                            this.delayedEvents.push({ "etype": CONSTANTS.TERRITORY_EVENT_LOAD,
                                "eid": gmeID,
                                "desc": objD });
                        } else {
                            GMESrcId = objDesc.source;
                            GMEDstId = objDesc.target;

                            this._GMEConnections.push(gmeID);

                            if (this._GmeID2ComponentID.hasOwnProperty(GMESrcId)) {
                                //src is a DesignerItem
                                i = this._GmeID2ComponentID[GMESrcId].length;
                                while (i--) {
                                    sources.push( {"objId" : this._GmeID2ComponentID[GMESrcId][i],
                                                   "subCompId" : undefined } );
                                }
                            } else {
                                //src is not a DesignerItem
                                //must be a sub_components somewhere, find the corresponding designerItem
                                if (this._GMEID2Subcomponent && this._GMEID2Subcomponent.hasOwnProperty(GMESrcId)) {
                                    for (i in this._GMEID2Subcomponent[GMESrcId]) {
                                        if (this._GMEID2Subcomponent[GMESrcId].hasOwnProperty(i)) {
                                            sources.push( {"objId" : i,
                                                "subCompId" : this._GMEID2Subcomponent[GMESrcId][i] } );
                                        }
                                    }
                                }
                            }

                            if (this._GmeID2ComponentID.hasOwnProperty(GMEDstId)) {
                                i = this._GmeID2ComponentID[GMEDstId].length;
                                while (i--) {
                                    destinations.push( {"objId" : this._GmeID2ComponentID[GMEDstId][i],
                                        "subCompId" : undefined } );
                                }
                            } else {
                                //dst is not a DesignerItem
                                //must be a sub_components somewhere, find the corresponding designerItem
                                if (this._GMEID2Subcomponent && this._GMEID2Subcomponent.hasOwnProperty(GMEDstId)) {
                                    for (i in this._GMEID2Subcomponent[GMEDstId]) {
                                        if (this._GMEID2Subcomponent[GMEDstId].hasOwnProperty(i)) {
                                            destinations.push( {"objId" : i,
                                                "subCompId" : this._GMEID2Subcomponent[GMEDstId][i] } );
                                        }
                                    }
                                }
                            }

                            var k = sources.length;
                            var l = destinations.length;

                            while (k--) {
                                while (l--) {
                                    objDesc.srcObjId = sources[k].objId;
                                    objDesc.srcSubCompId = sources[k].subCompId;
                                    objDesc.dstObjId = destinations[l].objId;
                                    objDesc.dstSubCompId = destinations[l].subCompId;
                                    objDesc.reconnectable = true;

                                    delete objDesc.source;
                                    delete objDesc.target;

                                    uiComponent = this.designerCanvas.createConnection(objDesc);

                                    this._GmeID2ComponentID[gmeID].push(uiComponent.id);
                                    this._ComponentID2GmeID[uiComponent.id] = gmeID;
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    DesignerControl.prototype._onUpdate = function (gmeID, objDesc) {
        var componentID,
            len,
            decClass,
            objId,
            sCompId;

        //self or child updated
        //check if the updated object is the opened node
        if (gmeID === this.currentNodeInfo.id) {
            //the updated object is the parent whose children are displayed here
            //the interest about the parent is:
            // - name change
            this.designerCanvas.setTitle(objDesc.name);
        } else {
            if (objDesc) {
                if (objDesc.parentId == this.currentNodeInfo.id) {
                    if (objDesc.kind === "MODEL") {
                        len = this._GmeID2ComponentID[gmeID].length;
                        while (len--) {
                            componentID = this._GmeID2ComponentID[gmeID][len];

                            decClass = this.decoratorClasses[objDesc.decorator];

                            objDesc.decoratorClass = decClass;

                            this.designerCanvas.updateDesignerItem(componentID, objDesc);
                        }
                    }

                    //there is a connection associated with this GMEID
                    if (this._GMEConnections.indexOf(gmeID) !== -1) {
                        len = this._GmeID2ComponentID[gmeID].length;
                        while (len--) {
                            componentID =  this._GmeID2ComponentID[gmeID][len];
                            this.designerCanvas.deleteComponent(componentID);
                        }

                        this.delayedEvents.push({ "etype": CONSTANTS.TERRITORY_EVENT_LOAD,
                            "eid": gmeID,
                            "desc": objDesc });
                    }
                } else {
                    //update about a subcomponent - will be handled in the decorator
                    //find the host and send update to it
                    for (objId in this._GMEID2Subcomponent[gmeID]) {
                        if (this._GMEID2Subcomponent[gmeID].hasOwnProperty(objId)) {
                            sCompId = this._GMEID2Subcomponent[gmeID][objId];
                            this.designerCanvas.updateDesignerItemSubComponent(objId, sCompId);
                        }
                    }
                }
            }
        }
    };

    DesignerControl.prototype._onUnload = function (gmeID) {
        var componentID,
            len;

        if (gmeID === this.currentNodeInfo.id) {
            //the opened model has been deleted....
            this.designerCanvas.setTitle("The currently opened model has been deleted (TODO)");
            this.logger.error("NOT YET IMPLEMENTED: 'The currently opened model has been deleted'");
        } else {
            if (this._GmeID2ComponentID.hasOwnProperty(gmeID)) {
                len = this._GmeID2ComponentID[gmeID].length;
                while (len--) {
                    componentID = this._GmeID2ComponentID[gmeID][len];

                    this.designerCanvas.deleteComponent(componentID);

                    delete this._ComponentID2GmeID[componentID];
                }

                delete this._GmeID2ComponentID[gmeID];
            } else {
                //probably a subcomponent has been deleted - will be handled in the decorator
            }
        }
    };

    //TODO: check this here...
    DesignerControl.prototype.destroy = function () {
        this._client.removeUI(this._territoryId);
    };



    DesignerControl.prototype._autoRenameGMEObjects = function () {
        var i = this._GMEModels.length,
            counter = i,
            prefix = "MODEL_";

        this._client.startTransaction();
        while (i--) {
            this._client.setAttributes(this._GMEModels[i], nodePropertyNames.Attributes.name, prefix + (counter - i));
        }
        this._client.completeTransaction();
    };

    DesignerControl.prototype._createGMEModels = function (num) {
        var counter = this._GMEModels.length,
            prefix = "MODEL_";

        this._client.startTransaction();

        while (num--) {
            this._client.createChild({ "parentId": this.currentNodeInfo.id,
                "name": prefix + counter });

            counter += 1;
        }
        this._client.completeTransaction();
    };

    DesignerControl.prototype._createGMEConnections = function (num) {
        var counter = this._GMEConnections.length,
            prefix = "Connection_",
            allGMEID = [],
            i,
            sourceId,
            targetId,
            connDesc;

        for (i in this._GmeID2ComponentID) {
            if (this._GmeID2ComponentID.hasOwnProperty(i)) {
                allGMEID.pushUnique(i);
            }
        }

        for (i in this._GMEID2Subcomponent) {
            if (this._GMEID2Subcomponent.hasOwnProperty(i)) {
                allGMEID.pushUnique(i);
            }
        }

        i = allGMEID.length;

        this._client.startTransaction();

        while (num--) {
            targetId = sourceId = Math.floor((Math.random()*( i / 2 )));
            while (targetId === sourceId) {
                targetId = Math.floor((Math.random()*(i / 2 ) + (i / 2)));
            }

            connDesc = {   "parentId": this.currentNodeInfo.id,
                "sourceId": allGMEID[sourceId],
                "targetId": allGMEID[targetId],
                "directed": true };

            this._client.makeConnection(connDesc);

            this.logger.warning(JSON.stringify(connDesc));

            counter += 1;
        }
        this._client.completeTransaction();
    };

    DesignerControl.prototype._onModelHierarchyUp = function () {
        if (this.currentNodeInfo.parentId) {
            this._client.setSelectedObjectId(this.currentNodeInfo.parentId);
        }
    };

    DesignerControl.prototype._printNodeData = function () {
        var idList = this.designerCanvas.selectionManager.selectedItemIdList,
            len = idList.length,
            node;

        while (len--) {
            node = this._client.getNode(this._ComponentID2GmeID[idList[len]]);

            if (node) {
                node.printData();
            }
        }
    };

    //attach DesignerControl - DesignerCanvas event handler functions
    _.extend(DesignerControl.prototype, DesignerControlDesignerCanvasEventHandlers.prototype);

    //in DEBUG mode add additional content to canvas
    if (commonUtil.DEBUG === true) {
        _.extend(DesignerControl.prototype, DesignerControlDEBUG.prototype);
    }

    return DesignerControl;
});
