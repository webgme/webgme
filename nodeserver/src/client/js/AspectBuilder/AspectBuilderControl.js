"use strict";

define(['logManager',
    'clientUtil',
    'js/Constants',
    'js/NodePropertyNames',
    'js/AspectBuilder/AspectBuilderControl.DesignerCanvasEventHandlers'], function (logManager,
                                                        util,
                                                        CONSTANTS,
                                                        nodePropertyNames,
                                                        AspectBuilderControlDesignerCanvasEventHandlers) {

    var AspectBuilderControl,
        DECORATOR_PATH = "js/ModelEditor3/Decorators/",      //TODO: fix path;
        GME_ID = "GME_ID",
        ASPECT_BUILDER_REGISTRY_KEY = "AspectBuilder";

    AspectBuilderControl = function (options) {
        var self = this,
            $btnGroupPrintNodeData;

        this.logger = options.logger || logManager.create(options.loggerName || "AspectBuilderControl");

        if (options.client === undefined) {
            this.logger.error("AspectBuilderControl's client is not specified...");
            throw ("AspectBuilderControl can not be created");
        }

        if (options.widget === undefined) {
            this.logger.error("AspectBuilderControl's DesignerCanvas is not specified...");
            throw ("AspectBuilderControl can not be created");
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
        this.currentNodeInfo = {"id": null, "members" : [] };



        /****************** ADD BUTTONS AND THEIR EVENT HANDLERS TO DESIGNER CANVAS ******************/


        /************** PRINT NODE DATA *****************/
        $btnGroupPrintNodeData = this.designerCanvas.addButtonGroup(function (/*event, data*/) {
            self._printNodeData();
        });

        this.designerCanvas.addButton({ "title": "Print node data",
            "icon": "icon-share"}, $btnGroupPrintNodeData );
        /************** END OF - PRINT NODE DATA *****************/


        /****************** END OF - ADD BUTTONS AND THEIR EVENT HANDLERS TO DESIGNER CANVAS ******************/



        //attach all the event handlers for event's coming from DesignerCanvas
        this.attachDesignerCanvasEventHandlers();

        this.logger.debug("AspectBuilderControl ctor finished");
    };

    AspectBuilderControl.prototype.selectedObjectChanged = function (nodeId) {
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

        //remove current territory patterns
        if (this.currentNodeInfo.id) {
            this._client.removeUI(this._territoryId);
        }

        if (nodeId) {
            this.currentNodeInfo.id = nodeId;

            //put new node's info into territory rules
            this._selfPatterns = {};
            this._selfPatterns[nodeId] = { "children": 0 };

            this.designerCanvas.setTitle(desc.name);

            this.designerCanvas.showPogressbar();

            this._territoryId = this._client.addUI(this, true);
            //update the territory
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        }
    };

    AspectBuilderControl.prototype._getObjectDescriptor = function (gmeID) {
        var cNode = this._client.getNode(gmeID),
            nodeDescriptor,
            pos,
            _getNodePropertyValues,
            _getSetMembershipInfo,
            _getPointerInfo;

        _getSetMembershipInfo = function (node) {
            var result = {},
                availableSets = node.getSetNames(),
                len = availableSets.length;

            while (len--) {
                result[availableSets[len]] = node.getMemberIds(availableSets[len]);
            }

            return result;
        };

        _getPointerInfo = function (node) {
            var result = {},
                availablePointers = node.getPointerNames(),
                len = availablePointers.length;

            while (len--) {
                result[availablePointers[len]] = node.getPointer(availablePointers[len]);
            }

            return result;
        };

        if (cNode) {
            nodeDescriptor = {"ID": undefined,
                    "ParentID": undefined,
                    "Sets": undefined,
                    "Pointers": undefined,
                    "Registry": undefined,
                    "decorator": "DefaultDecorator",
                    "position": { "x": -1, "y": -1 }};

            nodeDescriptor.ID = gmeID;
            nodeDescriptor.ParentID = cNode.getParentId();

            nodeDescriptor.name = cNode.getAttribute( nodePropertyNames.Attributes.name) || "";

            if (gmeID === this.currentNodeInfo.id) {

            } else {
                if (this._selfRegistry) {
                    nodeDescriptor.position = this._selfRegistry.MemberCoord[gmeID];
                }
            }

            nodeDescriptor.Sets = _getSetMembershipInfo(cNode);
            nodeDescriptor.Pointers = _getPointerInfo(cNode);
        }

        return nodeDescriptor;
    };

    AspectBuilderControl.prototype._getDefaultValueForNumber = function (cValue, defaultValue) {
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
    AspectBuilderControl.prototype.onOneEvent = function (events) {
        var i = events ? events.length : 0;

        this.logger.debug("onOneEvent '" + i + "' items");

        if (i > 0) {
            this.eventQueue.push(events);
            this.processNextInQueue();
        }

        this.designerCanvas.setAspectMemberNum(this._GMEModels.length);

        this.logger.debug("onOneEvent '" + events.length + "' items - DONE");
    };

    AspectBuilderControl.prototype.processNextInQueue = function () {
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

                    if (nextBatchInQueue[len].desc) {
                        itemDecorator = nextBatchInQueue[len].desc.decorator;

                        if (itemDecorator && itemDecorator !== "") {
                            if (!this.decoratorClasses.hasOwnProperty(itemDecorator)) {
                                //TODO: hack
                                decoratorsToDownload.pushUnique("DefaultDecorator");
                            }
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

    AspectBuilderControl.prototype._downloadDecorators = function (decoratorList, callBack) {
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
                     this.AspectBuilderControl = self;
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

    AspectBuilderControl.prototype._dispatchEvents = function (events) {
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
    AspectBuilderControl.prototype._onLoad = function (gmeID, objD) {
        var uiComponent,
            i,
            GMESrcId,
            GMEDstId,
            decClass,
            objDesc,
            sources = [],
            destinations = [];

        //component loaded
        if (this.currentNodeInfo.id !== gmeID && this._GMEModels.indexOf(gmeID) === -1) {
            //aspect's member has been loaded
            if (objD && objD.position.x > -1 && objD.position.y > -1) {

                    objDesc = _.extend({}, objD);
                    this._GmeID2ComponentID[gmeID] = [];

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
        } else {
            //aspect has been loaded
            this._processAspectNode();
        }
    };

    AspectBuilderControl.prototype._onUpdate = function (gmeID, objD) {
        var componentID,
            len,
            decClass,
            objId,
            sCompId;

        //self or child updated
        //check if the updated object is the opened node
        if (gmeID === this.currentNodeInfo.id) {
            // - name change
            this._processAspectNode();
        } else {
            if (objD) {

            }
        }
    };

    AspectBuilderControl.prototype._onUnload = function (gmeID) {
        var componentID,
            len,
            idx;

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

                idx = this._GMEModels.indexOf(gmeID);
                this._GMEModels.splice(idx,1);
            }
        }
    };

    //TODO: check this here...
    AspectBuilderControl.prototype.destroy = function () {
        this._client.removeUI(this._territoryId);
    };

    AspectBuilderControl.prototype._printNodeData = function () {
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

    AspectBuilderControl.prototype._processAspectNode = function () {
        var aspectNode = this._client.getNode(this.currentNodeInfo.id),
            aspectRegistry = aspectNode.getRegistry(ASPECT_BUILDER_REGISTRY_KEY) || { "Members": [],
                "MemberCoord": {}},
            len,
            diff;

        //check added nodes
        diff = _.difference(this.currentNodeInfo.members, aspectRegistry.Members);
        len = diff.length;
        while (len--) {
            delete this._selfPatterns[diff[len]];
        }

        //check removed nodes
        diff = _.difference(aspectRegistry.Members, this.currentNodeInfo.members);
        len = diff.length;
        while (len--) {
            this._selfPatterns[diff[len]] = { "children": 0 };
        }


        this.currentNodeInfo.members = aspectRegistry.Members.slice(0);
        this._selfRegistry = aspectRegistry;

        this._client.updateTerritory(this._territoryId, this._selfPatterns);
    };

    AspectBuilderControl.prototype._aspectAdd = function (gmeID, position) {
        var cNode = this._client.getNode(this.currentNodeInfo.id),
            registry = cNode.getRegistry(ASPECT_BUILDER_REGISTRY_KEY) || { "Members": [],
                "MemberCoord": {}};

        if (registry.Members.indexOf(gmeID) === -1) {
            registry.Members.push(gmeID);
            registry.MemberCoord[gmeID] = { "x": position.x,
                "y": position.y};
        }

        this._client.setRegistry(this.currentNodeInfo.id, ASPECT_BUILDER_REGISTRY_KEY, registry);
    };

    AspectBuilderControl.prototype._onDesignerItemsMove = function (repositionDesc) {
        var cNode = this._client.getNode(this.currentNodeInfo.id),
            registry = cNode.getRegistry(ASPECT_BUILDER_REGISTRY_KEY) || { "Members": [],
                "MemberCoord": {}},
            id,
            gmeID;

        for (id in repositionDesc) {
            if (repositionDesc.hasOwnProperty(id)) {
                gmeID = this._ComponentID2GmeID[id];
                if (registry.Members.indexOf(gmeID) !== -1) {
                    registry.MemberCoord[gmeID] = { "x": repositionDesc[id].x,
                        "y": repositionDesc[id].y};
                }
            }
        }

        this._client.setRegistry(this.currentNodeInfo.id, ASPECT_BUILDER_REGISTRY_KEY, registry);
    };

    AspectBuilderControl.prototype._onSelectionDelete = function (idList) {
        var cNode = this._client.getNode(this.currentNodeInfo.id),
            registry = cNode.getRegistry(ASPECT_BUILDER_REGISTRY_KEY) || { "Members": [],
                "MemberCoord": {}},
            len = idList.length,
            gmeID,
            idx;

        while (len--) {
            gmeID = this._ComponentID2GmeID[idList[len]];
            idx = registry.Members.indexOf(gmeID);
            if ( idx !== -1) {
                registry.Members.splice(idx, 1);
                delete registry.MemberCoord[gmeID];
            }
        }

        this._client.setRegistry(this.currentNodeInfo.id, ASPECT_BUILDER_REGISTRY_KEY, registry);
    };

    //attach AspectBuilderControl - DesignerCanvas event handler functions
    _.extend(AspectBuilderControl.prototype, AspectBuilderControlDesignerCanvasEventHandlers.prototype);


    return AspectBuilderControl;
});
