"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'js/Constants',
    'js/NodePropertyNames',
    'js/ModelEditor3/DesignerControl',
    'js/ModelEditor3/MetaDesignerControl.DEBUG',
    'css!ModelEditor3CSS/MetaDesignerControl'], function (logManager,
                                                     clientUtil,
                                                     commonUtil,
                                                     CONSTANTS,
                                                     nodePropertyNames,
                                                     DesignerControl,
                                                     MetaDesignerControlDEBUG) {

    var MetaDesignerControl,
        __parent__ = DesignerControl,
        __parent_proto__ = DesignerControl.prototype,
        VALIDCHILDREN_TYPE_LINE_END = "diamond-wide-long",
        VALIDINHERITOR_TYPE_LINE_END = "block-wide-long",
        VALIDSOURCE_TYPE_LINE_END = "oval-wide-long",
        VALIDDESTINATION_TYPE_LINE_END = "open-wide-long",
        GENERAL_TYPE_LINE_END = "classic-wide-long",
        NOEND = "none",
        LOAD_EVENT_NAME = "load",
        SET_VALIDCHILDREN = 'ValidChildren',
        SET_VALIDSOURCE = 'ValidSource',
        SET_VALIDDESTINATION = 'ValidDestination',
        SET_VALIDINHERITOR = 'ValidInheritor',
        SET_GENERAL = 'General';


    MetaDesignerControl = function (options) {
        var self = this,
            $btnGroupConnectionType;

        options.loggerName = options.loggerName || "MetaDesignerControl";

        //execute parent's constructor
        __parent__.apply(this, [options]);

        this._setRelations = {};

        //override parent's event handlers
        this.designerCanvas.onSelectionDelete = function (idList) {
            var len = idList.length,
                desc;

            while (len--) {
                if (self._setRelations[idList[len]]) {
                    desc = self._setRelations[idList[len]];
                    self._client.removeMember(desc.owner, desc.member, desc.set);
                    delete self._setRelations[idList[len]];
                    self.designerCanvas.deleteComponent(idList[len]);

                }
            }
        };

        this.designerCanvas.onCreateNewConnection = function (params) {
            var type = params.metaInfo.type,
                sourceId = self._ComponentID2GmeID[params.src],
                targetId = self._ComponentID2GmeID[params.dst];

            //connDesc.type has special meaning: inheritance, containment, etc
            if (type) {
                self._client.addMember(sourceId, targetId, type);
            }
        };

        this.designerCanvas.onDesignerItemDoubleClick = function (id, event) {
            var gmeID = self._ComponentID2GmeID[id];

            if (gmeID) {
                self.logger.debug("Opening model with id '" + gmeID + "'");
                self._client.setSelectedObjectId(gmeID);
            }
        };

        this._setMetaConnectionType(SET_VALIDCHILDREN);

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

        //in DEBUG mode add additional content to canvas
        if (commonUtil.DEBUG === true) {
            //this._addMetaDebugModeExtensions();
        }

        this.logger.debug("MetaDesignerControl ctor");
    };

    _.extend(MetaDesignerControl.prototype, __parent_proto__);
    //in DEBUG mode add additional extensions
    if (commonUtil.DEBUG === true) {
        _.extend(MetaDesignerControl.prototype, MetaDesignerControlDEBUG.prototype);
    }

    /************** OVERRIDE ************************/
    MetaDesignerControl.prototype._getObjectDescriptor = function (nodeId) {
        var nodeObj = this._client.getNode(nodeId),
            objDescriptor,
            pos;

        if (nodeObj) {
            objDescriptor = {};

            objDescriptor.id = nodeObj.getId();
            objDescriptor.parentId = nodeObj.getParentId();


            pos = nodeObj.getRegistry(nodePropertyNames.Registry.position) || { "x": 100, "y": 100 };

            objDescriptor.position = { "x": pos.x, "y": pos.y};

            if (objDescriptor.position.hasOwnProperty("x")) {
                objDescriptor.position.x = this._getDefaultValueForNumber(objDescriptor.position.x, 0);
            } else {
                objDescriptor.position.x = 0;
            }

            if (objDescriptor.position.hasOwnProperty("y")) {
                objDescriptor.position.y = this._getDefaultValueForNumber(objDescriptor.position.y, 0);
            } else {
                objDescriptor.position.y = 0;
            }

            objDescriptor.decorator = "DefaultDecorator";
        }

        return objDescriptor;
    };

    MetaDesignerControl.prototype._dispatchEvents = function (events) {
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
        this.processNextInQueue();
    };

        // PUBLIC METHODS
    MetaDesignerControl.prototype._onLoad = function (gmeID, objD) {
        var obj,
            objDesc,
            setMemberIds,
            decClass,
            i,
            uiComponent,
            sets = [SET_VALIDINHERITOR, SET_VALIDCHILDREN, SET_VALIDDESTINATION, SET_VALIDSOURCE, SET_GENERAL],
            setlen = sets.length;

        //component loaded
        //we are interested in the load of subcomponents of the opened component
        if (this.currentNodeInfo.id !== gmeID) {
            if (objD && this.currentNodeInfo.id === objD.parentId) {

                objDesc = _.extend({}, objD);

                if (this.firstRun === false) {
                    var nodeObj = this._client.getNode(gmeID);

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
                                    objDesc.dstObjId = this._GmeID2ComponentID[setMemberIds[i]][0];
                                    objDesc.dstSubCompId = undefined;
                                    obj = this.designerCanvas.createConnection(objDesc);

                                    this._setRelations[obj.id] = { "owner": gmeID,
                                                                   "member": setMemberIds[i],
                                                                   "set": sets[setlen] };
                                }
                            }
                        }
                    }
                } else {
                    this._GmeID2ComponentID[gmeID] = [];
                    this._GMEModels.push(gmeID);

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

    MetaDesignerControl.prototype._setMetaConnectionType = function (mode) {
        var params = {},
            metaInfo = {};

        if (this._connectionType !== mode) {
            metaInfo = {"type": mode };
            this.designerCanvas.connectionDrawingManager.setMetaInfo(metaInfo);

            params = this._getModeVisualDescriptor(mode);

            this.designerCanvas.connectionDrawingManager.setConnectionInDrawProperties(params);
        }
    };

    MetaDesignerControl.prototype._getModeVisualDescriptor = function (mode) {
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

    return MetaDesignerControl;
});