/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Brian Broll
 */

"use strict";

define(['logManager',
    'js/Constants',
    'js/Widgets/SnapEditor/SnapEditorWidget.Constants',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    'js/Utils/PreferencesHelper',
    './SnapEditorControl.WidgetEventHandlers',
    'js/Utils/GMEConcepts'], function (logManager,
                                        CONSTANTS,
                                        SNAP_CONSTANTS,
                                        nodePropertyNames,
                                        REGISTRY_KEYS,
                                        PreferencesHelper,
                                        SnapEditorEventHandlers,
                                        GMEConcepts){

    var BACKGROUND_TEXT_COLOR = '#DEDEDE',
        BACKGROUND_TEXT_SIZE = 30,
        DEFAULT_DECORATOR = "ModelDecorator",
        WIDGET_NAME = 'SnapEditor';

    var SnapEditorControl = function(params){
        this._client = params.client;
        this.logger = params.logger || logManager.create(params.loggerName || "SnapEditorControl");

        this.snapCanvas = params.widget;
        this._attachClientEventListeners();

        //local variable holding info about the currently opened node
        this.currentNodeInfo = {"id": null, "children" : [], "parentId": null };

        this.eventQueue = [];

        //attach all the event handlers for event's coming from SnapCanvas
        this.attachSnapEditorEventHandlers();
    };

    //Attach listeners
    SnapEditorControl.prototype._attachClientEventListeners = function () {
        this._detachClientEventListeners();
        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged, this);
        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_SELECTION, this._stateActiveSelectionChanged, this);
    };

    SnapEditorControl.prototype._stateActiveObjectChanged = function (model, activeObjectId) {
        this.selectedObjectChanged(activeObjectId);
    };

    SnapEditorControl.prototype._detachClientEventListeners = function () {
        WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged);
        WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_SELECTION, this._stateActiveSelectionChanged);
    };

    SnapEditorControl.prototype.selectedObjectChanged = function(nodeId){
        var desc,
            nodeName,
            depth = nodeId === CONSTANTS.PROJECT_ROOT_ID ? 1 : 1000000,
            self = this;

//TODO REMOVE
console.log("Object changed to " + nodeId);
//TODO REMOVE_END

        this.logger.debug("activeObject '" + nodeId + "'");

        //delete everything from model editor
        this.snapCanvas.clear();

        //clean up local hash map
        this._items = [];
        this._GmeID2ComponentID = {};
        this._ComponentID2GmeID = {};
        /*
        this._GMEModels = [];


        this._GMEID2Subcomponent = {};
        this._Subcomponent2GMEID = {};
        */

        //remove current territory patterns
        if (this._territoryId) {
            this._client.removeUI(this._territoryId);
        }

        this.currentNodeInfo.id = nodeId;
        this.currentNodeInfo.parentId = undefined;

        this._selectedAspect = WebGMEGlobal.State.getActiveAspect();

        //since PROJECT_ROOT_ID is an empty string, it is considered false..
        if (nodeId || nodeId === CONSTANTS.PROJECT_ROOT_ID) {
            desc = this._getObjectDescriptor(nodeId);
            if (desc) {
                this.currentNodeInfo.parentId = desc.parentId;
            }

            //this._refreshBtnModelHierarchyUp();

            if (this._selectedAspect !== CONSTANTS.ASPECT_ALL) {
                //make sure that the selectedAspect exist in the node, otherwise fallback to All
                var aspectNames = this._client.getMetaAspectNames(nodeId) || [];
                if (aspectNames.indexOf(this._selectedAspect) === -1) {
                    this.logger.warning('The currently selected aspect "' + this._selectedAspect + '" does not exist in the object "' + desc.name + ' (' + nodeId + ')", falling back to "All"');
                    this._selectedAspect = CONSTANTS.ASPECT_ALL;
                    WebGMEGlobal.State.setActiveAspect(CONSTANTS.ASPECT_ALL);
                }
            }

            //put new node's info into territory rules
            this._selfPatterns = {};

			 if (this._selectedAspect === CONSTANTS.ASPECT_ALL) {
				this._selfPatterns[nodeId] = { "children": depth };
			} else {
				this._selfPatterns[nodeId] = this._client.getAspectTerritoryPattern(nodeId, this._selectedAspect);
				this._selfPatterns[nodeId].children = depth;
			}

            this._firstLoad = true;

            nodeName = (desc && desc.name || " ").toUpperCase();

            this.snapCanvas.setTitle(nodeName);
            this.snapCanvas.setBackgroundText(nodeName, {'font-size': BACKGROUND_TEXT_SIZE,
                'color': BACKGROUND_TEXT_COLOR });

            this.snapCanvas.showProgressbar();

            this._territoryId = this._client.addUI(this, function (events) {
                self._eventCallback(events);
            });
            //update the territory
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        } else {
            this.snapCanvas.setBackgroundText("No object to display", {"color": BACKGROUND_TEXT_COLOR,
                "font-size": BACKGROUND_TEXT_SIZE});
        }
    }; 

    SnapEditorControl.prototype._getObjectDescriptor = function (nodeId) {
        var nodeObj = this._client.getNode(nodeId),
            objDescriptor,
            pos,
            defaultPos = 0,
            customPoints,
            memberListContainerObj;

        if (nodeObj) {
            objDescriptor = {};

            objDescriptor.id = nodeObj.getId();
            objDescriptor.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name);
            objDescriptor.parentId = nodeObj.getParentId();

            if (nodeId !== this.currentNodeInfo.id){
                //TODO Get all important info about the object..
                
                //aspect specific coordinate
                if (this._selectedAspect === CONSTANTS.ASPECT_ALL) {
                    pos = nodeObj.getRegistry(REGISTRY_KEYS.POSITION);
                } else {
                    memberListContainerObj = this._client.getNode(this.currentNodeInfo.id);
                    pos = memberListContainerObj.getMemberRegistry(this._selectedAspect, nodeId, REGISTRY_KEYS.POSITION) || nodeObj.getRegistry(REGISTRY_KEYS.POSITION);
                }

                if (pos) {
                    objDescriptor.position = { "x": pos.x, "y": pos.y };
                } else {
                    objDescriptor.position = { "x": defaultPos, "y": defaultPos };
                }

                if (objDescriptor.position.hasOwnProperty("x")) {
                    objDescriptor.position.x = this._getDefaultValueForNumber(objDescriptor.position.x, defaultPos);
                } else {
                    objDescriptor.position.x = defaultPos;
                }

                if (objDescriptor.position.hasOwnProperty("y")) {
                    objDescriptor.position.y = this._getDefaultValueForNumber(objDescriptor.position.y, defaultPos);
                } else {
                    objDescriptor.position.y = defaultPos;
                }

                objDescriptor.decorator = nodeObj.getRegistry(REGISTRY_KEYS.DECORATOR) || "";

                if(nodeObj.getPointer(SNAP_CONSTANTS.PTR_NEXT)){
                    objDescriptor.next = nodeObj.getPointer(SNAP_CONSTANTS.PTR_NEXT).to || "";
                }
            }
        }

        return objDescriptor;
    };

    SnapEditorControl.prototype._getDefaultValueForNumber = function (cValue, defaultValue) {
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
    SnapEditorControl.prototype._eventCallback = function (events) {
        var i = events ? events.length : 0;

        this.logger.debug("_eventCallback '" + i + "' items");

        if (i > 0) {
            this.eventQueue.push(events);
            this.processNextInQueue();
        }

        this.logger.debug("_eventCallback '" + events.length + "' items - DONE");
    };

    SnapEditorControl.prototype.processNextInQueue = function () {
        var nextBatchInQueue,
            len = this.eventQueue.length,
            decoratorsToDownload = [DEFAULT_DECORATOR],
            itemDecorator,
            self = this;

        if (len > 0) {
            nextBatchInQueue = this.eventQueue.pop();

            len = nextBatchInQueue.length;

            while (len--) {
                if ((nextBatchInQueue[len].etype === CONSTANTS.TERRITORY_EVENT_LOAD) || (nextBatchInQueue[len].etype === CONSTANTS.TERRITORY_EVENT_UPDATE)) {
                    nextBatchInQueue[len].desc = nextBatchInQueue[len].debugEvent ? _.extend({}, this._getObjectDescriptorDEBUG(nextBatchInQueue[len].eid)) : this._getObjectDescriptor(nextBatchInQueue[len].eid);

                    itemDecorator = nextBatchInQueue[len].desc.decorator;

                    if (itemDecorator && itemDecorator !== "") {
                        if (decoratorsToDownload.indexOf(itemDecorator) === -1) {
                            decoratorsToDownload.pushUnique(itemDecorator);
                        }
                    }
                }
            }

            this._client.decoratorManager.download(decoratorsToDownload, WIDGET_NAME, function () {
                self._dispatchEvents(nextBatchInQueue);
            });
        }
    };

    SnapEditorControl.prototype._dispatchEvents = function (events) {
        var i = events.length,
            e,
            territoryChanged = false,
            loadEvents = [],
            self = this;

        this.logger.debug("_dispatchEvents '" + i + "' items");

        /********** ORDER EVENTS BASED ON DEPENDENCY ************/
        /** 1: items first, no dependency **/
        /** 2: connections second, dependency if a connection is connected to an other connection **/
        var orderedItemEvents = [];

        var unloadEvents = [];
        i = events.length;
        while (i--) {
            e = events[i];

            if (e.etype === CONSTANTS.TERRITORY_EVENT_UNLOAD) {
                unloadEvents.push(e);
            } else if (e.desc.kind === "MODEL") {
                orderedItemEvents.push(e);
            }  else if (this.currentNodeInfo.id === e.eid) {
                orderedItemEvents.push(e);
            }

        }

        /** LOG ORDERED CONNECTION LIST ********************/
        /*this.logger.debug('ITEMS: ');
        var itemIDList = [];
        for (i = 0; i < orderedItemEvents.length; i += 1) {
            var x = orderedItemEvents[i];
            //console.log("ID: " + x.desc.id);
            itemIDList.push(x.desc.id);
        }

        this.logger.debug('CONNECTIONS: ');
        for (i = 0; i < orderedConnectionEvents.length; i += 1) {
            var x = orderedConnectionEvents[i];
            var connconn = itemIDList.indexOf(x.desc.source) === -1 && itemIDList.indexOf(x.desc.target) === -1;
            this.logger.debug("ID: " + x.desc.id + ", SRC: " + x.desc.source + ", DST: " + x.desc.target + (connconn ? " *****" : ""));
        }*/
        /** END OF --- LOG ORDERED CONNECTION LIST ********************/

        //events = unloadEvents.concat(orderedItemEvents, orderedConnectionEvents);
        //events = unloadEvents.concat(orderedItemEvents);
        i = events.length;

        this._notifyPackage = {};

        this.snapCanvas.beginUpdate();

        //items
        for (i = events.length - 1; i >= 0; i -= 1) {
            if (events[i].etype === CONSTANTS.TERRITORY_EVENT_LOAD) {
                //We collect all loading events and process them at once
                //to satisfy position dependencies caused by linking
                loadEvents.push(events.splice(i, 1).pop());
            }
        }

        //Now we handle all load events
        this._onLoad(loadEvents);

        for (i = 0; i < events.length; i += 1) {
            e = events[i];
            switch (e.etype) {
                case CONSTANTS.TERRITORY_EVENT_UPDATE:
                    this._onUpdate(e.eid, e.desc);
                    break;
                case CONSTANTS.TERRITORY_EVENT_UNLOAD:
                    territoryChanged = this._onUnload(e.eid) || territoryChanged;
                    break;
            }
        }


        //this._handleDecoratorNotification();

        this.snapCanvas.endUpdate();

        this.snapCanvas.hideProgressbar();

        //update the territory
        if (territoryChanged) {
                this.logger.debug('Updating territory with ruleset from decorators: ' + JSON.stringify(this._selfPatterns));
                this._client.updateTerritory(this._territoryId, this._selfPatterns);
        }

        //check if firstload
        if (this._firstLoad === true) {
            this._firstLoad = false;

            //check if there is active selection set in client
            var activeSelection = WebGMEGlobal.State.getActiveSelection();

            if (activeSelection && activeSelection.length > 0) {
                i = activeSelection.length;
                var gmeID;
                var ddSelection = [];
                while (i--) {
                    //try to find each object present in the active selection mapped to DiagramDesigner element
                    gmeID = activeSelection[i];

                    if (this._GmeID2ComponentID[gmeID]) {
                        ddSelection = ddSelection.concat(this._GmeID2ComponentID[gmeID]);
                    }
                }

                this.snapCanvas.select(ddSelection);
            }
        }

        this.logger.debug("_dispatchEvents '" + events.length + "' items - DONE");

        //continue processing event queue
        this.processNextInQueue();
    };

    // PUBLIC METHODS
    SnapEditorControl.prototype._onLoad = function (events) {
        //Here we will load all the items and find which are dependent on others
        var independents = {},
            objDesc = {},
            i = events.length,
            item,
            nextItem,
            items,
            children = {},
            territoryChanged = false;

        while(i--){
            if(events[i].eid !== this.currentNodeInfo.id){
                independents[events[i].eid] = {};
                objDesc[events[i].eid] = events[i].desc;
            }
        }

        //Remove any dependents
        items = Object.keys(independents);

        while(items.length){
            nextItem = objDesc[items.pop()].next;

            if(independents[nextItem]){
                //Remove all dependents of the item
                while(nextItem){
                    delete independents[nextItem];
                    nextItem = objDesc[nextItem].next;
                }
            }
        }

        //Next, we will remove children and put them in dictionary by parent id
        items = Object.keys(independents);
        i = items.length;
        var parentId;
        while(i--){
            item = items[i];
            parentId = item.substring(0, item.lastIndexOf('/'));
            if(parentId !== this.currentNodeInfo.id){//must be a child of someone else...

                if(children[parentId] === undefined){
                    children[parentId] = [];
                }
                children[parentId].push(item);
            }
        }

        //Next, we will sort independents by the level of containment
        items.sort(function(id1, id2){
            if(id1.split('/').length < id2.split('/').length){
                return 1;
            }else{
                return -1;
            }
        });

        var prevItem,
            connAreaPrev,
            connAreaNext,
            nextList = [],
            base,
            node,
            ptrs,
            j = items.length;

        while(j--){//For each independent item
            item = items[j];

            prevItem = item;
            nextItem = objDesc[prevItem].next;

            if(!this._GmeID2ComponentID[prevItem]){//Load the item if needed
                territoryChanged = this._onSingleLoad(prevItem, objDesc[prevItem]) || territoryChanged;
            }else{
                //this._onUpdate(prevItem, objDesc[prevItem]);
            }

            //Load all the dependent items 
            while(nextItem){
                
                //Load the item if isn't available
                if(!this._GmeID2ComponentID[nextItem]){
                    territoryChanged = this._onSingleLoad(nextItem, objDesc[nextItem]) 
                        || territoryChanged;

                    //connect the objects
                    if(this._GmeID2ComponentID[prevItem] && this._GmeID2ComponentID[nextItem]){
                        this.snapCanvas.setToConnect(this._GmeID2ComponentID[prevItem], 
                                this._GmeID2ComponentID[nextItem], SNAP_CONSTANTS.PTR_NEXT);
                    }else if(prevItem === null){//Connect to parent
                        i = nextItem.lastIndexOf('/');
                        base = nextItem.substring(0, i);

                        node = this._client.getNode(base);
                        ptrs = node.getPointerNames();
                        i = ptrs.length;
                        while(i--){
                            if(this.snapCanvas.itemHasPtr(this._GmeID2ComponentID[base], ptrs[i])
                                    && node.getPointer(ptrs[i]).to === nextItem){
                                        //Connect them!
                                        this.snapCanvas.setToConnect(this._GmeID2ComponentID[base], 
                                                this._GmeID2ComponentID[nextItem], ptrs[i]);
                                    }
                        }

                    }
                }else{
                    this._onUpdate(nextItem, objDesc[nextItem]);
                }

                //If the nextItem is the parent of other nodes, load them next.

                if(children[nextItem] && children[nextItem].length){
                    prevItem = null;
                    nextItem = children[nextItem].pop(); 
                }else{
                    prevItem = nextItem;
                    nextItem = objDesc[prevItem].next;

                    //if the nextItem is null, see if we can 'bubble' up to the parent
                    if(!nextItem){
                        //Find the next item - bubble up as much as necessary
                        while (base !== this.currentNodeInfo.id && !nextItem){
                            i = prevItem.lastIndexOf('/');
                            base = prevItem.substring(0, i);
                            prevItem = base;
                            nextItem = objDesc[base] ? objDesc[base].next : null;
                        }
                    }
                }
            }

            //Connect the "independent" node to it's parent if needed
            i = item.lastIndexOf('/');
            base = item.substring(0,i);
            if(base && base !== this.currentNodeInfo.id){
                //find the pointer from it's parent
                node = this._client.getNode(base);
                ptrs = node.getPointerNames();
                i = ptrs.length;
                while(i--){
                    if(this.snapCanvas.itemHasPtr(this._GmeID2ComponentID[base], ptrs[i])
                            && node.getPointer(ptrs[i]).to === item){
                        //Connect them!
                        this.snapCanvas.setToConnect(this._GmeID2ComponentID[base], 
                            this._GmeID2ComponentID[item], ptrs[i]);
                    }
                }
            }
        }
        
    };

    SnapEditorControl.prototype._onSingleLoad = function (gmeID, objD) {
        var uiComponent,
            decClass,
            objDesc,
            sources = [],
            destinations = [],
            getDecoratorTerritoryQueries,
            territoryChanged = false,
            self = this;

        getDecoratorTerritoryQueries = function (decorator) {
            var query,
                entry;

            if (decorator) {
                query = decorator.getTerritoryQuery();

                if (query) {
                    for (entry in query) {
                        if (query.hasOwnProperty(entry)) {
                            self._selfPatterns[entry] = query[entry];
                            territoryChanged = true;
                        }
                    }
                }
            }
        };

        var node,
            ptrs,
            id,
            i;

        //component loaded
        //we are interested in the load of sub_components of the opened component
        if (this.currentNodeInfo.id !== gmeID) {
            if (objD) {
                //if (objD.parentId == this.currentNodeInfo.id) {
                    objDesc = _.extend({}, objD);

                    this._items.push(gmeID);

                    decClass = this._getItemDecorator(objDesc.decorator);

                    objDesc.decoratorClass = decClass;
                    objDesc.control = this;
                    objDesc.metaInfo = {};
                    objDesc.metaInfo[CONSTANTS.GME_ID] = gmeID;
                    objDesc.preferencesHelper = PreferencesHelper.getPreferences();
                    objDesc.aspect = this._selectedAspect;

                    //Getting the ptr info
                    objDesc.ptrs = {};
                    node = this._client.getNode(gmeID);
                    ptrs = node.getPointerNames();
                    i = ptrs.length;
                    while (i--){
                        id = node.getPointer(ptrs[i]).to;
                        if (id){
                            if (this._GmeID2ComponentID[id]){
                                id = this._GmeID2ComponentID[id];
                            } else {//If item hasn't been created, it won't have an id
                                id = null;
                            }
                        }

                        objDesc.ptrs[ptrs[i]] = id;
                    }

                    uiComponent = this.snapCanvas.createClickableItem(objDesc);

                    this._GmeID2ComponentID[gmeID] = uiComponent.id; //Formerly was an array..
                    this._ComponentID2GmeID[uiComponent.id] = gmeID;

                    getDecoratorTerritoryQueries(uiComponent._decoratorInstance);

                //} else {
                    //supposed to be the grandchild of the currently open node
                    //--> load of port
                    /*if(this._GMEModels.indexOf(objD.parentId) !== -1){
                        this._onUpdate(objD.parentId,this._getObjectDescriptor(objD.parentId));
                    }*/
                    //this._checkComponentDependency(gmeID, CONSTANTS.TERRITORY_EVENT_LOAD);
                    //console.log("Found a child of a node... NEED TO IMPLEMENT UI SUPPORT!");
                //}
            }
        } else {
            //currently opened node
            this._updateSheetName(objD.name);
            this._updateAspects();
        }

        return territoryChanged;

    };

    SnapEditorControl.prototype._onUnload = function (gmeID) {
        var componentID,
            len,
            getDecoratorTerritoryQueries,
            self = this,
            territoryChanged = false;

        getDecoratorTerritoryQueries = function (decorator) {
            var query,
                entry;

            if (decorator) {
                query = decorator.getTerritoryQuery();

                if (query) {
                    for (entry in query) {
                        if (query.hasOwnProperty(entry)) {
                            delete self._selfPatterns[entry];
                            territoryChanged = true;
                        }
                    }
                }
            }
        };

        if (gmeID === this.currentNodeInfo.id) {
            //the opened model has been removed from territoy --> most likely deleted...
            this.logger.debug('The previously opened model does not exist... --- GMEID: "' + this.currentNodeInfo.id + '"');
            this.snapCanvas.setBackgroundText('The previously opened model does not exist...', {'font-size': BACKGROUND_TEXT_SIZE,
                                                                                                     'color': BACKGROUND_TEXT_COLOR});
        } else {
            if (this._GmeID2ComponentID.hasOwnProperty(gmeID)) {
                componentID = this._GmeID2ComponentID[gmeID];

                if (this.snapCanvas.itemIds.indexOf(componentID) !== -1) {
                    getDecoratorTerritoryQueries(this.snapCanvas.items[componentID]._decoratorInstance);
                }

                this.snapCanvas.deleteComponent(componentID);

                delete this._ComponentID2GmeID[componentID];
                delete this._GmeID2ComponentID[gmeID];

            } else {
                //the item is probably still being used as a different gme component
                
                //probably a subcomponent has been deleted - will be handled in the decorator
                //this._checkComponentDependency(gmeID, CONSTANTS.TERRITORY_EVENT_UNLOAD);
            }
        }

        return territoryChanged;
    };

    SnapEditorControl.prototype._onUpdate = function (gmeID, objDesc) {
        var componentID,
            decClass,
            objId,
            sCompId,
            ptrs,
            node = this._client.getNode(gmeID),
            id,
            i;

        //self or child updated
        //check if the updated object is the opened node
        if (gmeID === this.currentNodeInfo.id) {
            //the updated object is the parent whose children are displayed here
            //the interest about the parent is:
            // - name change
            this._updateSheetName(objDesc.name);
            //this._updateAspects();
        } else {
            if (objDesc) {
                //Make sure that the node is somewhere in the project we are looking at
                if (objDesc.parentId.indexOf(this.currentNodeInfo.id) !== -1) {
                    if (this._GmeID2ComponentID[gmeID]){
                        componentID = this._GmeID2ComponentID[gmeID];

                        decClass = this._getItemDecorator(objDesc.decorator);

                        objDesc.decoratorClass = decClass;
                        objDesc.preferencesHelper = PreferencesHelper.getPreferences();
                        objDesc.aspect = this._selectedAspect;
                        //Get the pointer info
                        objDesc.ptrInfo = {};
                        ptrs = node.getPointerNames(gmeID);
                        i = ptrs.length;
                        while (i--){
                            id = node.getPointer(ptrs[i]).to;
                            if (id && this._GmeID2ComponentID[id]){
                                objDesc.ptrInfo[ptrs[i]] = this._GmeID2ComponentID[id];
                            }
                        }

                        this.snapCanvas.updateClickableItem(componentID, objDesc);
                    }
                }
            }
        }
    };

    SnapEditorControl.prototype._checkComponentDependency = function (gmeID, eventType) {
        //Use this for checking attached nodes?
        //TODO
    };

    SnapEditorControl.prototype._getItemDecorator = function (decorator) {
        var result;

        result = this._client.decoratorManager.getDecoratorForWidget(decorator, WIDGET_NAME);

        if (!result) {
            result = this._client.decoratorManager.getDecoratorForWidget(DEFAULT_DECORATOR, WIDGET_NAME);
        }

        return result;
    };

    SnapEditorControl.prototype._updateSheetName = function (name) {
        this.snapCanvas.setTitle(name.toUpperCase());
        this.snapCanvas.setBackgroundText(name.toUpperCase(), {'font-size': BACKGROUND_TEXT_SIZE,
            'color': BACKGROUND_TEXT_COLOR });
    };

    SnapEditorControl.prototype._updateAspects = function () {
        var objId = this.currentNodeInfo.id,
            aspects,
            tabID,
            i,
            selectedTabID;

        this._aspects = {};
        this.snapCanvas.clearTabs();

        if (objId || objId === CONSTANTS.PROJECT_ROOT_ID) {
            aspects = this._client.getMetaAspectNames(objId) || [];

            aspects.sort(function (a,b) {
                var an = a.toLowerCase(),
                    bn = b.toLowerCase();

                return (an < bn) ? -1 : 1;
            });

            aspects.splice(0,0,CONSTANTS.ASPECT_ALL);

            this.snapCanvas.addMultipleTabsBegin();

            for (i = 0; i < aspects.length; i += 1) {
                tabID = this.snapCanvas.addTab(aspects[i]);

                this._aspects[tabID] = aspects[i];

                if (this._selectedAspect &&
                    this._selectedAspect === aspects[i]) {
                    selectedTabID = tabID;
                }
            }

            this.snapCanvas.addMultipleTabsEnd();
        }

        if (!selectedTabID) {
            for (selectedTabID in this._aspects) {
                if (this._aspects.hasOwnProperty(selectedTabID)) {
                    break;
                }
            }
        }

        this.snapCanvas.selectTab(selectedTabID);

        //check if the node's aspect rules has changed or not, and if so, initialize with that
        if (this._selectedAspect !== CONSTANTS.ASPECT_ALL) {
            var nodeId = this.currentNodeInfo.id;
            var newAspectRules = this._client.getAspectTerritoryPattern(nodeId, this._selectedAspect);
            var aspectRulesChanged = false;

            if (this._selfPatterns[nodeId].items && newAspectRules.items) {
                aspectRulesChanged = (_.difference(this._selfPatterns[nodeId].items, newAspectRules.items)).length > 0;
                if (aspectRulesChanged === false) {
                    aspectRulesChanged = (_.difference(newAspectRules.items, this._selfPatterns[nodeId].items)).length > 0;
                }
            } else {
                if (!this._selfPatterns[nodeId].items && !newAspectRules.items) {
                    //none of them has items, no change
                } else {
                    aspectRulesChanged = true;
                }
            }

            if (aspectRulesChanged) {
                this.selectedObjectChanged(nodeId);
            }
        }
    };

    SnapEditorControl.prototype._handleDecoratorNotification = function () {
        var gmeID,
            i,
            itemID;

        for (gmeID in this._notifyPackage) {
            if (this._notifyPackage.hasOwnProperty(gmeID)) {
                this.logger.debug('NotifyPartDecorator: ' + gmeID + ', componentIDs: ' + JSON.stringify(this._notifyPackage[gmeID]));

                i = this._GmeID2ComponentID[gmeID].length;
                while (i--) {
                    itemID = this._GmeID2ComponentID[gmeID][i];
                    this.snapCanvas.notifyItemComponentEvents(itemID, this._notifyPackage[gmeID]);
                }
            }
        }
    };

    SnapEditorControl.prototype.registerComponentIDForPartID = function(){
        //This method should probably be in a base class that can be overridden
        //as needed. 
        //
        //Currently, it is here to prevent breaking though I don't currently
        //have a use for it
        //FIXME
    };

    SnapEditorControl.prototype.onActivate = function(){
        //When you have the split view and only one is active
    }; 

    SnapEditorControl.prototype.onDeactivate = function(){
    }; 

    SnapEditorControl.prototype.destroy = function(){
        //When you changing to meta view or something
    }; 

    _.extend(SnapEditorControl.prototype, SnapEditorEventHandlers.prototype);

   return SnapEditorControl;
});
