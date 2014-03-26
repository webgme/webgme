"use strict"; 

define(['logManager'], function (logManager) {

    var AutoRouter;

    var ED_MAXCOORD = 100000,
        ED_MINCOORD = -2,//This allows connections to be still be draw when box is pressed against the edge
        ED_SMALLGAP = 15,
        CONNECTIONCUSTOMIZATIONDATAVERSION = 0,
        EMPTYCONNECTIONCUSTOMIZATIONDATAMAGIC = -1,
        DEBUG =  false,
        BUFFER = 10,

        EDLS_S = ED_SMALLGAP,
        EDLS_R = ED_SMALLGAP + 1, 
        EDLS_D = ED_MAXCOORD - ED_MINCOORD,

        ARPATH_EndOnDefault = 0x0000,
        ARPATH_EndOnTop = 0x0010,
        ARPATH_EndOnRight = 0x0020,
        ARPATH_EndOnBottom = 0x0040,
        ARPATH_EndOnLeft = 0x0080,
        ARPATH_EndMask = (ARPATH_EndOnTop | ARPATH_EndOnRight | ARPATH_EndOnBottom | ARPATH_EndOnLeft),

        ARPATH_StartOnDefault = 0x0000,
        ARPATH_StartOnTop = 0x0100,
        ARPATH_StartOnRight = 0x0200,
        ARPATH_StartOnBottom = 0x0400,
        ARPATH_StartOnLeft = 0x0800,
        ARPATH_StartMask = (ARPATH_StartOnTop | ARPATH_StartOnRight | ARPATH_StartOnBottom | ARPATH_StartOnLeft),

        ARPATH_HighLighted = 0x0002,		// attributes,
        ARPATH_Fixed = 0x0001,
        ARPATH_Default = 0x0000,

        ARPATHST_Connected = 0x0001,		// states,
        ARPATHST_Default = 0x0000,

        // Port Connection Variables
        ARPORT_EndOnTop = 0x0001,
        ARPORT_EndOnRight = 0x0002,
        ARPORT_EndOnBottom = 0x0004,
        ARPORT_EndOnLeft = 0x0008,
        ARPORT_EndOnAll = 0x000F,

        ARPORT_StartOnTop = 0x0010,
        ARPORT_StartOnRight = 0x0020,
        ARPORT_StartOnBottom = 0x0040,
        ARPORT_StartOnLeft = 0x0080,
        ARPORT_StartOnAll = 0x00F0,

        ARPORT_ConnectOnAll = 0x00FF,
        ARPORT_ConnectToCenter = 0x0100,

        ARPORT_StartEndHorizontal = 0x00AA,
        ARPORT_StartEndVertical = 0x0055,

        ARPORT_Default = 0x00FF,

        //RoutingDirection vars 
        Dir_None	= -1,
        Dir_Top    = 0,
        Dir_Right	= 1,
        Dir_Bottom	= 2,
        Dir_Left	= 3,
        Dir_Skew	= 4,

        //Path Custom Data
        SimpleEdgeDisplacement = "EdgeDisplacement",
        CustomPointCustomization = "PointCustomization",
        CONNECTIONCUSTOMIZATIONDATAVERSION = null;

    var _logger = logManager.create("AutoRouter");

    AutoRouter = function(graphDetails){
       this.paths = {};
       this.pCount = 0;//A not decrementing count of paths for unique path id's
       this.boxId2Path = {};
       this.portCount = 0;//A not decrementing count of ports for unique path id's

       ED_MAXCOORD = (graphDetails && graphDetails.coordMax !== undefined ? graphDetails.coordMax : false) || ED_MAXCOORD;
       ED_MINCOORD = (graphDetails && graphDetails.coordMin !== undefined ? graphDetails.coordMin : false) || ED_MINCOORD;
       BUFFER = (graphDetails && graphDetails.minGap !== undefined ? Math.floor( graphDetails.minGap/2 ) : false) || BUFFER;
       EDLS_D = ED_MAXCOORD - ED_MINCOORD,
 
       this.router = new AutoRouterGraph();
    };

    var assert = function (condition, msg){
        if(!condition)
            throw msg || "Assert Failed";
    };

    var getOptimalPorts = function(ports, tgt){
        //I will get the dx, dy that to the src/dst target and then I will calculate
        // a priority value that will rate the ports as candidates for the 
        //given path
        var srcC = new ArPoint(), //src center
            tgt, //src target
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
            if(maxArea < ports[i].getTotalAvailableArea())
                maxArea = ports[i].getTotalAvailableArea();

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

            if(point[major] > 0 === vector[major] > 0 //If they have the same parity, assign the priority to maximize that is > 1
                    && (point[major] === 0) === (vector[major] === 0))//handling the === 0 error
                priority = (Math.abs(vector[major])/Math.abs(vector[major] - point[major])) * 25 ; 

            if(point[minor] > 0 === vector[minor] > 0//If they have the same parity, assign the priority to maximize that is < 1
                    && (point[minor] === 0) === (vector[minor] === 0))//handling the === 0 error
                priority += vector[minor] !== point[minor] ? (Math.abs(vector[minor])/Math.abs(vector[minor] - point[minor]))*1 : 0; 

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

    var CustomPathData = function (_x, _y){
        var version = CONNECTIONCUSTOMIZATIONDATAVERSION,
            aspect = 0,
            edgeIndex = 0,
            edgeCount = 0,
            type = CustomPointCustomization, //By default, it is a point
            horizontalOrVerticalEdge = false,
            x = _x,
            y = _y,
            l,
            d;
    };

    //Functions
    CustomPathData.prototype.assign = function(other){
        this.version					= other.version;
        this.aspect					    = other.aspect;
        this.edgeIndex					= other.edgeIndex;
        this.edgeCount					= other.edgeCount;
        this.type						= other.type;
        this.horizontalOrVerticalEdge	= other.horizontalOrVerticalEdge;
        this.x							= other.x;
        this.y							= other.y;
        this.l							= other.l;
        this.d							= other.d;

        return this;
    };

    CustomPathData.prototype.serialize = function(){
        var outChannel = (this.getVersion() + "," + this.getAspect() + "," + this.getEdgeIndex() + "," + this.getEdgeCount() + "," + this.getType());

        outChannel += ("," + this.isHorizontalOrVertical() ? 1 : 0 + "," + this.getX() + "," + this.getY() + "," + this.getLongDataCount());

        for(var i = 0; i < this.getLongDataCount(); i++) {
            outChannel += "," + l[i];
        }

        outChannel += "," + this.getDoubleDataCount();

        for(var i = 0; i < this.getDoubleDataCount(); i++) {
            outChannel += "," + d[i];
        }

        return outChannel;
    };

    CustomPathData.prototype.deserialize = function(inChannel){
        console.log("\tResulting token: " + inChannel);

        var curSubPos = inChannel.indexOf(","),
            versionStr = inChannel.substr(0, curSubPos);

        setVersion(Number(versionStr));
        assert(getVersion() === CONNECTIONCUSTOMIZATIONDATAVERSION, "CustomPathData.deserialize: getVersion() === CONNECTIONCUSTOMIZATIONDATAVERSION FAILED");

        if (getVersion() != CONNECTIONCUSTOMIZATIONDATAVERSION) {
            // TODO: Convert from older version to newer
            return false;
        }

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        var aspectStr = inChannel.substr(0, curSubPos);
        setAspect(Number(aspectStr));

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        var edgeIndexStr = inChannel.substr(0, curSubPos);
        setEdgeIndex(Number(edgeIndexStr));

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        var edgeCountStr = inChannel.substr(0, curSubPos);
        setEdgeCount(Number(edgeCountStr));

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        var edgeCustomTypeStr = inChannel.substr(0, curSubPos);
        setType(Number(edgeCustomTypeStr));

        console.log("\tAsp " + getAspect() + ", Ind " + getEdgeIndex() + ", Cnt " + getEdgeCount() + ", Typ " + getType());

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        var directionStr = inChannel.substr(0, curSubPos);
        setHorizontalOrVertical(Number(directionStr));

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        var positionStr = inChannel.substr(0, curSubPos);
        setX(Number(positionStr));

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        positionStr = inChannel.substr(0, curSubPos);
        setY(Number(positionStr));

        curSubPos = inChannel.indexOf(",", ++curSubPos);
        positionStr = inChannel.substr(0, curSubPos);
        var numOfExtraLongData = Number(positionStr);
        assert(numOfExtraLongData >= 0 && numOfExtraLongData <= 4, "CustomPathData.deserialize: numOfExtraLongData >= 0 && numOfExtraLongData <= 4 FAILED");

        console.log(", Dir " + isHorizontalOrVertical() + ", x " + getX() + ", y " + getY() + ", num " + numOfExtraLongData);

        for(var i = 0; i < numOfExtraLongData; i++) {
            positionStr = inChannel.substr(0, inChannel.indexOf(",", ++curSubPos));
            AddLongData(Number(positionStr));
            console.log(", l" + i + " " +  l[i])
        }

        positionStr = inChannel.substr(0, inChannel.indexOf(","));
        var numOfExtraDoubleData = Number(positionStr);
        assert(numOfExtraDoubleData >= 0 && numOfExtraDoubleData <= 8, "CustomPathData.deserialize: numOfExtraDoubleData >= 0 && numOfExtraDoubleData <= 8 FAILED");
        console.log(", num " + numOfExtraDoubleData);
        for(var i = 0; i < numOfExtraDoubleData; i++) {
            positionStr = inChannel.substr(0, inChannel.indexOf(",", ++curSubPos));
            AddDoubleData(Number(positionStr));
            console.log(", l" + i + " " + d[i]);
        }
        return true;
    };

    CustomPathData.prototype.getVersion = function(){
        return version;
    };

    CustomPathData.prototype.setVersion = function(_version){
        version = _version;
    };

    CustomPathData.prototype.getAspect = function(){
        return aspect;
    };

    CustomPathData.prototype.setAspect = function(_aspect){
        aspect = _aspect;
    };

    CustomPathData.prototype.getEdgeIndex = function(){
        return edgeIndex;
    };

    CustomPathData.prototype.setEdgeIndex = function(index){
        edgeIndex = index;
    };

    CustomPathData.prototype.getEdgeCount = function(){
        return edgeCount;
    };

    CustomPathData.prototype.setEdgeCount = function(count){
        edgeCount = count;
    };

    CustomPathData.prototype.getType = function(){
        return type;
    };

    CustomPathData.prototype.setType = function(_type){
        type = _type;
    };

    CustomPathData.prototype.isHorizontalOrVertical = function(){
        return horizontalOrVerticalEdge;
    };

    CustomPathData.prototype.setHorizontalOrVertical = function(parity){
        horizontalOrVerticalEdge = parity;
    };

    CustomPathData.prototype.getX = function(){
        return x;
    };

    CustomPathData.prototype.setX = function(_x){
        x = _x;
    };

    CustomPathData.prototype.getY = function(){
        return y;
    };

    CustomPathData.prototype.setY = function(_y){
        y = _y;
    };

    CustomPathData.prototype.getLongDataCount = function(){
        return l.length;
    };

    CustomPathData.prototype.getLongData = function(index){
        return l[index];
    };

    CustomPathData.prototype.setLongData = function(index, dat){
        l[index] = dat;
    };

    CustomPathData.prototype.addLongData = function(dat){
        l.push(dat);
    };

    CustomPathData.prototype.getDoubleDataCount = function(){
        return d.length;
    };

    CustomPathData.prototype.getDoubleData = function(index){
        return d[index];
    };

    CustomPathData.prototype.setDoubleData = function(index, data){
        d[index] = data;
    };

    CustomPathData.prototype.addDoubleData = function(data){
        d.push(data);
    };

    var getPointCoord = function (point, horDir){
        if(horDir === true || isHorizontal(horDir))
            return point.x;

        else 
            return point.y;
    };

    var inflatedRect = function (rect, a){
        var r = rect;
        r.inflateRect(a, a); 
        return r; 
    };

    var deflatedRect = function (rect, a){ 
        var r = rect; 
        r.deflateRect(a,a); 
        return r; 
    };

    var isPointNear = function (p1, p2, nearness){
        return p2.x - nearness <= p1.x && p1.x <= p2.x + nearness &&
            p2.y - nearness <= p1.y && p1.y <= p2.y + nearness;
    };

    var isPointIn = function (point, rect, nearness){
        var tmpR = new ArRect(rect);
        tmpR.inflateRect(nearness, nearness);
        return tmpR.ptInRect(point) === true;
    };

    var isRectIn = function (r1, r2){
        return r2.left <= r1.left && r1.right <= r2.right &&
            r2.ceil <= r1.ceil && r1.floor <= r2.floor;
    };

    var isRectClip = function (r1, r2){
        var rect = new ArRect();
        return rect.intersectAssign(r1, r2) === true;
    };

    var isPointNearHLine = function (p, x1, x2, y, nearness){
        assert( x1 <= x2, "ArHelper.isPointNearHLine: x1 <= x2 FAILED");

        return x1 - nearness <= p.x && p.x <= x2 + nearness &&
            y - nearness <= p.y && p.y <= y + nearness;
    };

    var isPointNearVLine = function (p, y1, y2, x, nearness){
        assert( y1 <= y2, "ArHelper.isPointNearHLine: y1 <= y2 FAILED" );

        return y1 - nearness <= p.y && p.y <= y2 + nearness &&
            x - nearness <= p.x && p.x <= x + nearness;
    };

    var distanceFromHLine = function (p, x1, x2, y){
        assert( x1 <= x2, "ArHelper.distanceFromHLine: x1 <= x2 FAILED");

        return Math.max(Math.abs(p.y - y), Math.max(x1 - p.x, p.x - x2));
    };

    var distanceFromVLine = function (p, y1, y2, x){
        assert( y1 <= y2, "ArHelper.distanceFromVLine: y1 <= y2 FAILED" );

        return Math.max(Math.abs(p.x - x), Math.max(y1 - p.y, p.y - y2));
    };

    var distanceFromLine = function (pt, start, end){
        var dir = getDir(end.minus(start));

        if(isHorizontal(dir)){
            return distanceFromVLine(pt, start.y, end.y, start.x);
        }else{
            return distanceFromHLine(pt, start.x, end.x, start.y);
        }
    };

    var distanceSquareFromLine = function (start, end, pt){
        //     |det(end-start start-pt)|
        // d = -------------------------
        //            |end-start|
        //
        var nom = Math.abs((end.x - start.x) * (start.y - pt.y) - (start.x - pt.x) * (end.y - start.y)),
            denom_square = ((end.x - start.x) * (end.x - start.x) + (end.y - start.y) * (end.y - start.y)),
            d_square = nom * nom / denom_square;
        return d_square;
    };

    var isOnEdge = function (start, end, pt){
        if (start.x === end.x)			// vertical edge, horizontal move
        {
            if (end.x === pt.x && pt.y <= Math.max(end.y, start.y) && pt.y >= Math.min(end.y, start.y))
                return true;
        }
        else if (start.y === end.y)	// horizontal line, vertical move
        {
            if (start.y === pt.y && pt.x <= Math.max(end.x, start.x) && pt.x >= Math.min(end.x, start.x))
                return true;
        }

        return false;
    };

    var isPointNearLine = function (point, start, end, nearness){
        assert( 0 <= nearness, "ArHelper.isPointNearLine: 0 <= nearness FAILED");

        // begin Zolmol
        // the routing may create edges that have start==end
        // thus confusing this algorithm
        if( end.x === start.x && end.y === start.y)
            return false;
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

        if(xuyv < 0 || xuyv > x2y2)
            return false;

        var expr1 = (x * v - y * u) ;
        expr1 *= expr1;
        var expr2 = nearness * nearness * x2y2;

        return expr1 <= expr2;
    };

    var isLineMeetHLine = function (start, end, x1, x2, y){
        assert( x1 <= x2, "ArHelper.isLineMeetHLine: x1 <= x2 FAILED");
        if(start instanceof Array) //Converting from 'pointer'
            start = start[0];
        if(end instanceof Array)
            end = end[0];

        if( !((start.y <= y && y <= end.y) || (end.y <= y && y <= start.y )) )
            return false;

        var end2 = new ArPoint(end);
        end2.subtract(start);
        x1 -= start.x;
        x2 -= start.x;
        y -= start.y;

        if( end2.y === 0 )
            return y === 0 && (( x1 <= 0 && 0 <= x2 ) || (x1 <= end2.x && end2.x <= x2));

        var x = ((end2.x) / end2.y) * y;
        return x1 <= x && x <= x2;
    };

    var isLineMeetVLine = function (start, end, y1, y2, x){
        assert( y1 <= y2, "ArHelper.isLineMeetVLine: y1 <= y2  FAILED");
        if(start instanceof Array) //Converting from 'pointer'
            start = start[0];
        if(end instanceof Array)
            end = end[0];

        if( !((start.x <= x && x <= end.x) || (end.x <= x && x <= start.x )) )
            return false;

        var end2 = new ArPoint(end);
        end2.subtract(start);
        y1 -= start.y;
        y2 -= start.y;
        x -= start.x;

        if( end2.x === 0 )
            return x === 0 && (( y1 <= 0 && 0 <= y2 ) || (y1 <= end2.y && end2.y <= y2));

        var y = ((end2.y) / end2.x) * x;
        return y1 <= y && y <= y2;
    };

    var isLineClipRect = function (start, end, rect){
        if( rect.ptInRect(start) || rect.ptInRect(end) )
            return true;

        return isLineMeetHLine(start, end, rect.left, rect.right, rect.ceil) ||
            isLineMeetHLine(start, end, rect.left, rect.right, rect.floor) ||
            isLineMeetVLine(start, end, rect.ceil, rect.floor, rect.left) ||
            isLineMeetVLine(start, end, rect.ceil, rect.floor, rect.right);
    };

    var getLineClipRectIntersect = function(start, end, rect){
        //return the endpoints of the intersection line
        var dir = getDir(end.minus(start)),
            endpoints = [ new ArPoint(start), new ArPoint(end) ];

        if(!isLineClipRect(start, end, rect))
            return null;

        assert(isRightAngle(dir), "ArHelper.getLineClipRectIntersect: isRightAngle(dir) FAILED");

        //Make sure we are working left to right or top down
        if(dir === Dir_Left || dir === Dir_Top){
            dir = reverseDir(dir);
            endpoints.push(endpoints.splice(0,1)[0]); //Swap point 0 and point 1
        }

        if(isPointInDirFrom(endpoints[0], rect.getTopLeft(), reverseDir(dir))){
            endpoints[0].assign( rect.getTopLeft() );
        }

        if(isPointInDirFrom(endpoints[1], rect.getBottomRight(), dir)){
            endpoints[1].assign( rect.getBottomRight() );
        }

        if(isHorizontal(dir)){
            endpoints[0].y = start.y;
            endpoints[1].y = end.y;
        }else{
            endpoints[0].x = start.x;
            endpoints[1].x = end.x;
        }

        return endpoints;

    };

    var intersect = function (a1, a2, b1, b2){
        return Math.min(a1,a2) <= Math.max(b1,b2) && Math.min(b1,b2) <= Math.max(a1,a2);
    };

    // --------------------------- RoutingDirection

    var isHorizontal = function (dir) { 
        return dir === Dir_Right || dir === Dir_Left; 
    };

    var isVertical = function (dir) {
        return dir === Dir_Top || dir === Dir_Bottom; 
    };

    var isRightAngle = function (dir) {
        return Dir_Top <= dir && dir <= Dir_Left; 
    };

    var isTopLeft = function (dir) {
        return dir === Dir_Top || dir === Dir_Left; 
    };

    var isBottomRight = function (dir) {
        return dir === Dir_Bottom || dir === Dir_Right; 
    };

    var areInRightAngle = function (dir1, dir2){
        assert( isRightAngle(dir1) && isRightAngle(dir2), "ArHelper.areInRightAngle: isRightAngle(dir1) && isRightAngle(dir2) FAILED" );
        return isHorizontal(dir1) === isVertical(dir2);
    };

    var nextClockwiseDir = function (dir){
        if( isRightAngle(dir) )
            return ((dir+1) % 4);

        return dir;
    };

    var prevClockwiseDir = function (dir){
        if( isRightAngle(dir) )
            return ((dir+3) % 4);

        return dir;
    };

    var reverseDir = function (dir){
        if( isRightAngle(dir) )
            return ((dir+2) % 4);

        return dir;
    };

    var stepOneInDir = function (point, dir){
        assert( isRightAngle(dir), "ArHelper.stepOnInDir: isRightAngle(dir) FAILED");

        switch(dir)
        {
            case Dir_Top:
                point.y--;
                break;

            case Dir_Right:
                point.x++;
                break;

            case Dir_Bottom:
                point.y++;
                break;

            case Dir_Left:
                point.x--;
                break;
        }

    };

    var getRectCoord = function (rect, dir){
        assert( isRightAngle(dir), "ArHelper.getRectCoord: isRightAngle(dir) FAILED");

        switch( dir )
        {
            case Dir_Top: 
                return rect.ceil;

            case Dir_Right:
                return rect.right;

            case Dir_Bottom:
                return rect.floor;
        }

        return rect.left;
    };

    var getChildRectOuterCoordFrom = function (bufferObject, inDir, point){ //Point travels inDir until hits child box
        var children = bufferObject.children,
            i = 0,
            box = null,
            res = getRectOuterCoord(bufferObject.box, inDir);

        assert( isRightAngle(inDir), "getChildRectOuterCoordFrom: isRightAngle(inDir) FAILED"); 
        //The next assert fails if the point is in the opposite direction of the rectangle that it is checking.
        // e.g. The point is checking when it will hit the box from the right but the point is on the left
        assert( !isPointInDirFrom(point, bufferObject.box, (inDir)), "getChildRectOuterCoordFrom: !isPointInDirFrom(point, bufferObject.box.getRect(), (inDir)) FAILED"); 

        while( i < children.length ){

            if( isPointInDirFrom( point, children[i], reverseDir(inDir) ) && 
                    isPointBetweenSides(point, children[i], inDir) &&
                    isCoordInDirFrom(res, getRectOuterCoord( children[i], reverseDir(inDir) ), (inDir)) ){

                res = getRectOuterCoord( children[i], reverseDir(inDir) );
                box = children[i];
            }
            ++i;
        }

        return { "box": box , "coord": res };
    };

    var getRectOuterCoord = function (rect, dir){
        assert( isRightAngle(dir), "ArHelper.getRectOuterCoord: isRightAngle(dir) FAILED" );
        var t = rect.ceil - 1,
            r = rect.right + 1,
            b = rect.floor + 1,
            l = rect.left - 1;

        switch( dir )
        {
            case Dir_Top: 
                return t;

            case Dir_Right:
                return r;

            case Dir_Bottom:
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
        Dir_Top,
        Dir_Left,
        Dir_Bottom,
        Dir_Left,
        Dir_Top,
        Dir_Right,
        Dir_Bottom,
        Dir_Right
            ];

    var getMajorDir = function (offset){
        return majordir_table[getDirTableIndex(offset)];
    };

    var minordir_table =
        [
        Dir_Left,
        Dir_Top,
        Dir_Left,
        Dir_Bottom,
        Dir_Right,
        Dir_Top,
        Dir_Right,
        Dir_Bottom
            ];

    var getMinorDir = function (offset){
        return minordir_table[getDirTableIndex(offset)];
    };

    //	FG123
    //	E   4
    //	D 0 5
    //	C   6
    //  BA987


    var exGetDirTableIndex = function (offset){
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
        Dir_None,
        Dir_Top,
        Dir_Top,
        Dir_Right,
        Dir_Right,
        Dir_Right,
        Dir_Right,
        Dir_Right,
        Dir_Bottom,
        Dir_Bottom,
        Dir_Bottom,
        Dir_Left,
        Dir_Left,
        Dir_Left,
        Dir_Left,
        Dir_Left,
        Dir_Top
            ];;

    var exGetMajorDir = function (offset){
        return exmajordir_table[exGetDirTableIndex(offset)];
    };

    var exminordir_table =  
        [
        Dir_None,
        Dir_None,
        Dir_Right,
        Dir_Top,
        Dir_Top,
        Dir_None,
        Dir_Bottom,
        Dir_Bottom,
        Dir_Right,
        Dir_None,
        Dir_Left,
        Dir_Bottom,
        Dir_Bottom,
        Dir_None,
        Dir_Top,
        Dir_Top,
        Dir_Left
            ];

    var exGetMinorDir = function (offset){
        return exminordir_table[exGetDirTableIndex(offset)];
    };

    var getDir = function (offset, nodir){
        if( offset.cx === 0 )
        {
            if( offset.cy === 0 )
                return nodir;

            if( offset.cy < 0 )
                return Dir_Top;

            return Dir_Bottom;
        }

        if( offset.cy === 0 )
        {
            if( offset.cx > 0 )
                return Dir_Right;

            return Dir_Left;
        }

        return Dir_Skew;
    };

    var getSkewDir = function (offset, nodir){
        if (offset.cx === 0 || Math.abs(offset.cy) > Math.abs(offset.cx))
        {
            if (offset.cy === 0)
                return nodir;

            if (offset.cy < 0)
                return Dir_Top;

            return Dir_Bottom;
        }

        if (offset.cy === 0 || Math.abs(offset.cx) >= Math.abs(offset.cy))
        {
            if (offset.cx > 0)
                return Dir_Right;

            return Dir_Left;
        }

        assert(false, "ArHelper.getSkewDir: Error ");
        return Dir_Skew;
    };

    var isPointInDirFromChildren = function (point, fromParent, dir){
        var children = fromParent.children,
            i = 0;

        assert( isRightAngle(dir), "isPointInDirFromChildren: isRightAngle(dir) FAILED"); 

        while( i < children.length ){
            if( isPointInDirFrom( point, children[i].getRect(), dir ))
                return true;
            ++i;
        }

        return false;
    };

    var isPointInDirFrom = function (point, from, dir){
        if(from instanceof ArRect){
            var rect = from;
            assert( isRightAngle(dir), "ArHelper.isPointInDirFrom: isRightAngle(dir) FAILED" );

            switch( dir )
            {
                case Dir_Top:
                    return point.y < rect.ceil;

                case Dir_Right:
                    return point.x >= rect.right;

                case Dir_Bottom:
                    return point.y >= rect.floor;

                case Dir_Left:
                    return point.x < rect.left;
            }

            return false;

        }else{
            assert( isRightAngle(dir), "ArHelper.isPointInDirFrom: isRightAngle(dir) FAILED" );

            switch( dir )
            {
                case Dir_Top:
                    return point.y <= from.y;

                case Dir_Right:
                    return point.x >= from.x;

                case Dir_Bottom:
                    return point.y >= from.y;

                case Dir_Left:
                    return point.x <= from.x;
            }

            return false;

        }
    };

    var isPointBetweenSides = function (point, rect, ishorizontal){
        if( ishorizontal === true || isHorizontal(ishorizontal) )
            return rect.ceil <= point.y && point.y < rect.floor;

        return rect.left <= point.x && point.x < rect.right;
    };

    var pointOnSide = function (point, rect){
        var dleft = distanceFromVLine(point, rect.ceil, rect.floor, rect.left),
            dtop = distanceFromHLine(point, rect.left, rect.right, rect.ceil),
            dright = distanceFromVLine(point, rect.ceil, rect.floor, rect.right),
            dbottom = distanceFromHLine(point, rect.left, rect.right, rect.floor);

        if (dleft < 3)
            return Dir_Left;
        if (dtop < 3)
            return Dir_Top;
        if (dright < 3)
            return Dir_Right;
        if (dbottom < 3)
            return Dir_Bottom;

        return getSkewDir(point.minus(rect.CenterPoint()));
    };

    var isCoordInDirFrom = function (coord, from, dir){
        assert( isRightAngle(dir), "ArHelper.isCoordInDirFrom: isRightAngle(dir) FAILED" );
        if( from instanceof ArPoint)
            from = getPointCoord(from, dir);

        if( dir === Dir_Top || dir === Dir_Left )
            return coord <= from;

        return coord >= from;
    };

    // This next method only supports deterministic (unambiguous) orientations. That is, the point
    // cannot be in a corner of the rectangle.
    // NOTE: the right and floor used to be - 1. 
    var onWhichEdge = function (rect, point){
        if( point.y === rect.ceil && rect.left < point.x && point.x < rect.right ) 
            return Dir_Top;

        if( point.y === rect.floor && rect.left < point.x && point.x < rect.right )
            return Dir_Bottom;

        if( point.x === rect.left && rect.ceil < point.y && point.y < rect.floor )
            return Dir_Left;

        if( point.x === rect.right && rect.ceil < point.y && point.y < rect.floor )
            return Dir_Right;

        return Dir_None;
    };

    // --------------------------- CArFindNearestLine

    var ArFindNearestLine = function (pt){
        this.point = pt;
        this.dist1 = INT_MAX;
        this.dist2 = INT_MAX;
    };

    ArFindNearestLine.prototype.hLine = function(x1, x2, y){
        assert( x1 <= x2 , "ArFindNearestLine.hLine: x1 <= x2  FAILED");

        var d1 = distanceFromHLine(this.point, x1, x2, y),
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

        var d1 = distanceFromVLine(this.point, y1, y2, x),
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
        return this.dist1 < INT_MAX && this.dist2 < INT_MAX;
    };

    // --------------------------- ArPointListPath

    var ArPointListPath = function (){
        //I will be using a wrapper to give this object array functionality
        //Ideally, I would inherit but this avoids some of the issues with
        //inheriting from arrays in js (currently anyway)
        this.ArPointList = [];
        //this.length = 0;
    };


    //Wrapper Functions
    ArPointListPath.prototype.getLength = function(){
        return this.ArPointList.length;
    };

    ArPointListPath.prototype.getArPointList = function(){
        return this.ArPointList;
    };

    ArPointListPath.prototype.setArPointList = function(list){
        this.ArPointList = list;
    };

    ArPointListPath.prototype.get = function(index){
        return this.ArPointList[index];
    };

    ArPointListPath.prototype.push = function(element){
        if(DEBUG && this.ArPointList.length > 0){
            assert(element[0].x === this.ArPointList[this.ArPointList.length - 1][0].x ||
                    element[0].y === this.ArPointList[this.ArPointList.length - 1][0].y, "ArPointListPath.push: point does not create horizontal or vertical edge!");
        }
        if(element instanceof Array)
            this.ArPointList.push(element);
        else
            this.ArPointList.push([element]);
    };

    ArPointListPath.prototype.indexOf = function(element){
        return this.ArPointList.indexOf(element);
    };

    ArPointListPath.prototype.concat = function(element){
        return this.ArPointList.concat(element);
    };

    ArPointListPath.prototype.splice = function(start, amt, insert){
        var res;
        if(insert !== undefined){
            res = this.ArPointList.splice(start, amt, insert);
        }else
            res = this.ArPointList.splice(start, amt);

        return res;
    };

    //Functions
    ArPointListPath.prototype.getHeadEdge = function(start, end){

        var pos = this.ArPointList.length;
        if( this.ArPointList.length < 2 )
            return pos;

        pos = 0;
        assert( pos < this.ArPointList.length, "ArPointListPath.getHeadEdge: pos < this.ArPointList.length FAILED");

        start = this.ArPointList[pos++];
        assert( pos < this.ArPointList.length, "ArPointListPath.getHeadEdge: pos < this.ArPointList.length FAILED");

        end = this.ArPointList[pos];

        return pos;
    };

    ArPointListPath.prototype.getTailEdge = function(start, end){
        if( this.ArPointList.length < 2 )
            return this.ArPointList.length ;

        var pos = this.ArPointList.length;
        assert( --pos < this.ArPointList.length, "ArPointListPath.getHeadEdge: --pos < this.ArPointList.length FAILED" );

        end = this.ArPointList[pos--];
        assert( pos < this.ArPointList.length, "ArPointListPath.getHeadEdge: pos < this.ArPointList.length FAILED" );

        start = this.ArPointList[pos];

        return { "pos": pos, "start": start, "end": end };
    };

    ArPointListPath.prototype.getNextEdge = function(pos, start, end){
        if(DEBUG)
            this.AssertValidPos(pos);

        pos++;
        assert( pos < this.ArPointList.length, "ArPointListPath.getNextEdge: pos < this.ArPointList.length FAILED");

        var p = pos;
        start = this.ArPointList[p++];
        if( p === this.ArPointList.length)
            pos = this.ArPointList.length;
        else
            end = this.ArPointList[p];
    };

    ArPointListPath.prototype.getPrevEdge = function(pos, start, end){
        if(DEBUG)
            this.AssertValidPos(pos);

        end = this.ArPointList[pos--];
        if( pos != this.ArPointList.length)
            start = this.ArPointList[pos];

        return { "pos": pos, "start": start, "end": end };
    };

    ArPointListPath.prototype.getEdge = function(pos, start, end){
        if(DEBUG)
            this.AssertValidPos(pos);

        start = this.ArPointList[pos++];
        assert( pos < this.ArPointList.length, "ArPointListPath.getEdge: pos < this.ArPointList.length FAILED" );

        end = this.ArPointList[pos];
    };

    ArPointListPath.prototype.getHeadEdgePtrs = function(start, end){
        if( this.ArPointList.length < 2 )
            return { 'pos': this.ArPointList.length };

        var start,
            end,
            pos = 0;
        assert( pos < this.ArPointList.length, "ArPointListPath.getHeadEdgePtrs: pos < this.ArPointList.length FAILED");

        start = this.ArPointList[pos++];
        assert( pos < this.ArPointList.length, "ArPointListPath.getHeadEdgePtrs: pos < this.ArPointList.length FAILED");

        end = this.ArPointList[pos];

        return { 'pos': pos, 'start': start, 'end': end };
    };

    ArPointListPath.prototype.getTailEdgePtrs = function(){
        var pos = this.ArPointList.length,
            start,
            end;

        if( this.ArPointList.length < 2 ){
            return { 'pos': pos };
        }

        assert( --pos < this.ArPointList.length, "ArPointListPath.getTailEdgePtrs: --pos < this.ArPointList.length FAILED");

        end = this.ArPointList[pos--];
        assert( pos < this.ArPointList.length, "ArPointListPath.getTailEdgePtrs: pos < this.ArPointList.length FAILED");

        start = this.ArPointList[pos];

        return { 'pos': pos, 'start': start, 'end': end };
    };

    ArPointListPath.prototype.getNextEdgePtrs = function(pos, start, end){
        if(DEBUG)
            this.AssertValidPos(pos);

        start = this.ArPointList[pos++];
        if (pos < this.ArPointList.length)
            end = this.ArPointList[pos];

        return { 'pos': pos, 'start': start, 'end': end };
    };

    ArPointListPath.prototype.getPrevEdgePtrs = function(pos){
        var result = {},
            start,
            end;

        if(DEBUG)
            this.AssertValidPos(pos);

        end = this.ArPointList[pos];//&

        if( pos-- > 0)
            start = this.ArPointList[pos];//&

        result.pos = pos;
        result.start = start;
        result.end = end;
        return result;
    };

    ArPointListPath.prototype.getEdgePtrs = function(pos, start, end){
        if(DEBUG)
            this.AssertValidPos(pos);

        start.assign(this.ArPointList[pos++]);
        assert( pos < this.ArPointList.length, "ArPointListPath.getEdgePtrs: pos < this.ArPointList.length FAILED");

        end.assign(this.ArPointList[pos]);
    };

    ArPointListPath.prototype.getStartPoint = function(pos){
        if(DEBUG)
            this.AssertValidPos(pos);

        return this.ArPointList[pos];//&
    };

    ArPointListPath.prototype.getEndPoint = function(pos){
        if(DEBUG)
            this.AssertValidPos(pos);

        pos++;
        assert( pos < this.ArPointList.length, "ArPointListPath.getEndPoint: pos < this.ArPointList.length FAILED" );

        return this.ArPointList[pos];//&
    };

    ArPointListPath.prototype.getPointBeforeEdge = function(pos){
        if(DEBUG)
            this.AssertValidPos(pos);

        pos--;
        if( pos === this.ArPointList.length)
            return null;

        return this.ArPointList[pos]; //&
    };

    ArPointListPath.prototype.getPointAfterEdge = function(pos){
        if(DEBUG)
            this.AssertValidPos(pos);

        pos++;
        assert( pos < this.ArPointList.length, "ArPointListPath.getPointAfterEdge: pos < this.ArPointList.length FAILED");

        pos++;
        if( pos === this.ArPointList.length )
            return null;

        return this.ArPointList[pos];//&
    };

    ArPointListPath.prototype.getEdgePosBeforePoint = function(pos){
        if(DEBUG)
            this.AssertValidPos(pos);

        pos--;
        return pos;
    };

    ArPointListPath.prototype.getEdgePosAfterPoint = function(pos){
        if(DEBUG)
            this.AssertValidPos(pos);

        var p = pos + 1;

        if( p === this.ArPointList.length )
            return this.ArPointList.length;

        return pos;
    };

    ArPointListPath.prototype.getEdgePosForStartPoint = function(start){
        var pos = 0;
        while( pos < this.ArPointList.length )
        {
            if( this.ArPointList[pos++] === start)
            {
                assert( pos < this.ArPointList.length, "ArPointListPath.getEdgePosForStartPoint: pos < this.ArPointList.length FAILED" );
                pos--;
                break;
            }
        }

        assert( pos < this.ArPointList.length, "ArPointListPath.getEdgePosForStartPoint: pos < this.ArPointList.length FAILED" );
        return pos;
    };

    ArPointListPath.prototype.assertValid = function(){

    };

    ArPointListPath.prototype.assertValidPos = function(pos){
        assert( pos < this.ArPointList.length, "ArPointListPath.assertValidPos: pos < this.ArPointList.length FAILED" );

        var p = 0;
        for(;;)
        {
            assert( pos < this.ArPointList.length, "ArPointListPath.assertValidPos: pos < this.ArPointList.length FAILED" );
            if( p === pos )
                return;

            p++;
        }
    };

    ArPointListPath.prototype.dumpPoints = function(msg){
        console.log(msg + ", points dump begin:");
        var pos = 0,
            i = 0,
            p;
        while(pos < this.ArPointList.length) {
            p = this.ArPointList[pos++][0];
            console.log(i + ".: (" + p.x + ", " + p.y + ")");
            i++;
        }
        console.log("points dump end.");
    };

    var ArPoint = function (x, y){
        //Multiple Constructors
        if(x === undefined){ //No arguments were passed to constructor
            x = 0;
            y = 0;
        }else if(y === undefined){ //One argument passed to constructor
            y = x.y;
            x = x.x;
        }

        this.x = Math.round(x);
        this.y = Math.round(y);
    };

    ArPoint.prototype.equals = function (otherPoint){
        if( this.x === otherPoint.x && this.y === otherPoint.y)
            return true;

        return false;
    };

    ArPoint.prototype.offset = function (x, y){
        if(y !== undefined){ //two arguments are sent to function
            x = new ArSize(x, y);
        }

        this.add(x);
    };

    ArPoint.prototype.add = function (otherObject){ //equivalent to +=
        if(otherObject instanceof ArSize){
            this.x += otherObject.cx;
            this.y += otherObject.cy;
        }else if(otherObject instanceof ArPoint){
            this.x += otherObject.x;
            this.y += otherObject.y;
        }

        this.x = Math.round(x);
        this.y = Math.round(y);
    };

    ArPoint.prototype.subtract = function (otherObject){ //equivalent to +=
        if(otherObject instanceof ArSize){
            this.x -= otherObject.cx;
            this.y -= otherObject.cy;
        }else if(otherObject instanceof ArPoint){
            this.x -= otherObject.x;
            this.y -= otherObject.y;
        }
    };

    ArPoint.prototype.plus = function (otherObject){ //equivalent to +
        var objectCopy = undefined;

        if(otherObject instanceof ArSize){
            objectCopy = new ArPoint(this);
            objectCopy.add(otherObject);

        }else if(otherObject instanceof ArPoint){
            objectCopy = new ArPoint(otherObject);
            objectCopy.x += this.x;
            objectCopy.y += this.y;

        }else if(otherObject instanceof ArRect){
            objectCopy = new ArRect(otherObject);
            objectCopy.add(this);

        }

        return objectCopy;
    };

    ArPoint.prototype.minus = function (otherObject){
        var objectCopy;

        if(otherObject instanceof ArSize){
            objectCopy = new ArPoint(otherObject);
            objectCopy.subtract(this);

        }else if(otherObject instanceof ArPoint){
            objectCopy = new ArSize();
            objectCopy.cx = this.x - otherObject.x;
            objectCopy.cy = this.y - otherObject.y;

        }else if(otherObject instanceof ArRect){
            objectCopy = new ArRect(otherObject);
            objectCopy.subtract(this);

        }

        return objectCopy;
    };

    ArPoint.prototype.assign = function (otherPoint){
        this.x = otherPoint.x;
        this.y = otherPoint.y;

        return this;
    };

    var emptyPoint = new ArPoint(-100000, -100000);

    var ArRect = function(Left, Ceil, Right, Floor){
        if(Left === undefined){ //No arguments
            Left = 0;
            Ceil = 0;
            Right = 0;
            Floor = 0;

        }else if(Ceil === undefined && Left instanceof ArRect){ //One argument
            //Left is an ArRect
            Ceil = Left.ceil;
            Right = Left.right;
            Floor = Left.floor;
            Left = Left.left;

        } else if(Right === undefined && Left instanceof ArPoint){ //Two arguments
            //Creating ArRect with ArPoint and either another ArPoint or ArSize
            if(Ceil instanceof ArSize){
                Right = Left.x + Ceil.cx;
                Floor = Left.y + Ceil.cy;
                Ceil = Left.y;
                Left = Left.x;

            }else if(Left instanceof ArPoint && Ceil instanceof ArPoint){
                Right = Math.round(Ceil.x);
                Floor = Math.round(Ceil.y);
                Ceil = Math.round(Left.y);
                Left = Math.round(Left.x);
            }else
                console.log("Invalid ArRect Constructor");

        }else if(Floor === undefined){ //Invalid
            console.log("Invalid ArRect Constructor");
        }

        this.left = Math.round( Left );
        this.ceil = Math.round( Ceil );
        this.floor = Math.round( Floor );
        this.right = Math.round( Right );
    };

    ArRect.prototype.getCenter = function(){
        return { 'x': (this.left + this.right)/2, 'y': (this.ceil + this.floor)/2 };
    };

    ArRect.prototype.getWidth = function (){
        return (this.right - this.left);
    };

    ArRect.prototype.getHeight = function (){
        return (this.floor - this.ceil);
    };

    ArRect.prototype.getSize = function (){
        return new ArSize(this.getWidth(), this.getHeight());
    };

    ArRect.prototype.getTopLeft = function (){
        return new ArPoint(this.left, this.ceil);
    };

    ArRect.prototype.getBottomRight = function (){
        return new ArPoint(this.right, this.floor);
    };

    ArRect.prototype.getCenterPoint = function (){
        return new ArPoint(this.left + this.getWidth()/2, this.ceil + this.getHeight()/2);
    };

    ArRect.prototype.isRectEmpty = function (){
        if((this.left >= this.right) && (this.ceil >= this.floor))
            return true;

        return false;
    };


    ArRect.prototype.isRectNull = function (){
        if( this.left === 0 &&
                this.right === 0 &&
                this.ceil === 0 &&
                this.floor === 0)
            return true;

        return false;
    };

    ArRect.prototype.ptInRect = function (pt){
        if(pt instanceof Array)
            pt = pt[0];

        if( pt.x >= this.left &&
                pt.x <= this.right &&
                pt.y >= this.ceil &&
                pt.y <= this.floor)
            return true;

        return false;
    };

    ArRect.prototype.rectInRect = function (rect){
        if(rect === undefined)
            return false;

        return (rect.left >= this.left && rect.ceil >= this.ceil &&
                rect.right <= this.right && rect.floor <= this.floor);
    };

    ArRect.prototype.setRect = function ( nLeft, nCeil, nRight, nFloor){
        if(nCeil === undefined && nLeft instanceof ArRect){ //
            this.assign(nLeft);

        }else if(nRight === undefined || nFloor === undefined) { //invalid
            console.log("Invalid args for [ArRect].setRect");

        }else{
            this.left = nLeft;
            this.ceil = nCeil;
            this.right = nRight;
            this.floor = nFloor;
        }

    };

    ArRect.prototype.setRectEmpty = function (){

        this.ceil = 0;
        this.right = 0;
        this.floor = 0;
        this.left = 0;
    };

    ArRect.prototype.inflateRect = function (x, y){
        if( x !== undefined && x.cx !== undefined && x.cy !== undefined){
            y = x.cy;
            x = x.cx;
        }else if( y === undefined ){
            y = x;
        }

        this.left -= x;
        this.right += x;
        this.ceil -= y;
        this.floor += y;
    };

    ArRect.prototype.deflateRect = function (x, y){
        if( x !== undefined && x.cx !== undefined && x.cy !== undefined){
            y = x.cy;
            x = x.cx;
        }

        this.left += x;
        this.right -= x;
        this.ceil += y;
        this.floor -= y;
    };

    ArRect.prototype.normalizeRect = function (){
        var temp;

        if(this.left > this.right){
            temp = this.left;
            this.left = this.right;
            this.right = temp;
        }

        if(this.ceil > this.floor){
            temp = this.ceil;
            this.ceil = this.floor;
            this.floor = temp;
        }
    };

    ArRect.prototype.assign = function (rect){

        this.ceil = rect.ceil;
        this.right = rect.right;
        this.floor = rect.floor;
        this.left = rect.left;
    };

    ArRect.prototype.equals = function (rect){
        if( this.left === rect.left &&
                this.right === rect.right &&
                this.ceil === rect.ceil &&
                this.floor === rect.floor)
            return true;

        return false;

    };

    ArRect.prototype.add = function (ArObject){
        var dx,
            dy;
        if(ArObject instanceof ArPoint){
            dx = ArObject.x;
            dy = ArObject.y;

        }else if (ArObject.cx !== undefined && ArObject.cy !== undefined){
            dx = ArObject.cx;
            dy = ArObject.cy;

        }else
            console.log("Invalid arg for [ArRect].add method");

        this.left += dx;
        this.right += dx;
        this.ceil += dy;
        this.floor += dy;
    };

    ArRect.prototype.subtract = function (ArObject){
        if(ArObject instanceof ArPoint){
            this.deflateRect(ArObject.x, ArObject.y);

        }else if (ArObject instanceof ArSize){
            this.deflateRect(ArObject);

        }else if (ArObject instanceof ArRect){
            this.left += ArObject.left;
            this.right -= ArObject.right;
            this.ceil += ArObject.ceil;
            this.floor -= ArObject.floor;

        }else
            console.log("Invalid arg for [ArRect].subtract method");
    };

    ArRect.prototype.plus = function (ArObject){
        var resObject = new ArRect(this);
        resObject.add(ArObject);

        return resObject;
    };

    ArRect.prototype.minus = function (ArObject){
        var resObject = new ArRect(this);
        resObject.subtract(ArObject);

        return resObject;
    };

    ArRect.prototype.unionAssign = function (rect){
        if( rect.isRectEmpty())
            return;
        if( this.isRectEmpty()){
            this.assign(rect);
            return;
        }

        //Take the outermost dimension
        this.left = Math.min(this.left, rect.left);
        this.right = Math.max(this.right, rect.right);
        this.ceil = Math.min(this.ceil, rect.ceil);
        this.floor = Math.max(this.floor, rect.floor);

    };

    ArRect.prototype.union = function (rect){
        var resRect = new ArRect(this);
        resRect.unionAssign(rect);

        return resRect;
    };

    ArRect.prototype.intersectAssign = function (rect1, rect2){
        rect2 = rect2 ? rect2 : this;
        //Sets this rect to the intersection rect
        this.left = Math.max(rect1.left, rect2.left);
        this.right = Math.min(rect1.right, rect2.right);
        this.ceil = Math.max(rect1.ceil, rect2.ceil);
        this.floor = Math.min(rect1.floor, rect2.floor);

        if(this.left >= this.right || this.ceil >= this.floor){
            this.setRectEmpty();
            return false;
        }

        return true;
    };

    ArRect.prototype.intersect = function (rect){
        var resRect = new ArRect(this);

        resRect.intersectAssign(rect);
        return resRect;
    };

    ArRect.prototype.touching = function (rect){
        //One pixel is added to the minimums so, if they are not deemed to be touching
        //there is guaranteed to be at lease a one pixel path between them
        return Math.max(rect.left, this.left) <= Math.min(rect.right, this.right) + 1
            && Math.max(rect.ceil, this.ceil) <= Math.min(rect.floor, this.floor) + 1;
    };

    var ArSize = function (x, y){
        //Multiple Constructors
        if(x === undefined){ //No arguments were passed to constructor
            x = 0;
            y = 0;
        }else if(y === undefined){ //One argument passed to constructor
            y = x.cy;
            x = x.cx;
        }

        this.cx = x;
        this.cy = y;
    };

    ArSize.prototype.equals = function(otherSize){
        if( this.cx === otherSize.cx && this.cy === otherSize.cy)
            return true;

        return false;
    };

    ArSize.prototype.add = function(otherSize){ //equivalent to +=
        this.cx += otherSize.cx;
        this.cy += otherSize.cy;
    };

    ArSize.prototype.subtract = function(otherSize){
        this.cx -= otherSize.cx;
        this.cy -= otherSize.cy;
    };

    ArSize.prototype.plus = function(otherObject){ //equivalent to +
        var objectCopy = undefined;

        if(otherObject instanceof ArSize){
            objectCopy = new ArSize(otherObject);
            objectCopy.add(this);

        }else if(otherObject instanceof ArPoint){
            objectCopy = new ArPoint(otherObject);
            objectCopy.x += this.cx;
            objectCopy.y += this.cy;

        }else if(otherObject instanceof ArRect){
            objectCopy = new ArRect(otherObject);
            objectCopy.add(this);

        }

        return objectCopy;
    };

    ArSize.prototype.minus = function(otherObject){ //equivalent to -
        var objectCopy = undefined;

        if(otherObject instanceof ArSize){
            objectCopy = new ArSize(otherObject);
            objectCopy.subtract(this);

        }else if(otherObject instanceof ArPoint){
            objectCopy = new ArPoint(otherObject);
            objectCopy.x -= this.cx;
            objectCopy.y -= this.cy;

        }else if(otherObject instanceof ArRect){
            objectCopy = new ArRect(otherObject);
            objectCopy.subtract(this);

        }

        return objectCopy;
    };

    ArSize.prototype.assign = function(otherSize){
        this.cx = otherSize.cx;
        this.cy = otherSize.cy;
    };


    ArSize.prototype.getArray = function(){
        var res = [];
        res.push(this.cx);
        res.push(this.cy);
        return res;
    };



    var AutoRouterBox = function (){
        this.owner = null;
        this.rect = new ArRect();
        this.atomic = false;
        this.selfPoints = [];
        this.ports = [];
        this.childBoxes = [];//dependent boxes
        this.mother = null;
        this.id;

        this.calculateSelfPoints(); //Part of initialization
    };

    AutoRouterBox.prototype.calculateSelfPoints = function (){
        this.selfPoints = [];
        this.selfPoints.push(new ArPoint(this.rect.getTopLeft()));

        this.selfPoints.push(new ArPoint( this.rect.right, this.rect.ceil));
        this.selfPoints.push(new ArPoint(this.rect.right, this.rect.floor));
        this.selfPoints.push(new ArPoint(this.rect.left, this.rect.floor));
    };

    AutoRouterBox.prototype.deleteAllPorts = function (){
        for(var i = 0; i < this.ports.length; i++){
            this.ports[i].setOwner(null);
            this.ports[i] = null;
        }

        this.ports = [];

        this.atomic = false;
    };

    AutoRouterBox.prototype.setID = function (_id){
        this.id = _id;
    };

    AutoRouterBox.prototype.getID = function (){
        return this.id;
    };

    AutoRouterBox.prototype.getOwner = function (){
        return this.owner;
    };

    AutoRouterBox.prototype.hasOwner = function (){
        return this.owner !== null;
    };

    AutoRouterBox.prototype.setOwner = function (graph){
        this.owner = graph;
    };

    AutoRouterBox.prototype.createPort = function (){
        var port = new AutoRouterPort();
        assert(port !== null, "ARBox.createPort: port !== null FAILED");

        return port;
    };

    AutoRouterBox.prototype.hasNoPort = function (){
        return this.ports.length === 0;
    };

    AutoRouterBox.prototype.getPortCount = function (){
        return this.ports.length;
    };

    AutoRouterBox.prototype.isAtomic = function (){
        return this.atomic;
    };

    AutoRouterBox.prototype.addPort = function (port){
        assert(port !== null, "ARBox.addPort: port !== null FAILED");

        if(port === null)
            return;

        port.setOwner(this);
        this.ports.push(port);

        if(this.owner instanceof AutoRouterGraph)
            this.owner._addEdges(port);
    };

    AutoRouterBox.prototype.deletePort = function (port){
        assert(port !== null, "ARBox.deletePort: port !== null FAILED");
        if(port === null)
            return;

        var index = this.ports.indexOf(port),
            delPort,
            graph = this.owner;

        assert(index !== -1, "ARBox.deletePort: index !== -1 FAILED");

        graph.deleteEdges(port);
        delPort = this.ports.splice(index, 1)[0];
        delPort.destroy();
        delPort = null;

        this.atomic = false;

    };

    AutoRouterBox.prototype.getPortList = function (){
        return this.ports;
    };

    AutoRouterBox.prototype.getRect = function (){
        return this.rect;
        //return new ArRect(this.rect);
    };

    AutoRouterBox.prototype.isRectEmpty = function (){
        return this.rect.isRectEmpty();
    };

    AutoRouterBox.prototype.setRect = function (r){
        assert(r instanceof ArRect, "Invalthis.id arg in ARBox.setRect. Requires ArRect");

        assert( r.getWidth() >= 3 && r.getHeight() >= 3, "ARBox.setRect: r.getWidth() >= 3 && r.getHeight() >= 3 FAILED!");
        assert( r.getTopLeft().x >= ED_MINCOORD && r.getTopLeft().y >= ED_MINCOORD, "ARBox.setRect: r.getTopLeft().x >= ED_MINCOORD && r.getTopLeft().y >= ED_MAXCOORD FAILED!");
        assert( r.getBottomRight().x <= ED_MAXCOORD && r.getBottomRight().y <= ED_MAXCOORD, "ARBox.setRect:  r.getBottomRight().x <= ED_MAXCOORD && r.getBottomRight().y <= ED_MAXCOORD FAILED!");
        assert( this.ports.length === 0 || this.atomic, "ARBox.setRect: this.ports.length === 0 || this.atomic FAILED!");

        this.rect.assign(r);

        this.calculateSelfPoints();

        if(this.atomic){
            assert(this.ports.length === 1, "ARBox.setRect: this.ports.length === 1 FAILED!");
            this.ports[0].setRect(r);
        }
    };

    AutoRouterBox.prototype.setRectByPoint = function (point){
        this.shiftBy(point);
    };

    AutoRouterBox.prototype.shiftBy = function (offset){
        this.rect.add(offset);

        var i = this.ports.length;
        while(i--){
            this.ports[i].shiftBy(offset);
        }

        /*
           This is not necessary; the ARGraph will shift all children
           i = this.childBoxes.length;
           while(i--){
           this.childBoxes[i].shiftBy(offset);
           }
         */
        this.calculateSelfPoints();
    };

    AutoRouterBox.prototype.resetPortAvailability = function (){
        for(var i = 0; i < this.ports.length; i++){
            this.ports[i].resetAvailableArea();
        }
    };

    AutoRouterBox.prototype.adjustPortAvailability = function (r){
        for(var i = 0; i < this.ports.length; i++){
            this.ports[i].adjustAvailableArea(r);
        }
    };

    AutoRouterBox.prototype.getParent = function (){
        return this.mother;
    };

    AutoRouterBox.prototype.setParent = function (box){
        this.mother = box;
    };

    AutoRouterBox.prototype.addChild = function (box){
        assert(this.childBoxes.indexOf(box) === -1, "ARBox.addChild: box already is child of " + this.getID());
        this.childBoxes.push(box);
        box.setParent(this);
    };

    AutoRouterBox.prototype.removeChild = function (box){
        var i = this.childBoxes.indexOf(box);
        assert(i !== -1, "ARBox.removeChild: box isn't child of " + this.getID());
        this.childBoxes.splice(i,1)[0].setParent(null);
    };

    AutoRouterBox.prototype.clearChildren = function (){
        var i = this.childBoxes.length;
        while(i--){
            this.removeChild(this.childBoxes[i]);
        }
    };

    AutoRouterBox.prototype.getChildren = function (){
        return this.childBoxes;
    };

    AutoRouterBox.prototype.getSelfPoints = function (){
        return this.selfPoints;
    };

    AutoRouterBox.prototype.isBoxAt = function (point, nearness){
        return isPointIn(point, this.rect, nearness);
    };

    AutoRouterBox.prototype.isBoxClip = function (r){
        return isRectClip(this.rect, r);
    };

    AutoRouterBox.prototype.isBoxIn = function (r){
        return isRectIn(this.rect, r);
    };

    AutoRouterBox.prototype.destroy = function (){
        var i = this.childBoxes.length;

        //notify this.mother of destruction
        //if there is a this.mother, of course
        if(this.mother)
            this.mother.removeChild(this);

        this.setOwner(null);
        this.deleteAllPorts();

        while(i--){
            this.childBoxes[i].destroy();
        }
    };


    var AutoRouterEdge = function (){
        /*
           In this section every comment refer to the horizontal case, that is, each	edge is
           horizontal.
         */

        /*
           Every CAutoRouterEdge belongs to an edge of a CAutoRouterPath, CAutoRouterBox or CAutoRouterPort. This edge is
           Represented by a CAutoRouterPoint with its next point. The variable 'point' will refer
           to this CAutoRouterPoint.

           The coordinates of an edge are 'x1', 'x2' and 'y' where x1/x2 is the x-coordinate
           of the left/right point, and y is the common y-coordinate of the points.

           The edges are ordered according to their y-coordinates. The first edge has
           the least y-coordinate (topmost), and its pointer is in 'order_first'.
           We use the 'order' prefix in the variable names to refer to this order.

           We will walk from top to bottom (from the 'order_first' along the 'this.order_next').
           We keep track a "section" of some edges. If we have an infinite horizontal line,
           then the section consists of those edges that are above the line and not blocked
           by another edge which is closer to the line. Each edge in the section has
           a viewable portion from the line (the not blocked portion). The coordinates
           of this portion are 'this.section_x1' and 'this.section_x2'. We have an order of the edges
           belonging to the current section. The 'section_first' refers to the leftmost
           edge in the section, while the 'this.section_next' to the next from left to right.

           We say that the CAutoRouterEdge E1 "precede" the CAutoRouterEdge E2 if there is no other CAutoRouterEdge which
           totally	blocks S1 from S2. So a section consists of the preceding edges of an
           infinite edge. We say that E1 is "adjacent" to E2, if E1 is the nearest edge
           to E2 which precede it. Clearly, every edge has at most one adjacent precedence.

           The edges of any CAutoRouterBox or CAutoRouterPort are fixed. We will continually fix the edges
           of the CAutoRouterPaths. But first we need some definition.

           We call a set of edges as a "block" if the topmost (first) and bottommost (last)
           edges of it are fixed while the edges between them are not. Furthermore, every
           edge is adjacent to	the next one in the order. Every edge in the block has an
           "index". The index of the first one (topmost) is 0, of the second is 1, and so on.
           We call the index of the last edge (# of edges - 1) as the index of the entire box.
           The "depth" of a block is the difference of the y-coordinates of the first and last
           edges of it. The "goal gap" of the block is the quotient of the depth and index
           of the block. If the difference of the y-coordinates of the adjacent edges in
           the block are all equal to the goal gap, then we say that the block is evenly
           distributed.

           So we search the block which has minimal goal gap. Then if it is not evenly
           distributed, then we shift the not fixed edges to the desired position. It is
           not hard to see	that if the block has minimal goal gap (among the all
           possibilities of blocks), then in this way we do not move any edges into boxes.
           Finally, we set the (inner) edges of the block to be fixed (except the topmost and
           bottommost edges, since they are already fixed). And we again begin the search.
           If every edge is fixed, then we have finished. This is the basic idea. We will
           refine this algorithm.

           The variables related to the blocks are prefixed by 'block'. Note that the
           variables of an edge are refer to that block in which this edge is inner! The
           'block_oldgap' is the goal gap of the block when it was last evenly distributed.

           The variables 'canstart' and 'canend' means that this egde can start and/or end
           a block. The top edge of a box only canend, while a fixed edge of a path can both
           start and end of a block.

         */

        this.owner = null;
        this.startpoint_prev = null;
        this.startpoint = null;
        this.endpoint = null;
        this.endpoint_next = null;

        this.position_y = 0;
        this.position_x1 = 0;
        this.position_x2 = 0;
        this.bracket_closing = 0;
        this.bracket_opening = 0;

        this.order_prev = null;
        this.order_next = null;

        this.section_x1 = null;
        this.section_x2 = null;
        this.section_next = null;
        this.section_down = null;

        this.edge_fixed = false;
        this.edge_customFixed = false;
        this.edge_canpassed = false;
        this.edge_direction = null;

        this.block_prev = null;
        this.block_next = null;
        this.block_trace = null;

        this.closest_prev = null;
        this.closest_next = null;

    };


    AutoRouterEdge.prototype.assign = function(otherEdge){

        if(otherEdge !== null){
            this.setOwner(otherEdge.getOwner());
            this.setStartPoint(otherEdge.getStartPointPtr(), false );
            this.setEndPoint(otherEdge.getEndPointPtr(), otherEdge.getEndPointPtr() !== null); //Only calculateDirection if this.endpoint is not null

            this.setStartPointPrev(otherEdge.getStartPointPrev() );
            this.setEndPointNext(otherEdge.getEndPointNext() );

            this.setPositionY(otherEdge.getPositionY());
            this.setPositionX1(otherEdge.getPositionX1() );
            this.setPositionX2(otherEdge.getPositionX2() );
            this.setBracketClosing(otherEdge.getBracketClosing(), false );
            this.setBracketOpening(otherEdge.getBracketOpening() );

            this.setOrderNext(otherEdge.getOrderNext() );
            this.setOrderPrev(otherEdge.getOrderPrev() );

            this.setSectionX1(otherEdge.getSectionX1() );
            this.setSectionX2(otherEdge.getSectionX2() );
            this.setSectionNext(otherEdge.getSectionNext(true) );
            this.setSectionDown(otherEdge.getSectionDown(true) );

            this.setEdgeFixed(otherEdge.getEdgeFixed() );
            this.setEdgeCustomFixed(otherEdge.getEdgeCustomFixed() );
            this.setEdgeCanpassed(otherEdge.getEdgeCanpassed() );
            this.setDirection(otherEdge.getDirection() );

            this.setBlockPrev(otherEdge.getBlockPrev() );
            this.setBlockNext(otherEdge.getBlockNext() );
            this.setBlockTrace(otherEdge.getBlockTrace() );

            this.setClosestPrev(otherEdge.getClosestPrev() );
            this.setClosestNext(otherEdge.getClosestNext() );

            return this;
        }

        return null;
    };

    AutoRouterEdge.prototype.equals = function(otherEdge){
        return this === otherEdge; //This checks if they reference the same object
    };

    AutoRouterEdge.prototype.getOwner = function (){
        return this.owner;
    };

    AutoRouterEdge.prototype.setOwner = function (newOwner){
        this.owner = newOwner;
    };

    AutoRouterEdge.prototype.getStartPointPrev = function (){
        return this.startpoint_prev !== null ? this.startpoint_prev[0] || this.startpoint_prev : null;
    };

    AutoRouterEdge.prototype.isStartPointPrevNull = function () {
        return this.startpoint_prev === null;
    };

    AutoRouterEdge.prototype.setStartPointPrev = function (point){
        this.startpoint_prev = point || null;
    };

    AutoRouterEdge.prototype.getStartPointPtr = function(){
        return this.startpoint;
    };

    AutoRouterEdge.prototype.getEndPointPtr = function(){
        return this.endpoint;
    };

    AutoRouterEdge.prototype.getStartPoint = function (){
        return this.startpoint !== null ?
            (this.startpoint instanceof Array ? new ArPoint(this.startpoint[0]) : new ArPoint(this.startpoint)) : emptyPoint;//returning copy of this.startpoint
    };

    AutoRouterEdge.prototype.isSameStartPoint = function(point){
        return this.startpoint[0] === point;
    };

    AutoRouterEdge.prototype.isStartPointNull = function (){
        return this.startpoint === null;
    };

    AutoRouterEdge.prototype.setStartPoint = function (point, b){
        if(point instanceof Array){
            this.startpoint = point;

        }else if ( !this.startpoint ){
            this.startpoint = [ point ];

        }else{
            this.startpoint[0] = point;
        }

        if(b !== false)
            this.recalculateDirection();
    };

    AutoRouterEdge.prototype.setStartPointX = function(_x){
        this.startpoint[0].x = _x;
    };

    AutoRouterEdge.prototype.setStartPointY = function(_y){
        this.startpoint[0].y = _y;
    };

    AutoRouterEdge.prototype.getEndPoint = function(){
        return this.endpoint !== null ? (this.endpoint instanceof Array ? new ArPoint(this.endpoint[0]) : new ArPoint(this.endpoint)): emptyPoint;
    };

    AutoRouterEdge.prototype.isEndPointNull = function(){
        return this.endpoint === null;
    };

    AutoRouterEdge.prototype.setEndPoint = function(point, b){
        if(point instanceof Array){
            this.endpoint = point;

        }else if ( !this.endpoint ){
            this.endpoint = [ point ];

        }else{
            this.endpoint[0] = point;
        }

        if(b !== false)
            this.recalculateDirection();
    };

    AutoRouterEdge.prototype.setStartAndEndPoint = function(startPoint, endPoint){
        this.setStartPoint(startPoint, false); //wait until setting the this.endpoint to recalculateDirection
        this.setEndPoint(endPoint);
    };

    AutoRouterEdge.prototype.setEndPointX = function (_x){
        if(!this.endpoint || this.endpoint instanceof Array)
            this.endpoint[0].x = _x;
        else
            this.endpoint.x = _x;
    };

    AutoRouterEdge.prototype.setEndPointY = function (_y){
        if(!this.endpoint || this.endpoint instanceof Array)
            this.endpoint[0].y = _y;
        else
            this.endpoint.y = _y;
    };

    AutoRouterEdge.prototype.getEndPointNext = function(){
        return this.endpoint_next !== null ? ((this.endpoint_next instanceof Array) ? new ArPoint(this.endpoint_next[0]) : new ArPoint(this.endpoint_next)) : emptyPoint;
    };

    AutoRouterEdge.prototype.isEndPointNextNull = function(){
        return this.endpoint_next === null;
    };

    AutoRouterEdge.prototype.setEndPointNext = function(point){
        this.endpoint_next = point;
    };

    AutoRouterEdge.prototype.getPositionY = function(){
        return this.position_y;
    };

    AutoRouterEdge.prototype.setPositionY = function(_y ){
        this.position_y = _y;
    };

    AutoRouterEdge.prototype.addToPositionY = function(dy){
        this.position_y += dy;
    };

    AutoRouterEdge.prototype.getPositionX1 = function(){
        return this.position_x1;
    };

    AutoRouterEdge.prototype.setPositionX1 = function(_x1){
        this.position_x1 = _x1;
    };

    AutoRouterEdge.prototype.getPositionX2 = function(){
        return this.position_x2;
    };

    AutoRouterEdge.prototype.setPositionX2 = function(_x2){
        this.position_x2 = _x2;
    };

    AutoRouterEdge.prototype.getBracketClosing = function() {
        return this.bracket_closing;
    };

    AutoRouterEdge.prototype.setBracketClosing = function(bool, debug){
        this.bracket_closing = bool;
    };

    AutoRouterEdge.prototype.getBracketOpening = function() {
        return this.bracket_opening;
    };

    AutoRouterEdge.prototype.setBracketOpening = function(bool){
        this.bracket_opening = bool;
    };

    AutoRouterEdge.prototype.getOrderNext = function(){
        return this.order_next;
    };

    AutoRouterEdge.prototype.setOrderNext = function(orderNext){
        this.order_next = orderNext;
    };

    AutoRouterEdge.prototype.getOrderPrev = function(){
        return this.order_prev;
    };

    AutoRouterEdge.prototype.setOrderPrev = function(orderPrev){
        this.order_prev = orderPrev;
    };

    AutoRouterEdge.prototype.getSectionX1 = function(){
        return this.section_x1;
    };

    AutoRouterEdge.prototype.setSectionX1 = function(x1){
        this.section_x1 = x1;
    };

    AutoRouterEdge.prototype.getSectionX2 = function(){
        return this.section_x2;
    };

    AutoRouterEdge.prototype.setSectionX2 = function(x2){
        this.section_x2 = x2;
    };

    AutoRouterEdge.prototype.getSectionNext = function(arg){

        return this.section_next != undefined ? this.section_next[0] : null;
    };

    AutoRouterEdge.prototype.getSectionNextPtr = function(){
        if(!this.section_next || !this.section_next[0])
            this.section_next = [ new AutoRouterEdge() ];
        return this.section_next;
    };

    AutoRouterEdge.prototype.setSectionNext = function(nextSection){
        /*
           if(nextSection instanceof Array){
           this.section_next = nextSection;  //Don't want to actually change the pointer
           }else {
           this.section_next = [nextSection];
           }
         */
        nextSection = nextSection instanceof Array ? nextSection[0] : nextSection;
        if(this.section_next instanceof Array)
            this.section_next[0] = nextSection;
        else
            this.section_next = [nextSection];
    };

    AutoRouterEdge.prototype.getSectionDown = function(){ //Returns pointer - if not null

        return this.section_down != undefined ? this.section_down[0] : null;

    };

    AutoRouterEdge.prototype.getSectionDownPtr = function(){
        if(!this.section_down || !this.section_down[0])
            this.section_down = [ new AutoRouterEdge() ];
        return this.section_down;
    };

    AutoRouterEdge.prototype.setSectionDown = function(downSection){
        downSection = downSection instanceof Array ? downSection[0] : downSection;
        if(this.section_down instanceof Array)
            this.section_down[0] = downSection;
        else
            this.section_down = [downSection];
    };

    AutoRouterEdge.prototype.getEdgeFixed = function(){
        return this.edge_fixed;
    };

    AutoRouterEdge.prototype.setEdgeFixed = function(ef){ //boolean
        this.edge_fixed = ef;
    };

    AutoRouterEdge.prototype.getEdgeCustomFixed = function(){
        return this.edge_customFixed;
    };

    AutoRouterEdge.prototype.setEdgeCustomFixed = function(ecf){
        this.edge_customFixed = ecf;
    };

    AutoRouterEdge.prototype.getEdgeCanpassed =  function(){
        return this.edge_canpassed;
    };

    AutoRouterEdge.prototype.setEdgeCanpassed =  function(ecp){
        this.edge_canpassed = ecp;
    };

    AutoRouterEdge.prototype.getDirection = function(){
        return this.edge_direction;
    };

    AutoRouterEdge.prototype.setDirection = function(dir){
        this.edge_direction = dir;
    };

    AutoRouterEdge.prototype.recalculateDirection = function(){
        assert(this.startpoint !== null && this.endpoint !== null, "AREdge.recalculateDirection: this.startpoint !== null && this.endpoint !== null FAILED!");
        if(this.endpoint instanceof Array)
            this.edge_direction = getDir(this.endpoint[0].minus((this.startpoint instanceof Array ? this.startpoint[0] : this.startpoint)));
        else
            this.edge_direction = getDir(this.endpoint.minus((this.startpoint instanceof Array ? this.startpoint[0] : this.startpoint)));
    };

    AutoRouterEdge.prototype.getBlockPrev = function(){
        return this.block_prev;
    };

    AutoRouterEdge.prototype.setBlockPrev = function(prevBlock){
        this.block_prev = prevBlock;
    };

    AutoRouterEdge.prototype.getBlockNext = function(){
        return this.block_next;
    };

    AutoRouterEdge.prototype.setBlockNext = function(nextBlock){
        this.block_next = nextBlock;
    };

    AutoRouterEdge.prototype.getBlockTrace = function(){
        return this.block_trace;
    };

    AutoRouterEdge.prototype.setBlockTrace = function(traceBlock){
        this.block_trace = traceBlock;
    };

    AutoRouterEdge.prototype.getClosestPrev = function(){
        return this.closest_prev;
    };

    AutoRouterEdge.prototype.setClosestPrev = function(cp){
        this.closest_prev = cp;
    };

    AutoRouterEdge.prototype.getClosestNext = function(){
        return this.closest_next;
    };

    AutoRouterEdge.prototype.setClosestNext = function(cp){
        this.closest_next = cp;
    };

    //----------------------AutoRouterEdgeList

    var AutoRouterEdgeList = function (b){
        this.owner = null;

        //--Edges
        this.ishorizontal = b;

        //--Order
        this.order_first = null;
        this.order_last = null;

        //--Section
        this.section_first;
        this.section_blocker;
        this.section_ptr2blocked = []; //This is an array to emulate the pointer to a pointer functionality in CPP. 
        // this.section_ptr2blocked[0] = this.section_ptr2blocked*

        this._initOrder();
        this._initSection();
    };

    //Public Functions
    AutoRouterEdgeList.prototype.destroy = function(){
        checkOrder();
        checkSection();
    };

    AutoRouterEdgeList.prototype.setOwner = function(newOwner){
        this.owner = newOwner;
    };

    AutoRouterEdgeList.prototype.addEdges = function(path){
        if(path instanceof AutoRouterPath){
            assert(path.getOwner() === this.owner, "AREdgeList.addEdges: path.getOwner() === owner FAILED!");

            var isPathAutoRouted = path.isAutoRouted(),
                hasCustomEdge = false,
                customizedIndexes = {},
                indexes = [];

            //path.getCustomizedEdgeIndexes(indexes);

            if(isPathAutoRouted){
                var i = -1;
                while(++i < indexes.length){
                    hasCustomEdge = true;
                    customizedIndexes[indexes[i]] = 0;
                }
            }else {
                hasCustomEdge = true;
            }

            var pointList = path.getPointList(),
                ptrsObject = pointList.getTailEdgePtrs(startpoint, endpoint),
                startpoint = ptrsObject.start,
                endpoint = ptrsObject.end,
                indItr,
                currEdgeIndex = pointList.length - 2,
                goodAngle,
                pos = ptrsObject.pos,
                skipEdge,
                isMoveable,
                edge,
                isEdgeCustomFixed,
                startPort,
                endPort,
                isStartPortConnectToCenter,
                isEndPortConnectToCenter,
                isPathFixed,
                dir;

            while( pointList.getLength() && pos >= 0){

                dir = getDir(endpoint[0].minus(startpoint[0]));

                skipEdge = dir === Dir_None ? true : false;
                isMoveable = path.isMoveable();

                if( !isMoveable && dir !== Dir_Skew){
                    goodAngle = isRightAngle(dir);
                    assert( goodAngle, "AREdgeList.addEdges: isRightAngle(dir) FAILED!");

                    if( !goodAngle)
                        skipEdge = true;

                }

                if( !skipEdge && 
                        (isRightAngle(dir) && isHorizontal(dir) === this.ishorizontal)){
                    edge = new AutoRouterEdge();
                    edge.setOwner(path);

                    edge.setStartAndEndPoint(startpoint, endpoint);
                    edge.setStartPointPrev(pointList.getPointBeforeEdge(pos));
                    edge.setEndPointNext(pointList.getPointAfterEdge(pos));

                    if (hasCustomEdge){
                        isEdgeCustomFixed = false;
                        if (isPathAutoRouted){
                            indItr = customizedIndexes.indexOf(currEdgeIndex);
                            isEdgeCustomFixed = (indIter != customizedIndexes.length - 1);
                        } else {
                            isEdgeCustomFixed = true;
                        }

                        edge.setEdgeCustomFixed(isEdgeCustomFixed);

                    }else{

                        edge.setEdgeCustomFixed(dir === Dir_Skew);
                    }

                    startPort = path.getStartPort();

                    assert(startPort !== null, "AREdgeList.addEdges: startPort !== null FAILED!");

                    isStartPortConnectToCenter = startPort.isConnectToCenter();
                    endPort = path.getEndPort();

                    assert(endPort !== null, "AREdgeList.addEdges: endPort !== null FAILED!");

                    isEndPortConnectToCenter = endPort.isConnectToCenter();
                    isPathFixed = path.isFixed();

                    edge.setEdgeFixed(edge.getEdgeCustomFixed() || isPathFixed ||
                            (edge.isStartPointPrevNull() && isStartPortConnectToCenter) ||
                            (edge.isEndPointNextNull() && isEndPortConnectToCenter));

                    if(dir !== Dir_Skew){

                        this._position_LoadY(edge);
                        this._position_LoadB(edge);
                    }else{
                        edge.setPositionY(0);
                        edge.setBracketOpening(false);
                        edge.setBracketClosing(false);
                    }

                    this.insert(edge);

                }

                ptrsObject = pointList.getPrevEdgePtrs(pos);
                pos = ptrsObject.pos;
                startpoint = ptrsObject.start;
                endpoint = ptrsObject.end;
                currEdgeIndex--;
            }

            return true;
        }else if(path instanceof AutoRouterPort){
            var port = path;
            assert(port.getOwner().getOwner() === this.owner, "AREdgeList.addEdges: port.getOwner() === (owner) FAILED!");

            if (port.isConnectToCenter() || port.getOwner().isAtomic())
                return;

            var selfPoints = port.getSelfPoints(),
                startpoint_prev,
                startpoint,
                endpoint,
                endpoint_next,
                edge,
                dir,
                canHaveStartEndPointHorizontal;

            for(var i = 0; i < 4; i++){

                startpoint_prev = selfPoints[(i + 3) % 4];
                startpoint = selfPoints[i];
                endpoint = selfPoints[(i + 1) % 4];
                endpoint_next = selfPoints[(i + 2) % 4];
                dir = getDir(endpoint.minus(startpoint));

                assert( isRightAngle(dir), "AREdgeList.addEdges: isRightAngle(dir) FAILED!");

                canHaveStartEndPointHorizontal = port.canHaveStartEndPointHorizontal(this.ishorizontal);
                if( isHorizontal(dir) === this.ishorizontal && canHaveStartEndPointHorizontal ){
                    edge = new AutoRouterEdge();

                    edge.setOwner(port);
                    edge.setStartAndEndPoint(startpoint, endpoint);
                    edge.setStartPointPrev(startpoint_prev);
                    edge.setEndPointNext(endpoint_next);

                    edge.setEdgeFixed(true);

                    this._position_LoadY(edge);
                    this._position_LoadB(edge);

                    if( edge.getBracketClosing() )
                        edge.addToPosition(0.999); 

                    this.insert(edge);
                }
            }
        }else if(path instanceof AutoRouterBox){
            var box = path;

            assert(box.getOwner() === this.owner, "AREdgeList.addEdges: box.getOwner() === (owner) FAILED!");

            var selfPoints = box.getSelfPoints(),
                startpoint_prev,
                startpoint,
                endpoint,
                endpoint_next,
                edge,
                dir;

            for(var i = 0; i < 4; i++){
                startpoint_prev = selfPoints[(i + 3) % 4];
                startpoint = selfPoints[i];
                endpoint = selfPoints[(i + 1) % 4];
                endpoint_next = selfPoints[(i + 2) % 4];
                dir = getDir(endpoint.minus(startpoint));

                assert( isRightAngle(dir), "AREdgeList.addEdges: isRightAngle(dir) FAILED!");

                if( isHorizontal(dir) === this.ishorizontal ){
                    edge = new AutoRouterEdge();

                    edge.setOwner(box);
                    edge.setStartAndEndPoint(startpoint, endpoint);
                    edge.setStartPointPrev(startpoint_prev);
                    edge.setEndPointNext(endpoint_next);

                    edge.setEdgeFixed(true);

                    this._position_LoadY(edge);
                    this._position_LoadB(edge);

                    if( edge.getBracketClosing() )
                        edge.addToPosition(0.999); 

                    this.insert(edge);
                }
            }
        }else if(path instanceof AutoRouterGraph){
            var graph = path;
            assert(graph === this.owner, "AREdgeList.addEdges: graph === this.owner FAILED!");

            var selfPoints = graph.getSelfPoints();
                startpoint_prev,
                startpoint,
                endpoint,
                endpoint_next,
                edge,
                dir;

            for(var i = 0; i < 4; i++){

                startpoint_prev = selfPoints[(i + 3) % 4];
                startpoint = selfPoints[i];
                endpoint = selfPoints[(i + 1) % 4];
                endpoint_next = selfPoints[(i + 2) % 4];
                dir = getDir(endpoint.minus(startpoint));

                assert( isRightAngle(dir), "AREdgeList.addEdges: isRightAngle(dir) FAILED!");

                if( isHorizontal(dir) === this.ishorizontal ){
                    edge = new AutoRouterEdge();

                    edge.setOwner(graph);
                    edge.setStartAndEndPoint(startpoint, endpoint);
                    edge.setStartPointPrev(startpoint_prev);
                    edge.setEndPointNext(endpoint_next);

                    edge.setEdgeFixed(true);

                    this._position_LoadY(edge);
                    this.insert(edge);
                }
            }

        }
    };

    AutoRouterEdgeList.prototype.deleteEdges = function (object){
        var edge = this.order_first,
            next;
        while( edge !== null){

            if(edge.getOwner() === object){
                next = edge.getOrderNext();
                this.Delete(edge);
                edge = next;
            }
            else
                edge = edge.getOrderNext();
        }

    };

    AutoRouterEdgeList.prototype.deleteAllEdges = function(){
        while(this.order_first)
            this.Delete(this.order_first);
    };

    AutoRouterEdgeList.prototype.isEmpty = function(){
        return this.order_first === null;
    }; 

    AutoRouterEdgeList.prototype.getEdge = function(path, startpoint, endpoint){
        var edge = this.order_first;
        while( edge !== null ){

            if( edge.isSameStartPoint(startpoint))
                break;

            edge = edge.getOrderNext();
        }

        assert( edge !== null, "AREdgeList.getEdge: edge !== null FAILED!");
        return edge;
    };

    AutoRouterEdgeList.prototype.getEdgeByPointer = function(startpoint){
        var edge = this.order_first;
        while( edge !== null ){
            if(edge.isSameStartPoint(startpoint))
                break;

            edge = edge.getOrderNext();
        }

        assert(edge !== null, "AREdgeList.getEdgeByPointer: edge !== null FAILED!");
        return edge;
    };

    AutoRouterEdgeList.prototype.setEdgeByPointer = function(pEdge, newEdge){
        assert(newEdge instanceof AutoRouterEdge, "AREdgeList.setEdgeByPointer: newEdge instanceof AutoRouterEdge FAILED!");
        var edge = this.section_first;
        while( edge !== null ){
            if(pEdge === edge)
                break;

            edge = edge.getSectionDown();
        }

        assert(edge !== null, "AREdgeList.setEdgeByPointer: edge !== null FAILED!");
        edge = newEdge;
    };

    AutoRouterEdgeList.prototype.getEdgeAt = function(point, nearness){
        var edge = this.order_first;
        while(edge){

            if(isPointNearLine(point, edge.getStartPoint(), edge.getEndPoint(), nearness))
                return edge;

            edge = edge.getOrderNext();
        }

        return null;
    };        

    AutoRouterEdgeList.prototype.dumpEdges = function(msg){
        var edge = this.order_first,
            total = 1;
        console.log(msg);

        while( edge !== null ){
            console.log('\t' + edge.getStartPoint().x + ', ' + edge.getStartPoint().y + '\t\t' + edge.getEndPoint().x + ', ' + edge.getEndPoint().y 
                    + '\t\t\t(' + (edge.getEdgeFixed() ? "FIXED" : "MOVEABLE" ) + ')\t\t' 
                    + (edge.getBracketClosing() ? "Bracket Closing" : (edge.getBracketOpening() ? "Bracket Opening" : "")));
            edge = edge.getOrderNext();
            total++;
        }

        console.log("Total Edges: " + total);
    };

    AutoRouterEdgeList.prototype.getEdgeCount = function(){
        var edge = this.order_first,
            total = 1;
        while(edge !== null){
            edge = edge.getOrderNext();
            total++;
        }
        return total;
    };

    //--Private Functions
    AutoRouterEdgeList.prototype._position_GetRealY = function (edge, y){
        if(y === undefined){
            if(this.ishorizontal){
                assert( edge.getStartPoint().y === edge.getEndPoint().y, "AREdgeList.position_GetRealY: edge.getStartPoint().y === edge.getEndPoint().y FAILED!");
                return edge.getStartPoint().y;
            }

            assert( edge.getStartPoint().x === edge.getEndPoint().x, "AREdgeList.position_GetRealY: edge.getStartPoint().x === edge.getEndPoint().x FAILED!");
            return edge.getStartPoint().x;
        }else{

            assert( edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull(), "AREdgeList.position_GetRealY: edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull() FAILED!");

            if( this.ishorizontal){
                assert( edge.getStartPoint().y === edge.getEndPoint().y, "AREdgeList.position_GetRealY: edge.getStartPoint().y === edge.getEndPoint().y FAILED!");
                edge.setStartPointY(y);
                edge.setEndPointY(y);
            }else{
                assert( edge.getStartPoint().x === edge.getEndPoint().x, "AREdgeList.position_GetRealY: edge.getStartPoint().x === edge.getEndPoint().x FAILED");

                edge.setStartPointX(y);
                edge.setEndPointX(y);
            }
        }
    };

    AutoRouterEdgeList.prototype._position_SetRealY = function (edge, y){
        if(edge instanceof Array) //TEST
            edge = edge[0];

        assert( edge != null && !edge.isStartPointNull() && !edge.isEndPointNull(), "AREdgeList.position_SetRealY: edge != null && !edge.isStartPointNull() && !edge.isEndPointNull() FAILED");

        if( this.ishorizontal )
        {
            assert( edge.getStartPoint().y === edge.getEndPoint().y, "AREdgeList.position_SetRealY: edge.getStartPoint().y === edge.getEndPoint().y FAILED");
            edge.setStartPointY(y);
            edge.setEndPointY(y);
        }
        else
        {
            assert( edge.getStartPoint().x === edge.getEndPoint().x, "AREdgeList.position_SetRealY: edge.getStartPoint().x === edge.getEndPoint().x FAILED");
            edge.setStartPointX(y);
            edge.setEndPointX(y);
        }
    };

    AutoRouterEdgeList.prototype._position_GetRealX = function (edge){
        assert( edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull(),"AREdgeList.position_GetRealX: edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull() FAILED");
        var x1, x2;

        if( this.ishorizontal ){
            assert( edge.getStartPoint().y === edge.getEndPoint().y, "AREdgeList.position_GetRealX: edge.getStartPoint().y === edge.getEndPoint().y FAILED");
            if( edge.getStartPoint().x < edge.getEndPoint().x){

                x1 = edge.getStartPoint().x;
                x2 = edge.getEndPoint().x;
            }else{

                x1 = edge.getEndPoint().x;
                x2 = edge.getStartPoint().x;
            }
        }else{
            assert( edge.getStartPoint().x === edge.getEndPoint().x, "AREdgeList.position_GetRealX: edge.getStartPoint().x === edge.getEndPoint().x FAILED");
            if(edge.getStartPoint().y < edge.getEndPoint().y){

                x1 = edge.getStartPoint().y;
                x2 = edge.getEndPoint().y;
            }else{

                x1 = edge.getEndPoint().y;
                x2 = edge.getStartPoint().y;
            }
        }

        return [x1, x2];
    };

    AutoRouterEdgeList.prototype._position_GetRealO = function (edge){
        assert( edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull(), "AREdgeList.position_GetRealO: edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull() FAILED");
        var o1, o2;

        if(this.ishorizontal){
            assert( edge.getStartPoint().y === edge.getEndPoint().y, "AREdgeList.position_GetRealO: edge.getStartPoint().y === edge.getEndPoint().y FAILED");
            if(edge.getStartPoint().x < edge.getEndPoint().x){

                o1 = edge.isStartPointPrevNull() ? 0 : edge.getStartPointPrev().y - edge.getStartPoint().y;
                o2 = edge.isEndPointNextNull() ? 0 : edge.getEndPointNext().y - edge.getEndPoint().y;
            }else{

                o1 = edge.isEndPointNextNull() ? 0 : edge.getEndPointNext().y - edge.getEndPoint().y;
                o2 = edge.isStartPointPrevNull() ? 0 : edge.getStartPointPrev().y - edge.getStartPoint().y;
            }
        }
        else{
            assert( edge.getStartPoint().x === edge.getEndPoint().x , "AREdgeList.position_GetRealO: edge.getStartPoint().x === edge.getEndPoint().x FAILED");
            if( edge.getStartPoint().y < edge.getEndPoint().y ){

                o1 = edge.isStartPointPrevNull() ? 0 : edge.getStartPointPrev().x - edge.getStartPoint().x;
                o2 = edge.isEndPointNextNull() ? 0 : edge.getEndPointNext().x - edge.getEndPoint().x;
            }else{

                o1 = edge.isEndPointNextNull() ? 0 : edge.getEndPointNext().x - edge.getEndPoint().x;
                o2 = edge.isStartPointPrevNull() ? 0 : edge.getStartPointPrev().x - edge.getStartPoint().x;
            }
        }

        return [o1, o2];
    };

    AutoRouterEdgeList.prototype._position_LoadY = function (edge){
        assert( edge !== null && edge.getOrderNext() === null && edge.getOrderPrev() === null, "AREdgeList.position_LoadY: edge !== null && edge.getOrderNext() === null && edge.getOrderPrev() === null FAILED");

        edge.setPositionY( this._position_GetRealY(edge));
    };

    AutoRouterEdgeList.prototype._position_LoadB = function (edge){
        assert( edge !== null, "AREdgeList.position_LoadB: edge !== null FAILED");

        edge.setBracketOpening(!edge.getEdgeFixed() && this.bracket_IsOpening(edge));
        edge.setBracketClosing(!edge.getEdgeFixed() && this.bracket_IsClosing(edge));
    };

    AutoRouterEdgeList.prototype._positionAll_StoreY = function (){
        var edge = this.order_first;
        while( edge )
        {
            this._position_SetRealY(edge, edge.getPositionY());

            edge = edge.getOrderNext();
        }

    };

    AutoRouterEdgeList.prototype._positionAll_LoadX = function (){
        var edge = this.order_first,
            ex;
        while(edge){
            ex = [];
            ex = this._position_GetRealX(edge, ex[0], ex[1]);
            edge.setPositionX1(ex[0]);
            edge.setPositionX2(ex[1]);

            edge = edge.getOrderNext();
        }
    };

    AutoRouterEdgeList.prototype._initOrder = function (){
        this.order_first = null;
        this.order_last = null;
    };

    AutoRouterEdgeList.prototype._checkOrder = function (){
        assert( this.order_first === null && this.order_last === null, "AREdgeList.checkOrder: this.order_first === null && this.order_last === null FAILED");
    };

    //---Order

    AutoRouterEdgeList.prototype.insertBefore = function(edge, before){
        assert( edge !== null && before !== null && edge !== before, "AREdgeList.insertBefore: edge !== null && before !== null && edge !== before FAILED");
        assert( edge.getOrderNext() === null && edge.getOrderPrev() === null, "AREdgeList.insertBefore: edge.getOrderNext() === null && edge.getOrderPrev() === null FAILED");

        edge.setOrderPrev(before.getOrderPrev());
        edge.setOrderNext(before);

        if( before.getOrderPrev() ){
            assert( before.getOrderPrev().getOrderNext() === before, "AREdgeList.insertBefore: before.getOrderPrev().getOrderNext() === before FAILED\nbefore.getOrderPrev().getOrderNext() is " + before.getOrderPrev().getOrderNext() + " and before is " + before );
            before.getOrderPrev().setOrderNext(edge);

            assert( this.order_first !== before, "AREdgeList.insertBefore: this.order_first !== before FAILED");
        }else{

            assert( this.order_first === before, "AREdgeList.insertBefore: this.order_first === before FAILED");
            this.order_first = edge;
        }

        before.setOrderPrev(edge);
    };

    AutoRouterEdgeList.prototype.insertAfter = function(edge, after){
        assert( edge !== null && after !== null && !edge.equals(after), "AREdgeList.insertAfter:  edge !== null && after !== null && !edge.equals(after) FAILED"); 
        assert( edge.getOrderNext() === null && edge.getOrderPrev() === null, "AREdgeList.insertAfter: edge.getOrderNext() === null && edge.getOrderPrev() === null FAILED ");

        edge.setOrderNext(after.getOrderNext());
        edge.setOrderPrev(after);

        if( after.getOrderNext() )
        {
            assert( after.getOrderNext().getOrderPrev().equals(after), "AREdgeList.insertAfter:  after.getOrderNext().getOrderPrev().equals(after) FAILED");
            after.getOrderNext().setOrderPrev(edge);

            assert( !this.order_last.equals(after), "AREdgeList.insertAfter: !order_last.equals(after) FAILED" );
        }
        else
        {
            assert( this.order_last.equals(after), "AREdgeList.insertAfter: this.order_last.equals(after) FAILED" );
            this.order_last = edge;
        }

        after.setOrderNext(edge);
    };

    AutoRouterEdgeList.prototype.insertLast = function(edge){
        assert( edge !== null, "AREdgeList.insertLast: edge !== null FAILED" );
        assert( edge.getOrderPrev() === null && edge.getOrderNext() === null, "AREdgeList.insertLast: edge.getOrderPrev() === null && edge.getOrderNext() === null FAILED");

        edge.setOrderPrev(this.order_last);

        if( this.order_last )
        {
            assert( this.order_last.getOrderNext() === null, "AREdgeList.insertLast: this.order_last.getOrderNext() === null FAILED");
            assert( this.order_first != null, "AREdgeList.insertLast: this.order_first != null FAILED" );

            this.order_last.setOrderNext(edge);
            this.order_last = edge;
        }
        else
        {
            assert( this.order_first === null, "AREdgeList.insertLast:  this.order_first === null FAILED");

            this.order_first = edge;
            this.order_last = edge;
        }
    };

    AutoRouterEdgeList.prototype.insert = function(edge){
        assert( edge !== null, "AREdgeList.insert:  edge !== null FAILED");
        assert( edge.getOrderPrev() === null && edge.getOrderNext() === null, "AREdgeList.insert: edge.getOrderPrev() === null && edge.getOrderNext() === null FAILED" );

        var y = edge.getPositionY();

        assert( ED_MINCOORD <= y && y <= ED_MAXCOORD,  "AREdgeList.insert: ED_MINCOORD <= y && y <= ED_MAXCOORD FAILED (y is " + y + ")");

        var insert = this.order_first;

        while( insert && insert.getPositionY() < y )
            insert = insert.getOrderNext();

        if( insert )
            this.insertBefore(edge, insert);
        else
            this.insertLast(edge);
    };

    AutoRouterEdgeList.prototype.remove = function(edge){
        assert( edge !== null, "AREdgeList.remove:  edge !== null FAILED");

        if( this.order_first === edge )
            this.order_first = edge.getOrderNext();

        if( edge.getOrderNext() )
            edge.getOrderNext().setOrderPrev(edge.getOrderPrev());

        if( this.order_last === edge )
            this.order_last = edge.getOrderPrev();

        if( edge.getOrderPrev() )
            edge.getOrderPrev().setOrderNext(edge.getOrderNext());

        edge.setOrderNext(null);
        edge.setOrderPrev(null);
    };

    AutoRouterEdgeList.prototype.Delete = function(edge){
        assert( edge !== null, "AREdgeList.Delete: edge !== null FAILED" );

        this.remove(edge);
        edge.setOwner(null);
    };

    //-- Private

    AutoRouterEdgeList.prototype._slideButNotPassEdges = function (edge, y){
        assert( edge != null, "AREdgeList.slideButNotPassEdges: edge != null FAILED" );
        assert( ED_MINCOORD < y && y < ED_MAXCOORD,  "AREdgeList.slideButNotPassEdges: ED_MINCOORD < y && y < ED_MAXCOORD FAILED");

        var oldy = edge.getPositionY();
        assert( ED_MINCOORD < oldy && oldy < ED_MAXCOORD, "AREdgeList.slideButNotPassEdges: ED_MINCOORD < oldy && oldy < ED_MAXCOORD FAILED");

        if( oldy === y )
            return null;

        var x1 = edge.getPositionX1(),
            x2 = edge.getPositionX2(),
            ret = null,
            insert = edge;

        //If we are trying to slide down

        if( oldy < y )
        {
            while( insert.getOrderNext() )
            {
                insert = insert.getOrderNext();

                if( y < insert.getPositionY() )
                {
                    //Then we won't be shifting past the new edge (insert)
                    break;
                }

                //If you can't pass the edge (but want to) and the lines will overlap x values...
                if( !insert.getEdgeCanpassed() && intersect(x1, x2, insert.getPositionX1(), insert.getPositionX2() ) )
                {
                    ret = insert;
                    y = insert.getPositionY();
                    break;
                }
            }

            if( edge !== insert && insert.getOrderPrev() !== edge )
            {
                this.remove(edge); 
                this.insertBefore(edge, insert);
            }
        }
        else //If we are trying to slide up
        {
            while( insert.getOrderPrev() )
            {
                insert = insert.getOrderPrev();

                if( y > insert.getPositionY() )
                {
                    break;
                }

                //If insert cannot be passed and it is in the way of the edge (if the edge were to slide up).
                if( !insert.getEdgeCanpassed() && intersect(x1, x2, insert.getPositionX1(), insert.getPositionX2() ) )
                {
                    ret = insert;
                    y = insert.getPositionY();
                    break;
                }
            }

            if( edge !== insert && insert.getOrderNext() !== edge )
            {
                this.remove(edge);//This is where I believe the error could lie!
                this.insertAfter(edge, insert);
            }

        }

        edge.setPositionY(y);

        return ret;
    };

    //------Section

    //private

    AutoRouterEdgeList.prototype._initSection = function (){
        this.section_first = null;
        this.section_blocker = null;
        this.section_ptr2blocked = null;
    };

    AutoRouterEdgeList.prototype.checkSection = function (){
        if( !(this.section_blocker === null && this.section_ptr2blocked === null)){
            //This used to be contained in an assert. Generally this fails when the router does not have a clean exit then is asked to reroute.
            _logger.warning("section_blocker and this.section_ptr2blocked are not null. Assuming last run did not exit cleanly. Fixing...");
            this.section_blocker === null;
            this.section_ptr2blocked === null;
        }
    };

    AutoRouterEdgeList.prototype.sectionReset = function (){
        this.checkSection();

        this.section_first = null;
    };

    AutoRouterEdgeList.prototype.section_BeginScan = function (blocker){
        this.checkSection();

        this.section_blocker = blocker;

        this.section_blocker.setSectionX1(this.section_blocker.getPositionX1());
        this.section_blocker.setSectionX2(this.section_blocker.getPositionX2());

        this.section_blocker.setSectionNext(null);
        this.section_blocker.setSectionDown(null);
    };

    AutoRouterEdgeList.prototype.section_IsImmediate  = function (){
        assert( this.section_blocker != null && this.section_ptr2blocked != null && this.section_ptr2blocked != null, "AREdgeList.section_IsImmediate: this.section_blocker != null && this.section_ptr2blocked != null && *section_ptr2blocked != null FAILED");

        var section_blocked = this.section_ptr2blocked[0],
            e = section_blocked.getSectionDown(),
            a1 = section_blocked.getSectionX1(),
            a2 = section_blocked.getSectionX2(),
            p1 = section_blocked.getPositionX1(),
            p2 = section_blocked.getPositionX2(),
            b1 = this.section_blocker.getSectionX1(),
            b2 = this.section_blocker.getSectionX2();

        if(e != null)
            e = (e.getStartPoint().equals(emptyPoint) || e.getSectionX1() === undefined ? null : e);

        assert( b1 <= a2 && a1 <= b2, "AREdgeList.section_IsImmediate: b1 <= a2 && a1 <= b2 FAILED");// not case 1 or 6

        // NOTE WE CHANGED THE CONDITIONS (A1<=B1 AND B2<=A2)
        // BECAUSE HERE WE NEED THIS!

        if( a1 <= b1 )
        {
            while( !(e === null || e.getStartPoint().equals(emptyPoint)) && e.getSectionX2() < b1 )
                e = e.getSectionNext();

            if( b2 <= a2 )
                return (e === null || e.getStartPoint().equals(emptyPoint))|| b2 < e.getSectionX1();				// case 3

            return (e === null || e.getStartPoint().equals(emptyPoint)) && a2 === p2;								// case 2
        }

        if( b2 <= a2 )
            return a1 === p1 && ((e === null || e.getStartPoint().equals(emptyPoint)) || b2 < e.getSectionX1());	// case 5

        return (e === null || e.getStartPoint().equals(emptyPoint)) && a1 === p1 && a2 === p2;						// case 4
    };


    AutoRouterEdgeList.prototype.section_HasBlockedEdge = function (){
        assert( this.section_blocker != null, "AREdgeList.section_HasBlockedEdge: this.section_blocker != null FAILED");

        var b1 = this.section_blocker.getSectionX1(),
            b2 = this.section_blocker.getSectionX2();

        assert( b1 <= b2, "AREdgeList.section_HasBlockedEdge: b1 <= b2 FAILED");

        //Setting this.section_ptr2blocked
        if( this.section_ptr2blocked === null ){

            this.section_first = this.section_first === null ? [new AutoRouterEdge()] : this.section_first;
            this.section_ptr2blocked = this.section_first;
        }
        else //section_ptr2blocked contains a null placeholder
        {
            var current_edge = this.section_ptr2blocked[0];

            assert( !current_edge.getStartPoint().equals(emptyPoint) , "AREdgeList.section_HasBlockedEdge: !current_edge.getStartPoint().equals(emptyPoint) FAILED" );

            var e = current_edge.getSectionDownPtr()[0], 
                o = null,

                a1 = current_edge.getSectionX1(),
                a2 = current_edge.getSectionX2();

            assert( a1 <= a2, "AREdgeList.section_HasBlockedEdge: a1 <= a2 FAILED (" + a1 + " <= " + a2 + ")");

            assert( b1 <= a2 &&  a1 <= b2, "AREdgeList.section_HasBlockedEdge: b1 <= a2 &&  a1 <= b2 FAILED");
            // not case 1 or 6
            if( a1 < b1 && b2 < a2 )									// case 3
            {
                this.section_ptr2blocked = current_edge.getSectionDownPtr();
            }
            else if( b1 <= a1 && a2 <= b2 )								// case 4
            {
                if( e && !e.getStartPoint().equals(emptyPoint))
                {
                    while( e.getSectionNext() && !e.getSectionNext().getStartPoint().equals(emptyPoint))
                        e = e.getSectionNext();

                    e.setSectionNext(current_edge.getSectionNext());
                    this.section_ptr2blocked[0] = current_edge.getSectionDown();
                }
                else{

                    this.section_ptr2blocked[0] = (current_edge.getSectionNext()); 

                }
            }
            else if( b1 <= a1 && b2 < a2 )								// case 5
            {
                assert( a1 <= b2, "AREdgeList.section_HasBlockedEdge: a1 <= b2 FAILED");

                a1 = b2 + 1;

                while( (e && !e.getStartPoint().equals(emptyPoint)) && e.getSectionX1() <= a1 )
                {	
                    assert( e.getSectionX1() <= e.getSectionX2(), "AREdgeList.section_HasBlockedEdge: e.getSectionX1() <= e.getSectionX2() FAILED");

                    if( a1 <= e.getSectionX2() ){
                        a1 = e.getSectionX2() + 1;
                    }

                    o = e;
                    e = e.getSectionNext();
                }

                if( o )
                { //Insert current_edge to be section_next of the given edge in the list of section_down (basically, collapsing current_edge into the section_down list. The values in the list following current_edge will then be set to be section_down of the current_edge.
                    this.section_ptr2blocked[0] = current_edge.getSectionDownPtr()[0];
                    o.setSectionNext(current_edge);
                    current_edge.setSectionDown(e);
                }

                assert( b2 < a1, "AREdgeList.section_HasBlockedEdge: b2 < a1 FAILED");
                //Shifting the front of the p2b so it no longer overlaps this.section_blocker
                current_edge.setSectionX1(a1);
            }
            else														// case 2
            {
                assert( a1 < b1 && b1 <= a2 && a2 <= b2,  "AREdgeList.section_HasBlockedEdge:  a1 < b1 && b1 <= a2 && a2 <= b2 FAILED");

                this.section_ptr2blocked = current_edge.getSectionDownPtr();

                while( e && !e.getStartPoint().equals(emptyPoint))
                {
                    o = e;
                    e = e.getSectionNext();

                    if( o.getSectionX2() + 1 < b1 && ( e === null || e.getStartPoint().equals(emptyPoint) || o.getSectionX2() + 1 < e.getSectionX1() ) ){
                        this.section_ptr2blocked = o.getSectionNextPtr();
                    }
                }

                if( !this.section_ptr2blocked[0].getStartPoint().equals(emptyPoint) )
                {
                    assert( o != null, "AREdgeList.section_HasBlockedEdge: o != null FAILED");
                    o.setSectionNext(current_edge.getSectionNext());

                    current_edge.setSectionX2(
                            (this.section_ptr2blocked[0].getSectionX1() < b1 ? this.section_ptr2blocked[0].getSectionX1() : b1) - 1);

                    current_edge.setSectionNext(this.section_ptr2blocked[0]);
                    this.section_ptr2blocked[0] = new AutoRouterEdge(); //This seems odd
                    this.section_ptr2blocked = null;

                }
                else
                    current_edge.setSectionX2(b1 - 1);

                this.section_ptr2blocked = current_edge.getSectionNextPtr();
            }
        }

        assert( this.section_ptr2blocked !== null, "AREdgeList.section_HasBlockedEdge: this.section_ptr2blocked != null FAILED");
        while( this.section_ptr2blocked[0] != null && !this.section_ptr2blocked[0].getStartPoint().equals(emptyPoint))
        {
            var a1 = this.section_ptr2blocked[0].getSectionX1(),
                a2 = this.section_ptr2blocked[0].getSectionX2();

            //If this.section_ptr2blocked is completely to the left (or above) this.section_blocker
            if( a2 < b1 )												// case 1
            {
                this.section_ptr2blocked = this.section_ptr2blocked[0].getSectionNextPtr();

                assert( this.section_ptr2blocked != null, "AREdgeList.section_HasBlockedEdge: this.section_ptr2blocked != null FAILED");
                continue;
            }
            //If this.section_blocker is completely to the right (or below) this.section_ptr2blocked 
            else if( b2 < a1 )											// case 6
                break;

            if( a1 < b1 && b2 < a2 )									// case 3
                //If this.section_ptr2blocked starts before and ends after this.section_blocker
            {
                var x = b1,
                    e = this.section_ptr2blocked[0].getSectionDown();

                for(;;)
                {

                    if( e === null || e.getStartPoint().equals(emptyPoint) || x < e.getSectionX1() ){ 
                        return true;
                    }
                    else if( x <= e.getSectionX2() )
                    {
                        x = e.getSectionX2() + 1;
                        if( b2 < x )
                            break;
                    }

                    e = e.getSectionNext();
                }

                this.section_ptr2blocked = this.section_ptr2blocked[0].getSectionDownPtr(); 
                continue;
            }
            //This leaves the regular partial overlap possibility. They also include this.section_blocker starting before and ending after this.section_ptr2blocked.

            return true;
        }

        assert( this.section_blocker.getSectionNext() === null && (this.section_blocker.getSectionDown() === null || this.section_blocker.getSectionDown().getStartPoint().equals(emptyPoint)) , "AREdgeList.section_HasBlockedEdge: this.section_blocker.getSectionNext() === null && this.section_blocker.getSectionDown() === null FAILED");

        this.section_blocker.setSectionNext(this.section_ptr2blocked[0]);
        this.section_ptr2blocked[0] = this.section_blocker; //Set anything pointing to this.section_ptr2blocked to point to this.section_blocker (eg, section_down)

        this.section_blocker = null;
        this.section_ptr2blocked = null;

        return false;
    };

    AutoRouterEdgeList.prototype.section_GetBlockedEdge = function (){
        assert( this.section_blocker != null && this.section_ptr2blocked != null, "AREdgeList.sectionGetBlockedEdge: this.section_blocker != null && this.section_ptr2blocked != null FAILED" );

        return this.section_ptr2blocked[0];
    };

    //----Bracket

    AutoRouterEdgeList.prototype.bracket_IsClosing = function (edge){
        assert( edge != null, "AREdgeList.bracket_IsClosing: edge != null FAILED" );
        assert( !edge.isStartPointNull() && !edge.isEndPointNull(), "AREdgeList.bracket_IsClosing: !edge.isStartPointNull() && !edge.isEndPointNull() FAILED");

        var start = edge.getStartPoint(),
            end = edge.getEndPoint();

        if( edge.isStartPointPrevNull() || edge.isEndPointNextNull() )
        {
            return false;
        }

        return this.ishorizontal ?
            (edge.getStartPointPrev().y < start.y && edge.getEndPointNext().y < end.y ) :
            (edge.getStartPointPrev().x < start.x && edge.getEndPointNext().x < end.x );
    };

    AutoRouterEdgeList.prototype.bracket_IsOpening = function (edge){
        assert( edge != null, "AREdgeList.bracket_IsOpening: edge != null FAILED" );
        assert( !edge.isStartPointNull() && !edge.isEndPointNull(), "AREdgeList.bracket_IsOpening: !edge.isStartPointNull() && !edge.isEndPointNull() FAILED");

        var start = edge.getStartPoint(),
            end = edge.getEndPoint();

        if( edge.isStartPointPrevNull() || edge.isEndPointNextNull() )
            return false;

        return this.ishorizontal ?
            (edge.getStartPointPrev().y > start.y && edge.getEndPointNext().y > end.y ) :
            (edge.getStartPointPrev().x > start.x && edge.getEndPointNext().x > end.x );
    };

    AutoRouterEdgeList.prototype.bracket_IsSmallGap = function (blocked, blocker){
        return this.bracket_IsOpening(blocked) || this.bracket_IsClosing(blocker);
    };

    AutoRouterEdgeList.prototype.bracket_ShouldBeSwitched = function (edge, next){
        assert( edge != null && next != null, "AREdgeList.bracket_ShouldBeSwitched: edge != null && next != null FAILED");

        var ex = this._position_GetRealX(edge),
            ex1 = ex[0], 
            ex2 = ex[1], 
            eo = this._position_GetRealO(edge),
            eo1 = eo[0], 
            eo2 = eo[1],
            nx = this._position_GetRealX(next),
            nx1 = nx[0], 
            nx2 = nx[1], 
            no = this._position_GetRealO(next),
            no1 = no[0], 
            no2 = no[1];

        var c1, c2;

        if( (nx1 < ex1 && ex1 < nx2 && eo1 > 0 ) || (ex1 < nx1 && nx1 < ex2 && no1 < 0) )
            c1 = +1;
        else if( ex1 === nx1 && eo1 === 0 && no1 === 0 )
            c1 = 0;
        else
            c1 = -9;

        if( (nx1 < ex2 && ex2 < nx2 && eo2 > 0 ) || (ex1 < nx2 && nx2 < ex2 && no2 < 0) )
            c2 = +1;
        else if( ex2 === nx2 && eo2 === 0 && no2 === 0 )
            c2 = 0;
        else
            c2 = -9;

        return (c1 + c2) > 0;
    };

    //---Block

    AutoRouterEdgeList.prototype._block_GetF = function (d, b, s){
        var f = d/(b+s), //f is the total distance between edges divided by the total number of edges
            S = EDLS_S, //This is 'SMALLGAP'
            R = EDLS_R,//This is 'SMALLGAP + 1'
            D = EDLS_D; //This is the total distance of the graph

        //If f is greater than the SMALLGAP, then make some checks/edits
        if( b === 0 && R <= f ) //If every comparison resulted in an overlap AND SMALLGAP + 1 is less than the distance between each edge (in the given range)
            f += (D-R);
        else if( S < f && s > 0 )
            f = ((D-S)*d - S*(D-R)*s) / ((D-S)*b + (R-S)*s);

        return f;
    };

    AutoRouterEdgeList.prototype._block_GetG = function (d, b, s){
        var g = d/(b+s),
            S = EDLS_S,
            R = EDLS_R,
            D = EDLS_D;

        if( S < g && b > 0 )
            g = ((R-S)*d + S*(D-R)*b) / ((D-S)*b + (R-S)*s);

        return g;
    };

    //Float equals
    AutoRouterEdgeList.prototype.flt_equ  = function (a, b){
        return ((a - .1) < b) && (b < (a + .1));
    };

    AutoRouterEdgeList.prototype.block_PushBackward = function(blocked, blocker){
        var modified = false;

        assert( blocked != null && blocker != null, "AREdgeList.block_PushBackward: blocked != null && blocker != null FAILED");
        assert( blocked.getPositionY() <= blocker.getPositionY(), "AREdgeList.block_PushBackward: blocked.getPositionY() <= blocker.getPositionY() FAILED");
        assert( blocked.getBlockPrev() != null, "AREdgeList.block_PushBackward: blocked.getBlockPrev() != null FAILED"); 

        var f = 0,
            g = 0,
            edge = blocked,
            trace = blocker,
            d = trace.getPositionY() - edge.getPositionY();

        assert( d >= 0, "AREdgeList.block_PushBackward: d >= 0 FAILED");

        var s = (edge.getBracketOpening() || trace.getBracketClosing()),
            b = 1 - s,
            d2;

        for(;;)
        {
            edge.setBlockTrace(trace);
            trace = edge;
            edge = edge.getBlockPrev();

            if( edge === null )
                break;

            d2 = trace.getPositionY() - edge.getPositionY();
            assert( d2 >= 0, "AREdgeList.block_PushBackward:  d2 >= 0 FAILED");

            if( edge.getBracketOpening() || trace.getBracketClosing() )
            {
                g = this._block_GetG(d,b,s);
                if( d2 <= g )
                {
                    f = this._block_GetF(d,b,s);
                    break;
                }
                s++;
            }
            else
            {
                f = this._block_GetF(d,b,s);
                if( d2 <= f )
                {
                    g = this._block_GetG(d,b,s);
                    break;
                }
                b++;
            }

            d += d2;
        }

        if( b+s > 1 )
        {
            if( edge === null )
            {
                f = this._block_GetF(d,b,s);
                g = this._block_GetG(d,b,s);
            }

            assert( this.flt_equ(d, f*b + g*s), "AREdgeList.block_PushBackward: flt_equ(d, f*b + g*s) FAILED");

            edge = trace;
            assert( edge != null && edge != blocked, "AREdgeList.block_PushBackward: edge != null && edge != blocked FAILED");

            var y = edge.getPositionY();

            do
            {
                assert( edge != null && edge.getBlockTrace() != null,"AREdgeList.block_PushBackward: edge != null && edge.getBlockTrace() != null FAILED");
                trace = edge.getBlockTrace();

                y += (edge.getBracketOpening() || trace.getBracketClosing()) ? g : f;

                if( y + 0.001 < trace.getPositionY() )
                {
                    modified = true;
                    if( this._slideButNotPassEdges(trace, y) )
                        trace.setBlockPrev(null);
                }

                edge = trace;
            } while( edge !== blocked );

            if (DEBUG){
                //y += (edge.getBracketOpening() || blocker.getBracketClosing()) ? g : f;
                assert( flt_equ(y, blocker.getPositionY()), "AREdgeList.block_PushBackward: flt_equ(y, blocker.getPositionY()) FAILED");
            }
        }

        return modified;
    };

    AutoRouterEdgeList.prototype.block_PushForward = function(blocked, blocker){
        var modified = false;

        assert( blocked != null && blocker != null, "AREdgeList.block_PushForward: blocked != null && blocker != null FAILED");
        assert( blocked.getPositionY() >= blocker.getPositionY(), "AREdgeList.block_PushForward: blocked.getPositionY() >= blocker.getPositionY() FAILED");
        assert( blocked.getBlockNext() != null, "AREdgeList.block_PushForward: blocked.getBlockNext() != null FAILED");

        var f = 0,
            g = 0,
            edge = blocked,
            trace = blocker,
            d = edge.getPositionY() - trace.getPositionY();

        assert( d >= 0, "AREdgeList.block_PushForward:  d >= 0 FAILED");

        var s = (trace.getBracketOpening() || edge.getBracketClosing()),
            b = 1 - s,
            d2;

        for(;;)
        {
            edge.setBlockTrace(trace);
            trace = edge;
            edge = edge.getBlockNext();

            if( edge === null ){
                break;
            }

            d2 = edge.getPositionY() - trace.getPositionY();
            assert( d2 >= 0, "AREdgeList.block_PushForward: d2 >= 0 FAILED");

            if( trace.getBracketOpening() || edge.getBracketClosing() )
            {
                g = this._block_GetG(d,b,s);
                if( d2 <= g )
                {
                    f = this._block_GetF(d,b,s);
                    break;
                }
                s++;
            }
            else
            {
                f = this._block_GetF(d,b,s);
                if( d2 <= f )
                {
                    g = this._block_GetG(d,b,s);
                    break;
                }
                b++;
            }

            d += d2;
        }

        if( b+s > 1 ) //Looking at more than one edge (or edge/trace comparison)
        {
            if( edge === null )
            {
                f = this._block_GetF(d,b,s);
                g = this._block_GetG(d,b,s);
            }

            assert( this.flt_equ(d, f*b + g*s), "AREdgeList.block_PushForward: flt_equ(d, f*b + g*s) FAILED");

            edge = trace;
            assert( edge !== null && !edge.equals(blocked), "AREdgeList.block_PushForward: edge != null && !edge.equals(blocked) FAILED");

            var y = edge.getPositionY();

            do
            {
                assert( edge != null && edge.getBlockTrace() != null, "AREdgeList.block_PushForward: edge != null && edge.getBlockTrace() != null FAILED");
                trace = edge.getBlockTrace();

                y -= (trace.getBracketOpening() || edge.getBracketClosing()) ? g : f;

                if( trace.getPositionY() < y - 0.001 )
                {
                    modified = true;

                    if( this._slideButNotPassEdges(trace, y) ) 
                        trace.setBlockNext(null);
                }

                edge = trace;
            } while( edge !== blocked );
        }


        return modified;
    };

    AutoRouterEdgeList.prototype.block_ScanForward = function(){
        this._positionAll_LoadX();

        var modified = false;

        this.sectionReset();

        var blocker = this.order_first,
blocked,
            bmin,
            smin,
            bmin_f,
            smin_f;

        while( blocker )
        {
            bmin = null; //block min?
            smin = null; //section min?
            bmin_f = ED_MINCOORD - 1;
            smin_f = ED_MINCOORD - 1;

            this.section_BeginScan(blocker);
            while( this.section_HasBlockedEdge() )
            {
                if( this.section_IsImmediate() )
                {
                    blocked = this.section_GetBlockedEdge();
                    assert( blocked != null, "AREdgeList.block_PushForward: blocked != null FAILED");

                    if( blocked.getBlockPrev() != null )
                        modified = this.block_PushBackward(blocked, blocker) || modified;

                    if( !blocker.getEdgeFixed() )
                    {
                        if( blocked.getBracketOpening() || blocker.getBracketClosing() )
                        {
                            if( smin_f < blocked.getPositionY() )
                            {
                                smin_f = blocked.getPositionY();
                                smin = blocked;
                            }
                        }
                        else
                        {
                            if( bmin_f < blocked.getPositionY() )
                            {
                                bmin_f = blocked.getPositionY();
                                bmin = blocked;
                            }
                        }
                    }
                }

            }

            if( bmin )
            {
                if( smin )
                {
                    blocker.setClosestPrev(smin_f > bmin_f ? smin : bmin);

                    bmin_f = blocker.getPositionY() - bmin_f;
                    smin_f = this._block_GetF(blocker.getPositionY() - smin_f, 0, 1);

                    blocker.setBlockPrev(smin_f < bmin_f ? smin : bmin);
                }
                else
                {
                    blocker.setBlockPrev(bmin);
                    blocker.setClosestPrev(bmin);
                }
            }
            else
            {
                blocker.setBlockPrev(smin);
                blocker.setClosestPrev(smin);
            }


            blocker = blocker.getOrderNext();
        }

        this._positionAll_StoreY();

        return modified;
    };

    AutoRouterEdgeList.prototype.block_ScanBackward = function(){
        this._positionAll_LoadX();

        var modified = false;

        this.sectionReset();
        var blocker = this.order_last,
            blocked,
            bmin,
            smin,
            bmin_f,
            smin_f;
             
        while( blocker )
        {
            bmin = null;
            smin = null;
            bmin_f = ED_MAXCOORD + 1;
            smin_f = ED_MAXCOORD + 1;

            this.section_BeginScan(blocker);

            while( this.section_HasBlockedEdge() )
            {
                if( this.section_IsImmediate() )
                {
                    blocked = this.section_GetBlockedEdge();

                    assert( blocked != null, "AREdgeList.block_ScanBackward: blocked != null FAILED");

                    if( blocked.getBlockNext() != null )
                    {
                        modified = this.block_PushForward(blocked, blocker) || modified;
                    }

                    if( !blocker.getEdgeFixed() )
                    {
                        if( blocker.getBracketOpening() || blocked.getBracketClosing() )
                        {
                            if( smin_f > blocked.getPositionY() )
                            {
                                smin_f = blocked.getPositionY();
                                smin = blocked;
                            }
                        }
                        else
                        {
                            if( bmin_f > blocked.getPositionY() )
                            {
                                bmin_f = blocked.getPositionY();
                                bmin = blocked;
                            }
                        }
                    }
                }
            }

            if( bmin )
            {
                if( smin )
                {
                    blocker.setClosestNext(smin_f < bmin_f ? smin : bmin);

                    bmin_f = bmin_f - blocker.getPositionY();
                    smin_f = this._block_GetF(smin_f - blocker.getPositionY(), 0, 1);

                    blocker.setBlockNext(smin_f < bmin_f ? smin : bmin);
                }
                else
                {
                    blocker.setBlockNext(bmin);    
                    blocker.setClosestNext(bmin); 
                }                                
            }
            else
            {
                blocker.setBlockNext(smin);
                blocker.setClosestNext(smin);
            }

            blocker = blocker.getOrderPrev();
        }

        this._positionAll_StoreY();

        return modified;
    };

    AutoRouterEdgeList.prototype.block_SwitchWrongs = function(){
        var was = false;

        this._positionAll_LoadX(); 
        var second = this.order_first,
            edge,
            next,
            ey,
            ny,
            a;

        while( second != null )
        {
            if( second.getClosestPrev() !== null && second.getClosestPrev().getClosestNext() !== (second) && //Check if it references itself
                    second.getClosestNext() !== null && second.getClosestNext().getClosestPrev() === (second) )

            {
                assert( !second.getEdgeFixed(), "AREdgeList.block_SwitchWrongs: !second.getEdgeFixed() FAILED");

                edge = second;
                next = edge.getClosestNext();

                while( next !== null && edge === next.getClosestPrev() )
                {
                    assert( edge !== null && !edge.getEdgeFixed(), "AREdgeList.block_SwitchWrongs: edge != null && !edge.getEdgeFixed() FAILED");
                    assert( next !== null && !next.getEdgeFixed(), "AREdgeList.block_SwitchWrongs: next != null && !next.getEdgeFixed() FAILED");

                    ey = edge.getPositionY();
                    ny = next.getPositionY();

                    assert( ey <= ny, "AREdgeList.block_SwitchWrongs: ey <= ny FAILED");

                    if( ey + 1 <= ny && this.bracket_ShouldBeSwitched(edge, next) )
                    {
                        was = true;

                        assert( !edge.getEdgeCanpassed() && !next.getEdgeCanpassed(), "AREdgeList.block_SwitchWrongs: !edge.getEdgeCanpassed() && !next.getEdgeCanpassed() FAILED");
                        edge.setEdgeCanpassed(true);
                        next.setEdgeCanpassed(true);

                        a = this._slideButNotPassEdges(edge, (ny+ey)/2 + 0.001) !== null;
                        a = this._slideButNotPassEdges(next, (ny+ey)/2 - 0.001) !== null || a;

                        if( a )
                        {
                            edge.setClosestPrev(null);
                            edge.setClosestNext(null);
                            next.setClosestPrev(null);
                            next.setClosestNext(null);

                            edge.setEdgeCanpassed(false);
                            next.setEdgeCanpassed(false);
                            break;
                        }

                        if( edge.getClosestPrev() !== null && edge.getClosestPrev().getClosestNext() === edge )
                            edge.getClosestPrev().setClosestNext(next);

                        if( next.getClosestNext() !== null && next.getClosestNext().getClosestPrev() === next)
                            next.getClosestNext().setClosestPrev(edge);

                        edge.setClosestNext(next.getClosestNext());
                        next.setClosestNext(edge);
                        next.setClosestPrev(edge.getClosestPrev());
                        edge.setClosestPrev(next);

                        edge.setEdgeCanpassed(false);
                        next.setEdgeCanpassed(false);

                        assert( !this.bracket_ShouldBeSwitched(next, edge), "AREdgeList.block_SwitchWrongs: !Bracket_ShouldBeSwitched(next, edge) FAILED");

                        if( next.getClosestPrev() !== null && next.getClosestPrev().getClosestNext() === next )
                            edge = next.getClosestPrev();
                        else
                            next = edge.getClosestNext();
                    }
                    else
                    {
                        edge = next;
                        next = next.getClosestNext();
                    }
                }
            }

            second = second.getOrderNext();
        }

        if( was )
            this._positionAll_StoreY();

        return was;
    };

    var AutoRouterGraph = function (){
        this.horizontal = new AutoRouterEdgeList(true);
        this.vertical = new AutoRouterEdgeList(false);
        this.boxes = {}; 
        this.paths = []; 
        this.selfPoints = [];
        this.bufferBoxes = [];
        this.box2bufferBox = {}; //maps boxId to corresponding bufferbox object

        this.horizontal.setOwner(this);
        this.vertical.setOwner(this);

        //Initializing selfPoints
        this.selfPoints.push(new ArPoint(ED_MINCOORD, ED_MINCOORD));
        this.selfPoints.push(new ArPoint(ED_MAXCOORD, ED_MINCOORD));
        this.selfPoints.push(new ArPoint(ED_MAXCOORD, ED_MAXCOORD));
        this.selfPoints.push(new ArPoint(ED_MINCOORD, ED_MAXCOORD));

        this._addSelfEdges();
    };

    AutoRouterGraph.prototype.getSelfPoints = function(){
        return this.selfPoints;
    };

    //Functions
    AutoRouterGraph.prototype._remove = function (box){
        if(box instanceof AutoRouterBox){
            this._deleteBoxAndPortEdges(box);

            //For the WebGME, the removal of the paths connected to boxes is handled outside the AutoRouter.
            //For removal of paths with the removal of boxes, uncomment the following code:

            /*
               var iter = 0;

               while(iter < paths.length){
               var iteratorChanged = false,
               path = paths[iter],
               startPort = path.getStartPort();

               assert(startPort != null, "ARGraph.remove: startPort != null FAILED");
               var startbox = startPort.getOwner(),
               endPort = path.getEndPort();

               assert(endPort != null, "ARGraph.remove: endPort != null FAILED");
               var endbox = endPort.getOwner();

               if( (startbox === box || endbox === box) )
               {
            //DeletePath:
            if (path.hasOwner())
            {
            deleteEdges(path);
            path.setOwner(null);

            paths.splice(iter, 1);
            iteratorChanged = true;
            }

            path.destroy();	// ??
            }

            if (!iteratorChanged)
            ++iter;
            }
             */

            box.setOwner(null);

            assert( this.boxes[box.getID()] !== undefined, "ARGraph.remove: Box does not exist");

            delete this.boxes[box.getID()];

        }else if(box instanceof AutoRouterPath){ //ARPath
            var path = box;
            this.deleteEdges(path);

            path.setOwner(null);

            var iter = this.paths.indexOf(path);
            assert( iter > -1, "ARGraph.remove: Path does not exist");

            this.paths.splice(iter, 1);
        }
    };

    AutoRouterGraph.prototype._deleteAllBoxes = function (){
        for(var box in this.boxes){
            if(this.boxes.hasOwnProperty(box)){
                this.boxes[box].destroy(); 
                delete this.boxes[box];
            }
        }
        this.bufferBoxes = [];
    };

    AutoRouterGraph.prototype._getBoxList = function (){
        return this.boxes;
    };

    AutoRouterGraph.prototype._hasNoBox = function (){
        return getBoxCount() === 0;
    };

    AutoRouterGraph.prototype._getBoxCount = function (){
        var count = 0;
        for(var box in this.boxes){
            if(this.boxes.hasOwnProperty(box)){
                count++;
            }
        }
        return count;
    };

    AutoRouterGraph.prototype._getBoxAt = function (point, nearness){
        for(var box in this.boxes){
            if(this.boxes.hasOwnProperty(box)){
                if (this.boxes[box].isBoxAt(point, nearness))
                    return this.boxes[box];
            }
        }

        return null;
    };

    AutoRouterGraph.prototype._setPortAttr = function (port, attr){
        this._disconnectPathsFrom(port);
        port.setAttributes(attr);
    };

    AutoRouterGraph.prototype._isRectClipBoxes = function (rect){
        var boxRect;
        for(var box in this.boxes){
            if(this.boxes.hasOwnProperty(box)){
                boxRect = this.boxes[box].getRect();
                if( isRectClip(rect, boxRect) )
                    return true;
            }
        }
        return false;
    };

    AutoRouterGraph.prototype._isRectClipBufferBoxes = function (rect){
        var i = this.bufferBoxes.length,
            c;

        while(i--){
            c = this.bufferBoxes[i].children.length;

            while(c--){
                if( isRectClip(rect, this.bufferBoxes[i].children[c]) )
                    return true;
            }
        }

        return false;
    };

    AutoRouterGraph.prototype._isLineClipBufferBoxes = function (p1, p2){
        var rect = new ArRect(p1, p2);
        rect.normalizeRect();
        assert( rect.left === rect.right || rect.ceil === rect.floor, "ARGraph.this._isLineClipBoxes: rect.left === rect.right || rect.ceil === rect.floor FAILED");

        if( rect.left === rect.right)
            rect.right++;
        if( rect.ceil === rect.floor )
            rect.floor++;

        return isRectClipBufferBoxes(rect);
    };

    AutoRouterGraph.prototype._isLineClipBoxes = function (p1, p2){
        var rect = new ArRect(p1, p2);
        rect.normalizeRect();
        assert( rect.left === rect.right || rect.ceil === rect.floor, "ARGraph.isLineClipBoxes: rect.left === rect.right || rect.ceil === rect.floor FAILED");

        if( rect.left === rect.right)
            rect.right++;
        if( rect.ceil === rect.floor )
            rect.floor++;

        return this._isRectClipBoxes(rect);
    };

    AutoRouterGraph.prototype._canBoxAt = function (rect){
        return !this._isRectClipBoxes(inflatedRect(rect, 1));
    };

    AutoRouterGraph.prototype._add = function (path){
        assert( path != null, "ARGraph.add: path != null FAILED" );
        assert(!path.hasOwner(), "ARGraph.add: !path.hasOwner() FAILED");

        path.setOwner(this);

        this.paths.push(path);

        this._addEdges(path);

        if(DEBUG){
            AssertValidPath(path);
        }

    };

    AutoRouterGraph.prototype._deleteAllPaths = function (){
        var i = -1;

        while(++i < this.paths.length){
            //deleteEdges(*i);	// no need: there's a deleteAllEdges in deleteAll

            this.paths[i].setOwner(null);
            this.paths[i].destroy();
            this.paths[i] = null;
        }

        this.paths = [];
    };

    AutoRouterGraph.prototype._hasNoPath = function (){
        return this.paths.length === 0;
    };

    AutoRouterGraph.prototype._getPathCount = function (){
        return this.paths.length;
    };

    AutoRouterGraph.prototype._getListEdgeAt = function (point, nearness){

        var edge = horizontal.getEdgeAt(point, nearness);
        if( edge )
            return edge;

        return vertical.getEdgeAt(point, nearness);
    };

    AutoRouterGraph.prototype._isEmpty = function (){
        return hasNoBox() && this.paths.length === 0;
    };

    AutoRouterGraph.prototype._getSurroundRect = function (){
        var rect = new ArRect(0,0,0,0);

        for(var box in this.boxes){
            if(this.boxes.hasOwnProperty(box)){
                rect.unionAssign(this.boxes[box].getRect());
            }
        }

        for (var i = 0; i < this.paths.length; i++)
        {
            rect.unionAssign(paths[i].getSurroundRect());
        }

        return rect;
    };

    AutoRouterGraph.prototype._getOutOfBox = function (details){
        var bufferObject = this.box2bufferBox[details.box.getID()],
            children = bufferObject.children,
            i = bufferObject.children.length,
            parentBox = bufferObject.box,
            point = details.point,
            dir = details.dir,
            boxRect = new ArRect( details.box.getRect() ),
            dir2;

        boxRect.inflateRect( BUFFER ); //Create a copy of the buffer box

        assert( isRightAngle(dir), "ARGraph.getOutOfBox: isRightAngle(dir) FAILED");

        while( boxRect.ptInRect( point ) ){
            if(isHorizontal(dir))
                point.x = getRectOuterCoord(boxRect, dir);
            else
                point.y = getRectOuterCoord(boxRect, dir);

            while( i-- ){
                if( children[i].ptInRect( point ) ){
                    boxRect = children[i];
                    break;
                }
            }
            i = bufferObject.children.length;
        }

        assert( !boxRect.ptInRect( point ), "ARGraph.getOutOfBox: !boxRect.ptInRect( point ) FAILED");
    };

    AutoRouterGraph.prototype._goToNextBufferBox = function ( args ){
        var point = args.point,
            end = args.end,
            dir = args.dir,
            dir2 = args.dir2 === undefined || !isRightAngle(args.dir2) ? (end instanceof ArPoint ? 
                    exGetMajorDir(end.minus(point)) : Dir_None) : args.dir2,
            stophere = args.end !== undefined ? args.end : 
                (dir === 1 || dir === 2 ? ED_MAXCOORD : ED_MINCOORD );

        if( dir2 === dir )
            dir2 = isRightAngle(exGetMinorDir(end.minus(point))) ? exGetMinorDir(end.minus(point)) : (dir + 1) % 4;

        if(end instanceof ArPoint){
            stophere = getPointCoord(stophere, dir);
        }

        assert( isRightAngle(dir), "ArGraph.goToNextBufferBox: isRightAngle(dir) FAILED" );
        assert( getPointCoord(point, dir) != stophere, "ArGraph.goToNextBufferBox: getPointCoord(point, dir) != stophere FAILED" );

        var boxby = null,
            iter = 0,
            boxRect;

        while (iter < this.bufferBoxes.length)
        {
            boxRect = this.bufferBoxes[iter].box;

            if( !isPointInDirFrom(point, boxRect, dir) && //Add support for entering the parent box
                    isPointBetweenSides(point, boxRect, dir) &&     // if it will not put the point in a corner (relative to dir2)
                    isCoordInDirFrom(stophere, getChildRectOuterCoordFrom(this.bufferBoxes[iter], dir, point).coord, dir) ){ //Return extreme (parent box) for this comparison
                stophere = getChildRectOuterCoordFrom(this.bufferBoxes[iter], dir, point).coord;
                boxby = this.bufferBoxes[iter]; 
            }

            ++iter;
        }

        if(isHorizontal(dir))
            point.x = stophere;
        else
            point.y = stophere;

        return boxby;
    };

    AutoRouterGraph.prototype._hugChildren = function (bufferObject, point, dir1, dir2, exitCondition){ 
        // This method creates a path that enters the parent box and "hugs" the children boxes (remains within one pixel of them) 
        // and follows them out.
        assert( (dir1 + dir2) % 2 === 1, "ARGraph.hugChildren: One and only one direction must be horizontal");
        var children = bufferObject.children,
            parentBox = bufferObject.box,
            initPoint = new ArPoint( point ),
            child = this._goToNextBox( point, dir1, (dir1 === 1 || dir1 === 2 ? ED_MAXCOORD : ED_MINCOORD ), children ), 
            finalPoint,
            dir = dir2,
            nextDir = nextClockwiseDir( dir1 ) === dir2 ? nextClockwiseDir : prevClockwiseDir,
            points = [ [new ArPoint(point)] ],
            hasExit = true,
            nextChild,
            old;

        assert(child !== null, "ARGraph.hugChildren: child !== null FAILED");
        exitCondition = exitCondition === undefined ? function(pt) { return !parentBox.ptInRect(pt); } : exitCondition;

        while( hasExit && !exitCondition( point, bufferObject ) ){
            old = new ArPoint( point );
            nextChild = this._goToNextBox( point, dir, getRectOuterCoord( child, dir), children );

            if( !points[ points.length - 1 ][0].equals( old ) )
                points.push( [new ArPoint( old )] ); //The points array should not contain the most recent point.

            if( nextChild === null ){
                dir = reverseDir( nextDir( dir ) );
            }else if ( isCoordInDirFrom( getRectOuterCoord( nextChild, reverseDir( nextDir(dir) )), 
                        getPointCoord( point, reverseDir( nextDir(dir) )), reverseDir( nextDir(dir) )) ){
                dir = nextDir( dir );
                child = nextChild;
            }

            if( finalPoint === undefined )
                finalPoint = new ArPoint(point);
            else if( !finalPoint.equals( old ) )
                hasExit = !point.equals(finalPoint);

        }

        if( points[0][0].equals( initPoint ) )
            points.splice(0, 1);

        if( !hasExit ){
            points = null;
            point.assign( initPoint );
        }

        return points;

    };

    AutoRouterGraph.prototype._goToNextBox = function (point, dir, stop1, boxList){
        var stophere= stop1;

        /*
           if(stop2 !== undefined){
           if( stop2 instanceof Array ){
           boxList = stop2;
           }else{
           stophere = stop1 instanceof ArPoint ? 
           chooseInDir(getPointCoord(stop1, dir), getPointCoord(stop2, dir), reverseDir(dir)) :
           chooseInDir(stop1, stop2, reverseDir(dir));
           }

           }else */
        if(stop1 instanceof ArPoint){
            stophere = getPointCoord(stophere, dir);
        }

        assert( isRightAngle(dir), "ArGraph.goToNextBox: isRightAngle(dir) FAILED" );
        assert( getPointCoord(point, dir) != stophere, "ArGraph.goToNextBox: getPointCoord(point, dir) != stophere FAILED" );

        var boxby = null,
            iter = boxList.length,
            boxRect;

        while(iter--){
            boxRect = boxList[iter];

            if( isPointInDirFrom(point, boxRect, reverseDir(dir)) &&
                    isPointBetweenSides(point, boxRect, dir) &&
                    isCoordInDirFrom(stophere, getRectOuterCoord(boxRect, reverseDir(dir)), dir) ) 
            {
                stophere = getRectOuterCoord(boxRect, reverseDir(dir));
                boxby = boxList[iter];
            }
        }

        if(isHorizontal(dir))
            point.x = stophere;
        else
            point.y = stophere;

        return boxby;
    };

    AutoRouterGraph.prototype._getLimitsOfEdge = function (startPt, endPt, min, max){
        var t,
            start = (new ArPoint(startPt)),
            end = (new ArPoint(endPt)),
            rect;

        if( start.y === end.y )
        {
            if( start.x > end.x )
            {
                t = start.x;
                start.x = end.x;
                end.x = t;
            }

            for(var box in this.boxes){
                if(this.boxes.hasOwnProperty(box)){
                    rect = this.boxes[box].getRect();

                    if(start.x < rect.right && rect.left <= end.x)
                    {
                        if( rect.floor <= start.y && rect.floor > min )
                            min = rect.floor;
                        if( rect.ceil > start.y && rect.ceil < max )
                            max = rect.ceil;
                    }
                }
            }
        }
        else
        {
            assert( start.x === end.x, "ARGraph.this.getLimitsOfEdge: start.x === end.x FAILED" );

            if( start.y > end.y )
            {
                t = start.y;
                start.y = end.y;
                end.y = t;
            }

            for(var box in this.boxes){
                if(this.boxes.hasOwnProperty(box)){
                    rect = this.boxes[box].getRect();

                    if(start.y < rect.floor && rect.ceil <= end.y)
                    {
                        if( rect.right <= start.x && rect.right > min )
                            min = rect.right;
                        if( rect.left > start.x && rect.left < max )
                            max = rect.left;
                    }
                }
            }
        }

        max--;

        return { "min": min, "max": max };
    };

    AutoRouterGraph.prototype._isPointInBox = function (point){
        return getBoxAt(point) !== null;
    };

    AutoRouterGraph.prototype._connect = function (path){
        var ports = path.calculateStartEndPorts(),
            startport = ports.src,
            endport = ports.dst,
            startpoint = path.getStartPoint(),
            endpoint = path.getEndPoint();

        assert(startport.hasPoint(startpoint), "ARGraph.connect: startport.hasPoint(startpoint) FAILED");
        assert(endport.hasPoint(endpoint), "ARGraph.connect: endport.hasPoint(endpoint) FAILED");

        if( startpoint.equals(endpoint) )
            stepOneInDir(startpoint, nextClockwiseDir(startdir));

        var startId = startport.getOwner().getID(),
            endId = endport.getOwner().getID(),
            startdir = startport.port_OnWhichEdge(startpoint),
            enddir = endport.port_OnWhichEdge(endpoint);

        if(path.isAutoRouted() && this.box2bufferBox[startId] === this.box2bufferBox[endId]
                && startdir === reverseDir(enddir) && startport.getOwner() !== endport.getOwner()){

            return this._connectPointsSharingParentBox(path, startpoint, endpoint, startdir);
        }else{

            return this._connectPathWithPoints(path, startpoint, endpoint);
        }

    };

    AutoRouterGraph.prototype._connectPathWithPoints = function (path, startpoint, endpoint){
        assert(startpoint instanceof ArPoint, "ARGraph.connect: startpoint instanceof ArPoint FAILED");
        assert( path != null && path.getOwner() === this, "ARGraph.connect: path != null && path.getOwner() === self FAILED");
        assert( !path.isConnected(), "ARGraph.connect: !path.isConnected() FAILED");
        assert( !startpoint.equals(endpoint), "ARGraph.connect: !startpoint.equals(endpoint) FAILED");

        var startPort = path.getStartPort();
        assert(startPort != null, "ARGraph.connect: startPort != null FAILED");

        var startdir = startPort.port_OnWhichEdge(startpoint),
            endPort = path.getEndPort();

        assert(endPort != null, "ARGraph.connect: endPort != null FAILED");
        var enddir = endPort.port_OnWhichEdge(endpoint);
        assert( isRightAngle(startdir) && isRightAngle(enddir), "ARGraph.connect: isRightAngle(startdir) && isRightAngle(enddir) FAILED" );

        //Find the bufferbox containing startpoint, endpoint
        var startBox = this.box2bufferBox[startPort.getOwner().getID()].box,
            endBox = this.box2bufferBox[endPort.getOwner().getID()].box;

        var start = new ArPoint(startpoint);
        this._getOutOfBox({ "point": start, 
                "dir": startdir, 
                "end": endpoint, 
                "box": startPort.getOwner() } );
        assert( !start.equals(startpoint), "ARGraph.connect: !start.equals(startpoint) FAILED" );

        var end = new ArPoint(endpoint);
        this._getOutOfBox({ "point": end, 
                "dir": enddir, 
                "end": start, 
                "box": endPort.getOwner() } ) ;
        assert( !end.equals(endpoint), "ARGraph.connect: !end.equals(endpoint) FAILED" );

        assert( path.isEmpty(),  "ARGraph.connect: path.isEmpty() FAILED" );

        var ret = new ArPointListPath(),
            isAutoRouted = path.isAutoRouted(),
            pos = -1;
        if (isAutoRouted)
            this._connectPoints(ret, start, end, startdir, enddir);

        if (!isAutoRouted)
        {
            var ret2 = path.applyCustomizationsBeforeAutoConnectPoints();

            if (ret2.length > 0)
            {
                while(++pos < ret2.length)
                {
                    ret.push(ret2[pos]);
                }
            }
        }

        path.deleteAll();
        path.addTail(startpoint);
        pos = -1;
        while( ++pos < ret.getLength())
        {
            path.addTail(ret.get(pos)[0]);
        }
        path.addTail(endpoint);

        if (isAutoRouted) {
            this._simplifyPathCurves(path);
            path.simplifyTrivially(); 
            this._simplifyPathPoints(path);
            this._centerStairsInPathPoints(path, startdir, enddir);
        }
        path.setState(ARPATHST_Connected);

        // Apply custom edge modifications - step 1
        // (Step 1: Move the desired edges - see in AutoRouterGraph::Connect(AutoRouterPath* path, ArPoint& startpoint, ArPoint& endpoint)
        //  Step 2: Fix the desired edges - see in AutoRouterEdgeList::addEdges(AutoRouterPath* path))
        if (isAutoRouted)
            path.applyCustomizationsAfterAutoConnectPointsAndStuff();

        return this._addEdges(path);
    };

    AutoRouterGraph.prototype._connectPointsSharingParentBox = function (path, startpoint, endpoint, startdir){
        //Connect points that share a parentbox and face each other
        //These will not need the simplification and complicated path finding
        var start = new ArPoint(startpoint),
            //end = new ArPoint(endpoint),
            dx = endpoint.x - start.x,
            dy = endpoint.y - start.y;

        path.deleteAll();

        path.addTail(startpoint);
        if(dx !== 0 && dy !== 0){
            if(isHorizontal(startdir)){
                path.addTail(new ArPoint(start));
                start.x += dx/2;
                path.addTail(new ArPoint(start));
                start.y += dy;
                path.addTail(new ArPoint(start));
            }else{
                path.addTail(new ArPoint(start));
                start.y += dy/2;
                path.addTail(new ArPoint(start));
                start.x += dx;
                path.addTail(new ArPoint(start));
            }
        }
        path.addTail(endpoint);

        path.setState(ARPATHST_Connected);
        path.applyCustomizationsAfterAutoConnectPointsAndStuff();

        return this._addEdges(path);

    };

    AutoRouterGraph.prototype._connectPoints = function (ret, start, end, hintstartdir, hintenddir, flipped){
        assert( ret.getLength() === 0, "ArGraph.connectPoints: ret.getLength() === 0 FAILED");

        var thestart = new ArPoint( start ), 
            retend = ret.getLength(),
            bufferObject,
            box,
            rect,
            dir1, 
            dir2,
            old,
            oldEnd,
            ret2,
            pts,
            rev,
            i; 

        //This is where we create the original path that we will later adjust
        while( !start.equals(end) )
        {
            dir1 = exGetMajorDir(end.minus(start));
            dir2 = exGetMinorDir(end.minus(start));
            assert( dir1 != Dir_None, "ARGraph.connectPoints: dir1 != Dir_None FAILED");

            assert( dir1 === getMajorDir(end.minus(start)), "ARGraph.connectPoints: dir1 === getMajorDir(end.minus(start)) FAILED");
            assert( dir2 === Dir_None || dir2 === getMinorDir(end.minus(start)), "ARGraph.connectPoints: dir2 === Dir_None || dir2 === getMinorDir(end.minus(start)) FAILED" );

            if( retend === ret.getLength() && dir2 === hintstartdir && dir2 != Dir_None )
            {
                // i.e. std::swap(dir1, dir2);
                dir2 = dir1;
                dir1 = hintstartdir;
            }

            if (retend === ret.getLength() ){
                ret.push([new ArPoint(start)]);
                retend = ret.getLength() - 1; //This should give the index of the newly inserted value
            }else{
                retend++;
                if(retend === ret.getLength()){
                    ret.push([new ArPoint(start)]);
                    retend--;
                }else{
                    ret.splice(retend + 1, 0, [new ArPoint(start)]); //insert after
                }
            }
            old = new ArPoint(start);

            bufferObject = this._goToNextBufferBox({ "point": start, "dir": dir1, "dir2": dir2, "end": end });//Modified goToNextBox (that allows entering parent buffer boxes here
            box = bufferObject === null ? null : bufferObject.box;

            //If goToNextBox does not modify start
            if( start.equals(old) )
            {
                assert( box != null, "ARGraph.connectPoints: box != null FAILED");
                rect = box instanceof ArRect ? box : box.getRect(); 

                if( dir2 === Dir_None ){
                    dir2 = nextClockwiseDir(dir1);
                }

                assert( dir1 != dir2 && dir1 != Dir_None && dir2 != Dir_None, "ARGraph.connectPoints: dir1 != dir2 && dir1 != Dir_None && dir2 != Dir_None FAILED");
                if( bufferObject.box.ptInRect( end ) && !bufferObject.box.ptInRect( start ) && flipped ){
                    //Unfortunately, if parentboxes are a pixel apart, start/end can get stuck and not cross the border
                    //separating them.... This is a simple hack to get them to cross it.
                    if(isHorizontal(dir1))
                        start.x = end.x;
                    else
                        start.y = end.y;
                }else if( bufferObject.box.ptInRect( end ) && !flipped ){
                    oldEnd = new ArPoint(end);
                    ret2 = new ArPointListPath();
                    i;

                    this._connectPoints(ret2, end, start, hintenddir, dir1, true);
                    i = ret2.getLength() - 1;

                    while( i-- > 1){
                        ret.push( ret2.get(i) );
                    }

                    assert( start.equals(end), "ArGraph.connectPoints: start.equals(end) FAILED");
                    old = emptyPoint;
                    start = end = oldEnd;
                } else if( isPointInDirFrom(end, rect, dir2) )
                {
                    assert( !isPointInDirFrom(start, rect, dir2), "ARGraph.connectPoints: !isPointInDirFrom(start, rect, dir2) FAILED");
                    box = this._goToNextBufferBox({ "point": start, "dir": dir2, "dir2": dir1, "end": end });

                    // this assert fails if two boxes are adjacent, and a connection wants to go between
                    //assert( isPointInDirFrom(start, rect, dir2), "ARGraph.connectPoints: isPointInDirFrom(start, rect, dir2) FAILED");//This is not the best check with parent boxes
                    if( start.equals( old ) ){ //Then we are in a corner
                        if( box.children.length > 1 ){
                            pts = this._hugChildren( box, start, dir2, dir1, 
                                    function( pt, bo ) { return (getPointCoord( pt, dir1 ) === getRectOuterCoord( bo.box, dir1)) 
                                    || ( isPointInDirFrom(pt, end, dir1)); } ); 
                        }else{
                            pts = this._hugChildren( bufferObject, start, dir1, dir2 );
                        }
                        if( pts !== null ){

                            //Add new points to the current list 
                            ret.setArPointList( ret.concat(pts));
                            retend += pts.length;

                        }else{ //Go through the blocking box
                            assert( isRightAngle(dir1), "ARGraph.getOutOfBox: isRightAngle(dir1) FAILED");

                            if(isHorizontal(dir1))
                                start.x = getRectOuterCoord(bufferObject.box, dir1);
                            else
                                start.y = getRectOuterCoord(bufferObject.box, dir1);
                        }
                    }
                }
                else
                {
                    assert( isPointBetweenSides(end, rect, dir1), "ARGraph.connectPoints: isPointBetweenSides(end, rect, dir1) FAILED" );
                    assert( !isPointIn(end, rect), "ARGraph.connectPoints: !isPointIn(end, rect) FAILED" );

                    rev = 0;

                    if( reverseDir(dir2) === hintenddir && 
                            getChildRectOuterCoordFrom(bufferObject, reverseDir(dir2), start) === getRectOuterCoord(rect, reverseDir(dir2))) //And if point can exit that way 
                        rev = 1;
                    else if( dir2 != hintenddir )
                    {
                        if( isPointBetweenSides(thestart, rect, dir1) )
                        {
                            if(	isPointInDirFrom(rect.getTopLeft().plus(rect.getBottomRight()), start.plus(end), dir2) )
                                rev = 1;
                        }
                        else
                            if( isPointInDirFrom(start, thestart, dir2) )
                                rev = 1;
                    }

                    if( rev )
                    {
                        dir2 = reverseDir(dir2);
                    }

                    //If the box in the way has one child
                    if( bufferObject.children.length === 1){
                        if(isHorizontal(dir2))
                        {
                            start.x = getRectOuterCoord(rect, dir2);
                        }
                        else
                        {
                            start.y = getRectOuterCoord(rect, dir2);
                        }

                        assert( !start.equals(old), "ARGraph.connectPoints: !start.equals(old) FAILED");
                        assert(retend != ret.getLength(), "ARGraph.connectPoints: retend != ret.getLength() FAILED");
                        retend++;
                        if(retend === ret.getLength()){
                            ret.push([new ArPoint(start)]);
                            retend--;
                        }else{
                            ret.splice(retend + 1, 0, [new ArPoint(start)]); 
                        }
                        old.assign(start);

                        if(isHorizontal(dir1))
                        {
                            start.x = getRectOuterCoord(rect, dir1);
                        }
                        else
                        {
                            start.y = getRectOuterCoord(rect, dir1);
                        }

                        assert( isPointInDirFrom(end, start, dir1), "ARGraph.connectPoints: isPointInDirFrom(end, start, dir1) FAILED");
                        if( getPointCoord(start, dir1) != getPointCoord(end, dir1) )
                        {
                            this._goToNextBufferBox({ "point": start, "dir": dir1, "end": end });
                        }

                    }else{ //If the box has multiple children
                        pts = this._hugChildren( bufferObject, start, dir1, dir2, 
                                //exitCondition is when you get to the dir1 side of the box or when you pass end
                                function( pt, bo ) { return (getPointCoord( pt, dir1 ) === getRectOuterCoord( bo.box, dir1)) 
                                || ( isPointInDirFrom(pt, end, dir1)); } ); 
                        if( pts !== null ){

                            //Add new points to the current list 
                            ret.setArPointList( ret.concat(pts));
                            retend += pts.length;

                        }else{ //Go through the blocking box
                            assert( isRightAngle(dir1), "ARGraph.getOutOfBox: isRightAngle(dir1) FAILED");

                            if(isHorizontal(dir1))
                                start.x = getRectOuterCoord(bufferObject.box, dir1);
                            else
                                start.y = getRectOuterCoord(bufferObject.box, dir1);
                        }
                    }
                }

                assert( !start.equals(old), "ARGraph.connectPoints: !start.equals(old) FAILED");
            }

        }

        ret.push([end]);

    };

    AutoRouterGraph.prototype._disconnectAll = function (){
        var iter = 0;

        while(iter < this.paths.length)
        {
            this.disconnect(paths[iter]);
            ++iter;
        }
    };

    AutoRouterGraph.prototype.disconnect = function (path){
        if( path.isConnected() ){
            this.deleteEdges(path);
            path.getStartPort().removePoint(path.getStartPoint());//Removing points from ports
            path.getEndPort().removePoint(path.getEndPoint());
        }

        path.deleteAll();
    };

    AutoRouterGraph.prototype._disconnectPathsClipping = function (rect){
        var iter = this.paths.length;

        while(iter--)
        {
            if( this.paths[iter].isPathClip(rect) )
                this.disconnect(this.paths[iter]);
        }
    };

    AutoRouterGraph.prototype._disconnectPathsFrom = function (box){
        var iter = this.paths.length,
            path,
            startPort,
            endPort;

        if(box instanceof AutoRouterBox){
            var startbox,
                endbox;
            while(iter--)
            {
                path = this.paths[iter];
                startPort = path.getStartPort();

                assert(startPort != null, "ARGraph.disconnectPathsFrom: startPort != null FAILED");
                startbox = startPort.getOwner();
                assert(startbox != null, "ARGraph.disconnectPathsFrom: startbox != null FAILED");

                endPort = path.getEndPort();
                assert(endPort != null, "ARGraph.disconnectPathsFrom: endPort != null FAILED");
                endbox = endPort.getOwner();
                assert(endbox != null, "ARGraph.disconnectPathsFrom: endbox != null FAILED");

                if( (startbox === box || endbox === box) )
                    this.disconnect(path);

            }
        }else{

            while(iter--)
            {
                path = this.paths[iter];
                startPort = path.getStartPort();
                endPort = path.getEndPort();

                if( (startport === port || endport === port) )
                    this.disconnect(path);

            }
        }
    };

    AutoRouterGraph.prototype._addSelfEdges = function (){
        this.horizontal.addEdges(this);
        this.vertical.addEdges(this);
    };

    AutoRouterGraph.prototype._addEdges = function (obj){
        if(obj instanceof AutoRouterPath){
            var path = obj;
            return this.horizontal.addEdges(path) && this.vertical.addEdges(path);
        }else{ 
            this.horizontal.addEdges(obj);
            this.vertical.addEdges(obj);
        }
    };

    AutoRouterGraph.prototype.deleteEdges = function (object){
        this.horizontal.deleteEdges(object);
        this.vertical.deleteEdges(object);
    };

    AutoRouterGraph.prototype._addAllEdges = function (){
        assert( this.horizontal.isEmpty() && this.vertical.isEmpty(), "ARGraph.addAllEdges: horizontal.isEmpty() && vertical.isEmpty() FAILED"  );
        var i;

        for(var box in this.boxes){
            if(this.boxes.hasOwnProperty(box)){
                this._addBoxAndPortEdges(this.boxes[box]);
            }

            i = -1;

            while (++i < this.paths.length)
            {
                this._addEdges(paths[i]);
            }
        }
    };

    AutoRouterGraph.prototype._deleteAllEdges = function (){
        this.horizontal.deleteAllEdges();
        this.vertical.deleteAllEdges();
    };

    AutoRouterGraph.prototype._addBoxAndPortEdges = function (box){
        assert( box != null, "ARGraph.addBoxAndPortEdges: box != null FAILED" );

        this._addEdges(box);

        var pl = box.getPortList(),
            ii = 0;

        while( ii < pl.length){
            this._addEdges(pl[ii]);
            ++ii;
        }

        //Add to bufferboxes
        this._addToBufferBoxes(box);
    };

    AutoRouterGraph.prototype._deleteBoxAndPortEdges = function (box){
        assert( box != null, "ARGraph.deleteBoxAndPortEdges: box != null FAILED");

        this.deleteEdges(box);

        var pl = box.getPortList(),
            i = 0;
        while( i < pl.length){
            this.deleteEdges(pl[i++]);
        }

        this._removeFromBufferBoxes(box);
    };

    AutoRouterGraph.prototype._getEdgeList = function (ishorizontal){
        return ishorizontal ? this.horizontal : this.vertical;
    };

    AutoRouterGraph.prototype._candeleteTwoEdgesAt = function (path, points, pos){
        if(DEBUG){
            assert( path.getOwner() === this, "ARGraph.candeleteTwoEdgesAt: path.getOwner() === this FAILED");
            path.assertValid();
            assert( path.isConnected(), "ARGraph.candeleteTwoEdgesAt: path.isConnected() FAILED");
            points.AssertValidPos(pos);
        }

        if( pos + 2 >= points.getLength() || pos < 1 )
            return false;

        var pointpos = pos,
            point = points.get(pos++)[0], 
            npointpos = pos;
        var npoint = points.get(pos++)[0],
            nnpointpos = pos;

        pos = pointpos;
        pos--;
        var ppointpos = pos; 

        var ppoint = points.get(pos--)[0],
            pppointpos = pos; 

        if( npoint.equals(point)) 
            return false; // direction of zero-length edges can't be determined, so don't delete them

        assert( pppointpos < points.getLength() && ppointpos < points.getLength() && pointpos < points.getLength() && npointpos < points.getLength() && nnpointpos < points.getLength(), 
                "ARGraph.candeleteTwoEdgesAt: pppointpos < points.getLength() && ppointpos < points.getLength() && pointpos < points.getLength() && npointpos < points.getLength() && nnpointpos < points.getLength() FAILED");

        var dir = getDir(npoint.minus(point));

        assert( isRightAngle(dir), "ARGraph.candeleteTwoEdgesAt: isRightAngle(dir) FAILED");
        var ishorizontal = isHorizontal(dir);

        var newpoint = new ArPoint();

        if(ishorizontal){
            newpoint.x = getPointCoord(npoint, ishorizontal);
            newpoint.y = getPointCoord(ppoint, !ishorizontal);
        }else{
            newpoint.y = getPointCoord(npoint, ishorizontal);
            newpoint.x = getPointCoord(ppoint, !ishorizontal);
        }

        assert( getDir(newpoint.minus(ppoint)) === dir, "ARGraph.candeleteTwoEdgesAt: getDir(newpoint.minus(ppoint)) === dir FAILED" );

        if( this._isLineClipBoxes(newpoint, npoint) ) return false;
        if( this._isLineClipBoxes(newpoint, ppoint) ) return false;

        return true;
    };

    AutoRouterGraph.prototype._deleteTwoEdgesAt = function (path, points, pos){
        if(DEBUG){
            assert( path.getOwner() === this, "ARGraph.deleteTwoEdgesAt: path.getOwner() === this FAILED");
            path.assertValid();
            assert( path.isConnected(), "ARGraph.deleteTwoEdgesAt: path.isConnected() FAILED" );
            points.AssertValidPos(pos);
        }

        var pointpos = pos, //Getting the next, and next-next, points
            point = points.get(pos++)[0],
            npointpos = pos,
            npoint = points.get(pos++),
            nnpointpos = pos,
            nnpoint = points.get(pos++)[0],
            nnnpointpos = pos;

        pos = pointpos;
        pos--;

        var ppointpos = pos, //Getting the prev, prev-prev points
            ppoint = points.get(pos--)[0],
            pppointpos = pos,
            pppoint = points.get(pos--)[0];

        assert( pppointpos < points.getLength() && ppointpos < points.getLength() && pointpos < points.getLength() && npointpos < points.getLength() && nnpointpos < points.getLength(), "ARGraph.deleteTwoEdgesAt: pppointpos < points.getLength() && ppointpos < points.getLength() && pointpos < points.getLength() && npointpos < points.getLength() && nnpointpos < points.getLength() FAILED");
        assert( pppoint !== null && ppoint !== null && point !== null && npoint !== null && nnpoint !== null, "ARGraph.deleteTwoEdgesAt: pppoint !== null && ppoint !== null && point !== null && npoint !== null && nnpoint !== null FAILED");

        var dir = getDir(npoint[0].minus(point));

        assert( isRightAngle(dir), "ARGraph.deleteTwoEdgesAt: isRightAngle(dir) FAILED");
        var ishorizontal = isHorizontal(dir);

        var newpoint = new ArPoint();
        if(ishorizontal){
            newpoint.x = getPointCoord(npoint[0], ishorizontal);
            newpoint.y = getPointCoord(ppoint, !ishorizontal);
        }else{
            newpoint.x = getPointCoord(ppoint, !ishorizontal);
            newpoint.y = getPointCoord(npoint[0], ishorizontal);
        }

        assert( getDir(newpoint.minus(ppoint)) === dir, "ARGraph.deleteTwoEdgesAt: getDir(newpoint.minus(ppoint)) === dir FAILED");

        assert( !this._isLineClipBoxes(newpoint, npoint[0]), "ARGraph.deleteTwoEdgesAt: !isLineClipBoxes(newpoint, npoint[0]) FAILED");
        assert( !this._isLineClipBoxes(newpoint, ppoint), "ARGraph.deleteTwoEdgesAt: !isLineClipBoxes(newpoint, ppoint) FAILED");

        var hlist = this._getEdgeList(ishorizontal),
            vlist = this._getEdgeList(!ishorizontal);

        var ppedge = hlist.getEdgeByPointer(pppoint),
            pedge = vlist.getEdgeByPointer(ppoint),
            nedge = hlist.getEdgeByPointer(point),
            nnedge = vlist.getEdgeByPointer(npoint[0]);

        assert( ppedge !== null && pedge !== null && nedge !== null && nnedge !== null, "ARGraph.deleteTwoEdgesAt:  ppedge !== null && pedge !== null && nedge !== null && nnedge !== null FAILED");

        vlist.Delete(pedge);
        hlist.Delete(nedge);

        points.splice(ppointpos, 3, [ newpoint ]);
        ppedge.setEndPointNext(nnpoint);
        ppedge.setEndPoint(newpoint); 

        nnedge.setStartPoint(newpoint);
        nnedge.setStartPointPrev(pppoint);

        if( nnnpointpos < points.getLength())
        {
            var nnnedge = hlist.getEdgeByPointer(nnpoint, (nnnpointpos)); 
            assert( nnnedge !== null, "ARGraph.deleteTwoEdgesAt: nnnedge !== null FAILED");
            assert( nnnedge.getStartPointPrev().equals(npoint[0]) && nnnedge.getStartPointPtr()[0].equals(nnpoint), "ARGraph.deleteTwoEdgesAt: nnnedge.getStartPointPrev().equals(npoint[0]) && nnnedge.getStartPoint().equals(nnpoint) FAILED" );
            nnnedge.setStartPointPrev(ppoint);
        }

        if( nnpoint.equals(newpoint) )
            deleteSamePointsAt(path, points, ppointpos);

    };

    AutoRouterGraph.prototype._deleteSamePointsAt = function (path, points, pos){
        if(DEBUG){
            assert( path.getOwner() === this, "ARGraph.deleteSamePointsAt: path.getOwner() === this FAILED" );
            path.assertValid();
            assert( path.isConnected(), "ARGraph.deleteSamePointsAt: path.isConnected() FAILED");
            points.AssertValidPos(pos);
        }

        var pointpos = pos,
            point = points.get(pos++), 
            npointpos = pos,
            npoint = points.get(pos++),
            nnpointpos = pos,
            nnpoint = points.get(pos++),
            nnnpointpos = pos;

        pos = pointpos;
        pos--;

        var ppointpos = pos,
            point = points.get(pos--), 
            pppointpos = pos,
            pppoint = pos === points.getLength() ? null : points.get(pos--);

        assert( ppointpos < points.getLength() && pointpos < points.getLength() && npointpos < points.getLength() && nnpointpos < points.getLength(), "ARGraph.deleteSamePointsAt: ppointpos < points.getLength() && pointpos < points.getLength() && npointpos < points.getLength() && nnpointpos < points.getLength() FAILED");
        assert( ppoint != null && point != null && npoint != null && nnpoint != null, "ARGraph.deleteSamePointsAt: ppoint != null && point != null && npoint != null && nnpoint != null FAILED");
        assert( point.equals(npoint) && !point.equals(ppoint), "ARGraph.deleteSamePointsAt: point.equals(npoint) && !point.equals(ppoint) FAILED");

        var dir = getDir(point.minus(ppoint));
        assert( isRightAngle(dir), "ARGraph.deleteSamePointsAt: isRightAngle(dir) FAILED" );

        var ishorizontal = isHorizontal(dir),
            hlist = this._getEdgeList(ishorizontal),
            vlist = this._getEdgeList(!ishorizontal),

            pedge = hlist.getEdgeByPointer(ppoint, point),
            nedge = vlist.getEdgeByPointer(point, npoint),
            nnedge = hlist.getEdgeByPointer(npoint, nnpoint);

        assert( pedge != null && nedge != null && nnedge != null, "ARGraph.deleteSamePointsAt: pedge != null && nedge != null && nnedge != null FAILED");

        vlist.Delete(pedge);
        hlist.Delete(nedge);

        points.splice(pointpos, 2);

        if( pppointpos < points.getLength())
        {
            var ppedge = vlist.getEdgeByPointer(pppoint, ppoint);
            assert( ppedge != null && ppedge.getEndPoint().equals(ppoint) && ppedge.getEndPointNext().equals(point), "ARGraph.deleteSamePointsAt: ppedge != null && ppedge.getEndPoint().equals(ppoint) && ppedge.getEndPointNext().equals(point) FAILED");
            ppedge.setEndPointNext(nnpoint);
        }

        assert( nnedge.getStartPoint().equals(npoint) && nnedge.getStartPointPrev().equals(point), "ARGraph.deleteSamePointsAt: nnedge.getStartPoint().equals(npoint) && nnedge.getStartPointPrev().equals(point) FAILED"); 
        nnedge.setStartPoint(ppoint);
        nnedge.setStartPointPrev(pppoint);

        if( nnnpointpos < points.getLength())
        {
            var nnnedge = vlist.getEdgeByPointer(nnpoint, (nnnpointpos)); //&*
            assert( nnnedge !== null && nnnedge.getStartPointPrev().equals(npoint) && nnnedge.getStartPoint().equals(nnpoint), "ARGraph.deleteSamePointsAt: nnnedge !== null && nnnedge.getStartPointPrev().equals(npoint) && nnnedge.getStartPoint().equals(nnpoint) FAILED");
            nnnedge.setStartPointPrev(ppoint);
        }

        if(DEBUG_DEEP){
            path.assertValid();
        }
    };

    AutoRouterGraph.prototype._simplifyPaths = function (){
        var was = false,
            i = 0,
            path,
            pointList,
            pointpos;

        while(i < this.paths.length)
        {
            path = this.paths[i++];

            if (path.isAutoRouted()) {
                pointList = path.getPointList();
                pointpos = 0;

                this._fixShortPaths(path);

                while( pointpos < pointList.getLength() )
                {
                    if( this._candeleteTwoEdgesAt(path, pointList, pointpos) )
                    {
                        this._deleteTwoEdgesAt(path, pointList, pointpos);
                        was = true;
                        break;
                    }
                    pointpos++;
                }
            }
        }

        return was;
    };

    AutoRouterGraph.prototype._centerStairsInPathPoints = function (path, hintstartdir, hintenddir){
        assert( path != null, "ARGraph.centerStairsInPathPoints: path != null FAILED" );
        assert( !path.isConnected(), "ARGraph.centerStairsInPathPoints: !path.isConnected() FAILED");

        var pointList = path.getPointList();
        assert( pointList.getLength() >= 2, "ARGraph.centerStairsInPathPoints: pointList.getLength() >= 2 FAILED");

        if(DEBUG){
            path.assertValidPoints();
        }

        var p1,
            p2,
            p3,
            p4,

            p1p = pointList.getLength(),
            p2p = pointList.getLength(),
            p3p = pointList.getLength(),
            p4p = pointList.getLength(),

            d12 = Dir_None,
            d23 = Dir_None,
            d34 = Dir_None,

            outOfBoxStartPoint = path.getOutOfBoxStartPoint(hintstartdir),
            outOfBoxEndPoint = path.getOutOfBoxEndPoint(hintenddir),

            pos = 0;
        assert( pos < pointList.getLength(), "ARGraph.centerStairsInPathPoints pos < pointList.getLength() FAILED");

        p1p = pos;
        p1 = (pointList.get(pos++)[0]);

var np2,
np3,
h,
p4x,
p3x,
p1x,
tmp,
t,
m;


        while( pos < pointList.getLength())
        {
            p4p = p3p;
            p3p = p2p;
            p2p = p1p;
            p1p = pos;

            p4 = p3;
            p3 = p2;
            p2 = p1;
            p1 = (pointList.get(pos++)[0]);

            d34 = d23;
            d23 = d12;

            if( p2p < pointList.getLength())
            {
                d12 = getDir(p2.minus(p1));
                if(DEBUG){
                    assert( isRightAngle(d12), "ARGraph.centerStairsInPathPoints: isRightAngle(d12) FAILED" );
                    if( p3p != pointList.end() )
                        assert( areInRightAngle(d12, d23), "ARGraph.centerStairsInPathPoints: areInRightAngle(d12, d23) FAILED" );
                }
            }

            if( p4p < pointList.getLength() && d12 === d34 )
            {
                assert( p1p < pointList.getLength() && p2p < pointList.getLength() && p3p < pointList.getLength() && p4p < pointList.getLength(), "ARGraph.centerStairsInPathPoints: p1p < pointList.getLength() && p2p < pointList.getLength() && p3p < pointList.getLength() && p4p < pointList.getLength() FAILED");

                np2 = new ArPoint(p2);
                np3 = new ArPoint(p3);
                h = isHorizontal(d12);

                p4x = getPointCoord(p4, h);
                p3x = getPointCoord(p3, h);
                p1x = getPointCoord(p1, h);

                //p1x will represent the larger x value in this 'step' situation
                if( p1x < p4x )
                {
                    t = p1x;
                    p1x = p4x;
                    p4x = t;
                }

                if( p4x < p3x && p3x < p1x )
                {
                    m = Math.round((p4x + p1x)/2);
                    if(h){
                        np2.x = m;
                        np3.x = m;
                    }else{
                        np2.y = m;
                        np3.y = m;
                    }

                    tmp = this._getLimitsOfEdge(np2, np3, p4x, p1x);
                    p4x = tmp.min;
                    p1x = tmp.max;

                    m = Math.round((p4x + p1x)/2);

                    if(h){
                        np2.x = m;
                        np3.x = m;
                    }else{
                        np2.y = m;
                        np3.y = m;
                    }

                    if( !this._isLineClipBoxes(np2, np3) &&
                            !this._isLineClipBoxes(p1p === pointList.getLength() ? outOfBoxEndPoint : p1, np2) &&
                            !this._isLineClipBoxes(p4p === 0 ? outOfBoxStartPoint : p4, np3) )
                    {
                        p2 = np2;
                        p3 = np3;
                        pointList.splice(p2p, 1, [p2]);
                        pointList.splice(p3p, 1, [p3]);
                    }
                }
            }
        }

        if(DEBUG)
            path.assertValidPoints();
    };

    AutoRouterGraph.prototype._fixShortPaths = function (path){
        //Make sure if a straight line is possible, the path is a straight line
        //Note, this may make it so the stems are no longer centered in the port.

        var startPort = path.getStartPort(),
            endPort = path.getEndPort(),
            len = path.getPointList().getLength();

        if(len === 4){
            var points = path.getPointList(),
                startpoint = points.get(0)[0],
                endpoint = points.get(len - 1)[0],
                startDir = startPort.port_OnWhichEdge(startpoint),
                endDir = endPort.port_OnWhichEdge(endpoint),
                tstStart,
                tstEnd;

            if( startDir === reverseDir(endDir) ){
                var newStart = new ArPoint(startpoint),
                    newEnd = new ArPoint(endpoint),
                    startRect = startPort.getRect(),
                    endRect = endPort.getRect(),
                    minOverlap,
                    maxOverlap;

                if( isHorizontal(startDir) ){
                    minOverlap = Math.min(startRect.floor, endRect.floor);
                    maxOverlap = Math.max(startRect.ceil, endRect.ceil);

                    var newY = (minOverlap + maxOverlap)/2;
                    newStart.y = newY;
                    newEnd.y = newY;

                    tstStart = new ArPoint(getRectOuterCoord(startPort.getOwner().getRect(), startDir), newStart.y);
                    tstEnd = new ArPoint(getRectOuterCoord(endPort.getOwner().getRect(), endDir), newEnd.y);

                }else{
                    minOverlap = Math.min(startRect.right, endRect.right);
                    maxOverlap = Math.max(startRect.left, endRect.left);

                    var newX = (minOverlap + maxOverlap)/2;
                    newStart.x = newX;
                    newEnd.x = newX;

                    tstStart = new ArPoint(newStart.x, getRectOuterCoord(startPort.getOwner().getRect(), startDir));
                    tstEnd = new ArPoint(newEnd.x, getRectOuterCoord(endPort.getOwner().getRect(), endDir));
                }

                if( startRect.ptInRect(newStart) && endRect.ptInRect(newEnd)
                        && !this._isLineClipBoxes(tstStart, tstEnd) ){


                    var ishorizontal = isHorizontal(startDir),
                        hlist = this._getEdgeList(ishorizontal),
                        vlist = this._getEdgeList(!ishorizontal),
                        edge = hlist.getEdgeByPointer(startpoint),
                        edge2 = vlist.getEdgeByPointer(points.get(1)[0]),
                        edge3 = hlist.getEdgeByPointer(points.get(2)[0]);

                    vlist.Delete(edge2);
                    hlist.Delete(edge3);
                    hlist.remove(edge);

                    startpoint.assign(newStart); //The values of startpoint is changed but we don't change the startpoint of the edge
                    endpoint.assign(newEnd);    //to maintain the reference that the port has to the startpoint
                    edge.setEndPoint(endpoint);

                    edge.setStartPointPrev(null);
                    edge.setEndPointNext(null);

                    edge.setPositionY(getPointCoord(newStart, nextClockwiseDir(startDir) ));
                    hlist.insert(edge);

                    points.splice(1, 2);
                }
            }
        }
    };

    AutoRouterGraph.prototype._simplifyPathCurves = function (path){
        //This method will remove unnecessary curves inserted into the path from 
        //hugging children.
        //Incidently, this will also contain the functionality of simplifyTrivially
        var pointList = path.getPointList(),
            p1,
            p2,
            i = 0,
            j;

        //I will be taking the first point and checking to see if it can create a straight line
        //that does not intersect any other boxes on the graph from the test point to the other point.
        //The 'other point' will be the end of the path iterating back til the two points before the 
        //current.
        while( i < pointList.getLength() - 3 ){
            p1 = pointList.get(i)[0];
            j = pointList.getLength();

            while( j-- > 0 ){
                p2 = pointList.get(j)[0];
                if( isRightAngle( getDir(p1.minus(p2)) ) && !this._isLineClipBoxes(p1, p2)){
                    pointList.splice( i+1, j-i-1); //Remove all points between i, j
                    break;
                }
            }
            ++i;
        }
    };

    AutoRouterGraph.prototype._simplifyPathPoints = function (path){
        assert( path != null, "ARGraph.simplifyPathPoints: path != null FAILED");
        assert( !path.isConnected(), "ARGraph.simplifyPathPoints: !path.isConnected() FAILED");

        var pointList = path.getPointList();
        assert( pointList.getLength() >= 2, "ARGraph.simplifyPathPoints: pointList.length >= 2 FAILED" );

        if(DEBUG)
            path.assertValidPoints();

        var p1,
            p2,
            p3,
            p4,
            p5,

            p1p = pointList.getLength(),
            p2p = pointList.getLength(),
            p3p = pointList.getLength(),
            p4p = pointList.getLength(),
            p5p = pointList.getLength(),

            pos = 0,

            np3,
            d,
            h;

        assert( pos < pointList.getLength(), "ARGraph.simplifyPathPoints: pos < pointList.getLength() FAILED");

        p1p = pos;
        p1 = pointList.get(pos++)[0];

        while( pos < pointList.getLength())
        {
            p5p = p4p;
            p4p = p3p;
            p3p = p2p;
            p2p = p1p;
            p1p = pos;

            p5 = p4;
            p4 = p3;
            p3 = p2;
            p2 = p1;
            p1 = pointList.get(pos++)[0];

            if( p5p < pointList.getLength())
            {
                assert( p1p < pointList.getLength() && p2p < pointList.getLength() && p3p < pointList.getLength() && p4p < pointList.getLength() && p5p < pointList.getLength(), "ARGraph.simplifyPathPoints: p1p < pointList.getLength() && p2p < pointList.getLength() && p3p < pointList.getLength() && p4p < pointList.getLength() && p5p < pointList.getLength() FAILED");
                assert( !p1.equals(p2) && !p2.equals(p3) && !p3.equals(p4) && !p4.equals(p5), "ARGraph.simplifyPathPoints: !p1.equals(p2) && !p2.equals(p3) && !p3.equals(p4) && !p4.equals(p5) FAILED");

                d = getDir(p2.minus(p1));
                assert( isRightAngle(d), "ARGraph.simplifyPathPoints: isRightAngle(d) FAILED");
                h = isHorizontal(d);

                np3 = new ArPoint();
                if(h){
                    np3.x = getPointCoord(p5, h);
                    np3.y = getPointCoord(p1, !h);
                }else{
                    np3.x = getPointCoord(p1, !h);
                    np3.y = getPointCoord(p5, h);
                }

                if( !this._isLineClipBoxes(p2, np3) && !this._isLineClipBoxes(np3, p4) )
                {
                    pointList.splice(p2p, 1);
                    pointList.splice(p3p, 1);
                    pointList.splice(p4p, 1);

                    if( !np3.equals(p1) && !np3.equals(p5) ){
                        pointList.splice(p4p, 0, [np3]);
                    }

                    p1p = pointList.getLength();
                    p2p = pointList.getLength();
                    p3p = pointList.getLength();
                    p4p = pointList.getLength();

                    pos = 0;
                }
            }
        }

        if(DEBUG)
            path.assertValidPoints();
    };

    AutoRouterGraph.prototype._connectAllDisconnectedPaths = function (){
        var iter,
            success = false,
            giveup = false,
            path;

        while (!success && !giveup) {
            success = true;
            iter = 0;
            while (iter < this.paths.length && success)
            {
                path = this.paths[iter];

                if( !path.isConnected() )
                {
                    success = this._connect(path);

                    if (!success) {
                        // Something is messed up, probably an existing edge customization results in a zero length edge
                        // In that case we try to delete any customization for this path to recover from the problem
                        if (path.areTherePathCustomizations())
                            path.removePathCustomizations();
                        else
                            giveup = true;
                    }
                }

                ++iter;
            }
            if (!success && !giveup)
                this._disconnectAll();	// There was an error, delete halfway results to be able to start a new pass
        }
    };

    AutoRouterGraph.prototype._addToBufferBoxes = function (inputBox){
        var i = this.bufferBoxes.length,
            box = { 'rect': new ArRect(inputBox.getRect()), 'id': inputBox.getID() },
            overlapBoxesIndices = [],
            bufferBox,
            children = [],
            parentBox,
            ids = [inputBox.getID()],
            child,
            j;

        box.rect.inflateRect(BUFFER);

        while(i--){
            if(!box.rect.touching( this.bufferBoxes[i].box ))
                continue;

            j = this.bufferBoxes[i].children.length;
            while(j--){
                child = this.bufferBoxes[i].children[j];
                if(box.rect.touching( child )){
                    inputBox.adjustPortAvailability(child);
                    this.boxes[child.id].adjustPortAvailability(box.rect);

                    if(overlapBoxesIndices.indexOf(i) === -1)
                        overlapBoxesIndices.push(i);
                }

            }
        }

        if(overlapBoxesIndices.length !== 0){
            //Now overlapBoxes contains all the boxes overlapping with the box to be added
            i = -1;
            parentBox = new ArRect(box.rect);

            while(++i < overlapBoxesIndices.length){
                assert(overlapBoxesIndices[i] < this.bufferBoxes.length, "ArGraph.addToBufferBoxes: overlapBoxes index out of bounds.");
                bufferBox = this.bufferBoxes.splice(overlapBoxesIndices[i], 1)[0];
                j = bufferBox.children.length;

                while(j--){
                    children.push(bufferBox.children[j]);
                    ids.push(bufferBox.children[j].id);//Store the ids of the children that need to be adjusted
                }

                parentBox.unionAssign(bufferBox.box);
            }
        }else{
            parentBox = box.rect;
        }

        box.rect.id = inputBox.getID();
        children.push(box.rect);

        this.bufferBoxes.push( { "box": parentBox, "children": children });
        i = ids.length;
        while(i--){
            this.box2bufferBox[ids[i]] = this.bufferBoxes[this.bufferBoxes.length-1];
        }

    };

    AutoRouterGraph.prototype._removeFromBufferBoxes = function (box){
        //Get the children of the parentBox (not including the box to remove)
        //Create bufferboxes from these children
        var bufferBox = this.box2bufferBox[box.getID()],
            i = this.bufferBoxes.indexOf(bufferBox),
            children = bufferBox.children,
            groups = [],
            add = false,
            parentBox,
            child,
            group,
            ids,
            j,
            g;

        assert(i !== -1, "ARGraph.removeFromBufferBoxes: Can't find the correct bufferbox.");

        this.bufferBoxes.splice(i, 1);//Remove the bufferBox from this.bufferBoxes

        //Create groups of overlap from children
        i = children.length;
        while(i--){
            g = groups.length;
            child = children[i];
            group = [child];
            add = false;

            this.boxes[child.id].resetPortAvailability();//Reset box's ports availableAreas

            if(child.id === box.getID())
                continue;

            while(g--){
                j = groups[g].length;

                while(j--){
                    if(groups[g][j].touching( child )){
                        this.boxes[child.id].adjustPortAvailability(groups[g][j]);
                        this.boxes[groups[g][j].id].adjustPortAvailability(child);
                        add = true;
                    }
                }

                if(add)
                    group = group.concat(groups.splice(g, 1)[0]);//group will accumulate all things overlapping the child
            }

            groups.push(group); //Add group to groups
        }

        i = groups.length;
        while(i--){
            j = groups[i].length;
            parentBox = new ArRect(groups[i][0]);
            ids = [];

            while(j--){
                parentBox.unionAssign(groups[i][j]);
                ids.push(groups[i][j].id);
            }

            this.bufferBoxes.push( { "box": parentBox, "children": groups[i] });

            j = ids.length;
            while(j--){
                this.box2bufferBox[ids[j]] = this.bufferBoxes[this.bufferBoxes.length-1];
            }
        }

    };

    //Public Functions

    AutoRouterGraph.prototype.setBuffer = function(newBuffer){
        BUFFER = newBuffer;
    };

    AutoRouterGraph.prototype.getPathList = function(){
        return this.paths;
    };

    AutoRouterGraph.prototype.calculateSelfPoints = function(){
        this.selfPoints = [];
        this.selfPoints.push(new ArPoint(ED_MINCOORD, ED_MINCOORD));
        this.selfPoints.push(new ArPoint(ED_MAXCOORD, ED_MINCOORD));
        this.selfPoints.push(new ArPoint(ED_MAXCOORD, ED_MAXCOORD));
        this.selfPoints.push(new ArPoint(ED_MINCOORD, ED_MAXCOORD));
    };

    AutoRouterGraph.prototype.createBox = function(){
        var box = new AutoRouterBox();
        assert( box != null, "ARGraph.createBox: box != null FAILED" );

        return box;
    };

    AutoRouterGraph.prototype.addBox = function(box){
        assert(box != null, "ARGraph.addBox: box != null FAILED");
        assert(box instanceof AutoRouterBox, "ARGraph.addBox: box instanceof AutoRouterBox FAILED");
        if (box === null)
            return;

        var rect = box.getRect();

        this._disconnectPathsClipping(rect);

        box.setOwner(this);
        var boxId = this._getBoxCount().toString();
        while( boxId.length < 6 ){
            boxId = "0" + boxId;
        }
        boxId = "BOX_" + boxId;
        box.setID(boxId);

        this.boxes[boxId] = box;

        this._addBoxAndPortEdges(box);

        //add children of the box
        var children = box.getChildren(),
            i = children.length;
        while(i--){
            this.addBox(children[i]);
        }
    };

    AutoRouterGraph.prototype.deleteBox = function(box){
        assert(box != null, "ARGraph.deleteBox: box != null FAILED");
        if (box === null)
            return;

        if( box.hasOwner() )
        {
            var mother = box.getParent(),
                children = box.getChildren(),
                i = children.length;

            //notify the mother of the deletion
            if(mother)
                mother.removeChild(box);

            //remove children
            while(i--){
                this.deleteBox(children[i]);
            }
            this._remove(box);
        }

        box.destroy();
        box = null;
    };

    AutoRouterGraph.prototype.shiftBoxBy = function(box, offset){
        assert(box !== null, "ARGraph.shiftBoxBy: box != null FAILED");
        if (box === null)
            return;

        var rect = this.box2bufferBox[box.getID()].box,
            children = box.getChildren(),
            i = children.length;

        this._disconnectPathsClipping(rect); //redraw all paths clipping parent box.

        this._deleteBoxAndPortEdges(box);

        box.shiftBy(offset);
        this._addBoxAndPortEdges(box);

        rect = box.getRect();
        this._disconnectPathsClipping(rect);
        this._disconnectPathsFrom(box);

        while(i--){
            this.shiftBoxBy(children[i], offset);
        }
    };

    AutoRouterGraph.prototype.setBoxRect = function(box, rect){
        if (box === null)
            return;

        this._deleteBoxAndPortEdges(box);
        box.setRect(rect);
        this._addBoxAndPortEdges(box);

        this._disconnectPathsClipping(rect);
    };

    AutoRouterGraph.prototype.autoRoute = function(){
        this._connectAllDisconnectedPaths();

        var updated = 0,
            last = 0,       // identifies the last change to the path
            c = 100,		// max # of total op
            dm = 10,		// max # of distribution op
            d = 0;

        while( c > 0 )
        {
            if( c > 0 )
            {
                if( last === 1 )
                    break;

                c--;
                if( this._simplifyPaths() )
                {
                    updated = 1;
                    last = 1;
                }
            }

            if( c > 0 )
            {
                if( last === 2 )
                    break;

                c--;
                if( this.horizontal.block_ScanBackward() )
                {
                    updated = 1;

                    do {
                        c--;
                    } while( c > 0 && this.horizontal.block_ScanBackward() );

                    if( last < 2 || last > 5 )
                        d = 0;
                    else if( ++d >= dm )
                        break;

                    last = 2;
                }
            }

            if( c > 0 )
            {
                if( last === 3 )
                    break;

                c--;
                if( this.horizontal.block_ScanForward() )
                {
                    updated = 1;

                    do {
                        c--;
                    } while( c > 0 && this.horizontal.block_ScanForward() );

                    if( last < 2 || last > 5 )
                        d = 0;
                    else if( ++d >= dm )
                        break;

                    last = 3;
                }
            }

            if( c > 0 )
            {
                if( last === 4 )
                    break;

                c--;
                if( this.vertical.block_ScanBackward() )
                {
                    updated = 1;

                    do
                        c--;
                    while( c > 0 && this.vertical.block_ScanBackward() ); 

                    if( last < 2 || last > 5 )
                        d = 0;
                    else if( ++d >= dm )
                        break;

                    last = 4;
                }
            }

            if( c > 0 )
            {
                if( last === 5 )
                    break;

                c--;
                if( this.vertical.block_ScanForward() )
                {
                    updated = 1;

                    do
                        c--;
                    while( c > 0 && this.vertical.block_ScanForward() );

                    if( last < 2 || last > 5 )
                        d = 0;
                    else if( ++d >= dm )
                        break;

                    last = 5;
                }
            }

            if( c > 0 )
            {
                if( last === 6 )
                    break;

                c--;
                if( this.horizontal.block_SwitchWrongs() )
                {
                    updated = 1;
                    last = 6;
                }
            }

            if( c > 0 )
            {
                if( last === 7 )
                    break;

                c--;
                if( this.vertical.block_SwitchWrongs() )
                {
                    updated = 1;
                    last = 7;
                }
            }

            if( last === 0 )
                break;
        }

        if( c <= 0 )
        {
            // MessageBeep(MB_ICONEXCLAMATION);
            updated = -1;
        }

        // Check customized connection if there's any clip against boxes
        var pathiter = 0,
            path,
            startBoxRect,
            endBoxRect,
            boxRect,
            isStartOrEndRect;

        //		HRESULT hr = S_OK;
        while (pathiter < this.paths.length)
        {
            path = this.paths[pathiter];

            if (path.isAutoRouted()) {	// comment this if you want the check to run for fully customizable connections

                if (path.areTherePathCustomizations())
                {
                    startBoxRect = path.getStartBox();
                    endBoxRect = path.getEndBox();

                    for(var box in this.boxes){
                        if(this.boxes.hasOwnProperty(box)){
                            boxRect = this.boxes[box].getRect();
                            isStartOrEndRect = (!startBoxRect.isRectEmpty() && isRectIn(startBoxRect, boxRect) ||
                                    !endBoxRect.isRectEmpty() && isRectIn(endBoxRect, boxRect));

                            if (path.isPathClip(boxRect, isStartOrEndRect))
                            {
                                //path->MarkPathCustomizationsForDeletion(aspect); //The aspect is related to the GUI
                                updated = -2;
                            }

                        }
                    }
                }
            }
            pathiter++;
        }

        _logger.info("c has been decremented " + (100 - c) + " times\nlast is " + last + 
                "\nd is " + d + "\ndm is " + dm);
        return updated;
    };

    AutoRouterGraph.prototype.deletePath = function(path){
        assert(path != null, "ARGraph.deletePath: path != null FAILED");
        if (path === null)
            return;

        if( path.hasOwner() )
        {
            assert( path.getOwner() === this, "ARGraph.deletePath: path.getOwner() === this FAILED");

            this._remove(path);
        }

        path.destroy();
    };

    AutoRouterGraph.prototype.deleteAll = function(addBackSelfEdges){
        this._deleteAllPaths();
        this._deleteAllBoxes();
        this._deleteAllEdges();
        if (addBackSelfEdges)
            this._addSelfEdges();
    };

    AutoRouterGraph.prototype.getPathAt = function(point, nearness){
        var iter = 0,
            path;

        while (iter < this.paths.length)
        {
            path = this.paths[iter];

            if( path.isPathAt(point, nearness) )
                return path;

            ++iter;
        }

        return null;
    };

    AutoRouterGraph.prototype.addPath = function(isAutoRouted, startports, endports){
        var path = new AutoRouterPath();

        path.setAutoRouting(isAutoRouted);
        path.setStartPorts(startports);
        path.setEndPorts(endports);
        this._add(path);

        return path;
    };

    AutoRouterGraph.prototype.isEdgeFixed = function(path, startpoint, endpoint){
        var d = getDir(endpoint.minus(startpoint)),
            h = isHorizontal(d),

            elist = this._getEdgeList(h),

            edge = elist.getEdge(path, startpoint, endpoint);
        if (edge != null)
            return edge.getEdgeFixed() && !edge.getEdgeCustomFixed();

        assert(false, "ARGraph.isEdgeFixed: FAILED");
        return true;
    };

    AutoRouterGraph.prototype.destroy = function(){
        this.deleteAll(false);

        this.horizontal.SetOwner(null);
        this.vertical.SetOwner(null);
    };

    AutoRouterGraph.prototype.assertValid = function(){
        var iter = 0;

        for(var box in this.boxes){
            if(this.boxes.hasOwnProperty(box)){
                assertValidBox(this.boxes[box]);
            }
        }

        var i = 0;

        while(i < this.paths.length)
        {
            assertValidPath(paths[i]);
            ++i;
        }
    };

    AutoRouterGraph.prototype.assertValidBox = function(box){
        box.assertValid();
        assert( box.getOwner().equals(this), "ARGraph.assertValidBox: box.getOwner().equals(this) FAILED");

        assert (this.boxes[box.getID()] !== undefined, "ARGraph.assertValidBox: this.boxes[box.getID()] !== undefined FAILED");
    };

    AutoRouterGraph.prototype.assertValidPath = function(path){
        path.assertValid();
        assert( path.getOwner().equals(this), "ARGraph.assertValidPath: path.getOwner().equals(this) FAILED");

        var iter = this.paths.indexOf(path);
        assert (iter != -1, "ARGraph.assertValidPath: iter != -1 FAILED");

        var pointList = path.getPointList(),
            startPort = path.getStartPort();

        assert(startPort != null, "ARGraph.assertValidPath: startPort != null FAILED");
        startPort.assertValid();
        var ownerBox = startPort.getOwner(),
            boxOwnerGraph = ownerBox.getOwner();
        assert( boxOwnerGraph.equals(this), "ARGraph.assertValidPath: boxOwnerGraph.equals(this) FAILED");
        ownerBox.assertValidPort(startPort);

        if( path.isConnected() )
            startPort.assertValidStartEndPoint(pointList[0], Dir_None, 1);

        var endPort = path.getEndPort();
        assert(endPort != null, "ARGraph.assertValidPath: endPort != null FAILED");
        endPort.assertValid();
        var ownerBox2 = endPort.getOwner();
        assert( ownerBox2.getOwner().equals(this), "ARGraph.assertValidPath: ownerBox2.getOwner().equals(this) FAILED");
        ownerBox2.assertValidPort(endPort);

        if( path.isConnected() )
        {
            var itr = pointList.length;
            endPort.assertValidStartEndPoint(pointList[--itr], Dir_None, 0);
        }
        else
        {
            assert( path.hasNoPoint(), "ARGraph.assertValidPath: path.hasNoPoint() FAILED" );
        }

        path.assertValidPoints();

        if( pointList.length !== 0)
        {
            assert( pointList.length >= 2, "ARGraph.assertValidPath: pointList.length >= 2 FAILED" );
            var pos = 0;
            assert( pos != pointList.length, "ARGraph.assertValidPath: pos != pointList.length FAILED");

            assert( isPointInBox(pointList[pos++]), "ARGraph.assertValidPath: isPointInBox(pointList[pos++]) FAILED");

            var p;
            while( pos < pointList.length)
            {
                p = pointList[pos++];
                if( pos != pointList.length)
                    assert( !isPointInBox(p), "ARGraph.assertValidPath: !isPointInBox(p) FAILED");
                else
                    assert( isPointInBox(p), "ARGraph.assertValidPath: isPointInBox(p) FAILED" );
            }
        }
    };

    AutoRouterGraph.prototype.dumpPaths = function(pos, c){
        console.log("Paths dump pos " + pos + ", c " + c);
        var iter = 0,
            i = 0;

        while (iter < this.paths.length)
        {
            console.log(i + ". Path: ");
            (paths[iter]).getPointList().dumpPoints("DumpPaths");

            ++iter;
            i++;
        }

    };

    AutoRouterGraph.prototype.dumpEdgeLists = function(){
        horizontal.dumpEdges("Horizontal edges:");
        vertical.dumpEdges("Vertical edges:");
    };

    // AutoRouterPath
    var AutoRouterPath = function (){
        this.owner = null;
        this.startpoint;
        this.endpoint;
        this.startports;
        this.endports;
        this.startport = null;
        this.endport = null;
        this.attributes = ARPATH_Default;
        this.state = ARPATHST_Default;
        this.isAutoRoutingOn = true;
        this.customPathData = [];
        this.customizationType = "Points";
        this.pathDataToDelete = [];
        this.points = new ArPointListPath();
    };


    AutoRouterPath.prototype.Delete = function (){
        this.deleteAll();
        this.setOwner(null);
    };

    //----Points

    AutoRouterPath.prototype.getPointPosAt = function (point, nearness){
        var pos = 0,
            oldpos;

        while( pos < this.points.getLength() )
        {
            oldpos = pos;
            if( isPointNear(this.points[pos++], point, nearness) )
                return oldpos;
        }

        return this.points.getLength();
    };

    AutoRouterPath.prototype.getEdgePosAt = function (point, nearness){
        var tmp = this.points.getTailEdge(a, b),
            a = tmp.start,
            b = tmp.end,
            pos = tmp.pos;

        while( pos < this.points.getLength())
        {
            if( isPointNearLine(point, a, b, nearness) )
                return pos;

            tmp = this.points.getPrevEdge(pos, a, b);
            a = tmp.start;
            b = tmp.end;
            pos = tmp.pos;

        }

        return this.points.getLength();
    };

    AutoRouterPath.prototype.getOwner = function(){
        return this.owner;
    };

    AutoRouterPath.prototype.hasOwner = function(){
        return this.owner !== null;
    };

    AutoRouterPath.prototype.setOwner = function(newOwner){
        this.owner = newOwner;
    };

    AutoRouterPath.prototype.setStartPorts = function(newPorts){
        this.startports = newPorts;

        if(this.startport)
            this.calculateStartPorts();
    };

    AutoRouterPath.prototype.setEndPorts = function(newPorts){
        this.endports = newPorts;

        if(this.endport)
            this.calculateEndPorts();
    };

    AutoRouterPath.prototype.clearPorts = function(){
        this.startport = null;
        this.endport = null;
    };

    AutoRouterPath.prototype.getStartPort = function(){
        assert(this.startports.length, "ARPort.getStartPort: Can't retrieve start port.");
        return this.startport || this.startports[0];
    };

    AutoRouterPath.prototype.getEndPort = function(){
        assert(this.endports.length, "ARPort.getEndPort: Can't retrieve end port.");
        return this.endport || this.endports[0];
    };

    AutoRouterPath.prototype.getStartPorts = function(){
        return this.startports;
    };

    AutoRouterPath.prototype.getEndPorts = function(){
        return this.endports;
    };

    AutoRouterPath.prototype.calculateStartEndPorts = function(){
        return {'src': this.calculateStartPorts(), 'dst': this.calculateEndPorts() };
    };

    AutoRouterPath.prototype.calculateStartPorts = function(){
        var srcPorts = [],
            tgt,
            i = this.startports.length,
            result = null;

        assert(this.startports.length > 0, "ArPath.calculateStartEndPorts: this.startports cannot be empty!");

        //Remove this.startpoint
        if(this.startport && this.startport.hasPoint(this.startpoint))
            this.startport.removePoint(this.startpoint);

        //Get available ports
        while(i--){
            assert(this.startports[i].getOwner(), "ARPath.calculateStartEndPorts: this.startport has invalid this.owner!");
            if(this.startports[i].isAvailable())
                srcPorts.push(this.startports[i]);
        }

        if(srcPorts.length === 0)
            srcPorts = this.startports;

        //Preventing same start/this.endport
        if(this.endport && srcPorts.length > 1){
            i = srcPorts.length;
            while(i--){
                if(srcPorts[i] === this.endport)
                    srcPorts.splice(i, 1);
            }
        }


        //Getting target
        var pt;
        if(this.customPathData.length){
            tgt = new ArPoint(this.customPathData[0].getX(), this.customPathData[0].getY());
        }else{
            var x = 0,
                y = 0;

            i = this.endports.length;
            while(i--){
                pt = this.endports[i].getRect().getCenter();
                x += pt.x;
                y += pt.y;
            }
            tgt = new ArPoint(x/this.endports.length, y/this.endports.length);
        }

        //Get the optimal port to the target
        this.startport = getOptimalPorts(srcPorts, tgt);

        //Create a this.startpoint at the port
        var startdir = this.getStartDir(),
            startportHasLimited = false,
            startportCanHave = true;

        if (startdir !== Dir_None) {
            startportHasLimited = this.startport.hasLimitedDirs();
            startportCanHave = this.startport.canHaveStartEndPointOn(startdir, true);
        }
        if( startdir === Dir_None ||							// recalc startdir if empty
                startportHasLimited && !startportCanHave){		// or is limited and userpref is invalid
            startdir = this.startport.getStartEndDirTo(tgt, true);
        }

        this.startpoint = this.startport.createStartEndPointTo(tgt, startdir);
        return this.startport;
    };

    AutoRouterPath.prototype.calculateEndPorts = function(){
        var dstPorts = [],
            tgt,
            i = this.endports.length,
            result = null;

        assert(this.endports.length > 0, "ArPath.calculateStartEndPorts: this.endports cannot be empty!");

        //Remove old this.endpoint
        if(this.endport && this.endport.hasPoint(this.endpoint))
            this.endport.removePoint(this.endpoint);

        //Get available ports
        while(i--){
            assert(this.endports[i].getOwner(), "ARPath.calculateStartEndPorts: this.endport has invalid this.owner!");
            if(this.endports[i].isAvailable())
                dstPorts.push(this.endports[i]);
        }

        if(dstPorts.length === 0)
            dstPorts = this.endports;

        //Preventing same start/this.endport
        if(this.startport && dstPorts.length > 1){
            i = dstPorts.length;
            while(i--){
                if(dstPorts[i] === this.startport)
                    dstPorts.splice(i, 1);
            }
        }

        //Getting target
        var pt;
        if(this.customPathData.length){
            i = this.customPathData.length - 1;
            tgt = new ArPoint(this.customPathData[i].getX(), this.customPathData[i].getY());
        }else{
            var x = 0,
                y = 0;

            i = this.startports.length;
            while(i--){
                pt = this.startports[i].getRect().getCenter();
                x += pt.x;
                y += pt.y;
            }
            tgt = new ArPoint(x/this.startports.length, y/this.startports.length);
        }

        //Get the optimal port to the target
        this.endport = getOptimalPorts(dstPorts, tgt);

        //Create this.endpoint at the port
        var enddir = this.getEndDir(),
            startdir = this.getStartDir(),
            endportHasLimited = false,
            endportCanHave = true;

        if (enddir !== Dir_None) {
            endportHasLimited = this.endport.hasLimitedDirs();
            endportCanHave = this.endport.canHaveStartEndPointOn(enddir, false);
        }
        if( enddir === Dir_None ||							// like above
                endportHasLimited && !endportCanHave){
            enddir = this.endport.getStartEndDirTo(tgt, false, this.startport === this.endport ? startdir : Dir_None );
        }

        this.endpoint = this.endport.createStartEndPointTo(tgt, enddir);
        return this.endport;
    };

    AutoRouterPath.prototype.isConnected = function(){
        return (this.state & ARPATHST_Connected) != 0;
    };

    AutoRouterPath.prototype.addTail = function(pt){
        assert( !this.isConnected(), "ARPath.addTail: !this.isConnected() FAILED");
        if(!(pt instanceof Array)){
            pt = [pt];
        }
        this.points.push(pt);
    };

    AutoRouterPath.prototype.deleteAll = function(){
        this.points = new ArPointListPath();
        this.state = ARPATHST_Default;
    };

    AutoRouterPath.prototype.hasNoPoint = function(){
        return this.points.getLength() === 0;
    };

    AutoRouterPath.prototype.getPointCount = function(){
        return this.points.getLength();
    };

    AutoRouterPath.prototype.getStartPoint = function(){
        //assert( this.points.getLength() >= 2, "ARPath.getStartPoint: this.points.getLength() >= 2 FAILED");
        if(this.points.getLength())
            assert(this.startpoint === this.points.get(0)[0], "ARPath.getEndPoint: this.startpoint === this.points.get(0)[0] FAILED");

        return this.startpoint;
    };

    AutoRouterPath.prototype.getEndPoint = function(){
        if(this.points.getLength())
            assert(this.endpoint === this.points.get(this.points.getLength() - 1)[0], "ARPath.getEndPoint: this.endpoint === this.points.get(this.points.getLength() - 1)[0] FAILED");

        return this.endpoint;
    };

    AutoRouterPath.prototype.getStartBox = function(){
        var startbox = this.startport.getOwner();
        return startbox.getRect();
    };

    AutoRouterPath.prototype.getEndBox = function(){
        var endbox = this.endport.getOwner();
        return endbox.getRect();
    };

    AutoRouterPath.prototype.getOutOfBoxStartPoint = function(hintDir){
        var startBoxRect = this.getStartBox();

        assert( hintDir != Dir_Skew, "ARPath.getOutOfBoxStartPoint: hintDir != Dir_Skew FAILED"  );
        assert( this.points.getLength() >= 2, "ARPath.getOutOfBoxStartPoint: this.points.getLength() >= 2 FAILED" );

        var pos = 0,
            p = new ArPoint(this.points.get(pos++)[0]),
            d = getDir(this.points.get(pos)[0].minus(p));

        if (d === Dir_Skew)
            d = hintDir;
        assert( isRightAngle(d), "ARPath.getOutOfBoxStartPoint: isRightAngle(d) FAILED");

        if(isHorizontal(d))
            p.x = getRectOuterCoord(startBoxRect, d);
        else
            p.y = getRectOuterCoord(startBoxRect, d);

        //assert( getDir(this.points.get(pos)[0].minus(p)) === reverseDir( d ) || getDir(this.points.get(pos)[0].minus(p)) === d, "getDir(this.points.get(pos)[0].minus(p)) === reverseDir( d ) || getDir(this.points.get(pos)[0].minus(p)) === d FAILED");

        return p;
    };

    AutoRouterPath.prototype.getOutOfBoxEndPoint = function(hintDir){
        var endBoxRect = this.getEndBox();

        assert( hintDir != Dir_Skew, "ARPath.getOutOfBoxEndPoint: hintDir != Dir_Skew FAILED" );
        assert( this.points.getLength() >= 2, "ARPath.getOutOfBoxEndPoint: this.points.getLength() >= 2 FAILED");

        var pos = this.points.getLength() - 1,
            p = new ArPoint(this.points.get(pos--)[0]),
            d = getDir(this.points.get(pos)[0].minus(p));

        if (d === Dir_Skew)
            d = hintDir;
        assert( isRightAngle(d), "ARPath.getOutOfBoxEndPoint: isRightAngle(d) FAILED");

        if(isHorizontal(d))
            p.x = getRectOuterCoord(endBoxRect, d);
        else
            p.y = getRectOuterCoord(endBoxRect, d);

        //assert( getDir(this.points.get(pos)[0].minus(p)) === reverseDir( d ) || getDir(this.points.get(pos)[0].minus(p)) === d, "ARPath.getOutOfBoxEndPoint: getDir(this.points.get(pos)[0].minus(p)) === d || getDir(this.points.get(pos)[0].minus(p)) === d FAILED");

        return p;
    };

    AutoRouterPath.prototype.simplifyTrivially = function(){
        assert( !this.isConnected(), "ARPath.simplifyTrivially: !isConnected() FAILED" );

        if( this.points.getLength() <= 2 ){
            return;
        }

        var pos = 0,
            pos1 = pos;

        assert( pos1 != this.points.getLength(), "ARPath.simplifyTrivially: pos1 != this.points.getLength() FAILED");
        var p1 = this.points.get(pos++)[0],
            pos2 = pos;

        assert( pos2 != this.points.getLength(), "ARPath.simplifyTrivially: pos2 != this.points.getLength() FAILED" );
        var p2 = this.points.get(pos++)[0],
            dir12 = getDir(p2.minus(p1)),
            pos3 = pos;

        assert( pos3 != this.points.getLength(), "ARPath.simplifyTrivially: pos3 != this.points.getLength() FAILED");
        var p3 = this.points.get(pos++)[0],
            dir23 = getDir(p3.minus(p2));

        for(;;)
        {
            if( dir12 === Dir_None || dir23 === Dir_None ||
                    (dir12 != Dir_Skew && dir23 != Dir_Skew &&
                     (dir12 === dir23 || dir12 === reverseDir(dir23)) ) )
            {
                this.points.splice(pos2, 1);
                pos--;
                pos3--;
                dir12 = getDir(p3.minus(p1));
            }
            else
            {
                pos1 = pos2;
                p1 = p2;
                dir12 = dir23;
            }

            if( pos === this.points.getLength() ){
                return;
            }

            pos2 = pos3;
            p2 = p3;

            pos3 = pos;
            p3 = this.points.get(pos++)[0];

            dir23 = getDir(p3.minus(p2));
        }

        if(DEBUG)
            this.assertValidPoints();
    };

    AutoRouterPath.prototype.getPointList = function(){
        return this.points;
    };

    AutoRouterPath.prototype.setPoints = function(npoints){
        this.points = new ArPointListPath();
        var pos = 0;

        while(pos < npoints.getLength()){
            this.points.push(npoints.pos);
        }
    };

    AutoRouterPath.prototype.getSurroundRect = function(){
        var rect = new ArRect(INT_MAX,INT_MAX,INT_MIN,INT_MIN),
            pos = 0,
            point;

        while( pos < this.points.getLength())
        {
            point = this.points[pos++];

            rect.left = Math.min(rect.left, point.x);
            rect.ceil = Math.min(rect.ceil, point.y);
            rect.right = Math.max(rect.right, point.x);
            rect.floor = Math.max(rect.floor, point.y);
        }

        if( rect.left === INT_MAX || rect.top === INT_MAX ||
                rect.right === INT_MIN || rect.bottom === INT_MIN )
        {
            rect.setRectEmpty();
        }

        return rect;
    };

    AutoRouterPath.prototype.isEmpty = function(){
        return this.points.getLength() === 0;
    };

    AutoRouterPath.prototype.isPathAt = function(pt, nearness){
        return this.getEdgePosAt(point, nearness) != this.points.getLength()();
    };

    AutoRouterPath.prototype.isPathClip = function(r, isStartOrEndRect){
        var tmp = this.points.getTailEdge(a, b),
            a = tmp.start,
            b = tmp.end,
            pos = tmp.pos,
            i = 0,
            numEdges = this.points.getLength() - 1;

        while( pos >= 0)
        {
            if( isStartOrEndRect && ( i === 0 || i === numEdges - 1 ) )
            {
                if (isPointIn(a, r, 1) &&
                        isPointIn(b, r, 1))
                {
                    return true;
                }
            }
            else if( isLineClipRect(a, b, r) )
            {
                return true;
            }

            tmp = this.points.getPrevEdge(pos, a, b);
            a = tmp.start;
            b = tmp.end;
            pos = tmp.pos;
            i++;
        }

        return false;
    };

    AutoRouterPath.prototype.setAttributes = function(attr){
        this.attributes = attr;
    };

    AutoRouterPath.prototype.getAttributes = function(){
        return this.attributes;
    };

    AutoRouterPath.prototype.isFixed = function(){
        return ((this.attributes & ARPATH_Fixed) != 0);
    };

    AutoRouterPath.prototype.isMoveable = function(){
        return ((this.attributes & ARPATH_Fixed) === 0);
    };

    AutoRouterPath.prototype.isHighLighted = function(){
        return ((this.attributes & ARPATH_HighLighted) != 0);
    };

    AutoRouterPath.prototype.getState = function(){
        return this.state;
    };

    AutoRouterPath.prototype.setState = function(s){
        assert( this.owner !== null, "ARPath.setState: this.owner !== null FAILED");

        this.state = s;
        if(DEBUG)
            this.assertValid();
    };

    AutoRouterPath.prototype.getEndDir = function(){
        var a = this.attributes & ARPATH_EndMask;
        return	a & ARPATH_EndOnTop ? Dir_Top :
            a & ARPATH_EndOnRight ? Dir_Right :
            a & ARPATH_EndOnBottom ? Dir_Bottom :
            a & ARPATH_EndOnLeft ? Dir_Left : Dir_None;
    };

    AutoRouterPath.prototype.getStartDir = function(){
        var a = this.attributes & ARPATH_StartMask;
        return	a & ARPATH_StartOnTop ? Dir_Top :
            a & ARPATH_StartOnRight ? Dir_Right :
            a & ARPATH_StartOnBottom ? Dir_Bottom :
            a & ARPATH_StartOnLeft ? Dir_Left : Dir_None;
    };

    AutoRouterPath.prototype.setEndDir = function(arpath_end){
        this.attributes = (this.attributes & ~ARPATH_EndMask) + arpath_end;
    };

    AutoRouterPath.prototype.setStartDir = function(arpath_start){
        this.attributes = (this.attributes & ~ARPATH_StartMask) + arpath_start;
    };

    AutoRouterPath.prototype.setCustomPathData = function(pDat){
        this.customPathData = pDat;

        //Disconnect path
        this.owner.disconnect(this);
    };

    AutoRouterPath.prototype.applyCustomizationsBeforeAutoConnectPoints = function(){
        var plist = [];

        if (this.customPathData.length === 0)
            return;

        var i = 0,
            pt;

        while( i < this.customPathData.length ){
            if( this.customPathData[i].getType() === CustomPointCustomization ){
                pt = new ArPoint();
                pt.x = this.customPathData[i].getX();
                pt.y = this.customPathData[i].getY();
                plist.push( [ pt ] );
            }

            ++i;
        }

        return plist;
    };

    AutoRouterPath.prototype.applyCustomizationsAfterAutoConnectPointsAndStuff = function(){
        //This sets customizations of the type "SimpleEdgeDisplacement"
        if (this.customPathData.length === 0)
            return;

        var numEdges = this.points.getLength() - 1;
        if (this.isAutoRoutingOn) {
            var ii = 0;
            while (ii < this.customPathData.length){
                if ((this.customPathData[ii]).getEdgeCount() != numEdges &&
                        (this.customPathData[ii]).getType() === SimpleEdgeDisplacement)
                {
                    this.pathDataToDelete.push(this.customPathData[ii]);
                    this.customPathData.splice(ii, 1);
                } else {
                    ++ii;
                }
            }
        }

        var currEdgeIndex = 0,
            tmp = this.points.getHeadEdgePtrs(),
            end = tmp.end,
            start = tmp.start,
            pos = tmp.pos,
            isHorizontalVar,
            doNotApply,
            increment,
            dir,
            xToSet,
            yToSet,
            startRect,
            endRect,
            minLimit,
            maxLimit,
            valueToSet,
            ii;

        while (pos < this.points.getLength()){
            ii = 0;
            while (ii < this.customPathData.length) {
                increment = true;
                if (currEdgeIndex === (this.customPathData[ii]).getEdgeIndex()) {
                    if ((this.customPathData[ii]).getType() === SimpleEdgeDisplacement) {
                        dir = getDir(end.minus(start));
                        isHorizontalVar = (isHorizontal(dir) != 0);
                        doNotApply = false;
                        if ((this.customPathData[ii]).isHorizontalOrVertical() === isHorizontalVar) {
                            xToSet = (this.customPathData[ii]).getX();
                            yToSet = (this.customPathData[ii]).getY();
                            // Check if the edge displacement at the end of the path
                            // is still within the boundary limits of the start or the end box
                            if (currEdgeIndex === 0 || currEdgeIndex === numEdges - 1) {
                                startRect = this.startport.getRect();
                                    endRect = this.endport.getRect();
                                    minLimit = (currEdgeIndex === 0 ?
                                            ((this.customPathData[ii]).IsHorizontalOrVertical() ? startRect.ceil : startRect.left) :
                                            ((this.customPathData[ii]).IsHorizontalOrVertical() ? endRect.ceil : endRect.left));
                                    maxLimit = (currEdgeIndex === 0 ?
                                            ((this.customPathData[ii]).IsHorizontalOrVertical() ? startRect.floor : startRect.right) :
                                            ((this.customPathData[ii]).IsHorizontalOrVertical() ? endRect.floor : endRect.right));
                                    valueToSet = (this.customPathData[ii]).IsHorizontalOrVertical() ? yToSet : xToSet;
                                if (valueToSet < minLimit || valueToSet > maxLimit)
                                    doNotApply = true;
                            }
                            if (!doNotApply) {
                                if ((this.customPathData[ii]).isHorizontalOrVertical()) {
                                    start.y = yToSet;
                                    end.y = yToSet;
                                } else {
                                    start.x = xToSet;
                                    end.x = xToSet;
                                }
                            }
                        }
                        if ((this.customPathData[ii]).isHorizontalOrVertical() != isHorizontalVar || doNotApply) {
                            // something went wrong, invalid data: direction (horz/vert) not match
                            //						assert(false);
                            this.pathDataToDelete.push(this.customPathData[ii]);
                            this.customPathData.splice(ii, 1);
                            increment = false;
                        }
                    }
                }
                if (increment)
                    ++ii;
            }

            tmp = this.points.getNextEdgePtrs(pos, start, end);
            pos = tmp.pos;
            start = tmp.start;
            end = tmp.end;

            currEdgeIndex++;
        }
    };

    AutoRouterPath.prototype.removePathCustomizations = function(){
        var ii = 0;
        while(ii < this.customPathData.length){
            this.pathDataToDelete.push(this.customPathData[ii++]);
        }
        this.customPathData = [];
    };

    AutoRouterPath.prototype.markPathCustomizationsForDeletion = function(asp){
        var ii = 0;
        while (ii < this.customPathData.length) {
            if ((this.customPathData[ii]).getAspect() === asp)
                this.pathDataToDelete.push(this.customPathData[ii]);
            ++ii;
        }
    };

    AutoRouterPath.prototype.removeInvalidPathCustomizations = function(asp){
        // We only inhibit/delete those edges, which has an edge count
        // (redundant data intended for this very sanity check)
        // doesn't equal to edge count
        var ii = 0,
            numEdges = this.points.getLength() - 1;
        while (ii < this.customPathData.length) {
            if ((this.customPathData[ii]).getAspect() === asp) {
                if ((this.customPathData[ii]).getEdgeCount() != numEdges &&
                        (this.customPathData[ii]).getType() === SimpleEdgeDisplacement)
                {
                    this.customPathData.splice(ii, 1);
                } else {
                    ++ii;
                }
            } else {
                ++ii;
            }
        }
    };

    AutoRouterPath.prototype.areTherePathCustomizations = function(){
        return this.customPathData.length !== 0;
    };

    AutoRouterPath.prototype.areThereDeletedPathCustomizations = function(){
        return this.pathDataToDelete.length !== 0;
    };

    AutoRouterPath.prototype.getDeletedCustomPathData = function(cpd){
        var ii = 0;
        while(ii < this.pathDataToDelete.length){
            cpd.push(this.pathDataToDelete[ii++]);
        }
    };

    AutoRouterPath.prototype.getCustomizedEdgeIndexes = function(indexes){
        indexes = [];
        var ii = 0,
            edgeIndex;

        while(ii < this.customPathData.length)
        {
            if (this.isAutoRouted() && (this.customPathData[ii]).getType() === SimpleEdgeDisplacement ||
                    !this.isAutoRouted() && (this.customPathData[ii]).getType() != SimpleEdgeDisplacement)
            {
                edgeIndex = (this.customPathData[ii]).getEdgeIndex();
                indexes.push(edgeIndex);
            }
            ++ii;
        }
    };

    AutoRouterPath.prototype.isAutoRouted = function(){
        return this.isAutoRoutingOn;
    };

    AutoRouterPath.prototype.setAutoRouting = function(arState){
        this.isAutoRoutingOn = arState;
    };

    AutoRouterPath.prototype.destroy = function(){
        if( this.isConnected() ){
            this.getStartPort().removePoint(this.getStartPoint());
            this.getEndPort().removePoint(this.getEndPoint());
        }

    };

    AutoRouterPath.prototype.assertValid = function(){
        if( this.startport !== null )
            this.startport.assertValid();

        if( this.endport !== null )
            this.endport.assertValid();

        if( this.isConnected() ){
            assert( this.points.getLength() !== 0, "ARPath.assertValid: this.points.getLength() !== 0 FAILED" );
            var i = 0,
                point;
                ppoint;

            while(i++ < this.getPointCount()){
                point = this.getPointList().get(i)[0];
                ppoint = this.getPointList().get(i-1)[0];

                if(point.x !== ppoint.x && point.y !== ppoint.y)
                    assert(false, "Path.assertValid: Path is not valid");
            }

        }else{
            assert( this.points.getLength() === 0, "ARPath.assertValid: this.points.getLength() === 0 FAILED");
        }
    };

    AutoRouterPath.prototype.assertValidPoints = function(){
    };

    var AutoRouterPort = function (){
        this.owner = null;
        this.limitedDirections = true;
        this.rect = new ArRect();
        this.attributes = ARPORT_Default;
        this.points = [ [], [], [], [] ];//For this.points on Dir_Top, Dir_Left, Dir_Right, etc
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
        return (this.attributes & ARPORT_ConnectToCenter) != 0;
    };

    AutoRouterPort.prototype.hasLimitedDirs = function (){
        return this.limitedDirections;
    };

    AutoRouterPort.prototype.setLimitedDirs = function (ltd){
        this.limitedDirections = ltd;
    };

    AutoRouterPort.prototype.isPortAt = function (point, nearness){
        return isPointIn(point, this.rect, nearness);
    };

    AutoRouterPort.prototype.isPortClip = function (otherRect){
        return isRectClip(this.rect, otherRect);
    };

    AutoRouterPort.prototype.isPortIn = function (otherRect){
        return isRectIn(this.rect, otherRect);
    };

    AutoRouterPort.prototype.port_OnWhichEdge = function (point){
        return onWhichEdge(this.rect, point);
    };

    AutoRouterPort.prototype.canHaveStartEndPointOn = function (dir, isStart){
        assert( 0 <= dir && dir <= 3, "ARPort.canHaveStartEndPointOn: 0 <= dir && dir <= 3 FAILED!");

        if( isStart)
            dir += 4;

        return ((this.attributes & (1 << dir)) != 0);
    };

    AutoRouterPort.prototype.canHaveStartEndPoint = function (isStart){
        return ((this.attributes & (isStart ? ARPORT_StartOnAll : ARPORT_EndOnAll)) != 0);
    };

    AutoRouterPort.prototype.canHaveStartEndPointHorizontal = function (isHorizontal){
        return ((this.attributes & (isHorizontal ? ARPORT_StartEndHorizontal : ARPORT_StartEndVertical)) != 0);
    };

    AutoRouterPort.prototype.getStartEndDirTo = function (point, isStart, notthis){
        assert( !this.rect.isRectEmpty(), "ARPort.getStartEndDirTo: !this.rect.isRectEmpty() FAILED!");

        notthis = notthis ? notthis : Dir_None; //if notthis is undefined, set it to Dir_None (-1)

        var offset = point.minus(this.rect.getCenterPoint()),
            canHave = false,
            dir1 = getMajorDir(offset);

        if(dir1 !== notthis && this.canHaveStartEndPointOn(dir1, isStart))
            return dir1;

        var dir2 = getMinorDir(offset);

        if(dir2 !== notthis && this.canHaveStartEndPointOn(dir2, isStart))
            return dir2;

        var dir3 = reverseDir(dir2);

        if(dir3 !== notthis && this.canHaveStartEndPointOn(dir3, isStart))
            return dir3;

        var dir4 = reverseDir(dir1);

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

        return Dir_Top;
    };

    AutoRouterPort.prototype.canCreateStartEndPointAt = function (point, isStart, nearness){
        return this.canHaveStartEndPoint(isStart) && isPointIn(point, this.rect, nearness);
    };

    AutoRouterPort.prototype.createStartEndPointAt = function (pt, isStart){
        assert( !this.rect.isRectEmpty(), "ARPort.createStartEndPointAt: !this.rect.isRectEmpty() FAILED!");

        var point = new ArPoint(p),
            dir = Dir_None,
            nearest = new ArFindNearestLine(point),
            canHave = false;

        if(this.canHaveStartEndPointOn(Dir_Top, isStart) && nearest.HLine(this.rect.left, this.rect.right, this.rect.ceil))
            dir = Dir_Top;

        if(this.canHaveStartEndPointOn(Dir_Right, isStart) && nearest.VLine(this.rect.ceil, this.rect.floor, this.rect.right))
            dir = Dir_Right;

        if(this.canHaveStartEndPointOn(Dir_Bottom, isStart) && nearest.HLine(this.rect.left, this.rect.right, this.rect.floor))
            dir = Dir_Bottom;

        if(this.canHaveStartEndPointOn(Dir_Left, isStart) && nearest.VLine(this.rect.ceil, this.rect.floor, this.rect.left ))
            dir = Dir_Left;

        assert(isRightAngle(dir), "ArPort.createStartEndPointAt: isRightAngle(dir) FAILED!");

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

            case Dir_Top:
                point.y = this.rect.ceil;
                break;

            case Dir_Right:
                point.x = this.rect.right;
                break;

            case Dir_Bottom:
                point.y = this.rect.floor;
                break;

            case Dir_Left:
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
        assert( isRightAngle(dir) , "ARPort.createStartEndPointOn: isRightAngle(dir) FAILED!");

        switch(dir) {

            case Dir_Top:
                return new ArPoint(this.roundToHalfGrid(this.rect.left, this.rect.right), this.rect.ceil);

            case Dir_Bottom:
                return new ArPoint(this.roundToHalfGrid(this.rect.left, this.rect.right), this.rect.floor);

            case Dir_Left:
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

            case Dir_Top:
                pathAngle = 2 * Math.PI - (pathAngle + Math.PI/2);
                largerPt.y = this.rect.ceil;
                break;

            case Dir_Right:
                pathAngle = 2 * Math.PI - pathAngle;
                smallerPt.x = this.rect.right;
                break;

            case Dir_Bottom:
                pathAngle -= Math.PI/2;
                smallerPt.y = this.rect.floor;
                break;

            case Dir_Left:
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
            distance = ED_MAXCOORD,
start,
end;

        //Find distance from each this.availableArea and store closest index
        while(i--){
            start = this.availableArea[i][0];
            end = this.availableArea[i][1];

            if(isOnEdge(start, end, resultPoint)){
                closestArea = -1;
                break;
            }else if(distanceFromLine(resultPoint, start, end) < distance){
                closestArea = i;
                distance = distanceFromLine(resultPoint, start, end);
            }
        }

        if(closestArea !== -1 && this.isAvailable()){ //resultPoint needs to be moved to the closest available area
            var dir2 = getDir(this.availableArea[closestArea][0].minus(resultPoint));

            assert(isRightAngle(dir2), "AutoRouterPort.createStartEndPointTo: isRightAngle(dir2) FAILED");

            if(dir2 === Dir_Left || dir2 === Dir_Top){ //Then resultPoint must be moved up
                largerPt = this.availableArea[closestArea][1];
            }else{ //Then resultPoint must be moved down
                smallerPt = this.availableArea[closestArea][0];
            }

            resultPoint = new ArPoint((largerPt.x + smallerPt.x)/2, (largerPt.y + smallerPt.y)/2);
        }

        this.points[dir].splice(k, 0, resultPoint);

        assert( isRightAngle( this.port_OnWhichEdge(resultPoint) ), "AutoRouterPort.createStartEndPointTo: isRightAngle( this.port_OnWhichEdge(resultPoint) FAILED");

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

        if(this.canHaveStartEndPointOn(Dir_Top))
            this.availableArea.push([this.rect.getTopLeft(),  new ArPoint(this.rect.right, this.rect.ceil)]);

        if(this.canHaveStartEndPointOn(Dir_Right))
            this.availableArea.push([new ArPoint(this.rect.right, this.rect.ceil),  this.rect.getBottomRight()]);

        if(this.canHaveStartEndPointOn(Dir_Bottom))
            this.availableArea.push([new ArPoint(this.rect.left, this.rect.floor),  this.rect.getBottomRight()]);

        if(this.canHaveStartEndPointOn(Dir_Left))
            this.availableArea.push([this.rect.getTopLeft(), new ArPoint(this.rect.left, this.rect.floor)]);

    };

    AutoRouterPort.prototype.adjustAvailableArea = function (r){
        //For all lines specified in availableAreas, check if the line intersects the rectangle
        //If it does, remove the part of the line that intersects the rectangle
        if(!this.rect.touching(r))
            return;

        var i = this.availableArea.length,
            intersection,
            line;

        while(i--){

            if(isLineClipRect(this.availableArea[i][0], this.availableArea[i][1], r)){
                line = this.availableArea.splice(i, 1)[0];
                intersection = getLineClipRectIntersect(line[0], line[1], r);

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

    var ArBoxObject = function(b, p){
        //Stores a box with ports used to connect to the box
        this.box = b;
        this.ports = p;
    };

    var ArPathObject = function(i, p, s, d){
        //Stores a path with ports used
        this.id = i;
        this.path = p;

        this.srcPorts = s;
        this.dstPorts = d;
        this.srcBox = this.calcBoxId(s);
        this.dstBox = this.calcBoxId(d);
    };


    ArPathObject.prototype.calcBoxId = function (ports){
        for(var i in ports){
            if(ports.hasOwnProperty(i) && ports[i].getOwner()){
                return ports[i].getOwner().getID();
            }
        }
    };

    ArPathObject.prototype.getSrcPorts = function(){
        return this.srcPorts;
    };

    ArPathObject.prototype.getDstPorts = function(){
        return this.dstPorts;
    };

    ArPathObject.prototype.setSrcPort = function(index, port){
        assert(port instanceof AutoRouterPort, "ArPathObject.setSrcPort: port instanceof AutoRouterPort FAILED");
        this.srcPorts[index] = port;
    };

    ArPathObject.prototype.setDstPort = function(index, port){
        assert(port instanceof AutoRouterPort, "ArPathObject.setDstPort: port instanceof AutoRouterPort FAILED");
        this.dstPorts[index] = port;
    };

    ArPathObject.prototype.setSrcPorts = function(s){
        this.srcPorts = s;
    };

    ArPathObject.prototype.setDstPorts = function(s){
        this.dstPorts = s;
    };

    ArPathObject.prototype.deleteSrcPort = function(index){
        delete this.srcPorts[index];
    };

    ArPathObject.prototype.deleteDstPort = function(index){
        delete this.dstPorts[index];
    };

    ArPathObject.prototype.getSrcBoxId = function(){
        if(this.srcPorts && this.calcBoxId(this.srcPorts))
            return this.srcBox;
        return null;
    };

    ArPathObject.prototype.getDstBoxId = function(){
        if(this.dstPorts && this.calcBoxId(this.dstPorts))
            return this.dstBox;
        return null;
    };

    ArPathObject.prototype.updateSrcPorts = function(){
        var src = [];

        for(var i in this.srcPorts){
            if(this.srcPorts.hasOwnProperty(i))
                assert( this.srcPorts[i] instanceof AutoRouterPort, "ArPathObject.updateSrcPorts: this.srcPorts[i] instanceof AutoRouterPort FAILED");
            src.push(this.srcPorts[i]);
        }

        this.path.setStartPorts(src);
        this.srcBox = this.calcBoxId(this.srcPorts);
    };

    ArPathObject.prototype.updateDstPorts = function(){
        var dst = [];

        for(var i in this.dstPorts){
            if(this.dstPorts.hasOwnProperty(i))
                assert( this.dstPorts[i] instanceof AutoRouterPort, "ArPathObject.updateDstPorts: this.dstPorts[i] instanceof AutoRouterPort FAILED");
            dst.push(this.dstPorts[i]);
        }

        this.path.setEndPorts(dst);
        this.dstBox = this.calcBoxId(this.dstPorts);
    };

    AutoRouter.prototype.clear = function(){
        this.router.deleteAll(true);
        this.paths = {};
        this.boxId2Path = {};
        this.pCount = 0;
    };

    AutoRouter.prototype.destroy = function(){
        this.router.destroy();
        this.router = null;
    };

    AutoRouter.prototype.addBox = function(size){
        //Need to make sure it has all the required size details...
        if(!((size.x1 !== undefined && size.x2 !== undefined ) || (size.width !== undefined && (size.x1 !== undefined || size.x2 !== undefined))) ||
                !((size.y1 !== undefined && size.y2 !== undefined) || (size.height !== undefined && (size.y1 !== undefined || size.y2 !== undefined))))
            throw "AutoRouter:addBox missing required size details to determine x1,x2,y1,y2 ("  + x1 + "," + x2 + "," + y1 + "," + y2 + ")";

        var x1 = size.x1 !== undefined ? size.x1 : (size.x2 - size.width),
            x2 = size.x2 !== undefined ? size.x2 : (size.x1 + size.width),
            y1 = size.y1 !== undefined ? size.y1 : (size.y2 - size.height),
            y2 = size.y2 !== undefined ? size.y2 : (size.y1 + size.height),
            connInfo = size.ConnectionInfo,
            box = this.router.createBox(),
            rect = new ArRect(x1, y1, x2, y2),
            p = [],
            port,
            r;

        box.setRect(rect);

        //Adding connection port
        p = this.addPort(box, connInfo);

        this.router.addBox(box);
        //this.boxes[box.getID()] = box;
        this.boxId2Path[ box.getID() ] = { 'in': [], 'out': [] };

        return new ArBoxObject(box, p);
    };

    AutoRouter.prototype.addPort = function(box, connAreas){
        //Adding a port to an already existing box (also called in addBox method)
        //Default is no connection ports (more relevant when creating a box)
        box = box instanceof ArBoxObject ? box.box : box;
        var port,
            r,
            p = {},
            x1 = box.getRect().left,
            y1 = box.getRect().ceil,
            x2 = box.getRect().right,
            y2 = box.getRect().floor;

        if(connAreas === undefined){
            return p;
        }else if(connAreas === "all"){//If "all" designated, I will add a 'virtual' port that allows connections on
            port = box.createPort(); // all sides
            r = new ArRect(x1 + 1, y1 + 1, x2 - 1, y2 - 1);
            port.setLimitedDirs(false);
            port.setRect(r);
            box.addPort(port);

            port.setAttributes(ARPORT_ConnectOnAll);

            p['0'] = port;
        }else{
            //A connection area is specified
            /* There are a couple possibilities here:
             *  1) Single connection specified
             *
             *  Possibilities:
             *  { 'incoming': 'outgoing': 'any': }
             *  "left", "right", "top", "bottom"
             *      [ [x1, y1], [x2, y2] ]
             *
             *  2) Multiple connections specified
             *  [{ 'incoming': 'outgoing': 'any': }, ... ]
             *      [ [ [x1, y1], [x2, y2] ], ... ]
             *
             * I will make them all 'multiple' connections
             *  then handle them the same
             *
             * This will need some revisions. TODO specifying
             * multiple connection areas with a variety of in/out specs
             * is clumsy. It isn't too bad unless you try to
             * set specific attributes.
             *
             */

            if(!(connAreas instanceof Array))
                connAreas = [connAreas];

            var i = connAreas.length;
            while (i--) {
                this._processConnArea(connAreas[i], x1, y1, x2, y2, box, p);
            }
        }

        //Returning the list of ports added to the box
        return p;
    };

    AutoRouter.prototype._processConnArea = function (connData, x1, y1, x2, y2, box, p) {
        var id = connData.id,
            angles = connData.angles, //Incoming angles. If defined, it will set attr at the end
            attr = 0, //Set by angles. Defaults to guessing by location if angles undefined
            type = "any", //Specify start, end, or any --Not fully implemented
            j = 0,
            port = box.createPort(),
            connArea = connData.area instanceof Array ?
                [ connData.area ] : //Line
                [ connData.any, connData.in || connData.incoming, connData.out || connData.outgoing ];

        var isStart = 17,
            arx1,
            arx2,
            ary1,
            ary2;

        var dceil,
            dfloor,
            dleft,
            dright,
            min;

        var _x1,
            _x2,
            _y1,
            _y2,
            horizontal;

        var r;

        var a1, //min angle
            a2, //max angle
            rightAngle = 0,
            bottomAngle = 90,
            leftAngle = 180,
            topAngle = 270;

        do
        {

            if(connArea[j] instanceof Array){
                isStart = 17;

                //This gives us a coefficient to multiply our attributes by to govern incoming
                //or outgoing connection. Now, the port needs only to determine the direction
                if(type !== "any"){
                    isStart -= (type === "start" ? 1 : 16);
                }

                if(connArea[j].length === 1 ){//using points to designate the connection RECTANGLE [ [x1, y1, x2, y2] ]
                    arx1 = connArea[j][0][0] + 1;
                    arx2 = connArea[j][0][1] - 1;
                    ary1 = connArea[j][0][2] + 1;
                    ary2 = connArea[j][0][3] - 1;

                    attr = (arx1  - 1 === x1 ? ARPORT_EndOnLeft * isStart : 0) +
                        (arx2 + 1 === x2 ? ARPORT_EndOnRight * isStart : 0) +
                        (ary1 - 1 === y1 ? ARPORT_EndOnTop * isStart : 0) +
                        (ary2 + 1 === y2 ? ARPORT_EndOnBottom * isStart : 0);

                }else if(connArea[j].length === 2 && connArea[j][0][0] != connArea[j][1][0] //connection RECTANGLE
                        && connArea[j][0][1] != connArea[j][1][1]) {//[ [x1, y1], [x2, y2] ]
                    arx1 = Math.min( connArea[j][0][0], connArea[j][1][0]) + 1;
                    arx2 = Math.max( connArea[j][0][0], connArea[j][1][0]) - 1;
                    ary1 = Math.min( connArea[j][0][1], connArea[j][1][1]) + 1;
                    ary2 = Math.max( connArea[j][0][1], connArea[j][1][1]) - 1;

                    arx1 = ( arx1 + arx2 )/2 - 2; //For now, we are simply creating a
                    arx2 = arx1 + 4; //connection point in the center of the rectangle
                    ary1 = ( ary1 + ary2 )/2 - 2;
                    ary2 = ary1 + 4;

                    dceil = Math.abs(ary1 - y1);
                    dfloor =  Math.abs(ary1 - y2);
                    dleft = Math.abs(arx1 - x1);
                    dright = Math.abs(arx1 - x2);
                    min = Math.min( dceil, dfloor, dleft, dright );

                    if( min === dceil )
                        attr = ARPORT_StartOnTop + ARPORT_EndOnTop;
                    if( min === dfloor )
                        attr = ARPORT_StartOnBottom + ARPORT_EndOnBottom;
                    if( min === dleft )
                        attr = ARPORT_StartOnLeft + ARPORT_EndOnLeft;
                    if( min === dright )
                        attr = ARPORT_StartOnRight + ARPORT_EndOnRight;


                    //attr = (arx1  - 1 === x1 ? ARPORT_EndOnLeft * isStart : 0) +
                    //   (arx2 + 1 === x2 ? ARPORT_EndOnRight * isStart : 0) +
                    //  (ary1 - 1 === y1 ? ARPORT_EndOnTop * isStart : 0) +
                    // (ary2 + 1 === y2 ? ARPORT_EndOnBottom * isStart : 0);

                }else{//using points to designate the connection area: [ [x1, y1], [x2, y2] ]
                    _x1 = Math.min( connArea[j][0][0], connArea[j][1][0]);
                    _x2 = Math.max( connArea[j][0][0], connArea[j][1][0]);
                    _y1 = Math.min( connArea[j][0][1], connArea[j][1][1]);
                    _y2 = Math.max( connArea[j][0][1], connArea[j][1][1]);
                    horizontal = _y1 === _y2;

                    //If it is a single point of connection, we will expand it to a rect
                    // We will determine that it is horizontal by if it is closer to a horizontal edges
                    // or the vertical edges
                    if(_y1 === _y2 && _x1 === _x2){
                        horizontal =  Math.min(Math.abs(y1 - _y1), Math.abs(y2 - _y2)) <
                            Math.min(Math.abs(x1 - _x1), Math.abs(x2 - _x2)) ;
                        if(horizontal)
                        {
                            _x1 -= 1;
                            _x2 += 1;
                        }
                        else
                        {
                            _y1 -= 1;
                            _y2 += 1;
                        }
                    }

                    assert(horizontal || _x1 === _x2, "AutoRouter:addBox Connection Area for box must be either horizontal or vertical");

                    arx1 = _x1;
                    arx2 = _x2;
                    ary1 = _y1;
                    ary2 = _y2;

                    if(horizontal){
                        if(Math.abs(_y1 - y1) < Math.abs(_y1 - y2)){ //Closer to the top (horizontal)
                            ary1 = _y1 + 1;
                            ary2 = _y1 + 5;
                            attr = ARPORT_StartOnTop + ARPORT_EndOnTop;
                        }else{ //Closer to the top (horizontal)
                            ary1 = _y1 - 5;
                            ary2 = _y1 - 1;
                            attr = ARPORT_StartOnBottom + ARPORT_EndOnBottom;
                        }


                    }else{
                        if(Math.abs(_x1 - x1) < Math.abs(_x1 - x2)){//Closer to the left (vertical)
                            arx1 += 1;
                            arx2 += 5;
                            attr = ARPORT_StartOnLeft + ARPORT_EndOnLeft;
                        }else {//Closer to the right (vertical)
                            arx1 -= 5;
                            arx2 -= 1;
                            attr = ARPORT_StartOnRight + ARPORT_EndOnRight;
                        }


                    }

                }
                //Check to make sure the width/height is at least 3 -> otherwise assert will fail in ARPort.setRect
                if(arx2 - arx1 < 3){
                    arx1 -= 2;
                    arx2 += 2;
                }
                //Check to make sure the width/height is at least 3 -> otherwise assert will fail in ARPort.setRect
                if(ary2 - ary1 < 3){
                    ary1 -= 2;
                    ary2 += 2;
                }

                assert(x1 < arx1 && y1 < ary1 && x2 > arx2 && y2 > ary2, "AutoRouter.addBox Cannot add port outside of the box");
                r = new ArRect(arx1, ary1, arx2, ary2);

                //If 'angles' is defined, I will use it to set attr
                if(angles[0] !== undefined && angles[1] !== undefined){
                    a1 = angles[0]; //min angle
                    a2 = angles[1]; //max angle

                    attr = 0; //Throw away our guess of attr

                    if( rightAngle >= a1 && rightAngle <= a2 )
                        attr += ARPORT_StartOnRight + ARPORT_EndOnRight;

                    if( topAngle >= a1 && topAngle <= a2 )
                        attr += ARPORT_StartOnTop + ARPORT_EndOnTop;

                    if( leftAngle >= a1 && leftAngle <= a2 )
                        attr += ARPORT_StartOnLeft + ARPORT_EndOnLeft;

                    if( bottomAngle >= a1 && bottomAngle <= a2 )
                        attr += ARPORT_StartOnBottom + ARPORT_EndOnBottom;
                }

            }else if(typeof connArea[j] === "string") //Using words to designate connection area
            {
                r = new ArRect(x1 + 1, y1 + 1, x2 - 1, y2 - 1);
                //connArea[j] = connArea[j].toLowerCase();
                attr = (connArea[j].indexOf("top") != -1 ?
                        //Connection area is on top
                        (( j % 2 === 0 ? ARPORT_StartOnTop : 0) + (j < 2 ? ARPORT_EndOnTop : 0)) : 0) +
                    //Connection area is on bottom
                    (connArea[j].indexOf("bottom") != -1 ?
                     (( j % 2 === 0 ? ARPORT_StartOnBottom : 0) + (j < 2 ? ARPORT_EndOnBottom : 0)) : 0) +
                    //Connection area is on left
                    (connArea[j].indexOf("left") != -1 ?
                     (( j % 2 === 0 ? ARPORT_StartOnLeft : 0) + (j < 2 ? ARPORT_EndOnLeft : 0)) : 0) +
                    //Connection area is on right
                    (connArea[j].indexOf("right") != -1 ?
                     (( j % 2 === 0 ? ARPORT_StartOnRight : 0) + (j < 2 ? ARPORT_EndOnRight : 0)) : 0) ||
                    (connArea[j].indexOf("all") != -1 ? ARPORT_ConnectOnAll : 0) ;

                //Unfortunately, all will not specify in or outgoing connections
            }

            if(connArea[j])
            {
                port.setLimitedDirs(false);
                port.setAttributes(attr);
                port.setRect(r);
                box.addPort(port);
                //p.push(port);
                p[id] = port;
            }

        }while(++j < connArea.length);
    };

    AutoRouter.prototype.addPath = function(a){
        //Assign a pathId to the path (return this id).
        //If there is only one possible path connection, create the path.
        //if not, store the path info in the pathsToResolve array
        var src = a.src, 
            dst = a.dst, 
            pathId = (this.pCount++).toString();

        //Generate pathId
        while( pathId.length < 6 ){
            pathId = "0" + pathId;
        }
        pathId = "PATH_" + pathId;

        a.id = pathId;
        this._createPath(a);

        return pathId;
    };

    AutoRouter.prototype._createPath = function(a){
        if( !a.src || !a.dst)
            throw "AutoRouter:_createPath missing source or destination";

        var id = a.id,
            autoroute = a.autoroute || true,
            startDir = a.startDirection || a.start,
            endDir = a.endDirection || a.end,
            src = [], 
            dst = [],
            path;

        for(var i in a.src){
            if(a.src.hasOwnProperty(i)){
                src.push(a.src[i]);
            }
        }
        for(var i in a.dst){
            if(a.dst.hasOwnProperty(i)){
                dst.push(a.dst[i]);
            }
        }

        assert(src instanceof AutoRouterPort
                || src instanceof Array || src.ports[0] instanceof AutoRouterPort, "AutoRouter:_createPath: src is not recognized as an AutoRouterPort");
        assert(dst instanceof AutoRouterPort
                || dst instanceof Array || dst.ports[0] instanceof AutoRouterPort, "AutoRouter:_createPath: dst is not recognized as an AutoRouterPort");
        path = this.router.addPath(autoroute, src, dst);

        if(startDir || endDir){ 
            var start = startDir != undefined ? (startDir.indexOf("top") != -1 ? ARPATH_StartOnTop : 0) +
                (startDir.indexOf("bottom") != -1 ? ARPATH_StartOnBottom : 0) +
                (startDir.indexOf("left") != -1 ? ARPATH_StartOnLeft : 0) +
                (startDir.indexOf("right") != -1 ? ARPATH_StartOnRight : 0) ||
                (startDir.indexOf("all") != -1 ? ARPATH_Default : 0) : ARPATH_Default ;
            var end = endDir != undefined ? (endDir.indexOf("top") != -1 ? ARPATH_EndOnTop : 0) +
                (endDir.indexOf("bottom") != -1 ? ARPATH_EndOnBottom : 0) +
                (endDir.indexOf("left") != -1 ? ARPATH_EndOnLeft : 0) +
                (endDir.indexOf("right") != -1 ? ARPATH_EndOnRight : 0) ||
                (endDir.indexOf("all") != -1 ? ARPATH_Default : 0) : ARPATH_Default;

            path.setStartDir(start); 
            path.setEndDir(end);
        }else{
            path.setStartDir(ARPATH_Default); //ARPATH_StartOnLeft);
            path.setEndDir(ARPATH_Default);
        }

        var pathData = new ArPathObject(id, path, a.src, a.dst);
        this.paths[id] = pathData;

        //Register the path under box id
        this.boxId2Path[src[0].getOwner().getID()].out.push(pathData);//Assuming all ports belong to the same box
        this.boxId2Path[dst[0].getOwner().getID()].in.push(pathData);//so the specific port to check is trivial
        return pathData;
    };

    AutoRouter.prototype.autoroute = function(){ 
        this.router.autoRoute();
    };

    AutoRouter.prototype.getPathPoints = function(pathId){
        assert(this.paths[pathId] !== undefined, "AutoRouter:getPath requested path does not match any current paths");
        var path = this.paths[pathId].path,
            points = path.getPointList(),
            i = -1,
            res = [],
            pt;

        while(++i < points.getLength()){
            pt = [points.get(i)[0].x, points.get(i)[0].y];
            res.push(pt);
        }

        return res;
    };

    AutoRouter.prototype.setBox = function(boxObject, size){
        var box = boxObject.box,
            x1 = size.x1 !== undefined ? size.x1 : (size.x2 - size.width),
            x2 = size.x2 !== undefined ? size.x2 : (size.x1 + size.width),
            y1 = size.y1 !== undefined ? size.y1 : (size.y2 - size.height),
            y2 = size.y2 !== undefined ? size.y2 : (size.y1 + size.height),
            connInfo = size.ConnectionInfo,
            rect = new ArRect(x1, y1, x2, y2),
            paths = { "in": this.boxId2Path[ box.getID() ].in, "out": this.boxId2Path[ box.getID() ].out },
            i = paths.in.length,
            pathSrc,
            pathDst,
            ports;

        //Remove and Add Ports
        box.deleteAllPorts();
        boxObject.ports = [];
        this.router.setBoxRect(box, rect);
        this.setConnectionInfo(boxObject, connInfo);
        ports = boxObject.ports; //get the new ports

        //Reconnect paths to ports
        while( i-- ){
            pathSrc = paths.in[i].path.getStartPorts();
            //paths.in[i].path.setEndPorts( ports );
            paths.in[i].setDstPorts(ports);
            paths.in[i].updateDstPorts();
            this.router.disconnect( paths.in[i].path );
        }

        i = paths.out.length;
        while( i-- ){
            pathDst = paths.out[i].path.getEndPorts();
            //paths.out[i].path.setStartPorts( ports );
            paths.out[i].setSrcPorts(ports);
            paths.out[i].updateSrcPorts();
            this.router.disconnect( paths.out[i].path );
        }
    };

    AutoRouter.prototype.setConnectionInfo = function(boxObject, connArea){
        var pathObjects = this.boxId2Path[boxObject.box.getID()],
            oldPorts = boxObject.ports,
            box = boxObject.box,
            i = pathObjects.out.length,
            hasSrc,
            hasDst,
            srcPorts,
            dstPorts,
            ports;

        ports = this.addPort(box, connArea);//Get new ports

        while(i--){//Update the paths with deleted ports
            hasSrc = false;
            srcPorts = pathObjects.out[i].getSrcPorts();//Used to see if the path should be removed

            for(var srcPort in srcPorts){
                if(srcPorts.hasOwnProperty(srcPort)){
                    if(ports.hasOwnProperty(srcPort)){
                        pathObjects.out[i].setSrcPort(srcPort, ports[srcPort]);
                        hasSrc = true;
                    }else{
                        pathObjects.out[i].deleteSrcPort(srcPort);
                    }
                }
            }
            if(hasSrc){//Adjust path if applicable
                this.router.disconnect(pathObjects.out[i].path);
                pathObjects.out[i].updateSrcPorts();
            }
        }

        i = pathObjects.in.length;
        while(i--){
            hasDst = false;
            dstPorts = pathObjects.in[i].getDstPorts();

            for(var dstPort in dstPorts){
                if(dstPorts.hasOwnProperty(dstPort)){
                    if(ports.hasOwnProperty(dstPort)){
                        pathObjects.in[i].setDstPort(dstPort, ports[dstPort]);
                        hasDst = true;
                    }else{
                        pathObjects.in[i].deleteDstPort(dstPort);
                    }
                }
            }

            if(hasDst){//Adjust path if applicable
                this.router.disconnect(pathObjects.in[i].path);
                pathObjects.in[i].updateDstPorts();
            }
        }

        for(var oldPort in oldPorts){//Remove old ports
            if(oldPorts.hasOwnProperty(oldPort)){
                box.deletePort(oldPorts[oldPort]);
            }
        }

        boxObject.ports = ports;

        return new ArBoxObject(box, ports);
    };

    AutoRouter.prototype.remove = function(item){
        assert(item !== undefined, "AutoRouter:remove Cannot remove undefined object");
        item = item.box || item;

        if(item instanceof AutoRouterBox){
            this.boxId2Path[ item.getID() ] = undefined;
            this.router.deleteBox(item);

        }else if(this.paths[item] !== undefined){
            if(this.paths[item].path instanceof AutoRouterPath){
                var pathData = this.paths[item],
                    path = pathData.path,
                    srcBoxId = pathData.getSrcBoxId(),
                    dstBoxId = pathData.getDstBoxId(),
                    i;

                if(srcBoxId){
                    i = this.boxId2Path[srcBoxId].out.indexOf(pathData);//Remove from boxId2Path dictionary
                    this.boxId2Path[srcBoxId].out.splice(i, 1);
                }

                if(dstBoxId){
                    i = this.boxId2Path[dstBoxId].in.indexOf(pathData);
                    this.boxId2Path[dstBoxId].in.splice(i, 1);
                }

                this.router.deletePath(path); 
            }
            delete this.paths[item]; //Remove dictionary entry

        }else
            throw "AutoRouter:remove Unrecognized item type. Must be an AutoRouterBox or an AutoRouterPath ID";
    };

    AutoRouter.prototype.move = function( box, details ){
        //Make sure details are in terms of dx, dy
        box = box instanceof AutoRouterBox ? box : box.box;
        var dx = details.dx !== undefined ? details.dx : Math.round( details.x - box.getRect().left ),
            dy = details.dy !== undefined ? details.dy : Math.round( details.y - box.getRect().ceil );

        assert(box instanceof AutoRouterBox, "AutoRouter:move First argument must be an AutoRouterBox or ArBoxObject");

        this.router.shiftBoxBy(box, { "cx": dx, "cy": dy });
    };

    AutoRouter.prototype.setMinimumGap = function( min ){
        this.router.setBuffer( Math.floor(min/2) );
    };

    AutoRouter.prototype.setComponent = function(pBoxObj, chBoxObj){
        var mother = pBoxObj.box,
            child = chBoxObj.box;

        mother.addChild(child);
    };

    AutoRouter.prototype.setPathCustomPoints = function( args ){ //args.points = [ [x, y], [x2, y2], ... ]
        var path = this.paths[args.path].path,
            points = [],
            i = 0;
        if( path === undefined )
            throw "AutoRouter: Need to have an AutoRouterPath type to set custom path points";

        if( args.points.length > 0 )
            path.setAutoRouting( false );
        else
            path.setAutoRouting( true );

        //Convert args.points to array of [ArPoint] 's
        while ( i < args.points.length ){
            points.push(new CustomPathData( args.points[i][0], args.points[i][1] ));
            ++i;
        }

        path.setCustomPathData( points );

    };

    return AutoRouter;

});
