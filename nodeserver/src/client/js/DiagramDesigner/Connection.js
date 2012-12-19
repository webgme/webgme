"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'bezierHelper',
    'raphaeljs'], function (logManager,
                                                      util,
                                                      commonUtil,
                                                      bezierHelper) {

    var ConnectionComponent,
        PATH_SHADOW_ID_PREFIX = "p_";

    ConnectionComponent = function (objId) {
        this.id = objId;

        this.logger = logManager.create("Connection_" + this.id);
        this.logger.debug("Created");

    };

    ConnectionComponent.prototype._DOMBase = $('<div/>').attr({ "class": "connection" });

    ConnectionComponent.prototype._initialize = function (objDescriptor) {
        var self = this;

        /*MODELEDITORCONNECTION CONSTANTS*/
        this.canvas = objDescriptor.designerCanvas;
        this.paper = this.canvas.skinParts.SVGPaper;

        this.sourceCoordinate = null;
        this.targetCoordinate = null;

        this.skinParts = {};

        this.designerAttributes = {};
        
        /*MODELEDITORCONNECTION CONSTANTS*/

        //read props coming from the DataBase or DiagramDesigner
        this._initializeConnectionProps(objDescriptor);
    };

    ConnectionComponent.prototype._initializeConnectionProps = function (objDescriptor) {
        var i,
            segmentPointList;

        this.name = objDescriptor.name || "";
        this.segmentPoints = objDescriptor.segmentPoints ? objDescriptor.segmentPoints.slice(0) : [];

        /*PathAttributes*/
        this.designerAttributes.arrowStart = objDescriptor.arrowStart || "none";
        this.designerAttributes.arrowEnd = objDescriptor.arrowEnd || "none";
        this.designerAttributes.color = objDescriptor.color || "#000000";
        this.designerAttributes.width = objDescriptor.width || "2";
        this.designerAttributes.shadowWidth = objDescriptor.shadowWidth || "5";
        this.designerAttributes.shadowOpacity = 0;
        this.designerAttributes.shadowOpacityWhenSelected = 0.4;
        this.designerAttributes.shadowColor = objDescriptor.shadowColor || "#52A8EC";
        this.designerAttributes.lineType = objDescriptor.lineType || "L";
    };

    ConnectionComponent.prototype.setConnectionRenderData = function (points) {
        var i = 0,
            len = points.length,
            pathDef = [],
            p;

        p = points[0];
        pathDef.push("M" + p.x + "," + p.y);

        for (i = 1; i < len; i++) {
            p = points[i];
            pathDef.push("L" + p.x + "," + p.y);
        }

        pathDef = pathDef.join(" ");

        //check if the prev pathDef is the same as the new
        //this way the redraw does not need to happen
        if (this.pathDef !== pathDef) {
            if (this.skinParts.path) {
                this.logger.debug("Redrawing connection with ID: '" + this.id + "'");
                this.skinParts.path.attr({ "path": pathDef});
                //this.skinParts.pathShadow.attr({ "path": pathDef});
            } else {
                this.logger.debug("Drawing connection with ID: '" + this.id + "'");
                /*CREATE PATH*/
                this.skinParts.path = this.paper.path(pathDef);
                $(this.skinParts.path.node).attr("id", this.id);

                this.skinParts.path.attr({ "arrow-start": this.designerAttributes.arrowStart,
                    "arrow-end": this.designerAttributes.arrowEnd,
                    "stroke": this.designerAttributes.color,
                    "stroke-width": this.designerAttributes.width});

                /*CREATE SHADOW IF NEEDED*/
                /*this.skinParts.pathShadow = this.paper.path(pathDef);
                $(this.skinParts.pathShadow.node).attr("id", PATH_SHADOW_ID_PREFIX + this.id);

                this.skinParts.pathShadow.attr({    "stroke": this.designerAttributes.shadowColor,
                    "fill": "none",
                    "stroke-width": this.designerAttributes.shadowWidth,
                    "opacity": this.designerAttributes.shadowOpacity});*/
            }

            this.pathDef = pathDef;
        }
    };

    ConnectionComponent.prototype.getBoundingBox = function () {
        var bBox;

        if (this.skinParts.path) {
            bBox = this.skinParts.path.getBBox();
        } else {
            bBox = { "x": 0,
                "y": 0,
                "x2": 0,
                "y2": 0,
                "width": 0,
                "height": 0 };
        }

        return bBox;
    };

    ConnectionComponent.prototype.destroy = function () {
        this._destroying = true;

        //remove from DOM
        if (this.skinParts.path) {
            this.skinParts.path.remove();
            this.skinParts.path = null;
        }

        if (this.skinParts.pathShadow) {
            this.skinParts.pathShadow.remove();
            this.skinParts.pathShadow = null;
        }

        this.logger.debug("Destroyed");
    };

    return ConnectionComponent;
});