"use strict";

define(['logManager',
    'clientUtil',
    'js/DiagramDesigner/DesignerControl',
    'js/DiagramDesigner/MetaDesignerControl.DEBUG'], function (logManager,
                                                     clientUtil,
                                                     DesignerControl,
                                                     MetaDesignerControlDEBUG) {

    var MetaDesignerControl,
        __parent__ = DesignerControl,
        __parent_proto__ = DesignerControl.prototype,
        CONTAINMENT_TYPE_LINE_END = "diamond-wide-long",
        INHERITANCE_TYPE_LINE_END = "block-wide-long",
        CONTAINMENT_TYPE = "CONTAINMENT",
        INHERITANCE_TYPE = "INHERITANCE";


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
                type = params.metaInfo.type;

            //connDesc.type has special meaning: inheritance, containment, etc
            if (type === INHERITANCE_TYPE) {
                setName = 'ValidInheritor';
            } else if (type === CONTAINMENT_TYPE) {
                setName = 'ValidChildren';
            }
            if (setName !== "") {
                self._client.addMember(self.componentsMapRev[params.src], self.componentsMapRev[params.dst], setName);
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
            this._addMetaDebugModeExtensions();
        }

        this.logger.debug("MetaDesignerControl ctor");
    };

    _.extend(MetaDesignerControl.prototype, __parent_proto__);
    //in DEBUG mode add additional extensions
    if (DEBUG) {
        _.extend(MetaDesignerControl.prototype, MetaDesignerControlDEBUG.prototype);
    }

    /************** OVERRIDE ************************/
        // PUBLIC METHODS
    MetaDesignerControl.prototype._onLoad = function (objectId, objD) {
        var obj,
            srcId, dstId,
            i, j,GMESrcId, GMEDstId,
            objDesc,
            handled = false;

        //component loaded
        //we are interested in the load of subcomponents of the opened component
        if (this.currentNodeInfo.id !== objectId) {
            if (objD) {

                objDesc = _.extend({}, objD);
                this.componentsMap[objectId] = {};

                if (objDesc.kind === "CONNECTION") {
                    //since all the items are presented double
                    //1 onnection between 2 boxes will really be
                    //4 connections:
                    // orig1 -> orig2
                    // orig1 -> copy2
                    // copy1 -> orig2
                    // copy1 -> copy2

                    if (objDesc.type === CONTAINMENT_TYPE || objDesc.type === INHERITANCE_TYPE) {
                        GMESrcId = objDesc.source;
                        GMEDstId = objDesc.target;

                        switch (objDesc.type) {
                            case CONTAINMENT_TYPE:
                                objDesc.arrowStart = CONTAINMENT_TYPE_LINE_END;
                                objDesc.width = 5;
                                objDesc.color = "#FF0000";
                                break;
                            case INHERITANCE_TYPE:
                                objDesc.arrowStart = INHERITANCE_TYPE_LINE_END;
                                objDesc.width = 3;
                                objDesc.color = "#0000FF";
                                break;
                        }

                        // orig1 -> orig2
                        for (i in this.componentsMap[GMESrcId]) {
                            srcId = i;
                            for (j in this.componentsMap[GMEDstId]) {
                                dstId = j;

                                objDesc.source = i;
                                objDesc.target = j;
                                obj = this.designerCanvas.createConnection(objDesc);
                                this.componentsMap[objectId][obj.id] = obj;
                                this.componentsMapRev[obj.id] = objectId;
                            }
                        }

                        //mark as handled
                        handled = true;
                    }
                }
            }
        }

        if (!handled) {
            __parent_proto__._onLoad.apply(this, arguments);
        }
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