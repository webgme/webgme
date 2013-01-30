"use strict";

define(['logManager',
    'raphaeljs'], function (logManager) {

    var ConnectionComponent,
        DESIGNER_CONNECTION_CLASS = "designer-connection",
        PATH_SHADOW_ID_PREFIX = "p_",
        MIN_WIDTH_NOT_TO_NEED_SHADOW = 5,
        CONNECTION_DRAGGABLE_END_CLASS = "connectionDraggableEnd";

    ConnectionComponent = function (objId) {
        this.id = objId;

        this.logger = logManager.create("Connection_" + this.id);
        this.logger.debug("Created");

    };

    ConnectionComponent.prototype._DOMBase = $('<div/>').attr({ "class": "connection" });

    ConnectionComponent.prototype._initialize = function (objDescriptor) {
        /*MODELEDITORCONNECTION CONSTANTS*/
        this.canvas = objDescriptor.designerCanvas;
        this.paper = this.canvas.skinParts.SVGPaper;

        this.skinParts = {};

        this.reconnectable = false;

        this.selected = false;
        this.selectedInMultiSelection = false;

        this.designerAttributes = {};
        
        /*MODELEDITORCONNECTION CONSTANTS*/

        //read props coming from the DataBase or DiagramDesigner
        this._initializeConnectionProps(objDescriptor);
    };

    ConnectionComponent.prototype._initializeConnectionProps = function (objDescriptor) {
        this.segmentPoints = objDescriptor.segmentPoints ? objDescriptor.segmentPoints.slice(0) : [];
        this.reconnectable = objDescriptor.reconnectable === true ? true : false;

        /*PathAttributes*/
        this.designerAttributes.arrowStart = objDescriptor.arrowStart || "none";
        this.designerAttributes.arrowEnd = objDescriptor.arrowEnd || "none";
        this.designerAttributes.color = objDescriptor.color || "#000000";
        this.designerAttributes.width = objDescriptor.width || 2;
        this.designerAttributes.shadowWidth = parseInt(this.designerAttributes.width, 10) + 3;
        this.designerAttributes.shadowOpacity = 0;
        this.designerAttributes.shadowOpacityWhenSelected = 0.4;
        this.designerAttributes.shadowColor = objDescriptor.shadowColor || "#52A8EC";
        this.designerAttributes.lineType = objDescriptor.lineType || "L";
    };

    ConnectionComponent.prototype.getConnectionProps = function () {
        var objDescriptor = {};

        objDescriptor.reconnectable = this.reconnectable;

        /*PathAttributes*/
        objDescriptor.arrowStart = this.designerAttributes.arrowStart;
        objDescriptor.arrowEnd = this.designerAttributes.arrowEnd;
        objDescriptor.color = this.designerAttributes.color;
        objDescriptor.width = this.designerAttributes.width;
        objDescriptor.shadowColor = this.designerAttributes.shadowColor;
        objDescriptor.lineType = this.designerAttributes.lineType;

        return objDescriptor;
    };

    ConnectionComponent.prototype.setConnectionRenderData = function (segPoints) {
        var i = 0,
            len,
            pathDef = [],
            p,
            points = [],
            validPath = segPoints && segPoints.length > 1;

        if (validPath) {
            //there is a points list given and has at least 2 points
            //remove the null points from the list (if any)
            i = len = segPoints.length;
            len--;
            while (i--) {
                if (segPoints[len - i]) {
                    points.push(segPoints[len - i]);
                }
            }
        }

        this.startCoordinates = { "x": -1,
                                  "y": -1};

        this.endCoordinates = { "x": -1,
                                "y": -1};

        i = len = points.length;
        validPath = len > 1;

        if (validPath) {
            //there is at least 2 points given, good to draw

            p = points[0];
            pathDef.push("M" + p.x + "," + p.y);

            //store source coordinate
            this.sourceCoordinates = { "x":p.x,
                                        "y":p.y };

            //fix the counter to start from the second point in the list
            len--;
            i--;
            while (i--) {
                p = points[len - i];
                pathDef.push("L" + p.x + "," + p.y);
            }

            //save endpoint coordinates
            this.endCoordinates = { "x": p.x,
                                    "y": p.y };

            pathDef = pathDef.join(" ");

            //check if the prev pathDef is the same as the new
            //this way the redraw does not need to happen
            if (this.pathDef !== pathDef) {
                this.pathDef = pathDef;

                if (this.skinParts.path) {
                    this.logger.debug("Redrawing connection with ID: '" + this.id + "'");
                    this.skinParts.path.attr({ "path": pathDef});
                    if (this.skinParts.pathShadow) {
                        this.skinParts.pathShadow.attr({ "path": pathDef});
                    }
                } else {
                    this.logger.debug("Drawing connection with ID: '" + this.id + "'");
                    /*CREATE PATH*/
                    this.skinParts.path = this.paper.path(pathDef);
                    $(this.skinParts.path.node).attr({"id": this.id,
                                                      "class": DESIGNER_CONNECTION_CLASS});

                    this.skinParts.path.attr({ "arrow-start": this.designerAttributes.arrowStart,
                        "arrow-end": this.designerAttributes.arrowEnd,
                        "stroke": this.designerAttributes.color,
                        "stroke-width": this.designerAttributes.width});

                    if (this.designerAttributes.width < MIN_WIDTH_NOT_TO_NEED_SHADOW) {
                        this._createPathShadow(pathDef);
                    }
                }
            }

        } else {
            this.pathDef = null;
            this._removePath();
            this._removePathShadow();
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

        //when te line is vertical or horizontal, its dimension information needs to be tweaked
        //otherwise height or width will be 0, no good for selection matching
        if (bBox.height === 0 && bBox.width !== 0) {
            bBox.height = 1;
            bBox.y2 += 1;
        } else if (bBox.height !== 0 && bBox.width === 0) {
            bBox.width = 1;
            bBox.x2 += 1;
        }

        return bBox;
    };

    ConnectionComponent.prototype.destroy = function () {
        this._destroying = true;

        this.hideConnectors();

        //remove from DOM
        this._removePath();
        this._removePathShadow();

        this.logger.debug("Destroyed");
    };

    /************** HANDLING SELECTION EVENT *********************/

    ConnectionComponent.prototype.onSelect = function (multiSelection) {
        this.selected = true;
        this.selectedInMultiSelection = multiSelection;

        this._highlightPath();

        //in edit mode and when not participating in a multiple selection,
        //show endpoint connectors
        if (this.selectedInMultiSelection === true) {
            this.hideConnectors();
        } else {
            //in edit mode and when not participating in a multiple selection,
            //show connectors
            if (this.canvas.mode === this.canvas.OPERATING_MODES.NORMAL) {
                this.showConnectors();
            }
        }


    };

    ConnectionComponent.prototype.onDeselect = function () {
        this.selected = false;
        this.selectedInMultiSelection = false;

        this._unHighlightPath();
        this.hideConnectors();
    };

    ConnectionComponent.prototype._highlightPath = function () {
        this._createPathShadow(this.pathDef);

        this.skinParts.pathShadow.attr({"opacity": this.designerAttributes.shadowOpacityWhenSelected});
    };

    ConnectionComponent.prototype._unHighlightPath = function () {
        if (this.designerAttributes.width < MIN_WIDTH_NOT_TO_NEED_SHADOW) {
            this.skinParts.pathShadow.attr({"opacity": this.designerAttributes.shadowOpacity});
        } else {
            this._removePathShadow();
        }
    };

    ConnectionComponent.prototype._createPathShadow = function (pathDef) {
        /*CREATE SHADOW IF NEEDED*/
        if (this.skinParts.pathShadow === undefined || this.skinParts.pathShadow === null) {
            this.skinParts.pathShadow = this.skinParts.pathShadow || this.paper.path(pathDef);
            /*$(this.skinParts.pathShadow.node).attr("id", /*PATH_SHADOW_ID_PREFIX + this.id);*/

            $(this.skinParts.pathShadow.node).attr({"id": PATH_SHADOW_ID_PREFIX + this.id,
                "class": DESIGNER_CONNECTION_CLASS});

            this.skinParts.pathShadow.attr({    "stroke": this.designerAttributes.shadowColor,
                "stroke-width": this.designerAttributes.shadowWidth,
                "opacity": this.designerAttributes.shadowOpacity,
                "arrow-start": this.designerAttributes.arrowStart,
                "arrow-end": this.designerAttributes.arrowEnd});
        }
    };

    ConnectionComponent.prototype._removePath = function () {
        if (this.skinParts.path) {
            this.skinParts.path.remove();
            this.skinParts.path = null;
        }
    };

    ConnectionComponent.prototype._removePathShadow = function () {
        if (this.skinParts.pathShadow) {
            this.skinParts.pathShadow.remove();
            this.skinParts.pathShadow = null;
        }
    };

    ConnectionComponent.prototype.showConnectors = function () {
        if (this.reconnectable) {
            //editor handle at src
            this.skinParts.srcDragPoint = this.skinParts.srcDragPoint || $('<div/>', {
                "id": "srcDragPoint_" + this.id,
                "class": CONNECTION_DRAGGABLE_END_CLASS
            });

            this.skinParts.srcDragPoint.css({"position": "absolute",
                                             "top": this.sourceCoordinates.y,
                                             "left": this.sourceCoordinates.x});

            this.canvas.skinParts.$itemsContainer.append(this.skinParts.srcDragPoint);

            /*opts = { "el": this._skinParts.srcDragPoint,
                "connId": this._guid,
                "endType": "source"};*/

            this.skinParts.dstDragPoint = this.skinParts.dstDragPoint || $('<div/>', {
                "id": "dstDragPoint_" + this.id,
                "class": CONNECTION_DRAGGABLE_END_CLASS
            });

            this.skinParts.dstDragPoint.css({"position": "absolute",
                "top": this.endCoordinates.y,
                "left": this.endCoordinates.x});

            this.canvas.skinParts.$itemsContainer.append(this.skinParts.dstDragPoint);

            var srcParams = { "el": this.skinParts.srcDragPoint,
                              "coord": this.sourceCoordinates };

            var dstParams = { "el": this.skinParts.dstDragPoint,
                "coord": this.endCoordinates };

            var connParams = { "id": this.id,
                "props": this.getConnectionProps() };

            this.canvas.connectionDrawingManager._attachConnectionDraggableEndHandler(srcParams, dstParams, connParams);
        }
    };

    ConnectionComponent.prototype.hideConnectors = function () {
        if (this.skinParts.srcDragPoint) {
            this.skinParts.srcDragPoint.remove();
            this.skinParts.srcDragPoint = null;
        }

        if (this.skinParts.dstDragPoint) {
            this.skinParts.dstDragPoint.remove();
            this.skinParts.dstDragPoint = null;
        }
    };

    /************** END OF - HANDLING SELECTION EVENT *********************/

    return ConnectionComponent;
});