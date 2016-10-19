/*globals define, _, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger',
    'js/RegistryKeys',
    'js/Constants',
    './CrosscutConstants',
    'js/DragDrop/DragHelper',
    'js/Utils/GMEConcepts',
    'js/Panels/ControllerBase/DiagramDesignerWidgetMultiTabMemberListControllerBase',
    'js/Panels/MetaEditor/MetaRelations',
    'js/NodePropertyNames',
    'js/Utils/ComponentSettings'
], function (Logger,
             REGISTRY_KEYS,
             CONSTANTS,
             CrosscutConstants,
             DragHelper,
             GMEConcepts,
             DiagramDesignerWidgetMultiTabMemberListControllerBase,
             MetaRelations,
             nodePropertyNames,
             ComponentSettings) {

    'use strict';

    var CrosscutController,
        DEFAULT_DECORATOR = 'ModelDecorator',
        WIDGET_NAME = 'DiagramDesigner',
        CONNECTION_DECORATOR = 'CircleDecorator';

    CrosscutController = function (options) {
        options = options || {};
        options.loggerName = 'gme:Panels:CrossCut:CrosscutController';

        this._config = CrosscutController.getDefaultConfig();
        ComponentSettings.resolveWithWebGMEGlobal(this._config, CrosscutController.getComponentId());

        DiagramDesignerWidgetMultiTabMemberListControllerBase.call(this, options);

        this._filteredOutConnTypes = [];
        this._filteredOutConnectionDescriptors = {};
        this._activeCrosscutId = null;
        this._initActiveTab = false;
        this._tabsHasBeenRequested = false;
        this._autoCreateCrosscut = this._config.autoCreateCrosscut === true;

        this._initFilterPanel();
        this.logger.debug('CrosscutController ctor finished');
    };

    _.extend(CrosscutController.prototype, DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype);

    CrosscutController.prototype._attachDiagramDesignerWidgetEventHandlers = function () {
        var self = this,
            oldTabChangefn;

        //cal base classes _attachDiagramDesignerWidgetEventHandlers
        DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype
            ._attachDiagramDesignerWidgetEventHandlers.call(this);

        //add own event handlers

        this._widget.onFilterNewConnectionDroppableEnds = function (params) {
            return self._onFilterNewConnectionDroppableEnds(params);
        };

        this._widget.onCreateNewConnection = function (params) {
            self._onCreateNewConnection(params);
        };

        this._widget.onModifyConnectionEnd = function (params) {
            self._onModifyConnectionEnd(params);
        };

        this._widget.onCheckChanged = function (value, isChecked) {
            self._onConnectionTypeFilterCheckChanged(value, isChecked);
        };

        oldTabChangefn = this._widget.onSelectedTabChanged;
        this._widget.onSelectedTabChanged = function (tabID) {
            oldTabChangefn(tabID);
            self._selectedTabChanged(tabID);
        };
    };

    //enable every node
    CrosscutController.prototype._validateNodeId = function (nodeId) {
        return nodeId;
    };

    CrosscutController.prototype._canAddTab = function () {
        var memberListContainerID = this._memberListContainerID;

        return (memberListContainerID || memberListContainerID === CONSTANTS.PROJECT_ROOT_ID);
    };

    CrosscutController.prototype._updateSelectedMemberListMembersTerritoryPatterns = function () {
        var currentlyDisplayedMembers = (this._selectedMemberListMembers || []).slice(0),
            actualMembers = (this._memberListMembers[this._selectedMemberListID] || []).slice(0),
            diff,
            len,
            territoryChanged = false,
            territoryId = this._selectedMemberListMembersTerritoryId,
            territoryPatterns = this._selectedMemberListMembersTerritoryPatterns,
            putConnectionsToBeHandledLast = function (list) {
                var boxes = [],
                    connections = [],
                    i, node;
                for (i = 0; i < list.length; i += 1) {
                    node = client.getNode(list[i]);
                    if (node && node.isConnection()) {
                        connections.push(list[i]);
                    } else {
                        boxes.push(list[i]);
                    }
                }
                return connections.concat(boxes);
            },
            client = this._client;

        //let's see who has been deleted
        diff = putConnectionsToBeHandledLast(_.difference(currentlyDisplayedMembers, actualMembers));
        len = diff.length;
        while (len--) {
            delete territoryPatterns[diff[len]];
            territoryChanged = true;
        }

        //let's see who has been added
        diff = putConnectionsToBeHandledLast(_.difference(actualMembers, currentlyDisplayedMembers));
        len = diff.length;
        while (len--) {
            territoryPatterns[diff[len]] = {children: 0};
            territoryChanged = true;
        }

        //let's update the one that has not been changed but their position might have
        //diff = putConnectionsToBeHandledLast(_.intersection(actualMembers, currentlyDisplayedMembers));
        //len = diff.length;
        //this._widget.beginUpdate();
        //while (len--) {
        //    this._onUpdate(diff[len]);
        //}
        //this._widget.endUpdate();

        //save current list of members
        this._selectedMemberListMembers = actualMembers;

        if (territoryChanged) {
            setTimeout(function () {
                client.updateTerritory(territoryId, territoryPatterns);
            }, 10);
        }
    };

    CrosscutController.prototype._initializeSelectedMemberList = function () {
        this._nodePointers = {};
        this._nodeSets = {};

        this._connectionListByType = {};

        this._filteredOutConnectionDescriptors = {}; //we should clear this
        this._connectionWaitingListByDstGMEID = {};
        this._connectionWaitingListBySrcGMEID = {};

        DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._initializeSelectedMemberList.call(this);
    };

    CrosscutController.prototype._memberListTerritoryCallback = function (events) {
        var decoratorsToDownload = [DEFAULT_DECORATOR],
            len = events.length,
            obj,
            objDecorator,
            connEvents = [],
            client = this._client,
            self = this;

        while (len--) {
            if ((events[len].etype === CONSTANTS.TERRITORY_EVENT_LOAD) ||
                (events[len].etype === CONSTANTS.TERRITORY_EVENT_UPDATE)) {

                obj = client.getNode(events[len].eid);

                events[len].desc = {isConnection: GMEConcepts.isConnection(events[len].eid)};

                if (obj) {
                    //if it is a connection find src and dst and do not care about decorator
                    if (events[len].desc.isConnection === true) {
                        //objDecorator = CONNECTION_DECORATOR;
                        //events[len].desc.isConnection = false;
                        //events[len].desc.decoratorParams = {displayName: false};
                        events[len].desc.srcID = obj.getPointer(CONSTANTS.POINTER_SOURCE).to;
                        events[len].desc.dstID = obj.getPointer(CONSTANTS.POINTER_TARGET).to;
                        events[len].desc.reconnectable = true;
                        events[len].desc.editable = true;
                    } else {
                        objDecorator = obj.getRegistry(REGISTRY_KEYS.DECORATOR);
                    }

                    if (!objDecorator ||
                        objDecorator === '') {
                        objDecorator = DEFAULT_DECORATOR;
                    }

                    if (decoratorsToDownload.indexOf(objDecorator) === -1) {
                        decoratorsToDownload.pushUnique(objDecorator);
                    }

                    events[len].desc.decorator = objDecorator;

                    if (events[len].desc.isConnection) {
                        connEvents.push(events[len]);
                        events.splice(len, 1);
                    }
                }
            }
        }

        client.decoratorManager.download(decoratorsToDownload, WIDGET_NAME, function () {
            //put the connection events back to the very end
            events = events.concat(connEvents);
            self._dispatchEvents(events);
        });
    };

    CrosscutController.prototype.getOrderedMemberListInfo = function (/* memberListContainerObject */) {
        var result = [],
            memberListContainerID = this._memberListContainerID,
            crosscutsRegistry = GMEConcepts.getCrosscuts(memberListContainerID),
            len = crosscutsRegistry.length;

        if (this._autoCreateCrosscut === true && len === 0 && this._tabsHasBeenRequested === false) {
            this._onTabAddClicked();
            memberListContainerID = this._memberListContainerID;
            crosscutsRegistry = GMEConcepts.getCrosscuts(memberListContainerID);
            len = crosscutsRegistry.length;
        }

        this._tabsHasBeenRequested = true;

        while (len--) {
            result.push({
                memberListID: crosscutsRegistry[len].SetID,
                title: crosscutsRegistry[len].title,
                filterInfo: crosscutsRegistry[len].filter || {},
                enableDeleteTab: true,
                enableRenameTab: true
            });
        }

        result.sort(function (a, b) {
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
        return {
            SetID: CrosscutConstants.CROSSCUT_NAME_PREFIX,
            Title: 'Crosscut '
        };
    };

    /*
     * Overwrite 'no tab' warning message to the user
     */
    CrosscutController.prototype.displayNoTabMessage = function () {
        this._widget.setBackgroundText('No crosscuts defined yet. Press the + button in the top-left corner to ' +
            'create one...');
    };

    /**********************************************************/
    /*         HANDLE OBJECT DRAG & DROP ACCEPTANCE           */
    /**********************************************************/
    CrosscutController.prototype._onBackgroundDroppableAccept = function (event, dragInfo) {
        var gmeIDList = DragHelper.getDragItems(dragInfo),
            accept = DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onBackgroundDroppableAccept.call(
                this, event, dragInfo);

        if (accept === true) {
            //if based on the DiagramDesignerWidgetMultiTabMemberListControllerBase check it could be accepted,
            // ie items are not members of the set so far
            //we need to see if we can accept them based on the META rules
            accept = GMEConcepts.isValidChildrenTypeInCrossCut(this._memberListContainerID, gmeIDList);
        }

        return accept;
    };
    /**********************************************************/
    /*  END OF --- HANDLE OBJECT DRAG & DROP ACCEPTANCE       */
    /**********************************************************/

    CrosscutController.prototype._onLoad = function (gmeID, desc) {
        var territoryChanged;

        //desc.isConnection = false;

        territoryChanged = DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onLoad.call(this,
            gmeID,
            desc);

        //process new node to display containment / pointers / inheritance / sets as connections
        //if (!desc.isConnection) {
        this._processNodePointers(gmeID, false);
        this._processNodePointers(gmeID, true);

        //}

        //check all the waiting pointers (whose SRC/DST is already displayed and waiting for the DST/SRC to show up)
        //it might be this new node
        this._processConnectionWaitingList(gmeID);

        return territoryChanged;
    };

    CrosscutController.prototype._onUpdate = function (gmeID, desc) {
        //component updated
        var node = this._client.getNode(gmeID);
        desc = desc || {};
        if (node && node.isConnection()) {
            desc.isConnection = true;
            desc.srcID = node.getPointer(CONSTANTS.POINTER_SOURCE).to;
            desc.dstID = node.getPointer(CONSTANTS.POINTER_TARGET).to;
            desc.reconnectable = true;
            desc.editable = true;
        } else {
            desc.isConnection = false;
        }

        //we are interested in the load of member items and their custom territory involvement
        if (this._selectedMemberListMembers.indexOf(gmeID) !== -1 &&
            this._GMEID2ComponentID[gmeID]) {

            // TODO this is not a full solution, the whole crosscut and the underlying multi-tab needs refactoring!!!
            // First we should check if a connection changes from box or to box due to the update
            if (desc.isConnection) {
                if (this._GMEID2ComponentID[gmeID].length > 0 &&
                    this._GMEID2ComponentID[gmeID][0].indexOf('C_') === 0 &&
                    (!desc.srcID || !desc.dstID)) {
                    // one endpoint value was removed - but not necessarily the item itself
                    this._onUnload(gmeID);
                    this._onLoad(gmeID, desc);
                    return;
                }

                if (this._GMEID2ComponentID[gmeID].length > 0 &&
                    this._GMEID2ComponentID[gmeID][0].indexOf('C_') !== 0 &&
                    desc.srcID && desc.dstID) {
                    // one endpoint value was removed - but not necessarily the item itself
                    this._onUnload(gmeID);
                    this._onLoad(gmeID, desc);
                    return;
                }
            }
            DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onUpdate.call(this, gmeID, desc);

            //if (!node.isConnection()) {
            //process new node to display containment / pointers / inheritance / sets as connections
            this._processNodePointers(gmeID, false);
            this._processNodePointers(gmeID, true);

            //check all the waiting pointers (whose SRC/DST is already displayed and waiting for the DST/SRC to show up)
            //it might be this new node
            this._processConnectionWaitingList(gmeID);
            //}
        } else if (this._selectedMemberListMembers.indexOf(gmeID) === -1 &&
            this._GMEID2ComponentID[gmeID]) {
            //member have been removed but still in territory
            this._onUpdatePortToItem(gmeID, true, desc);
        } else if (this._selectedMemberListMembers.indexOf(gmeID) !== -1 && !this._GMEID2ComponentID[gmeID]) {
            //new member that was in the territory
            this._onUpdatePortToItem(gmeID, false, desc);
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

        //if (this._GMEID2ComponentID.hasOwnProperty(gmeID) && this._GMEID2ComponentID[gmeID][0].indexOf('C_') === 0) {
        //    this._widget.deleteComponent(this._GMEID2ComponentID[gmeID][0]);
        //    delete this._GMEID2ComponentID[gmeID];
        //} else {
        if (this._GMEID2ComponentID.hasOwnProperty(gmeID)) {

            //gather all the information that is stored in this node's META

            //POINTERS
            len = this._nodePointers[gmeID].combinedNames.length;
            while (len--) {
                pointerName = this._nodePointers[gmeID].combinedNames[len];
                otherEnd = this._nodePointers[gmeID][pointerName].target;
                pointerName = this._nodePointers[gmeID][pointerName].name;
                this._removeConnection(gmeID, otherEnd, MetaRelations.META_RELATIONS.POINTER, pointerName);
            }

            //POINTER LISTS
            len = this._nodeSets[gmeID].combinedNames.length;
            while (len--) {
                pointerName = this._nodeSets[gmeID].combinedNames[len];
                otherEnd = this._nodeSets[gmeID][pointerName].target;
                pointerName = this._nodeSets[gmeID][pointerName].name;
                this._removeConnection(gmeID, otherEnd, MetaRelations.META_RELATIONS.SET, pointerName);
            }

            len = this._GMEID2ComponentID[gmeID].length;
            while (len--) {
                componentID = this._GMEID2ComponentID[gmeID][len];

                if (this._widget.itemIds.indexOf(componentID) !== -1) {
                    territoryChanged = territoryChanged ||
                        this._updateDecoratorTerritoryQuery(
                            this._widget.items[componentID]._decoratorInstance, true);
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
        delete this._nodePointers[gmeID];
        delete this._nodeSets[gmeID];
        //}

        return territoryChanged;
    };

    /*CrosscutController.prototype._onUpdatePortToItem = function (gmeID) {
     var members = this._selectedMemberListMembers,
     i,
     node, src, dst;

     for (i = 0; i < members.length; i += 1) {
     node = this._client.getNode(members[i]);
     if (node && node.isConnection()) {
     src = node.getPointer('src').to;
     dst = node.getPointer('dst').to;
     if (src === gmeID || dst === gmeID) {
     DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onUnload.call(this, members[i]);
     DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onLoad.call(this, members[i], {
     isConnection: true,
     srcID: src,
     dstID: dst,
     reconnectable: true,
     editable: true
     });

     }
     }
     }
     };*/

    CrosscutController.prototype._getAssociatedConnections = function (objectID) {
        var result = {src: [], dst: []},
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
            pointerNames = node === null ? [] : isSet === true ? node.getSetNames() : node.getPointerNames(),
            pointerTo,
            len,
            oldPointers,
            newPointers = {names: [], combinedNames: []},
            diff,
            pointerTarget,
            pointerName,
            idx,
            combinedName,
            isConnection = node === null ? false : node.isConnection(),
            setMembers, member;

        if (isSet === true) {
            this._nodeSets[gmeID] = this._nodeSets[gmeID] || {names: [], combinedNames: []};
            oldPointers = this._nodeSets[gmeID];
        } else {
            this._nodePointers[gmeID] = this._nodePointers[gmeID] || {names: [], combinedNames: []};
            oldPointers = this._nodePointers[gmeID];
        }

        len = pointerNames.length;
        while (len--) {
            if (isSet) {
                setMembers = node.getMemberIds(pointerNames[len]);
                member = setMembers.pop();
                if (typeof member === 'string') {
                    newPointers.names.push(pointerNames[len]);
                }
                while (typeof member === 'string') {
                    combinedName = gmeID + '_' + pointerNames[len] + '_' + member;

                    newPointers.combinedNames.push(combinedName);

                    newPointers[combinedName] = {
                        name: pointerNames[len],
                        target: member,
                        type: MetaRelations.META_RELATIONS.SET
                    };

                    member = setMembers.pop();
                }
            } else {
                if (pointerNames[len] !== CONSTANTS.POINTER_BASE && !(isConnection && (pointerNames[len] === CONSTANTS.POINTER_SOURCE ||
                    pointerNames[len] === CONSTANTS.POINTER_TARGET))) {
                    pointerTo = node.getPointer(pointerNames[len]).to;

                    if (pointerTo) {
                        combinedName = gmeID + '_' + pointerNames[len] + '_' + pointerTo;

                        newPointers.names.push(pointerNames[len]);

                        newPointers.combinedNames.push(combinedName);

                        newPointers[combinedName] = {
                            name: pointerNames[len],
                            target: pointerTo,
                            type: MetaRelations.META_RELATIONS.POINTER
                        };
                    }
                }
            }
        }

        //base and parent are special relations and they also needs to be added when not checked for sets
        if (!isSet && node) {
            pointerTo = node.getParentId();
            if (typeof pointerTo === 'string') {
                combinedName = gmeID + '_' + CONSTANTS.RELATION_CONTAINMENT + '_' + pointerTo;
                newPointers.names.push(CONSTANTS.RELATION_CONTAINMENT);
                newPointers.combinedNames.push(combinedName);
                newPointers[combinedName] = {
                    name: CONSTANTS.RELATION_CONTAINMENT,
                    target: pointerTo,
                    type: MetaRelations.META_RELATIONS.CONTAINMENT
                };
            }

            pointerTo = node.getBaseId();
            if (typeof pointerTo === 'string') {
                combinedName = gmeID + '_' + CONSTANTS.POINTER_BASE + '_' + pointerTo;
                newPointers.names.push(CONSTANTS.POINTER_BASE);
                newPointers.combinedNames.push(combinedName);
                newPointers[combinedName] = {
                    name: CONSTANTS.POINTER_BASE,
                    target: pointerTo,
                    type: MetaRelations.META_RELATIONS.INHERITANCE
                };
            }
        }

        //compute deleted pointers
        diff = _.difference(oldPointers.combinedNames, newPointers.combinedNames);
        len = diff.length;
        while (len--) {
            combinedName = diff[len];
            pointerName = oldPointers[combinedName].name;
            pointerTarget = oldPointers[combinedName].target;

            this._removeConnection(gmeID, pointerTarget, oldPointers[combinedName].type, pointerName);

            idx = oldPointers.combinedNames.indexOf(combinedName);
            oldPointers.combinedNames.splice(idx, 1);
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
            oldPointers[combinedName] = {
                name: newPointers[combinedName].name,
                target: newPointers[combinedName].target,
                type: newPointers[combinedName].type
            };

            this._createConnection(gmeID, pointerTarget, newPointers[combinedName].type, {name: pointerName});
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
    /*  CREATE A SPECIFIC TYPE OF CONNECTION BETWEEN 2 GME OBJECTS              */
    /****************************************************************************/
    CrosscutController.prototype._createConnection = function (gmeSrcId, gmeDstId, connType, connTexts) {
        var connDesc,
            connComponent,
            visualType;
        //need to check if the src and dst objects are displayed or not
        //if YES, create connection
        //if NO, store information in a waiting queue

        if (this._GMEID2ComponentID[gmeSrcId] && this._GMEID2ComponentID[gmeSrcId].length > 0 &&
            this._GMEID2ComponentID[gmeDstId] && this._GMEID2ComponentID[gmeDstId].length > 0) {
            //source and destination is displayed

            if (this._filteredOutConnTypes.indexOf(connType) === -1) {
                //connection type is not filtered out
                connDesc = {
                    srcObjId: this._GMEID2ComponentID[gmeSrcId][0],
                    srcSubCompId: undefined,
                    dstObjId: this._GMEID2ComponentID[gmeDstId][0],
                    dstSubCompId: undefined,
                    reconnectable: false,
                    name: '',
                    nameEdit: false
                };

                //set visual properties
                visualType = connType;
                if (connTexts) {
                    switch (connTexts.name) {
                        case CONSTANTS.POINTER_BASE:
                            visualType = MetaRelations.META_RELATIONS.INHERITANCE;
                            break;
                        case CONSTANTS.RELATION_CONTAINMENT:
                            visualType = MetaRelations.META_RELATIONS.CONTAINMENT;
                            connDesc.srcObjId = this._GMEID2ComponentID[gmeDstId][0];
                            connDesc.dstObjId = this._GMEID2ComponentID[gmeSrcId][0];
                            break;
                        default:
                            break;
                    }
                }

                _.extend(connDesc, MetaRelations.getLineVisualDescriptor(visualType));

                //fill out texts
                if (connTexts) {
                    _.extend(connDesc, connTexts);
                }

                connComponent = this._widget.createConnection(connDesc);

                this._saveConnection(gmeSrcId, gmeDstId, connType, connComponent.id, connTexts);
            } else {
                //connection type is filtered out
                this._filteredOutConnectionDescriptors[connType] = this._filteredOutConnectionDescriptors[connType] || [];
                this._filteredOutConnectionDescriptors[connType].push([gmeSrcId, gmeDstId, connTexts]);
            }
        } else {
            //source or destination is not displayed, store it in a queue
            this._saveConnectionToWaitingList(gmeSrcId, gmeDstId, connType, connTexts);
        }
    };

    CrosscutController.prototype._saveConnectionToWaitingList = function (gmeSrcId, gmeDstId, connType, connTexts) {
        var scrDisplayed = this._GMEID2ComponentID[gmeSrcId] && this._GMEID2ComponentID[gmeSrcId].length > 0,
            dstDisplayed = this._GMEID2ComponentID[gmeDstId] && this._GMEID2ComponentID[gmeDstId].length > 0;

        if (scrDisplayed && !dstDisplayed) {
            //#1 - the destination object is missing from the screen
            this._connectionWaitingListByDstGMEID[gmeDstId] = this._connectionWaitingListByDstGMEID[gmeDstId] || {};

            this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId] =
                this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId] || [];

            this._connectionWaitingListByDstGMEID[gmeDstId][gmeSrcId].push([connType, connTexts]);
        } else if (!scrDisplayed && dstDisplayed) {
            //#2 -  the source object is missing from the screen
            this._connectionWaitingListBySrcGMEID[gmeSrcId] = this._connectionWaitingListBySrcGMEID[gmeSrcId] || {};

            this._connectionWaitingListBySrcGMEID[gmeSrcId][gmeDstId] =
                this._connectionWaitingListBySrcGMEID[gmeSrcId][gmeDstId] || [];

            this._connectionWaitingListBySrcGMEID[gmeSrcId][gmeDstId].push([connType, connTexts]);
        } else {
            //#3 - both gmeSrcId and gmeDstId is missing from the screen
            //NOTE: this should never happen!!!
            //this.logger.error('_saveConnectionToWaitingList both gmeSrcId and gmeDstId is undefined...');
        }
    };

    CrosscutController.prototype._saveConnection = function (gmeSrcId, gmeDstId, connType, connComponentId, connTexts) {
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
            return;
        }

        len = this._connectionListBySrcGMEID[gmeSrcId][gmeDstId][connType].length;

        while (len--) {
            connectionID = this._connectionListBySrcGMEID[gmeSrcId][gmeDstId][connType][len];

            //if a pointer with a specific name should be removed
            //clear out the connectionID if this connection is not the representation of that pointer
            if (connType === MetaRelations.META_RELATIONS.POINTER &&
                pointerName &&
                pointerName !== '' &&
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

    /*************************************************************/
    /*  HANDLE OBJECT / CONNECTION DELETION IN THE ASPECT ASPECT */
    /*************************************************************/
    CrosscutController.prototype._onSelectionDelete = function (idList) {
        var client = this._client,
            memberListContainerID = this._memberListContainerID,
            memberListToRemoveFrom = this._selectedMemberListID,
            len,
            gmeID,
            gmeObj,
            componentId,
            NON_DELETABLE_POINTERS = [CONSTANTS.POINTER_SOURCE, CONSTANTS.POINTER_TARGET, CONSTANTS.POINTER_BASE],
            lineDesc,
            canDeletePointer,
            logger = this.logger;

        client.startTransaction();

        len = idList.length;
        while (len--) {
            componentId = idList[len];
            gmeID = this._ComponentID2GMEID[componentId];

            //#1: deleting an item --> deleting a member
            //  #1/a: if deleting a connection whose hierarchical parent is the membershipContainer,
            //          delete the connection from the hierarchy too
            //#2:  deleting a line --> deleting a pointer
            //  #2/a: do not let the user delete an src/dst pointer??

            if (gmeID) {
                //deleting a box --> remove from crosscut's set
                logger.debug('removeMember memberListContainerID: ' + memberListContainerID + ', gmeID: ' + gmeID +
                    ', memberListToRemoveFrom: ' + memberListToRemoveFrom);
                //_client.removeMember(memberListContainerID, gmeID, memberListToRemoveFrom);

                //check if this GME object is a connection and whether it's parent is the crosscut container
                gmeObj = client.getNode(gmeID);
                if (GMEConcepts.isConnection(gmeID) && gmeObj.getParentId() === memberListContainerID) {
                    if (GMEConcepts.canDeleteNode(gmeID)) {
                        logger.debug('deleting connection from crosscut hierarchy too gmeID: ' + gmeID);
                        client.delMoreNodes([gmeID]);
                    } else {
                        client.removeMember(memberListContainerID, gmeID, memberListToRemoveFrom);
                    }
                } else {
                    client.removeMember(memberListContainerID, gmeID, memberListToRemoveFrom);
                }
            } else {
                //deleting a line
                lineDesc = this._connectionListByID[componentId];
                if (lineDesc) {
                    canDeletePointer = true;
                    //  #2/a: do not let the user delete an src/dst pointer??
                    if (lineDesc.type === MetaRelations.META_RELATIONS.POINTER &&
                        NON_DELETABLE_POINTERS.indexOf(lineDesc.name) !== -1) {
                        canDeletePointer = false;
                    }

                    if (canDeletePointer) {
                        logger.debug('deleting pointer from: ' + lineDesc.GMESrcId + ', type: ' + lineDesc.name);
                        //it's a pointer that's allowed to be deleted
                        client.delPointer(lineDesc.GMESrcId, lineDesc.name);
                    } else {
                        logger.warn('can not delete pointer from: ' + lineDesc.GMESrcId + ', type: ' + lineDesc.name);
                    }
                }
            }
        }

        client.completeTransaction();
    };
    /************************************************************************/
    /*  END OF --- HANDLE OBJECT / CONNECTION DELETION IN THE ASPECT ASPECT */
    /************************************************************************/

    CrosscutController.prototype._onFilterNewConnectionDroppableEnds = function (params) {
        var availableConnectionEnds = params.availableConnectionEnds,
            result = [],
            i,
            sourceId,
            targetId,
            j,
            client = this._client,
            validPointerTargetTypes,
            validSetTargetTypes,
            validConnectionEndTypes,
            validConnectionTypes,
            validEndTypes,
            parentId = this._memberListContainerID,
            pointerMetaDescriptor,
            p;

        if (params.srcSubCompId === undefined) {
            sourceId = this._ComponentID2GMEID[params.srcId];
        } else {
            sourceId = this._Subcomponent2GMEID[params.srcId][params.srcSubCompId];
        }

        //need to figure out who are the potential end items for a 'connection'
        //#1: all the items are potential 'connection' destination that could be a pointer target from this source
        //#2: all the items are potential 'connection' destination that could be a set (pointerlist) target
        //      from this source
        //#3: all the items are potential 'connection' destination where a WebGME-connection can be created
        // between this source and that target and the connection can be created in this parent based on the META rules

        //check #1:
        validPointerTargetTypes = GMEConcepts.getValidPointerTargetTypesFromSource(sourceId, false);

        //check #2:
        validSetTargetTypes = GMEConcepts.getValidPointerTargetTypesFromSource(sourceId, true);

        //check #3:
        validConnectionTypes = GMEConcepts.getValidConnectionTypesFromSourceInAspect(sourceId,
            parentId,
            CONSTANTS.ASPECT_ALL);
        validConnectionEndTypes = [];

        //filter them to see which of those can actually be created as a child of the parent
        //check what endpoint could be a potential endpoint of any of the connection types
        i = validConnectionTypes.length;
        while (i--) {
            if (GMEConcepts.canCreateChild(parentId, validConnectionTypes[i])) {
                pointerMetaDescriptor = this._client.getValidTargetItems(validConnectionTypes[i],
                    CONSTANTS.POINTER_TARGET);
                if (pointerMetaDescriptor && pointerMetaDescriptor.length > 0) {
                    j = pointerMetaDescriptor.length;
                    while (j--) {
                        if (validConnectionEndTypes.indexOf(pointerMetaDescriptor[j].id) === -1) {
                            validConnectionEndTypes.push(pointerMetaDescriptor[j].id);
                        }
                    }
                }
            }
        }

        //filter out the items on the screen
        validEndTypes = _.union(validPointerTargetTypes, validSetTargetTypes, validConnectionEndTypes);
        this.logger.debug('validEndTypes: ' + validEndTypes);

        i = availableConnectionEnds.length;
        while (i--) {
            p = availableConnectionEnds[i];
            if (p.dstSubCompID === undefined) {
                targetId = this._ComponentID2GMEID[p.dstItemID];
            } else {
                targetId = this._Subcomponent2GMEID[p.dstItemID][p.dstSubCompID];
            }

            j = validEndTypes.length;
            while (j--) {
                if (client.isTypeOf(targetId, validEndTypes[j])) {
                    result.push(availableConnectionEnds[i]);
                    break;
                }
            }
        }

        return result;
    };

    CrosscutController.prototype._onCreateNewConnection = function (params) {
        var sourceId,
            targetId,
            self = this,
            parentId = this._memberListContainerID,
            client = this._client,
            menuItems = {},
            sourceObj,
            targetObj,

            logger = this.logger,
            aspect = this._selectedMemberListID,
            dstPosition = this._widget.items[params.dst].getBoundingBox(),
            srcPosition = this._widget.items[params.src].getBoundingBox(),

            validPointerTypes,
            validSetTypes,
            validConnectionTypes,

            existingConns;

        function createPointer(srcId, dstId, ptrName) {
            logger.debug('createPointer srcId: ' + srcId + ', dstId: ' + dstId + ', ptrName: ' + ptrName);
            client.makePointer(srcId, ptrName, dstId);
        }

        function addToSet(containerId, objId, setName) {
            logger.debug('addToSet containerId: ' + containerId + ', objId: ' + objId + ', ptrName: ' + setName);
            client.addMember(containerId, objId, setName);
        }

        function createConnection(srcId, dstId, connType) {
            var newConnID,
                dx,
                dy;

            logger.debug('createConnection srcId: ' + srcId + ', dstId: ' + dstId + ', connType: ' + connType);
            client.startTransaction();

            //create new object
            newConnID = client.createChild({parentId: parentId, baseId: connType});

            //set source and target pointers
            client.makePointer(newConnID, CONSTANTS.POINTER_SOURCE, srcId);
            client.makePointer(newConnID, CONSTANTS.POINTER_TARGET, dstId);

            //add new object to the current aspect ans store coordinate
            client.addMember(parentId, newConnID, aspect);
            dx = dstPosition.x - srcPosition.x;
            dy = dstPosition.y - srcPosition.y;
            dx = srcPosition.x + dx / 2;
            dy = srcPosition.y + dy / 2;
            client.setMemberRegistry(parentId, newConnID, aspect, REGISTRY_KEYS.POSITION, {x: dx, y: dy});

            client.completeTransaction();
        }

        function followConnection(connPath) {
            var patterns = {},
                territoryId;

            patterns[connPath] = {children: 0};

            territoryId = client.addUI(null, function (events) {
                var targetNodeObj,
                    i;

                for (i = 0; i < events.length; i += 1) {
                    if (events[i].eid === connPath && events[i].etype === 'load') {
                        targetNodeObj = client.getNode(connPath);
                        if (targetNodeObj) {
                            WebGMEGlobal.State.registerActiveObject(connPath);
                        }
                        break;
                    }
                }

                client.removeUI(territoryId);
            });

            client.updateTerritory(territoryId, patterns);
        }

        function displayContextMenu() {
            //show available pointers/sets/connection types to the user to select one
            var sourceObjName = sourceObj.getAttribute(nodePropertyNames.Attributes.name),
                targetObjName = targetObj.getAttribute(nodePropertyNames.Attributes.name),
                CONTEXT_POS_OFFSET = 10,
                ptrAction = 'PTR',
                setAction = 'SET',
                connectionAction = 'CONN',
                followConnAction = 'FOLLOW_CONN',
                connObj,
                i,
                connObjName;

            //'Create pointer'
            for (i = 0; i < validPointerTypes.length; i += 1) {
                menuItems[ptrAction + validPointerTypes[i]] = {
                    name: 'Create pointer \'' + validPointerTypes[i] + '\' from \'' + sourceObjName + '\' to \'' +
                    targetObjName + '\'',
                    icon: 'glyphicon glyphicon-share',
                    action: ptrAction,
                    type: validPointerTypes[i]
                };
            }

            //'Add to set'
            for (i = 0; i < validSetTypes.length; i += 1) {
                menuItems[setAction + validSetTypes[i]] = {
                    name: 'Add \'' + targetObjName + '\' to set \'' + validSetTypes[i] + '\' of \'' +
                    sourceObjName + '\'',
                    icon: false,
                    action: setAction,
                    type: validSetTypes[i]
                };
            }

            //'Create connection' in crosscut container
            connObjName = '';
            for (i = 0; i < validConnectionTypes.length; i += 1) {
                connObj = client.getNode(validConnectionTypes[i]);

                if (connObj) {
                    connObjName = connObj.getAttribute(nodePropertyNames.Attributes.name);
                } else {
                    connObjName = validConnectionTypes[i];
                }

                menuItems[connectionAction + validConnectionTypes[i]] = {
                    name: 'Create connection \'' + connObjName + '\' from \'' + sourceObjName + '\' to \'' +
                    targetObjName + '\'',
                    icon: 'glyphicon glyphicon-resize-horizontal',
                    action: connectionAction,
                    type: validConnectionTypes[i]
                };
            }

            if (validConnectionTypes.length > 0) {
                for (i = 0; i < existingConns.length; i += 1) {
                    menuItems[followConnAction + existingConns[i]] = {
                        name: 'Open existing connection [' + existingConns[i] + '] from \'' + sourceObjName +
                        '\' to \'' + targetObjName + '\'',
                        icon: 'glyphicon glyphicon-share',
                        action: followConnAction,
                        type: existingConns[i]
                    };
                }
            }

            //show context menu
            self._widget.createMenu(menuItems, function (key) {
                    var menuItem = menuItems[key],
                        type = menuItem.type,
                        action = menuItem.action;

                    switch (action) {
                        case ptrAction:
                            createPointer(sourceId, targetId, type);
                            break;
                        case setAction:
                            addToSet(sourceId, targetId, type);
                            break;
                        case connectionAction:
                            createConnection(sourceId, targetId, type);
                            break;
                        case followConnAction:
                            followConnection(type);
                            break;
                        default:
                            break;
                    }
                },

                self._widget.posToPageXY(dstPosition.x - CONTEXT_POS_OFFSET,
                    dstPosition.y - CONTEXT_POS_OFFSET)
            );
        }

        if (params.srcSubCompId === undefined) {
            sourceId = this._ComponentID2GMEID[params.src];
        } else {
            sourceId = this._Subcomponent2GMEID[params.src][params.srcSubCompId];
        }

        if (params.dstSubCompId === undefined) {
            targetId = this._ComponentID2GMEID[params.dst];
        } else {
            targetId = this._Subcomponent2GMEID[params.dst][params.dstSubCompId];
        }

        //need to figure out what this 'connection' could be
        //#1: a pointer from the source to this target
        //#2: a set membership where the source is the membership container and the target is the member
        //#3: a new WebGME connection between the source and the target created in this parent

        //#1: pointers
        validPointerTypes = GMEConcepts.getValidPointerTypesFromSourceToTarget(sourceId, targetId);

        //#2: sets
        validSetTypes = GMEConcepts.getValidSetTypesFromContainerToMember(sourceId, targetId);

        //#3: WebGME-connections
        validConnectionTypes = GMEConcepts.getValidConnectionTypesInAspect(sourceId,
            targetId,
            parentId,
            CONSTANTS.ASPECT_ALL);

        //if there is any option at all
        if (validPointerTypes.length + validSetTypes.length + validConnectionTypes.length > 0) {
            sourceObj = client.getNode(sourceId);
            targetObj = client.getNode(targetId);

            if (validConnectionTypes.length > 0) {
                existingConns = _.intersection(sourceObj.getCollectionPaths('src'),
                    targetObj.getCollectionPaths('dst'));
            }

            //if only 1 option, figure out automatically
            if (validPointerTypes.length + validSetTypes.length + validConnectionTypes.length === 1) {
                //thre is only one possible choice, go with that
                if (validPointerTypes.length === 1) {
                    //create pointer from source to target
                    createPointer(sourceId, targetId, validPointerTypes[0]);
                } else if (validSetTypes.length === 1) {
                    //add target to the set of source
                    addToSet(sourceId, targetId, validSetTypes[0]);
                } else if (validConnectionTypes.length === 1) {
                    if (existingConns.length === 0) {
                        //create connection between source and target in this parent
                        createConnection(sourceId, targetId, validConnectionTypes[0]);
                    } else {
                        // Display the existing connections
                        displayContextMenu();
                    }
                }
            } else {
                //more options, show context menu
                displayContextMenu();
            }
        }
    };

    CrosscutController.prototype._onModifyConnectionEnd = function (params) {
        var gmeID = this._ComponentID2GMEID[params.id],
            oldDesc = params.old,
            newDesc = params.new,
            newEndPointGMEID;

        if (gmeID) {
            this._client.startTransaction();

            //update connection endpoint - SOURCE
            if (oldDesc.srcObjId !== newDesc.srcObjId ||
                oldDesc.srcSubCompId !== newDesc.srcSubCompId) {
                if (newDesc.srcSubCompId !== undefined) {
                    newEndPointGMEID = this._Subcomponent2GMEID[newDesc.srcObjId][newDesc.srcSubCompId];
                } else {
                    newEndPointGMEID = this._ComponentID2GMEID[newDesc.srcObjId];
                }
                this._client.makePointer(gmeID, 'src', newEndPointGMEID);
            }

            //update connection endpoint - TARGET
            if (oldDesc.dstObjId !== newDesc.dstObjId ||
                oldDesc.dstSubCompId !== newDesc.dstSubCompId) {
                if (newDesc.dstSubCompId !== undefined) {
                    newEndPointGMEID = this._Subcomponent2GMEID[newDesc.dstObjId][newDesc.dstSubCompId];
                } else {
                    newEndPointGMEID = this._ComponentID2GMEID[newDesc.dstObjId];
                }
                this._client.makePointer(gmeID, 'dst', newEndPointGMEID);
            }

            this._client.completeTransaction();
        }
    };

    CrosscutController.prototype._getDragItems = function (selectedElements) {
        var res = [],
            i = selectedElements.length;

        while (i--) {
            if (this._ComponentID2GMEID[selectedElements[i]]) {
                res.push(this._ComponentID2GMEID[selectedElements[i]]);
            }
        }

        return res;
    };

    CrosscutController.prototype._attachClientEventListeners = function () {
        DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._attachClientEventListeners.call(this);
    };

    CrosscutController.prototype._detachClientEventListeners = function () {
        DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._detachClientEventListeners.call(this);
    };

    //FILTER
    /****************************************************************************/
    /*                  POINTER FILTER PANEL AND EVENT HANDLERS                 */
    /****************************************************************************/
    CrosscutController.prototype._initFilterPanel = function () {
        var filterIcon;

        filterIcon = MetaRelations.createButtonIcon(MetaRelations.META_RELATIONS.CONTAINMENT);
        this._widget.addFilterItem('Containment', MetaRelations.META_RELATIONS.CONTAINMENT, filterIcon);

        filterIcon = MetaRelations.createButtonIcon(MetaRelations.META_RELATIONS.POINTER);
        this._widget.addFilterItem('Pointer', MetaRelations.META_RELATIONS.POINTER, filterIcon);

        filterIcon = MetaRelations.createButtonIcon(MetaRelations.META_RELATIONS.INHERITANCE);
        this._widget.addFilterItem('Inheritance', MetaRelations.META_RELATIONS.INHERITANCE, filterIcon);

        filterIcon = MetaRelations.createButtonIcon(MetaRelations.META_RELATIONS.SET);
        this._widget.addFilterItem('Set', MetaRelations.META_RELATIONS.SET, filterIcon);
    };

    CrosscutController.prototype._onConnectionTypeFilterCheckChanged = function (value, isChecked) {
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

        if (!this._initActiveTab) {
            this._updateCrosscutRegistry();
        }
    };

    CrosscutController.prototype._filterConnType = function (connType) {
        var len = this._connectionListByType &&
            this._connectionListByType.hasOwnProperty(connType) ? this._connectionListByType[connType].length : 0,
            connComponentId,
            gmeSrcId,
            gmeDstId,
            connTexts,
            pointerName;

        this._filteredOutConnectionDescriptors[connType] = [];

        this._widget.beginUpdate();

        while (len--) {
            connComponentId = this._connectionListByType[connType][len];

            gmeSrcId = this._connectionListByID[connComponentId].GMESrcId;
            gmeDstId = this._connectionListByID[connComponentId].GMEDstId;
            connTexts = this._connectionListByID[connComponentId].connTexts;

            if (connType === MetaRelations.META_RELATIONS.POINTER) {
                pointerName = this._connectionListByID[connComponentId].name;
            }

            this._filteredOutConnectionDescriptors[connType].push([gmeSrcId, gmeDstId, connTexts]);

            this._removeConnection(gmeSrcId, gmeDstId, connType, pointerName);
        }

        this._widget.endUpdate();
    };

    CrosscutController.prototype._unfilterConnType = function (connType) {
        //FIXME: What does this mean?
        var len = this._filteredOutConnectionDescriptors &&
            this._filteredOutConnectionDescriptors.hasOwnProperty(connType) ?
                this._filteredOutConnectionDescriptors[connType].length : 0,
            gmeSrcId,
            gmeDstId,
            connTexts;

        this._widget.beginUpdate();

        while (len--) {
            gmeSrcId = this._filteredOutConnectionDescriptors[connType][len][0];
            gmeDstId = this._filteredOutConnectionDescriptors[connType][len][1];
            connTexts = this._filteredOutConnectionDescriptors[connType][len][2];

            this._createConnection(gmeSrcId, gmeDstId, connType, connTexts);
        }

        delete this._filteredOutConnectionDescriptors[connType];

        this._widget.endUpdate();
    };

    CrosscutController.prototype._updateCrosscutRegistry = function () {
        var containerNode = this._client.getNode(this._memberListContainerID),
            regItem = containerNode.getEditableRegistry(REGISTRY_KEYS.CROSSCUTS),
            i, crosscutId = Number(this._activeCrosscutId);

        for (i = 0; i < regItem.length; i += 1) {
            if (regItem[i].order === crosscutId) {
                regItem[i].filter = this._filteredOutConnTypes;
            }
        }

        this._client.setRegistry(this._memberListContainerID, REGISTRY_KEYS.CROSSCUTS, regItem);
    };

    CrosscutController.prototype._selectedTabChanged = function (tabId) {
        if (tabId === this._activeCrosscutId) {
            return;
        }
        //we have to clear the filter, then load it, and apply
        this._activeCrosscutId = tabId;
        this._initActiveTab = true;

        var containerNode = this._client.getNode(this._memberListContainerID),
            regItem = containerNode ? containerNode.getEditableRegistry(REGISTRY_KEYS.CROSSCUTS) : [],
            i, crosscutId = Number(this._activeCrosscutId),
            filter = [];

        for (i = 0; i < regItem.length; i += 1) {
            if (regItem[i].order === crosscutId) {
                filter = regItem[i].filter || [];
            }
        }

        //reset filter
        if (this._widget._filterCheckboxes[MetaRelations.META_RELATIONS.CONTAINMENT]) {
            this._widget.setChecked(MetaRelations.META_RELATIONS.CONTAINMENT, true);
        }
        if (this._widget._filterCheckboxes[MetaRelations.META_RELATIONS.POINTER]) {
            this._widget.setChecked(MetaRelations.META_RELATIONS.POINTER, true);
        }
        if (this._widget._filterCheckboxes[MetaRelations.META_RELATIONS.INHERITANCE]) {
            this._widget.setChecked(MetaRelations.META_RELATIONS.INHERITANCE, true);
        }
        if (this._widget._filterCheckboxes[MetaRelations.META_RELATIONS.SET]) {
            this._widget.setChecked(MetaRelations.META_RELATIONS.SET, true);
        }

        //now setting the saved values
        for (i = 0; i < filter.length; i += 1) {
            this._widget.setChecked(filter[i], false);
        }

        this._initActiveTab = false;
    };

    CrosscutController.getDefaultConfig = function () {
        return {
            autoCreateCrosscut: false
        };
    };

    CrosscutController.getComponentId = function () {
        return 'GenericUICrosscutController';
    };

    return CrosscutController;
});
