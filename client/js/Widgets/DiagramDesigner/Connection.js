/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */

"use strict";

define(['logManager',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    './Connection.EditSegment',
    './Connection.SegmentPoint',
    'raphaeljs'], function (logManager,
                            DiagramDesignerWidgetConstants,
                            ConnectionEditSegment,
                            ConnectionSegmentPoint) {

    var ConnectionComponent,
        PATH_SHADOW_ID_PREFIX = "p_",
        MIN_WIDTH_NOT_TO_NEED_SHADOW = 5,
        CONNECTION_DEFAULT_WIDTH = 2,
        CONNECTION_DEFAULT_COLOR = "#000000",
        CONNECTION_NO_END = "none",
        CONNECTION_DEFAULT_END = CONNECTION_NO_END,
        CONNECTION_SHADOW_DEFAULT_OPACITY = 0,
        CONNECTION_SHADOW_DEFAULT_WIDTH = 4,
        CONNECTION_SHADOW_DEFAULT_OPACITY_WHEN_SELECTED = 0.4,
        CONNECTION_SHADOW_DEFAULT_COLOR = "#52A8EC",
        CONNECTION_DEFAULT_LINE_TYPE = DiagramDesignerWidgetConstants.LINE_TYPES.NONE,
        CONNECTION_SEGMENT_POINT_MIN_SIZE = 4;

    ConnectionComponent = function (objId) {
        this.id = objId;

        this.logger = logManager.create("Connection_" + this.id);
        this.logger.debug("Created");
    };

    ConnectionComponent.prototype._initialize = function (objDescriptor) {
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

    ConnectionComponent.prototype._initializeConnectionProps = function (objDescriptor) {
        this.segmentPoints = objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS] ? objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS].slice(0) : [];
        this.reconnectable = objDescriptor.reconnectable === true ? true : false;

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

        this._segmentPointSize = Math.max(CONNECTION_SEGMENT_POINT_MIN_SIZE, this.designerAttributes.width);
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

    ConnectionComponent.prototype._raphaelArrowSizeToRefSize = function (arrowType, refSize, isEnd) {
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
            refX = isEnd ? 4 : 1;
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
            }
        } else {
            this.pathDef = null;
            this._removePath();
            this._removePathShadow();
        }
    };

    ConnectionComponent.prototype.getBoundingBox = function () {
        var bBox,
            strokeWidthAdjust,
            dx,
            dy,
            shadowAdjust,
            endMarkerBBox,
            bBoxPath;

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
            var bPoints = this._getRaphaelArrowEndBoundingPoints(this.designerAttributes.arrowStart, strokeWidthAdjust, this._pathStartAngle, false);

            dx = shadowAdjust * Math.cos(this._pathStartAngle) ;
            dy = shadowAdjust * Math.sin(this._pathStartAngle) ;

            endMarkerBBox = { "x": this.sourceCoordinates.x - dx,
                "y": this.sourceCoordinates.y - dy,
                "x2": this.sourceCoordinates.x - dx,
                "y2": this.sourceCoordinates.y - dy};


            var len = bPoints.length;
            while (len--) {
                endMarkerBBox.x = Math.min(endMarkerBBox.x, this.sourceCoordinates.x - dx - bPoints[len].x);
                endMarkerBBox.y = Math.min(endMarkerBBox.y, this.sourceCoordinates.y - dy - bPoints[len].y);

                endMarkerBBox.x2 = Math.max(endMarkerBBox.x2, this.sourceCoordinates.x - dx - bPoints[len].x);
                endMarkerBBox.y2 = Math.max(endMarkerBBox.y2, this.sourceCoordinates.y - dy - bPoints[len].y);
            }
        }

        if (this.designerAttributes.arrowEnd !== CONNECTION_NO_END) {
            var bPoints = this._getRaphaelArrowEndBoundingPoints(this.designerAttributes.arrowEnd, strokeWidthAdjust, this._pathEndAngle, true);

            dx = shadowAdjust * Math.cos(this._pathEndAngle) ;
            dy = shadowAdjust * Math.sin(this._pathEndAngle) ;

            endMarkerBBox = endMarkerBBox || { "x": this.endCoordinates.x + dx,
                             "y": this.endCoordinates.y + dy,
                             "x2": this.endCoordinates.x + dx,
                             "y2": this.endCoordinates.y + dy};


            var len = bPoints.length;
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

    ConnectionComponent.prototype._getRaphaelArrowEndBoundingPoints = function (arrowType, arrowSize, angle, isEnd) {
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

    ConnectionComponent.prototype.destroy = function () {
        this._destroying = true;

        this._hideSegmentPoints();
        this.hideConnectors();

        this._removeEditModePath();

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
            this._setEditMode(false);
        } else {
            //in edit mode and when not participating in a multiple selection,
            //show connectors
            if (this.diagramDesigner.mode === this.diagramDesigner.OPERATING_MODES.DESIGN) {
                this._setEditMode(true);
            }
        }


    };

    ConnectionComponent.prototype.onDeselect = function () {
        this.selected = false;
        this.selectedInMultiSelection = false;

        this._unHighlightPath();
        this._setEditMode(false);
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

    ConnectionComponent.prototype._calculatePathStartEndAngle = function () {
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

    ConnectionComponent.prototype._createPathShadow = function (segPoints) {
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

    ConnectionComponent.prototype._updatePathShadow = function (segPoints) {
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
            this.hideConnectors();
        }
    };

    ConnectionComponent.prototype.hideConnectors = function () {
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

    ConnectionComponent.prototype.readOnlyMode = function (readOnly) {
        this._readOnly = readOnly;
        if (readOnly === true) {
            this._setEditMode(false);
        }
    };

    ConnectionComponent.prototype._setEditMode = function (editMode) {
        if (this._readOnly === false && this._editMode !== editMode) {
            this._editMode = editMode;
            this.setConnectionRenderData(this._pathPoints);
            if (this._editMode === false) {
                this.hideConnectors();
            }
        }
    };

    ConnectionComponent.prototype._drawEditModePath = function (routingPoints) {
        var routingPointsLen = routingPoints.length,
            segmentPointsLen = this.segmentPoints.length,
            rIt,
            sIt = 0,
            pathSegmentPoints = [],
            pNum = 0;

        this._removeEditModePath();

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
        };

        //final segment's points are in pathSegmentPoints
        //create segment
        this._createEditSegment(pathSegmentPoints, pNum);

        //finally show segment points
        this._showSegmentPoints();

        //show connection end dragpoints
        this.showConnectors();
    };

    ConnectionComponent.prototype._removeEditModePath = function () {
        this._hideSegmentPoints();
        this._removeConnectionEditSegments();
    };

    ConnectionComponent.prototype._isSamePoint = function (pointA, pointB) {
        if (pointA.x === pointB.x &&
            pointA.y === pointB.y) {
            return true;
        }

        return false;
    };

    ConnectionComponent.prototype._removeConnectionEditSegments = function () {
        var len = this._connectionEditSegments.length;

        while(len--) {
            this._connectionEditSegments[len].destroy();
        }

        this._connectionEditSegments = [];
    };

    ConnectionComponent.prototype._createEditSegment = function (points, num) {
        var segment;

        this.logger.debug('_createEditSegment: #' + num + ', ' + JSON.stringify(points));

        segment = new ConnectionEditSegment({'connection': this,
                                             'id': num,
                                             'points': points});

        this._connectionEditSegments.push(segment);
    };

    ConnectionComponent.prototype.addSegmentPoint = function (idx, x, y, cx, cy) {
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

    ConnectionComponent.prototype.removeSegmentPoint = function (idx) {
        var newSegmentPoints = this.segmentPoints.slice(0);

        newSegmentPoints.splice(idx,1);

        this.diagramDesigner.onConnectionSegmentPointsChange({'connectionID': this.id,
            'points': newSegmentPoints});
    };

    ConnectionComponent.prototype.setSegmentPoint = function (idx, x, y, cx, cy) {
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
    ConnectionComponent.prototype._showSegmentPoints = function () {
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

    ConnectionComponent.prototype._hideSegmentPoints = function () {
        var len = this._segmentPointMarkers.length;
        while (len--) {
            this._segmentPointMarkers[len].destroy();
        }

        this._segmentPointMarkers = [];
    };

    /********************** END OF --- SEGMENT POINT MARKERS ******************************/


    /******************** HIGHLIGHT / UNHIGHLIGHT MODE *********************/
    ConnectionComponent.prototype.highlight = function () {
        var classes = $(this.skinParts.path.node).attr('class').split(' ');
        if (classes.indexOf(DiagramDesignerWidgetConstants.ITEM_HIGHLIGHT_CLASS) === -1) {
            classes.push(DiagramDesignerWidgetConstants.ITEM_HIGHLIGHT_CLASS);
            $(this.skinParts.path.node).attr('class', classes.join(' '));
        }

    };

    ConnectionComponent.prototype.unHighlight = function () {
        var classes = $(this.skinParts.path.node).attr('class').split(' '),
            idx = classes.indexOf(DiagramDesignerWidgetConstants.ITEM_HIGHLIGHT_CLASS);
        if (idx !== -1) {
            classes.splice(idx, 1);
            $(this.skinParts.path.node).attr('class', classes.join(' '));
        }
    };

    ConnectionComponent.prototype.update = function (objDescriptor) {
        var i;

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


    return ConnectionComponent;
});