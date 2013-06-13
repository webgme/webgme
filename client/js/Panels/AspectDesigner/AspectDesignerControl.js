define(['logManager',
    'clientUtil',
    'js/Constants',
    'js/NodePropertyNames',
    './AspectDesignerControl.DiagramDesignerWidgetEventHandlers',
    'js/Panels/DiagramDesigner/SetEditor/SetVisualHelper'], function (logManager,
                                                        util,
                                                        CONSTANTS,
                                                        nodePropertyNames,
                                                        AspectDesignerControlDiagramDesignerWidgetEventHandlers,
                                                        SetVisualHelper) {

    "use strict";

    var AspectDesignerControl,
        DECORATOR_PATH = "js/Decorators/DiagramDesigner/",
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

    AspectDesignerControl = function (options) {
        var self = this,
            $btnGroupPrintNodeData;

        this.logger = options.logger || logManager.create(options.loggerName || "AspectDesignerControl");

        this._client = options.client;
        this._panel = options.panel;

        //initialize core collections and variables
        this.designerCanvas = this._panel.widget;

        if (this._client === undefined) {
            this.logger.error("ModelEditorControl's client is not specified...");
            throw ("ModelEditorControl can not be created");
        }

        if (this.designerCanvas === undefined) {
            this.logger.error("ModelEditorControl's DesignerCanvas is not specified...");
            throw ("ModelEditorControl can not be created");
        }



        //in pointer edit mode DRAG & COPY is not enabled
        this.designerCanvas.enableDragCopy(false);

        this._selfPatterns = {};
        this.eventQueue = [];

        this._filteredOutConnTypes = [];
        this._filteredOutConnectionDescriptors = {};

        //local variable holding info about the currently opened node
        this.currentNodeInfo = {"id": null, "members" : [] };



        /****************** ADD BUTTONS AND THEIR EVENT HANDLERS TO DESIGNER CANVAS ******************/

        /************** CREATE POINTERS *****************/
        this._$btnGroupCreatePointers = this.designerCanvas.toolBar.addRadioButtonGroup(function (event, data) {
            self._setNewConnectionType(data.connType);
        });

        var btnCreatePointerSource = this.designerCanvas.toolBar.addButton({ "title": "SOURCE pointer",
            "selected": true,
            "data": { "connType": POINTER_PREFIX + CONSTANTS.POINTER_SOURCE },
            "icon": SetVisualHelper.createButtonIcon(16, this._getConnTypeVisualDescriptor(POINTER_PREFIX + CONSTANTS.POINTER_SOURCE))}, this._$btnGroupCreatePointers);

        var btnCreatePointerTarget = this.designerCanvas.toolBar.addButton({ "title": "TARGET pointer",
            "data": { "connType": POINTER_PREFIX + CONSTANTS.POINTER_TARGET },
            "icon": SetVisualHelper.createButtonIcon(16, this._getConnTypeVisualDescriptor(POINTER_PREFIX + CONSTANTS.POINTER_TARGET))}, this._$btnGroupCreatePointers);

        var btnCreatePointerRef = this.designerCanvas.toolBar.addButton({ "title": "REF pointer",
            "data": { "connType": POINTER_PREFIX + CONSTANTS.POINTER_REF },
            "icon": SetVisualHelper.createButtonIcon(16, this._getConnTypeVisualDescriptor(POINTER_PREFIX + CONSTANTS.POINTER_REF))}, this._$btnGroupCreatePointers);
        /************** END OF - CREATE POINTERS *****************/

        /************** CREATE SET RELATIONS *****************/
        this._$btnGroupCreateSetRelations = this.designerCanvas.toolBar.addRadioButtonGroup(function (event, data) {
            self._setNewConnectionType(data.connType);
        });

        var btnCreateSetValidChildren = this.designerCanvas.toolBar.addButton({ "title": "SET ValidChildren",
            "data": { "connType": SET_PREFIX + CONSTANTS.SET_VALIDCHILDREN },
            "icon": SetVisualHelper.createButtonIcon(16, this._getConnTypeVisualDescriptor(SET_PREFIX + CONSTANTS.SET_VALIDCHILDREN))}, this._$btnGroupCreateSetRelations);

        var btnCreateSetValidInheritor = this.designerCanvas.toolBar.addButton({ "title": "SET ValidInheritor",
            "data": { "connType": SET_PREFIX + CONSTANTS.SET_VALIDINHERITOR},
            "icon": SetVisualHelper.createButtonIcon(16, this._getConnTypeVisualDescriptor(SET_PREFIX + CONSTANTS.SET_VALIDINHERITOR))}, this._$btnGroupCreateSetRelations);

        var btnCreateSetValidSource = this.designerCanvas.toolBar.addButton({ "title": "SET ValidSource",
            "data": { "connType": SET_PREFIX + CONSTANTS.SET_VALIDSOURCE},
            "icon": SetVisualHelper.createButtonIcon(16, this._getConnTypeVisualDescriptor(SET_PREFIX + CONSTANTS.SET_VALIDSOURCE))}, this._$btnGroupCreateSetRelations);

        var btnCreateSetValidDestination = this.designerCanvas.toolBar.addButton({ "title": "SET ValidDestination",
            "data": { "connType": SET_PREFIX + CONSTANTS.SET_VALIDDESTINATION},
            "icon": SetVisualHelper.createButtonIcon(16, this._getConnTypeVisualDescriptor(SET_PREFIX + CONSTANTS.SET_VALIDDESTINATION))}, this._$btnGroupCreateSetRelations);

        var btnCreateSetGeneral = this.designerCanvas.toolBar.addButton({ "title": "SET General",
            "data": { "connType": SET_PREFIX + CONSTANTS.SET_GENERAL},
            "icon": SetVisualHelper.createButtonIcon(16, this._getConnTypeVisualDescriptor(SET_PREFIX + CONSTANTS.SET_GENERAL))}, this._$btnGroupCreateSetRelations);

        this._setNewConnectionType(POINTER_PREFIX + CONSTANTS.POINTER_SOURCE);
        /************** END OF - CREATE POINTERS *****************/


        /************** PRINT NODE DATA *****************/
        $btnGroupPrintNodeData = this.designerCanvas.toolBar.addButtonGroup(function (/*event, data*/) {
            self._printNodeData();
        });

        this.designerCanvas.toolBar.addButton({ "title": "Print node data",
            "icon": "icon-share"}, $btnGroupPrintNodeData);
        /************** END OF - PRINT NODE DATA *****************/


        /****************** END OF - ADD BUTTONS AND THEIR EVENT HANDLERS TO DESIGNER CANVAS ******************/

        this._initFilterPanel();

        //attach all the event handlers for event's coming from DesignerCanvas
        this.attachDiagramDesignerWidgetEventHandlers();

        this.logger.debug("AspectDesignerControl ctor finished");
    };

    AspectDesignerControl.prototype.selectedObjectChanged = function (nodeId) {
        var desc = this._getObjectDescriptor(nodeId),
            len;

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

        this._filteredOutConnectionDescriptors = {};
        len = this._filteredOutConnTypes.length;
        while (len--) {
            this._filteredOutConnectionDescriptors[this._filteredOutConnTypes[len]] = [];
        }

        //remove current territory patterns
        if (this.currentNodeInfo.id) {
            this._client.removeUI(this._territoryId);
        }

        this.currentNodeInfo.id = nodeId;
        this.currentNodeInfo.members = [];

        if (nodeId) {
            //put new node's info into territory rules
            this._selfPatterns = {};
            this._selfPatterns[nodeId] = { "children": 0 };


            this.designerCanvas.setTitle(desc.name);

            this.designerCanvas.showProgressbar();

            this._territoryId = this._client.addUI(this, true);
            //update the territory
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        }
    };

    /**********************************************************/
    /*                    PUBLIC METHODS                      */
    /**********************************************************/
    AspectDesignerControl.prototype.onOneEvent = function (events) {
        var i = events ? events.length : 0;

        this.logger.debug("onOneEvent '" + i + "' items");

        if (i > 0) {
            this.eventQueue.push(events);
            this._processNextInQueue();
        }

        this.logger.debug("onOneEvent '" + events.length + "' items - DONE");
    };

    //TODO: check this here...
    //NOTE: all the UI cleanup will happen from VisualizerPanel
    //might not be the best approach
    AspectDesignerControl.prototype.destroy = function () {
        this._client.removeUI(this._territoryId);
        this.designerCanvas.clear();
    };

    /**********************************************************/
    /*                   PRIVATE METHODS                      */
    /**********************************************************/

    AspectDesignerControl.prototype._emptyAspectRegistry = function () {
        return { "Members": [],
            "MemberCoord": {}};
    };

    /**********************************************************/
    /*       EVENT AND DECORATOR DOWNLOAD HANDLING            */
    /**********************************************************/
    AspectDesignerControl.prototype._processNextInQueue = function () {
        var nextBatchInQueue,
            len = this.eventQueue.length,
            decoratorsToDownload = [],
            itemDecorator,
            self = this;

        if (len > 0) {
            nextBatchInQueue = this.eventQueue.pop();

            len = nextBatchInQueue.length;

            while (len--) {
                if ( (nextBatchInQueue[len].etype === CONSTANTS.TERRITORY_EVENT_LOAD) || (nextBatchInQueue[len].etype === CONSTANTS.TERRITORY_EVENT_UPDATE)) {
                    nextBatchInQueue[len].desc = nextBatchInQueue[len].debugEvent ? _.extend({}, this._getObjectDescriptorDEBUG(nextBatchInQueue[len].eid) ) : this._getObjectDescriptor(nextBatchInQueue[len].eid);

                    if (nextBatchInQueue[len].desc) {
                        itemDecorator = nextBatchInQueue[len].desc.decorator;

                        if (itemDecorator && itemDecorator !== "") {
                            decoratorsToDownload.pushUnique(this._getFullDecoratorName("DefaultDecorator"));
                        }
                    }
                }
            }

            if (decoratorsToDownload.length === 0) {
                //all the required decorators are already available
                this._dispatchEvents(nextBatchInQueue);
            } else {
                //few decorators need to be downloaded
                this._client.decoratorManager.download(decoratorsToDownload, function () {
                    self._dispatchEvents(nextBatchInQueue);
                });
            }
        }
    };

    AspectDesignerControl.prototype._getFullDecoratorName = function (decorator) {
        return DECORATOR_PATH + decorator + "/" + decorator;
    };

    AspectDesignerControl.prototype._dispatchEvents = function (events) {
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

        if (this.currentNodeInfo.id) {
            this.designerCanvas.setAspectMemberNum(this._GMEModels.length);
        }

        this.designerCanvas.hideProgressbar();

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
    AspectDesignerControl.prototype._getObjectDescriptor = function (gmeID) {
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
    AspectDesignerControl.prototype._onLoad = function (gmeID, objD) {
        if (gmeID === this.currentNodeInfo.id) {
            this._processAspectNode();
        } else {
            this._processNodeLoad(gmeID, objD);
        }
    };

    AspectDesignerControl.prototype._onUpdate = function (gmeID, objD) {
        if (gmeID === this.currentNodeInfo.id) {
            this._processAspectNode();
        } else {
            this._processNodeUpdate(gmeID, objD);
        }
    };

    AspectDesignerControl.prototype._onUnload = function (gmeID) {
        var componentID,
            len,
            idx;

        if (gmeID === this.currentNodeInfo.id) {
            //the opened model has been deleted....
            this.logger.debug('The currently opened aspect has been deleted --- GMEID: "' + this.currentNodeInfo.id + '"');
            this.designerCanvas.setBackgroundText('The currently opened aspect has been deleted...', {'font-size': 30,
                                                                                                     'color': '#000000'});
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
    AspectDesignerControl.prototype._printNodeData = function () {
        var idList = this.designerCanvas.selectionManager.getSelectedElements(),
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
    AspectDesignerControl.prototype._processAspectNode = function () {
        var aspectNode = this._client.getNode(this.currentNodeInfo.id),
            len,
            diff,
            objDesc,
            componentID,
            i,
            gmeID,
            aspectRegistry = aspectNode.getRegistry(ASPECT_BUILDER_REGISTRY_KEY) || this._emptyAspectRegistry(),
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
    AspectDesignerControl.prototype._addItemsToAspect = function (gmeIDList, position) {
        var cNode = this._client.getNode(this.currentNodeInfo.id),
            registry = cNode.getRegistry(ASPECT_BUILDER_REGISTRY_KEY) || this._emptyAspectRegistry(),
            gmeID,
            i;

        if (_.isArray(gmeIDList)) {
            for (i = 0; i < gmeIDList.length; i+= 1) {
                gmeID = gmeIDList[i];
                if (registry.Members.indexOf(gmeID) === -1) {
                    registry.Members.push(gmeID);
                    registry.MemberCoord[gmeID] = { "x": position.x,
                        "y": position.y};

                    position.x += 20;
                    position.y += 20;
                }
            }
        } else {
            gmeID = gmeIDList;
            if (registry.Members.indexOf(gmeID) === -1) {
                registry.Members.push(gmeID);
                registry.MemberCoord[gmeID] = { "x": position.x,
                    "y": position.y};
            }
        }

        this._client.setRegistry(this.currentNodeInfo.id, ASPECT_BUILDER_REGISTRY_KEY, registry);
    };
    /**********************************************************/
    /*  END OF --- HANDLE OBJECT ADDITION TO ASPECT           */
    /**********************************************************/


    /**********************************************************/
    /*  HANDLE OBJECT REPOSITION IN THE ASPECT ASPECT         */
    /**********************************************************/
    AspectDesignerControl.prototype._onDesignerItemsMove = function (repositionDesc) {
        var cNode = this._client.getNode(this.currentNodeInfo.id),
            registry = cNode.getRegistry(ASPECT_BUILDER_REGISTRY_KEY) || this._emptyAspectRegistry(),
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
    AspectDesignerControl.prototype._onSelectionDelete = function (idList) {
        var cNode = this._client.getNode(this.currentNodeInfo.id),
            registry = cNode.getRegistry(ASPECT_BUILDER_REGISTRY_KEY) || { "Members": [],
                "MemberCoord": {}},
            len = idList.length,
            gmeID,
            idx,
            connDesc;

        this._client.startTransaction();

        while (len--) {
            gmeID = this._ComponentID2GmeID[idList[len]];
            idx = registry.Members.indexOf(gmeID);
            if ( idx !== -1) {
                //connected entity is a box --> GME object
                registry.Members.splice(idx, 1);
                delete registry.MemberCoord[gmeID];
            } else if (this._connectionListByID.hasOwnProperty(idList[len])) {
                connDesc = this._connectionListByID[idList[len]];

                if (connDesc.type === CONN_TYPE_HIERARCHY_PARENT) {
                    this.logger.debug('Hierarchycal Parent-Child relationship can not be deleted here...');
                } else {
                    if (connDesc.type.indexOf(POINTER_PREFIX) === 0) {
                        //deleted connection is a POINTER
                        this.logger.debug("Deleting Pointer '" + connDesc.type + "' from GMEObject :'" + connDesc.GMESrcId + "'");
                        this._client.delPointer(connDesc.GMESrcId, connDesc.type.replace(POINTER_PREFIX, ''));
                    } else if (connDesc.type.indexOf(SET_PREFIX) === 0) {
                        //deleted connection is a SET member relationship
                        this.logger.debug("Deleting SET membership owner:'" + connDesc.GMESrcId + "' member: '" + connDesc.GMEDstID + "', set:'" + connDesc.type + "'");
                        this._client.removeMember(connDesc.GMESrcId, connDesc.GMEDstID, connDesc.type.replace(SET_PREFIX, ''));
                    }
                }
            }
        }

        this._client.setRegistry(this.currentNodeInfo.id, ASPECT_BUILDER_REGISTRY_KEY, registry);

        this._client.completeTransaction();
    };
    /************************************************************************/
    /*  END OF --- HANDLE OBJECT / CONNECTION DELETION IN THE ASPECT ASPECT */
    /************************************************************************/


    /**************************************************************************/
    /*  HANDLE OBJECT LOAD  --- DISPLAY IT WITH ALL THE POINTERS / SETS / ETC */
    /**************************************************************************/
    AspectDesignerControl.prototype._processNodeLoad = function (gmeID, objD) {
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

                decClass = this._client.decoratorManager.get(this._getFullDecoratorName(objDesc.decorator));

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

    AspectDesignerControl.prototype._processConnectionWaitingList = function (gmeDstID) {
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
    AspectDesignerControl.prototype._processNodeUnload = function (gmeID) {
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

    AspectDesignerControl.prototype._removeAssociatedConnections = function (gmeID) {
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

        //checked filtered out connections
        //#5 - gmeID is the source of the filtered out connection --- remove info as it is, no need for it
        //#6 - gmeID is the destination of the connection --- save info to the waiting list
        for (connType in this._filteredOutConnectionDescriptors) {
            if (this._filteredOutConnectionDescriptors.hasOwnProperty(connType)) {
                it = this._filteredOutConnectionDescriptors[connType].length;
                while (it--) {
                    gmeSrcId = this._filteredOutConnectionDescriptors[connType][it][0];
                    gmeDstId = this._filteredOutConnectionDescriptors[connType][it][1];

                    if (gmeID === gmeDstId) {
                        //save to waiting list
                        this._saveConnectionToWaitingList(gmeSrcId, gmeID, connType);
                    }

                    this._filteredOutConnectionDescriptors[connType].splice(it, 1);
                }
            }
        }
    };
    /****************************************************************************/
    /*                      END OF --- HANDLE OBJECT UNLOAD                     */
    /****************************************************************************/


    /****************************************************************************/
    /*  CREATE A SPECIFIC TYPE OF CONNECTION BETWEEN 2 GME OBJECTS              */
    /****************************************************************************/
    AspectDesignerControl.prototype._createConnection = function (gmeSrcId, gmeDstId, connType) {
        var connDesc,
            connComponent;
        //need to check if the src and dst objects are displayed or not
        //if YES, create connection
        //if NO, store information in a waiting queue
        //fact: gmeSrcId is available, the call is coming from there
        if (this._GMEModels.indexOf(gmeDstId) !== -1) {
            //destination is displayed

            if (this._filteredOutConnTypes.indexOf(connType) === -1) {
                //connection type is not filtered out    
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
                //connection type is filtered out
                this._filteredOutConnectionDescriptors[connType].push([gmeSrcId,gmeDstId]);
            }

            
        } else {
            //destination is not displayed, store it in a queue
            this._saveConnectionToWaitingList(gmeSrcId, gmeDstId, connType);
        }
    };

    AspectDesignerControl.prototype._saveConnectionToWaitingList =  function (gmeSrcId, gmeDstId, connType) {
        this._connectionWaitingListByDstGMEID[gmeDstId] = this._connectionWaitingListByDstGMEID[gmeDstId] || {};

        this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId] = this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId] || [];

        this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId].push(connType);
    };

    AspectDesignerControl.prototype._saveConnection = function (gmeSrcId, gmeDstId, connType, connComponentId) {
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
    AspectDesignerControl.prototype._removeConnection = function (gmeSrcId, gmeDstId, connType) {
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
    AspectDesignerControl.prototype._processNodeUpdate = function(gmeID, objDesc) {
        var len = this._GmeID2ComponentID[gmeID].length,
            componentID,
            decClass;

        while (len--) {
            componentID = this._GmeID2ComponentID[gmeID][len];

            decClass = this._client.decoratorManager.get(this._getFullDecoratorName(objDesc.decorator));

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
    AspectDesignerControl.prototype._processNodePointers = function (gmeID, objD) {
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
    AspectDesignerControl.prototype._processNodeSets = function (gmeID, objD) {
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
    AspectDesignerControl.prototype._processNodeParent = function (gmeID, objD) {
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
    AspectDesignerControl.prototype._getConnTypeVisualDescriptor = function (connType) {
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

    AspectDesignerControl.prototype._setNewConnectionType = function (connType) {
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

    AspectDesignerControl.prototype._onCreateNewConnection = function (params) {
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


    /****************************************************************************/
    /*                  POINTER FILTER PANEL AND EVENT HANDLERS                 */
    /****************************************************************************/
    AspectDesignerControl.prototype._initFilterPanel = function () {
        var filterIcon;

        filterIcon = SetVisualHelper.createButtonIcon(16, this._getConnTypeVisualDescriptor(CONN_TYPE_HIERARCHY_PARENT));
        this.designerCanvas.addFilterItem('Hierarchy containment', CONN_TYPE_HIERARCHY_PARENT, filterIcon);

        filterIcon = SetVisualHelper.createButtonIcon(16, this._getConnTypeVisualDescriptor(POINTER_PREFIX + CONSTANTS.POINTER_SOURCE));
        this.designerCanvas.addFilterItem('Pointer Source', POINTER_PREFIX + CONSTANTS.POINTER_SOURCE, filterIcon);

        filterIcon = SetVisualHelper.createButtonIcon(16, this._getConnTypeVisualDescriptor(POINTER_PREFIX + CONSTANTS.POINTER_TARGET));
        this.designerCanvas.addFilterItem('Pointer Target', POINTER_PREFIX + CONSTANTS.POINTER_TARGET, filterIcon);

        filterIcon = SetVisualHelper.createButtonIcon(16, this._getConnTypeVisualDescriptor(POINTER_PREFIX + CONSTANTS.POINTER_REF));
        this.designerCanvas.addFilterItem('Pointer Ref', POINTER_PREFIX + CONSTANTS.POINTER_REF, filterIcon);

        filterIcon = SetVisualHelper.createButtonIcon(16, this._getConnTypeVisualDescriptor(SET_PREFIX + CONSTANTS.SET_VALIDCHILDREN));
        this.designerCanvas.addFilterItem('Set ValidChildren', SET_PREFIX + CONSTANTS.SET_VALIDCHILDREN, filterIcon);

        filterIcon = SetVisualHelper.createButtonIcon(16, this._getConnTypeVisualDescriptor(SET_PREFIX + CONSTANTS.SET_VALIDSOURCE));
        this.designerCanvas.addFilterItem('Set ValidSource', SET_PREFIX + CONSTANTS.SET_VALIDSOURCE, filterIcon);

        filterIcon = SetVisualHelper.createButtonIcon(16, this._getConnTypeVisualDescriptor(SET_PREFIX + CONSTANTS.SET_VALIDDESTINATION));
        this.designerCanvas.addFilterItem('Set ValidDestination', SET_PREFIX + CONSTANTS.SET_VALIDDESTINATION, filterIcon);

        filterIcon = SetVisualHelper.createButtonIcon(16, this._getConnTypeVisualDescriptor(SET_PREFIX + CONSTANTS.SET_VALIDINHERITOR));
        this.designerCanvas.addFilterItem('Set ValidInheritor', SET_PREFIX + CONSTANTS.SET_VALIDINHERITOR, filterIcon);

        filterIcon = SetVisualHelper.createButtonIcon(16, this._getConnTypeVisualDescriptor(SET_PREFIX + CONSTANTS.SET_GENERAL));
        this.designerCanvas.addFilterItem('Set General', SET_PREFIX + CONSTANTS.SET_GENERAL, filterIcon);

        
    };

    AspectDesignerControl.prototype._onConnectionTypeFilterCheckChanged = function (value, isChecked) {
        var idx;

        if (isChecked === true) {
            //type should be enabled
            idx = this._filteredOutConnTypes.indexOf(value);
            this._filteredOutConnTypes.splice(idx, 1);
            this._unfilterConnType(value);
        } else {
            this._filteredOutConnTypes.push(value);
            this._filterConnType(value);
        }
    };

    AspectDesignerControl.prototype._filterConnType = function (connType) {
        var len = this._connectionListByType && this._connectionListByType.hasOwnProperty(connType) ? this._connectionListByType[connType].length : 0,
            connComponentId,
            gmeSrcId,
            gmeDstId;

        this._filteredOutConnectionDescriptors[connType] = [];

        this.designerCanvas.beginUpdate();

        while (len--) {
            connComponentId = this._connectionListByType[connType][len];

            gmeSrcId = this._connectionListByID[connComponentId].GMESrcId;
            gmeDstId = this._connectionListByID[connComponentId].GMEDstID;

            this._filteredOutConnectionDescriptors[connType].push([gmeSrcId,gmeDstId]);

            this._removeConnection(gmeSrcId, gmeDstId, connType);
        }

        this.designerCanvas.endUpdate();
    };

    AspectDesignerControl.prototype._unfilterConnType = function (connType) {
        var len = this._filteredOutConnectionDescriptors && this._filteredOutConnectionDescriptors.hasOwnProperty(connType) ? this._filteredOutConnectionDescriptors[connType].length : 0,
            gmeSrcId,
            gmeDstId;

        this.designerCanvas.beginUpdate();

        while (len--) {
            gmeSrcId = this._filteredOutConnectionDescriptors[connType][len][0];
            gmeDstId = this._filteredOutConnectionDescriptors[connType][len][1];

            this._createConnection(gmeSrcId, gmeDstId, connType);
        }

        delete this._filteredOutConnectionDescriptors[connType];

        this.designerCanvas.endUpdate();
    };

    /****************************************************************************/
    /*          END OF --- POINTER FILTER PANEL AND EVENT HANDLERS              */
    /****************************************************************************/

    //attach AspectDesignerControl - DesignerCanvas event handler functions
    _.extend(AspectDesignerControl.prototype, AspectDesignerControlDiagramDesignerWidgetEventHandlers.prototype);


    return AspectDesignerControl;
});
