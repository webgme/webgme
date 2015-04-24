/*globals define, $, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['jquery', 'js/logger'], function (__jquery, Logger) {

    'use strict';

    var DragScroll;

    DragScroll = function (containerNode) {
        this._logger = Logger.create('gme:Widgets:DiagramDesigner:DragScroll', WebGMEGlobal.gmeConfig.client.log);

        this._containerNode = containerNode;
    };

    DragScroll._SCROLL_STEP = 25;

    DragScroll._INTERVAL = 50;

    DragScroll.prototype.start = function () {
        var self = this;

        this._getContainerBoundaries();

        //hook up MouseMove and MouseUp
        this._onMouseMoveCallBack = function (event) {
            self._onMouseMove(event);
        };

        this._onMouseUpCallBack = function (/*event*/) {
            self._onMouseUp(/*event*/);
        };

        $(document).on('mousemove.DragScroll', this._onMouseMoveCallBack);
        $(document).on('mouseup.DragScroll', this._onMouseUpCallBack);
    };

    DragScroll.prototype._onMouseUp = function (/*event*/) {
        //unbind mousemove and mouseup handlers
        $(document).off('mousemove.DragScroll', this._onMouseMoveCallBack);
        $(document).off('mouseup.DragScroll', this._onMouseUpCallBack);

        //delete unnecessary instance members
        delete this._onMouseMoveCallBack;
        delete this._onMouseUpCallBack;

        this._stopScroll();
    };

    DragScroll.prototype._onMouseMove = function (event) {
        if (!this._isInContainerBounds(event.pageX, event.pageY)) {
            this._logger.debug('onMouseMove - outside ContainerBounds');
            //start scrolling
            this._scrollDelta = this._calculateScrollDelta(event.pageX, event.pageY);
            this._startScroll();
        } else {
            this._logger.debug('onMouseMove - INSIDE ContainerBounds');
            //stop scrolling
            this._stopScroll();
        }
    };

    DragScroll.prototype._startScroll = function () {
        var self = this;

        if (this._timer === undefined) {
            this._timer = window.setTimeout(function () {
                self._doScroll();
            }, DragScroll._INTERVAL);
        }
    };

    DragScroll.prototype._stopScroll = function () {
        if (this._timer) {
            window.clearTimeout(this._timer);
            this._timer = undefined;
        }
    };

    DragScroll.prototype._getContainerBoundaries = function () {
        var offset = this._containerNode.offset();

        this._containerBoundaries = {
            left: offset.left,
            top: offset.top,
            width: this._containerNode.width(),
            height: this._containerNode.height()
        };

        this._logger.debug('_containerBoundaries: ' + JSON.stringify(this._containerBoundaries));
    };

    DragScroll.prototype._isInContainerBounds = function (x, y) {
        return this._containerBoundaries.left <= x &&
            this._containerBoundaries.left + this._containerBoundaries.width >= x &&
            this._containerBoundaries.top <= y &&
            this._containerBoundaries.top + this._containerBoundaries.height >= y;
    };

    DragScroll.prototype._calculateScrollDelta = function (x, y) {
        var dx = 0,
            dy = 0;

        if (x < this._containerBoundaries.left) {
            dx = -DragScroll._SCROLL_STEP;
        } else if (x > this._containerBoundaries.left + this._containerBoundaries.width) {
            dx = DragScroll._SCROLL_STEP;
        }

        if (y < this._containerBoundaries.top) {
            dy = -DragScroll._SCROLL_STEP;
        } else if (y > this._containerBoundaries.top + this._containerBoundaries.height) {
            dy = DragScroll._SCROLL_STEP;
        }

        return {x: dx, y: dy};
    };

    DragScroll.prototype._doScroll = function () {
        var sTop, sLeft;

        this._logger.debug('doScroll - ' + JSON.stringify(this._scrollDelta));
        this._timer = undefined;
        if (this._scrollDelta) {
            if (this._scrollDelta.x !== 0 || this._scrollDelta.y !== 0) {
                sTop = this._containerNode[0].scrollTop;
                sLeft = this._containerNode[0].scrollLeft;

                this._containerNode[0].scrollTop += this._scrollDelta.y;
                this._containerNode[0].scrollLeft += this._scrollDelta.x;

                if (this._containerNode[0].scrollTop === 0 ||
                    this._containerNode[0].scrollTop < sTop + this._scrollDelta.y) {
                    this._scrollDelta.y = 0;
                }

                if (this._containerNode[0].scrollLeft === 0 ||
                    this._containerNode[0].scrollLeft < sLeft + this._scrollDelta.x) {
                    this._scrollDelta.x = 0;
                }

                this._startScroll();
            } else {
                this._scrollDelta = undefined;
                this._stopScroll();
            }
        }
    };

    return DragScroll;
});