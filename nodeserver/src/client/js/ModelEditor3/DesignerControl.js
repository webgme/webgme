"use strict";

define(['logManager',
    'clientUtil',
    'js/DiagramDesigner/NodePropertyNames',
    'js/ModelEditor3/DesignerControl.DEBUG'], function (logManager,
                                                        util,
                                                        nodePropertyNames,
                                                        DesignerControlDEBUG) {

    var DesignerControl,
        LOAD_EVENT_NAME = "load",
        UPDATE_EVENT_NAME = "update",
        DECORATOR_PATH = "js/ModelEditor3/Decorators/",      //TODO: fix path;
        ATTRIBUTES_STRING = "attributes",
        REGISTRY_STRING = "registry",
        GME_ID = "GME_ID",
        CONNECTION_SOURCE_NAME = "source",
        CONNECTION_TARGET_NAME = "target";


    DesignerControl = function (options) {
        var self = this,
            $btnGroupAutoRename,
            $btnGroupAutoCreateModel;

        this.logger = options.logger || logManager.create(options.loggerName || "DesignerControl");

        if (options.client === undefined) {
            this.logger.error("DesignerControl's client is not specified...");
            throw ("DesignerControl can not be created");
        }

        this._client = options.client;
        this._selfPatterns = {};
        this._components = {};
        this._GmeID2ComponentID = {};
        this._ComponentID2GmeID = {};
        this.decoratorClasses = {};
        this.eventQueue = [];

        if (options.designerCanvas === undefined) {
            this.logger.error("DesignerControl's DesignerCanvas is not specified...");
            throw ("DesignerControl can not be created");
        }
        this.designerCanvas = options.designerCanvas;

        /*OVERRIDE MODEL EDITOR METHODS*/
        this.designerCanvas.onDesignerItemsMove = function (repositionDesc) {
            var id;

            self._client.startTransaction();
            for (id in repositionDesc) {
                if (repositionDesc.hasOwnProperty(id)) {
                    self._client.setRegistry(self._ComponentID2GmeID[id], nodePropertyNames.Registry.position, { "x": repositionDesc[id].x, "y": repositionDesc[id].y });
                }
            }
            self._client.completeTransaction();
        };

        this.designerCanvas.onDesignerItemsCopy = function (copyDesc) {
            var copyOpts = { "parentId": self.currentNodeInfo.id },
                id,
                desc,
                gmeID;

            self.designerCanvas.beginUpdate();

            for (id in copyDesc.items) {
                if (copyDesc.items.hasOwnProperty(id)) {
                    desc = copyDesc.items[id];
                    gmeID = self._ComponentID2GmeID[desc.oItemId];

                    copyOpts[gmeID] = {};
                    copyOpts[gmeID][ATTRIBUTES_STRING] = {};
                    copyOpts[gmeID][REGISTRY_STRING] = {};

                    copyOpts[gmeID][REGISTRY_STRING][nodePropertyNames.Registry.position] = { "x": desc.posX, "y": desc.posY };

                    //remove the component from UI
                    //it will be recreated when the GME client calls back with the result
                    self.designerCanvas.deleteComponent(id);
                }
            }

            for (id in copyDesc.connections) {
                if (copyDesc.connections.hasOwnProperty(id)) {
                    desc = copyDesc.connections[id];
                    gmeID = self._ComponentID2GmeID[desc.oConnectionId];

                    copyOpts[gmeID] = {};

                    //remove the component from UI
                    //it will be recreated when the GME client calls back with the result
                    self.designerCanvas.deleteComponent(id);
                }
            }

            self.designerCanvas.endUpdate();

            self._client.intellyPaste(copyOpts);
        };

        this.designerCanvas.onCreateNewConnection = function (params) {
            var sourceId,
                targetId;

            if (params.srcSubCompId !== undefined) {
                sourceId = self._Subcomponent2GMEID[params.src][params.srcSubCompId];
            } else {
                sourceId = self._ComponentID2GmeID[params.src];
            }

            if (params.dstSubCompId !== undefined) {
                targetId = self._Subcomponent2GMEID[params.dst][params.dstSubCompId];
            } else {
                targetId = self._ComponentID2GmeID[params.dst];
            }

            self._client.makeConnection({   "parentId": self.currentNodeInfo.id,
                "sourceId": sourceId,
                "targetId": targetId,
                "directed": true });

            var p = {   "parentId": self.currentNodeInfo.id,
                "sourceId": sourceId,
                "targetId": targetId,
                "directed": true };

            self.logger.warning("onCreateNewConnection: " + JSON.stringify(p));
        };

        this.designerCanvas.onSelectionDelete = function (idList) {
            var objIdList = [],
                i = idList.length;

            while(i--) {
                objIdList.insertUnique(self._ComponentID2GmeID[idList[i]]);
            }

            if (objIdList.length > 0) {
                self._client.delMoreNodes(objIdList);
            }
        };

        this.designerCanvas.onDesignerItemDoubleClick = function (id, event) {
            var gmeID = self._ComponentID2GmeID[id];

            if (gmeID) {
                //TODO: somewhat tricked here for DEBUG purposes
                if (event.offsetX < 20 && event.offsetY < 20) {
                    self._switchToNextDecorator(gmeID);
                } else {
                    self.logger.debug("Opening model with id '" + gmeID + "'");
                    self._client.setSelectedObjectId(gmeID);
                }
            }
        };

        this.designerCanvas.onModifyConnectionEnd = function (params) {
            var gmeID = self._ComponentID2GmeID[params.id],
                oldDesc = params.old,
                newDesc = params.new,
                newEndPointGMEID;

            if (gmeID) {
                self._client.startTransaction();

                //update connection endpoint - SOURCE
                if (oldDesc.srcObjId !== newDesc.srcObjId ||
                    oldDesc.srcSubCompId !== newDesc.srcSubCompId) {
                    if (newDesc.srcSubCompId !== undefined ) {
                        newEndPointGMEID = self._Subcomponent2GMEID[newDesc.srcObjId][newDesc.srcSubCompId];
                    } else {
                        newEndPointGMEID = self._ComponentID2GmeID[newDesc.srcObjId];
                    }
                    self._client.makePointer(gmeID, CONNECTION_SOURCE_NAME, newEndPointGMEID);
                }

                //update connection endpoint - TARGET
                if (oldDesc.dstObjId !== newDesc.dstObjId ||
                    oldDesc.dstSubCompId !== newDesc.dstSubCompId) {
                    if (newDesc.dstSubCompId !== undefined ) {
                        newEndPointGMEID = self._Subcomponent2GMEID[newDesc.dstObjId][newDesc.dstSubCompId];
                    } else {
                        newEndPointGMEID = self._ComponentID2GmeID[newDesc.dstObjId];
                    }
                    self._client.makePointer(gmeID, CONNECTION_TARGET_NAME, newEndPointGMEID);
                }

                self._client.completeTransaction();
            }
        };

        this.designerCanvas.onRegisterSubcomponent = function (objID, sCompID, metaInfo) {
            //store that a subcomponent with a given ID has been added to object with objID
            self._GMEID2Subcomponent[metaInfo[GME_ID]] = self._GMEID2Subcomponent[metaInfo[GME_ID]] || {};
            self._GMEID2Subcomponent[metaInfo[GME_ID]][objID] = sCompID;

            self._Subcomponent2GMEID[objID] = self._Subcomponent2GMEID[objID] || {};
            self._Subcomponent2GMEID[objID][sCompID] = metaInfo[GME_ID];
            //TODO: add event handling here that a subcomponent appeared
        };

        this.designerCanvas.onUnregisterSubcomponent = function (objID, sCompID) {
            var gmeID = self._Subcomponent2GMEID[objID][sCompID];

            delete self._Subcomponent2GMEID[objID][sCompID];
            delete self._GMEID2Subcomponent[gmeID][objID];
            //TODO: add event handling here that a subcomponent disappeared
        };

        /************** GOTO PARENT **************************/

        this.$btnGroupModelHierarchyUp = this.designerCanvas.addButtonGroup(function (event, data) {
            self._onModelHierarchyUp();
        });

        this.designerCanvas.addButton({ "title": "Go to parent",
            "icon": "icon-circle-arrow-up"}, this.$btnGroupModelHierarchyUp );

        /************** END OF - GOTO PARENT **************************/

        /*END OF - OVERRIDE MODEL EDITOR METHODS*/

        //local variable holding info about the currently opened node
        this.currentNodeInfo = {"id": null, "children" : [], "parentId": null };

        //in DEBUG mode add additional content to canvas
        if (DEBUG) {
            //this._addDebugModeExtensions();
        }

        //add extra visual piece
        /************** AUTO RENAME *****************/
        $btnGroupAutoRename = this.designerCanvas.addButtonGroup(function (event, data) {
            self._autoRenameGMEObjects();
        });

        this.designerCanvas.addButton({ "title": "Auto rename",
            "icon": "icon-th-list"}, $btnGroupAutoRename );

        /************** AUTO CREATE *****************/
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

        /************** END OF - AUTO CREATE *****************/

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
                if ( (nextBatchInQueue[len].etype === LOAD_EVENT_NAME) || (nextBatchInQueue[len].etype === UPDATE_EVENT_NAME)) {
                    nextBatchInQueue[len].desc = nextBatchInQueue[len].debugEvent ? _.extend({}, this._getObjectDescriptorDEBUG(nextBatchInQueue[len].eid) ) : this._getObjectDescriptor(nextBatchInQueue[len].eid);

                    itemDecorator = nextBatchInQueue[len].desc.decorator;

                    if (itemDecorator && itemDecorator !== "") {
                        if (!this.decoratorClasses.hasOwnProperty(itemDecorator)) {
                            decoratorsToDownload.insertUnique(itemDecorator);

                            //TODO: hack
                            decoratorsToDownload.insertUnique("DefaultDecorator");
                            decoratorsToDownload.insertUnique("CircleDecorator");
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
                case LOAD_EVENT_NAME:
                    this._onLoad(e.eid, e.desc);
                    break;
                case "update":
                    this._onUpdate(e.eid, e.desc);
                    break;
                case "unload":
                    this._onUnload(e.eid);
                    break;
            }
        }

        this.firstRun = false;

        i = this.delayedEvents.length;

        while (i--) {
            e = this.delayedEvents[i];
            switch (e.etype) {
                case LOAD_EVENT_NAME:
                    this._onLoad(e.eid, e.desc);
                    break;
            }
        }



        this.delayedEvents = [];

        this.designerCanvas.endUpdate();

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
                        objDesc.metaInfo = {"GMEID" : gmeID};

                        uiComponent = this.designerCanvas.createDesignerItem(objDesc);

                        this._GmeID2ComponentID[gmeID].push(uiComponent.id);
                        this._ComponentID2GmeID[uiComponent.id] = gmeID;
                    }

                    if (objDesc.kind === "CONNECTION") {
                        if (this.firstRun === true) {
                            this.delayedEvents.push({ "etype": LOAD_EVENT_NAME,
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
            decClass;

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

                        this.delayedEvents.push({ "etype": LOAD_EVENT_NAME,
                            "eid": gmeID,
                            "desc": objDesc });
                    }
                } else {
                    //update about a subcomponent - will be handled in the decorator
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

    DesignerControl.prototype._switchToNextDecorator = function (id) {
        var objDesc = this._getObjectDescriptor(id),
            nextDec = "DecoratorWithPorts";

        switch (objDesc.decorator) {
            case "DefaultDecorator":
                nextDec = "CircleDecorator";
                break;
            case "CircleDecorator":
                nextDec = "DecoratorWithPorts";
                break;
            case "DecoratorWithPorts":
                nextDec = "DefaultDecorator";
                break;
            default:
                break;
        }

        this._client.startTransaction();
        this._client.setRegistry(id, nodePropertyNames.Registry.decorator, nextDec);
        this._client.completeTransaction();
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

    DesignerControl.prototype._onModelHierarchyUp = function () {
        if (this.currentNodeInfo.parentId) {
            this._client.setSelectedObjectId(this.currentNodeInfo.parentId);
        }
    };

    //in DEBUG mode add additional content to canvas
    if (DEBUG) {
        _.extend(DesignerControl.prototype, DesignerControlDEBUG.prototype);
    }

    return DesignerControl;
});
