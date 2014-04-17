"use strict"; 

define(['logManager',
	    'util/assert',
        './AutoRouter.Constants',
        './AutoRouter.Utils',
        './AutoRouter.Point',
        './AutoRouter.Size',
        './AutoRouter.Rect'], function (logManager,
										   assert,
                                           CONSTANTS,
                                           UTILS,
                                           ArPoint,
                                           ArSize,
                                           ArRect) {
                                               


    var AutoRouterPort = function (){
        this.owner = null;
        this.limitedDirections = true;
        this.rect = new ArRect();
        this.attributes = CONSTANTS.ARPORT_Default;
        this.points = [ [], [], [], [] ];//For this.points on CONSTANTS.Dir_Top, CONSTANTS.Dir_Left, CONSTANTS.Dir_Right, etc
        this.selfPoints = [];
        this.availableArea = [];//availableAreas keeps track of visible (not overlapped) portions of the port

        this.calculateSelfPoints();
    };



    AutoRouterPort.prototype.calculateSelfPoints = function (){
        this.selfPoints = [];
        this.selfPoints.push(new ArPoint(this.rect.getTopLeft()));

        this.selfPoints.push(new ArPoint( this.rect.right, this.rect.ceil));
        this.selfPoints.push(new ArPoint(this.rect.right, this.rect.floor));
        this.selfPoints.push(new ArPoint(this.rect.left, this.rect.floor));
        this.resetAvailableArea();
    };

    AutoRouterPort.prototype.destroy = function (){
        this.setOwner(null);
    };

    AutoRouterPort.prototype.getOwner = function (){
        return this.owner;
    };

    AutoRouterPort.prototype.hasOwner = function (){
        return this.owner !== null;
    };

    AutoRouterPort.prototype.setOwner = function (box){
        this.owner = box;
    };

    AutoRouterPort.prototype.getRect = function (){
        return this.rect;
    };

    AutoRouterPort.prototype.isRectEmpty = function (){
        return this.rect.isRectEmpty();
    };

    AutoRouterPort.prototype.getCenter = function(){
        return this.rect.getCenterPoint();
    };

    AutoRouterPort.prototype.setRect = function (r){
        assert( r.getWidth() >= 3 && r.getHeight() >= 3, "ARPort.setRect: r.getWidth() >= 3 && r.getHeight() >= 3 FAILED!");

        this.rect.assign(r);
        this.calculateSelfPoints();
        this.resetAvailableArea();
    };

    AutoRouterPort.prototype.shiftBy = function (offset){
        assert( !this.rect.isRectEmpty(), "ARPort.shiftBy: !this.rect.isRectEmpty() FAILED!");

        this.rect.add(offset);

        this.calculateSelfPoints();
    };

    AutoRouterPort.prototype.getSelfPoints = function (){
        return this.selfPoints;
    };

    AutoRouterPort.prototype.getAttributes = function (){
        return this.attributes;
    };

    AutoRouterPort.prototype.setAttributes = function (attr){
        this.attributes = attr;
    };

    AutoRouterPort.prototype.isConnectToCenter = function (){
        return (this.attributes & CONSTANTS.ARPORT_ConnectToCenter) != 0;
    };

    AutoRouterPort.prototype.hasLimitedDirs = function (){
        return this.limitedDirections;
    };

    AutoRouterPort.prototype.setLimitedDirs = function (ltd){
        this.limitedDirections = ltd;
    };

    AutoRouterPort.prototype.isPortAt = function (point, nearness){
        return UTILS.isPointIn(point, this.rect, nearness);
    };

    AutoRouterPort.prototype.isPortClip = function (otherRect){
        return UTILS.isRectClip (this.rect, otherRect);
    };

    AutoRouterPort.prototype.isPortIn = function (otherRect){
        return UTILS.isRectIn(this.rect, otherRect);
    };

    AutoRouterPort.prototype.port_OnWhichEdge = function (point){
        return UTILS.onWhichEdge(this.rect, point);
    };

    AutoRouterPort.prototype.canHaveStartEndPointOn = function (dir, isStart){
        assert( 0 <= dir && dir <= 3, "ARPort.canHaveStartEndPointOn: 0 <= dir && dir <= 3 FAILED!");

        if( isStart)
            dir += 4;

        return ((this.attributes & (1 << dir)) != 0);
    };

    AutoRouterPort.prototype.canHaveStartEndPoint = function (isStart){
        return ((this.attributes & (isStart ? CONSTANTS.ARPORT_StartOnAll : CONSTANTS.ARPORT_EndOnAll)) != 0);
    };

    AutoRouterPort.prototype.canHaveStartEndPointHorizontal = function (isHorizontal){
        return ((this.attributes & (isHorizontal ? CONSTANTS.ARPORT_StartEndHorizontal : CONSTANTS.ARPORT_StartEndVertical)) != 0);
    };

    AutoRouterPort.prototype.getStartEndDirTo = function (point, isStart, notthis){
        assert( !this.rect.isRectEmpty(), "ARPort.getStartEndDirTo: !this.rect.isRectEmpty() FAILED!");

        notthis = notthis ? notthis : CONSTANTS.Dir_None; //if notthis is undefined, set it to CONSTANTS.Dir_None (-1)

        var offset = point.minus(this.rect.getCenterPoint()),
            canHave = false,
            dir1 = UTILS.getMajorDir(offset);

        if(dir1 !== notthis && this.canHaveStartEndPointOn(dir1, isStart))
            return dir1;

        var dir2 = UTILS.getMinorDir(offset);

        if(dir2 !== notthis && this.canHaveStartEndPointOn(dir2, isStart))
            return dir2;

        var dir3 = UTILS.reverseDir (dir2);

        if(dir3 !== notthis && this.canHaveStartEndPointOn(dir3, isStart))
            return dir3;

        var dir4 = UTILS.reverseDir (dir1);

        if(dir4 !== notthis && this.canHaveStartEndPointOn(dir4, isStart))
            return dir4;

        if(this.canHaveStartEndPointOn(dir1, isStart))
            return dir1;

        if(this.canHaveStartEndPointOn(dir2, isStart))
            return dir2;

        if(this.canHaveStartEndPointOn(dir3, isStart))
            return dir3;

        if(this.canHaveStartEndPointOn(dir4, isStart))
            return dir4;

        return CONSTANTS.Dir_Top;
    };

    AutoRouterPort.prototype.canCreateStartEndPointAt = function (point, isStart, nearness){
        return this.canHaveStartEndPoint(isStart) && UTILS.isPointIn(point, this.rect, nearness);
    };

    AutoRouterPort.prototype.createStartEndPointAt = function (pt, isStart){
        assert( !this.rect.isRectEmpty(), "ARPort.createStartEndPointAt: !this.rect.isRectEmpty() FAILED!");

        var point = new ArPoint(p),
            dir = CONSTANTS.Dir_None,
            nearest = new UTILS.ArFindNearestLine(point),
            canHave = false;

        if(this.canHaveStartEndPointOn(CONSTANTS.Dir_Top, isStart) && nearest.HLine(this.rect.left, this.rect.right, this.rect.ceil))
            dir = CONSTANTS.Dir_Top;

        if(this.canHaveStartEndPointOn(CONSTANTS.Dir_Right, isStart) && nearest.VLine(this.rect.ceil, this.rect.floor, this.rect.right))
            dir = CONSTANTS.Dir_Right;

        if(this.canHaveStartEndPointOn(CONSTANTS.Dir_Bottom, isStart) && nearest.HLine(this.rect.left, this.rect.right, this.rect.floor))
            dir = CONSTANTS.Dir_Bottom;

        if(this.canHaveStartEndPointOn(CONSTANTS.Dir_Left, isStart) && nearest.VLine(this.rect.ceil, this.rect.floor, this.rect.left ))
            dir = CONSTANTS.Dir_Left;

        assert(UTILS.isRightAngle (dir), "ArPort.createStartEndPointAt: UTILS.isRightAngle (dir) FAILED!");

        if(this.isConnectToCenter())
            return this.createStartEndPointOn(dir);

        if( point.x < this.rect.left )
            point.x = this.rect.left;
        else if(this.rect.right <= point.x)
            point.x = this.rect.right;

        if( point.y < this.rect.ceil )
            point.y = this.rect.ceil;
        else if( this.rect.floor <= point.y)
            point.y = this.rect.bottom - 1;

        switch(dir){

            case CONSTANTS.Dir_Top:
                point.y = this.rect.ceil;
                break;

            case CONSTANTS.Dir_Right:
                point.x = this.rect.right;
                break;

            case CONSTANTS.Dir_Bottom:
                point.y = this.rect.floor;
                break;

            case CONSTANTS.Dir_Left:
                point.x = this.rect.left;
                break;
        }

        return point;
    };

    AutoRouterPort.prototype.roundToHalfGrid = function (left, right){
        // I added a checking condition to make sure that the rounding will not yield a value outside of the left, right values
        var btwn = (left + right)/2;//btwn < Math.max(left, right) && btwn > Math.min(left, right) ? btwn : (left + right)/2;
        assert(btwn < Math.max(left, right) && btwn > Math.min(left, right), "roundToHalfGrid: btwn variable not between left, right values. Perhaps box/connectionArea is too small?");
        return btwn;
    };

    AutoRouterPort.prototype.createStartEndPointOn = function (dir){
        // I will add the next point in the appropriate order based on the current pointAngles
        assert( !this.rect.isRectEmpty(), "ARPort.createStartEndPointOn: !this.rect.isRectEmpty() FAILED!");
        assert( UTILS.isRightAngle (dir) , "ARPort.createStartEndPointOn: UTILS.isRightAngle (dir) FAILED!");

        switch(dir) {

            case CONSTANTS.Dir_Top:
                return new ArPoint(this.roundToHalfGrid(this.rect.left, this.rect.right), this.rect.ceil);

            case CONSTANTS.Dir_Bottom:
                return new ArPoint(this.roundToHalfGrid(this.rect.left, this.rect.right), this.rect.floor);

            case CONSTANTS.Dir_Left:
                return new ArPoint(this.rect.left, this.roundToHalfGrid(this.rect.ceil, this.rect.floor));
        }

        return new ArPoint(this.rect.right, this.roundToHalfGrid(this.rect.ceil, this.rect.floor));
    };

    AutoRouterPort.prototype.createStartEndPointTo = function (point, dir){
        //calculate pathAngle
        var dx = point.x - this.getCenter().x,
            dy = point.y - this.getCenter().y,
            pathAngle = Math.atan2(-dy, dx),
            k = 0,
            maxX = this.rect.right - 1,             //This is done to guarantee that the x,y will never round up to the corner of
            maxY = this.rect.floor - 1,                //the port. If it does, the next assert will fail.
            minX = this.rect.left,
            minY = this.rect.ceil,
            resultPoint,
            smallerPt = new ArPoint(minX, minY),//The this.points that the resultPoint is centered between
            largerPt = new ArPoint(maxX, maxY);


        //Adjust angle based on part of port to which it is connecting
        switch(dir){

            case CONSTANTS.Dir_Top:
                pathAngle = 2 * Math.PI - (pathAngle + Math.PI/2);
                largerPt.y = this.rect.ceil;
                break;

            case CONSTANTS.Dir_Right:
                pathAngle = 2 * Math.PI - pathAngle;
                smallerPt.x = this.rect.right;
                break;

            case CONSTANTS.Dir_Bottom:
                pathAngle -= Math.PI/2;
                smallerPt.y = this.rect.floor;
                break;

            case CONSTANTS.Dir_Left:
                largerPt.x = this.rect.left;
                break;
        }

        if( pathAngle < 0 ){
            pathAngle += 2*Math.PI;
        }

        pathAngle *= 180/Math.PI;//Using degrees for easier debugging

        //Finding this.points ordering
        while( k < this.points[dir].length && pathAngle > this.points[dir][k].pathAngle ){
            k++;
        }

        if( this.points[dir].length ){
            if ( k === 0 ){
                largerPt = new ArPoint(this.points[dir][k]);

            }else if ( k !== this.points[dir].length ){
                smallerPt = new ArPoint(this.points[dir][k-1]);
                largerPt = new ArPoint(this.points[dir][k]);

            }else{
                smallerPt = new ArPoint(this.points[dir][k-1]);

            }
        }

        resultPoint = new ArPoint((largerPt.x + smallerPt.x)/2, (largerPt.y + smallerPt.y)/2);
        resultPoint.pathAngle = pathAngle;

        //Move the point over to an 'this.availableArea' if appropriate
        var i = this.availableArea.length,
            closestArea = 0,
            distance = CONSTANTS.ED_MAXCOORD,
start,
end;

        //Find distance from each this.availableArea and store closest index
        while(i--){
            start = this.availableArea[i][0];
            end = this.availableArea[i][1];

            if(UTILS.isOnEdge (start, end, resultPoint)){
                closestArea = -1;
                break;
            }else if(UTILS.distanceFromLine (resultPoint, start, end) < distance){
                closestArea = i;
                distance = UTILS.distanceFromLine (resultPoint, start, end);
            }
        }

        if(closestArea !== -1 && this.isAvailable()){ //resultPoint needs to be moved to the closest available area
            var dir2 = UTILS.getDir (this.availableArea[closestArea][0].minus(resultPoint));

            assert(UTILS.isRightAngle (dir2), "AutoRouterPort.createStartEndPointTo: UTILS.isRightAngle (dir2) FAILED");

            if(dir2 === CONSTANTS.Dir_Left || dir2 === CONSTANTS.Dir_Top){ //Then resultPoint must be moved up
                largerPt = this.availableArea[closestArea][1];
            }else{ //Then resultPoint must be moved down
                smallerPt = this.availableArea[closestArea][0];
            }

            resultPoint = new ArPoint((largerPt.x + smallerPt.x)/2, (largerPt.y + smallerPt.y)/2);
        }

        this.points[dir].splice(k, 0, resultPoint);

        assert( UTILS.isRightAngle ( this.port_OnWhichEdge(resultPoint) ), "AutoRouterPort.createStartEndPointTo: UTILS.isRightAngle ( this.port_OnWhichEdge(resultPoint) FAILED");

        return resultPoint;
    };

    AutoRouterPort.prototype.removePoint = function (pt){
        var i = 0,
            removed = false,
            k;

        while( i < 4 && !removed ){ //Check all sides for the point
            k = this.points[i].indexOf(pt);

            if( k > -1){ //If the point is on this side of the port
                this.points[i].splice( k, 1);
                removed = true;
            }
            i++;
        }

        if( !removed )
            _logger.warning("point (" + pt.x + ", " + pt.y + ") was not removed from port");
    };

    AutoRouterPort.prototype.hasPoint = function(pt){
        var i = 0,
            k;

        while( i < 4 ){ //Check all sides for the point
            k = this.points[i].indexOf(pt);

            if( k > -1){ //If the point is on this side of the port
                return true;
            }
            i++;
        }

        return false;
    };

    AutoRouterPort.prototype.getPoints = function (){
        return this.points;
    };

    AutoRouterPort.prototype.getPointCount = function (){
        var i = 0,
            count = 0;

        while( i < 4 ){ //Check all sides for the point
            count += this.points[i++].length;
        }

        return count;
    };

    AutoRouterPort.prototype.resetAvailableArea = function (){
        this.availableArea = [];

        if(this.canHaveStartEndPointOn(CONSTANTS.Dir_Top))
            this.availableArea.push([this.rect.getTopLeft(),  new ArPoint(this.rect.right, this.rect.ceil)]);

        if(this.canHaveStartEndPointOn(CONSTANTS.Dir_Right))
            this.availableArea.push([new ArPoint(this.rect.right, this.rect.ceil),  this.rect.getBottomRight()]);

        if(this.canHaveStartEndPointOn(CONSTANTS.Dir_Bottom))
            this.availableArea.push([new ArPoint(this.rect.left, this.rect.floor),  this.rect.getBottomRight()]);

        if(this.canHaveStartEndPointOn(CONSTANTS.Dir_Left))
            this.availableArea.push([this.rect.getTopLeft(), new ArPoint(this.rect.left, this.rect.floor)]);

    };

    AutoRouterPort.prototype.adjustAvailableArea = function (r){
        //For all lines specified in availableAreas, check if the line UTILS.intersect s the rectangle
        //If it does, remove the part of the line that UTILS.intersect s the rectangle
        if(!this.rect.touching(r))
            return;

        var i = this.availableArea.length,
            intersection,
            line;

        while(i--){

            if(UTILS.isLineClipRect (this.availableArea[i][0], this.availableArea[i][1], r)){
                line = this.availableArea.splice(i, 1)[0];
                intersection = UTILS.getLineClipRectIntersect(line[0], line[1], r);

                if(!intersection[0].equals(line[0]))
                    this.availableArea.push([ line[0], intersection[0] ]);

                if(!intersection[1].equals(line[1]))
                    this.availableArea.push([ intersection[1], line[1] ]);
            }
        }
    };

    AutoRouterPort.prototype.getTotalAvailableArea = function (){
        var i = this.availableArea.length,
            length = new ArSize();

        while(i--){
            length.add(this.availableArea[i][1].minus(this.availableArea[i][0]));
        }

        assert(length.cx === 0 || length.cy === 0, "ARPort.getTotalAvailableArea: length[0] === 0 || length[1] === 0 FAILED");
        return length.cx || length.cy;
    };

    AutoRouterPort.prototype.isAvailable = function (){
        return this.availableArea.length > 0;
    };

    return AutoRouterPort;
});

