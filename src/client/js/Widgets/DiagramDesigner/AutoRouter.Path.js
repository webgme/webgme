/*globals define*/


define( ['common/LogManager',
            'common/util/assert',
            './AutoRouter.Constants',
            './AutoRouter.Utils',
            './AutoRouter.Point',
            './AutoRouter.Rect',
            './AutoRouter.PointList'],
        function ( logManager, assert, CONSTANTS, Utils, ArPoint, ArRect, ArPointListPath ) {


    'use strict'; 

    // AutoRouterPath
    var AutoRouterPath = function () {
        this.id = 'None';
        this.owner = null;
        this.startpoint = null;
        this.endpoint = null;
        this.startports = null;
        this.endports = null;
        this.startport = null;
        this.endport = null;
        this.attributes = CONSTANTS.PathDefault;
        this.state = CONSTANTS.PathStateDefault;
        this.isAutoRoutingOn = true;
        this.customPathData = [];
        this.customizationType = 'Points';
        this.pathDataToDelete = [];
        this.points = new ArPointListPath();
    };


    //----Points

    AutoRouterPath.prototype.getPointPosAt = function (point, nearness){
        var pos = 0,
            oldpos;

        while ( pos < this.points.length ) {
            oldpos = pos;
            if ( Utils.isPointNear(this.points[pos++], point, nearness) ){
                return oldpos;
            }
        }

        return this.points.length;
    };

    AutoRouterPath.prototype.getEdgePosAt = function (point, nearness){
        var tmp = this.points.getTailEdge(),
            a = tmp.start,
            b = tmp.end,
            pos = tmp.pos;

        while ( pos < this.points.length) {
            if ( Utils.isPointNearLine(point, a, b, nearness) ){
                return pos;
            }

            tmp = this.points.getPrevEdge(pos, a, b);
            a = tmp.start;
            b = tmp.end;
            pos = tmp.pos;

        }

        return this.points.length;
    };

    AutoRouterPath.prototype.hasOwner = function() {
        return this.owner !== null;
    };

    AutoRouterPath.prototype.setStartPorts = function(newPorts){
        this.startports = newPorts;

        if (this.startport){
            this.calculateStartPorts();
        }
    };

    AutoRouterPath.prototype.setEndPorts = function(newPorts){
        this.endports = newPorts;

        if (this.endport){
            this.calculateEndPorts();
        }
    };

    AutoRouterPath.prototype.clearPorts = function() {
        // remove the start/endpoints from the given ports
        if (this.startpoint) {
            this.startport.removePoint(this.startpoint);
            this.startpoint = null;
        }
        if (this.endpoint) {
            this.endport.removePoint(this.endpoint);
            this.endpoint = null;
        }
        this.startport = null;
        this.endport = null;
    };

    AutoRouterPath.prototype.getStartPort = function() {
        assert(this.startports.length, 'ARPort.getStartPort: Can\'t retrieve start port.');

        if (!this.startport) {
            this.calculateStartPorts();
        }
        return this.startport;
    };

    AutoRouterPath.prototype.getEndPort = function() {
        assert(this.endports.length, 'ARPort.getEndPort: Can\'t retrieve end port.');
        if (!this.endport) {
            this.calculateEndPorts();
        }
        return this.endport;
    };

    /**
     * Remove port from start/end port lists.
     *
     * @param port
     * @return {undefined}
     */
    AutoRouterPath.prototype.removePort = function(port) {
        var removed = Utils.removeFromArrays(port, this.startports, this.endports);
        assert(removed, 'Port was not removed from path start/end ports');

        // If no more start/end ports, remove the path
        // assert(this.startports.length && this.endports.length, 'Removed all start/endports of path ' + this.id);
        this.owner.disconnect(this);
    };

    AutoRouterPath.prototype.calculateStartEndPorts = function() {
        return {'src': this.calculateStartPorts(), 'dst': this.calculateEndPorts() };
    };

    AutoRouterPath.prototype.calculateStartPorts = function() {
        var srcPorts = [],
            tgt,
            i;

        assert(this.startports.length > 0, 'ArPath.calculateStartEndPorts: this.startports cannot be empty!');

        //Remove this.startpoint
        if (this.startport && this.startport.hasPoint(this.startpoint)){
            this.startport.removePoint(this.startpoint);
        }

        //Get available ports
        for (i = this.startports.length; i--;){
            assert(this.startports[i].owner, 
                'ARPath.calculateStartEndPorts: port '+this.startports[i].id+' has invalid this.owner!');
            if (this.startports[i].isAvailable()){
                srcPorts.push(this.startports[i]);
            }
        }

        if (srcPorts.length === 0){
            srcPorts = this.startports;
        }

        //Preventing same start/this.endport
        if (this.endport && srcPorts.length > 1){
            i = srcPorts.length;
            while (i--){
                if (srcPorts[i] === this.endport){
                    srcPorts.splice(i, 1);
                }
            }
        }


        //Getting target
        var pt;
        if (this.customPathData.length){
            tgt = new ArPoint(this.customPathData[0].getX(), this.customPathData[0].getY());
        } else {
            var x = 0,
                y = 0;

            i = this.endports.length;
            while (i--){
                pt = this.endports[i].rect.getCenter();
                x += pt.x;
                y += pt.y;
            }
            tgt = new ArPoint(x/this.endports.length, y/this.endports.length);
        }

        //Get the optimal port to the target
        this.startport = Utils.getOptimalPorts(srcPorts, tgt);

        //Create a this.startpoint at the port
        var startdir = this.getStartDir(),
            startportHasLimited = false,
            startportCanHave = true;

        if (startdir !== CONSTANTS.DirNone) {
            startportHasLimited = this.startport.hasLimitedDirs();
            startportCanHave = this.startport.canHaveStartEndPointOn(startdir, true);
        }
        if ( startdir === CONSTANTS.DirNone ||							// recalc startdir if empty
                startportHasLimited && !startportCanHave){		// or is limited and userpref is invalid
            startdir = this.startport.getStartEndDirTo(tgt, true);
        }

        this.startpoint = this.startport.createStartEndPointTo(tgt, startdir);
        this.startpoint.owner = this;
        return this.startport;
    };

    AutoRouterPath.prototype.calculateEndPorts = function() {
        var dstPorts = [],
            tgt,
            i = this.endports.length;

        assert(this.endports.length > 0, 'ArPath.calculateStartEndPorts: this.endports cannot be empty!');

        //Remove old this.endpoint
        if (this.endport && this.endport.hasPoint(this.endpoint)){
            this.endport.removePoint(this.endpoint);
        }

        //Get available ports
        while (i--){
            assert(this.endports[i].owner, 'ARPath.calculateStartEndPorts: this.endport has invalid this.owner!');
            if (this.endports[i].isAvailable()){
                dstPorts.push(this.endports[i]);
            }
        }

        if (dstPorts.length === 0){
            dstPorts = this.endports;
        }

        //Preventing same start/this.endport
        if (this.startport && dstPorts.length > 1){
            i = dstPorts.length;
            while (i--){
                if (dstPorts[i] === this.startport){
                    dstPorts.splice(i, 1);
                }
            }
        }

        //Getting target
        var pt;
        if (this.customPathData.length){
            i = this.customPathData.length - 1;
            tgt = new ArPoint(this.customPathData[i].getX(), this.customPathData[i].getY());
        }else{
            var x = 0,
                y = 0;

            i = this.startports.length;
            while (i--){
                pt = this.startports[i].rect.getCenter();
                x += pt.x;
                y += pt.y;
            }
            tgt = new ArPoint(x/this.startports.length, y/this.startports.length);
        }

        //Get the optimal port to the target
        this.endport = Utils.getOptimalPorts(dstPorts, tgt);

        //Create this.endpoint at the port
        var enddir = this.getEndDir(),
            startdir = this.getStartDir(),
            endportHasLimited = false,
            endportCanHave = true;

        if (enddir !== CONSTANTS.DirNone) {
            endportHasLimited = this.endport.hasLimitedDirs();
            endportCanHave = this.endport.canHaveStartEndPointOn(enddir, false);
        }
        if ( enddir === CONSTANTS.DirNone ||							// like above
                endportHasLimited && !endportCanHave){
            enddir = this.endport.getStartEndDirTo(tgt, false, this.startport === this.endport ? startdir : CONSTANTS.DirNone );
        }

        this.endpoint = this.endport.createStartEndPointTo(tgt, enddir);
        this.endpoint.owner = this;
        return this.endport;
    };

    AutoRouterPath.prototype.isConnected = function() {
        return (this.state & CONSTANTS.PathStateConnected) !== 0;
    };

    AutoRouterPath.prototype.addTail = function(pt){
        assert(!this.isConnected(), 
            'ARPath.addTail: !this.isConnected() FAILED');
        this.points.push(pt);
    };

    AutoRouterPath.prototype.deleteAll = function() {
        this.points = new ArPointListPath();
        this.state = CONSTANTS.PathStateDefault;
        this.clearPorts();
    };

    AutoRouterPath.prototype.hasNoPoint = function() {
        return this.points.length === 0;
    };

    AutoRouterPath.prototype.getPointCount = function() {
        return this.points.length;
    };

    AutoRouterPath.prototype.getStartBox = function() {
        var port = this.startport || this.startports[0];
        return port.owner.getRootBox();
    };

    AutoRouterPath.prototype.getEndBox = function() {
        var port = this.endport || this.endports[0];
        return port.owner.getRootBox();
    };

    AutoRouterPath.prototype.getOutOfBoxStartPoint = function(hintDir){
        var startBoxRect = this.getStartBox();

        assert(hintDir !== CONSTANTS.DirSkew, 'ARPath.getOutOfBoxStartPoint: hintDir !== CONSTANTS.DirSkew FAILED'  );
        assert(this.points.length >= 2, 'ARPath.getOutOfBoxStartPoint: this.points.length >= 2 FAILED' );

        var pos = 0,
            p = new ArPoint(this.points[pos++]),
            d = Utils.getDir (this.points[pos].minus(p));

        if (d === CONSTANTS.DirSkew){
            d = hintDir;
        }
        assert(Utils.isRightAngle (d), 'ARPath.getOutOfBoxStartPoint: Utils.isRightAngle (d) FAILED');

        if (Utils.isHorizontal (d)){
            p.x = Utils.getRectOuterCoord(startBoxRect, d);
        } else {
            p.y = Utils.getRectOuterCoord(startBoxRect, d);
        }

        //assert(Utils.getDir (this.points[pos].minus(p)) === Utils.reverseDir ( d ) || Utils.getDir (this.points[pos].minus(p)) === d, 'Utils.getDir (this.points[pos].minus(p)) === Utils.reverseDir ( d ) || Utils.getDir (this.points[pos].minus(p)) === d FAILED');

        return p;
    };

    AutoRouterPath.prototype.getOutOfBoxEndPoint = function(hintDir){
        var endBoxRect = this.getEndBox();

        assert(hintDir !== CONSTANTS.DirSkew, 'ARPath.getOutOfBoxEndPoint: hintDir !== CONSTANTS.DirSkew FAILED' );
        assert(this.points.length >= 2, 'ARPath.getOutOfBoxEndPoint: this.points.length >= 2 FAILED');

        var pos = this.points.length - 1,
            p = new ArPoint(this.points[pos--]),
            d = Utils.getDir (this.points[pos].minus(p));

        if (d === CONSTANTS.DirSkew){
            d = hintDir;
        }
        assert(Utils.isRightAngle (d), 'ARPath.getOutOfBoxEndPoint: Utils.isRightAngle (d) FAILED');

        if (Utils.isHorizontal (d)){
            p.x = Utils.getRectOuterCoord(endBoxRect, d);
        } else {
            p.y = Utils.getRectOuterCoord(endBoxRect, d);
        }

        //assert(Utils.getDir (this.points[pos].minus(p)) === Utils.reverseDir ( d ) || Utils.getDir (this.points[pos].minus(p)) === d, 'ARPath.getOutOfBoxEndPoint: Utils.getDir (this.points[pos].minus(p)) === d || Utils.getDir (this.points[pos].minus(p)) === d FAILED');

        return p;
    };

    AutoRouterPath.prototype.simplifyTrivially = function() {
        assert(!this.isConnected(), 'ARPath.simplifyTrivially: !isConnected() FAILED' );

        if (this.points.length <= 2) {
            return;
        }

        var pos = 0,
            pos1 = pos;

        assert(pos1 !== this.points.length, 'ARPath.simplifyTrivially: pos1 !== this.points.length FAILED');
        var p1 = this.points[pos++],
            pos2 = pos;

        assert(pos2 !== this.points.length, 'ARPath.simplifyTrivially: pos2 !== this.points.length FAILED' );
        var p2 = this.points[pos++],
            dir12 = Utils.getDir(p2.minus(p1)),
            pos3 = pos;

        assert(pos3 !== this.points.length, 'ARPath.simplifyTrivially: pos3 !== this.points.length FAILED');
        var p3 = this.points[pos++],
            dir23 = Utils.getDir(p3.minus(p2));

        for (;;) {
            if (dir12 === CONSTANTS.DirNone || dir23 === CONSTANTS.DirNone ||
                    (dir12 !== CONSTANTS.DirSkew && dir23 !== CONSTANTS.DirSkew &&
                     (dir12 === dir23 || dir12 === Utils.reverseDir (dir23)) )) {
                this.points.splice(pos2, 1);
                pos--;
                pos3--;
                dir12 = Utils.getDir(p3.minus(p1));
            } else {
                pos1 = pos2;
                p1 = p2;
                dir12 = dir23;
            }

            if (pos === this.points.length){
                return;
            }

            pos2 = pos3;
            p2 = p3;

            pos3 = pos;
            p3 = this.points[pos++];

            dir23 = Utils.getDir(p3.minus(p2));
        }

        if (CONSTANTS.DEBUG){
            this.assertValidPoints();
        }
    };

    AutoRouterPath.prototype.getPointList = function() {
        return this.points;
    };

    AutoRouterPath.prototype.setPoints = function(npoints){
        this.points = new ArPointListPath();
        var pos = 0;

        while (pos < npoints.length){
            this.points.push(npoints.pos);
        }
    };

    AutoRouterPath.prototype.getSurroundRect = function() {
        var rect = new ArRect(Infinity,Infinity,-Infinity,-Infinity),
            pos = 0,
            point;

        while ( pos < this.points.length) {
            point = this.points[pos++];

            rect.left = Math.min(rect.left, point.x);
            rect.ceil = Math.min(rect.ceil, point.y);
            rect.right = Math.max(rect.right, point.x);
            rect.floor = Math.max(rect.floor, point.y);
        }

        if (rect.left === Infinity || rect.top === Infinity ||
               rect.right === -Infinity || rect.bottom === -Infinity) {
            rect.setRectEmpty();
        }

        return rect;
    };

    AutoRouterPath.prototype.isEmpty = function() {
        return this.points.length === 0;
    };

    AutoRouterPath.prototype.isPathAt = function(point, nearness){
        return this.getEdgePosAt(point, nearness) !== this.points.length();
    };

    AutoRouterPath.prototype.isPathClip = function(r, isStartOrEndRect){
        var tmp = this.points.getTailEdge(),
            a = tmp.start,
            b = tmp.end,
            pos = tmp.pos,
            i = 0,
            numEdges = this.points.length - 1;

        while ( pos >= 0) {
            if ( isStartOrEndRect && ( i === 0 || i === numEdges - 1 ) ) {
                if (Utils.isPointIn(a, r, 1) &&
                        Utils.isPointIn(b, r, 1)) {
                    return true;
                }
            }
            else if ( Utils.isLineClipRect (a, b, r) ) {
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

    AutoRouterPath.prototype.isFixed = function() {
        return ((this.attributes & CONSTANTS.PathFixed) !== 0);
    };

    AutoRouterPath.prototype.isMoveable = function() {
        return ((this.attributes & CONSTANTS.PathFixed) === 0);
    };

    AutoRouterPath.prototype.isHighLighted = function() {
        return ((this.attributes & CONSTANTS.PathHighLighted) !== 0);
    };

    AutoRouterPath.prototype.getState = function() {
        return this.state;
    };

    AutoRouterPath.prototype.setState = function(s){
        assert(this.owner !== null, 'ARPath.setState: this.owner !== null FAILED');

        this.state = s;
        if (CONSTANTS.DEBUG) {
            this.assertValid();
        }
    };

    AutoRouterPath.prototype.getEndDir = function() {
        var a = this.attributes & CONSTANTS.PathEndMask;
        return	a & CONSTANTS.PathEndOnTop ? CONSTANTS.DirTop :
            a & CONSTANTS.PathEndOnRight ? CONSTANTS.DirRight :
            a & CONSTANTS.PathEndOnBottom ? CONSTANTS.DirBottom :
            a & CONSTANTS.PathEndOnLeft ? CONSTANTS.DirLeft : CONSTANTS.DirNone;
    };

    AutoRouterPath.prototype.getStartDir = function() {
        var a = this.attributes & CONSTANTS.PathStartMask;
        return	a & CONSTANTS.PathStartOnTop ? CONSTANTS.DirTop :
            a & CONSTANTS.PathStartOnRight ? CONSTANTS.DirRight :
            a & CONSTANTS.PathStartOnBottom ? CONSTANTS.DirBottom :
            a & CONSTANTS.PathStartOnLeft ? CONSTANTS.DirLeft : CONSTANTS.DirNone;
    };

    AutoRouterPath.prototype.setEndDir = function(pathEnd){
        this.attributes = (this.attributes & ~CONSTANTS.PathEndMask) + pathEnd;
    };

    AutoRouterPath.prototype.setStartDir = function(pathStart){
        this.attributes = (this.attributes & ~CONSTANTS.PathStartMask) + pathStart;
    };

    AutoRouterPath.prototype.setCustomPathData = function(pDat){
        this.customPathData = pDat;

        // Disconnect path
        this.owner.disconnect(this);
    };

    AutoRouterPath.prototype.applyCustomizationsBeforeAutoConnectPoints = function() {
        var plist = [];

        if (this.customPathData.length === 0){
            return;
        }

        var i = 0,
            pt;

        while ( i < this.customPathData.length ){
            if ( this.customPathData[i].getType() === CONSTANTS.CustomPointCustomization ){
                pt = new ArPoint();
                pt.x = this.customPathData[i].getX();
                pt.y = this.customPathData[i].getY();
                plist.push( [ pt ] );
            }

            ++i;
        }

        return plist;
    };

    AutoRouterPath.prototype.applyCustomizationsAfterAutoConnectPointsAndStuff = function() {
        //This sets customizations of the type 'CONSTANTS.SimpleEdgeDisplacement'
        if (this.customPathData.length === 0){
            return;
        }

        var numEdges = this.points.length - 1,
            ii;
        if (this.isAutoRoutingOn) {
            ii = 0;
            while (ii < this.customPathData.length){
                if ((this.customPathData[ii]).getEdgeCount() !== numEdges &&
                        (this.customPathData[ii]).getType() === CONSTANTS.SimpleEdgeDisplacement) {
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
            valueToSet;

        while (pos < this.points.length){
            ii = 0;
            while (ii < this.customPathData.length) {
                increment = true;
                if (currEdgeIndex === (this.customPathData[ii]).getEdgeIndex()) {
                    if ((this.customPathData[ii]).getType() === CONSTANTS.SimpleEdgeDisplacement) {
                        dir = Utils.getDir (end.minus(start));
                        isHorizontalVar = (Utils.isHorizontal(dir) !== 0);
                        doNotApply = false;
                        if ((this.customPathData[ii]).isHorizontalOrVertical() === isHorizontalVar) {
                            xToSet = (this.customPathData[ii]).getX();
                            yToSet = (this.customPathData[ii]).getY();
                            // Check if the edge displacement at the end of the path
                            // is still within the boundary limits of the start or the end box
                            if (currEdgeIndex === 0 || currEdgeIndex === numEdges - 1) {
                                startRect = this.startport.rect;
                                    endRect = this.endport.rect;
                                    minLimit = (currEdgeIndex === 0 ?
                                            ((this.customPathData[ii]).IsHorizontalOrVertical() ? startRect.ceil : startRect.left) :
                                            ((this.customPathData[ii]).IsHorizontalOrVertical() ? endRect.ceil : endRect.left));
                                    maxLimit = (currEdgeIndex === 0 ?
                                            ((this.customPathData[ii]).IsHorizontalOrVertical() ? startRect.floor : startRect.right) :
                                            ((this.customPathData[ii]).IsHorizontalOrVertical() ? endRect.floor : endRect.right));
                                    valueToSet = (this.customPathData[ii]).IsHorizontalOrVertical() ? yToSet : xToSet;
                                if (valueToSet < minLimit || valueToSet > maxLimit){
                                    doNotApply = true;
                                }
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
                        if ((this.customPathData[ii]).isHorizontalOrVertical() !== isHorizontalVar || doNotApply) {
                            // something went wrong, invalid data: direction (horz/vert) not match
                            //						assert(false);
                            this.pathDataToDelete.push(this.customPathData[ii]);
                            this.customPathData.splice(ii, 1);
                            increment = false;
                        }
                    }
                }
                if (increment){
                    ++ii;
                }
            }

            tmp = this.points.getNextEdgePtrs(pos, start, end);
            pos = tmp.pos;
            start = tmp.start;
            end = tmp.end;

            currEdgeIndex++;
        }
    };

    AutoRouterPath.prototype.removePathCustomizations = function() {
        var ii = 0;
        while (ii < this.customPathData.length){
            this.pathDataToDelete.push(this.customPathData[ii++]);
        }
        this.customPathData = [];
    };

    AutoRouterPath.prototype.markPathCustomizationsForDeletion = function(asp){
        var ii = 0;
        while (ii < this.customPathData.length) {
            if ((this.customPathData[ii]).getAspect() === asp){
                this.pathDataToDelete.push(this.customPathData[ii]);
            }
            ++ii;
        }
    };

    AutoRouterPath.prototype.removeInvalidPathCustomizations = function(asp){
        // We only inhibit/delete those edges, which has an edge count
        // (redundant data intended for this very sanity check)
        // doesn't equal to edge count
        var ii = 0,
            numEdges = this.points.length - 1;
        while (ii < this.customPathData.length) {
            if ((this.customPathData[ii]).getAspect() === asp) {
                if ((this.customPathData[ii]).getEdgeCount() !== numEdges &&
                        (this.customPathData[ii]).getType() === CONSTANTS.SimpleEdgeDisplacement) {
                    this.customPathData.splice(ii, 1);
                } else {
                    ++ii;
                }
            } else {
                ++ii;
            }
        }
    };

    AutoRouterPath.prototype.areTherePathCustomizations = function() {
        return this.customPathData.length !== 0;
    };

    AutoRouterPath.prototype.areThereDeletedPathCustomizations = function() {
        return this.pathDataToDelete.length !== 0;
    };

    AutoRouterPath.prototype.getDeletedCustomPathData = function(cpd){
        var ii = 0;
        while (ii < this.pathDataToDelete.length){
            cpd.push(this.pathDataToDelete[ii++]);
        }
    };

    AutoRouterPath.prototype.getCustomizedEdgeIndexes = function(indexes){
        indexes = [];
        var ii = 0,
            edgeIndex;

        while (ii < this.customPathData.length) {
            if (this.isAutoRouted() && (this.customPathData[ii]).getType() === CONSTANTS.SimpleEdgeDisplacement ||
                    !this.isAutoRouted() && (this.customPathData[ii]).getType() !== CONSTANTS.SimpleEdgeDisplacement) {
                edgeIndex = (this.customPathData[ii]).getEdgeIndex();
                indexes.push(edgeIndex);
            }
            ++ii;
        }
    };

    AutoRouterPath.prototype.isAutoRouted = function() {
        return this.isAutoRoutingOn;
    };

    AutoRouterPath.prototype.setAutoRouting = function(arState){
        this.isAutoRoutingOn = arState;
    };

    AutoRouterPath.prototype.destroy = function() {
        if (this.isConnected()){
            this.startport.removePoint(this.startpoint);
            this.endport.removePoint(this.endpoint);
        }
    };

    AutoRouterPath.prototype.assertValid = function() {
        var i;
        for (i = this.startports.length; i--;) {
            this.startports[i].assertValid();
        }

        for (i = this.endports.length; i--;) {
            this.endports[i].assertValid();
        }

        if (this.isConnected()) {
            assert(this.points.length !== 0, 
                'ARPath.assertValid: this.points.length !== 0 FAILED');
            var points = this.getPointList();
            points.assertValid();

        }else{
            assert(this.points.length === 0, 
                'ARPath.assertValid: this.points.length === 0 FAILED');
        }

        // If it has a startpoint, must also have a startport
        if (this.startpoint) {
            assert(this.startport, 'Path has a startpoint without a startport');
        }
        if (this.endpoint) {
            assert(this.endport, 'Path has a endpoint without a endport');
        }
    };

    AutoRouterPath.prototype.assertValidPoints = function() {
    };

    return AutoRouterPath;
});
