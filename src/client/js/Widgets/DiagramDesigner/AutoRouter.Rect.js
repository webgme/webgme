/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author brollb / https://github/brollb
 */

define([
    'js/logger',
    './AutoRouter.Point',
    './AutoRouter.Size'
], function (Logger,
             ArPoint,
             ArSize) {

    'use strict';

    var _logger = Logger.create('gme:Widgets:DiagramDesigner:AutoRouter.Rect', WebGMEGlobal.gmeConfig.client.log);
    var ArRect = function (Left, Ceil, Right, Floor) {
        if (Left === undefined) { //No arguments
            Left = 0;
            Ceil = 0;
            Right = 0;
            Floor = 0;

        } else if (Ceil === undefined && Left instanceof ArRect) { // One argument
            // Left is an ArRect
            Ceil = Left.ceil;
            Right = Left.right;
            Floor = Left.floor;
            Left = Left.left;

        } else if (Right === undefined && Left instanceof ArPoint) { // Two arguments
            // Creating ArRect with ArPoint and either another ArPoint or ArSize
            if (Ceil instanceof ArSize) {
                Right = Left.x + Ceil.cx;
                Floor = Left.y + Ceil.cy;
                Ceil = Left.y;
                Left = Left.x;

            } else if (Left instanceof ArPoint && Ceil instanceof ArPoint) {
                Right = Math.round(Ceil.x);
                Floor = Math.round(Ceil.y);
                Ceil = Math.round(Left.y);
                Left = Math.round(Left.x);
            } else {
                throw new Error('Invalid ArRect Constructor');
            }

        } else if (Floor === undefined) { // Invalid
            throw new Error('Invalid ArRect Constructor');
        }

        this.left = Math.round(Left);
        this.ceil = Math.round(Ceil);
        this.floor = Math.round(Floor);
        this.right = Math.round(Right);
    };

    ArRect.prototype.getCenter = function () {
        return {'x': (this.left + this.right) / 2, 'y': (this.ceil + this.floor) / 2};
    };

    ArRect.prototype.getWidth = function () {
        return (this.right - this.left);
    };

    ArRect.prototype.getHeight = function () {
        return (this.floor - this.ceil);
    };

    ArRect.prototype.getSize = function () {
        return new ArSize(this.getWidth(), this.getHeight());
    };

    ArRect.prototype.getTopLeft = function () {
        return new ArPoint(this.left, this.ceil);
    };

    ArRect.prototype.getBottomRight = function () {
        return new ArPoint(this.right, this.floor);
    };

    ArRect.prototype.getCenterPoint = function () {
        return new ArPoint(this.left + this.getWidth() / 2, this.ceil + this.getHeight() / 2);
    };

    ArRect.prototype.isRectEmpty = function () {
        if ((this.left >= this.right) && (this.ceil >= this.floor)) {
            return true;
        }

        return false;
    };


    ArRect.prototype.isRectNull = function () {
        if (this.left === 0 &&
            this.right === 0 &&
            this.ceil === 0 &&
            this.floor === 0) {
            return true;
        }

        return false;
    };

    ArRect.prototype.ptInRect = function (pt) {
        if (pt instanceof Array) {
            pt = pt[0];
        }

        if (pt.x >= this.left &&
            pt.x <= this.right &&
            pt.y >= this.ceil &&
            pt.y <= this.floor) {
            return true;
        }

        return false;
    };

    ArRect.prototype.setRect = function (nLeft, nCeil, nRight, nFloor) {
        if (nCeil === undefined && nLeft instanceof ArRect) { //
            this.assign(nLeft);

        } else if (nRight === undefined || nFloor === undefined) { //invalid
            _logger.debug('Invalid args for [ArRect].setRect');

        } else {
            this.left = nLeft;
            this.ceil = nCeil;
            this.right = nRight;
            this.floor = nFloor;
        }

    };

    ArRect.prototype.setRectEmpty = function () {

        this.ceil = 0;
        this.right = 0;
        this.floor = 0;
        this.left = 0;
    };

    ArRect.prototype.inflateRect = function (x, y) {
        if (x !== undefined && x.cx !== undefined && x.cy !== undefined) {
            y = x.cy;
            x = x.cx;
        } else if (y === undefined) {
            y = x;
        }

        this.left -= x;
        this.right += x;
        this.ceil -= y;
        this.floor += y;
    };

    ArRect.prototype.deflateRect = function (x, y) {
        if (x !== undefined && x.cx !== undefined && x.cy !== undefined) {
            y = x.cy;
            x = x.cx;
        }

        this.left += x;
        this.right -= x;
        this.ceil += y;
        this.floor -= y;
    };

    ArRect.prototype.normalizeRect = function () {
        var temp;

        if (this.left > this.right) {
            temp = this.left;
            this.left = this.right;
            this.right = temp;
        }

        if (this.ceil > this.floor) {
            temp = this.ceil;
            this.ceil = this.floor;
            this.floor = temp;
        }
    };

    ArRect.prototype.assign = function (rect) {

        this.ceil = rect.ceil;
        this.right = rect.right;
        this.floor = rect.floor;
        this.left = rect.left;
    };

    ArRect.prototype.equals = function (rect) {
        if (this.left === rect.left &&
            this.right === rect.right &&
            this.ceil === rect.ceil &&
            this.floor === rect.floor) {
            return true;
        }

        return false;

    };

    ArRect.prototype.add = function (ArObject) {
        var dx,
            dy;
        if (ArObject instanceof ArPoint) {
            dx = ArObject.x;
            dy = ArObject.y;

        } else if (ArObject.cx !== undefined && ArObject.cy !== undefined) {
            dx = ArObject.cx;
            dy = ArObject.cy;

        } else {
            _logger.debug('Invalid arg for [ArRect].add method');
        }

        this.left += dx;
        this.right += dx;
        this.ceil += dy;
        this.floor += dy;
    };

    ArRect.prototype.subtract = function (ArObject) {
        if (ArObject instanceof ArPoint) {
            this.deflateRect(ArObject.x, ArObject.y);

        } else if (ArObject instanceof ArSize) {
            this.deflateRect(ArObject);

        } else if (ArObject instanceof ArRect) {
            this.left += ArObject.left;
            this.right -= ArObject.right;
            this.ceil += ArObject.ceil;
            this.floor -= ArObject.floor;

        } else {
            _logger.debug('Invalid arg for [ArRect].subtract method');
        }
    };

    ArRect.prototype.plus = function (ArObject) {
        var resObject = new ArRect(this);
        resObject.add(ArObject);

        return resObject;
    };

    ArRect.prototype.minus = function (ArObject) {
        var resObject = new ArRect(this);
        resObject.subtract(ArObject);

        return resObject;
    };

    ArRect.prototype.unionAssign = function (rect) {
        if (rect.isRectEmpty()) {
            return;
        }
        if (this.isRectEmpty()) {
            this.assign(rect);
            return;
        }

        //Take the outermost dimension
        this.left = Math.min(this.left, rect.left);
        this.right = Math.max(this.right, rect.right);
        this.ceil = Math.min(this.ceil, rect.ceil);
        this.floor = Math.max(this.floor, rect.floor);

    };

    ArRect.prototype.union = function (rect) {
        var resRect = new ArRect(this);
        resRect.unionAssign(rect);

        return resRect;
    };

    ArRect.prototype.intersectAssign = function (rect1, rect2) {
        rect2 = rect2 ? rect2 : this;
        //Sets this rect to the intersection rect
        this.left = Math.max(rect1.left, rect2.left);
        this.right = Math.min(rect1.right, rect2.right);
        this.ceil = Math.max(rect1.ceil, rect2.ceil);
        this.floor = Math.min(rect1.floor, rect2.floor);

        if (this.left >= this.right || this.ceil >= this.floor) {
            this.setRectEmpty();
            return false;
        }

        return true;
    };

    ArRect.prototype.intersect = function (rect) {
        var resRect = new ArRect(this);

        resRect.intersectAssign(rect);
        return resRect;
    };

    ArRect.prototype.touching = function (rect) {
        //One pixel is added to the minimums so, if they are not deemed to be touching
        //there is guaranteed to be at lease a one pixel path between them
        return Math.max(rect.left, this.left) <= Math.min(rect.right, this.right) + 1 &&
            Math.max(rect.ceil, this.ceil) <= Math.min(rect.floor, this.floor) + 1;
    };

    /**
     * Returns true if the given point is on one of the corners of the rectangle.
     *
     * @param point
     * @return {undefined}
     */
    ArRect.prototype.onCorner = function (point) {
        var onHorizontalSide,
            onVerticalSide;

        onHorizontalSide = point.x === this.left || point.x === this.right;
        onVerticalSide = point.y === this.ceil || point.y === this.floor;

        return onHorizontalSide && onVerticalSide;
    };

    ArRect.prototype.toString = function () {
        return this.getTopLeft().toString() + ' ' + this.getBottomRight().toString();
    };

    return ArRect;
});
