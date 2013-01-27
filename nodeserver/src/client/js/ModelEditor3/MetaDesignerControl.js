"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'js/ModelEditor3/DesignerControl',
    'js/DiagramDesigner/NodePropertyNames',
    'js/ModelEditor3/MetaDesignerControl.DEBUG'], function (logManager,
                                                     clientUtil,
                                                     commonUtil,
                                                     DesignerControl,
                                                     nodePropertyNames,
                                                     MetaDesignerControlDEBUG) {

    var MetaDesignerControl,
        __parent__ = DesignerControl,
        __parent_proto__ = DesignerControl.prototype,
        CONTAINMENT_TYPE_LINE_END = "diamond-wide-long",
        INHERITANCE_TYPE_LINE_END = "block-wide-long",
        CONTAINMENT_TYPE = "CONTAINMENT",
        INHERITANCE_TYPE = "INHERITANCE",
        LOAD_EVENT_NAME = "load";


    MetaDesignerControl = function (options) {
        var self = this,
            $btnGroupConnectionType;

        options.loggerName = options.loggerName || "MetaDesignerControl";

        //execute parent's constructor
        __parent__.apply(this, [options]);

        //override parent's event handlers
        this.designerCanvas.onSelectionDelete = function (idList) {
            self.logger.warning("MetaDesignerControl.onSelectionDelete NOT YET IMPLEMENTED: " + idList);
        };

        this.designerCanvas.onCreateNewConnection = function (params) {
            var setName = "",
                type = params.metaInfo.type,
                sourceId = self._ComponentID2GmeID[params.src],
                targetId = self._ComponentID2GmeID[params.dst];

            //connDesc.type has special meaning: inheritance, containment, etc
            if (type === INHERITANCE_TYPE) {
                setName = 'ValidInheritor';
            } else if (type === CONTAINMENT_TYPE) {
                setName = 'ValidChildren';
            }
            if (setName !== "") {
                self._client.addMember(sourceId, targetId, setName);
            }
        };

        this._setMetaConnectionType(CONTAINMENT_TYPE);

        //add extra visual piece
        $btnGroupConnectionType = this.designerCanvas.addRadioButtonGroup(function (event, data) {
            self._setMetaConnectionType(data.mode);
        });

        this.designerCanvas.addButton({ "title": "Containment",
            "icon": "icon-meta-containment",
            "selected": true,
            "data": { "mode": CONTAINMENT_TYPE }}, $btnGroupConnectionType );

        this.designerCanvas.addButton({ "title": "Inheritance",
            "icon": "icon-meta-inheritance",
            "data": { "mode": INHERITANCE_TYPE }}, $btnGroupConnectionType );

        //in DEBUG mode add additional content to canvas
        if (DEBUG) {
            //this._addMetaDebugModeExtensions();
        }

        this.logger.debug("MetaDesignerControl ctor");
    };

    _.extend(MetaDesignerControl.prototype, __parent_proto__);
    //in DEBUG mode add additional extensions
    if (DEBUG) {
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
            srcId, dstId,
            i, j,GMESrcId, GMEDstId,
            objDesc,
            handled = false,
            setMemberIds,
            len,
            decClass,
            uiComponent;

        //component loaded
        //we are interested in the load of subcomponents of the opened component
        if (this.currentNodeInfo.id !== gmeID) {
            if (objD) {

                objDesc = _.extend({}, objD);

                if (this.firstRun === false) {
                    var nodeObj = this._client.getNode(gmeID);
                    setMemberIds = nodeObj.getMemberIds('ValidInheritor');
                    if (setMemberIds) {

                        objDesc = {};


                        objDesc.srcObjId = this._GmeID2ComponentID[gmeID][0];
                        objDesc.srcSubCompId = undefined;

                        objDesc.arrowStart = INHERITANCE_TYPE_LINE_END;
                        objDesc.width = 3;
                        objDesc.color = "#0000FF";

                        i = setMemberIds.length;
                        while (i--) {
                            if (this._GmeID2ComponentID.hasOwnProperty(setMemberIds[i]) &&
                                this._GmeID2ComponentID[setMemberIds[i]].length > 0) {
                                objDesc.dstObjId = this._GmeID2ComponentID[setMemberIds[i]][0];
                                objDesc.dstSubCompId = undefined;
                                obj = this.designerCanvas.createConnection(objDesc);
                            }
                        }
                    }

                    setMemberIds = nodeObj.getMemberIds('ValidChildren');
                    if (setMemberIds) {

                        objDesc = {};


                        objDesc.arrowStart = CONTAINMENT_TYPE_LINE_END;
                        objDesc.width = 5;
                        objDesc.color = "#FF0000";
                        objDesc.srcObjId = this._GmeID2ComponentID[gmeID][0];
                        objDesc.srcSubCompId = undefined;

                        i = setMemberIds.length;
                        while (i--) {
                            if (this._GmeID2ComponentID.hasOwnProperty(setMemberIds[i]) &&
                                this._GmeID2ComponentID[setMemberIds[i]].length > 0) {
                                objDesc.dstObjId = this._GmeID2ComponentID[setMemberIds[i]][0];
                                objDesc.dstSubCompId = undefined;
                                uiComponent = this.designerCanvas.createConnection(objDesc);

                                this._GmeID2ComponentID[gmeID].push(uiComponent.id);
                                this._ComponentID2GmeID[uiComponent.id] = gmeID;
                            }
                        }
                    }
                } else {
                    this._GmeID2ComponentID[gmeID] = [];
                    this._GMEModels.push(gmeID);

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

/*        if (!handled) {
            __parent_proto__._onLoad.apply(this, arguments);
        }*/
    };

    MetaDesignerControl.prototype._setMetaConnectionType = function (mode) {
        var params = {},
            metaInfo = {};

        if (this._connectionType !== mode) {
            metaInfo = {"type": mode };
            this.designerCanvas.connectionDrawingManager.setMetaInfo(metaInfo);

            switch (mode) {
                case CONTAINMENT_TYPE:
                    params.arrowStart = CONTAINMENT_TYPE_LINE_END;
                    params.width = "5";
                    params.color = "#FF0000";
                    break;
                case INHERITANCE_TYPE:
                    params.arrowStart = INHERITANCE_TYPE_LINE_END;
                    params.width = "3";
                    params.color = "#0000FF";
                    break;
                default:
                    params.arrowStart = "none";
                    params.width = "2";
                    params.color = "#000000";
                    break;
            }
            this.designerCanvas.connectionDrawingManager.setConnectionInDrawProperties(params);
        }
    };

    return MetaDesignerControl;
});