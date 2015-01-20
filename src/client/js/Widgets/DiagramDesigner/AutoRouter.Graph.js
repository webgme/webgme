/*globals define*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * @author brollb / https://github/brollb
 */

define(['logManager',
           'util/assert',
           './AutoRouter.Constants',
           './AutoRouter.Utils',
           './AutoRouter.Point',
           './AutoRouter.PointList',
           './AutoRouter.Rect',
           './AutoRouter.Path',
           './AutoRouter.Port',
           './AutoRouter.Box',
           './AutoRouter.Edge',
           './AutoRouter.EdgeList'], function ( logManager, assert, CONSTANTS, UTILS, ArPoint, ArPointListPath, ArRect,
                                               AutoRouterPath,
                                               AutoRouterPort,
                                               AutoRouterBox,
                                               AutoRouterEdge,
                                               AutoRouterEdgeList) {

    "use strict"; 

	var _logger = logManager.create("AutoRouterGraph");

    var AutoRouterGraph = function () {
        this.horizontal = new AutoRouterEdgeList(true);
        this.vertical = new AutoRouterEdgeList(false);
        this.boxes = {}; 
        this.paths = []; 
        this.bufferBoxes = [];
        this.box2bufferBox = {}; //maps boxId to corresponding bufferbox object

        this.horizontal.owner = this;
        this.vertical.owner = this;

        //Initializing selfPoints
        this.selfPoints = [
            new ArPoint(CONSTANTS.ED_MINCOORD, CONSTANTS.ED_MINCOORD),
            new ArPoint(CONSTANTS.ED_MAXCOORD, CONSTANTS.ED_MINCOORD),
            new ArPoint(CONSTANTS.ED_MAXCOORD, CONSTANTS.ED_MAXCOORD),
            new ArPoint(CONSTANTS.ED_MINCOORD, CONSTANTS.ED_MAXCOORD)
        ];

        this._addSelfEdges();
    };

    //Functions
    AutoRouterGraph.prototype._remove = function (box) {
        if(box instanceof AutoRouterBox) {
            this._deleteBoxAndPortEdges(box);

            //For the WebGME, the removal of the paths connected to boxes is handled outside the AutoRouter.
            //For removal of paths with the removal of boxes, uncomment the following code:

            /*
               var iter = 0;

               while(iter < paths.length) {
               var iteratorChanged = false,
               path = paths[iter],
               startPort = path.getStartPort();

               assert(startPort !== null, "ARGraph.remove: startPort !== null FAILED");
               var startbox = startPort.owner,
               endPort = path.getEndPort();

               assert(endPort !== null, "ARGraph.remove: endPort !== null FAILED");
               var endbox = endPort.owner;

               if((startbox === box || endbox === box))
               {
            //DeletePath:
            if (path.hasOwner())
            {
            deleteEdges(path);
            path.owner = null;

            paths.splice(iter, 1);
            iteratorChanged = true;
            }

            path.destroy();	// ??
            }

            if (!iteratorChanged)
            ++iter;
            }
             */

            box.owner = null;

            assert(this.boxes[box.id] !== undefined, "ARGraph.remove: Box does not exist");

            delete this.boxes[box.id];

        }else if(box instanceof AutoRouterPath) { //ARPath
            var path = box;
            this.deleteEdges(path);

            path.owner = null;

            var iter = this.paths.indexOf(path);
            assert(iter > -1, "ARGraph.remove: Path does not exist");

            this.paths.splice(iter, 1);
        }
    };

    AutoRouterGraph.prototype._deleteAllBoxes = function () {
        for(var box in this.boxes) {
            if(this.boxes.hasOwnProperty(box)) {
                this.boxes[box].destroy(); 
                delete this.boxes[box];
            }
        }
        this.bufferBoxes = [];
    };

    AutoRouterGraph.prototype._getBoxCount = function () {
        return Object.keys(this.boxes).length;
    };

    AutoRouterGraph.prototype._getBoxAt = function (point, nearness) {
        for(var box in this.boxes) {
            if(this.boxes.hasOwnProperty(box)) {
                if (this.boxes[box].isBoxAt(point, nearness)) {
                    return this.boxes[box];
                }
            }
        }

        return null;
    };

    AutoRouterGraph.prototype._setPortAttr = function (port, attr) {
        this._disconnectPathsFrom(port);
        port.attributes = attr;
    };

    AutoRouterGraph.prototype._isRectClipBoxes = function (rect) {
        var boxRect;
        for(var box in this.boxes) {
            if(this.boxes.hasOwnProperty(box)) {
                boxRect = this.boxes[box].rect;
                if(UTILS.isRectClip(rect, boxRect)) {
                    return true;
                }
            }
        }
        return false;
    };

    AutoRouterGraph.prototype._isRectClipBufferBoxes = function (rect) {
        var i = this.bufferBoxes.length,
            c;

        while(i--) {
            c = this.bufferBoxes[i].children.length;

            while(c--) {
                if(UTILS.isRectClip(rect, this.bufferBoxes[i].children[c])) {
                    return true;
                }
            }
        }

        return false;
    };

    AutoRouterGraph.prototype._isLineClipBufferBoxes = function (p1, p2) {
        var rect = new ArRect(p1, p2);
        rect.normalizeRect();
        assert(rect.left === rect.right || rect.ceil === rect.floor, "ARGraph.this._isLineClipBoxes: rect.left === rect.right || rect.ceil === rect.floor FAILED");

        if(rect.left === rect.right) {
            rect.right++;
        }
        if(rect.ceil === rect.floor) {
            rect.floor++;
        }

        return this._isRectClipBufferBoxes(rect);
    };

    AutoRouterGraph.prototype._isLineClipBoxes = function (p1, p2) {
        var rect = new ArRect(p1, p2);
        rect.normalizeRect();
        assert(rect.left === rect.right || rect.ceil === rect.floor, "ARGraph.isLineClipBoxes: rect.left === rect.right || rect.ceil === rect.floor FAILED");

        if(rect.left === rect.right) {
            rect.right++;
        }
        if(rect.ceil === rect.floor) {
            rect.floor++;
        }

        return this._isRectClipBoxes(rect);
    };

    AutoRouterGraph.prototype._canBoxAt = function (rect) {
        return !this._isRectClipBoxes.inflatedRect(rect, 1);
    };

    AutoRouterGraph.prototype._add = function (path) {
        assert(path !== null, "ARGraph.add: path !== null FAILED");
        assert(!path.hasOwner(), "ARGraph.add: !path.hasOwner() FAILED");

        path.owner = this;

        this.paths.push(path);

        this.horizontal.addPathEdges(path);
        this.vertical.addPathEdges(path);

        if(CONSTANTS.DEBUG) {
            this._assertValidPath(path);
        }

    };

    AutoRouterGraph.prototype._deleteAllPaths = function () {
        for (var i = this.paths.length; i--;) {
            this.paths[i].destroy();  // Remove point from start/end port
        }

        this.paths = [];
    };

    AutoRouterGraph.prototype._hasNoPath = function () {
        return this.paths.length === 0;
    };

    AutoRouterGraph.prototype._getPathCount = function () {
        return this.paths.length;
    };

    AutoRouterGraph.prototype._getListEdgeAt = function (point, nearness) {

        var edge = this.horizontal.getEdgeAt(point, nearness);
        if(edge) {
            return edge;
        }

        return this.vertical.getEdgeAt(point, nearness);
    };

    AutoRouterGraph.prototype._getSurroundRect = function () {
        var rect = new ArRect(0,0,0,0);

        for(var box in this.boxes) {
            if(this.boxes.hasOwnProperty(box)) {
                rect.unionAssign(this.boxes[box].rect);
            }
        }

        for (var i = 0; i < this.paths.length; i++)
        {
            rect.unionAssign(this.paths[i].getSurroundRect());
        }

        return rect;
    };

    AutoRouterGraph.prototype._getOutOfBox = function (details) {
        var bufferObject = this.box2bufferBox[details.box.id],
            children = bufferObject.children,
            i = bufferObject.children.length,
            parentBox = bufferObject.box,
            point = details.point,
            dir = details.dir,
            boxRect = new ArRect(details.box.rect),
            dir2;

        boxRect.inflateRect(CONSTANTS.BUFFER); //Create a copy of the buffer box

        assert(UTILS.isRightAngle (dir), "ARGraph.getOutOfBox: UTILS.isRightAngle (dir) FAILED");

        while(boxRect.ptInRect(point )) {
            if(UTILS.isHorizontal(dir)) {
                point.x = UTILS.getRectOuterCoord (boxRect, dir);
            } else {
                point.y = UTILS.getRectOuterCoord (boxRect, dir);
            }

            while(i--) {
                if(children[i].ptInRect(point )) {
                    boxRect = children[i];
                    break;
                }
            }
            i = bufferObject.children.length;
        }

        assert(!boxRect.ptInRect(point ), "ARGraph.getOutOfBox: !boxRect.ptInRect( point) FAILED");
    };

    AutoRouterGraph.prototype._goToNextBufferBox = function (args) {
        var point = args.point,
            end = args.end,
            dir = args.dir,
            dir2 = args.dir2 === undefined || !UTILS.isRightAngle (args.dir2) ? (end instanceof ArPoint ? 
                    UTILS.exGetMajorDir(end.minus(point)) : CONSTANTS.Dir_None) : args.dir2,
            stophere = args.end !== undefined ? args.end : 
                (dir === 1 || dir === 2 ? CONSTANTS.ED_MAXCOORD : CONSTANTS.ED_MINCOORD );

        if(dir2 === dir) {
            dir2 = UTILS.isRightAngle(UTILS.exGetMinorDir(end.minus(point))) ? UTILS.exGetMinorDir(end.minus(point)) : (dir + 1) % 4;
        }

        if(end instanceof ArPoint) {
            stophere = UTILS.getPointCoord (stophere, dir);
        }

        assert(UTILS.isRightAngle (dir), "ArGraph.goToNextBufferBox: UTILS.isRightAngle (dir) FAILED");
        assert(UTILS.getPointCoord (point, dir) !== stophere, "ArGraph.goToNextBufferBox: UTILS.getPointCoord (point, dir) !== stophere FAILED");

        var boxby = null,
            i = -1,
            boxRect;

        while(++i < this.bufferBoxes.length)
        {
            boxRect = this.bufferBoxes[i].box;

            if(!UTILS.isPointInDirFrom(point, boxRect, dir) && //Add support for entering the parent box
                    UTILS.isPointBetweenSides(point, boxRect, dir) &&     // if it will not put the point in a corner (relative to dir2)
                    UTILS.isCoordInDirFrom(stophere, UTILS.getChildRectOuterCoordFrom (this.bufferBoxes[i], dir, point).coord, dir) ) { //Return extreme (parent box) for this comparison
                stophere = UTILS.getChildRectOuterCoordFrom (this.bufferBoxes[i], dir, point).coord;
                boxby = this.bufferBoxes[i]; 
            }
        }

        if(UTILS.isHorizontal (dir)) {
            point.x = stophere;
        } else {
            point.y = stophere;
        }

        return boxby;
    };

    AutoRouterGraph.prototype._hugChildren = function (bufferObject, point, dir1, dir2, exitCondition) { 
        // This method creates a path that enters the parent box and "hugs" the children boxes (remains within one pixel of them) 
        // and follows them out.
        assert((dir1 + dir2) % 2 === 1, "ARGraph.hugChildren: One and only one direction must be horizontal");
        var children = bufferObject.children,
            parentBox = bufferObject.box,
            initPoint = new ArPoint(point),
            child = this._goToNextBox(point, dir1, (dir1 === 1 || dir1 === 2 ? CONSTANTS.ED_MAXCOORD : CONSTANTS.ED_MINCOORD ), children), 
            finalPoint,
            dir = dir2,
            nextDir = UTILS.nextClockwiseDir (dir1) === dir2 ? UTILS.nextClockwiseDir  : UTILS.prevClockwiseDir ,
            points = [ [new ArPoint(point)] ],
            hasExit = true,
            nextChild,
            old;

        assert(child !== null, "ARGraph.hugChildren: child !== null FAILED");
        exitCondition = exitCondition === undefined ? function(pt) { return !parentBox.ptInRect(pt); } : exitCondition;

        while(hasExit && !exitCondition(point, bufferObject )) {
            old = new ArPoint(point);
            nextChild = this._goToNextBox(point, dir, UTILS.getRectOuterCoord (child, dir), children);

            if(!points[ points.length - 1 ][0].equals(old )) {
                points.push([new ArPoint(old )]); //The points array should not contain the most recent point.
            }

            if(nextChild === null) {
                dir = UTILS.reverseDir (nextDir(dir ));
            }else if (UTILS.isCoordInDirFrom(UTILS.getRectOuterCoord ( nextChild, UTILS.reverseDir ( nextDir(dir))), 
                        UTILS.getPointCoord (point, UTILS.reverseDir (nextDir(dir) )), UTILS.reverseDir ( nextDir(dir) ))) {
                dir = nextDir(dir);
                child = nextChild;
            }

            if(finalPoint === undefined) {
                finalPoint = new ArPoint(point);
            } else if(!finalPoint.equals(old )) {
                hasExit = !point.equals(finalPoint);
            }

        }

        if(points[0][0].equals(initPoint )) {
            points.splice(0, 1);
        }

        if(!hasExit) {
            points = null;
            point.assign(initPoint);
        }

        return points;

    };

    AutoRouterGraph.prototype._goToNextBox = function (point, dir, stop1, boxList) {
        var stophere= stop1;

        /*
           if(stop2 !== undefined) {
           if(stop2 instanceof Array) {
           boxList = stop2;
           }else{
           stophere = stop1 instanceof ArPoint ? 
           chooseInDir.getPointCoord (stop1, dir), UTILS.getPointCoord (stop2, dir), UTILS.reverseDir (dir)) :
           chooseInDir(stop1, stop2, UTILS.reverseDir (dir));
           }

           }else */
        if(stop1 instanceof ArPoint) {
            stophere = UTILS.getPointCoord (stophere, dir);
        }

        assert(UTILS.isRightAngle (dir), "ArGraph.goToNextBox: UTILS.isRightAngle (dir) FAILED");
        assert(UTILS.getPointCoord (point, dir) !== stophere, "ArGraph.goToNextBox: UTILS.getPointCoord (point, dir) !== stophere FAILED");

        var boxby = null,
            iter = boxList.length,
            boxRect;

        while(iter--) {
            boxRect = boxList[iter];

            if(UTILS.isPointInDirFrom(point, boxRect, UTILS.reverseDir (dir)) &&
                    UTILS.isPointBetweenSides(point, boxRect, dir) &&
                    UTILS.isCoordInDirFrom(stophere, UTILS.getRectOuterCoord (boxRect, UTILS.reverseDir (dir)), dir) ) 
            {
                stophere = UTILS.getRectOuterCoord (boxRect, UTILS.reverseDir (dir));
                boxby = boxList[iter];
            }
        }

        if(UTILS.isHorizontal(dir)) {
            point.x = stophere;
        } else {
            point.y = stophere;
        }

        return boxby;
    };

    AutoRouterGraph.prototype._getLimitsOfEdge = function (startPt, endPt, min, max) {
        var t,
            start = (new ArPoint(startPt)),
            end = (new ArPoint(endPt)),
            box,
            rect;

        if(start.y === end.y)
        {
            if(start.x > end.x)
            {
                t = start.x;
                start.x = end.x;
                end.x = t;
            }

            for(box in this.boxes) {
                if(this.boxes.hasOwnProperty(box)) {
                    rect = this.boxes[box].rect;

                    if(start.x < rect.right && rect.left <= end.x)
                    {
                        if(rect.floor <= start.y && rect.floor > min) {
                            min = rect.floor;
                        }
                        if(rect.ceil > start.y && rect.ceil < max) {
                            max = rect.ceil;
                        }
                    }
                }
            }
        }
        else
        {
            assert(start.x === end.x, "ARGraph.this.getLimitsOfEdge: start.x === end.x FAILED");

            if(start.y > end.y)
            {
                t = start.y;
                start.y = end.y;
                end.y = t;
            }

            for(box in this.boxes) {
                if(this.boxes.hasOwnProperty(box)) {
                    rect = this.boxes[box].rect;

                    if(start.y < rect.floor && rect.ceil <= end.y)
                    {
                        if(rect.right <= start.x && rect.right > min) {
                            min = rect.right;
                        }
                        if(rect.left > start.x && rect.left < max) {
                            max = rect.left;
                        }
                    }
                }
            }
        }

        max--;

        return { "min": min, "max": max };
    };

    AutoRouterGraph.prototype._isPointInBox = function (point) {
        return this.getBoxAt(point) !== null;
    };

    AutoRouterGraph.prototype._connect = function (path) {
        var ports = path.calculateStartEndPorts(),
            startport = ports.src,
            endport = ports.dst,
            startpoint = path.startpoint,
            endpoint = path.endpoint;

        assert(startport.hasPoint(startpoint), "ARGraph.connect: startport.hasPoint(startpoint) FAILED");
        assert(endport.hasPoint(endpoint), "ARGraph.connect: endport.hasPoint(endpoint) FAILED");

        if(startpoint.equals(endpoint)) {
            UTILS.stepOneInDir (startpoint, UTILS.nextClockwiseDir (startdir));
        }

        var startRoot = startport.owner.getRootBox(),
            endRoot = endport.owner.getRootBox(),
            startId = startRoot.id,
            endId = endRoot.id,
            startdir = startport.port_OnWhichEdge(startpoint),
            enddir = endport.port_OnWhichEdge(endpoint);

        if(path.isAutoRouted() && this.box2bufferBox[startId] === this.box2bufferBox[endId] && 
            startdir === UTILS.reverseDir(enddir) && startRoot !== endRoot) {

            console.log('sharing parent box:',this.box2bufferBox[startId]);
            return this._connectPointsSharingParentBox(path, startpoint, endpoint, startdir);
        }else{

            console.log('NOT sharing parent box');
            return this._connectPathWithPoints(path, startpoint, endpoint);
        }

    };

    AutoRouterGraph.prototype._connectPathWithPoints = function (path, startpoint, endpoint) {
        assert(startpoint instanceof ArPoint, "ARGraph.connect: startpoint instanceof ArPoint FAILED");
        assert(path !== null && path.owner === this, "ARGraph.connect: path !== null && path.owner === self FAILED");
        assert(!path.isConnected(), "ARGraph.connect: !path.isConnected() FAILED");
        assert(!startpoint.equals(endpoint), "ARGraph.connect: !startpoint.equals(endpoint) FAILED");

        var startPort = path.getStartPort();
        assert(startPort !== null, "ARGraph.connect: startPort !== null FAILED");

        var startdir = startPort.port_OnWhichEdge(startpoint),
            endPort = path.getEndPort();

        assert(endPort !== null, "ARGraph.connect: endPort !== null FAILED");
        var enddir = endPort.port_OnWhichEdge(endpoint);
        assert(UTILS.isRightAngle (startdir) && UTILS.isRightAngle (enddir), "ARGraph.connect: UTILS.isRightAngle (startdir) && UTILS.isRightAngle (enddir) FAILED");

        //Find the bufferbox containing startpoint, endpoint
        var startBox = this.box2bufferBox[startPort.owner.id].box,
            endBox = this.box2bufferBox[endPort.owner.id].box;

        var start = new ArPoint(startpoint);
        this._getOutOfBox({ "point": start, 
                            "dir": startdir, 
                            "end": endpoint, 
                            "box": startPort.owner } );
        assert(!start.equals(startpoint), "ARGraph.connect: !start.equals(startpoint) FAILED");

        var end = new ArPoint(endpoint);
        this._getOutOfBox({ "point": end, 
                            "dir": enddir, 
                            "end": start, 
                            "box": endPort.owner } ) ;
        assert(!end.equals(endpoint), "ARGraph.connect: !end.equals(endpoint) FAILED");

        assert(path.isEmpty(),  "ARGraph.connect: path.isEmpty() FAILED");

        var ret = new ArPointListPath(),
            isAutoRouted = path.isAutoRouted(),
            pos = -1;
        if (isAutoRouted) {
            this._connectPoints(ret, start, end, startdir, enddir);
        }

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
        while(++pos < ret.getLength())
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
        path.setState(CONSTANTS.ARPATHST_Connected);

        // Apply custom edge modifications - step 1
        // (Step 1: Move the desired edges - see in AutoRouterGraph::Connect(AutoRouterPath* path, ArPoint& startpoint, ArPoint& endpoint)
        //  Step 2: Fix the desired edges - see in AutoRouterEdgeList::addEdges(AutoRouterPath* path))
        if (isAutoRouted) {
            path.applyCustomizationsAfterAutoConnectPointsAndStuff();
        }

        return this.horizontal.addPathEdges(path) && this.vertical.addPathEdges(path);
    };

    AutoRouterGraph.prototype._connectPointsSharingParentBox = function (path, startpoint, endpoint, startdir) {
        //Connect points that share a parentbox and face each other
        //These will not need the simplification and complicated path finding
        var start = new ArPoint(startpoint),
            //end = new ArPoint(endpoint),
            dx = endpoint.x - start.x,
            dy = endpoint.y - start.y;

        path.deleteAll();

        path.addTail(startpoint);
        if(dx !== 0 && dy !== 0) {
            if(UTILS.isHorizontal(startdir)) {
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

        path.setState(CONSTANTS.ARPATHST_Connected);
        path.applyCustomizationsAfterAutoConnectPointsAndStuff();

        return this.horizontal.addPathEdges(path) && this.vertical.addPathEdges(path);

    };

    AutoRouterGraph.prototype._connectPoints = function (ret, start, end, hintstartdir, hintenddir, flipped) {
        assert(ret.getLength() === 0, "ArGraph.connectPoints: ret.getLength() === 0 FAILED");

        var thestart = new ArPoint(start), 
            retend = ret.getLength(),
            bufferObject,
            self = this,
            box,
            rect,
            dir1, 
            dir2,
            old,
            oldEnd,
            ret2,
            pts,
            rev,
            i, 

            //Exit conditions
            //if there is a straight line to the end point
            findExitToEndpoint = function(pt, bo) { return (pt.x === end.x || pt.y === end.y) && !UTILS.isLineClipRects(pt, end, bo.children); },  //If you pass the endpoint, you need to have a way out.

            //exitCondition is when you get to the dir1 side of the box or when you pass end
            getToDir1Side = function(pt, bo ) { return UTILS.getPointCoord(pt, dir1) === UTILS.getRectOuterCoord( bo.box, dir1) || ( UTILS.isPointInDirFrom(pt, end, dir1)); }; 
            //RETURN
        //This is where we create the original path that we will later adjust
        while(!start.equals(end))
        {
            dir1 = UTILS.exGetMajorDir(end.minus(start));
            dir2 = UTILS.exGetMinorDir(end.minus(start));
            assert(dir1 !== CONSTANTS.Dir_None, "ARGraph.connectPoints: dir1 !== CONSTANTS.Dir_None FAILED");

            assert(dir1 === UTILS.getMajorDir(end.minus(start)), "ARGraph.connectPoints: dir1 === UTILS.getMajorDir(end.minus(start)) FAILED");
            assert(dir2 === CONSTANTS.Dir_None || dir2 === UTILS.getMinorDir(end.minus(start)), "ARGraph.connectPoints: dir2 === CONSTANTS.Dir_None || dir2 === UTILS.getMinorDir(end.minus(start)) FAILED");

            if(retend === ret.getLength() && dir2 === hintstartdir && dir2 !== CONSTANTS.Dir_None)
            {
                // i.e. std::swap(dir1, dir2);
                dir2 = dir1;
                dir1 = hintstartdir;
            }

            if (retend === ret.getLength() ) {
                ret.push([new ArPoint(start)]);
                retend = ret.getLength() - 1; //This should give the index of the newly inserted value
            }else{
                retend++;
                if(retend === ret.getLength()) {
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
            if(start.equals(old))
            {
                assert(box !== null, "ARGraph.connectPoints: box !== null FAILED");
                rect = box instanceof ArRect ? box : box.rect; 

                if(dir2 === CONSTANTS.Dir_None) {
                    dir2 = UTILS.nextClockwiseDir (dir1);
                }

                assert(dir1 !== dir2 && dir1 !== CONSTANTS.Dir_None && dir2 !== CONSTANTS.Dir_None, "ARGraph.connectPoints: dir1 !== dir2 && dir1 !== CONSTANTS.Dir_None && dir2 !== CONSTANTS.Dir_None FAILED");
                if(bufferObject.box.ptInRect(end ) && !bufferObject.box.ptInRect( start ) && flipped) {
                    //Unfortunately, if parentboxes are a pixel apart, start/end can get stuck and not cross the border
                    //separating them.... This is a simple hack to get them to cross it.
                    if(UTILS.isHorizontal(dir1)) {
                        start.x = end.x;
                    } else {
                        start.y = end.y;
                    }
                }else if(bufferObject.box.ptInRect(end)) {
                    if(!flipped) {
                        oldEnd = new ArPoint(end);
                        ret2 = new ArPointListPath();

                        this._connectPoints(ret2, end, start, hintenddir, dir1, true);
                        i = ret2.getLength() - 1;

                        while(i-- > 1) {
                            ret.push(ret2.get(i));
                        }

                        assert(start.equals(end), "ArGraph.connectPoints: start.equals(end) FAILED");
                        old = CONSTANTS.EMPTY_POINT;
                        start = end = oldEnd;
                    }else{ //If we have flipped and both points are in the same bufferbox
                       //We will hugchildren until we can connect both points. 
                       //If we can't, force it
                        pts = this._hugChildren(bufferObject, start, dir1, dir2, findExitToEndpoint);
                        if(pts !== null) {//There is a path from start -> end
                            if(pts.length) {//Add new points to the current list 
                                ret.setArPointList(ret.concat(pts));
                                retend += pts.length;
                                ret.push([new ArPoint(start)]);
                            }
                            start.assign(end);

                        }else{ //Force to the endpoint
                            assert(UTILS.isRightAngle (dir1), "ARGraph.connectPoints: UTILS.isRightAngle (dir1) FAILED");

                            if(UTILS.isHorizontal(dir1)) {
                                start.x = end.x;
                            } else {
                                start.y = end.y;
                            }

                            ret.push([new ArPoint(start)]);

                            if(!UTILS.isHorizontal(dir1)) {
                                start.x = end.x;
                            } else {
                                start.y = end.y;
                            }

                            ret.push([new ArPoint(start)]);

                            assert(start.equals(end));//We are forcing out so these should be the same now

                        }
                            assert(!start.equals(old));//We are forcing out so these should be the same now
                    }
                } else if(UTILS.isPointInDirFrom(end, rect, dir2)) {

                    assert(!UTILS.isPointInDirFrom(start, rect, dir2), "ARGraph.connectPoints: !UTILS.isPointInDirFrom(start, rect, dir2) FAILED");
                    box = this._goToNextBufferBox({ "point": start, "dir": dir2, "dir2": dir1, "end": end });

                    // this assert fails if two boxes are adjacent, and a connection wants to go between
                    //assert(UTILS.isPointInDirFrom(start, rect, dir2), "ARGraph.connectPoints: UTILS.isPointInDirFrom(start, rect, dir2) FAILED");//This is not the best check with parent boxes
                    if(start.equals(old )) { //Then we are in a corner
                        if(box.children.length > 1) {
                            pts = this._hugChildren(box, start, dir2, dir1, getToDir1Side);
                        }else{
                            pts = this._hugChildren(bufferObject, start, dir1, dir2);
                        }
                        if(pts !== null) {

                            //Add new points to the current list 
                            ret.setArPointList(ret.concat(pts));
                            retend += pts.length;

                        }else{ //Go through the blocking box
                            assert(UTILS.isRightAngle (dir1), "ARGraph.getOutOfBox: UTILS.isRightAngle (dir1) FAILED");

                            if(UTILS.isHorizontal(dir1)) {
                                start.x = UTILS.getRectOuterCoord (bufferObject.box, dir1);
                            } else {
                                start.y = UTILS.getRectOuterCoord (bufferObject.box, dir1);
                            }
                        }
                    }
                }
                else
                {
                    assert(UTILS.isPointBetweenSides(end, rect, dir1), "ARGraph.connectPoints: UTILS.isPointBetweenSides(end, rect, dir1) FAILED");
                    assert(!UTILS.isPointIn(end, rect), "ARGraph.connectPoints: !UTILS.isPointIn(end, rect) FAILED");

                    rev = 0;

                    if(UTILS.reverseDir (dir2) === hintenddir && 
                            UTILS.getChildRectOuterCoordFrom (bufferObject, UTILS.reverseDir (dir2), start) === UTILS.getRectOuterCoord (rect, UTILS.reverseDir (dir2))) { //And if point can exit that way 
                        rev = 1;
                    }
                    else if(dir2 !== hintenddir)
                    {
                        if(UTILS.isPointBetweenSides(thestart, rect, dir1))
                        {
                            if(	UTILS.isPointInDirFrom(rect.getTopLeft().plus(rect.getBottomRight()), start.plus(end), dir2) ) {
                                rev = 1;
                            }
                        } else if(UTILS.isPointInDirFrom(start, thestart, dir2)) {
                            rev = 1;
                        }
                    }

                    if(rev)
                    {
                        dir2 = UTILS.reverseDir (dir2);
                    }

                    //If the box in the way has one child
                    if(bufferObject.children.length === 1) {
                        if(UTILS.isHorizontal(dir2))
                        {
                            start.x = UTILS.getRectOuterCoord (rect, dir2);
                        }
                        else
                        {
                            start.y = UTILS.getRectOuterCoord (rect, dir2);
                        }

                        assert(!start.equals(old), "ARGraph.connectPoints: !start.equals(old) FAILED");
                        assert(retend !== ret.getLength(), "ARGraph.connectPoints: retend !== ret.getLength() FAILED");
                        retend++;
                        if(retend === ret.getLength()) {
                            ret.push([new ArPoint(start)]);
                            retend--;
                        }else{
                            ret.splice(retend + 1, 0, [new ArPoint(start)]); 
                        }
                        old.assign(start);

                        if(UTILS.isHorizontal(dir1))
                        {
                            start.x = UTILS.getRectOuterCoord (rect, dir1);
                        }
                        else
                        {
                            start.y = UTILS.getRectOuterCoord (rect, dir1);
                        }

                        assert(UTILS.isPointInDirFrom(end, start, dir1), "ARGraph.connectPoints: UTILS.isPointInDirFrom(end, start, dir1) FAILED");
                        if(UTILS.getPointCoord (start, dir1) !== UTILS.getPointCoord (end, dir1))
                        {
                            this._goToNextBufferBox({ "point": start, "dir": dir1, "end": end });
                        }

                    }else{ //If the box has multiple children
                        pts = this._hugChildren(bufferObject, start, dir1, dir2, getToDir1Side);
                        if(pts !== null) {

                            //Add new points to the current list 
                            ret.setArPointList(ret.concat(pts));
                            retend += pts.length;

                        }else{ //Go through the blocking box
                            assert(UTILS.isRightAngle (dir1), "ARGraph.getOutOfBox: UTILS.isRightAngle (dir1) FAILED");

                            if(UTILS.isHorizontal(dir1)) {
                                start.x = UTILS.getRectOuterCoord (bufferObject.box, dir1);
                            } else {
                                start.y = UTILS.getRectOuterCoord (bufferObject.box, dir1);
                            }
                        }
                    }
                }

                assert(!start.equals(old), "ARGraph.connectPoints: !start.equals(old) FAILED");
            }

        }

        ret.push([end]);

        if(CONSTANTS.DEBUG) {
            ret.assertValid();//Check that all edges are horizontal are vertical
        }
    };

    AutoRouterGraph.prototype._disconnectAll = function () {
        var i = -1;

        while(++i < this.paths.length)
        {
            this.disconnect(this.paths[i]);
        }
    };

    AutoRouterGraph.prototype.disconnect = function (path) {
        if(path.isConnected()) {
            this.deleteEdges(path);
            path.getStartPort().removePoint(path.startpoint);//Removing points from ports
            path.getEndPort().removePoint(path.endpoint);
        }

        path.deleteAll();
    };

    AutoRouterGraph.prototype._disconnectPathsClipping = function (rect) {
        var i = this.paths.length;

        while(i--)
        {
            if(this.paths[i].isPathClip(rect)) {
                this.disconnect(this.paths[i]);
            }
        }
    };

    AutoRouterGraph.prototype._disconnectPathsFrom = function (obj) {
        var iter = this.paths.length,
            path,
            startport,
            endport;

        if(obj instanceof AutoRouterBox) {
            var box = obj,
                startbox,
                endbox;
            while(iter--)
            {
                path = this.paths[iter];
                startport = path.getStartPort();

                assert(startport !== null, "ARGraph.disconnectPathsFrom: startport !== null FAILED");
                startbox = startport.owner;
                assert(startbox !== null, "ARGraph.disconnectPathsFrom: startbox !== null FAILED");

                endport = path.getEndPort();
                assert(endport !== null, "ARGraph.disconnectPathsFrom: endport !== null FAILED");
                endbox = endport.owner;
                assert(endbox !== null, "ARGraph.disconnectPathsFrom: endbox !== null FAILED");

                if((startbox === box || endbox === box)) {
                    this.disconnect(path);
                }

            }
        }else{//Assuming "box" is a port

            var port = obj;
            while(iter--)
            {
                path = this.paths[iter];
                startport = path.getStartPort();
                endport = path.getEndPort();

                if((startport === port || endport === port)) {
                    this.disconnect(path);
                }

            }
        }
    };

    AutoRouterGraph.prototype._addSelfEdges = function () {
        this.horizontal.addEdges(this);
        this.vertical.addEdges(this);
    };

    AutoRouterGraph.prototype._addEdges = function (obj) {
        assert(!(obj instanceof AutoRouterPath), 'No Paths should be here!');
        if (obj instanceof AutoRouterPort) {
            this._updateBoxPortAvailability(obj.owner);
            this.horizontal.addPortEdges(obj);
            this.vertical.addPortEdges(obj);
        } else {
            this.horizontal.addEdges(obj);
            this.vertical.addEdges(obj);
        }
    };

    AutoRouterGraph.prototype.deleteEdges = function (object) {
        this.horizontal.deleteEdges(object);
        this.vertical.deleteEdges(object);
    };

    AutoRouterGraph.prototype._addAllEdges = function () {
        assert(this.horizontal.isEmpty() && this.vertical.isEmpty(), 
               'ARGraph.addAllEdges: horizontal.isEmpty() && vertical.isEmpty() FAILED');

        var ids = Object.keys(this.boxes),
            i;

        for (i = ids.length-1; i >= 0; i--) {
            this._addBoxAndPortEdges(this.boxes[ids[i]]);
        }

        for (i = this.paths.length-1; i >= 0; i--) {
            this.horizontal.addPathEdges(this.paths[i]);
            this.vertical.addPathEdges(this.paths[i]);
        }
    };

    AutoRouterGraph.prototype._deleteAllEdges = function () {
        this.horizontal.deleteAllEdges();
        this.vertical.deleteAllEdges();
    };

    AutoRouterGraph.prototype._addBoxAndPortEdges = function (box) {
        assert(box !== null, 'ARGraph.addBoxAndPortEdges: box !== null FAILED' );

        this._addEdges(box);

        console.log('adding to bufferboxes', box.rect);
        console.log('has', box.ports.length, 'ports');
        for (var i = box.ports.length; i--;) {
            this._addEdges(box.ports[i]);
        }

        // Add to bufferboxes
        this._addToBufferBoxes(box);
        this._updateBoxPortAvailability(box);
    };

    AutoRouterGraph.prototype._deleteBoxAndPortEdges = function (box) {
        assert(box !== null, 'ARGraph.deleteBoxAndPortEdges: box !== null FAILED');

        this.deleteEdges(box);

        for (var i = box.ports.lengtg-1; i >= 0; i--) {
            this.deleteEdges(box.ports[i]);
        }


        this._removeFromBufferBoxes(box);
    };

    AutoRouterGraph.prototype._getEdgeList = function (ishorizontal) {
        return ishorizontal ? this.horizontal : this.vertical;
    };

    AutoRouterGraph.prototype._candeleteTwoEdgesAt = function (path, points, pos) {
        if(CONSTANTS.DEBUG) {
            assert(path.owner === this, "ARGraph.candeleteTwoEdgesAt: path.owner === this FAILED");
            path.assertValid();
            assert(path.isConnected(), "ARGraph.candeleteTwoEdgesAt: path.isConnected() FAILED");
            points.AssertValidPos(pos);
        }

        if(pos + 2 >= points.getLength() || pos < 1) {
            return false;
        }

        var pointpos = pos,
            point = points.get(pos++)[0], 
            npointpos = pos,
            npoint = points.get(pos++)[0],
            nnpointpos = pos;

        pos = pointpos;
        pos--;
        var ppointpos = pos; 

        var ppoint = points.get(pos--)[0],
            pppointpos = pos; 

        if (npoint.equals(point)) {
            return false; // direction of zero-length edges can't be determined, so don't delete them
        }

        assert(pppointpos < points.getLength() && ppointpos < points.getLength() && pointpos < points.getLength() && npointpos < points.getLength() && nnpointpos < points.getLength(), 
                "ARGraph.candeleteTwoEdgesAt: pppointpos < points.getLength() && ppointpos < points.getLength() && pointpos < points.getLength() && npointpos < points.getLength() && nnpointpos < points.getLength() FAILED");

        var dir = UTILS.getDir (npoint.minus(point));

        assert(UTILS.isRightAngle (dir), "ARGraph.candeleteTwoEdgesAt: UTILS.isRightAngle (dir) FAILED");
        var ishorizontal = UTILS.isHorizontal (dir);

        var newpoint = new ArPoint();

        if (ishorizontal) {
            newpoint.x = UTILS.getPointCoord (npoint, ishorizontal);
            newpoint.y = UTILS.getPointCoord (ppoint, !ishorizontal);
        } else {
            newpoint.y = UTILS.getPointCoord (npoint, ishorizontal);
            newpoint.x = UTILS.getPointCoord (ppoint, !ishorizontal);
        }

        assert(UTILS.getDir (newpoint.minus(ppoint)) === dir, "ARGraph.candeleteTwoEdgesAt: UTILS.getDir (newpoint.minus(ppoint)) === dir FAILED");

        if (this._isLineClipBoxes(newpoint, npoint)) {
            return false;
        }
        if(this._isLineClipBoxes(newpoint, ppoint)) {
            return false;
        }

        return true;
    };

    AutoRouterGraph.prototype._deleteTwoEdgesAt = function (path, points, pos) {
        if (CONSTANTS.DEBUG) {
            assert(path.owner === this, "ARGraph.deleteTwoEdgesAt: path.owner === this FAILED");
            path.assertValid();
            assert(path.isConnected(), "ARGraph.deleteTwoEdgesAt: path.isConnected() FAILED");
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

        assert(pppointpos < points.getLength() && ppointpos < points.getLength() && pointpos < points.getLength() && npointpos < points.getLength() && nnpointpos < points.getLength(), "ARGraph.deleteTwoEdgesAt: pppointpos < points.getLength() && ppointpos < points.getLength() && pointpos < points.getLength() && npointpos < points.getLength() && nnpointpos < points.getLength() FAILED");
        assert(pppoint !== null && ppoint !== null && point !== null && npoint !== null && nnpoint !== null, "ARGraph.deleteTwoEdgesAt: pppoint !== null && ppoint !== null && point !== null && npoint !== null && nnpoint !== null FAILED");

        var dir = UTILS.getDir (npoint[0].minus(point));

        assert(UTILS.isRightAngle (dir), "ARGraph.deleteTwoEdgesAt: UTILS.isRightAngle (dir) FAILED");
        var ishorizontal = UTILS.isHorizontal (dir);

        var newpoint = new ArPoint();
        if(ishorizontal) {
            newpoint.x = UTILS.getPointCoord (npoint[0], ishorizontal);
            newpoint.y = UTILS.getPointCoord (ppoint, !ishorizontal);
        }else{
            newpoint.x = UTILS.getPointCoord (ppoint, !ishorizontal);
            newpoint.y = UTILS.getPointCoord (npoint[0], ishorizontal);
        }

        assert(UTILS.getDir (newpoint.minus(ppoint)) === dir, "ARGraph.deleteTwoEdgesAt: UTILS.getDir (newpoint.minus(ppoint)) === dir FAILED");

        assert(!this._isLineClipBoxes(newpoint, npoint[0]), "ARGraph.deleteTwoEdgesAt: !isLineClipBoxes(newpoint, npoint[0]) FAILED");
        assert(!this._isLineClipBoxes(newpoint, ppoint), "ARGraph.deleteTwoEdgesAt: !isLineClipBoxes(newpoint, ppoint) FAILED");

        var hlist = this._getEdgeList(ishorizontal),
            vlist = this._getEdgeList(!ishorizontal);

        var ppedge = hlist.getEdgeByPointer(pppoint),
            pedge = vlist.getEdgeByPointer(ppoint),
            nedge = hlist.getEdgeByPointer(point),
            nnedge = vlist.getEdgeByPointer(npoint[0]);

        assert( ppedge !== null && pedge !== null && nedge !== null && nnedge !== null, 
               "ARGraph.deleteTwoEdgesAt:  ppedge !== null && pedge !== null && nedge !== null && nnedge !== null FAILED");

        vlist.Delete(pedge);
        hlist.Delete(nedge);

        points.splice(ppointpos, 3, [ newpoint ]);
        ppedge.endpointNext = nnpoint;
        ppedge.endpoint = newpoint; 

        nnedge.startpoint = newpoint;
        nnedge.startpointPrev = pppoint;

        if(nnnpointpos < points.getLength())
        {
            var nnnedge = hlist.getEdgeByPointer(nnpoint, (nnnpointpos)); 
            assert( nnnedge !== null, 
                   "ARGraph.deleteTwoEdgesAt: nnnedge !== null FAILED");
            assert(nnnedge.startpointPrev[0].equals(npoint[0]) && nnnedge.startpoint[0].equals(nnpoint), 
                   "ARGraph.deleteTwoEdgesAt: nnnedge.startpointPrev[0].equals(npoint[0]) && nnnedge.startpoint.equals(nnpoint) FAILED" );
            nnnedge.setStartPointPrev(ppoint);
        }

        if(nnpoint.equals(newpoint)) {
            this._deleteSamePointsAt(path, points, ppointpos);
        }

    };

    AutoRouterGraph.prototype._deleteSamePointsAt = function (path, points, pos) {
        if (CONSTANTS.DEBUG) {
            assert(path.owner === this, "ARGraph.deleteSamePointsAt: path.owner === this FAILED");
            path.assertValid();
            assert(path.isConnected(), "ARGraph.deleteSamePointsAt: path.isConnected() FAILED");
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
            ppoint = points.get(pos--),
            pppointpos = pos,
            pppoint = pos === points.getLength() ? null : points.get(pos--);

        assert(ppointpos < points.getLength() && pointpos < points.getLength() && npointpos < points.getLength() && nnpointpos < points.getLength());
        assert(ppoint !== null && point !== null && npoint !== null && nnpoint !== null, 
               "ARGraph.deleteSamePointsAt: ppoint !== null && point !== null && npoint !== null && nnpoint !== null FAILED");
        assert(point.equals(npoint) && !point.equals(ppoint), 
               "ARGraph.deleteSamePointsAt: point.equals(npoint) && !point.equals(ppoint) FAILED");

        var dir = UTILS.getDir (point.minus(ppoint));
        assert(UTILS.isRightAngle (dir), "ARGraph.deleteSamePointsAt: UTILS.isRightAngle (dir) FAILED");

        var ishorizontal = UTILS.isHorizontal (dir),
            hlist = this._getEdgeList(ishorizontal),
            vlist = this._getEdgeList(!ishorizontal),

            pedge = hlist.getEdgeByPointer(ppoint, point),
            nedge = vlist.getEdgeByPointer(point, npoint),
            nnedge = hlist.getEdgeByPointer(npoint, nnpoint);

        assert(pedge !== null && nedge !== null && nnedge !== null, "ARGraph.deleteSamePointsAt: pedge !== null && nedge !== null && nnedge !== null FAILED");

        vlist.Delete(pedge);
        hlist.Delete(nedge);

        points.splice(pointpos, 2);

        if(pppointpos < points.getLength())
        {
            var ppedge = vlist.getEdgeByPointer(pppoint, ppoint);
            assert(ppedge !== null && ppedge.endpoint.equals(ppoint) && ppedge.endpointNext[0].equals(point), "ARGraph.deleteSamePointsAt: ppedge !== null && ppedge.endpoint.equals(ppoint) && ppedge.endpointNext[0].equals(point) FAILED");
            ppedge.endpointNext = nnpoint;
        }

        assert(nnedge.startpoint.equals(npoint) && nnedge.startpointPrev[0].equals(point), "ARGraph.deleteSamePointsAt: nnedge.startpoint.equals(npoint) && nnedge.startpointPrev[0].equals(point) FAILED"); 
        nnedge.setStartPoint(ppoint);
        nnedge.setStartPointPrev(pppoint);

        if(nnnpointpos < points.getLength())
        {
            var nnnedge = vlist.getEdgeByPointer(nnpoint, (nnnpointpos)); //&*
            assert(nnnedge !== null && nnnedge.startpointPrev[0].equals(npoint) && nnnedge.startpoint.equals(nnpoint), "ARGraph.deleteSamePointsAt: nnnedge !== null && nnnedge.startpointPrev[0].equals(npoint) && nnnedge.startpoint.equals(nnpoint) FAILED");
            nnnedge.setStartPointPrev(ppoint);
        }

        if(CONSTANTS.DEBUG_DEEP) {
            path.assertValid();
        }
    };

    AutoRouterGraph.prototype._simplifyPaths = function () {
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

                while(pointpos < pointList.getLength())
                {
                    if(this._candeleteTwoEdgesAt(path, pointList, pointpos))
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

    AutoRouterGraph.prototype._centerStairsInPathPoints = function (path, hintstartdir, hintenddir) {
        assert(path !== null, "ARGraph.centerStairsInPathPoints: path !== null FAILED");
        assert(!path.isConnected(), "ARGraph.centerStairsInPathPoints: !path.isConnected() FAILED");

        var pointList = path.getPointList();
        assert(pointList.getLength() >= 2, "ARGraph.centerStairsInPathPoints: pointList.getLength() >= 2 FAILED");

        if(CONSTANTS.DEBUG) {
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

            d12 = CONSTANTS.Dir_None,
            d23 = CONSTANTS.Dir_None,
            d34 = CONSTANTS.Dir_None,

            outOfBoxStartPoint = path.getOutOfBoxStartPoint(hintstartdir),
            outOfBoxEndPoint = path.getOutOfBoxEndPoint(hintenddir),

            pos = 0;
        assert(pos < pointList.getLength(), "ARGraph.centerStairsInPathPoints pos < pointList.getLength() FAILED");

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


        while(pos < pointList.getLength())
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

            if(p2p < pointList.getLength())
            {
                d12 = UTILS.getDir (p2.minus(p1));
                if(CONSTANTS.DEBUG) {
                    assert(UTILS.isRightAngle (d12), "ARGraph.centerStairsInPathPoints: UTILS.isRightAngle (d12) FAILED");
                    if(p3p !== pointList.end()) {
                        assert(UTILS.areInRightAngle (d12, d23), "ARGraph.centerStairsInPathPoints: UTILS.areInRightAngle (d12, d23) FAILED");
                    }
                }
            }

            if(p4p < pointList.getLength() && d12 === d34)
            {
                assert(p1p < pointList.getLength() && p2p < pointList.getLength() && p3p < pointList.getLength() && p4p < pointList.getLength(), "ARGraph.centerStairsInPathPoints: p1p < pointList.getLength() && p2p < pointList.getLength() && p3p < pointList.getLength() && p4p < pointList.getLength() FAILED");

                np2 = new ArPoint(p2);
                np3 = new ArPoint(p3);
                h = UTILS.isHorizontal (d12);

                p4x = UTILS.getPointCoord (p4, h);
                p3x = UTILS.getPointCoord (p3, h);
                p1x = UTILS.getPointCoord (p1, h);

                //p1x will represent the larger x value in this 'step' situation
                if(p1x < p4x)
                {
                    t = p1x;
                    p1x = p4x;
                    p4x = t;
                }

                if(p4x < p3x && p3x < p1x)
                {
                    m = Math.round((p4x + p1x)/2);
                    if(h) {
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

                    if(h) {
                        np2.x = m;
                        np3.x = m;
                    }else{
                        np2.y = m;
                        np3.y = m;
                    }

                    if(!this._isLineClipBoxes(np2, np3) &&
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

        if(CONSTANTS.DEBUG) {
            path.assertValidPoints();
        }
    };

    AutoRouterGraph.prototype._fixShortPaths = function (path) {
        //Make sure if a straight line is possible, the path is a straight line
        //Note, this may make it so the stems are no longer centered in the port.

        var startPort = path.getStartPort(),
            endPort = path.getEndPort(),
            len = path.getPointList().getLength();

        if(len === 4) {
            var points = path.getPointList(),
                startpoint = points.get(0)[0],
                endpoint = points.get(len - 1)[0],
                startDir = startPort.port_OnWhichEdge(startpoint),
                endDir = endPort.port_OnWhichEdge(endpoint),
                tstStart,
                tstEnd;

            if(startDir === UTILS.reverseDir (endDir)) {
                var newStart = new ArPoint(startpoint),
                    newEnd = new ArPoint(endpoint),
                    startRect = startPort.rect,
                    endRect = endPort.rect,
                    minOverlap,
                    maxOverlap;

                if(UTILS.isHorizontal (startDir)) {
                    minOverlap = Math.min(startRect.floor, endRect.floor);
                    maxOverlap = Math.max(startRect.ceil, endRect.ceil);

                    var newY = (minOverlap + maxOverlap)/2;
                    newStart.y = newY;
                    newEnd.y = newY;

                    tstStart = new ArPoint(UTILS.getRectOuterCoord (startPort.owner.rect, startDir), newStart.y);
                    tstEnd = new ArPoint(UTILS.getRectOuterCoord (endPort.owner.rect, endDir), newEnd.y);

                }else{
                    minOverlap = Math.min(startRect.right, endRect.right);
                    maxOverlap = Math.max(startRect.left, endRect.left);

                    var newX = (minOverlap + maxOverlap)/2;
                    newStart.x = newX;
                    newEnd.x = newX;

                    tstStart = new ArPoint(newStart.x, UTILS.getRectOuterCoord (startPort.owner.rect, startDir));
                    tstEnd = new ArPoint(newEnd.x, UTILS.getRectOuterCoord (endPort.owner.rect, endDir));
                }

                if(startRect.ptInRect(newStart) && endRect.ptInRect(newEnd) && !this._isLineClipBoxes(tstStart, tstEnd)) {


                    var ishorizontal = UTILS.isHorizontal (startDir),
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

                    edge.startpointPrev = null;
                    edge.endpointNext = null;

                    edge.positionY = UTILS.getPointCoord(newStart, UTILS.nextClockwiseDir (startDir) );
                    hlist.insert(edge);

                    points.splice(1, 2);
                }
            }
        }
    };

    /**
     * Remove unnecessary curves inserted into the path from the 
     * tracing the edges of overlapping boxes. (hug children)
     *
     * @param {AutoRouterPath} path
     */
    AutoRouterGraph.prototype._simplifyPathCurves = function (path) {
        //Incidently, this will also contain the functionality of simplifyTrivially
        var pointList = path.getPointList(),
            p1,
            p2,
            i = 0,
            j;

        //I will be taking the first point and checking to see if it can create a straight line
        //that does not UTILS.intersect  any other boxes on the graph from the test point to the other point.
        //The 'other point' will be the end of the path iterating back til the two points before the 
        //current.
        while(i < pointList.getLength() - 3) {
            p1 = pointList.get(i)[0];
            j = pointList.getLength();

            while(j-- > 0) {
                p2 = pointList.get(j)[0];
                if(UTILS.isRightAngle (UTILS.getDir (p1.minus(p2))) && !this._isLineClipBoxes(p1, p2)) {
                    pointList.splice(i+1, j-i-1); //Remove all points between i, j
                    break;
                }
            }
            ++i;
        }
    };

    /* The following shape in a path
     * _______
     *       |       ___
     *       |      |
     *       |______|
     *
     * will be replaced with 
     * _______
     *       |______
     *
     * if possible.
     */
    /**
     * Replace 5 points for 3 where possible. This will replace "u"-like shapes 
     * with "z" like shapes.
     *
     * @param path
     * @return {undefined}
     */
    AutoRouterGraph.prototype._simplifyPathPoints = function (path) {
        assert(path !== null, "ARGraph.simplifyPathPoints: path !== null FAILED");
        assert(!path.isConnected(), "ARGraph.simplifyPathPoints: !path.isConnected() FAILED");

        var pointList = path.getPointList();
        assert(pointList.getLength() >= 2, "ARGraph.simplifyPathPoints: pointList.length >= 2 FAILED");

        if(CONSTANTS.DEBUG) {
            path.assertValidPoints();
        }

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

        assert(pos < pointList.getLength(), "ARGraph.simplifyPathPoints: pos < pointList.getLength() FAILED");

        p1p = pos;
        p1 = pointList.get(pos++)[0];

        while(pos < pointList.getLength())
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

            if(p5p < pointList.getLength())
            {
                assert(p1p < pointList.getLength() && p2p < pointList.getLength() && p3p < pointList.getLength() && p4p < pointList.getLength() && p5p < pointList.getLength(), "ARGraph.simplifyPathPoints: p1p < pointList.getLength() && p2p < pointList.getLength() && p3p < pointList.getLength() && p4p < pointList.getLength() && p5p < pointList.getLength() FAILED");
                assert(!p1.equals(p2) && !p2.equals(p3) && !p3.equals(p4) && !p4.equals(p5), "ARGraph.simplifyPathPoints: !p1.equals(p2) && !p2.equals(p3) && !p3.equals(p4) && !p4.equals(p5) FAILED");

                d = UTILS.getDir (p2.minus(p1));
                assert(UTILS.isRightAngle (d), "ARGraph.simplifyPathPoints: UTILS.isRightAngle (d) FAILED");
                h = UTILS.isHorizontal (d);

                np3 = new ArPoint();
                if(h) {
                    np3.x = UTILS.getPointCoord (p5, h);
                    np3.y = UTILS.getPointCoord (p1, !h);
                }else{
                    np3.x = UTILS.getPointCoord (p1, !h);
                    np3.y = UTILS.getPointCoord (p5, h);
                }

                if(!this._isLineClipBoxes(p2, np3) && !this._isLineClipBoxes(np3, p4))
                {
                    pointList.splice(p2p, 1);
                    pointList.splice(p3p, 1);
                    pointList.splice(p4p, 1);

                    if(!np3.equals(p1) && !np3.equals(p5)) {
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

        if(CONSTANTS.DEBUG) {
            path.assertValidPoints();
        }
    };

    AutoRouterGraph.prototype._connectAllDisconnectedPaths = function () {
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

                if(!path.isConnected())
                {
                    success = this._connect(path);

                    if (!success) {
                        // Something is messed up, probably an existing edge customization results in a zero length edge
                        // In that case we try to delete any customization for this path to recover from the problem
                        if (path.areTherePathCustomizations()) {
                            path.removePathCustomizations();
                        } else {
                            giveup = true;
                        }
                    }
                }

                ++iter;
            }
            if (!success && !giveup) {
                this._disconnectAll();	// There was an error, delete halfway results to be able to start a new pass
            }
        }
    };

    AutoRouterGraph.prototype._updateBoxPortAvailability = function (inputBox) {
        var bufferbox = this.box2bufferBox[inputBox.id],
            siblings = bufferbox.children,
            skipBoxes = {},
            box,
            id;

        // Ignore overlap from ancestor boxes in the box trees
        box = inputBox;
        do {
            skipBoxes[box.id] = true;
            box = box.parent;
        } while (box);

        for (var i = siblings.length; i--;) {
            id = siblings[i].id;
            if (skipBoxes[id]) {  // Skip boxes on the box tree
                continue;
            }

            if (inputBox.rect.touching(siblings[i])) {
                inputBox.adjustPortAvailability(siblings[i]);
                this.boxes[siblings[i].id].adjustPortAvailability(inputBox.rect);
            }
        }
    };

    AutoRouterGraph.prototype._addToBufferBoxes = function (inputBox) {
        var box = {rect: new ArRect(inputBox.rect), id: inputBox.id},
            overlapBoxesIndices = [],
            bufferBox,
            children = [],
            parentBox,
            ids = [inputBox.id],
            child,
            i,
            j;

        box.rect.inflateRect(CONSTANTS.BUFFER);

        for (i = this.bufferBoxes.length; i--;) {
            if(!box.rect.touching(this.bufferBoxes[i].box)) {
                continue;
            }

            j = this.bufferBoxes[i].children.length;
            while(j--) {
                child = this.bufferBoxes[i].children[j];
                if(box.rect.touching(child)) {
                    inputBox.adjustPortAvailability(child);
                    this.boxes[child.id].adjustPortAvailability(box.rect);

                    if(overlapBoxesIndices.indexOf(i) === -1) {
                        overlapBoxesIndices.push(i);
                    }
                }

            }
        }

        if(overlapBoxesIndices.length !== 0) {
            //Now overlapBoxes contains all the boxes overlapping with the box to be added
            i = -1;
            parentBox = new ArRect(box.rect);

            while(++i < overlapBoxesIndices.length) {
                assert(overlapBoxesIndices[i] < this.bufferBoxes.length, "ArGraph.addToBufferBoxes: overlapBoxes index out of bounds.");
                bufferBox = this.bufferBoxes.splice(overlapBoxesIndices[i], 1)[0];
                j = bufferBox.children.length;

                while(j--) {
                    children.push(bufferBox.children[j]);
                    ids.push(bufferBox.children[j].id);//Store the ids of the children that need to be adjusted
                }

                parentBox.unionAssign(bufferBox.box);
            }
        }else{
            parentBox = box.rect;
        }

        box.rect.id = inputBox.id;
        children.push(box.rect);

        this.bufferBoxes.push({ "box": parentBox, "children": children });
        i = ids.length;
        while(i--) {
            this.box2bufferBox[ids[i]] = this.bufferBoxes[this.bufferBoxes.length-1];
        }

    };

    AutoRouterGraph.prototype._removeFromBufferBoxes = function (box) {
        //Get the children of the parentBox (not including the box to remove)
        //Create bufferboxes from these children
        var bufferBox = this.box2bufferBox[box.id],
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
        while(i--) {
            g = groups.length;
            child = children[i];
            group = [child];
            add = false;

            this.boxes[child.id].resetPortAvailability();//Reset box's ports availableAreas

            if(child.id === box.id) {
                continue;
            }

            while(g--) {
                j = groups[g].length;

                while(j--) {
                    if(groups[g][j].touching(child)) {
                        this.boxes[child.id].adjustPortAvailability(groups[g][j]);
                        this.boxes[groups[g][j].id].adjustPortAvailability(child);
                        add = true;
                    }
                }

                if(add) {
                    group = group.concat(groups.splice(g, 1)[0]);//group will accumulate all things overlapping the child
                }
            }

            groups.push(group); //Add group to groups
        }

        i = groups.length;
        while(i--) {
            j = groups[i].length;
            parentBox = new ArRect(groups[i][0]);
            ids = [];

            while(j--) {
                parentBox.unionAssign(groups[i][j]);
                ids.push(groups[i][j].id);
            }

            this.bufferBoxes.push({ "box": parentBox, "children": groups[i] });

            j = ids.length;
            while(j--) {
                this.box2bufferBox[ids[j]] = this.bufferBoxes[this.bufferBoxes.length-1];
            }
        }

    };

    //Public Functions

    AutoRouterGraph.prototype.setBuffer = function(newBuffer) {
        CONSTANTS.BUFFER = newBuffer;
    };

    AutoRouterGraph.prototype.calculateSelfPoints = function() {
        this.selfPoints = [];
        this.selfPoints.push(new ArPoint(CONSTANTS.ED_MINCOORD, CONSTANTS.ED_MINCOORD));
        this.selfPoints.push(new ArPoint(CONSTANTS.ED_MAXCOORD, CONSTANTS.ED_MINCOORD));
        this.selfPoints.push(new ArPoint(CONSTANTS.ED_MAXCOORD, CONSTANTS.ED_MAXCOORD));
        this.selfPoints.push(new ArPoint(CONSTANTS.ED_MINCOORD, CONSTANTS.ED_MAXCOORD));
    };

    AutoRouterGraph.prototype.createBox = function() {
        var box = new AutoRouterBox();
        assert(box !== null, "ARGraph.createBox: box !== null FAILED");

        return box;
    };

    AutoRouterGraph.prototype.addBox = function(box) {
        console.log('adding box to graph');
        assert(box !== null, 
               'ARGraph.addBox: box !== null FAILED');
        assert(box instanceof AutoRouterBox, 
               'ARGraph.addBox: box instanceof AutoRouterBox FAILED');

        var rect = box.rect;

        this._disconnectPathsClipping(rect);

        box.owner = this;
        var boxId = this._getBoxCount().toString();
        while(boxId.length < 6) {
            boxId = "0" + boxId;
        }
        boxId = "BOX_" + boxId;
        box.id = boxId;

        this.boxes[boxId] = box;

        this._addBoxAndPortEdges(box);

        // add children of the box
        var children = box.childBoxes,
            i = children.length;
        while(i--) {
            this.addBox(children[i]);
        }
    };

    AutoRouterGraph.prototype.deleteBox = function(box) {
        assert(box !== null, "ARGraph.deleteBox: box !== null FAILED");

        console.log('box '+box.id+' has ' + box.childBoxes.length + ' children:');

        if (box.hasOwner()) {
            var parent = box.parent,
                children = box.childBoxes,
                i = children.length;

            // notify the parent of the deletion
            if(parent) {
                parent.removeChild(box);
            }

            // remove children
            while(i--) {
                this.deleteBox(children[i]);
            }
            this._remove(box);
        }

        box.destroy();
        box = null;
    };

    AutoRouterGraph.prototype.shiftBoxBy = function(box, offset) {
        assert(box !== null, "ARGraph.shiftBoxBy: box !== null FAILED");
        if (box === null) {
            return;
        }

        var rect = this.box2bufferBox[box.id].box,
            children = box.childBoxes,
            i = children.length;

        this._disconnectPathsClipping(rect); //redraw all paths clipping parent box.

        this._deleteBoxAndPortEdges(box);

        box.shiftBy(offset);
        this._addBoxAndPortEdges(box);

        rect = box.rect;
        this._disconnectPathsClipping(rect);
        this._disconnectPathsFrom(box);

        while(i--) {
            this.shiftBoxBy(children[i], offset);
        }
    };

    AutoRouterGraph.prototype.setBoxRect = function(box, rect) {
        if (box === null) {
            return;
        }

        this._deleteBoxAndPortEdges(box);
        box.setRect(rect);
        this._addBoxAndPortEdges(box);

        this._disconnectPathsClipping(rect);
    };

    AutoRouterGraph.prototype.routeSync = function() {
        console.log('about to autoroute');
        var state = {finished: false};

        this._connectAllDisconnectedPaths();

        while (!state.finished) {
            state = this._optimize(state);
        }

    };

    AutoRouterGraph.prototype.routeAsync = function(options) {
        this._connectAllDisconnectedPaths();

        var self = this,
            updateFn = options.update || function() {},
            callbackFn = options.callback || function() {},
            time = options.time || 5,
            state = {finished: false},
            optimizeFn = function(state) {
                updateFn(self.paths);
                if (state.finished) {
                    return callbackFn(self.paths);
                } else {
                    state = self._optimize(state);
                    return optimizeFn(state);
                }
            };

        setTimeout(optimizeFn, time, state);
    };

    /**
     * Performs one set of optimizations. 
     *
     * @param {Number} count This stores the max number of optimizations allowed
     * @param {Number} last This stores the last optimization type made
     *
     * @return {Object} Current count, last values
     */
    AutoRouterGraph.prototype._optimize = function(options) {
        var maxOperations = options.maxOperations || 100,
            last = options.last || 0,
            dm = options.dm || 10,		// max # of distribution op
            d = options.d || 0,
            getState = function(finished) {
                return {finished: finished || !!maxOperations,
                        maxOperations: maxOperations,
                        last: last,
                        dm: dm,
                        d: d};
            };

        if (maxOperations > 0) {

            if (last === 1) {
                return getState(true);
            }

            maxOperations--;
            console.log('about to simplify paths');
            if (this._simplifyPaths())
            {
                last = 1;
            }
            console.log('done simplify paths');
        }

        if (maxOperations > 0)
        {
            if (last === 2) {
                return getState(true);
            }

            maxOperations--;
            console.log('about to scan backward');
            if (this.horizontal.block_ScanBackward()) {

                do {
                    maxOperations--;
                } while(maxOperations > 0 && this.horizontal.block_ScanBackward());

                if (last < 2 || last > 5) {
                    d = 0;
                } else if (++d >= dm) {
                    return getState(true);
                }

                last = 2;
            }
        }
        console.log('done scan backward');

        if (maxOperations > 0) {
            if (last === 3) {
                return getState(true);
            }

            maxOperations--;
            console.log('about to scan forward');
            if (this.horizontal.block_ScanForward()) {

                do {
                    maxOperations--;
                } while(maxOperations > 0 && this.horizontal.block_ScanForward());

                if (last < 2 || last > 5) {
                    d = 0;
                } else if (++d >= dm) {
                    return getState(true);
                }

                last = 3;
            }
        }
        console.log('done scan forward');

        if (maxOperations > 0)
        {
            if (last === 4) {
                return getState(true);
            }

            maxOperations--;
            console.log('about to scan backward (v)');
            if (this.vertical.block_ScanBackward())
            {
                do {
                    maxOperations--;
                } while(maxOperations > 0 && this.vertical.block_ScanBackward()); 

                if (last < 2 || last > 5) {
                    d = 0;
                } else if (++d >= dm) {
                    return getState(true);
                }

                last = 4;
            }
        }
        console.log('done scan backward (v)');

        if (maxOperations > 0)
        {
            if (last === 5) {
                return getState(true);
            }

            maxOperations--;
            console.log('about to scan forward (v)');
            if (this.vertical.block_ScanForward())
            {

                do {
                    maxOperations--;
                } while(maxOperations > 0 && this.vertical.block_ScanForward());

                if (last < 2 || last > 5) {
                    d = 0;
                } else if (++d >= dm) {
                    return getState(true);
                }

                last = 5;
            }
        }
        console.log('done scan forward (v)');

        if (maxOperations > 0)
        {
            if (last === 6) {
                return getState(true);
            }

            maxOperations--;
            console.log('about to switch wrongs ');
            if (this.horizontal.block_SwitchWrongs())
            {
                last = 6;
            }
        }
            console.log('done switch wrongs ');

        if (maxOperations > 0)
        {
            if (last === 7) {
                return getState(true);
            }

            maxOperations--;
            console.log('about to switch wrongs (v)');
            if (this.vertical.block_SwitchWrongs()) {
                last = 7;
            }
        }
            console.log('done switch wrongs (v)');

        if (last === 0) {
            return getState(true);
        }

        return getState(false);
    };

    AutoRouterGraph.prototype.deletePath = function(path) {
        assert(path !== null, "ARGraph.deletePath: path !== null FAILED");

        if (path.hasOwner()) {
            assert(path.owner === this, "ARGraph.deletePath: path.owner === this FAILED");
            this._remove(path);
        }

        path.destroy();
    };

    AutoRouterGraph.prototype.deleteAll = function(addBackSelfEdges) {
        this._deleteAllPaths();
        this._deleteAllBoxes();
        this._deleteAllEdges();
        if (addBackSelfEdges) {
            this._addSelfEdges();
        }
    };

    AutoRouterGraph.prototype.addPath = function(isAutoRouted, startports, endports) {
        var path = new AutoRouterPath();

        path.setAutoRouting(isAutoRouted);
        path.setStartPorts(startports);
        path.setEndPorts(endports);
        this._add(path);

        return path;
    };

    AutoRouterGraph.prototype.isEdgeFixed = function(path, startpoint, endpoint) {
        var d = UTILS.getDir (endpoint.minus(startpoint)),
            h = UTILS.isHorizontal (d),

            elist = this._getEdgeList(h),

            edge = elist.getEdge(path, startpoint, endpoint);
        if (edge !== null) {
            return edge.getEdgeFixed() && !edge.getEdgeCustomFixed();
        }

        assert(false, "ARGraph.isEdgeFixed: FAILED");
        return true;
    };

    AutoRouterGraph.prototype.destroy = function() {
        this.deleteAll(false);

        this.horizontal.SetOwner(null);
        this.vertical.SetOwner(null);
    };

    AutoRouterGraph.prototype.assertValid = function() {
        var iter = 0;

        for(var box in this.boxes) {
            if(this.boxes.hasOwnProperty(box)) {
                this.assertValidBox(this.boxes[box]);
            }
        }

        var i = 0;

        while(i < this.paths.length)
        {
            this._assertValidPath(this.paths[i]);
            ++i;
        }
    };

    AutoRouterGraph.prototype.assertValidBox = function(box) {
        box.assertValid();
        assert(box.owner.equals(this), "ARGraph.assertValidBox: box.owner.equals(this) FAILED");

        assert (this.boxes[box.id] !== undefined, "ARGraph.assertValidBox: this.boxes[box.id] !== undefined FAILED");
    };

    AutoRouterGraph.prototype._assertValidPath = function(path) {
        path.assertValid();
        assert(path.owner.equals(this), "ARGraph.assertValidPath: path.owner.equals(this) FAILED");

        var iter = this.paths.indexOf(path);
        assert (iter !== -1, "ARGraph.assertValidPath: iter !== -1 FAILED");

        var pointList = path.getPointList(),
            startPort = path.getStartPort();

        assert(startPort !== null, "ARGraph.assertValidPath: startPort !== null FAILED");
        startPort.assertValid();
        var ownerBox = startPort.owner,
            boxOwnerGraph = ownerBox.owner;
        assert(boxOwnerGraph.equals(this), "ARGraph.assertValidPath: boxOwnerGraph.equals(this) FAILED");
        ownerBox.assertValidPort(startPort);

        if(path.isConnected()) {
            startPort.assertValidStartEndPoint(pointList[0], CONSTANTS.Dir_None, 1);
        }

        var endPort = path.getEndPort();
        assert(endPort !== null, "ARGraph.assertValidPath: endPort !== null FAILED");
        endPort.assertValid();
        var ownerBox2 = endPort.owner;
        assert(ownerBox2.owner.equals(this), "ARGraph.assertValidPath: ownerBox2.owner.equals(this) FAILED");
        ownerBox2.assertValidPort(endPort);

        if(path.isConnected())
        {
            var itr = pointList.length;
            endPort.assertValidStartEndPoint(pointList[--itr], CONSTANTS.Dir_None, 0);
        }
        else
        {
            assert(path.hasNoPoint(), "ARGraph.assertValidPath: path.hasNoPoint() FAILED");
        }

        path.assertValidPoints();

        if(pointList.length !== 0)
        {
            assert(pointList.length >= 2, "ARGraph.assertValidPath: pointList.length >= 2 FAILED");
            var pos = 0;
            assert(pos !== pointList.length, "ARGraph.assertValidPath: pos !== pointList.length FAILED");

            assert(this._isPointInBox(pointList[pos++]), "ARGraph.assertValidPath: isPointInBox(pointList[pos++]) FAILED");

            var p;
            while(pos < pointList.length)
            {
                p = pointList[pos++];
                if(pos !== pointList.length) {
                    assert(!this._isPointInBox(p), "ARGraph.assertValidPath: !isPointInBox(p) FAILED");
                } else {
                    assert(this._isPointInBox(p), "ARGraph.assertValidPath: isPointInBox(p) FAILED");
                }
            }
        }
    };

    AutoRouterGraph.prototype.dumpPaths = function(pos, c) {
        console.log("Paths dump pos " + pos + ", c " + c);
        var iter = 0,
            i = 0;

        while (iter < this.paths.length)
        {
            console.log(i + ". Path: ");
            (this.paths[iter]).getPointList().dumpPoints("DumpPaths");

            ++iter;
            i++;
        }

    };

    AutoRouterGraph.prototype.dumpEdgeLists = function() {
        this.horizontal.dumpEdges("Horizontal edges:");
        this.vertical.dumpEdges("Vertical edges:");
    };

    return AutoRouterGraph;
});
