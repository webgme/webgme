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
        ASPECT_BUILDER_REGISTRY_KEY = "AspectBuilder",

        NOEND = "none",
        ARROW_END = "classic-wide-long",

        POINTER_PREFIX = 'POINTER_',
        POINTER_SOURCE = 'POINTER_SOURCE',
        POINTER_TARGET = 'POINTER_TARGET',
        SET_VALIDCHILDREN = 'ValidChildren',
        SET_VALIDSOURCE = 'ValidSource',
        SET_VALIDDESTINATION = 'ValidDestination',
        SET_VALIDINHERITOR = 'ValidInheritor',
        SET_GENERAL = 'General';

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
                result[availablePointers[len]] = node.getPointer(availablePointers[len]).to;
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
                    nodeDescriptor.position = this._selfRegistry.MemberCoord[gmeID]; // || { "x": 100, "y": 100  };
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

                this._processNodePointers(gmeID, objD);

                //check all the waiting pointers (whose SRC is already displayed and waiting for the DST to show up)
                this._processConnectionWaitingList(gmeID);
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
                this._processNodeUpdate(gmeID, objD);
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

                    //remove all the associated connection(s) (both from existing connection list and waiting list)
                    //if gmeID is destinationID, remove connection and store it's data in the waiting list
                    //if gmeID is sourceID, remove connection and end of story
                    this._removeAssociatedConnections(gmeID);

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
            diff,
            objDesc,
            componentID,
            i,
            gmeID;

        //update selfregistry (for node positions)
        this._selfRegistry = aspectRegistry;

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

        //check all other nodes for position change
        diff = _.intersection(this.currentNodeInfo.members, aspectRegistry.Members);
        len = diff.length;
        while (len--) {
            gmeID = diff[len];
            objDesc = this._getObjectDescriptor(gmeID);

            i = this._GmeID2ComponentID[gmeID].length;
            while (i--) {
                componentID = this._GmeID2ComponentID[gmeID][i];
                this.designerCanvas.updateDesignerItem(componentID, objDesc);
            }
        }

        //update current member list
        this.currentNodeInfo.members = aspectRegistry.Members.slice(0);


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

    AspectBuilderControl.prototype._createConnection = function (gmeSrcId, gmeDstId, connType) {
        var connDesc,
            connComponent;
        //need to check if the src and dst objects are displayed or not
        //if YES, create connection
        //if NO, store information in a waiting queue
        //fact: gmeSrcId is available, the call is coming from there
        if (this._GMEModels.indexOf(gmeDstId) !== -1) {
            //destination is displayed
            connDesc = { "srcObjId": this._GmeID2ComponentID[gmeSrcId][0],
                         "srcSubCompId": undefined,
                         "dstObjId": this._GmeID2ComponentID[gmeDstId][0],
                         "dstSubCompId": undefined,
                         "reconnectable": false
            };

            _.extend(connDesc, this._getConnTypeVisualDescriptor(POINTER_PREFIX + connType.toUpperCase()));

            connComponent = this.designerCanvas.createConnection(connDesc);

            this._saveConnection(gmeSrcId, gmeDstId, connType, connComponent.id);
        } else {
            //destination is not displayed, store it in a queue
            this._saveConnectionToWaitingList(gmeSrcId, gmeDstId, connType);
        }
    };

    AspectBuilderControl.prototype._saveConnectionToWaitingList =  function (gmeSrcId, gmeDstId, connType) {
        this._connectionWaitingListByDstGMEID = this._connectionWaitingListByDstGMEID || {};

        this._connectionWaitingListByDstGMEID[gmeDstId] = this._connectionWaitingListByDstGMEID[gmeDstId] || {};

        this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId] = this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId] || [];

        this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId].push(connType);
    };

    AspectBuilderControl.prototype._removeConnectionFromWaitingList =  function (gmeSrcId, gmeDstId, connType) {
        this._connectionWaitingListByDstGMEID = this._connectionWaitingListByDstGMEID || {};

        if (this._connectionWaitingListByDstGMEID.hasOwnProperty(gmeDstId)) {
            if (this._connectionWaitingListByDstGMEID[gmeDstId].hasOwnProperty(gmeSrcId)) {
                var idx = this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId].indexOf((connType));
                if (idx !== -1) {
                    this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId].splice(idx, 1);
                }
            }
        }
    };

    AspectBuilderControl.prototype._saveConnection = function (gmeSrcId, gmeDstId, connType, connComponentId) {
        //save by SRC
        this._connectionListBySrcGMEID = this._connectionListBySrcGMEID || {};
        this._connectionListBySrcGMEID[gmeSrcId] = this._connectionListBySrcGMEID[gmeSrcId] || {};
        this._connectionListBySrcGMEID[gmeSrcId][gmeDstId] = this._connectionListBySrcGMEID[gmeSrcId][gmeDstId] || {};
        this._connectionListBySrcGMEID[gmeSrcId][gmeDstId][connType] = connComponentId;
        
        //save by DST
        this._connectionListByDstGMEID = this._connectionListByDstGMEID || {};
        this._connectionListByDstGMEID[gmeDstId] = this._connectionListByDstGMEID[gmeDstId] || {};
        this._connectionListByDstGMEID[gmeDstId][gmeSrcId] = this._connectionListByDstGMEID[gmeDstId][gmeSrcId] || {};
        this._connectionListByDstGMEID[gmeDstId][gmeSrcId][connType] = connComponentId;

        //save by type
        this._connectionListByType = this._connectionListByType || {};
        this._connectionListByType[connType] = this._connectionListByType[connType] || [];
        this._connectionListByType[connType].push(connComponentId);

        //save by connectionID
        this._connectionListByID = this._connectionListByID || {};
        this._connectionListByID[connComponentId] = { "GMESrcId": gmeSrcId,
                                                      "GMEDstID": gmeDstId,
                                                      "type": connType };
    };

    AspectBuilderControl.prototype._getConnTypeVisualDescriptor = function (connType) {
        var params = { "arrowStart" : "none",
            "arrowEnd" : "none",
            "width" : "1",
            "color" :"#AAAAAA" };

        switch (connType) {
            case POINTER_SOURCE:
                params.arrowStart = NOEND;
                params.arrowEnd = ARROW_END;
                params.width = 2;
                params.color = "#FF0000";
                break;
            case POINTER_TARGET:
                params.arrowStart = NOEND;
                params.arrowEnd = ARROW_END;
                params.width = 2;
                params.color = "#0000FF";
                break;
            /*case SET_VALIDCHILDREN:
                params.arrowStart = VALIDCHILDREN_TYPE_LINE_END;
                params.arrowEnd = NOEND;
                params.width = 2;
                params.color = "#FF0000";
                break;
            case SET_VALIDINHERITOR:
                params.arrowStart = VALIDINHERITOR_TYPE_LINE_END;
                params.arrowEnd = NOEND;
                params.width = 2;
                params.color = "#0000FF";
                break;
            case SET_VALIDSOURCE:
                params.arrowStart = VALIDSOURCE_TYPE_LINE_END;
                params.arrowEnd = NOEND;
                params.width = 2;
                params.color = "#00FF00";
                break;
            case SET_VALIDDESTINATION:
                params.arrowStart = VALIDDESTINATION_TYPE_LINE_END;
                params.arrowEnd = NOEND;
                params.width = 2;
                params.color = "#AA03C3";
                break;
            case SET_GENERAL:
                params.arrowStart = GENERAL_TYPE_LINE_END;
                params.arrowEnd = NOEND;
                params.width = 2;
                params.color = "#000000";
                break;*/
            default:
                break;
        }

        return params;
    };

    AspectBuilderControl.prototype._processConnectionWaitingList = function (gmeDstID) {
        var it,
            len,
            gmeSrcID,
            connType;

        if (this._connectionWaitingListByDstGMEID && this._connectionWaitingListByDstGMEID.hasOwnProperty(gmeDstID)) {
            //this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId].push(connType);
            for (gmeSrcID in this._connectionWaitingListByDstGMEID[gmeDstID]) {
                if (this._connectionWaitingListByDstGMEID[gmeDstID].hasOwnProperty(gmeSrcID)){
                    len = this._connectionWaitingListByDstGMEID[gmeDstID][gmeSrcID].length;
                    while (len--) {
                        connType = this._connectionWaitingListByDstGMEID[gmeDstID][gmeSrcID][len];
                        this._createConnection(gmeSrcID, gmeDstID, connType);
                    }
                }
            }

            delete this._connectionWaitingListByDstGMEID[gmeDstID];
        }
    };

    AspectBuilderControl.prototype._removeAssociatedConnections = function (gmeID) {
        var it,
            gmeSrcId,
            gmeDstId,
            connType,
            connectionID,
            idx;

        //remove associated connection info from waiting list
        //#1
        //gmeID is in the waiting list as connectionEnd
        //NOTE: this should never happen, so signal error here
        if (this._connectionWaitingListByDstGMEID.hasOwnProperty(gmeID)) {
            throw "Broken connection waiting list...";
        }

        //#2
        //gmeID is the source of the connections
        for (it in this._connectionWaitingListByDstGMEID) {
            if (this._connectionWaitingListByDstGMEID.hasOwnProperty(it)){
                if (this._connectionWaitingListByDstGMEID[it].hasOwnProperty(gmeID)){
                    delete this._connectionWaitingListByDstGMEID[it][gmeID];
                }
            }
        }

        //remove existing connections associated with gmeID
        //#3
        //if gmeID is the source of the connection, remove connection and no need to save
        if (this._connectionListBySrcGMEID.hasOwnProperty(gmeID)) {
            for (gmeDstId in this._connectionListBySrcGMEID[gmeID]) {
                if (this._connectionListBySrcGMEID[gmeID].hasOwnProperty(gmeDstId)) {
                    for (connType in this._connectionListBySrcGMEID[gmeID][gmeDstId]) {
                        if (this._connectionListBySrcGMEID[gmeID][gmeDstId].hasOwnProperty(connType)) {
                            connectionID = this._connectionListBySrcGMEID[gmeID][gmeDstId][connType];

                            this.designerCanvas.deleteComponent(connectionID);

                            //clean up accounting
                            delete this._connectionListByID[connectionID];

                            idx = this._connectionListByType[connType].indexOf(connectionID);
                            this._connectionListByType[connType].splice(idx, 1);
                        }
                    }

                    //remove all info from _connectionListByDstGMEID
                    delete this._connectionListByDstGMEID[gmeDstId][gmeID];
                }
            }

            //final cleanup in _connectionListBySrcGMEID
            delete this._connectionListBySrcGMEID[gmeID];
        }

        //#4
        //if gmeID is the end of the connection, remove connection and save its data to the waiting list
        if (this._connectionListByDstGMEID.hasOwnProperty(gmeID)) {
            for(gmeSrcId in this._connectionListByDstGMEID[gmeID]) {
                if (this._connectionListByDstGMEID[gmeID].hasOwnProperty(gmeSrcId)) {

                    for (connType in this._connectionListByDstGMEID[gmeID][gmeSrcId]) {
                        if (this._connectionListByDstGMEID[gmeID][gmeSrcId].hasOwnProperty(connType)) {
                            connectionID = this._connectionListByDstGMEID[gmeID][gmeSrcId][connType];

                            this.designerCanvas.deleteComponent(connectionID);

                            //save to waiting list
                            this._saveConnectionToWaitingList(gmeSrcId, gmeID, connType);

                            //clean up accounting
                            delete this._connectionListByID[connectionID];

                            idx = this._connectionListByType[connType].indexOf(connectionID);
                            this._connectionListByType[connType].splice(idx, 1);
                        }
                    }

                    //remove all info from _connectionListByDstGMEID
                    delete this._connectionListBySrcGMEID[gmeSrcId][gmeID];
                }
            }

            //final cleanup in _connectionListByDstGMEID
            delete this._connectionListByDstGMEID[gmeID];
        }
    };

    AspectBuilderControl.prototype._processNodeUpdate = function(gmeID, objDesc) {
        var len = this._GmeID2ComponentID[gmeID].length,
            componentID,
            decClass;

        while (len--) {
            componentID = this._GmeID2ComponentID[gmeID][len];

            decClass = this.decoratorClasses[objDesc.decorator];

            objDesc.decoratorClass = decClass;

            this.designerCanvas.updateDesignerItem(componentID, objDesc);
        }

        //update set relations
        this._processNodePointers(gmeID, objDesc);
    };

    AspectBuilderControl.prototype._processNodePointers = function (gmeID, objD) {
        //only the pointers are relevant here
        //add / remove necessary
        var ptrType,
            ptrTo,
            oldPointers = [],
            newPointers = [],
            diff,
            len;

        this._nodePointers = this._nodePointers || {};
        this._nodePointers[gmeID] = this._nodePointers[gmeID] || {};
        for (ptrType in this._nodePointers[gmeID]) {
            if (this._nodePointers[gmeID].hasOwnProperty(ptrType)) {
                oldPointers.push(ptrType);
            }
        }

        for (ptrType in objD.Pointers) {
            if (objD.Pointers.hasOwnProperty(ptrType)) {
                newPointers.push(ptrType);
            }
        }

        //compute updated connections
        diff = _.intersection(oldPointers, newPointers);
        len = diff.length;
        while (len--) {
            ptrType = diff[len];
            if (this._nodePointers[gmeID][ptrType] !== objD.Pointers[ptrType]) {
                ptrTo = this._nodePointers[gmeID][ptrType];
                this._removeConnection(gmeID, ptrTo, ptrType);
                delete this._nodePointers[gmeID][ptrType];

                ptrTo = objD.Pointers[ptrType];
                this._createConnection(gmeID, ptrTo, ptrType);
                this._nodePointers[gmeID][ptrType] = ptrTo;
            }
        }

        //compute deleted pointers
        diff = _.difference(oldPointers, newPointers);
        len = diff.length;
        while (len--) {
            ptrType = diff[len];
            ptrTo = this._nodePointers[gmeID][ptrType];

            this._removeConnection(gmeID, ptrTo, ptrType);
            delete this._nodePointers[gmeID][ptrType];
        }

        //compute added pointers
        diff = _.difference(newPointers, oldPointers);
        len = diff.length;
        while (len--) {
            ptrType = diff[len];
            ptrTo = objD.Pointers[ptrType];

            this._createConnection(gmeID, ptrTo, ptrType);
            this._nodePointers[gmeID][ptrType] = ptrTo;
        }
    };

    AspectBuilderControl.prototype._removeConnection = function (gmeSrcId, gmeDstId, connType) {
        var connectionID,
            idx;

        connectionID = this._connectionListBySrcGMEID[gmeSrcId][gmeDstId][connType];

        this.designerCanvas.deleteComponent(connectionID);

        //clean up accounting
        delete this._connectionListByID[connectionID];

        idx = this._connectionListByType[connType].indexOf(connectionID);
        this._connectionListByType[connType].splice(idx, 1);


        delete this._connectionListBySrcGMEID[gmeSrcId][gmeDstId][connType];
        delete this._connectionListByDstGMEID[gmeDstId][gmeSrcId][connType];
    };

    //attach AspectBuilderControl - DesignerCanvas event handler functions
    _.extend(AspectBuilderControl.prototype, AspectBuilderControlDesignerCanvasEventHandlers.prototype);


    return AspectBuilderControl;
});
