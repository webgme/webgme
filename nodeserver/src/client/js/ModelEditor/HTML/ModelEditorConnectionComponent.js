/**
 * Created with JetBrains WebStorm.
 * User: roby
 * Date: 6/22/12
 * Time: 9:54 PM
 * To change this template use File | Settings | File Templates.
 */
"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'nodeAttributeNames',
    'nodeRegistryNames',
    'bezierHelper',
    './ComponentBase.js',
    './ConnectionSegmentPoint.js',
    './ConnectionSegment.js'], function (logManager,
             util,
             commonUtil,
             nodeAttributeNames,
             nodeRegistryNames,
             bezierHelper,
             ComponentBase,
             ConnectionSegmentPoint,
             ConnectionSegment) {

    var ModelEditorConnectionComponent;

    ModelEditorConnectionComponent = function (id, proj, raphaelPaper) {
        $.extend(this, new ComponentBase(id, proj));

        this.logger = logManager.create("ModelEditorConnectionComponent_" + id);
        this.logger.debug("Created");

        this.paper = raphaelPaper;

        this.borderW = 5;

        this.pathAttributes = {};

        this.segmentPoints = [];

        this.sourceCoordinates = null;
        this.targetCoordinates = null;

        this.editMode = false;
        this.editOptions = { "color": "#0000FF" };
        this.skinParts.editSegments = [];

        /*
         * OVERRIDE COMPONENTBASE MEMBERS
         */
        this.addedToParent = function () {
            this._addedToParent();
        };

        this.onDestroy = function () {
            this._onDestroy();
        };

        this.isSelectable = function () {
            return true;
        };

        this.isMultiSelectable = function () {
            return false;
        };
        /*
         * END OVERRIDE COMPONENTBASE MEMBERS
         */

        this._initialize();
    };

    ModelEditorConnectionComponent.prototype._initialize = function () {
        var self = this;
        //generate skin controls
        this.el.addClass("connection");

        this.el.css({ "position": "absolute",
                      "background-color": "rgba(0, 0, 0, 0)",
                      "left": 0,
                       "top": 0 });

        this.el.outerWidth(2 * this.borderW).outerHeight(2 * this.borderW);

        this.skinParts.path = this.paper.path("M0,0").attr({ stroke: "#000", fill: "none", "stroke-width": "2" });
        this.skinParts.pathShadow = this.paper.path("M0,0").attr({ stroke: "#000", fill: "none", "stroke-width": "6", "opacity" : 0.05 });

        this.skinParts.pathShadow.click(function () {
            self.parentComponent._setSelection([self.getId()], false);
        });

        $(this.skinParts.path.node).attr("id", this.getId());

        this._initializeFromNode();
    };

    ModelEditorConnectionComponent.prototype._initializeFromNode = function () {
        var node = this.project.getNode(this.getId()),
            segmentPointList,
            i;

        this.pathAttributes.arrowStart = "oval";
        this.pathAttributes.arrowEnd = "oval";
        if (node.getAttribute(nodeAttributeNames.directed) === true) {
            this.pathAttributes.arrowEnd = "block";
        }

        this.pathAttributes.color = "#000000";
        this.pathAttributes.width = "2";
        this.pathAttributes.shadowWidth = "6";
        this.pathAttributes.shadowOpacity = 0.002;

        this.skinParts.path.attr({ "arrow-start": this.pathAttributes.arrowStart,
                                    "arrow-end": this.pathAttributes.arrowEnd,
                                    "stroke": this.pathAttributes.color,
                                    "fill": "none",
                                    "stroke-width": this.pathAttributes.width });

        this.skinParts.pathShadow.attr({    "stroke": "#FFFFFF",
                                            "fill": "none",
                                            "stroke-width": this.pathAttributes.shadowWidth,
                                            "opacity": this.pathAttributes.shadowOpacity});

        //read segment points (if any)
        for (i = 0; i < this.segmentPoints.length; i += 1) {
            this.segmentPoints[i].destroy();
            delete this.segmentPoints[i];
        }

        this.segmentPoints = [];
        segmentPointList = node.getRegistry(nodeRegistryNames.segmentPoints);
        if (segmentPointList) {
            for (i = 0; i < segmentPointList.length; i += 1) {
                this.segmentPoints.push(new ConnectionSegmentPoint({ "x": segmentPointList[i].x,
                                                                    "y": segmentPointList[i].y,
                                                                    "cx": segmentPointList[i].cx,
                                                                    "cy": segmentPointList[i].cy,
                                                                    "raphaelPaper": this.paper,
                                                                    "connection": this,
                                                                    "count": i}));
            }
        }

        if (this.editMode === true) {
            for (i = 0; i < this.segmentPoints.length; i += 1) {
                this.segmentPoints[i].addControls();
            }
        }
    };

    ModelEditorConnectionComponent.prototype._addedToParent = function () {

    };

    ModelEditorConnectionComponent.prototype._onDestroy = function () {
        if (this.skinParts.path) {
            this.skinParts.path.remove();
            delete this.skinParts.path;

            this.skinParts.pathShadow.remove();
            delete this.skinParts.pathShadow;
        }

        this.logger.debug("_onDestroy");
    };

    ModelEditorConnectionComponent.prototype.onSelect = function () {
        var i;
        this.editMode = true;
        for (i = 0; i < this.segmentPoints.length; i += 1) {
            this.segmentPoints[i].addControls();
        }
        this.redrawConnection();

    };

    ModelEditorConnectionComponent.prototype.onDeselect = function () {
        var i;
        this.editMode = false;
        for (i = 0; i < this.segmentPoints.length; i += 1) {
            this.segmentPoints[i].removeControls();
        }
        this.redrawConnection();
    };

    ModelEditorConnectionComponent.prototype.update = function () {
        this._initializeFromNode();

        this.redrawConnection();
    };

    ModelEditorConnectionComponent.prototype.setEndpointCoordinates = function (srcCoordinates, tgtCoordinates) {
        this.sourceCoordinates = srcCoordinates;
        this.targetCoordinates = tgtCoordinates;

        this.redrawConnection();
    };

    ModelEditorConnectionComponent.prototype.redrawConnection = function () {
        var cX,
            cY,
            cW,
            cH,
            pathDef,
            bezierControlPoints,
            self = this,
            i,
            segmentPoint,
            controlPointBefore,
            controlPointAfter,
            editSegmentCounter = 0,
            connSegmentOptions;

        /*for (i = 0; i < this.skinParts.editSegments.length; i += 1) {
            this.skinParts.editSegments[i].remove();
        }*/

        for (i = 0; i < this.skinParts.editSegments.length; i += 1) {
            this.skinParts.editSegments[i].destroy();
            delete this.skinParts.editSegments[i];
        }
        this.skinParts.editSegments = [];



        if (this.editMode === false) {
            if (this.segmentPoints.length === 0) {
                bezierControlPoints = bezierHelper.getBezierControlPoints2(this.sourceCoordinates, this.targetCoordinates);

                //TODO: do we really need the DIV over the path?
                /*cX = Math.min(bezierControlPoints[0].x, bezierControlPoints[3].x);
                 cY = Math.min(bezierControlPoints[0].y, bezierControlPoints[3].y);
                 cW = Math.abs(bezierControlPoints[0].x - bezierControlPoints[3].x);
                 cH = Math.abs(bezierControlPoints[0].y - bezierControlPoints[3].y);

                 this.el.css({"left": cX - this.borderW,
                 "top": cY - this.borderW });
                 this.el.outerWidth(cW + 2 * this.borderW).outerHeight(cH + 2 * this.borderW);*/

                //build up path from points
                pathDef = ["M", bezierControlPoints[0].x, bezierControlPoints[0].y, "C", bezierControlPoints[1].x, bezierControlPoints[1].y, bezierControlPoints[2].x, bezierControlPoints[2].y, bezierControlPoints[3].x, bezierControlPoints[3].y].join(",");
            } else {

                //source point
                pathDef = ["M", this.sourceCoordinates.x, this.sourceCoordinates.y];

                controlPointBefore = this.segmentPoints[0].getBeforeControlPoint();
                segmentPoint = { "x": this.segmentPoints[0].x,
                    "y": this.segmentPoints[0].y,
                    "dir" : controlPointBefore.dir };

                bezierControlPoints = bezierHelper.getBezierControlPoints2(this.sourceCoordinates, segmentPoint);

                pathDef.push("C", bezierControlPoints[1].x, bezierControlPoints[1].y, controlPointBefore.x, controlPointBefore.y, bezierControlPoints[3].x, bezierControlPoints[3].y);

                for (i = 0; i < this.segmentPoints.length - 1; i += 1) {
                    this.segmentPoints[i].removeControls();
                    controlPointAfter = this.segmentPoints[i].getAfterControlPoint();
                    controlPointBefore = this.segmentPoints[i + 1].getBeforeControlPoint();

                    pathDef.push("C", controlPointAfter.x, controlPointAfter.y, controlPointBefore.x, controlPointBefore.y, this.segmentPoints[i + 1].x, this.segmentPoints[i + 1].y);
                }

                this.segmentPoints[i].removeControls();
                controlPointAfter = this.segmentPoints[i].getAfterControlPoint();
                segmentPoint = { "x": this.segmentPoints[i].x,
                    "y": this.segmentPoints[i].y,
                    "dir" : controlPointAfter.dir };

                bezierControlPoints = bezierHelper.getBezierControlPoints2(segmentPoint, this.targetCoordinates);

                pathDef.push("C", controlPointAfter.x, controlPointAfter.y, bezierControlPoints[2].x, bezierControlPoints[2].y, this.targetCoordinates.x, this.targetCoordinates.y);

                pathDef = pathDef.join(",");
            }

            this.skinParts.path.attr({ "path": pathDef});
            this.skinParts.path.attr({"opacity": "1.0"});

            this.skinParts.pathShadow.attr({ "path": pathDef});
            this.skinParts.pathShadow.attr({"opacity": this.pathAttributes.shadowOpacity});
        } else {
            this.skinParts.path.attr({"opacity": "0"});
            this.skinParts.pathShadow.attr({"opacity": "0"});

            if (this.segmentPoints.length === 0) {
                //bezierControlPoints = bezierHelper.getBezierControlPoints2(this.sourceCoordinates, this.targetCoordinates);

                connSegmentOptions = {"srcCoord" : this.sourceCoordinates,
                                      "tgtCoord": this.targetCoordinates,
                                      "type": "bezier",
                                      "count": editSegmentCounter,
                                      "raphaelPaper": this.paper,
                                      "connectionComponent": this};

                this.skinParts.editSegments.push(new ConnectionSegment(connSegmentOptions));

                //build up path from points
                /*pathDef = ["M", bezierControlPoints[0].x, bezierControlPoints[0].y, "C", bezierControlPoints[1].x, bezierControlPoints[1].y, bezierControlPoints[2].x, bezierControlPoints[2].y, bezierControlPoints[3].x, bezierControlPoints[3].y].join(",");
                this.skinParts.editSegments.push(this.paper.path(pathDef).attr({ stroke: this.editOptions.color, fill: "none", "stroke-width": "2" }));
                $(this.skinParts.editSegments[editSegmentCounter].node).attr("id", this.getId() + "_editSegment_" + editSegmentCounter);*/


            } else {

                //source point
                /*controlPointBefore = this.segmentPoints[0].getBeforeControlPoint();
                segmentPoint = { "x": this.segmentPoints[0].x,
                    "y": this.segmentPoints[0].y,
                    "dir" : controlPointBefore.dir };*/

                segmentPoint = $.extend(true, {}, this.segmentPoints[0]);
                segmentPoint.dir = this.segmentPoints[0].getBeforeControlPoint().dir;

                /*bezierControlPoints = bezierHelper.getBezierControlPoints2(this.sourceCoordinates, segmentPoint);

                pathDef = ["M", this.sourceCoordinates.x, this.sourceCoordinates.y];
                pathDef.push("C", bezierControlPoints[1].x, bezierControlPoints[1].y, controlPointBefore.x, controlPointBefore.y, bezierControlPoints[3].x, bezierControlPoints[3].y);
                pathDef = pathDef.join(",");

                this.skinParts.editSegments.push(this.paper.path(pathDef).attr({ stroke: this.editOptions.color, fill: "none", "stroke-width": "2" }));
                $(this.skinParts.editSegments[editSegmentCounter].node).attr("id", this.getId() + "_editSegment_" + editSegmentCounter);*/

                connSegmentOptions = {"srcCoord" : this.sourceCoordinates,
                    "tgtCoord": segmentPoint,
                    "type": "bezier",
                    "count": editSegmentCounter,
                    "raphaelPaper": this.paper,
                    "connectionComponent": this};

                this.skinParts.editSegments.push(new ConnectionSegment(connSegmentOptions));

                editSegmentCounter += 1;

                for (i = 0; i < this.segmentPoints.length - 1; i += 1) {
                    controlPointAfter = this.segmentPoints[i].getAfterControlPoint();
                    controlPointBefore = this.segmentPoints[i + 1].getBeforeControlPoint();

                    /*pathDef = ["M", this.segmentPoints[i].x, this.segmentPoints[i].y];
                    pathDef.push("C", controlPointAfter.x, controlPointAfter.y, controlPointBefore.x, controlPointBefore.y, this.segmentPoints[i + 1].x, this.segmentPoints[i + 1].y);
                    pathDef = pathDef.join(",");

                    this.skinParts.editSegments.push(this.paper.path(pathDef).attr({ stroke: this.editOptions.color, fill: "none", "stroke-width": "2" }));
                    $(this.skinParts.editSegments[editSegmentCounter].node).attr("id", this.getId() + "_editSegment_" + editSegmentCounter);*/

                    connSegmentOptions = {"srcCoord" : this.segmentPoints[i],
                        "tgtCoord": this.segmentPoints[i + 1],
                        "type": "bezier",
                        "count": editSegmentCounter,
                        "raphaelPaper": this.paper,
                        "connectionComponent": this};

                    this.skinParts.editSegments.push(new ConnectionSegment(connSegmentOptions));

                    editSegmentCounter += 1;
                }


                /*controlPointAfter = this.segmentPoints[i].getAfterControlPoint();
                segmentPoint = { "x": this.segmentPoints[i].x,
                    "y": this.segmentPoints[i].y,
                    "dir" : controlPointAfter.dir };*/

                segmentPoint = $.extend(true, {}, this.segmentPoints[i]);
                segmentPoint.dir = this.segmentPoints[i].getAfterControlPoint().dir;

                /*bezierControlPoints = bezierHelper.getBezierControlPoints2(segmentPoint, this.targetCoordinates);

                pathDef = ["M", this.segmentPoints[i].x, this.segmentPoints[i].y];
                pathDef.push("C", controlPointAfter.x, controlPointAfter.y, bezierControlPoints[2].x, bezierControlPoints[2].y, this.targetCoordinates.x, this.targetCoordinates.y);
                pathDef = pathDef.join(",");

                this.skinParts.editSegments.push(this.paper.path(pathDef).attr({ stroke: this.editOptions.color, fill: "none", "stroke-width": "2" }));
                $(this.skinParts.editSegments[editSegmentCounter].node).attr("id", this.getId() + "_editSegment_" + editSegmentCounter);*/

                connSegmentOptions = {"srcCoord" : segmentPoint,
                    "tgtCoord": this.targetCoordinates,
                    "type": "bezier",
                    "count": editSegmentCounter,
                    "raphaelPaper": this.paper,
                    "connectionComponent": this};

                this.skinParts.editSegments.push(new ConnectionSegment(connSegmentOptions));


                for (i = 0; i < this.segmentPoints.length; i += 1) {
                    this.segmentPoints[i].redrawControls();
                }

            }
        }

        //set new path definition

    };

    ModelEditorConnectionComponent.prototype._editConnection = function () {
        var i;

        for (i = 0; i < this.segmentPoints.length; i += 1) {
            this.segmentPoints[i].showControls();
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

        if (this.segmentPoints.length === 0) {
            if (add === 0) {
                segmentPointsToSave.push(opts.add.desc);
            }
        } else {
            for (i = 0; i < this.segmentPoints.length; i += 1) {
                if (add === i) {
                    segmentPointsToSave.push(opts.add.desc);
                }

                if (remove !== i) {
                    segmentPointsToSave.push({ "x": this.segmentPoints[i].x,
                        "y": this.segmentPoints[i].y,
                        "cx": this.segmentPoints[i].cx,
                        "cy": this.segmentPoints[i].cy });
                }
            }

            //add a new segment point to the end of list
            if (add === i) {
                segmentPointsToSave.push(opts.add.desc);
            }
        }

        this.project.setRegistry(this.getId(), nodeRegistryNames.segmentPoints, segmentPointsToSave);
    };

    ModelEditorConnectionComponent.prototype.removeSegmentPoint = function (count) {
        this.saveSegmentPoints({"remove": count});
    };

    ModelEditorConnectionComponent.prototype.addSegmentPoint = function (count, x, y, cx, cy) {
        this.saveSegmentPoints({"add": { "count": count, desc: { "x": x,
            "y": y,
            "cx": cx,
            "cy": cy }}});
    };

    return ModelEditorConnectionComponent;
});