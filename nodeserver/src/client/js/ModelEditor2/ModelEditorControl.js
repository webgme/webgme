"use strict";

define(['logManager',
        'clientUtil',
        'nodeAttributeNames2',
        'nodeRegistryNames2'], function (logManager,
                                    util,
                                    nodeAttributeNames,
                                    nodeRegistryNames) {

    var ModelEditorControl;

    ModelEditorControl = function (myClient, myModelEditor) {
        var self = this;

        this._client = myClient;
        this._modelEditorView = myModelEditor;
        this._modelEditorView._client = myClient;

        this._editModeMeta = false;

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
            var setName = "";

            if (self._editModeMeta === true) {
                //connDesc.type has special meaning: inheritance, containment, etc
                if (connDesc.type === "inheritance") {
                    setName = 'ValidInheritor';
                } else if (connDesc.type === "containment") {
                    setName = 'ValidChildren';
                }
                if (setName !== "") {
                    self._client.addMember(connDesc.sourceId, connDesc.targetId, setName);
                }
            } else {
                self._client.makeConnection({   "parentId": self._currentNodeInfo.id,
                    "sourceId": connDesc.sourceId,
                    "targetId": connDesc.targetId,
                    "directed": true });
            }
        };

        this._modelEditorView.onUpdateConnectionEnd = function (data) {
            //connection end reposition is not allowed in meta mode
            if (self._editModeMeta === false) {
                self._client.makePointer(data.connectionId, data.endType, data.newValue);
            }
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

            self._client.startTransaction();
            for (id in repositionDesc) {
                if (repositionDesc.hasOwnProperty(id)) {
                    self._client.setRegistry(id, nodeRegistryNames.position, { "x": repositionDesc[id].x, "y": repositionDesc[id].y });
                }
            }
            self._client.completeTransaction();
        };

        this._modelEditorView.onCopy = function (selectedIds) {
            self._client.copyNodes(selectedIds);
        };

        this._modelEditorView.onPaste = function () {
            if (self._currentNodeInfo.id) {
                self._client.pasteNodes(self._currentNodeInfo.id);
            }
        };

        this._modelEditorView.onDelete = function (deleteParams) {
            var deleteIds = [],
                i,
                setName = "";

            if (self._editModeMeta === true) {
                for (i in deleteParams) {
                    if (deleteParams.hasOwnProperty(i)) {
                        if (deleteParams[i].hasOwnProperty("connectionType")) {
                            setName = "";
                            if (deleteParams[i].connectionType === "inheritance") {
                                setName = 'ValidInheritor';
                            } else if (deleteParams[i].connectionType === "containment") {
                                setName = 'ValidChildren';
                            }

                            if (setName !== "") {
                                self._client.removeMember(deleteParams[i].sourceId, deleteParams[i].targetId, setName);
                            }
                        } else {
                            deleteIds.push(deleteParams[i].id);
                        }
                    }
                }
                self._client.delMoreNodes(deleteIds);
            } else {
                for (i in deleteParams) {
                    if (deleteParams.hasOwnProperty(i)) {
                        deleteIds.push(deleteParams[i].id);
                    }
                }
                self._client.delMoreNodes(deleteIds);
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

        this._modelEditorView.onGotoParent = function () {
            if (self._currentNodeInfo.parentId) {
                self._client.setSelectedObjectId(self._currentNodeInfo.parentId);
            }
        };

        this._modelEditorView.onAutLayout = function (components) {
            var i,
                nodeData;

            self._client.startTransaction();
            for (i = 0; i < components.length; i += 1) {
                nodeData = components[i];
                self._client.setRegistry(nodeData.id, nodeRegistryNames.position, { "x": nodeData.x, "y": nodeData.y });
            }
            self._client.completeTransaction();
        };

        this._modelEditorView.onAutRename  = function (components) {
            var i,
                nodeData;

            self._client.startTransaction();
            for (i = 0; i < components.length; i += 1) {
                nodeData = components[i];
                self._client.setAttributes(nodeData.id, nodeAttributeNames.name, nodeData.title);
            }
            self._client.completeTransaction();
        };

        this._modelEditorView.onCreateModels = function (models) {
            var i;

            self._client.startTransaction();
            for (i = 0; i < models.length; i += 1) {
                self._client.createChild({ "parentId": self._currentNodeInfo.id,
                                           "name": models[i].name });
            }
            self._client.completeTransaction();
        };

        this._modelEditorView.onGetCommonPropertiesForSelection = function (nodeIdList) {
            var propList = {},
                selectionLength = nodeIdList.length,
                cNode,
                i,
                flattenedAttrs,
                flattenedRegs,
                commonAttrs = {},
                commonRegs = {},
                noCommonValueColor = "#787878",
                _getNodePropertyValues, //fn
                _filterCommon, //fn
                _addItemsToResultList; //fn

            _getNodePropertyValues = function (node, propNameFn, propValueFn) {
                var result =  {},
                    attrNames = node[propNameFn](),
                    len = attrNames.length;

                while (--len >= 0) {
                    result[attrNames[len]] = node[propValueFn](attrNames[len]);
                }

                return util.flattenObject(result);
            };

            _filterCommon = function (resultList, otherList, initPhase) {
                var it;

                if (initPhase === true) {
                    for (it in otherList) {
                        if (otherList.hasOwnProperty(it)) {
                            resultList[it] = { "value": otherList[it],
                                "valueType": typeof otherList[it],
                                "isCommon": true };
                        }
                    }
                } else {
                    for (it in resultList) {
                        if (resultList.hasOwnProperty(it)) {
                            if (otherList.hasOwnProperty(it)) {
                                if (resultList[it].isCommon) {
                                    resultList[it].isCommon = resultList[it].value === otherList[it];
                                }
                            } else {
                                delete resultList[it];
                            }
                        }
                    }
                }
            };

            if (selectionLength > 0) {
                //get all attributes
                //get all registry elements
                i = selectionLength;
                while (--i >= 0) {
                    cNode = self._client.getNode(nodeIdList[i]);

                    flattenedAttrs = _getNodePropertyValues(cNode, "getAttributeNames", "getAttribute");

                    _filterCommon(commonAttrs, flattenedAttrs, i === selectionLength - 1);

                    flattenedRegs = _getNodePropertyValues(cNode, "getRegistryNames", "getRegistry");

                    _filterCommon(commonRegs, flattenedRegs, i === selectionLength - 1);
                }

                _addItemsToResultList = function (srcList, prefix, dstList) {
                    var i,
                        extKey,
                        keyParts;

                    if (prefix !== "") {
                        prefix += ".";
                    }

                    for (i in srcList) {
                        if (srcList.hasOwnProperty(i)) {
                            extKey = prefix + i;
                            keyParts = i.split(".");
                            dstList[extKey] = { "name": keyParts[keyParts.length - 1],
                                "value": srcList[i].value,
                                "valueType": srcList[i].valueType};

                            if (i === "position.x" || i === "position.y") {
                                dstList[extKey].minValue = 0;
                                dstList[extKey].stepValue = 10;
                            }

                            if (srcList[i].isCommon === false) {
                                dstList[extKey].value = "";
                                dstList[extKey].options = {"textColor": noCommonValueColor};
                            }

                            if (extKey.indexOf(".x") > -1) {
                                //let's say its inherited, make it italic
                                dstList[extKey].options = dstList[extKey].options || {};
                                dstList[extKey].options.textItalic = true;
                                dstList[extKey].options.textBold = true;
                            }
                        }
                    }
                };

                _addItemsToResultList(commonAttrs, "Attributes", propList);
                _addItemsToResultList(commonRegs, "Registry", propList);
            }

            return propList;
        };

        this._modelEditorView.onPropertyChanged = function (selectedComponentIds, args) {
            var i = selectedComponentIds.length,
                keyArr,
                setterFn;

            self._client.startTransaction();
            while (--i >= 0) {
                keyArr = args.id.split(".");
                if (keyArr[0] === "Attributes") {
                    setterFn = "setAttributes";
                } else {
                    setterFn = "setRegistry";
                }

                keyArr.splice(0, 1);
                keyArr = keyArr.join(".");
                self._client[setterFn](selectedComponentIds[i], keyArr, args.newValue);
            }
            self._client.completeTransaction();
        };

        this._modelEditorView.onCreateNode = function (newNodeDescriptor) {
            var intellyPasteOpts = { "parentId": self._currentNodeInfo.id },
                id = newNodeDescriptor.id;

            intellyPasteOpts[id] = { "attributes": {}, registry: {} };
            intellyPasteOpts[id].registry[nodeRegistryNames.position] = { "x": newNodeDescriptor.position.x,
                                                                          "y": newNodeDescriptor.position.y };

            self._client.intellyPaste(intellyPasteOpts);
        };

        this._modelEditorView.onDumpNodeInfo = function (selectedIds) {
            var len = selectedIds.length,
                node;

            while (len--) {
                node = self._client.getNode(selectedIds[len]);

                if (node) {
                    node.printData();
                }
            }
        };
        /*END OF - OVERRIDE MODEL EDITOR METHODS*/
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

        if (nodeId) {
            this._currentNodeInfo.id = nodeId;
            this._currentNodeInfo.parentId = desc.parentId;

            //put new node's info into territory rules
            this._selfPatterns = {};
            this._selfPatterns[nodeId] = { "children": 1 };

            this._modelEditorView.updateCanvas(desc);

            this._editModeMeta =  desc.isMeta;
            this._modelEditorView.enableMetaComponents(this._editModeMeta);

            this._territoryId = this._client.addUI(this, true);
            //update the territory
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        }
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
            objDescriptor.isMeta = nodeObj.getRegistry(nodeRegistryNames.isMeta);

            //fill the descriptor based on its type
            if (nodeObj.getBaseId() === "connection") {
                objDescriptor.kind = "CONNECTION";
                objDescriptor.source = nodeObj.getPointer("source").to;
                objDescriptor.target = nodeObj.getPointer("target").to;
                objDescriptor.connectionType = "connection";
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

                objDescriptor.validChildren = nodeObj.getMemberIds('ValidChildren');
                objDescriptor.validInheritor = nodeObj.getMemberIds('ValidInheritor');
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
        var desc,
            connDesc,
            len;

        //component loaded
        //we are interested in the load of subcomponents of the opened component
        if (this._currentNodeInfo.id !== objectId) {
            desc = this._getObjectDescriptor(objectId);

            if (desc) {
                if (desc.kind === "MODEL") {
                    this._modelEditorView.createModelComponent(desc);

                    if (this._editModeMeta === true) {
                        if (desc.validChildren) {
                            len = desc.validChildren.length;

                            while (len--) {
                                connDesc = {"id": "containment_" + desc.id + "_" + desc.validChildren[len]};
                                connDesc.kind = "CONNECTION";
                                connDesc.source = desc.id;
                                connDesc.target = desc.validChildren[len];
                                connDesc.connectionType = "containment";
                                connDesc.lineType =  "L";
                                connDesc.segmentPoints = null;

                                this._modelEditorView.createConnectionComponent(connDesc);
                            }
                        }

                        if (desc.validInheritor) {
                            len = desc.validInheritor.length;

                            while (len--) {
                                connDesc = {"id": "inheritance_" + desc.id + "_" + desc.validInheritor[len]};
                                connDesc.kind = "CONNECTION";
                                connDesc.source = desc.id;
                                connDesc.target = desc.validInheritor[len];
                                connDesc.connectionType = "inheritance";
                                connDesc.lineType =  "L";
                                connDesc.segmentPoints = null;

                                this._modelEditorView.createConnectionComponent(connDesc);
                            }
                        }
                    }
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
