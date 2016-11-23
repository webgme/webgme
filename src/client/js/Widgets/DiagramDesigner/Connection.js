/*globals define, $, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/logger',
    'js/util',
    './DiagramDesignerWidget.Constants',
    './DiagramDesignerWidget.OperatingModes',
    './Connection.EditSegment',
    './Connection.SegmentPoint'
], function (Logger,
             clientUtil,
             DiagramDesignerWidgetConstants,
             DiagramDesignerWidgetOperatingModes,
             ConnectionEditSegment,
             ConnectionSegmentPoint) {

    'use strict';

    var Connection,
        TEXT_ID_PREFIX = 't_',
        MIN_WIDTH_NOT_TO_NEED_SHADOW = 5,
        CONNECTION_DEFAULT_WIDTH = 1,
        CONNECTION_DEFAULT_COLOR = '#000000',
        CONNECTION_DEFAULT_PATTERN = DiagramDesignerWidgetConstants.LINE_PATTERNS.SOLID,
        CONNECTION_NO_END = DiagramDesignerWidgetConstants.LINE_ARROWS.NONE,
        CONNECTION_DEFAULT_END = CONNECTION_NO_END,
        CONNECTION_SHADOW_DEFAULT_OPACITY = 0,
        CONNECTION_SHADOW_DEFAULT_WIDTH = 5,
        CONNECTION_SHADOW_DEFAULT_OPACITY_WHEN_SELECTED = 1,
        CONNECTION_SHADOW_DEFAULT_COLOR = '#B9DCF7',
        CONNECTION_DEFAULT_LINE_TYPE = DiagramDesignerWidgetConstants.LINE_TYPES.NONE,
        SHADOW_MARKER_SIZE_INCREMENT = 3,
        SHADOW_MARKER_SIZE_INCREMENT_X = 1,
        SHADOW_MARKER_BLOCK_FIX_OFFSET = 2,
        JUMP_XING_RADIUS = 3;

    Connection = function (objId) {
        this.id = objId;

        this.logger = Logger.create('gme:Widgets:DiagramDesigner:Connection_' + this.id,
            WebGMEGlobal.gmeConfig.client.log);
        this.logger.debug('Created');

        this.sourceCoordinates = {
            x: -1,
            y: -1
        };

        this.endCoordinates = {
            x: -1,
            y: -1
        };

    };

    Connection.prototype._initialize = function (objDescriptor) {
        /*MODELEDITORCONNECTION CONSTANTS***/
        this.diagramDesigner = objDescriptor.designerCanvas;
        this.paper = this.diagramDesigner.skinParts.SVGPaper;

        this.skinParts = {};

        this.reconnectable = false;

        this.selected = false;
        this.selectedInMultiSelection = false;
        this.onRenderCallback = null;

        this.designerAttributes = {};

        this._segmentPointMarkers = [];
        this._editMode = false;
        this._readOnly = false;
        this._connectionEditSegments = [];

        this._pathPointsBBox = {
            x: 0,
            y: 0,
            x2: 0,
            y2: 0,
            w: 0,
            h: 0
        };

        //read props coming from the DataBase or DiagramDesigner
        this._initializeConnectionProps(objDescriptor);
    };

    Connection.prototype._initializeConnectionProps = function (objDescriptor) {
        this.reconnectable = objDescriptor.reconnectable === true;
        this.editable = !!objDescriptor.editable;

        this.isBezier = (objDescriptor[DiagramDesignerWidgetConstants.LINE_TYPE] ||
        DiagramDesignerWidgetConstants.LINE_TYPES.NONE).toLowerCase() ===
        DiagramDesignerWidgetConstants.LINE_TYPES.BEZIER;

        /*PathAttributes*/
        this.designerAttributes.arrowStart = objDescriptor[DiagramDesignerWidgetConstants.LINE_START_ARROW] ||
        CONNECTION_DEFAULT_END;
        this.designerAttributes.arrowEnd = objDescriptor[DiagramDesignerWidgetConstants.LINE_END_ARROW] ||
        CONNECTION_DEFAULT_END;
        this.designerAttributes.color = objDescriptor[DiagramDesignerWidgetConstants.LINE_COLOR] ||
        CONNECTION_DEFAULT_COLOR;
        this.designerAttributes.width = parseInt(objDescriptor[DiagramDesignerWidgetConstants.LINE_WIDTH], 10) ||
        CONNECTION_DEFAULT_WIDTH;
        this.designerAttributes.pattern = objDescriptor[DiagramDesignerWidgetConstants.LINE_PATTERN] ||
        CONNECTION_DEFAULT_PATTERN;
        this.designerAttributes.shadowWidth = this.designerAttributes.width + CONNECTION_SHADOW_DEFAULT_WIDTH -
        CONNECTION_DEFAULT_WIDTH;
        this.designerAttributes.shadowOpacity = CONNECTION_SHADOW_DEFAULT_OPACITY;
        this.designerAttributes.shadowOpacityWhenSelected = CONNECTION_SHADOW_DEFAULT_OPACITY_WHEN_SELECTED;
        this.designerAttributes.shadowColor = CONNECTION_SHADOW_DEFAULT_COLOR;
        this.designerAttributes.lineType = objDescriptor[DiagramDesignerWidgetConstants.LINE_TYPE] ||
        CONNECTION_DEFAULT_LINE_TYPE;

        this.designerAttributes.shadowEndArrowWidth = this.designerAttributes.width + SHADOW_MARKER_SIZE_INCREMENT;
        if (this.designerAttributes.arrowStart.indexOf('-xx') !== -1 ||
            this.designerAttributes.arrowEnd.indexOf('-xx') !== -1 ||
            this.designerAttributes.arrowStart.indexOf('-x') !== -1 ||
            this.designerAttributes.arrowEnd.indexOf('-x') !== -1) {
            this.designerAttributes.shadowEndArrowWidth = this.designerAttributes.width +
            SHADOW_MARKER_SIZE_INCREMENT_X;
        }

        this.designerAttributes.shadowArrowStartAdjust = this._raphaelArrowAdjustForSizeToRefSize(
            this.designerAttributes.arrowStart, this.designerAttributes.shadowEndArrowWidth,
            this.designerAttributes.width, false);
        this.designerAttributes.shadowArrowEndAdjust = this._raphaelArrowAdjustForSizeToRefSize(
            this.designerAttributes.arrowEnd, this.designerAttributes.shadowEndArrowWidth,
            this.designerAttributes.width, true);

        this.srcText = objDescriptor.srcText;
        this.dstText = objDescriptor.dstText;
        this.name = objDescriptor.name;
        /* || this.id;*/
        this.nameEdit = objDescriptor.nameEdit || false;
        this.srcTextEdit = objDescriptor.srcTextEdit || false;
        this.dstTextEdit = objDescriptor.dstTextEdit || false;

        //get segnment points
        this.segmentPoints = [];
        if (objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS]) {
            var fixedP;
            var len = objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS].length;
            var cx, cy;
            for (var i = 0; i < len; i += 1) {
                fixedP = this._fixXY({
                    x: objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS][i][0],
                    y: objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS][i][1]
                });
                cx = objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS][i].length > 2 ?
                    objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS][i][2] : 0;
                cy = objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS][i].length > 2 ?
                    objDescriptor[DiagramDesignerWidgetConstants.LINE_POINTS][i][3] : 0;
                this.segmentPoints.push([fixedP.x, fixedP.y, cx, cy]);
            }
        }
    };

    Connection.prototype._raphaelArrowAdjustForSizeToRefSize = function (arrowType, size, refSize, isEnd) {
        var raphaelMarkerW = 3, //original RaphaelJS source settings
            raphaelMarkerH = 3,
            refX,
            values = arrowType.toLowerCase().split('-'),
            type = 'classic',
            i = values.length;

        while (i--) {
            switch (values[i]) {
                case 'block':
                case 'classic':
                case 'oval':
                case 'diamond':
                case 'open':
                case 'none':
                case 'diamond2':
                case 'inheritance':
                    type = values[i];
                    break;
                case 'wide':
                    raphaelMarkerH = 5;
                    break;
                case 'narrow':
                    raphaelMarkerH = 2;
                    break;
                case 'long':
                    raphaelMarkerW = 5;
                    break;
                case 'short':
                    raphaelMarkerW = 2;
                    break;
                case 'xwide':
                    raphaelMarkerH = 9;
                    break;
                case 'xlong':
                    raphaelMarkerW = 9;
                    break;
                case 'xxwide':
                    raphaelMarkerH = 12;
                    break;
                case 'xxlong':
                    raphaelMarkerW = 12;
                    break;
                default:
                    break;
            }
        }

        if (type === 'none') {
            return 0;
        }

        //if there is correction in RaphaelJS source, it is not needed
        /*if (type === 'diamond' || type === 'oval') {
         return 0;
         }*/

        //open type is no different than other since it's fixed in RaphaelJS lib
        /*if (type == 'open') {
         raphaelMarkerW += 2;
         raphaelMarkerH += 2;
         refX = isEnd ? 4 : 1;
         } else {
         refX = raphaelMarkerW / 2;
         }*/

        refX = raphaelMarkerW / 2;

        if (isEnd) {
            this.designerAttributes.endArrowMarkerSize = this.designerAttributes.width * raphaelMarkerW;
            this.designerAttributes.shadowEndArrowMarkerSize = this.designerAttributes.shadowEndArrowWidth *
            raphaelMarkerW;
        } else {
            this.designerAttributes.startArrowMarkerSize = this.designerAttributes.width * raphaelMarkerW;
            this.designerAttributes.shadowStartArrowMarkerSize = this.designerAttributes.shadowEndArrowWidth *
            raphaelMarkerW;
        }

        return refX * (size - refSize);
    };

    Connection.prototype._raphaelArrowSizeToRefSize = function (arrowType, refSize) {
        var raphaelMarkerW = 3, //original RaphaelJS source settings
            raphaelMarkerH = 3,
            values = arrowType.toLowerCase().split('-'),
            type = 'classic',
            i = values.length,
            refX,
            refY;

        while (i--) {
            switch (values[i]) {
                case 'block':
                case 'classic':
                case 'oval':
                case 'diamond':
                case 'open':
                case 'none':
                case 'diamond2':
                case 'inheritance':
                    type = values[i];
                    break;
                case 'wide':
                    raphaelMarkerH = 5;
                    break;
                case 'narrow':
                    raphaelMarkerH = 2;
                    break;
                case 'long':
                    raphaelMarkerW = 5;
                    break;
                case 'short':
                    raphaelMarkerW = 2;
                    break;
                case 'xwide':
                    raphaelMarkerH = 9;
                    break;
                case 'xlong':
                    raphaelMarkerW = 9;
                    break;
                case 'xxwide':
                    raphaelMarkerH = 12;
                    break;
                case 'xxlong':
                    raphaelMarkerW = 12;
                    break;
                default:
                    break;
            }
        }

        if (type === 'none') {
            return 0;
        }

        /*if (type == 'open') {
         raphaelMarkerW += 2;
         raphaelMarkerH += 2;
         refX = raphaelMarkerW / 2;
         } else {
         refX = raphaelMarkerW / 2;
         }*/

        refX = raphaelMarkerW / 2;
        refY = raphaelMarkerH / 2;

        return {
            w: refSize * raphaelMarkerW,
            h: refSize * raphaelMarkerH,
            refX: refX * refSize,
            refY: refY * refSize
        };
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
        objDescriptor.pattern = this.designerAttributes.pattern;

        return objDescriptor;
    };

    //for EVEN width of the path, get the lower integer of the coordinate
    //for ODD width of the path, get the lower integer + 0.5
    Connection.prototype._fixXY = function (point) {
        var p = {
            x: Math.floor(point.x),
            y: Math.floor(point.y)
        };

        if (this.designerAttributes.width % 2 === 1) {
            p.x += 0.5;
            p.y += 0.5;
        }

        return p;
    };

    Connection.prototype.setConnectionRenderData = function (segPoints) {
        var i = 0,
            len,
            pathDef = [],
            p,
            lastP = {
                x: NaN,
                y: NaN
            },
            points = [],
            validPath = segPoints && segPoints.length > 1,
            minX,
            minY,
            maxX,
            maxY;

        //remove edit features
        this._removeEditModePath();

        if (validPath) {
            //there is a points list given and has at least 2 points
            //remove the null points from the list (if any)
            i = len = segPoints.length;
            len--;
            while (i--) {
                if (segPoints[len - i]) {
                    p = this._fixXY(segPoints[len - i]);
                    if (lastP && (lastP.x !== p.x || lastP.y !== p.y)) {
                        points.push(p);
                        lastP = p;
                    }
                }
            }
        }

        this._simplifyTrivially(points);

        this.sourceCoordinates = {
            x: -1,
            y: -1
        };

        this.endCoordinates = {
            x: -1,
            y: -1
        };

        len = points.length;
        validPath = len > 1;

        if (validPath) {
            //there is at least 2 points given, good to draw

            this._pathPoints = points;

            //non-edit mode, one path builds the connection
            p = points[0];

            minX = maxX = p.x;
            minY = maxY = p.y;

            //store source coordinate
            this.sourceCoordinates.x = p.x;
            this.sourceCoordinates.y = p.y;

            i = points.length;
            while (i--) {
                p = points[i];
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            }

            //save calculated bounding box
            this._pathPointsBBox.x = minX;
            this._pathPointsBBox.y = minY;
            this._pathPointsBBox.x2 = maxX;
            this._pathPointsBBox.y2 = maxY;

            //save endpoint coordinates
            p = points[points.length - 1];
            this.endCoordinates.x = p.x;
            this.endCoordinates.y = p.y;

            //construct the SVG path definition from path-points
            pathDef = this._getPathDefFromPoints(points);
            pathDef = this._jumpOnCrossings(pathDef);
            pathDef = pathDef.join(' ');

            //check if the prev pathDef is the same as the new
            //this way the redraw does not need to happen
            if (this.pathDef !== pathDef) {
                this.pathDef = pathDef;

                //calculate the steep of the curve at the beginning/end of path
                this._calculatePathStartEndAngle();

                if (this.skinParts.path) {
                    this.logger.debug('Redrawing connection with ID: "' + this.id + '"');
                    this.skinParts.path.attr({path: pathDef});
                    if (this.skinParts.pathShadow) {
                        this._updatePathShadow(this._pathPoints);
                    }
                } else {
                    this.logger.debug('Drawing connection with ID: "' + this.id + '"');
                    /*CREATE PATH*/
                    this.skinParts.path = this.paper.path(pathDef);

                    $(this.skinParts.path.node).attr({
                        id: this.id,
                        class: DiagramDesignerWidgetConstants.DESIGNER_CONNECTION_CLASS
                    });

                    this.skinParts.path.attr({
                        'arrow-start': this.designerAttributes.arrowStart,
                        'arrow-end': this.designerAttributes.arrowEnd,
                        stroke: this.designerAttributes.color,
                        'stroke-width': this.designerAttributes.width,
                        'stroke-dasharray': this.designerAttributes.pattern
                    });

                    if (this.designerAttributes.width < MIN_WIDTH_NOT_TO_NEED_SHADOW) {
                        this._createPathShadow(this._pathPoints);
                    }
                    if (this.selected) {
                        this.onSelect(this.selectedInMultiSelection);
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

    Connection.prototype._calcRawBoundingBox = function () {
        var result = {
                x: 0,
                y: 0,
                x2: 0,
                y2: 0,
                width: 0,
                height: 0
            },
            i;

        // Initialize the result
        if (this._pathPoints && this._pathPoints.length > 0) {
            result.x = result.x2 = this._pathPoints[0].x;
            result.y = result.y2 = this._pathPoints[0].y;

            for (i = 1; i < this._pathPoints.length; i += 1) {
                result.x = this._pathPoints[i].x < result.x ? this._pathPoints[i].x : result.x;
                result.x2 = this._pathPoints[i].x > result.x2 ? this._pathPoints[i].x : result.x2;
                result.y = this._pathPoints[i].y < result.y ? this._pathPoints[i].y : result.y;
                result.y2 = this._pathPoints[i].y > result.y2 ? this._pathPoints[i].y : result.y2;
            }

            result.width = result.x2 - result.x;
            result.height = result.y2 - result.y;
        }

        return result;
    };

    Connection.prototype.getBoundingBox = function () {
        var bBox,
            strokeWidthAdjust,
            dx,
            dy,
            shadowAdjust = 0,
            endMarkerBBox,
            bBoxPath,
            bPoints,
            len;

        bBoxPath = this._calcRawBoundingBox();
        if (this.skinParts.pathShadow) {
            strokeWidthAdjust = this.designerAttributes.shadowWidth;
            shadowAdjust = this.designerAttributes.shadowArrowEndAdjust;
        } else if (this.skinParts.path) {
            strokeWidthAdjust = this.designerAttributes.width;
        }

        //get a copy of bBoxPath
        //bBoxPath should not be touched because RaphaelJS reuses it unless the path is not redrawn
        bBox = {
            x: bBoxPath.x,
            y: bBoxPath.y,
            x2: bBoxPath.x2,
            y2: bBoxPath.y2,
            width: bBoxPath.width,
            height: bBoxPath.height
        };

        //calculate the marker-end size
        if (this.designerAttributes.arrowStart !== CONNECTION_NO_END) {
            bPoints = this._getRaphaelArrowEndBoundingPoints(this.designerAttributes.arrowStart, strokeWidthAdjust,
                this._pathStartAngle, false);

            dx = shadowAdjust * Math.cos(this._pathStartAngle);
            dy = shadowAdjust * Math.sin(this._pathStartAngle);

            endMarkerBBox = {
                x: this.sourceCoordinates.x - dx,
                y: this.sourceCoordinates.y - dy,
                x2: this.sourceCoordinates.x - dx,
                y2: this.sourceCoordinates.y - dy
            };


            len = bPoints.length;
            while (len--) {
                endMarkerBBox.x = Math.min(endMarkerBBox.x, this.sourceCoordinates.x - dx - bPoints[len].x);
                endMarkerBBox.y = Math.min(endMarkerBBox.y, this.sourceCoordinates.y - dy - bPoints[len].y);

                endMarkerBBox.x2 = Math.max(endMarkerBBox.x2, this.sourceCoordinates.x - dx - bPoints[len].x);
                endMarkerBBox.y2 = Math.max(endMarkerBBox.y2, this.sourceCoordinates.y - dy - bPoints[len].y);
            }
        }

        if (this.designerAttributes.arrowEnd !== CONNECTION_NO_END) {
            bPoints = this._getRaphaelArrowEndBoundingPoints(this.designerAttributes.arrowEnd, strokeWidthAdjust,
                this._pathEndAngle, true);

            dx = shadowAdjust * Math.cos(this._pathEndAngle);
            dy = shadowAdjust * Math.sin(this._pathEndAngle);

            endMarkerBBox = endMarkerBBox || {
                x: this.endCoordinates.x + dx,
                y: this.endCoordinates.y + dy,
                x2: this.endCoordinates.x + dx,
                y2: this.endCoordinates.y + dy
            };


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
                bBox.x2 += Math.abs(Math.cos(Math.PI / 2 - this._pathEndAngle) * strokeWidthAdjust / 2);
            } else {
                //target is on the left
                bBox.x -= Math.abs(Math.cos(Math.PI / 2 - this._pathEndAngle) * strokeWidthAdjust / 2);
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

        //safety check
        if (isNaN(bBox.x)) {
            bBox.x = 0;
        }
        if (isNaN(bBox.y)) {
            bBox.y = 0;
        }
        if (isNaN(bBox.x2)) {
            bBox.x2 = 0;
        }
        if (isNaN(bBox.y2)) {
            bBox.y2 = 0;
        }
        if (isNaN(bBox.width)) {
            bBox.width = 0;
        }
        if (isNaN(bBox.height)) {
            bBox.height = 0;
        }

        return bBox;
    };

    Connection.prototype._getRaphaelArrowEndBoundingPoints = function (arrowType, arrowSize, angle, isEnd) {
        var bPoints = [],
            arrowEndSize,
            w,
            gamma,
            topLeft = {
                x: 0,
                y: 0
            },
            topRight = {
                x: 0,
                y: 0
            },
            bottomLeft = {
                x: 0,
                y: 0
            },
            bottomRight = {
                x: 0,
                y: 0
            },
            ref = {
                x: 0,
                y: 0
            },
            values = arrowType.toLowerCase().split('-'),
            type = 'classic',
            i = values.length;

        while (i--) {
            switch (values[i]) {
                case 'block':
                case 'classic':
                case 'oval':
                case 'diamond':
                case 'open':
                case 'none':
                case 'diamond2':
                case 'inheritance':
                    type = values[i];
                    break;
                default:
                    break;
            }
        }

        arrowEndSize = this._raphaelArrowSizeToRefSize(arrowType, arrowSize, isEnd);
        w = Math.sqrt(arrowEndSize.w / 2 * arrowEndSize.w / 2 + arrowEndSize.h / 2 * arrowEndSize.h / 2);
        gamma = Math.atan(arrowEndSize.h / arrowEndSize.w);

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
            case 'classic':
            case 'block':
            case 'inheritance':
                bPoints.push({x: -ref.x + topLeft.x, y: -ref.y + topLeft.y});
                bPoints.push({
                    x: ((-ref.x + topRight.x) + (-ref.x + bottomRight.x)) / 2,
                    y: ((-ref.y + topRight.y) + (-ref.y + bottomRight.y)) / 2
                });
                bPoints.push({x: -ref.x + bottomLeft.x, y: -ref.y + bottomLeft.y});
                break;
            case 'diamond':
            case 'diamond2':
                bPoints.push({
                    x: ((-ref.x + topLeft.x) + (-ref.x + topRight.x)) / 2,
                    y: ((-ref.y + topLeft.y) + (-ref.y + topRight.y)) / 2
                });
                bPoints.push({
                    x: ((-ref.x + topRight.x) + (-ref.x + bottomRight.x)) / 2,
                    y: ((-ref.y + topRight.y) + (-ref.y + bottomRight.y)) / 2
                });
                bPoints.push({
                    x: ((-ref.x + bottomLeft.x) + (-ref.x + bottomRight.x)) / 2,
                    y: ((-ref.y + bottomLeft.y) + (-ref.y + bottomRight.y)) / 2
                });
                bPoints.push({
                    x: ((-ref.x + bottomLeft.x) + (-ref.x + topLeft.x)) / 2,
                    y: ((-ref.y + bottomLeft.y) + (-ref.y + topLeft.y)) / 2
                });
                break;
            default:
                bPoints.push({x: -ref.x + topLeft.x, y: -ref.y + topLeft.y});
                bPoints.push({x: -ref.x + topRight.x, y: -ref.y + topRight.y});
                bPoints.push({x: -ref.x + bottomRight.x, y: -ref.y + bottomRight.y});
                bPoints.push({x: -ref.x + bottomLeft.x, y: -ref.y + bottomLeft.y});
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

        this.logger.debug('Destroyed');
    };

    /************** HANDLING SELECTION EVENT *********************/

    Connection.prototype.onSelect = function (multiSelection, callback) {
        this.selected = true;
        this.selectedInMultiSelection = multiSelection;

        callback = callback || this.onRenderCallback;
        if (this.skinParts.path) {  // Only highlight if rendered
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
            callback(this);
        } else {  // Not yet rendered
            this.onRenderCallback = callback;
        }
    };

    Connection.prototype.onDeselect = function (callback) {
        this.selected = false;
        this.selectedInMultiSelection = false;
        this.onRenderCallback = null;

        this._unHighlightPath();
        this._setEditMode(false);
        if (typeof callback === 'function') {
            callback(this);
        }
    };

    Connection.prototype._highlightPath = function () {
        this._createPathShadow(this._pathPoints);

        this.skinParts.pathShadow.attr({opacity: this.designerAttributes.shadowOpacityWhenSelected});
        if (this.skinParts.pathShadowArrowStart) {
            this.skinParts.pathShadowArrowStart.attr({opacity: this.designerAttributes.shadowOpacityWhenSelected});
        }
        if (this.skinParts.pathShadowArrowEnd) {
            this.skinParts.pathShadowArrowEnd.attr({opacity: this.designerAttributes.shadowOpacityWhenSelected});
        }
    };

    Connection.prototype._unHighlightPath = function () {
        if (this.designerAttributes.width < MIN_WIDTH_NOT_TO_NEED_SHADOW) {
            this.skinParts.pathShadow.attr({opacity: this.designerAttributes.shadowOpacity});
            if (this.skinParts.pathShadowArrowStart) {
                this.skinParts.pathShadowArrowStart.attr({opacity: this.designerAttributes.shadowOpacity});
            }
            if (this.skinParts.pathShadowArrowEnd) {
                this.skinParts.pathShadowArrowEnd.attr({opacity: this.designerAttributes.shadowOpacity});
            }
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
            this._pathStartAngle = Math.PI / 2 * Math.abs(dY) / dY;
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
            this._pathEndAngle = Math.atan(dY / dX);
            if (dX < 0) {
                this._pathEndAngle += Math.PI;
            }
        }
    };

    Connection.prototype._createPathShadow = function (segPoints) {
        var shadowArrowStart,
            shadowArrowEnd;

        /*CREATE SHADOW IF NEEDED*/
        if (this.skinParts.pathShadow === undefined || this.skinParts.pathShadow === null) {
            this.skinParts.pathShadow = this.paper.path('M0,0 L1,1');
            this.skinParts.pathShadow.insertBefore(this.skinParts.path);

            $(this.skinParts.pathShadow.node).attr({
                id: DiagramDesignerWidgetConstants.PATH_SHADOW_ID_PREFIX + this.id,
                class: DiagramDesignerWidgetConstants.DESIGNER_CONNECTION_CLASS
            });

            this.skinParts.pathShadow.attr({
                stroke: this.designerAttributes.shadowColor,
                'stroke-width': this.designerAttributes.shadowWidth,
                opacity: this.designerAttributes.shadowOpacity
            });

            if (this.designerAttributes.arrowStart !== CONNECTION_NO_END) {
                this.skinParts.pathShadowArrowStart = this.paper.path('M0,0 L1,1');
                this.skinParts.pathShadowArrowStart.insertBefore(this.skinParts.path);

                $(this.skinParts.pathShadowArrowStart.node).attr({
                    id: DiagramDesignerWidgetConstants.PATH_SHADOW_ARROW_END_ID_PREFIX + this.id,
                    class: DiagramDesignerWidgetConstants.DESIGNER_CONNECTION_CLASS
                });
            } else {
                if (this.skinParts.pathShadowArrowStart) {
                    this.skinParts.pathShadowArrowStart.remove();
                    this.skinParts.pathShadowArrowStart = undefined;
                }
            }

            if (this.designerAttributes.arrowEnd !== CONNECTION_NO_END) {
                this.skinParts.pathShadowArrowEnd = this.paper.path('M0,0 L1,1');
                this.skinParts.pathShadowArrowEnd.insertBefore(this.skinParts.path);

                $(this.skinParts.pathShadowArrowEnd.node).attr({
                    id: DiagramDesignerWidgetConstants.PATH_SHADOW_ARROW_END_ID_PREFIX + this.id,
                    class: DiagramDesignerWidgetConstants.DESIGNER_CONNECTION_CLASS
                });

            } else {
                if (this.skinParts.pathShadowArrowEnd) {
                    this.skinParts.pathShadowArrowEnd.remove();
                    this.skinParts.pathShadowArrowEnd = undefined;
                }
            }

            this._updatePathShadow(segPoints);

            if (this.skinParts.pathShadowArrowStart) {
                shadowArrowStart = this.designerAttributes.arrowStart.replace('inheritance', 'block');

                this.skinParts.pathShadowArrowStart.attr({
                    stroke: this.designerAttributes.shadowColor,
                    'stroke-width': this.designerAttributes.shadowEndArrowWidth,
                    opacity: this.designerAttributes.shadowOpacity,
                    'arrow-start': shadowArrowStart
                });
            }

            if (this.skinParts.pathShadowArrowEnd) {
                shadowArrowEnd = this.designerAttributes.arrowEnd.replace('inheritance', 'block');
                this.skinParts.pathShadowArrowEnd.attr({
                    stroke: this.designerAttributes.shadowColor,
                    'stroke-width': this.designerAttributes.shadowEndArrowWidth,
                    opacity: this.designerAttributes.shadowOpacity,
                    'arrow-end': shadowArrowEnd
                });
            }
        }
    };

    Connection.prototype._updatePathShadow = function (segPoints) {
        var points = [],
            pointsEndArrow = [],
            i,
            len,
            p,
            pathDef = [],
            pathDefArrow = [],
            dx,
            dy,
            eFix,
            eliminatePoints,
            osX,
            osY,
            oeX,
            oeY;

        eFix = function (e) {
            return Math.abs(e) < 0.001 ? 0 : e;
        };

        eliminatePoints = function (points, pointA, pointB, isEnd) {
            var x1 = pointA.x < pointB.x ? pointA.x : pointB.x,
                y1 = pointA.y < pointB.y ? pointA.y : pointB.y,
                x2 = pointA.x > pointB.x ? pointA.x : pointB.x,
                y2 = pointA.y > pointB.y ? pointA.y : pointB.y,
                i,
                j,
                newPoints = [];

            if (isEnd) {
                i = 0;
                j = points.length - 1;
            } else {
                i = 1;
                j = points.length;
                newPoints.push({
                    x: points[0].x,
                    y: points[0].y
                });
            }

            for (; i < j; i += 1) {
                if (points[i].x >= x1 && points[i].x <= x2 &&
                    points[i].y >= y1 && points[i].y <= y2) {
                    //inside the area to eliminate
                    //do not add to result list
                } else {
                    //outside the elimination are, add to list
                    newPoints.push({
                        x: points[i].x,
                        y: points[i].y
                    });
                }
            }

            if (isEnd) {
                newPoints.push({
                    x: points[points.length - 1].x,
                    y: points[points.length - 1].y
                });
            }

            return newPoints;
        };

        //copy over coordinates to prevent them from overwriting
        len = segPoints.length;
        for (i = 0; i < len; i += 1) {
            points.push({x: segPoints[i].x, y: segPoints[i].y});
            pointsEndArrow.push({x: segPoints[i].x, y: segPoints[i].y});
        }

        if (this.designerAttributes.arrowStart !== CONNECTION_NO_END) {
            dx = this.designerAttributes.shadowArrowStartAdjust * Math.cos(this._pathStartAngle);
            dy = this.designerAttributes.shadowArrowStartAdjust * Math.sin(this._pathStartAngle);

            dx = eFix(dx);
            dy = eFix(dy);

            //fix the pathShadow (the one that does not have the end-marker
            if (dx !== 0) {
                osX = points[0].x;
                points[0].x += this.designerAttributes.startArrowMarkerSize / 2 * Math.cos(this._pathStartAngle);
            }

            if (dy !== 0) {
                osY = points[0].y;
                points[0].y += this.designerAttributes.startArrowMarkerSize / 2 * Math.sin(this._pathStartAngle);
            }

            pointsEndArrow[0].x -= dx;
            pointsEndArrow[0].y -= dy;

            if (this.designerAttributes.arrowStart.indexOf('block') !== -1 ||
                this.designerAttributes.arrowStart.indexOf('inheritance') !== -1) {
                if (dx !== 0) {
                    pointsEndArrow[0].x -= SHADOW_MARKER_BLOCK_FIX_OFFSET * (dx / Math.abs(dx));
                }
                if (dy !== 0) {
                    pointsEndArrow[0].y -= SHADOW_MARKER_BLOCK_FIX_OFFSET * (dy / Math.abs(dy));
                }
            }
        }

        if (this.designerAttributes.arrowEnd !== CONNECTION_NO_END) {
            dx = this.designerAttributes.shadowArrowEndAdjust * Math.cos(this._pathEndAngle);
            dy = this.designerAttributes.shadowArrowEndAdjust * Math.sin(this._pathEndAngle);

            dx = eFix(dx);
            dy = eFix(dy);

            //fix the pathShadow (the one that does not have the end-marker
            if (dx !== 0) {
                oeX = points[len - 1].x;
                points[len - 1].x -= this.designerAttributes.endArrowMarkerSize / 2 * Math.cos(this._pathEndAngle);
            }

            if (dy !== 0) {
                oeY = points[len - 1].y;
                points[len - 1].y -= this.designerAttributes.endArrowMarkerSize / 2 * Math.sin(this._pathEndAngle);
            }

            pointsEndArrow[len - 1].x += dx;
            pointsEndArrow[len - 1].y += dy;

            if (this.designerAttributes.arrowEnd.indexOf('block') !== -1 ||
                this.designerAttributes.arrowEnd.indexOf('inheritance') !== -1) {
                if (dx !== 0) {
                    pointsEndArrow[len - 1].x += SHADOW_MARKER_BLOCK_FIX_OFFSET * (dx / Math.abs(dx));
                }
                if (dy !== 0) {
                    pointsEndArrow[len - 1].y += SHADOW_MARKER_BLOCK_FIX_OFFSET * (dy / Math.abs(dy));
                }
            }
        }

        //PATHSHADOW without marker endings
        if (this.designerAttributes.arrowStart !== CONNECTION_NO_END) {
            points = eliminatePoints(points, {x: osX, y: osY}, {x: points[0].x, y: points[0].y}, false);
        }

        if (this.designerAttributes.arrowEnd !== CONNECTION_NO_END) {
            len = points.length;
            points = eliminatePoints(points, {x: oeX, y: oeY}, {
                x: points[len - 1].x,
                y: points[len - 1].y
            }, true);
        }

        //construct the SVG path definition from path-points
        pathDef = this._getPathDefFromPoints(points);
        pathDef = this._jumpOnCrossings(pathDef);
        pathDef = pathDef.join(' ');
        this.skinParts.pathShadow.attr({path: pathDef});

        //MARKER ENDING SHADOWS if needed
        //MARKER ENDING SHADOWS if needed
        if (this.skinParts.pathShadowArrowStart) {
            // PATHSHADOW with END-MARKER
            //1st segment
            pathDefArrow = [];

            dx = this.designerAttributes.shadowStartArrowMarkerSize * Math.cos(this._pathStartAngle);
            dy = this.designerAttributes.shadowStartArrowMarkerSize * Math.sin(this._pathStartAngle);

            p = pointsEndArrow[0];
            pathDefArrow.push('M' + p.x + ',' + p.y);
            pathDefArrow.push('L' + (p.x + dx) + ',' + (p.y + dy));
            pathDefArrow = pathDefArrow.join(' ');
            this.skinParts.pathShadowArrowStart.attr({path: pathDefArrow});
        }

        if (this.skinParts.pathShadowArrowEnd) {
            // PATHSHADOW with END-MARKER
            //last segment
            len = pointsEndArrow.length;
            pathDefArrow = [];

            dx = this.designerAttributes.shadowEndArrowMarkerSize * Math.cos(this._pathEndAngle);
            dy = this.designerAttributes.shadowEndArrowMarkerSize * Math.sin(this._pathEndAngle);

            p = pointsEndArrow[len - 1];

            pathDefArrow.push('M' + (p.x - dx) + ',' + (p.y - dy));
            pathDefArrow.push('L' + p.x + ',' + p.y);
            pathDefArrow = pathDefArrow.join(' ');
            this.skinParts.pathShadowArrowEnd.attr({path: pathDefArrow});
        }
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
            this.skinParts.pathShadow = undefined;
        }

        if (this.skinParts.pathShadowArrowStart) {
            this.skinParts.pathShadowArrowStart.remove();
            this.skinParts.pathShadowArrowStart = undefined;
        }

        if (this.skinParts.pathShadowArrowEnd) {
            this.skinParts.pathShadowArrowEnd.remove();
            this.skinParts.pathShadowArrowEnd = undefined;
        }
    };

    Connection.prototype.showEndReconnectors = function () {
        if (this.reconnectable) {
            //editor handle at src
            this.skinParts.srcDragPoint = this.skinParts.srcDragPoint || $('<div/>', {
                'data-end': DiagramDesignerWidgetConstants.CONNECTION_END_SRC,
                'data-id': this.id,
                class: DiagramDesignerWidgetConstants.CONNECTION_DRAGGABLE_END_CLASS + ' ' +
                DiagramDesignerWidgetConstants.CONNECTION_END_SRC
            });
            this.skinParts.srcDragPoint.html('S');

            this.skinParts.srcDragPoint.css({
                position: 'absolute',
                top: this.sourceCoordinates.y,
                left: this.sourceCoordinates.x
            });

            this.diagramDesigner.skinParts.$itemsContainer.append(this.skinParts.srcDragPoint);


            this.skinParts.dstDragPoint = this.skinParts.dstDragPoint || $('<div/>', {
                'data-end': DiagramDesignerWidgetConstants.CONNECTION_END_DST,
                'data-id': this.id,
                class: DiagramDesignerWidgetConstants.CONNECTION_DRAGGABLE_END_CLASS + ' ' +
                DiagramDesignerWidgetConstants.CONNECTION_END_DST
            });
            this.skinParts.dstDragPoint.html('D');

            this.skinParts.dstDragPoint.css({
                position: 'absolute',
                top: this.endCoordinates.y,
                left: this.endCoordinates.x
            });

            this.diagramDesigner.skinParts.$itemsContainer.append(this.skinParts.dstDragPoint);

            //resize connectors to connection width
            var scale = Math.max(1, this.designerAttributes.width / 10); //10px is the width of the connector end
            this.skinParts.srcDragPoint.css('transform', 'scale(' + scale + ',' + scale + ')');
            this.skinParts.dstDragPoint.css('transform', 'scale(' + scale + ',' + scale + ')');
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
                if (sIt < segmentPointsLen && this._isSamePoint(routingPoints[rIt], {
                        x: this.segmentPoints[sIt][0],
                        y: this.segmentPoints[sIt][1]
                    })) {
                    //found the end of a segment
                    pathSegmentPoints.push([this.segmentPoints[sIt][0], this.segmentPoints[sIt][1],
                        this.segmentPoints[sIt][2], this.segmentPoints[sIt][3]]);

                    //create segment
                    this._createEditSegment(pathSegmentPoints, pNum);

                    //increase segment point counter
                    sIt += 1;

                    //increase path counter
                    pNum += 1;

                    //start new pathSegmentPoint list
                    pathSegmentPoints = [];
                    pathSegmentPoints.push([this.segmentPoints[sIt - 1][0], this.segmentPoints[sIt - 1][1],
                        this.segmentPoints[sIt - 1][2], this.segmentPoints[sIt - 1][3]]);
                } else {
                    pathSegmentPoints.push([routingPoints[rIt].x, routingPoints[rIt].y, 0, 0]);
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

        while (len--) {
            this._connectionEditSegments[len].destroy();
        }

        this._connectionEditSegments = [];
    };

    Connection.prototype._createEditSegment = function (points, num) {
        var segment;

        this.logger.debug('_createEditSegment: #' + num + ', ' + JSON.stringify(points));

        segment = new ConnectionEditSegment({
            connection: this,
            id: num,
            points: points
        });

        this._connectionEditSegments.push(segment);
    };

    Connection.prototype.addSegmentPoint = function (idx, x, y, cx, cy) {
        var d = [x, y, cx, cy],
            newSegmentPoints = this.segmentPoints.slice(0);

        newSegmentPoints.splice(idx, 0, d);

        this.diagramDesigner.onConnectionSegmentPointsChange({
            connectionID: this.id,
            points: newSegmentPoints
        });
    };

    Connection.prototype.removeSegmentPoint = function (idx) {
        var newSegmentPoints = this.segmentPoints.slice(0);

        newSegmentPoints.splice(idx, 1);

        this.diagramDesigner.onConnectionSegmentPointsChange({
            connectionID: this.id,
            points: newSegmentPoints
        });
    };

    Connection.prototype.setSegmentPoint = function (idx, x, y, cx, cy) {
        var d = [x, y, cx, cy],
            newSegmentPoints = this.segmentPoints.slice(0);

        newSegmentPoints[idx] = d;

        this.diagramDesigner.onConnectionSegmentPointsChange({
            connectionID: this.id,
            points: newSegmentPoints
        });
    };

    /********************** SEGMENT POINT MARKERS ******************************/
    Connection.prototype._showSegmentPoints = function () {
        var len = this.segmentPoints.length,
            i = len,
            marker,
            pointsLastIdx = this._pathPoints.length - 1;

        this._hideSegmentPoints();

        while (i--) {
            marker = new ConnectionSegmentPoint({
                connection: this,
                id: i,
                point: this.segmentPoints[i],
                pointAfter: i === len - 1 ? [this._pathPoints[pointsLastIdx].x,
                    this._pathPoints[pointsLastIdx].y, 0, 0] : this.segmentPoints[i + 1],
                pointBefore: i === 0 ?
                    [this._pathPoints[0].x, this._pathPoints[0].y, 0, 0] : this.segmentPoints[i - 1]
            });

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
        var shadowArrowStart,
            shadowArrowEnd;

        //read props coming from the DataBase or DiagramDesigner
        this._initializeConnectionProps(objDescriptor);

        //update path itself
        if (this.skinParts.path) {
            this.skinParts.path.attr({
                'arrow-start': this.designerAttributes.arrowStart,
                'arrow-end': this.designerAttributes.arrowEnd,
                stroke: this.designerAttributes.color,
                'stroke-width': this.designerAttributes.width,
                'stroke-dasharray': this.designerAttributes.pattern
            });
        }

        if (this.skinParts.pathShadow) {
            this._updatePathShadow(this._pathPoints);
            this.skinParts.pathShadow.attr({'stroke-width': this.designerAttributes.shadowWidth});
        }

        if (this.skinParts.pathShadowArrowStart) {
            shadowArrowStart = this.designerAttributes.arrowStart.replace('inheritance', 'block');

            this.skinParts.pathShadowArrowStart.attr({
                'stroke-width': this.designerAttributes.shadowEndArrowWidth,
                'arrow-start': shadowArrowStart
            });
        }

        if (this.skinParts.pathShadowArrowEnd) {
            shadowArrowEnd = this.designerAttributes.arrowEnd.replace('inheritance', 'block');

            this.skinParts.pathShadowArrowEnd.attr({
                'stroke-width': this.designerAttributes.shadowEndArrowWidth,
                'arrow-end': shadowArrowEnd
            });
        }

        if (this.skinParts.name) {
            this.skinParts.name.css({color: this.designerAttributes.color});
        }

        if (this.skinParts.srcText) {
            this.skinParts.srcText.css({color: this.designerAttributes.color});
        }

        if (this.skinParts.dstText) {
            this.skinParts.dstText.css({color: this.designerAttributes.color});
        }
    };


    Connection.prototype.getConnectionAreas = function (/*id, isEnd*/) {
        var result = [],
            AREA_SIZE = 0,
            w = 0,
            h = 0,
            dx = 0,
            dy = 0,
            pos;

        if (this.skinParts.path) {
            pos = this._getMidPoint();

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
            result.push({
                id: '0',
                x1: pos.x - dx,
                y1: pos.y - dy,
                x2: pos.x - dx + w,
                y2: pos.y - dy + h,
                angle1: 0,
                angle2: 360,
                len: 0
            });
        }


        return result;
    };

    Connection.prototype.showSourceConnectors = function (/*params*/) {
    };

    Connection.prototype.hideSourceConnectors = function () {
    };

    Connection.prototype.showEndConnectors = function () {
        this._connectionConnector = this._connectionConnector ||
        $('<div/>', {class: 'connector connection-connector'});

        this._connectionConnector.attr(DiagramDesignerWidgetConstants.DATA_ITEM_ID, this.id);

        this.diagramDesigner.skinParts.$itemsContainer.append(this._connectionConnector);

        var pos = this._getMidPoint();

        this._connectionConnector.css({
            left: pos.x,
            top: pos.y
        });
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
            var pos = this._getMidPoint();

            this._connectionAreaMarker = $('<div/>', {class: 'c-area'});
            this.diagramDesigner.skinParts.$itemsContainer.append(this._connectionAreaMarker);

            this._connectionAreaMarker.css({
                top: pos.y,
                left: pos.x
            });
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

    Connection.prototype._getMidPoint = function () {
        var len = 0,
            segmentsEnds = [],
            midLen = 0,
            alphaRad,
            point,
            i;

        function euclideanDistance(p1, p2) {
            return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        }

        if (this.isBezier) {
            len = this.skinParts.path.getTotalLength();
            point = this.skinParts.path.getPointAtLength(len / 2);
        } else {
            point = {
                x: 0,
                y: 0,
                alpha: 0
            };

            for (i = 0; i < this._pathPoints.length - 1; i += 1) {
                len += euclideanDistance(this._pathPoints[i], this._pathPoints[i + 1]);
                segmentsEnds.push(len);
            }

            midLen = len / 2;
            for (i = 0; i < segmentsEnds.length; i += 1) {
                if (segmentsEnds[i] >= midLen) {

                    point.alpha = this._calculateSteep(this._pathPoints[i], this._pathPoints[i + 1]);
                    alphaRad = point.alpha * (Math.PI / 180);
                    // Get the relative length from point at i
                    if (i > 0) {
                        midLen -= segmentsEnds[i - 1];
                    }

                    point.x = this._pathPoints[i].x + midLen * Math.cos(alphaRad);
                    point.y = this._pathPoints[i].y + midLen * Math.sin(alphaRad);

                    break;
                }
            }
        }

        return point;
    };

    Connection.prototype._renderTexts = function () {
        var self = this,
            TEXT_OFFSET = 5;

        this._hideTexts();

        function drawName() {
            var pathCenter = self._getMidPoint();

            self.skinParts.name = self._textNameBase.clone();
            self.skinParts.name.css({
                top: pathCenter.y - 2 + self.designerAttributes.width,
                left: pathCenter.x,
                color: self.designerAttributes.color
            });
            self.skinParts.name.find('span').text(self.name);
            self.skinParts.textContainer.append(self.skinParts.name);
            $(self.diagramDesigner.skinParts.$itemsContainer.children()[0]).after(self.skinParts.textContainer);

            if ((pathCenter.alpha >= 45 && pathCenter.alpha <= 135) ||
                (pathCenter.alpha >= 225 && pathCenter.alpha <= 315)) {
                self.skinParts.name.find('span').addClass('v');
            }

            // set title editable on double-click
            self.skinParts.name.find('span').on('dblclick.editOnDblClick', null, function (event) {
                if (self.nameEdit === true && self.diagramDesigner.getIsReadOnlyMode() !== true) {
                    $(this).editInPlace({
                        class: '',
                        onChange: function (oldValue, newValue) {
                            self._onNameChanged(oldValue, newValue);
                        }
                    });
                }
                event.stopPropagation();
                event.preventDefault();
            });
        }

        function drawSrc() {
            var alphaBegin = self._calculateSteep(self._pathPoints[0], self._pathPoints[1]);

            self.skinParts.srcText = self._textSrcBase.clone();
            self.skinParts.srcText.find('span').text(self.srcText);
            self.skinParts.textContainer.append(self.skinParts.srcText);
            $(self.diagramDesigner.skinParts.$itemsContainer.children()[0]).after(self.skinParts.textContainer);

            var dx = self.designerAttributes.width,
                dy = self.designerAttributes.width;

            if (alphaBegin >= 0 && alphaBegin <= 45) {
                dx = TEXT_OFFSET;
                dy *= -1;
            } else if (alphaBegin > 45 && alphaBegin <= 90) {
                dx = TEXT_OFFSET;
                dy = TEXT_OFFSET;
            } else if (alphaBegin > 90 && alphaBegin <= 135) {
                dx = -1 * self.skinParts.srcText.width() - TEXT_OFFSET;
                dy = TEXT_OFFSET;
            } else if (alphaBegin > 135 && alphaBegin <= 180) {
                dx = -1 * self.skinParts.srcText.width() - TEXT_OFFSET;
            } else if (alphaBegin > 180 && alphaBegin <= 225) {
                dx = -1 * self.skinParts.srcText.width() - TEXT_OFFSET;
                dy *= -1;
            } else if (alphaBegin > 225 && alphaBegin <= 270) {
                dx = -1 * self.skinParts.srcText.width() - TEXT_OFFSET;
                dy = -4 * TEXT_OFFSET;
            } else if (alphaBegin > 270 && alphaBegin <= 315) {
                dx = TEXT_OFFSET;
                dy = -4 * TEXT_OFFSET;
            } else if (alphaBegin > 315 && alphaBegin <= 360) {
                dy = -4 * TEXT_OFFSET;
                dx = TEXT_OFFSET;
            }

            self.skinParts.srcText.css({
                top: self._pathPoints[0].y + dy,
                left: self._pathPoints[0].x + dx,
                color: self.designerAttributes.color
            });

            // set title editable on double-click
            self.skinParts.srcText.find('span').on('dblclick.editOnDblClick', null, function (event) {
                if (self.srcTextEdit === true && self.diagramDesigner.getIsReadOnlyMode() !== true) {
                    $(this).editInPlace({
                        class: '',
                        onChange: function (oldValue, newValue) {
                            self._onSrcTextChanged(oldValue, newValue);
                        }
                    });
                }
                event.stopPropagation();
                event.preventDefault();
            });
        }

        function drawEnd() {
            var len = self._pathPoints.length,
                alphaEnd = self._calculateSteep(self._pathPoints[len - 2], self._pathPoints[len - 1]),
                dx = self.designerAttributes.width,
                dy = self.designerAttributes.width;

            self.skinParts.dstText = self._textDstBase.clone();
            self.skinParts.dstText.find('span').text(self.dstText);
            self.skinParts.textContainer.append(self.skinParts.dstText);
            $(self.diagramDesigner.skinParts.$itemsContainer.children()[0]).after(self.skinParts.textContainer);

            if (alphaEnd === 0) {
                dx = -1 * self.skinParts.dstText.width() - TEXT_OFFSET;
                dy *= -1;
            } else if (alphaEnd > 0 && alphaEnd <= 45) {
                dx = -1 * self.skinParts.dstText.width() - TEXT_OFFSET;
                dy = -4 * TEXT_OFFSET;
            } else if (alphaEnd > 45 && alphaEnd <= 90) {
                dx = -1 * self.skinParts.dstText.width() - TEXT_OFFSET;
                dy = -4 * TEXT_OFFSET;
            } else if (alphaEnd > 90 && alphaEnd <= 135) {
                dx = TEXT_OFFSET;
                dy = -4 * TEXT_OFFSET;
            } else if (alphaEnd > 135 && alphaEnd <= 180) {
                dy = -4 * TEXT_OFFSET;
                dx = TEXT_OFFSET;
            } else if (alphaEnd > 180 && alphaEnd <= 225) {
                dx = TEXT_OFFSET;
                dy = -4 * TEXT_OFFSET;
            } else if (alphaEnd > 225 && alphaEnd <= 270) {
                dx = TEXT_OFFSET;
                dy *= -1;
            } else if (alphaEnd > 270 && alphaEnd <= 315) {
                dy = TEXT_OFFSET;
                dx = -1 * self.skinParts.dstText.width() - TEXT_OFFSET;
            } else if (alphaEnd > 315 && alphaEnd <= 360) {
                dx = -1 * self.skinParts.dstText.width() - TEXT_OFFSET;
            }

            self.skinParts.dstText.css({
                top: self._pathPoints[len - 1].y + dy,
                left: self._pathPoints[len - 1].x + dx,
                color: self.designerAttributes.color
            });

            // set title editable on double-click
            self.skinParts.dstText.find('span').on('dblclick.editOnDblClick', null, function (event) {
                if (self.dstTextEdit === true && self.diagramDesigner.getIsReadOnlyMode() !== true) {
                    $(this).editInPlace({
                        class: '',
                        onChange: function (oldValue, newValue) {
                            self._onDstTextChanged(oldValue, newValue);
                        }
                    });
                }
                event.stopPropagation();
                event.preventDefault();
            });
        }

        if (!(this.name || this.srcText || this.dstText)) {
            return;
        }

        this.skinParts.textContainer = this._textContainer.clone();
        this.skinParts.textContainer.attr('id', TEXT_ID_PREFIX + this.id);

        if (this.name) {
            drawName();
        }

        if (this.srcText) {
            drawSrc();
        }

        if (this.dstText) {
            drawEnd();
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
            alpha = Math.PI / 2 * Math.abs(dY) / dY;
        } else {
            alpha = Math.atan(dY / dX);
            if (dX < 0) {
                alpha += Math.PI;
            }
        }

        if (alpha < 0) {
            alpha += Math.PI * 2;
        }

        alpha = alpha * (180 / Math.PI);

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

    Connection.prototype.updateTexts = function (newTexts) {
        this.srcText = newTexts.srcText || this.srcText;
        this.dstText = newTexts.dstText || this.dstText;
        this.name = newTexts.name || this.name;
        this.nameEdit = newTexts.nameEdit || this.nameEdit;
        this.srcTextEdit = newTexts.srcTextEdit || this.srcTextEdit;
        this.dstTextEdit = newTexts.dstTextEdit || this.dstTextEdit;

        this._renderTexts();
    };

    Connection.prototype._jumpOnCrossings = function (pathDefArray) {
        var connectionIDs,
            selfIdx,
            len,
            otherConn,
            items = this.diagramDesigner.items,
            intersections = {},
            intersectionSegments = [],
            xingWithOther,
            resultPathDefArray = [],
            i,
            xingDesc,
            segmentXings,
            segmentLength,
            pixDiffPercentage,
            pointBefore,
            pointAfter,
            atLength,
            xingCurve,
            resultIntersectionPathDefs = {},
            segNum,
            j,
            xRadius,
            sweepFlag,
            hDir,
            vDir;

        //no jumps if not set by DiagramDesigner or Bezier curve
        if (this.diagramDesigner._connectionJumpXing !== true || this.isBezier === true) {
            return pathDefArray;
        }

        connectionIDs = this.diagramDesigner.connectionIds.slice(0).sort();
        selfIdx = connectionIDs.indexOf(this.id);
        connectionIDs.splice(selfIdx);
        len = connectionIDs.length;

        while (len--) {
            otherConn = items[connectionIDs[len]];
            if (otherConn.isBezier === false) {
                xingWithOther = this._pathIntersect(otherConn);
                if (xingWithOther && xingWithOther.length > 0) {
                    for (i = 0; i < xingWithOther.length; i += 1) {
                        xingDesc = xingWithOther[i];
                        intersections[xingDesc.segment1] = intersections[xingDesc.segment1] || [];
                        intersections[xingDesc.segment1].push({
                            xy: [xingDesc.x, xingDesc.y],
                            t: xingDesc.t1,
                            path: xingDesc.path1,
                            length: xingDesc.segment1Length,
                            otherWidth: otherConn.designerAttributes.width
                        });
                        if (intersectionSegments.indexOf(xingDesc.segment1) === -1) {
                            intersectionSegments.push(xingDesc.segment1);
                        }
                    }
                }
            }
        }

        //we got all the intersections of this path with everybody else
        intersectionSegments.sort(function (a, b) {
            return a - b;
        });
        for (len = 0; len < intersectionSegments.length; len += 1) {
            segNum = intersectionSegments[len];
            segmentXings = intersections[segNum];

            for (i = 0; i < segmentXings.length; i += 1) {
                resultIntersectionPathDefs[segNum] = resultIntersectionPathDefs[segNum] || {
                    t: [],
                    paths: {},
                    segmentLength: segmentXings[i].length,
                    xings: {},
                    sweepFlag: 0
                };

                xRadius = Math.max(this.designerAttributes.width, segmentXings[i].otherWidth) + JUMP_XING_RADIUS;

                segmentLength = segmentXings[i].length;
                pixDiffPercentage = xRadius / segmentLength;

                atLength = segmentXings[i].t - pixDiffPercentage;
                if (atLength < 0) {
                    atLength = 0;
                }
                pointBefore = this._getPointAtLength(segmentXings[i].path[0], segmentXings[i].path[1],
                    segmentXings[i].path[2], segmentXings[i].path[3], atLength * segmentLength);

                atLength = segmentXings[i].t + pixDiffPercentage;
                if (atLength > 1) {
                    atLength = 1;
                }
                pointAfter = this._getPointAtLength(segmentXings[i].path[0], segmentXings[i].path[1],
                    segmentXings[i].path[2], segmentXings[i].path[3], atLength * segmentLength);

                vDir = segmentXings[i].path[3] - segmentXings[i].path[1];
                if (vDir !== 0) {
                    vDir = vDir / Math.abs(vDir);
                }

                hDir = segmentXings[i].path[2] - segmentXings[i].path[0];
                if (hDir !== 0) {
                    hDir = hDir / Math.abs(hDir);
                }

                if (hDir > 0) {
                    //going from left to right
                    sweepFlag = 1;
                } else if (hDir === 0) {
                    //vertical line
                    if (vDir > 0) {
                        //going from top to bottom
                        sweepFlag = 1;
                    } else {
                        sweepFlag = 0;
                    }
                } else {
                    //going from right to left
                    sweepFlag = 0;
                }

                xingCurve = 'L' + pointBefore.x + ',' + pointBefore.y + 'A' + xRadius + ',' + xRadius + ' 0 0,' +
                sweepFlag + ' ' + pointAfter.x + ',' + pointAfter.y;

                resultIntersectionPathDefs[segNum].t.push(segmentXings[i].t);
                resultIntersectionPathDefs[segNum].paths[segmentXings[i].t] = xingCurve;
                resultIntersectionPathDefs[segNum].xings[segmentXings[i].t] = {
                    pointBefore: pointBefore,
                    pointAfter: pointAfter,
                    xRadius: xRadius
                };
                resultIntersectionPathDefs[segNum].sweepFlag = sweepFlag;
            }

            //simplify bumps if they overlap
            //order based on t
            resultIntersectionPathDefs[segNum].t.sort(function (a, b) {
                return a - b;
            });

            segmentLength = resultIntersectionPathDefs[segNum].segmentLength;
            sweepFlag = resultIntersectionPathDefs[segNum].sweepFlag;

            for (j = 0; j < resultIntersectionPathDefs[segNum].t.length - 1; j += 1) {
                var t = resultIntersectionPathDefs[segNum].t[j];
                var t1 = resultIntersectionPathDefs[segNum].t[j + 1];
                var xing = resultIntersectionPathDefs[segNum].xings[t];
                var xing1 = resultIntersectionPathDefs[segNum].xings[t1];

                if (this._checkIntersect(xing.pointBefore.x, xing.pointBefore.y,
                        xing.pointAfter.x, xing.pointAfter.y,
                        xing1.pointBefore.x, xing1.pointBefore.y,
                        xing1.pointAfter.x, xing1.pointAfter.y)) {
                    xRadius = Math.max(xing.xRadius, xing1.xRadius);

                    xingCurve = 'L' + xing.pointBefore.x + ',' + xing.pointBefore.y + 'A' + xRadius + ',' + xRadius +
                    ' 0 0,' + sweepFlag + ' ' + xing1.pointAfter.x + ',' + xing1.pointAfter.y;

                    //try to not draw a huge arc, more like a small arc and a path inbetween - doesn't look that good
                    /*
                    var totalLength = Math.sqrt((xing1.pointAfter.x - xing.pointBefore.x) *
                    (xing1.pointAfter.x - xing.pointBefore.x) + (xing1.pointAfter.y - xing.pointBefore.y) *
                    (xing1.pointAfter.y - xing.pointBefore.y));
                     var c1 = this._getPointAtLength(xing.pointBefore.x, xing.pointBefore.y, xing1.pointAfter.x,
                     xing1.pointAfter.y, xRadius);
                     var c2 = this._getPointAtLength(xing.pointBefore.x, xing.pointBefore.y, xing1.pointAfter.x,
                     xing1.pointAfter.y, totalLength - xRadius);

                     var ddx = c1.x - xing.pointBefore.x;
                     var ddy = c1.y - xing.pointBefore.y;
                     xingCurve = 'L' + xing.pointBefore.x + ',' + xing.pointBefore.y + 'A' + xRadius + ',' + xRadius +
                      ' 0 0,' + sweepFlag + ' ' + (c1.x + ddy) + ',' + (c1.y + ddx);

                     ddx = xing1.pointAfter.x - c2.x;
                     ddy = xing1.pointAfter.y - c2.y;
                     xingCurve += ' L' + (c2.x + ddy) + ',' + (c2.y + ddx) + 'A' + xRadius + ',' + xRadius + ' 0 0,' +
                      sweepFlag + ' ' + xing1.pointAfter.x + ',' + xing1.pointAfter.y;
                      */

                    resultIntersectionPathDefs[segNum].paths[t] = xingCurve;

                    resultIntersectionPathDefs[segNum].xings[t] = {
                        pointBefore: xing.pointBefore,
                        pointAfter: xing1.pointAfter,
                        xRadius: xRadius
                    };

                    resultIntersectionPathDefs[segNum].t.splice(j + 1, 1);

                    j -= 1;
                }
            }

            //END OF --- simplify bumps if they overlap
        }

        //the first entry is the M x,y, it goes unchanged
        resultPathDefArray.push(pathDefArray[0]);

        len = pathDefArray.length;

        for (i = 1; i < len; i += 1) {
            //i is the segment number
            segNum = i.toString();
            //if resultIntersectionPathDefs[i] exist, use those
            //otherwise pick the corresponding value from the original array
            if (resultIntersectionPathDefs.hasOwnProperty(segNum)) {
                resultIntersectionPathDefs[segNum].t.sort(function (a, b) {
                    return a - b;
                });

                for (j = 0; j < resultIntersectionPathDefs[segNum].t.length; j += 1) {
                    resultPathDefArray.push(resultIntersectionPathDefs[segNum]
                        .paths[resultIntersectionPathDefs[segNum].t[j]]);
                }
            }

            resultPathDefArray.push(pathDefArray[i]);
        }

        return resultPathDefArray;
    };

    //finds all intersection points of this connection with other connection's pathpoints
    Connection.prototype._pathIntersect = function (otherConn) {
        var myPathPoints = this._pathPoints,
            oPathPoints = otherConn._pathPoints,
            p1len = myPathPoints.length,
            p2len = oPathPoints.length,
            s1, s2,
            i,
            j,
            res = [],
            intr,
            s1Length,
            s2Length,
            tLength;

        if (clientUtil.overlap(this._pathPointsBBox, otherConn._pathPointsBBox)) {
            for (i = 0; i < p1len - 1; i += 1) {
                s1 = {
                    x1: myPathPoints[i].x,
                    y1: myPathPoints[i].y,
                    x2: myPathPoints[i + 1].x,
                    y2: myPathPoints[i + 1].y
                };

                s1Length = Math.sqrt((s1.x2 - s1.x1) * (s1.x2 - s1.x1) + (s1.y2 - s1.y1) * (s1.y2 - s1.y1));

                for (j = 0; j < p2len - 1; j += 1) {
                    s2 = {
                        x1: oPathPoints[j].x,
                        y1: oPathPoints[j].y,
                        x2: oPathPoints[j + 1].x,
                        y2: oPathPoints[j + 1].y
                    };

                    s2Length = Math.sqrt((s2.x2 - s2.x1) * (s2.x2 - s2.x1) + (s2.y2 - s2.y1) * (s2.y2 - s2.y1));

                    intr = this._getIntersect(s1.x1, s1.y1, s1.x2, s1.y2, s2.x1, s2.y1, s2.x2, s2.y2);
                    if (intr) {
                        intr.segment1 = i + 1;
                        intr.segment2 = j + 1;
                        intr.segment1Length = s1Length;
                        intr.segment2Length = s2Length;
                        intr.path1 = [s1.x1, s1.y1, s1.x2, s1.y2];
                        intr.path2 = [s2.x1, s2.y1, s2.x2, s2.y2];

                        tLength = Math.sqrt((intr.x - s1.x1) * (intr.x - s1.x1) + (intr.y - s1.y1) * (intr.y - s1.y1));
                        intr.t1 = tLength / s1Length;

                        tLength = Math.sqrt((intr.x - s2.x1) * (intr.x - s2.x1) + (intr.y - s2.y1) * (intr.y - s2.y1));
                        intr.t2 = tLength / s2Length;

                        res.push(intr);
                    }
                }
            }
        }

        return res;
    };

    //finds an intersection point of two segments A:(x1,y1 - x2,y2) and B:(x3,y3 - x4,y4)
    Connection.prototype._getIntersect = function (x1, y1, x2, y2, x3, y3, x4, y4) {
        var mmax = Math.max,
            mmin = Math.min;

        if (
            mmax(x1, x2) < mmin(x3, x4) ||
            mmin(x1, x2) > mmax(x3, x4) ||
            mmax(y1, y2) < mmin(y3, y4) ||
            mmin(y1, y2) > mmax(y3, y4)
        ) {
            return;
        }
        var nx = (x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4),
            ny = (x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4),
            denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

        if (!denominator) {
            return;
        }
        var px = nx / denominator,
            py = ny / denominator,
            px2 = +px.toFixed(2),
            py2 = +py.toFixed(2);
        if (
            px2 < +mmin(x1, x2).toFixed(2) ||
            px2 > +mmax(x1, x2).toFixed(2) ||
            px2 < +mmin(x3, x4).toFixed(2) ||
            px2 > +mmax(x3, x4).toFixed(2) ||
            py2 < +mmin(y1, y2).toFixed(2) ||
            py2 > +mmax(y1, y2).toFixed(2) ||
            py2 < +mmin(y3, y4).toFixed(2) ||
            py2 > +mmax(y3, y4).toFixed(2)
        ) {
            return;
        }
        return {x: px, y: py};
    };

    Connection.prototype._checkIntersect = function (x1, y1, x2, y2, x3, y3, x4, y4) {
        var mmax = Math.max,
            mmin = Math.min;

        if (
            mmax(x1, x2) < mmin(x3, x4) ||
            mmin(x1, x2) > mmax(x3, x4) ||
            mmax(y1, y2) < mmin(y3, y4) ||
            mmin(y1, y2) > mmax(y3, y4)
        ) {
            return;
        }

        return true;
    };

    Connection.prototype._getPointAtLength = function (x1, y1, x2, y2, length) {
        var totalLength = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)),
            dx = (x2 - x1) / totalLength,
            dy = (y2 - y1) / totalLength;

        return {
            x: x1 + dx * length,
            y: y1 + dy * length
        };
    };

    Connection.prototype._simplifyTrivially = function (pathPoints) {
        //eliminate the middle point if 3 consecutive point are on the same line
        var pos = 1,
            p1,
            p2,
            p3,
            dx1,
            dx2,
            dy1,
            dy2,
            a12,
            a23;

        while (pos < pathPoints.length - 1) {
            p1 = pathPoints[pos - 1];
            p2 = pathPoints[pos];
            p3 = pathPoints[pos + 1];

            //calculate p1 - p2 alpha
            dx1 = p2.x - p1.x;
            dy1 = p2.y - p1.y;
            a12 = dx1 === 0 ? (dy1 > 0 ? Math.PI / 2 : Math.PI / 2 * 3) : Math.atan(dy1 / dx1);

            //calculate p2 - p3 alpha
            dx2 = p3.x - p2.x;
            dy2 = p3.y - p2.y;
            a23 = dx2 === 0 ? (dy2 > 0 ? Math.PI / 2 : Math.PI / 2 * 3) : Math.atan(dy2 / dx2);

            if (a12 === a23) {
                //the two segments have the same steep
                //p2 can be omitted
                pathPoints.splice(pos, 1);
            } else {
                pos += 1;
            }
        }
    };

    /***************************** CONNECTION'S META INFO **************************/
    Connection.prototype.setMetaInfo = function (params) {
        this._metaInfo = params;
    };

    Connection.prototype.getMetaInfo = function () {
        return this._metaInfo;
    };
    /***************************** END OF --- CONNECTION'S META INFO **************************/

    Connection.prototype._getPathDefFromPoints = function (points) {
        var pathDef = [],
            p,
            i,
            len,
            segmentPoints = this.segmentPoints,
            sIdx = 0,
            pcX = 0,
            pcY = 0,
            cX = 0,
            cY = 0,
            pp;

        //non-edit mode, one path builds the connection
        p = points[0];
        pathDef.push('M' + p.x + ',' + p.y);
        pp = points[0];

        //fix the counter to start from the second point in the list
        len = points.length;
        for (i = 1; i < len; i += 1) {
            p = points[i];
            if (this.isBezier === false) {
                pathDef.push('L' + p.x + ',' + p.y);
            } else {
                //draw a Quadratic Bezier path
                //if the next point is a user defined segment point, use it's control points
                if (segmentPoints.length > 0 &&
                    segmentPoints.length > sIdx &&
                    this._isSamePoint(p, {x: segmentPoints[sIdx][0], y: segmentPoints[sIdx][1]})) {
                    cX = segmentPoints[sIdx][2];
                    cY = segmentPoints[sIdx][3];
                    sIdx += 1;
                } else {
                    // If the segment point is introduced by the routing algorithm but not defined by the user,
                    // it has no control point values.
                    cX = 0;
                    cY = 0;
                }

                //C x1,y1 x2,y2 x,y
                //draws a quadratic Bezier from the current point via control points x1,y1 and x2,y2 to x,y
                pathDef.push('C' + (pp.x + pcX) + ',' + (pp.y + pcY) + ' ' + (p.x - cX) + ',' + (p.y - cY) + ' ' +
                p.x + ',' + p.y);

                pp = p;
                pcX = cX;
                pcY = cY;
            }
        }

        return pathDef;
    };

    return Connection;
});
