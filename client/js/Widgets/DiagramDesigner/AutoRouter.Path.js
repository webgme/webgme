"use strict"; 

define(['logManager',
	    'util/assert',
        './AutoRouter.Constants',
        './AutoRouter.Utils',
        './AutoRouter.Point',
        './AutoRouter.PointList'], function (logManager,
										        assert,
												CONSTANTS,
												UTILS,
												ArPoint,
												ArPointListPath) {


    // AutoRouterPath
    var AutoRouterPath = function (){
        this.owner = null;
        this.startpoint;
        this.endpoint;
        this.startports;
        this.endports;
        this.startport = null;
        this.endport = null;
        this.attributes = CONSTANTS.ARPATH_Default;
        this.state = CONSTANTS.ARPATHST_Default;
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
            if( UTILS.isPointNear(this.points[pos++], point, nearness) )
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
            if( UTILS.isPointNearLine(point, a, b, nearness) )
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
        this.startport = UTILS.getOptimalPorts(srcPorts, tgt);

        //Create a this.startpoint at the port
        var startdir = this.getStartDir(),
            startportHasLimited = false,
            startportCanHave = true;

        if (startdir !== CONSTANTS.Dir_None) {
            startportHasLimited = this.startport.hasLimitedDirs();
            startportCanHave = this.startport.canHaveStartEndPointOn(startdir, true);
        }
        if( startdir === CONSTANTS.Dir_None ||							// recalc startdir if empty
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
        this.endport = UTILS.getOptimalPorts(dstPorts, tgt);

        //Create this.endpoint at the port
        var enddir = this.getEndDir(),
            startdir = this.getStartDir(),
            endportHasLimited = false,
            endportCanHave = true;

        if (enddir !== CONSTANTS.Dir_None) {
            endportHasLimited = this.endport.hasLimitedDirs();
            endportCanHave = this.endport.canHaveStartEndPointOn(enddir, false);
        }
        if( enddir === CONSTANTS.Dir_None ||							// like above
                endportHasLimited && !endportCanHave){
            enddir = this.endport.getStartEndDirTo(tgt, false, this.startport === this.endport ? startdir : CONSTANTS.Dir_None );
        }

        this.endpoint = this.endport.createStartEndPointTo(tgt, enddir);
        return this.endport;
    };

    AutoRouterPath.prototype.isConnected = function(){
        return (this.state & CONSTANTS.ARPATHST_Connected) != 0;
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
        this.state = CONSTANTS.ARPATHST_Default;
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

        assert( hintDir != CONSTANTS.Dir_Skew, "ARPath.getOutOfBoxStartPoint: hintDir != CONSTANTS.Dir_Skew FAILED"  );
        assert( this.points.getLength() >= 2, "ARPath.getOutOfBoxStartPoint: this.points.getLength() >= 2 FAILED" );

        var pos = 0,
            p = new ArPoint(this.points.get(pos++)[0]),
            d = UTILS.getDir (this.points.get(pos)[0].minus(p));

        if (d === CONSTANTS.Dir_Skew)
            d = hintDir;
        assert( UTILS.isRightAngle (d), "ARPath.getOutOfBoxStartPoint: UTILS.isRightAngle (d) FAILED");

        if(UTILS.isHorizontal (d))
            p.x = UTILS.getRectOuterCoord(startBoxRect, d);
        else
            p.y = UTILS.getRectOuterCoord(startBoxRect, d);

        //assert( UTILS.getDir (this.points.get(pos)[0].minus(p)) === UTILS.reverseDir ( d ) || UTILS.getDir (this.points.get(pos)[0].minus(p)) === d, "UTILS.getDir (this.points.get(pos)[0].minus(p)) === UTILS.reverseDir ( d ) || UTILS.getDir (this.points.get(pos)[0].minus(p)) === d FAILED");

        return p;
    };

    AutoRouterPath.prototype.getOutOfBoxEndPoint = function(hintDir){
        var endBoxRect = this.getEndBox();

        assert( hintDir != CONSTANTS.Dir_Skew, "ARPath.getOutOfBoxEndPoint: hintDir != CONSTANTS.Dir_Skew FAILED" );
        assert( this.points.getLength() >= 2, "ARPath.getOutOfBoxEndPoint: this.points.getLength() >= 2 FAILED");

        var pos = this.points.getLength() - 1,
            p = new ArPoint(this.points.get(pos--)[0]),
            d = UTILS.getDir (this.points.get(pos)[0].minus(p));

        if (d === CONSTANTS.Dir_Skew)
            d = hintDir;
        assert( UTILS.isRightAngle (d), "ARPath.getOutOfBoxEndPoint: UTILS.isRightAngle (d) FAILED");

        if(UTILS.isHorizontal (d))
            p.x = UTILS.getRectOuterCoord(endBoxRect, d);
        else
            p.y = UTILS.getRectOuterCoord(endBoxRect, d);

        //assert( UTILS.getDir (this.points.get(pos)[0].minus(p)) === UTILS.reverseDir ( d ) || UTILS.getDir (this.points.get(pos)[0].minus(p)) === d, "ARPath.getOutOfBoxEndPoint: UTILS.getDir (this.points.get(pos)[0].minus(p)) === d || UTILS.getDir (this.points.get(pos)[0].minus(p)) === d FAILED");

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
            dir12 = UTILS.getDir (p2.minus(p1)),
            pos3 = pos;

        assert( pos3 != this.points.getLength(), "ARPath.simplifyTrivially: pos3 != this.points.getLength() FAILED");
        var p3 = this.points.get(pos++)[0],
            dir23 = UTILS.getDir (p3.minus(p2));

        for(;;)
        {
            if( dir12 === CONSTANTS.Dir_None || dir23 === CONSTANTS.Dir_None ||
                    (dir12 != CONSTANTS.Dir_Skew && dir23 != CONSTANTS.Dir_Skew &&
                     (dir12 === dir23 || dir12 === UTILS.reverseDir (dir23)) ) )
            {
                this.points.splice(pos2, 1);
                pos--;
                pos3--;
                dir12 = UTILS.getDir (p3.minus(p1));
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

            dir23 = UTILS.getDir (p3.minus(p2));
        }

        if(CONSTANTS.DEBUG)
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
                if (UTILS.isPointIn(a, r, 1) &&
                        UTILS.isPointIn(b, r, 1))
                {
                    return true;
                }
            }
            else if( UTILS.isLineClipRect (a, b, r) )
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
        return ((this.attributes & CONSTANTS.ARPATH_Fixed) != 0);
    };

    AutoRouterPath.prototype.isMoveable = function(){
        return ((this.attributes & CONSTANTS.ARPATH_Fixed) === 0);
    };

    AutoRouterPath.prototype.isHighLighted = function(){
        return ((this.attributes & CONSTANTS.ARPATH_HighLighted) != 0);
    };

    AutoRouterPath.prototype.getState = function(){
        return this.state;
    };

    AutoRouterPath.prototype.setState = function(s){
        assert( this.owner !== null, "ARPath.setState: this.owner !== null FAILED");

        this.state = s;
        if(CONSTANTS.DEBUG)
            this.assertValid();
    };

    AutoRouterPath.prototype.getEndDir = function(){
        var a = this.attributes & CONSTANTS.ARPATH_EndMask;
        return	a & CONSTANTS.ARPATH_EndOnTop ? CONSTANTS.Dir_Top :
            a & CONSTANTS.ARPATH_EndOnRight ? CONSTANTS.Dir_Right :
            a & CONSTANTS.ARPATH_EndOnBottom ? CONSTANTS.Dir_Bottom :
            a & CONSTANTS.ARPATH_EndOnLeft ? CONSTANTS.Dir_Left : CONSTANTS.Dir_None;
    };

    AutoRouterPath.prototype.getStartDir = function(){
        var a = this.attributes & CONSTANTS.ARPATH_StartMask;
        return	a & CONSTANTS.ARPATH_StartOnTop ? CONSTANTS.Dir_Top :
            a & CONSTANTS.ARPATH_StartOnRight ? CONSTANTS.Dir_Right :
            a & CONSTANTS.ARPATH_StartOnBottom ? CONSTANTS.Dir_Bottom :
            a & CONSTANTS.ARPATH_StartOnLeft ? CONSTANTS.Dir_Left : CONSTANTS.Dir_None;
    };

    AutoRouterPath.prototype.setEndDir = function(arpath_end){
        this.attributes = (this.attributes & ~CONSTANTS.ARPATH_EndMask) + arpath_end;
    };

    AutoRouterPath.prototype.setStartDir = function(arpath_start){
        this.attributes = (this.attributes & ~CONSTANTS.ARPATH_StartMask) + arpath_start;
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
            if( this.customPathData[i].getType() === CONSTANTS.CustomPointCustomization ){
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
        //This sets customizations of the type "CONSTANTS.SimpleEdgeDisplacement"
        if (this.customPathData.length === 0)
            return;

        var numEdges = this.points.getLength() - 1;
        if (this.isAutoRoutingOn) {
            var ii = 0;
            while (ii < this.customPathData.length){
                if ((this.customPathData[ii]).getEdgeCount() != numEdges &&
                        (this.customPathData[ii]).getType() === CONSTANTS.SimpleEdgeDisplacement)
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
                    if ((this.customPathData[ii]).getType() === CONSTANTS.SimpleEdgeDisplacement) {
                        dir = UTILS.getDir (end.minus(start));
                        isHorizontalVar = (UTILS.isHorizontal(dir) != 0);
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
                        (this.customPathData[ii]).getType() === CONSTANTS.SimpleEdgeDisplacement)
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
            if (this.isAutoRouted() && (this.customPathData[ii]).getType() === CONSTANTS.SimpleEdgeDisplacement ||
                    !this.isAutoRouted() && (this.customPathData[ii]).getType() != CONSTANTS.SimpleEdgeDisplacement)
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

    return AutoRouterPath;
});
