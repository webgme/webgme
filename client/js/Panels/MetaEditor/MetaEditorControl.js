define(['logManager',
    'clientUtil',
    'js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    './MetaEditorControl.DiagramDesignerWidgetEventHandlers',
    './MetaRelations'], function (logManager,
                                                        util,
                                                        CONSTANTS,
                                                        nodePropertyNames,
                                                        DiagramDesignerWidgetConstants,
                                                        MetaEditorControlDiagramDesignerWidgetEventHandlers,
                                                        MetaRelations) {

    "use strict";

    var MetaEditorControl,
        GME_ID = "GME_ID",
        META_EDITOR_REGISTRY_KEY = "MetaEditor",
        META_DECORATOR = "MetaDecorator",
        WIDGET_NAME = 'DiagramDesigner';

    MetaEditorControl = function (options) {
        var self = this;

        this.logger = options.logger || logManager.create(options.loggerName || "MetaEditorControl");

        this._client = options.client;
        this._panel = options.panel;

        //initialize core collections and variables
        this.diagramDesigner = this._panel.widget;

        this._META_EDITOR_REGISTRY_KEY = META_EDITOR_REGISTRY_KEY;

        if (this._client === undefined) {
            this.logger.error("ModelEditorControl's client is not specified...");
            throw ("ModelEditorControl can not be created");
        }

        this._selectedObjectChanged = function (__project, nodeId) {
            self.selectedObjectChanged(nodeId);
        };
        this._client.addEventListener(this._client.events.SELECTEDOBJECT_CHANGED, this._selectedObjectChanged);

        if (this.diagramDesigner === undefined) {
            this.logger.error("ModelEditorControl's DiagramDesigner is not specified...");
            throw ("ModelEditorControl can not be created");
        }

        //in METAEDITOR mode DRAG & COPY is not enabled
        this.diagramDesigner.enableDragCopy(false);

        this._selfPatterns = {};
        this.eventQueue = [];

        this._filteredOutConnTypes = [];
        this._filteredOutConnectionDescriptors = {};

        //local variable holding info about the currently opened node
        this.currentNodeInfo = {"id": null, "members" : [] };

        //set default connection type to containment
        this._setNewConnectionType(MetaRelations.META_RELATIONS.CONTAINMENT);

        /****************** ADD BUTTONS AND THEIR EVENT HANDLERS TO DIAGRAM DESIGNER ******************/

        /************** CREATE META RELATION CONNECTION TYPES *****************/
        this._$btnGroupObjectRelations = this.diagramDesigner.toolBar.addRadioButtonGroup(function (event, data) {
            self._setNewConnectionType(data.connType);
        });

        this.diagramDesigner.toolBar.addButton({ "title": "Containment",
            "selected": true,
            "data": { "connType": MetaRelations.META_RELATIONS.CONTAINMENT },
            "icon": MetaRelations.createButtonIcon(16, MetaRelations.META_RELATIONS.CONTAINMENT)}, this._$btnGroupObjectRelations);

        this.diagramDesigner.toolBar.addButton({ "title": "Inheritance",
            "selected": false,
            "data": { "connType": MetaRelations.META_RELATIONS.INHERITANCE },
            "icon": MetaRelations.createButtonIcon(16, MetaRelations.META_RELATIONS.INHERITANCE)}, this._$btnGroupObjectRelations);

        this.diagramDesigner.toolBar.addButton({ "title": "Pointer",
            "selected": false,
            "data": { "connType": MetaRelations.META_RELATIONS.POINTER },
            "icon": MetaRelations.createButtonIcon(16, MetaRelations.META_RELATIONS.POINTER)}, this._$btnGroupObjectRelations);

        this.diagramDesigner.toolBar.addButton({ "title": "PointerList",
            "selected": false,
            "data": { "connType": MetaRelations.META_RELATIONS.POINTERLIST },
            "icon": MetaRelations.createButtonIcon(16, MetaRelations.META_RELATIONS.POINTERLIST)}, this._$btnGroupObjectRelations);

        /************** END OF - CREATE META RELATION CONNECTION TYPES *****************/


        /************** PRINT NODE DATA *****************/
        var $btnGroupPrintNodeData = this.diagramDesigner.toolBar.addButtonGroup(function (/*event, data*/) {
            self._printNodeData();
        });

        this.diagramDesigner.toolBar.addButton({ "title": "Print node data",
            "icon": "icon-share"}, $btnGroupPrintNodeData);
        /************** END OF - PRINT NODE DATA *****************/


        /****************** END OF - ADD BUTTONS AND THEIR EVENT HANDLERS TO DESIGNER CANVAS ******************/

        this._initFilterPanel();

        //attach all the event handlers for event's coming from DiagramDesigner
        this.attachDiagramDesignerWidgetEventHandlers();

        this.logger.debug("MetaEditorControl ctor finished");
    };

    MetaEditorControl.prototype.selectedObjectChanged = function (nodeId) {
        var desc = this._getObjectDescriptor(nodeId),
            len;

        this.logger.debug("SELECTEDOBJECT_CHANGED nodeId '" + nodeId + "'");

        //delete everything from model editor
        this.diagramDesigner.clear();

        //clean up local hash map
        this._GMENodes = [];

        this._GMEID2ComponentID = {};
        this._ComponentID2GMEID = {};

        this._connectionWaitingListByDstGMEID = {};
        this._connectionWaitingListBySrcGMEID = {};

        this._connectionListBySrcGMEID = {};
        this._connectionListByDstGMEID = {};
        this._connectionListByType = {};
        this._connectionListByID = {};

        this._nodeMetaContainment = {};
        this._nodeMetaPointers = {};
        this._nodeMetaInheritance = {};

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


            this.diagramDesigner.setTitle(desc.name);

            this.diagramDesigner.showProgressbar();

            this._territoryId = this._client.addUI(this, true);
            //update the territory
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        }
    };

    /**********************************************************/
    /*                    PUBLIC METHODS                      */
    /**********************************************************/
    MetaEditorControl.prototype.onOneEvent = function (events) {
        var i = events ? events.length : 0;

        this.logger.debug("onOneEvent '" + i + "' items");

        if (i > 0) {
            this.eventQueue.push(events);
            this._processNextInQueue();
        }

        this.logger.debug("onOneEvent '" + events.length + "' items - DONE");
    };

    //TODO: check this here...
    //might not be the best approach
    MetaEditorControl.prototype.destroy = function () {
        this._client.removeEventListener(this._client.events.SELECTEDOBJECT_CHANGED, this._selectedObjectChanged);
        this._client.removeUI(this._territoryId);
        this.diagramDesigner.clear();
    };

    /**********************************************************/
    /*                   PRIVATE METHODS                      */
    /**********************************************************/

    MetaEditorControl.prototype._emptyMetaEditorRegistry = function () {
        return { "Members": [],
            "MemberCoord": {}};
    };

    /**********************************************************/
    /*       EVENT AND DECORATOR DOWNLOAD HANDLING            */
    /**********************************************************/
    MetaEditorControl.prototype._processNextInQueue = function () {
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
                    nextBatchInQueue[len].desc = this._getObjectDescriptor(nextBatchInQueue[len].eid);

                    if (nextBatchInQueue[len].desc) {
                        itemDecorator = nextBatchInQueue[len].desc.decorator;

                        if (itemDecorator && itemDecorator !== "") {
                            decoratorsToDownload.pushUnique(itemDecorator);
                        }
                    }
                }
            }

            //few decorators need to be downloaded
            this._client.decoratorManager.download(decoratorsToDownload, WIDGET_NAME, function () {
                self._dispatchEvents(nextBatchInQueue);
            });
        }
    };

    MetaEditorControl.prototype._dispatchEvents = function (events) {
        var i = events.length,
            e;

        this.logger.debug("_dispatchEvents '" + i + "' items");

        this.diagramDesigner.beginUpdate();

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

        this.diagramDesigner.endUpdate();

        this.diagramDesigner.hideProgressbar();

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
    MetaEditorControl.prototype._getObjectDescriptor = function (gmeID) {
        var cNode = this._client.getNode(gmeID),
            nodeDescriptor;

        if (cNode) {
            nodeDescriptor = {"ID": gmeID,
                "ParentID": cNode.getParentId(),
                "decorator": META_DECORATOR,
                "name": cNode.getAttribute(nodePropertyNames.Attributes.name) || "",
                "position": { "x": -1, "y": -1 }};

            //nodeDescriptor.decorator = cNode.getRegistry(nodePropertyNames.Registry.decorator) || META_DECORATOR;

            if (gmeID === this.currentNodeInfo.id) {

            } else {
                if (this._selfRegistry) {
                    nodeDescriptor.position = this._selfRegistry.MemberCoord[gmeID]; // || { "x": 100, "y": 100  };
                }
            }
        }

        return nodeDescriptor;
    };
    /**********************************************************/
    /*  END OF --- READ IMPORTANT INFORMATION FROM A NODE     */
    /**********************************************************/


    /**********************************************************/
    /*                LOAD / UPDATE / UNLOAD HANDLER          */
    /**********************************************************/
    MetaEditorControl.prototype._onLoad = function (gmeID, objD) {
        if (gmeID === this.currentNodeInfo.id) {
            this._processCurrentNode();
        } else {
            this._processNodeLoad(gmeID, objD);
        }
    };

    MetaEditorControl.prototype._onUpdate = function (gmeID, objD) {
        if (gmeID === this.currentNodeInfo.id) {
            this._processCurrentNode();
        } else {
            this._processNodeUpdate(gmeID, objD);
        }
    };

    MetaEditorControl.prototype._onUnload = function (gmeID) {
        if (gmeID === this.currentNodeInfo.id) {
            //the opened model has been deleted....
            this.logger.debug('The currently opened aspect has been deleted --- GMEID: "' + this.currentNodeInfo.id + '"');
            this.diagramDesigner.setBackgroundText('The currently opened aspect has been deleted...', {'font-size': 30,
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
    MetaEditorControl.prototype._printNodeData = function () {
        var idList = this.diagramDesigner.selectionManager.getSelectedElements(),
            len = idList.length,
            node,
            nodeID,
            gmeID,
            nodeName,
            i;

        while (len--) {
            nodeID = idList[len];
            gmeID = this._ComponentID2GMEID[nodeID];
            node = this._client.getNode(gmeID);

            if (node) {
                nodeName = node.getAttribute(nodePropertyNames.Attributes.name);

                var containmentMetaDescriptor = node.getChildrenMetaDescriptor() || [];
                this.logger.warning(nodeName + ' (' + gmeID + ')\'s containmentMetaDescriptor: ' + JSON.stringify(containmentMetaDescriptor));

                var pointerNames = node.getPointerNames();
                i = pointerNames.length;
                this.logger.warning(nodeName + ' (' + gmeID + ')\'s pointerMetaDescriptors num: ' + i);
                while (i--) {
                    var pointerMetaDescriptor = node.getPointerDescriptor(pointerNames[i]);
                    this.logger.warning(nodeName + ' (' + gmeID + ')\'s pointerMetaDescriptor "' + pointerNames[i] + '": ' + JSON.stringify(pointerMetaDescriptor));
                }

                this.logger.warning(nodeName + ' (' + gmeID + ')\'s metaInheritance: ' + node.getBase());

                var attributeNames = node.getAttributeNames();
                i = attributeNames.length;
                this.logger.warning(nodeName + ' (' + gmeID + ')\'s attributeMetaDescriptors num: ' + i);

                while (i--) {
                    var attrMetaDescriptor = node.getAttributeDescriptor(attributeNames[i]);
                    this.logger.warning(nodeName + ' (' + gmeID + ')\'s attributeMetaDescriptor "' + attributeNames[i] + '": ' + JSON.stringify(attrMetaDescriptor));
                }
            }
        }
    };
    /**********************************************************/
    /*       END OF --- CUSTOM BUTTON EVENT HANDLERS          */
    /**********************************************************/


    /***********************************************************/
    /*  PROCESS CURRENT NODE TO HANDLE ADDED / REMOVED ELEMENT */
    /***********************************************************/
    MetaEditorControl.prototype._processCurrentNode = function () {
        var aspectNode = this._client.getNode(this.currentNodeInfo.id),
            len,
            diff,
            objDesc,
            componentID,
            gmeID,
            metaEditorRegistry = aspectNode.getEditableRegistry(META_EDITOR_REGISTRY_KEY) || this._emptyMetaEditorRegistry(),
            territoryChanged = false;

        //update selfRegistry (for node positions)
        this._selfRegistry = metaEditorRegistry;

        //check deleted nodes
        diff = _.difference(this.currentNodeInfo.members, metaEditorRegistry.Members);
        len = diff.length;
        while (len--) {
            delete this._selfPatterns[diff[len]];
            territoryChanged = true;
        }

        //check added nodes
        diff = _.difference(metaEditorRegistry.Members, this.currentNodeInfo.members);
        len = diff.length;
        while (len--) {
            this._selfPatterns[diff[len]] = { "children": 0 };
            territoryChanged = true;
        }

        //check all other nodes for position change
        diff = _.intersection(this.currentNodeInfo.members, metaEditorRegistry.Members);
        len = diff.length;
        while (len--) {
            gmeID = diff[len];
            objDesc = this._getObjectDescriptor(gmeID);

            if (this._GMEID2ComponentID.hasOwnProperty(gmeID)) {
                componentID = this._GMEID2ComponentID[gmeID];
                this.diagramDesigner.updateDesignerItem(componentID, objDesc);
            }
        }

        //update current member list
        this.currentNodeInfo.members = metaEditorRegistry.Members.slice(0);

        //there was change in the territory
        if (territoryChanged === true) {
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        }
    };
    /**********************************************************************/
    /*  END OF --- PROCESS CURRENT NODE TO HANDLE ADDED / REMOVED ELEMENT */
    /**********************************************************************/


    /**************************************************************************/
    /*  HANDLE OBJECT LOAD  --- DISPLAY IT WITH ALL THE POINTERS / SETS / ETC */
    /**************************************************************************/
    MetaEditorControl.prototype._processNodeLoad = function (gmeID, objD) {
        var uiComponent,
            decClass,
            objDesc;

        //component loaded
        if (this._GMENodes.indexOf(gmeID) === -1) {
            //aspect's member has been loaded
            if (objD && objD.position.x > -1 && objD.position.y > -1) {
                objDesc = _.extend({}, objD);

                decClass = this._client.decoratorManager.getDecoratorForWidget(objDesc.decorator, WIDGET_NAME);

                objDesc.decoratorClass = decClass;
                objDesc.control = this;
                objDesc.metaInfo = {};
                objDesc.metaInfo[CONSTANTS.GME_ID] = gmeID;

                uiComponent = this.diagramDesigner.createDesignerItem(objDesc);

                this._GMENodes.push(gmeID);
                this._GMEID2ComponentID[gmeID] = uiComponent.id;
                this._ComponentID2GMEID[uiComponent.id] = gmeID;

                //process new node to display containment / pointers / inheritance / pointerlists as connections
                this._processNodeMetaContainment(gmeID);
                this._processNodeMetaPointers(gmeID);
                this._processNodeMetaInheritance(gmeID);

                //check all the waiting pointers (whose SRC/DST is already displayed and waiting for the DST/SRC to show up)
                //it might be this new node
                this._processConnectionWaitingList(gmeID);
            }
        }
    };

    MetaEditorControl.prototype._processConnectionWaitingList = function (gmeID) {
        var len,
            gmeSrcID,
            gmeDstID,
            connType,
            connTexts;

        //check for possible endpoint as gmeID
        gmeDstID = gmeID;
        if (this._connectionWaitingListByDstGMEID && this._connectionWaitingListByDstGMEID.hasOwnProperty(gmeDstID)) {
            for (gmeSrcID in this._connectionWaitingListByDstGMEID[gmeDstID]) {
                if (this._connectionWaitingListByDstGMEID[gmeDstID].hasOwnProperty(gmeSrcID)){
                    len = this._connectionWaitingListByDstGMEID[gmeDstID][gmeSrcID].length;
                    while (len--) {
                        connType = this._connectionWaitingListByDstGMEID[gmeDstID][gmeSrcID][len][0];
                        connTexts = this._connectionWaitingListByDstGMEID[gmeDstID][gmeSrcID][len][1];
                        this._createConnection(gmeSrcID, gmeDstID, connType, connTexts);
                    }
                }
            }

            delete this._connectionWaitingListByDstGMEID[gmeDstID];
        }

        //check for possible source as gmeID
        gmeSrcID = gmeID;
        if (this._connectionWaitingListBySrcGMEID && this._connectionWaitingListBySrcGMEID.hasOwnProperty(gmeSrcID)) {
            for (gmeDstID in this._connectionWaitingListBySrcGMEID[gmeSrcID]) {
                if (this._connectionWaitingListBySrcGMEID[gmeSrcID].hasOwnProperty(gmeDstID)){
                    len = this._connectionWaitingListBySrcGMEID[gmeSrcID][gmeDstID].length;
                    while (len--) {
                        connType = this._connectionWaitingListBySrcGMEID[gmeSrcID][gmeDstID][len][0];
                        connTexts = this._connectionWaitingListBySrcGMEID[gmeSrcID][gmeDstID][len][1];
                        this._createConnection(gmeSrcID, gmeDstID, connType, connTexts);
                    }
                }
            }

            delete this._connectionWaitingListBySrcGMEID[gmeSrcID];
        }
    };
    /**************************************************************************/
    /*  END OF --- HANDLE OBJECT LOAD DISPLAY IT WITH ALL THE POINTERS / ...  */
    /**************************************************************************/


    /****************************************************************************/
    /*  HANDLE OBJECT UNLOAD  --- DISPLAY IT WITH ALL THE POINTERS / SETS / ETC */
    /****************************************************************************/
    MetaEditorControl.prototype._processNodeUnload = function (gmeID) {
        var componentID,
            idx;

        if (this._GMEID2ComponentID.hasOwnProperty(gmeID)) {
            componentID = this._GMEID2ComponentID[gmeID];

            this.diagramDesigner.deleteComponent(componentID);

            delete this._ComponentID2GMEID[componentID];

            delete this._GMEID2ComponentID[gmeID];

            idx = this._GMENodes.indexOf(gmeID);
            this._GMENodes.splice(idx,1);

            //keep up accounting
            delete this._nodeMetaContainment[gmeID];
            delete this._nodeMetaPointers[gmeID];
            delete this._nodeMetaInheritance[gmeID];
        }
    };
    /****************************************************************************/
    /*                      END OF --- HANDLE OBJECT UNLOAD                     */
    /****************************************************************************/


    /****************************************************************************/
    /*  CREATE A SPECIFIC TYPE OF CONNECTION BETWEEN 2 GME OBJECTS              */
    /****************************************************************************/
    MetaEditorControl.prototype._createConnection = function (gmeSrcId, gmeDstId, connType, connTexts) {
        var connDesc,
            connComponent;
        //need to check if the src and dst objects are displayed or not
        //if YES, create connection
        //if NO, store information in a waiting queue

        if (this._GMENodes.indexOf(gmeSrcId) !== -1 && this._GMENodes.indexOf(gmeDstId) !== -1) {
            //source and destination is displayed

            if (this._filteredOutConnTypes.indexOf(connType) === -1) {
                //connection type is not filtered out    
                connDesc = { "srcObjId": this._GMEID2ComponentID[gmeSrcId],
                             "srcSubCompId": undefined,
                             "dstObjId": this._GMEID2ComponentID[gmeDstId],
                             "dstSubCompId": undefined,
                             "reconnectable": false,
                             "name": "",
                             "nameEdit": false
                };

                //set visual properties
                _.extend(connDesc, MetaRelations.getLineVisualDescriptor(connType));

                //fill out texts
                if (connTexts) {
                    _.extend(connDesc, connTexts);
                }

                connComponent = this.diagramDesigner.createConnection(connDesc);

                this._saveConnection(gmeSrcId, gmeDstId, connType, connComponent.id, connTexts);
            } else {
                //connection type is filtered out
                this._filteredOutConnectionDescriptors[connType].push([gmeSrcId, gmeDstId, connTexts]);
            }
        } else {
            //source or destination is not displayed, store it in a queue
            this._saveConnectionToWaitingList(gmeSrcId, gmeDstId, connType, connTexts);
        }
    };


    MetaEditorControl.prototype._saveConnectionToWaitingList =  function (gmeSrcId, gmeDstId, connType, connTexts) {
        if (this._GMENodes.indexOf(gmeSrcId) !== -1 && this._GMENodes.indexOf(gmeDstId) === -1) {
            //#1 - the destination object is missing from the screen
            this._connectionWaitingListByDstGMEID[gmeDstId] = this._connectionWaitingListByDstGMEID[gmeDstId] || {};
            this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId] = this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId] || [];
            this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId].push([connType, connTexts]);
        } else if (this._GMENodes.indexOf(gmeSrcId) === -1 && this._GMENodes.indexOf(gmeDstId) !== -1) {
            //#2 -  the source object is missing from the screen
            this._connectionWaitingListBySrcGMEID[gmeSrcId] = this._connectionWaitingListBySrcGMEID[gmeSrcId] || {};
            this._connectionWaitingListBySrcGMEID[gmeSrcId][gmeDstId] = this._connectionWaitingListBySrcGMEID[gmeSrcId][gmeDstId] || [];
            this._connectionWaitingListBySrcGMEID[gmeSrcId][gmeDstId].push([connType, connTexts]);
        } else {
            //#3 - both gmeSrcId and gmeDstId is missing from the screen
            //NOTE: this should never happen!!!
            this.logger.error('_saveConnectionToWaitingList both gmeSrcId and gmeDstId is undefined...');
        }
    };


    MetaEditorControl.prototype._saveConnection = function (gmeSrcId, gmeDstId, connType, connComponentId, connTexts) {
        //save by SRC
        this._connectionListBySrcGMEID[gmeSrcId] = this._connectionListBySrcGMEID[gmeSrcId] || {};
        this._connectionListBySrcGMEID[gmeSrcId][gmeDstId] = this._connectionListBySrcGMEID[gmeSrcId][gmeDstId] || {};
        this._connectionListBySrcGMEID[gmeSrcId][gmeDstId][connType] = this._connectionListBySrcGMEID[gmeSrcId][gmeDstId][connType] || [];
        this._connectionListBySrcGMEID[gmeSrcId][gmeDstId][connType].push(connComponentId);
        
        //save by DST
        this._connectionListByDstGMEID[gmeDstId] = this._connectionListByDstGMEID[gmeDstId] || {};
        this._connectionListByDstGMEID[gmeDstId][gmeSrcId] = this._connectionListByDstGMEID[gmeDstId][gmeSrcId] || {};
        this._connectionListByDstGMEID[gmeDstId][gmeSrcId][connType] = this._connectionListByDstGMEID[gmeDstId][gmeSrcId][connType] || [];
        this._connectionListByDstGMEID[gmeDstId][gmeSrcId][connType].push(connComponentId);

        //save by type
        this._connectionListByType[connType] = this._connectionListByType[connType] || [];
        this._connectionListByType[connType].push(connComponentId);

        //save by connectionID
        this._connectionListByID[connComponentId] = { "GMESrcId": gmeSrcId,
                                                      "GMEDstId": gmeDstId,
                                                      "type": connType,
                                                      "name": (connTexts && connTexts.name) ? connTexts.name : undefined,
                                                      "connTexts": connTexts};
    };
    /****************************************************************************/
    /*  END OF --- CREATE A SPECIFIC TYPE OF CONNECTION BETWEEN 2 GME OBJECTS   */
    /****************************************************************************/


    /****************************************************************************/
    /*  REMOVES A SPECIFIC TYPE OF CONNECTION FROM 2 GME OBJECTS                */
    /****************************************************************************/
    MetaEditorControl.prototype._removeConnection = function (gmeSrcId, gmeDstId, connType, pointerName) {
        var connectionID,
            idx,
            len = this._connectionListBySrcGMEID[gmeSrcId][gmeDstId][connType].length;

        while (len--) {
            connectionID = this._connectionListBySrcGMEID[gmeSrcId][gmeDstId][connType][len];

            //if a pointer with a specific name should be removed
            //clear out the connectionID if this connection is not the representation of that pointer
            if (connType === MetaRelations.META_RELATIONS.POINTER &&
                pointerName &&
                pointerName !== "" &&
                this._connectionListByID[connectionID].name !== pointerName) {
                connectionID = undefined;
            }

            //if the connectionID is still valid
            if (connectionID) {
                this.diagramDesigner.deleteComponent(connectionID);

                //clean up accounting
                delete this._connectionListByID[connectionID];

                idx = this._connectionListByType[connType].indexOf(connectionID);
                this._connectionListByType[connType].splice(idx, 1);

                idx = this._connectionListBySrcGMEID[gmeSrcId][gmeDstId][connType].indexOf(connectionID);
                this._connectionListBySrcGMEID[gmeSrcId][gmeDstId][connType].splice(idx, 1);

                idx = this._connectionListByDstGMEID[gmeDstId][gmeSrcId][connType].indexOf(connectionID);
                this._connectionListByDstGMEID[gmeDstId][gmeSrcId][connType].splice(idx, 1);
            }
        }
    };
    /****************************************************************************/
    /*  END OF --- REMOVES A SPECIFIC TYPE OF CONNECTION FROM 2 GME OBJECTS     */
    /****************************************************************************/


    /**************************************************************************/
    /*  HANDLE OBJECT UPDATE  --- DISPLAY IT WITH ALL THE POINTERS / SETS / ETC */
    /**************************************************************************/
    MetaEditorControl.prototype._processNodeUpdate = function(gmeID, objDesc) {
        var componentID,
            decClass;

        if (this._GMEID2ComponentID.hasOwnProperty(gmeID)) {
            componentID = this._GMEID2ComponentID[gmeID];

            decClass = this._client.decoratorManager.getDecoratorForWidget(objDesc.decorator, WIDGET_NAME);

            objDesc.decoratorClass = decClass;

            this.diagramDesigner.updateDesignerItem(componentID, objDesc);

            //update set relations
            this._processNodeMetaContainment(gmeID);
            this._processNodeMetaPointers(gmeID);
            this._processNodeMetaInheritance(gmeID);
        }
    };
    /**************************************************************************/
    /*                   END OF --- HANDLE OBJECT UPDATE                      */
    /**************************************************************************/


    /***********************************************************************************/
    /*  DISPLAY META CONTAINMENT RELATIONS AS A CONNECTION FROM CONTAINER TO CONTAINED */
    /***********************************************************************************/
    MetaEditorControl.prototype._processNodeMetaContainment = function (gmeID) {
        var node = this._client.getNode(gmeID),
            containmentMetaDescriptor = node.getChildrenMetaDescriptor() || [],
            len,
            oldMetaContainment,
            newMetaContainment = {'targets': []},
            diff,
            containmentTarget,
            idx;

        this._nodeMetaContainment[gmeID] = this._nodeMetaContainment[gmeID] || {'targets': []};
        oldMetaContainment = this._nodeMetaContainment[gmeID];

        len = containmentMetaDescriptor.length;
        while(len--) {
            newMetaContainment.targets.push(containmentMetaDescriptor[len].target);
            newMetaContainment[containmentMetaDescriptor[len].target] = {'multiplicity': containmentMetaDescriptor[len].multiplicity};
        }

        //compute updated connections
        diff = _.intersection(oldMetaContainment.targets, newMetaContainment.targets);
        len = diff.length;
        while (len--) {
            containmentTarget = diff[len];
            if (oldMetaContainment[containmentTarget].multiplicity !== newMetaContainment[containmentTarget].multiplicity) {
                //update connection text
                //TODO: update connection text

                //update accounting
                oldMetaContainment[containmentTarget].multiplicity = newMetaContainment[containmentTarget].multiplicity;
            }
        }

        //compute deleted pointers
        diff = _.difference(oldMetaContainment.targets, newMetaContainment.targets);
        len = diff.length;
        while (len--) {
            containmentTarget = diff[len];
            this._removeConnection(gmeID, containmentTarget, MetaRelations.META_RELATIONS.CONTAINMENT);

            idx = oldMetaContainment.targets.indexOf(containmentTarget);
            oldMetaContainment.targets.splice(idx,1);
            delete oldMetaContainment[containmentTarget];
        }

        //compute added pointers
        diff = _.difference(newMetaContainment.targets, oldMetaContainment.targets);
        len = diff.length;
        while (len--) {
            containmentTarget = diff[len];

            oldMetaContainment.targets.push(containmentTarget);
            oldMetaContainment[containmentTarget] = {'multiplicity': newMetaContainment[containmentTarget].multiplicity};

            this._createConnection(gmeID, containmentTarget, MetaRelations.META_RELATIONS.CONTAINMENT, {'dstText': newMetaContainment[containmentTarget].multiplicity,
                                                                                                        'dstTextEdit': true});
        }
    };
    /**********************************************************************************************/
    /*  END OF --- DISPLAY META CONTAINMENT RELATIONS AS A CONNECTION FROM CONTAINER TO CONTAINED */
    /**********************************************************************************************/


    
    /*******************************************************************************/
    /*  DISPLAY META POINTER RELATIONS AS A CONNECTION FROM CONTAINER TO CONTAINED */
    /*******************************************************************************/
    MetaEditorControl.prototype._processNodeMetaPointers = function (gmeID) {
        var node = this._client.getNode(gmeID),
            pointerNames = node.getPointerNames(),
            pointerMetaDescriptor,
            len,
            oldMetaPointers,
            newMetaPointers = {'names': [], 'combinedNames': []},
            diff,
            pointerTarget,
            pointerTargets,
            pointerName,
            idx,
            lenTargets,
            combinedName;

        this._nodeMetaPointers[gmeID] = this._nodeMetaPointers[gmeID] || {'names': [], 'combinedNames': []};
        oldMetaPointers = this._nodeMetaPointers[gmeID];

        len = pointerNames.length;
        while (len--) {
            pointerMetaDescriptor = node.getPointerDescriptor(pointerNames[len]);

            lenTargets = pointerMetaDescriptor.targets.length;
            while (lenTargets--) {
                combinedName = pointerNames[len] + "_" + pointerMetaDescriptor.targets[lenTargets];

                newMetaPointers.names.push(pointerNames[len]);

                newMetaPointers.combinedNames.push(combinedName);

                newMetaPointers[combinedName] = {'name': pointerMetaDescriptor.name,
                    'target': pointerMetaDescriptor.targets[lenTargets],
                    'multiplicity': pointerMetaDescriptor.multiplicity};
            }
        }

        //compute updated connections
        diff = _.intersection(oldMetaPointers.combinedNames, newMetaPointers.combinedNames);
        len = diff.length;
        while (len--) {
            combinedName = diff[len];
            this.logger.warning('Pointer "' + combinedName +'" update NOT YET HANDLED');
        }

        //compute deleted pointers
        diff = _.difference(oldMetaPointers.combinedNames, newMetaPointers.combinedNames);
        len = diff.length;
        while (len--) {
            combinedName = diff[len];
            pointerName = oldMetaPointers[combinedName].name;
            pointerTarget = oldMetaPointers[combinedName].target;

            this._removeConnection(gmeID, pointerTarget, MetaRelations.META_RELATIONS.POINTER, pointerName);

            idx = oldMetaPointers.combinedNames.indexOf(combinedName);
            oldMetaPointers.combinedNames.splice(idx,1);
            delete oldMetaPointers[combinedName];
        }

        //compute added pointers
        diff = _.difference(newMetaPointers.combinedNames, oldMetaPointers.combinedNames);
        len = diff.length;
        while (len--) {
            combinedName = diff[len];
            pointerName = newMetaPointers[combinedName].name;
            pointerTarget = newMetaPointers[combinedName].target;

            oldMetaPointers.names.push(pointerName);
            oldMetaPointers.combinedNames.push(combinedName);
            oldMetaPointers[combinedName] = {'name': newMetaPointers[combinedName].name,
                                            'target': newMetaPointers[combinedName].target,
                                            'multiplicity': newMetaPointers[combinedName].multiplicity};

            this._createConnection(gmeID, pointerTarget, MetaRelations.META_RELATIONS.POINTER, {'name': pointerName,
                                                                                                'dstText': newMetaPointers[combinedName].multiplicity,
                                                                                                'dstTextEdit': true});
        }
    };
    /******************************************************************************************/
    /*  END OF --- DISPLAY META POINTER RELATIONS AS A CONNECTION FROM CONTAINER TO CONTAINED */
    /******************************************************************************************/



    /***********************************************************************************/
    /*  DISPLAY META INHERITANCE RELATIONS AS A CONNECTION FROM PARENT TO OBJECT       */
    /***********************************************************************************/
    MetaEditorControl.prototype._processNodeMetaInheritance = function (gmeID) {
        var node = this._client.getNode(gmeID),
            oldMetaInheritance,
            newMetaInheritance = node.getBase();

        //if there was a valid old that's different than the current, delete the connection representing the old
        oldMetaInheritance = this._nodeMetaInheritance[gmeID];
        if (oldMetaInheritance && !_.isEmpty(oldMetaInheritance) && (oldMetaInheritance !== newMetaInheritance)) {
            this._removeConnection(oldMetaInheritance, gmeID, MetaRelations.META_RELATIONS.INHERITANCE);

            delete this._nodeMetaInheritance[gmeID];
        }

        if (newMetaInheritance && !_.isEmpty(newMetaInheritance) && (oldMetaInheritance !== newMetaInheritance)) {
            this._nodeMetaInheritance[gmeID] = newMetaInheritance;
            this._createConnection(newMetaInheritance, gmeID, MetaRelations.META_RELATIONS.INHERITANCE, undefined);
        }
    };
    /**********************************************************************************************/
    /*  END OF --- DISPLAY META CONTAINMENT RELATIONS AS A CONNECTION FROM PARENT TO OBJECT       */
    /**********************************************************************************************/


    /****************************************************************************/
    /*        CREATE NEW CONNECTION BUTTONS AND THEIR EVENT HANDLERS            */
    /****************************************************************************/

    MetaEditorControl.prototype._setNewConnectionType = function (connType) {
        var connProps = MetaRelations.getLineVisualDescriptor(connType);

        if (this._connType !== connType) {
            this._connType = connType;
            this.diagramDesigner.connectionDrawingManager.setConnectionInDrawProperties(connProps);
            this.diagramDesigner.setFilterChecked(this._connType);
        }
    };

    /****************************************************************************/
    /*    END OF --- CREATE NEW CONNECTION BUTTONS AND THEIR EVENT HANDLERS     */
    /****************************************************************************/


    /****************************************************************************/
    /*    CREATE NEW CONNECTION BETWEEN TWO ITEMS                               */
    /****************************************************************************/
    MetaEditorControl.prototype._onCreateNewConnection = function (params) {
        var sourceId = this._ComponentID2GMEID[params.src],
            targetId = this._ComponentID2GMEID[params.dst];

        switch(this._connType) {
            case MetaRelations.META_RELATIONS.CONTAINMENT:
                this._createContainmentRelationship(sourceId, targetId);
                break;
            case MetaRelations.META_RELATIONS.INHERITANCE:
                this._createInheritanceRelationship(sourceId, targetId);
                break;
            case MetaRelations.META_RELATIONS.POINTER:
                this._createPointerRelationship(sourceId, targetId);
                break;
            case MetaRelations.META_RELATIONS.POINTERLIST:
                break;
            default:
                break;
        }
    };


    MetaEditorControl.prototype._createContainmentRelationship = function (containerID, objectID) {
        var containerNode = this._client.getNode(containerID),
            objectNode = this._client.getNode(objectID),
            containmentMetaDescriptor,
            len,
            alreadyExists;

        if (containerNode && objectNode) {
            containmentMetaDescriptor = containerNode.getEditableChildrenMetaDescriptor() || [];

            len = containmentMetaDescriptor.length;
            alreadyExists = false;
            while (len--) {
                if (containmentMetaDescriptor[len].target === objectID) {
                    alreadyExists = true;
                    break;
                }
            }

            if (!alreadyExists) {
                containmentMetaDescriptor.push({'target': objectID,
                                                'multiplicity': "0..*"});

                this._client.setChildrenMetaDescriptor(containerID, containmentMetaDescriptor);
            } else {
                this.logger.debug('ContainmentRelationship from "' + containerNode.getAttribute(nodePropertyNames.Attributes.name) + '" (' + containerID + ') to "' + objectNode.getAttribute(nodePropertyNames.Attributes.name) + '" (' + objectID + ') already exists.');
            }
        }
    };


    MetaEditorControl.prototype._deleteContainmentRelationship = function (containerID, objectID) {
        var containerNode = this._client.getNode(containerID),
            objectNode = this._client.getNode(objectID),
            containmentMetaDescriptor,
            len,
            alreadyExists;

        if (containerNode && objectNode) {
            containmentMetaDescriptor = containerNode.getEditableChildrenMetaDescriptor() || [];

            len = containmentMetaDescriptor.length;
            alreadyExists = false;
            while (len--) {
                if (containmentMetaDescriptor[len].target === objectID) {
                    alreadyExists = true;
                    break;
                }
            }

            if (alreadyExists) {
                containmentMetaDescriptor.splice(len, 1);

                this._client.setChildrenMetaDescriptor(containerID, containmentMetaDescriptor);
            } else {
                this.logger.debug('ContainmentRelationship from "' + containerNode.getAttribute(nodePropertyNames.Attributes.name) + '" (' + containerID + ') to "' + objectNode.getAttribute(nodePropertyNames.Attributes.name) + '" (' + objectID + ') does not exist.');
            }
        }
    };


    MetaEditorControl.prototype._createPointerRelationship = function (containerID, objectID) {
        var containerNode = this._client.getNode(containerID),
            objectNode = this._client.getNode(objectID),
            pointerMetaDescriptor,
            pointerNames,
            self = this;

        if (containerNode && objectNode) {
            //get the list of existing pointers and show them in a dialog so the user can choose
            pointerNames = containerNode.getPointerNames() || [];

            //query pointer name from user
            this.diagramDesigner.selectNewPointerName(pointerNames, function (userSelectedPointerName) {
                self._client.startTransaction();

                pointerMetaDescriptor = containerNode.getEditablePointerDescriptor(userSelectedPointerName);

                if (pointerMetaDescriptor && !_.isEmpty(pointerMetaDescriptor)) {
                    if (pointerMetaDescriptor.targets.indexOf(objectID) === -1) {
                        pointerMetaDescriptor.targets.push(objectID);
                    }
                } else {
                    pointerMetaDescriptor = {'name': userSelectedPointerName,
                                            'targets': [objectID],
                                            'multiplicity': "0..1"};

                    //create pointer on the container node with null value
                    self._client.makePointer(containerID, userSelectedPointerName, null);
                }

                self._client.setPointerDescriptor(containerID, userSelectedPointerName, pointerMetaDescriptor);

                self._client.completeTransaction();
            });
        }
    };


    MetaEditorControl.prototype._deletePointerRelationship = function (containerID, objectID, pointerName) {
        var containerNode = this._client.getNode(containerID),
            objectNode = this._client.getNode(objectID),
            pointerMetaDescriptor,
            idx;

        if (containerNode && objectNode) {
            pointerMetaDescriptor = containerNode.getEditablePointerDescriptor(pointerName);
            idx = pointerMetaDescriptor.targets.indexOf(objectID);
            if (idx !== -1) {
                pointerMetaDescriptor.targets.splice(idx, 1);
                //if no more target for this pointerName, clean up
                if (pointerMetaDescriptor.targets.length === 0) {
                    pointerMetaDescriptor = {};

                    this._client.delPointer(containerID, pointerName);

                    //TODO: client.delPointerDescriptor DOES NOT EXIST YET, workaround is to update to NOTHING
                    //TODO: this._client.delPointerDescriptor(containerID, pointerName);
                    this._client.setPointerDescriptor(containerID, pointerName, pointerMetaDescriptor);
                } else {
                    this._client.setPointerDescriptor(containerID, pointerName, pointerMetaDescriptor);
                }
            } else {
                //this should never happen
            }
        }
    };


    MetaEditorControl.prototype._createInheritanceRelationship = function (parentID, objectID) {
        var parentNode = this._client.getNode(parentID),
            objectNode = this._client.getNode(objectID),
            objectBase;

        if (parentNode && objectNode) {
            objectBase = objectNode.getBase();

            if (objectBase && !_.isEmpty(objectBase)) {
                this.logger.debug('InheritanceRelationship from "' + objectNode.getAttribute(nodePropertyNames.Attributes.name) + '" (' + objectID + ') to parent "' + objectBase + '" already exists, but overwriting to "' + parentNode.getAttribute(nodePropertyNames.Attributes.name) + '" (' + parentID + ')"');
            }

            this._client.setBase(objectID, parentID);
        }
    };


    MetaEditorControl.prototype._deleteInheritanceRelationship = function (parentID, objectID) {
        var objectNode = this._client.getNode(objectID),
            objectBase;

        if (objectNode) {
            objectBase = objectNode.getBase();

            if (objectBase && !_.isEmpty(objectBase)) {
                this.logger.debug('InheritanceRelationship from "' + objectNode.getAttribute(nodePropertyNames.Attributes.name) + '" (' + objectID + ') to parent "' + objectBase + '" already exists, but deleting it');
                //TODO: coretree does not allow registry value of 'undefined', so store {}
                //TODO: this._client.setBase(objectID, undefined);
                this._client.setBase(objectID, {});
            }
        }
    };
    /****************************************************************************/
    /*    END OF --- CREATE NEW CONNECTION BETWEEN TWO ITEMS                    */
    /****************************************************************************/



    /****************************************************************************/
    /*                  POINTER FILTER PANEL AND EVENT HANDLERS                 */
    /****************************************************************************/
    MetaEditorControl.prototype._initFilterPanel = function () {
        var filterIcon;

        filterIcon = MetaRelations.createButtonIcon(16, MetaRelations.META_RELATIONS.CONTAINMENT);
        this.diagramDesigner.addFilterItem('Containment', MetaRelations.META_RELATIONS.CONTAINMENT, filterIcon);

        filterIcon = MetaRelations.createButtonIcon(16, MetaRelations.META_RELATIONS.POINTER);
        this.diagramDesigner.addFilterItem('Pointer', MetaRelations.META_RELATIONS.POINTER, filterIcon);

        filterIcon = MetaRelations.createButtonIcon(16, MetaRelations.META_RELATIONS.INHERITANCE);
        this.diagramDesigner.addFilterItem('Inheritance', MetaRelations.META_RELATIONS.INHERITANCE, filterIcon);

        filterIcon = MetaRelations.createButtonIcon(16, MetaRelations.META_RELATIONS.POINTERLIST);
        this.diagramDesigner.addFilterItem('Pointerlist', MetaRelations.META_RELATIONS.POINTERLIST, filterIcon);
    };

    MetaEditorControl.prototype._onConnectionTypeFilterCheckChanged = function (value, isChecked) {
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

    MetaEditorControl.prototype._filterConnType = function (connType) {
        var len = this._connectionListByType && this._connectionListByType.hasOwnProperty(connType) ? this._connectionListByType[connType].length : 0,
            connComponentId,
            gmeSrcId,
            gmeDstId,
            connTexts;

        this._filteredOutConnectionDescriptors[connType] = [];

        this.diagramDesigner.beginUpdate();

        while (len--) {
            connComponentId = this._connectionListByType[connType][len];

            gmeSrcId = this._connectionListByID[connComponentId].GMESrcId;
            gmeDstId = this._connectionListByID[connComponentId].GMEDstId;
            connTexts = this._connectionListByID[connComponentId].connTexts;

            this._filteredOutConnectionDescriptors[connType].push([gmeSrcId, gmeDstId, connTexts]);

            this._removeConnection(gmeSrcId, gmeDstId, connType);
        }

        this.diagramDesigner.endUpdate();
    };

    MetaEditorControl.prototype._unfilterConnType = function (connType) {
        var len = this._filteredOutConnectionDescriptors && this._filteredOutConnectionDescriptors.hasOwnProperty(connType) ? this._filteredOutConnectionDescriptors[connType].length : 0,
            gmeSrcId,
            gmeDstId,
            connTexts;

        this.diagramDesigner.beginUpdate();

        while (len--) {
            gmeSrcId = this._filteredOutConnectionDescriptors[connType][len][0];
            gmeDstId = this._filteredOutConnectionDescriptors[connType][len][1];
            connTexts = this._filteredOutConnectionDescriptors[connType][len][2];

            this._createConnection(gmeSrcId, gmeDstId, connType, connTexts);
        }

        delete this._filteredOutConnectionDescriptors[connType];

        this.diagramDesigner.endUpdate();
    };

    /****************************************************************************/
    /*          END OF --- POINTER FILTER PANEL AND EVENT HANDLERS              */
    /****************************************************************************/

    //attach MetaEditorControl - DiagramDesigner event handler functions
    _.extend(MetaEditorControl.prototype, MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype);


    return MetaEditorControl;
});
