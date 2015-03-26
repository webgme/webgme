/*globals define, WebGMEGlobal*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * @author brollb / https://github/brollb
 */

define(['js/logger',
        'common/util/assert',
        './AutoRouter.Constants',
        './AutoRouter.Utils',
        './AutoRouter.Point',
        './AutoRouter.Size',
        './AutoRouter.Rect'], function (Logger,
                                           assert,
                                           CONSTANTS,
                                           Utils,
                                           ArPoint,
                                           ArSize,
                                           ArRect) {
                                               

    'use strict'; 

    var _logger = Logger.create('gme:Widgets:DiagramDesigner:AutoRouter.Port', WebGMEGlobal.gmeConfig.client.log);

    var AutoRouterPort = function () {
        this.id = null;
        this.owner = null;
        this.limitedDirections = true;
        this.rect = new ArRect();
        this.attributes = CONSTANTS.PortDefault;
        this.points = [ [], [], [], [] ];  // For this.points on CONSTANTS.DirTop, CONSTANTS.DirLeft, CONSTANTS.DirRight, etc
        this.selfPoints = [];
        this.availableArea = [];  // availableAreas keeps track of visible (not overlapped) portions of the port

        this.calculateSelfPoints();
    };

    AutoRouterPort.prototype.calculateSelfPoints = function () {
        this.selfPoints = [];
        this.selfPoints.push(new ArPoint(this.rect.getTopLeft()));

        this.selfPoints.push(new ArPoint( this.rect.right, this.rect.ceil));
        this.selfPoints.push(new ArPoint(this.rect.right, this.rect.floor));
        this.selfPoints.push(new ArPoint(this.rect.left, this.rect.floor));
        this.resetAvailableArea();
    };

    AutoRouterPort.prototype.hasOwner = function () {
        return this.owner !== null;
    };

    AutoRouterPort.prototype.isRectEmpty = function () {
        return this.rect.isRectEmpty();
    };

    AutoRouterPort.prototype.getCenter = function() {
        return this.rect.getCenterPoint();
    };

    AutoRouterPort.prototype.setRect = function (r) {
        assert(r.getWidth() >= 3 && r.getHeight() >= 3, 
               'ARPort.setRect: r.getWidth() >= 3 && r.getHeight() >= 3 FAILED!');

        this.rect.assign(r);
        this.calculateSelfPoints();
        this.resetAvailableArea();
    };

    AutoRouterPort.prototype.shiftBy = function (offset) {
        assert(!this.rect.isRectEmpty(), 'ARPort.shiftBy: !this.rect.isRectEmpty() FAILED!');

        this.rect.add(offset);

        this.calculateSelfPoints();
        // Shift points
        this.shiftPoints(offset);
    };

    AutoRouterPort.prototype.isConnectToCenter = function () {
        return (this.attributes & CONSTANTS.PortConnectToCenter) !== 0;
    };

    AutoRouterPort.prototype.hasLimitedDirs = function () {
        return this.limitedDirections;
    };

    AutoRouterPort.prototype.setLimitedDirs = function (ltd) {
        this.limitedDirections = ltd;
    };

    AutoRouterPort.prototype.portOnWhichEdge = function (point) {
        return Utils.onWhichEdge(this.rect, point);
    };

    AutoRouterPort.prototype.canHaveStartEndPointOn = function (dir, isStart) {
        assert( 0 <= dir && dir <= 3, 'ARPort.canHaveStartEndPointOn: 0 <= dir && dir <= 3 FAILED!');

        if( isStart) {
            dir += 4;
        }

        return ((this.attributes & (1 << dir)) !== 0);
    };

    AutoRouterPort.prototype.canHaveStartEndPoint = function (isStart) {
        return ((this.attributes & (isStart ? CONSTANTS.PortStartOnAll : CONSTANTS.PortEndOnAll)) !== 0);
    };

    AutoRouterPort.prototype.canHaveStartEndPointHorizontal = function (isHorizontal) {
        return ((this.attributes & (isHorizontal ? CONSTANTS.PortStartEndHorizontal : CONSTANTS.PortStartEndVertical)) !== 0);
    };

    AutoRouterPort.prototype.getStartEndDirTo = function (point, isStart, notthis) {
        assert( !this.rect.isRectEmpty(), 'ARPort.getStartEndDirTo: !this.rect.isRectEmpty() FAILED!');

        notthis = notthis ? notthis : CONSTANTS.DirNone; // if notthis is undefined, set it to CONSTANTS.DirNone (-1)

        var offset = point.minus(this.rect.getCenterPoint()),
            dir1 = Utils.getMajorDir(offset);

        if(dir1 !== notthis && this.canHaveStartEndPointOn(dir1, isStart)) {
            return dir1;
        }

        var dir2 = Utils.getMinorDir(offset);

        if(dir2 !== notthis && this.canHaveStartEndPointOn(dir2, isStart)) {
            return dir2;
        }

        var dir3 = Utils.reverseDir (dir2);

        if(dir3 !== notthis && this.canHaveStartEndPointOn(dir3, isStart)) {
            return dir3;
        }

        var dir4 = Utils.reverseDir (dir1);

        if(dir4 !== notthis && this.canHaveStartEndPointOn(dir4, isStart)) {
            return dir4;
        }

        if(this.canHaveStartEndPointOn(dir1, isStart)) {
            return dir1;
        }

        if(this.canHaveStartEndPointOn(dir2, isStart)) {
            return dir2;
        }

        if(this.canHaveStartEndPointOn(dir3, isStart)) {
            return dir3;
        }

        if(this.canHaveStartEndPointOn(dir4, isStart)) {
            return dir4;
        }

        return CONSTANTS.DirTop;
    };

    AutoRouterPort.prototype.roundToHalfGrid = function (left, right) {
        var btwn = (left + right)/2;
        assert(btwn < Math.max(left, right) && btwn > Math.min(left, right), 
               'roundToHalfGrid: btwn variable not between left, right values. Perhaps box/connectionArea is too small?');
        return btwn;
    };

    AutoRouterPort.prototype.createStartEndPointTo = function (point, dir) {
        // calculate pathAngle
        var dx = point.x - this.getCenter().x,
            dy = point.y - this.getCenter().y,
            pathAngle = Math.atan2(-dy, dx),
            k = 0,
            maxX = this.rect.right - 1,             // This is done to guarantee that the x,y will never round up to the corner of
            maxY = this.rect.floor - 1,             // the port. If it does, the next assert will fail.
            minX = this.rect.left,
            minY = this.rect.ceil,
            resultPoint,
            smallerPt = new ArPoint(minX, minY),  // The this.points that the resultPoint is centered between
            largerPt = new ArPoint(maxX, maxY);


        // Adjust angle based on part of port to which it is connecting
        switch(dir) {

            case CONSTANTS.DirTop:
                pathAngle = 2 * Math.PI - (pathAngle + Math.PI/2);
                largerPt.y = this.rect.ceil;
                break;

            case CONSTANTS.DirRight:
                pathAngle = 2 * Math.PI - pathAngle;
                smallerPt.x = this.rect.right;
                break;

            case CONSTANTS.DirBottom:
                pathAngle -= Math.PI/2;
                smallerPt.y = this.rect.floor;
                break;

            case CONSTANTS.DirLeft:
                largerPt.x = this.rect.left;
                break;
        }

        if( pathAngle < 0 ) {
            pathAngle += 2*Math.PI;
        }

        pathAngle *= 180/Math.PI;  // Using degrees for easier debugging

        // Finding this.points ordering
        while (k < this.points[dir].length && pathAngle > this.points[dir][k].pathAngle) {
            k++;
        }

        if (this.points[dir].length) {
            if (k === 0) {
                largerPt = new ArPoint(this.points[dir][k]);

            }else if (k !== this.points[dir].length) {
                smallerPt = new ArPoint(this.points[dir][k-1]);
                largerPt = new ArPoint(this.points[dir][k]);

            }else{
                smallerPt = new ArPoint(this.points[dir][k-1]);

            }
        }

        resultPoint = new ArPoint((largerPt.x + smallerPt.x)/2, (largerPt.y + smallerPt.y)/2);
        resultPoint.pathAngle = pathAngle;

        // Move the point over to an 'this.availableArea' if appropriate
        var i = this.availableArea.length,
            closestArea = 0,
            distance = Infinity,
            start,
            end;

        // Find distance from each this.availableArea and store closest index
        while(i--) {
            start = this.availableArea[i][0];
            end = this.availableArea[i][1];

            if (Utils.isOnEdge (start, end, resultPoint)) {
                closestArea = -1;
                break;
            } else if (Utils.distanceFromLine (resultPoint, start, end) < distance) {
                closestArea = i;
                distance = Utils.distanceFromLine (resultPoint, start, end);
            }
        }

        if (closestArea !== -1 && this.isAvailable()) { // resultPoint needs to be moved to the closest available area
            var dir2 = Utils.getDir (this.availableArea[closestArea][0].minus(resultPoint));

            assert(Utils.isRightAngle (dir2), 
                'AutoRouterPort.createStartEndPointTo: Utils.isRightAngle(dir2) FAILED');

            if (dir2 === CONSTANTS.DirLeft || dir2 === CONSTANTS.DirTop) { //Then resultPoint must be moved up
                largerPt = this.availableArea[closestArea][1];
            } else { // Then resultPoint must be moved down
                smallerPt = this.availableArea[closestArea][0];
            }

            resultPoint = new ArPoint((largerPt.x + smallerPt.x)/2, (largerPt.y + smallerPt.y)/2);
        }

        this.points[dir].splice(k, 0, resultPoint);

        assert(Utils.isRightAngle(this.portOnWhichEdge(resultPoint)), 
               'AutoRouterPort.createStartEndPointTo: Utils.isRightAngle(this.portOnWhichEdge(resultPoint)) FAILED');

        return resultPoint;
    };

    AutoRouterPort.prototype.removePoint = function (pt) {
        var removed;

        removed = Utils.removeFromArrays.apply(null, [pt].concat(this.points));
    };

    AutoRouterPort.prototype.hasPoint = function(pt) {
        var i = 0,
            k;

        while (i < 4) { //Check all sides for the point
            k = this.points[i].indexOf(pt);

            if (k > -1) { //If the point is on this side of the port
                return true;
            }
            i++;
        }

        return false;
    };

    AutoRouterPort.prototype.shiftPoints = function (shift) {
        for (var s = this.points.length; s--;) {
            for (var i = this.points[s].length; i--;) {
                // Shift this point
                this.points[s][i].add(shift);
            }
        }
    };

    AutoRouterPort.prototype.getPointCount = function () {
        var i = 0,
            count = 0;

        while( i < 4 ) { // Check all sides for the point
            count += this.points[i++].length;
        }

        return count;
    };

    AutoRouterPort.prototype.resetAvailableArea = function () {
        this.availableArea = [];

        if(this.canHaveStartEndPointOn(CONSTANTS.DirTop)) {
            this.availableArea.push([this.rect.getTopLeft(),  new ArPoint(this.rect.right, this.rect.ceil)]);
        }

        if(this.canHaveStartEndPointOn(CONSTANTS.DirRight)) {
            this.availableArea.push([new ArPoint(this.rect.right, this.rect.ceil),  this.rect.getBottomRight()]);
        }

        if(this.canHaveStartEndPointOn(CONSTANTS.DirBottom)) {
            this.availableArea.push([new ArPoint(this.rect.left, this.rect.floor),  this.rect.getBottomRight()]);
        }

        if(this.canHaveStartEndPointOn(CONSTANTS.DirLeft)) {
            this.availableArea.push([this.rect.getTopLeft(), new ArPoint(this.rect.left, this.rect.floor)]);
        }

    };

    AutoRouterPort.prototype.adjustAvailableArea = function (r) {
        //For all lines specified in availableAreas, check if the line Utils.intersect s the rectangle
        //If it does, remove the part of the line that Utils.intersect s the rectangle
        if(!this.rect.touching(r)) {
            return;
        }

        var i = this.availableArea.length,
            intersection,
            line;

        while(i--) {

            if(Utils.isLineClipRect (this.availableArea[i][0], this.availableArea[i][1], r)) {
                line = this.availableArea.splice(i, 1)[0];
                intersection = Utils.getLineClipRectIntersect(line[0], line[1], r);

                if(!intersection[0].equals(line[0])) {
                    this.availableArea.push([ line[0], intersection[0] ]);
                }

                if(!intersection[1].equals(line[1])) {
                    this.availableArea.push([ intersection[1], line[1] ]);
                }
            }
        }
    };

    AutoRouterPort.prototype.getTotalAvailableArea = function () {
        var i = this.availableArea.length,
            length = new ArSize();

        while(i--) {
            length.add(this.availableArea[i][1].minus(this.availableArea[i][0]));
        }

        assert(length.cx === 0 || length.cy === 0, 'ARPort.getTotalAvailableArea: length[0] === 0 || length[1] === 0 FAILED');
        return length.cx || length.cy;
    };

    AutoRouterPort.prototype.isAvailable = function () {
        return this.availableArea.length > 0;
    };

    AutoRouterPort.prototype.assertValid = function () {
        // Check that all points are on a side of the port
        var point;

        assert(this.owner, 'Port '+this.id+' does not have valid owner!');
        for (var s = this.points.length; s--;) {
            for (var i = this.points[s].length; i--;) {
                point = this.points[s][i];
                assert(Utils.isRightAngle(this.portOnWhichEdge(point)), 
                      'AutoRouterPort.createStartEndPointTo: Utils.isRightAngle(this.portOnWhichEdge(resultPoint)) FAILED');
            }
        }
    };

    AutoRouterPort.prototype.destroy = function () {
        // Remove all points
        this.owner = null;

        // Remove all points and self from all paths
        var point,
            path;

        for (var i = this.points.length; i--;) {
            for (var j = this.points[i].length; j--;) {
                point = this.points[i][j];
                path = point.owner;
                assert(path, 'start/end point does not have an owner!');
                path.removePort(this);
            }
        }

        this.points = [[],[],[],[]];

    };

    return AutoRouterPort;
});

