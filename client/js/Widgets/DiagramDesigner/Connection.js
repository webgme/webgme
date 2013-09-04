/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */

"use strict";

define(['logManager',
    './DiagramDesignerWidget.Constants',
    './DiagramDesignerWidget.OperatingModes',
    './Connection.EditSegment',
    './Connection.SegmentPoint'], function (logManager,
                            DiagramDesignerWidgetConstants,
                            DiagramDesignerWidgetOperatingModes,
                            ConnectionEditSegment,
                            ConnectionSegmentPoint) {

    var Connection,
        PATH_SHADOW_ID_PREFIX = "p_",
        TEXT_ID_PREFIX = "t_",
        MIN_WIDTH_NOT_TO_NEED_SHADOW = 5,
        CONNECTION_DEFAULT_WIDTH = 2,
        CONNECTION_DEFAULT_COLOR = "#000000",
        CONNECTION_NO_END = "none",
        CONNECTION_DEFAULT_END = CONNECTION_NO_END,
        CONNECTION_SHADOW_DEFAULT_OPACITY = 0,
        CONNECTION_SHADOW_DEFAULT_WIDTH = 4,
        CONNECTION_SHADOW_DEFAULT_OPACITY_WHEN_SELECTED = 0.4,
        CONNECTION_SHADOW_DEFAULT_COLOR = "#52A8EC",
        CONNECTION_DEFAULT_LINE_TYPE = DiagramDesignerWidgetConstants.LINE_TYPES.NONE;

    Connection = function (objId) {
        this.id = objId;

        this.logger = logManager.create("Connection_" + this.id);
        this.logger.debug("Created");
    };

    Connection.prototype._initialize = function (objDescriptor) {
        /*MODELEDITORCONNECTION CONSTANTS***/
        this.diagramDesigner = objDescriptor.designerCanvas;
        this.paper = this.diagramDesigner.skinParts.SVGPaper;

        this.skinParts = {};

        this.reconnectable = false;

        this.selected = false;
        this.selectedInMultiSelection = false;

        this.designerAttributes = {};

        this._segmentPointMarkers = [];
        this._editMode = false;
        this._readOnly = false;
        this._connectionEditSegments = [];
        
        /*MODELEDITORCONNECTION CONSTANTS*/

        //read props coming from the DataBase or DiagramDesigner
        this._initializeConnectionProps(objDescriptor);
    };

    Connection.prototype._initializeConnectionProps = function (objDescriptor) {
        this.segmentPoints = objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS] ? objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS].slice(0) : [];
        this.reconnectable = objDescriptor.reconnectable === true;
        this.editable = !!objDescriptor.editable;

        /*PathAttributes*/
        this.designerAttributes.arrowStart = objDescriptor[DiagramDesignerWidgetConstants.LINE_START_ARROW] || CONNECTION_DEFAULT_END;
        this.designerAttributes.arrowEnd = objDescriptor[DiagramDesignerWidgetConstants.LINE_END_ARROW] || CONNECTION_DEFAULT_END;
        this.designerAttributes.color = objDescriptor[DiagramDesignerWidgetConstants.LINE_COLOR] || CONNECTION_DEFAULT_COLOR;
        this.designerAttributes.width = parseInt(objDescriptor[DiagramDesignerWidgetConstants.LINE_WIDTH], 10) || CONNECTION_DEFAULT_WIDTH;
        this.designerAttributes.shadowWidth = this.designerAttributes.width + CONNECTION_SHADOW_DEFAULT_WIDTH;
        this.designerAttributes.shadowOpacity = CONNECTION_SHADOW_DEFAULT_OPACITY;
        this.designerAttributes.shadowOpacityWhenSelected = CONNECTION_SHADOW_DEFAULT_OPACITY_WHEN_SELECTED;
        this.designerAttributes.shadowColor = CONNECTION_SHADOW_DEFAULT_COLOR;
        this.designerAttributes.lineType = objDescriptor[DiagramDesignerWidgetConstants.LINE_TYPE] || CONNECTION_DEFAULT_LINE_TYPE;

        this.designerAttributes.shadowArrowStartAdjust = this._raphaelArrowAdjustForSizeToRefSize(this.designerAttributes.arrowStart, this.designerAttributes.shadowWidth, this.designerAttributes.width, false);
        this.designerAttributes.shadowArrowEndAdjust = this._raphaelArrowAdjustForSizeToRefSize(this.designerAttributes.arrowEnd, this.designerAttributes.shadowWidth, this.designerAttributes.width, true);

        this.srcText = objDescriptor.srcText;
        this.dstText = objDescriptor.dstText;
        this.name = objDescriptor.name;
        this.nameEdit = objDescriptor.nameEdit || false;
        this.srcTextEdit = objDescriptor.srcTextEdit || false;
        this.dstTextEdit = objDescriptor.dstTextEdit || false;
    };

    Connection.prototype._raphaelArrowAdjustForSizeToRefSize = function (arrowType, size, refSize, isEnd) {
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

    Connection.prototype._raphaelArrowSizeToRefSize = function (arrowType, refSize, isEnd) {
        var raphaelMarkerW = 3, //original RaphaelJS source settings
            raphaelMarkerH = 3,
            values = arrowType.toLowerCase().split("-"),
            type = "classic",
            i = values.length,
            refX,
            refY;

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

        if (type == "open") {
            raphaelMarkerW += 2;
            raphaelMarkerH += 2;
            refX = raphaelMarkerW / 2;
        } else {
            refX = raphaelMarkerW / 2;
        }

        refY = raphaelMarkerH / 2;

        return { "w": refSize * raphaelMarkerW,
                 "h": refSize * raphaelMarkerH,
                 "refX": refX * refSize,
                 "refY": refY * refSize };
    };

    Connection.prototype.getConnectionProps = function () {
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

    Connection.prototype.setConnectionRenderData = function (segPoints) {
        var i = 0,
            len,
            pathDef = [],
            p,
            points = [],
            validPath = segPoints && segPoints.length > 1,
            self = this;

        //remove edit features
        this._removeEditModePath();

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

        this.sourceCoordinates = { "x": -1,
                                  "y": -1};

        this.endCoordinates = { "x": -1,
                                "y": -1};

        i = len = points.length;
        validPath = len > 1;

        if (validPath) {
            //there is at least 2 points given, good to draw

            this._pathPoints = points;

            //non-edit mode, one path builds the connection
            p = points[0];
            pathDef.push("M" + p.x + "," + p.y);

            //store source coordinate
            this.sourceCoordinates.x = p.x;
            this.sourceCoordinates.y = p.y;

            //fix the counter to start from the second point in the list
            len--;
            i--;
            while (i--) {
                p = points[len - i];
                pathDef.push("L" + p.x + "," + p.y);
            }

            //save endpoint coordinates
            this.endCoordinates.x = p.x;
            this.endCoordinates.y = p.y;

            pathDef = pathDef.join(" ");

            //check if the prev pathDef is the same as the new
            //this way the redraw does not need to happen
            if (this.pathDef !== pathDef) {
                this.pathDef = pathDef;

                //calculate the steep of the curve at the beginning/end of path
                this._calculatePathStartEndAngle();

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
                        "class": DiagramDesignerWidgetConstants.DESIGNER_CONNECTION_CLASS});

                    this.skinParts.path.attr({ "arrow-start": this.designerAttributes.arrowStart,
                        "arrow-end": this.designerAttributes.arrowEnd,
                        "stroke": this.designerAttributes.color,
                        "stroke-width": this.designerAttributes.width});

                    if (this.designerAttributes.width < MIN_WIDTH_NOT_TO_NEED_SHADOW) {
                        this._createPathShadow(this._pathPoints);
                    }
                }
            }

            //in edit mode add edit features
            if (this._editMode === true) {
                this._drawEditModePath(points);
                //show connection end dragpoints
                this.showEndReconnectors();
            }

            this._showConnectionAreaMarker();

            this._renderTexts();
        } else {
            this.pathDef = null;
            this._removePath();
            this._removePathShadow();
            this._hideConnectionAreaMarker();
            this._hideTexts();
        }
    };

    Connection.prototype.getBoundingBox = function () {
        var bBox,
            strokeWidthAdjust,
            dx,
            dy,
            shadowAdjust,
            endMarkerBBox,
            bBoxPath,
            bPoints,
            len;

        //NOTE: getBBox will give back the bounding box of the original path without stroke-width and marker-ending information included
        if (this.skinParts.pathShadow) {
            bBoxPath = this.skinParts.pathShadow.getBBox();
            strokeWidthAdjust = this.designerAttributes.shadowWidth;
            shadowAdjust = this.designerAttributes.shadowArrowEndAdjust;
        } else if (this.skinParts.path) {
            bBoxPath = this.skinParts.path.getBBox();
            strokeWidthAdjust = this.designerAttributes.width;
            shadowAdjust = 0;
        } else {
            bBoxPath = { "x": 0,
                "y": 0,
                "x2": 0,
                "y2": 0,
                "width": 0,
                "height": 0 };
        }

        //get a copy of bBoxPath
        //bBoxPath should not be touched because RaphaelJS reuses it unless the path is not redrawn
        bBox = { "x": bBoxPath.x,
            "y": bBoxPath.y,
            "x2": bBoxPath.x2,
            "y2": bBoxPath.y2,
            "width": bBoxPath.width,
            "height": bBoxPath.height };

        //calculate the marker-end size
        if (this.designerAttributes.arrowStart !== CONNECTION_NO_END) {
            bPoints = this._getRaphaelArrowEndBoundingPoints(this.designerAttributes.arrowStart, strokeWidthAdjust, this._pathStartAngle, false);

            dx = shadowAdjust * Math.cos(this._pathStartAngle);
            dy = shadowAdjust * Math.sin(this._pathStartAngle);

            endMarkerBBox = { "x": this.sourceCoordinates.x - dx,
                "y": this.sourceCoordinates.y - dy,
                "x2": this.sourceCoordinates.x - dx,
                "y2": this.sourceCoordinates.y - dy};


            len = bPoints.length;
            while (len--) {
                endMarkerBBox.x = Math.min(endMarkerBBox.x, this.sourceCoordinates.x - dx - bPoints[len].x);
                endMarkerBBox.y = Math.min(endMarkerBBox.y, this.sourceCoordinates.y - dy - bPoints[len].y);

                endMarkerBBox.x2 = Math.max(endMarkerBBox.x2, this.sourceCoordinates.x - dx - bPoints[len].x);
                endMarkerBBox.y2 = Math.max(endMarkerBBox.y2, this.sourceCoordinates.y - dy - bPoints[len].y);
            }
        }

        if (this.designerAttributes.arrowEnd !== CONNECTION_NO_END) {
            bPoints = this._getRaphaelArrowEndBoundingPoints(this.designerAttributes.arrowEnd, strokeWidthAdjust, this._pathEndAngle, true);

            dx = shadowAdjust * Math.cos(this._pathEndAngle) ;
            dy = shadowAdjust * Math.sin(this._pathEndAngle) ;

            endMarkerBBox = endMarkerBBox || { "x": this.endCoordinates.x + dx,
                             "y": this.endCoordinates.y + dy,
                             "x2": this.endCoordinates.x + dx,
                             "y2": this.endCoordinates.y + dy};


            len = bPoints.length;
            while (len--) {
                endMarkerBBox.x = Math.min(endMarkerBBox.x, this.endCoordinates.x + dx + bPoints[len].x);
                endMarkerBBox.y = Math.min(endMarkerBBox.y, this.endCoordinates.y + dy + bPoints[len].y);

                endMarkerBBox.x2 = Math.max(endMarkerBBox.x2, this.endCoordinates.x + dx + bPoints[len].x);
                endMarkerBBox.y2 = Math.max(endMarkerBBox.y2, this.endCoordinates.y + dy + bPoints[len].y);
            }
        }

        //when the line is vertical or horizontal, its dimension information needs to be tweaked
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
            //check if sourceCoordinates and endCoordinates are closer are
            // TopLeft - TopRight - BottomLeft - BottomRight
            if (Math.abs(bBox.x - this.sourceCoordinates.x) < Math.abs(bBox.x - this.endCoordinates.x)) {
                //source is on the left
                bBox.x -= Math.abs(Math.cos(Math.PI / 2 - this._pathStartAngle) * strokeWidthAdjust / 2);
                //target is on the right
                bBox.x2 +=  Math.abs(Math.cos(Math.PI / 2 - this._pathEndAngle) * strokeWidthAdjust / 2);
            } else {
                //target is on the left
                bBox.x -=Math.abs(Math.cos(Math.PI / 2 - this._pathEndAngle) * strokeWidthAdjust / 2);
                //source is on the right
                bBox.x2 += Math.abs(Math.cos(Math.PI / 2 - this._pathStartAngle) * strokeWidthAdjust / 2);
            }

            if (Math.abs(bBox.y - this.sourceCoordinates.y) < Math.abs(bBox.y - this.endCoordinates.y)) {
                //source is on the top
                bBox.y -= Math.abs(Math.sin(Math.PI / 2 - this._pathStartAngle) * strokeWidthAdjust / 2);
                //target is on the bottom
                bBox.y2 += Math.abs(Math.sin(Math.PI / 2 - this._pathEndAngle) * strokeWidthAdjust / 2);
            } else {
                //target is on the top
                bBox.y -= Math.abs(Math.sin(Math.PI / 2 - this._pathEndAngle) * strokeWidthAdjust / 2);
                //source is on the bottom
                bBox.y2 += Math.abs(Math.sin(Math.PI / 2 - this._pathStartAngle) * strokeWidthAdjust / 2);
            }

            bBox.width = bBox.x2 - bBox.x;
            bBox.height = bBox.y2 - bBox.y;
        }

        //figure out the outermost bounding box for the path itself and the endmarkers
        endMarkerBBox = endMarkerBBox || bBox;
        bBox.x = Math.min(bBox.x, endMarkerBBox.x);
        bBox.y = Math.min(bBox.y, endMarkerBBox.y);
        bBox.x2 = Math.max(bBox.x2, endMarkerBBox.x2);
        bBox.y2 = Math.max(bBox.y2, endMarkerBBox.y2);
        bBox.width = bBox.x2 - bBox.x;
        bBox.height = bBox.y2 - bBox.y;

        return bBox;
    };

    Connection.prototype._getRaphaelArrowEndBoundingPoints = function (arrowType, arrowSize, angle, isEnd) {
        var bPoints = [],
            arrowEndSize,
            w,
            gamma,
            topLeft = { "x": 0,
                        "y": 0},
            topRight = { "x": 0,
                        "y": 0},
            bottomLeft = { "x": 0,
                "y": 0},
            bottomRight = { "x": 0,
                "y": 0},
            ref = { "x": 0,
                "y": 0},
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
            }
        }

        arrowEndSize = this._raphaelArrowSizeToRefSize(arrowType, arrowSize, isEnd);
        w = Math.sqrt(arrowEndSize.w / 2 * arrowEndSize.w / 2 + arrowEndSize.h / 2 * arrowEndSize.h / 2);
        gamma = Math.atan(arrowEndSize.h / arrowEndSize.w );

        bottomRight.x = Math.cos(angle + gamma) * w;
        bottomRight.y = Math.sin(angle + gamma) * w;
        topRight.x = Math.cos(angle - gamma) * w;
        topRight.y = Math.sin(angle - gamma) * w;
        bottomLeft.x = Math.cos(angle - gamma + Math.PI) * w;
        bottomLeft.y = Math.sin(angle - gamma + Math.PI) * w;
        topLeft.x = Math.cos(angle + gamma + Math.PI) * w;
        topLeft.y = Math.sin(angle + gamma + Math.PI) * w;
        ref.x = Math.cos(angle) * arrowEndSize.refX;
        ref.y = Math.sin(angle) * arrowEndSize.refY;

        switch (type) {
            case "classic":
            case "block":
                bPoints.push( {"x": - ref.x + topLeft.x, "y": - ref.y + topLeft.y});
                bPoints.push( {"x": ((- ref.x + topRight.x) + (- ref.x + bottomRight.x)) / 2, "y": ((- ref.y + topRight.y) + (- ref.y + bottomRight.y)) /2 });
                bPoints.push( {"x": - ref.x + bottomLeft.x, "y": - ref.y + bottomLeft.y});
                break;
            case "diamond":
                bPoints.push( {"x": ((- ref.x + topLeft.x) + (- ref.x + topRight.x))/2, "y": ((- ref.y + topLeft.y) + (- ref.y + topRight.y))/2});
                bPoints.push( {"x": ((- ref.x + topRight.x) + (- ref.x + bottomRight.x))/2, "y": ((- ref.y + topRight.y) + (- ref.y + bottomRight.y))/2});
                bPoints.push( {"x": ((- ref.x + bottomLeft.x) + (- ref.x + bottomRight.x))/2, "y": ((- ref.y + bottomLeft.y) + (- ref.y + bottomRight.y))/2});
                bPoints.push( {"x": ((- ref.x + bottomLeft.x) + (- ref.x + topLeft.x))/2, "y": ((- ref.y + bottomLeft.y) + (- ref.y + topLeft.y))/2});
                break;
            default:
                bPoints.push( {"x": - ref.x + topLeft.x, "y": - ref.y + topLeft.y});
                bPoints.push( {"x": - ref.x + topRight.x, "y": - ref.y + topRight.y});
                bPoints.push( {"x": - ref.x + bottomRight.x, "y": - ref.y + bottomRight.y});
                bPoints.push( {"x": - ref.x + bottomLeft.x, "y": - ref.y + bottomLeft.y});
                break;
        }

        return bPoints;
    };

    Connection.prototype.destroy = function () {
        this._destroying = true;

        this._hideSegmentPoints();
        this.hideEndReconnectors();

        this._removeEditModePath();

        //remove from DOM
        this._removePath();
        this._removePathShadow();

        this._hideConnectionAreaMarker();
        this.hideSourceConnectors();
        this.hideEndConnectors();

        this._hideTexts();

        this.logger.debug("Destroyed");
    };

    /************** HANDLING SELECTION EVENT *********************/

    Connection.prototype.onSelect = function (multiSelection) {
        this.selected = true;
        this.selectedInMultiSelection = multiSelection;

        this._highlightPath();

        //in edit mode and when not participating in a multiple selection,
        //show endpoint connectors
        if (this.selectedInMultiSelection === true) {
            this._setEditMode(false);
        } else {
            //in edit mode and when not participating in a multiple selection,
            //show connectors
            if (this.diagramDesigner.mode === this.diagramDesigner.OPERATING_MODES.DESIGN) {
                this._setEditMode(true);
            }
        }
    };

    Connection.prototype.onDeselect = function () {
        this.selected = false;
        this.selectedInMultiSelection = false;

        this._unHighlightPath();
        this._setEditMode(false);
    };

    Connection.prototype._highlightPath = function () {
        this._createPathShadow(this._pathPoints);

        this.skinParts.pathShadow.attr({"opacity": this.designerAttributes.shadowOpacityWhenSelected});
    };

    Connection.prototype._unHighlightPath = function () {
        if (this.designerAttributes.width < MIN_WIDTH_NOT_TO_NEED_SHADOW) {
            this.skinParts.pathShadow.attr({"opacity": this.designerAttributes.shadowOpacity});
        } else {
            this._removePathShadow();
        }
    };

    Connection.prototype._calculatePathStartEndAngle = function () {
        var dX,
            dY,
            len;

        //calculate the steep for the first section
        dX = this._pathPoints[1].x - this._pathPoints[0].x;
        dY = this._pathPoints[1].y - this._pathPoints[0].y;

        if (dX === 0 && dY !== 0) {
            this._pathStartAngle = Math.PI / 2 * Math.abs(dY) / dY ;
        } else {
            this._pathStartAngle = Math.atan(dY / dX);
            if (dX < 0) {
                this._pathStartAngle += Math.PI;
            }
        }

        //calculate the steep for the last section
        len = this._pathPoints.length;

        dX = this._pathPoints[len - 1].x - this._pathPoints[len - 2].x;
        dY = this._pathPoints[len - 1].y - this._pathPoints[len - 2].y;

        if (dX === 0 && dY !== 0) {
            this._pathEndAngle = Math.PI / 2 * Math.abs(dY) / dY;
        } else {
            this._pathEndAngle = Math.atan(dY / dX );
            if (dX < 0) {
                this._pathEndAngle += Math.PI;
            }
        }
    };

    Connection.prototype._createPathShadow = function (segPoints) {
        var self = this;

        /*CREATE SHADOW IF NEEDED*/
        if (this.skinParts.pathShadow === undefined || this.skinParts.pathShadow === null) {
            this.skinParts.pathShadow = this.skinParts.pathShadow || this.paper.path("M0,0 L1,1");

            this._updatePathShadow(segPoints);

            $(this.skinParts.pathShadow.node).attr({"id": PATH_SHADOW_ID_PREFIX + this.id,
                "class": DiagramDesignerWidgetConstants.DESIGNER_CONNECTION_CLASS});

            this.skinParts.pathShadow.attr({    "stroke": this.designerAttributes.shadowColor,
                "stroke-width": this.designerAttributes.shadowWidth,
                "opacity": this.designerAttributes.shadowOpacity,
                "arrow-start": this.designerAttributes.arrowStart,
                "arrow-end": this.designerAttributes.arrowEnd,
                "arrow-dx-stroke-width-fix": this.designerAttributes.width });
        }
    };

    Connection.prototype._updatePathShadow = function (segPoints) {
        var points = [],
            i,
            len,
            p,
            pathDef = [],
            dx,
            dy;

        //copy over coordinates to prevent them from overwriting
        len = segPoints.length;
        for (i = 0; i < len; i += 1) {
            points.push({"x": segPoints[i].x, "y": segPoints[i].y});
        }

        if (this.designerAttributes.arrowStart !== CONNECTION_NO_END) {
            dx = this.designerAttributes.shadowArrowStartAdjust * Math.cos(this._pathStartAngle);
            dy = this.designerAttributes.shadowArrowStartAdjust * Math.sin(this._pathStartAngle) ;

            points[0].x -= dx;
            points[0].y -= dy;
        }

        if (this.designerAttributes.arrowEnd !== CONNECTION_NO_END) {
            dx = this.designerAttributes.shadowArrowEndAdjust * Math.cos(this._pathEndAngle) ;
            dy = this.designerAttributes.shadowArrowEndAdjust * Math.sin(this._pathEndAngle) ;

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

    Connection.prototype._removePath = function () {
        if (this.skinParts.path) {
            this.skinParts.path.remove();
            this.skinParts.path = null;
        }
    };

    Connection.prototype._removePathShadow = function () {
        if (this.skinParts.pathShadow) {
            this.skinParts.pathShadow.remove();
            this.skinParts.pathShadow = null;
        }
    };

    Connection.prototype.showEndReconnectors = function () {
        if (this.reconnectable) {
            //editor handle at src
            this.skinParts.srcDragPoint = this.skinParts.srcDragPoint || $('<div/>', {
                "data-end": DiagramDesignerWidgetConstants.CONNECTION_END_SRC,
                "data-id": this.id,
                "class": DiagramDesignerWidgetConstants.CONNECTION_DRAGGABLE_END_CLASS + " " + DiagramDesignerWidgetConstants.CONNECTION_END_SRC
            });
            this.skinParts.srcDragPoint.html('S');

            this.skinParts.srcDragPoint.css({"position": "absolute",
                                             "top": this.sourceCoordinates.y,
                                             "left": this.sourceCoordinates.x});

            this.diagramDesigner.skinParts.$itemsContainer.append(this.skinParts.srcDragPoint);


            this.skinParts.dstDragPoint = this.skinParts.dstDragPoint || $('<div/>', {
                "data-end": DiagramDesignerWidgetConstants.CONNECTION_END_DST,
                "data-id": this.id,
                "class": DiagramDesignerWidgetConstants.CONNECTION_DRAGGABLE_END_CLASS+ " " + DiagramDesignerWidgetConstants.CONNECTION_END_DST
            });
            this.skinParts.dstDragPoint.html('D');

            this.skinParts.dstDragPoint.css({"position": "absolute",
                "top": this.endCoordinates.y,
                "left": this.endCoordinates.x});

            this.diagramDesigner.skinParts.$itemsContainer.append(this.skinParts.dstDragPoint);

            //resize connectors to connection width
            var scale = Math.max(1, this.designerAttributes.width / 10); //10px is the width of the connector end
            this.skinParts.srcDragPoint.css('transform', "scale(" + scale + "," + scale + ")");
            this.skinParts.dstDragPoint.css('transform', "scale(" + scale + "," + scale + ")");
        } else {
            this.hideEndReconnectors();
        }
    };

    Connection.prototype.hideEndReconnectors = function () {
        if (this.skinParts.srcDragPoint) {
            this.skinParts.srcDragPoint.empty();
            this.skinParts.srcDragPoint.remove();
            this.skinParts.srcDragPoint = null;
        }

        if (this.skinParts.dstDragPoint) {
            this.skinParts.dstDragPoint.empty();
            this.skinParts.dstDragPoint.remove();
            this.skinParts.dstDragPoint = null;
        }
    };

    /************** END OF - HANDLING SELECTION EVENT *********************/

    Connection.prototype.readOnlyMode = function (readOnly) {
        this._readOnly = readOnly;
        if (readOnly === true) {
            this._setEditMode(false);
        }
    };

    Connection.prototype._setEditMode = function (editMode) {
        if (this._readOnly === false && this._editMode !== editMode) {
                this._editMode = editMode;
                this.setConnectionRenderData(this._pathPoints);
                if (this._editMode === false) {
                    this.hideEndReconnectors();
                }
        }
    };

    Connection.prototype._drawEditModePath = function (routingPoints) {
        var routingPointsLen = routingPoints.length,
            segmentPointsLen = this.segmentPoints.length,
            rIt,
            sIt = 0,
            pathSegmentPoints = [],
            pNum = 0;

        this._removeEditModePath();

        if (this.editable === true) {
            //iterate through the given points from the auto-router and the connection's segment points
            //the connection's segment points will be the movable points
            //the extra routing points that are not segment points, they are not movable
            for (rIt = 0; rIt < routingPointsLen; rIt += 1) {
                //till we reach the next segment point in the list, all routing points go to the same path-segment
                if (sIt < segmentPointsLen && this._isSamePoint(routingPoints[rIt], {'x': this.segmentPoints[sIt][0], 'y': this.segmentPoints[sIt][1]})) {
                    //found the end of a segment
                    pathSegmentPoints.push([routingPoints[rIt].x, routingPoints[rIt].y]);

                    //create segment
                    this._createEditSegment(pathSegmentPoints, pNum);

                    //increase segment point counter
                    sIt += 1;

                    //increase path counter
                    pNum += 1;

                    //start new pathSegmentPoint list
                    pathSegmentPoints = [];
                    pathSegmentPoints.push([routingPoints[rIt].x, routingPoints[rIt].y]);
                } else {
                    pathSegmentPoints.push([routingPoints[rIt].x, routingPoints[rIt].y]);
                }
            }

            //final segment's points are in pathSegmentPoints
            //create segment
            this._createEditSegment(pathSegmentPoints, pNum);

            //finally show segment points
            this._showSegmentPoints();
        }
    };

    Connection.prototype._removeEditModePath = function () {
        this._hideSegmentPoints();
        this._removeConnectionEditSegments();
    };

    Connection.prototype._isSamePoint = function (pointA, pointB) {
        return (pointA.x === pointB.x && pointA.y === pointB.y);
    };

    Connection.prototype._removeConnectionEditSegments = function () {
        var len = this._connectionEditSegments.length;

        while(len--) {
            this._connectionEditSegments[len].destroy();
        }

        this._connectionEditSegments = [];
    };

    Connection.prototype._createEditSegment = function (points, num) {
        var segment;

        this.logger.debug('_createEditSegment: #' + num + ', ' + JSON.stringify(points));

        segment = new ConnectionEditSegment({'connection': this,
                                             'id': num,
                                             'points': points});

        this._connectionEditSegments.push(segment);
    };

    Connection.prototype.addSegmentPoint = function (idx, x, y, cx, cy) {
        var d = [x, y],
            newSegmentPoints = this.segmentPoints.slice(0);

        if (cx && cy) {
            d.push(cx);
            d.push(cy);
        }

        newSegmentPoints.splice(idx,0,d);

        this.diagramDesigner.onConnectionSegmentPointsChange({'connectionID': this.id,
                                                              'points': newSegmentPoints});
    };

    Connection.prototype.removeSegmentPoint = function (idx) {
        var newSegmentPoints = this.segmentPoints.slice(0);

        newSegmentPoints.splice(idx,1);

        this.diagramDesigner.onConnectionSegmentPointsChange({'connectionID': this.id,
            'points': newSegmentPoints});
    };

    Connection.prototype.setSegmentPoint = function (idx, x, y, cx, cy) {
        var d = [x, y],
            newSegmentPoints = this.segmentPoints.slice(0);

        if (cx && cy) {
            d.push(cx);
            d.push(cy);
        }

        newSegmentPoints[idx] = d;

        this.diagramDesigner.onConnectionSegmentPointsChange({'connectionID': this.id,
            'points': newSegmentPoints});
    };

    /********************** SEGMENT POINT MARKERS ******************************/
    Connection.prototype._showSegmentPoints = function () {
        var len = this.segmentPoints.length,
            i = len,
            marker,
            pointsLastIdx = this._pathPoints.length - 1;

        this._hideSegmentPoints();

        while (i--) {
            marker = new ConnectionSegmentPoint({'connection': this,
                'id': i,
                'point': this.segmentPoints[i],
                'pointAfter': i === len - 1 ? [this._pathPoints[pointsLastIdx].x, this._pathPoints[pointsLastIdx].y] : this.segmentPoints[i + 1],
                'pointBefore': i === 0 ? [this._pathPoints[0].x, this._pathPoints[0].y] : this.segmentPoints[i - 1]});

            this._segmentPointMarkers.push(marker);
        }
    };

    Connection.prototype._hideSegmentPoints = function () {
        var len = this._segmentPointMarkers.length;
        while (len--) {
            this._segmentPointMarkers[len].destroy();
        }

        this._segmentPointMarkers = [];
    };

    /********************** END OF --- SEGMENT POINT MARKERS ******************************/


    /******************** HIGHLIGHT / UNHIGHLIGHT MODE *********************/
    Connection.prototype.highlight = function () {
        var classes = $(this.skinParts.path.node).attr('class').split(' ');
        if (classes.indexOf(DiagramDesignerWidgetConstants.ITEM_HIGHLIGHT_CLASS) === -1) {
            classes.push(DiagramDesignerWidgetConstants.ITEM_HIGHLIGHT_CLASS);
            $(this.skinParts.path.node).attr('class', classes.join(' '));
        }

        if (this.skinParts.textContainer) {
            this.skinParts.textContainer.addClass(DiagramDesignerWidgetConstants.ITEM_HIGHLIGHT_CLASS);
        }
    };

    Connection.prototype.unHighlight = function () {
        var classes = $(this.skinParts.path.node).attr('class').split(' '),
            idx = classes.indexOf(DiagramDesignerWidgetConstants.ITEM_HIGHLIGHT_CLASS);
        if (idx !== -1) {
            classes.splice(idx, 1);
            $(this.skinParts.path.node).attr('class', classes.join(' '));
        }

        if (this.skinParts.textContainer) {
            this.skinParts.textContainer.removeClass(DiagramDesignerWidgetConstants.ITEM_HIGHLIGHT_CLASS);
        }
    };

    Connection.prototype.update = function (objDescriptor) {
        //read props coming from the DataBase or DiagramDesigner
        this._initializeConnectionProps(objDescriptor);

        //update path itself
        if (this.skinParts.path) {
            this.skinParts.path.attr({ "arrow-start": this.designerAttributes.arrowStart,
                "arrow-end": this.designerAttributes.arrowEnd,
                "stroke": this.designerAttributes.color,
                "stroke-width": this.designerAttributes.width});
        }


        if (this.skinParts.pathShadow) {
            this.skinParts.pathShadow.attr({    "stroke-width": this.designerAttributes.shadowWidth,
                "arrow-start": this.designerAttributes.arrowStart,
                "arrow-end": this.designerAttributes.arrowEnd,
                "arrow-dx-stroke-width-fix": this.designerAttributes.width });
        }
    };


    Connection.prototype.getConnectionAreas = function (id) {
        var result = [],
            AREA_SIZE = 0,
            w = 0,
            h = 0,
            dx = 0,
            dy = 0;

        if (this.skinParts.path) {
            var len = this.skinParts.path.getTotalLength();
            var pos = this.skinParts.path.getPointAtLength(len / 2);

            this.positionX = 0;
            this.positionY = 0;

            if (pos.alpha === 0 || pos.alpha === 180) {
                //horizontal line
                w = AREA_SIZE;
                dx = AREA_SIZE / 2;
            } else if (pos.alpha === 90 || pos.alpha === 270) {
                //vertical line
                h = AREA_SIZE;
                dy = AREA_SIZE / 2;
            }

            //by default return the center point of the item
            //canvas will draw the connection to / from this coordinate
            result.push( {"id": "0",
                "x1": pos.x - dx,
                "y1": pos.y - dy,
                "x2": pos.x - dx + w,
                "y2": pos.y - dy + h,
                "angle1": 0,
                "angle2": 360,
                "len": 0} );
        }


        return result;
    };

    Connection.prototype.showSourceConnectors = function (params) {
    };

    Connection.prototype.hideSourceConnectors = function () {
    };

    Connection.prototype.showEndConnectors = function (params) {
        this._connectionConnector = this._connectionConnector || $('<div/>', {'class': 'connector connection-connector'});

        this._connectionConnector.attr(DiagramDesignerWidgetConstants.DATA_ITEM_ID, this.id);

        this.diagramDesigner.skinParts.$itemsContainer.append(this._connectionConnector);

        var len = this.skinParts.path.getTotalLength();
        var pos = this.skinParts.path.getPointAtLength(len / 2);

        this._connectionConnector.css({'left': pos.x,
            'top': pos.y});
    };

    Connection.prototype.hideEndConnectors = function () {
        if (this._connectionConnector) {
            this._connectionConnector.remove();
            this._connectionConnector = undefined;
        }
    };

    Connection.prototype._showConnectionAreaMarker = function () {
        var hasConnections = false;

        this._hideConnectionAreaMarker();

        if (this.diagramDesigner.connectionIDbyEndID.hasOwnProperty(this.id)) {
            for (var i in this.diagramDesigner.connectionIDbyEndID[this.id]) {
                if (this.diagramDesigner.connectionIDbyEndID[this.id].hasOwnProperty(i)) {
                    for (var j in this.diagramDesigner.connectionIDbyEndID[this.id][i]) {
                        if (this.diagramDesigner.connectionIDbyEndID[this.id][i].hasOwnProperty(j)) {
                            if (this.diagramDesigner.connectionIDbyEndID[this.id][i][j].length > 0) {
                                hasConnections = true;
                                break;
                            }
                        }
                    }
                }
                if (hasConnections) {
                    break;
                }
            }
        }

        if (this.skinParts.path && hasConnections) {
            var len = this.skinParts.path.getTotalLength();
            var pos = this.skinParts.path.getPointAtLength(len / 2);

            this._connectionAreaMarker = $('<div/>', {'class': 'c-area'});
            this.diagramDesigner.skinParts.$itemsContainer.append(this._connectionAreaMarker);

            this._connectionAreaMarker.css({'top': pos.y,
                'left': pos.x});
        }
    };

    Connection.prototype._hideConnectionAreaMarker = function () {
        if (this._connectionAreaMarker) {
            this._connectionAreaMarker.remove();
            this._connectionAreaMarker = undefined;
        }
    };

    Connection.prototype._textContainer = $('<div class="c-t"></div>');
    Connection.prototype._textNameBase = $('<div class="c-text"><span class="c-name"></span></div>');
    Connection.prototype._textSrcBase = $('<div class="c-text"><span class="c-src"></span></div>');
    Connection.prototype._textDstBase = $('<div class="c-text"><span class="c-dst"></span></div>');

    Connection.prototype._renderTexts = function () {
        var totalLength = this.skinParts.path.getTotalLength(),
            pathCenter = this.skinParts.path.getPointAtLength(totalLength / 2),
            pathBegin = this.skinParts.path.getPointAtLength(0),
            pathEnd = this.skinParts.path.getPointAtLength(totalLength),
            dx,
            dy,
            TEXT_OFFSET = 5,
            path0 = this.skinParts.path.getPointAtLength(0),
            path1 = this.skinParts.path.getPointAtLength(1),
            alphaBegin = this._calculateSteep(path0, path1),
            pathN = this.skinParts.path.getPointAtLength(totalLength),
            pathN1 = this.skinParts.path.getPointAtLength(totalLength - 1),
            alphaEnd = this._calculateSteep(pathN1, pathN),
            hasText = false,
            self = this;

        this._hideTexts();

        this.skinParts.textContainer = this._textContainer.clone();
        this.skinParts.textContainer.attr('id', TEXT_ID_PREFIX + this.id);

        if (this.name && this.name !== "") {
            this.skinParts.name = this._textNameBase.clone();
            this.skinParts.name.css({ 'top': pathCenter.y + this.designerAttributes.width / 2,
                'left': pathCenter.x});
            this.skinParts.name.find('span').text(this.name);
            this.skinParts.textContainer.append(this.skinParts.name);
            hasText = true;

            // set title editable on double-click
            this.skinParts.name.find('span').on("dblclick.editOnDblClick", null, function (event) {
                if (self.nameEdit === true && self.diagramDesigner.getIsReadOnlyMode() !== true) {
                    $(this).editInPlace({"class": "",
                        "onChange": function (oldValue, newValue) {
                            self._onNameChanged(oldValue, newValue);
                        }});
                }
                event.stopPropagation();
                event.preventDefault();
            });
        }

        if (this.srcText && this.srcText !== "") {
            this.skinParts.srcText = this._textSrcBase.clone();
            dx = this.designerAttributes.width;
            dy = this.designerAttributes.width;

            if (alphaBegin > 0 && alphaBegin <= 45) {
                dx = TEXT_OFFSET;
                dy *= -1;
            } else if (alphaBegin > 45 && alphaBegin <= 90) {
                dy = 0;
            } else if (alphaBegin > 90 && alphaBegin <= 135) {
                dy = 0;
            } else if (alphaBegin > 135 && alphaBegin <= 180) {
                dx = -5 * this.srcText.length;
            } else if (alphaBegin > 180 && alphaBegin <= 225) {
                dx = -5 * this.srcText.length ;
                dy *= -1;
            } else if (alphaBegin > 225 && alphaBegin <= 270) {
                dy = -3 * TEXT_OFFSET;
            } else if (alphaBegin > 270 && alphaBegin <= 315) {
                dy = -3 * TEXT_OFFSET;
            } else if (alphaBegin > 315 && alphaBegin <= 360) {
                dy = -3 * TEXT_OFFSET;
            }

            this.skinParts.srcText.css({ 'top': pathBegin.y + dy,
                'left': pathBegin.x + dx});
            this.skinParts.srcText.find('span').text(this.srcText);
            this.skinParts.textContainer.append(this.skinParts.srcText);
            hasText = true;

            // set title editable on double-click
            this.skinParts.srcText.find('span').on("dblclick.editOnDblClick", null, function (event) {
                if (self.srcTextEdit === true && self.diagramDesigner.getIsReadOnlyMode() !== true) {
                    $(this).editInPlace({"class": "",
                        "onChange": function (oldValue, newValue) {
                            self._onSrcTextChanged(oldValue, newValue);
                        }});
                }
                event.stopPropagation();
                event.preventDefault();
            });
        }

        if (this.dstText && this.dstText !== "") {
            this.skinParts.dstText = this._textDstBase.clone();
            dx = this.designerAttributes.width;
            dy = this.designerAttributes.width;

            if (alphaEnd === 0) {
                dx = -5 * this.dstText.length ;
                dy *= -1;
            } else if (alphaEnd > 0 && alphaEnd <= 45) {
                dy = -3 * TEXT_OFFSET;
            } else if (alphaEnd > 45 && alphaEnd <= 90) {
                dy = -3 * TEXT_OFFSET;
            } else if (alphaEnd > 90 && alphaEnd <= 135) {
                dy = -3 * TEXT_OFFSET;
            } else if (alphaEnd > 135 && alphaEnd <= 180) {
                dy = -3 * TEXT_OFFSET;
            } else if (alphaEnd > 180 && alphaEnd <= 225) {
                dx = TEXT_OFFSET;
                dy *= -1;
            } else if (alphaEnd > 225 && alphaEnd <= 270) {
                dy = 0;
            } else if (alphaEnd > 270 && alphaEnd <= 315) {
                dy = 0;
            } else if (alphaEnd > 315 && alphaEnd <= 360) {
                dx = -5 * this.srcText.length;
            }

            this.skinParts.dstText.css({ 'top': pathEnd.y + dy,
                'left': pathEnd.x + dx});
            this.skinParts.dstText.find('span').text(this.dstText);
            this.skinParts.textContainer.append(this.skinParts.dstText);
            hasText = true;

            // set title editable on double-click
            this.skinParts.dstText.find('span').on("dblclick.editOnDblClick", null, function (event) {
                if (self.dstTextEdit === true && self.diagramDesigner.getIsReadOnlyMode() !== true) {
                    $(this).editInPlace({"class": "",
                        "onChange": function (oldValue, newValue) {
                            self._onDstTextChanged(oldValue, newValue);
                        }});
                }
                event.stopPropagation();
                event.preventDefault();
            });
        }

        if (hasText) {
            $(this.diagramDesigner.skinParts.$itemsContainer.children()[0]).after(this.skinParts.textContainer);
        }
    };

    Connection.prototype._hideTexts = function () {
        if (this.skinParts.textContainer) {
            this.skinParts.textContainer.remove();
        }
    };

    Connection.prototype._calculateSteep = function (point0, point1) {
        var alpha = 0,
            dX = (point1.x - point0.x),
            dY = (point1.y - point0.y);

        if (dX === 0 && dY !== 0) {
            alpha = Math.PI / 2 * Math.abs(dY) / dY ;
        } else {
            alpha = Math.atan(dY / dX);
            if (dX < 0) {
                alpha += Math.PI;
            }
        }

        if (alpha < 0) {
            alpha += Math.PI * 2;
        }

        alpha = alpha * (180/Math.PI);

        return alpha;
    };

    Connection.prototype._onNameChanged = function (oldValue, newValue) {
        this.diagramDesigner.onConnectionNameChanged(this.id, oldValue, newValue);
    };

    Connection.prototype._onSrcTextChanged = function (oldValue, newValue) {
        this.diagramDesigner.onConnectionSrcTextChanged(this.id, oldValue, newValue);
    };

    Connection.prototype._onDstTextChanged = function (oldValue, newValue) {
        this.diagramDesigner.onConnectionDstTextChanged(this.id, oldValue, newValue);
    };


    return Connection;
});