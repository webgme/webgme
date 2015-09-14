/*globals define, _, WebGMEGlobal, console*/
/*jshint browser: true*/
/**
 * @author brollb / https://github.com/brollb
 */


define(['js/logger',
    'js/Constants',
    'js/Widgets/BlockEditor/BlockEditorWidget.Constants',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    'js/Utils/PreferencesHelper',
    'js/Utils/DisplayFormat',
    './BlockEditorControl.WidgetEventHandlers',
    'js/Utils/GMEConcepts'
], function (Logger,
             CONSTANTS,
             SNAP_CONSTANTS,
             nodePropertyNames,
             REGISTRY_KEYS,
             PreferencesHelper,
             DisplayFormat,
             BlockEditorEventHandlers,
             GMEConcepts) {

    'use strict';

    var BACKGROUND_TEXT_COLOR = '#DEDEDE',
        BACKGROUND_TEXT_SIZE = 30,
        DEFAULT_DECORATOR = 'ModelDecorator',
        WIDGET_NAME = 'BlockEditor';

    function BlockEditorControl(params) {
        var loggerName = params.loggerName || 'gme:BlockEditor:BlockEditorControl';
        this._client = params.client;
        this.logger = params.logger || Logger.create(loggerName, WebGMEGlobal.gmeConfig.client.log);

        this.snapCanvas = params.widget;
        this._attachClientEventListeners();

        //local variable holding info about the currently opened node
        this.currentNodeInfo = {id: null, children: [], parentId: null};

        this.eventQueue = [];

        //attach all the event handlers for event's coming from BlockCanvas
        this.attachBlockEditorEventHandlers();

        //Set up toolbar 
        this._addToolbarItems();
    }

    //Attach listeners
    BlockEditorControl.prototype._attachClientEventListeners = function () {
        this._detachClientEventListeners();
        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged, this);
    };

    BlockEditorControl.prototype._stateActiveObjectChanged = function (model, activeObjectId) {
        this.selectedObjectChanged(activeObjectId);
    };

    BlockEditorControl.prototype._detachClientEventListeners = function () {
        WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged);
    };

    BlockEditorControl.prototype.selectedObjectChanged = function (nodeId) {
        var desc,
            nodeName,
            depth = nodeId === CONSTANTS.PROJECT_ROOT_ID ? 1 : 1000000,
            self = this,
            aspectNames;

        this.logger.debug('activeObject "' + nodeId + '"');

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
            desc = this._getObjectDescriptorBase(nodeId);
            if (desc) {
                this.currentNodeInfo.parentId = desc.parentId;
            }

            //this._refreshBtnModelHierarchyUp();

            if (this._selectedAspect !== CONSTANTS.ASPECT_ALL) {
                //make sure that the selectedAspect exist in the node, otherwise fallback to All
                aspectNames = this._client.getMetaAspectNames(nodeId) || [];
                if (aspectNames.indexOf(this._selectedAspect) === -1) {
                    this.logger.warn('The currently selected aspect "' + this._selectedAspect +
                                     '" does not exist in the object "' + desc.name + ' (' + nodeId +
                                     ')", falling back to "All"');
                    this._selectedAspect = CONSTANTS.ASPECT_ALL;
                    WebGMEGlobal.State.registerActiveAspect(CONSTANTS.ASPECT_ALL);
                }
            }

            //put new node's info into territory rules
            this._selfPatterns = {};

            if (this._selectedAspect === CONSTANTS.ASPECT_ALL) {
                this._selfPatterns[nodeId] = {children: depth};
            } else {
                this._selfPatterns[nodeId] = this._client.getAspectTerritoryPattern(nodeId, this._selectedAspect);
                this._selfPatterns[nodeId].children = depth;
            }

            this._firstLoad = true;

            nodeName = (desc && desc.name || ' ');

            this.snapCanvas.setTitle(nodeName);
            this.snapCanvas.setBackgroundText(nodeName.toUpperCase(), {
                'font-size': BACKGROUND_TEXT_SIZE,
                color: BACKGROUND_TEXT_COLOR
            });

            this.snapCanvas.showProgressbar();

            this._territoryId = this._client.addUI(this, function (events) {
                self._eventCallback(events);
            });
            //update the territory
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        } else {
            this.snapCanvas.setBackgroundText('No object to display', {
                color: BACKGROUND_TEXT_COLOR,
                'font-size': BACKGROUND_TEXT_SIZE
            });
        }
    };

    BlockEditorControl.prototype._getObjectDescriptorBase = function (nodeId) {
        var node = this._client.getNode(nodeId),
            objDescriptor,
            pos,
            defaultPos = 0,
            memberListContainerObj;

        if (node) {
            objDescriptor = {};

            objDescriptor.id = node.getId();
            objDescriptor.name = node.getAttribute(nodePropertyNames.Attributes.name);
            objDescriptor.parentId = node.getParentId();

            if (nodeId !== this.currentNodeInfo.id) {
                //TODO Get all important info about the object..

                //aspect specific coordinate
                if (this._selectedAspect === CONSTANTS.ASPECT_ALL) {
                    pos = node.getRegistry(REGISTRY_KEYS.POSITION);
                } else {
                    memberListContainerObj = this._client.getNode(this.currentNodeInfo.id);
                    pos = memberListContainerObj.getMemberRegistry(this._selectedAspect,
                        nodeId,
                        REGISTRY_KEYS.POSITION) || node.getRegistry(REGISTRY_KEYS.POSITION);
                }

                if (pos) {
                    objDescriptor.position = {x: pos.x, y: pos.y};
                } else {
                    objDescriptor.position = {x: defaultPos, y: defaultPos};
                }

                if (objDescriptor.position.hasOwnProperty('x')) {
                    objDescriptor.position.x = this._getDefaultValueForNumber(objDescriptor.position.x, defaultPos);
                } else {
                    objDescriptor.position.x = defaultPos;
                }

                if (objDescriptor.position.hasOwnProperty('y')) {
                    objDescriptor.position.y = this._getDefaultValueForNumber(objDescriptor.position.y, defaultPos);
                } else {
                    objDescriptor.position.y = defaultPos;
                }

                objDescriptor.decorator = node.getRegistry(REGISTRY_KEYS.DECORATOR) || '';

                if (node.getPointer(SNAP_CONSTANTS.PTR_NEXT)) {
                    objDescriptor.next = node.getPointer(SNAP_CONSTANTS.PTR_NEXT).to || '';
                }
            }

        }
        return objDescriptor;
    };

    BlockEditorControl.prototype._getDefaultValueForNumber = function (cValue, defaultValue) {
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
    BlockEditorControl.prototype._eventCallback = function (events) {
        var i = events ? events.length : 0;

        this.logger.debug('_eventCallback "' + i + '" items');

        if (i > 0) {
            this.eventQueue.push(events);
            this.processNextInQueue();
        }

        this.logger.debug('_eventCallback "' + events.length + '" items - DONE');
    };

    BlockEditorControl.prototype.processNextInQueue = function () {
        var nextBatchInQueue,
            len = this.eventQueue.length,
            decoratorsToDownload = [DEFAULT_DECORATOR],
            itemDecorator,
            self = this;

        if (len > 0) {
            nextBatchInQueue = this.eventQueue.pop();

            len = nextBatchInQueue.length;

            while (len--) {
                if ((nextBatchInQueue[len].etype === CONSTANTS.TERRITORY_EVENT_LOAD) ||
                    (nextBatchInQueue[len].etype === CONSTANTS.TERRITORY_EVENT_UPDATE)) {
                    nextBatchInQueue[len].desc = nextBatchInQueue[len].debugEvent ?
                        _.extend({}, this._getObjectDescriptorDEBUG(nextBatchInQueue[len].eid)) :
                        this._getObjectDescriptorBase(nextBatchInQueue[len].eid);

                    itemDecorator = nextBatchInQueue[len].desc.decorator;

                    if (itemDecorator && itemDecorator !== '') {
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

    BlockEditorControl.prototype._dispatchEvents = function (events) {
        var i = events.length,
            territoryChanged = false,
            loadEvents = [],
            unloadEvents = [],
            updateEvents = [],
            activeSelection,
            gmeID,
            ddSelection;

        this.logger.debug('_dispatchEvents "' + i + '" items');

        /********** ORDER EVENTS BASED ON DEPENDENCY ************/
        /** 1: Unload **/
        /** 2: Load **/
        /** 3: Update **/

        i = events.length;

        this._notifyPackage = {};

        this.snapCanvas.beginUpdate();

        for (i = events.length - 1; i >= 0; i--) {
            switch (events[i].etype) {
                case CONSTANTS.TERRITORY_EVENT_LOAD:
                    //We collect all loading events and process them at once
                    //to satisfy position dependencies caused by linking
                    loadEvents.push(events.splice(i, 1).pop());
                    break;

                case CONSTANTS.TERRITORY_EVENT_UPDATE:
                    updateEvents.push(events.splice(i, 1).pop());
                    break;

                case CONSTANTS.TERRITORY_EVENT_UNLOAD:
                    unloadEvents.push(events.splice(i, 1).pop());
                    break;
                default:
                    break;
            }
        }

        //Unload
        for (i = unloadEvents.length - 1; i >= 0; i--) {
            territoryChanged = this._onUnload(unloadEvents[i].eid) || territoryChanged;
        }

        //Load
        this._onLoad(loadEvents.concat(updateEvents));

        //Update
        for (i = updateEvents.length - 1; i >= 0; i--) {
            this._onUpdate(updateEvents[i].eid, updateEvents[i].desc);
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
            activeSelection = WebGMEGlobal.State.getActiveSelection();

            if (activeSelection && activeSelection.length > 0) {
                i = activeSelection.length;
                ddSelection = [];
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

        this.logger.debug('_dispatchEvents "' + events.length + '" items - DONE');

        //continue processing event queue
        this.processNextInQueue();
    };

    // PUBLIC METHODS
    BlockEditorControl.prototype._onLoad = function (events) {
        //Here we will load all the items and find which are dependent on others
        var independents = {},
            objDesc = {},
            i = events.length,
            item,
            nextItem,
            items,
            children = {},
            territoryChanged = false,

            parentId,

            prevItem,
            base,
            node,
            ptrs,
            j;

        while (i--) {
            if (events[i].eid !== this.currentNodeInfo.id) {
                independents[events[i].eid] = {};
                objDesc[events[i].eid] = events[i].desc;
            }
        }

        //Remove any dependents
        items = Object.keys(independents);

        while (items.length) {
            nextItem = objDesc[items.pop()].next;

            if (independents[nextItem]) {
                //Remove all dependents of the item
                while (nextItem) {
                    delete independents[nextItem];
                    nextItem = objDesc[nextItem].next;
                }
            }
        }

        //Next, we will remove children and put them in dictionary by parent id
        items = Object.keys(independents);
        i = items.length;
        while (i--) {
            item = items[i];
            parentId = item.substring(0, item.lastIndexOf('/'));
            if (parentId !== this.currentNodeInfo.id) {//must be a child of someone else...

                if (children[parentId] === undefined) {
                    children[parentId] = [];
                }
                children[parentId].push(item);
            }
        }

        //Next, we will sort independents by the level of containment
        items.sort(function (id1, id2) {
            if (id1.split('/').length < id2.split('/').length) {
                return 1;
            } else {
                return -1;
            }
        });

        j = items.length;

        while (j--) {//For each independent item
            item = items[j];

            prevItem = item;
            nextItem = objDesc[prevItem].next;  // TODO update this to BFS

            if (this._GmeID2ComponentID[prevItem]) {//Load the item if needed
                territoryChanged = this._onUpdate(prevItem, objDesc[prevItem]) || territoryChanged;
            } else {
                territoryChanged = this._onSingleLoad(prevItem, objDesc[prevItem]) || territoryChanged;
            }

            //Load all the dependent items 
            while (nextItem) {

                //Load the item if isn't available
                if (this._GmeID2ComponentID[nextItem]) {
                    this._onUpdate(nextItem, objDesc[nextItem]);
                } else {
                    territoryChanged = this._onSingleLoad(nextItem, objDesc[nextItem]) || territoryChanged;

                    //connect the objects
                    if (this._GmeID2ComponentID[prevItem] && this._GmeID2ComponentID[nextItem]) {
                        this.snapCanvas.setToConnect(this._GmeID2ComponentID[prevItem],
                            this._GmeID2ComponentID[nextItem], SNAP_CONSTANTS.PTR_NEXT);
                    } else if (prevItem === null) {//Connect to parent
                        i = nextItem.lastIndexOf('/');
                        base = nextItem.substring(0, i);

                        node = this._client.getNode(base);
                        ptrs = node.getPointerNames();
                        i = ptrs.length;
                        while (i--) {
                            if (this.snapCanvas.itemHasPtr(this._GmeID2ComponentID[base], ptrs[i]) &&
                                node.getPointer(ptrs[i]).to === nextItem) {
                                //Connect them!
                                this.snapCanvas.setToConnect(this._GmeID2ComponentID[base],
                                    this._GmeID2ComponentID[nextItem], ptrs[i]);
                            }
                        }

                    }
                }

                //If the nextItem is the parent of other nodes, load them next.

                if (children[nextItem] && children[nextItem].length) {
                    prevItem = null;
                    nextItem = children[nextItem].pop();
                } else {
                    prevItem = nextItem;
                    nextItem = objDesc[prevItem].next;

                    //if the nextItem is null, see if we can 'bubble' up to the parent
                    if (!nextItem) {
                        //Find the next item - bubble up as much as necessary
                        while (base !== this.currentNodeInfo.id && !nextItem) {
                            i = prevItem.lastIndexOf('/');
                            base = prevItem.substring(0, i);
                            prevItem = base;
                            nextItem = objDesc[base] ? objDesc[base].next : null;
                        }
                    }
                }
            }

            //Connect the 'independent' node to it's parent if needed
            i = item.lastIndexOf('/');
            base = item.substring(0, i);
            if (base && base !== this.currentNodeInfo.id) {
                //find the pointer from it's parent
                node = this._client.getNode(base);
                ptrs = node.getPointerNames();
                i = ptrs.length;
                while (i--) {
                    if (this.snapCanvas.itemHasPtr(this._GmeID2ComponentID[base], ptrs[i]) &&
                        node.getPointer(ptrs[i]).to === item) {
                        //Connect them!
                        this.snapCanvas.setToConnect(this._GmeID2ComponentID[base],
                            this._GmeID2ComponentID[item], ptrs[i]);
                    }
                }
            }
        }

    };

    BlockEditorControl.prototype._onSingleLoad = function (gmeID, objD) {
        var uiComponent,
            objDesc,
            getDecoratorTerritoryQueries,
            territoryChanged = false,
            node,
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

        //component loaded
        //we are interested in the load of sub_components of the opened component
        if (this.currentNodeInfo.id !== gmeID) {
            if (objD) {
                //if (objD.parentId == this.currentNodeInfo.id) {
                objDesc = _.extend({}, objD);

                this._items.push(gmeID);
                node = this._client.getNode(gmeID);
                this._extendObjectDescriptor(objDesc, node);//Add ptrs, attributes, decorator

                objDesc.control = this;
                objDesc.metaInfo = {};
                objDesc.metaInfo[CONSTANTS.GME_ID] = gmeID;

                uiComponent = this.snapCanvas.createLinkableItem(objDesc);

                this._GmeID2ComponentID[gmeID] = uiComponent.id; //Formerly was an array..
                this._ComponentID2GmeID[uiComponent.id] = gmeID;

                getDecoratorTerritoryQueries(uiComponent._decoratorInstance);

                //} else {
                //supposed to be the grandchild of the currently open node
                //--> load of port
                /*if(this._GMEModels.indexOf(objD.parentId) !== -1){
                 this._onUpdate(objD.parentId,this._getObjectDescriptorBase(objD.parentId));
                 }*/
                //this._checkComponentDependency(gmeID, CONSTANTS.TERRITORY_EVENT_LOAD);
                //console.log('Found a child of a node... NEED TO IMPLEMENT UI SUPPORT!');
                //}
            }
        } else {
            //currently opened node
            this._updateSheetName(objD.name);
            this._updateAspects();
        }

        return territoryChanged;

    };

    BlockEditorControl.prototype._onUnload = function (gmeID) {
        var componentID,
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
            this.logger.debug('The previously opened model does not exist... --- GMEID: "' + this.currentNodeInfo.id +
                              '"');
            this.snapCanvas.setBackgroundText('The previously opened model does not exist...', {
                'font-size': BACKGROUND_TEXT_SIZE,
                color: BACKGROUND_TEXT_COLOR
            });
        } else {
            if (this._GmeID2ComponentID.hasOwnProperty(gmeID)) {
                componentID = this._GmeID2ComponentID[gmeID];

                if (this.snapCanvas.itemIds.indexOf(componentID) !== -1) {
                    getDecoratorTerritoryQueries(this.snapCanvas.items[componentID]._decoratorInstance);
                }

                this.snapCanvas.deleteComponent(componentID);

                delete this._ComponentID2GmeID[componentID];
                delete this._GmeID2ComponentID[gmeID];

            }
        }

        return territoryChanged;
    };

    BlockEditorControl.prototype._onUpdate = function (gmeID, objDesc) {
        var componentID,
            node = this._client.getNode(gmeID);

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
                    if (this._GmeID2ComponentID[gmeID]) {
                        componentID = this._GmeID2ComponentID[gmeID];
                        this._extendObjectDescriptor(objDesc, node);

                        this.snapCanvas.updateLinkableItem(componentID, objDesc);
                    }
                }
            }
        }
    };

    /**
     * Add item details relevant for drawing the item on the currently displayed sheet.
     *
     * @param {Object} objDesc
     * @param {Object} node
     * @return {Object} objDesc
     */
    BlockEditorControl.prototype._extendObjectDescriptor = function (objDesc, node) {
        var attributes,
            attributeSchema,
            pointers,
            id,
            i;

        objDesc.decoratorClass = this._getItemDecorator(objDesc.decorator);
        objDesc.preferencesHelper = PreferencesHelper.getPreferences();
        objDesc.aspect = this._selectedAspect;

        //Get the pointer info
        objDesc.ptrInfo = {};
        pointers = node.getPointerNames();
        i = pointers.length;
        while (i--) {
            id = node.getPointer(pointers[i]).to;
            if (id && this._GmeID2ComponentID[id]) {
                objDesc.ptrInfo[pointers[i]] = this._GmeID2ComponentID[id];
            } else {
                objDesc.ptrInfo[pointers[i]] = false;
            }
        }

        //Get the attribute info
        objDesc.attrInfo = {};
        attributes = node.getAttributeNames();
        i = attributes.length;
        while (i--) {
            objDesc.attrInfo[attributes[i]] = {value: node.getAttribute(attributes[i])};
            attributeSchema = this._client.getAttributeSchema(node.getId(), attributes[i]);
            if (attributeSchema.enum) {
                objDesc.attrInfo[attributes[i]].options = attributeSchema.enum;
            }
        }

        //Change the 'name' to formatted name
        objDesc.attrInfo.name = {value: DisplayFormat.resolve(node)};

        return objDesc;
    };

    BlockEditorControl.prototype._getItemDecorator = function (decorator) {
        var result;

        result = this._client.decoratorManager.getDecoratorForWidget(decorator, WIDGET_NAME);

        if (!result) {
            result = this._client.decoratorManager.getDecoratorForWidget(DEFAULT_DECORATOR, WIDGET_NAME);
        }

        return result;
    };

    BlockEditorControl.prototype._updateSheetName = function (name) {
        this.snapCanvas.setTitle(name);
        this.snapCanvas.setBackgroundText(name.toUpperCase(), {
            'font-size': BACKGROUND_TEXT_SIZE,
            color: BACKGROUND_TEXT_COLOR
        });
    };

    BlockEditorControl.prototype._updateAspects = function () {
        var objId = this.currentNodeInfo.id,
            aspects,
            tabID,
            i,
            selectedTabID,
            nodeId,
            newAspectRules,
            aspectRulesChanged;

        this._aspects = {};
        this.snapCanvas.clearTabs();

        if (objId || objId === CONSTANTS.PROJECT_ROOT_ID) {
            aspects = this._client.getMetaAspectNames(objId) || [];

            aspects.sort(function (a, b) {
                var an = a.toLowerCase(),
                    bn = b.toLowerCase();

                return (an < bn) ? -1 : 1;
            });

            aspects.splice(0, 0, CONSTANTS.ASPECT_ALL);

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
            nodeId = this.currentNodeInfo.id;
            newAspectRules = this._client.getAspectTerritoryPattern(nodeId, this._selectedAspect);
            aspectRulesChanged = false;

            if (this._selfPatterns[nodeId].items && newAspectRules.items) {
                aspectRulesChanged = (_.difference(this._selfPatterns[nodeId].items, newAspectRules.items)).length > 0;
                if (aspectRulesChanged === false) {
                    aspectRulesChanged = (_.difference(newAspectRules.items, this._selfPatterns[nodeId].items)).length >
                                         0;
                }
            } else {
                if (this._selfPatterns[nodeId].items || newAspectRules.items) {
                    //at least one of them has items
                    aspectRulesChanged = true;
                }
            }

            if (aspectRulesChanged) {
                this.selectedObjectChanged(nodeId);
            }
        }
    };

    BlockEditorControl.prototype._handleDecoratorNotification = function () {
        var gmeID,
            i,
            itemID;

        for (gmeID in this._notifyPackage) {
            if (this._notifyPackage.hasOwnProperty(gmeID)) {
                this.logger.debug('NotifyPartDecorator: ' + gmeID + ', componentIDs: ' +
                                  JSON.stringify(this._notifyPackage[gmeID]));

                i = this._GmeID2ComponentID[gmeID].length;
                while (i--) {
                    itemID = this._GmeID2ComponentID[gmeID][i];
                    this.snapCanvas.notifyItemComponentEvents(itemID, this._notifyPackage[gmeID]);
                }
            }
        }
    };

    BlockEditorControl.prototype.registerComponentIDForPartID = function () {
        //This method should probably be in a base class that can be overridden
        //as needed. 
        //
        //Currently, it is here to prevent breaking though I don't currently
        //have a use for it
        //FIXME
    };

    BlockEditorControl.prototype.onActivate = function () {
        //When you have the split view and only one is active
        this._attachClientEventListeners();
    };

    BlockEditorControl.prototype.onDeactivate = function () {
        this._detachClientEventListeners();
    };

    BlockEditorControl.prototype.destroy = function () {
        //When you changing to meta view or something
        this._detachClientEventListeners();
        this._removeToolbarItems();
        this._client.removeUI(this._territoryId);
    };

    /* * * * * * * * * * TOOLBAR * * * * * * * * * * */
    BlockEditorControl.prototype._addToolbarItems = function () {
        //var self = this,
        //    toolBar = WebGMEGlobal.Toolbar;

        this._toolbarItems = [];

        //Add items here using toolBar.addButton 
    };

    BlockEditorControl.prototype._removeToolbarItems = function () {
        //Remove any toolbar items
        if (this._toolbarItems) {
            while (this._toolbarItems.length) {
                this._toolbarItems.pop().destroy();
            }
        }
    };


    BlockEditorControl.prototype._constraintCheck = function () {
        var self = this;

        self._client.checkCustomConstraints([''], true, function (err, results) {
            //TODO here we should pop up the result dialog...
            console.log('project validation finished', err, results);
        });
    };

    /* * * * * * * * * * END TOOLBAR * * * * * * * * * * */

    BlockEditorControl.prototype._getValidPointerTypes = function (params) {
        // Call GMEConcepts
        var dstGmeId = this._ComponentID2GmeID[params.dst.id],
            srcGmeId = this._ComponentID2GmeID[params.src.id];

        return GMEConcepts.getValidPointerTypesFromSourceToTarget(srcGmeId, dstGmeId);
    };


    _.extend(BlockEditorControl.prototype, BlockEditorEventHandlers.prototype);

    return BlockEditorControl;
});
