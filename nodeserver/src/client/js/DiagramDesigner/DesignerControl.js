"use strict";

define(['logManager',
    'clientUtil',
    'js/DiagramDesigner/NodePropertyNames',
    'js/DiagramDesigner/DesignerControl.DEBUG'], function (logManager,
                                                        util,
                                                        nodePropertyNames,
                                                        DesignerControlDEBUG) {

    var DesignerControl,
        LOAD_EVENT_NAME = "load",
        UPDATE_EVENT_NAME = "update",
        DECORATOR_PATH = "js/DiagramDesigner/",      //TODO: fix path;
        ___DUPLICATE = false;            //TODO: just for testing purposes


    DesignerControl = function (options) {
        var self = this;

        this.logger = options.logger || logManager.create(options.loggerName || "DesignerControl");

        if (options.client === undefined) {
            this.logger.error("DesignerControl's client is not specified...");
            throw ("DesignerControl can not be created");
        }

        this._client = options.client;
        this._selfPatterns = {};
        this.components = {};
        this.componentsMap = {};
        this.componentsMapRev = {};
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
                    self._client.setRegistry(self.componentsMapRev[id], nodePropertyNames.Registry.position, { "x": repositionDesc[id].x, "y": repositionDesc[id].y });
                }
            }
            self._client.completeTransaction();
        };

        this.designerCanvas.onCreateNewConnection = function (params) {
            self._client.makeConnection({   "parentId": self.currentNodeInfo.id,
                "sourceId": self.componentsMapRev[params.src],
                "targetId": self.componentsMapRev[params.dst],
                "directed": true });
        };

        this.designerCanvas.onSelectionDelete = function (idList) {
            var objIdList = [],
                i = idList.length;

            while(i--) {
                objIdList.push(self.componentsMapRev[idList[i]]);
            }

            if (objIdList.length > 0) {
                self._client.delMoreNodes(objIdList);
            }
        };

        /*END OF - OVERRIDE MODEL EDITOR METHODS*/

        //local variable holding info about the currently opened node
        this.currentNodeInfo = {"id": null, "children" : [], "parentId": null };

        //in DEBUG mode add additional content to canvas
        if (DEBUG) {
            this._addDebugModeExtensions();
        }

        this.logger.debug("DesignerControl ctor finished");
    };

    DesignerControl.prototype.selectedObjectChanged = function (nodeId) {
        var desc = this._getObjectDescriptor(nodeId);

        this.logger.debug("SELECTEDOBJECT_CHANGED nodeId '" + nodeId + "'");

        //delete everything from model editor
        this.designerCanvas.clear();

        //clean up local hash map
        this.components = {};
        this.componentsMap = {};
        this.componentsMapRev = {};

        //remove current territory patterns
        if (this.currentNodeInfo.id) {
            this._client.removeUI(this._territoryId);
        }

        if (nodeId) {
            this.currentNodeInfo.id = nodeId;
            this.currentNodeInfo.parentId = desc.parentId;

            //put new node's info into territory rules
            this._selfPatterns = {};
            this._selfPatterns[nodeId] = { "children": 1 };

            this.designerCanvas.updateCanvas(desc);

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
            objDescriptor.name =  nodeObj.getAttribute(nodePropertyNames.Attributes.name);
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
                objDescriptor.decorator = "DefaultDecorator";
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

            require([DECORATOR_PATH + decoratorName],
                function (decoratorClass) {
                    self.logger.warning("downloaded:" + decoratorName);
                    self.decoratorClasses[decoratorName] = decoratorClass;
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

        this.designerCanvas.endUpdate();

        this.logger.debug("_dispatchEvents '" + events.length + "' items - DONE");

        //continue processing event queue
        this.processNextInQueue();
    };

    // PUBLIC METHODS
    DesignerControl.prototype._onLoad = function (objectId, objD) {
        var obj,
            srcId, dstId,
            i, j,GMESrcId, GMEDstId,
            decoratorInstance,
            decClass,
            objDesc;

        //component loaded
        //we are interested in the load of subcomponents of the opened component
        if (this.currentNodeInfo.id !== objectId) {
            if (objD) {

                objDesc = _.extend({}, objD);
                this.componentsMap[objectId] = {};

                if (objDesc.kind === "MODEL") {


                    if (___DUPLICATE === true) {
                        decClass = this.decoratorClasses.DefaultDecorator || this.decoratorClasses[objDesc.decorator];
                    } else {
                        decClass = this.decoratorClasses[objDesc.decorator];
                    }

                    objDesc.decoratorInstance = new decClass({"id" : objectId});
                    objDesc.decoratorInstance.designerControl = this;

                    obj = this.designerCanvas.createDesignerItem(objDesc);
                    this.componentsMap[objectId][obj.id] = obj;
                    this.componentsMapRev[obj.id] = objectId;

                    if (___DUPLICATE === true) {
                        //create obj2
                        objDesc = _.extend({}, objD);
                        objDesc.position.x += 0;
                        objDesc.position.y += 400;

                        decClass = this.decoratorClasses.CircleDecorator || this.decoratorClasses[objDesc.decorator];
                        objDesc.decoratorInstance = new decClass({"id" : objectId});
                        objDesc.decoratorInstance.designerControl = this;

                        obj = this.designerCanvas.createDesignerItem(objDesc);
                        this.componentsMap[objectId][obj.id] = obj;
                        this.componentsMapRev[obj.id] = objectId;
                    }
                }

                if (objDesc.kind === "CONNECTION") {
                    //since all the items are presented double
                    //1 onnection between 2 boxes will really be
                    //4 connections:
                    // orig1 -> orig2
                    // orig1 -> copy2
                    // copy1 -> orig2
                    // copy1 -> copy2

                    GMESrcId = objDesc.source;
                    GMEDstId = objDesc.target;

                    // orig1 -> orig2
                    for (i in this.componentsMap[GMESrcId]) {
                        srcId = i;
                        for (j in this.componentsMap[GMEDstId]) {
                            dstId = j;

                            objDesc.source = i;
                            objDesc.target = j;
                            obj = this.designerCanvas.createConnection(objDesc);
                            this.componentsMap[objectId][obj.id] = obj;
                            this.componentsMapRev[obj.id] = objectId;
                        }
                    }
                }
            }
        }
    };

    DesignerControl.prototype._onUpdate = function (objectId, objDesc) {
        var uiid,
            decClass;

        //self or child updated
        //check if the updated object is the opened node
        if (objectId === this.currentNodeInfo.id) {
            //the updated object is the parent whose children are displayed here
            //the interest about the parent is:
            // - name change
            this.designerCanvas.updateCanvas(objDesc);
        } else {
            if (objDesc) {
                if (objDesc.kind === "MODEL") {
                    for (uiid in this.componentsMap[objectId]) {
                        if (this.componentsMap[objectId].hasOwnProperty(uiid)) {

                            //TODO:potential decorator update
                            /*decClass = this.decoratorClasses.CircleDecorator;
                            objDesc.decoratorInstance = new decClass({"id" : objectId});
                            objDesc.decoratorInstance.designerControl = this;*/

                            this.designerCanvas.updateDesignerItem(uiid, objDesc);
                            objDesc.position.y += 400;
                        }
                    }
                }

                if (objDesc.kind === "CONNECTION") {
                    this.designerCanvas.updateConnection(objectId, objDesc);
                }
            }
        }
    };

    DesignerControl.prototype._onUnload = function (objectId) {
        var uiid;

        if (objectId === this.currentNodeInfo.id) {
            //the opened model has been deleted....
            this.designerCanvas.updateCanvas({"name": "The currently opened model has beed deleted (TODO)"});
            //TODO: fix this here....
        } else {
            for (uiid in this.componentsMap[objectId]) {
                if (this.componentsMap[objectId].hasOwnProperty(uiid)) {
                    this.designerCanvas.deleteComponent(uiid);
                }
            }
        }
    };

    //TODO: check this here...
    DesignerControl.prototype.destroy = function () {
        this._client.removeUI(this._territoryId);
    };

    //in DEBUG mode add additional content to canvas
    if (DEBUG) {
        _.extend(DesignerControl.prototype, DesignerControlDEBUG.prototype);
    }

    return DesignerControl;
});
