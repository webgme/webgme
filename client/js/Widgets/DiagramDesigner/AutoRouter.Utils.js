/*globals define*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * @author brollb / https://github/brollb
 */

define(['./AutoRouter.Constants',
	    'util/assert',
	    './AutoRouter.Rect',
        './AutoRouter.Point'], function(CONSTANTS,
                                        assert,
                                        ArRect,
                                        ArPoint){

    "use strict"; 

    var _getOptimalPorts = function(ports, tgt){
        //I will get the dx, dy that to the src/dst target and then I will calculate
        // a priority value that will rate the ports as candidates for the 
        //given path
        var srcC = new ArPoint(), //src center
            vector,
            port, //result
            maxP = -1,
            maxArea = 0,
            sPoint,
            i; 

        //Get the center points of the src,dst ports
        for(i = 0; i < ports.length; i++){
            sPoint = ports[i].getRect().getCenter();
            srcC.x += sPoint.x;
            srcC.y += sPoint.y;

            //adjust maxArea
            if(maxArea < ports[i].getTotalAvailableArea()){
                maxArea = ports[i].getTotalAvailableArea();
            }

        }

        //Get the average center point of src
        srcC.x = srcC.x/ports.length;
        srcC.y = srcC.y/ports.length;

        //Get the directions
        vector = (tgt.minus(srcC).getArray());

        //Create priority function
        function createPriority(port, center){
            var priority = 0,
                //point = [  center.x - port.getRect().getCenter().x, center.y - port.getRect().getCenter().y],
                point = [ port.getRect().getCenter().x - center.x, port.getRect().getCenter().y - center.y],
                lineCount = (port.getPointCount() || 1),
                density = (port.getTotalAvailableArea()/lineCount)/maxArea || 1, //If there is a problem with maxArea, just ignore density
                major = Math.abs(vector[0]) > Math.abs(vector[1]) ? 0 : 1,
                minor = (major+1)%2;

            if(point[major] > 0 === vector[major] > 0 && (point[major] === 0) === (vector[major] === 0)){//handling the === 0 error
                //If they have the same parity, assign the priority to maximize that is > 1
                priority = (Math.abs(vector[major])/Math.abs(vector[major] - point[major])) * 25 ; 
            }

            if(point[minor] > 0 === vector[minor] > 0 && (point[minor] === 0) === (vector[minor] === 0)){//handling the === 0 error
                //If they have the same parity, assign the priority to maximize that is < 1
                priority += vector[minor] !== point[minor] ? (Math.abs(vector[minor])/Math.abs(vector[minor] - point[minor]))*1 : 0; 
            }

            //Adjust priority based on the density of the lines...
            priority *= density;

            return priority;
        }

        //Create priority values for each port.
        var priority;
        for(i = 0; i < ports.length; i++){
            priority = createPriority(ports[i], srcC);
            if( priority >= maxP ){
                port = ports[i];
                maxP = priority;
            }
        }

        assert(port.getOwner(), "ARGraph.getOptimalPorts: port have invalid owner");

        return port;
    };

    var _getPointCoord = function (point, horDir){
        if(horDir === true || _isHorizontal(horDir)){
            return point.x;
        } else  {
            return point.y;
        }
    };

    var _inflatedRect = function (rect, a){
        var r = rect;
        r.inflateRect(a, a); 
        return r; 
    };

    var _deflatedRect = function (rect, a){ 
        var r = rect; 
        r.deflateRect(a,a); 
        return r; 
    };

    var _isPointNear = function (p1, p2, nearness){
        return p2.x - nearness <= p1.x && p1.x <= p2.x + nearness &&
            p2.y - nearness <= p1.y && p1.y <= p2.y + nearness;
    };

    var _isPointIn = function (point, rect, nearness){
        var tmpR = new ArRect(rect);
        tmpR.inflateRect(nearness, nearness);
        return tmpR.ptInRect(point) === true;
    };

    var _isRectIn = function (r1, r2){
        return r2.left <= r1.left && r1.right <= r2.right &&
            r2.ceil <= r1.ceil && r1.floor <= r2.floor;
    };

    var _isRectClip = function (r1, r2){
        var rect = new ArRect();
        return rect.intersectAssign(r1, r2) === true;
    };

    var _isPointNearHLine = function (p, x1, x2, y, nearness){
        assert( x1 <= x2, "ArHelper.isPointNearHLine: x1 <= x2 FAILED");

        return x1 - nearness <= p.x && p.x <= x2 + nearness &&
            y - nearness <= p.y && p.y <= y + nearness;
    };

    var _isPointNearVLine = function (p, y1, y2, x, nearness){
        assert( y1 <= y2, "ArHelper.isPointNearHLine: y1 <= y2 FAILED" );

        return y1 - nearness <= p.y && p.y <= y2 + nearness &&
            x - nearness <= p.x && p.x <= x + nearness;
    };

    var _distanceFromHLine = function (p, x1, x2, y){
        assert( x1 <= x2, "ArHelper.distanceFromHLine: x1 <= x2 FAILED");

        return Math.max(Math.abs(p.y - y), Math.max(x1 - p.x, p.x - x2));
    };

    var _distanceFromVLine = function (p, y1, y2, x){
        assert( y1 <= y2, "ArHelper.distanceFromVLine: y1 <= y2 FAILED" );

        return Math.max(Math.abs(p.x - x), Math.max(y1 - p.y, p.y - y2));
    };

    var _distanceFromLine = function (pt, start, end){
        var dir = _getDir(end.minus(start));

        if(_isHorizontal(dir)){
            return _distanceFromVLine(pt, start.y, end.y, start.x);
        }else{
            return _distanceFromHLine(pt, start.x, end.x, start.y);
        }
    };

    var _distanceSquareFromLine = function (start, end, pt){
        //     |det(end-start start-pt)|
        // d = -------------------------
        //            |end-start|
        //
        var nom = Math.abs((end.x - start.x) * (start.y - pt.y) - (start.x - pt.x) * (end.y - start.y)),
            denom_square = ((end.x - start.x) * (end.x - start.x) + (end.y - start.y) * (end.y - start.y)),
            d_square = nom * nom / denom_square;
        return d_square;
    };

    var _isOnEdge = function (start, end, pt){
        if (start.x === end.x)			// vertical edge, horizontal move
        {
            if (end.x === pt.x && pt.y <= Math.max(end.y, start.y) && pt.y >= Math.min(end.y, start.y)){
                return true;
            }
        }
        else if (start.y === end.y)	// horizontal line, vertical move
        {
            if (start.y === pt.y && pt.x <= Math.max(end.x, start.x) && pt.x >= Math.min(end.x, start.x)){
                return true;
            }
        }

        return false;
    };

    var _isPointNearLine = function (point, start, end, nearness){
        assert( 0 <= nearness, "ArHelper.isPointNearLine: 0 <= nearness FAILED");

        // begin Zolmol
        // the routing may create edges that have start==end
        // thus confusing this algorithm
        if( end.x === start.x && end.y === start.y){
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

        if(xuyv < 0 || xuyv > x2y2){
            return false;
        }

        var expr1 = (x * v - y * u) ;
        expr1 *= expr1;
        var expr2 = nearness * nearness * x2y2;

        return expr1 <= expr2;
    };

    var _isLineMeetHLine = function (start, end, x1, x2, y){
        assert( x1 <= x2, "ArHelper.isLineMeetHLine: x1 <= x2 FAILED");
        if(start instanceof Array) {//Converting from 'pointer'
            start = start[0];
        }
        if(end instanceof Array){
            end = end[0];
        }

        if( !((start.y <= y && y <= end.y) || (end.y <= y && y <= start.y )) ){
            return false;
        }

        var end2 = new ArPoint(end);
        end2.subtract(start);
        x1 -= start.x;
        x2 -= start.x;
        y -= start.y;

        if( end2.y === 0 ){
            return y === 0 && (( x1 <= 0 && 0 <= x2 ) || (x1 <= end2.x && end2.x <= x2));
        }

        var x = ((end2.x) / end2.y) * y;
        return x1 <= x && x <= x2;
    };

    var _isLineMeetVLine = function (start, end, y1, y2, x){
        assert( y1 <= y2, "ArHelper.isLineMeetVLine: y1 <= y2  FAILED");
        if(start instanceof Array) {//Converting from 'pointer'
            start = start[0];
        }
        if(end instanceof Array){
            end = end[0];
        }

        if( !((start.x <= x && x <= end.x) || (end.x <= x && x <= start.x )) ){
            return false;
        }

        var end2 = new ArPoint(end);
        end2.subtract(start);
        y1 -= start.y;
        y2 -= start.y;
        x -= start.x;

        if( end2.x === 0 ){
            return x === 0 && (( y1 <= 0 && 0 <= y2 ) || (y1 <= end2.y && end2.y <= y2));
        }

        var y = ((end2.y) / end2.x) * x;
        return y1 <= y && y <= y2;
    };

    var _isLineClipRects = function (start, end, rects){
        var i = rects.length;
        while(i--){
            if(_isLineClipRect(start, end, rects[i])){
                return true;
            }
        }
        return false;
    };

    var _isLineClipRect = function (start, end, rect){
        if( rect.ptInRect(start) || rect.ptInRect(end) ){
            return true;
        }

        return _isLineMeetHLine(start, end, rect.left, rect.right, rect.ceil) ||
            _isLineMeetHLine(start, end, rect.left, rect.right, rect.floor) ||
            _isLineMeetVLine(start, end, rect.ceil, rect.floor, rect.left) ||
            _isLineMeetVLine(start, end, rect.ceil, rect.floor, rect.right);
    };

    var _getLineClipRectIntersect = function(start, end, rect){
        //return the endpoints of the intersection line
        var dir = _getDir(end.minus(start)),
            endpoints = [ new ArPoint(start), new ArPoint(end) ];

        if(!_isLineClipRect(start, end, rect)){
            return null;
        }

        assert(_isRightAngle(dir), "ArHelper.getLineClipRectIntersect: _isRightAngle(dir) FAILED");

        //Make sure we are working left to right or top down
        if(dir === CONSTANTS.Dir_Left || dir === CONSTANTS.Dir_Top){
            dir = _reverseDir(dir);
            endpoints.push(endpoints.splice(0,1)[0]); //Swap point 0 and point 1
        }

        if(_isPointInDirFrom(endpoints[0], rect.getTopLeft(), _reverseDir(dir))){
            endpoints[0].assign( rect.getTopLeft() );
        }

        if(_isPointInDirFrom(endpoints[1], rect.getBottomRight(), dir)){
            endpoints[1].assign( rect.getBottomRight() );
        }

        if(_isHorizontal(dir)){
            endpoints[0].y = start.y;
            endpoints[1].y = end.y;
        }else{
            endpoints[0].x = start.x;
            endpoints[1].x = end.x;
        }

        return endpoints;

    };

    var _intersect = function (a1, a2, b1, b2){
        return Math.min(a1,a2) <= Math.max(b1,b2) && Math.min(b1,b2) <= Math.max(a1,a2);
    };

    // --------------------------- RoutingDirection

    var _isHorizontal = function (dir) { 
        return dir === CONSTANTS.Dir_Right || dir === CONSTANTS.Dir_Left; 
    };

    var _isVertical = function (dir) {
        return dir === CONSTANTS.Dir_Top || dir === CONSTANTS.Dir_Bottom; 
    };

    var _isRightAngle = function (dir) {
        return CONSTANTS.Dir_Top <= dir && dir <= CONSTANTS.Dir_Left; 
    };

    var _isTopLeft = function (dir) {
        return dir === CONSTANTS.Dir_Top || dir === CONSTANTS.Dir_Left; 
    };

    var _isBottomRight = function (dir) {
        return dir === CONSTANTS.Dir_Bottom || dir === CONSTANTS.Dir_Right; 
    };

    var _areInRightAngle = function (dir1, dir2){
        assert( _isRightAngle(dir1) && _isRightAngle(dir2), "ArHelper.areInRightAngle: _isRightAngle(dir1) && _isRightAngle(dir2) FAILED" );
        return _isHorizontal(dir1) === _isVertical(dir2);
    };

    var _nextClockwiseDir = function (dir){
        if( _isRightAngle(dir) ){
            return ((dir+1) % 4);
        }

        return dir;
    };

    var _prevClockwiseDir = function (dir){
        if( _isRightAngle(dir) ){
            return ((dir+3) % 4);
        }

        return dir;
    };

    var _reverseDir = function (dir){
        if( _isRightAngle(dir) ){
            return ((dir+2) % 4);
        }

        return dir;
    };

    var _stepOneInDir = function (point, dir){
        assert( _isRightAngle(dir), "ArHelper.stepOnInDir: _isRightAngle(dir) FAILED");

        switch(dir)
        {
            case CONSTANTS.Dir_Top:
                point.y--;
                break;

            case CONSTANTS.Dir_Right:
                point.x++;
                break;

            case CONSTANTS.Dir_Bottom:
                point.y++;
                break;

            case CONSTANTS.Dir_Left:
                point.x--;
                break;
        }

    };

    var _getRectCoord = function (rect, dir){
        assert( _isRightAngle(dir), "ArHelper.getRectCoord: _isRightAngle(dir) FAILED");

        switch( dir )
        {
            case CONSTANTS.Dir_Top: 
                return rect.ceil;

            case CONSTANTS.Dir_Right:
                return rect.right;

            case CONSTANTS.Dir_Bottom:
                return rect.floor;
        }

        return rect.left;
    };

    var _getChildRectOuterCoordFrom = function (bufferObject, inDir, point){ //Point travels inDir until hits child box
        var children = bufferObject.children,
            i = -1,
            box = null,
            res = _getRectOuterCoord(bufferObject.box, inDir);

        assert( _isRightAngle(inDir), "getChildRectOuterCoordFrom: _isRightAngle(inDir) FAILED"); 
        //The next assert fails if the point is in the opposite direction of the rectangle that it is checking.
        // e.g. The point is checking when it will hit the box from the right but the point is on the left
        assert( !_isPointInDirFrom(point, bufferObject.box, inDir), "getChildRectOuterCoordFrom: !isPointInDirFrom(point, bufferObject.box.getRect(), (inDir)) FAILED"); 

        while( ++i < children.length ){

            if( _isPointInDirFrom( point, children[i], _reverseDir(inDir) ) && 
                    _isPointBetweenSides(point, children[i], inDir) &&
                    _isCoordInDirFrom(res, _getRectOuterCoord( children[i], _reverseDir(inDir) ), (inDir)) ){

                res = _getRectOuterCoord( children[i], _reverseDir(inDir) );
                box = children[i];
            }
        }

        return { "box": box , "coord": res };
    };

    var _getRectOuterCoord = function (rect, dir){
        assert( _isRightAngle(dir), "ArHelper.getRectOuterCoord: _isRightAngle(dir) FAILED" );
        var t = rect.ceil - 1,
            r = rect.right + 1,
            b = rect.floor + 1,
            l = rect.left - 1;

        switch( dir )
        {
            case CONSTANTS.Dir_Top: 
                return t;

            case CONSTANTS.Dir_Right:
                return r;

            case CONSTANTS.Dir_Bottom:
                return b;
        }

        return l;
    };

    //	Indexes:
    //				 04
    //				1  5
    //				3  7
    //				 26

    var getDirTableIndex = function (offset){
        return (offset.cx >= 0)*4 + (offset.cy >= 0)*2 + (Math.abs(offset.cx) >= Math.abs(offset.cy));
    };

    var majordir_table = 
        [
        CONSTANTS.Dir_Top,
        CONSTANTS.Dir_Left,
        CONSTANTS.Dir_Bottom,
        CONSTANTS.Dir_Left,
        CONSTANTS.Dir_Top,
        CONSTANTS.Dir_Right,
        CONSTANTS.Dir_Bottom,
        CONSTANTS.Dir_Right
            ];

    var _getMajorDir = function (offset){
        return majordir_table[getDirTableIndex(offset)];
    };

    var minordir_table =
        [
        CONSTANTS.Dir_Left,
        CONSTANTS.Dir_Top,
        CONSTANTS.Dir_Left,
        CONSTANTS.Dir_Bottom,
        CONSTANTS.Dir_Right,
        CONSTANTS.Dir_Top,
        CONSTANTS.Dir_Right,
        CONSTANTS.Dir_Bottom
            ];

    var _getMinorDir = function (offset){
        return minordir_table[getDirTableIndex(offset)];
    };

    //	FG123
    //	E   4
    //	D 0 5
    //	C   6
    //  BA987


    var _exGetDirTableIndex = function (offset){
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
    var exmajordir_table = 
        [
        CONSTANTS.Dir_None,
        CONSTANTS.Dir_Top,
        CONSTANTS.Dir_Top,
        CONSTANTS.Dir_Right,
        CONSTANTS.Dir_Right,
        CONSTANTS.Dir_Right,
        CONSTANTS.Dir_Right,
        CONSTANTS.Dir_Right,
        CONSTANTS.Dir_Bottom,
        CONSTANTS.Dir_Bottom,
        CONSTANTS.Dir_Bottom,
        CONSTANTS.Dir_Left,
        CONSTANTS.Dir_Left,
        CONSTANTS.Dir_Left,
        CONSTANTS.Dir_Left,
        CONSTANTS.Dir_Left,
        CONSTANTS.Dir_Top
            ];

    var _exGetMajorDir = function (offset){
        return exmajordir_table[_exGetDirTableIndex(offset)];
    };

    var exminordir_table =  
        [
        CONSTANTS.Dir_None,
        CONSTANTS.Dir_None,
        CONSTANTS.Dir_Right,
        CONSTANTS.Dir_Top,
        CONSTANTS.Dir_Top,
        CONSTANTS.Dir_None,
        CONSTANTS.Dir_Bottom,
        CONSTANTS.Dir_Bottom,
        CONSTANTS.Dir_Right,
        CONSTANTS.Dir_None,
        CONSTANTS.Dir_Left,
        CONSTANTS.Dir_Bottom,
        CONSTANTS.Dir_Bottom,
        CONSTANTS.Dir_None,
        CONSTANTS.Dir_Top,
        CONSTANTS.Dir_Top,
        CONSTANTS.Dir_Left
            ];

    var _exGetMinorDir = function (offset){
        return exminordir_table[_exGetDirTableIndex(offset)];
    };

    var _getDir = function (offset, nodir){
        if( offset.cx === 0 )
        {
            if( offset.cy === 0 ){
                return nodir;
            }

            if( offset.cy < 0 ){
                return CONSTANTS.Dir_Top;
            }

            return CONSTANTS.Dir_Bottom;
        }

        if( offset.cy === 0 )
        {
            if( offset.cx > 0 ){
                return CONSTANTS.Dir_Right;
            }

            return CONSTANTS.Dir_Left;
        }

        return CONSTANTS.Dir_Skew;
    };

    var _getSkewDir = function (offset, nodir){
        if (offset.cx === 0 || Math.abs(offset.cy) > Math.abs(offset.cx))
        {
            if (offset.cy === 0){
                return nodir;
            }

            if (offset.cy < 0){
                return CONSTANTS.Dir_Top;
            }

            return CONSTANTS.Dir_Bottom;
        }

        if (offset.cy === 0 || Math.abs(offset.cx) >= Math.abs(offset.cy))
        {
            if (offset.cx > 0){
                return CONSTANTS.Dir_Right;
            }

            return CONSTANTS.Dir_Left;
        }

        assert(false, "ArHelper.getSkewDir: Error ");
        return CONSTANTS.Dir_Skew;
    };

    var _isPointInDirFromChildren = function (point, fromParent, dir){
        var children = fromParent.children,
            i = 0;

        assert( _isRightAngle(dir), "isPointInDirFromChildren: _isRightAngle(dir) FAILED"); 

        while( i < children.length ){
            if( _isPointInDirFrom( point, children[i].getRect(), dir )){
                return true;
            }
            ++i;
        }

        return false;
    };

    var _isPointInDirFrom = function (point, from, dir){
        if(from instanceof ArRect){
            var rect = from;
            assert( _isRightAngle(dir), "ArHelper.isPointInDirFrom: _isRightAngle(dir) FAILED" );

            switch( dir )
            {
                case CONSTANTS.Dir_Top:
                    return point.y < rect.ceil;

                case CONSTANTS.Dir_Right:
                    return point.x >= rect.right;

                case CONSTANTS.Dir_Bottom:
                    return point.y >= rect.floor;

                case CONSTANTS.Dir_Left:
                    return point.x < rect.left;
            }

            return false;

        }else{
            assert( _isRightAngle(dir), "ArHelper.isPointInDirFrom: _isRightAngle(dir) FAILED" );

            switch( dir )
            {
                case CONSTANTS.Dir_Top:
                    return point.y <= from.y;

                case CONSTANTS.Dir_Right:
                    return point.x >= from.x;

                case CONSTANTS.Dir_Bottom:
                    return point.y >= from.y;

                case CONSTANTS.Dir_Left:
                    return point.x <= from.x;
            }

            return false;

        }
    };

    var _isPointBetweenSides = function (point, rect, ishorizontal){
        if( ishorizontal === true || _isHorizontal(ishorizontal) ){
            return rect.ceil <= point.y && point.y < rect.floor;
        }

        return rect.left <= point.x && point.x < rect.right;
    };

    var _pointOnSide = function (point, rect){
        var dleft = _distanceFromVLine(point, rect.ceil, rect.floor, rect.left),
            dtop = _distanceFromHLine(point, rect.left, rect.right, rect.ceil),
            dright = _distanceFromVLine(point, rect.ceil, rect.floor, rect.right),
            dbottom = _distanceFromHLine(point, rect.left, rect.right, rect.floor);

        if (dleft < 3){
            return CONSTANTS.Dir_Left;
        }
        if (dtop < 3){
            return CONSTANTS.Dir_Top;
        }
        if (dright < 3){
            return CONSTANTS.Dir_Right;
        }
        if (dbottom < 3){
            return CONSTANTS.Dir_Bottom;
        }

        return _getSkewDir(point.minus(rect.CenterPoint()));
    };

    var _isCoordInDirFrom = function (coord, from, dir){
        assert( _isRightAngle(dir), "ArHelper.isCoordInDirFrom: _isRightAngle(dir) FAILED" );
        if( from instanceof ArPoint){
            from = _getPointCoord(from, dir);
        }

        if( dir === CONSTANTS.Dir_Top || dir === CONSTANTS.Dir_Left ){
            return coord <= from;
        }

        return coord >= from;
    };

    // This next method only supports deterministic (unambiguous) orientations. That is, the point
    // cannot be in a corner of the rectangle.
    // NOTE: the right and floor used to be - 1. 
    var _onWhichEdge = function (rect, point){
        if( point.y === rect.ceil && rect.left < point.x && point.x < rect.right ) {
            return CONSTANTS.Dir_Top;
        }

        if( point.y === rect.floor && rect.left < point.x && point.x < rect.right ){
            return CONSTANTS.Dir_Bottom;
        }

        if( point.x === rect.left && rect.ceil < point.y && point.y < rect.floor ){
            return CONSTANTS.Dir_Left;
        }

        if( point.x === rect.right && rect.ceil < point.y && point.y < rect.floor ){
            return CONSTANTS.Dir_Right;
        }

        return CONSTANTS.Dir_None;
    };
    // --------------------------- CArFindNearestLine

    var ArFindNearestLine = function (pt){
        this.point = pt;
        this.dist1 = CONSTANTS.INT_MAX;
        this.dist2 = CONSTANTS.INT_MAX;
    };

    ArFindNearestLine.prototype.hLine = function(x1, x2, y){
        assert( x1 <= x2 , "ArFindNearestLine.hLine: x1 <= x2  FAILED");

        var d1 = _distanceFromHLine(this.point, x1, x2, y),
            d2 = Math.abs(this.point.y - y);

        if( d1 < this.dist1 || (d1 === this.dist1 && d2 < this.dist2) )
        {
            this.dist1 = d1;
            this.dist2 = d2;
            return true;
        }

        return false;
    };

    ArFindNearestLine.prototype.vLine = function(y1, y2, x){
        assert( y1 <= y2, "ArFindNearestLine.hLine: y1 <= y2 FAILED" );

        var d1 = _distanceFromVLine(this.point, y1, y2, x),
            d2 = Math.abs(this.point.x - x);

        if( d1 < this.dist1 || (d1 === this.dist1 && d2 < this.dist2) )
        {
            this.dist1 = d1;
            this.dist2 = d2;
            return true;
        }

        return false;
    };

    ArFindNearestLine.prototype.was = function(){
        return this.dist1 < CONSTANTS.INT_MAX && this.dist2 < CONSTANTS.INT_MAX;
    };



    return { onWhichEdge: _onWhichEdge,
             isCoordInDirFrom : _isCoordInDirFrom,           
             //pointOnSide: _pointOnSide,
             isPointBetweenSides: _isPointBetweenSides,
             isPointInDirFrom : _isPointInDirFrom, 
             isPointInDirFromChildren : _isPointInDirFromChildren, 
             isPointIn : _isPointIn, 
             isPointNear: _isPointNear,
             //getSkewDir : _getSkewDir, 
             getDir : _getDir, 
             exGetMinorDir : _exGetMinorDir, 
             exGetMajorDir: _exGetMajorDir,
             exGetDirTableIndex : _exGetDirTableIndex, 
             getMinorDir : _getMinorDir, 
             getMajorDir : _getMajorDir, 
             //getDirTableIndex : _getDirTableIndex, 
             getRectOuterCoord : _getRectOuterCoord, 
             getChildRectOuterCoordFrom : _getChildRectOuterCoordFrom, 
             //getRectCoord : _getRectCoord, 
             stepOneInDir : _stepOneInDir, 
             reverseDir : _reverseDir, 
             prevClockwiseDir : _prevClockwiseDir, 
             nextClockwiseDir : _nextClockwiseDir, 
             areInRightAngle : _areInRightAngle, 
             //isBottomRight : _isBottomRight, 
             //isTopLeft : _isTopLeft, 
             isRightAngle : _isRightAngle, 
             //isVertical : _isVertical, 
             isHorizontal : _isHorizontal, 
             intersect : _intersect, 
             getLineClipRectIntersect:  _getLineClipRectIntersect,
             isLineClipRect : _isLineClipRect, 
             isLineClipRects : _isLineClipRects, 
             //isLineMeetVLine : _isLineMeetVLine, 
             //isLineMeetHLine : _isLineMeetHLine, 
             isPointNearLine : _isPointNearLine, 
             isOnEdge : _isOnEdge, 
             //distanceSquareFromLine : _distanceSquareFromLine, 
             distanceFromLine : _distanceFromLine, 
             //distanceFromVLine : _distanceFromVLine, 
             //distanceFromHLine : _distanceFromHLine, 
             //isPointNearVLine : _isPointNearVLine, 
             //isPointNearHLine : _isPointNearHLine, 
             isRectClip : _isRectClip, 
             isRectIn: _isRectIn,
             inflatedRect : _inflatedRect, 
             //deflatedRect : _deflatedRect, 
             getPointCoord : _getPointCoord, 
             getOptimalPorts: _getOptimalPorts,
             ArFindNearestLine: ArFindNearestLine
        };

});
