"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'bezierHelper',
    './ConnectionSegmentPoint.js',
    './ConnectionSegment.js',
    './ConnectionSegmentLine.js',
    './ConnectionSegmentBezier.js',
    'raphaeljs',
    'css!ModelEditor2CSS/ConnectionComponent'], function (logManager,
                                         util,
                                         commonUtil,
                                         bezierHelper,
                                         ConnectionSegmentPoint,
                                         ConnectionSegment,
                                         connectionSegmentLine,
                                         connectionSegmentBezier) {

    var ModelEditorConnectionComponent;

    ModelEditorConnectionComponent = function (objId) {
        this._guid = objId;

        this._logger = logManager.create("ConnectionComponent_" + this._guid);
        this._logger.debug("Created");

    };

    ModelEditorConnectionComponent.prototype._DOMBase = $('<div/>').attr({ "class": "connection" });

    ModelEditorConnectionComponent.prototype._initialize = function (objDescriptor) {
        var self = this;

        /*MODELEDITORCONNECTION CONSTANTS*/
        this._parentView = objDescriptor.modelEditorView;
        this._paper = objDescriptor.svgPaper;

        this._segmentPoints = [];

        this._sourceCoordinates = null;
        this._targetCoordinates = null;

        this._sourceComponentId = null;
        this._targetComponentId = null;

        this._editParams = { "editMode": false,
                                "color": "#0000FF" };

        this._skinParts = {};
        this._skinParts.editSegments = [];

        this._pathAttributes = {};
        /*MODELEDITORCONNECTION CONSTANTS*/


        //read props coming from the DataBase or ModelEditor
        this._initializeConnectionProps(objDescriptor);

        //generate skin DOM and cache it
        this.el = this._DOMBase.clone();
        this.el.attr({"id": this._guid});

        this._zIndex = 8;

        this.el.css({ "position": "absolute",
            "background-color": "rgba(0, 0, 0, 0)",
            "left": 0,
            "top": 0,
            "z-index": this._zIndex,
            "width": 0,
            "height": 0,
            "display": "none"});

        this._skinParts.path = this._paper.path("M0,0L1,0");
        //this._skinParts.path.remove();
        this._skinParts.path.attr({ /*"arrow-start": this._pathAttributes.arrowStart,
            "arrow-end": this._pathAttributes.arrowEnd,*/
            "stroke": this._pathAttributes.color,
            "fill": "none",
            "stroke-width": this._pathAttributes.width});

        this._skinParts.pathShadow = this._paper.path("M0,0L1,0");
        //this._skinParts.pathShadow.remove();
        this._skinParts.pathShadow.attr({    "stroke": this._pathAttributes.shadowColor,
            "fill": "none",
            "stroke-width": this._pathAttributes.shadowWidth,
            "opacity": this._pathAttributes.shadowOpacity});

        //put id in the path
        $(this._skinParts.path.node).attr("id", this._guid);
        $(this._skinParts.pathShadow.node).attr("id", "s_" + this._guid);

        //hook up mousedown
        this._skinParts.pathShadow.mousedown(function (event) {
            self._onMouseDown(event);
        });

        this._skinParts.pathShadow.mouseup(function (event) {
            self._onMouseUp(event);
        });

        this._skinParts.pathShadow.dblclick(function (event) {
            self._onDblClick(event);
        });

        this._parentView.connectionInitializationCompleted(this._guid);
    };

    ModelEditorConnectionComponent.prototype._initializeConnectionProps = function (objDescriptor) {
        var i,
            segmentPointList;

        this._name = objDescriptor.name || "";

        this._sourceComponentId = objDescriptor.source;
        this._targetComponentId = objDescriptor.target;

        /*PathAttributes*/
        this._pathAttributes.arrowStart = objDescriptor.arrowStart || "oval";
        this._pathAttributes.arrowEnd = objDescriptor.arrowEnd || "oval";
        this._pathAttributes.color = objDescriptor.color || "#000000";
        this._pathAttributes.width = objDescriptor.width || "2";
        this._pathAttributes.shadowWidth = objDescriptor.shadowWidth || "6";
        this._pathAttributes.shadowOpacity = objDescriptor.shadowOpacity || 0.001;
        this._pathAttributes.shadowOpacitySelected = 0.4;
        this._pathAttributes.shadowColor = objDescriptor.shadowColor || "#52A8EC";
        this._pathAttributes.lineType = objDescriptor.lineType || "L";

        segmentPointList = objDescriptor.segmentPoints;

        //destroy current segment points (if any)
        for (i = 0; i < this._segmentPoints.length; i += 1) {
            this._segmentPoints[i].destroy();
            delete this._segmentPoints[i];
        }
        this._segmentPoints = [];

        //create the new segment point list
        if (segmentPointList) {
            for (i = 0; i < segmentPointList.length; i += 1) {
                this._segmentPoints.push(new ConnectionSegmentPoint({ "x": segmentPointList[i].x,
                                                                    "y": segmentPointList[i].y,
                                                                    "cx": segmentPointList[i].cx,
                                                                    "cy": segmentPointList[i].cy,
                                                                    "raphaelPaper": this._paper,
                                                                    "connection": this,
                                                                    "count": i,
                                                                    "lineType": this._pathAttributes.lineType }));
            }
        }

        for (i = 0; i < this._segmentPoints.length; i += 1) {
            if (i > 0) {
                this._segmentPoints[i].prevSegmentPoint = this._segmentPoints[i - 1];
            } else {
                if (this._sourceCoordinates) {
                    this._segmentPoints[i].prevSegmentPoint = { "x": this._sourceCoordinates.x,
                                                                "y":  this._sourceCoordinates.y };

                    this._adjustNeighbourSegmentPointByEndCoordConnectorLength(this._segmentPoints[i].prevSegmentPoint, this._sourceCoordinates);
                }
            }

            if (i < this._segmentPoints.length - 1) {
                this._segmentPoints[i].nextSegmentPoint = this._segmentPoints[i + 1];
            } else {
                if (this._targetCoordinates) {
                    this._segmentPoints[i].nextSegmentPoint = { "x": this._targetCoordinates.x,
                        "y":  this._targetCoordinates.y };

                    this._adjustNeighbourSegmentPointByEndCoordConnectorLength(this._segmentPoints[i].nextSegmentPoint, this._targetCoordinates);
                }
            }
        }
    };

    ModelEditorConnectionComponent.prototype._adjustNeighbourSegmentPointByEndCoordConnectorLength = function (nSegmentPoint, endCoord) {
        if (endCoord.hasOwnProperty("connectorLength")) {
            switch (endCoord.dir) {
            case "N":
                nSegmentPoint.y -= endCoord.connectorLength;
                break;
            case "S":
                nSegmentPoint.y += endCoord.connectorLength;
                break;
            case "E":
                nSegmentPoint.x += endCoord.connectorLength;
                break;
            case "W":
                nSegmentPoint.x -= endCoord.connectorLength;
                break;
            default:
                break;
            }
        }
    };

    ModelEditorConnectionComponent.prototype._onMouseDown = function (event) {
        event.stopPropagation();
        //event.preventDefault();
        this._parentView.onComponentMouseDown(event, this._guid);
    };

    ModelEditorConnectionComponent.prototype._onMouseUp = function (event) {
        this._parentView.onComponentMouseUp(event, this._guid);
//        event.stopPropagation();
    };

    ModelEditorConnectionComponent.prototype._onDblClick = function (event) {
        event.stopPropagation();
        event.preventDefault();
        this._parentView.onComponentDblClick(this._guid);
    };

    /*ModelEditorConnectionComponent.prototype.onDestroy = function () {
        //end edit mode (if editing right now)
        this._endEditMode();

        //remove controls
        if (this._skinParts.path) {
            this._skinParts.path.remove();
            delete this._skinParts.path;

            this._skinParts.pathShadow.remove();
            delete this._skinParts.pathShadow;
        }

        this._logger.debug("onDestroy");
    };*/

    /*ModelEditorConnectionComponent.prototype.onDestroyAsync = function (callbackFn) {
        var self = this,
            pathVisElements = this._paper.set();

        //end edit mode (if editing right now)
        this._endEditMode();

        if (this._skinParts.path) {
            pathVisElements.push(this._skinParts.path);
        }

        if (this._skinParts.pathShadow) {
            pathVisElements.push(this._skinParts.pathShadow);
        }

        pathVisElements.animate({"opacity": 0}, 800, "linear", function () {
            pathVisElements.clear();

            if (self._skinParts.path) {
                self._skinParts.path.remove();
                delete self._skinParts.path;
            }

            if (self._skinParts.pathShadow) {
                self._skinParts.pathShadow.remove();
                delete self._skinParts.pathShadow;
            }

            self._logger.debug("onDestroy");

            callbackFn.call(self);
        });
    };*/


    ModelEditorConnectionComponent.prototype.onSelect = function (isMultiple) {
        this._highlightPath();
        if (isMultiple === false) {
            this._showConnectionEndEditControls();

            this._showContextMenu();
        }
    };

    ModelEditorConnectionComponent.prototype.onDeselect = function () {
        this._unhighlightPath();
        this._hideConnectionEndEditControls();
        this._hideContextMenu();
        this._endEditMode();
    };

    ModelEditorConnectionComponent.prototype._highlightPath = function () {
        this._skinParts.pathShadow.attr({"opacity": this._pathAttributes.shadowOpacitySelected});
    };

    ModelEditorConnectionComponent.prototype._unhighlightPath = function () {
        this._skinParts.pathShadow.attr({"opacity": this._pathAttributes.shadowOpacity});
    };

    ModelEditorConnectionComponent.prototype._showContextMenu = function () {
        var midPoint = this._skinParts.path.getPointAtLength(this._skinParts.path.getTotalLength() / 2),
            self = this,
            buttonBarWidth;

        this._skinParts.toolTipMenu = $('<div/>').attr("id", this._guid + "_tooltip");
        this.el.append(this._skinParts.toolTipMenu);

        this._skinParts.toolTipMenu.outerWidth(100).outerHeight(30);

        this._skinParts.toolTipMenu.html("<div class='button-bar'><div class='button-bar-item' style='display: block; '><div class='icon-13 icon-13-line-shape-curved'></div></div><div class='button-bar-item' style='display: block; '><div class='icon-13 icon-13-line-shape-straight'></div></div><div class='button-bar-item' style='display: block; '><div class='icon-13 icon-13-line-edit'></div></div></div>");

        buttonBarWidth = this._skinParts.toolTipMenu.find(".button-bar").outerWidth(true);

        //show Bezier / Simple line switch
        this._skinParts.toolTipMenu.css({"left": midPoint.x - (buttonBarWidth / 2),
            "top": midPoint.y + 20,
            "position": "absolute",
            "background-color": "rgba(0, 0, 0, 0)"});

        this.bezierDiv = this._skinParts.toolTipMenu.find(".icon-13-line-shape-curved").parent();
        this.straightLineDiv = this._skinParts.toolTipMenu.find(".icon-13-line-shape-straight").parent();
        this.editDiv = this._skinParts.toolTipMenu.find(".icon-13-line-edit").parent();

        this.bezierDiv.attr("title", "Bezier curve");
        this.straightLineDiv.attr("title", "Straight line");
        this.editDiv.attr("title", "Edit segment points");

        if (this._pathAttributes.lineType === "L") {
            this.straightLineDiv.addClass("selected");
            this.bezierDiv.bind('click', function (event) {
                self.parentComponent.setLineType(self.getId(), "B");
                event.stopPropagation();
            });
        } else {
            this.bezierDiv.addClass("selected");
            this.straightLineDiv.bind('click', function (event) {
                self.parentComponent.setLineType(self.getId(), "L");
                event.stopPropagation();
            });
        }

        this.editDiv.bind('click', function (event) {
            self._setEditMode();
            event.stopPropagation();
        });

        this._skinParts.toolTipMenu.bind('mousedown', function (event) {
            event.stopPropagation();
        });

        this._skinParts.toolTipMenu.bind('mouseup', function (event) {
            event.stopPropagation();
        });
    };

    ModelEditorConnectionComponent.prototype._hideContextMenu = function () {
        if (this._skinParts.toolTipMenu) {
            this._skinParts.toolTipMenu.remove();
            this._skinParts.toolTipMenu = null;
            delete this._skinParts.toolTipMenu;
        }
    };

    /*
     * DRAGGABLE ENDPOINTS
     */
    ModelEditorConnectionComponent.prototype._showConnectionEndEditControls = function () {
        var opts;

        //editor circle at 'source' end
        this._skinParts.srcDragPoint = $('<div/>', {
            "id": "srcDragPoint_" + this._guid,
            "class": "connectionEndDragPoint"
        });

        this.el.append(this._skinParts.srcDragPoint);

        this._skinParts.srcDragPoint.css({"position": "absolute"});

        opts = { "el": this._skinParts.srcDragPoint,
                        "connId": this._guid,
                        "endType": "source"};

        this._makeEndPointDraggable(opts);

        //editor circle at 'target' end
        this._skinParts.tgtDragPoint = $('<div/>', {
            "id": "tgtDragPoint_" + this._guid,
            "class": "connectionEndDragPoint"
        });

        this.el.append(this._skinParts.tgtDragPoint);

        this._skinParts.tgtDragPoint.css({"position": "absolute"});

        opts = { "el": this._skinParts.tgtDragPoint,
            "connId": this._guid,
            "endType": "target"};

        this._repositionDragPoints({"source": true,
            "target": true});

        this._makeEndPointDraggable(opts);
    };

    ModelEditorConnectionComponent.prototype._makeEndPointDraggable = function (opts) {
        var self = this;

        opts.el.css("cursor", "move");
        opts.el.draggable({
            helper: function () {
                return $("<div class='draw-connection-end-drag-helper'></div>").data({"connId": opts.connId,
                    "endType": opts.endType});
            },
            scroll: true,
            cursor: 'move',
            cursorAt: { left: 0,
                top: 0 },
            start: function (event) {
                self._originalCoord = $.extend(true, {}, self["_" + opts.endType + "Coordinates"]);
                self._mouseStartPos = {"mX": event.pageX, "mY": event.pageY };
                opts.el.addClass("connection-source");
            },
            stop: function (event, ui) {
                opts.el.removeClass("connection-source");

                //check if drop has been handled by droptargets
                if (ui.helper.data("dropHandled") !== true) {
                    //dropped on "nothing" that would accept it
                    //reset original end coordinates and redraw line
                    self["_" + opts.endType + "Coordinates"] = $.extend(true, {}, self._originalCoord);
                    self._redrawConnection();
                }

                self._repositionDragPoints({"source": true,
                                           "target": true});

                delete self._originalCoord;
                delete self._mouseStartPos;
            },
            drag: function (event) {
                var dX = event.pageX - self._mouseStartPos.mX,
                    dY = event.pageY - self._mouseStartPos.mY,
                    repOpts = {};

                self["_" + opts.endType + "Coordinates"].x = self._originalCoord.x + dX;
                self["_" + opts.endType + "Coordinates"].y = self._originalCoord.y + dY;
                self._redrawConnection();

                repOpts[opts.endType] = true;

                self._repositionDragPoints(repOpts);
            }
        });

        opts.el.bind('mousedown', function (event) {
            event.stopPropagation();
        });
    };

    ModelEditorConnectionComponent.prototype._repositionDragPoints = function (opts) {
        var dragPointOpts = {"width": 8,
                            "height": 8};

        if (opts.source) {
            if (this._skinParts.srcDragPoint) {
                this._skinParts.srcDragPoint.css({
                    "width": dragPointOpts.width,
                    "height": dragPointOpts.height,
                    "left": this._sourceCoordinates.x - dragPointOpts.width / 2 - 1, /* -1 because of border left*/
                    "top": this._sourceCoordinates.y - dragPointOpts.height / 2 - 1 /*-1 because of border top*/
                });
            }
        }

        if (opts.target) {
            if (this._skinParts.tgtDragPoint) {
                this._skinParts.tgtDragPoint.css({
                    "width": dragPointOpts.width,
                    "height": dragPointOpts.height,
                    "left": this._targetCoordinates.x - dragPointOpts.width / 2 - 1, /* -1 because of border left*/
                    "top": this._targetCoordinates.y - dragPointOpts.height / 2 - 1 /*-1 because of border top*/
                });
            }
        }
    };

    ModelEditorConnectionComponent.prototype._hideConnectionEndEditControls = function () {
        if (this._skinParts.srcDragPoint) {
            this._skinParts.srcDragPoint.remove();
            delete this._skinParts.srcDragPoint;
        }

        if (this._skinParts.tgtDragPoint) {
            this._skinParts.tgtDragPoint.remove();
            delete this._skinParts.tgtDragPoint;
        }

    };
    /*
     * END OF - DRAGGABLE ENDPOINTS
     */

    /*
     * EDIT MODE
     */
    ModelEditorConnectionComponent.prototype._setEditMode = function () {
        var i;

        this._hideConnectionEndEditControls();
        this._hideContextMenu();

        //turn on edit mode
        this._editParams.editMode = true;

        this._skinParts.path.attr({"opacity": "0"});
        this._skinParts.pathShadow.attr({"opacity": "0"});

        this._redrawConnection();

        for (i = 0; i < this._segmentPoints.length; i += 1) {
            this._segmentPoints[i].addControls();
        }
    };

    ModelEditorConnectionComponent.prototype._endEditMode = function () {
        var i;

        if (this._editParams.editMode === true) {
            this._editParams.editMode = false;

            for (i = 0; i < this._segmentPoints.length; i += 1) {
                this._segmentPoints[i].removeControls();
            }
            this._redrawConnection();

            this._skinParts.path.attr({"opacity": "1.0"});
            this._skinParts.pathShadow.attr({"opacity": this._pathAttributes.shadowOpacity});
        }
    };
    /*
     * END OF - EDIT MODE
     */

    ModelEditorConnectionComponent.prototype.destroy = function () {
        this._destroying = true;
        //end edit mode (if editing right now)
        this._endEditMode();

        //remove controls
        if (this._skinParts.path) {
            this._skinParts.path.remove();
            delete this._skinParts.path;

            this._skinParts.pathShadow.remove();
            delete this._skinParts.pathShadow;
        }

        delete this._skinParts;

        this._logger.debug("destroyed");
    };

    ModelEditorConnectionComponent.prototype.getBoundingBox = function () {
        var bBox;

        //only when the path is visible on the screen
        if (this._isVisible() === true) {
            bBox = this._skinParts.path.getBBox();
            if ((bBox.x2 - bBox.x === 0) && (bBox.y2 - bBox.y > 0)) {
                bBox.x2 += 1;
                bBox.width += 1;
            }
            if ((bBox.y2 - bBox.y === 0) && (bBox.x2 - bBox.x > 0)) {
                bBox.y2 += 1;
                bBox.height += 1;
            }
        }

        //otherwise return an invalid bounding box
        return bBox;
    };

    ModelEditorConnectionComponent.prototype.update = function (objDescriptor) {
        var i;

        this._initializeConnectionProps(objDescriptor);

        this._render();

        if (this._editParams.editMode === true) {
            for (i = 0; i < this._segmentPoints.length; i += 1) {
                this._segmentPoints[i].addControls();
            }
        }
    };

    ModelEditorConnectionComponent.prototype._isVisible = function () {
        //only when the path is visible on the screen
        if (this._skinParts.path) {
            if (this._skinParts.path.node.style.display !== "none") {
                return true;
            }
        }

        return false;
    };

    ModelEditorConnectionComponent.prototype.setEndpointCoordinates = function (srcCoordinates, tgtCoordinates) {
        var hasChanged = false;
        this._logger.debug("setEndpointCoordinates, srcCoordinates:'" + srcCoordinates + "', tgtCoordinates:'" + tgtCoordinates + "'");

        if (_.isEqual(this._sourceCoordinates, srcCoordinates) !== true) {
            this._sourceCoordinates = srcCoordinates;
            hasChanged = true;
        }

        if (_.isEqual(this._targetCoordinates, tgtCoordinates) !== true) {
            this._targetCoordinates = tgtCoordinates;
            hasChanged = true;
        }

        if (hasChanged === true) {
            this._render();
            this._repositionDragPoints({"source": true,
                "target": true});
        }
    };

    ModelEditorConnectionComponent.prototype.setSourceCoordinates = function (srcCoordinates) {
        this.setEndpointCoordinates(srcCoordinates, this._targetCoordinates);
    };

    ModelEditorConnectionComponent.prototype.setTargetCoordinates = function (tgtCoordinates) {
        this.setEndpointCoordinates(this._sourceCoordinates, tgtCoordinates);
    };

    ModelEditorConnectionComponent.prototype._render = function () {
        var pathDef;

        if (this._sourceCoordinates !== null && this._targetCoordinates !== null) {
            this._logger.debug("_render, valid endpoints, drawing");

            if (this._sourceCoordinates.x < 0 || this._sourceCoordinates.y < 0) {
                this._logger.debug("negative _sourceCoordinates");
            }

            if (this._targetCoordinates.x < 0 || this._targetCoordinates.y < 0) {
                this._logger.debug("negative _targetCoordinates");
            }

            this._skinParts.path.show();
            this._skinParts.pathShadow.show();
            this._redrawConnection();

            if (this._skinParts.toolTipMenu) {
                this._hideContextMenu();
                this._showContextMenu();
            }
        } else {
            this._logger.debug("_render, NOT VALID endpoints, hide connection");
            this._endEditMode();

            pathDef = ["M", 0, 0, "L", 3, 3].join(",");
            this._skinParts.path.attr({ "path": pathDef});
            this._skinParts.pathShadow.attr({ "path": pathDef});

            this._skinParts.path.hide();
            this._skinParts.pathShadow.hide();

            this._hideContextMenu();
        }
    };

    ModelEditorConnectionComponent.prototype._redrawConnection = function () {
        var pathDef,
            i,
            segmentPoint,
            controlPointBefore,
            controlPointAfter,
            editSegmentCounter = 0,
            connSegmentOptions;

        for (i = 0; i < this._skinParts.editSegments.length; i += 1) {
            this._skinParts.editSegments[i].destroy();
            delete this._skinParts.editSegments[i];
        }
        this._skinParts.editSegments = [];

        if (this._editParams.editMode === false) {
            if (this._pathAttributes.lineType === "L") {
                pathDef = connectionSegmentLine.getPathDef(this._sourceCoordinates, this._targetCoordinates, this._segmentPoints);
            } else {
                pathDef = connectionSegmentBezier.getPathDef(this._sourceCoordinates, this._targetCoordinates, this._segmentPoints);
            }
            this._skinParts.path.attr({ "path": pathDef});
            this._skinParts.pathShadow.attr({ "path": pathDef});
        } else {
            //edit mode
            if (this._segmentPoints.length === 0) {
                connSegmentOptions = {"srcCoord" : this._sourceCoordinates,
                    "tgtCoord": this._targetCoordinates,
                    "lineType": this._pathAttributes.lineType,
                    "count": editSegmentCounter,
                    "raphaelPaper": this._paper,
                    "connectionComponent": this};

                this._skinParts.editSegments.push(new ConnectionSegment(connSegmentOptions));
            } else {
                //FIRST SEGMENT: source connection point - 1st segment point
                segmentPoint = this._segmentPoints[0];
                connSegmentOptions = {"srcCoord" : this._sourceCoordinates,
                    "tgtCoord": segmentPoint,
                    "lineType": this._pathAttributes.lineType,
                    "count": editSegmentCounter,
                    "raphaelPaper": this._paper,
                    "connectionComponent": this};

                this._skinParts.editSegments.push(new ConnectionSegment(connSegmentOptions));

                editSegmentCounter += 1;

                //MIDDLE SEGMENTS: 1st segment point - last segment point
                for (i = 0; i < this._segmentPoints.length - 1; i += 1) {
                    controlPointAfter = this._segmentPoints[i].getAfterControlPoint();
                    controlPointBefore = this._segmentPoints[i + 1].getBeforeControlPoint();

                    connSegmentOptions = {"srcCoord" : this._segmentPoints[i],
                        "tgtCoord": this._segmentPoints[i + 1],
                        "lineType": this._pathAttributes.lineType,
                        "count": editSegmentCounter,
                        "raphaelPaper": this._paper,
                        "connectionComponent": this};

                    this._skinParts.editSegments.push(new ConnectionSegment(connSegmentOptions));

                    editSegmentCounter += 1;
                }

                //LAST SEGMENT: 1ast segment point - target coordinates
                segmentPoint = this._segmentPoints[i];
                connSegmentOptions = {"srcCoord" : segmentPoint,
                    "tgtCoord": this._targetCoordinates,
                    "lineType": this._pathAttributes.lineType,
                    "count": editSegmentCounter,
                    "raphaelPaper": this._paper,
                    "connectionComponent": this};

                this._skinParts.editSegments.push(new ConnectionSegment(connSegmentOptions));

                //set up all segment points with the associated segments they control
                for (i = 0; i < this._segmentPoints.length; i += 1) {
                    this._segmentPoints[i].setConnectionSegments(this._skinParts.editSegments[i], this._skinParts.editSegments[i + 1]);
                }
            }
        }
    };

    ModelEditorConnectionComponent.prototype.saveSegmentPoints = function (opts) {
        var i,
            segmentPointsToSave = [],
            remove = null,
            add = null;

        if (opts) {
            if (_.isNumber(opts.remove)) {
                remove = opts.remove;
            }

            if (opts.add) {
                add = opts.add.count;
            }
        }

        if (this._segmentPoints.length === 0) {
            if (add === 0) {
                segmentPointsToSave.push(opts.add.desc);
            }
        } else {
            for (i = 0; i < this._segmentPoints.length; i += 1) {
                if (add === i) {
                    segmentPointsToSave.push(opts.add.desc);
                }

                if (remove !== i) {
                    segmentPointsToSave.push({ "x": this._segmentPoints[i].x,
                        "y": this._segmentPoints[i].y,
                        "cx": this._segmentPoints[i].cx,
                        "cy": this._segmentPoints[i].cy });
                }
            }

            //add a new segment point to the end of list
            if (add === i) {
                segmentPointsToSave.push(opts.add.desc);
            }
        }

        this._parentView.saveConnectionSegmentPoints(this._guid, segmentPointsToSave);

    };

    ModelEditorConnectionComponent.prototype.removeSegmentPoint = function (count) {
        this.saveSegmentPoints({"remove": count});
    };

    ModelEditorConnectionComponent.prototype.addSegmentPoint = function (count, x, y, cx, cy) {
        var d = { "x": x,
                "y": y };

        if (cx) {
            d.cx = cx;
        }

        if (cy) {
            d.cy = cy;
        }

        this.saveSegmentPoints({"add": { "count": count, desc: d }});
    };

    ModelEditorConnectionComponent.prototype.getClonedEl = function () {
        //return this.el.clone().attr("id", this._guid + "_clone");
        return undefined;
    };

    return ModelEditorConnectionComponent;
});