"use strict";

define(['logManager',
        'clientUtil',
        'nodeAttributeNames',
        'nodeRegistryNames'], function (logManager,
                                    util,
                                    nodeAttributeNames,
                                    nodeRegistryNames) {

    var ModelEditorControl;

    ModelEditorControl = function (myClient, myModelEditor) {
        var self = this;

        this._client = myClient;
        this._modelEditorView = myModelEditor;
        this._modelEditorView._client = myClient;

        this._logger = logManager.create("HTML_ModelEditorControl");
        this._logger.debug("Created");

        //this._territoryId = this._client.addUI(this, true);
        this._selfPatterns = {};

        this._componentStates = { "loading": 0,
                                  "loaded": 1 };

        this._components = {};

        //local variable holding info about the currently opened node
        this._currentNodeInfo = {"id": null, "children" : [], "parentId": null };

        /*OVERRIDE MODEL EDITOR METHODS*/
        this._modelEditorView.onCreateConnection = function (connDesc) {
            self._client.makeConnection({   "parentId": self._currentNodeInfo.id,
                "sourceId": connDesc.sourceId,
                "targetId": connDesc.targetId,
                "directed": true });
        };

        this._modelEditorView.onUpdateConnectionEnd = function (data) {
            self._client.makePointer(data.connectionId, data.endType, data.newValue);
        };

        this._modelEditorView.onDragCopy = function (pasteDesc) {
            var intellyPasteOpts = { "parentId": self._currentNodeInfo.id },
                id;

            for (id in pasteDesc) {
                if (pasteDesc.hasOwnProperty(id)) {
                    intellyPasteOpts[id] = { "attributes": {}, registry: {} };
                    if (pasteDesc[id].hasOwnProperty("x") && pasteDesc[id].hasOwnProperty("y")) {
                        intellyPasteOpts[id].registry[nodeRegistryNames.position] = { "x": pasteDesc[id].x, "y": pasteDesc[id].y };
                    }
                }
            }

            self._client.intellyPaste(intellyPasteOpts);
        };

        this._modelEditorView.onReposition = function (repositionDesc) {
            var id;

            for (id in repositionDesc) {
                if (repositionDesc.hasOwnProperty(id)) {
                    //TODO: bulk somehow
                    self._client.setRegistry(id, nodeRegistryNames.position, { "x": repositionDesc[id].x, "y": repositionDesc[id].y });
                }
            }
        };

        this._modelEditorView.onCopy = function (selectedIds) {
            self._client.copyNodes(selectedIds);
        };

        this._modelEditorView.onPaste = function () {
            if (self._currentNodeInfo.id) {
                self._client.pasteNodes(self._currentNodeInfo.id);
            }
        };

        this._modelEditorView.onDelete = function (ids) {
            self._client.delMoreNodes(ids);
        };

        this._modelEditorView.onSaveConnectionSegmentPoints = function (connId, segmentPointsToSave) {
            self._client.setRegistry(connId, nodeRegistryNames.segmentPoints, segmentPointsToSave);
        };

        this._modelEditorView.onSetLineType = function (connId, type) {
            var reg = {};
            reg[nodeRegistryNames.lineType] = type;
            reg[nodeRegistryNames.segmentPoints] = [];
            self._client.setRegistry(connId, reg);
        };

        this._modelEditorView.onDoubleClick = function (componentId) {
            self._client.setSelectedObjectId(componentId);
        };

        this._modelEditorView.onGotoParent = function () {
            if (self._currentNodeInfo.parentId) {
                self._client.setSelectedObjectId(self._currentNodeInfo.parentId);
            }
        };

        this._modelEditorView.onAutLayout = function (components) {
            var i,
                nodeData;

            //TODO: bulk
            self._client.disableEventToUI(self.territoryId);
            for (i = 0; i < components.length; i += 1) {
                nodeData = components[i];
                self._client.setRegistry(nodeData.id, nodeRegistryNames.position, { "x": nodeData.x, "y": nodeData.y });
            }
            self._client.enableEventToUI(self.territoryId);
        };

        this._modelEditorView.onAutRename = function (components) {
            var i,
                nodeData;

            //TODO: bulk
            self._client.disableEventToUI(self.territoryId);
            for (i = 0; i < components.length; i += 1) {
                nodeData = components[i];
                self._client.setAttributes(nodeData.id, nodeAttributeNames.name, nodeData.title);
            }
            self._client.enableEventToUI(self.territoryId);
        };

        this._modelEditorView.onCreateModels = function (models) {
            var i;

            //TODO: bulk
            self._client.disableEventToUI(self.territoryId);
            for (i = 0; i < models.length; i += 1) {
                self._client.createChild({ "parentId": self._currentNodeInfo.id,
                                           "name": models[i].name });
            }
            self._client.enableEventToUI(self.territoryId);
        };
        /*END OF - OVERRIDE MODEL EDITOR METHODS*/

        this._initialize();
    };

    ModelEditorControl.prototype._initialize = function () {
        var self = this;

        /*this._client.addEventListener(this._client.events.SELECTEDOBJECT_CHANGED, function (__project, nodeId) {
            self._selectedObjectChanged(nodeId);
        });*/
    };

    ModelEditorControl.prototype.selectedObjectChanged = function (nodeId) {
        var desc = this._getObjectDescriptor(nodeId);

        this._logger.debug("SELECTEDOBJECT_CHANGED nodeId '" + nodeId + "'");

        //delete everything from model editor
        this._modelEditorView.clear();

        //clean up local hash map
        this._components = {};

        //remove current territory patterns
        if (this._currentNodeInfo.id) {
            this._client.removeUI(this._territoryId);
        }

        this._currentNodeInfo.id = nodeId;
        this._currentNodeInfo.parentId = desc.parentId;

        //put new node's info into territory rules
        this._selfPatterns = {};
        this._selfPatterns[nodeId] = { "children": 1 };

        this._modelEditorView.updateCanvas(desc);

        this._territoryId = this._client.addUI(this, true);
        //update the territory
        this._client.updateTerritory(this._territoryId, this._selfPatterns);
    };

    ModelEditorControl.prototype._getObjectDescriptor = function (nodeId) {
        var nodeObj = this._client.getNode(nodeId),
            objDescriptor,
            pos;

        if (nodeObj) {
            objDescriptor = {};

            objDescriptor.id = nodeObj.getId();
            objDescriptor.name =  nodeObj.getAttribute(nodeAttributeNames.name);
            objDescriptor.parentId = nodeObj.getParentId();

            //fill the descriptor based on its type
            if (nodeObj.getBaseId() === "connection") {
                objDescriptor.kind = "CONNECTION";
                objDescriptor.source = nodeObj.getPointer("source").to;
                objDescriptor.target = nodeObj.getPointer("target").to;
                if (nodeObj.getAttribute(nodeAttributeNames.directed) === true) {
                    objDescriptor.arrowEnd = "block";
                }
                objDescriptor.lineType =  nodeObj.getRegistry(nodeRegistryNames.lineType) || "L";
                objDescriptor.segmentPoints = nodeObj.getRegistry(nodeRegistryNames.segmentPoints);
            } else {
                objDescriptor.kind = "MODEL";
                pos = nodeObj.getRegistry(nodeRegistryNames.position);

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

                objDescriptor.decorator = nodeObj.getRegistry(nodeRegistryNames.decorator) || "SimpleModelDecorator";
            }
        }

        return objDescriptor;
    };

    ModelEditorControl.prototype._getDefaultValueForNumber = function (cValue, defaultValue) {
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
    ModelEditorControl.prototype.onOneEvent = function (events) {
        var i;

        this._logger.debug("onOneEvent '" + events.length + "' items");

        if (events && events.length > 0) {
            this._modelEditorView.startLongUpdate();

            for (i = 0; i < events.length; i += 1) {
                this.onEvent(events[i].etype, events[i].eid);
            }

            this._modelEditorView.finishLongUpdate();
        }

        this._logger.debug("onOneEvent '" + events.length + "' items - DONE");
    };

    ModelEditorControl.prototype.onEvent = function (etype, eid) {
        this._logger.debug("onEvent '" + etype + "', '" + eid + "'");
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
    ModelEditorControl.prototype._onLoad = function (objectId) {
        var desc;

        //component loaded
        //we are interested in the load of subcomponents of the opened component
        if (this._currentNodeInfo.id !== objectId) {
            desc = this._getObjectDescriptor(objectId);

            if (desc) {
                if (desc.kind === "MODEL") {
                    this._modelEditorView.createModelComponent(desc);
                }

                if (desc.kind === "CONNECTION") {
                    this._modelEditorView.createConnectionComponent(desc);
                }
            }
        }
    };

    ModelEditorControl.prototype._onUpdate = function (objectId) {
        //self or child updated
        var desc = this._getObjectDescriptor(objectId);

        //check if the updated object is the opened node
        if (objectId === this._currentNodeInfo.id) {
            //the updated object is the parent whose children are displayed here
            //the interest about the parent is:
            // - name change
            this._modelEditorView.updateCanvas(desc);
        } else {
            if (desc) {
                if (desc.kind === "MODEL") {
                    this._modelEditorView.updateModelComponent(objectId, desc);
                }

                if (desc.kind === "CONNECTION") {
                    this._modelEditorView.updateConnectionComponent(objectId, desc);
                }
            }
        }
    };

    ModelEditorControl.prototype._onUnload = function (objectId) {
        if (objectId === this._currentNodeInfo.id) {
            //the opened model has been deleted....
            this._modelEditorView.updateCanvas({"name": "The currently opened model has beed deleted (TODO)"});
        } else {
            this._modelEditorView.deleteComponent(objectId);
        }
    };

    //TODO: check this here...
    ModelEditorControl.prototype.destroy = function () {
        this._client.removeUI(this._territoryId);
    };

    return ModelEditorControl;
});
