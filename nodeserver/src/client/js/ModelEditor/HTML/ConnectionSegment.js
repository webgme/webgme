/**
 * Created with JetBrains WebStorm.
 * User: roby
 * Date: 6/22/12
 * Time: 9:54 PM
 * To change this template use File | Settings | File Templates.
 */
"use strict";

define(['logManager',
        'bezierHelper',
        'raphaeljs'], function (logManager,
                                    bezierHelper) {

    var ConnectionSegment;

    ConnectionSegment = function (opts) {
        this.connectionComponent = opts.connectionComponent;

        this.paper = opts.raphaelPaper;

        this.connectionId = this.connectionComponent.getId();

        this.srcCoord = opts.srcCoord;
        this.tgtCoord = opts.tgtCoord;

        this.count = opts.count;

        this.logger = logManager.create("ConnectionSegment_" + this.connectionId + "_" + this.count);
        this.logger.debug("Created");

        this.skinParts = {};

        this.settings = { "defaultFillColor": "#FFFF00",
            "defaultStrokeColor": "#FF0000",
            "minDragDistance": 3,
            "color": "#0000FF",
            "shadowPathWidth": 10};

        this._render();
    };

    ConnectionSegment.prototype._getMousePos = function (e) {
        var childrenContainerOffset = $(this.paper.canvas).parent().offset();
        return { "mX": e.pageX - childrenContainerOffset.left,
            "mY": e.pageY - childrenContainerOffset.top };
    };

    ConnectionSegment.prototype._render = function () {
        var bezierControlPoint1,
            bezierControlPoint2,
            calculatedBezierControlPoint,
            self = this;

        //draw a bezier curve from srcCoord to tgtCoord
        //srcCoord and tgtCoord might have control points as well
        if ($.isFunction(this.srcCoord.getAfterControlPoint)) {
            bezierControlPoint1 = this.srcCoord.getAfterControlPoint();
        }

        if ($.isFunction(this.tgtCoord.getBeforeControlPoint)) {
            bezierControlPoint2 = this.tgtCoord.getBeforeControlPoint();
        }

        if ((bezierControlPoint1 === undefined) || (bezierControlPoint2 === undefined)) {
            calculatedBezierControlPoint = bezierHelper.getBezierControlPoints2(this.srcCoord, this.tgtCoord);

            if (bezierControlPoint1 === undefined) {
                bezierControlPoint1 = calculatedBezierControlPoint[1];
            }

            if (bezierControlPoint2 === undefined) {
                bezierControlPoint2 = calculatedBezierControlPoint[2];
            }
        }

        this.pathDef = ["M", this.srcCoord.x, this.srcCoord.y];
        this.pathDef.push("C", bezierControlPoint1.x, bezierControlPoint1.y, bezierControlPoint2.x, bezierControlPoint2.y, this.tgtCoord.x, this.tgtCoord.y);
        this.pathDef = this.pathDef.join(",");

        this.skinParts.path = this.paper.path(this.pathDef).attr({ stroke: this.settings.color,
                                                                fill: "none",
                                                                "stroke-width": "2" });
        $(this.skinParts.path.node).attr("id", this.connectionId + "_editSegment_" + this.count);


        this.skinParts.circle = this.paper.circle(0, 0, 4).attr({"stroke" : self.settings.defaultStrokeColor,
                                                                "fill" : self.settings.defaultFillColor}).hide();

        this.skinParts.pathShadow = this.paper.path(this.pathDef).attr({ stroke: this.settings.color,
            fill: "none",
            "stroke-width": this.settings.shadowPathWidth, "opacity": 0.002 });

        this.onMouseOver = function () {
            self.skinParts.circle.show();
        };

        this.onMouseOut = function () {
            self.skinParts.circle.hide();
        };

        this.onMouseMove = function (event) {
            var mousePos = self._getMousePos(event),
                pos = self._getSelectedPathPoint(mousePos.mX, mousePos.mY);

            if (pos) {
                self.skinParts.circle.attr({ "cx": pos.x,
                    "cy": pos.y });
            }
        };

        this.onMouseDown = function (event) {
            var mousePos = self._getMousePos(event),
                pos = self._getSelectedPathPoint(mousePos.mX, mousePos.mY),
                dots,
                cx,
                cy;

            if (pos) {
                dots = Raphael.findDotsAtSegment(pos.bez[0],
                    pos.bez[1],
                    pos.bez[2],
                    pos.bez[3],
                    pos.bez[4],
                    pos.bez[5],
                    pos.bez[6],
                    pos.bez[7],
                    pos.t);
                cx = dots.n.x - pos.x;
                cy = dots.n.y - pos.y;

                /*if (Math.abs(cx) < 10) {
                    cx = cx / Math.abs(cx) * 10;
                }

                if (Math.abs(cy) < 10) {
                    cy = cy / Math.abs(cy) * 10;
                }*/

                self.connectionComponent.addSegmentPoint(self.count, pos.x, pos.y, cx, cy);
            }

            event.stopPropagation();
        };

        this.skinParts.pathShadow.mouseover(this.onMouseOver);
        this.skinParts.pathShadow.mouseout(this.onMouseOut);
        this.skinParts.pathShadow.mousemove(this.onMouseMove);
        this.skinParts.pathShadow.mousedown(this.onMouseDown);
    };

    ConnectionSegment.prototype._getSelectedPathPoint = function (mouseX, mouseY) {
        var w = this.settings.shadowPathWidth + 2,
            horizontalPath = ["M", mouseX - w, mouseY, "L", mouseX + w, mouseY].join(","),
            verticalPath = ["M", mouseX, mouseY - w, "L", mouseX, mouseY + w].join(","),
            intersectionsHorizontal = Raphael.pathIntersection(this.pathDef, horizontalPath),
            intersectionsVertical = Raphael.pathIntersection(this.pathDef, verticalPath),
            distanceH = 1000,
            distanceW = 1000,
            resultPos;

        if (intersectionsHorizontal.length > 0) {
            distanceH = Math.abs(mouseX - intersectionsHorizontal[0].x) + Math.abs(mouseY - intersectionsHorizontal[0].y);
        }
        if (intersectionsVertical.length > 0) {
            distanceW = Math.abs(mouseX - intersectionsVertical[0].x) + Math.abs(mouseY - intersectionsVertical[0].y);
        }

        if (distanceH < distanceW) {
            if (intersectionsHorizontal.length > 0) {
                resultPos = {   "x": intersectionsHorizontal[0].x,
                                "y": intersectionsHorizontal[0].y,
                                "t": intersectionsHorizontal[0].t1,
                                "bez": intersectionsHorizontal[0].bez1 };
            }
        } else {
            if (intersectionsVertical.length > 0) {
                resultPos = {   "x": intersectionsVertical[0].x,
                                "y": intersectionsVertical[0].y,
                                "t": intersectionsVertical[0].t1,
                                "bez": intersectionsVertical[0].bez1 };
            }
        }

        return resultPos;
    };

    ConnectionSegment.prototype.destroy = function () {
        var i;

        this.skinParts.pathShadow.unmouseover(this.onMouseOver);
        this.skinParts.pathShadow.unmouseout(this.onMouseOut);
        this.skinParts.pathShadow.unmousemove(this.onMouseMove);
        this.skinParts.pathShadow.unmousedown(this.onMouseDown);

        for (i in this.skinParts) {
            if (this.skinParts.hasOwnProperty(i)) {
                this.skinParts[i].remove();
                delete this.skinParts[i];
            }
        }

        this.logger.debug("Destroyed");
    };

    return ConnectionSegment;
});