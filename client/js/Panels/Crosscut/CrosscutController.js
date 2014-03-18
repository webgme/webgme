"use strict";

define(['logManager',
    'js/RegistryKeys',
    'js/Constants',
    './CrosscutConstants',
    'js/DragDrop/DragHelper',
    'js/Utils/GMEConcepts',
    'js/Panels/ControllerBase/DiagramDesignerWidgetMultiTabMemberListControllerBase',
    'js/Panels/MetaEditor/MetaRelations'], function (logManager,
                                             REGISTRY_KEYS,
                                             CONSTANTS,
                                               CrosscutConstants,
                                               DragHelper,
                                               GMEConcepts,
                                               DiagramDesignerWidgetMultiTabMemberListControllerBase,
                                               MetaRelations) {

    var CrosscutController,
        DEFAULT_DECORATOR = "ModelDecorator",
        WIDGET_NAME = 'DiagramDesigner';

    CrosscutController = function (options) {
        options = options || {};
        options.loggerName = "CrosscutController";

        DiagramDesignerWidgetMultiTabMemberListControllerBase.call(this, options);

        this._filteredOutConnTypes = [];
        this._filteredOutConnectionDescriptors = {};

        this.logger.debug("CrosscutController ctor finished");
    };

    _.extend(CrosscutController.prototype, DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype);

    //enable every node
    CrosscutController.prototype._validateNodeId = function (nodeId) {
        return nodeId;
    };

    CrosscutController.prototype._updateSelectedMemberListMembersTerritoryPatterns = function () {
        var currentlyDisplayedMembers = (this._selectedMemberListMembers || []).slice(0),
            actualMembers = (this._memberListMembers[this._selectedMemberListID] || []).slice(0),
            diff,
            len,
            territoryChanged = false,
            territoryId = this._selectedMemberListMembersTerritoryId,
            territoryPatterns = this._selectedMemberListMembersTerritoryPatterns,
            client = this._client;

        //let's see who has been deleted
        diff = _.difference(currentlyDisplayedMembers, actualMembers);
        len = diff.length;
        while (len--) {
            delete territoryPatterns[diff[len]];
            territoryChanged = true;
        }

        //let's see who has been added
        diff = _.difference(actualMembers, currentlyDisplayedMembers);
        len = diff.length;
        while (len--) {
            territoryPatterns[diff[len]] = { "children": 0 };
            territoryChanged = true;
        }

        //let's update the one that has not been changed but their position might have
        diff = _.intersection(actualMembers, currentlyDisplayedMembers);
        len = diff.length;
        this._widget.beginUpdate();
        while (len--) {
            this._onUpdate(diff[len]);
        }
        this._widget.endUpdate();

        //save current list of members
        this._selectedMemberListMembers = actualMembers;

        if (territoryChanged) {
            setTimeout( function () {
                client.updateTerritory(territoryId, territoryPatterns);
            }, 10);
        }
    };

    CrosscutController.prototype._initializeSelectedMemberList = function () {
        this._nodePointers = {};
        this._nodeSets = {};

        this._connectionListByType = {};

        DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._initializeSelectedMemberList.call(this);
    };

    CrosscutController.prototype._memberListTerritoryCallback = function (events) {
        var decoratorsToDownload = [DEFAULT_DECORATOR],
            len = events.length,
            obj,
            objDecorator,
            client = this._client,
            self = this;

        while (len--) {
            if ((events[len].etype === CONSTANTS.TERRITORY_EVENT_LOAD) || (events[len].etype === CONSTANTS.TERRITORY_EVENT_UPDATE)) {

                obj = client.getNode(events[len].eid);

                events[len].desc = { isConnection: GMEConcepts.isConnection(events[len].eid) };

                if (obj) {
                    //if it is a connection find src and dst and do not care about decorator
                    if (events[len].desc.isConnection === true) {
                        objDecorator = ""; //TODO: fix connectionDecorator
                        events[len].desc.isConnection = false;
                    } else {
                        objDecorator = obj.getRegistry(REGISTRY_KEYS.DECORATOR);
                    }

                    if (!objDecorator ||
                        objDecorator === "") {
                        objDecorator = DEFAULT_DECORATOR;
                    }

                    if (decoratorsToDownload.indexOf(objDecorator) === -1) {
                        decoratorsToDownload.pushUnique(objDecorator);
                    }

                    events[len].desc.decorator = objDecorator;
                }
            }
        }

        client.decoratorManager.download(decoratorsToDownload, WIDGET_NAME, function () {
            self._dispatchEvents(events);
        });
    };

    CrosscutController.prototype.getOrderedMemberListInfo = function (memberListContainerObject) {
        var result = [],
            crosscutsRegistry = memberListContainerObject.getRegistry(REGISTRY_KEYS.CROSSCUTS) || [],
            len = crosscutsRegistry.length;

        while (len--) {
            result.push({'memberListID': crosscutsRegistry[len].SetID,
                'title': crosscutsRegistry[len].title,
                'enableDeleteTab': true,
                'enableRenameTab': true});
        }

        result.sort(function (a,b) {
            if (a.order < b.order) {
                return -1;
            } else {
                return 1;
            }
        });

        return result;
    };


    CrosscutController.prototype.getMemberListSetsRegistryKey = function () {
        return REGISTRY_KEYS.CROSSCUTS;
    };


    CrosscutController.prototype.getNewSetNamePrefixDesc = function () {
        return {'SetID': CrosscutConstants.CROSSCUT_NAME_PREFIX,
            'Title': 'Crosscut '};
    };

    /*
     * Overwrite 'no tab' warning message to the user
     */
    CrosscutController.prototype.displayNoTabMessage = function () {
        this._widget.setBackgroundText('No crosscuts defined yet. Press the + button in the top-left corner to create one...');
    };


    /**********************************************************/
    /*         HANDLE OBJECT DRAG & DROP ACCEPTANCE           */
    /**********************************************************/
    CrosscutController.prototype._onBackgroundDroppableAccept = function(event, dragInfo) {
        var gmeIDList = DragHelper.getDragItems(dragInfo),
            accept = DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onBackgroundDroppableAccept.call(this, event, dragInfo);

        if (accept === true) {
            //if based on the DiagramDesignerWidgetMultiTabMemberListControllerBase check it could be accepted, ie items are not members of the set so far
            //we need to see if we can accept them based on the META rules
            accept = GMEConcepts.isValidChildrenTypeInCrossCut(this._memberListContainerID, gmeIDList);
        }

        return accept;
    };
    /**********************************************************/
    /*  END OF --- HANDLE OBJECT DRAG & DROP ACCEPTANCE       */
    /**********************************************************/


    CrosscutController.prototype._dispatchEvents = function (events) {
        var i,
            e,
            territoryChanged = false;

        this.logger.debug("_dispatchEvents '" + events.length + "' items: " + JSON.stringify(events));

        this._widget.beginUpdate();

        this._notifyPackage = {};

        //item insert/update/unload & connection unload
        for (i = 0; i < events.length; i += 1) {
            e = events[i];
            switch (e.etype) {
                case CONSTANTS.TERRITORY_EVENT_LOAD:
                    territoryChanged = this._onLoad(e.eid, e.desc) || territoryChanged;
                    break;
                case CONSTANTS.TERRITORY_EVENT_UPDATE:
                    this._onUpdate(e.eid);
                    break;
                case CONSTANTS.TERRITORY_EVENT_UNLOAD:
                    territoryChanged = this._onUnload(e.eid) || territoryChanged;
                    break;
            }
        }

        this._handleDecoratorNotification();

        this._widget.endUpdate();

        this._widget.hideProgressbar();

        //update the territory
        if (territoryChanged) {
            this.logger.debug('Updating territory with ruleset from decorators: ' + JSON.stringify(this._selfPatterns));

            this._client.updateTerritory(this._selectedMemberListMembersTerritoryId, this._selectedMemberListMembersTerritoryPatterns);
        }

        this.logger.debug("_dispatchEvents '" + events.length + "' items - DONE");
    };

    CrosscutController.prototype._onLoad = function (gmeID, desc) {
        var territoryChanged;

        desc.isConnection = false;

        territoryChanged = DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onLoad.call(this, gmeID, desc);

        //process new node to display containment / pointers / inheritance / sets as connections
        this._processNodePointers(gmeID, false);
        this._processNodePointers(gmeID, true);

        //check all the waiting pointers (whose SRC/DST is already displayed and waiting for the DST/SRC to show up)
        //it might be this new node
        this._processConnectionWaitingList(gmeID);

        return territoryChanged;
    };

    CrosscutController.prototype._onUpdate = function (gmeID, desc) {
        //component updated
        desc = desc || {};
        desc.isConnection = false;

        //we are interested in the load of member items and their custom territory involvement
        if (this._selectedMemberListMembers.indexOf(gmeID) !== -1 &&
            this._GMEID2ComponentID[gmeID]) {
            DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onUpdate.call(this, gmeID, desc);

            //process new node to display containment / pointers / inheritance / sets as connections
            this._processNodePointers(gmeID, false);
            this._processNodePointers(gmeID, true);

            //check all the waiting pointers (whose SRC/DST is already displayed and waiting for the DST/SRC to show up)
            //it might be this new node
            this._processConnectionWaitingList(gmeID);
        }
    };

    CrosscutController.prototype._onUnload = function (gmeID) {
        var componentID,
            len,
            territoryChanged = false,
            aConns,
            connectionID,
            pointerName,
            otherEnd;

        if (this._GMEID2ComponentID.hasOwnProperty(gmeID)) {

            //gather all the information that is stored in this node's META

            //POINTERS
            len = this._nodePointers[gmeID].combinedNames.length;
            while(len--) {
                pointerName = this._nodePointers[gmeID].combinedNames[len];
                otherEnd = this._nodePointers[gmeID][pointerName].target;
                pointerName = this._nodePointers[gmeID][pointerName].name;
                this._removeConnection(gmeID, otherEnd, MetaRelations.META_RELATIONS.POINTER, pointerName);
            }

            //POINTER LISTS
            len = this._nodeSets[gmeID].combinedNames.length;
            while(len--) {
                pointerName = this._nodeSets[gmeID].combinedNames[len];
                otherEnd = this._nodeSets[gmeID][pointerName].target;
                pointerName = this._nodeSets[gmeID][pointerName].name;
                this._removeConnection(gmeID, otherEnd, MetaRelations.META_RELATIONS.SET, pointerName);
            }

            len = this._GMEID2ComponentID[gmeID].length;
            while (len--) {
                componentID = this._GMEID2ComponentID[gmeID][len];

                if (this._widget.itemIds.indexOf(componentID) !== -1) {
                    territoryChanged = territoryChanged || this._updateDecoratorTerritoryQuery(this._widget.items[componentID]._decoratorInstance, true);
                }

                this._widget.deleteComponent(componentID);

                delete this._ComponentID2GMEID[componentID];
            }

            delete this._GMEID2ComponentID[gmeID];
        }

        //check if one of the decorators' is dependent on this
        this._checkComponentDependency(gmeID, CONSTANTS.TERRITORY_EVENT_UNLOAD);

        //check if there is any more connection present that's associated with this object
        //typically the connection end is this guy
        //if so, remove but save to savedList
        aConns = this._getAssociatedConnections(gmeID);
        len = aConns.src.length;
        while (len--) {
            connectionID = aConns.src[len];
            //save the connection to the waiting list, since the destination is still there
            this._saveConnectionToWaitingList(this._connectionListByID[connectionID].GMESrcId, this._connectionListByID[connectionID].GMEDstId, this._connectionListByID[connectionID].type, this._connectionListByID[connectionID].connTexts);
            this._removeConnection(this._connectionListByID[connectionID].GMESrcId, this._connectionListByID[connectionID].GMEDstId, this._connectionListByID[connectionID].type);
        }

        len = aConns.dst.length;
        while (len--) {
            connectionID = aConns.dst[len];
            if (this._connectionListByID[connectionID]) {
                //save the connection to the waiting list, since the destination is still there
                this._saveConnectionToWaitingList(this._connectionListByID[connectionID].GMESrcId, this._connectionListByID[connectionID].GMEDstId, this._connectionListByID[connectionID].type, this._connectionListByID[connectionID].connTexts);
                this._removeConnection(this._connectionListByID[connectionID].GMESrcId, this._connectionListByID[connectionID].GMEDstId, this._connectionListByID[connectionID].type);
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
        delete this._nodePointers[gmeID];
        delete this._nodeSets[gmeID];

        return territoryChanged;
    };


    CrosscutController.prototype._getAssociatedConnections =  function (objectID) {
        var result = {'src': [], 'dst': []},
            otherID,
            connType,
            len,
            cID,
            checkConnections;

        checkConnections = function (cList, res) {
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


    /*******************************************************************************/
    /*  DISPLAY META POINTER RELATIONS AS A CONNECTION FROM CONTAINER TO CONTAINED */
    /*******************************************************************************/
    CrosscutController.prototype._processNodePointers = function (gmeID, isSet) {
        var node = this._client.getNode(gmeID),
            pointerNames = isSet === true ? node.getSetNames() : node.getPointerNames(),
            pointerTo,
            len,
            oldPointers,
            newPointers = {'names': [], 'combinedNames': []},
            diff,
            pointerTarget,
            pointerName,
            idx,
            combinedName,
            ptrType = isSet === true ? MetaRelations.META_RELATIONS.SET : MetaRelations.META_RELATIONS.POINTER;

        if (isSet !== true) {
            this._nodePointers[gmeID] = this._nodePointers[gmeID] || {'names': [], 'combinedNames': []};
            oldPointers = this._nodePointers[gmeID];
        } else {
            this._nodeSets[gmeID] = this._nodeSets[gmeID] || {'names': [], 'combinedNames': []};
            oldPointers = this._nodeSets[gmeID];
        }

        len = pointerNames.length;
        while (len--) {
            pointerTo = node.getPointer(pointerNames[len]).to;

            if (pointerTo) {
                combinedName = gmeID + "_" + pointerNames[len] + "_" + pointerTo;

                newPointers.names.push(pointerNames[len]);

                newPointers.combinedNames.push(combinedName);

                newPointers[combinedName] = {'name': pointerNames[len],
                    'target': pointerTo};
            }
        }

        //compute deleted pointers
        diff = _.difference(oldPointers.combinedNames, newPointers.combinedNames);
        len = diff.length;
        while (len--) {
            combinedName = diff[len];
            pointerName = oldPointers[combinedName].name;
            pointerTarget = oldPointers[combinedName].target;

            this._removeConnection(gmeID, pointerTarget, ptrType, pointerName);

            idx = oldPointers.combinedNames.indexOf(combinedName);
            oldPointers.combinedNames.splice(idx,1);
            delete oldPointers[combinedName];
        }

        //compute added pointers
        diff = _.difference(newPointers.combinedNames, oldPointers.combinedNames);
        len = diff.length;
        while (len--) {
            combinedName = diff[len];
            pointerName = newPointers[combinedName].name;
            pointerTarget = newPointers[combinedName].target;

            oldPointers.names.push(pointerName);
            oldPointers.combinedNames.push(combinedName);
            oldPointers[combinedName] = {'name': newPointers[combinedName].name,
                'target': newPointers[combinedName].target};

            this._createConnection(gmeID, pointerTarget, ptrType, {'name': pointerName});
        }
    };
    /******************************************************************************************/
    /*  END OF --- DISPLAY META POINTER RELATIONS AS A CONNECTION FROM CONTAINER TO CONTAINED */
    /******************************************************************************************/


    CrosscutController.prototype._processConnectionWaitingList = function (gmeID) {
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
                if (this._connectionWaitingListByDstGMEID[gmeDstID].hasOwnProperty(gmeSrcID)){
                    len = this._connectionWaitingListByDstGMEID[gmeDstID][gmeSrcID].length;
                    while (len--) {
                        connType = this._connectionWaitingListByDstGMEID[gmeDstID][gmeSrcID][len][0];
                        connTexts = this._connectionWaitingListByDstGMEID[gmeDstID][gmeSrcID][len][1];
                        c.push({'gmeSrcID': gmeSrcID,
                            'gmeDstID': gmeDstID,
                            'connType': connType,
                            'connTexts': connTexts});
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
                        c.push({'gmeSrcID': gmeSrcID,
                            'gmeDstID': gmeDstID,
                            'connType': connType,
                            'connTexts': connTexts});
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
    /*  CREATE A SPECIFIC TYPE OF CONNECTION BETWEEN 2 GME OBJECTS              */
    /****************************************************************************/
    CrosscutController.prototype._createConnection = function (gmeSrcId, gmeDstId, connType, connTexts) {
        var connDesc,
            connComponent;
        //need to check if the src and dst objects are displayed or not
        //if YES, create connection
        //if NO, store information in a waiting queue

        if (this._GMEID2ComponentID[gmeSrcId] && this._GMEID2ComponentID[gmeSrcId].length > 0 &&
            this._GMEID2ComponentID[gmeDstId] && this._GMEID2ComponentID[gmeDstId].length > 0) {
            //source and destination is displayed

            if (this._filteredOutConnTypes.indexOf(connType) === -1) {
                //connection type is not filtered out
                connDesc = { "srcObjId": this._GMEID2ComponentID[gmeSrcId][0],
                    "srcSubCompId": undefined,
                    "dstObjId": this._GMEID2ComponentID[gmeDstId][0],
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

                /*if (connType === MetaRelations.POINTER && (connTexts.name === CONSTANTS.POINTER_SOURCE || connTexts.POINTER_TARGET)) {
                    //this is a connection's pointer
                    //set the same color/pattern as defined in the node
                }*/

                connComponent = this._widget.createConnection(connDesc);

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


    CrosscutController.prototype._saveConnectionToWaitingList =  function (gmeSrcId, gmeDstId, connType, connTexts) {
        var scrDisplayed = this._GMEID2ComponentID[gmeSrcId] && this._GMEID2ComponentID[gmeSrcId].length > 0,
            dstDisplayed = this._GMEID2ComponentID[gmeDstId] && this._GMEID2ComponentID[gmeDstId].length > 0;

        if (scrDisplayed && !dstDisplayed) {
            //#1 - the destination object is missing from the screen
            this._connectionWaitingListByDstGMEID[gmeDstId] = this._connectionWaitingListByDstGMEID[gmeDstId] || {};
            this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId] = this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId] || [];
            this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId].push([connType, connTexts]);
        } else if (!scrDisplayed && dstDisplayed) {
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


    CrosscutController.prototype._saveConnection = function (gmeSrcId, gmeDstId, connType, connComponentId, connTexts) {
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
    CrosscutController.prototype._removeConnection = function (gmeSrcId, gmeDstId, connType, pointerName) {
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
            return ;
        }

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
                this._widget.deleteComponent(connectionID);

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

    return CrosscutController;
});
