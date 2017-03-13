/*globals define, $, document*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    './DiagramDesignerWidget.Constants',
    'raphaeljs'
], function (DiagramDesignerWidgetConstants) {

    'use strict';

    var ConnectionSegmentPoint,
        MIN_WIDTH = 7,
        EVENTPOSTFIX = 'ConnectionSegmentPoint',
        MOUSEMOVE = 'mousemove.' + EVENTPOSTFIX,
        MOUSEUP = 'mouseup.' + EVENTPOSTFIX,
        MOVE_TYPE_SEGMENT_POINT = 'segment-point',
        MOVE_TYPE_BEZIER_CONTROL_POINT = 'control-point',
        MIN_DELTA = 10,
        IN_DRAW_LINETYPE = '-',
        SNAP_DISTANCE = 10,
        BEZIER_CONTROL_POINT_WIDTH_DIFF = 1;

    ConnectionSegmentPoint = function (params) {
        this.id = params.id;
        this.connection = params.connection;
        this.point = params.point;
        this.pointAfter = params.pointAfter;
        this.pointBefore = params.pointBefore;
        this.svgPaper = this.connection.paper;
        this.isBezier = this.connection.isBezier;

        this.width = Math.max(MIN_WIDTH, this.connection.designerAttributes.width);

        this._render();
    };

    ConnectionSegmentPoint.prototype.destroy = function () {
        if (this._moving === true) {
            //the connection point is being dragged
            //cancel drag
            this._detachMouseListeners();

            this._removeRedrawPath();
        }
        if (this.circle) {
            this.circle.remove();
            this.circle = undefined;
        }

        if (this.isBezier) {
            this.cpLine.remove();
            this.cpLine = undefined;

            this.cpBeforeCircle.remove();
            this.cpBeforeCircle = undefined;

            this.cpAfterCircle.remove();
            this.cpAfterCircle = undefined;
        }
    };

    ConnectionSegmentPoint.prototype._render = function () {
        //add bezier control point
        if (this.isBezier) {
            this.cpLine = this.svgPaper.path('M' + (this.point[0] - this.point[2]) + ',' +
            (this.point[1] - this.point[3]) + ' L' + (this.point[0] + this.point[2]) + ',' +
            (this.point[1] + this.point[3]));
        }

        //add segment point marker
        this.circle = this.svgPaper.circle(this.point[0], this.point[1], this.width);
        this.circle.node.setAttribute('class', DiagramDesignerWidgetConstants.CONNECTION_SEGMENT_POINT_CLASS);

        if (this.isBezier) {
            this.cpBeforeCircle = this.svgPaper.circle(this.point[0] - this.point[2], this.point[1] - this.point[3],
                this.width - BEZIER_CONTROL_POINT_WIDTH_DIFF);
            this.cpAfterCircle = this.svgPaper.circle(this.point[0] + this.point[2], this.point[1] + this.point[3],
                this.width - BEZIER_CONTROL_POINT_WIDTH_DIFF);

            this.cpBeforeCircle.node.setAttribute('class',
                DiagramDesignerWidgetConstants.CONNECTION_SEGMENT_POINT_BEZIER_CONTROL_CLASS);
            this.cpAfterCircle.node.setAttribute('class',
                DiagramDesignerWidgetConstants.CONNECTION_SEGMENT_POINT_BEZIER_CONTROL_CLASS);
        }

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

        //if Bezier
        if (this.isBezier) {
            this.cpBeforeCircle.mousedown(function (event) {
                var mousePos = self._getMousePos(event);

                self._startBezierControlPointMove(mousePos, true);
                self._attachBezierControlPointMouseListeners();
                event.stopPropagation();
            });

            this.cpAfterCircle.mousedown(function (event) {
                var mousePos = self._getMousePos(event);

                self._startBezierControlPointMove(mousePos, false);
                self._attachBezierControlPointMouseListeners();
                event.stopPropagation();
            });
        }
    };

    ConnectionSegmentPoint.prototype._getMousePos = function (e) {
        return this.connection.diagramDesigner.getAdjustedMousePos(e);
    };

    /*
     * Attaches MouseMove and MouseUp on document when the segment point moving started
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
            point;

        if (this._moving !== true) {
            if (Math.abs(dx) >= MIN_DELTA || Math.abs(dy) >= MIN_DELTA) {
                this._moving = true;
            }
        }

        if (this._moving === true) {

            point = this._snapCoordinate([mousePos.mX, mousePos.mY]);

            this.point[0] = point[0];
            this.point[1] = point[1];

            this.circle.attr({
                cx: this.point[0],
                cy: this.point[1]
            });

            if (this.isBezier) {
                this.cpLine.attr({'path': 'M' + (this.point[0] - this.point[2]) + ',' +
                (this.point[1] - this.point[3]) + ' L' + (this.point[0] + this.point[2]) + ',' +
                (this.point[1] + this.point[3])});

                this.cpBeforeCircle.attr({
                    'cx': this.point[0] - this.point[2],
                    'cy': this.point[1] - this.point[3]
                });
                this.cpAfterCircle.attr({
                    'cx': this.point[0] + this.point[2],
                    'cy': this.point[1] + this.point[3]
                });
            }

            this._redrawMovePath();
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
            } else if (this._moveType === MOVE_TYPE_BEZIER_CONTROL_POINT) {
                this.connection.setSegmentPoint(this.id, this.point[0], this.point[1], this.point[2], this.point[3]);
            }
        }

        this._removeRedrawPath();

        this._moving = false;
        this._moveType = undefined;
    };

    ConnectionSegmentPoint.prototype._removeRedrawPath = function () {
        if (this._movePath) {
            this._movePath.remove();
            this._movePath = undefined;
        }
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

    ConnectionSegmentPoint.prototype._startBezierControlPointMove = function (startPos, isPointBefore) {
        this._startPos = startPos;
        this._moveType = MOVE_TYPE_BEZIER_CONTROL_POINT;
        this._bezierControlBefore = isPointBefore;
        this._moving = false;
    };

    ConnectionSegmentPoint.prototype._attachBezierControlPointMouseListeners = function () {
        var self = this;

        $(document).on(MOUSEMOVE, function (event) {
            self._onBezierControlPointMouseMove(event);
            event.stopPropagation();
            event.preventDefault();
        });
        $(document).on(MOUSEUP, function (event) {
            self._onMouseUp(event);
            event.stopPropagation();
            event.preventDefault();
        });
    };

    ConnectionSegmentPoint.prototype._onBezierControlPointMouseMove = function (event) {
        var mousePos = this._getMousePos(event),
            dx = mousePos.mX - this._startPos.mX,
            dy = mousePos.mY - this._startPos.mY;


        if (this._moving !== true) {
            if (Math.abs(dx) >= MIN_DELTA || Math.abs(dy) >= MIN_DELTA) {
                this._moving = true;
            }
        }

        if (this._moving === true) {
            if (this._bezierControlBefore) {
                this.point[2] = this.point[0] - mousePos.mX;
                this.point[3] = this.point[1] - mousePos.mY;
            } else {
                this.point[2] = mousePos.mX - this.point[0];
                this.point[3] = mousePos.mY - this.point[1];
            }

            if (Math.abs(this.point[2]) < SNAP_DISTANCE) {
                this.point[2] = 0;
            }

            if (Math.abs(this.point[3]) < SNAP_DISTANCE) {
                this.point[3] = 0;
            }

            this.cpLine.attr({'path': 'M' + (this.point[0] - this.point[2]) + ',' + (this.point[1] - this.point[3]) +
            ' L' + (this.point[0] + this.point[2]) + ',' + (this.point[1] + this.point[3])});

            this.cpBeforeCircle.attr({
                'cx': this.point[0] - this.point[2],
                'cy': this.point[1] - this.point[3]
            });
            this.cpAfterCircle.attr({
                'cx': this.point[0] + this.point[2],
                'cy': this.point[1] + this.point[3]
            });

            this._redrawMovePath();
        }
    };

    ConnectionSegmentPoint.prototype._redrawMovePath = function () {
        var pathDef = [];

        if (this.isBezier) {
            pathDef.push('M' + this.pointBefore[0] + ',' + this.pointBefore[1]);
            pathDef.push('C' + (this.pointBefore[0] + this.pointBefore[2]) + ',' + (this.pointBefore[1] +
            this.pointBefore[3]) + ' ' + (this.point[0] - this.point[2]) + ',' + (this.point[1] - this.point[3]) +
            ' ' + this.point[0] + ',' + this.point[1]);
            pathDef.push('C' + (this.point[0] + this.point[2]) + ',' + (this.point[1] + this.point[3]) + ' ' +
            (this.pointAfter[0] - this.pointAfter[2]) + ',' + (this.pointAfter[1] - this.pointAfter[3]) + ' ' +
            this.pointAfter[0] + ',' + this.pointAfter[1]);
        } else {
            pathDef.push('M' + this.pointBefore[0] + ',' + this.pointBefore[1]);
            pathDef.push('L' + this.point[0] + ',' + this.point[1]);
            pathDef.push('L' + this.pointAfter[0] + ',' + this.pointAfter[1]);
        }

        pathDef = pathDef.join(' ');
        if (this._movePath) {
            this._movePath.attr({path: pathDef});
        } else {
            this._movePath = this.svgPaper.path(this.pathDef);
            this._movePath.attr({
                'stroke-width': this.connection.designerAttributes.width,
                'stroke-dasharray': IN_DRAW_LINETYPE
            });
            this._movePath.node.setAttribute('class', DiagramDesignerWidgetConstants.SEGMENT_POINT_MOVE_PATH_CLASS);

            //insert behind the segment-points
            this._movePath.node.parentNode.insertBefore(this._movePath.node,
                $(this.svgPaper.canvas).find('circle.' + DiagramDesignerWidgetConstants.CONNECTION_SEGMENT_POINT_CLASS)
                    .first()[0]);
        }
    };

    return ConnectionSegmentPoint;
});