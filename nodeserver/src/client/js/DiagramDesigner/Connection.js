"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'bezierHelper',
    'raphaeljs'], function (logManager,
                                                      util,
                                                      commonUtil,
                                                      bezierHelper) {

    var ConnectionComponent;

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
        this.designerAttributes.shadowOpacity = objDescriptor.shadowOpacity || 0.001;
        this.designerAttributes.shadowOpacityWhenSelected = 0.4;
        this.designerAttributes.shadowColor = objDescriptor.shadowColor || "#52A8EC";
        this.designerAttributes.lineType = objDescriptor.lineType || "L";
    };

    ConnectionComponent.prototype.setConnectionRenderData = function (points) {
        var i = 0,
            len = points.length,
            path = [],
            p;

        p = points[0];
        path.push("M" + p.x + "," + p.y);

        for (i = 1; i < len; i++) {
            p = points[i];
            path.push("L" + p.x + "," + p.y);
        }

        path = path.join(" ");

        this.paper.path(path);
    };

    return ConnectionComponent;
});