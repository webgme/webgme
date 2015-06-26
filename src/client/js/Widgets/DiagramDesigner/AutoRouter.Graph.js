/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author brollb / https://github/brollb
 */

define([
    'js/logger',
    'common/util/assert',
    './AutoRouter.Constants',
    './AutoRouter.Utils',
    './AutoRouter.Point',
    './AutoRouter.PointList',
    './AutoRouter.Rect',
    './AutoRouter.Path',
    './AutoRouter.Port',
    './AutoRouter.Box',
    './AutoRouter.Edge',
    './AutoRouter.EdgeList'
], function (Logger,
             assert,
             CONSTANTS,
             Utils,
             ArPoint,
             ArPointListPath,
             ArRect,
             AutoRouterPath,
             AutoRouterPort,
             AutoRouterBox,
             AutoRouterEdge,
             AutoRouterEdgeList) {

    'use strict';

    var _logger = Logger.create('gme:Widgets:DiagramDesigner:AutoRouter.Graph', WebGMEGlobal.gmeConfig.client.log),
        COUNTER = 1;  // Used for unique ids

    var AutoRouterGraph = function () {
        this.completelyConnected = true;  // true if all paths are connected
        this.horizontal = new AutoRouterEdgeList(true);
        this.vertical = new AutoRouterEdgeList(false);
        this.boxes = {};
        this.paths = [];
        this.bufferBoxes = [];
        this.box2bufferBox = {}; // maps boxId to corresponding bufferbox object

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
    AutoRouterGraph.prototype._deleteAllBoxes = function () {
        var ids = Object.keys(this.boxes);
        for (var i = ids.length; i--;) {
            this.boxes[ids[i]].destroy();
            delete this.boxes[ids[i]];
        }
        // Clean up the bufferBoxes
        this.bufferBoxes = [];
        this.box2bufferBox = {};
    };

    AutoRouterGraph.prototype._getBoxAt = function (point, nearness) {
        var ids = Object.keys(this.boxes);
        for (var i = ids.length; i--;) {
            if (this.boxes[ids[i]].isBoxAt(point, nearness)) {
                return this.boxes[ids[i]];
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
        var ids = Object.keys(this.boxes);
        for (var i = ids.length; i--;) {
            boxRect = this.boxes[ids[i]].rect;
            if (Utils.isRectClip(rect, boxRect)) {
                return true;
            }
        }
        return false;
    };

    AutoRouterGraph.prototype._isRectClipBufferBoxes = function (rect) {
        var i = this.bufferBoxes.length,
            c;

        while (i--) {
            c = this.bufferBoxes[i].children.length;

            while (c--) {
                if (Utils.isRectClip(rect, this.bufferBoxes[i].children[c])) {
                    return true;
                }
            }
        }

        return false;
    };

    AutoRouterGraph.prototype._isLineClipBufferBoxes = function (p1, p2) {
        var rect = new ArRect(p1, p2);
        rect.normalizeRect();
        assert(rect.left === rect.right || rect.ceil === rect.floor,
            'ARGraph.this._isLineClipBoxes: rect.left === rect.right || rect.ceil === rect.floor FAILED');

        if (rect.left === rect.right) {
            rect.right++;
        }
        if (rect.ceil === rect.floor) {
            rect.floor++;
        }

        return this._isRectClipBufferBoxes(rect);
    };

    AutoRouterGraph.prototype._isLineClipBoxes = function (p1, p2) {
        var rect = new ArRect(p1, p2);
        rect.normalizeRect();
        assert(rect.left === rect.right || rect.ceil === rect.floor,
            'ARGraph.isLineClipBoxes: rect.left === rect.right || rect.ceil === rect.floor FAILED');

        if (rect.left === rect.right) {
            rect.right++;
        }
        if (rect.ceil === rect.floor) {
            rect.floor++;
        }

        return this._isRectClipBoxes(rect);
    };

    AutoRouterGraph.prototype._canBoxAt = function (rect) {
        return !this._isRectClipBoxes.inflatedRect(rect, 1);
    };

    AutoRouterGraph.prototype._add = function (path) {
        assert(path !== null, 'ARGraph.add: path !== null FAILED');
        assert(!path.hasOwner(), 'ARGraph.add: !path.hasOwner() FAILED');

        path.owner = this;

        this.paths.push(path);

        this.horizontal.addPathEdges(path);
        this.vertical.addPathEdges(path);

        if (CONSTANTS.DEBUG) {
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
        if (edge) {
            return edge;
        }

        return this.vertical.getEdgeAt(point, nearness);
    };

    AutoRouterGraph.prototype._getSurroundRect = function () {
        var rect = new ArRect(0, 0, 0, 0),
            i;

        var ids = Object.keys(this.boxes);
        for (i = ids.length; i--;) {
            rect.unionAssign(this.boxes[ids[i]].rect);
        }

        for (i = this.paths.length; i--;) {
            rect.unionAssign(this.paths[i].getSurroundRect());
        }

        return rect;
    };

    AutoRouterGraph.prototype._getOutOfBox = function (details) {
        var bufferObject = this.box2bufferBox[details.box.id],
            children = bufferObject.children,
            i = bufferObject.children.length,
            point = details.point,
            dir = details.dir,
            boxRect = new ArRect(details.box.rect);

        boxRect.inflateRect(CONSTANTS.BUFFER); //Create a copy of the buffer box

        assert(Utils.isRightAngle(dir), 'ARGraph.getOutOfBox: Utils.isRightAngle (dir) FAILED');

        while (boxRect.ptInRect(point)) {
            if (Utils.isHorizontal(dir)) {
                point.x = Utils.getRectOuterCoord(boxRect, dir);
            } else {
                point.y = Utils.getRectOuterCoord(boxRect, dir);
            }

            while (i--) {
                if (children[i].ptInRect(point)) {
                    boxRect = children[i];
                    break;
                }
            }
            i = bufferObject.children.length;
        }

        assert(!boxRect.ptInRect(point), 'ARGraph.getOutOfBox: !boxRect.ptInRect( point) FAILED');
    };

    AutoRouterGraph.prototype._goToNextBufferBox = function (args) {
        var point = args.point,
            end = args.end,
            dir = args.dir,
            dir2 = args.dir2 === undefined || !Utils.isRightAngle(args.dir2) ? (end instanceof ArPoint ?
                Utils.exGetMajorDir(end.minus(point)) : CONSTANTS.DirNone) : args.dir2,
            stophere = args.end !== undefined ? args.end :
                (dir === 1 || dir === 2 ? CONSTANTS.ED_MAXCOORD : CONSTANTS.ED_MINCOORD );

        if (dir2 === dir) {
            dir2 = Utils.isRightAngle(Utils.exGetMinorDir(end.minus(point))) ?
                Utils.exGetMinorDir(end.minus(point)) : (dir + 1) % 4;
        }

        if (end instanceof ArPoint) {
            stophere = Utils.getPointCoord(stophere, dir);
        }

        assert(Utils.isRightAngle(dir), 'ArGraph.goToNextBufferBox: Utils.isRightAngle (dir) FAILED');
        assert(Utils.getPointCoord(point, dir) !== stophere,
            'ArGraph.goToNextBufferBox: Utils.getPointCoord (point, dir) !== stophere FAILED');

        var boxby = null,
            i = -1,
            boxRect;
        //jscs:disable maximumLineLength
        while (++i < this.bufferBoxes.length) {
            boxRect = this.bufferBoxes[i].box;

            if (!Utils.isPointInDirFrom(point, boxRect, dir) && //Add support for entering the parent box
                Utils.isPointBetweenSides(point, boxRect, dir) &&  // if it will not put the point in a corner (relative to dir2)
                Utils.isCoordInDirFrom(stophere,
                    Utils.getChildRectOuterCoordFrom(this.bufferBoxes[i], dir, point).coord, dir)) {
                //Return extreme (parent box) for this comparison
                stophere = Utils.getChildRectOuterCoordFrom(this.bufferBoxes[i], dir, point).coord;
                boxby = this.bufferBoxes[i];
            }
        }
        //jscs:enable maximumLineLength

        if (Utils.isHorizontal(dir)) {
            point.x = stophere;
        } else {
            point.y = stophere;
        }

        return boxby;
    };

    AutoRouterGraph.prototype._hugChildren = function (bufferObject, point, dir1, dir2, exitCondition) {
        // This method creates a path that enters the parent box and 'hugs' the children boxes
        // (remains within one pixel of them) and follows them out.
        assert((dir1 + dir2) % 2 === 1, 'ARGraph.hugChildren: One and only one direction must be horizontal');
        var children = bufferObject.children,
            parentBox = bufferObject.box,
            initPoint = new ArPoint(point),
            child = this._goToNextBox(point, dir1, (dir1 === 1 || dir1 === 2 ?
                CONSTANTS.ED_MAXCOORD : CONSTANTS.ED_MINCOORD ), children),
            finalPoint,
            dir = dir2,
            nextDir = Utils.nextClockwiseDir(dir1) === dir2 ? Utils.nextClockwiseDir : Utils.prevClockwiseDir,
            points = [new ArPoint(point)],
            hasExit = true,
            nextChild,
            old;

        assert(child !== null, 'ARGraph.hugChildren: child !== null FAILED');
        exitCondition = exitCondition === undefined ? function (pt) {
            return !parentBox.ptInRect(pt);
        } : exitCondition;

        while (hasExit && !exitCondition(point, bufferObject)) {
            old = new ArPoint(point);
            nextChild = this._goToNextBox(point, dir, Utils.getRectOuterCoord(child, dir), children);

            if (!points[points.length - 1].equals(old)) {
                points.push(new ArPoint(old)); //The points array should not contain the most recent point.
            }

            if (nextChild === null) {
                dir = Utils.reverseDir(nextDir(dir));
            } else if (Utils.isCoordInDirFrom(Utils.getRectOuterCoord(nextChild, Utils.reverseDir(nextDir(dir))),
                    Utils.getPointCoord(point, Utils.reverseDir(nextDir(dir))), Utils.reverseDir(nextDir(dir)))) {
                dir = nextDir(dir);
                child = nextChild;
            }

            if (finalPoint === undefined) {
                finalPoint = new ArPoint(point);
            } else if (!finalPoint.equals(old)) {
                hasExit = !point.equals(finalPoint);
            }

        }

        if (points[0].equals(initPoint)) {
            points.splice(0, 1);
        }

        if (!hasExit) {
            points = null;
            point.assign(initPoint);
        }

        return points;

    };

    AutoRouterGraph.prototype._goToNextBox = function (point, dir, stop1, boxList) {
        var stophere = stop1;

        /*
         if (stop2 !== undefined) {
         if (stop2 instanceof Array) {
         boxList = stop2;
         } else {
         stophere = stop1 instanceof ArPoint ?
         chooseInDir.getPointCoord (stop1, dir), Utils.getPointCoord (stop2, dir), Utils.reverseDir (dir)) :
         chooseInDir(stop1, stop2, Utils.reverseDir (dir));
         }

         }else */
        if (stop1 instanceof ArPoint) {
            stophere = Utils.getPointCoord(stophere, dir);
        }

        assert(Utils.isRightAngle(dir), 'ArGraph.goToNextBox: Utils.isRightAngle (dir) FAILED');
        assert(Utils.getPointCoord(point, dir) !== stophere,
            'ArGraph.goToNextBox: Utils.getPointCoord (point, dir) !== stophere FAILED');

        var boxby = null,
            iter = boxList.length,
            boxRect;

        while (iter--) {
            boxRect = boxList[iter];

            if (Utils.isPointInDirFrom(point, boxRect, Utils.reverseDir(dir)) &&
                Utils.isPointBetweenSides(point, boxRect, dir) &&
                Utils.isCoordInDirFrom(stophere, Utils.getRectOuterCoord(boxRect, Utils.reverseDir(dir)), dir)) {
                stophere = Utils.getRectOuterCoord(boxRect, Utils.reverseDir(dir));
                boxby = boxList[iter];
            }
        }

        if (Utils.isHorizontal(dir)) {
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
            ids = Object.keys(this.boxes),
            i,
            rect;

        if (start.y === end.y) {
            if (start.x > end.x) {
                t = start.x;
                start.x = end.x;
                end.x = t;
            }

            for (i = ids.length; i--;) {
                rect = this.boxes[ids[i]].rect;

                if (start.x < rect.right && rect.left <= end.x) {
                    if (rect.floor <= start.y && rect.floor > min) {
                        min = rect.floor;
                    }
                    if (rect.ceil > start.y && rect.ceil < max) {
                        max = rect.ceil;
                    }
                }
            }
        } else {
            assert(start.x === end.x, 'ARGraph.this.getLimitsOfEdge: start.x === end.x FAILED');

            if (start.y > end.y) {
                t = start.y;
                start.y = end.y;
                end.y = t;
            }

            for (i = ids.length; i--;) {
                rect = this.boxes[ids[i]].rect;

                if (start.y < rect.floor && rect.ceil <= end.y) {
                    if (rect.right <= start.x && rect.right > min) {
                        min = rect.right;
                    }
                    if (rect.left > start.x && rect.left < max) {
                        max = rect.left;
                    }
                }
            }
        }

        max--;

        return {min: min, max: max};
    };

    AutoRouterGraph.prototype._isPointInBox = function (point) {
        return this.getBoxAt(point) !== null;
    };

    AutoRouterGraph.prototype._connect = function (path) {
        var startport = path.getStartPort(),
            endport = path.getEndPort(),
            startpoint = path.startpoint,
            endpoint = path.endpoint;

        assert(startport.hasPoint(startpoint), 'ARGraph.connect: startport.hasPoint(startpoint) FAILED');
        assert(endport.hasPoint(endpoint), 'ARGraph.connect: endport.hasPoint(endpoint) FAILED');

        var startRoot = startport.owner.getRootBox(),
            endRoot = endport.owner.getRootBox(),
            startId = startRoot.id,
            endId = endRoot.id,
            startdir = startport.portOnWhichEdge(startpoint),
            enddir = endport.portOnWhichEdge(endpoint);

        if (startpoint.equals(endpoint)) {
            Utils.stepOneInDir(startpoint, Utils.nextClockwiseDir(startdir));
        }

        if (!path.isAutoRouted()) {
            path.createCustomPath();
            return this.horizontal.addPathEdges(path) && this.vertical.addPathEdges(path);
        } else if (this.box2bufferBox[startId] === this.box2bufferBox[endId] &&
            startdir === Utils.reverseDir(enddir) && startRoot !== endRoot) {

            return this._connectPointsSharingParentBox(path, startpoint, endpoint, startdir);
        } else {

            return this._connectPathWithPoints(path, startpoint, endpoint);
        }

    };

    AutoRouterGraph.prototype._connectPathWithPoints = function (path, startpoint, endpoint) {
        assert(startpoint instanceof ArPoint, 'ARGraph.connect: startpoint instanceof ArPoint FAILED');
        assert(path !== null && path.owner === this, 'ARGraph.connect: path !== null && path.owner === self FAILED');
        assert(!path.isConnected(), 'ARGraph.connect: !path.isConnected() FAILED');
        assert(!startpoint.equals(endpoint), 'ARGraph.connect: !startpoint.equals(endpoint) FAILED');

        var startPort = path.getStartPort();
        assert(startPort !== null, 'ARGraph.connect: startPort !== null FAILED');

        var startdir = startPort.portOnWhichEdge(startpoint),
            endPort = path.getEndPort();

        assert(endPort !== null, 'ARGraph.connect: endPort !== null FAILED');
        var enddir = endPort.portOnWhichEdge(endpoint);
        assert(Utils.isRightAngle(startdir) && Utils.isRightAngle(enddir),
            'ARGraph.connect: Utils.isRightAngle (startdir) && Utils.isRightAngle (enddir) FAILED');

        //Find the bufferbox containing startpoint, endpoint
        var start = new ArPoint(startpoint);
        this._getOutOfBox({
            point: start,
            dir: startdir,
            end: endpoint,
            box: startPort.owner
        });
        assert(!start.equals(startpoint), 'ARGraph.connect: !start.equals(startpoint) FAILED');

        var end = new ArPoint(endpoint);
        this._getOutOfBox({
            point: end,
            dir: enddir,
            end: start,
            box: endPort.owner
        });
        assert(!end.equals(endpoint), 'ARGraph.connect: !end.equals(endpoint) FAILED');

        var points,
            isAutoRouted = path.isAutoRouted();
        if (isAutoRouted) {
            points = this._connectPoints(start, end, startdir, enddir);
        }

        if (!isAutoRouted) {
            points = path.applyCustomizationsBeforeAutoConnectPoints();
        }

        path.points = points;
        path.points.unshift(startpoint);
        path.points.push(endpoint);

        if (isAutoRouted) {
            this._simplifyPathCurves(path);
            path.simplifyTrivially();
            this._simplifyPathPoints(path);
            this._centerStairsInPathPoints(path, startdir, enddir);
        }
        path.setState(CONSTANTS.PathStateConnected);

        // Apply custom edge modifications - step 1
        // (Step 1: Move the desired edges - see in AutoRouterGraph::Connect(AutoRouterPath* path, ArPoint& startpoint,
        //                                                                      ArPoint& endpoint)
        //  Step 2: Fix the desired edges - see in AutoRouterEdgeList::addEdges(AutoRouterPath* path))
        return this.horizontal.addPathEdges(path) && this.vertical.addPathEdges(path);
    };

    AutoRouterGraph.prototype._connectPointsSharingParentBox = function (path, startpoint, endpoint, startdir) {
        //Connect points that share a parentbox and face each other
        //These will not need the simplification and complicated path finding
        var start = new ArPoint(startpoint),
            dx = endpoint.x - start.x,
            dy = endpoint.y - start.y;

        path.deleteAll();

        path.addTail(startpoint);
        if (dx !== 0 && dy !== 0) {
            if (Utils.isHorizontal(startdir)) {
                start.x += dx / 2;
                path.addTail(new ArPoint(start));
                start.y += dy;
                path.addTail(new ArPoint(start));
            } else {
                start.y += dy / 2;
                path.addTail(new ArPoint(start));
                start.x += dx;
                path.addTail(new ArPoint(start));
            }
        }
        path.addTail(endpoint);

        path.setState(CONSTANTS.PathStateConnected);

        return this.horizontal.addPathEdges(path) && this.vertical.addPathEdges(path);

    };

    AutoRouterGraph.prototype._connectPoints = function (start, end, hintstartdir, hintenddir, flipped) {
        var ret = new ArPointListPath(),
            thestart = new ArPoint(start),
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
            i,

        //Exit conditions
        //if there is a straight line to the end point
            findExitToEndpoint = function (pt, bo) {
                return (pt.x === end.x || pt.y === end.y) && !Utils.isLineClipRects(pt, end, bo.children);
            },  //If you pass the endpoint, you need to have a way out.

        //exitCondition is when you get to the dir1 side of the box or when you pass end
            getToDir1Side = function (pt, bo) {
                return Utils.getPointCoord(pt, dir1) === Utils.getRectOuterCoord(bo.box, dir1) ||
                    ( Utils.isPointInDirFrom(pt, end, dir1));
            };

        //This is where we create the original path that we will later adjust
        while (!start.equals(end)) {

            dir1 = Utils.exGetMajorDir(end.minus(start));
            dir2 = Utils.exGetMinorDir(end.minus(start));

            assert(dir1 !== CONSTANTS.DirNone, 'ARGraph.connectPoints: dir1 !== CONSTANTS.DirNone FAILED');
            assert(dir1 === Utils.getMajorDir(end.minus(start)),
                'ARGraph.connectPoints: dir1 === Utils.getMajorDir(end.minus(start)) FAILED');
            assert(dir2 === CONSTANTS.DirNone || dir2 === Utils.getMinorDir(end.minus(start)),
                'ARGraph.connectPoints: dir2 === CONSTANTS.DirNone || ' +
                'dir2 === Utils.getMinorDir(end.minus(start)) FAILED');

            if (dir2 === hintstartdir && dir2 !== CONSTANTS.DirNone) {
                // i.e. std::swap(dir1, dir2);
                dir2 = dir1;
                dir1 = hintstartdir;
            }

            ret.push(new ArPoint(start));

            old = new ArPoint(start);

            bufferObject = this._goToNextBufferBox({
                point: start,
                dir: dir1,
                dir2: dir2,
                end: end
            });  // Modified goToNextBox (that allows entering parent buffer boxes here
            box = bufferObject === null ? null : bufferObject.box;

            //If goToNextBox does not modify start
            if (start.equals(old)) {

                assert(box !== null, 'ARGraph.connectPoints: box !== null FAILED');
                rect = box instanceof ArRect ? box : box.rect;

                if (dir2 === CONSTANTS.DirNone) {
                    dir2 = Utils.nextClockwiseDir(dir1);
                }

                assert(dir1 !== dir2 && dir1 !== CONSTANTS.DirNone && dir2 !== CONSTANTS.DirNone,
                    'ARGraph.connectPoints: dir1 !== dir2 && dir1 !== CONSTANTS.DirNone && dir2 !== ' +
                    'CONSTANTS.DirNone FAILED');
                if (bufferObject.box.ptInRect(end) && !bufferObject.box.ptInRect(start) && flipped) {
                    //Unfortunately, if parentboxes are a pixel apart, start/end can get stuck and not cross the border
                    //separating them.... This is a nudge to get them to cross it.
                    if (Utils.isHorizontal(dir1)) {
                        start.x = end.x;
                    } else {
                        start.y = end.y;
                    }
                } else if (bufferObject.box.ptInRect(end)) {
                    if (!flipped) {
                        oldEnd = new ArPoint(end);

                        ret2 = this._connectPoints(end, start, hintenddir, dir1, true);
                        i = ret2.length - 1;

                        while (i-- > 1) {
                            ret.push(ret2[i]);
                        }

                        assert(start.equals(end), 'ArGraph.connectPoints: start.equals(end) FAILED');
                        old = CONSTANTS.EMPTY_POINT;
                        start = end = oldEnd;
                    } else { //If we have flipped and both points are in the same bufferbox
                        //We will hugchildren until we can connect both points.
                        //If we can't, force it
                        pts = this._hugChildren(bufferObject, start, dir1, dir2, findExitToEndpoint);
                        if (pts !== null) {//There is a path from start -> end
                            if (pts.length) {  //Add new points to the current list 
                                ret = ret.concat(pts);
                                ret.push(new ArPoint(start));
                            }
                            start.assign(end);

                        } else { //Force to the endpoint
                            assert(Utils.isRightAngle(dir1), 'ARGraph.connectPoints: Utils.isRightAngle (dir1) FAILED');

                            if (Utils.isHorizontal(dir1)) {
                                start.x = end.x;
                            } else {
                                start.y = end.y;
                            }

                            ret.push(new ArPoint(start));

                            if (!Utils.isHorizontal(dir1)) {
                                start.x = end.x;
                            } else {
                                start.y = end.y;
                            }

                            ret.push(new ArPoint(start));

                            assert(start.equals(end));//We are forcing out so these should be the same now

                        }
                        assert(!start.equals(old));//We are forcing out so these should be the same now
                    }
                } else if (Utils.isPointInDirFrom(end, rect, dir2)) {

                    assert(!Utils.isPointInDirFrom(start, rect, dir2),
                        'ARGraph.connectPoints: !Utils.isPointInDirFrom(start, rect, dir2) FAILED');
                    box = this._goToNextBufferBox({
                        point: start,
                        dir: dir2,
                        dir2: dir1,
                        end: end
                    });

                    // this assert fails if two boxes are adjacent, and a connection wants to go between
                    //assert(Utils.isPointInDirFrom(start, rect, dir2),
                    // 'ARGraph.connectPoints: Utils.isPointInDirFrom(start, rect, dir2) FAILED');
                    // This is not the best check with parent boxes
                    if (start.equals(old)) { //Then we are in a corner
                        if (box.children.length > 1) {
                            pts = this._hugChildren(box, start, dir2, dir1, getToDir1Side);
                        } else {
                            pts = this._hugChildren(bufferObject, start, dir1, dir2);
                        }
                        if (pts !== null) {

                            //Add new points to the current list 
                            ret = ret.concat(pts);

                        } else { //Go through the blocking box
                            assert(Utils.isRightAngle(dir1), 'ARGraph.getOutOfBox: Utils.isRightAngle (dir1) FAILED');

                            if (Utils.isHorizontal(dir1)) {
                                start.x = Utils.getRectOuterCoord(bufferObject.box, dir1);
                            } else {
                                start.y = Utils.getRectOuterCoord(bufferObject.box, dir1);
                            }
                        }
                    }
                } else {
                    assert(Utils.isPointBetweenSides(end, rect, dir1),
                        'ARGraph.connectPoints: Utils.isPointBetweenSides(end, rect, dir1) FAILED');
                    assert(!Utils.isPointIn(end, rect), 'ARGraph.connectPoints: !Utils.isPointIn(end, rect) FAILED');

                    rev = 0;

                    if (Utils.reverseDir(dir2) === hintenddir &&
                        Utils.getChildRectOuterCoordFrom(bufferObject, Utils.reverseDir(dir2), start) ===
                        Utils.getRectOuterCoord(rect, Utils.reverseDir(dir2))) { //And if point can exit that way
                        rev = 1;
                    } else if (dir2 !== hintenddir) {
                        if (Utils.isPointBetweenSides(thestart, rect, dir1)) {
                            if (Utils.isPointInDirFrom(rect.getTopLeft().plus(rect.getBottomRight()),
                                    start.plus(end), dir2)) {
                                rev = 1;
                            }
                        } else if (Utils.isPointInDirFrom(start, thestart, dir2)) {
                            rev = 1;
                        }
                    }

                    if (rev) {
                        dir2 = Utils.reverseDir(dir2);
                    }

                    //If the box in the way has one child
                    if (bufferObject.children.length === 1) {
                        if (Utils.isHorizontal(dir2)) {
                            start.x = Utils.getRectOuterCoord(rect, dir2);
                        } else {
                            start.y = Utils.getRectOuterCoord(rect, dir2);
                        }

                        assert(!start.equals(old), 'ARGraph.connectPoints: !start.equals(old) FAILED');
                        ret.push(new ArPoint(start));
                        old.assign(start);

                        if (Utils.isHorizontal(dir1)) {
                            start.x = Utils.getRectOuterCoord(rect, dir1);
                        } else {
                            start.y = Utils.getRectOuterCoord(rect, dir1);
                        }

                        assert(Utils.isPointInDirFrom(end, start, dir1),
                            'ARGraph.connectPoints: Utils.isPointInDirFrom(end, start, dir1) FAILED');
                        if (Utils.getPointCoord(start, dir1) !== Utils.getPointCoord(end, dir1)) {
                            this._goToNextBufferBox({
                                point: start,
                                dir: dir1,
                                end: end
                            });
                        }

                    } else { //If the box has multiple children
                        pts = this._hugChildren(bufferObject, start, dir1, dir2, getToDir1Side);
                        if (pts !== null) {

                            //Add new points to the current list 
                            ret = ret.concat(pts);

                        } else { //Go through the blocking box
                            assert(Utils.isRightAngle(dir1), 'ARGraph.getOutOfBox: Utils.isRightAngle (dir1) FAILED');

                            if (Utils.isHorizontal(dir1)) {
                                start.x = Utils.getRectOuterCoord(bufferObject.box, dir1);
                            } else {
                                start.y = Utils.getRectOuterCoord(bufferObject.box, dir1);
                            }
                        }
                    }
                }

                assert(!start.equals(old), 'ARGraph.connectPoints: !start.equals(old) FAILED');
            }

        }

        ret.push(end);

        if (CONSTANTS.DEBUG) {
            ret.assertValid();  // Check that all edges are horizontal are vertical
        }

        return ret;
    };

    AutoRouterGraph.prototype._disconnectAll = function () {
        for (var i = this.paths.length; i--;) {
            this.disconnect(this.paths[i]);
        }
    };

    AutoRouterGraph.prototype.disconnect = function (path) {
        if (path.isConnected()) {
            this.deleteEdges(path);
        }

        path.deleteAll();
        this.completelyConnected = false;
    };

    AutoRouterGraph.prototype._disconnectPathsClipping = function (rect) {
        for (var i = this.paths.length; i--;) {
            if (this.paths[i].isPathClip(rect)) {
                this.disconnect(this.paths[i]);
            }
        }
    };

    AutoRouterGraph.prototype._disconnectPathsFrom = function (obj) {
        var iter = this.paths.length,
            path,
            startport,
            endport;

        if (obj instanceof AutoRouterBox) {
            var box = obj,
                startbox,
                endbox;
            while (iter--) {
                path = this.paths[iter];

                assert(path.startports !== null, 'ARGraph.disconnectPathsFrom: startport !== null FAILED');
                assert(path.startports.length > 0, 'ARGraph.disconnectPathsFrom: Path has no startports');
                assert(path.endports !== null, 'ARGraph.disconnectPathsFrom: endport !== null FAILED');
                assert(path.endports.length > 0, 'ARGraph.disconnectPathsFrom: Path has no endports');

                // Can simply select any start/end port to check the owner
                startbox = path.startports[0].owner;
                endbox = path.endports[0].owner;

                assert(startbox !== null, 'ARGraph.disconnectPathsFrom: startbox !== null FAILED');
                assert(endbox !== null, 'ARGraph.disconnectPathsFrom: endbox !== null FAILED');

                if ((startbox === box || endbox === box)) {
                    this.disconnect(path);
                }

            }
        } else {  // Assuming 'box' is a port

            var port = obj;
            while (iter--) {
                path = this.paths[iter];
                startport = path.getStartPort();
                endport = path.getEndPort();

                if ((startport === port || endport === port)) {
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

        for (i = ids.length; i--;) {
            this._addBoxAndPortEdges(this.boxes[ids[i]]);
        }

        for (i = this.paths.length; i--;) {
            this.horizontal.addPathEdges(this.paths[i]);
            this.vertical.addPathEdges(this.paths[i]);
        }
    };

    AutoRouterGraph.prototype._deleteAllEdges = function () {
        this.horizontal.deleteAllEdges();
        this.vertical.deleteAllEdges();
    };

    AutoRouterGraph.prototype._addBoxAndPortEdges = function (box) {
        assert(box !== null, 'ARGraph.addBoxAndPortEdges: box !== null FAILED');

        this._addEdges(box);

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

        for (var i = box.ports.length; i--;) {
            this.deleteEdges(box.ports[i]);
        }

        this._removeFromBufferBoxes(box);
    };

    AutoRouterGraph.prototype._getEdgeList = function (ishorizontal) {
        return ishorizontal ? this.horizontal : this.vertical;
    };

    AutoRouterGraph.prototype._candeleteTwoEdgesAt = function (path, points, pos) {
        if (CONSTANTS.DEBUG) {
            assert(path.owner === this, 'ARGraph.candeleteTwoEdgesAt: path.owner === this FAILED');
            path.assertValid();
            assert(path.isConnected(), 'ARGraph.candeleteTwoEdgesAt: path.isConnected() FAILED');
            points.AssertValidPos(pos);
        }

        if (pos + 2 >= points.length || pos < 1) {
            return false;
        }

        var pointpos = pos,
            point = points[pos++],
            npointpos = pos,
            npoint = points[pos++],
            nnpointpos = pos;

        pos = pointpos;
        pos--;
        var ppointpos = pos;

        var ppoint = points[pos--],
            pppointpos = pos;

        if (npoint.equals(point)) {
            return false; // direction of zero-length edges can't be determined, so don't delete them
        }

        assert(pppointpos < points.length && ppointpos < points.length && pointpos < points.length &&
            npointpos < points.length && nnpointpos < points.length,
            'ARGraph.candeleteTwoEdgesAt: pppointpos < points.length && ppointpos < points.length &&' +
            'pointpos < points.length && npointpos < points.length && nnpointpos < points.length FAILED');

        var dir = Utils.getDir(npoint.minus(point));

        assert(Utils.isRightAngle(dir), 'ARGraph.candeleteTwoEdgesAt: Utils.isRightAngle (dir) FAILED');
        var ishorizontal = Utils.isHorizontal(dir);

        var newpoint = new ArPoint();

        if (ishorizontal) {
            newpoint.x = Utils.getPointCoord(npoint, ishorizontal);
            newpoint.y = Utils.getPointCoord(ppoint, !ishorizontal);
        } else {
            newpoint.y = Utils.getPointCoord(npoint, ishorizontal);
            newpoint.x = Utils.getPointCoord(ppoint, !ishorizontal);
        }

        assert(Utils.getDir(newpoint.minus(ppoint)) === dir,
            'ARGraph.candeleteTwoEdgesAt: Utils.getDir (newpoint.minus(ppoint)) === dir FAILED');

        if (this._isLineClipBoxes(newpoint, npoint)) {
            return false;
        }
        if (this._isLineClipBoxes(newpoint, ppoint)) {
            return false;
        }

        return true;
    };

    AutoRouterGraph.prototype._deleteTwoEdgesAt = function (path, points, pos) {
        if (CONSTANTS.DEBUG) {
            assert(path.owner === this, 'ARGraph.deleteTwoEdgesAt: path.owner === this FAILED');
            path.assertValid();
            assert(path.isConnected(), 'ARGraph.deleteTwoEdgesAt: path.isConnected() FAILED');
            points.AssertValidPos(pos);
        }

        var pointpos = pos, //Getting the next, and next-next, points
            point = points[pos++],
            npointpos = pos,
            npoint = points[pos++],
            nnpointpos = pos,
            nnpoint = points[pos++],
            nnnpointpos = pos;

        pos = pointpos;
        pos--;

        var ppointpos = pos, //Getting the prev, prev-prev points
            ppoint = points[pos--],
            pppointpos = pos,
            pppoint = points[pos--];

        assert(pppointpos < points.length && ppointpos < points.length && pointpos < points.length &&
        npointpos < points.length && nnpointpos < points.length,
            'ARGraph.deleteTwoEdgesAt: pppointpos < points.length && ppointpos < points.length && pointpos < ' +
            'points.length && npointpos < points.length && nnpointpos < points.length FAILED');
        assert(pppoint !== null && ppoint !== null && point !== null && npoint !== null && nnpoint !== null,
            'ARGraph.deleteTwoEdgesAt: pppoint !== null && ppoint !== null && point !== null && npoint !== null &&' +
            ' nnpoint !== null FAILED');

        var dir = Utils.getDir(npoint.minus(point));

        assert(Utils.isRightAngle(dir), 'ARGraph.deleteTwoEdgesAt: Utils.isRightAngle (dir) FAILED');
        var ishorizontal = Utils.isHorizontal(dir);

        var newpoint = new ArPoint();
        if (ishorizontal) {
            newpoint.x = Utils.getPointCoord(npoint, ishorizontal);
            newpoint.y = Utils.getPointCoord(ppoint, !ishorizontal);
        } else {
            newpoint.x = Utils.getPointCoord(ppoint, !ishorizontal);
            newpoint.y = Utils.getPointCoord(npoint, ishorizontal);
        }

        assert(Utils.getDir(newpoint.minus(ppoint)) === dir,
            'ARGraph.deleteTwoEdgesAt: Utils.getDir (newpoint.minus(ppoint)) === dir FAILED');

        assert(!this._isLineClipBoxes(newpoint, npoint),
            'ARGraph.deleteTwoEdgesAt: !isLineClipBoxes(newpoint, npoint) FAILED');
        assert(!this._isLineClipBoxes(newpoint, ppoint),
            'ARGraph.deleteTwoEdgesAt: !isLineClipBoxes(newpoint, ppoint) FAILED');

        var hlist = this._getEdgeList(ishorizontal),
            vlist = this._getEdgeList(!ishorizontal);

        var ppedge = hlist.getEdgeByPointer(pppoint),
            pedge = vlist.getEdgeByPointer(ppoint),
            nedge = hlist.getEdgeByPointer(point),
            nnedge = vlist.getEdgeByPointer(npoint);

        assert(ppedge !== null && pedge !== null && nedge !== null && nnedge !== null,
            'ARGraph.deleteTwoEdgesAt:  ppedge !== null && pedge !== null && nedge !== null && nnedge !== null FAILED');

        vlist.remove(pedge);
        hlist.remove(nedge);

        points.splice(ppointpos, 3, newpoint);
        ppedge.endpointNext = nnpoint;
        ppedge.endpoint = newpoint;

        nnedge.startpoint = newpoint;
        nnedge.startpointPrev = pppoint;

        if (nnnpointpos < points.length) {
            var nnnedge = hlist.getEdgeByPointer(nnpoint, (nnnpointpos));
            assert(nnnedge !== null,
                'ARGraph.deleteTwoEdgesAt: nnnedge !== null FAILED');
            assert(nnnedge.startpointPrev.equals(npoint) && nnnedge.startpoint.equals(nnpoint),
                'ARGraph.deleteTwoEdgesAt: nnnedge.startpointPrev.equals(npoint)' +
                '&& nnnedge.startpoint.equals(nnpoint) FAILED');
            nnnedge.startpointPrev = ppoint;
        }

        if (nnpoint.equals(newpoint)) {
            this._deleteSamePointsAt(path, points, ppointpos);
        }

    };

    AutoRouterGraph.prototype._deleteSamePointsAt = function (path, points, pos) {
        if (CONSTANTS.DEBUG) {
            assert(path.owner === this, 'ARGraph.deleteSamePointsAt: path.owner === this FAILED');
            path.assertValid();
            assert(path.isConnected(), 'ARGraph.deleteSamePointsAt: path.isConnected() FAILED');
            points.AssertValidPos(pos);
        }

        var pointpos = pos,
            point = points[pos++],
            npointpos = pos,
            npoint = points[pos++],
            nnpointpos = pos,
            nnpoint = points[pos++],
            nnnpointpos = pos;

        pos = pointpos;
        pos--;

        var ppointpos = pos,
            ppoint = points[pos--],
            pppointpos = pos,
            pppoint = pos === points.length ? null : points[pos--];

        assert(ppointpos < points.length && pointpos < points.length && npointpos < points.length &&
        nnpointpos < points.length);
        assert(ppoint !== null && point !== null && npoint !== null && nnpoint !== null,
            'ARGraph.deleteSamePointsAt: ppoint !== null && point !== null && npoint !== null && ' +
            'nnpoint !== null FAILED');
        assert(point.equals(npoint) && !point.equals(ppoint),
            'ARGraph.deleteSamePointsAt: point.equals(npoint) && !point.equals(ppoint) FAILED');

        var dir = Utils.getDir(point.minus(ppoint));
        assert(Utils.isRightAngle(dir), 'ARGraph.deleteSamePointsAt: Utils.isRightAngle (dir) FAILED');

        var ishorizontal = Utils.isHorizontal(dir),
            hlist = this._getEdgeList(ishorizontal),
            vlist = this._getEdgeList(!ishorizontal),

            pedge = hlist.getEdgeByPointer(ppoint, point),
            nedge = vlist.getEdgeByPointer(point, npoint),
            nnedge = hlist.getEdgeByPointer(npoint, nnpoint);

        assert(pedge !== null && nedge !== null && nnedge !== null, 'ARGraph.deleteSamePointsAt: pedge !== null ' +
        '&& nedge !== null && nnedge !== null FAILED');

        vlist.remove(pedge);
        hlist.remove(nedge);

        points.splice(pointpos, 2);

        if (pppointpos < points.length) {
            var ppedge = vlist.getEdgeByPointer(pppoint, ppoint);
            assert(ppedge !== null && ppedge.endpoint.equals(ppoint) && ppedge.endpointNext.equals(point),
                'ARGraph.deleteSamePointsAt: ppedge !== null && ppedge.endpoint.equals(ppoint) && ' +
                'ppedge.endpointNext.equals(point) FAILED');
            ppedge.endpointNext = nnpoint;
        }

        assert(nnedge.startpoint.equals(npoint) && nnedge.startpointPrev.equals(point),
            'ARGraph.deleteSamePointsAt: nnedge.startpoint.equals(npoint) && nnedge.startpointPrev.equals(point)' +
            ' FAILED');
        nnedge.setStartPoint(ppoint);
        nnedge.startpointPrev = pppoint;

        if (nnnpointpos < points.length) {
            var nnnedge = vlist.getEdgeByPointer(nnpoint, (nnnpointpos)); //&*
            assert(nnnedge !== null && nnnedge.startpointPrev.equals(npoint) && nnnedge.startpoint.equals(nnpoint),
                'ARGraph.deleteSamePointsAt: nnnedge !== null && nnnedge.startpointPrev.equals(npoint) && ' +
                'nnnedge.startpoint.equals(nnpoint) FAILED');
            nnnedge.startpointPrev = ppoint;
        }

        if (CONSTANTS.DEBUG_DEEP) {
            path.assertValid();
        }
    };

    AutoRouterGraph.prototype._simplifyPaths = function () {
        var modified = false,
            path,
            pointList,
            pointpos;

        for (var i = this.paths.length; i--;) {
            path = this.paths[i];

            if (path.isAutoRouted()) {
                pointList = path.getPointList();
                pointpos = 0;

                modified = this._fixShortPaths(path) || modified;

                while (pointpos < pointList.length) {
                    if (this._candeleteTwoEdgesAt(path, pointList, pointpos)) {
                        this._deleteTwoEdgesAt(path, pointList, pointpos);
                        modified = true;
                        break;
                    }
                    pointpos++;
                }
            }
        }

        return modified;
    };

    AutoRouterGraph.prototype._centerStairsInPathPoints = function (path, hintstartdir, hintenddir) {
        assert(path !== null, 'ARGraph.centerStairsInPathPoints: path !== null FAILED');
        assert(!path.isConnected(), 'ARGraph.centerStairsInPathPoints: !path.isConnected() FAILED');

        var pointList = path.getPointList();
        assert(pointList.length >= 2, 'ARGraph.centerStairsInPathPoints: pointList.length >= 2 FAILED');

        if (CONSTANTS.DEBUG) {
            path.assertValidPoints();
        }

        var p1,
            p2,
            p3,
            p4,

            p1p = pointList.length,
            p2p = pointList.length,
            p3p = pointList.length,
            p4p = pointList.length,

            d12 = CONSTANTS.DirNone,
            d23 = CONSTANTS.DirNone,
            d34 = CONSTANTS.DirNone,

            outOfBoxStartPoint = path.getOutOfBoxStartPoint(hintstartdir),
            outOfBoxEndPoint = path.getOutOfBoxEndPoint(hintenddir),

            pos = 0;
        assert(pos < pointList.length, 'ARGraph.centerStairsInPathPoints pos < pointList.length FAILED');

        p1p = pos;
        p1 = (pointList[pos++]);

        var np2,
            np3,
            h,
            p4x,
            p3x,
            p1x,
            tmp,
            t,
            m;


        while (pos < pointList.length) {
            p4p = p3p;
            p3p = p2p;
            p2p = p1p;
            p1p = pos;

            p4 = p3;
            p3 = p2;
            p2 = p1;
            p1 = (pointList[pos++]);

            d34 = d23;
            d23 = d12;

            if (p2p < pointList.length) {
                d12 = Utils.getDir(p2.minus(p1));
                if (CONSTANTS.DEBUG) {
                    assert(Utils.isRightAngle(d12), 'ARGraph.centerStairsInPathPoints: ' +
                    'Utils.isRightAngle (d12) FAILED');
                    if (p3p !== pointList.end()) {
                        assert(Utils.areInRightAngle(d12, d23), 'ARGraph.centerStairsInPathPoints: ' +
                        'Utils.areInRightAngle (d12, d23) FAILED');
                    }
                }
            }

            if (p4p < pointList.length && d12 === d34) {
                assert(p1p < pointList.length && p2p < pointList.length && p3p < pointList.length &&
                p4p < pointList.length, 'ARGraph.centerStairsInPathPoints: p1p < pointList.length && ' +
                'p2p < pointList.length && p3p < pointList.length && p4p < pointList.length FAILED');

                np2 = new ArPoint(p2);
                np3 = new ArPoint(p3);
                h = Utils.isHorizontal(d12);

                p4x = Utils.getPointCoord(p4, h);
                p3x = Utils.getPointCoord(p3, h);
                p1x = Utils.getPointCoord(p1, h);

                // p1x will represent the larger x value in this 'step' situation
                if (p1x < p4x) {
                    t = p1x;
                    p1x = p4x;
                    p4x = t;
                }

                if (p4x < p3x && p3x < p1x) {
                    m = Math.round((p4x + p1x) / 2);
                    if (h) {
                        np2.x = m;
                        np3.x = m;
                    } else {
                        np2.y = m;
                        np3.y = m;
                    }

                    tmp = this._getLimitsOfEdge(np2, np3, p4x, p1x);
                    p4x = tmp.min;
                    p1x = tmp.max;

                    m = Math.round((p4x + p1x) / 2);

                    if (h) {
                        np2.x = m;
                        np3.x = m;
                    } else {
                        np2.y = m;
                        np3.y = m;
                    }

                    if (!this._isLineClipBoxes(np2, np3) && !this._isLineClipBoxes(p1p === pointList.length ?
                            outOfBoxEndPoint : p1, np2) && !this._isLineClipBoxes(p4p === 0 ?
                            outOfBoxStartPoint : p4, np3)) {
                        p2 = np2;
                        p3 = np3;
                        pointList.splice(p2p, 1, p2);
                        pointList.splice(p3p, 1, p3);
                    }
                }
            }
        }

        if (CONSTANTS.DEBUG) {
            path.assertValidPoints();
        }
    };

    /**
     * Make sure if a straight line is possible, create a straight line for
     * the path.
     *
     * @param {AutoRouterPath} path
     */
    AutoRouterGraph.prototype._fixShortPaths = function (path) {

        var modified = false,
            startport = path.getStartPort(),
            endport = path.getEndPort(),
            len = path.getPointList().length;

        if (len === 4) {
            var points = path.getPointList(),
                startpoint = points[0],
                endpoint = points[len - 1],
                startDir = startport.portOnWhichEdge(startpoint),
                endDir = endport.portOnWhichEdge(endpoint),
                tstStart,
                tstEnd;

            if (startDir === Utils.reverseDir(endDir)) {
                var isHorizontal = Utils.isHorizontal(startDir),
                    newStart = new ArPoint(startpoint),
                    newEnd = new ArPoint(endpoint),
                    startRect = startport.rect,
                    endRect = endport.rect,
                    minOverlap,
                    maxOverlap;

                if (isHorizontal) {
                    minOverlap = Math.min(startRect.floor, endRect.floor);
                    maxOverlap = Math.max(startRect.ceil, endRect.ceil);

                    var newY = (minOverlap + maxOverlap) / 2;
                    newStart.y = newY;
                    newEnd.y = newY;

                    tstStart = new ArPoint(Utils.getRectOuterCoord(startport.owner.rect, startDir), newStart.y);
                    tstEnd = new ArPoint(Utils.getRectOuterCoord(endport.owner.rect, endDir), newEnd.y);

                } else {
                    minOverlap = Math.min(startRect.right, endRect.right);
                    maxOverlap = Math.max(startRect.left, endRect.left);

                    var newX = (minOverlap + maxOverlap) / 2;
                    newStart.x = newX;
                    newEnd.x = newX;

                    tstStart = new ArPoint(newStart.x, Utils.getRectOuterCoord(startport.owner.rect, startDir));
                    tstEnd = new ArPoint(newEnd.x, Utils.getRectOuterCoord(endport.owner.rect, endDir));
                }

                var validPointLocation = startRect.ptInRect(newStart) && !startRect.onCorner(newStart) &&
                    endRect.ptInRect(newEnd) && !endRect.onCorner(newEnd);

                if (validPointLocation && !this._isLineClipBoxes(tstStart, tstEnd)) {
                    var hlist = this._getEdgeList(isHorizontal),
                        vlist = this._getEdgeList(!isHorizontal),
                        edge = hlist.getEdgeByPointer(startpoint),
                        edge2 = vlist.getEdgeByPointer(points[1]),
                        edge3 = hlist.getEdgeByPointer(points[2]);

                    vlist.remove(edge2);
                    hlist.remove(edge3);
                    hlist.remove(edge);

                    // The values of startpoint is changed but we don't change the startpoint of the edge
                    startpoint.assign(newStart);
                    // to maintain the reference that the port has to the startpoint
                    endpoint.assign(newEnd);
                    edge.setEndPoint(endpoint);

                    edge.startpointPrev = null;
                    edge.endpointNext = null;

                    edge.positionY = Utils.getPointCoord(newStart, Utils.nextClockwiseDir(startDir));
                    hlist.insert(edge);

                    points.splice(1, 2);
                    modified = true;
                }
            }
        }

        return modified;
    };

    /**
     * Remove unnecessary curves inserted into the path from the
     * tracing the edges of overlapping boxes. (hug children)
     *
     * @param {AutoRouterPath} path
     */
    AutoRouterGraph.prototype._simplifyPathCurves = function (path) {
        // Incidently, this will also contain the functionality of simplifyTrivially
        var pointList = path.getPointList(),
            p1,
            p2,
            i = 0,
            j;

        // I will be taking the first point and checking to see if it can create a straight line
        // that does not Utils.intersect  any other boxes on the graph from the test point to the other point.
        // The 'other point' will be the end of the path iterating back til the two points before the 
        // current.
        while (i < pointList.length - 3) {
            p1 = pointList[i];
            j = pointList.length;

            while (j-- > 0) {
                p2 = pointList[j];
                if (Utils.isRightAngle(Utils.getDir(p1.minus(p2))) && !this._isLineClipBoxes(p1, p2) ||
                    p1.equals(p2)) {
                    pointList.splice(i + 1, j - i - 1); // Remove all points between i, j
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
     * Replace 5 points for 3 where possible. This will replace 'u'-like shapes
     * with 'z' like shapes.
     *
     * @param path
     * @return {undefined}
     */
    AutoRouterGraph.prototype._simplifyPathPoints = function (path) {
        assert(path !== null, 'ARGraph.simplifyPathPoints: path !== null FAILED');
        assert(!path.isConnected(), 'ARGraph.simplifyPathPoints: !path.isConnected() FAILED');

        var pointList = path.getPointList();
        assert(pointList.length >= 2, 'ARGraph.simplifyPathPoints: pointList.length >= 2 FAILED');

        if (CONSTANTS.DEBUG) {
            path.assertValidPoints();
        }

        var p1,
            p2,
            p3,
            p4,
            p5,

            p1p = pointList.length,
            p2p = pointList.length,
            p3p = pointList.length,
            p4p = pointList.length,
            p5p = pointList.length,

            pos = 0,

            np3,
            d,
            h;

        assert(pos < pointList.length, 'ARGraph.simplifyPathPoints: pos < pointList.length FAILED');

        p1p = pos;
        p1 = pointList[pos++];

        while (pos < pointList.length) {
            p5p = p4p;
            p4p = p3p;
            p3p = p2p;
            p2p = p1p;
            p1p = pos;

            p5 = p4;
            p4 = p3;
            p3 = p2;
            p2 = p1;
            p1 = pointList[pos++];

            if (p5p < pointList.length) {
                assert(p1p < pointList.length && p2p < pointList.length && p3p < pointList.length &&
                    p4p < pointList.length && p5p < pointList.length,
                    'ARGraph.simplifyPathPoints: p1p < pointList.length && p2p < pointList.length && ' +
                    'p3p < pointList.length && p4p < pointList.length && p5p < pointList.length FAILED');

                assert(!p1.equals(p2) && !p2.equals(p3) && !p3.equals(p4) && !p4.equals(p5),
                    'ARGraph.simplifyPathPoints: !p1.equals(p2) && !p2.equals(p3) && !p3.equals(p4) && ' +
                    '!p4.equals(p5) FAILED');

                d = Utils.getDir(p2.minus(p1));
                assert(Utils.isRightAngle(d), 'ARGraph.simplifyPathPoints: Utils.isRightAngle (d) FAILED');
                h = Utils.isHorizontal(d);

                np3 = new ArPoint();
                if (h) {
                    np3.x = Utils.getPointCoord(p5, h);
                    np3.y = Utils.getPointCoord(p1, !h);
                } else {
                    np3.x = Utils.getPointCoord(p1, !h);
                    np3.y = Utils.getPointCoord(p5, h);
                }

                if (!this._isLineClipBoxes(p2, np3) && !this._isLineClipBoxes(np3, p4)) {
                    pointList.splice(p2p, 1);
                    pointList.splice(p3p, 1);
                    pointList.splice(p4p, 1);

                    if (!np3.equals(p1) && !np3.equals(p5)) {
                        pointList.splice(p4p, 0, np3);
                    }

                    p1p = pointList.length;
                    p2p = pointList.length;
                    p3p = pointList.length;
                    p4p = pointList.length;

                    pos = 0;
                }
            }
        }

        if (CONSTANTS.DEBUG) {
            path.assertValidPoints();
        }
    };

    AutoRouterGraph.prototype._connectAllDisconnectedPaths = function () {
        var i,
            len = this.paths.length,
            success = false,
            giveup = false,
            path;

        while (!success && !giveup) {
            success = true;
            i = len;
            while (i-- && success) {
                path = this.paths[i];

                if (!path.isConnected()) {
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
            }
            if (!success && !giveup) {
                this._disconnectAll();	// There was an error, delete halfway results to be able to start a new pass
            }
        }
        this.completelyConnected = true;
    };

    AutoRouterGraph.prototype._updateBoxPortAvailability = function (inputBox) {
        var bufferbox,
            siblings,
            skipBoxes = {},
            box,
            id;

        bufferbox = this.box2bufferBox[inputBox.id];
        assert(bufferbox, 'Bufferbox not found for ' + inputBox.id);
        siblings = bufferbox.children;
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
                inputBox.adjustPortAvailability(this.boxes[siblings[i].id]);
                this.boxes[siblings[i].id].adjustPortAvailability(inputBox);
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
        assert(!this.box2bufferBox[inputBox.id],
            'Can\'t add box to 2 bufferboxes');

        // For every buffer box touching the input box
        // Record the buffer boxes with children touching 
        // the input box
        for (i = this.bufferBoxes.length; i--;) {
            if (!box.rect.touching(this.bufferBoxes[i].box)) {
                continue;
            }

            j = this.bufferBoxes[i].children.length;
            while (j--) {
                child = this.bufferBoxes[i].children[j];
                if (box.rect.touching(child)) {
                    inputBox.adjustPortAvailability(this.boxes[child.id]);
                    this.boxes[child.id].adjustPortAvailability(inputBox);

                    if (overlapBoxesIndices.indexOf(i) === -1) {
                        overlapBoxesIndices.push(i);
                    }
                }

            }
        }

        parentBox = new ArRect(box.rect);
        // If overlapped other boxes, create the new bufferbox parent rect
        if (overlapBoxesIndices.length !== 0) {

            for (i = 0; i < overlapBoxesIndices.length; i++) {
                assert(overlapBoxesIndices[i] < this.bufferBoxes.length,
                    'ArGraph.addToBufferBoxes: overlapBoxes index out of bounds. (' +
                    overlapBoxesIndices[i] + ' < ' + this.bufferBoxes.length + ')');

                bufferBox = this.bufferBoxes.splice(overlapBoxesIndices[i], 1)[0];

                for (j = bufferBox.children.length; j--;) {
                    children.push(bufferBox.children[j]);
                    ids.push(bufferBox.children[j].id);  // Store the ids of the children that need to be adjusted
                }

                parentBox.unionAssign(bufferBox.box);
            }
        }

        box.rect.id = inputBox.id;
        children.push(box.rect);

        this.bufferBoxes.push({box: parentBox, children: children});

        for (i = ids.length; i--;) {
            this.box2bufferBox[ids[i]] = this.bufferBoxes[this.bufferBoxes.length - 1];
        }
    };

    AutoRouterGraph.prototype._removeFromBufferBoxes = function (box) {
        // Get the children of the parentBox (not including the box to remove)
        // Create bufferboxes from these children
        var bufferBox = this.box2bufferBox[box.id],
            i = this.bufferBoxes.indexOf(bufferBox),
            children = bufferBox.children,
            groups = [],
            add = false,
            parentBox,
            child,
            group,
            ids,
            id,
            j,
            g;

        assert(i !== -1, 'ARGraph.removeFromBufferBoxes: Can\'t find the correct bufferbox.');

        // Remove record of removed box
        this.bufferBoxes.splice(i, 1);
        this.box2bufferBox[box.id] = undefined;

        //Create groups of overlap from children
        i = children.length;
        while (i--) {
            g = groups.length;
            child = children[i];
            group = [child];
            add = false;

            this.boxes[child.id].resetPortAvailability();  // Reset box's ports availableAreas

            if (child.id === box.id) {
                continue;
            }

            while (g--) {
                j = groups[g].length;

                while (j--) {
                    if (groups[g][j].touching(child)) {
                        id = groups[g][j].id;
                        this.boxes[child.id].adjustPortAvailability(this.boxes[id]);
                        this.boxes[id].adjustPortAvailability(this.boxes[child.id]);
                        add = true;
                    }
                }

                if (add) {
                    // group will accumulate all things overlapping the child
                    group = group.concat(groups.splice(g, 1)[0]);
                }
            }

            groups.push(group);  // Add group to groups
        }

        i = groups.length;
        while (i--) {
            j = groups[i].length;
            parentBox = new ArRect(groups[i][0]);
            ids = [];

            while (j--) {
                parentBox.unionAssign(groups[i][j]);
                ids.push(groups[i][j].id);
            }

            this.bufferBoxes.push({box: parentBox, children: groups[i]});

            j = ids.length;
            while (j--) {
                this.box2bufferBox[ids[j]] = this.bufferBoxes[this.bufferBoxes.length - 1];
            }
        }

    };

    //Public Functions

    AutoRouterGraph.prototype.setBuffer = function (newBuffer) {
        CONSTANTS.BUFFER = newBuffer;
    };

    AutoRouterGraph.prototype.calculateSelfPoints = function () {
        this.selfPoints = [];
        this.selfPoints.push(new ArPoint(CONSTANTS.ED_MINCOORD, CONSTANTS.ED_MINCOORD));
        this.selfPoints.push(new ArPoint(CONSTANTS.ED_MAXCOORD, CONSTANTS.ED_MINCOORD));
        this.selfPoints.push(new ArPoint(CONSTANTS.ED_MAXCOORD, CONSTANTS.ED_MAXCOORD));
        this.selfPoints.push(new ArPoint(CONSTANTS.ED_MINCOORD, CONSTANTS.ED_MAXCOORD));
    };

    AutoRouterGraph.prototype.createBox = function () {
        var box = new AutoRouterBox();
        assert(box !== null, 'ARGraph.createBox: box !== null FAILED');

        return box;
    };

    AutoRouterGraph.prototype.addBox = function (box) {
        assert(box !== null,
            'ARGraph.addBox: box !== null FAILED');
        assert(box instanceof AutoRouterBox,
            'ARGraph.addBox: box instanceof AutoRouterBox FAILED');

        var rect = box.rect;

        this._disconnectPathsClipping(rect);

        box.owner = this;
        var boxId = (COUNTER++).toString();
        while (boxId.length < 6) {
            boxId = '0' + boxId;
        }
        boxId = 'BOX_' + boxId;
        box.id = boxId;

        this.boxes[boxId] = box;

        this._addBoxAndPortEdges(box);

        // add children of the box
        var children = box.childBoxes,
            i = children.length;
        while (i--) {
            this.addBox(children[i]);
        }
    };

    AutoRouterGraph.prototype.deleteBox = function (box) {
        assert(box !== null, 'ARGraph.deleteBox: box !== null FAILED');

        if (box.hasOwner()) {
            var parent = box.parent,
                children = box.childBoxes,
                i = children.length;

            // notify the parent of the deletion
            if (parent) {
                parent.removeChild(box);
            }

            // remove children
            while (i--) {
                this.deleteBox(children[i]);
            }

            this._deleteBoxAndPortEdges(box);
            box.owner = null;
            assert(this.boxes[box.id] !== undefined, 'ARGraph.remove: Box does not exist');

            delete this.boxes[box.id];
        }

        box.destroy();
        box = null;
    };

    AutoRouterGraph.prototype.shiftBoxBy = function (box, offset) {
        assert(box !== null, 'ARGraph.shiftBoxBy: box !== null FAILED');
        assert(!!this.boxes[box.id], 'ARGraph.shiftBoxBy: Box does not exist!');

        var rect = this.box2bufferBox[box.id].box,
            children = box.childBoxes;

        this._disconnectPathsClipping(rect); // redraw all paths clipping parent box.
        this._disconnectPathsFrom(box);

        this._deleteBoxAndPortEdges(box);

        box.shiftBy(offset);
        this._addBoxAndPortEdges(box);

        rect = box.rect;
        this._disconnectPathsClipping(rect);

        for (var i = children.length; i--;) {
            this.shiftBoxBy(children[i], offset);
        }
    };

    AutoRouterGraph.prototype.setBoxRect = function (box, rect) {
        if (box === null) {
            return;
        }

        this._deleteBoxAndPortEdges(box);
        box.setRect(rect);
        this._addBoxAndPortEdges(box);

        this._disconnectPathsClipping(rect);
    };

    AutoRouterGraph.prototype.routeSync = function () {
        var state = {finished: false};

        this._connectAllDisconnectedPaths();

        while (!state.finished) {
            state = this._optimize(state);
        }

    };

    AutoRouterGraph.prototype.routeAsync = function (options) {
        var self = this,
            updateFn = options.update || Utils.nop,
            firstFn = options.first || Utils.nop,
            callbackFn = options.callback || Utils.nop,
            time = options.time || 5,
            optimizeFn = function (state) {

                updateFn(self.paths);
                if (state.finished || !self.completelyConnected) {
                    return callbackFn(self.paths);
                } else {
                    state = self._optimize(state);
                    return setTimeout(optimizeFn, time, state);
                }
            },
            startRouting = function () {
                var state = {finished: false};
                self._connectAllDisconnectedPaths();

                // Start the optimization
                setTimeout(optimizeFn, time, state);
            };

        // Connect all disconnected paths with a straight line
        var path,
            disconnected = [];
        for (var i = this.paths.length; i--;) {
            path = this.paths[i];
            if (!path.isConnected()) {
                path.calculateStartEndPorts();
                path.points = new ArPointListPath(path.startpoint, path.endpoint);
                disconnected.push(path);
            }
        }

        firstFn(disconnected);

        setTimeout(startRouting, time);
    };

    /**
     * Performs one set of optimizations.
     *
     * @param {Number} count This stores the max number of optimizations allowed
     * @param {Number} last This stores the last optimization type made
     *
     * @return {Object} Current count, last values
     */
    AutoRouterGraph.prototype._optimize = function (options) {
        var maxOperations = options.maxOperations || 100,
            last = options.last || 0,
            dm = options.dm || 10,		// max # of distribution op
            d = options.d || 0,
            getState = function (finished) {
                return {
                    finished: finished || !maxOperations,
                    maxOperations: maxOperations,
                    last: last,
                    dm: dm,
                    d: d
                };
            };

        if (maxOperations > 0) {

            if (last === 1) {
                return getState(true);
            }

            maxOperations--;
            if (this._simplifyPaths()) {
                last = 1;
            }
        }

        if (maxOperations > 0) {
            if (last === 2) {
                return getState(true);
            }

            maxOperations--;
            if (this.horizontal.blockScanBackward()) {

                do {
                    maxOperations--;
                } while (maxOperations > 0 && this.horizontal.blockScanBackward());

                if (last < 2 || last > 5) {
                    d = 0;
                } else if (++d >= dm) {
                    return getState(true);
                }

                last = 2;
            }
        }

        if (maxOperations > 0) {
            if (last === 3) {
                return getState(true);
            }

            maxOperations--;
            if (this.horizontal.blockScanForward()) {

                do {
                    maxOperations--;
                } while (maxOperations > 0 && this.horizontal.blockScanForward());

                if (last < 2 || last > 5) {
                    d = 0;
                } else if (++d >= dm) {
                    return getState(true);
                }

                last = 3;
            }
        }

        if (maxOperations > 0) {
            if (last === 4) {
                return getState(true);
            }

            maxOperations--;
            if (this.vertical.blockScanBackward()) {
                do {
                    maxOperations--;
                } while (maxOperations > 0 && this.vertical.blockScanBackward());

                if (last < 2 || last > 5) {
                    d = 0;
                } else if (++d >= dm) {
                    return getState(true);
                }

                last = 4;
            }
        }

        if (maxOperations > 0) {
            if (last === 5) {
                return getState(true);
            }

            maxOperations--;
            if (this.vertical.blockScanForward()) {

                do {
                    maxOperations--;
                } while (maxOperations > 0 && this.vertical.blockScanForward());

                if (last < 2 || last > 5) {
                    d = 0;
                } else if (++d >= dm) {
                    return getState(true);
                }

                last = 5;
            }
        }

        if (maxOperations > 0) {
            if (last === 6) {
                return getState(true);
            }

            maxOperations--;
            if (this.horizontal.blockSwitchWrongs()) {
                last = 6;
            }
        }

        if (maxOperations > 0) {
            if (last === 7) {
                return getState(true);
            }

            maxOperations--;
            if (this.vertical.blockSwitchWrongs()) {
                last = 7;
            }
        }

        if (last === 0) {
            return getState(true);
        }

        return getState(false);
    };

    AutoRouterGraph.prototype.deletePath = function (path) {
        assert(path !== null, 'ARGraph.deletePath: path !== null FAILED');

        if (path.hasOwner()) {
            assert(path.owner === this, 'ARGraph.deletePath: path.owner === this FAILED');

            this.deleteEdges(path);
            path.owner = null;
            var index = this.paths.indexOf(path);

            assert(index > -1, 'ARGraph.remove: Path does not exist');
            this.paths.splice(index, 1);
        }

        path.destroy();
    };

    AutoRouterGraph.prototype.clear = function (addBackSelfEdges) {
        this._deleteAllPaths();
        this._deleteAllBoxes();
        this._deleteAllEdges();
        if (addBackSelfEdges) {
            this._addSelfEdges();
        }
    };

    AutoRouterGraph.prototype.addPath = function (isAutoRouted, startports, endports) {
        var path = new AutoRouterPath();

        path.setAutoRouting(isAutoRouted);
        path.setStartPorts(startports);
        path.setEndPorts(endports);
        this._add(path);

        return path;
    };

    AutoRouterGraph.prototype.isEdgeFixed = function (path, startpoint, endpoint) {
        var d = Utils.getDir(endpoint.minus(startpoint)),
            h = Utils.isHorizontal(d),

            elist = this._getEdgeList(h),

            edge = elist.getEdge(path, startpoint, endpoint);
        if (edge !== null) {
            return edge.getEdgeFixed() && !edge.getEdgeCustomFixed();
        }

        assert(false, 'ARGraph.isEdgeFixed: FAILED');
        return true;
    };

    AutoRouterGraph.prototype.destroy = function () {
        this.deleteAll(false);

        this.horizontal.SetOwner(null);
        this.vertical.SetOwner(null);
    };

    AutoRouterGraph.prototype.assertValid = function () {
        var ids = Object.keys(this.boxes),
            i;

        for (i = this.boxes.length; i--;) {
            this.assertValidBox(this.boxes[ids[i]]);
        }

        for (i = this.paths.length; i--;) {
            this._assertValidPath(this.paths[i]);
        }

        this.horizontal.assertValid();
        this.vertical.assertValid();
    };

    AutoRouterGraph.prototype.assertValidBox = function (box) {
        box.assertValid();
        assert(box.owner === this,
            'ARGraph.assertValidBox: box.owner === this FAILED');
        assert(this.boxes[box.id] !== undefined,
            'ARGraph.assertValidBox: this.boxes[box.id] !== undefined FAILED');

        // Verify that the box (and port) edges are on the graph
        assert(this._containsRectEdges(box.rect),
            'Graph does not contain edges for box ' + box.id);

    };

    AutoRouterGraph.prototype._containsRectEdges = function (rect) {
        var topLeft = rect.getTopLeft(),
            bottomRight = rect.getBottomRight(),
            points = [],
            result = true,
            len,
            start,
            end;

        points.push(topLeft);
        points.push(new ArPoint(bottomRight.x, topLeft.y));  // top right
        points.push(bottomRight);
        points.push(new ArPoint(topLeft.x, bottomRight.y));  // bottom left

        len = points.length;
        for (var i = 0; i < len; i++) {
            start = points[i];
            end = points[(i + 1) % len];
            result = result && this._containsEdge(start, end);
        }

        return result;
    };

    /**
     * This checks for an edge with the given start/end points. This will only
     * work for fixed edges such as boxes or ports.
     *
     * @param start
     * @param end
     * @return {undefined}
     */
    AutoRouterGraph.prototype._containsEdge = function (start, end) {
        var dir;

        dir = Utils.getDir(start.minus(end));
        assert(Utils.isRightAngle(dir),
            'Edge is invalid: ' + Utils.stringify(start) + ' and ' + Utils.stringify(end));

        if (Utils.isHorizontal(dir)) {
            return this.horizontal.contains(start, end) || this.horizontal.contains(end, start);
        } else {
            return this.vertical.contains(start, end) || this.vertical.contains(end, start);
        }
    };

    AutoRouterGraph.prototype._assertValidPath = function (path) {
        assert(path.owner === this,
            'ARGraph.assertValidBox: box.owner === this FAILED');
        path.assertValid();
    };

    AutoRouterGraph.prototype.dumpPaths = function (pos, c) {
        _logger.debug('Paths dump pos ' + pos + ', c ' + c);

        for (var i = 0; i < this.paths.length; i++) {
            _logger.debug(i + '. Path: ');
            this.paths[i].getPointList().dumpPoints('DumpPaths');
        }

    };

    AutoRouterGraph.prototype.dumpEdgeLists = function () {
        this.horizontal.dumpEdges('Horizontal edges:');
        this.vertical.dumpEdges('Vertical edges:');
    };

    return AutoRouterGraph;
});
