/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    'raphaeljs'], function (DiagramDesignerWidgetConstants) {

    var ConnectionSegmentPoint,
        MIN_WIDTH = 5,
        EVENTPOSTFIX = 'ConnectionSegmentPoint',
        MOUSEMOVE = 'mousemove.' + EVENTPOSTFIX,
        MOUSEUP = 'mouseup.' + EVENTPOSTFIX,
        MOVE_TYPE_SEGMENT_POINT = "segment-point",
        MIN_DELTA = 10,
        IN_DRAW_LINETYPE = "-",
        SNAP_DISTANCE = 10;

    ConnectionSegmentPoint = function (params) {
        this.id = params.id;
        this.connection = params.connection;
        this.point = params.point;
        this.pointAfter= params.pointAfter;
        this.pointBefore = params.pointBefore;
        this.svgPaper = this.connection.paper;

        this.width = Math.max(MIN_WIDTH, this.connection.designerAttributes.width);

        this._render();
    };

    ConnectionSegmentPoint.prototype.destroy = function () {
        if (this.circle) {
            this.circle.remove();
            this.circle = undefined;
        }
    };

    ConnectionSegmentPoint.prototype._render = function () {
        this.circle = this.svgPaper.circle(this.point[0], this.point[1], this.width);

        this.circle.node.setAttribute('class', DiagramDesignerWidgetConstants.CONNECTION_SEGMENT_POINT_CLASS);

        this._initMouseHandlers();
    };

    ConnectionSegmentPoint.prototype._initMouseHandlers = function () {
        var self = this;

        this.circle.mousedown(function (event) {
            var mousePos = self._getMousePos(event);

            self._startSegmentPointMove(mousePos);
            self._attachMouseListeners();
            event.stopPropagation();
        });

        //double click for delete
        this.circle.dblclick(function (event) {
            self.connection.removeSegmentPoint(self.id);

            event.stopPropagation();
            event.preventDefault();
        });


    };

    ConnectionSegmentPoint.prototype._getMousePos = function (e) {
        return this.connection.diagramDesigner.getAdjustedMousePos(e);
    };

    /*
     * Attaches MouseMove and MouseUp on document when the connection draw/reconnect started
     */
    ConnectionSegmentPoint.prototype._attachMouseListeners = function () {
        var self = this;

        $(document).on(MOUSEMOVE, function (event) {
            self._onMouseMove(event);
            event.stopPropagation();
            event.preventDefault();
        });
        $(document).on(MOUSEUP, function (event) {
            self._onMouseUp(event);
            event.stopPropagation();
            event.preventDefault();
        });
    };

    /*
     * Detaches MouseMove and MouseUp on document when the connection draw/reconnect finished
     */
    ConnectionSegmentPoint.prototype._detachMouseListeners = function () {
        //unbind mousemove and mouseup handlers
        $(document).off(MOUSEMOVE);
        $(document).off(MOUSEUP);
    };

    ConnectionSegmentPoint.prototype._startSegmentPointMove = function (startPos) {
        this._startPos = startPos;
        this._moveType = MOVE_TYPE_SEGMENT_POINT;
        this._moving = false;
    };

    ConnectionSegmentPoint.prototype._onMouseMove = function (event) {
        var mousePos = this._getMousePos(event),
            dx = mousePos.mX - this._startPos.mX,
            dy = mousePos.mY - this._startPos.mY,
            pathDef,
            point;

        if (this._moving !== true) {
            if (Math.abs(dx) >= MIN_DELTA || Math.abs(dy) >= MIN_DELTA ) {
                this._moving = true;
            }
        }

        if (this._moving === true) {

            point = this._snapCoordinate([mousePos.mX, mousePos.mY]);

            this.circle.attr({'cx': point[0],
                              'cy': point[1]});

            pathDef = [];
            pathDef.push("M" + this.pointBefore[0] + "," + this.pointBefore[1]);
            pathDef.push("L" + point[0] + "," + point[1]);
            pathDef.push("L" + this.pointAfter[0] + "," + this.pointAfter[1]);
            pathDef = pathDef.join(" ");
            if (this._movePath) {
                this._movePath.attr({ "path": pathDef});
            } else {
                this._movePath = this.svgPaper.path(this.pathDef);
                this._movePath.attr({"stroke-width": this.connection.designerAttributes.width,
                                     "stroke-dasharray": IN_DRAW_LINETYPE});
                this._movePath.node.setAttribute('class', DiagramDesignerWidgetConstants.SEGMENT_POINT_MOVE_PATH_CLASS);

                //insert behind the segment-points
                this._movePath.node.parentNode.insertBefore(this._movePath.node, $(this.svgPaper.canvas).find('circle.' + DiagramDesignerWidgetConstants.CONNECTION_SEGMENT_POINT_CLASS).first()[0]);
            }
        }
    };

    ConnectionSegmentPoint.prototype._onMouseUp = function (event) {
        var mousePos = this._getMousePos(event),
            point;

        this._detachMouseListeners();

        if (this._moving === true) {
            if (this._moveType === MOVE_TYPE_SEGMENT_POINT) {
                point = this._snapCoordinate([mousePos.mX, mousePos.mY]);
                this.connection.setSegmentPoint(this.id, point[0], point[1], this.point[2], this.point[3]);
            }
        }

        if (this._movePath) {
            this._movePath.remove();
            this._movePath = undefined;
        }

        this._moving = false;
        this._moveType = undefined;
    };

    ConnectionSegmentPoint.prototype._snapCoordinate = function (point) {
        var x = point[0],
            y = point[1];

        //check if we can snap to the prev or following segment point
        if (Math.abs(this.pointBefore[0] - x) < SNAP_DISTANCE) {
            x = this.pointBefore[0];
        }

        if (Math.abs(this.pointBefore[1] - y) < SNAP_DISTANCE) {
            y = this.pointBefore[1];
        }

        if (Math.abs(this.pointAfter[0] - x) < SNAP_DISTANCE) {
            x = this.pointAfter[0];
        }

        if (Math.abs(this.pointAfter[1] - y) < SNAP_DISTANCE) {
            y = this.pointAfter[1];
        }

        return [x, y];
    };

    return ConnectionSegmentPoint;
});