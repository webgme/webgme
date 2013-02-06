"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'js/DiagramDesigner/NodePropertyNames',
    'js/SetEditor2/SetEditorControl.DesignerCanvasEventHandlers',
    'css!SetEditor2CSS/SetEditorControl'], function (logManager,
                                                     clientUtil,
                                                     commonUtil,
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
        LOAD_EVENT_NAME = "load",
        UPDATE_EVENT_NAME = "update",
        UNLOAD_EVENT_NAME = "unload",
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

        if (options.designerCanvas === undefined) {
            this.logger.error("SetEditorControl's DesignerCanvas is not specified...");
            throw ("SetEditorControl can not be created");
        }

        //initialize core collections and variables
        this.designerCanvas = options.designerCanvas;

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

    SetEditorControl.prototype.CONTROLLER_REGISTRY_ENTRY_NAME = "SetEditorControl",

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

    SetEditorControl.prototype._processNextInQueue = function () {
        var nextBatchInQueue,
            len = this.eventQueue.length,
            decoratorsToDownload = [],
            itemDecorator;

        if (len > 0) {
            nextBatchInQueue = this.eventQueue.pop();

            len = nextBatchInQueue.length;

            while (len--) {
                if ( (nextBatchInQueue[len].etype === LOAD_EVENT_NAME) || (nextBatchInQueue[len].etype === UPDATE_EVENT_NAME)) {
                    nextBatchInQueue[len].desc = nextBatchInQueue[len].debugEvent ? _.extend({}, this._getObjectDescriptorDEBUG(nextBatchInQueue[len].eid) ) : this._getObjectDescriptor(nextBatchInQueue[len].eid);

                    itemDecorator = nextBatchInQueue[len].desc.decorator;

                    if (itemDecorator && itemDecorator !== "") {
                        if (!this.decoratorClasses.hasOwnProperty(itemDecorator)) {
                            decoratorsToDownload.insertUnique(itemDecorator);
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
                              "position": { "x": 100, "y": 100 },
                              "decorator": DECORATOR_CLASS };

            objDescriptor.id = nodeObj.getId();
            objDescriptor.parentId = nodeObj.getParentId();

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
                case LOAD_EVENT_NAME:
                    this._onLoad(e.eid, e.desc);
                    break;
                case "update":
                    this._onUpdate(e.eid, e.desc);
                    break;
                case "unload":
                    this._onUnload(e.eid);
                    break;
            }
        }

        this.firstRun = false;

        i = events.length;

        while (i--) {
            e = events[i];
            switch (e.etype) {
                case LOAD_EVENT_NAME:
                    this._onLoad(e.eid, e.desc);
                    break;
            }
        }



        this.delayedEvents = [];

        this.designerCanvas.endUpdate();

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

                objDesc = _.extend({}, objD);

                if (this.firstRun === false) {
                    this._updateSetRelations(gmeID);
                } else {
                    this._GmeID2ComponentID[gmeID] = [];

                    decClass = this.decoratorClasses[objDesc.decorator];

                    objDesc.decoratorClass = decClass;
                    objDesc.control = this;
                    objDesc.metaInfo = {"GMEID" : gmeID};

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
            decClass,
            objId,
            sCompId;

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
                    /*if (objDesc.kind === "MODEL") {
                        len = this._GmeID2ComponentID[gmeID].length;
                        while (len--) {
                            componentID = this._GmeID2ComponentID[gmeID][len];

                            decClass = this.decoratorClasses[objDesc.decorator];

                            objDesc.decoratorClass = decClass;

                            this.designerCanvas.updateDesignerItem(componentID, objDesc);
                        }
                    }

                    //there is a connection associated with this GMEID
                    if (this._GMEConnections.indexOf(gmeID) !== -1) {
                        len = this._GmeID2ComponentID[gmeID].length;
                        while (len--) {
                            componentID =  this._GmeID2ComponentID[gmeID][len];
                            this.designerCanvas.deleteComponent(componentID);
                        }

                        this.delayedEvents.push({ "etype": LOAD_EVENT_NAME,
                            "eid": gmeID,
                            "desc": objDesc });
                    }*/
                }
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
            obj,
            objDesc,
            setMemberIds,
            i,
            sets = [SET_VALIDINHERITOR, SET_VALIDCHILDREN, SET_VALIDDESTINATION, SET_VALIDSOURCE, SET_GENERAL],
            setlen = sets.length;

        while (setlen--) {
            setMemberIds = nodeObj.getMemberIds(sets[setlen]);
            if (setMemberIds) {

                objDesc = {};

                objDesc.srcObjId = this._GmeID2ComponentID[gmeID][0];
                objDesc.srcSubCompId = undefined;
                objDesc.reconnectable = false;

                _.extend(objDesc, this._getModeVisualDescriptor(sets[setlen]));

                i = setMemberIds.length;
                while (i--) {
                    if (this._GmeID2ComponentID.hasOwnProperty(setMemberIds[i]) &&
                        this._GmeID2ComponentID[setMemberIds[i]].length > 0) {

                        this._GMESetRelations[gmeID] = this._GMESetRelations[gmeID] || {};
                        this._GMESetRelations[gmeID][sets[setlen]] = this._GMESetRelations[gmeID][sets[setlen]] || {};

                        if (this._GMESetRelations[gmeID][sets[setlen]][setMemberIds[i]]) {
                            //there is already a connection representing this set-member relationship
                        }

                        objDesc.dstObjId = this._GmeID2ComponentID[setMemberIds[i]][0];
                        objDesc.dstSubCompId = undefined;
                        obj = this.designerCanvas.createConnection(objDesc);

                        this._setRelations[obj.id] = { "owner": gmeID,
                            "member": setMemberIds[i],
                            "set": sets[setlen] };


                        this._GMESetRelations[gmeID][sets[setlen]][setMemberIds[i]] = obj.id;
                    }
                }
            }
        }
    };

    return SetEditorControl;
});