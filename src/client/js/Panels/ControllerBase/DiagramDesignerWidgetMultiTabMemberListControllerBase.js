/*globals define, _, WebGMEGlobal, $ */
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger',
    'common/util/guid',
    'js/Constants',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    'js/Utils/GMEConcepts',
    'js/Utils/GMEVisualConcepts',
    'js/DragDrop/DragHelper',
    'js/Utils/PreferencesHelper',
    'js/Controls/AlignMenu'
], function (Logger,
             generateGuid,
             CONSTANTS,
             nodePropertyNames,
             REGISTRY_KEYS,
             GMEConcepts,
             GMEVisualConcepts,
             DragHelper,
             PreferencesHelper,
             AlignMenu) {

    'use strict';

    var DiagramDesignerWidgetMultiTabMemberListControllerBase,
        DEFAULT_DECORATOR = 'ModelDecorator',
        WIDGET_NAME = 'DiagramDesigner',
        SRC_POINTER_NAME = CONSTANTS.POINTER_SOURCE,
        DST_POINTER_NAME = CONSTANTS.POINTER_TARGET,
        DRAG_PARAMS_MULTI_TAB_MEMBER_LIST_CONTAINER_ID = 'DRAG_PARAMS_MULTI_TAB_MEMBER_LIST_CONTAINER_ID',
        MEMBER_POSITION_REGISTRY_KEY = REGISTRY_KEYS.POSITION;

    DiagramDesignerWidgetMultiTabMemberListControllerBase = function (options) {
        var loggerName = options.loggerName || 'gme:Panels:ControllerBase:' +
            'DiagramDesignerWidgetMultiTabMemberListControllerBase';
        this.logger = Logger.create(loggerName, WebGMEGlobal.gmeConfig.client.log);

        this._client = options.client;

        this.disableConnectionRendering = options.disableConnectionRendering;

        //initialize core collections and variables
        this._widget = options.widget;

        this._alignMenu = new AlignMenu(this._widget.CONSTANTS, {});

        if (this._client === undefined) {
            this.logger.error('DiagramDesignerWidgetMultiTabMemberListControllerBase\'s client is not specified...');
            throw ('DiagramDesignerWidgetMultiTabMemberListControllerBase can not be created');
        }

        if (this._widget === undefined) {
            this.logger.error('DiagramDesignerWidgetMultiTabMemberListControllerBase\'s widget is not specified...');
            throw ('DiagramDesignerWidgetMultiTabMemberListControllerBase can not be created');
        }

        this._attachDiagramDesignerWidgetEventHandlers();

        this.logger.debug('DiagramDesignerWidgetMultiTabMemberListControllerBase ctor finished');
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._attachDiagramDesignerWidgetEventHandlers =
        function () {
            var self = this;

            this._widget.onSelectedTabChanged = function (tabID) {
                self._onSelectedTabChanged(tabID);
            };

            this._widget.onBackgroundDroppableAccept = function (event, dragInfo) {
                return self._onBackgroundDroppableAccept(event, dragInfo);
            };

            this._widget.onBackgroundDrop = function (event, dragInfo, position) {
                self._onBackgroundDrop(event, dragInfo, position);
            };

            this._widget.getDragItems = function (selectedElements) {
                return self._getDragItems(selectedElements);
            };

            this._oGetDragParams = this._widget.getDragParams;
            this._widget.getDragParams = function (selectedElements, event) {
                return self._getDragParams(selectedElements, event);
            };

            this._widget.onSelectionDelete = function (idList) {
                self._onSelectionDelete(idList);
            };

            this._widget.onTabTitleChanged = function (tabID, oldValue, newValue) {
                self._onTabTitleChanged(tabID, oldValue, newValue);
            };

            this._widget.onTabsSorted = function (newTabIDOrder) {
                self._onTabsSorted(newTabIDOrder);
            };

            this._widget.onTabDeleteClicked = function (tabID) {
                self._onTabDeleteClicked(tabID);
            };

            this._widget.onTabAddClicked = function () {
                self._onTabAddClicked();
            };

            this._widget.onSelectionChanged = function (selectedIds) {
                self._onSelectionChanged(selectedIds);
            };

            this._widget.onSelectionFillColorChanged = function (selectedElements, color) {
                self._onSelectionSetColor(selectedElements, color, REGISTRY_KEYS.COLOR);
            };

            this._widget.onSelectionBorderColorChanged = function (selectedElements, color) {
                self._onSelectionSetColor(selectedElements, color, REGISTRY_KEYS.BORDER_COLOR);
            };

            this._widget.onSelectionTextColorChanged = function (selectedElements, color) {
                self._onSelectionSetColor(selectedElements, color, REGISTRY_KEYS.TEXT_COLOR);
            };

            this._widget.onConnectionSegmentPointsChange = function (params) {
                self._onConnectionSegmentPointsChange(params);
            };

            this._widget.onRegisterSubcomponent = function (objID, sCompID, metaInfo) {
                self._onRegisterSubcomponent(objID, sCompID, metaInfo);
            };

            this._widget.onUnregisterSubcomponent = function (objID, sCompID) {
                self._onUnregisterSubcomponent(objID, sCompID);
            };

            this._widget.onSelectionAlignMenu = function (selectedIds, mousePos) {
                self._onSelectionAlignMenu(selectedIds, mousePos);
            };

            this._widget.onAlignSelection = function (selectedIds, type) {
                self._onAlignSelection(selectedIds, type);
            };

            this._widget.onDesignerItemsMove = function (repositionDesc) {
                self._onDesignerItemsMove(repositionDesc);
            };
        };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype.selectedObjectChanged = function (nodeId) {
        var self = this,
            pattern;

        this.logger.debug('activeObject nodeId "' + nodeId + '"');

        //delete everything from model editor
        this._widget.clear();

        //remove current territory patterns
        if (this._territoryId) {
            this._client.removeUI(this._territoryId);
            if (this._selectedMemberListMembersTerritoryId) {
                this._client.removeUI(this._selectedMemberListMembersTerritoryId);
            }
            this._widget.clearTabs();
        }

        nodeId = this._validateNodeId(nodeId);

        this._memberListContainerID = nodeId;
        this._selectedMemberListID = undefined;

        if (nodeId || nodeId === CONSTANTS.PROJECT_ROOT_ID) {
            //put new node's info into territory rules
            pattern = {};
            pattern[nodeId] = {children: 0};

            this._widget.showProgressbar();

            this._territoryId = this._client.addUI(this, function (/*events*/) {
                self._processMemberListContainer();
                self._widget.hideProgressbar();
            });
            //update the territory
            this._client.updateTerritory(this._territoryId, pattern);
        } else {
            this._widget.setBackgroundText('No object to display...');
        }
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._validateNodeId = function (nodeId) {
        //do not work on ROOT element
        if (nodeId === CONSTANTS.PROJECT_ROOT_ID) {
            nodeId = undefined;
        }

        return nodeId;
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._stateActiveObjectChanged = function (model, activeObjectId) {
        if (this._memberListContainerID === activeObjectId) {
            // [patrik] added this check to avoid redrawing when becoming active in split panel mode.
            this.logger.debug('Disregarding activeObject changed when it is already the same.');
        } else {
            this.selectedObjectChanged(activeObjectId);
        }
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._stateActiveTabChanged = function (model, tabId) {
        if (this._tabIDMemberListID && this._selectedMemberListID !== this._tabIDMemberListID[tabId]) {
            this._widget.selectTab(tabId + '');
        }
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._stateActiveSelectionChanged = function (model, activeSelection, opts) {
        var selectedIDs = [],
            len = activeSelection ? activeSelection.length : 0;

        if (opts.invoker !== this) {

            while (len--) {
                if (this._GMEID2ComponentID.hasOwnProperty(activeSelection[len])) {
                    selectedIDs = selectedIDs.concat(this._GMEID2ComponentID[activeSelection[len]]);
                }
            }

            this._widget.select(selectedIDs);
        }
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._attachClientEventListeners = function () {
        this._detachClientEventListeners();
        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged, this);
        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_SELECTION, this._stateActiveSelectionChanged, this);
        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_TAB, this._stateActiveTabChanged, this);
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._detachClientEventListeners = function () {
        WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged);
        WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_SELECTION, this._stateActiveSelectionChanged);
        WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_TAB, this._stateActiveTabChanged);

    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype.onActivate = function () {
        this._attachClientEventListeners();
        this._displayToolbarItems();

        //setting the active object to the container
        if (typeof this._memberListContainerID === 'string') {
            WebGMEGlobal.State.registerActiveObject(this._memberListContainerID, {suppressVisualizerFromNode: true});
        }
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype.onDeactivate = function () {
        this._detachClientEventListeners();
        this._hideToolbarItems();
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._displayToolbarItems = function () {
        var i;
        if (this._toolbarInitialized === true) {
            for (i = 0; i < this._toolbarItems.length; i++) {
                this._toolbarItems[i].show();
            }
        } else {
            this._initializeToolbar();
        }
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._hideToolbarItems = function () {
        var i;
        if (this._toolbarInitialized === true) {
            for (i = 0; i < this._toolbarItems.length; i++) {
                this._toolbarItems[i].hide();
            }
        }
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._removeToolbarItems = function () {
        var i;
        if (this._toolbarInitialized === true) {
            for (i = 0; i < this._toolbarItems.length; i++) {
                this._toolbarItems[i].destroy();
            }
        }
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._initializeToolbar = function () {
        this._toolbarItems = [];

        this._toolbarInitialized = true;
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype.setReadOnly = function (/* isReadOnly */) {

    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype.destroy = function () {
        this._detachClientEventListeners();
        this._removeToolbarItems();
        this._client.removeUI(this._territoryId);
        if (this._selectedMemberListMembersTerritoryId) {
            this._client.removeUI(this._selectedMemberListMembersTerritoryId);
        }
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._processMemberListContainer = function () {
        var memberListContainerObj = this._client.getNode(this._memberListContainerID),
            orderedMemberListInfo,
            i,
            memberListTabID,
            selectedMemberListTabID,
            memberListID,
            tabTitle,
            deleteTab,
            renameTab,
            j,
            gmeID;

        this.logger.debug('_processMemberListContainer');

        //#1 - clear tabs
        this._widget.clearTabs();

        this._tabIDMemberListID = {};

        this._memberListMembers = {};
        this._memberListMemberCoordinates = {};

        if (memberListContainerObj) {
            //display name of the container
            this._displayContainerObjectName();

            //#2 - get pointer lists and display a tab for each one
            orderedMemberListInfo = this.getOrderedMemberListInfo(memberListContainerObj) || [];

            if (orderedMemberListInfo.length > 0) {
                this._widget.addMultipleTabsBegin();

                for (i = 0; i < orderedMemberListInfo.length; i += 1) {
                    memberListID = orderedMemberListInfo[i].memberListID;
                    tabTitle = orderedMemberListInfo[i].title;
                    deleteTab = orderedMemberListInfo[i].enableDeleteTab && true;
                    renameTab = orderedMemberListInfo[i].enableRenameTab && true;

                    //create tab
                    memberListTabID = this._widget.addTab(tabTitle, deleteTab, renameTab);
                    this._tabIDMemberListID[memberListTabID] = memberListID;

                    //get members of this pointer list
                    this._memberListMembers[memberListID] = memberListContainerObj.getMemberIds(memberListID);

                    //get member coordinates
                    this._memberListMemberCoordinates[memberListID] = {};
                    j = this._memberListMembers[memberListID].length;
                    while (j--) {
                        gmeID = this._memberListMembers[memberListID][j];
                        this._memberListMemberCoordinates[memberListID][gmeID] =
                            memberListContainerObj.getMemberRegistry(memberListID, gmeID, MEMBER_POSITION_REGISTRY_KEY);
                    }

                    //#3 - set selected based on actual selection
                    //if there is no actual selection, select thr first tab
                    if (this._selectedMemberListID &&
                        this._selectedMemberListID === memberListID) {
                        selectedMemberListTabID = memberListTabID;
                    }
                }

                this._widget.addMultipleTabsEnd();

                //set tab based on the UI state
                if (!selectedMemberListTabID &&
                    WebGMEGlobal.State.getActiveTab() !== null && WebGMEGlobal.State.getActiveTab() !== undefined &&
                    WebGMEGlobal.State.getActiveTab() < Object.keys(this._tabIDMemberListID).length) {
                    selectedMemberListTabID = WebGMEGlobal.State.getActiveTab();
                }

                if (!selectedMemberListTabID) {
                    for (selectedMemberListTabID in this._tabIDMemberListID) {
                        if (this._tabIDMemberListID.hasOwnProperty(selectedMemberListTabID)) {
                            break;
                        }
                    }
                }

                this._widget.selectTab(selectedMemberListTabID);

                this._updateSelectedMemberListMembersTerritoryPatterns();
            } else {
                this.displayNoTabMessage();
            }
        }
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._updateSelectedMemberListMembersTerritoryPatterns =
        function () {
            var currentlyDisplayedMembers = (this._selectedMemberListMembers || []).slice(0),
                actualMembers = (this._memberListMembers[this._selectedMemberListID] || []).slice(0),
                diff,
                len,
                territoryChanged = false,
                territoryId = this._selectedMemberListMembersTerritoryId,
                territoryPatterns = this._selectedMemberListMembersTerritoryPatterns,
                client = this._client,
                desc,
                obj;

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
                territoryPatterns[diff[len]] = {children: 0};
                territoryChanged = true;
            }

            //let's update the one that has not been changed but their position might have
            diff = _.intersection(actualMembers, currentlyDisplayedMembers);
            len = diff.length;
            this._widget.beginUpdate();
            while (len--) {
                //only items are interesting since only those position is stored in the container's set's registry
                //connections are interesting too since their color or segment points could have changed
                // which is set specific
                if (this.disableConnectionRendering || GMEConcepts.isConnection(diff[len]) === false) {
                    this._onUpdate(diff[len], {isConnection: false});
                } else {
                    if (this._delayedConnectionsAsItems[diff[len]]) {
                        //delayed connection, rendered as an item
                        this._onUpdate(diff[len], {isConnection: false});
                    } else {
                        //real connection
                        desc = {isConnection: true};
                        obj = client.getNode(diff[len]);
                        if (obj) {
                            desc.srcID = obj.getPointer(SRC_POINTER_NAME).to;
                            desc.dstID = obj.getPointer(DST_POINTER_NAME).to;
                            this._onUpdate(diff[len], desc);
                        }
                    }
                }
            }
            this._widget.endUpdate();

            //save current list of members
            this._selectedMemberListMembers = actualMembers;

            if (territoryChanged) {
                setTimeout(function () {
                    client.updateTerritory(territoryId, territoryPatterns);
                }, 10);
            }
        };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype.getOrderedMemberListInfo = function (memberListContainerObject) {
        //result should be an array of objects:
        /*{
         'memberListID': setNames[len],
         'title': setNames[len],
         'enableDeleteTab': true,
         'enableRenameTab': true
         };
         */

        this.logger.warn('DiagramDesignerWidgetMultiTabMemberListControllerBase.getOrderedMemberListInfo(memberList' +
            'ContainerObject) is not overridden for object "' + memberListContainerObject + '", returning default...');

        return undefined;
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype.getMemberListSetsRegistryKey = function () {
        this.logger.warn('DiagramDesignerWidgetMultiTabMemberListControllerBase.getMemberListSetsRegistryKey is not ' +
            'overridden, returning default value...');
        return undefined;
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onSelectedTabChanged = function (tabID) {
        if (this._tabIDMemberListID[tabID] && this._selectedMemberListID !== this._tabIDMemberListID[tabID]) {
            this._selectedMemberListID = this._tabIDMemberListID[tabID];

            this.logger.debug('_selectedMemberListID changed to : ' + this._selectedMemberListID);

            this._initializeSelectedMemberList();
            WebGMEGlobal.State.registerActiveTab(tabID);
        }
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._getDragParams = function (selectedElements,
                                                                                               event) {
        var oParams = this._oGetDragParams.call(this._widget, selectedElements, event),
            params = {positions: {}},
            i;

        params[DRAG_PARAMS_MULTI_TAB_MEMBER_LIST_CONTAINER_ID] = this._getDragParamsDataID();

        for (i in oParams.positions) {
            if (oParams.positions.hasOwnProperty(i)) {
                params.positions[this._ComponentID2GMEID[i]] = oParams.positions[i];
            }
        }

        return params;
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._getDragItems = function (selectedElements) {
        var res = [],
            i = selectedElements.length;

        while (i--) {
            res.push(this._ComponentID2GMEID[selectedElements[i]]);
        }

        return res;
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._getDragParamsDataID = function () {
        return this._memberListContainerID + this._selectedMemberListID;
    };

    /**********************************************************/
    /*         HANDLE OBJECT DRAG & DROP ACCEPTANCE           */
    /**********************************************************/
    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onBackgroundDroppableAccept = function (event,
                                                                                                             dragInfo) {
        var gmeIDList = DragHelper.getDragItems(dragInfo),
            params = DragHelper.getDragParams(dragInfo),
            dragEffects = DragHelper.getDragEffects(dragInfo),
            i,
            accept = false;

        //check to see if there is a currently selected memberlist to add the dragged elements to
        if (this._selectedMemberListID) {
            //accept is self reposition OR
            //dragging from somewhere else and the items are not on the sheet yet
            if (params &&
                params.hasOwnProperty(DRAG_PARAMS_MULTI_TAB_MEMBER_LIST_CONTAINER_ID) &&
                params[DRAG_PARAMS_MULTI_TAB_MEMBER_LIST_CONTAINER_ID] === this._getDragParamsDataID()) {
                //reposition on the same sheet
                accept = true;
            } else {
                //dragging from somewhere else
                if (dragEffects.length === 1 &&
                    dragEffects[0] === DragHelper.DRAG_EFFECTS.DRAG_CREATE_INSTANCE) {
                    //dragging from PartBrowser
                    accept = false;
                } else {
                    //return true if none of the dragged items are on the sheet already
                    //and do not try to add the container item itself as member of the list
                    if (gmeIDList.length > 0) {
                        accept = true;
                        for (i = 0; i < gmeIDList.length; i += 1) {
                            if (gmeIDList[i] === this._memberListContainerID) {
                                accept = false;
                                break;
                            } else if (this._memberListMembers[this._selectedMemberListID]
                                    .indexOf(gmeIDList[i]) !== -1) {

                                accept = false;
                                break;
                            }
                        }
                    }
                }
            }
        }

        return accept;
    };
    /**********************************************************/
    /*  END OF --- HANDLE OBJECT DRAG & DROP ACCEPTANCE       */
    /**********************************************************/

    /**********************************************************/
    /*  HANDLE OBJECT DRAG & DROP TO SHEET                    */
    /**********************************************************/
    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onBackgroundDrop = function (event, dragInfo,
                                                                                                  position) {
        var client = this._client,
            memberListContainerID = this._memberListContainerID,
            memberListToAddTo = this._selectedMemberListID,
            gmeIDList = DragHelper.getDragItems(dragInfo),
            params = DragHelper.getDragParams(dragInfo),
            i,
            selectedIDs = [],
            componentID,
            posX,
            posY;

        //check to see it self drop and reposition or dropping from somewhere else
        if (params &&
            params.hasOwnProperty(DRAG_PARAMS_MULTI_TAB_MEMBER_LIST_CONTAINER_ID) &&
            params[DRAG_PARAMS_MULTI_TAB_MEMBER_LIST_CONTAINER_ID] === this._getDragParamsDataID()) {

            //params.position holds the old coordinates of the items being dragged
            //update UI
            client.startTransaction();
            this._widget.beginUpdate();

            for (i in params.positions) {
                if (params.positions.hasOwnProperty(i)) {

                    posX = position.x + params.positions[i].x;
                    posY = position.y + params.positions[i].y;

                    client.setMemberRegistry(memberListContainerID,
                        i,
                        memberListToAddTo,
                        MEMBER_POSITION_REGISTRY_KEY,
                        {
                            x: posX,
                            y: posY
                        });

                    componentID = this._GMEID2ComponentID[i][0];

                    selectedIDs.push(componentID);
                    this._widget.updateDesignerItem(componentID, {position: {x: posX, y: posY}});
                }
            }

            this._widget.endUpdate();
            this._widget.select(selectedIDs);

            client.completeTransaction();
        } else {
            client.startTransaction();

            //if the item is not currently in the currently selected member list, add it
            if (gmeIDList.length > 0) {
                for (i = 0; i < gmeIDList.length; i += 1) {
                    componentID = gmeIDList[i];
                    if (this._memberListMembers[memberListToAddTo].indexOf(componentID) === -1) {

                        posX = position.x;
                        posY = position.y;

                        //when dragging between ASPECT sheets, read position from dragParams
                        if (params &&
                            params.positions &&
                            params.positions[componentID]) {

                            posX += params.positions[componentID].x;
                            posY += params.positions[componentID].y;
                        } else {
                            position.x += 20;
                            position.y += 20;
                        }

                        client.addMember(memberListContainerID, componentID, memberListToAddTo);
                        client.setMemberRegistry(memberListContainerID,
                            componentID,
                            memberListToAddTo,
                            MEMBER_POSITION_REGISTRY_KEY,
                            {
                                x: posX,
                                y: posY
                            });
                    }
                }
            }

            client.completeTransaction();
        }
    };
    /**********************************************************/
    /*  END OF --- HANDLE OBJECT DRAG & DROP TO SHEET         */
    /**********************************************************/

    /*************************************************************/
    /*  HANDLE OBJECT / CONNECTION DELETION IN THE ASPECT ASPECT */
    /*************************************************************/
    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onSelectionDelete = function (idList) {
        var client = this._client,
            memberListContainerID = this._memberListContainerID,
            memberListToRemoveFrom = this._selectedMemberListID,
            len,
            gmeID;

        client.startTransaction();

        len = idList.length;
        while (len--) {
            gmeID = this._ComponentID2GMEID[idList[len]];
            client.removeMember(memberListContainerID, gmeID, memberListToRemoveFrom);
        }

        client.completeTransaction();
    };
    /************************************************************************/
    /*  END OF --- HANDLE OBJECT / CONNECTION DELETION IN THE ASPECT ASPECT */
    /************************************************************************/

    //initialize the selected memberlist's members
    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._initializeSelectedMemberList = function () {
        var len,
            self = this;

        this.logger.debug('_initializeSelectedMemberList');

        //delete everything from model editor
        this._widget.clear();

        //display name
        this._displayContainerObjectName();

        //clean up local hash map
        this._GMEID2ComponentID = {};
        this._ComponentID2GMEID = {};

        this._GMEID2Subcomponent = {};
        this._Subcomponent2GMEID = {};

        this._connectionWaitingListByDstGMEID = {};
        this._connectionWaitingListBySrcGMEID = {};

        this._connectionListBySrcGMEID = {};
        this._connectionListByDstGMEID = {};
        this._connectionListByID = {};

        this._componentIDPartIDMap = {};

        this._selectedMemberListMembers = [];
        this._delayedConnections = [];
        this._delayedConnectionsAsItems = {};

        //remove current territory patterns
        if (this._selectedMemberListMembersTerritoryId) {
            this._client.removeUI(this._selectedMemberListMembersTerritoryId);
        }

        this._selectedMemberListMembersTerritoryPatterns = {};

        if (this._selectedMemberListID && this._memberListMembers[this._selectedMemberListID]) {
            len = this._memberListMembers[this._selectedMemberListID].length;
            if (len > 0) {
                this._widget.showProgressbar();
            }
            while (len--) {
                this._selectedMemberListMembers.push(this._memberListMembers[this._selectedMemberListID][len]);

                this._selectedMemberListMembersTerritoryPatterns[this._memberListMembers[
                    this._selectedMemberListID][len]] = {children: 0};
            }
        }

        this._selectedMemberListMembersTerritoryId = this._client.addUI(this, function (events) {
            self._memberListTerritoryCallback(events);
        });

        this._client.updateTerritory(this._selectedMemberListMembersTerritoryId,
            this._selectedMemberListMembersTerritoryPatterns);
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._memberListTerritoryCallback = function (events) {
        var decoratorsToDownload = [DEFAULT_DECORATOR],
            len = events.length,
            obj,
            objDecorator,
            client = this._client,
            self = this;

        while (len--) {
            if ((events[len].etype === CONSTANTS.TERRITORY_EVENT_LOAD) ||
                (events[len].etype === CONSTANTS.TERRITORY_EVENT_UPDATE)) {

                obj = client.getNode(events[len].eid);

                events[len].desc = {
                    isConnection: !this.disableConnectionRendering && GMEConcepts.isConnection(events[len].eid)
                };

                if (obj) {
                    //if it is a connection find src and dst and do not care about decorator
                    if (events[len].desc.isConnection === true) {
                        events[len].desc.srcID = obj.getPointer(SRC_POINTER_NAME).to;
                        events[len].desc.dstID = obj.getPointer(DST_POINTER_NAME).to;
                    } else {
                        objDecorator = obj.getRegistry(REGISTRY_KEYS.DECORATOR);

                        if (!objDecorator ||
                            objDecorator === '') {
                            objDecorator = DEFAULT_DECORATOR;
                        }

                        if (decoratorsToDownload.indexOf(objDecorator) === -1) {
                            decoratorsToDownload.pushUnique(objDecorator);
                        }

                        events[len].desc.decorator = objDecorator;
                    }
                }
            }
        }

        client.decoratorManager.download(decoratorsToDownload, WIDGET_NAME, function () {
            self._dispatchEvents(events);
        });
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._dispatchEvents = function (events) {
        var i,
            e,
            territoryChanged = false,
            j,
            ce,
            orderedItemEvents = [],
            orderedConnectionEvents = [],
            unloadEvents,

            srcGMEID,
            dstGMEID,
            srcConnIdx,
            dstConnIdx,
            insertIdxAfter,
            insertIdxBefore,
            MAX_VAL = 999999999,
            depSrcConnIdx = MAX_VAL,
            depDstConnIdx = MAX_VAL;

        this.logger.debug('_dispatchEvents "' + events.length + '" items: ' + JSON.stringify(events));

        this._widget.beginUpdate();
        //first call the updates of the decorators so they can pu out any port they use
        j = Object.keys(this._GMEID2ComponentID || {});
        for (i = 0; i < j.length; i += 1) {
            if (this._widget.items[this._GMEID2ComponentID[j[i]]] &&
                this._widget.items[this._GMEID2ComponentID[j[i]]]._decoratorInstance) {
                this._widget.items[this._GMEID2ComponentID[j[i]]]._decoratorInstance.update();
            }
        }
        //decorators have been updated we can move on

        /********** ORDER EVENTS BASED ON DEPENDENCY ************/
        /** 1: items first, no dependency **/
        /** 2: connections second, dependency if a connection is connected to an other connection **/

        if (this._delayedConnections && this._delayedConnections.length > 0) {
            //if there are saved connections, first check if any UPDATE or UNLOAD event is about them
            //if so, remove/update those information from delayed connections list
            i = events.length;
            while (i--) {
                e = events[i];
                if (e.etype === CONSTANTS.TERRITORY_EVENT_UNLOAD) {
                    //if it's an unload, remove the delayed connection entry
                    j = this._delayedConnections.length;
                    while (j--) {
                        if (this._delayedConnections[j].ID === e.eid) {
                            this.logger.debug('Removing ' + e.eid + ' from delayed connections...');
                            this._delayedConnections.splice(j, 1);

                            //TODO: find a better solution for removing connection, if
                            // visualized as a box
                            this._widget.deleteComponent(this._delayedConnectionsAsItems[e.eid]);

                            delete this._delayedConnectionsAsItems[e.eid];
                        }
                    }
                } else if (e.etype === CONSTANTS.TERRITORY_EVENT_UPDATE &&
                    e.desc.isConnection === true) {
                    //if it is an UPDATE, update the SRC and DST info
                    j = this._delayedConnections.length;
                    while (j--) {
                        if (this._delayedConnections[j].ID === e.eid) {
                            this.logger.debug('Updating ' + e.eid + ' in delayed connections...');
                            this._delayedConnections[j].desc.srcID = e.desc.srcID;
                            this._delayedConnections[j].desc.dstID = e.desc.dstID;

                            //remove this guy from the event list since it will be added to orderedConnectionEvents list
                            events.splice(i, 1);
                        }
                    }
                }
            }

            for (i = 0; i < this._delayedConnections.length; i += 1) {
                if (this._delayedConnections[i].desc.src && this._delayedConnections[i].desc.dst) {
                    //otherwise there is no possible way for this box to became a connection...
                    orderedConnectionEvents.push({
                        etype: CONSTANTS.TERRITORY_EVENT_LOAD,
                        eid: this._delayedConnections[i].ID,
                        desc: this._delayedConnections[i].desc
                    });

                    //TODO: connection as box
                    //remove the box that represents this connections
                    this._widget.deleteComponent(this._delayedConnectionsAsItems[this._delayedConnections[i].ID]);
                    delete this._delayedConnectionsAsItems[this._delayedConnections[i].ID];
                }
            }
        }

        this._delayedConnections = [];
        this._delayedConnectionsAsItems = {};

        unloadEvents = [];
        i = events.length;
        while (i--) {
            e = events[i];

            if (e.etype !== CONSTANTS.TERRITORY_EVENT_COMPLETE && e.etype !== CONSTANTS.TERRITORY_EVENT_INCOMPLETE) {
                if (e.etype === CONSTANTS.TERRITORY_EVENT_UNLOAD) {
                    unloadEvents.push(e);
                } else if (e.desc.isConnection === false) {
                    orderedItemEvents.push(e);
                } else if (e.desc.isConnection === true) {
                    srcGMEID = e.desc.srcID;
                    dstGMEID = e.desc.dstID;

                    //check to see if SRC and DST is another connection
                    //if so, put this guy AFTER them
                    srcConnIdx = -1;
                    dstConnIdx = -1;
                    j = orderedConnectionEvents.length;
                    while (j--) {
                        ce = orderedConnectionEvents[j];
                        if (ce.id === srcGMEID) {
                            srcConnIdx = j;
                        } else if (ce.id === dstGMEID) {
                            dstConnIdx = j;
                        }

                        if (srcConnIdx !== -1 && dstConnIdx !== -1) {
                            break;
                        }
                    }

                    insertIdxAfter = Math.max(srcConnIdx, dstConnIdx);

                    //check to see if this guy is a DEPENDENT of any already processed CONNECTION
                    //insert BEFORE THEM
                    j = orderedConnectionEvents.length;
                    while (j--) {
                        ce = orderedConnectionEvents[j];
                        if (e.eid === ce.desc.srcID) {
                            depSrcConnIdx = j;
                        } else if (e.eid === ce.desc.dstID) {
                            depDstConnIdx = j;
                        }

                        if (depSrcConnIdx !== MAX_VAL && depDstConnIdx !== MAX_VAL) {
                            break;
                        }
                    }

                    insertIdxBefore = Math.min(depSrcConnIdx, depDstConnIdx);
                    if (insertIdxAfter === -1 && insertIdxBefore === MAX_VAL) {
                        orderedConnectionEvents.push(e);
                    } else {
                        if (insertIdxAfter !== -1 &&
                            insertIdxBefore === MAX_VAL) {
                            orderedConnectionEvents.splice(insertIdxAfter + 1, 0, e);
                        } else if (insertIdxAfter === -1 &&
                            insertIdxBefore !== MAX_VAL) {
                            orderedConnectionEvents.splice(insertIdxBefore, 0, e);
                        } else if (insertIdxAfter !== -1 &&
                            insertIdxBefore !== MAX_VAL) {
                            orderedConnectionEvents.splice(insertIdxBefore, 0, e);
                        }
                    }
                }
            }
        }

        this._notifyPackage = {};

        //item insert/update/unload & connection unload
        events = unloadEvents.concat(orderedItemEvents);
        for (i = 0; i < events.length; i += 1) {
            e = events[i];
            switch (e.etype) {
                case CONSTANTS.TERRITORY_EVENT_LOAD:
                    territoryChanged = this._onLoad(e.eid, e.desc) || territoryChanged;
                    break;
                case CONSTANTS.TERRITORY_EVENT_UPDATE:
                    this._onUpdate(e.eid, e.desc);
                    break;
                case CONSTANTS.TERRITORY_EVENT_UNLOAD:
                    territoryChanged = this._onUnload(e.eid) || territoryChanged;
                    break;
                default:
                    break;
            }
        }

        this._handleDecoratorNotification();

        //connections
        events = orderedConnectionEvents;
        for (i = 0; i < events.length; i += 1) {
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
                default:
                    break;
            }
        }

        this._widget.endUpdate();

        this._widget.hideProgressbar();

        //update the territory
        if (territoryChanged) {
            this.logger.debug('Updating territory with ruleset from decorators: ' + JSON.stringify(this._selfPatterns));

            this._client.updateTerritory(this._selectedMemberListMembersTerritoryId,
                this._selectedMemberListMembersTerritoryPatterns);
        }

        this.logger.debug('_dispatchEvents "' + events.length + '" items - DONE');
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._updateDecoratorTerritoryQuery = function (decorator, doDelete) {
        var query,
            entry,
            territoryPatterns = this._selectedMemberListMembersTerritoryPatterns,
            territoryChanged = false;

        if (decorator) {
            query = decorator.getTerritoryQuery();

            if (query) {
                for (entry in query) {
                    if (query.hasOwnProperty(entry)) {
                        if (doDelete) {
                            delete territoryPatterns[entry];
                        } else {
                            territoryPatterns[entry] = query[entry];
                        }

                        territoryChanged = true;
                    }
                }
            }
        }

        return territoryChanged;
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._getItemDecorator = function (decorator) {
        var result;

        result = this._client.decoratorManager.getDecoratorForWidget(decorator, WIDGET_NAME);

        if (!result) {
            result = this._client.decoratorManager.getDecoratorForWidget(DEFAULT_DECORATOR, WIDGET_NAME);
        }

        return result;
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._getAllSourceDestinationPairsForConnection = function (GMESrcId,
                                                                                                                           GMEDstId) {
        var sources = [],
            destinations = [],
            i;

        if (this._GMEID2ComponentID.hasOwnProperty(GMESrcId)) {
            //src is a DesignerItem
            i = this._GMEID2ComponentID[GMESrcId].length;
            while (i--) {
                sources.push({
                    objId: this._GMEID2ComponentID[GMESrcId][i],
                    subCompId: undefined
                });
            }
        } else {
            //src is not a DesignerItem
            //must be a sub_components somewhere, find the corresponding designerItem
            if (this._GMEID2Subcomponent && this._GMEID2Subcomponent.hasOwnProperty(GMESrcId)) {
                for (i in this._GMEID2Subcomponent[GMESrcId]) {
                    if (this._GMEID2Subcomponent[GMESrcId].hasOwnProperty(i)) {
                        sources.push({
                            objId: i,
                            subCompId: this._GMEID2Subcomponent[GMESrcId][i]
                        });
                    }
                }
            }
        }

        if (this._GMEID2ComponentID.hasOwnProperty(GMEDstId)) {
            i = this._GMEID2ComponentID[GMEDstId].length;
            while (i--) {
                destinations.push({
                    objId: this._GMEID2ComponentID[GMEDstId][i],
                    subCompId: undefined
                });
            }
        } else {
            //dst is not a DesignerItem
            //must be a sub_components somewhere, find the corresponding designerItem
            if (this._GMEID2Subcomponent && this._GMEID2Subcomponent.hasOwnProperty(GMEDstId)) {
                for (i in this._GMEID2Subcomponent[GMEDstId]) {
                    if (this._GMEID2Subcomponent[GMEDstId].hasOwnProperty(i)) {
                        destinations.push({
                            objId: i,
                            subCompId: this._GMEID2Subcomponent[GMEDstId][i]
                        });
                    }
                }
            }
        }

        return {
            sources: sources,
            destinations: destinations
        };
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onLoad = function (gmeID, desc) {
        var uiComponent,
            decClass,
            objDesc = {},
            sources = [],
            destinations = [],
            territoryChanged = false,

            srcDst,
            k,
            l,
            connVisualProperties,
            alreadySaved,
            len;

        // component loaded
        // we are interested in the load of member items and their custom territory involvement
        // check if the decorator is available before drawing
        if (this._selectedMemberListMembers.indexOf(gmeID) !== -1 && desc.decorator) {

            if (desc.isConnection === false) {

                decClass = this._getItemDecorator(desc.decorator);

                objDesc.decoratorClass = decClass;
                objDesc.control = this;
                objDesc.metaInfo = {};
                objDesc.metaInfo[CONSTANTS.GME_ID] = gmeID;

                objDesc.position = {x: 100, y: 100};

                if (this._memberListMemberCoordinates[this._selectedMemberListID] &&
                    this._memberListMemberCoordinates[this._selectedMemberListID][gmeID]) {
                    objDesc.position.x = this._memberListMemberCoordinates[this._selectedMemberListID][gmeID].x;
                    objDesc.position.y = this._memberListMemberCoordinates[this._selectedMemberListID][gmeID].y;
                }

                objDesc.decoratorParams = {};
                if (desc.decoratorParams) {
                    _.extend(objDesc.decoratorParams, desc.decoratorParams);
                }

                //registry preferences here are:
                //#1: local set membership registry
                objDesc.preferencesHelper = PreferencesHelper.getPreferences([{
                    containerID: this._memberListContainerID,
                    setID: this._selectedMemberListID
                }]);

                uiComponent = this._widget.createDesignerItem(objDesc);

                this._GMEID2ComponentID[gmeID] = this._GMEID2ComponentID[gmeID] || [];
                this._GMEID2ComponentID[gmeID].push(uiComponent.id);
                this._ComponentID2GMEID[uiComponent.id] = gmeID;

                territoryChanged = territoryChanged ||
                    this._updateDecoratorTerritoryQuery(uiComponent._decoratorInstance, false);
            } else {

                srcDst = this._getAllSourceDestinationPairsForConnection(desc.srcID, desc.dstID);
                sources = srcDst.sources;
                destinations = srcDst.destinations;

                k = sources.length;
                l = destinations.length;

                connVisualProperties = this._getConnectionVisualProperties(gmeID);

                if (k > 0 && l > 0) {
                    while (k--) {
                        while (l--) {
                            objDesc = {};
                            _.extend(objDesc, connVisualProperties);
                            objDesc.srcObjId = sources[k].objId;
                            objDesc.srcSubCompId = sources[k].subCompId;
                            objDesc.dstObjId = destinations[l].objId;
                            objDesc.dstSubCompId = destinations[l].subCompId;
                            objDesc.reconnectable = desc.reconnectable === undefined ? false : desc.reconnectable;
                            objDesc.editable = desc.editable === undefined ? false : desc.editable;

                            delete objDesc.source;
                            delete objDesc.target;

                            uiComponent = this._widget.createConnection(objDesc);

                            this.logger.debug('Connection: ' + uiComponent.id + ' for GME object: ' + gmeID);

                            this._GMEID2ComponentID[gmeID] = this._GMEID2ComponentID[gmeID] || [];
                            this._GMEID2ComponentID[gmeID].push(uiComponent.id);
                            this._ComponentID2GMEID[uiComponent.id] = gmeID;
                        }
                    }
                } else {
                    //the connection is here, but no valid endpoint on canvas
                    //save the connection
                    alreadySaved = false;
                    len = this._delayedConnections.length;
                    while (len--) {
                        if (this._delayedConnections[len].ID === gmeID) {
                            alreadySaved = true;
                            break;
                        }
                    }
                    if (alreadySaved !== true) {
                        this._delayedConnections.push({ID: gmeID, desc: desc});

                        //create item for this connection just to display it on the screen
                        this._displayConnectionAsItem(gmeID, desc);
                    }
                }
            }
        }

        //check if one of the decorators' is dependent on this
        this._checkComponentDependency(gmeID, CONSTANTS.TERRITORY_EVENT_LOAD);

        return territoryChanged;
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onUpdate = function (gmeID, desc) {
        var componentID,
            len,
            objDesc = {},
            srcDst,
            k,
            l,
            sources,
            destinations,
            connVisualProperties,
            uiComponent;

        //component updated
        //we are interested in the load of member items and their custom territory involvement
        if (this._selectedMemberListMembers.indexOf(gmeID) !== -1 &&
            this._GMEID2ComponentID[gmeID]) {
            if (desc.isConnection === false) {
                //this is an item on the screen
                len = this._GMEID2ComponentID[gmeID].length;
                while (len--) {
                    componentID = this._GMEID2ComponentID[gmeID][len];

                    objDesc = {position: {x: 100, y: 100}};

                    if (this._memberListMemberCoordinates[this._selectedMemberListID] &&
                        this._memberListMemberCoordinates[this._selectedMemberListID][gmeID]) {
                        objDesc.position.x = this._memberListMemberCoordinates[this._selectedMemberListID][gmeID].x;
                        objDesc.position.y = this._memberListMemberCoordinates[this._selectedMemberListID][gmeID].y;
                    }

                    if (desc && desc.decorator) {
                        objDesc.decoratorClass = this._getItemDecorator(desc.decorator);
                        objDesc.preferencesHelper = PreferencesHelper.getPreferences([{
                            containerID: this._memberListContainerID,
                            setID: this._selectedMemberListID
                        }]);
                    }

                    this._widget.updateDesignerItem(componentID, objDesc);
                }
            } else {
                //this is a connection on the screen
                len = this._GMEID2ComponentID[gmeID].length;
                srcDst = this._getAllSourceDestinationPairsForConnection(desc.srcID, desc.dstID);
                sources = srcDst.sources;
                destinations = srcDst.destinations;

                k = sources.length;
                l = destinations.length;
                len -= 1;

                connVisualProperties = this._getConnectionVisualProperties(gmeID);

                while (k--) {
                    while (l--) {
                        objDesc = {};
                        _.extend(objDesc, connVisualProperties);
                        objDesc.srcObjId = sources[k].objId;
                        objDesc.srcSubCompId = sources[k].subCompId;
                        objDesc.dstObjId = destinations[l].objId;
                        objDesc.dstSubCompId = destinations[l].subCompId;
                        objDesc.reconnectable = desc.reconnectable === undefined ? true : desc.reconnectable;
                        objDesc.editable = desc.editable === undefined ? true : desc.editable;

                        delete objDesc.source;
                        delete objDesc.target;

                        if (len >= 0) {
                            componentID = this._GMEID2ComponentID[gmeID][len];

                            this._widget.updateConnection(componentID, objDesc);

                            len -= 1;
                        } else {
                            this.logger.warn('Updating connections...Existing connections are less than the needed ' +
                                'src-dst combo...');
                            //let's create a connection
                            uiComponent = this._widget.createConnection(objDesc);
                            this.logger.debug('Connection: ' + uiComponent.id + ' for GME object: ' + gmeID);
                            this._GMEID2ComponentID[gmeID].push(uiComponent.id);
                            this._ComponentID2GMEID[uiComponent.id] = gmeID;
                        }
                    }
                }

                if (len >= 0) {
                    //some leftover connections on the widget
                    //delete them
                    len += 1;
                    while (len--) {
                        componentID = this._GMEID2ComponentID[gmeID][len];
                        //TODO plain designer items associated with the connection should not be removed
                        if (componentID.indexOf('C_') === 0) {
                            this._widget.deleteComponent(componentID);
                            this._GMEID2ComponentID[gmeID].splice(len, 1);
                            delete this._ComponentID2GMEID[componentID];
                        }
                    }
                }
            }
        } else if (this._selectedMemberListMembers.indexOf(gmeID) === -1 &&
            this._GMEID2ComponentID[gmeID]) {
            //item have been removed from the set but remained in the territory
            this._onUpdatePortToItem(gmeID, true, desc);

        } else if (this._selectedMemberListMembers.indexOf(gmeID) !== -1 && !this._GMEID2ComponentID[gmeID]) {
            //the item have been added to the set but was already in the territory
            this._onUpdatePortToItem(gmeID, false, desc);
        }

        //check if one of the decorators' is dependent on this
        this._checkComponentDependency(gmeID, CONSTANTS.TERRITORY_EVENT_UPDATE);
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onUnload = function (gmeID) {
        var componentID,
            len,
            territoryChanged = false,
            inOutConnections,
            cLen,
            connGMEID,
            connObj,
            alreadyThere,
            j,
            connDesc,
            idx;

        if (this._GMEID2ComponentID.hasOwnProperty(gmeID)) {
            len = this._GMEID2ComponentID[gmeID].length;
            while (len--) {
                componentID = this._GMEID2ComponentID[gmeID][len];

                if (this._widget.itemIds.indexOf(componentID) !== -1) {
                    territoryChanged = territoryChanged ||
                        this._updateDecoratorTerritoryQuery(
                            this._widget.items[componentID]._decoratorInstance,
                            true);
                }

                //query the associated connections
                inOutConnections = this._widget._getAssociatedConnectionsForItems([componentID]);

                this._widget.deleteComponent(componentID);

                delete this._ComponentID2GMEID[componentID];

                //delete all the associated connections
                //and save the connection as delayed connection
                if (inOutConnections && inOutConnections.length > 0) {
                    cLen = inOutConnections.length;
                    while (cLen--) {
                        componentID = inOutConnections[cLen];
                        connGMEID = this._ComponentID2GMEID[componentID];

                        //check if already saved for delayedConnections
                        alreadyThere = false;
                        for (j = 0; j < this._delayedConnections.length; j += 1) {
                            if (this._delayedConnections[j].ID === connGMEID) {
                                alreadyThere = true;
                                break;
                            }
                        }

                        if (alreadyThere === false) {
                            connObj = this._client.getNode(connGMEID);
                            connDesc = {
                                isConnection: true,
                                decorator: connObj.getRegistry(REGISTRY_KEYS.DECORATOR),
                                srcID: connObj.getPointer(SRC_POINTER_NAME).to,
                                dstID: connObj.getPointer(DST_POINTER_NAME).to
                            };

                            if (connObj) {
                                this._delayedConnections.push({
                                    ID: connGMEID,
                                    desc: connDesc
                                });

                                //create item for this connection just to display it on the screen
                                this._displayConnectionAsItem(connGMEID, connDesc);
                            }
                        }

                        //remove from screen
                        this._widget.deleteComponent(componentID);

                        //remove from accounting
                        delete this._ComponentID2GMEID[componentID];

                        idx = this._GMEID2ComponentID[connGMEID].indexOf(componentID);
                        if (idx > -1) {
                            this._GMEID2ComponentID[connGMEID].splice(idx, 1);
                        }
                    }
                }
            }

            delete this._GMEID2ComponentID[gmeID];
        }

        //check if one of the decorators' is dependent on this
        this._checkComponentDependency(gmeID, CONSTANTS.TERRITORY_EVENT_UNLOAD);

        return territoryChanged;
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onUpdatePortToItem =
        function (gmeID, remove, desc) {
            var members = this._selectedMemberListMembers,
                i,
                node, src, dst,
                connections = [];

            for (i = 0; i < members.length; i += 1) {
                node = this._client.getNode(members[i]);
                if (node && node.isConnection()) {
                    src = node.getPointer(SRC_POINTER_NAME).to;
                    dst = node.getPointer(DST_POINTER_NAME).to;
                    if (src === gmeID || dst === gmeID) {
                        this._onUnload.call(this, members[i]);
                        connections.push(members[i]);
                    }
                }
            }

            if (remove === true) {
                this._onUnload(gmeID);
            } else {
                this._onLoad(gmeID, desc);
            }

            for (i = 0; i < connections.length; i += 1) {
                node = this._client.getNode(connections[i]);
                src = node.getPointer(SRC_POINTER_NAME).to;
                dst = node.getPointer(DST_POINTER_NAME).to;
                this._onLoad.call(this, connections[i], {
                    isConnection: true,
                    srcID: src,
                    dstID: dst,
                    reconnectable: false,
                    editable: false
                });
            }
        };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype.registerComponentIDForPartID = function (componentID,
                                                                                                             partId) {
        this._componentIDPartIDMap[componentID] = this._componentIDPartIDMap[componentID] || [];
        if (this._componentIDPartIDMap[componentID].indexOf(partId) === -1) {
            this._componentIDPartIDMap[componentID].push(partId);
        }
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype.unregisterComponentIDFromPartID = function (componentID,
                                                                                                                partId) {
        var idx;

        if (this._componentIDPartIDMap && this._componentIDPartIDMap[componentID]) {
            idx = this._componentIDPartIDMap[componentID].indexOf(partId);
            if (idx !== -1) {
                this._componentIDPartIDMap[componentID].splice(idx, 1);

                if (this._componentIDPartIDMap[componentID].length === 0) {
                    delete this._componentIDPartIDMap[componentID];
                }
            }
        }
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._checkComponentDependency = function (gmeID,
                                                                                                          eventType) {
        var len;

        if (this._componentIDPartIDMap && this._componentIDPartIDMap[gmeID]) {
            len = this._componentIDPartIDMap[gmeID].length;
            while (len--) {
                this._notifyPackage[this._componentIDPartIDMap[gmeID][len]] =
                    this._notifyPackage[this._componentIDPartIDMap[gmeID][len]] || [];

                this._notifyPackage[this._componentIDPartIDMap[gmeID][len]].push({id: gmeID, event: eventType});
            }
        }
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._handleDecoratorNotification = function () {
        var gmeID,
            i,
            itemID;

        for (gmeID in this._notifyPackage) {
            if (this._notifyPackage.hasOwnProperty(gmeID)) {
                this.logger.debug('NotifyPartDecorator: ' + gmeID + ', componentIDs: ' +
                    JSON.stringify(this._notifyPackage[gmeID]));

                if (this._GMEID2ComponentID.hasOwnProperty(gmeID)) {
                    //src is a DesignerItem
                    i = this._GMEID2ComponentID[gmeID].length;
                    while (i--) {
                        itemID = this._GMEID2ComponentID[gmeID][i];
                        this._widget.notifyItemComponentEvents(itemID, this._notifyPackage[gmeID]);
                    }
                }
            }
        }
    };

    /*
     TAB RENAME EVENT HANDLER
     */
    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onTabTitleChanged = function (tabID, oldValue,
                                                                                                   newValue) {
        var memberListContainerID = this._memberListContainerID,
            memberListContainer,
            memberListSetsRegistryKey = this.getMemberListSetsRegistryKey(),
            memberListSetsRegistry,
            i,
            base,
            len,
            setID;

        if (memberListContainerID &&
            memberListSetsRegistryKey &&
            memberListSetsRegistryKey !== '') {
            memberListContainer = this._client.getNode(memberListContainerID);
            memberListSetsRegistry = memberListContainer.getOwnEditableRegistry(memberListSetsRegistryKey);
            base = this._client.getNode(memberListContainer.getBaseId());
            if (memberListSetsRegistry === undefined &&
                (base === null || base.getRegistry(memberListSetsRegistryKey) === undefined)) {
                memberListSetsRegistry = [];
            }

            if (this._tabIDMemberListID[tabID] && memberListSetsRegistry) {
                setID = this._tabIDMemberListID[tabID];

                len = memberListSetsRegistry.length;
                for (i = 0; i < len; i += 1) {
                    if (memberListSetsRegistry[i].SetID === setID) {
                        memberListSetsRegistry[i].title = newValue;
                        break;
                    }
                }

                this._client.setRegistry(memberListContainerID, memberListSetsRegistryKey, memberListSetsRegistry);
            }
        }
    };

    /*
     TAB REORDER EVENT HANDLER
     */
    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onTabsSorted = function (newTabIDOrder) {
        var memberListContainerID = this._memberListContainerID,
            memberListContainer,
            memberListSetsRegistryKey = this.getMemberListSetsRegistryKey(),
            memberListSetsRegistry,
            i,
            j,
            base,
            oldIDList = this._tabIDMemberListID,
            urlTab = WebGMEGlobal.State.getActiveTab(),
            setID;

        if (typeof memberListContainerID === 'string' &&
            memberListSetsRegistryKey &&
            memberListSetsRegistryKey !== '') {
            memberListContainer = this._client.getNode(memberListContainerID);
            memberListSetsRegistry = memberListContainer.getOwnEditableRegistry(memberListSetsRegistryKey);
            base = this._client.getNode(memberListContainer.getBaseId());
            if (memberListSetsRegistry === undefined &&
                (base === null || base.getRegistry(memberListSetsRegistryKey) === undefined)) {
                memberListSetsRegistry = [];
            }

            if (memberListSetsRegistry) {
                this._tabIDMemberListID = {};
                for (i = 0; i < newTabIDOrder.length; i += 1) {
                    //i is the new order number
                    //newTabIDOrder[i] is the tab identifier
                    if (urlTab === newTabIDOrder[i]) {
                        WebGMEGlobal.State.registerActiveTab(i);
                    }
                    setID = oldIDList[newTabIDOrder[i]];
                    this._tabIDMemberListID[i] = setID;
                    for (j = 0; j < memberListSetsRegistry.length; j += 1) {
                        if (memberListSetsRegistry[j].SetID === setID) {
                            memberListSetsRegistry[j].order = i;
                            break;
                        }
                    }
                }

                memberListSetsRegistry.sort(function (a, b) {
                    if (a.order < b.order) {
                        return -1;
                    } else {
                        return 1;
                    }
                });

                this._client.setRegistry(memberListContainerID, memberListSetsRegistryKey, memberListSetsRegistry);
            }
        }
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onTabDeleteClicked = function (tabID) {
        var memberListContainerID = this._memberListContainerID,
            memberListContainer,
            memberListSetsRegistryKey = this.getMemberListSetsRegistryKey(),
            memberListSetsRegistry,
            i,
            base,
            setID;

        if (typeof memberListContainerID === 'string') {
            setID = this._tabIDMemberListID[tabID];

            this._client.startTransaction();

            if (memberListSetsRegistryKey) {
                memberListContainer = this._client.getNode(memberListContainerID);
                memberListSetsRegistry = memberListContainer.getOwnEditableRegistry(memberListSetsRegistryKey);
                base = this._client.getNode(memberListContainer.getBaseId());
                if (memberListSetsRegistry === undefined &&
                    (base === null || base.getRegistry(memberListSetsRegistryKey) === undefined)) {
                    memberListSetsRegistry = [];
                }

                if (memberListSetsRegistry) {
                    i = memberListSetsRegistry.length;
                    while (i--) {
                        if (memberListSetsRegistry[i].SetID === setID) {
                            memberListSetsRegistry.splice(i, 1);
                            break;
                        }
                    }

                    //order remaining and reset order number
                    memberListSetsRegistry.sort(function (a, b) {
                        if (a.order < b.order) {
                            return -1;
                        } else {
                            return 1;
                        }
                    });

                    i = memberListSetsRegistry.length;
                    while (i--) {
                        memberListSetsRegistry[i].order = i;
                    }

                    this._client.setRegistry(memberListContainerID, memberListSetsRegistryKey, memberListSetsRegistry);
                }
            }

            //finally delete the sheet's SET
            this._client.deleteSet(memberListContainerID, setID);

            this._client.completeTransaction();
        }
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onTabAddClicked = function () {
        var memberListContainerID = this._memberListContainerID,
            memberListContainer,
            memberListSetsRegistryKey = this.getMemberListSetsRegistryKey(),
            memberListSetsRegistry,
            i,
            base,
            newSetID,
            newSetNamePrefixDesc,
            newSetDesc;

        if (this._canAddTab() &&
            memberListSetsRegistryKey &&
            memberListSetsRegistryKey !== '') {
            memberListContainer = this._client.getNode(memberListContainerID);
            memberListSetsRegistry = memberListContainer.getOwnEditableRegistry(memberListSetsRegistryKey);
            base = this._client.getNode(memberListContainer.getBaseId());
            if (memberListSetsRegistry === undefined &&
                (base === null || base.getRegistry(memberListSetsRegistryKey) === undefined)) {
                memberListSetsRegistry = [];
            }

            if (memberListSetsRegistry) {
                //reset set's order
                memberListSetsRegistry.sort(function (a, b) {
                    if (a.order < b.order) {
                        return -1;
                    } else {
                        return 1;
                    }
                });

                i = memberListSetsRegistry.length;
                while (i--) {
                    memberListSetsRegistry[i].order = i;
                }

                //create new Set's descriptor
                //create new aspect set in  meta container node
                newSetNamePrefixDesc = this.getNewSetNamePrefixDesc();

                newSetID = newSetNamePrefixDesc.SetID + generateGuid();

                newSetDesc = {
                    SetID: newSetID,
                    order: memberListSetsRegistry.length,
                    title: newSetNamePrefixDesc.Title + memberListSetsRegistry.length
                };

                memberListSetsRegistry.push(newSetDesc);

                //start transaction
                this._client.startTransaction();

                this._client.createSet(memberListContainerID, newSetID);

                this._client.setRegistry(memberListContainerID, memberListSetsRegistryKey, memberListSetsRegistry);

                //force switching to the new sheet if this is not the first sheet
                //if this is the first, it will be activated by default
                if (memberListSetsRegistry.length !== 1) {
                    this._selectedMemberListID = newSetID;
                }

                //finish transaction
                this._client.completeTransaction();
            }
        }
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._canAddTab = function () {
        var memberListContainerID = this._memberListContainerID;

        return (memberListContainerID && memberListContainerID !== CONSTANTS.PROJECT_ROOT_ID);
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype.getNewSetNamePrefixDesc = function () {
        var result = {
            SetID: 'SET_',
            Title: 'Tab '
        };

        this.logger.warn('DiagramDesignerWidgetMultiTabMemberListControllerBase.getNewSetNamePrefixDesc ' +
            'is not overridden, returning default value: ' + JSON.stringify(result));
        return result;
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onSelectionChanged = function (selectedIds) {
        var gmeIDs = [],
            len = selectedIds.length,
            id;

        while (len--) {
            id = this._ComponentID2GMEID[selectedIds[len]];
            if (id &&
                gmeIDs.indexOf(id) === -1) {
                gmeIDs.push(id);
            }
        }

        WebGMEGlobal.State.registerActiveSelection(gmeIDs, {invoker: this});
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype.displayNoTabMessage = function () {
        this._widget.setBackgroundText('NO TAB TO DISPLAY...');
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._displayContainerObjectName = function () {
        var memberListContainerObj = this._client.getNode(this._memberListContainerID);

        if (memberListContainerObj) {
            this._widget.setTitle(memberListContainerObj.getAttribute(nodePropertyNames.Attributes.name));
        }
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onSelectionSetColor = function (selectedIds, color,
                                                                                                     regKey) {
        var i = selectedIds.length,
            gmeID,
            containerID = this._memberListContainerID,
            setID = this._selectedMemberListID;

        this._client.startTransaction();
        while (i--) {
            gmeID = this._ComponentID2GMEID[selectedIds[i]];

            if (color) {
                this._client.setMemberRegistry(containerID, gmeID, setID, regKey, color);
            } else {
                this._client.delMemberRegistry(containerID, gmeID, setID, regKey);
            }
        }
        this._client.completeTransaction();
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._getConnectionVisualProperties = function (objID) {
        var connVisualProperties = GMEVisualConcepts.getConnectionVisualProperties(objID),
            memberListContainer = this._client.getNode(this._memberListContainerID),
            members,
            val;

        if (memberListContainer !== null &&
            memberListContainer.getSetNames().indexOf(this._selectedMemberListID) !== -1) {
            members = memberListContainer.getMemberIds(this._selectedMemberListID);
            if (members.indexOf(objID) !== -1) {
                //get custom color from the set's registry object
                val = memberListContainer.getMemberRegistry(this._selectedMemberListID, objID, REGISTRY_KEYS.COLOR);
                if (val) {
                    connVisualProperties[CONSTANTS.LINE_STYLE.COLOR] = val;
                }

                //get custom points from the set's registry object
                val = memberListContainer.getMemberRegistry(this._selectedMemberListID,
                    objID,
                    REGISTRY_KEYS.LINE_CUSTOM_POINTS);
                if (val && _.isArray(val)) {
                    connVisualProperties[CONSTANTS.LINE_STYLE.CUSTOM_POINTS] = $.extend(true, [], val);
                }
            }
        }

        return connVisualProperties;
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onConnectionSegmentPointsChange = function (params) {
        var connID = params.connectionID,
            points = params.points,
            gmeID = this._ComponentID2GMEID[connID],
            containerID = this._memberListContainerID,
            setID = this._selectedMemberListID,
            regKey = REGISTRY_KEYS.LINE_CUSTOM_POINTS;

        if (gmeID) {
            if (points && points.length > 0) {
                this._client.setMemberRegistry(containerID, gmeID, setID, regKey, points);
            } else {
                this._client.delMemberRegistry(containerID, gmeID, setID, regKey);
            }
        }
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onRegisterSubcomponent = function (objID, sCompID,
                                                                                                        metaInfo) {
        //store that a subcomponent with a given ID has been added to object with objID
        this._GMEID2Subcomponent[metaInfo[CONSTANTS.GME_ID]] = this._GMEID2Subcomponent[metaInfo[CONSTANTS.GME_ID]] ||
            {};
        this._GMEID2Subcomponent[metaInfo[CONSTANTS.GME_ID]][objID] = sCompID;

        this._Subcomponent2GMEID[objID] = this._Subcomponent2GMEID[objID] || {};
        this._Subcomponent2GMEID[objID][sCompID] = metaInfo[CONSTANTS.GME_ID];
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onUnregisterSubcomponent = function (objID,
                                                                                                          sCompID) {
        var gmeID = this._Subcomponent2GMEID[objID][sCompID];

        delete this._Subcomponent2GMEID[objID][sCompID];
        if (this._GMEID2Subcomponent[gmeID]) {
            delete this._GMEID2Subcomponent[gmeID][objID];
        }
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._displayConnectionAsItem = function (gmeID, desc) {
        var uiComponent,
            decClass,
            objDesc = {};

        decClass = this._getItemDecorator(desc.decorator);

        objDesc.decoratorClass = decClass;
        objDesc.control = this;
        objDesc.metaInfo = {};
        objDesc.metaInfo[CONSTANTS.GME_ID] = gmeID;

        objDesc.position = {x: 100, y: 100};

        if (this._memberListMemberCoordinates[this._selectedMemberListID] &&
            this._memberListMemberCoordinates[this._selectedMemberListID][gmeID]) {
            objDesc.position.x = this._memberListMemberCoordinates[this._selectedMemberListID][gmeID].x;
            objDesc.position.y = this._memberListMemberCoordinates[this._selectedMemberListID][gmeID].y;
        }

        objDesc.decoratorParams = {};
        if (desc.decoratorParams) {
            _.extend(objDesc.decoratorParams, desc.decoratorParams);
        }

        //registry preferences here are:
        //#1: local set membership registry
        objDesc.preferencesHelper = PreferencesHelper.getPreferences([{
            containerID: this._memberListContainerID,
            setID: this._selectedMemberListID
        }]);

        uiComponent = this._widget.createDesignerItem(objDesc);

        this._GMEID2ComponentID[gmeID] = this._GMEID2ComponentID[gmeID] || [];
        this._GMEID2ComponentID[gmeID].push(uiComponent.id);
        this._ComponentID2GMEID[uiComponent.id] = gmeID;

        this._delayedConnectionsAsItems[gmeID] = uiComponent.id;
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onSelectionAlignMenu = function (selectedIds,
                                                                                                      mousePos) {
        var menuPos = this._widget.posToPageXY(mousePos.mX, mousePos.mY),
            self = this;

        this._alignMenu.show(selectedIds, menuPos, function (key) {
            self._onAlignSelection(selectedIds, key);
        });
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onAlignSelection = function (selectedIds, type) {
        var params = {
            client: this._client,
            modelId: this._memberListContainerID,
            idMap: this._ComponentID2GMEID,
            setName: this._selectedMemberListID,
            coordinates: this._memberListMemberCoordinates[this._selectedMemberListID]
        };

        //TODO: Currently connections are always accounted for, regardless if they are displayed as boxes or not.
        if (params.coordinates) {
            this._alignMenu.alignSetSelection(params, selectedIds, type);
        }
    };

    DiagramDesignerWidgetMultiTabMemberListControllerBase.prototype._onDesignerItemsMove = function (repositionDesc) {
        var id;

        this._client.startTransaction();
        for (id in repositionDesc) {
            if (repositionDesc.hasOwnProperty(id)) {
                this._client.setMemberRegistry(this._memberListContainerID,
                    this._ComponentID2GMEID[id],
                    this._selectedMemberListID,
                    REGISTRY_KEYS.POSITION,
                    {
                        x: repositionDesc[id].x,
                        y: repositionDesc[id].y
                    });
            }
        }
        this._client.completeTransaction();
    };

    return DiagramDesignerWidgetMultiTabMemberListControllerBase;
});
