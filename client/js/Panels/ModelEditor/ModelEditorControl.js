"use strict";

define(['logManager',
    'js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    './ModelEditorControl.DiagramDesignerWidgetEventHandlers',
    './ModelEditorControl.DEBUG',
    'js/Utils/GMEConcepts',
    'js/Decorators/DecoratorDB',
    'js/Utils/DisplayFormat'], function (logManager,
                                                        CONSTANTS,
                                                        nodePropertyNames,
                                                        DiagramDesignerWidgetConstants,
                                                        ModelEditorControlDiagramDesignerWidgetEventHandlers,
                                                        ModelEditorControlDEBUG,
                                                        GMEConcepts,
                                                        DecoratorDB,
                                                        displayFormat) {

    var ModelEditorControl,
        GME_ID = "GME_ID",
        BACKGROUND_TEXT_COLOR = '#DEDEDE',
        BACKGROUND_TEXT_SIZE = 30,
        DEFAULT_DECORATOR = "ModelDecorator",
        WIDGET_NAME = 'DiagramDesigner',
        DEFAULT_LINE_STYLE = {},
        SRC_POINTER_NAME = CONSTANTS.POINTER_SOURCE,
        DST_POINTER_NAME = CONSTANTS.POINTER_TARGET;

    DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.WIDTH] = 1;
    DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.COLOR] = "#000000";
    DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.PATTERN] = "";
    DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.TYPE] = "";
    DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.START_ARROW] = "none";
    DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.END_ARROW] = "none";
    DEFAULT_LINE_STYLE[CONSTANTS.LINE_STYLE.POINTS] = [];

    ModelEditorControl = function (options) {
        var self = this;

        this.logger = options.logger || logManager.create(options.loggerName || "ModelEditorControl");

        this._client = options.client;

        this._firstLoad = false;

        //initialize core collections and variables
        this.designerCanvas = options.widget;

        if (this._client === undefined) {
            this.logger.error("ModelEditorControl's client is not specified...");
            throw ("ModelEditorControl can not be created");
        }

        this._selectedObjectChanged = function (__project, nodeId) {
            self.selectedObjectChanged(nodeId);
        };

        if (this.designerCanvas === undefined) {
            this.logger.error("ModelEditorControl's DesignerCanvas is not specified...");
            throw ("ModelEditorControl can not be created");
        }

        this._selfPatterns = {};
        this._GmeID2ComponentID = {};
        this._ComponentID2GmeID = {};
        this.eventQueue = [];
        this._componentIDPartIDMap = {};

        //TODO: experiemtnal only, remove!!!
        this.___SLOW_CONN = false;

        this._DEFAULT_LINE_STYLE = DEFAULT_LINE_STYLE;

        this._enforceMetaRules = true;

        //local variable holding info about the currently opened node
        this.currentNodeInfo = {"id": null, "children" : [], "parentId": null };

        /****************** END OF - ADD BUTTONS AND THEIR EVENT HANDLERS TO DESIGNER CANVAS ******************/

        //attach all the event handlers for event's coming from DesignerCanvas
        this.attachDiagramDesignerWidgetEventHandlers();

        this.logger.debug("ModelEditorControl ctor finished");
    };

    ModelEditorControl.prototype.selectedObjectChanged = function (nodeId) {
        var desc,
            nodeName;

        this.logger.debug("SELECTEDOBJECT_CHANGED nodeId '" + nodeId + "'");

        //delete everything from model editor
        this.designerCanvas.clear();

        //clean up local hash map
        this._GMEModels = [];
        this._GMEConnections = [];

        this._GmeID2ComponentID = {};
        this._ComponentID2GmeID = {};

        this._GMEID2Subcomponent = {};
        this._Subcomponent2GMEID = {};

        //remove current territory patterns
        if (this.currentNodeInfo.id) {
            this._client.removeUI(this._territoryId);
        }

        this.currentNodeInfo.id = nodeId;
        this.currentNodeInfo.parentId = undefined;

        if (nodeId) {
            desc = this._getObjectDescriptor(nodeId);
            if (desc) {
                this.currentNodeInfo.parentId = desc.parentId;
            }

            if (this.currentNodeInfo.parentId) {
                this.$btnModelHierarchyUp.show();
            } else {
                this.$btnModelHierarchyUp.hide();
            }

            //put new node's info into territory rules
            this._selfPatterns = {};
            this._selfPatterns[nodeId] = { "children": 2 };

            this._firstLoad = true;

            nodeName = (desc && desc.name || " ").toUpperCase();

            this.designerCanvas.setTitle(nodeName);
            this.designerCanvas.setBackgroundText(nodeName, {'font-size': BACKGROUND_TEXT_SIZE,
                'color': BACKGROUND_TEXT_COLOR });

            this.designerCanvas.showProgressbar();

            this._territoryId = this._client.addUI(this, true);
            //update the territory
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        } else {
            this.designerCanvas.setBackgroundText("No object to display", {"color": BACKGROUND_TEXT_COLOR,
                "font-size": BACKGROUND_TEXT_SIZE});
        }
    };

    ModelEditorControl.prototype._getObjectDescriptor = function (nodeId) {
        var nodeObj = this._client.getNode(nodeId),
            objDescriptor,
            pos,
            defaultPos = 0,
            lineStyle,
            getValue;

        getValue = function (srcObj, srcKey, dstObj, dstKey, type) {
            if (srcObj) {
                if (srcObj[srcKey]) {
                      switch(type) {
                        case 'int':
                            try {
                                dstObj[dstKey] = parseInt(srcObj[srcKey], 10);
                            } catch (e) {

                            }
                            break;
                        case 'array':
                            try {
                                if (!_.isArray(srcObj[srcKey])) {
                                    dstObj[dstKey] = JSON.parse(srcObj[srcKey]);
                                } else {
                                    dstObj[dstKey] = srcObj[srcKey].slice(0);
                                }

                                if (!_.isArray(dstObj[dstKey])) {
                                    delete dstObj[dstKey];
                                }
                            } catch (e) {

                            }
                            break;
                        default:
                            dstObj[dstKey] = srcObj[srcKey];
                     }
                }
            }
        };

        if (nodeObj) {
            objDescriptor = {};

            objDescriptor.id = nodeObj.getId();
            objDescriptor.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name);
            objDescriptor.parentId = nodeObj.getParentId();

            if (nodeId !== this.currentNodeInfo.id) {
                //fill the descriptor based on its type
                if (GMEConcepts.isConnection(nodeId)) {
                    objDescriptor.kind = "CONNECTION";
                    objDescriptor.source = nodeObj.getPointer(SRC_POINTER_NAME).to;
                    objDescriptor.target = nodeObj.getPointer(DST_POINTER_NAME).to;

                    //clear out name not to display anything for connections
                    objDescriptor.name = displayFormat.resolve(nodeObj);

                    if (nodeObj.getAttribute(nodePropertyNames.Attributes.directed) === true) {
                        objDescriptor.arrowEnd = "block";
                    }
                    lineStyle =  nodeObj.getRegistry(nodePropertyNames.Registry.lineStyle);

                    getValue(lineStyle, CONSTANTS.LINE_STYLE.WIDTH, objDescriptor, DiagramDesignerWidgetConstants.LINE_WIDTH, 'int');
                    getValue(lineStyle, CONSTANTS.LINE_STYLE.COLOR, objDescriptor, DiagramDesignerWidgetConstants.LINE_COLOR);
                    getValue(lineStyle, CONSTANTS.LINE_STYLE.PATTERN, objDescriptor, DiagramDesignerWidgetConstants.LINE_PATTERN);
                    getValue(lineStyle, CONSTANTS.LINE_STYLE.TYPE, objDescriptor, DiagramDesignerWidgetConstants.LINE_TYPE);
                    getValue(lineStyle, CONSTANTS.LINE_STYLE.START_ARROW, objDescriptor, DiagramDesignerWidgetConstants.LINE_START_ARROW);
                    getValue(lineStyle, CONSTANTS.LINE_STYLE.END_ARROW, objDescriptor, DiagramDesignerWidgetConstants.LINE_END_ARROW);
                    getValue(lineStyle, CONSTANTS.LINE_STYLE.POINTS, objDescriptor, DiagramDesignerWidgetConstants.LINE_POINTS, 'array');
                } else {
                    objDescriptor.kind = "MODEL";
                    pos = nodeObj.getRegistry(nodePropertyNames.Registry.position);

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

                    objDescriptor.decorator = nodeObj.getRegistry(nodePropertyNames.Registry.decorator) || "";
                    objDescriptor.rotation = parseInt(nodeObj.getRegistry(nodePropertyNames.Registry.rotation), 10) || 0;
                }
            }
        }

        return objDescriptor;
    };

    ModelEditorControl.prototype._getDefaultValueForNumber = function (cValue, defaultValue) {
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
    ModelEditorControl.prototype.onOneEvent = function (events) {
        var i = events ? events.length : 0;

        this.logger.debug("onOneEvent '" + i + "' items");

        if (i > 0) {
            this.eventQueue.push(events);
            this.processNextInQueue();
        }

        this.logger.debug("onOneEvent '" + events.length + "' items - DONE");
    };

    ModelEditorControl.prototype.processNextInQueue = function () {
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

    ModelEditorControl.prototype._dispatchEvents = function (events) {
        var i = events.length,
            e,
            territoryChanged = false,
            self = this;

        this.logger.debug("_dispatchEvents '" + i + "' items");

        /********** ORDER EVENTS BASED ON DEPENDENCY ************/
        /** 1: items first, no dependency **/
        /** 2: connections second, dependency if a connection is connected to an other connection **/
        var orderedItemEvents = [];
        var orderedConnectionEvents = [];

        if (this._delayedConnections && this._delayedConnections.length > 0) {
            /*this.logger.warning('_delayedConnections: ' + this._delayedConnections.length );*/
            for (i = 0; i < this._delayedConnections.length; i += 1) {
                orderedConnectionEvents.push({'etype': CONSTANTS.TERRITORY_EVENT_LOAD,
                                              'eid': this._delayedConnections[i],
                                              'desc': this._getObjectDescriptor(this._delayedConnections[i]) });
            }
        }

        this._delayedConnections = [];

        var unloadEvents = [];
        i = events.length;
        while (i--) {
            e = events[i];

            if (e.etype === CONSTANTS.TERRITORY_EVENT_UNLOAD) {
                unloadEvents.push(e);
            } else if (e.desc.kind === "MODEL") {
                orderedItemEvents.push(e);
            } else if (e.desc.kind === "CONNECTION") {
                if (e.desc.parentId == this.currentNodeInfo.id) {
                    //check to see if SRC and DST is another connection
                    //if so, put this guy AFTER them
                    var srcGMEID = e.desc.source;
                    var dstGMEID = e.desc.target;
                    var srcConnIdx = -1;
                    var dstConnIdx = -1;
                    var j = orderedConnectionEvents.length;
                    while (j--) {
                        var ce = orderedConnectionEvents[j];
                        if (ce.id === srcGMEID) {
                            srcConnIdx = j;
                        } else if (ce.id === dstGMEID) {
                            dstConnIdx = j;
                        }

                        if (srcConnIdx !== -1 && dstConnIdx !== -1) {
                            break;
                        }
                    }

                    var insertIdxAfter = Math.max(srcConnIdx, dstConnIdx);

                    //check to see if this guy is a DEPENDENT of any already processed CONNECTION
                    //insert BEFORE THEM
                    var MAX_VAL = 999999999;
                    var depSrcConnIdx = MAX_VAL;
                    var depDstConnIdx = MAX_VAL;
                    var j = orderedConnectionEvents.length;
                    while (j--) {
                        var ce = orderedConnectionEvents[j];
                        if (e.desc.id === ce.desc.source) {
                            depSrcConnIdx = j;
                        } else if (e.desc.id === ce.desc.target) {
                            depDstConnIdx = j;
                        }

                        if (depSrcConnIdx !== MAX_VAL && depDstConnIdx !== MAX_VAL) {
                            break;
                        }
                    }

                    var insertIdxBefore = Math.min(depSrcConnIdx, depDstConnIdx);
                    if (insertIdxAfter === -1 && insertIdxBefore === MAX_VAL) {
                        orderedConnectionEvents.push(e);
                    } else {
                        if (insertIdxAfter !== -1 &&
                            insertIdxBefore === MAX_VAL) {
                            orderedConnectionEvents.splice(insertIdxAfter + 1,0,e);
                        } else if (insertIdxAfter === -1 &&
                            insertIdxBefore !== MAX_VAL) {
                            orderedConnectionEvents.splice(insertIdxBefore,0,e);
                        } else if (insertIdxAfter !== -1 &&
                            insertIdxBefore !== MAX_VAL) {
                            orderedConnectionEvents.splice(insertIdxBefore,0,e);
                        }
                    }
                } else {
                    orderedItemEvents.push(e);
                }

            } else if (this.currentNodeInfo.id === e.eid) {
                orderedItemEvents.push(e);
            }

        }

        /** LOG ORDERED CONNECTION LIST ********************/
        this.logger.debug('ITEMS: ');
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
        }
        /** END OF --- LOG ORDERED CONNECTION LIST ********************/

        //events = unloadEvents.concat(orderedItemEvents, orderedConnectionEvents);
        events = unloadEvents.concat(orderedItemEvents);
        i = events.length;

        this._notifyPackage = {};

        this.designerCanvas.beginUpdate();

        //items
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
            }
        }

        this._handleDecoratorNotification();

        //connections
        events = orderedConnectionEvents;
        i = events.length;

        //items
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
            }
        }

        this.designerCanvas.endUpdate();

        this.designerCanvas.hideProgressbar();

        //update the territory
        if (territoryChanged) {
            //TODO: review this async here
            if (this.___SLOW_CONN === true) {
                setTimeout(function () {
                 self.logger.debug('Updating territory with ruleset from decorators: ' + JSON.stringify(self._selfPatterns));
                 self._client.updateTerritory(self._territoryId, self._selfPatterns);
                 }, 2000);
            } else {
                this.logger.debug('Updating territory with ruleset from decorators: ' + JSON.stringify(this._selfPatterns));
                this._client.updateTerritory(this._territoryId, this._selfPatterns);
            }
        }

        //check if firstload
        if (this._firstLoad === true) {
            this._firstLoad = false;

            //check if there is active selection set in client
            var activeSelection = this._client.getActiveSelection();

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

                this.designerCanvas.select(ddSelection);
            }
        }

        this.logger.debug("_dispatchEvents '" + events.length + "' items - DONE");

        //continue processing event queue
        this.processNextInQueue();
    };

    ModelEditorControl.prototype._getItemDecorator = function (decorator) {
        var result;

        result = this._client.decoratorManager.getDecoratorForWidget(decorator, WIDGET_NAME);

        if (!result) {
            result = this._client.decoratorManager.getDecoratorForWidget(DEFAULT_DECORATOR, WIDGET_NAME);
        }

        return result;
    };

    // PUBLIC METHODS
    ModelEditorControl.prototype._onLoad = function (gmeID, objD) {
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


        //component loaded
        //we are interested in the load of sub_components of the opened component
        if (this.currentNodeInfo.id !== gmeID) {
            if (objD) {
                if (objD.parentId == this.currentNodeInfo.id) {
                    objDesc = _.extend({}, objD);
                    this._GmeID2ComponentID[gmeID] = [];

                    if (objDesc.kind === "MODEL") {

                        this._GMEModels.push(gmeID);

                        decClass = this._getItemDecorator(objDesc.decorator);

                        objDesc.decoratorClass = decClass;
                        objDesc.control = this;
                        objDesc.metaInfo = {};
                        objDesc.metaInfo[CONSTANTS.GME_ID] = gmeID;

                        uiComponent = this.designerCanvas.createDesignerItem(objDesc);

                        this._GmeID2ComponentID[gmeID].push(uiComponent.id);
                        this._ComponentID2GmeID[uiComponent.id] = gmeID;

                        getDecoratorTerritoryQueries(uiComponent._decoratorInstance);

                    }

                    if (objDesc.kind === "CONNECTION") {

                        this._GMEConnections.push(gmeID);

                        var srcDst = this._getAllSourceDestinationPairsForConnection(objDesc.source, objDesc.target);
                        sources = srcDst.sources;
                        destinations = srcDst.destinations;

                        var k = sources.length;
                        var l = destinations.length;

                        if (k > 0 && l > 0) {
                            while (k--) {
                                while (l--) {
                                    objDesc.srcObjId = sources[k].objId;
                                    objDesc.srcSubCompId = sources[k].subCompId;
                                    objDesc.dstObjId = destinations[l].objId;
                                    objDesc.dstSubCompId = destinations[l].subCompId;
                                    objDesc.reconnectable = true;
                                    objDesc.editable = true;

                                    delete objDesc.source;
                                    delete objDesc.target;

                                    uiComponent = this.designerCanvas.createConnection(objDesc);

                                    this.logger.debug('Connection: ' + uiComponent.id + ' for GME object: ' + objDesc.id);

                                    this._GmeID2ComponentID[gmeID].push(uiComponent.id);
                                    this._ComponentID2GmeID[uiComponent.id] = gmeID;
                                }
                            }
                        } else {
                            //the connection is here, but no valid endpoint on canvas
                            //save the connection
                            this._delayedConnections.push(gmeID);
                        }
                    }
                } else {
                    //supposed to be the grandchild of the currently open node
                    //--> load of port
                    /*if(this._GMEModels.indexOf(objD.parentId) !== -1){
                        this._onUpdate(objD.parentId,this._getObjectDescriptor(objD.parentId));
                    }*/
                    this._checkComponentDependency(gmeID, CONSTANTS.TERRITORY_EVENT_LOAD);
                }
            }
        } else {
            //currently opened node
            this._updateSheetName(objD.name);
        }

        return territoryChanged;

    };

    ModelEditorControl.prototype._onUpdate = function (gmeID, objDesc) {
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
            this._updateSheetName(objDesc.name);
        } else {
            if (objDesc) {
                if (objDesc.parentId === this.currentNodeInfo.id) {
                    if (objDesc.kind === "MODEL") {
                        if(this._GmeID2ComponentID[gmeID]){
                            len = this._GmeID2ComponentID[gmeID].length;
                            while (len--) {
                                componentID = this._GmeID2ComponentID[gmeID][len];

                                decClass = this._getItemDecorator(objDesc.decorator);

                                objDesc.decoratorClass = decClass;

                                this.designerCanvas.updateDesignerItem(componentID, objDesc);
                            }
                        }
                    }

                    //there is a connection associated with this GMEID
                    if (this._GMEConnections.indexOf(gmeID) !== -1) {
                        len = this._GmeID2ComponentID[gmeID].length;
                        var srcDst = this._getAllSourceDestinationPairsForConnection(objDesc.source, objDesc.target);
                        var sources = srcDst.sources;
                        var destinations = srcDst.destinations;

                        var k = sources.length;
                        var l = destinations.length;
                        len -= 1;

                        while (k--) {
                            while (l--) {
                                objDesc.srcObjId = sources[k].objId;
                                objDesc.srcSubCompId = sources[k].subCompId;
                                objDesc.dstObjId = destinations[l].objId;
                                objDesc.dstSubCompId = destinations[l].subCompId;
                                objDesc.reconnectable = true;
                                objDesc.editable = true;

                                delete objDesc.source;
                                delete objDesc.target;

                                if (len >= 0) {
                                    componentID =  this._GmeID2ComponentID[gmeID][len];

                                    this.designerCanvas.updateConnection(componentID, objDesc);

                                    len -= 1;
                                } else {
                                    this.logger.warning('Updating connections...Existing connections are less than the needed src-dst combo...');
                                    //let's create a connection
                                    var uiComponent = this.designerCanvas.createConnection(objDesc);
                                    this.logger.debug('Connection: ' + uiComponent.id + ' for GME object: ' + objDesc.id);
                                    this._GmeID2ComponentID[gmeID].push(uiComponent.id);
                                    this._ComponentID2GmeID[uiComponent.id] = gmeID;
                                }
                            }
                        }

                        if (len >= 0) {
                            //some leftover connections on the widget
                            //delete them
                            len += 1;
                            while (len--) {
                                componentID =  this._GmeID2ComponentID[gmeID][len];
                                this.designerCanvas.deleteComponent(componentID);
                                this._GmeID2ComponentID[gmeID].splice(len, 1);
                            }
                        }
                    }
                } else {
                    //update about a subcomponent - will be handled in the decorator
                    this._checkComponentDependency(gmeID, CONSTANTS.TERRITORY_EVENT_UPDATE);
                }
            }
        }
    };

    ModelEditorControl.prototype._updateSheetName = function (name) {
        this.designerCanvas.setTitle(name.toUpperCase());
        this.designerCanvas.setBackgroundText(name.toUpperCase(), {'font-size': BACKGROUND_TEXT_SIZE,
            'color': BACKGROUND_TEXT_COLOR });
    };

    ModelEditorControl.prototype._onUnload = function (gmeID) {
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
            this.designerCanvas.setBackgroundText('The previously opened model does not exist...', {'font-size': BACKGROUND_TEXT_SIZE,
                                                                                                     'color': BACKGROUND_TEXT_COLOR});
        } else {
            if (this._GmeID2ComponentID.hasOwnProperty(gmeID)) {
                len = this._GmeID2ComponentID[gmeID].length;
                while (len--) {
                    componentID = this._GmeID2ComponentID[gmeID][len];

                    if (this.designerCanvas.itemIds.indexOf(componentID) !== -1) {
                        getDecoratorTerritoryQueries(this.designerCanvas.items[componentID]._decoratorInstance);
                    }

                    this.designerCanvas.deleteComponent(componentID);

                    delete this._ComponentID2GmeID[componentID];
                }

                delete this._GmeID2ComponentID[gmeID];
            } else {
                //probably a subcomponent has been deleted - will be handled in the decorator
                this._checkComponentDependency(gmeID, CONSTANTS.TERRITORY_EVENT_UNLOAD);
            }
        }

        return territoryChanged;
    };

    //TODO: check this here...
    ModelEditorControl.prototype.destroy = function () {
        this._detachClientEventListeners();
        this._removeToolbarItems();
        this._client.removeUI(this._territoryId);
    };

    ModelEditorControl.prototype._onModelHierarchyUp = function () {
        if (this.currentNodeInfo.parentId) {
            this._client.setSelectedObjectId(this.currentNodeInfo.parentId);
        }
    };

    ModelEditorControl.prototype._removeConnectionSegmentPoints = function () {
        var idList = this.designerCanvas.selectionManager.getSelectedElements(),
            len = idList.length,
            nodeObj,
            existingLineStyle;


        this._client.startTransaction();

        while (len--) {
            if (this.designerCanvas.connectionIds.indexOf(idList[len]) !== -1) {
                nodeObj = this._client.getNode(this._ComponentID2GmeID[idList[len]]);

                if (nodeObj) {
                    existingLineStyle = nodeObj.getEditableRegistry(nodePropertyNames.Registry.lineStyle) || {};

                    existingLineStyle[CONSTANTS.LINE_STYLE.POINTS] = [];

                    this._client.setRegistry(nodeObj.getId(), nodePropertyNames.Registry.lineStyle, existingLineStyle);
                }
            }
        }

        this._client.completeTransaction();
    };


    ModelEditorControl.prototype._getAllSourceDestinationPairsForConnection = function (GMESrcId, GMEDstId) {
        var sources = [],
            destinations = [],
            i;

        if (this._GmeID2ComponentID.hasOwnProperty(GMESrcId)) {
            //src is a DesignerItem
            i = this._GmeID2ComponentID[GMESrcId].length;
            while (i--) {
                sources.push( {"objId" : this._GmeID2ComponentID[GMESrcId][i],
                    "subCompId" : undefined });
            }
        } else {
            //src is not a DesignerItem
            //must be a sub_components somewhere, find the corresponding designerItem
            if (this._GMEID2Subcomponent && this._GMEID2Subcomponent.hasOwnProperty(GMESrcId)) {
                for (i in this._GMEID2Subcomponent[GMESrcId]) {
                    if (this._GMEID2Subcomponent[GMESrcId].hasOwnProperty(i)) {
                        sources.push( {"objId" : i,
                            "subCompId" : this._GMEID2Subcomponent[GMESrcId][i] });
                    }
                }
            }
        }

        if (this._GmeID2ComponentID.hasOwnProperty(GMEDstId)) {
            i = this._GmeID2ComponentID[GMEDstId].length;
            while (i--) {
                destinations.push( {"objId" : this._GmeID2ComponentID[GMEDstId][i],
                    "subCompId" : undefined });
            }
        } else {
            //dst is not a DesignerItem
            //must be a sub_components somewhere, find the corresponding designerItem
            if (this._GMEID2Subcomponent && this._GMEID2Subcomponent.hasOwnProperty(GMEDstId)) {
                for (i in this._GMEID2Subcomponent[GMEDstId]) {
                    if (this._GMEID2Subcomponent[GMEDstId].hasOwnProperty(i)) {
                        destinations.push( {"objId" : i,
                            "subCompId" : this._GMEID2Subcomponent[GMEDstId][i] });
                    }
                }
            }
        }

        return {'sources': sources,
                'destinations': destinations};
    };

    ModelEditorControl.prototype.registerComponentIDForPartID = function (componentID, partId) {
        this._componentIDPartIDMap[componentID] = this._componentIDPartIDMap[componentID] || [];
        if (this._componentIDPartIDMap[componentID].indexOf(partId) === -1) {
            this._componentIDPartIDMap[componentID].push(partId);
        }
    };

    ModelEditorControl.prototype.unregisterComponentIDFromPartID = function (componentID, partId) {
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

    ModelEditorControl.prototype._checkComponentDependency = function (gmeID, eventType) {
        var len;
        if (this._componentIDPartIDMap && this._componentIDPartIDMap[gmeID]) {
            len = this._componentIDPartIDMap[gmeID].length;
            while (len--) {
                this._notifyPackage[this._componentIDPartIDMap[gmeID][len]] = this._notifyPackage[this._componentIDPartIDMap[gmeID][len]] || [];
                this._notifyPackage[this._componentIDPartIDMap[gmeID][len]].push({'id': gmeID, 'event': eventType});
            }
        }
    };

    ModelEditorControl.prototype._handleDecoratorNotification = function () {
        var gmeID,
            i,
            itemID;

        for (gmeID in this._notifyPackage) {
            if (this._notifyPackage.hasOwnProperty(gmeID)) {
                this.logger.debug('NotifyPartDecorator: ' + gmeID + ', componentIDs: ' + JSON.stringify(this._notifyPackage[gmeID]));

                if (this._GmeID2ComponentID.hasOwnProperty(gmeID)) {
                    //src is a DesignerItem
                    i = this._GmeID2ComponentID[gmeID].length;
                    while (i--) {
                        itemID = this._GmeID2ComponentID[gmeID][i];
                        this.designerCanvas.notifyItemComponentEvents(itemID, this._notifyPackage[gmeID]);
                    }
                }
            }
        }
    };

    ModelEditorControl.prototype._constraintCheck = function () {
        //Cconstraint Checking goes here...
        if (this.currentNodeInfo.id) {
            WebGMEGlobal.ConstraintManager.validate(this.currentNodeInfo.id);
        }
    };

    ModelEditorControl.prototype._attachClientEventListeners = function () {
        this._detachClientEventListeners();
        this._client.addEventListener(this._client.events.SELECTEDOBJECT_CHANGED, this._selectedObjectChanged);
    };

    ModelEditorControl.prototype._detachClientEventListeners = function () {
        this._client.removeEventListener(this._client.events.SELECTEDOBJECT_CHANGED, this._selectedObjectChanged);
    };

    ModelEditorControl.prototype.onActivate = function () {
        this._attachClientEventListeners();
        this._displayToolbarItems();
    };

    ModelEditorControl.prototype.onDeactivate = function () {
        this._detachClientEventListeners();
        this._hideToolbarItems();
    };

    ModelEditorControl.prototype._displayToolbarItems = function () {
        if (this._toolbarInitialized !== true) {
            this._initializeToolbar();
            if (DEBUG === true) {
                this._addDebugModeExtensions();
            }
        } else {
            for (var i = 0; i < this._toolbarItems.length; i++) {
                this._toolbarItems[i].show();
            }
            if (DEBUG === true) {
                this._showDebugModeExtensions();
            }
        }
    };

    ModelEditorControl.prototype._hideToolbarItems = function () {
        if (this._toolbarInitialized === true) {
            for (var i = 0; i < this._toolbarItems.length; i++) {
                this._toolbarItems[i].hide();
            }
            if (DEBUG === true) {
                this._hideDebugModeExtensions();
            }
        }
    };

    ModelEditorControl.prototype._removeToolbarItems = function () {
        if (this._toolbarInitialized === true) {
            for (var i = 0; i < this._toolbarItems.length; i++) {
                this._toolbarItems[i].destroy();
            }
            if (DEBUG === true) {
                this._removeDebugModeExtensions();
            }
        }
    };

    ModelEditorControl.prototype._initializeToolbar = function () {
        var toolBar = WebGMEGlobal.Toolbar,
            self = this;

        this._toolbarItems = [];

        /****************** ADD BUTTONS AND THEIR EVENT HANDLERS TO DESIGNER CANVAS ******************/

        /************** GOTO PARENT IN HIERARCHY BUTTON ****************/
        this.$btnModelHierarchyUp = toolBar.addButton({ "title": "Go to parent",
            "icon": "icon-circle-arrow-up",
            "clickFn": function (/*data*/) {
                self._onModelHierarchyUp();
            }
        });
        this._toolbarItems.push(this.$btnModelHierarchyUp);

        this.$btnModelHierarchyUp.hide();


        /************************ CONTSTRAINT VALIDATION ******************/
        this.$btnConstraintValidate = toolBar.addButton({ "title": "Constraint check...",
            "icon": "icon-fire",
            "clickFn": function (/*data*/) {
                self._constraintCheck();
            }
        });
        this._toolbarItems.push(this.$btnConstraintValidate);

        /************** REMOVE CONNECTION SEGMENTPOINTS BUTTON ****************/
        this.$btnConnectionRemoveSegmentPoints = toolBar.addButton(
            { "title": "Remove segment points",
                "icon": "icon-remove-circle",
                "clickFn": function (/*data*/) {
                    self._removeConnectionSegmentPoints();
                }
            });
        this._toolbarItems.push(this.$btnConnectionRemoveSegmentPoints);
        this.$btnConnectionRemoveSegmentPoints.enabled(false);

        /************ ENFORCE META RULES TOGGLE BUTTON **********************/
        /*this.$btnEnforceMetaRules = toolBar.addToggleButton({
                "icon": 'icon-exclamation-sign',
                "text": 'Enforce META rules',
                "title": "Enforce META rules ON/OFF",
                "clickFn": function (data, isPressed) {
                    self._enforceMetaRules = !self._enforceMetaRules;
                    self.logger.warning('!!! ENFORCE META RULES IS NOT YET IMPLEMENTED !!!');
                }}
        );
        this.$btnEnforceMetaRules.setToggled(this._enforceMetaRules);
        this._toolbarItems.push(this.$btnEnforceMetaRules);*/


        this._toolbarInitialized = true;
    };

    ModelEditorControl.prototype.getNodeID = function () {
        return this.currentNodeInfo.id;
    };

    //attach ModelEditorControl - DesignerCanvas event handler functions
    _.extend(ModelEditorControl.prototype, ModelEditorControlDiagramDesignerWidgetEventHandlers.prototype);

    //in DEBUG mode add additional content to canvas
    if (DEBUG === true) {
        _.extend(ModelEditorControl.prototype, ModelEditorControlDEBUG.prototype);
    }

    return ModelEditorControl;
});
