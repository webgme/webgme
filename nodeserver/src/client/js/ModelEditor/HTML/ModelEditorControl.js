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

        this._logger = logManager.create("HTML_ModelEditorControl");
        this._logger.debug("Created");

        this._territoryId = this._client.addUI(this);
        this._selfPatterns = {};

        this._componentStates = { "loading": 0,
                                  "loaded": 1 };

        this._components = {};

        //local variable holding info about the currently opened node
        this._currentNodeInfo = {"id": null, "children" : []};

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
                    intellyPasteOpts[id].registry[nodeRegistryNames.position] = { "x": pasteDesc[id].x, "y": pasteDesc[id].y };
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
            var i;
            for (i = 0; i < ids.length; i += 1) {
                self._client.deleteNode(ids[i]);
            }
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

        this._modelEditorView.onFullRefresh = function () {
            self._client.fullRefresh();
        };
        /*END OF - OVERRIDE MODEL EDITOR METHODS*/

        this._initialize();
    };

    ModelEditorControl.prototype._initialize = function () {
        var self = this;

        this._client.addEventListener(this._client.events.SELECTEDOBJECT_CHANGED, function (__project, nodeId) {
            var selectedNode = self._client.getNode(nodeId),
                i = 0,
                childrenIDs = [],
                currentChildId;

            //delete everything from model editor
            self._modelEditorView.clear();

            //clean up local hash map
            self._components = {};

            if (self._currentNodeInfo.id) {
                delete self._selfPatterns[self._currentNodeInfo.id];
                self._client.updateTerritory(self._territoryId, self._selfPatterns);
            }

            self._currentNodeInfo = { "id": null, "children" : [] };

            if (selectedNode) {
                self._modelEditorView.updateCanvas(self._getObjectDescriptor(selectedNode));

                //get the children IDs of the parent
                childrenIDs = selectedNode.getChildrenIds();

                for (i = 0; i < childrenIDs.length; i += 1) {

                    currentChildId = childrenIDs[i];

                    //assume that the child is not yet loaded on the client
                    self._components[currentChildId] = {   "componentInstance": null,
                                                            "state": self._componentStates.loading };

                    self._createObject(currentChildId);
                }

                //save the given nodeId as the currently handled one
                self._currentNodeInfo.id = nodeId;
                self._currentNodeInfo.children = childrenIDs;
            }

            self._selfPatterns[nodeId] = { "children": 1 };
            self._client.updateTerritory(self._territoryId, self._selfPatterns);

            self._logger.debug("SELECTEDOBJECT_CHANGED handled for '" + nodeId + "'");
        });
    };

    ModelEditorControl.prototype._getObjectDescriptor = function (nodeObj) {
        var objDescriptor = {};

        objDescriptor.id = nodeObj.getId();

        //fill the descriptor based on its type
        if (nodeObj.getBaseId() === "connection") {
            objDescriptor.kind = "CONNECTION";
            objDescriptor.name =  nodeObj.getAttribute(nodeAttributeNames.name);
            objDescriptor.source = nodeObj.getPointer("source").to;
            objDescriptor.target = nodeObj.getPointer("target").to;
            if (nodeObj.getAttribute(nodeAttributeNames.directed) === true) {
                objDescriptor.arrowEnd = "block";
            }
            objDescriptor.lineType =  nodeObj.getRegistry(nodeRegistryNames.lineType) || "L";
            objDescriptor.segmentPoints = nodeObj.getRegistry(nodeRegistryNames.segmentPoints);
        } else {
            objDescriptor.kind = "MODEL";
            objDescriptor.name =  nodeObj.getAttribute(nodeAttributeNames.name);
            objDescriptor.position = nodeObj.getRegistry(nodeRegistryNames.position);
            objDescriptor.decorator = nodeObj.getRegistry(nodeRegistryNames.decorator) || "SimpleModelDecorator";
            objDescriptor.client = this._client;
        }

        return objDescriptor;
    };

    ModelEditorControl.prototype._createObject = function (nodeId) {
        var node = this._client.getNode(nodeId);

        if (node) {
            this._components[nodeId].componentInstance = this._modelEditorView.createComponent(this._getObjectDescriptor(node));
            this._components[nodeId].state = this._componentStates.loaded;
        }
    };

    // PUBLIC METHODS
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

    ModelEditorControl.prototype._onLoad = function (objectId) {
        //child loaded
        if (this._components[objectId] && this._components[objectId].state === this._componentStates.loading) {
            this._createObject(objectId);
        }
    };

    ModelEditorControl.prototype._onUpdate = function (objectId) {
        //self or child updated
        var updatedObject = this._client.getNode(objectId),
            oldChildren,
            newChildren,
            childrenDiff,
            i,
            childId;

        //check if the updated object is the opened node
        if (objectId === this._currentNodeInfo.id) {
            //the updated object is the parent whose children are displayed here
            //the interest about the parent is:
            // - name change
            // - new children
            // - deleted children

            this._modelEditorView.updateCanvas(this._getObjectDescriptor(updatedObject));

            //save old and current children info to be able to see the difference
            oldChildren = this._currentNodeInfo.children.slice();
            newChildren = updatedObject.getChildrenIds() || [];

            //Handle children deletion
            childrenDiff = util.arrayMinus(oldChildren, newChildren);

            for (i = 0; i < childrenDiff.length; i += 1) {
                childId = childrenDiff[i];
                this._modelEditorView.deleteComponent(this._components[childId].componentInstance);
                delete this._components[childId];
            }

            //Handle children addition
            childrenDiff = util.arrayMinus(newChildren, oldChildren);
            for (i = 0; i < childrenDiff.length; i += 1) {
                childId = childrenDiff[i];

                //assume that the child is not yet loaded on the client
                this._components[childId] = {   "componentInstance": null,
                    "state" : this._componentStates.loading };

                this._createObject(childId);
            }

            //finally store the actual children info for the parent
            this._currentNodeInfo.children = newChildren;

        } else if (this._components[objectId]) {
            //one of the children of the opened node has been updated
            if (this._components[objectId].state === this._componentStates.loaded) {
                this._modelEditorView.updateComponent(this._components[objectId].componentInstance,
                                                        this._getObjectDescriptor(updatedObject));
            }
        }
    };

    ModelEditorControl.prototype._onUnload = function (objectId) {
        //self or child unloaded
        //we care about self unload only, since child unload pretty much handled by self update (child added / child removed)
        //this._logger.warning("_onUnload NOT YET IMPLEMENTED - '" + objectId + "'");
    };

    return ModelEditorControl;
});
