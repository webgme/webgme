/*globals define*/
/*jshint browser: true*/

/**
 * @author brollb / https://github/brollb
 */


define([
    './AutoRouter.Constants',
    'common/util/assert',
    './AutoRouter.Rect',
    './AutoRouter.Point'
], function (CONSTANTS,
             assert,
             ArRect,
             ArPoint) {

    'use strict';

    var _getOptimalPorts = function (ports, tgt) {
        //I will get the dx, dy that to the src/dst target and then I will calculate
        // a priority value that will rate the ports as candidates for the 
        //given path
        var srcC = new ArPoint(), //src center
            vector,
            port, //result
            maxP = -Infinity,
            maxArea = 0,
            sPoint,
            i;

        //Get the center points of the src,dst ports
        for (i = 0; i < ports.length; i++) {
            sPoint = ports[i].rect.getCenter();
            srcC.x += sPoint.x;
            srcC.y += sPoint.y;

            //adjust maxArea
            if (maxArea < ports[i].getTotalAvailableArea()) {
                maxArea = ports[i].getTotalAvailableArea();
            }

        }

        //Get the average center point of src
        srcC.x = srcC.x / ports.length;
        srcC.y = srcC.y / ports.length;

        //Get the directions
        vector = (tgt.minus(srcC).getArray());

        //Create priority function
        function createPriority(port, center) {
            var priority = 0,
            //point = [  center.x - port.rect.getCenter().x, center.y - port.rect.getCenter().y],
                point = [port.rect.getCenter().x - center.x, port.rect.getCenter().y - center.y],
                lineCount = (port.getPointCount() || 1),
                //If there is a problem with maxArea, just ignore density
                density = (port.getTotalAvailableArea() / lineCount) / maxArea || 1,
                major = Math.abs(vector[0]) > Math.abs(vector[1]) ? 0 : 1,
                minor = (major + 1) % 2;

            if (point[major] > 0 === vector[major] > 0 && (point[major] === 0) === (vector[major] === 0)) {
                //handling the === 0 error
                //If they have the same parity, assign the priority to maximize that is > 1
                priority = (Math.abs(vector[major]) / Math.abs(vector[major] - point[major])) * 25;
            }

            if (point[minor] > 0 === vector[minor] > 0 && (point[minor] === 0) === (vector[minor] === 0)) {
                //handling the === 0 error
                //If they have the same parity, assign the priority to maximize that is < 1
                priority += vector[minor] !== point[minor] ?
                (Math.abs(vector[minor]) / Math.abs(vector[minor] - point[minor])) * 1 : 0;
            }

            //Adjust priority based on the density of the lines...
            priority *= density;

            return priority;
        }

        //Create priority values for each port.
        var priority;
        for (i = 0; i < ports.length; i++) {
            priority = createPriority(ports[i], srcC) || 0;
            if (priority >= maxP) {
                port = ports[i];
                maxP = priority;
            }
        }

        assert(port.owner, 'ARGraph.getOptimalPorts: port has invalid owner');

        return port;
    };

    var _getPointCoord = function (point, horDir) {
        if (horDir === true || _isHorizontal(horDir)) {
            return point.x;
        } else {
            return point.y;
        }
    };

    var _inflatedRect = function (rect, a) {
        var r = rect;
        r.inflateRect(a, a);
        return r;
    };

    var _isPointNear = function (p1, p2, nearness) {
        return p2.x - nearness <= p1.x && p1.x <= p2.x + nearness &&
            p2.y - nearness <= p1.y && p1.y <= p2.y + nearness;
    };

    var _isPointIn = function (point, rect, nearness) {
        var tmpR = new ArRect(rect);
        tmpR.inflateRect(nearness, nearness);
        return tmpR.ptInRect(point) === true;
    };

    var _isRectIn = function (r1, r2) {
        return r2.left <= r1.left && r1.right <= r2.right &&
            r2.ceil <= r1.ceil && r1.floor <= r2.floor;
    };

    var _isRectClip = function (r1, r2) {
        var rect = new ArRect();
        return rect.intersectAssign(r1, r2) === true;
    };

    var _distanceFromHLine = function (p, x1, x2, y) {
        assert(x1 <= x2, 'ArHelper.distanceFromHLine: x1 <= x2 FAILED');

        return Math.max(Math.abs(p.y - y), Math.max(x1 - p.x, p.x - x2));
    };

    var _distanceFromVLine = function (p, y1, y2, x) {
        assert(y1 <= y2, 'ArHelper.distanceFromVLine: y1 <= y2 FAILED');

        return Math.max(Math.abs(p.x - x), Math.max(y1 - p.y, p.y - y2));
    };

    var _distanceFromLine = function (pt, start, end) {
        var dir = _getDir(end.minus(start));

        if (_isHorizontal(dir)) {
            return _distanceFromVLine(pt, start.y, end.y, start.x);
        } else {
            return _distanceFromHLine(pt, start.x, end.x, start.y);
        }
    };

    var _isOnEdge = function (start, end, pt) {
        if (start.x === end.x) {			// vertical edge, horizontal move
            if (end.x === pt.x && pt.y <= Math.max(end.y, start.y) && pt.y >= Math.min(end.y, start.y)) {
                return true;
            }
        } else if (start.y === end.y) {	// horizontal line, vertical move
            if (start.y === pt.y && pt.x <= Math.max(end.x, start.x) && pt.x >= Math.min(end.x, start.x)) {
                return true;
            }
        }

        return false;
    };

    var _isPointNearLine = function (point, start, end, nearness) {
        assert(0 <= nearness, 'ArHelper.isPointNearLine: 0 <= nearness FAILED');

        // begin Zolmol
        // the routing may create edges that have start==end
        // thus confusing this algorithm
        if (end.x === start.x && end.y === start.y) {
            return false;
        }
        // end Zolmol

        var point2 = point;

        point2.subtract(start);

        var end2 = end;
        end2.subtract(start);

        var x = end2.x,
            y = end2.y,
            u = point2.x,
            v = point2.y,
            xuyv = x * u + y * v,
            x2y2 = x * x + y * y;

        if (xuyv < 0 || xuyv > x2y2) {
            return false;
        }

        var expr1 = (x * v - y * u);
        expr1 *= expr1;
        var expr2 = nearness * nearness * x2y2;

        return expr1 <= expr2;
    };

    var _isLineMeetHLine = function (start, end, x1, x2, y) {
        assert(x1 <= x2, 'ArHelper.isLineMeetHLine: x1 <= x2 FAILED');
        if (start instanceof Array) {//Converting from 'pointer'
            start = start[0];
        }
        if (end instanceof Array) {
            end = end[0];
        }

        if (!((start.y <= y && y <= end.y) || (end.y <= y && y <= start.y ))) {
            return false;
        }

        var end2 = new ArPoint(end);
        end2.subtract(start);
        x1 -= start.x;
        x2 -= start.x;
        y -= start.y;

        if (end2.y === 0) {
            return y === 0 && (( x1 <= 0 && 0 <= x2 ) || (x1 <= end2.x && end2.x <= x2));
        }

        var x = ((end2.x) / end2.y) * y;
        return x1 <= x && x <= x2;
    };

    var _isLineMeetVLine = function (start, end, y1, y2, x) {
        assert(y1 <= y2, 'ArHelper.isLineMeetVLine: y1 <= y2  FAILED');
        if (start instanceof Array) {//Converting from 'pointer'
            start = start[0];
        }
        if (end instanceof Array) {
            end = end[0];
        }

        if (!((start.x <= x && x <= end.x) || (end.x <= x && x <= start.x ))) {
            return false;
        }

        var end2 = new ArPoint(end);
        end2.subtract(start);
        y1 -= start.y;
        y2 -= start.y;
        x -= start.x;

        if (end2.x === 0) {
            return x === 0 && (( y1 <= 0 && 0 <= y2 ) || (y1 <= end2.y && end2.y <= y2));
        }

        var y = ((end2.y) / end2.x) * x;
        return y1 <= y && y <= y2;
    };

    var _isLineClipRects = function (start, end, rects) {
        var i = rects.length;
        while (i--) {
            if (_isLineClipRect(start, end, rects[i])) {
                return true;
            }
        }
        return false;
    };

    var _isLineClipRect = function (start, end, rect) {
        if (rect.ptInRect(start) || rect.ptInRect(end)) {
            return true;
        }

        return _isLineMeetHLine(start, end, rect.left, rect.right, rect.ceil) ||
            _isLineMeetHLine(start, end, rect.left, rect.right, rect.floor) ||
            _isLineMeetVLine(start, end, rect.ceil, rect.floor, rect.left) ||
            _isLineMeetVLine(start, end, rect.ceil, rect.floor, rect.right);
    };

    var _getLineClipRectIntersect = function (start, end, rect) {
        //return the endpoints of the intersection line
        var dir = _getDir(end.minus(start)),
            endpoints = [new ArPoint(start), new ArPoint(end)];

        if (!_isLineClipRect(start, end, rect)) {
            return null;
        }

        assert(_isRightAngle(dir), 'ArHelper.getLineClipRectIntersect: _isRightAngle(dir) FAILED');

        //Make sure we are working left to right or top down
        if (dir === CONSTANTS.DirLeft || dir === CONSTANTS.DirTop) {
            dir = _reverseDir(dir);
            endpoints.push(endpoints.splice(0, 1)[0]); //Swap point 0 and point 1
        }

        if (_isPointInDirFrom(endpoints[0], rect.getTopLeft(), _reverseDir(dir))) {
            endpoints[0].assign(rect.getTopLeft());
        }

        if (_isPointInDirFrom(endpoints[1], rect.getBottomRight(), dir)) {
            endpoints[1].assign(rect.getBottomRight());
        }

        if (_isHorizontal(dir)) {
            endpoints[0].y = start.y;
            endpoints[1].y = end.y;
        } else {
            endpoints[0].x = start.x;
            endpoints[1].x = end.x;
        }

        return endpoints;

    };

    var _intersect = function (a1, a2, b1, b2) {
        return Math.min(a1, a2) <= Math.max(b1, b2) && Math.min(b1, b2) <= Math.max(a1, a2);
    };

    // --------------------------- RoutingDirection

    var _isHorizontal = function (dir) {
        return dir === CONSTANTS.DirRight || dir === CONSTANTS.DirLeft;
    };

    var _isVertical = function (dir) {
        return dir === CONSTANTS.DirTop || dir === CONSTANTS.DirBottom;
    };

    var _isRightAngle = function (dir) {
        return CONSTANTS.DirTop <= dir && dir <= CONSTANTS.DirLeft;
    };

    var _areInRightAngle = function (dir1, dir2) {
        assert(_isRightAngle(dir1) && _isRightAngle(dir2),
            'ArHelper.areInRightAngle: _isRightAngle(dir1) && _isRightAngle(dir2) FAILED');
        return _isHorizontal(dir1) === _isVertical(dir2);
    };

    var _nextClockwiseDir = function (dir) {
        if (_isRightAngle(dir)) {
            return ((dir + 1) % 4);
        }

        return dir;
    };

    var _prevClockwiseDir = function (dir) {
        if (_isRightAngle(dir)) {
            return ((dir + 3) % 4);
        }

        return dir;
    };

    var _reverseDir = function (dir) {
        if (_isRightAngle(dir)) {
            return ((dir + 2) % 4);
        }

        return dir;
    };

    var _stepOneInDir = function (point, dir) {
        assert(_isRightAngle(dir), 'ArHelper.stepOnInDir: _isRightAngle(dir) FAILED');

        switch (dir) {
            case CONSTANTS.DirTop:
                point.y--;
                break;

            case CONSTANTS.DirRight:
                point.x++;
                break;

            case CONSTANTS.DirBottom:
                point.y++;
                break;

            case CONSTANTS.DirLeft:
                point.x--;
                break;
        }

    };

    var _getChildRectOuterCoordFrom = function (bufferObject, inDir, point) { //Point travels inDir until hits child box
        var children = bufferObject.children,
            i = -1,
            box = null,
            res = _getRectOuterCoord(bufferObject.box, inDir);

        assert(_isRightAngle(inDir), 'getChildRectOuterCoordFrom: _isRightAngle(inDir) FAILED');
        //The next assert fails if the point is in the opposite direction of the rectangle that it is checking.
        // e.g. The point is checking when it will hit the box from the right but the point is on the left
        assert(!_isPointInDirFrom(point, bufferObject.box, inDir),
            'getChildRectOuterCoordFrom: !isPointInDirFrom(point, bufferObject.box.rect, (inDir)) FAILED');

        while (++i < children.length) {

            if (_isPointInDirFrom(point, children[i], _reverseDir(inDir)) &&
                _isPointBetweenSides(point, children[i], inDir) &&
                _isCoordInDirFrom(res, _getRectOuterCoord(children[i], _reverseDir(inDir)), (inDir))) {

                res = _getRectOuterCoord(children[i], _reverseDir(inDir));
                box = children[i];
            }
        }

        return {'box': box, 'coord': res};
    };

    var _getRectOuterCoord = function (rect, dir) {
        assert(_isRightAngle(dir), 'Utils.getRectOuterCoord: isRightAngle(dir) FAILED');
        var t = rect.ceil - 1,
            r = rect.right + 1,
            b = rect.floor + 1,
            l = rect.left - 1;

        switch (dir) {
            case CONSTANTS.DirTop:
                return t;

            case CONSTANTS.DirRight:
                return r;

            case CONSTANTS.DirBottom:
                return b;
        }

        return l;
    };

    //	Indexes:
    //				 04
    //				1  5
    //				3  7
    //				 26

    var getDirTableIndex = function (offset) {
        return (offset.cx >= 0) * 4 + (offset.cy >= 0) * 2 + (Math.abs(offset.cx) >= Math.abs(offset.cy));
    };

    var majorDirTable =
        [
            CONSTANTS.DirTop,
            CONSTANTS.DirLeft,
            CONSTANTS.DirBottom,
            CONSTANTS.DirLeft,
            CONSTANTS.DirTop,
            CONSTANTS.DirRight,
            CONSTANTS.DirBottom,
            CONSTANTS.DirRight
        ];

    var _getMajorDir = function (offset) {
        return majorDirTable[getDirTableIndex(offset)];
    };

    var minorDirTable =
        [
            CONSTANTS.DirLeft,
            CONSTANTS.DirTop,
            CONSTANTS.DirLeft,
            CONSTANTS.DirBottom,
            CONSTANTS.DirRight,
            CONSTANTS.DirTop,
            CONSTANTS.DirRight,
            CONSTANTS.DirBottom
        ];

    var _getMinorDir = function (offset) {
        return minorDirTable[getDirTableIndex(offset)];
    };

    //	FG123
    //	E   4
    //	D 0 5
    //	C   6
    //  BA987


    var _exGetDirTableIndex = function (offset) {
        //This required a variable assignment; otherwise this function
        //returned undefined...
        var res =
            offset.cx > 0 ?
                (
                    offset.cy > 0 ?
                        (
                            offset.cx > offset.cy ?
                                (
                                    6
                                ) :
                                (offset.cx < offset.cy ?
                                    (
                                        8
                                    ) :
                                    (
                                        7
                                    ))
                        ) :
                        (offset.cy < 0 ?
                            (
                                offset.cx > -offset.cy ?
                                    (
                                        4
                                    ) :
                                    (offset.cx < -offset.cy ?
                                        (
                                            2
                                        ) :
                                        (
                                            3
                                        ))
                            ) :
                            (
                                5
                            ))
                ) :
                (offset.cx < 0 ?
                    (
                        offset.cy > 0 ?
                            (
                                -offset.cx > offset.cy ?
                                    (
                                        12
                                    ) :
                                    (-offset.cx < offset.cy ?
                                        (
                                            10
                                        ) :
                                        (
                                            11
                                        ))
                            ) :
                            (offset.cy < 0 ?
                                (
                                    offset.cx < offset.cy ?
                                        (
                                            14
                                        ) :
                                        (offset.cx > offset.cy ?
                                            (
                                                16
                                            ) :
                                            (
                                                15
                                            ))
                                ) :
                                (
                                    13
                                ))
                    ) :
                    (
                        offset.cy > 0 ?
                            (
                                9
                            ) :
                            (offset.cy < 0 ?
                                (
                                    1
                                ) :
                                (
                                    0
                                ))
                    ));

        return res;
    };
    var exMajorDirTable =
        [
            CONSTANTS.DirNone,
            CONSTANTS.DirTop,
            CONSTANTS.DirTop,
            CONSTANTS.DirRight,
            CONSTANTS.DirRight,
            CONSTANTS.DirRight,
            CONSTANTS.DirRight,
            CONSTANTS.DirRight,
            CONSTANTS.DirBottom,
            CONSTANTS.DirBottom,
            CONSTANTS.DirBottom,
            CONSTANTS.DirLeft,
            CONSTANTS.DirLeft,
            CONSTANTS.DirLeft,
            CONSTANTS.DirLeft,
            CONSTANTS.DirLeft,
            CONSTANTS.DirTop
        ];

    var _exGetMajorDir = function (offset) {
        return exMajorDirTable[_exGetDirTableIndex(offset)];
    };

    var exMinorDirTable =
        [
            CONSTANTS.DirNone,
            CONSTANTS.DirNone,
            CONSTANTS.DirRight,
            CONSTANTS.DirTop,
            CONSTANTS.DirTop,
            CONSTANTS.DirNone,
            CONSTANTS.DirBottom,
            CONSTANTS.DirBottom,
            CONSTANTS.DirRight,
            CONSTANTS.DirNone,
            CONSTANTS.DirLeft,
            CONSTANTS.DirBottom,
            CONSTANTS.DirBottom,
            CONSTANTS.DirNone,
            CONSTANTS.DirTop,
            CONSTANTS.DirTop,
            CONSTANTS.DirLeft
        ];

    var _exGetMinorDir = function (offset) {
        return exMinorDirTable[_exGetDirTableIndex(offset)];
    };

    var _getDir = function (offset, nodir) {
        if (offset.cx === 0) {
            if (offset.cy === 0) {
                return nodir;
            }

            if (offset.cy < 0) {
                return CONSTANTS.DirTop;
            }

            return CONSTANTS.DirBottom;
        }

        if (offset.cy === 0) {
            if (offset.cx > 0) {
                return CONSTANTS.DirRight;
            }

            return CONSTANTS.DirLeft;
        }

        return CONSTANTS.DirSkew;
    };

    var _isPointInDirFromChildren = function (point, fromParent, dir) {
        var children = fromParent.children,
            i = 0;

        assert(_isRightAngle(dir), 'isPointInDirFromChildren: _isRightAngle(dir) FAILED');

        while (i < children.length) {
            if (_isPointInDirFrom(point, children[i].rect, dir)) {
                return true;
            }
            ++i;
        }

        return false;
    };

    var _isPointInDirFrom = function (point, from, dir) {
        if (from instanceof ArRect) {
            var rect = from;
            assert(_isRightAngle(dir), 'ArHelper.isPointInDirFrom: _isRightAngle(dir) FAILED');

            switch (dir) {
                case CONSTANTS.DirTop:
                    return point.y < rect.ceil;

                case CONSTANTS.DirRight:
                    return point.x >= rect.right;

                case CONSTANTS.DirBottom:
                    return point.y >= rect.floor;

                case CONSTANTS.DirLeft:
                    return point.x < rect.left;
            }

            return false;

        } else {
            assert(_isRightAngle(dir), 'ArHelper.isPointInDirFrom: _isRightAngle(dir) FAILED');

            switch (dir) {
                case CONSTANTS.DirTop:
                    return point.y <= from.y;

                case CONSTANTS.DirRight:
                    return point.x >= from.x;

                case CONSTANTS.DirBottom:
                    return point.y >= from.y;

                case CONSTANTS.DirLeft:
                    return point.x <= from.x;
            }

            return false;

        }
    };

    var _isPointBetweenSides = function (point, rect, ishorizontal) {
        if (ishorizontal === true || _isHorizontal(ishorizontal)) {
            return rect.ceil <= point.y && point.y < rect.floor;
        }

        return rect.left <= point.x && point.x < rect.right;
    };

    var _isCoordInDirFrom = function (coord, from, dir) {
        assert(_isRightAngle(dir), 'ArHelper.isCoordInDirFrom: _isRightAngle(dir) FAILED');
        if (from instanceof ArPoint) {
            from = _getPointCoord(from, dir);
        }

        if (dir === CONSTANTS.DirTop || dir === CONSTANTS.DirLeft) {
            return coord <= from;
        }

        return coord >= from;
    };

    // This next method only supports unambiguous orientations. That is, the point
    // cannot be in a corner of the rectangle.
    // NOTE: the right and floor used to be - 1. 
    var _onWhichEdge = function (rect, point) {
        if (point.y === rect.ceil && rect.left < point.x && point.x < rect.right) {
            return CONSTANTS.DirTop;
        }

        if (point.y === rect.floor && rect.left < point.x && point.x < rect.right) {
            return CONSTANTS.DirBottom;
        }

        if (point.x === rect.left && rect.ceil < point.y && point.y < rect.floor) {
            return CONSTANTS.DirLeft;
        }

        if (point.x === rect.right && rect.ceil < point.y && point.y < rect.floor) {
            return CONSTANTS.DirRight;
        }

        return CONSTANTS.DirNone;
    };
    // --------------------------- CArFindNearestLine

    var ArFindNearestLine = function (pt) {
        this.point = pt;
        this.dist1 = Infinity;
        this.dist2 = Infinity;
    };

    ArFindNearestLine.prototype.hLine = function (x1, x2, y) {
        assert(x1 <= x2, 'ArFindNearestLine.hLine: x1 <= x2  FAILED');

        var d1 = _distanceFromHLine(this.point, x1, x2, y),
            d2 = Math.abs(this.point.y - y);

        if (d1 < this.dist1 || (d1 === this.dist1 && d2 < this.dist2)) {
            this.dist1 = d1;
            this.dist2 = d2;
            return true;
        }

        return false;
    };

    ArFindNearestLine.prototype.vLine = function (y1, y2, x) {
        assert(y1 <= y2, 'ArFindNearestLine.hLine: y1 <= y2 FAILED');

        var d1 = _distanceFromVLine(this.point, y1, y2, x),
            d2 = Math.abs(this.point.x - x);

        if (d1 < this.dist1 || (d1 === this.dist1 && d2 < this.dist2)) {
            this.dist1 = d1;
            this.dist2 = d2;
            return true;
        }

        return false;
    };

    ArFindNearestLine.prototype.was = function () {
        return this.dist1 < Infinity && this.dist2 < Infinity;
    };

    // Convenience Functions
    var removeFromArrays = function (value) {
        var index,
            removed = false,
            array;

        for (var i = arguments.length - 1; i > 0; i--) {
            array = arguments[i];
            index = array.indexOf(value);
            if (index !== -1) {
                array.splice(index, 1);
                removed = true;
            }
        }

        return removed;
    };

    var stringify = function (value) {
        return JSON.stringify(value, function (key, value) {
            if (key === 'owner' && value) {
                return value.id || typeof value;
            }
            return value;
        });
    };

    /**
     * Round the number to the given decimal places. Truncate following digits.
     *
     * @param {Number} value
     * @param {Number} places
     * @return {Number} result
     */
    var roundTrunc = function (value, places) {
        value = +value;
        var scale = Math.pow(10, +places),
            fn = 'floor';

        if (value < 0) {
            fn = 'ceil';
        }

        return Math[fn](value * scale) / scale;
    };

    //Float equals
    var floatEquals = function (a, b) {
        return ((a - 0.1) < b) && (b < (a + 0.1));
    };

    /**
     * Convert an object with increasing integer keys to an array.
     * Using method from http://jsperf.com/arguments-performance/6
     *
     * @param {Object} obj
     * @return {Array}
     */
    var toArray = function (obj) {
        var result = new Array(obj.length||0),
            i = 0;
        while (obj[i] !== undefined) {
            result[i] = obj[i++];
        }
        return result;
    };

    /**
     * Perform a deep copy of an object
     *
     * @param {Object} obj
     * @return {undefined}
     */
    var deepCopy = function (obj) {
        var res = obj instanceof Array ? [] : {};
        for (var k in obj) {
            if (typeof obj[k] === 'object') {
                res[k] = deepCopy(obj[k]);
            } else {
                res[k] = obj[k];
            }
        }
        return res;
    };

    var pick = function(keys, obj) {
        var res = {};
        for (var i = keys.length; i--;) {
            res[keys[i]] = obj[keys[i]];
        }
        return res;
    };

    return {
        onWhichEdge: _onWhichEdge,
        isCoordInDirFrom: _isCoordInDirFrom,
        isPointBetweenSides: _isPointBetweenSides,
        isPointInDirFrom: _isPointInDirFrom,
        isPointInDirFromChildren: _isPointInDirFromChildren,
        isPointIn: _isPointIn,
        isPointNear: _isPointNear,
        getDir: _getDir,
        exGetMinorDir: _exGetMinorDir,
        exGetMajorDir: _exGetMajorDir,
        exGetDirTableIndex: _exGetDirTableIndex,
        getMinorDir: _getMinorDir,
        getMajorDir: _getMajorDir,
        getRectOuterCoord: _getRectOuterCoord,
        getChildRectOuterCoordFrom: _getChildRectOuterCoordFrom,
        stepOneInDir: _stepOneInDir,
        reverseDir: _reverseDir,
        prevClockwiseDir: _prevClockwiseDir,
        nextClockwiseDir: _nextClockwiseDir,
        areInRightAngle: _areInRightAngle,
        isRightAngle: _isRightAngle,
        isHorizontal: _isHorizontal,
        intersect: _intersect,
        getLineClipRectIntersect: _getLineClipRectIntersect,
        isLineClipRect: _isLineClipRect,
        isLineClipRects: _isLineClipRects,
        isPointNearLine: _isPointNearLine,
        isOnEdge: _isOnEdge,
        distanceFromLine: _distanceFromLine,
        isRectClip: _isRectClip,
        isRectIn: _isRectIn,
        inflatedRect: _inflatedRect,
        getPointCoord: _getPointCoord,
        getOptimalPorts: _getOptimalPorts,
        ArFindNearestLine: ArFindNearestLine,

        removeFromArrays: removeFromArrays,
        stringify: stringify,
        floatEquals: floatEquals,
        roundTrunc: roundTrunc,
        deepCopy: deepCopy,
        toArray: toArray,
        pick: pick 
    };

});
