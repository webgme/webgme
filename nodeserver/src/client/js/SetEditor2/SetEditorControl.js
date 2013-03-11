"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'js/Constants',
    'js/NodePropertyNames',
    'js/SetEditor2/SetEditorControl.DesignerCanvasEventHandlers',
    'css!SetEditor2CSS/SetEditorControl'], function (logManager,
                                                     clientUtil,
                                                     commonUtil,
                                                     CONSTANTS,
                                                     nodePropertyNames,
                                                     SetEditorControlDesignerCanvasEventHandlers) {

    var SetEditorControl,
        DECORATOR_PATH = "js/ModelEditor3/Decorators/",      //TODO: fix path;
        VALIDCHILDREN_TYPE_LINE_END = "diamond-wide-long",
        VALIDINHERITOR_TYPE_LINE_END = "block-wide-long",
        VALIDSOURCE_TYPE_LINE_END = "oval-wide-long",
        VALIDDESTINATION_TYPE_LINE_END = "open-wide-long",
        GENERAL_TYPE_LINE_END = "classic-wide-long",
        NOEND = "none",
        SET_VALIDCHILDREN = 'ValidChildren',
        SET_VALIDSOURCE = 'ValidSource',
        SET_VALIDDESTINATION = 'ValidDestination',
        SET_VALIDINHERITOR = 'ValidInheritor',
        SET_GENERAL = 'General',
        DECORATOR_CLASS = "DefaultDecorator";


    SetEditorControl = function (options) {
        var self = this,
            $btnGroupConnectionType;

        this.logger = logManager.create("SetEditorControl");

        if (options.client === undefined) {
            this.logger.error("SetEditorControl's client is not specified...");
            throw ("SetEditorControl can not be created");
        }

        if (options.widget === undefined) {
            this.logger.error("SetEditorControl's DesignerCanvas is not specified...");
            throw ("SetEditorControl can not be created");
        }

        //initialize core collections and variables
        this.designerCanvas = options.widget;
        //in set edit mode DRAG & COPY is not enabled
        this.designerCanvas.enableDragCopy(false);

        this._client = options.client;
        this._selfPatterns = {};
        this._GMESetRelations = {};
        this._GmeID2ComponentID = {};
        this._ComponentID2GmeID = {};
        this.decoratorClasses = {};
        this._setRelations = {};
        this.eventQueue = [];

        //local variable holding info about the currently opened node
        this.currentNodeInfo = {"id": null, "children" : [], "parentId": null };

        /****************** ADD BUTTONS AND THEIR EVENT HANDLERS TO DESIGNER CANVAS ******************/


        /************** GOTO PARENT IN HIERARCHY BUTTON ****************/
        this.$btnGroupModelHierarchyUp = this.designerCanvas.addButtonGroup(function (/*event, data*/) {
            self._onModelHierarchyUp();
        });

        this.designerCanvas.addButton({ "title": "Go to parent",
            "icon": "icon-circle-arrow-up"}, this.$btnGroupModelHierarchyUp );

        /************** END OF - GOTO PARENT IN HIERARCHY BUTTON ****************/


        /************** SET TYPE SELECTOR BUTTONS *******************************/

            //add extra visual piece
        $btnGroupConnectionType = this.designerCanvas.addRadioButtonGroup(function (event, data) {
            self._setMetaConnectionType(data.mode);
        });

        this.designerCanvas.addButton({ "title": SET_VALIDCHILDREN,
            "icon": "icon-meta-containment",
            "selected": true,
            "data": { "mode": SET_VALIDCHILDREN }}, $btnGroupConnectionType );

        this.designerCanvas.addButton({ "title": SET_VALIDINHERITOR,
            "icon": "icon-meta-inheritance",
            "data": { "mode": SET_VALIDINHERITOR }}, $btnGroupConnectionType );

        this.designerCanvas.addButton({ "title": SET_VALIDSOURCE,
            "icon": "icon-meta-set_validsource",
            "data": { "mode": SET_VALIDSOURCE }}, $btnGroupConnectionType );

        this.designerCanvas.addButton({ "title": SET_VALIDDESTINATION,
            "icon": "icon-meta-set_validdestination",
            "data": { "mode": SET_VALIDDESTINATION }}, $btnGroupConnectionType );

        this.designerCanvas.addButton({ "title": SET_GENERAL,
            "icon": "icon-meta-set_general",
            "data": { "mode": SET_GENERAL }}, $btnGroupConnectionType );

        /************** SET TYPE SELECTOR BUTTONS *******************************/


        /****************** END OF - ADD BUTTONS AND THEIR EVENT HANDLERS TO DESIGNER CANVAS ******************/

        //attach all the event handlers for event's coming from DesignerCanvas
        this.attachDesignerCanvasEventHandlers();


        //by default select 'children' set type connection
        this._setMetaConnectionType(SET_VALIDCHILDREN);

        this.logger.debug("SetEditorControl ctor");
    };

    //attach DesignerControl - DesignerCanvas event handler functions
    _.extend(SetEditorControl.prototype, SetEditorControlDesignerCanvasEventHandlers.prototype);

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

        if (nodeId) {
            this.currentNodeInfo.id = nodeId;
            this.currentNodeInfo.parentId = desc.parentId;

            if (this.currentNodeInfo.parentId) {
                this.$btnGroupModelHierarchyUp.show();
            } else {
                this.$btnGroupModelHierarchyUp.hide();
            }


            //put new node's info into territory rules
            this._selfPatterns = {};
            this._selfPatterns[nodeId] = { "children": 1 };

            this.designerCanvas.setTitle(desc.name);

            this.designerCanvas.showPogressbar();

            this._territoryId = this._client.addUI(this, true);
            //update the territory
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
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
            itemDecorator;

        if (len > 0) {
            nextBatchInQueue = this.eventQueue.pop();

            len = nextBatchInQueue.length;

            while (len--) {
                if ( (nextBatchInQueue[len].etype === CONSTANTS.TERRITORY_EVENT_LOAD) || (nextBatchInQueue[len].etype === CONSTANTS.TERRITORY_EVENT_UPDATE)) {
                    nextBatchInQueue[len].desc = nextBatchInQueue[len].debugEvent ? _.extend({}, this._getObjectDescriptorDEBUG(nextBatchInQueue[len].eid) ) : this._getObjectDescriptor(nextBatchInQueue[len].eid);

                    itemDecorator = nextBatchInQueue[len].desc.decorator;

                    if (itemDecorator && itemDecorator !== "") {
                        if (!this.decoratorClasses.hasOwnProperty(itemDecorator)) {
                            decoratorsToDownload.pushUnique(itemDecorator);
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

    SetEditorControl.prototype._downloadDecorators = function (decoratorList, callBack) {
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

                    decClass = this.decoratorClasses[objDesc.decorator];

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
            this.designerCanvas.setTitle(objDesc.name);
        } else {
            if (objDesc) {
                if (objDesc.parentId == this.currentNodeInfo.id) {

                    //update position if necessary
                    len = this._GmeID2ComponentID[gmeID].length;
                    while (len--) {
                        componentID = this._GmeID2ComponentID[gmeID][len];

                        decClass = this.decoratorClasses[objDesc.decorator];

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
            //the updated object is the parent whose children are displayed here
            //the interest about the parent is:
            // - name change
            this.designerCanvas.setTitle("!!!OBJECT has been deleted, not HANDLED CORRECTLY :(!!!!");
            this.logger.error("!!!OBJECT has been deleted, not HANDLED CORRECTLY :(!!!!");
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

    SetEditorControl.prototype._setMetaConnectionType = function (mode) {
        var params = {},
            metaInfo = {};

        if (this._connectionType !== mode) {
            metaInfo = {"type": mode };
            this.designerCanvas.connectionDrawingManager.setMetaInfo(metaInfo);

            params = this._getModeVisualDescriptor(mode);

            this.designerCanvas.connectionDrawingManager.setConnectionInDrawProperties(params);
        }
    };

    SetEditorControl.prototype._getModeVisualDescriptor = function (mode) {
        var params = { "arrowStart" : "none",
                        "arrowEnd" : "none",
                        "width" : "1",
                        "color" :"#AAAAAA" };

        switch (mode) {
            case SET_VALIDCHILDREN:
                params.arrowStart = VALIDCHILDREN_TYPE_LINE_END;
                params.arrowEnd = NOEND;
                params.width = 2;
                params.color = "#FF0000";
                break;
            case SET_VALIDINHERITOR:
                params.arrowStart = VALIDINHERITOR_TYPE_LINE_END;
                params.arrowEnd = NOEND;
                params.width = 2;
                params.color = "#0000FF";
                break;
            case SET_VALIDSOURCE:
                params.arrowStart = VALIDSOURCE_TYPE_LINE_END;
                params.arrowEnd = NOEND;
                params.width = 2;
                params.color = "#00FF00";
                break;
            case SET_VALIDDESTINATION:
                params.arrowStart = VALIDDESTINATION_TYPE_LINE_END;
                params.arrowEnd = NOEND;
                params.width = 2;
                params.color = "#AA03C3";
                break;
            case SET_GENERAL:
                params.arrowStart = GENERAL_TYPE_LINE_END;
                params.arrowEnd = NOEND;
                params.width = 2;
                params.color = "#000000";
                break;
            default:
                break;
        }

        return params;
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
            sets = [SET_VALIDINHERITOR, SET_VALIDCHILDREN, SET_VALIDDESTINATION, SET_VALIDSOURCE, SET_GENERAL],
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

                _.extend(objDesc, this._getModeVisualDescriptor(currentSet));

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