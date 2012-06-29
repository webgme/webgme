/**
 * Created with JetBrains WebStorm.
 * User: roby
 * Date: 6/22/12
 * Time: 9:54 PM
 * To change this template use File | Settings | File Templates.
 */
"use strict";

define(['logManager',
        'raphaeljs'], function (logManager) {

    var ConnectionSegmentPoint;

    ConnectionSegmentPoint = function (opts) {
        this.logger = logManager.create("ConnectionSegmentPoint");
        this.logger.debug("Created");

        this.paper = opts.raphaelPaper;
        this.connectionComponent = opts.connection;

        this.x = opts.x;
        this.y = opts.y;
        this.cx = opts.cx;
        this.cy = opts.cy;

        this.count = opts.count;

        this.settings = { "mouseOverFillColor" : "#00FF00",
                          "defaultFillColor": "#FFFFE1",
                          "defaultStrokeColor": "#FF0000",
                          "minDragDistance": 3 };

        this.validDrag = false;

        this.oldPos = {};
        this.oldContolPoint = {};
    };

    ConnectionSegmentPoint.prototype.getBeforeControlPoint = function () {
        return {"x": this.x - this.cx,
                "y": this.y - this.cy,
                "dir" : this._getDir(this.cx * -1, this.cy * -1)};
    };

    ConnectionSegmentPoint.prototype.getAfterControlPoint = function () {
        return { "x": this.x + this.cx,
                "y": this.y + this.cy,
                "dir" : this._getDir(this.cx, this.cy)};
    };

    ConnectionSegmentPoint.prototype._getDir = function (dx, dy) {
        if (dy === 0) {
            if (dx > 0) {
                return "E";
            } else {
                return "W";
            }
        }

        if (Math.abs(dx / dy) > 1) {
            if (dx > 0) {
                return "E";
            } else {
                return "W";
            }
        } else {
            if (dx > 0) {
                return "N";
            } else {
                return "S";
            }
        }
    };

    ConnectionSegmentPoint.prototype.destroy = function () {
        this.removeControls();
    };

    ConnectionSegmentPoint.prototype.removeControls = function () {
        //unhook drag handlers
        if (this.midPoint) {
            this.midPoint.undrag();
            this.midPoint.unmouseover(this.midPointMouseOverCallBack);
            this.midPoint.unmouseout(this.midPointMouseOutCallBack);
            this.midPoint.undblclick(this.midPointDoubleClick);
            this.midPoint.remove();
            this.midPoint = null;
        }

        if (this.controlPointBefore) {
            this.controlPointBefore.undrag();
            this.controlPointBefore.unmouseover(this.controlPointBeforeMouseOverCallBack);
            this.controlPointBefore.unmouseout(this.controlPointBeforeMouseOutCallBack);
            this.controlPointBefore.remove();
            this.controlPointBefore = null;
        }
        if (this.controlPointAfter) {
            this.controlPointAfter.undrag();
            this.controlPointAfter.unmouseover(this.controlPointAfterMouseOverCallBack);
            this.controlPointAfter.unmouseout(this.controlPointAfterMouseOutCallBack);
            this.controlPointAfter.remove();
            this.controlPointAfter = null;
        }

        if (this.line) {
            this.line.remove();
            this.line = null;
        }
    };

    ConnectionSegmentPoint.prototype.addControls = function () {
        var cpBefore = {"x": this.x - this.cx,
                        "y": this.y - this.cy},
            cpAfter = {"x": this.x + this.cx,
                "y": this.y + this.cy},
            self = this;

        this.line = this.paper.path(["M", cpBefore.x, cpBefore.y, "L", cpAfter.x, cpAfter.y].join(","));
        this.midPoint = this.paper.circle(this.x, this.y, 4).attr({"stroke" : this.settings.defaultStrokeColor, "fill" : this.settings.defaultFillColor});
        this.controlPointBefore = this.paper.circle(cpBefore.x, cpBefore.y, 4).attr({"stroke" : this.settings.defaultStrokeColor, "fill" : this.settings.defaultFillColor});
        this.controlPointAfter = this.paper.circle(cpAfter.x, cpAfter.y, 4).attr({"stroke" : this.settings.defaultStrokeColor, "fill" : this.settings.defaultFillColor});

        this.midPointMouseOverCallBack = function () {
            self._mouseOver(self.midPoint);
        };

        this.midPointMouseOutCallBack = function () {
            self._mouseOut(self.midPoint);
        };

        this.midPointDoubleClick = function (event) {
            self.logger.debug("Deleting segment point '" + self.count + "'");
            self.removeControls();
            self.connectionComponent.removeSegmentPoint(self.count);
            event.stopPropagation();
        };

        this.controlPointBeforeMouseOverCallBack = function () {
            self._mouseOver(self.controlPointBefore);
        };

        this.controlPointBeforeMouseOutCallBack = function () {
            self._mouseOut(self.controlPointBefore);
        };

        this.controlPointAfterMouseOverCallBack = function () {
            self._mouseOver(self.controlPointAfter);
        };

        this.controlPointAfterMouseOutCallBack = function () {
            self._mouseOut(self.controlPointAfter);
        };

        this.midPoint.mouseover(this.midPointMouseOverCallBack).mouseout(this.midPointMouseOutCallBack);
        this.midPoint.dblclick(this.midPointDoubleClick);
        this.controlPointBefore.mouseover(this.controlPointBeforeMouseOverCallBack).mouseout(this.controlPointBeforeMouseOutCallBack);
        this.controlPointAfter.mouseover(this.controlPointAfterMouseOverCallBack).mouseout(this.controlPointAfterMouseOutCallBack);

        //hook up drag handlers
        this.midPoint.drag(this._onSegmentPointDragMove, this._onSegmentPointDragStart, this._onSegmentPointDragEnd, this, this, this);
        this.controlPointBefore.drag(this._onControlPointBeforeDragMove, this._onControlPointBeforeDragStart, this.onControlPointBeforeDragEnd, this, this, this);
        this.controlPointAfter.drag(this._onControlPointAfterDragMove, this._onControlPointAfterDragStart, this.onControlPointAfterDragEnd, this, this, this);
    };

    ConnectionSegmentPoint.prototype._mouseOver = function (circle) {
        circle.attr({ "fill": this.settings.mouseOverFillColor });
        document.body.style.cursor = "pointer";
    };

    ConnectionSegmentPoint.prototype._mouseOut = function (circle) {
        circle.attr({ "fill": this.settings.defaultFillColor });
        document.body.style.cursor = "default";
    };

    ConnectionSegmentPoint.prototype.redrawControls = function () {
        var cpBefore = {"x": this.x - this.cx,
                "y": this.y - this.cy},
            cpAfter = {"x": this.x + this.cx,
                "y": this.y + this.cy},
            linePathDef = ["M", cpBefore.x, cpBefore.y, "L", cpAfter.x, cpAfter.y].join(",");

        this.line.attr({"path": linePathDef});
        this.midPoint.attr({"cx": this.x,
                            "cy": this.y});
        this.controlPointBefore.attr({"cx": cpBefore.x,
            "cy": cpBefore.y});

        this.controlPointAfter.attr({"cx": cpAfter.x,
            "cy": cpAfter.y});

        this.line.toFront();
        this.midPoint.toFront();
        this.controlPointBefore.toFront();
        this.controlPointAfter.toFront();
    };

    /* DRAGGING SEGMENT POINT */
    ConnectionSegmentPoint.prototype._onSegmentPointDragStart = function (x, y, event) {
        //this.logger.debug("_onSegmentPointDragStart");
        this.validDrag = false;
        this.oldPos.x = this.x;
        this.oldPos.y = this.y;
        event.stopPropagation();
    };

    ConnectionSegmentPoint.prototype._onSegmentPointDragMove = function (dx, dy, x, y, event) {
        if (this.validDrag === false) {
            if ((Math.abs(dx) >= this.settings.minDragDistance) || (Math.abs(dy) >= this.settings.minDragDistance)) {
                this.validDrag = true;
            }
        }
        if (this.validDrag === true) {
            this.x = this.oldPos.x + dx;
            this.y = this.oldPos.y + dy;
            this.connectionComponent.redrawConnection();
            this.redrawControls();
        }
        event.stopPropagation();
    };

    ConnectionSegmentPoint.prototype._onSegmentPointDragEnd = function (event) {
        if (this.validDrag === true) {
            //this.logger.debug("_onSegmentPointDragEnd");
            this.connectionComponent.saveSegmentPoints();
        }
        event.stopPropagation();
    };
    /* END OF DRAGGING SEGMENT POINT */

    /*BEFORE CONTROL POINT EVENT HANDLERS*/
    ConnectionSegmentPoint.prototype._onControlPointBeforeDragStart = function (x, y, event) {
        this._saveControlPoint();
        event.stopPropagation();
    };

    ConnectionSegmentPoint.prototype._onControlPointBeforeDragMove = function (dx, dy, x, y, event) {
        this._moveControlPointBy(dx * -1, dy * -1);
        this.redrawControls();
        event.stopPropagation();
    };

    ConnectionSegmentPoint.prototype.onControlPointBeforeDragEnd = function (event) {
        this.connectionComponent.saveSegmentPoints();
        event.stopPropagation();
    };
    /*END OF BEFORE CONTROL POINT EVENT HANDLERS*/

    /*AFTER-CONTROL POINT EVENT HANDLERS*/
    ConnectionSegmentPoint.prototype._onControlPointAfterDragStart = function (x, y, event) {
        this._saveControlPoint();
        event.stopPropagation();
    };

    ConnectionSegmentPoint.prototype._onControlPointAfterDragMove = function (dx, dy, x, y, event) {
        this._moveControlPointBy(dx, dy);
        this.redrawControls();
        event.stopPropagation();
    };

    ConnectionSegmentPoint.prototype.onControlPointAfterDragEnd = function (event) {
        this.connectionComponent.saveSegmentPoints();
        event.stopPropagation();
    };
    /*END OF AFTER-CONTROL POINT EVENT HANDLERS*/

    ConnectionSegmentPoint.prototype._saveControlPoint = function () {
        this.oldContolPoint.x = this.cx;
        this.oldContolPoint.y = this.cy;
    };

    ConnectionSegmentPoint.prototype._moveControlPointBy = function (dx, dy) {
        this.cx = this.oldContolPoint.x + dx;
        this.cy = this.oldContolPoint.y + dy;
        this.redrawControls();
        this.connectionComponent.redrawConnection();
    };

    return ConnectionSegmentPoint;
});