/*globals define, _, WebGMEGlobal*/
/*jshint browser: true */
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger',
    'js/util',
    'js/Constants',
    'js/Utils/GMEConcepts',
    'js/Utils/ComponentSettings',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    './MetaEditorControl.DiagramDesignerWidgetEventHandlers',
    './MetaRelations',
    './MetaEditorConstants',
    './MetaDocItem',
    'js/Utils/PreferencesHelper',
    'js/Controls/AlignMenu'
], function (Logger,
             util,
             CONSTANTS,
             GMEConcepts,
             ComponentSettings,
             nodePropertyNames,
             REGISTRY_KEYS,
             DiagramDesignerWidgetConstants,
             MetaEditorControlDiagramDesignerWidgetEventHandlers,
             MetaRelations,
             MetaEditorConstants,
             MetaDocItem,
             PreferencesHelper,
             AlignMenu) {

    'use strict';

    var MetaEditorControl,
        META_DECORATOR = 'MetaDecorator',
        DOCUMENT_DECORATOR= 'DocumentDecorator',
        WIDGET_NAME = 'DiagramDesigner',
        META_RULES_CONTAINER_NODE_ID = MetaEditorConstants.META_ASPECT_CONTAINER_ID;

    MetaEditorControl = function (options) {
        var self = this;

        this.logger = options.logger || Logger.create(options.loggerName || 'gme:Panels:MetaEditor:MetaEditorControl',
                WebGMEGlobal.gmeConfig.client.log);

        this._client = options.client;
        this._config = MetaEditorControl.getDefaultConfig();
        ComponentSettings.resolveWithWebGMEGlobal(this._config, MetaEditorControl.getComponentId());

        //initialize core collections and variables
        this.diagramDesigner = options.widget;
        this._alignMenu = new AlignMenu(this.diagramDesigner.CONSTANTS, {});

        if (this._client === undefined) {
            this.logger.error('MetaEditorControl\'s client is not specified...');
            throw ('MetaEditorControl can not be created');
        }

        if (this.diagramDesigner === undefined) {
            this.logger.error('MetaEditorControl\'s DiagramDesigner is not specified...');
            throw ('MetaEditorControl can not be created');
        }

        //in METAEDITOR mode DRAG & COPY is not enabled
        this.diagramDesigner.enableDragCopy(false);

        this._metaAspectMemberPatterns = {};

        this._filteredOutConnTypes = [];
        this._filteredOutConnectionDescriptors = {};

        //local variable holding info about the currently opened node
        this.currentNodeInfo = {id: null, members: []};

        this._metaAspectMembersAll = [];
        this._metaAspectMembersPerSheet = {};
        this._metaAspectMembersCoordinatesGlobal = {};
        this._metaAspectMembersCoordinatesPerSheet = {};
        this._selectedMetaAspectSheetMembers = [];
        this._selectedSheetID = null;

        this._metaDocItemsPerSheet = {};

        this._ComponentID2DocItemID = {};
        this._DocItemID2ComponentID = {};

        this._GMEID2ComponentID = {};
        this._ComponentID2GMEID = {};

        //set default connection type to containment
        this._setNewConnectionType(MetaRelations.META_RELATIONS.CONTAINMENT);

        this._initFilterPanel();

        //attach all the event handlers for event's coming from DiagramDesigner
        this.attachDiagramDesignerWidgetEventHandlers();

        //let the decorator-manager download the required decorator
        this._client.decoratorManager.download([META_DECORATOR], WIDGET_NAME, function () {
            self.logger.debug('MetaEditorControl ctor finished');

            //load meta container node
            //give the UI time to render first before start using it's features
            setTimeout(function () {
                self._loadMetaAspectContainerNode();
            }, 10);
        });
    };

    MetaEditorControl.prototype._loadMetaAspectContainerNode = function () {
        var self = this;

        this.metaAspectContainerNodeID = META_RULES_CONTAINER_NODE_ID;

        this.currentNodeInfo.id = WebGMEGlobal.State.getActiveObject();

        this.logger.debug('_loadMetaAspectContainerNode: "' + this.metaAspectContainerNodeID + '"');

        this._initializeSelectedSheet();

        //remove current territory patterns
        if (this._territoryId) {
            this._client.removeUI(this._territoryId);
        }

        //put new node's info into territory rules
        this._selfPatterns = {};
        this._selfPatterns[this.metaAspectContainerNodeID] = {children: 0};

        //create and set territory
        this._territoryId = this._client.addUI(this, function (events) {
            self._eventCallback(events);
        });
        this._client.updateTerritory(this._territoryId, this._selfPatterns);
    };

    /**********************************************************/
    /*                    PUBLIC METHODS                      */
    /**********************************************************/
    MetaEditorControl.prototype._eventCallback = function (events) {
        var i = events ? events.length : 0,
            e;

        this.logger.debug('_eventCallback "' + i + '" items');

        this.diagramDesigner.beginUpdate();

        while (i--) {
            e = events[i];
            switch (e.etype) {
                case CONSTANTS.TERRITORY_EVENT_LOAD:
                    this._onLoad(e.eid);
                    break;
                case CONSTANTS.TERRITORY_EVENT_UPDATE:
                    this._onUpdate(e.eid);
                    break;
                case CONSTANTS.TERRITORY_EVENT_UNLOAD:
                    this._onUnload(e.eid);
                    break;
                default:
                    break;
            }
        }

        this.diagramDesigner.endUpdate();

        this.diagramDesigner.hideProgressbar();

        this.logger.debug('_eventCallback "' + events.length + '" items - DONE');
    };

    //might not be the best approach
    MetaEditorControl.prototype.destroy = function () {
        this._detachClientEventListeners();
        this._client.removeUI(this._territoryId);
        this._client.removeUI(this._metaAspectMembersTerritoryId);
        this.diagramDesigner.clear();
    };

    /**********************************************************/
    /*                LOAD / UPDATE / UNLOAD HANDLER          */
    /**********************************************************/
    MetaEditorControl.prototype._onLoad = function (gmeID) {
        if (gmeID === this.metaAspectContainerNodeID) {
            this._processMetaAspectContainerNode();
        } else {
            this._processNodeLoad(gmeID);
        }
    };

    MetaEditorControl.prototype._onUpdate = function (gmeID) {
        if (gmeID === this.metaAspectContainerNodeID) {
            this._processMetaAspectContainerNode();
        } else {
            this._processNodeUpdate(gmeID);
        }
    };

    MetaEditorControl.prototype._onUnload = function (gmeID) {
        var self = this;

        if (gmeID === this.metaAspectContainerNodeID) {
            //the opened model has been deleted....
            //most probably a project / branch / whatever change
            this.logger.debug('The currently opened aspect has been deleted --- GMEID: "' +
                this.metaAspectContainerNodeID + '"');
            setTimeout(function () {
                self._loadMetaAspectContainerNode();
            }, 10);
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
        //TODO could be filled with meaningful info
    };
    /**********************************************************/
    /*       END OF --- CUSTOM BUTTON EVENT HANDLERS          */
    /**********************************************************/

    /***********************************************************/
    /*  PROCESS CURRENT NODE TO HANDLE ADDED / REMOVED ELEMENT */
    /***********************************************************/
    MetaEditorControl.prototype._processMetaAspectContainerNode = function () {
        var aspectNodeID = this.metaAspectContainerNodeID,
            aspectNode = this._client.getNode(aspectNodeID),
            metaAspectSetMembers = aspectNode.getMemberIds(MetaEditorConstants.META_ASPECT_SET_NAME),
            territoryChanged = false,
            metaInconsistencies,
            i,
            len,
            diff,
            objDesc,
            componentID,
            gmeID,
            selectedSheetMembers,
            positionsUpdated;

        //this._metaAspectMembersAll contains all the currently known members of the meta aspect
        //update current member list
        this._metaAspectMembersAll = metaAspectSetMembers.slice(0);
        len = this._metaAspectMembersAll.length;
        this._metaAspectMembersCoordinatesGlobal = {};
        while (len--) {
            gmeID = this._metaAspectMembersAll[len];
            this._metaAspectMembersCoordinatesGlobal[gmeID] = aspectNode.getMemberRegistry(
                MetaEditorConstants.META_ASPECT_SET_NAME,
                gmeID,
                REGISTRY_KEYS.POSITION);
        }

        //setSelected sheet
        //this._selectedMetaAspectSet
        //process the sheets
        positionsUpdated = this._processMetaAspectSheetsRegistry();

        //check to see if the territory needs to be changed
        //the territory contains the nodes that are on the currently opened sheet
        //this._selectedMetaAspectSheetMembers
        selectedSheetMembers = this._metaAspectMembersPerSheet[this._selectedMetaAspectSet] || [];

        //check deleted nodes
        diff = _.difference(this._selectedMetaAspectSheetMembers, selectedSheetMembers);
        len = diff.length;
        while (len--) {
            delete this._metaAspectMemberPatterns[diff[len]];
            territoryChanged = true;
        }

        //check added nodes
        diff = _.difference(selectedSheetMembers, this._selectedMetaAspectSheetMembers);
        len = diff.length;
        while (len--) {
            this._metaAspectMemberPatterns[diff[len]] = {children: 0};
            territoryChanged = true;
        }

        //check all other nodes for position change
        //or any other change that could have happened (local registry modifications)
        //diff = positionsUpdated;//_.intersection(this._selectedMetaAspectSheetMembers, selectedSheetMembers);
        diff = _.intersection(this._selectedMetaAspectSheetMembers, selectedSheetMembers);
        len = diff.length;
        while (len--) {
            gmeID = diff[len];
            objDesc = {position: {x: 100, y: 100}};

            if (this._metaAspectMembersCoordinatesPerSheet[this._selectedMetaAspectSet][gmeID]) {
                objDesc.position.x = this._metaAspectMembersCoordinatesPerSheet[this._selectedMetaAspectSet][gmeID].x;
                objDesc.position.y = this._metaAspectMembersCoordinatesPerSheet[this._selectedMetaAspectSet][gmeID].y;
            }

            if (this._GMEID2ComponentID.hasOwnProperty(gmeID)) {
                componentID = this._GMEID2ComponentID[gmeID];
                this.diagramDesigner.updateDesignerItem(componentID, objDesc);
            }
        }

        this._selectedMetaAspectSheetMembers = selectedSheetMembers.slice(0);

        this._processMetaDocItems();

        metaInconsistencies = this._config.autoCheckMetaConsistency ? this._client.checkMetaConsistency() : [];

        for (i = 0; i < metaInconsistencies.length; i += 1) {
            this._client.dispatchEvent(this._client.CONSTANTS.NOTIFICATION, metaInconsistencies[i]);
        }

        //there was change in the territory
        if (territoryChanged === true) {
            this._client.updateTerritory(this._metaAspectMembersTerritoryId, this._metaAspectMemberPatterns);
        }
    };
    /**********************************************************************/
    /*  END OF --- PROCESS CURRENT NODE TO HANDLE ADDED / REMOVED ELEMENT */
    /**********************************************************************/

    MetaEditorControl.prototype._processMetaDocItems = function () {
        var docItemsInRegistry,
            docItemId,
            decClass,
            uiComponent,
            componentId,
            objDesc;

        this.diagramDesigner.beginUpdate();

        if (this._selectedMetaAspectSet && this._metaDocItemsPerSheet[this._selectedMetaAspectSet]) {
            docItemsInRegistry = this._metaDocItemsPerSheet[this._selectedMetaAspectSet];
        } else {
            docItemsInRegistry = {};
        }

        for (docItemId in this._DocItemID2ComponentID) {
            if (docItemsInRegistry.hasOwnProperty(docItemId) === false) {
                // "unload"
                this.diagramDesigner.deleteComponent(this._DocItemID2ComponentID[docItemId]);

                componentId = this._DocItemID2ComponentID[docItemId];
                delete this._ComponentID2DocItemID[componentId];
                delete this._DocItemID2ComponentID[docItemId];
            }
        }

        for (docItemId in docItemsInRegistry) {
            if (this._DocItemID2ComponentID.hasOwnProperty(docItemId)) {
                // "update"
                objDesc = {};
                objDesc.position = docItemsInRegistry[docItemId].position;
                componentId = this._DocItemID2ComponentID[docItemId];
                this.diagramDesigner.updateDesignerItem(componentId, objDesc);
            } else {
                // "load"
                decClass = this._client.decoratorManager.getDecoratorForWidget(DOCUMENT_DECORATOR, WIDGET_NAME);
                objDesc = docItemsInRegistry[docItemId].getObjectDescriptor(decClass);

                uiComponent = this.diagramDesigner.createDesignerItem(objDesc);

                this._DocItemID2ComponentID[docItemId] = uiComponent.id;
                this._ComponentID2DocItemID[uiComponent.id] = docItemId;
            }
        }

        this.diagramDesigner.endUpdate();

    };

    /**************************************************************************/
    /*  HANDLE OBJECT LOAD  --- DISPLAY IT WITH ALL THE POINTERS / SETS / ETC */
    /**************************************************************************/
    MetaEditorControl.prototype._processNodeLoad = function (gmeID) {
        var uiComponent,
            decClass,
            objDesc;

        //component loaded
        if (this._GMENodes.indexOf(gmeID) === -1) {
            //aspect's member has been loaded
            objDesc = {position: {x: 100, y: 100}};

            if (this._metaAspectMembersCoordinatesPerSheet[this._selectedMetaAspectSet][gmeID]) {
                objDesc.position.x = this._metaAspectMembersCoordinatesPerSheet[this._selectedMetaAspectSet][gmeID].x;
                objDesc.position.y = this._metaAspectMembersCoordinatesPerSheet[this._selectedMetaAspectSet][gmeID].y;
            }

            decClass = this._client.decoratorManager.getDecoratorForWidget(META_DECORATOR, WIDGET_NAME);

            objDesc.decoratorClass = decClass;
            objDesc.control = this;
            objDesc.metaInfo = {};
            objDesc.metaInfo[CONSTANTS.GME_ID] = gmeID;
            //each meta specific registry customization will be stored in the MetaContainer node's main META SET
            // (MetaEditorConstants.META_ASPECT_SET_NAME)
            objDesc.preferencesHelper = PreferencesHelper.getPreferences([{
                containerID: this.metaAspectContainerNodeID,
                setID: MetaEditorConstants.META_ASPECT_SET_NAME
            }]);

            uiComponent = this.diagramDesigner.createDesignerItem(objDesc);

            this._GMENodes.push(gmeID);
            this._GMEID2ComponentID[gmeID] = uiComponent.id;
            this._ComponentID2GMEID[uiComponent.id] = gmeID;

            //process new node to display containment / pointers / inheritance / sets as connections
            this._processNodeMetaContainment(gmeID);
            this._processNodeMetaPointers(gmeID, false);
            this._processNodeMetaInheritance(gmeID);
            this._processNodeMixins(gmeID);
            this._processNodeMetaPointers(gmeID, true);

            //check all the waiting pointers (whose SRC/DST is already displayed and waiting for the DST/SRC to show up)
            //it might be this new node
            this._processConnectionWaitingList(gmeID);
        }
    };

    MetaEditorControl.prototype._processConnectionWaitingList = function (gmeID) {
        var len,
            gmeSrcID,
            gmeDstID,
            connType,
            connTexts,
            c = [];

        //check for possible endpoint as gmeID
        gmeDstID = gmeID;
        if (this._connectionWaitingListByDstGMEID && this._connectionWaitingListByDstGMEID.hasOwnProperty(gmeDstID)) {
            for (gmeSrcID in this._connectionWaitingListByDstGMEID[gmeDstID]) {
                if (this._connectionWaitingListByDstGMEID[gmeDstID].hasOwnProperty(gmeSrcID)) {
                    len = this._connectionWaitingListByDstGMEID[gmeDstID][gmeSrcID].length;
                    while (len--) {
                        connType = this._connectionWaitingListByDstGMEID[gmeDstID][gmeSrcID][len][0];
                        connTexts = this._connectionWaitingListByDstGMEID[gmeDstID][gmeSrcID][len][1];
                        c.push({
                            gmeSrcID: gmeSrcID,
                            gmeDstID: gmeDstID,
                            connType: connType,
                            connTexts: connTexts
                        });
                    }
                }
            }

            delete this._connectionWaitingListByDstGMEID[gmeDstID];
        }

        //check for possible source as gmeID
        gmeSrcID = gmeID;
        if (this._connectionWaitingListBySrcGMEID && this._connectionWaitingListBySrcGMEID.hasOwnProperty(gmeSrcID)) {
            for (gmeDstID in this._connectionWaitingListBySrcGMEID[gmeSrcID]) {
                if (this._connectionWaitingListBySrcGMEID[gmeSrcID].hasOwnProperty(gmeDstID)) {
                    len = this._connectionWaitingListBySrcGMEID[gmeSrcID][gmeDstID].length;
                    while (len--) {
                        connType = this._connectionWaitingListBySrcGMEID[gmeSrcID][gmeDstID][len][0];
                        connTexts = this._connectionWaitingListBySrcGMEID[gmeSrcID][gmeDstID][len][1];
                        c.push({
                            gmeSrcID: gmeSrcID,
                            gmeDstID: gmeDstID,
                            connType: connType,
                            connTexts: connTexts
                        });
                    }
                }
            }

            delete this._connectionWaitingListBySrcGMEID[gmeSrcID];
        }

        len = c.length;
        while (len--) {
            gmeSrcID = c[len].gmeSrcID;
            gmeDstID = c[len].gmeDstID;
            connType = c[len].connType;
            connTexts = c[len].connTexts;
            this._createConnection(gmeSrcID, gmeDstID, connType, connTexts);
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
            idx,
            len,
            i,
            otherEnd,
            pointerName,
            aConns,
            connectionID;

        if (this._GMEID2ComponentID.hasOwnProperty(gmeID)) {
            componentID = this._GMEID2ComponentID[gmeID];

            //gather all the information that is stored in this node's META

            //CONTAINMENT
            len = this._nodeMetaContainment[gmeID].targets.length;
            while (len--) {
                otherEnd = this._nodeMetaContainment[gmeID].targets[len];
                this._removeConnection(gmeID, otherEnd, MetaRelations.META_RELATIONS.CONTAINMENT);
            }

            //POINTERS
            len = this._nodeMetaPointers[gmeID].combinedNames.length;
            while (len--) {
                pointerName = this._nodeMetaPointers[gmeID].combinedNames[len];
                otherEnd = this._nodeMetaPointers[gmeID][pointerName].target;
                pointerName = this._nodeMetaPointers[gmeID][pointerName].name;
                this._removeConnection(gmeID, otherEnd, MetaRelations.META_RELATIONS.POINTER, pointerName);
            }

            //INHERITANCE
            if (this._nodeMetaInheritance[gmeID] && !_.isEmpty(this._nodeMetaInheritance[gmeID])) {
                this._removeConnection(this._nodeMetaInheritance[gmeID],
                    gmeID,
                    MetaRelations.META_RELATIONS.INHERITANCE);
            }

            //MIXINS
            for (i = 0; i < this._nodeMixins[gmeID].length; i += 1) {
                this._removeConnection(gmeID, this._nodeMixins[gmeID][i], MetaRelations.META_RELATIONS.MIXIN);
            }

            //POINTER LISTS
            len = this._nodeMetaSets[gmeID].combinedNames.length;
            while (len--) {
                pointerName = this._nodeMetaSets[gmeID].combinedNames[len];
                otherEnd = this._nodeMetaSets[gmeID][pointerName].target;
                pointerName = this._nodeMetaSets[gmeID][pointerName].name;
                this._removeConnection(gmeID, otherEnd, MetaRelations.META_RELATIONS.SET, pointerName);
            }

            //finally delete the guy from the screen
            this.diagramDesigner.deleteComponent(componentID);

            delete this._ComponentID2GMEID[componentID];

            delete this._GMEID2ComponentID[gmeID];

            idx = this._GMENodes.indexOf(gmeID);
            this._GMENodes.splice(idx, 1);

            //check if there is any more connection present that's associated with this object
            //typically the connection end is this guy
            //if so, remove but save to savedList
            aConns = this._getAssociatedConnections(gmeID);
            len = aConns.src.length;
            while (len--) {
                connectionID = aConns.src[len];
                //save the connection to the waiting list, since the destination is still there
                this._saveConnectionToWaitingList(this._connectionListByID[connectionID].GMESrcId,
                    this._connectionListByID[connectionID].GMEDstId,
                    this._connectionListByID[connectionID].type,
                    this._connectionListByID[connectionID].connTexts);
                this._removeConnection(this._connectionListByID[connectionID].GMESrcId,
                    this._connectionListByID[connectionID].GMEDstId,
                    this._connectionListByID[connectionID].type);
            }

            len = aConns.dst.length;
            while (len--) {
                connectionID = aConns.dst[len];
                if (this._connectionListByID[connectionID]) {
                    //save the connection to the waiting list, since the destination is still there
                    this._saveConnectionToWaitingList(this._connectionListByID[connectionID].GMESrcId,
                        this._connectionListByID[connectionID].GMEDstId,
                        this._connectionListByID[connectionID].type,
                        this._connectionListByID[connectionID].connTexts);
                    this._removeConnection(this._connectionListByID[connectionID].GMESrcId,
                        this._connectionListByID[connectionID].GMEDstId,
                        this._connectionListByID[connectionID].type);
                }
            }

            //check the waiting list and remove any connection that was waiting and this end was present
            for (otherEnd in this._connectionWaitingListBySrcGMEID) {
                if (this._connectionWaitingListBySrcGMEID.hasOwnProperty(otherEnd)) {
                    delete this._connectionWaitingListBySrcGMEID[otherEnd][gmeID];

                    if (_.isEmpty(this._connectionWaitingListBySrcGMEID[otherEnd])) {
                        delete this._connectionWaitingListBySrcGMEID[otherEnd];
                    }
                }
            }

            for (otherEnd in this._connectionWaitingListByDstGMEID) {
                if (this._connectionWaitingListByDstGMEID.hasOwnProperty(otherEnd)) {
                    delete this._connectionWaitingListByDstGMEID[otherEnd][gmeID];

                    if (_.isEmpty(this._connectionWaitingListByDstGMEID[otherEnd])) {
                        delete this._connectionWaitingListByDstGMEID[otherEnd];
                    }
                }
            }

            //keep up accounting
            delete this._nodeMetaContainment[gmeID];
            delete this._nodeMetaPointers[gmeID];
            delete this._nodeMetaInheritance[gmeID];
            delete this._nodeMixins[gmeID];
            delete this._nodeMetaSets[gmeID];
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
            connComponent,
            metaInfo;
        //need to check if the src and dst objects are displayed or not
        //if YES, create connection
        //if NO, store information in a waiting queue

        if (this._GMENodes.indexOf(gmeSrcId) !== -1 && this._GMENodes.indexOf(gmeDstId) !== -1) {
            //source and destination is displayed

            if (this._filteredOutConnTypes.indexOf(connType) === -1) {
                //connection type is not filtered out    
                connDesc = {
                    srcObjId: this._GMEID2ComponentID[gmeSrcId],
                    srcSubCompId: undefined,
                    dstObjId: this._GMEID2ComponentID[gmeDstId],
                    dstSubCompId: undefined,
                    reconnectable: false,
                    name: '',
                    nameEdit: false
                };

                //set visual properties
                _.extend(connDesc, MetaRelations.getLineVisualDescriptor(connType));

                //fill out texts
                if (connTexts) {
                    _.extend(connDesc, connTexts);
                }

                connComponent = this.diagramDesigner.createConnection(connDesc);

                //set connection metaInfo and store connection type
                //the MetaDecorator uses this information when queried for connectionArea
                metaInfo = {};
                metaInfo[MetaRelations.CONNECTION_META_INFO.TYPE] = connType;
                connComponent.setMetaInfo(metaInfo);

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

    MetaEditorControl.prototype._saveConnectionToWaitingList = function (gmeSrcId, gmeDstId, connType, connTexts) {
        if (this._GMENodes.indexOf(gmeSrcId) !== -1 && this._GMENodes.indexOf(gmeDstId) === -1) {
            //#1 - the destination object is missing from the screen
            this._connectionWaitingListByDstGMEID[gmeDstId] = this._connectionWaitingListByDstGMEID[gmeDstId] || {};

            this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId] =
                this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId] || [];

            this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId].push([connType, connTexts]);
        } else if (this._GMENodes.indexOf(gmeSrcId) === -1 && this._GMENodes.indexOf(gmeDstId) !== -1) {
            //#2 -  the source object is missing from the screen
            this._connectionWaitingListBySrcGMEID[gmeSrcId] = this._connectionWaitingListBySrcGMEID[gmeSrcId] || {};
            this._connectionWaitingListBySrcGMEID[gmeSrcId][gmeDstId] =
                this._connectionWaitingListBySrcGMEID[gmeSrcId][gmeDstId] || [];
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

        this._connectionListBySrcGMEID[gmeSrcId][gmeDstId][connType] =
            this._connectionListBySrcGMEID[gmeSrcId][gmeDstId][connType] || [];

        this._connectionListBySrcGMEID[gmeSrcId][gmeDstId][connType].push(connComponentId);

        //save by DST
        this._connectionListByDstGMEID[gmeDstId] = this._connectionListByDstGMEID[gmeDstId] || {};
        this._connectionListByDstGMEID[gmeDstId][gmeSrcId] = this._connectionListByDstGMEID[gmeDstId][gmeSrcId] || {};

        this._connectionListByDstGMEID[gmeDstId][gmeSrcId][connType] =
            this._connectionListByDstGMEID[gmeDstId][gmeSrcId][connType] || [];

        this._connectionListByDstGMEID[gmeDstId][gmeSrcId][connType].push(connComponentId);

        //save by type
        this._connectionListByType[connType] = this._connectionListByType[connType] || [];
        this._connectionListByType[connType].push(connComponentId);

        //save by connectionID
        this._connectionListByID[connComponentId] = {
            GMESrcId: gmeSrcId,
            GMEDstId: gmeDstId,
            type: connType,
            name: (connTexts && connTexts.name) ? connTexts.name : undefined,
            connTexts: connTexts
        };
    };

    MetaEditorControl.prototype._isPointerOrSetAndConnDescDoesNotMatchName = function (connDesc, connType, pointerOrSetName) {
        return (connType === MetaRelations.META_RELATIONS.POINTER || connType === MetaRelations.META_RELATIONS.SET) &&
            pointerOrSetName &&
            pointerOrSetName !== '' &&
            connDesc.name !== pointerOrSetName;
    };

    /****************************************************************************/
    /*  END OF --- CREATE A SPECIFIC TYPE OF CONNECTION BETWEEN 2 GME OBJECTS   */
    /****************************************************************************/

    /****************************************************************************/
    /*  REMOVES A SPECIFIC TYPE OF CONNECTION FROM 2 GME OBJECTS                */
    /****************************************************************************/
    MetaEditorControl.prototype._removeConnection = function (gmeSrcId, gmeDstId, connType, pointerOrSetName) {
        var connectionID,
            idx,
            len,
            connectionPresent = false;

        //only bother if
        //- both the source and destination is present on the screen
        //the connection in question is drawn
        if (this._connectionListBySrcGMEID[gmeSrcId] &&
            this._connectionListBySrcGMEID[gmeSrcId][gmeDstId] &&
            this._connectionListBySrcGMEID[gmeSrcId][gmeDstId][connType]) {
            connectionPresent = true;
        }

        if (!connectionPresent) {
            return;
        }

        len = this._connectionListBySrcGMEID[gmeSrcId][gmeDstId][connType].length;

        while (len--) {
            connectionID = this._connectionListBySrcGMEID[gmeSrcId][gmeDstId][connType][len];

            // If a pointer or set with a specific name should be removed
            // clear out the connectionID if this connection is not the representation of that pointer.
            if (this._isPointerOrSetAndConnDescDoesNotMatchName(
                    this._connectionListByID[connectionID],
                    connType,
                    pointerOrSetName) === true) {
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

    /*****************************************************************************/
    /*                UPDATE CONNECTION TEXT                                     */
    /*****************************************************************************/
    MetaEditorControl.prototype._updateConnectionText = function (gmeSrcId, gmeDstId, connType, connTexts) {
        var connectionID,
            idx,
            len = this._connectionListBySrcGMEID[gmeSrcId][gmeDstId][connType].length,
            pointerOrSetName = connTexts.name,
            found = false,
            connDesc;

        while (len--) {
            connectionID = this._connectionListBySrcGMEID[gmeSrcId][gmeDstId][connType][len];

            // If a pointer or set with a specific name should be updated
            // clear out the connectionID if this connection is not the representation of that pointer.
            if (this._isPointerOrSetAndConnDescDoesNotMatchName(
                    this._connectionListByID[connectionID],
                    connType,
                    pointerOrSetName) === true) {
                connectionID = undefined;
            }

            //if the connectionID is still valid
            if (connectionID) {
                this._connectionListByID[connectionID].name = connTexts.name;
                this._connectionListByID[connectionID].connTexts = connTexts;

                this.diagramDesigner.updateConnectionTexts(connectionID, connTexts);

                found = true;
            }
        }

        if (!found) {
            //try to find it in the connection waiting list
            if (this._GMENodes.indexOf(gmeSrcId) !== -1 && this._GMENodes.indexOf(gmeDstId) === -1) {
                //#1 - the destination object is missing from the screen
                len = this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId].length;
                for (idx = 0; idx < len; idx += 1) {
                    connDesc = this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId][idx];
                    if (connDesc[0] === connType) {
                        if (connType === MetaRelations.META_RELATIONS.POINTER ||
                            connType === MetaRelations.META_RELATIONS.SET) {

                            if (pointerOrSetName &&
                                pointerOrSetName !== '' &&
                                connDesc[1].name === pointerOrSetName) {
                                connDesc[1] = connTexts;
                            }

                        } else{
                            connDesc[1] = connTexts;
                        }
                    }
                }
            } else if (this._GMENodes.indexOf(gmeSrcId) === -1 && this._GMENodes.indexOf(gmeDstId) !== -1) {
                //#2 -  the source object is missing from the screen
                len = this._connectionWaitingListBySrcGMEID[gmeSrcId][gmeDstId].length;
                for (idx = 0; idx < len; idx += 1) {
                    connDesc = this._connectionWaitingListBySrcGMEID[gmeSrcId][gmeDstId][idx];
                    if (connDesc[0] === connType) {
                        if (connType === MetaRelations.META_RELATIONS.POINTER ||
                            connType === MetaRelations.META_RELATIONS.SET) {

                            if (pointerOrSetName &&
                                pointerOrSetName !== '' &&
                                connDesc[1].name === pointerOrSetName) {
                                connDesc[1] = connTexts;
                            }

                        } else{
                            connDesc[1] = connTexts;
                        }
                    }
                }
            } else {
                //#3 - both gmeSrcId and gmeDstId is missing from the screen
            }
        }
    };
    /*****************************************************************************/
    /*               END OF --- UPDATE CONNECTION TEXT                           */
    /*****************************************************************************/

    /**************************************************************************/
    /*  HANDLE OBJECT UPDATE  --- DISPLAY IT WITH ALL THE POINTERS / SETS / ETC */
    /**************************************************************************/
    MetaEditorControl.prototype._processNodeUpdate = function (gmeID) {
        var componentID,
            decClass,
            objDesc = {};

        if (this._GMEID2ComponentID.hasOwnProperty(gmeID)) {
            componentID = this._GMEID2ComponentID[gmeID];

            decClass = this._client.decoratorManager.getDecoratorForWidget(META_DECORATOR, WIDGET_NAME);

            objDesc.decoratorClass = decClass;
            objDesc.preferencesHelper = PreferencesHelper.getPreferences([{
                containerID: this.metaAspectContainerNodeID,
                setID: MetaEditorConstants.META_ASPECT_SET_NAME
            }]);

            this.diagramDesigner.updateDesignerItem(componentID, objDesc);

            //update set relations
            this._processNodeMetaContainment(gmeID);
            this._processNodeMetaPointers(gmeID, false);
            this._processNodeMetaInheritance(gmeID);
            this._processNodeMixins(gmeID);
            this._processNodeMetaPointers(gmeID, true);
        }
    };
    /**************************************************************************/
    /*                   END OF --- HANDLE OBJECT UPDATE                      */
    /**************************************************************************/

    /***********************************************************************************/
    /*  DISPLAY META CONTAINMENT RELATIONS AS A CONNECTION FROM CONTAINER TO CONTAINED */
    /***********************************************************************************/
    MetaEditorControl.prototype._processNodeMetaContainment = function (gmeID) {
        var containmentMetaDescriptor = this._client.getValidChildrenItems(gmeID) || [],
            containmentOwnTypes = this._client.getOwnValidChildrenTypes(gmeID) || [],
            len,
            oldMetaContainment,
            newMetaContainment = {targets: []},
            diff,
            containmentTarget,
            idx;

        this._nodeMetaContainment[gmeID] = this._nodeMetaContainment[gmeID] || {targets: []};
        oldMetaContainment = this._nodeMetaContainment[gmeID];

        len = containmentMetaDescriptor.length;
        while (len--) {
            if (containmentOwnTypes.indexOf(containmentMetaDescriptor[len].id) !== -1) {
                newMetaContainment.targets.push(containmentMetaDescriptor[len].id);
                newMetaContainment[containmentMetaDescriptor[len].id] = {
                    multiplicity: '' + (containmentMetaDescriptor[len].min || 0) + '..' +
                    (containmentMetaDescriptor[len].max || '*')
                };
            }
        }

        //compute updated connections
        diff = _.intersection(oldMetaContainment.targets, newMetaContainment.targets);
        len = diff.length;
        while (len--) {
            containmentTarget = diff[len];
            if (oldMetaContainment[containmentTarget].multiplicity !==
                newMetaContainment[containmentTarget].multiplicity) {
                //update accounting
                oldMetaContainment[containmentTarget].multiplicity = newMetaContainment[containmentTarget].multiplicity;

                //update connection text
                this._updateConnectionText(gmeID, containmentTarget, MetaRelations.META_RELATIONS.CONTAINMENT, {
                    dstText: newMetaContainment[containmentTarget].multiplicity,
                    dstTextEdit: true
                });
            }
        }

        //compute deleted pointers
        diff = _.difference(oldMetaContainment.targets, newMetaContainment.targets);
        len = diff.length;
        while (len--) {
            containmentTarget = diff[len];
            this._removeConnection(gmeID, containmentTarget, MetaRelations.META_RELATIONS.CONTAINMENT);

            idx = oldMetaContainment.targets.indexOf(containmentTarget);
            oldMetaContainment.targets.splice(idx, 1);
            delete oldMetaContainment[containmentTarget];
        }

        //compute added pointers
        diff = _.difference(newMetaContainment.targets, oldMetaContainment.targets);
        len = diff.length;
        while (len--) {
            containmentTarget = diff[len];

            oldMetaContainment.targets.push(containmentTarget);
            oldMetaContainment[containmentTarget] = {multiplicity: newMetaContainment[containmentTarget].multiplicity};

            this._createConnection(gmeID, containmentTarget, MetaRelations.META_RELATIONS.CONTAINMENT, {
                dstText: newMetaContainment[containmentTarget].multiplicity,
                dstTextEdit: true
            });
        }
    };
    /**********************************************************************************************/
    /*  END OF --- DISPLAY META CONTAINMENT RELATIONS AS A CONNECTION FROM CONTAINER TO CONTAINED */
    /**********************************************************************************************/

    /*******************************************************************************/
    /*  DISPLAY META POINTER RELATIONS AS A CONNECTION FROM CONTAINER TO CONTAINED */
    /*******************************************************************************/
    MetaEditorControl.prototype._processNodeMetaPointers = function (gmeID, isSet) {
        var node = this._client.getNode(gmeID),
            pointerNames = isSet === true ? node.getValidSetNames() : node.getValidPointerNames(),
            pointerMetaDescriptor,
            pointerOwnMetaTypes,
            len,
            oldMetaPointers,
            newMetaPointers = {names: [], combinedNames: []},
            diff,
            pointerTarget,
            pointerName,
            idx,
            lenTargets,
            combinedName,
            ptrType = isSet === true ? MetaRelations.META_RELATIONS.SET : MetaRelations.META_RELATIONS.POINTER;

        if (isSet !== true) {
            this._nodeMetaPointers[gmeID] = this._nodeMetaPointers[gmeID] || {names: [], combinedNames: []};
            oldMetaPointers = this._nodeMetaPointers[gmeID];
        } else {
            this._nodeMetaSets[gmeID] = this._nodeMetaSets[gmeID] || {names: [], combinedNames: []};
            oldMetaPointers = this._nodeMetaSets[gmeID];
        }

        len = pointerNames.length;
        while (len--) {
            pointerMetaDescriptor = this._client.getValidTargetItems(gmeID, pointerNames[len]);
            pointerOwnMetaTypes = this._client.getOwnValidTargetTypes(gmeID, pointerNames[len]);

            if (pointerMetaDescriptor) {
                lenTargets = pointerMetaDescriptor.length;
                while (lenTargets--) {
                    if (pointerOwnMetaTypes.indexOf(pointerMetaDescriptor[lenTargets].id) !== -1) {
                        combinedName = pointerNames[len] + '_' + pointerMetaDescriptor[lenTargets].id;

                        newMetaPointers.names.push(pointerNames[len]);

                        newMetaPointers.combinedNames.push(combinedName);

                        newMetaPointers[combinedName] = {
                            name: pointerNames[len],
                            target: pointerMetaDescriptor[lenTargets].id
                        };

                        if (isSet) {
                            newMetaPointers[combinedName].multiplicity = '' +
                                (pointerMetaDescriptor[lenTargets].min || 0) +
                                '..' +
                                (pointerMetaDescriptor[lenTargets].max || '*');
                        }

                    }
                }
            }
        }

        //compute updated connections
        diff = _.intersection(oldMetaPointers.combinedNames, newMetaPointers.combinedNames);
        len = diff.length;
        while (len--) {
            combinedName = diff[len];
            if (oldMetaPointers[combinedName].multiplicity !== newMetaPointers[combinedName].multiplicity) {
                pointerName = oldMetaPointers[combinedName].name;
                pointerTarget = oldMetaPointers[combinedName].target;

                oldMetaPointers[combinedName].multiplicity = newMetaPointers[combinedName].multiplicity;

                this._updateConnectionText(gmeID, pointerTarget, ptrType, {
                    name: pointerName,
                    dstText: newMetaPointers[combinedName].multiplicity,
                    dstTextEdit: true
                });
            }
        }

        //compute deleted pointers
        diff = _.difference(oldMetaPointers.combinedNames, newMetaPointers.combinedNames);
        len = diff.length;
        while (len--) {
            combinedName = diff[len];
            pointerName = oldMetaPointers[combinedName].name;
            pointerTarget = oldMetaPointers[combinedName].target;

            this._removeConnection(gmeID, pointerTarget, ptrType, pointerName);

            idx = oldMetaPointers.combinedNames.indexOf(combinedName);
            oldMetaPointers.combinedNames.splice(idx, 1);
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
            oldMetaPointers[combinedName] = {
                name: newMetaPointers[combinedName].name,
                target: newMetaPointers[combinedName].target,
                multiplicity: newMetaPointers[combinedName].multiplicity
            };

            this._createConnection(gmeID, pointerTarget, ptrType, {
                name: pointerName,
                dstText: newMetaPointers[combinedName].multiplicity,
                dstTextEdit: true
            });
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
            newMetaInheritance = node.getBaseId();

        //if there was a valid old that's different than the current, delete the connection representing the old
        oldMetaInheritance = this._nodeMetaInheritance[gmeID];
        if (oldMetaInheritance && (oldMetaInheritance !== newMetaInheritance)) {
            this._removeConnection(gmeID, oldMetaInheritance, MetaRelations.META_RELATIONS.INHERITANCE);

            delete this._nodeMetaInheritance[gmeID];
        }

        if (newMetaInheritance && (oldMetaInheritance !== newMetaInheritance)) {
            this._nodeMetaInheritance[gmeID] = newMetaInheritance;
            this._createConnection(gmeID, newMetaInheritance, MetaRelations.META_RELATIONS.INHERITANCE, undefined);
        }
    };
    /**********************************************************************************************/
    /*  END OF --- DISPLAY META CONTAINMENT RELATIONS AS A CONNECTION FROM PARENT TO OBJECT       */
    /**********************************************************************************************/

    MetaEditorControl.prototype._processNodeMixins = function (gmeID) {
        var node = this._client.getNode(gmeID),
            oldMixins,
            newMixins = node.getMixinPaths(),
            i;

        this.logger.debug('processing mixins for [' + gmeID + ']');

        // If there was a valid old that's different than the current, delete the connection representing the old.
        oldMixins = this._nodeMixins[gmeID] || [];

        for (i = 0; i < oldMixins.length; i += 1) {
            if (newMixins.indexOf(oldMixins[i]) === -1) {
                this._removeConnection(gmeID, oldMixins[i], MetaRelations.META_RELATIONS.MIXIN);
            }
        }

        for (i = 0; i < newMixins.length; i += 1) {
            if (oldMixins.indexOf(newMixins[i]) === -1) {
                this._createConnection(gmeID, newMixins[i], MetaRelations.META_RELATIONS.MIXIN, undefined);
            }
        }
        this._nodeMixins[gmeID] = newMixins;
    };

    /****************************************************************************/
    /*        CREATE NEW CONNECTION BUTTONS AND THEIR EVENT HANDLERS            */
    /****************************************************************************/

    MetaEditorControl.prototype._setNewConnectionType = function (connType) {
        var connProps = MetaRelations.getLineVisualDescriptor(connType),
            temp;

        if (this._connType !== connType) {
            this._connType = connType;

            if (connType === MetaRelations.META_RELATIONS.CONTAINMENT) {
                //for METACONTAINMENT AND INHERITANCE flip the visual end arrow style for drawing only
                temp = connProps[DiagramDesignerWidgetConstants.LINE_START_ARROW];

                connProps[DiagramDesignerWidgetConstants.LINE_START_ARROW] =
                    connProps[DiagramDesignerWidgetConstants.LINE_END_ARROW];

                connProps[DiagramDesignerWidgetConstants.LINE_END_ARROW] = temp;
            }

            connProps[DiagramDesignerWidgetConstants.LINE_WIDTH] = 2;

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

        switch (this._connType) {
            case MetaRelations.META_RELATIONS.CONTAINMENT:
                this._createContainmentRelationship(targetId, sourceId);
                break;
            case MetaRelations.META_RELATIONS.INHERITANCE:
                this._createInheritanceRelationship(sourceId, targetId);
                break;
            case MetaRelations.META_RELATIONS.POINTER:
                this._createPointerRelationship(sourceId, targetId, false);
                break;
            case MetaRelations.META_RELATIONS.SET:
                this._createPointerRelationship(sourceId, targetId, true);
                break;
            case MetaRelations.META_RELATIONS.MIXIN:
                this._createMixinRelationship(sourceId, targetId);
                break;
            default:
                break;
        }
    };

    MetaEditorControl.prototype._createContainmentRelationship = function (containerID, objectID) {
        var containerNode = this._client.getNode(containerID),
            objectNode = this._client.getNode(objectID);

        if (containerNode && objectNode) {
            this._client.setChildMeta(containerID, objectID);
        }
    };

    MetaEditorControl.prototype._deleteContainmentRelationship = function (containerID, objectID) {
        var containerNode = this._client.getNode(containerID),
            objectNode = this._client.getNode(objectID);

        if (containerNode && objectNode) {
            this._client.delChildMeta(containerID, objectID);
        }
    };

    MetaEditorControl.prototype._createPointerRelationship = function (sourceID, targetID, isSet) {
        var client = this._client,
            sourceNode = client.getNode(sourceID),
            targetNode = client.getNode(targetID),
            pointerMetaDescriptor,
            existingNames,
            existingPointerNames,
            notAllowedPointerNames;

        function getExistingNames() {
            // This does not include collision in the derived types,
            // however that is being checked by the meta-rules checker.
            return {
                pointers: sourceNode.getValidPointerNames() || [],
                sets: sourceNode.getValidSetNames() || [],
                aspects: sourceNode.getValidAspectNames() || []
            };
        }

        if (sourceNode && targetNode) {
            existingNames = getExistingNames();

            if (isSet === true) {
                //this is a set
                existingPointerNames = existingNames.sets;
                notAllowedPointerNames = _.union(existingNames.pointers, existingNames.aspects);
            } else {
                //this is a single pointer
                existingPointerNames = existingNames.pointers;
                notAllowedPointerNames = existingNames.sets;
            }

            // Reserved names are handled in the dialog.
            //query pointer name from user
            this.diagramDesigner.selectNewPointerName(existingPointerNames,
                notAllowedPointerNames,
                isSet,
                function (userSelectedPointerName) {
                    client.startTransaction();
                    pointerMetaDescriptor = client.getOwnValidTargetItems(sourceID, userSelectedPointerName);
                    if (!pointerMetaDescriptor) {
                        if (isSet !== true) {
                            //single pointer
                            client.setPointerMeta(sourceID, userSelectedPointerName, {
                                min: 1,
                                max: 1,
                                items: [
                                    {
                                        id: targetID,
                                        max: 1
                                    }
                                ]
                            });
                            client.setPointer(sourceID, userSelectedPointerName, null);
                        } else {
                            //pointer list
                            client.setPointerMeta(sourceID, userSelectedPointerName, {
                                items: [
                                    {
                                        id: targetID
                                    }
                                ]
                            });
                            client.createSet(sourceID, userSelectedPointerName);
                        }
                    } else {
                        if (isSet !== true) {
                            //single pointer
                            client.setPointerMetaTarget(sourceID,
                                userSelectedPointerName,
                                targetID,
                                -1,
                                1);
                        } else {
                            //pointer list
                            client.setPointerMetaTarget(sourceID,
                                userSelectedPointerName,
                                targetID,
                                -1,
                                -1);
                        }
                    }

                    client.completeTransaction();
                });
        }
    };

    MetaEditorControl.prototype._deletePointerRelationship = function (sourceID, targetID, pointerName, isSet) {
        var sourceNode = this._client.getNode(sourceID),
            targetNode = this._client.getNode(targetID),
            pointerMetaDescriptor;

        //NOTE: this method is called from inside a transaction, don't need to start/complete one

        if (sourceNode && targetNode) {
            this._client.delPointerMetaTarget(sourceID, pointerName, targetID);
            pointerMetaDescriptor = this._client.getValidTargetItems(sourceID, pointerName);
            if (!pointerMetaDescriptor || pointerMetaDescriptor.length === 0) {
                if (isSet === false) {
                    //single pointer
                    this._client.delPointerMeta(sourceID, pointerName);
                    this._client.delPointer(sourceID, pointerName);
                } else {
                    //pointer list
                    this._client.delPointerMeta(sourceID, pointerName);
                    this._client.deleteSet(sourceID, pointerName);
                }
            }
        }
    };

    MetaEditorControl.prototype._createInheritanceRelationship = function (objectID, newBaseID) {
        var newBaseNode = this._client.getNode(newBaseID),
            objectNode = this._client.getNode(objectID),
            objectBase;

        if (newBaseNode && objectNode) {
            objectBase = objectNode.getBaseId();

            if (objectBase && !_.isEmpty(objectBase)) {
                this.logger.debug('InheritanceRelationship from "' +
                    objectNode.getAttribute(nodePropertyNames.Attributes.name) +
                    '" (' + objectID + ') to parent "' + objectBase + '" already exists, but overwriting to "' +
                    newBaseNode.getAttribute(nodePropertyNames.Attributes.name) + '" (' + newBaseID + ')"');
            }

            this._client.setBase(objectID, newBaseID);
        }
    };

    MetaEditorControl.prototype._deleteInheritanceRelationship = function (parentID, objectID) {
        var objectNode = this._client.getNode(objectID),
            objectBaseId,
            baseNode;

        if (objectNode) {
            objectBaseId = objectNode.getBaseId();

            if (objectBaseId) {
                baseNode = this._client.getNode(objectBaseId);
                if (baseNode) {
                    objectBaseId = baseNode.getAttribute(nodePropertyNames.Attributes.name) + ' (' + objectBaseId + ')';
                }
                /*this.logger.debug('Deleting InheritanceRelationship from "' +
                 objectNode.getAttribute(nodePropertyNames.Attributes.name) + '" (' + objectID + ') to parent "' +
                 objectBaseId + '"');
                 this._client.delBase(objectID);*/
                //TEMPORARILY DO NOT ALLOW DELETING INHERITANCE RELATIONSHIP
                this.logger.error('Deleting InheritanceRelationship from "' +
                    objectNode.getAttribute(nodePropertyNames.Attributes.name) + '" (' + objectID +
                    ') to parent "' + objectBaseId + '" is not allowed...');
            }
        }
    };

    MetaEditorControl.prototype._createMixinRelationship = function (objectId, newMixinId) {
        var newBaseNode = this._client.getNode(newMixinId),
            objectNode = this._client.getNode(objectId),
            objectBase;

        if (newBaseNode && objectNode) {
            this._client.addMixin(objectId, newMixinId);
        } else {
            this.logger.error('cannot set [' + newMixinId + '] as mixin for [' + objectId +
                '] because not all node are loaded');
        }
    };

    MetaEditorControl.prototype._deleteMixinRelationship = function (objectId, mixinToRemoveId) {
        var newBaseNode = this._client.getNode(mixinToRemoveId),
            objectNode = this._client.getNode(objectId),
            objectBase;

        if (newBaseNode && objectNode) {
            this._client.delMixin(objectId, mixinToRemoveId);
        } else {
            this.logger.error('cannot remove [' + newMixinId + '] mixin from [' + objectId +
                '] because not all node are loaded');
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

        filterIcon = MetaRelations.createButtonIcon(MetaRelations.META_RELATIONS.CONTAINMENT);
        this.diagramDesigner.addFilterItem('Containment', MetaRelations.META_RELATIONS.CONTAINMENT, filterIcon);

        filterIcon = MetaRelations.createButtonIcon(MetaRelations.META_RELATIONS.POINTER);
        this.diagramDesigner.addFilterItem('Pointer', MetaRelations.META_RELATIONS.POINTER, filterIcon);

        filterIcon = MetaRelations.createButtonIcon(MetaRelations.META_RELATIONS.INHERITANCE);
        this.diagramDesigner.addFilterItem('Inheritance', MetaRelations.META_RELATIONS.INHERITANCE, filterIcon);

        filterIcon = MetaRelations.createButtonIcon(MetaRelations.META_RELATIONS.MIXIN);
        this.diagramDesigner.addFilterItem('Mixin', MetaRelations.META_RELATIONS.MIXIN, filterIcon);

        filterIcon = MetaRelations.createButtonIcon(MetaRelations.META_RELATIONS.SET);
        this.diagramDesigner.addFilterItem('Set', MetaRelations.META_RELATIONS.SET, filterIcon);
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
        var len = this._connectionListByType &&
            this._connectionListByType.hasOwnProperty(connType) ? this._connectionListByType[connType].length : 0,
            connComponentId,
            gmeSrcId,
            gmeDstId,
            connTexts,
            pointerOrSetName;

        this._filteredOutConnectionDescriptors[connType] = [];

        this.diagramDesigner.beginUpdate();

        while (len--) {
            connComponentId = this._connectionListByType[connType][len];

            gmeSrcId = this._connectionListByID[connComponentId].GMESrcId;
            gmeDstId = this._connectionListByID[connComponentId].GMEDstId;
            connTexts = this._connectionListByID[connComponentId].connTexts;

            if (connType === MetaRelations.META_RELATIONS.POINTER || connType === MetaRelations.META_RELATIONS.SET) {
                pointerOrSetName = this._connectionListByID[connComponentId].name;
            }

            this._filteredOutConnectionDescriptors[connType].push([gmeSrcId, gmeDstId, connTexts]);

            this._removeConnection(gmeSrcId, gmeDstId, connType, pointerOrSetName);
        }

        this.diagramDesigner.endUpdate();
    };

    MetaEditorControl.prototype._unfilterConnType = function (connType) {
        //FIXME: What does this mean?
        var len = this._filteredOutConnectionDescriptors &&
            this._filteredOutConnectionDescriptors.hasOwnProperty(connType) ?
                this._filteredOutConnectionDescriptors[connType].length : 0,
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

    /****************************************************************************/
    /*                    CONNECTION DESTINATION TEXT CHANGE                    */
    /****************************************************************************/

    MetaEditorControl.prototype._onConnectionDstTextChanged = function (connectionID, oldValue, newValue) {
        var connDesc = this._connectionListByID[connectionID];

        if (connDesc.type === MetaRelations.META_RELATIONS.CONTAINMENT) {
            this._containmentRelationshipMultiplicityUpdate(connDesc.GMESrcId, connDesc.GMEDstId, oldValue, newValue);
        } else if (connDesc.type === MetaRelations.META_RELATIONS.POINTER) {
            this._pointerRelationshipMultiplicityUpdate(connDesc.GMESrcId,
                connDesc.GMEDstId,
                connDesc.name,
                oldValue,
                newValue);
        } else if (connDesc.type === MetaRelations.META_RELATIONS.INHERITANCE) {
            //never can happen
        } else if (connDesc.type === MetaRelations.META_RELATIONS.SET) {
            this._setRelationshipMultiplicityUpdate(connDesc.GMESrcId,
                connDesc.GMEDstId,
                connDesc.name,
                oldValue,
                newValue);
        }
    };

    MetaEditorControl.prototype._containmentRelationshipMultiplicityUpdate = function (containerID, objectID, oldValue,
                                                                                       newValue) {
        var containerNode = this._client.getNode(containerID),
            objectNode = this._client.getNode(objectID),
            multiplicity,
            multiplicityValid;

        multiplicityValid = function (value) {
            var result = null,
                pattNum = /^\d+$/g,
                pattMinToMax = /^\d+\.\.\d+$/g,
                pattMinToMany = /^\d+\.\.\*$/g;

            //valid values for containment are 1, x..*, x..y
            if (pattNum.test(value)) {
                //#1: single digit number
                result = {
                    min: parseInt(value, 10),
                    max: parseInt(value, 10)
                };
            } else if (pattMinToMax.test(value)) {
                //#2: x..y
                result = {
                    min: parseInt(value, 10),
                    max: parseInt(value.substring(value.indexOf('..') + 2), 10)
                };
            } else if (pattMinToMany.test(value)) {
                //#3: x..*
                result = {
                    min: parseInt(value, 10),
                    max: -1
                };
            }

            return result;
        };

        if (containerNode && objectNode) {
            multiplicity = multiplicityValid(newValue);
            if (multiplicity) {
                this._client.setChildMeta(containerID, objectID, multiplicity.min, multiplicity.max);
            } else {
                this._updateConnectionText(containerID, objectID, MetaRelations.META_RELATIONS.CONTAINMENT, {
                    dstText: oldValue,
                    dstTextEdit: true
                });
            }
        }
    };

    MetaEditorControl.prototype._pointerRelationshipMultiplicityUpdate = function (sourceID, targetID, pointerName,
                                                                                   oldValue, newValue) {
        var sourceNode = this._client.getNode(sourceID),
            targetNode = this._client.getNode(targetID),
            multiplicityValid,
            multiplicity;

        multiplicityValid = function (value) {
            var result,
                pattOne = '1',
                pattZeroOne = '0..1';

            //valid values for pointer are: 1, 0..1
            if (value === pattOne) {
                //#1: single digit number
                result = {
                    min: 1,
                    max: 1
                };
            } else if (value === pattZeroOne) {
                result = {
                    min: 0,
                    max: 1
                };
            }

            return result;
        };

        if (sourceNode && targetNode) {
            multiplicity = multiplicityValid(newValue);
            if (multiplicity) {
                this._client.setPointerMetaTarget(sourceID, pointerName, targetID, multiplicity.min, multiplicity.max);
            } else {
                this._updateConnectionText(sourceID, targetID, MetaRelations.META_RELATIONS.POINTER, {
                    name: pointerName,
                    dstText: oldValue,
                    dstTextEdit: true
                });
            }
        }
    };

    MetaEditorControl.prototype._setRelationshipMultiplicityUpdate = function (sourceID, targetID, pointerName,
                                                                               oldValue, newValue) {
        var sourceNode = this._client.getNode(sourceID),
            targetNode = this._client.getNode(targetID),
            multiplicityValid,
            multiplicity;

        multiplicityValid = function (value) {
            var result = null,
                pattNum = /^\d+$/g,
                pattMinToMax = /^\d+\.\.\d+$/g,
                pattMinToMany = /^\d+\.\.\*$/g;

            //valid value for pointer list are: 1, x..*, x..y
            if (pattNum.test(value)) {
                //#1: single digit number
                result = {
                    min: parseInt(value, 10),
                    max: parseInt(value, 10)
                };
            } else if (pattMinToMax.test(value)) {
                //#2: x..y
                result = {
                    min: parseInt(value, 10),
                    max: parseInt(value.substring(value.indexOf('..') + 2), 10)
                };
            } else if (pattMinToMany.test(value)) {
                //#3: x..*
                result = {
                    min: parseInt(value, 10),
                    max: -1
                };
            }

            return result;
        };

        if (sourceNode && targetNode) {
            multiplicity = multiplicityValid(newValue);
            if (multiplicity) {
                this._client.setPointerMetaTarget(sourceID, pointerName, targetID, multiplicity.min, multiplicity.max);
            } else {
                this._updateConnectionText(sourceID, targetID, MetaRelations.META_RELATIONS.SET, {
                    name: pointerName,
                    dstText: oldValue,
                    dstTextEdit: true
                });
            }
        }
    };

    /****************************************************************************/
    /*               END OF --- CONNECTION DESTINATION TEXT CHANGE              */
    /****************************************************************************/
    MetaEditorControl.prototype._stateActiveSelectionChanged = function (model, activeSelection, opts) {
        var selectedIDs = [],
            len = activeSelection ? activeSelection.length : 0;

        if (opts.invoker !== this) {

            while (len--) {
                if (this._GMEID2ComponentID.hasOwnProperty(activeSelection[len])) {
                    selectedIDs = selectedIDs.concat(this._GMEID2ComponentID[activeSelection[len]]);
                }
            }

            this.diagramDesigner.select(selectedIDs);
        }
    };

    MetaEditorControl.prototype._stateActiveTabChanged = function (model, tabId) {
        this._onSelectedTabChanged(tabId);
    };

    MetaEditorControl.prototype._attachClientEventListeners = function () {
        this._detachClientEventListeners();
        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_SELECTION, this._stateActiveSelectionChanged, this);
        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_TAB, this._stateActiveTabChanged, this);
    };

    MetaEditorControl.prototype._detachClientEventListeners = function () {
        WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_SELECTION, this._stateActiveSelectionChanged);
        WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_TAB, this._stateActiveTabChanged);
    };

    MetaEditorControl.prototype.onActivate = function () {
        if (this._selectedSheetID) {
            WebGMEGlobal.State.registerActiveTab(this._selectedSheetID);
        }

        if (this.currentNodeInfo && typeof this.currentNodeInfo.id === 'string') {
            WebGMEGlobal.State.registerActiveObject(this.currentNodeInfo.id, {suppressVisualizerFromNode: true});
        }

        this._attachClientEventListeners();
        this._displayToolbarItems();
    };

    MetaEditorControl.prototype.onDeactivate = function () {
        this._detachClientEventListeners();
        this._hideToolbarItems();
    };

    MetaEditorControl.prototype._displayToolbarItems = function () {
        if (this._toolbarInitialized !== true) {
            this._initializeToolbar();
        } else {
            for (var i = 0; i < this._toolbarItems.length; i++) {
                this._toolbarItems[i].show();
            }
        }
    };

    MetaEditorControl.prototype._hideToolbarItems = function () {
        if (this._toolbarInitialized === true) {
            for (var i = 0; i < this._toolbarItems.length; i++) {
                this._toolbarItems[i].hide();
            }
        }
    };

    MetaEditorControl.prototype._removeToolbarItems = function () {
        if (this._toolbarInitialized === true) {
            for (var i = 0; i < this._toolbarItems.length; i++) {
                this._toolbarItems[i].destroy();
            }
        }
    };

    MetaEditorControl.prototype._initializeToolbar = function () {
        var toolBar = WebGMEGlobal.Toolbar,
            self = this;

        this._toolbarItems = [];

        /****************** ADD BUTTONS AND THEIR EVENT HANDLERS TO DIAGRAM DESIGNER ******************/

        /************** CREATE META RELATION CONNECTION TYPES *****************/
        this._radioButtonGroupMetaRelationType = toolBar.addRadioButtonGroup(function (data) {
            self._setNewConnectionType(data.connType);
        });
        this._toolbarItems.push(this._radioButtonGroupMetaRelationType);

        this._radioButtonGroupMetaRelationType.addButton({
            title: 'Containment',
            selected: true,
            data: {connType: MetaRelations.META_RELATIONS.CONTAINMENT},
            icon: MetaRelations.createButtonIcon(MetaRelations.META_RELATIONS.CONTAINMENT)
        });

        this._radioButtonGroupMetaRelationType.addButton({
            title: 'Inheritance',
            selected: false,
            data: {connType: MetaRelations.META_RELATIONS.INHERITANCE},
            icon: MetaRelations.createButtonIcon(MetaRelations.META_RELATIONS.INHERITANCE)
        });

        this._radioButtonGroupMetaRelationType.addButton({
            title: 'Mixin',
            selected: false,
            data: {connType: MetaRelations.META_RELATIONS.MIXIN},
            icon: MetaRelations.createButtonIcon(MetaRelations.META_RELATIONS.MIXIN)
        });

        this._radioButtonGroupMetaRelationType.addButton({
            title: 'Pointer',
            selected: false,
            data: {connType: MetaRelations.META_RELATIONS.POINTER},
            icon: MetaRelations.createButtonIcon(MetaRelations.META_RELATIONS.POINTER)
        });

        this._radioButtonGroupMetaRelationType.addButton({
            title: 'Set',
            selected: false,
            data: {connType: MetaRelations.META_RELATIONS.SET},
            icon: MetaRelations.createButtonIcon(MetaRelations.META_RELATIONS.SET)
        });

        this._toolbarItems.push(toolBar.addSeparator());
        this._toolbarItems.push(toolBar.addDragItem({
            icon: 'fa fa-file-text-o',
            title: 'Drag to create Meta Documentation',
            dragParams: function () {
                return MetaEditorConstants.CREATE_META_DOC;
            }
        }));

        this._toolbarItems.push(toolBar.addButton({
            icon: 'fa fa-check-circle-o',
            title: 'Check consistency of Meta',
            clickFn: function () {
                var results = self._client.checkMetaConsistency();
                self.diagramDesigner.showMetaConsistencyResults(results);
                if (results.length === 0) {
                    self._client.dispatchEvent(self._client.CONSTANTS.NOTIFICATION, {
                        severity: 'success',
                        message: 'No inconsistencies found in meta-model.'
                    });
                }
            }
        }));

        /************** END OF - CREATE META RELATION CONNECTION TYPES *****************/

        /************** PRINT NODE DATA *****************/
        // TODO removed, but could be reimplemented if needed such function
        //this._btnPrintNodeMetaData = toolBar.addButton({ "title": "Print node META data",
        //    "icon": "glyphicon glyphicon-share",
        //    "clickFn": function (/*data*/){
        //        self._printNodeData();
        //    }});
        //this._toolbarItems.push(this._btnPrintNodeMetaData);
        /************** END OF - PRINT NODE DATA *****************/

        /****************** END OF - ADD BUTTONS AND THEIR EVENT HANDLERS TO DESIGNER CANVAS ******************/


        this._toolbarInitialized = true;
    };

    MetaEditorControl.prototype._getAssociatedConnections = function (objectID) {
        var result = {src: [], dst: []},
            len,
            cID,
            checkConnections;

        checkConnections = function (cList, res) {

            var otherID,
                connType;

            //check objectID as source
            if (cList.hasOwnProperty(objectID)) {
                for (otherID in cList[objectID]) {
                    if (cList[objectID].hasOwnProperty(otherID)) {
                        for (connType in cList[objectID][otherID]) {
                            if (cList[objectID][otherID].hasOwnProperty(connType)) {
                                len = cList[objectID][otherID][connType].length;
                                while (len--) {
                                    cID = cList[objectID][otherID][connType][len];
                                    if (res.indexOf(cID) === -1) {
                                        res.push(cID);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        checkConnections(this._connectionListBySrcGMEID, result.src);
        checkConnections(this._connectionListByDstGMEID, result.dst);

        return result;
    };

    MetaEditorControl.prototype._processMetaAspectSheetsRegistry = function () {
        var aspectNode = this._client.getNode(this.metaAspectContainerNodeID),
            metaAspectSheetsRegistry = aspectNode.getEditableRegistry(REGISTRY_KEYS.META_SHEETS) || [],
            docItem,
            prevDocItemsPerSheet,
            docItemsIds,
            i,
            len,
            sheetID,
            selectedSheetID,
            setName,
            j,
            gmeID;

        //save old positions
        var oldMetaAspectMembersCoordinatesPerSheet = this._metaAspectMembersCoordinatesPerSheet;

        this._sheets = {};
        this._metaAspectMembersPerSheet = {};
        this._metaAspectMembersCoordinatesPerSheet = {};
        this.diagramDesigner.clearTabs();
        this._metaAspectSheetsPerMember = {};
        prevDocItemsPerSheet = this._metaDocItemsPerSheet;

        this._metaDocItemsPerSheet = {};

        metaAspectSheetsRegistry.sort(function (a, b) {
            if (a.order < b.order) {
                return -1;
            } else {
                return 1;
            }
        });

        //here we have the metaAspectRegistry ordered by user defined order
        this.diagramDesigner.addMultipleTabsBegin();
        len = metaAspectSheetsRegistry.length;
        for (i = 0; i < len; i += 1) {
            setName = metaAspectSheetsRegistry[i].SetID;

            sheetID = this.diagramDesigner.addTab(metaAspectSheetsRegistry[i].title, true, true);

            this._sheets[sheetID] = setName;

            //get the most up-to-date member list for each set
            this._metaAspectMembersPerSheet[setName] = aspectNode.getMemberIds(setName);

            // Gather the documentation items for each sheet
            this._metaDocItemsPerSheet[setName] = {};
            docItemsIds = aspectNode.getSetRegistryNames(setName);

            for (j = 0; j < docItemsIds.length; j += 1) {
                if (docItemsIds[j].indexOf(MetaEditorConstants.META_DOC_REGISTRY_PREFIX) === 0) {
                    // Check if the doc item object already existed..
                    if (prevDocItemsPerSheet[setName] && prevDocItemsPerSheet[setName][docItemsIds[j]]) {
                        // if so update with the new data..
                        docItem = prevDocItemsPerSheet[setName][docItemsIds[j]];
                        docItem.update();
                    } else {
                        // if not we create a new item.
                        docItem = new MetaDocItem(this._client, aspectNode.getId(), setName, docItemsIds[j]);
                    }

                    this._metaDocItemsPerSheet[setName][docItemsIds[j]] = docItem;
                }
            }

            //TODO: debug check to see if root for any reason is present among the members list
            //TODO: remove, not needed, just for DEGUG reasons...
            //TODO: it should never happen because it leads to double refresh when ROOT changes
            //TODO: when onOneEvent will be eliminated this will not be an issue anymore
            if (this._metaAspectMembersPerSheet[setName].indexOf(CONSTANTS.PROJECT_ROOT_ID) > -1) {
                this.logger.error('ROOT is in MetaSet: ' + setName);
            }

            //get the sheet coordinates
            this._metaAspectMembersCoordinatesPerSheet[setName] = {};
            j = this._metaAspectMembersPerSheet[setName].length;
            while (j--) {
                gmeID = this._metaAspectMembersPerSheet[setName][j];
                this._metaAspectMembersCoordinatesPerSheet[setName][gmeID] = aspectNode.getMemberRegistry(setName,
                    gmeID,
                    REGISTRY_KEYS.POSITION);
                this._metaAspectSheetsPerMember[gmeID] = this._metaAspectSheetsPerMember[gmeID] || [];
                this._metaAspectSheetsPerMember[gmeID].push(setName);
            }

            if (this._selectedMetaAspectSet &&
                this._selectedMetaAspectSet === metaAspectSheetsRegistry[i].SetID) {
                selectedSheetID = sheetID;
            }
        }

        this.diagramDesigner.addMultipleTabsEnd();

        //figure out whose position has changed
        var positionUpdated = [];
        if (this._selectedMetaAspectSet) {
            var oldPositions = oldMetaAspectMembersCoordinatesPerSheet[this._selectedMetaAspectSet];
            var newPositions = this._metaAspectMembersCoordinatesPerSheet[this._selectedMetaAspectSet];
            if (oldPositions && newPositions) {
                for (var oldItemId in oldPositions) {
                    if (oldPositions.hasOwnProperty(oldItemId) && newPositions.hasOwnProperty(oldItemId)) {
                        if (!oldPositions[oldItemId]) {
                            positionUpdated.push(oldItemId);
                        } else if (oldPositions[oldItemId].x !== newPositions[oldItemId].x ||
                            oldPositions[oldItemId].y !== newPositions[oldItemId].y) {
                            positionUpdated.push(oldItemId);
                        }
                    }
                }
            }
        }

        //setting selectedSheetID from global STATE
        if (WebGMEGlobal.State.getActiveTab() !== null && WebGMEGlobal.State.getActiveTab() !== undefined &&
            metaAspectSheetsRegistry.length > WebGMEGlobal.State.getActiveTab()) {

            //only the active panel should react to the global state
            if (WebGMEGlobal.PanelManager._activePanel.control === this) {
                selectedSheetID = WebGMEGlobal.State.getActiveTab().toString();
            } else {
                for (selectedSheetID in this._sheets || {}) {
                    if (this._sheets[selectedSheetID] === this._selectedMetaAspectSet) {
                        break;
                    }
                }
            }
        }

        if (!selectedSheetID) {
            for (selectedSheetID in this._sheets) {
                if (this._sheets.hasOwnProperty(selectedSheetID)) {
                    break;
                }
            }
        }

        this._selectedSheetID = selectedSheetID;
        this.diagramDesigner.selectTab(selectedSheetID);

        return positionUpdated;
    };

    MetaEditorControl.prototype._initializeSelectedSheet = function () {
        var len,
            self = this;

        this.logger.debug('_initializeSelectedSheet');

        //delete everything from model editor
        this.diagramDesigner.clear();

        //clean up local hash maps
        this._GMENodes = [];

        this._GMEID2ComponentID = {};
        this._ComponentID2GMEID = {};

        this._ComponentID2DocItemID = {};
        this._DocItemID2ComponentID = {};

        this._connectionWaitingListByDstGMEID = {};
        this._connectionWaitingListBySrcGMEID = {};

        this._connectionListBySrcGMEID = {};
        this._connectionListByDstGMEID = {};
        this._connectionListByType = {};
        this._connectionListByID = {};

        this._nodeMetaContainment = {};
        this._nodeMetaPointers = {};
        this._nodeMetaSets = {};
        this._nodeMetaInheritance = {};
        this._nodeMixins = [];

        this._selectedMetaAspectSheetMembers = [];

        this._filteredOutConnectionDescriptors = {};
        len = this._filteredOutConnTypes.length;
        while (len--) {
            this._filteredOutConnectionDescriptors[this._filteredOutConnTypes[len]] = [];
        }

        //remove current territory patterns
        if (this._metaAspectMembersTerritoryId) {
            this._client.removeUI(this._metaAspectMembersTerritoryId);
        }

        this._metaAspectMemberPatterns = {};

        if (this._selectedMetaAspectSet && this._metaAspectMembersPerSheet[this._selectedMetaAspectSet]) {
            len = this._metaAspectMembersPerSheet[this._selectedMetaAspectSet].length;
            if (len > 0) {
                this.diagramDesigner.showProgressbar();
            }
            while (len--) {
                this._selectedMetaAspectSheetMembers.push(
                    this._metaAspectMembersPerSheet[this._selectedMetaAspectSet][len]);

                this._metaAspectMemberPatterns[this._metaAspectMembersPerSheet[this._selectedMetaAspectSet][len]] =
                {children: 0};
            }
        }

        this._processMetaDocItems();

        this._metaAspectMembersTerritoryId = this._client.addUI(this, function (events) {
            self._eventCallback(events);
        });

        this._client.updateTerritory(this._metaAspectMembersTerritoryId, this._metaAspectMemberPatterns);
    };

    MetaEditorControl.prototype.setReadOnly = function (isReadOnly) {
        this._radioButtonGroupMetaRelationType.enabled(!isReadOnly);
    };

    MetaEditorControl.getDefaultConfig = function () {
        return {
            autoCheckMetaConsistency: true
        };
    };

    MetaEditorControl.getComponentId = function () {
        return 'GenericUIMetaEditorControl';
    };

    //attach MetaEditorControl - DiagramDesigner event handler functions
    _.extend(MetaEditorControl.prototype, MetaEditorControlDiagramDesignerWidgetEventHandlers.prototype);

    return MetaEditorControl;
});
