"use strict";

define(['logManager',
    'clientUtil',
    'js/DiagramDesigner/NodePropertyNames',
    'js/DiagramDesigner/DefaultDecorator',
    'js/DiagramDesigner/CircleDecorator'], function (logManager,
                                                        util,
                                                        nodePropertyNames,
                                                        DefaultDecorator,
                                                        CircleDecorator) {

    var DesignerControl;

    DesignerControl = function (options) {
        this.logger = options.logger || logManager.create(options.loggerName || "DesignerControl");

        if (options.client === undefined) {
            this.logger.error("DesignerControl's client is not specified...");
            throw ("DesignerControl can not be created");
        }
        this._client = options.client;

        if (options.designerCanvas === undefined) {
            this.logger.error("DesignerControl's DesignerCanvas is not specified...");
            throw ("DesignerControl can not be created");
        }
        this.designerCanvas = options.designerCanvas;

        this._selfPatterns = {};
        this.components = {};

        //local variable holding info about the currently opened node
        this.currentNodeInfo = {"id": null, "children" : [], "parentId": null };

        /*OVERRIDE MODEL EDITOR METHODS*/
        /*END OF - OVERRIDE MODEL EDITOR METHODS*/
        this.logger.debug("DesignerControl ctor finished");
    };

    DesignerControl.prototype.selectedObjectChanged = function (nodeId) {
        var desc = this._getObjectDescriptor(nodeId);

        this.logger.debug("SELECTEDOBJECT_CHANGED nodeId '" + nodeId + "'");

        //delete everything from model editor
        this.designerCanvas.clear();

        //clean up local hash map
        this.components = {};

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

    var counter = 0;
    var decorators = [DefaultDecorator, CircleDecorator];
    var decLength = decorators.length;

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

                objDescriptor.decorator = nodeObj.getRegistry(nodePropertyNames.Registry.decorator) || "SimpleModelDecorator";

                //TODO: alternationg decorators
                objDescriptor.DecoratorClass = decorators[counter % decLength];
                counter++;
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
            this.designerCanvas.enableScreenRefresh(false);

            while (i--) {
                this.onEvent(events[i].etype, events[i].eid);
            }

            this.designerCanvas.enableScreenRefresh(true);
        }

        this.logger.debug("onOneEvent '" + events.length + "' items - DONE");
    };

    DesignerControl.prototype.onEvent = function (etype, eid) {
        this.logger.debug("onEvent '" + etype + "', '" + eid + "'");
        switch (etype) {
            case "load":
                this._onLoad(eid);
                break;
            case "update":
                this._onUpdate(eid);
                break;
            case "unload":
                this._onUnload(eid);
                break;
        }
    };

    // PUBLIC METHODS
    DesignerControl.prototype._onLoad = function (objectId) {
        var desc;

        //component loaded
        //we are interested in the load of subcomponents of the opened component
        if (this.currentNodeInfo.id !== objectId) {
            desc = this._getObjectDescriptor(objectId);

            if (desc) {
                if (desc.kind === "MODEL") {
                    this.designerCanvas.createModelComponent(desc);
                }

                /*if (desc.kind === "CONNECTION") {
                    this.designerCanvas.createConnectionComponent(desc);
                }*/
            }
        }
    };

    DesignerControl.prototype._onUpdate = function (objectId) {
        //self or child updated
        var desc = this._getObjectDescriptor(objectId);

        //check if the updated object is the opened node
        if (objectId === this.currentNodeInfo.id) {
            //the updated object is the parent whose children are displayed here
            //the interest about the parent is:
            // - name change
            this.designerCanvas.updateCanvas(desc);
        } else {
            if (desc) {
                if (desc.kind === "MODEL") {
                    this.designerCanvas.updateModelComponent(objectId, desc);
                }

                if (desc.kind === "CONNECTION") {
                    this.designerCanvas.updateConnectionComponent(objectId, desc);
                }
            }
        }
    };

    DesignerControl.prototype._onUnload = function (objectId) {
        if (objectId === this.currentNodeInfo.id) {
            //the opened model has been deleted....
            this.designerCanvas.updateCanvas({"name": "The currently opened model has beed deleted (TODO)"});
        } else {
            this.designerCanvas.deleteComponent(objectId);
        }
    };

    //TODO: check this here...
    DesignerControl.prototype.destroy = function () {
        this._client.removeUI(this._territoryId);
    };

    return DesignerControl;
});
