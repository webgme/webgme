"use strict";

define(['logManager',
    'raphaeljs'], function (logManager) {

    var ConnectionComponent,
        DESIGNER_CONNECTION_CLASS = "designer-connection",
        PATH_SHADOW_ID_PREFIX = "p_",
        MIN_WIDTH_NOT_TO_NEED_SHADOW = 5,
        CONNECTION_DRAGGABLE_END_CLASS = "connectionDraggableEnd",
        CONNECTION_DEFAULT_WIDTH = 2,
        CONNECTION_DEFAULT_COLOR = "#000000",
        CONNECTION_DEFAULT_END = "none",
        CONNECTION_SHADOW_DEFAULT_OPACITY = 0,
        CONNECTION_SHADOW_DEFAULT_WIDTH = 3,
        CONNECTION_SHADOW_DEFAULT_OPACITY_WHEN_SELECTED = 0.4,
        CONNECTION_SHADOW_DEFAULT_COLOR = "#52A8EC",
        CONNECTION_DEFAULT_LINE_TYPE = "L";

    ConnectionComponent = function (objId) {
        this.id = objId;

        this.logger = logManager.create("Connection_" + this.id);
        this.logger.debug("Created");

    };

    ConnectionComponent.prototype._DOMBase = $('<div/>').attr({ "class": "connection" });

    ConnectionComponent.prototype._initialize = function (objDescriptor) {
        /*MODELEDITORCONNECTION CONSTANTS***/
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
        this.designerAttributes.arrowStart = objDescriptor.arrowStart || CONNECTION_DEFAULT_END;
        this.designerAttributes.arrowEnd = objDescriptor.arrowEnd || CONNECTION_DEFAULT_END;
        this.designerAttributes.color = objDescriptor.color || CONNECTION_DEFAULT_COLOR;
        this.designerAttributes.width = objDescriptor.width || CONNECTION_DEFAULT_WIDTH;
        this.designerAttributes.shadowWidth = parseInt(this.designerAttributes.width, 10) + CONNECTION_SHADOW_DEFAULT_WIDTH;
        this.designerAttributes.shadowOpacity = CONNECTION_SHADOW_DEFAULT_OPACITY;
        this.designerAttributes.shadowOpacityWhenSelected = CONNECTION_SHADOW_DEFAULT_OPACITY_WHEN_SELECTED;
        this.designerAttributes.shadowColor = objDescriptor.shadowColor || CONNECTION_SHADOW_DEFAULT_COLOR;
        this.designerAttributes.lineType = objDescriptor.lineType || CONNECTION_DEFAULT_LINE_TYPE;

        this.designerAttributes.shadowArrowStartAdjust = this._raphaelArrowAdjustForSizeToRefSize(this.designerAttributes.arrowStart, this.designerAttributes.shadowWidth, this.designerAttributes.width, false);
        this.designerAttributes.shadowArrowEndAdjust = this._raphaelArrowAdjustForSizeToRefSize(this.designerAttributes.arrowEnd, this.designerAttributes.shadowWidth, this.designerAttributes.width, true);
    };

    ConnectionComponent.prototype._raphaelArrowAdjustForSizeToRefSize = function (arrowType, size, refSize, isEnd) {
        var raphaelMarkerW = 3, //original RaphaelJS source settings
            raphaelMarkerH = 3,
            refX,
            values = arrowType.toLowerCase().split("-"),
            type = "classic",
            i = values.length;

        while (i--) {
            switch (values[i]) {
                case "block":
                case "classic":
                case "oval":
                case "diamond":
                case "open":
                case "none":
                    type = values[i];
                    break;
                case "wide": raphaelMarkerH = 5; break;
                case "narrow": raphaelMarkerH = 2; break;
                case "long": raphaelMarkerW = 5; break;
                case "short": raphaelMarkerW = 2; break;
            }
        }

        if (type === "none") {
            return 0;
        }

        //if there is correction in RaphaelJS source, it is not needed
        /*if (type === "diamond" || type === "oval") {
         return 0;
         }*/

        if (type == "open") {
            raphaelMarkerW += 2;
            raphaelMarkerH += 2;
            refX = isEnd ? 4 : 1;
        } else {
            refX = raphaelMarkerW / 2;
        }

        return refX * (size - refSize);
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

            this._pathPoints = points;

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
                        this._updatePathShadow(this._pathPoints);
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
                        this._createPathShadow(this._pathPoints);
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
        var bBox,
            strokeWidthAdjust;

        //NOTE: getBBox will give back the bounding box of the original path without stroke-width and marker-ending information included
        if (this.skinParts.pathShadow) {
            bBox = this.skinParts.pathShadow.getBBox();
            strokeWidthAdjust = this.designerAttributes.shadowWidth;
        } else if (this.skinParts.path) {
            bBox = this.skinParts.path.getBBox();
            strokeWidthAdjust = this.designerAttributes.width;
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
            bBox.height = strokeWidthAdjust;
            bBox.y -= strokeWidthAdjust / 2;
            bBox.y2 += strokeWidthAdjust / 2;
        } else if (bBox.height !== 0 && bBox.width === 0) {
            bBox.width = strokeWidthAdjust;
            bBox.x -= strokeWidthAdjust / 2;
            bBox.x2 += strokeWidthAdjust / 2;
        } else if (bBox.height !== 0 && bBox.width !== 0) {
            /*bBox.height += strokeWidthAdjust;
            bBox.width += strokeWidthAdjust;
            bBox.x -= strokeWidthAdjust / 2;
            bBox.x2 += strokeWidthAdjust / 2;
            bBox.y -= strokeWidthAdjust / 2;
            bBox.y2 += strokeWidthAdjust / 2;*/
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
        this._createPathShadow(this._pathPoints);

        this.skinParts.pathShadow.attr({"opacity": this.designerAttributes.shadowOpacityWhenSelected});
    };

    ConnectionComponent.prototype._unHighlightPath = function () {
        if (this.designerAttributes.width < MIN_WIDTH_NOT_TO_NEED_SHADOW) {
            this.skinParts.pathShadow.attr({"opacity": this.designerAttributes.shadowOpacity});
        } else {
            this._removePathShadow();
        }
    };

    ConnectionComponent.prototype._createPathShadow = function (segPoints) {
        /*CREATE SHADOW IF NEEDED*/
        if (this.skinParts.pathShadow === undefined || this.skinParts.pathShadow === null) {
            this.skinParts.pathShadow = this.skinParts.pathShadow || this.paper.path("M0,0 L1,1");

            this._updatePathShadow(segPoints);

            $(this.skinParts.pathShadow.node).attr({"id": PATH_SHADOW_ID_PREFIX + this.id,
                "class": DESIGNER_CONNECTION_CLASS});

            this.skinParts.pathShadow.attr({    "stroke": this.designerAttributes.shadowColor,
                "stroke-width": this.designerAttributes.shadowWidth,
                "opacity": this.designerAttributes.shadowOpacity,
                "arrow-start": this.designerAttributes.arrowStart,
                "arrow-end": this.designerAttributes.arrowEnd,
                "arrow-dx-stroke-width-fix": this.designerAttributes.width });
        }
    };

    ConnectionComponent.prototype._updatePathShadow = function (segPoints) {
        var points = [],
            i,
            len,
            p,
            pathDef = [],
            dx,
            dy,
            dX,
            dY,
            dZ;

        //copy over coordinates to prevent them from overwriting
        len = segPoints.length;
        for (i = 0; i < len; i += 1) {
            points.push({"x": segPoints[i].x, "y": segPoints[i].y});
        }

        if (this.designerAttributes.arrowStart !== CONNECTION_DEFAULT_END) {
            dX = points[1].x - points[0].x;
            dY = points[1].y - points[0].y;
            dZ = Math.sqrt(dX * dX + dY * dY);

            dx = this.designerAttributes.shadowArrowStartAdjust * dX / dZ;
            dy = this.designerAttributes.shadowArrowStartAdjust * dY / dZ;

            points[0].x -= dx;
            points[0].y -= dy;
        }

        if (this.designerAttributes.arrowEnd !== CONNECTION_DEFAULT_END) {
            len = points.length;

            dX = points[len - 1].x - points[len - 2].x;
            dY = points[len - 1].y - points[len - 2].y;
            dZ = Math.sqrt(dX * dX + dY * dY);

            dx = this.designerAttributes.shadowArrowEndAdjust * dX / dZ;
            dy = this.designerAttributes.shadowArrowEndAdjust * dY / dZ;

            points[len - 1].x += dx;
            points[len - 1].y += dy;
        }

        i = len = points.length;

        p = points[0];
        pathDef.push("M" + p.x + "," + p.y);

        //fix the counter to start from the second point in the list
        len--;
        i--;
        while (i--) {
            p = points[len - i];
            pathDef.push("L" + p.x + "," + p.y);
        }

        pathDef = pathDef.join(" ");

        this.skinParts.pathShadow.attr({ "path": pathDef});
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

    ConnectionComponent.prototype.readOnlyMode = function (readOnly) {
        if (readOnly === true) {
            this.hideConnectors();
        }
    };

    return ConnectionComponent;
});