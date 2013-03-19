define(['logManager',
    'clientUtil',
    'js/Constants',
    'js/NodePropertyNames',
    'js/AspectBuilder/AspectBuilderControl.DesignerCanvasEventHandlers',
    'js/SetEditor2/SetVisualHelper'], function (logManager,
                                                        util,
                                                        CONSTANTS,
                                                        nodePropertyNames,
                                                        AspectBuilderControlDesignerCanvasEventHandlers,
                                                        SetVisualHelper) {

    "use strict";

    var AspectBuilderControl,
        DECORATOR_PATH = "js/ModelEditor3/Decorators/",
        GME_ID = "GME_ID",
        ASPECT_BUILDER_REGISTRY_KEY = "AspectBuilder",

        NO_END = "none",
        ARROW_END = "classic-wide-long",
        DIAMOND_END = "diamond-wide-long",
        BLOCK_ARROW_END = "block-wide-long",
        OVAL_END = "oval-wide-long",
        OPEN_ARROW_END = "open-wide-long",

        POINTER_PREFIX = 'POINTER_',

        CONN_TYPE_HIERARCHY_PARENT = 'HIERARCHY_PARENT',

        SET_PREFIX = 'SET_';

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
        //in pointer edit mode DRAG & COPY is not enabled
        this.designerCanvas.enableDragCopy(false);

        this._client = options.client;
        this._selfPatterns = {};
        this.decoratorClasses = {};
        this.eventQueue = [];

        this._emptyAspectRegistry = { "Members": [],
            "MemberCoord": {}};

        //local variable holding info about the currently opened node
        this.currentNodeInfo = {"id": null, "members" : [] };



        /****************** ADD BUTTONS AND THEIR EVENT HANDLERS TO DESIGNER CANVAS ******************/

        /************** CREATE POINTERS *****************/
        this._$btnGroupCreatePointers = this.designerCanvas.addRadioButtonGroup(function (event, data) {
            self._setNewConnectionType(data.connType);
        });

        var btnCreatePointerSource = this.designerCanvas.addButton({ "title": "SOURCE pointer",
            "selected": true,
            "data": { "connType": POINTER_PREFIX + CONSTANTS.POINTER_SOURCE }}, this._$btnGroupCreatePointers);
        this._createButtonFace(btnCreatePointerSource, POINTER_PREFIX + CONSTANTS.POINTER_SOURCE);

        var btnCreatePointerTarget = this.designerCanvas.addButton({ "title": "TARGET pointer",
            "data": { "connType": POINTER_PREFIX + CONSTANTS.POINTER_TARGET }}, this._$btnGroupCreatePointers);
        this._createButtonFace(btnCreatePointerTarget, POINTER_PREFIX + CONSTANTS.POINTER_TARGET);

        var btnCreatePointerRef = this.designerCanvas.addButton({ "title": "REF pointer",
            "data": { "connType": POINTER_PREFIX + CONSTANTS.POINTER_REF }}, this._$btnGroupCreatePointers);
        this._createButtonFace(btnCreatePointerRef, POINTER_PREFIX + CONSTANTS.POINTER_REF);
        /************** END OF - CREATE POINTERS *****************/

        /************** CREATE SET RELATIONS *****************/
        this._$btnGroupCreateSetRelations = this.designerCanvas.addRadioButtonGroup(function (event, data) {
            self._setNewConnectionType(data.connType);
        });

        var btnCreateSetValidChildren = this.designerCanvas.addButton({ "title": "SET ValidChildren",
            "data": { "connType": SET_PREFIX + CONSTANTS.SET_VALIDCHILDREN }}, this._$btnGroupCreateSetRelations);
        this._createButtonFace(btnCreateSetValidChildren, SET_PREFIX + CONSTANTS.SET_VALIDCHILDREN);

        var btnCreateSetValidInheritor = this.designerCanvas.addButton({ "title": "SET ValidInheritor",
            "data": { "connType": SET_PREFIX + CONSTANTS.SET_VALIDINHERITOR}}, this._$btnGroupCreateSetRelations);
        this._createButtonFace(btnCreateSetValidInheritor, SET_PREFIX + CONSTANTS.SET_VALIDINHERITOR);

        var btnCreateSetValidSource = this.designerCanvas.addButton({ "title": "SET ValidSource",
            "data": { "connType": SET_PREFIX + CONSTANTS.SET_VALIDSOURCE}}, this._$btnGroupCreateSetRelations);
        this._createButtonFace(btnCreateSetValidSource, SET_PREFIX + CONSTANTS.SET_VALIDSOURCE);

        var btnCreateSetValidDestination = this.designerCanvas.addButton({ "title": "SET ValidDestination",
            "data": { "connType": SET_PREFIX + CONSTANTS.SET_VALIDDESTINATION}}, this._$btnGroupCreateSetRelations);
        this._createButtonFace(btnCreateSetValidDestination, SET_PREFIX + CONSTANTS.SET_VALIDDESTINATION);

        var btnCreateSetGeneral = this.designerCanvas.addButton({ "title": "SET General",
            "data": { "connType": SET_PREFIX + CONSTANTS.SET_GENERAL}}, this._$btnGroupCreateSetRelations);
        this._createButtonFace(btnCreateSetGeneral, SET_PREFIX + CONSTANTS.SET_GENERAL);


        this._setNewConnectionType(POINTER_PREFIX + CONSTANTS.POINTER_SOURCE);
        /************** END OF - CREATE POINTERS *****************/


        /************** PRINT NODE DATA *****************/
        $btnGroupPrintNodeData = this.designerCanvas.addButtonGroup(function (/*event, data*/) {
            self._printNodeData();
        });

        this.designerCanvas.addButton({ "title": "Print node data",
            "icon": "icon-share"}, $btnGroupPrintNodeData);
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

        this._connectionWaitingListByDstGMEID = {};

        this._connectionListBySrcGMEID = {};
        this._connectionListByDstGMEID = {};
        this._connectionListByType = {};
        this._connectionListByID = {};

        this._nodePointers = {};
        this._nodeSets = {};

        //remove current territory patterns
        if (this.currentNodeInfo.id) {
            this._client.removeUI(this._territoryId);
        }

        if (nodeId) {
            this.currentNodeInfo.id = nodeId;
            this.currentNodeInfo.members = [];

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

    /**********************************************************/
    /*                    PUBLIC METHODS                      */
    /**********************************************************/
    AspectBuilderControl.prototype.onOneEvent = function (events) {
        var i = events ? events.length : 0;

        this.logger.debug("onOneEvent '" + i + "' items");

        if (i > 0) {
            this.eventQueue.push(events);
            this._processNextInQueue();
        }

        this.designerCanvas.setAspectMemberNum(this._GMEModels.length);

        this.logger.debug("onOneEvent '" + events.length + "' items - DONE");
    };

    //TODO: check this here...
    //NOTE: all the UI cleanup will happen from VisualizerPanel
    //might not be the best approach
    AspectBuilderControl.prototype.destroy = function () {
        this._client.removeUI(this._territoryId);
        this.designerCanvas.clear();
    };

    /**********************************************************/
    /*                   PRIVATE METHODS                      */
    /**********************************************************/


    /**********************************************************/
    /*       EVENT AND DECORATOR DOWNLOAD HANDLING            */
    /**********************************************************/
    AspectBuilderControl.prototype._processNextInQueue = function () {
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

        this.designerCanvas.endUpdate();

        this.designerCanvas.hidePogressbar();

        this.logger.debug("_dispatchEvents '" + events.length + "' items - DONE");

        //continue processing event queue
        this._processNextInQueue();
    };
    /**********************************************************/
    /*    END OF --- EVENT AND DECORATOR DOWNLOAD HANDLING    */
    /**********************************************************/


    /**********************************************************/
    /*       READ IMPORTANT INFORMATION FROM A NODE           */
    /**********************************************************/
    AspectBuilderControl.prototype._getObjectDescriptor = function (gmeID) {
        var cNode = this._client.getNode(gmeID),
            nodeDescriptor,
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
                "decorator": "DefaultDecorator",
                "position": { "x": -1, "y": -1 }};

            nodeDescriptor.ID = gmeID;
            nodeDescriptor.ParentID = cNode.getParentId();

            nodeDescriptor.name = cNode.getAttribute(nodePropertyNames.Attributes.name) || "";

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
    /**********************************************************/
    /*  END OF --- READ IMPORTANT INFORMATION FROM A NODE     */
    /**********************************************************/


    /**********************************************************/
    /*                LOAD / UPDATE / UNLOAD HANDLER          */
    /**********************************************************/
    AspectBuilderControl.prototype._onLoad = function (gmeID, objD) {
        if (gmeID === this.currentNodeInfo.id) {
            this._processAspectNode();
        } else {
            this._processNodeLoad(gmeID, objD);
        }
    };

    AspectBuilderControl.prototype._onUpdate = function (gmeID, objD) {
        if (gmeID === this.currentNodeInfo.id) {
            this._processAspectNode();
        } else {
            this._processNodeUpdate(gmeID, objD);
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
            throw "NOT YET IMPLEMENTED: 'The currently opened model has been deleted'";
        } else {
            this._processNodeUnload(gmeID);
        }
    };
    /**********************************************************/
    /*       END OF --- LOAD / UPDATE / UNLOAD HANDLER        */
    /**********************************************************/




    /**********************************************************/
    /*                CUSTOM BUTTON EVENT HANDLERS            */
    /**********************************************************/
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
    /**********************************************************/
    /*       END OF --- CUSTOM BUTTON EVENT HANDLERs          */
    /**********************************************************/


    /**********************************************************/
    /*  PROCESS ASPECT NODE TO HANDLE ADDED / REMOVED ELEMENT */
    /**********************************************************/
    AspectBuilderControl.prototype._processAspectNode = function () {
        var aspectNode = this._client.getNode(this.currentNodeInfo.id),
            len,
            diff,
            objDesc,
            componentID,
            i,
            gmeID,
            aspectRegistry = aspectNode.getRegistry(ASPECT_BUILDER_REGISTRY_KEY) || this._emptyAspectRegistry.clone(),
            territoryChanged = false;

        //update selfRegistry (for node positions)
        this._selfRegistry = aspectRegistry;

        //check added nodes
        diff = _.difference(this.currentNodeInfo.members, aspectRegistry.Members);
        len = diff.length;
        while (len--) {
            delete this._selfPatterns[diff[len]];
            territoryChanged = true;
        }

        //check removed nodes
        diff = _.difference(aspectRegistry.Members, this.currentNodeInfo.members);
        len = diff.length;
        while (len--) {
            this._selfPatterns[diff[len]] = { "children": 0 };
            territoryChanged = true;
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

        //there was change in the territory
        if (territoryChanged === true) {
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        }
    };
    /*********************************************************************/
    /*  END OF --- PROCESS ASPECT NODE TO HANDLE ADDED / REMOVED ELEMENT */
    /*********************************************************************/


    /**********************************************************/
    /*  HANDLE OBJECT ADDITION TO ASPECT                      */
    /**********************************************************/
    AspectBuilderControl.prototype._addItemsToAspect = function (gmeID, position) {
        var cNode = this._client.getNode(this.currentNodeInfo.id),
            registry = cNode.getRegistry(ASPECT_BUILDER_REGISTRY_KEY) || this._emptyAspectRegistry.clone();

        if (registry.Members.indexOf(gmeID) === -1) {
            registry.Members.push(gmeID);
            registry.MemberCoord[gmeID] = { "x": position.x,
                "y": position.y};
        }

        this._client.setRegistry(this.currentNodeInfo.id, ASPECT_BUILDER_REGISTRY_KEY, registry);
    };
    /**********************************************************/
    /*  END OF --- HANDLE OBJECT ADDITION TO ASPECT           */
    /**********************************************************/


    /**********************************************************/
    /*  HANDLE OBJECT REPOSITION IN THE ASPECT ASPECT         */
    /**********************************************************/
    AspectBuilderControl.prototype._onDesignerItemsMove = function (repositionDesc) {
        var cNode = this._client.getNode(this.currentNodeInfo.id),
            registry = cNode.getRegistry(ASPECT_BUILDER_REGISTRY_KEY) || this._emptyAspectRegistry.clone(),
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
    /************************************************************/
    /* END OF --- HANDLE OBJECT REPOSITION IN THE ASPECT ASPECT */
    /************************************************************/


    /*************************************************************/
    /*  HANDLE OBJECT / CONNECTION DELETION IN THE ASPECT ASPECT */
    /*************************************************************/
    //TODO: connection deletion not yet handled
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
    /************************************************************************/
    /*  END OF --- HANDLE OBJECT / CONNECTION DELETION IN THE ASPECT ASPECT */
    /************************************************************************/


    /**************************************************************************/
    /*  HANDLE OBJECT LOAD  --- DISPLAY IT WITH ALL THE POINTERS / SETS / ETC */
    /**************************************************************************/
    AspectBuilderControl.prototype._processNodeLoad = function (gmeID, objD) {
        var uiComponent,
            decClass,
            objDesc;

        //component loaded
        if (this._GMEModels.indexOf(gmeID) === -1) {
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

                //process new node to display pointers / hierarchy / sets as connections
                this._processNodePointers(gmeID, objD);
                this._processNodeSets(gmeID, objD);
                this._processNodeParent(gmeID, objD);

                //check all the waiting pointers (whose SRC is already displayed and waiting for the DST to show up)
                //it might be this new node
                this._processConnectionWaitingList(gmeID);
            }
        }
    };

    AspectBuilderControl.prototype._processConnectionWaitingList = function (gmeDstID) {
        var len,
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
    /**************************************************************************/
    /*  END OF --- HANDLE OBJECT LOAD DISPLAY IT WITH ALL THE POINTERS / ...  */
    /**************************************************************************/


    /****************************************************************************/
    /*  HANDLE OBJECT UNLOAD  --- DISPLAY IT WITH ALL THE POINTERS / SETS / ETC */
    /****************************************************************************/
    AspectBuilderControl.prototype._processNodeUnload = function (gmeID) {
        var componentID,
            len,
            idx;

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

            //keep up accounting
            delete this._nodePointers[gmeID];
            delete this._nodeSets[gmeID];
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
    /****************************************************************************/
    /*                      END OF --- HANDLE OBJECT UNLOAD                     */
    /****************************************************************************/


    /****************************************************************************/
    /*  CREATE A SPECIFIC TYPE OF CONNECTION BETWEEN 2 GME OBJECTS              */
    /****************************************************************************/
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

            _.extend(connDesc, this._getConnTypeVisualDescriptor(connType));

            connComponent = this.designerCanvas.createConnection(connDesc);

            this._saveConnection(gmeSrcId, gmeDstId, connType, connComponent.id);
        } else {
            //destination is not displayed, store it in a queue
            this._saveConnectionToWaitingList(gmeSrcId, gmeDstId, connType);
        }
    };

    AspectBuilderControl.prototype._saveConnectionToWaitingList =  function (gmeSrcId, gmeDstId, connType) {
        this._connectionWaitingListByDstGMEID[gmeDstId] = this._connectionWaitingListByDstGMEID[gmeDstId] || {};

        this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId] = this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId] || [];

        this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId].push(connType);
    };

    AspectBuilderControl.prototype._saveConnection = function (gmeSrcId, gmeDstId, connType, connComponentId) {
        //save by SRC
        this._connectionListBySrcGMEID[gmeSrcId] = this._connectionListBySrcGMEID[gmeSrcId] || {};
        this._connectionListBySrcGMEID[gmeSrcId][gmeDstId] = this._connectionListBySrcGMEID[gmeSrcId][gmeDstId] || {};
        this._connectionListBySrcGMEID[gmeSrcId][gmeDstId][connType] = connComponentId;
        
        //save by DST
        this._connectionListByDstGMEID[gmeDstId] = this._connectionListByDstGMEID[gmeDstId] || {};
        this._connectionListByDstGMEID[gmeDstId][gmeSrcId] = this._connectionListByDstGMEID[gmeDstId][gmeSrcId] || {};
        this._connectionListByDstGMEID[gmeDstId][gmeSrcId][connType] = connComponentId;

        //save by type
        this._connectionListByType[connType] = this._connectionListByType[connType] || [];
        this._connectionListByType[connType].push(connComponentId);

        //save by connectionID
        this._connectionListByID[connComponentId] = { "GMESrcId": gmeSrcId,
                                                      "GMEDstID": gmeDstId,
                                                      "type": connType };
    };
    /****************************************************************************/
    /*  END OF --- CREATE A SPECIFIC TYPE OF CONNECTION BETWEEN 2 GME OBJECTS   */
    /****************************************************************************/


    /****************************************************************************/
    /*  REMOVES A SPECIFIC TYPE OF CONNECTION FROM 2 GME OBJECTS                */
    /****************************************************************************/
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
    /****************************************************************************/
    /*  END OF --- REMOVES A SPECIFIC TYPE OF CONNECTION FROM 2 GME OBJECTS     */
    /****************************************************************************/


    /**************************************************************************/
    /*  HANDLE OBJECT UPDATE  --- DISPLAY IT WITH ALL THE POINTERS / SETS / ETC */
    /**************************************************************************/
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

        this._processNodeSets(gmeID, objDesc);
    };
    /**************************************************************************/
    /*                   END OF --- HANDLE OBJECT UPDATE                      */
    /**************************************************************************/


    /**************************************************************************/
    /*  CREATE A CONNECTION FROM THE POINTERS OF A GME OBJECT                 */
    /**************************************************************************/
    AspectBuilderControl.prototype._processNodePointers = function (gmeID, objD) {
        //only the pointers are relevant here
        //add / remove necessary
        var ptrType,
            ptrTo,
            oldPointers = [],
            newPointers = [],
            diff,
            len;

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
                this._removeConnection(gmeID, ptrTo, POINTER_PREFIX + ptrType);
                delete this._nodePointers[gmeID][ptrType];

                ptrTo = objD.Pointers[ptrType];
                this._createConnection(gmeID, ptrTo, POINTER_PREFIX + ptrType);
                this._nodePointers[gmeID][ptrType] = ptrTo;
            }
        }

        //compute deleted pointers
        diff = _.difference(oldPointers, newPointers);
        len = diff.length;
        while (len--) {
            ptrType = diff[len];
            ptrTo = this._nodePointers[gmeID][ptrType];

            this._removeConnection(gmeID, ptrTo, POINTER_PREFIX + ptrType);
            delete this._nodePointers[gmeID][ptrType];
        }

        //compute added pointers
        diff = _.difference(newPointers, oldPointers);
        len = diff.length;
        while (len--) {
            ptrType = diff[len];
            ptrTo = objD.Pointers[ptrType];

            this._createConnection(gmeID, ptrTo, POINTER_PREFIX + ptrType);
            this._nodePointers[gmeID][ptrType] = ptrTo;
        }
    };
    /**************************************************************************/
    /*  END OF --- CREATE A CONNECTION FROM THE POINTERS OF A GME OBJECT      */
    /**************************************************************************/


    /**************************************************************************/
    /*    CREATE A CONNECTION FROM THE SET CONTAINMENT OF A GME OBJECT        */
    /**************************************************************************/
    AspectBuilderControl.prototype._processNodeSets = function (gmeID, objD) {
        var cSet,
            ptrTo,
            allSets = [],
            diff,
            newMembers,
            oldMembers,
            len,
            i,
            idx;

        this._nodeSets[gmeID] = this._nodeSets[gmeID] || {};
        for (cSet in this._nodeSets[gmeID]) {
            if (this._nodeSets[gmeID].hasOwnProperty(cSet)) {
                allSets.push(cSet);
            }
        }

        for (cSet in objD.Sets) {
            if (objD.Sets.hasOwnProperty(cSet)) {
                if (allSets.indexOf(cSet) === -1) {
                    allSets.push(cSet);
                }
            }
        }

        //iterate through the sets and check the differences
        i = allSets.length;
        while(i--) {
            cSet = allSets[i];

            newMembers = objD.Sets[cSet] || [];
            oldMembers = this._nodeSets[gmeID][cSet] || [];

            //deleted guys
            diff = _.difference(oldMembers, newMembers);
            len = diff.length;
            while (len--) {
                ptrTo = diff[len];

                this._removeConnection(gmeID, ptrTo, SET_PREFIX + cSet);

                idx = this._nodeSets[gmeID][cSet].indexOf(ptrTo);
                this._nodeSets[gmeID][cSet].splice(idx, 1);
            }

            //compute added pointers
            diff = _.difference(newMembers, oldMembers);
            len = diff.length;
            while (len--) {
                ptrTo = diff[len];

                this._createConnection(gmeID, ptrTo,  SET_PREFIX + cSet);

                this._nodeSets[gmeID][cSet] = this._nodeSets[gmeID][cSet] || [];
                this._nodeSets[gmeID][cSet].push(ptrTo);
            }
        }
    };
    /***************************************************************************/
    /* END OF --- CREATE A CONNECTION FROM THE SET CONTAINMENT OF A GME OBJECT */
    /***************************************************************************/


    /***************************************************************************/
    /* CREATE A CONNECTION TO REPRESENT A CONTAINMENT BETWEEN PARENT AND CHILD */
    /***************************************************************************/
    AspectBuilderControl.prototype._processNodeParent = function (gmeID, objD) {
        if (objD.ParentID) {
            this._createConnection(gmeID, objD.ParentID, CONN_TYPE_HIERARCHY_PARENT);
        }
    };
    /**************************************************************************************/
    /* END OF --- CREATE A CONNECTION TO REPRESENT A CONTAINMENT BETWEEN PARENT AND CHILD */
    /**************************************************************************************/


    /****************************************************************************/
    /*         DEFINE VISUAL STYLE FOR EACH SPECIFIC CONNECTION TYPE            */
    /****************************************************************************/
    AspectBuilderControl.prototype._getConnTypeVisualDescriptor = function (connType) {
        var params = { "arrowStart" : "none",
            "arrowEnd" : "none",
            "width" : "2",
            "color" :"#000000" };

        if (connType.indexOf(SET_PREFIX) === 0) {
            params = SetVisualHelper.getLineVisualDescriptor(connType.replace(SET_PREFIX, ''));
        } else {
            switch (connType) {
                case POINTER_PREFIX + CONSTANTS.POINTER_SOURCE:
                    params.arrowStart = NO_END;
                    params.arrowEnd = ARROW_END;
                    params.color = "#FF0000";
                    break;
                case POINTER_PREFIX + CONSTANTS.POINTER_TARGET:
                    params.arrowStart = NO_END;
                    params.arrowEnd = ARROW_END;
                    params.color = "#0000FF";
                    break;
                case POINTER_PREFIX + CONSTANTS.POINTER_REF:
                    params.arrowStart = NO_END;
                    params.arrowEnd = ARROW_END;
                    params.color = "#EFA749";
                    break;
                case CONN_TYPE_HIERARCHY_PARENT:
                    params.arrowStart = NO_END;
                    params.arrowEnd = DIAMOND_END;
                    params.color = "#333333";
                    break;
                default:
                    break;
            }
        }

        

        return params;
    };

    /****************************************************************************/
    /*     END OF --- DEFINE VISUAL STYLE FOR EACH SPECIFIC CONNECTION TYPE     */
    /****************************************************************************/

    /****************************************************************************/
    /*        CREATE NEW CONNECTION BUTTONS AND THEIR EVENT HANDLERS            */
    /****************************************************************************/
    AspectBuilderControl.prototype._createButtonFace = function (btn, connType) {
        btn.append(SetVisualHelper.createButtonIcon(16, this._getConnTypeVisualDescriptor(connType) ));
    };

    AspectBuilderControl.prototype._setNewConnectionType = function (connType) {
        var connProps = this._getConnTypeVisualDescriptor(connType);

        if (this._connType !== connType) {
            this._connType = connType;

            this.designerCanvas.connectionDrawingManager.setConnectionInDrawProperties(connProps);


            if (this._connType === POINTER_PREFIX + CONSTANTS.POINTER_SOURCE ||
                this._connType === POINTER_PREFIX + CONSTANTS.POINTER_TARGET ||
                this._connType === POINTER_PREFIX + CONSTANTS.POINTER_REF) {
                this._$btnGroupCreateSetRelations.setButtonsInactive();
            }

            if (this._connType === SET_PREFIX + CONSTANTS.SET_VALIDCHILDREN ||
                this._connType === SET_PREFIX + CONSTANTS.SET_VALIDDESTINATION || 
                this._connType === SET_PREFIX + CONSTANTS.SET_VALIDSOURCE ||
                this._connType === SET_PREFIX + CONSTANTS.SET_VALIDINHERITOR ||
                this._connType === SET_PREFIX + CONSTANTS.SET_GENERAL) {
                this._$btnGroupCreatePointers.setButtonsInactive();
            }
        }
    };

    AspectBuilderControlDesignerCanvasEventHandlers.prototype._onCreateNewConnection = function (params) {
        var sourceId = this._ComponentID2GmeID[params.src],
            targetId = this._ComponentID2GmeID[params.dst];

        //set new POINTER info
        if (this._connType === POINTER_PREFIX + CONSTANTS.POINTER_SOURCE ||
            this._connType === POINTER_PREFIX + CONSTANTS.POINTER_TARGET ||
            this._connType === POINTER_PREFIX + CONSTANTS.POINTER_REF) {
            this._client.makePointer(sourceId, this._connType.replace(POINTER_PREFIX, ''), targetId);
        }

        //set new SET membership
        if (this._connType === SET_PREFIX + CONSTANTS.SET_VALIDCHILDREN ||
            this._connType === SET_PREFIX + CONSTANTS.SET_VALIDDESTINATION ||
            this._connType === SET_PREFIX + CONSTANTS.SET_VALIDSOURCE ||
            this._connType === SET_PREFIX + CONSTANTS.SET_VALIDINHERITOR ||
            this._connType === SET_PREFIX + CONSTANTS.SET_GENERAL) {
            this._client.addMember(sourceId, targetId, this._connType.replace(SET_PREFIX, ''));
        }
    };

    /****************************************************************************/
    /*    END OF --- CREATE NEW CONNECTION BUTTONS AND THEIR EVENT HANDLERS     */
    /****************************************************************************/

    //attach AspectBuilderControl - DesignerCanvas event handler functions
    _.extend(AspectBuilderControl.prototype, AspectBuilderControlDesignerCanvasEventHandlers.prototype);


    return AspectBuilderControl;
});
