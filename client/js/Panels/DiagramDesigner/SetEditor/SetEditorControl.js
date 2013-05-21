"use strict";

define(['logManager',
    'clientUtil',
    'js/Constants',
    'js/NodePropertyNames',
    './SetEditorControl.DiagramDesignerWidgetEventHandlers',
    './SetVisualHelper'], function (logManager,
                                                     clientUtil,
                                                     CONSTANTS,
                                                     nodePropertyNames,
                                                     SetEditorControlDiagramDesignerWidgetEventHandlers,
                                                     SetVisualHelper) {

    var SetEditorControl,
        DECORATOR_PATH = "js/Decorators/DiagramDesigner/",      //TODO: fix path;
        DECORATOR_CLASS = "DefaultDecorator",
        BACKGROUND_TEXT_COLOR = '#DEDEDE',
        BACKGROUND_TEXT_SIZE = 30;


    SetEditorControl = function (options) {
        var self = this,
            $btnGroupConnectionType;

        this.logger = logManager.create("SetEditorControl");

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

        //in set edit mode DRAG & COPY is not enabled
        this.designerCanvas.enableDragCopy(false);

        this._selfPatterns = {};
        this._GMESetRelations = {};
        this._GmeID2ComponentID = {};
        this._ComponentID2GmeID = {};
        this._setRelations = {};
        this.eventQueue = [];

        //local variable holding info about the currently opened node
        this.currentNodeInfo = {"id": null, "children" : [], "parentId": null };

        /****************** ADD BUTTONS AND THEIR EVENT HANDLERS TO DESIGNER CANVAS ******************/


        /************** GOTO PARENT IN HIERARCHY BUTTON ****************/
        this.$btnGroupModelHierarchyUp = this.designerCanvas.toolBar.addButtonGroup(function (/*event, data*/) {
            self._onModelHierarchyUp();
        });

        this.designerCanvas.toolBar.addButton({ "title": "Go to parent",
            "icon": "icon-circle-arrow-up"}, this.$btnGroupModelHierarchyUp );

        /************** END OF - GOTO PARENT IN HIERARCHY BUTTON ****************/


        /************** SET TYPE SELECTOR BUTTONS *******************************/

            //add extra visual piece
        $btnGroupConnectionType = this.designerCanvas.toolBar.addRadioButtonGroup(function (event, data) {
            self._setMetaConnectionType(data.mode);
        });

        var btnCreateSetValidChildren = this.designerCanvas.toolBar.addButton({ "title": CONSTANTS.SET_VALIDCHILDREN,
            "selected": true,
            "data": { "mode": CONSTANTS.SET_VALIDCHILDREN }}, $btnGroupConnectionType );
        this._createButtonFace(btnCreateSetValidChildren, CONSTANTS.SET_VALIDCHILDREN);

        var btnCreateSetValidInheritor = this.designerCanvas.toolBar.addButton({ "title": CONSTANTS.SET_VALIDINHERITOR,
            "data": { "mode": CONSTANTS.SET_VALIDINHERITOR }}, $btnGroupConnectionType );
        this._createButtonFace(btnCreateSetValidInheritor, CONSTANTS.SET_VALIDINHERITOR);

        var btnCreateSetValidSource = this.designerCanvas.toolBar.addButton({ "title": CONSTANTS.SET_VALIDSOURCE,
            "data": { "mode": CONSTANTS.SET_VALIDSOURCE }}, $btnGroupConnectionType );
        this._createButtonFace(btnCreateSetValidSource, CONSTANTS.SET_VALIDSOURCE);

        var btnCreateSetValidDestination = this.designerCanvas.toolBar.addButton({ "title": CONSTANTS.SET_VALIDDESTINATION,
            "data": { "mode": CONSTANTS.SET_VALIDDESTINATION }}, $btnGroupConnectionType );
        this._createButtonFace(btnCreateSetValidDestination, CONSTANTS.SET_VALIDDESTINATION);

        var btnCreateSetGeneral = this.designerCanvas.toolBar.addButton({ "title": CONSTANTS.SET_GENERAL,
            "data": { "mode": CONSTANTS.SET_GENERAL }}, $btnGroupConnectionType );
        this._createButtonFace(btnCreateSetGeneral, CONSTANTS.SET_GENERAL);

        /************** SET TYPE SELECTOR BUTTONS *******************************/


        /****************** END OF - ADD BUTTONS AND THEIR EVENT HANDLERS TO DESIGNER CANVAS ******************/

        //attach all the event handlers for event's coming from DesignerCanvas
        this.attachDiagramDesignerWidgetEventHandlers();


        //by default select 'children' set type connection
        this._setMetaConnectionType(CONSTANTS.SET_VALIDCHILDREN);

        this.logger.debug("SetEditorControl ctor");
    };

    //attach DesignerControl - DesignerCanvas event handler functions
    _.extend(SetEditorControl.prototype, SetEditorControlDiagramDesignerWidgetEventHandlers.prototype);

    SetEditorControl.prototype.CONTROLLER_REGISTRY_ENTRY_NAME = "SetEditorControl";

    //called from the outside world when the selection in the TreeBrowser changes
    SetEditorControl.prototype.selectedObjectChanged = function (nodeId) {
        var desc = this._getObjectDescriptor(nodeId);

        this.logger.debug("SELECTEDOBJECT_CHANGED nodeId '" + nodeId + "'");

        //delete everything from model editor
        this.designerCanvas.clear();

        //clean up local hash map
        this._GMESetRelations = {};

        this._GmeID2ComponentID = {};
        this._ComponentID2GmeID = {};

        //remove current territory patterns
        if (this.currentNodeInfo.id) {
            this._client.removeUI(this._territoryId);
        }

        this.currentNodeInfo.id = nodeId;
        this.currentNodeInfo.parentId = undefined;

        if (nodeId) {
            this.currentNodeInfo.parentId = desc.parentId;

            if (this.currentNodeInfo.parentId) {
                this.$btnGroupModelHierarchyUp.show();
            } else {
                this.$btnGroupModelHierarchyUp.hide();
            }


            //put new node's info into territory rules
            this._selfPatterns = {};
            this._selfPatterns[nodeId] = { "children": 1 };

            this._panel.setTitle(desc.name);

            this.designerCanvas.setBackgroundText(desc.name, {"color": BACKGROUND_TEXT_COLOR,
                "font-size": BACKGROUND_TEXT_SIZE});

            this.designerCanvas.showPogressbar();

            this._territoryId = this._client.addUI(this, true);
            //update the territory
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        } else {
            this.designerCanvas.setBackgroundText("No object to display", {"color": BACKGROUND_TEXT_COLOR,
                "font-size": BACKGROUND_TEXT_SIZE});
        }
    };

    SetEditorControl.prototype.onOneEvent = function (events) {
        var i = events ? events.length : 0;

        this.logger.debug("onOneEvent '" + i + "' items");

        if (i > 0) {
            this.eventQueue.push(events);
            this._processNextInQueue();
        }

        this.logger.debug("onOneEvent '" + events.length + "' items - DONE");
    };

    SetEditorControl.prototype.destroy = function () {
        this._client.removeUI(this._territoryId);
    };

    SetEditorControl.prototype._processNextInQueue = function () {
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

                    itemDecorator = nextBatchInQueue[len].desc.decorator;

                    if (itemDecorator && itemDecorator !== "") {
                        decoratorsToDownload.pushUnique(this._getFullDecoratorName(itemDecorator));
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

    SetEditorControl.prototype._getFullDecoratorName = function (decorator) {
        return DECORATOR_PATH + decorator + "/" + decorator;
    };

    SetEditorControl.prototype._getObjectDescriptor = function (nodeId) {
        var nodeObj = this._client.getNode(nodeId),
            objDescriptor,
            pos,
            controllerRegistryEntry;

        if (nodeObj) {
            objDescriptor = { "id": undefined,
                              "parentId": undefined,
                              "name": "",
                              "position": { "x": 100, "y": 100 },
                              "decorator": DECORATOR_CLASS };

            objDescriptor.id = nodeObj.getId();
            objDescriptor.parentId = nodeObj.getParentId();

            objDescriptor.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || "";

            controllerRegistryEntry = nodeObj.getRegistry(this.CONTROLLER_REGISTRY_ENTRY_NAME);

            if (controllerRegistryEntry) {
                pos = controllerRegistryEntry.position;
            } else {
                pos = nodeObj.getRegistry(nodePropertyNames.Registry.position);
            }

            if (pos && _.isNumber(pos.x) && _.isNumber(pos.x)) {
                objDescriptor.position.x = pos.x;
                objDescriptor.position.y = pos.y;
            }
        }

        return objDescriptor;
    };

    SetEditorControl.prototype._dispatchEvents = function (events) {
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

        i = events.length;

        while (i--) {
            e = events[i];
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
        this._processNextInQueue();
    };

        // PUBLIC METHODS
    SetEditorControl.prototype._onLoad = function (gmeID, objD) {
        var objDesc,
            decClass,
            uiComponent;

        //component loaded
        //we are interested in the load of subcomponents of the opened component
        if (this.currentNodeInfo.id !== gmeID) {
            if (objD && this.currentNodeInfo.id === objD.parentId) {

                if (this.firstRun === false) {
                    this._updateSetRelations(gmeID);
                } else {
                    this._GmeID2ComponentID[gmeID] = [];

                    objDesc = _.extend({}, objD);

                    decClass = this._client.decoratorManager.get(this._getFullDecoratorName(objDesc.decorator));

                    objDesc.decoratorClass = decClass;
                    objDesc.control = this;
                    objDesc.metaInfo = {};
                    objDesc.metaInfo[CONSTANTS.GME_ID] = gmeID;


                    uiComponent = this.designerCanvas.createDesignerItem(objDesc);

                    this._GmeID2ComponentID[gmeID].push(uiComponent.id);
                    this._ComponentID2GmeID[uiComponent.id] = gmeID;
                }
            }
        }
    };

    SetEditorControl.prototype._onUpdate = function (gmeID, objDesc) {
        var componentID,
            len,
            decClass;

        //self or child updated
        //check if the updated object is the opened node
        if (gmeID === this.currentNodeInfo.id) {
            //the updated object is the parent whose children are displayed here
            //the interest about the parent is:
            // - name change
            this._panel.setTitle(objDesc.name);
        } else {
            if (objDesc) {
                if (objDesc.parentId == this.currentNodeInfo.id) {

                    //update position if necessary
                    len = this._GmeID2ComponentID[gmeID].length;
                    while (len--) {
                        componentID = this._GmeID2ComponentID[gmeID][len];

                        decClass = this._client.decoratorManager.get(this._getFullDecoratorName(objDesc.decorator));

                        objDesc.decoratorClass = decClass;

                        this.designerCanvas.updateDesignerItem(componentID, objDesc);
                    }

                    //update set relations
                    this._updateSetRelations(gmeID);
                }
            }
        }
    };

    SetEditorControl.prototype._onUnload = function (gmeID) {
        var componentID,
            len,
            connectionIDsToRemove = [],
            set,
            i,
            connId;

        //self or child updated
        //check if the updated object is the opened node
        if (gmeID === this.currentNodeInfo.id) {
            //the unloaded object is the parent whose children are displayed here
            this.logger.debug('The currently opened model has been deleted --- GMEID: "' + this.currentNodeInfo.id + '"');
            this.designerCanvas.setBackgroundText('The currently opened model has been deleted...',{"color": BACKGROUND_TEXT_COLOR,
                "font-size": BACKGROUND_TEXT_SIZE});
        } else {
            //get all the set-relation representation for this guy
            //remove all the connections associated with it
            if (this._GMESetRelations[gmeID]) {
                for (set in this._GMESetRelations[gmeID]) {
                    if (this._GMESetRelations[gmeID].hasOwnProperty(set)) {
                        for (i in this._GMESetRelations[gmeID][set]) {
                            if (this._GMESetRelations[gmeID][set].hasOwnProperty(i)) {
                                connectionIDsToRemove.push(this._GMESetRelations[gmeID][set][i]);
                            }
                        }
                    }
                }
            }

            i = connectionIDsToRemove.length;
            while (i--) {
                connId = connectionIDsToRemove[i];
                this.designerCanvas.deleteComponent(connId);

                //update accounting maps
                delete this._setRelations[connId];
            }

            //update accounting maps
            delete this._GMESetRelations[gmeID];

            //check if it was an object represented by an item and remove them
            len = this._GmeID2ComponentID[gmeID].length;
            while (len--) {
                componentID = this._GmeID2ComponentID[gmeID][len];

                this.designerCanvas.deleteComponent(componentID);
            }

        }
    };

    SetEditorControl.prototype._createButtonFace = function (btn, connType) {
        btn.append(SetVisualHelper.createButtonIcon(16, SetVisualHelper.getLineVisualDescriptor(connType)));
    };

    SetEditorControl.prototype._setMetaConnectionType = function (mode) {
        var params = {},
            metaInfo = {};

        if (this._connectionType !== mode) {
            metaInfo = {"type": mode };
            this.designerCanvas.connectionDrawingManager.setMetaInfo(metaInfo);

            params = SetVisualHelper.getLineVisualDescriptor(mode);

            this.designerCanvas.connectionDrawingManager.setConnectionInDrawProperties(params);
        }
    };

    SetEditorControl.prototype._onModelHierarchyUp = function () {
        if (this.currentNodeInfo.parentId) {
            this._client.setSelectedObjectId(this.currentNodeInfo.parentId);
        }
    };

    SetEditorControl.prototype._updateSetRelations = function (gmeID) {
        var nodeObj = this._client.getNode(gmeID),
            objDesc,
            i,
            sets = [CONSTANTS.SET_VALIDINHERITOR, CONSTANTS.SET_VALIDCHILDREN, CONSTANTS.SET_VALIDDESTINATION, CONSTANTS.SET_VALIDSOURCE, CONSTANTS.SET_GENERAL],
            setlen = sets.length,
            displayedSetMembers,
            currentSetMembers,
            currentSet,
            diff,
            connId;

        while (setlen--) {
            currentSet = sets[setlen];

            //query displayed set members
            displayedSetMembers = [];
            if (this._GMESetRelations[gmeID]) {
                for (i in this._GMESetRelations[gmeID][currentSet]) {
                    if (this._GMESetRelations[gmeID][currentSet].hasOwnProperty(i)) {
                        displayedSetMembers.push(i);
                    }
                }
            }

            //query the actual set members from GME object
            currentSetMembers = nodeObj.getMemberIds(currentSet) || [];

            //let's see who has been deleted and remove them from the screen
            diff = _.difference(displayedSetMembers, currentSetMembers);
            i = diff.length;
            while (i--) {
                connId = this._GMESetRelations[gmeID][currentSet][diff[i]];
                this.designerCanvas.deleteComponent(connId);

                //update accounting maps
                delete this._setRelations[connId];
                delete this._GMESetRelations[gmeID][currentSet][diff[i]];
            }

            //let's see who is new and add them to the screen
            diff = _.difference(currentSetMembers, displayedSetMembers);
            i = diff.length;
            if (i > 0) {
                objDesc = {};

                objDesc.srcObjId = this._GmeID2ComponentID[gmeID][0];
                objDesc.srcSubCompId = undefined;
                objDesc.reconnectable = false;

                _.extend(objDesc, SetVisualHelper.getLineVisualDescriptor(currentSet));

                while (i--) {
                    if (this._GmeID2ComponentID.hasOwnProperty(diff[i]) &&
                        this._GmeID2ComponentID[diff[i]].length > 0) {

                        this._GMESetRelations[gmeID] = this._GMESetRelations[gmeID] || {};
                        this._GMESetRelations[gmeID][currentSet] = this._GMESetRelations[gmeID][currentSet] || {};

                        objDesc.dstObjId = this._GmeID2ComponentID[diff[i]][0];
                        objDesc.dstSubCompId = undefined;
                        connId = this.designerCanvas.createConnection(objDesc).id;

                        this._setRelations[connId] = { "owner": gmeID,
                            "member": diff[i],
                            "set": currentSet };


                        this._GMESetRelations[gmeID][currentSet][diff[i]] = connId;
                    }
                }
            }
        }
    };

    return SetEditorControl;
});