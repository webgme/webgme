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
       this.boxes = [];
       this.bufferBoxes = []; //Used for covering general off-limits areas in original path finding
       this.ports = [];
       this.paths = [];
       this.boxId2Path = {};

       ED_MAXCOORD = (graphDetails && graphDetails.coordMax !== undefined ? graphDetails.coordMax : false) || ED_MAXCOORD;
       ED_MINCOORD = (graphDetails && graphDetails.coordMin !== undefined ? graphDetails.coordMin : false) || ED_MINCOORD;
       BUFFER = (graphDetails && graphDetails.minGap !== undefined ? Math.floor( graphDetails.minGap/2 ) : false) || BUFFER;
       EDLS_D = ED_MAXCOORD - ED_MINCOORD,
 
       this.router = new AutoRouterGraph();
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

        //Functions
        this.assign = function(other){
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
        }

        this.serialize = function(){
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
        }

        this.deserialize = function(inChannel){
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
        }

        this.getVersion = function(){
            return version;
        }

        this.setVersion = function(_version){
            version = _version;
        }

        this.getAspect = function(){
            return aspect;
        }

        this.setAspect = function(_aspect){
            aspect = _aspect;
        }

        this.getEdgeIndex = function(){
            return edgeIndex;
        }

        this.setEdgeIndex = function(index){
            edgeIndex = index;
        }

        this.getEdgeCount = function(){
            return edgeCount;
        }

        this.setEdgeCount = function(count){
            edgeCount = count;
        }

        this.getType = function(){
            return type;
        }

        this.setType = function(_type){
            type = _type;
        }

        this.isHorizontalOrVertical = function(){
            return horizontalOrVerticalEdge;
        }

        this.setHorizontalOrVertical = function(parity){
            horizontalOrVerticalEdge = parity;
        }

        this.getX = function(){
            return x;
        }

        this.setX = function(_x){
            x = _x;
        }

        this.getY = function(){
            return y;
        }

        this.setY = function(_y){
            y = _y;
        }

        this.getLongDataCount = function(){
            return l.length;
        }

        this.getLongData = function(index){
            return l[index];
        }

        this.setLongData = function(index, dat){
            l[index] = dat;
        }

        this.addLongData = function(dat){
            l.push(dat);
        }

        this.getDoubleDataCount = function(){
            return d.length;
        }

        this.getDoubleData = function(index){
            return d[index];
        }

        this.setDoubleData = function(index, data){
            d[index] = data;
        }

        this.addDoubleData = function(data){
            d.push(data);
        }

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

        var isOnEdge = function (start, end, pt, nearness){
            if (start.x === end.x)			// vertical edge, horizontal move
            {
                if (Math.abs(end.x - pt.x) <= nearness && pt.y <= Math.max(end.y, start.y) + nearness && pt.y >= Math.min(end.y, start.y) - nearness)
                    return true;
            }
            else if (start.y === end.y)	// horizontal line, vertical move
            {
                if (Math.abs(end.y - pt.y) <= nearness && pt.x <= Math.max(end.x, start.x) + nearness && pt.x >= Math.min(end.x, start.x) - nearness)
                    return true;
            }
            else
            {
                // TODO: consider non-linear edges
                //
                // Is the point close to the edge?
                var d_square = DistanceSquareFromLine(start, end, pt);
                if (d_square <= nearness * nearness) {
                    // Check not just if the point is on the line, but if it is on the line segment
                    // point = m * start + (1 - m) * end
                    //
                    // m = (pt + end) / (start + end)
                    // 0.0 <= m <= 1.0

                    var m1 = (pt.x - end.x) / (start.x - end.x),
                        m2 = (pt.y - end.y) / (start.y - end.y);
                    //assert(Math.abs(m2 - m1) < 2.0e-1);
                    if (m1 >= 0.0 && m1 <= 1.0 && m2 >= 0.0 && m2 <= 1.0)
                        return true;
                }
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

            return isLineMeetHLine(start, end, rect.left, rect.right - 1, rect.ceil) ||
                   isLineMeetHLine(start, end, rect.left, rect.right - 1, rect.floor - 1) ||
                   isLineMeetVLine(start, end, rect.ceil, rect.floor - 1, rect.left) ||
                   isLineMeetVLine(start, end, rect.ceil, rect.floor - 1, rect.right - 1);
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
            var p = new ArPoint(point);

            switch(dir)
            {
            case Dir_Top:
                p.y--;
                break;

            case Dir_Right:
                p.x++;
                break;

            case Dir_Bottom:
                p.y++;
                break;

            case Dir_Left:
                p.x--;
                break;
            }

            return p;
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

        var getRectOuterCoord = function (rect, dir, len){
            assert( isRightAngle(dir), "ArHelper.getRectOuterCoord: isRightAngle(dir) FAILED" );
            assert( rect instanceof ArRect, "ArHelper.getRectOuterCoord: rect instanceof ArRect FAILED. 'rect' is " + rect);
            var d = len ? len + 1 : 1,//BUFFER + 1, //How far to exit the box
                t = rect.ceil - d,
                r = rect.right + d - 1,
                b = rect.floor + d - 1,
                l = rect.left - d;

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
    /*{
            assert(offset.cy !== undefined && offset.cx !== undefined, "getDir: offset.cx and offset.cy cannot both be undefined! offset is " + offset);
            if( nodir === undefined )
                nodir = Dir_None;

            if( offset.cx === 0 && offset.cy === 0)
                return nodir;

            if( Math.abs( offset.cx ) < 1 ){

                if( Math.abs( offset.cx ) > Math.abs( offset.cy ) )
                    return offset.cx > 0 ? Dir_Right : Dir_Left;

                if( offset.cy > 0 )
                    return Dir_Bottom;

                return Dir_Top;

            }else if( Math.abs( offset.cy ) < 1 ){

                if( offset.cx > 0 )
                    return Dir_Right;

                return Dir_Left;

            }

                return Dir_Skew;
        };
*/

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
            if( point.y === rect.ceil && rect.left < point.x && point.x < rect.right - 1 ) 
                return Dir_Top;

            if( point.y === rect.floor - 1 && rect.left < point.x && point.x < rect.right - 1 )
                return Dir_Bottom;

            if( point.x === rect.left && rect.ceil < point.y && point.y < rect.floor - 1 )
                return Dir_Left;

            if( point.x === rect.right - 1 && rect.ceil < point.y && point.y < rect.floor - 1 )
                return Dir_Right;

            return Dir_None;
        };

        // --------------------------- CArFindNearestLine

        var ArFindNearestLine = function (pt){
            var point = pt,
                dist1 = INT_MAX,
                dis2 = INT_MAX;

            //Functions -- Everything is public
            this.hLine = function(x1, x2, y){
                assert( x1 <= x2 , "ArFindNearestLine.hLine: x1 <= x2  FAILED");

                var d1 = distanceFromHLine(point, x1, x2, y),
                    d2 = Math.abs(point.y - y);

                if( d1 < dist1 || (d1 === dist1 && d2 < dist2) )
                {
                    dist1 = d1;
                    dist2 = d2;
                    return true;
                }

                return false;
            }

            this.vLine = function(y1, y2, x){
                assert( y1 <= y2, "ArFindNearestLine.hLine: y1 <= y2 FAILED" );

                var d1 = distanceFromVLine(point, y1, y2, x),
                    d2 = Math.abs(point.x - x);

                if( d1 < dist1 || (d1 === dist1 && d2 < dist2) )
                {
                    dist1 = d1;
                    dist2 = d2;
                    return true;
                }

                return false;
            }

            this.was = function(){ 
                return dist1 < INT_MAX && dist2 < INT_MAX; 
            }
            
        };

        // --------------------------- ArPointListPath

        var ArPointListPath = function (){ 
            //I will be using a wrapper to give this object array functionality
            //Ideally, I would inherit but this avoids some of the issues with 
            //inheriting from arrays in js (currently anyway)
            var ArPointList = [];
                //this.length = 0;

            //Wrapper Functions
            this.getLength = function(){
                return ArPointList.length;
            };

            this.getArPointList = function(){
                return ArPointList;
            };

            this.setArPointList = function(list){
                ArPointList = list;
            };

            this.get = function(index){
                return ArPointList[index];
            };

            this.push = function(element){
if(DEBUG && ArPointList.length > 0){
    assert(element[0].x === ArPointList[ArPointList.length - 1][0].x ||
        element[0].y === ArPointList[ArPointList.length - 1][0].y, "ArPointListPath.push: point does not create horizontal or vertical edge!");
}
                if(element instanceof Array)
                    ArPointList.push(element);
                else
                    ArPointList.push([element]);
            };

            this.indexOf = function(element){
                return ArPointList.indexOf(element);
            };

            this.concat = function(element){
                return ArPointList.concat(element);
            };

            this.splice = function(start, amt, insert){
                if(insert !== undefined){
                    var res = ArPointList.splice(start, amt, insert);
                }else
                    var res = ArPointList.splice(start, amt);

                return res;
            };

            //Functions

            this.getHeadEdge = function(start, end){

                var pos = ArPointList.length;
                if( ArPointList.length < 2 )
                    return pos;

                pos = 0;
                assert( pos < ArPointList.length, "ArPointListPath.getHeadEdge: pos < ArPointList.length FAILED");

                start = ArPointList[pos++];
                assert( pos < ArPointList.length, "ArPointListPath.getHeadEdge: pos < ArPointList.length FAILED");

                end = ArPointList[pos];

                return pos;
            };

           this.getTailEdge = function(start, end){
                if( ArPointList.length < 2 )
                    return ArPointList.length ;

                var pos = ArPointList.length;
                assert( --pos < ArPointList.length, "ArPointListPath.getHeadEdge: --pos < ArPointList.length FAILED" );

                end = ArPointList[pos--];
                assert( pos < ArPointList.length, "ArPointListPath.getHeadEdge: pos < ArPointList.length FAILED" );

                start = ArPointList[pos];

                return { "pos": pos, "start": start, "end": end };
            };

           this.getNextEdge = function(pos, start, end){
                if(DEBUG)
                    AssertValidPos(pos);

                pos++;
                assert( pos < ArPointList.length, "ArPointListPath.getNextEdge: pos < ArPointList.length FAILED");

                var p = pos;
                start = ArPointList[p++];
                if( p === ArPointList.length)
                    pos = ArPointList.length;
                else
                    end = ArPointList[p];
            };

           this.getPrevEdge = function(pos, start, end){
                if(DEBUG)
                    AssertValidPos(pos);

                end = ArPointList[pos--];
                if( pos != ArPointList.length)
                    start = ArPointList[pos];
        
                return { "pos": pos, "start": start, "end": end };
            };

           this.getEdge = function(pos, start, end){
                if(DEBUG)
                    AssertValidPos(pos);

                start = ArPointList[pos++];
                assert( pos < ArPointList.length, "ArPointListPath.getEdge: pos < ArPointList.length FAILED" );

                end = ArPointList[pos];
            };

           this.getHeadEdgePtrs = function(start, end){
                if( ArPointList.length < 2 )
                    return ArPointList.length;

                var pos = 0;
                assert( pos < ArPointList.length, "ArPointListPath.getHeadEdgePtrs: pos < ArPointList.length FAILED");

                start.assign(ArPointList[pos++]); //&
                assert( pos < ArPointList.length, "ArPointListPath.getHeadEdgePtrs: pos < ArPointList.length FAILED");

                end.assign(ArPointList[pos]); //&

                return pos;
            };

           this.getTailEdgePtrs = function(start, end){
                var result = {};

                if( ArPointList.length < 2 ){
                    result.pos = ArPointList.length;
                    return result;
                }

                var pos = ArPointList.length,
                    start,
                    end;
                assert( --pos < ArPointList.length, "ArPointListPath.getTailEdgePtrs: --pos < ArPointList.length FAILED"); 

                end = ArPointList[pos--];//&
                assert( pos < ArPointList.length, "ArPointListPath.getTailEdgePtrs: pos < ArPointList.length FAILED"); 

                start = ArPointList[pos];//&

                result.pos = pos;
                result.start = start;
                result.end = end;
                return result;
            };

           this.getNextEdgePtrs = function(pos, start, end){
               var result = {};
                if(DEBUG)
                    AssertValidPos(pos);

                start.assign(ArPointList[pos++]);
                if (pos < ArPointList.length)
                    end.assign(ArPointList[pos]);

                result.pos = pos;
                result.start = start;
                result.end = end;
                return result;
            };

           this.getPrevEdgePtrs = function(pos, start, end){
                var result = {};

                if(DEBUG)
                    AssertValidPos(pos);

                end = ArPointList[pos];//&

                if( pos-- > 0)
                    start = ArPointList[pos];//&

                result.pos = pos;
                result.start = start;
                result.end = end;
                return result;
            };

           this.getEdgePtrs = function(pos, start, end){
                if(DEBUG)
                    AssertValidPos(pos);

                start.assign(ArPointList[pos++]);
                assert( pos < ArPointList.length, "ArPointListPath.getEdgePtrs: pos < ArPointList.length FAILED");

                end.assign(ArPointList[pos]);
            };

           this.getStartPoint = function(pos){
                if(DEBUG)
                    AssertValidPos(pos);

                return ArPointList[pos];//&
            };

           this.getEndPoint = function(pos){
                if(DEBUG)
                    AssertValidPos(pos);

                pos++;
                assert( pos < ArPointList.length, "ArPointListPath.getEndPoint: pos < ArPointList.length FAILED" );

                return ArPointList[pos];//&
            };

           this.getPointBeforeEdge = function(pos){
                if(DEBUG)
                    AssertValidPos(pos);

                pos--;
                if( pos === ArPointList.length)
                    return null;

                return ArPointList[pos]; //&
            };

           this.getPointAfterEdge = function(pos){
                if(DEBUG)
                    AssertValidPos(pos);

                pos++;
                assert( pos < ArPointList.length, "ArPointListPath.getPointAfterEdge: pos < ArPointList.length FAILED");

                pos++;
                if( pos === ArPointList.length )
                    return null;

                return ArPointList[pos];//&
            };

           this.getEdgePosBeforePoint = function(pos){
                if(DEBUG)
                    AssertValidPos(pos);

                pos--;
                return pos;
            };

           this.getEdgePosAfterPoint = function(pos){
                if(DEBUG)
                    AssertValidPos(pos);

                var p = pos + 1;

                if( p === ArPointList.length )
                    return ArPointList.length;

                return pos;
            };

           this.getEdgePosForStartPoint = function(startpoint){
                var pos = 0;
                while( pos < ArPointList.length )
                {
                    if( ArPointList[pos++] === startpoint )
                    {
                        assert( pos < ArPointList.length, "ArPointListPath.getEdgePosForStartPoint: pos < ArPointList.length FAILED" );
                        pos--;
                        break;
                    }
                }

                assert( pos < ArPointList.length, "ArPointListPath.getEdgePosForStartPoint: pos < ArPointList.length FAILED" );
                return pos;
            };

            this.assertValid = function(){
                
            };

           this.assertValidPos = function(pos){
                assert( pos < ArPointList.length, "ArPointListPath.assertValidPos: pos < ArPointList.length FAILED" );

                var p = 0;
                for(;;)
                {
                    assert( pos < ArPointList.length, "ArPointListPath.assertValidPos: pos < ArPointList.length FAILED" );
                    if( p === pos )
                        return;

                    p++;
                }
            };

           this.dumpPoints = function(msg){
                console.log(msg + ", points dump begin:");
                var pos = 0,
                    i = 0;
                while(pos < ArPointList.length) {
                    var p = ArPointList[pos++][0];
                    console.log(i + ".: (" + p.x + ", " + p.y + ")");
                    i++;
                }
                console.log("points dump end.");
            };


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

            //functions
            this.equals = equals;
            this.offset = offset;
            this.add = add;
            this.subtract = subtract;
            this.plus = plus;
            this.minus = minus;
            this.assign = assign;

            function equals(otherPoint){
                if( this.x === otherPoint.x && this.y === otherPoint.y)
                    return true;

                return false;
            }

            function offset(x, y){
                if(y !== undefined){ //two arguments are sent to function
                    x = new ArSize(x, y);
                }

                    this.add(x);
            }

            function add(otherObject){ //equivalent to += 
                if(otherObject instanceof ArSize){
                    this.x += otherObject.cx;
                    this.y += otherObject.cy;
                }else if(otherObject instanceof ArPoint){
                    this.x += otherObject.x;
                    this.y += otherObject.y;
                }

                this.x = Math.round(x);
                this.y = Math.round(y);
            }

            function subtract(otherObject){ //equivalent to += 
                if(otherObject instanceof ArSize){
                    this.x -= otherObject.cx;
                    this.y -= otherObject.cy;
                }else if(otherObject instanceof ArPoint){
                    this.x -= otherObject.x;
                    this.y -= otherObject.y;
                }

            }

            function plus(otherObject){ //equivalent to +
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
            }

            function minus(otherObject){ 
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
            }

            function assign(otherPoint){
                this.x = otherPoint.x;
                this.y = otherPoint.y;

                return this;
            }
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

            //functions
            this.getWidth = getWidth;
            this.getHeight = getHeight;
            this.getSize = getSize;
            this.getTopLeft = getTopLeft;
            this.getBottomRight = getBottomRight;
            this.getCenterPoint = getCenterPoint;
            this.isRectEmpty = isRectEmpty;
            this.isRectNull = isRectNull;
            this.ptInRect = ptInRect;
            this.rectInRect = rectInRect;
            this.setRect = setRect;
            this.setRectEmpty = setRectEmpty;
            this.inflateRect = inflateRect;
            this.deflateRect = deflateRect;
            this.normalizeRect = normalizeRect;
            this.assign = assign;
            this.equals = equals;
            this.add = add;
            this.subtract = subtract;
            this.plus = plus;
            this.minus = minus;
            this.unionAssign = unionAssign;
            this.union = union;
            this.intersectAssign = intersectAssign;
            this.intersect = intersect;

            this.getCenter = function(){
                return { 'x': (this.left + this.right)/2, 'y': (this.ceil + this.floor)/2 };
            }

            function getWidth(){
                return (this.right - this.left);
            }

            function getHeight(){
                return (this.floor - this.ceil);
            }

            function getSize(){
                return new ArSize(this.getWidth(), this.getHeight());
            }

            function getTopLeft(){
                return new ArPoint(this.left, this.ceil);
            }

            function getBottomRight(){
                return new ArPoint(this.right, this.floor);
            }

            function getCenterPoint(){
                return new ArPoint(this.left + this.getWidth()/2, this.ceil + this.getHeight()/2);
            }

            function isRectEmpty(){
                if((this.left >= this.right) && (this.ceil >= this.floor))
                    return true;

                return false;
            }

            function isRectNull(){
                if( this.left === 0 &&
                    this.right === 0 &&
                    this.ceil === 0 &&
                    this.floor === 0)
                    return true;

                return false;
            }

            function ptInRect(pt){
                if(pt instanceof Array)
                    pt = pt[0];

                if( pt.x >= this.left &&
                    pt.x < this.right &&
                    pt.y >= this.ceil &&
                    pt.y < this.floor)
                    return true;

                return false;
            }

            function rectInRect(rect){
                if(rect === undefined)
                    return false;

                return (rect.left >= this.left && rect.ceil >= this.ceil &&
                    rect.right <= this.right && rect.floor <= this.floor);
            }

            function setRect( nLeft, nCeil, nRight, nFloor){
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

            }

            function setRectEmpty(){
                
                    this.ceil = 0;
                    this.right = 0;
                    this.floor = 0;
                    this.left = 0;
            }

            function inflateRect(x, y){
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
            }

            function deflateRect(x, y){
                if( x !== undefined && x.cx !== undefined && x.cy !== undefined){
                    y = x.cy;
                    x = x.cx;
                }

                this.left += x;
                this.right -= x;
                this.ceil += y;
                this.floor -= y;
            }

            function normalizeRect(){
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
            }

            function assign(rect){
                
                this.ceil = rect.ceil;
                this.right = rect.right;
                this.floor = rect.floor;
                this.left = rect.left;
            }

            function equals(rect){
                if( this.left === rect.left &&
                    this.right === rect.right &&
                    this.ceil === rect.ceil &&
                    this.floor === rect.floor)
                    return true;

                return false;
                
            }

            function add(ArObject){
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
            }

            function subtract(ArObject){
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
            }

            function plus(ArObject){
                var resObject = new ArRect(this);
                resObject.add(ArObject);

                return resObject;
            }

            function minus(ArObject){
                var resObject = new ArRect(this);
                resObject.subtract(ArObject);

                return resObject;
            }

            function unionAssign(rect){
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

            }

            function union(rect){
                var resRect = new ArRect(this);
                resRect.unionAssign(rect);

                return resRect;
            }

            function intersectAssign(rect1, rect2){
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
            }

            function intersect(rect){
                var resRect = new ArRect(this);

                resRect.intersectAssign(rect);
                return resRect;
            }

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

            //functions
            this.equals = equals;
            this.add = add;
            this.subtract = subtract;
            this.plus = plus;
            this.minus = minus;
            this.assign = assign;

            function equals(otherSize){
                if( this.cx === otherSize.cx && this.cy === otherSize.cy)
                    return true;

                return false;
            }

            function add(otherSize){ //equivalent to +=
                this.cx += otherSize.cx;
                this.cy += otherSize.cy;
            }

            function subtract(otherSize){
                this.cx -= otherSize.cx;
                this.cy -= otherSize.cy;
            }

            function plus(otherObject){ //equivalent to +
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
            }

            function minus(otherObject){ //equivalent to +
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
            }

            function assign(otherSize){
                this.cx = otherSize.cx;
                this.cy = otherSize.cy;
            }
        };

        var assert = function (condition, msg){
            if(!condition)
                throw msg || "Assert Failed";
        };

        var AutoRouterBox = function (){
            var owner = null,
                rect = new ArRect(),
                atomic = false,
                selfPoints = [],
                ports = [],
                id;

            //functions
            this.setID = setID;
            this.getID = getID;
            this.getOwner = getOwner;
            this.hasOwner = hasOwner;
            this.setOwner = setOwner;
            this.createPort = createPort;
            this.hasNoPort = hasNoPort;
            this.getPortCount = getPortCount;
            this.isAtomic = isAtomic;
            this.addPort = addPort;
            this.deletePort = deletePort;
            this.getPortList = getPortList;
            this.getRect = getRect;
            this.isRectEmpty = isRectEmpty;
            this.setRect = setRect;
            this.setRectByPoint = setRectByPoint;
            this.shiftBy = shiftBy;
            this.getSelfPoints = getSelfPoints;
            this.isBoxAt = isBoxAt;
            this.isBoxClip = isBoxClip;
            this.isBoxIn = isBoxIn;
            this.destroy = destroy;
            this.deleteAllPorts = deleteAllPorts;

            calculateSelfPoints(); //Part of initialization

            function calculateSelfPoints(){
                selfPoints = [];
                selfPoints.push(new ArPoint(rect.getTopLeft()));

                selfPoints.push(new ArPoint( rect.right - 1, rect.ceil));
                selfPoints.push(new ArPoint(rect.right - 1, rect.floor - 1));
                selfPoints.push(new ArPoint(rect.left, rect.floor - 1));
            }

            function deleteAllPorts(){
                for(var i = 0; i < ports.length; i++){
                    ports[i].setOwner(null);
                    ports[i] = null;
                }

                ports = []; 

                atomic = false;
            }

            function setID(_id){
                id = _id;
            }

            function getID(){
                return id;
            }

            function getOwner(){
                return owner;
            }

            function hasOwner(){
                return owner !== null;
            }

            function setOwner(graph){
                owner = graph;
            }

            function createPort(){
                var port = new AutoRouterPort();
                assert(port !== null, "ARBox.createPort: port !== null FAILED");

                return port;
            }

            function hasNoPort(){
                return ports.length === 0;
            }

            function getPortCount(){
                return ports.length;
            }

            function isAtomic(){
                return atomic;
            }

            function addPort(port){
                assert(port !== null, "ARBox.addPort: port !== null FAILED");

                if(port === null)
                    return;

                port.setOwner(this);
                ports.push(port);

                if(owner instanceof AutoRouterGraph)
                    owner.addEdges(port);
            }

            function deletePort(port){
                assert(port !== null, "ARBox.deletePort: port !== null FAILED");
                if(port === null)
                    return;

                var index = ports.indexOf(port),
                    delPort;

                assert(index !== -1, "ARBox.deletePort: index !== -1 FAILED");

                delPort = ports.splice(index, 1);
                delPort.setOwner(null);
                delPort = null;

                atomic = false;

            }

            function getPortList(){
                return ports;
            }

            function getRect(){
                return rect;
                //return new ArRect(rect);
            }

            function isRectEmpty(){
                return rect.isRectEmpty();
            }

            function setRect(r){
                assert(r instanceof ArRect, "Invalid arg in ARBox.setRect. Requires ArRect");

                assert( r.getWidth() >= 3 && r.getHeight() >= 3, "ARBox.setRect: r.getWidth() >= 3 && r.getHeight() >= 3 FAILED!");
                assert( r.getTopLeft().x >= ED_MINCOORD && r.getTopLeft().y >= ED_MINCOORD, "ARBox.setRect: r.getTopLeft().x >= ED_MINCOORD && r.getTopLeft().y >= ED_MAXCOORD FAILED!"); 
                assert( r.getBottomRight().x <= ED_MAXCOORD && r.getBottomRight().y <= ED_MAXCOORD, "ARBox.setRect:  r.getBottomRight().x <= ED_MAXCOORD && r.getBottomRight().y <= ED_MAXCOORD FAILED!");
                assert( ports.length === 0 || atomic, "ARBox.setRect: ports.length === 0 || atomic FAILED!");

                rect.assign(r);

                calculateSelfPoints();

                if(atomic){
                    assert(ports.length === 1, "ARBox.setRect: ports.length === 1 FAILED!");
                    ports[0].setRect(r);
                }
                
            }

            function setRectByPoint(point){
                this.shiftBy(point);
            }

            function shiftBy(offset){
                rect.add(offset);

                for(var i = 0; i < ports.length; i++){
                    ports[i].shiftBy(offset);
                }

                calculateSelfPoints();
            }

            function getSelfPoints(){
                return selfPoints;
            }

            function isBoxAt(point, nearness){
                return isPointIn(point, rect, nearness);
            }

            function isBoxClip(r){
                return isRectClip(rect, r);
            }

            function isBoxIn(r){
                return isRectIn(rect, r);
            }

            function destroy(){
                this.setOwner(null);
                deleteAllPorts();
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

               We will walk from top to bottom (from the 'order_first' along the 'order_next').
               We keep track a "section" of some edges. If we have an infinite horizontal line,
               then the section consists of those edges that are above the line and not blocked
               by another edge which is closer to the line. Each edge in the section has
               a viewable portion from the line (the not blocked portion). The coordinates
               of this portion are 'section_x1' and 'section_x2'. We have an order of the edges
               belonging to the current section. The 'section_first' refers to the leftmost
               edge in the section, while the 'section_next' to the next from left to right.

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

            var owner = null,
                startpoint_prev = null,
                startpoint = null,
                endpoint = null,
                endpoint_next = null,

                position_y = 0,
                position_x1 = 0,
                position_x2 = 0,
                bracket_closing = 0,
                bracket_opening = 0,

                order_prev = null,
                order_next = null,

                section_x1,
                section_x2,
                section_next,
                section_down,

                edge_fixed = false,
                edge_customFixed = false,
                edge_canpassed = false,
                edge_direction = null,

                block_prev = null,
                block_next = null,
                block_trace = null,

                closest_prev = null,
                closest_next = null;

            //functions

            this.assign = function(otherEdge){

                if(otherEdge !== null){
                    this.setOwner(otherEdge.getOwner());
                    this.setStartPoint(otherEdge.getStartPointPtr(), false );
                    this.setEndPoint(otherEdge.getEndPointPtr(), otherEdge.getEndPointPtr() !== null); //Only calculateDirection if endpoint is not null

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

            this.equals = function(otherEdge){
                return this === otherEdge; //This checks if they reference the same object
            };

            this.getOwner = function (){
                return owner;
            };

            this.setOwner = function (newOwner){
                owner = newOwner;
            };

            this.getStartPointPrev = function (){
                return startpoint_prev !== null ? 
                    new ArPoint(startpoint_prev[0]) : null;
            };

            this.isStartPointPrevNull = function () {
                return startpoint_prev === null;
            };

            this.setStartPointPrev = function (point){
                startpoint_prev = point || null;
            };

            this.getStartPointPtr = function(){
                return startpoint;
            };

            this.getEndPointPtr = function(){
                return endpoint;
            };

            this.getStartPoint = function (){
                //return new ArPoint(startpoint[0]);
                return startpoint !== null ? 
                    (startpoint instanceof Array ? new ArPoint(startpoint[0]) : new ArPoint(startpoint)) 
                        : emptyPoint;//returning copy of startpoint
            };

            this.isSameStartPoint = function(point){
                return startpoint[0] === point;
            };

            this.isStartPointNull = function (){
                return startpoint === null;
            };

            this.setStartPoint = function (point, b){
                if(point instanceof Array){
                    startpoint = point;

                }else if ( !startpoint ){
                    startpoint = [ point ];

                }else{
                    startpoint[0] = point;
                }

                if(b !== false)
                    this.recalculateDirection();
            };

            this.setStartPointX = function(_x){
                    startpoint[0].x = _x;
/*
                if(startpoint instanceof Array)
                    startpoint[0].x = _x;
                else
                    startpoint.x = _x;
*/
            };

            this.setStartPointY = function(_y){
                    startpoint[0].y = _y;
/*
                if(startpoint instanceof Array)
                    startpoint[0].y = _y;
                else
                    startpoint.y = _y;
*/
            };

            this.getEndPoint = function(){
                return endpoint !== null ? 
                    (endpoint instanceof Array ? new ArPoint(endpoint[0]) : new ArPoint(endpoint)) 
                        : emptyPoint;
            };

            this.isEndPointNull = function(){
                return endpoint === null;
            };

            this.setEndPoint = function(point, b){
                if(point instanceof Array){
                    endpoint = point;

                }else if ( !endpoint ){
                    endpoint = [ point ];

                }else{
                    endpoint[0] = point;
                }

                if(b !== false)
                    this.recalculateDirection();
            };
            
            this.setStartAndEndPoint = function(startPoint, endPoint){
                this.setStartPoint(startPoint, false); //wait until setting the endpoint to recalculateDirection
                this.setEndPoint(endPoint);
            };
                
            this.setEndPointX = function (_x){
                if(!endpoint || endpoint instanceof Array)
                    endpoint[0].x = _x;
                else
                    endpoint.x = _x;
            };

            this.setEndPointY = function (_y){
                if(!endpoint || endpoint instanceof Array)
                    endpoint[0].y = _y;
                else
                    endpoint.y = _y;
            };

            this.getEndPointNext = function(){
                return endpoint_next !== null ? 
                    ((endpoint_next instanceof Array) ? new ArPoint(endpoint_next[0]) : new ArPoint(endpoint_next)) 
                        : emptyPoint;
            };

            this.isEndPointNextNull = function(){
                return endpoint_next === null;
            };
            
            this.setEndPointNext = function(point){
                endpoint_next = point;
            };

            this.getPositionY = function(){
                return position_y;
            };

            this.setPositionY = function(_y ){
                position_y = _y;
            };

            this.addToPositionY = function(dy){
                position_y += dy;
            };

            this.getPositionX1 = function(){
                return position_x1;
            };

            this.setPositionX1 = function(_x1){
                position_x1 = _x1;
            };

            this.getPositionX2 = function(){
                return position_x2;
            };

            this.setPositionX2 = function(_x2){
                position_x2 = _x2;
            };

            this.getBracketClosing = function() {
                return bracket_closing;
            };

            this.setBracketClosing = function(bool, debug){
                bracket_closing = bool;
            };

            this.getBracketOpening = function() {
                return bracket_opening;
            };

            this.setBracketOpening = function(bool){
                bracket_opening = bool;
            };

            this.getOrderNext = function(){
                return order_next;
            };

            this.setOrderNext = function(orderNext){
                order_next = orderNext;
            };

            this.getOrderPrev = function(){
                return order_prev;
            };

            this.setOrderPrev = function(orderPrev){
                order_prev = orderPrev;
            };

            this.getSectionX1 = function(){
                return section_x1;
            };

            this.setSectionX1 = function(x1){
                section_x1 = x1;
            };

            this.getSectionX2 = function(){
                return section_x2;
            };

            this.setSectionX2 = function(x2){
                section_x2 = x2;
            };

            this.getSectionNext = function(arg){

                return section_next != undefined ? section_next[0] : null;
            };

            this.getSectionNextPtr = function(){
                if(!section_next || !section_next[0])
                    section_next = [ new AutoRouterEdge() ];
                return section_next;
            };

            this.setSectionNext = function(nextSection){
/*
                if(nextSection instanceof Array){
                    section_next = nextSection;  //Don't want to actually change the pointer
                }else {
                    section_next = [nextSection];
                }
*/
                nextSection = nextSection instanceof Array ? nextSection[0] : nextSection;
                if(section_next instanceof Array)
                    section_next[0] = nextSection;
                else 
                    section_next = [nextSection];
             };

            this.getSectionDown = function(){ //Returns pointer - if not null

                return section_down != undefined ? section_down[0] : null;

            };

            this.getSectionDownPtr = function(){
                if(!section_down || !section_down[0])
                    section_down = [ new AutoRouterEdge() ];
                return section_down;
            };

            this.setSectionDown = function(downSection){
                downSection = downSection instanceof Array ? downSection[0] : downSection;
                if(section_down instanceof Array)
                    section_down[0] = downSection;
                else 
                    section_down = [downSection];
            };

            this.getEdgeFixed = function(){
                return edge_fixed;
            };

            this.setEdgeFixed = function(ef){ //boolean
                edge_fixed = ef;
            };

            this.getEdgeCustomFixed = function(){
                return edge_customFixed;
            };

            this.setEdgeCustomFixed = function(ecf){
                edge_customFixed = ecf;
            };

            this.getEdgeCanpassed =  function(){
                return edge_canpassed;
            };

            this.setEdgeCanpassed =  function(ecp){
                edge_canpassed = ecp;
            };

            this.getDirection = function(){
                return edge_direction;
            };

            this.setDirection = function(dir){
                edge_direction = dir;
            };

            this.recalculateDirection = function(){
                assert(startpoint !== null && endpoint !== null, "AREdge.recalculateDirection: startpoint !== null && endpoint !== null FAILED!");
                if(endpoint instanceof Array)
                    edge_direction = getDir(endpoint[0].minus((startpoint instanceof Array ? startpoint[0] : startpoint)));
                else
                    edge_direction = getDir(endpoint.minus((startpoint instanceof Array ? startpoint[0] : startpoint)));
            };

            this.getBlockPrev = function(){
                return block_prev;
            };

            this.setBlockPrev = function(prevBlock){
                block_prev = prevBlock;
            };

            this.getBlockNext = function(){
                return block_next;
            };

            this.setBlockNext = function(nextBlock){
                block_next = nextBlock;
            };

            this.getBlockTrace = function(){
                return block_trace;
            };

            this.setBlockTrace = function(traceBlock){
                block_trace = traceBlock;
            };

            this.getClosestPrev = function(){
                return closest_prev;
            };

            this.setClosestPrev = function(cp){
                closest_prev = cp;
            };

            this.getClosestNext = function(){
                return closest_next;
            };

            this.setClosestNext = function(cp){
                closest_next = cp;
            };

        };

        //----------------------AutoRouterEdgeList

        var AutoRouterEdgeList = function (b){
            var owner = null,

            //--Edges
                ishorizontal = b,

            //--Order
                order_first = null,
                order_last = null,

            //--Section
                section_first,
                section_blocker,
                section_ptr2blocked = [], //This is an array to emulate the pointer to a pointer functionality in CPP. 
                                          // section_ptr2blocked[0] = section_ptr2blocked*
                self = this;

            initOrder();
            initSection();

            //Public Functions
            this.destroy = function(){
                checkOrder();
                checkSection();
            };

            this.setOwner = function(newOwner){
                owner = newOwner;
            };

            this.addEdges = function(path){
                if(path instanceof AutoRouterPath){
                    assert(path.getOwner() === (owner), "AREdgeList.addEdges: path.getOwner() === (owner) FAILED!");

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
                        pos = ptrsObject.pos; 
                                             
                    while( -1 < pos && pos < pointList.getLength()){

                        var dir = getDir(endpoint[0].minus(startpoint[0]));

                        var skipEdge = dir === Dir_None ? true : false,
                            isMoveable = path.isMoveable();

                        if( !isMoveable && dir != Dir_Skew){
                            var goodAngle = isRightAngle(dir);
                            assert( goodAngle, "AREdgeList.addEdges: isRightAngle(dir) FAILED!");

                            if( !goodAngle)
                                skipEdge = true;

                        }

                        if( !skipEdge && 
                            (isRightAngle(dir) && isHorizontal(dir) === ishorizontal)){
                            var edge = new AutoRouterEdge();
                            edge.setOwner(path);
                            
                            edge.setStartAndEndPoint(startpoint, endpoint);
                            edge.setStartPointPrev(pointList.getPointBeforeEdge(pos));
                            edge.setEndPointNext(pointList.getPointAfterEdge(pos));

                            if (hasCustomEdge){
                                var isEdgeCustomFixed = false;
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
                            
                            var startPort = path.getStartPort();

                            assert(startPort !== null, "AREdgeList.addEdges: startPort !== null FAILED!");

                            var isStartPortConnectToCenter = startPort.isConnectToCenter(),
                                endPort = path.getEndPort();

                            assert(endPort !== null, "AREdgeList.addEdges: endPort !== null FAILED!");

                            var isEndPortConnectToCenter = endPort.isConnectToCenter(),
                                isPathFixed = path.isFixed();

                            edge.setEdgeFixed(edge.getEdgeCustomFixed() || isPathFixed ||
                                (edge.isStartPointPrevNull() && isStartPortConnectToCenter) ||
                                (edge.isEndPointNextNull() && isEndPortConnectToCenter));

                            if(dir !== Dir_Skew){

                                position_LoadY(edge);
                                position_LoadB(edge);
                            }else{
                                edge.setPositionY(0);
                                edge.setBracketOpening(false);
                                edge.setBracketClosing(false);
                            }

                            this.insert((new AutoRouterEdge()).assign(edge));

                        }

                    ptrsObject = pointList.getPrevEdgePtrs(pos, startpoint, endpoint);
                    pos = ptrsObject.pos;
                    startpoint = ptrsObject.start;
                    endpoint = ptrsObject.end;
                    currEdgeIndex--;
                    }

                    return true;
                }else if(path instanceof AutoRouterPort){
                    var port = path;
                    assert(port.getOwner().getOwner() === (owner), "AREdgeList.addEdges: port.getOwner() === (owner) FAILED!");

                    if (port.isConnectToCenter() || port.getOwner().isAtomic())
                        return;

                    var selfPoints = port.getSelfPoints();

                    for(var i = 0; i < 4; i++){

                        var startpoint_prev = selfPoints[(i + 3) % 4],
                            startpoint = selfPoints[i],
                            endpoint = selfPoints[(i + 1) % 4],
                            endpoint_next = selfPoints[(i + 2) % 4],
                            dir = getDir(endpoint.minus(startpoint));

                        assert( isRightAngle(dir), "AREdgeList.addEdges: isRightAngle(dir) FAILED!");

                        var canHaveStartEndPointHorizontal = port.canHaveStartEndPointHorizontal(ishorizontal);
                        if( isHorizontal(dir) === ishorizontal && canHaveStartEndPointHorizontal ){
                            var edge = new AutoRouterEdge();
                    
                            edge.setOwner(port);
                            edge.setStartAndEndPoint(startpoint, endpoint);
                            edge.setStartPointPrev(startpoint_prev);
                            edge.setEndPointNext(endpoint_next);

                            edge.setEdgeFixed(true);

                            position_LoadY(edge);
                            position_LoadB(edge);

                            if( edge.getBracketClosing() )
                                edge.addToPosition(0.999); 

                            this.insert((new AutoRouterEdge().assign(edge))); //This should work but has only been tested in example above
                        }
                    }
                }else if(path instanceof AutoRouterBox){
                    var box = path;

                    assert(box.getOwner() === (owner), "AREdgeList.addEdges: box.getOwner() === (owner) FAILED!");

                    var selfPoints = box.getSelfPoints();

                    for(var i = 0; i < 4; i++){

                        var startpoint_prev = selfPoints[(i + 3) % 4],
                            startpoint = selfPoints[i],
                            endpoint = selfPoints[(i + 1) % 4],
                            endpoint_next = selfPoints[(i + 2) % 4],
                            dir = getDir(endpoint.minus(startpoint));

                        assert( isRightAngle(dir), "AREdgeList.addEdges: isRightAngle(dir) FAILED!");

                        if( isHorizontal(dir) === ishorizontal ){
                            var edge = new AutoRouterEdge();
                    
                            edge.setOwner(box);
                            edge.setStartAndEndPoint(startpoint, endpoint);
                            edge.setStartPointPrev(startpoint_prev);
                            edge.setEndPointNext(endpoint_next);

                            edge.setEdgeFixed(true);

                            position_LoadY(edge);
                            position_LoadB(edge);

                            if( edge.getBracketClosing() )
                                edge.addToPosition(0.999); 

                            this.insert((new AutoRouterEdge().assign(edge))); //This should work but has only been tested in example above
                        }
                    }
                }else if(path instanceof AutoRouterGraph){
                    var graph = path;
                    assert(graph === owner, "AREdgeList.addEdges: graph === owner FAILED!");

                    var selfPoints = graph.getSelfPoints();
                    for(var i = 0; i < 4; i++){

                        var startpoint_prev = selfPoints[(i + 3) % 4],
                            startpoint = selfPoints[i],
                            endpoint = selfPoints[(i + 1) % 4],
                            endpoint_next = selfPoints[(i + 2) % 4],
                            dir = getDir(endpoint.minus(startpoint));

                        assert( isRightAngle(dir), "AREdgeList.addEdges: isRightAngle(dir) FAILED!");

                        if( isHorizontal(dir) === ishorizontal ){
                            var edge = new AutoRouterEdge();
                    
                            edge.setOwner(graph);
                            edge.setStartAndEndPoint(startpoint, endpoint);
                            edge.setStartPointPrev(startpoint_prev);
                            edge.setEndPointNext(endpoint_next);

                            edge.setEdgeFixed(true);

                            position_LoadY(edge);
                            this.insert((new AutoRouterEdge().assign(edge))); //This should work but has only been tested in example above
                        }
                    }

                }
            };

            this.deleteEdges = function (object){
                var edge = order_first;
                while( edge !== null){

                    if(edge.getOwner() === object){
                        var next = edge.getOrderNext();
                        this.Delete(edge);
                        edge = next;
                    }
                    else
                        edge = edge.getOrderNext();
                }
                    
            };

            this.deleteAllEdges = function(){
                while(order_first)
                    this.Delete(order_first);
            };

            this.isEmpty = function(){
                return order_first === null;
            }; 

            this.getEdge = function(path, startpoint, endpoint){
                var edge = order_first;
                while( edge !== null ){

                    if( edge.isSameStartPoint(startpoint))
                        break;

                    edge = edge.getOrderNext();
                }

                assert( edge !== null, "AREdgeList.getEdge: edge !== null FAILED!");
                return edge;
            };

            this.getEdgeByPointer = function(startpoint, endpoint){
                var edge = order_first;
                while( edge !== null ){
                    if(edge.isSameStartPoint(startpoint))
                        break;

                    edge = edge.getOrderNext();
                }

                assert(edge !== null, "AREdgeList.getEdgeByPointer: edge !== null FAILED!");
                return edge;
            };

            function setEdgeByPointer(pEdge, newEdge){
                assert(newEdge instanceof AutoRouterEdge, "AREdgeList.setEdgeByPointer: newEdge instanceof AutoRouterEdge FAILED!");
                var edge = section_first;
                while( edge !== null ){
                    if(pEdge === edge)
                        break;

                    edge = edge.getSectionDown();
                }

                assert(edge !== null, "AREdgeList.setEdgeByPointer: edge !== null FAILED!");
                edge = newEdge;
            };

            this.getEdgeAt = function(point, nearness){
                var edge = order_first;
                while(edge){
                
                    if(isPointNearLine(point, edge.getStartPoint(), edge.getEndPoint(), nearness))
                        return edge;

                    edge = edge.getOrderNext();
                }

                return null;
            };        

             this.dumpEdges = function(msg){
                var edge = order_first;
                console.log(msg);

                while( edge !== null ){
                    console.log('\t' + edge.getStartPoint().x + ', ' + edge.getStartPoint().y + '\t\t' + edge.getEndPoint().x + ', ' + edge.getEndPoint().y + '\t\t\t(' + (edge.getEdgeFixed() ? "FIXED" : "MOVEABLE" ) + ')');
                    edge = edge.getOrderNext();
                }
            };
                   
                //--Private Functions
            function position_GetRealY(edge, y){
                if(y === undefined){
                    if(ishorizontal){
                        assert( edge.getStartPoint().y === edge.getEndPoint().y, "AREdgeList.position_GetRealY: edge.getStartPoint().y === edge.getEndPoint().y FAILED!");
                        return edge.getStartPoint().y;
                    }

                    assert( edge.getStartPoint().x === edge.getEndPoint().x, "AREdgeList.position_GetRealY: edge.getStartPoint().x === edge.getEndPoint().x FAILED!");
                    return edge.getStartPoint().x;
                }else{

                    assert( edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull(), "AREdgeList.position_GetRealY: edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull() FAILED!");

                    if( ishorizontal){
                        assert( edge.getStartPoint().y === edge.getEndPoint().y, "AREdgeList.position_GetRealY: edge.getStartPoint().y === edge.getEndPoint().y FAILED!");
                        edge.setStartPointY(y);
                        edge.setEndPointY(y);
                    }else{
                        assert( edge.getStartPoint().x === edge.getEndPoint().x, "AREdgeList.position_GetRealY: edge.getStartPoint().x === edge.getEndPoint().x FAILED");

                        edge.setStartPointX(y);
                        edge.setEndPointX(y);
                    }
                }
            }

            function position_SetRealY(edge, y){
                if(edge instanceof Array) //TEST
                    edge = edge[0];
                 
                assert( edge != null && !edge.isStartPointNull() && !edge.isEndPointNull(), "AREdgeList.position_SetRealY: edge != null && !edge.isStartPointNull() && !edge.isEndPointNull() FAILED");

                if( ishorizontal )
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
            }

            function position_GetRealX(edge){
                assert( edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull(),"AREdgeList.position_GetRealX: edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull() FAILED");
                var x1, x2;

                if( ishorizontal ){
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
            }

            function position_GetRealO(edge){
                assert( edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull(), "AREdgeList.position_GetRealO: edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull() FAILED");
                var o1, o2;

                if(ishorizontal){
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
            }

            function position_LoadY(edge){
                assert( edge !== null && edge.getOrderNext() === null && edge.getOrderPrev() === null, "AREdgeList.position_LoadY: edge !== null && edge.getOrderNext() === null && edge.getOrderPrev() === null FAILED");

                edge.setPositionY( position_GetRealY(edge));
            }

            function position_LoadB(edge){
                assert( edge !== null, "AREdgeList.position_LoadB: edge !== null FAILED");

                edge.setBracketOpening(!edge.getEdgeFixed() && bracket_IsOpening(edge));
                edge.setBracketClosing(!edge.getEdgeFixed() && bracket_IsClosing(edge));
            }

            function positionAll_StoreY(){
                var edge = order_first;
                while( edge )
                {
                    position_SetRealY(edge, edge.getPositionY());

                    edge = edge.getOrderNext();
                }

            }

            function positionAll_LoadX(){
                var edge = order_first;
                while(edge){
                    var ex = [];
                    ex = position_GetRealX(edge, ex[0], ex[1]);
                    edge.setPositionX1(ex[0]);
                    edge.setPositionX2(ex[1]);

                    edge = edge.getOrderNext();
                }
            }

            function initOrder(){
                order_first = null;
                order_last = null;
            }
            
            function checkOrder(){
                assert( order_first === null && order_last === null, "AREdgeList.checkOrder: order_first === null && order_last === null FAILED");
            }

                //---Order

            this.insertBefore = function(edge, before){
                assert( edge !== null && before !== null && edge !== before, "AREdgeList.insertBefore: edge !== null && before !== null && edge !== before FAILED");
                assert( edge.getOrderNext() === null && edge.getOrderPrev() === null, "AREdgeList.insertBefore: edge.getOrderNext() === null && edge.getOrderPrev() === null FAILED");

                edge.setOrderPrev(before.getOrderPrev());
                edge.setOrderNext(before);

                if( before.getOrderPrev() ){
                    assert( before.getOrderPrev().getOrderNext() === before, "AREdgeList.insertBefore: before.getOrderPrev().getOrderNext() === before FAILED\nbefore.getOrderPrev().getOrderNext() is " + before.getOrderPrev().getOrderNext() + " and before is " + before );
                    before.getOrderPrev().setOrderNext(edge);

                    assert( order_first !== before, "AREdgeList.insertBefore: order_first !== before FAILED");
                }else{

                    assert( order_first === before, "AREdgeList.insertBefore: order_first === before FAILED");
                    order_first = edge;
                }

                before.setOrderPrev(edge);
            };

            this.insertAfter = function(edge, after){
                assert( edge !== null && after !== null && !edge.equals(after), "AREdgeList.insertAfter:  edge !== null && after !== null && !edge.equals(after) FAILED"); 
                assert( edge.getOrderNext() === null && edge.getOrderPrev() === null, "AREdgeList.insertAfter: edge.getOrderNext() === null && edge.getOrderPrev() === null FAILED ");

                edge.setOrderNext(after.getOrderNext());
                edge.setOrderPrev(after);

                if( after.getOrderNext() )
                {
                    assert( after.getOrderNext().getOrderPrev().equals(after), "AREdgeList.insertAfter:  after.getOrderNext().getOrderPrev().equals(after) FAILED");
                    after.getOrderNext().setOrderPrev(edge);

                    assert( !order_last.equals(after), "AREdgeList.insertAfter: !order_last.equals(after) FAILED" );
                }
                else
                {
                    assert( order_last.equals(after), "AREdgeList.insertAfter: order_last.equals(after) FAILED" );
                    order_last = edge;
                }

                after.setOrderNext(edge);
            };

            this.insertLast = function(edge){
                assert( edge !== null, "AREdgeList.insertLast: edge !== null FAILED" );
                assert( edge.getOrderPrev() === null && edge.getOrderNext() === null, "AREdgeList.insertLast: edge.getOrderPrev() === null && edge.getOrderNext() === null FAILED");

                edge.setOrderPrev(order_last);

                if( order_last )
                {
                    assert( order_last.getOrderNext() === null, "AREdgeList.insertLast: order_last.getOrderNext() === null FAILED");
                    assert( order_first != null, "AREdgeList.insertLast: order_first != null FAILED" );

                    order_last.setOrderNext(edge);
                    order_last = edge;
                }
                else
                {
                    assert( order_first === null, "AREdgeList.insertLast:  order_first === null FAILED");

                    order_first = edge;
                    order_last = edge;
                }
            };

            this.insert = function(edge){
                assert( edge !== null, "AREdgeList.insert:  edge !== null FAILED");
                assert( edge.getOrderPrev() === null && edge.getOrderNext() === null, "AREdgeList.insert: edge.getOrderPrev() === null && edge.getOrderNext() === null FAILED" );

                var y = edge.getPositionY();

                assert( ED_MINCOORD <= y && y <= ED_MAXCOORD,  "AREdgeList.insert: ED_MINCOORD <= y && y <= ED_MAXCOORD FAILED (y is " + y + ")");

                var insert = order_first;

                while( insert && insert.getPositionY() < y )
                    insert = insert.getOrderNext();

                if( insert )
                    this.insertBefore(edge, insert);
                else
                    this.insertLast(edge);
            };

            this.remove = function(edge){
                assert( edge !== null, "AREdgeList.remove:  edge !== null FAILED");

                if( order_first === edge )
                    order_first = edge.getOrderNext();

                if( edge.getOrderNext() )
                    edge.getOrderNext().setOrderPrev(edge.getOrderPrev());

                if( order_last === edge )
                    order_last = edge.getOrderPrev();

                if( edge.getOrderPrev() )
                    edge.getOrderPrev().setOrderNext(edge.getOrderNext());

                edge.setOrderNext(null);
                edge.setOrderPrev(null);
            };

            this.Delete = function(edge){
                assert( edge !== null, "AREdgeList.Delete: edge !== null FAILED" );

                self.remove(edge);

                edge.setOwner(null);

                edge = undefined;
            };

                //-- Private

            function slideButNotPassEdges(edge, y){
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
                        self.remove(edge); //This is where I believe the error could lie!
                        self.insertBefore(edge, insert);
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
                        self.remove(edge);//This is where I believe the error could lie!
                        self.insertAfter(edge, insert);
                    }

                }

                edge.setPositionY(y);

                return ret;
            }

            //------Section
            
            //private
                 
            function initSection(){
                section_first = null;
                section_blocker = null;
                section_ptr2blocked = null;
            }

            function checkSection(){
                if( !(section_blocker === null && section_ptr2blocked === null)){
                    //This used to be contained in an assert. Generally this fails when the router does not have a clean exit then is asked to reroute.
                    _logger.warning("section_blocker and section_ptr2blocked are not null. Assuming last run did not exit cleanly. Fixing...");
                    section_blocker === null;
                    section_ptr2blocked === null;
                }
            }
            
            function sectionReset(){
                checkSection();

                section_first = null;
            }
            
            function section_BeginScan(blocker){
                checkSection();

                section_blocker = blocker;

                section_blocker.setSectionX1(section_blocker.getPositionX1());
                section_blocker.setSectionX2(section_blocker.getPositionX2());

                section_blocker.setSectionNext(null);
                section_blocker.setSectionDown(null);
            }

            function section_IsImmediate (){
                assert( section_blocker != null && section_ptr2blocked != null && section_ptr2blocked != null, "AREdgeList.section_IsImmediate: section_blocker != null && section_ptr2blocked != null && *section_ptr2blocked != null FAILED");

                var section_blocked = section_ptr2blocked[0];

                var e = section_blocked.getSectionDown();

                var a1 = section_blocked.getSectionX1(),
                    a2 = section_blocked.getSectionX2(),
                    p1 = section_blocked.getPositionX1(),
                    p2 = section_blocked.getPositionX2(),
                    b1 = section_blocker.getSectionX1(),
                    b2 = section_blocker.getSectionX2();

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
            }
            
            
            function section_HasBlockedEdge(){
                assert( section_blocker != null, "AREdgeList.section_HasBlockedEdge: section_blocker != null FAILED");

                var b1 = section_blocker.getSectionX1(),
                    b2 = section_blocker.getSectionX2();

                assert( b1 <= b2, "AREdgeList.section_HasBlockedEdge: b1 <= b2 FAILED");

                //Setting section_ptr2blocked
                if( section_ptr2blocked === null ){

                    section_first = section_first === null ? [new AutoRouterEdge()] : section_first;
                    section_ptr2blocked = section_first;
                }
                else //section_ptr2blocked contains a null placeholder
                {
                    var current_edge = section_ptr2blocked[0];

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
                        section_ptr2blocked = current_edge.getSectionDownPtr();
                    }
                    else if( b1 <= a1 && a2 <= b2 )								// case 4
                    {
                        if( e && !e.getStartPoint().equals(emptyPoint))
                        {
                            while( e.getSectionNext() && !e.getSectionNext().getStartPoint().equals(emptyPoint))
                                e = e.getSectionNext();

                            e.setSectionNext(current_edge.getSectionNext());
                            section_ptr2blocked[0] = current_edge.getSectionDown();
                        }
                        else{

                            section_ptr2blocked[0] = (current_edge.getSectionNext()); 

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
                            section_ptr2blocked[0] = current_edge.getSectionDownPtr()[0];
                            o.setSectionNext(current_edge);
                            current_edge.setSectionDown(e);
                        }

                        assert( b2 < a1, "AREdgeList.section_HasBlockedEdge: b2 < a1 FAILED");
                        //Shifting the front of the p2b so it no longer overlaps section_blocker
                        current_edge.setSectionX1(a1);
                    }
                    else														// case 2
                    {
                        assert( a1 < b1 && b1 <= a2 && a2 <= b2,  "AREdgeList.section_HasBlockedEdge:  a1 < b1 && b1 <= a2 && a2 <= b2 FAILED");

                        section_ptr2blocked = current_edge.getSectionDownPtr();

                        while( e && !e.getStartPoint().equals(emptyPoint))
                        {
                            o = e;
                            e = e.getSectionNext();

                            if( o.getSectionX2() + 1 < b1 && ( e === null || e.getStartPoint().equals(emptyPoint) || o.getSectionX2() + 1 < e.getSectionX1() ) ){
                                section_ptr2blocked = o.getSectionNextPtr();
                            }
                        }

                        if( !section_ptr2blocked[0].getStartPoint().equals(emptyPoint) )
                        {
                            assert( o != null, "AREdgeList.section_HasBlockedEdge: o != null FAILED");
                            o.setSectionNext(current_edge.getSectionNext());

                            current_edge.setSectionX2(
                                (section_ptr2blocked[0].getSectionX1() < b1 ? section_ptr2blocked[0].getSectionX1() : b1) - 1);

                            current_edge.setSectionNext(section_ptr2blocked[0]);
                            section_ptr2blocked[0] = new AutoRouterEdge(); //This seems odd
                            section_ptr2blocked = null;

                        }
                        else
                            current_edge.setSectionX2(b1 - 1);

                        section_ptr2blocked = current_edge.getSectionNextPtr();
                    }
                }

                assert( section_ptr2blocked !== null, "AREdgeList.section_HasBlockedEdge: section_ptr2blocked != null FAILED");
                while( section_ptr2blocked[0] != null && !section_ptr2blocked[0].getStartPoint().equals(emptyPoint))
                {
                    var a1 = section_ptr2blocked[0].getSectionX1(),
                        a2 = section_ptr2blocked[0].getSectionX2();

                    //If section_ptr2blocked is completely to the left (or above) section_blocker
                    if( a2 < b1 )												// case 1
                    {
                        section_ptr2blocked = section_ptr2blocked[0].getSectionNextPtr();

                        assert( section_ptr2blocked != null, "AREdgeList.section_HasBlockedEdge: section_ptr2blocked != null FAILED");
                        continue;
                    }
                    //If section_blocker is completely to the right (or below) section_ptr2blocked 
                    else if( b2 < a1 )											// case 6
                        break;
                    
                    if( a1 < b1 && b2 < a2 )									// case 3
                    //If section_ptr2blocked starts before and ends after section_blocker
                    {
                        var x = b1,
                            e = section_ptr2blocked[0].getSectionDown();

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

                        section_ptr2blocked = section_ptr2blocked[0].getSectionDownPtr(); 
                        continue;
                    }
                    //This leaves the regular partial overlap possibility. They also include section_blocker starting before and ending after section_ptr2blocked.

                    return true;
                }

                assert( section_blocker.getSectionNext() === null && (section_blocker.getSectionDown() === null || section_blocker.getSectionDown().getStartPoint().equals(emptyPoint)) , "AREdgeList.section_HasBlockedEdge: section_blocker.getSectionNext() === null && section_blocker.getSectionDown() === null FAILED");

                section_blocker.setSectionNext((section_ptr2blocked[0]));
                section_ptr2blocked[0] = section_blocker; //Set anything pointing to section_ptr2blocked to point to section_blocker (eg, section_down)

                section_blocker = null;
                section_ptr2blocked = null;

                return false;
            }

            function section_GetBlockedEdge(){
                assert( section_blocker != null && section_ptr2blocked != null, "AREdgeList.sectionGetBlockedEdge: section_blocker != null && section_ptr2blocked != null FAILED" );

                return section_ptr2blocked[0];
            }
            
            //----Bracket
            
            function bracket_IsClosing(edge){
                assert( edge != null, "AREdgeList.bracket_IsClosing: edge != null FAILED" );
                assert( !edge.isStartPointNull() && !edge.isEndPointNull(), "AREdgeList.bracket_IsClosing: !edge.isStartPointNull() && !edge.isEndPointNull() FAILED");

                var start = edge.getStartPoint(),
                    end = edge.getEndPoint();

                if( edge.isStartPointPrevNull() || edge.isEndPointNextNull() )
                {
                    return false;
                }

                return ishorizontal ?
                    (edge.getStartPointPrev().y < start.y && edge.getEndPointNext().y < end.y ) :
                    (edge.getStartPointPrev().x < start.x && edge.getEndPointNext().x < end.x );
            }
            
            function bracket_IsOpening(edge){
                assert( edge != null, "AREdgeList.bracket_IsOpening: edge != null FAILED" );
                assert( !edge.isStartPointNull() && !edge.isEndPointNull(), "AREdgeList.bracket_IsOpening: !edge.isStartPointNull() && !edge.isEndPointNull() FAILED");

                var start = edge.getStartPoint(),
                    end = edge.getEndPoint();

                if( edge.isStartPointPrevNull() || edge.isEndPointNextNull() )
                    return false;

                return ishorizontal ?
                    (edge.getStartPointPrev().y > start.y && edge.getEndPointNext().y > end.y ) :
                    (edge.getStartPointPrev().x > start.x && edge.getEndPointNext().x > end.x );
            }
            
            function bracket_IsSmallGap(blocked, blocker){
                return bracket_IsOpening(blocked) || bracket_IsClosing(blocker);
            }
            
            function bracket_ShouldBeSwitched(edge, next){
                assert( edge != null && next != null, "AREdgeList.bracket_ShouldBeSwitched: edge != null && next != null FAILED");

                var ex = position_GetRealX(edge),
                    ex1 = ex[0], 
                    ex2 = ex[1], 
                    eo = position_GetRealO(edge),
                    eo1 = eo[0], 
                    eo2 = eo[1],
                    nx = position_GetRealX(next),
                    nx1 = nx[0], 
                    nx2 = nx[1], 
                    no = position_GetRealO(next),
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
            }

            //---Block

            function block_GetF(d, b, s){
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
            }

            function block_GetG(d, b, s){
                var g = d/(b+s),
                    S = EDLS_S,
                    R = EDLS_R,
                    D = EDLS_D;

                if( S < g && b > 0 )
                    g = ((R-S)*d + S*(D-R)*b) / ((D-S)*b + (R-S)*s);

                return g;
            }

            //Float equals
            function flt_equ (a, b){
                return ((a - .1) < b) && (b < (a + .1));
            }

            this.block_PushBackward = function(blocked, blocker){
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
                    b = 1 - s;

                for(;;)
                {
                    edge.setBlockTrace(trace);
                    trace = edge;
                    edge = edge.getBlockPrev();

                    if( edge === null )
                        break;

                    var d2 = trace.getPositionY() - edge.getPositionY();
                    assert( d2 >= 0, "AREdgeList.block_PushBackward:  d2 >= 0 FAILED");

                    if( edge.getBracketOpening() || trace.getBracketClosing() )
                    {
                        g = block_GetG(d,b,s);
                        if( d2 <= g )
                        {
                            f = block_GetF(d,b,s);
                            break;
                        }
                        s++;
                    }
                    else
                    {
                        f = block_GetF(d,b,s);
                        if( d2 <= f )
                        {
                            g = block_GetG(d,b,s);
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
                        f = block_GetF(d,b,s);
                        g = block_GetG(d,b,s);
                    }

                    assert( flt_equ(d, f*b + g*s), "AREdgeList.block_PushBackward: flt_equ(d, f*b + g*s) FAILED");

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
                            if( slideButNotPassEdges(trace, y) )
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

            this.block_PushForward = function(blocked, blocker){
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
                    b = 1 - s;

                for(;;)
                {
                    edge.setBlockTrace(trace);
                    trace = edge;
                    edge = edge.getBlockNext();

                    if( edge === null ){
                        break;
                    }

                    var d2 = edge.getPositionY() - trace.getPositionY();
                    assert( d2 >= 0, "AREdgeList.block_PushForward: d2 >= 0 FAILED");

                    if( trace.getBracketOpening() || edge.getBracketClosing() )
                    {
                        g = block_GetG(d,b,s);
                        if( d2 <= g )
                        {
                            f = block_GetF(d,b,s);
                            break;
                        }
                        s++;
                    }
                    else
                    {
                        f = block_GetF(d,b,s);
                        if( d2 <= f )
                        {
                            g = block_GetG(d,b,s);
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
                        f = block_GetF(d,b,s);
                        g = block_GetG(d,b,s);
                    }

                    assert( flt_equ(d, f*b + g*s), "AREdgeList.block_PushForward: flt_equ(d, f*b + g*s) FAILED");

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
                            
                            if( slideButNotPassEdges(trace, y) ) 
                                trace.setBlockNext(null);
                        }

                        edge = trace;
                    } while( edge !== blocked );
                }


                return modified;
            };

            this.block_ScanForward = function(){
                positionAll_LoadX();

                var modified = false;

                sectionReset();
                var blocker = order_first;
                while( blocker )
                {
                    var bmin = null, //block min?
                        smin = null, //section min?
                        bmin_f = ED_MINCOORD - 1,
                        smin_f = ED_MINCOORD - 1;

                    section_BeginScan(blocker);
                    while( section_HasBlockedEdge() )
                    {
                        if( section_IsImmediate() )
                        {
                            var blocked = section_GetBlockedEdge();
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
                            smin_f = block_GetF(blocker.getPositionY() - smin_f, 0, 1);

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

                positionAll_StoreY();

                return modified;
            };

            this.block_ScanBackward = function(){
                    positionAll_LoadX();

                    var modified = false;

                    sectionReset();
                    var blocker = order_last;
                    while( blocker )
                    {
                        var bmin = null,
                            smin = null,
                            bmin_f = ED_MAXCOORD + 1,
                            smin_f = ED_MAXCOORD + 1;

                        section_BeginScan(blocker);

                        while( section_HasBlockedEdge() )
                        {
                            if( section_IsImmediate() )
                            {
                                var blocked = section_GetBlockedEdge();

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
                                smin_f = block_GetF(smin_f - blocker.getPositionY(), 0, 1);

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

                    positionAll_StoreY();

                    return modified;
                };
                    
            this.block_SwitchWrongs = function(){
                    var was = false;

                    positionAll_LoadX();

                    var second = order_first;
                    while( second != null )
                    {
                        if( second.getClosestPrev() !== null && second.getClosestPrev().getClosestNext() !== (second) && //Check if it references itself
                            second.getClosestNext() !== null && second.getClosestNext().getClosestPrev() === (second) )
                            
                        {
                            assert( !second.getEdgeFixed(), "AREdgeList.block_SwitchWrongs: !second.getEdgeFixed() FAILED");

                            var edge = second,
                                next = edge.getClosestNext();

                            while( next !== null && edge === next.getClosestPrev() )
                            {
                                assert( edge !== null && !edge.getEdgeFixed(), "AREdgeList.block_SwitchWrongs: edge != null && !edge.getEdgeFixed() FAILED");
                                assert( next !== null && !next.getEdgeFixed(), "AREdgeList.block_SwitchWrongs: next != null && !next.getEdgeFixed() FAILED");

                                var ey = edge.getPositionY(),
                                    ny = next.getPositionY();

                                assert( ey <= ny, "AREdgeList.block_SwitchWrongs: ey <= ny FAILED");

                                if( ey + 1 <= ny && bracket_ShouldBeSwitched(edge, next) )
                                {
                                    was = true;

                                    assert( !edge.getEdgeCanpassed() && !next.getEdgeCanpassed(), "AREdgeList.block_SwitchWrongs: !edge.getEdgeCanpassed() && !next.getEdgeCanpassed() FAILED");
                                    edge.setEdgeCanpassed(true);
                                    next.setEdgeCanpassed(true);

                                    var a = slideButNotPassEdges(edge, (ny+ey)/2 + 0.001) !== null;
                                    a = slideButNotPassEdges(next, (ny+ey)/2 - 0.001) !== null || a;

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

                                    assert( !bracket_ShouldBeSwitched(next, edge), "AREdgeList.block_SwitchWrongs: !Bracket_ShouldBeSwitched(next, edge) FAILED");

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
                        positionAll_StoreY();

                    return was;
                };

        };
        var AutoRouterGraph = function (){
            var horizontal = new AutoRouterEdgeList(true),
                vertical = new AutoRouterEdgeList(false),
                boxes = [], 
                bufferBoxes = [],
                paths = [], 
                selfPoints = [],
                self = this,
                box2bufferBox = {}; //maps boxId to corresponding bufferbox object
                
            horizontal.setOwner(this);
            vertical.setOwner(this);

            //Initializing selfPoints
            selfPoints.push(new ArPoint(ED_MINCOORD, ED_MINCOORD));
            selfPoints.push(new ArPoint(ED_MAXCOORD, ED_MINCOORD));
            selfPoints.push(new ArPoint(ED_MAXCOORD, ED_MAXCOORD));
            selfPoints.push(new ArPoint(ED_MINCOORD, ED_MAXCOORD));

            this.getSelfPoints = function(){
                return selfPoints;
            }

            this.addEdges = addEdges; //This needs to be made public to allow for dynamically adding ports

            addSelfEdges();

            //Functions
            function remove(box){
                if(box instanceof AutoRouterBox){
                    deleteBoxAndPortEdges(box);

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

                    var iter2 = boxes.indexOf(box);
                    assert( iter2 > -1, "ARGraph.remove: Box does not exist");

                    boxes.splice(iter2, 1);

                }else{
                    var path = box;
                    deleteEdges(path);

                    path.setOwner(null);

                    var iter = paths.indexOf(path);
                    assert( iter > -1, "ARGraph.remove: Path does not exist");

                    paths.splice(iter, 1);
                }
            }

            function deleteAllBoxes(){
                var i = boxes.length;
                while( i-- )
                {
                    //deleteBoxAndPortEdges(boxes[i]);	// no need: there's a deleteAllEdges in deleteAll
                    boxes[i].destroy();
                    boxes.splice(i, 1);
                }

            }

            function getBoxList(){
                return boxes;
            }

            function hasNoBox(){
                return boxes.length === 0;
            }

            function getBoxCount(){
                return boxes.length;
            }

            function getBoxAt(point, nearness){
                var iter = 0;
                while (iter < boxes.length)
                {
                    if ((boxes[iter]).isBoxAt(point, nearness))
                        return (boxes[iter]);

                    ++iter;
                }

                return null;
            }

            function setPortAttr(port, attr){
                disconnectPathsFrom(port);
                port.setAttributes(attr);
            }

            function isRectClipBoxes(rect){
                for (var i = 0; i < boxes.length; i++)
                {
                    var boxRect = boxes[i].getRect();
                    if( isRectClip(rect, boxRect) )
                        return true;
                }
                return false;
            }

            function isRectClipBufferBoxes(rect){
                for (var i = 0; i < boxes.length; i++)
                {
                    var boxRect = boxes[i].getRect();
                    boxRect.inflateRect( BUFFER );
                    if( isRectClip(rect, boxRect) )
                        return true;
                }
                return false;
            }

            function isLineClipBufferBoxes(p1, p2){
                var rect = new ArRect(p1, p2);
                rect.normalizeRect();
                assert( rect.left === rect.right || rect.ceil === rect.floor, "ARGraph.isLineClipBoxes: rect.left === rect.right || rect.ceil === rect.floor FAILED");

                if( rect.left === rect.right)
                    rect.right++;
                if( rect.ceil === rect.floor )
                    rect.floor++;

                return isRectClipBufferBoxes(rect);
            }

            function isLineClipBoxes(p1, p2){
                var rect = new ArRect(p1, p2);
                rect.normalizeRect();
                assert( rect.left === rect.right || rect.ceil === rect.floor, "ARGraph.isLineClipBoxes: rect.left === rect.right || rect.ceil === rect.floor FAILED");

                if( rect.left === rect.right)
                    rect.right++;
                if( rect.ceil === rect.floor )
                    rect.floor++;

                return isRectClipBoxes(rect);
            }

            function canBoxAt(rect){
                return !isRectClipBoxes(inflatedRect(rect, 1));
            }

            function add(path){
                assert( path != null, "ARGraph.add: path != null FAILED" );
                assert(!path.hasOwner(), "ARGraph.add: !path.hasOwner() FAILED");

                path.setOwner(self);

                paths.push(path);

                addEdges(path);

                if(DEBUG){
                    AssertValidPath(path);
                }

            }

            function deleteAllPaths(){
                var iter = 0;

                while (iter < paths.length)
                {
                    //deleteEdges(*iter);	// no need: there's a deleteAllEdges in deleteAll

                    (paths[iter]).setOwner(null);
                    (paths[iter]).destroy();
                    (paths[iter]) = null;
                    ++iter;
                }

                paths = [];
            }

            function hasNoPath(){
                return paths.length === 0;
            }

            function getPathCount(){
                return paths.length;
            }

            function getListEdgeAt(point, nearness){

                var edge = horizontal.getEdgeAt(point, nearness);
                if( edge )
                    return edge;

                return vertical.getEdgeAt(point, nearness);
            }

            function isEmpty(){
                return boxes.length === 0 && paths.length === 0;
            }

            function getSurroundRect(){
                var rect = new ArRect(0,0,0,0);

                for (var i = 0; i < boxes.length; i++)
                {
                    rect.unionAssign(boxes[i].getRect());
                }

                for (var i = 0; i < paths.length; i++)
                {
                    rect.unionAssign(paths[i].getSurroundRect());
                }

                return rect;
            }

            function getOutOfBox(details){
                var bufferObject = box2bufferBox[details.box.getID()],
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
            }

            function goToNextBufferBox( args ){
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
                    boxList = bufferBoxes.length > 0 ? bufferBoxes : boxes;

                    //Add a new collection that handles overlapping boxes (creates a larger encompassing box)
                    while (iter < boxList.length)
                    {
                        var boxRect = boxList[iter].box;

                        if( !isPointInDirFrom(point, boxRect, dir) && //Add support for entering the parent box
                                isPointBetweenSides(point, boxRect, dir) &&     // if it will not put the point in a corner (relative to dir2)
                                isCoordInDirFrom(stophere, getChildRectOuterCoordFrom(boxList[iter], dir, point).coord, dir) ){ //Return extreme (parent box) for this comparison?
                            stophere = getChildRectOuterCoordFrom(boxList[iter], dir, point).coord;
                            boxby = boxList[iter]; 
                        }

                        ++iter;
                    }

                if(isHorizontal(dir))
                    point.x = stophere;
                else
                    point.y = stophere;

                return boxby;
            }

            function hugChildren(bufferObject, point, dir1, dir2, exitCondition){ 
                // This method creates a path that enters the parent box and "hugs" the children boxes (remains within one pixel of them) 
                // and follows them out.
                assert( (dir1 + dir2) % 2 === 1, "ARGraph.hugChildren: One and only one direction must be horizontal");
                var children = bufferObject.children,
                    parentBox = bufferObject.box,
                    initPoint = new ArPoint( point ),
                    child = goToNextBox( point, dir1, (dir1 === 1 || dir1 === 2 ? ED_MAXCOORD : ED_MINCOORD ), children ), 
                    finalPoint,
                    dir = dir2,
                    nextDir = nextClockwiseDir( dir1 ) === dir2 ? nextClockwiseDir : prevClockwiseDir,
                    points = [ [new ArPoint(point)] ],
                    hasExit = true;

                exitCondition = exitCondition === undefined ? function(pt) { return !parentBox.ptInRect(pt); } : exitCondition;

                while( hasExit && !exitCondition( point, bufferObject ) ){
                    var old = new ArPoint( point ),
                        nextChild = goToNextBox( point, dir, getRectOuterCoord( child, dir), children );

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

            }

            function goToNextBox(point, dir, stop1, stop2){
                var stophere= stop1,
                    boxList = boxes;//bufferBoxes.length > 0 ? bufferBoxes : boxes;

                if(stop2 !== undefined){
                    if( stop2 instanceof Array ){
                        boxList = stop2;
                    }else{
                        stophere = stop1 instanceof ArPoint ? 
                            chooseInDir(getPointCoord(stop1, dir), getPointCoord(stop2, dir), reverseDir(dir)) :
                            chooseInDir(stop1, stop2, reverseDir(dir));
                    }

                }else if(stop1 instanceof ArPoint){
                    stophere = getPointCoord(stophere, dir);
                }

                assert( isRightAngle(dir), "ArGraph.goToNextBox: isRightAngle(dir) FAILED" );
                assert( getPointCoord(point, dir) != stophere, "ArGraph.goToNextBox: getPointCoord(point, dir) != stophere FAILED" );

                var boxby = null,
                    iter = 0;

                    //Add a new collection that handles overlapping boxes (creates a larger encompassing box)
                    while (iter < boxList.length)
                    {
                        var boxRect = boxList[iter] instanceof ArRect ?  boxList[iter] : boxList[iter].getRect();

                        if( isPointInDirFrom(point, boxRect, reverseDir(dir)) &&
                                isPointBetweenSides(point, boxRect, dir) &&
                                isCoordInDirFrom(stophere, getRectOuterCoord(boxRect, reverseDir(dir)), dir) ) 
                        {
                            stophere = getRectOuterCoord(boxRect, reverseDir(dir));
                            boxby = boxList[iter].box || boxList[iter];
                        }

                        ++iter;
                    }

                if(isHorizontal(dir))
                    point.x = stophere;
                else
                    point.y = stophere;

                return boxby;
            }

            function getLimitsOfEdge(startPt, endPt, min, max){
                var t,
                    start = (new ArPoint()),
                    end = (new ArPoint()),
                    iter = 0;
                start.assign(startPt);
                end.assign(endPt);

                if( start.y === end.y )
                {
                    if( start.x > end.x )
                    {
                        t = start.x;
                        start.x = end.x;
                        end.x = t;
                    }

                    while( iter < boxes.length)
                    {
                        var rect = (boxes[iter]).getRect();
                        ++iter;

                        if(start.x < rect.right && rect.left <= end.x)
                        {
                            if( rect.floor <= start.y && rect.floor > min )
                                min = rect.floor;
                            if( rect.ceil > start.y && rect.ceil < max )
                                max = rect.ceil;
                        }
                    }
                }
                else
                {
                    assert( start.x === end.x, "ARGraph.getLimitsOfEdge: start.x === end.x FAILED" );

                    if( start.y > end.y )
                    {
                        t = start.y;
                        start.y = end.y;
                        end.y = t;
                    }

                    while( iter < boxes.length)
                    {
                        var rect = (boxes[iter]).getRect();
                        ++iter;

                        if(start.y < rect.floor && rect.ceil <= end.y)
                        {
                            if( rect.right <= start.x && rect.right > min )
                                min = rect.right;
                            if( rect.left > start.x && rect.left < max )
                                max = rect.left;
                        }
                    }
                }

                max--;

                return { "min": min, "max": max };
            }

            function isPointInBox(point){
                return getBoxAt(point) !== null;
            }

            function connect(path, startpoint, endpoint){
                if(startpoint === undefined){

                    var startport = path.getStartPort(),
                        endport = path.getEndPort(),
                        startdir = path.getStartDir(),
                        startportHasLimited = false,
                        startportCanHave = true;

                    if (startdir != Dir_None) {
                        startportHasLimited = startport.hasLimitedDirs();
                        startportCanHave = startport.canHaveStartEndPointOn(startdir, true);
                    }
                    if( startdir === Dir_None ||							// recalc startdir if empty
                        startportHasLimited && !startportCanHave)		// or is limited and userpref is invalid
                    {
                        startdir = startport.getStartEndDirTo(endport.getCenter(), true);
                    }

                    var enddir = path.getEndDir(),
                        endportHasLimited = false,
                        endportCanHave = true;

                    if (enddir != Dir_None) {
                        endportHasLimited = endport.hasLimitedDirs();
                        endportCanHave = endport.canHaveStartEndPointOn(enddir, false);
                    }
                    if( enddir === Dir_None ||							// like above
                        endportHasLimited && !endportCanHave)
                    {
                        enddir = endport.getStartEndDirTo(startport.getCenter(), false, startport === endport ? startdir : Dir_None );
                    }

                    startpoint = startport.createStartEndPointTo(endport.getCenter(), startdir);
                    endpoint = endport.createStartEndPointTo(startpoint, enddir);

                    if( startpoint.equals(endpoint) )
                        startpoint = stepOneInDir(startpoint, nextClockwiseDir(startdir));

                    return connect(path, startpoint, endpoint);

                }else{
                    assert(startpoint instanceof ArPoint, "ARGraph.connect: startpoint instanceof ArPoint FAILED");
                    assert( path != null && path.getOwner() === self, "ARGraph.connect: path != null && path.getOwner() === self FAILED");
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
                    var startBox = box2bufferBox[startPort.getOwner().getID()].box,
                        endBox = box2bufferBox[endPort.getOwner().getID()].box;

                    var start = new ArPoint(startpoint);
                    getOutOfBox({ "point": start, 
                            "dir": startdir, 
                            "end": endpoint, 
                            "box": startPort.getOwner() } );
                    assert( !start.equals(startpoint), "ARGraph.connect: !start.equals(startpoint) FAILED" );

                    var end = new ArPoint(endpoint);
                    getOutOfBox({ "point": end, 
                            "dir": enddir, 
                            "end": start, 
                            "box": endPort.getOwner() } ) ;
                    assert( !end.equals(endpoint), "ARGraph.connect: !end.equals(endpoint) FAILED" );

                    assert( path.isEmpty(),  "ARGraph.connect: path.isEmpty() FAILED" );

                    var ret = new ArPointListPath(),
                        isAutoRouted = path.isAutoRouted();
                    if (isAutoRouted)
                        connectPoints(ret, start, end, startdir, enddir);

                    if (!isAutoRouted)
                    {
                        var ret2 = path.applyCustomizationsBeforeAutoConnectPoints();

                        if (ret2.length > 0)
                        {
                            var pos = 0;
                            while( pos < ret2.length)
                            {
                                ret.push(ret2[pos++]);
                            }
                        }
                    }

                    path.deleteAll();
                    path.addTail(startpoint);
                    var pos = 0;
                    while( pos < ret.getLength())
                    {
                        var p = ret.get(pos++)[0];
                        path.addTail(p);
                    }
                    path.addTail(endpoint);

                    if (isAutoRouted) {
                        path.simplifyTrivially(); 
                        simplifyPathCurves(path);
                        simplifyPathPoints(path);
                        centerStairsInPathPoints(path, startdir, enddir);

                        //Make sure if a straight line is possible, the path is a straight line
                        //Note, this may make it so the stems are no longer centered in the port.
                        if(path.getPointList().getLength() === 4){
                            var startDir = startPort.port_OnWhichEdge(startpoint),
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
                                    minOverlap = Math.min(startRect.floor - 1, endRect.floor - 1);
                                    maxOverlap = Math.max(startRect.ceil, endRect.ceil);

                                    var newY = (minOverlap + maxOverlap)/2;
                                    newStart.y = newY;
                                    newEnd.y = newY;

                                    tstStart = new ArPoint(getRectOuterCoord(startPort.getOwner().getRect(), startDir), newStart.y);
                                    tstEnd = new ArPoint(getRectOuterCoord(endPort.getOwner().getRect(), endDir), newEnd.y);

                                }else{
                                    minOverlap = Math.min(startRect.right - 1, endRect.right - 1);
                                    maxOverlap = Math.max(startRect.left, endRect.left);

                                    var newX = (minOverlap + maxOverlap)/2;
                                    newStart.x = newX;
                                    newEnd.x = newX;

                                    tstStart = new ArPoint(newStart.x, getRectOuterCoord(startPort.getOwner().getRect(), startDir));
                                    tstEnd = new ArPoint(newEnd.x, getRectOuterCoord(endPort.getOwner().getRect(), endDir));
                                }

                                if( startRect.ptInRect(newStart) && endRect.ptInRect(newEnd)
                                        && !isLineClipBoxes(tstStart, tstEnd) ){

                                    startpoint.assign(newStart);
                                    endpoint.assign(newEnd);
                                    path.getPointList().splice(1, 2);
                                }
                            }

                        }
                    }
                    path.setState(ARPATHST_Connected);

                    // Apply custom edge modifications - step 1
                    // (Step 1: Move the desired edges - see in AutoRouterGraph::Connect(AutoRouterPath* path, ArPoint& startpoint, ArPoint& endpoint)
                    //  Step 2: Fix the desired edges - see in AutoRouterEdgeList::addEdges(AutoRouterPath* path))
                    if (isAutoRouted)
                        path.applyCustomizationsAfterAutoConnectPointsAndStuff();

                    return addEdges(path);
                }
            }

            function connectPoints(ret, start, end, hintstartdir, hintenddir){
                assert( ret.getLength() === 0, "ArGraph.connectPoints: ret.getLength() === 0 FAILED");

                var thestart = new ArPoint( start ), 
                    retend = ret.getLength(); 

                //This is where we create the original path that we will later adjust
                while( !start.equals(end) )
                {
                    var dir1 = exGetMajorDir(end.minus(start)),
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
                    var old = new ArPoint(start),
                        bufferObject,
                        box;

                    if( bufferBoxes.length === 0 ){
                        box = goToNextBox(start, dir1, end);
                    }else{
                        bufferObject = goToNextBufferBox({ "point": start, "dir": dir1, "dir2": dir2, "end": end });//Modified goToNextBox (that allows entering parent buffer boxes here
                        box = bufferObject === null ? null : bufferObject.box;
                    }
/*
                        box = goToNextBox(start, dir1, end);
                        bufferObject = box !== null ? box2bufferBox[ box.getID() ] : null;
*/

                    //If goToNextBox does not modify start
                    if( start.equals(old) )
                    {
                        assert( box != null, "ARGraph.connectPoints: box != null FAILED");
                        var rect = box instanceof ArRect ? box : box.getRect(); 

                        if( dir2 === Dir_None ){
                            dir2 = nextClockwiseDir(dir1);
                        }

                        assert( dir1 != dir2 && dir1 != Dir_None && dir2 != Dir_None, "ARGraph.connectPoints: dir1 != dir2 && dir1 != Dir_None && dir2 != Dir_None FAILED");
                        if( bufferObject.box.ptInRect( end ) && !bufferObject.box.ptInRect( start ) ){
                            var oldEnd = new ArPoint(end),
                                ret2 = new ArPointListPath(),
                                i;

                            connectPoints(ret2, end, start, hintenddir, dir1);
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
                            //goToNextBox(start, dir2, end);
                            if( bufferBoxes.length === 0 ){
                                goToNextBox(start, dir2, end); 
                            }else{
                                box = goToNextBufferBox({ "point": start, "dir": dir2, "dir2": dir1, "end": end });
                            }

                            // this assert fails if two boxes are adjacent, and a connection wants to go between
                            //assert( isPointInDirFrom(start, rect, dir2), "ARGraph.connectPoints: isPointInDirFrom(start, rect, dir2) FAILED");//This is not the best check with parent boxes
                            if( start.equals( old ) ){ //Then we are in a corner
                                var pts;
                                if( box.children.length > 1 ){
                                    pts = hugChildren( box, start, dir2, dir1, 
                                        function( pt, bo ) { return getPointCoord( pt, dir1 ) === getRectOuterCoord( bo.box, dir1); } ); 
                                }else{
                                    pts = hugChildren( bufferObject, start, dir1, dir2 );
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

                            var rev = 0;

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
                                        goToNextBufferBox({ "point": start, "dir": dir1, "end": end });
                                }

                            }else{ //If the box has multiple children
                                var pts = hugChildren( bufferObject, start, dir1, dir2, 
                                        function( pt, bo ) { return getPointCoord( pt, dir1 ) === getRectOuterCoord( bo.box, dir1); } ); 
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

            }

            function disconnectAll(){
                var iter = 0;
                
                while(iter < paths.length)
                {
                    disconnect(paths[iter]);
                    ++iter;
                }
            }

            function disconnect(path){
                if( path.isConnected() ){
                    deleteEdges(path);
                    path.getStartPort().removePoint(path.getStartPoint());//Removing points from ports
                    path.getEndPort().removePoint(path.getEndPoint());
                }

                path.deleteAll();
            }

            function disconnectPathsClipping(rect){
                var iter = paths.length;

                while(iter--)
                {
                    if( (paths[iter]).isPathClip(rect) )
                        disconnect(paths[iter]);
                }
            }

            function disconnectPathsFrom(box){
                if(box instanceof AutoRouterBox){
                    var iter = paths.length;

                    while(iter--)
                    {
                        var path = paths[iter],
                            startPort = path.getStartPort();

                        assert(startPort != null, "ARGraph.disconnectPathsFrom: startPort != null FAILED");
                        var startbox = startPort.getOwner();
                        assert(startbox != null, "ARGraph.disconnectPathsFrom: startbox != null FAILED");

                        var endPort = path.getEndPort();
                        assert(endPort != null, "ARGraph.disconnectPathsFrom: endPort != null FAILED");
                        var endbox = endPort.getOwner();
                        assert(endbox != null, "ARGraph.disconnectPathsFrom: endbox != null FAILED");

                        if( (startbox === box || endbox === box) )
                            disconnect(path);

                    }
                }else{
                    var iter = paths.length;
                    
                    while(iter--)
                    {
                        var path = paths[iter],
                            startport = path.getStartPort(),
                            endport = path.getEndPort();

                        if( (startport === port || endport === port) )
                            disconnect(path);

                    }
                }
            }

            function addSelfEdges(){
                horizontal.addEdges(self);
                vertical.addEdges(self);
            }

            function addEdges(obj){
                if(obj instanceof AutoRouterPath){
                    var path = obj;
                    return horizontal.addEdges(path) && vertical.addEdges(path);
                }else{ 
                    horizontal.addEdges(obj);
                    vertical.addEdges(obj);
                }
            }

            function deleteEdges(object){
                horizontal.deleteEdges(object);
                vertical.deleteEdges(object);
            }

            function addAllEdges(){
                assert( horizontal.isEmpty() && vertical.isEmpty(), "ARGraph.addAllEdges: horizontal.isEmpty() && vertical.isEmpty() FAILED"  );

                var iter = 0;

                while (iter < boxes.length)
                {
                    addBoxAndPortEdges(boxes[iter]);
                    ++iter;
                }

                var iterP = 0;

                while (iterP < paths.length)
                {
                    addEdges(paths[iterP]);
                    iterP++;
                }
            }

            function deleteAllEdges(){
                horizontal.deleteAllEdges();
                vertical.deleteAllEdges();
            }

            function addBoxAndPortEdges(box){
                assert( box != null, "ARGraph.addBoxAndPortEdges: box != null FAILED" );

                addEdges(box);

                var pl = box.getPortList(),
                    ii = 0;

                while( ii < pl.length){
                    addEdges(pl[ii]);
                    ++ii;
                }
            }

            function deleteBoxAndPortEdges(box){
                assert( box != null, "ARGraph.deleteBoxAndPortEdges: box != null FAILED");

                deleteEdges(box);

                var pl = box.getPortList(),
                    ii = 0;
                while( ii < pl.length){
                    deleteEdges(pl[ii++]);
                }
            }

            function getEdgeList(ishorizontal){
                return ishorizontal ? horizontal : vertical;
            }

            function candeleteTwoEdgesAt(path, points, pos){
                if(DEBUG){
                    assert( path.getOwner() === self, "ARGraph.candeleteTwoEdgesAt: path.getOwner() === self FAILED");
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

                var dir = getDir({ 'cx': parseInt(npoint.x - point.x), //'cast' it to an int to remove any decimal value
                                   'cy': parseInt(npoint.y - point.y) }); //Unfortunately, I need this to be a rough value or it may not correctly determine direction

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

                if( isLineClipBoxes(newpoint, npoint) ) return false;
                if( isLineClipBoxes(newpoint, ppoint) ) return false;

                return true;
            }

            function deleteTwoEdgesAt(path, points, pos){
                if(DEBUG){
                    assert( path.getOwner() === self, "ARGraph.deleteTwoEdgesAt: path.getOwner() === self FAILED");
                    path.assertValid();
                    assert( path.isConnected(), "ARGraph.deleteTwoEdgesAt: path.isConnected() FAILED" );
                    points.AssertValidPos(pos);
                }

                var pointpos = pos, //Getting the next, and next-next, points
                    point = points.get(pos++)[0],
                    npointpos = pos,
                    npoint = points.get(pos++)[0],
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

                var dir = getDir(npoint.minus(point));
                assert( isRightAngle(dir), "ARGraph.deleteTwoEdgesAt: isRightAngle(dir) FAILED");
                var ishorizontal = isHorizontal(dir);

                var newpoint = new ArPoint();
                if(ishorizontal){
                    newpoint.x = getPointCoord(npoint, ishorizontal);
                    newpoint.y = getPointCoord(ppoint, !ishorizontal);
                }else{
                    newpoint.x = getPointCoord(ppoint, !ishorizontal);
                    newpoint.y = getPointCoord(npoint, ishorizontal);
                }

                assert( getDir(newpoint.minus(ppoint)) === dir, "ARGraph.deleteTwoEdgesAt: getDir(newpoint.minus(ppoint)) === dir FAILED");

                assert( !isLineClipBoxes(newpoint, npoint), "ARGraph.deleteTwoEdgesAt: !isLineClipBoxes(newpoint, npoint) FAILED");
                assert( !isLineClipBoxes(newpoint, ppoint), "ARGraph.deleteTwoEdgesAt: !isLineClipBoxes(newpoint, ppoint) FAILED");

                var hlist = getEdgeList(ishorizontal),
                    vlist = getEdgeList(!ishorizontal);

                var ppedge = hlist.getEdgeByPointer(pppoint, ppoint),
                    pedge = vlist.getEdgeByPointer(ppoint, point),
                    nedge = hlist.getEdgeByPointer(point, npoint),
                    nnedge = vlist.getEdgeByPointer(npoint, nnpoint);

                assert( ppedge != null && pedge != null && nedge != null && nnedge != null, "ARGraph.deleteTwoEdgesAt:  ppedge != null && pedge != null && nedge != null && nnedge != null FAILED");

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
                    assert( nnnedge != null, "ARGraph.deleteTwoEdgesAt: nnnedge != null FAILED");
                    assert( nnnedge.getStartPointPrev().equals(npoint) && nnnedge.getStartPoint().equals(nnpoint), "ARGraph.deleteTwoEdgesAt: nnnedge.getStartPointPrev().equals(npoint) && nnnedge.getStartPoint().equals(nnpoint) FAILED" );
                    nnnedge.setStartPointPrev(ppoint);
                }

                if( nnpoint.equals(newpoint) )
                    deleteSamePointsAt(path, points, ppointpos);

            }

            function deleteSamePointsAt(path, points, pos){
                if(DEBUG){
                    assert( path.getOwner() === self, "ARGraph.deleteSamePointsAt: path.getOwner() === self FAILED" );
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
                    hlist = getEdgeList(ishorizontal),
                    vlist = getEdgeList(!ishorizontal),

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
                    assert( nnnedge != null && nnnedge.getStartPointPrev().equals(npoint) && nnnedge.getStartPoint().equals(nnpoint), "ARGraph.deleteSamePointsAt: nnnedge != null && nnnedge.getStartPointPrev().equals(npoint) && nnnedge.getStartPoint().equals(nnpoint) FAILED");
                    nnnedge.setStartPointPrev(ppoint);
                }

                if(DEBUG_DEEP){
                    path.assertValid();
                }
            }

            function simplifyPaths(){
                var was = false,
                    iter = 0;

                while (iter < paths.length)
                {
                    var path = paths[iter++];

                    if (path.isAutoRouted()) {
                        var pointList = path.getPointList(),
                            pointpos = 0;

                        while( pointpos < pointList.getLength() )
                        {
                            if( candeleteTwoEdgesAt(path, pointList, pointpos) )
                            {
                                deleteTwoEdgesAt(path, pointList, pointpos);
                                was = true;
                                break;
                            }
                            pointpos++;
                        }
                    }
                }

                return was;
            }

            function centerStairsInPathPoints(path, hintstartdir, hintenddir){
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

                        var np2 = new ArPoint(p2),
                            np3 = new ArPoint(p3),
                            h = isHorizontal(d12),

                            p4x = getPointCoord(p4, h),
                            p3x = getPointCoord(p3, h),
                            p1x = getPointCoord(p1, h);

                        //p1x will represent the larger x value in this 'step' situation
                        if( p1x < p4x )
                        {
                            var t = p1x;
                            p1x = p4x;
                            p4x = t;
                        }

                        if( p4x < p3x && p3x < p1x )
                        {
                            var m = (p4x + p1x)/2;
                            if(h){
                                np2.x = m;
                                np3.x = m;
                            }else{
                                np2.y = m;
                                np3.y = m;
                            }

                            var tmp = getLimitsOfEdge(np2, np3, p4x, p1x);
                            p4x = tmp.min;
                            p1x = tmp.max;

                            m = (p4x + p1x)/2;

                            if(h){
                                np2.x = m;
                                np3.x = m;
                            }else{
                                np2.y = m;
                                np3.y = m;
                            }

                            if( !isLineClipBoxes(np2, np3) &&
                                !isLineClipBoxes(p1p === pointList.getLength() ? outOfBoxEndPoint : p1, np2) &&
                                !isLineClipBoxes(p4p === 0 ? outOfBoxStartPoint : p4, np3) )
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
            }

            function simplifyPathCurves(path){
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
                        if( isRightAngle( getDir(p1.minus(p2)) ) && !isLineClipBoxes(p1, p2)){
                            pointList.splice( i+1, j-i-1); //Remove all points between i, j
                            break;
                        }
                    }
                    ++i;
                }
            }

            function simplifyPathPoints(path){
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

                    pos = 0;
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

                        var d = getDir(p2.minus(p1));
                        assert( isRightAngle(d), "ARGraph.simplifyPathPoints: isRightAngle(d) FAILED");
                        var h = isHorizontal(d);

                        var np3 = new ArPoint();
                        if(h){
                            np3.x = getPointCoord(p5, h);
                            np3.y = getPointCoord(p1, !h);
                        }else{
                            np3.x = getPointCoord(p1, !h);
                            np3.y = getPointCoord(p5, h);
                        }

                        if( !isLineClipBoxes(p2, np3) && !isLineClipBoxes(np3, p4) )
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
            }
            
            function connectAllDisconnectedPaths(){
                var iter,
                    success = false,
                    giveup = false;

                while (!success && !giveup) {
                    success = true;
                    iter = 0;
                    while (iter < paths.length && success)
                    {
                        var path = paths[iter];

                        if( !path.isConnected() )
                        {
                            success = connect(path);

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
                        disconnectAll();	// There was an error, delete halfway results to be able to start a new pass
                }
            }

            function createBufferBoxes(){
                //First I will create the atomic buffer boxes and store them in order of x
                var i = boxes.length,
                    k = -1,
                    j = 0,
                    added = false,
                    bufferBox,
                    rect,
                    box,
                    collection = [];

                bufferBoxes = [];

                while( i-- ){
                    rect = new ArRect(boxes[i].getRect());
                    rect.inflateRect(BUFFER);
                    box = { "rect": rect, "id": boxes[i].getID() };

                    while( collection[++k] && collection[k].rect.left < box.rect.left); //Get index for insertion
                    collection.splice( k, 0, box);
                    k = -1;
                }

                var groups = []; //Groups will contain grouped boxes by overlap
                i = 0;

                while( i < collection.length ){ //Adding element 'i' to the appropriate group
                    var overlaps = [];
                    j = 0;

                    while( j < groups.length ){ //Check all groups for intersection
                            var k = 0;

                            while( k < groups[j].length ){ //Check all boxes in the given group

                                if( groups[j][k] && !groups[j][k].rect.intersect( collection[i].rect ).isRectEmpty() ){
                                    //groups[j].push( collection[i] );
                                    overlaps.push(j);
                                    break;

                                }
                                k++;
                            }
                        j++;
                    }

                    //Combine all intersectings groups into one

                    if( overlaps.length > 0 ){
                        var n = overlaps.length,
                            group = [];

                        //Move all overlapping groups to group
                        while( n-- ){
                            group = group.concat(groups.splice( overlaps[n], 1)[0]);
                        }
                        group.push( collection[i] );
                        groups.push(group);
                    }else{
                        groups.push( [ collection[i] ] );
                    }

                    i++;
                }

                //Now to create the parent objects and add them to the bufferBoxes
                i = 0;
                while( i < groups.length ){
                    var k = 0,
                        parentBox = new ArRect( groups[i][0].rect );

                    while( k < groups[i].length ){
                        parentBox.unionAssign( groups[i][k].rect ); //Creating Parent Box
                        box2bufferBox[groups[i][k].id] = bufferBoxes.length;// match the box id with bufferbox index
                        groups[i][k] = groups[i][k].rect;
                        k++;
                    }

                    bufferBoxes.push( { "box": parentBox, "children": groups[i] });
                    i++;
                }

                for( var id in box2bufferBox ){ //change the indices to bufferbox elements 
                    box2bufferBox[id] = bufferBoxes[ box2bufferBox[id] ];
                }

            }

            //Public Functions
            this.disconnect = disconnect;

            this.setBuffer = function(newBuffer){
                BUFFER = newBuffer;
            };

            this.getPathList = function(){
                return paths;
            };

            this.calculateSelfPoints = function(){
                selfPoints = [];
                selfPoints.push(new ArPoint(ED_MINCOORD, ED_MINCOORD));
                selfPoints.push(new ArPoint(ED_MAXCOORD, ED_MINCOORD));
                selfPoints.push(new ArPoint(ED_MAXCOORD, ED_MAXCOORD));
                selfPoints.push(new ArPoint(ED_MINCOORD, ED_MAXCOORD));
            };

            this.createBox = function(){
                var box = new AutoRouterBox();
                assert( box != null, "ARGraph.createBox: box != null FAILED" );

                return box;
            };

            this.addBox = function(box){
                assert(box != null, "ARGraph.addBox: box != null FAILED");
                assert(box instanceof AutoRouterBox, "ARGraph.addBox: box instanceof AutoRouterBox FAILED");
                if (box === null)
                    return;

                var rect = box.getRect();

                disconnectPathsClipping(rect);

                box.setOwner(this);
                var boxId = boxes.length.toString();
                while( boxId.length < 6 ){
                    boxId = "0" + boxId;
                }
                box.setID("BOX_" + boxId);

                boxes.push(box);

                addBoxAndPortEdges(box);
            };

            this.deleteBox = function(box){
                assert(box != null, "ARGraph.deleteBox: box != null FAILED");
                if (box === null)
                    return;

                if( box.hasOwner() )
                {
                    remove(box);
                }
                
                box.destroy();
                box = null;
            };

            this.shiftBoxBy = function(box, offset){
                assert(box != null, "ARGraph.shiftBoxBy: box != null FAILED");
                if (box === null)
                    return;

                deleteBoxAndPortEdges(box);

                var rect = box2bufferBox[box.getID()].box; 
                disconnectPathsClipping(rect); //redraw all paths clipping parent box.

                box.shiftBy(offset);
                addBoxAndPortEdges(box);

                rect = box.getRect();
                disconnectPathsClipping(rect);
                disconnectPathsFrom(box);
            };

            this.setBoxRect = function(box, rect){
                if (box === null)
                    return;

                deleteBoxAndPortEdges(box);
                box.setRect(rect);
                addBoxAndPortEdges(box);

                disconnectPathsClipping(rect);
            };

            this.autoRoute = function(){
                createBufferBoxes(); 
                connectAllDisconnectedPaths();

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
                        if( simplifyPaths() )
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
                        if( horizontal.block_ScanBackward() )
                        {
                            updated = 1;

                            do {
                                c--;
                            } while( c > 0 && horizontal.block_ScanBackward() );

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
                        if( horizontal.block_ScanForward() )
                        {
                            updated = 1;

                            do {
                                c--;
                            } while( c > 0 && horizontal.block_ScanForward() );

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
                        if( vertical.block_ScanBackward() )
                        {
                            updated = 1;

                            do
                            c--;
                            while( c > 0 && vertical.block_ScanBackward() ); 

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
                        if( vertical.block_ScanForward() )
                        {
                            updated = 1;

                            do
                            c--;
                            while( c > 0 && vertical.block_ScanForward() );

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
                        if( horizontal.block_SwitchWrongs() )
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
                        if( vertical.block_SwitchWrongs() )
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
                {
                    var pathiter = 0;

            //		HRESULT hr = S_OK;
                    while (pathiter < paths.length)
                    {
                        var path = paths[pathiter];

                        if (path.isAutoRouted()) {	// comment this if you want the check to run for fully customizable connections

                            if (path.areTherePathCustomizations())
                            {
                                var startBoxRect = path.getStartBox(),
                                    endBoxRect = path.getEndBox(),

                                    boxiter = 0;

                                while (boxiter < boxes.length)
                                {
                                    var boxRect = boxes[boxiter].getRect(),
                                        isStartOrEndRect = (!startBoxRect.isRectEmpty() && isRectIn(startBoxRect, boxRect) ||
                                                             !endBoxRect.isRectEmpty() && isRectIn(endBoxRect, boxRect));

                                    if (path.isPathClip(boxRect, isStartOrEndRect))
                                    {
                                        //path->MarkPathCustomizationsForDeletion(aspect); //The aspect is related to the GUI
                                        updated = -2;
                                    }

                                    ++boxiter;
                                }
                            }
                        }

                        pathiter++;
                    }
                }

                _logger.info("c has been decremented " + (100 - c) + " times\nlast is " + last + 
                "\nd is " + d + "\ndm is " + dm);
                return updated;
            };

            this.deletePath = function(path){
                assert(path != null, "ARGraph.deletePath: path != null FAILED");
                if (path === null)
                    return;

                if( path.hasOwner() )
                {
                    assert( path.getOwner() === this, "ARGraph.deletePath: path.getOwner() === this FAILED");

                    remove(path);
                }

                path.destroy();
                path = null;
            };

            this.deleteAll = function(addBackSelfEdges){
                deleteAllPaths();
                deleteAllBoxes();
                deleteAllEdges();
                if (addBackSelfEdges)
                    addSelfEdges();
            };

            this.getPathAt = function(point, nearness){
                var iter = 0;

                while (iter < paths.length)
                {
                    var path = paths[iter];

                    if( path.isPathAt(point, nearness) )
                        return path;

                    ++iter;
                }

                return null;
            };

            this.addPath = function(isAutoRouted, startport, endport){
                var path = new AutoRouterPath();

                path.setAutoRouting(isAutoRouted);
                path.setStartPort(startport);
                path.setEndPort(endport);
                add(path);

                return path;
            };

            this.isEdgeFixed = function(path, startpoint, endpoint){
                var d = getDir(endpoint.minus(startpoint)),
                    h = isHorizontal(d),

                    elist = getEdgeList(h),

                    edge = elist.getEdge(path, startpoint, endpoint);
                if (edge != null)
                    return edge.getEdgeFixed() && !edge.getEdgeCustomFixed();

                assert(false, "ARGraph.isEdgeFixed: FAILED");
                return true;
            };

            this.destroy = function(){
                deleteAll(false);

                horizontal.SetOwner(null);
                vertical.SetOwner(null);
            };

            this.assertValid = function(){
                var iter = 0;

                while (iter < boxes.length)
                {
                    assertValidBox(boxes[iter]);
                    ++iter;
                }

                var iter2 = 0;
                
                while(iter2 < paths.length)
                {
                    assertValidPath(paths[iter2]);
                    ++iter2;
                }
            };

            this.assertValidBox = function(box){
                box.assertValid();
                assert( box.getOwner().equals(this), "ARGraph.assertValidBox: box.getOwner().equals(this) FAILED");

                var iter = boxes.indexOf(box);
                assert (iter != -1, "ARGraph.assertValidBox: iter != -1 FAILED");
            };

            this.assertValidPath = function(path){
                path.assertValid();
                assert( path.getOwner().equals(this), "ARGraph.assertValidPath: path.getOwner().equals(this) FAILED");

                var iter = paths.indexOf(path);
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

                    while( pos < pointList.length)
                    {
                        var p = pointList[pos++];
                        if( pos != pointList.length)
                            assert( !isPointInBox(p), "ARGraph.assertValidPath: !isPointInBox(p) FAILED");
                        else
                            assert( isPointInBox(p), "ARGraph.assertValidPath: isPointInBox(p) FAILED" );
                    }
                }
            };

            this.dumpPaths = function(pos, c){
                console.log("Paths dump pos " + pos + ", c " + c);
                var iter = 0,
                    i = 0;

                while (iter < paths.length)
                {
                    console.log(i + ". Path: ");
                    (paths[iter]).getPointList().dumpPoints("DumpPaths");

                    ++iter;
                    i++;
                }

                dumpEdgeLists();
            };

            this.dumpEdgeLists = function(){
                horizontal.dumpEdges("Horizontal edges:");
                vertical.dumpEdges("Vertical edges:");
            };

            // AutoRouterGraph
        };

    var AutoRouterPath = function (){
            var owner = null,
                
                startport = null,
                endport = null,

                attributes = ARPATH_Default,
                state = ARPATHST_Default,
                isAutoRoutingOn = true,
                customPathData = [],
                customizationType = "Points",
                pathDataToDelete = [],
                points = new ArPointListPath(),
                self = this;

            //Functions

            this.Delete = function (){
                deleteAll();
                this.setOwner(null);
            };

            //----Points

            function getPointPosAt(point, nearness){
                var pos = 0;

                while( pos < points.getLength() )
                {
                    var oldpos = pos;
                    if( isPointNear(points[pos++], point, nearness) )
                        return oldpos;
                }
                
                return points.getLength();
            };

            function getEdgePosAt(point, nearness){
                var tmp = points.getTailEdge(a, b),
                    a = tmp.start,
                    b = tmp.end,
                    pos = tmp.pos;

                while( pos < points.getLength())
                {
                    if( isPointNearLine(point, a, b, nearness) )
                        return pos;

                    tmp = points.getPrevEdge(pos, a, b);
                    a = tmp.start;
                    b = tmp.end;
                    pos = tmp.pos;
                    
                }

                return points.getLength();
            };

            this.getOwner = function(){
                return owner;
            };

            this.hasOwner = function(){
                return owner !== null;
            };

            this.setOwner = function(newOwner){
                owner = newOwner;
            };

            this.setStartPort = function(newPort){
                startport = newPort;
            };

            this.setEndPort = function(newPort){
                endport = newPort;
            };

            this.clearPorts = function(){
                startport = null;
                endport = null;
            };

            this.getStartPort = function(){
                return startport;
            };

            this.getEndPort = function(){
                return endport;
            };

            this.isConnected = function(){
                return (state & ARPATHST_Connected) != 0;
            };

            this.addTail = function(pt){
                assert( !this.isConnected(), "ARPath.addTail: !this.isConnected() FAILED");
if(!(pt instanceof Array)){
pt = [pt];
}
                points.push(pt);
            };

            this.deleteAll = function(){
                points = new ArPointListPath();
                state = ARPATHST_Default;
            };

            this.hasNoPoint = function(){
                return points.getLength() === 0;
            };

            this.getPointCount = function(){
                return points.getLength();
            };

            this.getStartPoint = function(){
                assert( points.getLength() >= 2, "ARPath.getStartPoint: points.getLength() >= 2 FAILED");
                return points.get(0)[0];
            };

            this.getEndPoint = function(){
                assert( points.getLength() >= 2, "ARPath.getEndPoint: points.getLength() >= 2 FAILED");
                return points.get(points.getLength() - 1)[0];
            };

            this.getStartBox = function(){
                var startbox = startport.getOwner();
                return startbox.getRect();
            };

            this.getEndBox = function(){
                var endbox = endport.getOwner();
                return endbox.getRect();
            };

            this.getOutOfBoxStartPoint = function(hintDir){
                var startBoxRect = this.getStartBox();

                assert( hintDir != Dir_Skew, "ARPath.getOutOfBoxStartPoint: hintDir != Dir_Skew FAILED"  );
                assert( points.getLength() >= 2, "ARPath.getOutOfBoxStartPoint: points.getLength() >= 2 FAILED" );

                var pos = 0,
                    p = new ArPoint(points.get(pos++)[0]);
                    var d = getDir(points.get(pos)[0].minus(p));

                if (d === Dir_Skew)
                    d = hintDir;
                assert( isRightAngle(d), "ARPath.getOutOfBoxStartPoint: isRightAngle(d) FAILED");

                if(isHorizontal(d))
                    p.x = getRectOuterCoord(startBoxRect, d);
                else
                    p.y = getRectOuterCoord(startBoxRect, d);

                //assert( getDir(points.get(pos)[0].minus(p)) === reverseDir( d ) || getDir(points.get(pos)[0].minus(p)) === d, "getDir(points.get(pos)[0].minus(p)) === reverseDir( d ) || getDir(points.get(pos)[0].minus(p)) === d FAILED"); 

                return p;
            };

            this.getOutOfBoxEndPoint = function(hintDir){
                var endBoxRect = this.getEndBox();

                assert( hintDir != Dir_Skew, "ARPath.getOutOfBoxEndPoint: hintDir != Dir_Skew FAILED" );
                assert( points.getLength() >= 2, "ARPath.getOutOfBoxEndPoint: points.getLength() >= 2 FAILED");

                var pos = points.getLength() - 1,
                    p = new ArPoint(points.get(pos--)[0]),
                    d = getDir(points.get(pos)[0].minus(p));

                if (d === Dir_Skew)
                    d = hintDir;
                assert( isRightAngle(d), "ARPath.getOutOfBoxEndPoint: isRightAngle(d) FAILED");

                if(isHorizontal(d))
                    p.x = getRectOuterCoord(endBoxRect, d);
                else
                    p.y = getRectOuterCoord(endBoxRect, d);

                //assert( getDir(points.get(pos)[0].minus(p)) === reverseDir( d ) || getDir(points.get(pos)[0].minus(p)) === d, "ARPath.getOutOfBoxEndPoint: getDir(points.get(pos)[0].minus(p)) === d || getDir(points.get(pos)[0].minus(p)) === d FAILED"); 

                return p;
            };

            this.simplifyTrivially = function(){
                assert( !this.isConnected(), "ARPath.simplifyTrivially: !isConnected() FAILED" );

                if( points.getLength() <= 2 ){
                    return;
                }
                
                var pos = 0,
                    pos1 = pos;

                assert( pos1 != points.getLength(), "ARPath.simplifyTrivially: pos1 != points.getLength() FAILED");
                var p1 = points.get(pos++)[0],
                    pos2 = pos;

                assert( pos2 != points.getLength(), "ARPath.simplifyTrivially: pos2 != points.getLength() FAILED" );
                var p2 = points.get(pos++)[0],
                    dir12 = getDir(p2.minus(p1)),
                    pos3 = pos;

                assert( pos3 != points.getLength(), "ARPath.simplifyTrivially: pos3 != points.getLength() FAILED");
                var p3 = points.get(pos++)[0],
                    dir23 = getDir(p3.minus(p2)); 

                for(;;)
                {
                    if( dir12 === Dir_None || dir23 === Dir_None ||
                        (dir12 != Dir_Skew && dir23 != Dir_Skew &&
                        (dir12 === dir23 || dir12 === reverseDir(dir23)) ) )
                    {
                        points.splice(pos2, 1);
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

                    if( pos === points.getLength() ){
                        return;
                    }

                    pos2 = pos3;
                    p2 = p3;

                    pos3 = pos;
                    p3 = points.get(pos++)[0];

                    dir23 = getDir(p3.minus(p2));
                }

            if(DEBUG)
                AssertValidPoints();
            };

            this.getPointList = function(){
                return points;
            };

            this.setPoints = function(npoints){
                points = new ArPointListPath();
                var pos = 0;

                while(pos < npoints.getLength()){
                    points.push(npoints.pos);
                }
            };

            this.getSurroundRect = function(){
                var rect = new ArRect(INT_MAX,INT_MAX,INT_MIN,INT_MIN),
                    pos = 0;

                while( pos < points.getLength())
                {
                    var point = points[pos++];

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

            this.isEmpty = function(){
                return points.getLength() === 0;
            };

            this.isPathAt = function(pt, nearness){
                return getEdgePosAt(point, nearness) != points.getLength()();
            };

            this.isPathClip = function(r, isStartOrEndRect){
                var tmp = points.getTailEdge(a, b),
                    a = tmp.start,
                    b = tmp.end,
                    pos = tmp.pos,
                    i = 0,
                    numEdges = points.getLength() - 1;

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

                    tmp = points.getPrevEdge(pos, a, b);
                    a = tmp.start;
                    b = tmp.end;
                    pos = tmp.pos;
                    i++;
                }

                return false;
            };

            this.setAttributes = function(attr){
                attributes = attr;
            };

            this.getAttributes = function(){
                return attributes;
            };

            this.isFixed = function(){
                return ((attributes & ARPATH_Fixed) != 0);
            };

            this.isMoveable = function(){
                return ((attributes & ARPATH_Fixed) === 0);
            };

            this.isHighLighted = function(){
                return ((attributes & ARPATH_HighLighted) != 0);
            };

            this.getState = function(){
                return state;
            };

            this.setState = function(s){
                assert( owner !== null, "ARPath.setState: owner !== null FAILED");

                state = s;
                if(DEBUG)
                    assertValid();
            };

            this.getEndDir = function(){
                var a = attributes & ARPATH_EndMask;
                return	a & ARPATH_EndOnTop ? Dir_Top :
                        a & ARPATH_EndOnRight ? Dir_Right :
                        a & ARPATH_EndOnBottom ? Dir_Bottom :
                        a & ARPATH_EndOnLeft ? Dir_Left : Dir_None;
            };

            this.getStartDir = function(){
                var a = attributes & ARPATH_StartMask;
                return	a & ARPATH_StartOnTop ? Dir_Top :
                        a & ARPATH_StartOnRight ? Dir_Right :
                        a & ARPATH_StartOnBottom ? Dir_Bottom :
                        a & ARPATH_StartOnLeft ? Dir_Left : Dir_None;
            };
                
            this.setEndDir = function(arpath_end){
                attributes = (attributes & ~ARPATH_EndMask) + arpath_end;
            };

            this.setStartDir = function(arpath_start){
                attributes = (attributes & ~ARPATH_StartMask) + arpath_start;
            };

            this.setCustomPathData = function(pDat){
                customPathData = pDat;

                //Disconnect path 
                owner.disconnect(this);
            };
            
            this.applyCustomizationsBeforeAutoConnectPoints = function(){
                var plist = [];

                if (customPathData.length === 0)
                    return;

                var i = 0;
                while( i < customPathData.length ){
                    if( customPathData[i].getType() === CustomPointCustomization ){
                        var pt = new ArPoint();
                        pt.x = customPathData[i].getX();
                        pt.y = customPathData[i].getY();
                        plist.push( [ pt ] );
                    }

                    ++i;
                }

                return plist;
            };

            this.applyCustomizationsAfterAutoConnectPointsAndStuff = function(){
                //This sets customizations of the type "SimpleEdgeDisplacement"
                if (customPathData.length === 0)
                    return;

                var numEdges = points.getLength() - 1;
                if (isAutoRoutingOn) {
                    var ii = 0;
                    while (ii < customPathData.length){
                        if ((customPathData[ii]).getEdgeCount() != numEdges &&
                            (customPathData[ii]).getType() === SimpleEdgeDisplacement)
                        {
                            pathDataToDelete.push(customPathData[ii]);
                            customPathData.splice(ii, 1);
                        } else {
                            ++ii;
                        }
                    }
                }

                var currEdgeIndex = 0,
                    tmp = points.getHeadEdgePtrs(startpoint, endpoint),
                    endpoint = tmp.end,
                    startpoint = tmp.start,
                    pos = tmp.pos;

                while (pos < points.getLength()){
                    var ii = 0;
                    while (ii < customPathData.length) {
                        var increment = true;
                        if (currEdgeIndex === (customPathData[ii]).getEdgeIndex()) {
                            if ((customPathData[ii]).getType() === SimpleEdgeDisplacement) {
                                var dir = getDir(endpoint.minus(startpoint)),
                                    isHorizontalVar = (isHorizontal(dir) != 0),
                                    doNotApply = false;
                                if ((customPathData[ii]).isHorizontalOrVertical() === isHorizontalVar) {
                                    var xToSet = (customPathData[ii]).getX(),
                                        yToSet = (customPathData[ii]).getY();
                                    // Check if the edge displacement at the end of the path
                                    // is still within the boundary limits of the start or the end box
                                    if (currEdgeIndex === 0 || currEdgeIndex === numEdges - 1) {
                                        var startRect = startport.getRect(),
                                            endRect = endport.getRect(),
                                            minLimit = (currEdgeIndex === 0 ?
                                            ((customPathData[ii]).IsHorizontalOrVertical() ? startRect.ceil : startRect.left) :
                                            ((customPathData[ii]).IsHorizontalOrVertical() ? endRect.ceil : endRect.left)),
                                            maxLimit = (currEdgeIndex === 0 ?
                                            ((customPathData[ii]).IsHorizontalOrVertical() ? startRect.floor : startRect.right) :
                                            ((customPathData[ii]).IsHorizontalOrVertical() ? endRect.floor : endRect.right)),
                                            valueToSet = (customPathData[ii]).IsHorizontalOrVertical() ? yToSet : xToSet;
                                        if (valueToSet < minLimit || valueToSet > maxLimit)
                                            doNotApply = true;
                                    }
                                    if (!doNotApply) {
                                        if ((customPathData[ii]).isHorizontalOrVertical()) {
                                            startpoint.y = yToSet;
                                            endpoint.y = yToSet;
                                        } else {
                                            startpoint.x = xToSet;
                                            endpoint.x = xToSet;
                                        }
                                    }
                                }
                                if ((customPathData[ii]).isHorizontalOrVertical() != isHorizontalVar || doNotApply) {
                                    // something went wrong, invalid data: direction (horz/vert) not match
            //						assert(false);
                                    pathDataToDelete.push(customPathData[ii]);
                                    customPathData.splice(ii, 1);
                                    increment = false;
                                }
                            }
                        }
                        if (increment)
                            ++ii;
                    }

                    var tmp = points.getNextEdgePtrs(pos, startpoint, endpoint);
                    pos = tmp.pos; 
                    startpoint = tmp.start;
                    endpoint = tmp.end;

                    currEdgeIndex++;
                }
            };

            this.removePathCustomizations = function(){
                var ii = 0;
                while(ii < customPathData.length){
                    pathDataToDelete.push(customPathData[ii++]);
                }
                customPathData = [];
            };

            this.markPathCustomizationsForDeletion = function(asp){
                var ii = 0;
                while (ii < customPathData.length) {
                    if ((customPathData[ii]).getAspect() === asp)
                        pathDataToDelete.push(customPathData[ii]);
                    ++ii;
                }
            };

            this.removeInvalidPathCustomizations = function(asp){
                // We only inhibit/delete those edges, which has an edge count
                // (redundant data intended for this very sanity check)
                // doesn't equal to edge count
                var ii = 0,
                    numEdges = points.getLength() - 1;
                while (ii < customPathData.length) {
                    if ((customPathData[ii]).getAspect() === asp) {
                        if ((customPathData[ii]).getEdgeCount() != numEdges &&
                            (customPathData[ii]).getType() === SimpleEdgeDisplacement)
                        {
                            customPathData.splice(ii, 1);
                        } else {
                            ++ii;
                        }
                    } else {
                        ++ii;
                    }
                }
            };
            
            this.areTherePathCustomizations = function(){
                return customPathData.length !== 0;
            };

            this.areThereDeletedPathCustomizations = function(){
                return pathDataToDelete.length !== 0;
            };

            this.getDeletedCustomPathData = function(cpd){
                var ii = 0;
                while(ii < pathDataToDelete.length){
                    cpd.push(pathDataToDelete[ii++]);
                }
            };

            this.getCustomizedEdgeIndexes = function(indexes){
                indexes = [];
                var ii = 0;
                while(ii < customPathData.length)
                {
                    if (this.isAutoRouted() && (customPathData[ii]).getType() === SimpleEdgeDisplacement ||
                        !this.isAutoRouted() && (customPathData[ii]).getType() != SimpleEdgeDisplacement)
                    {
                        var edgeIndex = (customPathData[ii]).getEdgeIndex();
                        indexes.push(edgeIndex);
                    }
                    ++ii;
                }
            };

            this.isAutoRouted = function(){
                return isAutoRoutingOn;
            };
            
            this.setAutoRouting = function(arState){
                isAutoRoutingOn = arState;
            };

            this.destroy = function(){
                if( this.isConnected() ){
                    this.getStartPort().removePoint(this.getStartPoint());
                    this.getEndPort().removePoint(this.getEndPoint());
                }

                this.setStartPort(null);
                this.setEndPort(null);
            };

            this.getExtPtr = function(){
                return extptr;
            };

            this.setExtPtr = function(p){
                extptr = p;
            };

            this.assertValid = function(){
                if( startport !== null )
                    startport.assertValid();

                if( endport !== null )
                    endport.assertValid();

                if( isConnected() )
                    assert( points.getLength() !== 0, "ARPath.assertValid: points.getLength() !== 0 FAILED" );
                else
                    assert( points.getLength() === 0, "ARPath.assertValid: points.getLength() === 0 FAILED");
            };

            this.assertValidPos = function(pos){
                return pos < points.getLength();
            };

            this.assertValidPoints = function(){
            };
            
        };

        var AutoRouterPort = function (){
            var owner = null,
            limitedDirections = false,
            rect = new ArRect(),
            attributes = ARPORT_Default,
            points = [ [], [], [], [] ],//For points on Dir_Top, Dir_Left, Dir_Right, etc
            selfPoints = [];

            calculateSelfPoints();

            //Public functions
            this.destroy = destroy;
            this.getOwner = getOwner;
            this.hasOwner = hasOwner;
            this.setOwner = setOwner;

            this.getRect = getRect;
            this.isRectEmpty = isRectEmpty;
            this.getCenter = getCenter;
            this.setRect = setRect;
            this.shiftBy = shiftBy;
            this.getSelfPoints = getSelfPoints;

            this.getAttributes = getAttributes;
            this.setAttributes = setAttributes;
            this.isConnectToCenter = isConnectToCenter;
            this.hasLimitedDirs = hasLimitedDirs;
            this.setLimitedDirs = setLimitedDirs;

            this.isPortAt = isPortAt;
            this.isPortClip = isPortClip;
            this.isPortIn = isPortIn;
            this.port_OnWhichEdge = port_OnWhichEdge;

            this.canHaveStartEndPointOn = canHaveStartEndPointOn;
            this.canHaveStartEndPoint = canHaveStartEndPoint;
            this.canHaveStartEndPointHorizontal = canHaveStartEndPointHorizontal;
            this.getStartEndDirTo = getStartEndDirTo;

            this.canCreateStartEndPointAt = canCreateStartEndPointAt;
            this.createStartEndPointAt = createStartEndPointAt;
            this.createStartEndPointTo = createStartEndPointTo;
            this.createStartEndPointOn = createStartEndPointOn;
            this.removePoint = removePoint;

            function calculateSelfPoints(){
                selfPoints = [];
                selfPoints.push(new ArPoint(rect.getTopLeft()));

                selfPoints.push(new ArPoint( rect.right - 1, rect.ceil));
                selfPoints.push(new ArPoint(rect.right - 1, rect.floor - 1));
                selfPoints.push(new ArPoint(rect.left, rect.floor - 1));
            }

            function destroy(){
                this.setOwner(null);
            }

            function getOwner(){
                return owner;
            }

            function hasOwner(){
                return owner !== null;
            }
            
            function setOwner(box){
                owner = box;
            }

            function getRect(){
                return rect;
            }

            function isRectEmpty(){
                return rect.isRectEmpty();
            }

            function getCenter(){
                return rect.getCenterPoint();
            }

            function setRect(r){
                assert( r.getWidth() >= 3 && r.getHeight() >= 3, "ARPort.setRect: r.getWidth() >= 3 && r.getHeight() >= 3 FAILED!");
                    
                rect.assign(r);
                calculateSelfPoints();
            }

            function shiftBy(offset){
                assert( !rect.isRectEmpty(), "ARPort.shiftBy: !rect.isRectEmpty() FAILED!");

                rect.add(offset);

                calculateSelfPoints();
            }

            function getSelfPoints(){
                return selfPoints;
            }

            function getAttributes(){
                return attributes;
            }

            function setAttributes(attr){
                attributes = attr;
            }

            function isConnectToCenter(){
                return (attributes & ARPORT_ConnectToCenter) != 0;
            }

            function hasLimitedDirs(){
                return limitedDirections;
            }

            function setLimitedDirs(ltd){
                limitedDirections = ltd;
            }

            function isPortAt(point, nearness){
                return isPointIn(point, rect, nearness);
            }

            function isPortClip(otherRect){
                return isRectClip(rect, otherRect);
            }

            function isPortIn(otherRect){
                return isRectIn(rect, otherRect);
            }

            function port_OnWhichEdge(point){
                return onWhichEdge(rect, point);
            }

            function canHaveStartEndPointOn(dir, isStart){
                assert( 0 <= dir && dir <= 3, "ARPort.canHaveStartEndPointOn: 0 <= dir && dir <= 3 FAILED!");
            
                if( isStart)
                    dir += 4;

                return ((attributes & (1 << dir)) != 0); //NOTE: I think JS supports bitwise shift left operator <<
            }

            function canHaveStartEndPoint(isStart){
                return ((attributes & (isStart ? ARPORT_StartOnAll : ARPORT_EndOnAll)) != 0);
            }

            function canHaveStartEndPointHorizontal(isHorizontal){
                return ((attributes & (isHorizontal ? ARPORT_StartEndHorizontal : ARPORT_StartEndVertical)) != 0);
            }

            function getStartEndDirTo(point, isStart, notthis){
                assert( !rect.isRectEmpty(), "ARPort.getStartEndDirTo: !rect.isRectEmpty() FAILED!");

                notthis = notthis ? notthis : Dir_None; //if notthis is undefined, set it to Dir_None (-1)
            
                var offset = point.minus(rect.getCenterPoint()),
                    canHave = false,
                    dir1 = getMajorDir(offset);

                if(dir1 !== notthis && canHaveStartEndPointOn(dir1, isStart))
                    return dir1;

                var dir2 = getMinorDir(offset);

                if(dir2 !== notthis && canHaveStartEndPointOn(dir2, isStart))
                    return dir2;

                var dir3 = reverseDir(dir2);

                if(dir3 !== notthis && canHaveStartEndPointOn(dir3, isStart))
                    return dir3;
                
                var dir4 = reverseDir(dir1);

                if(dir4 !== notthis && canHaveStartEndPointOn(dir4, isStart))
                    return dir4;

                if(canHaveStartEndPointOn(dir1, isStart))
                    return dir1;

                if(canHaveStartEndPointOn(dir2, isStart))
                    return dir2;

                if(canHaveStartEndPointOn(dir3, isStart))
                    return dir3;
                
                if(canHaveStartEndPointOn(dir4, isStart))
                    return dir4;

                return Dir_Top;
            }

            function canCreateStartEndPointAt(point, isStart, nearness){
                return this.canHaveStartEndPoint(isStart) && isPointIn(point, rect, nearness);
            }

            function createStartEndPointAt(pt, isStart){
                assert( !rect.isRectEmpty(), "ARPort.createStartEndPointAt: !rect.isRectEmpty() FAILED!");

                var point = new ArPoint(p),
                    dir = Dir_None,
                    nearest = new ArFindNearestLine(point),
                    canHave = false;
            
                if(this.canHaveStartEndPointOn(Dir_Top, isStart) && nearest.HLine(rect.left, rect.right - 1, rect.ceil))
                    dir = Dir_Top;

                if(this.canHaveStartEndPointOn(Dir_Right, isStart) && nearest.VLine(rect.ceil, rect.floor - 1, rect.right - 1))
                    dir = Dir_Right;

                if(this.canHaveStartEndPointOn(Dir_Bottom, isStart) && nearest.HLine(rect.left, rect.right - 1, rect.floor - 1))
                    dir = Dir_Bottom;

                if(this.canHaveStartEndPointOn(Dir_Left, isStart) && nearest.VLine(rect.ceil, rect.floor - 1, rect.left ))
                    dir = Dir_Left;
                
                assert(isRightAngle(dir), "ArPort.createStartEndPointAt: isRightAngle(dir) FAILED!");

                if(this.isConnectToCenter())
                    return this.createStartEndPointOn(dir);

                if( point.x < rect.left )
                    point.x = rect.left;
                else if(rect.right <= point.x)
                    points.x = rect.right - 1;

                if( point.y < rect.ceil )
                    point.y = rect.ceil;
                else if( rect.floor <= point.y)
                    point.y = rect.bottom - 1;

                switch(dir){
                
                case Dir_Top: 
                    point.y = rect.ceil;
                    break;  

                case Dir_Right:
                    point.x = rect.right - 1;
                    break;
                
                case Dir_Bottom:
                    point.y = rect.floor - 1;
                    break;

                case Dir_Left:
                    point.x = rect.left;
                    break;
                }

                return point;
            }

            function roundToHalfGrid(left, right){
                // I added a checking condition to make sure that the rounding will not yield a value outside of the left, right values
                var btwn = (left + right - 1)/2;//btwn < Math.max(left, right - 1) && btwn > Math.min(left, right - 1) ? btwn : (left + right - 1)/2;
                assert(btwn < Math.max(left, right - 1) && btwn > Math.min(left, right - 1), "roundToHalfGrid: btwn variable not between left, right values. Perhaps box/connectionArea is too small?"); 
                return btwn;
            }

            function createStartEndPointOn(dir){
                // I will add the next point in the appropriate order based on the current pointAngles
                assert( !rect.isRectEmpty(), "ARPort.createStartEndPointOn: !rect.isRectEmpty() FAILED!");
                assert( isRightAngle(dir) , "ARPort.createStartEndPointOn: isRightAngle(dir) FAILED!");

                switch(dir) {
                
                case Dir_Top:
                    return new ArPoint(roundToHalfGrid(rect.left, rect.right), rect.ceil);

                case Dir_Bottom:
                    return new ArPoint(roundToHalfGrid(rect.left, rect.right), rect.floor - 1);

                case Dir_Left:
                    return new ArPoint(rect.left, roundToHalfGrid(rect.ceil, rect.floor));
                }

                return new ArPoint(rect.right - 1, roundToHalfGrid(rect.ceil, rect.floor));
            }

            function createStartEndPointTo(point, dir){
                //calculate pathAngle
                var dx = point.x - this.getCenter().x,
                    dy = point.y - this.getCenter().y,
                    pathAngle = Math.atan2(-dy, dx),
                    k = 0,
                    maxX = rect.right - 1,
                    maxY = rect.floor - 1,
                    minX = rect.left,
                    minY = rect.ceil,
                    resultPoint,
                    x,
                    y;

                //Adjust angle based on part of port to which it is connecting
                switch(dir){
                
                    case Dir_Top:
                        pathAngle = 2 * Math.PI - (pathAngle + Math.PI/2);
                        x = roundToHalfGrid(rect.left, rect.right);
                        y = rect.ceil;
                        maxY = rect.ceil;
                        break;

                    case Dir_Right:
                        pathAngle = 2 * Math.PI - pathAngle;
                        x = rect.right - 1;
                        y = roundToHalfGrid(rect.ceil, rect.floor);
                        minX = rect.right - 1;
                        break;

                    case Dir_Bottom:
                        pathAngle -= Math.PI/2;
                        x = roundToHalfGrid(rect.left, rect.right);
                        y = rect.floor - 1;
                        minY = rect.floor - 1;
                        break;

                    case Dir_Left:
                        x = rect.left;
                        y = roundToHalfGrid(rect.ceil, rect.floor);
                        maxX = rect.left;
                        break;
                }

                if( pathAngle < 0 ){
                    pathAngle += 2*Math.PI;
                }

                pathAngle *= 180/Math.PI;//Using degrees for easier debugging

                //Finding points ordering
                while( k < points[dir].length && pathAngle > points[dir][k].pathAngle ){
                    k++;
                }

                if( points[dir].length ){
                    if ( k === 0 ){
                        x = ( points[dir][k].x + minX )/2;
                        y = ( points[dir][k].y + minY )/2;
                    }else if ( k !== points[dir].length ){
                        x = ( points[dir][k-1].x + points[dir][k].x )/2;
                        y = ( points[dir][k-1].y + points[dir][k].y )/2;
                    }else{
                        x = ( points[dir][k-1].x + maxX )/2 - .5;             //This is done to guarantee that the x,y will never round up to the corner of 
                        y = ( points[dir][k-1].y + maxY )/2 - .5;                //the port. If it does, the next assert will fail.
                    }
                }

                resultPoint = new ArPoint(x, y);
                resultPoint.pathAngle = pathAngle;
                points[dir].splice(k, 0, resultPoint);
                
                assert( isRightAngle( this.port_OnWhichEdge(resultPoint) ), "AutoRouterPort.createStartEndPointTo: isRightAngle( this.port_OnWhichEdge(resultPoint) FAILED");

                return resultPoint;
            }

            function removePoint(pt){
                var i = 0,
                    removed = false;

                while( i < 4 && !removed ){ //Check all sides for the point
                    var k = points[i].indexOf(pt);

                    if( k > -1){ //If the point is on this side of the port
                        points[i].splice( k, 1);
                        removed = true;
                    }
                    i++;
                }

                if( !removed )
                    _logger.warning("point was not removed from port");
            }
            
        };

        var ArBoxObject = function(b, p){
            //Stores a box with ports used to connect to the box
            this.box = b;
            this.ports = p;
        };

        AutoRouter.prototype.clear = function(){
            this.router.deleteAll(true);
            this.boxes = [];
            this.bufferBoxes = []; //Used for covering general off-limits areas in original path finding
            this.ports = [];
            this.paths = [];
            this.boxId2Path = {};
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
                connAreas = size.ConnectionAreas,
                box = this.router.createBox(),
                rect = new ArRect(x1, y1, x2, y2),
                p = [],
                port,
                r;

            box.setRect(rect);

            //Adding connection port
            p = this.addPort(box, connAreas);

            this.router.addBox(box);
            this.boxes.push(box);
            this.boxId2Path[ box.getID() ] = { 'in': [], 'out': [] };

            return new ArBoxObject(box, p);
        };

        AutoRouter.prototype.addPort = function(box, connAreas){
            //Adding a port to an already existing box (also called in addBox method)
            //Default is no connection ports (more relevant when creating a box)
            box = box instanceof ArBoxObject ? box.box : box;
            var port,
                r,
                p = [],
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

                p.push(port);
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
             *
             */

                if(!(connAreas instanceof Array))
                    connAreas = [connAreas];

                connAreas.forEach(function (connData, i, list){
                        var attr = 0,
                            type = "any", //Specify start, end, or any --Not fully implemented
                            j = 0,
                            port = box.createPort(),
                            connArea = connData instanceof Array ? 
                                    [ connData ] : //Line
                                    [ connData.any, connData.in || connData.incoming, connData.out || connData.outgoing ];



                        do
                        {
                            
                                
                            if(connArea[j] instanceof Array){ 
                                var isStart = 17,
                                    arx1,
                                    arx2,
                                    ary1,
                                    ary2;

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

                                    var dceil = Math.abs(ary1 - y1),
                                        dfloor =  Math.abs(ary1 - y2),
                                        dleft = Math.abs(arx1 - x1),
                                        dright = Math.abs(arx1 - x2),
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
                                    var _x1 = Math.min( connArea[j][0][0], connArea[j][1][0]),
                                        _x2 = Math.max( connArea[j][0][0], connArea[j][1][0]),
                                        _y1 = Math.min( connArea[j][0][1], connArea[j][1][1]),
                                        _y2 = Math.max( connArea[j][0][1], connArea[j][1][1]),
                                        horizontal = (_y1 === _y2 ? true : false); 

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
                                port.setRect(r);
                                box.addPort(port);
                                port.setAttributes(attr);
                                p.push(port);
                            }

                        }while(++j < connArea.length);


                });

            }

            //Returning the list of ports added to the box
            return p;
        };

        AutoRouter.prototype._getClosestPorts = function(srcPorts, dstPorts, segmentPoints){
        var i,
            j,
            dx,
            dy,
            srcP,
            dstP,
            minLength = -1,
            srcConnectionPoints = [],
            dstConnectionPoints = [],
            cLength;

        //Make sure srcPorts, dstPorts are arrays of ports
        if( srcPorts instanceof AutoRouterBox )
            srcPorts = srcPorts.getPortList(); 
        else if( srcPorts.ports && srcPorts.ports[0] instanceof AutoRouterPort )
            srcPorts = srcPorts.ports; 
        else
            srcPorts = srcPorts instanceof Array ? srcPorts : [ srcPorts ];

        if( dstPorts instanceof AutoRouterBox )
            dstPorts = dstPorts.getPortList(); 
        else if( dstPorts.ports && dstPorts.ports[0] instanceof AutoRouterPort )
            dstPorts = dstPorts.ports; 
        else
            dstPorts = dstPorts instanceof Array ? dstPorts : [ dstPorts ];

        for(i = 0; i < srcPorts.length; i++){
            srcConnectionPoints.push(srcPorts[i].getRect().getCenter());
        }
        for(i = 0; i < dstPorts.length; i++){
            dstConnectionPoints.push(dstPorts[i].getRect().getCenter());
        }


        if (segmentPoints && segmentPoints.length > 0) {
            for (i = 0; i < srcConnectionPoints.length; i += 1) {
                for (j = 0; j < dstConnectionPoints.length; j += 1) {
                    dx = { "src": Math.abs(srcConnectionPoints[i].x - segmentPoints[0][1]),
                        "dst": Math.abs(dstConnectionPoints[j].x - segmentPoints[segmentPoints.length - 1][0])};

                    dy =  { "src": Math.abs(srcConnectionPoints[i].y - segmentPoints[0][1]),
                        "dst": Math.abs(dstConnectionPoints[j].y - segmentPoints[segmentPoints.length - 1][1])};

                    cLength = Math.sqrt(dx.src * dx.src + dy.src * dy.src) + Math.sqrt(dx.dst * dx.dst + dy.dst * dy.dst);

                    if (minLength === -1 || minLength > cLength) {
                        minLength = cLength;
                        srcP = i;
                        dstP = j;
                    }
                }
            }
        } else {
            for (i = 0; i < srcConnectionPoints.length; i += 1) {
                for (j = 0; j < dstConnectionPoints.length; j += 1) {
                    dx = Math.abs(srcConnectionPoints[i].x - dstConnectionPoints[j].x);
                    dy = Math.abs(srcConnectionPoints[i].y - dstConnectionPoints[j].y);

                    cLength = Math.sqrt(dx * dx + dy * dy);

                    if (minLength === -1 || minLength > cLength) {
                        minLength = cLength;
                        srcP = i;
                        dstP = j;
                    }
                }
            }
        }

        return { "src": srcPorts[ srcP ], "dst": dstPorts[ dstP ] };
    };

    AutoRouter.prototype.addPath = function(a){
        if( !a.src || !a.dst)
            throw "AutoRouter:addPath missing source or destination";
    
        var src = a.src, //src is obj with either a box & port specified or just a box
            dst = a.dst, 
            autoroute = a.autoroute || true,
            startDir = a.startDirection || a.start,
            endDir = a.endDirection || a.end,
            path;
    
        assert(src instanceof AutoRouterBox || src instanceof AutoRouterPort || src.ports[0] instanceof AutoRouterPort, "AutoRouter.addPath: src is not recognized as an AutoRouterPort");
        assert(dst instanceof AutoRouterBox || dst instanceof AutoRouterPort || dst.ports[0] instanceof AutoRouterPort, "AutoRouter.addPath: dst is not recognized as an AutoRouterPort");
        if( src.ports || dst.ports
                || src instanceof Array || dst instanceof Array ){ //If there are multiple port possibilities
            var srcPorts = src.ports || src,
                dstPorts = dst.ports || dst,
                portsInfo = this._getClosestPorts(srcPorts, dstPorts);
    
            src = portsInfo.src;
            dst = portsInfo.dst;
        }
    
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
    
        this.paths.push(path);
    
        //Register the path under box id
        this.boxId2Path[src.getOwner().getID()].out.push(path);
        this.boxId2Path[dst.getOwner().getID()].in.push(path);
        return path;
    };
    
    AutoRouter.prototype.autoroute = function(){ 
        this.router.autoRoute();
    };
    
    AutoRouter.prototype.getPathPoints = function(path){
        assert(this.paths.indexOf(path) != -1, "AutoRouter:getPath requested path does not match any current paths");
        var points = path.getPointList(),
            i = -1,
            res = [];
    
        while(++i < points.getLength()){
            var pt = [points.get(i)[0].x, points.get(i)[0].y];
            res.push(pt);
        }
    
        return res;
    };
    
    AutoRouter.prototype.setBox = function(boxObject, size){
        var box = boxObject.box,
            ports = boxObject.ports,
            x1 = size.x1 !== undefined ? size.x1 : (size.x2 - size.width),
            x2 = size.x2 !== undefined ? size.x2 : (size.x1 + size.width),
            y1 = size.y1 !== undefined ? size.y1 : (size.y2 - size.height),
            y2 = size.y2 !== undefined ? size.y2 : (size.y1 + size.height),
            connAreas = size.ConnectionAreas,
            rect = new ArRect(x1, y1, x2, y2),
            paths = { "in": this.boxId2Path[ box.getID() ].in, "out": this.boxId2Path[ box.getID() ].out },
            i = paths.in.length;
    
        //Remove and Add Ports
        box.deleteAllPorts();
        boxObject.ports = [];
        this.router.setBoxRect(box, rect);
        this.setConnectionAreas(boxObject, connAreas);
    
        //Reconnect paths to ports
        while( i-- ){
            var pathSrc = paths.in[i].getStartPort().getOwner(),
                newEndPort = this._getClosestPorts( pathSrc, boxObject ).dst;
            paths.in[i].setEndPort( newEndPort );
            this.router.disconnect( paths.in[i] );
        }
    
        i = paths.out.length;
        while( i-- ){
            var pathDst = paths.out[i].getEndPort().getOwner(),
                newStartPort = this._getClosestPorts( boxObject, pathDst ).src;
            paths.out[i].setStartPort( newStartPort );
            this.router.disconnect( paths.out[i] );
        }
    };
    
    AutoRouter.prototype.setConnectionAreas = function(boxObject, connArea){
        var box = boxObject.box,
            oldPorts = boxObject.ports,
            ports;
    
    
        while( oldPorts.length ){
            box.deletePort(oldPorts[0]);
        }
    
        ports = this.addPort(box, connArea);
        boxObject.ports = ports;
    
        return new ArBoxObject(box, ports);
    };
    
    AutoRouter.prototype.remove = function(item){
        assert(item !== undefined, "AutoRouter:remove Cannot remove undefined object");
        item = item.box || item;
    
        if(item instanceof AutoRouterBox){
            this.boxId2Path[ item.getID() ] = undefined;
            this.router.deleteBox(item);
    
        }else if(item instanceof AutoRouterPath){
            this.router.deletePath(item); //This should remove it from boxId2Path dictionary also
    
        }else
            throw "AutoRouter:remove Unrecognized item type. Must be an AutoRouterBox or an AutoRouterPath";
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
    
    AutoRouter.prototype.setPathCustomPoints = function( args ){ //args.path = [ [x, y], [x2, y2], ... ]
        var points = [],
            i = 0;
        if( !args.path instanceof AutoRouterPath )
            throw "AutoRouter: Need to have an AutoRouterPath type to set custom path points";
    
        if( args.points.length > 0 )
            args.path.setAutoRouting( false );
        else
            args.path.setAutoRouting( true );
    
        //Convert args.points to array of [ArPoint] 's
        while ( i < args.points.length ){
            points.push(new CustomPathData( args.points[i][0], args.points[i][1] ));
            ++i;
        }
    
        args.path.setCustomPathData( points );
    
    };
    
    return AutoRouter;
    
});
