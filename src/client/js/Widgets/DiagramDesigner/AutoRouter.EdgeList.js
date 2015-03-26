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
       './AutoRouter.Path',
       './AutoRouter.Port',
       './AutoRouter.Box',
       './AutoRouter.Edge'], function (Logger,
                                       assert,
                                       CONSTANTS,
                                       Utils,
                                       AutoRouterPath,
                                       AutoRouterPort,
                                       AutoRouterBox,
                                       AutoRouterEdge) {

    'use strict'; 

    //----------------------AutoRouterEdgeList

    var _logger = Logger.create('gme:Widgets:DiagramDesigner:AutoRouter.EdgeList', WebGMEGlobal.gmeConfig.client.log);
    var AutoRouterEdgeList = function (b) {
        this.owner = null;

        //--Edges
        this.ishorizontal = b;

        //--Order
        this.orderFirst = null;
        this.orderLast = null;

        //--Section
        this.sectionFirst = null;
        this.sectionBlocker = null;
        this.sectionPtr2Blocked = []; // This is an array to emulate the pointer to a pointer functionality in CPP. 
                                       // That is, this.sectionPtr2Blocked[0] = this.sectionPtr2Blocked*

        this._initOrder();
        this._initSection();
    };

    // Public Functions
    AutoRouterEdgeList.prototype.contains = function(start, end) {
        var currentEdge = this.orderFirst,
            startpoint,
            endpoint;

        while (currentEdge) {
            startpoint = currentEdge.startpoint;
            endpoint = currentEdge.endpoint;
            if (start.equals(startpoint) && end.equals(endpoint)) {
               return true;
            }
            currentEdge = currentEdge.orderNext;
        }

        return false;
    };

    AutoRouterEdgeList.prototype.destroy = function() {
        this.checkOrder();
        this.checkSection();
    };

    AutoRouterEdgeList.prototype.addPathEdges = function(path) {
        assert(path.owner === this.owner,
               'AREdgeList.addEdges: path.owner === owner FAILED!');

        var isPathAutoRouted = path.isAutoRouted(),
            hasCustomEdge = false,
            customizedIndexes = {},
            indexes = [],
            startpoint,
            endpoint,
            dir,
            edge,
            i;

        if (isPathAutoRouted) {
            i = -1;
            while(++i < indexes.length) {
                hasCustomEdge = true;
                customizedIndexes[indexes[i]] = 0;
            }
        }else {
            hasCustomEdge = true;
        }

        var pointList = path.getPointList(),
            ptrsObject = pointList.getTailEdgePtrs(),
            indItr,
            currEdgeIndex = pointList.length - 2,
            goodAngle,
            pos = ptrsObject.pos,
            skipEdge,
            isMoveable,
            isEdgeCustomFixed,
            startPort,
            endPort,
            isStartPortConnectToCenter,
            isEndPortConnectToCenter,
            isPathFixed;

        startpoint = ptrsObject.start;
        endpoint = ptrsObject.end;

        while (pointList.length && pos >= 0) {

            dir = Utils.getDir(endpoint.minus(startpoint));

            skipEdge = dir === CONSTANTS.DirNone ? true : false;
            isMoveable = path.isMoveable();

            if (!isMoveable && dir !== CONSTANTS.DirSkew) {
                goodAngle = Utils.isRightAngle(dir);
                assert(goodAngle,
                    'AREdgeList.addEdges: Utils.isRightAngle (dir) FAILED!');

                if (!goodAngle) {
                    skipEdge = true;
                }

            }

            if (!skipEdge && 
                (Utils.isRightAngle (dir) && Utils.isHorizontal (dir) === this.ishorizontal)) {
                    edge = new AutoRouterEdge();
                    edge.owner = path;

                    edge.setStartAndEndPoint(startpoint, endpoint);
                    edge.startpointPrev = pointList.getPointBeforeEdge(pos);
                    edge.endpointNext = pointList.getPointAfterEdge(pos);

                    if (hasCustomEdge) {
                        isEdgeCustomFixed = false;
                        if (isPathAutoRouted) {
                            indItr = customizedIndexes.indexOf(currEdgeIndex);
                            isEdgeCustomFixed = (indItr !== customizedIndexes.length - 1);
                        } else {
                            isEdgeCustomFixed = true;
                        }

                        edge.edgeCustomFixed = isEdgeCustomFixed;

                    } else {

                        edge.edgeCustomFixed = dir === CONSTANTS.DirSkew;
                    }

                    startPort = path.getStartPort();

                    assert(startPort !== null,
                    'AREdgeList.addEdges: startPort !== null FAILED!');

                    isStartPortConnectToCenter = startPort.isConnectToCenter();
                    endPort = path.getEndPort();

                    assert(endPort !== null,
                    'AREdgeList.addEdges: endPort !== null FAILED!');

                    isEndPortConnectToCenter = endPort.isConnectToCenter();
                    isPathFixed = path.isFixed() || !path.isAutoRouted();

                    edge.edgeFixed = edge.edgeCustomFixed || isPathFixed ||
                    (edge.isStartPointPrevNull() && isStartPortConnectToCenter) ||
                    (edge.isEndPointNextNull() && isEndPortConnectToCenter);

                    if (dir !== CONSTANTS.DirSkew) {
                        this._positionLoadY(edge);
                        this._positionLoadB(edge);
                    } else {
                        edge.positionY = 0;
                        edge.bracketOpening = false;
                        edge.bracketClosing = false;
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
    };

    AutoRouterEdgeList.prototype.addPortEdges = function(port) {
        var startpoint,
            endpoint,
            edge,
            selfPoints,
            startpointPrev,
            endpointNext,
            dir,
            i,
            canHaveStartEndPointHorizontal;

        assert(port.owner.owner === this.owner,
            'AREdgeList.addEdges: port.owner === (owner) FAILED!');

        if (port.isConnectToCenter() || port.owner.isAtomic()) {
            return;
        }

        selfPoints = port.selfPoints;

        for(i = 0; i < 4; i++) {

            startpointPrev = selfPoints[(i + 3) % 4];
            startpoint = selfPoints[i];
            endpoint = selfPoints[(i + 1) % 4];
            endpointNext = selfPoints[(i + 2) % 4];
            dir = Utils.getDir(endpoint.minus(startpoint));

            assert(Utils.isRightAngle(dir),
                'AREdgeList.addEdges: Utils.isRightAngle (dir) FAILED!');

            canHaveStartEndPointHorizontal = port.canHaveStartEndPointHorizontal(this.ishorizontal);
            if (Utils.isHorizontal(dir) === this.ishorizontal && canHaveStartEndPointHorizontal) {
                edge = new AutoRouterEdge();

                edge.owner = port;
                edge.setStartAndEndPoint(startpoint, endpoint);
                edge.startpointPrev = startpointPrev;
                edge.endpointNext = endpointNext;

                edge.edgeFixed = true;

                this._positionLoadY(edge);
                this._positionLoadB(edge);

                if (edge.bracketClosing) {
                    edge.addToPosition(0.999); 
                }

                this.insert(edge);
            }
        }
    };

    AutoRouterEdgeList.prototype.addEdges = function(path) {
        var selfPoints,
            startpoint,
            startpointPrev,
            endpointNext,
            endpoint,
            edge,
            dir,
            i;

        if (path instanceof AutoRouterBox) {
            var box = path;

            assert(box.owner === this.owner,
                   'AREdgeList.addEdges: box.owner === (owner) FAILED!');


            selfPoints = box.selfPoints;

            for(i = 0; i < 4; i++) {
                startpointPrev = selfPoints[(i + 3) % 4];
                startpoint = selfPoints[i];
                endpoint = selfPoints[(i + 1) % 4];
                endpointNext = selfPoints[(i + 2) % 4];
                dir = Utils.getDir (endpoint.minus(startpoint));

                assert(Utils.isRightAngle (dir),
                       'AREdgeList.addEdges: Utils.isRightAngle (dir) FAILED!');

                if (Utils.isHorizontal (dir) === this.ishorizontal) {
                    edge = new AutoRouterEdge();

                    edge.owner = box;
                    edge.setStartAndEndPoint(startpoint, endpoint);
                    edge.startpointPrev = startpointPrev;
                    edge.endpointNext = endpointNext;

                    edge.edgeFixed = true;

                    this._positionLoadY(edge);
                    this._positionLoadB(edge);

                    if (edge.bracketClosing) {
                        edge.addToPosition(0.999); 
                    }

                    this.insert(edge);
                }
            }
        } else if (path) {  // path is an ARGraph
            var graph = path;
            assert(graph === this.owner,
                   'AREdgeList.addEdges: graph === this.owner FAILED!');

            selfPoints = graph.selfPoints;

            for(i = 0; i < 4; i++) {

                startpointPrev = selfPoints[(i + 3) % 4];
                startpoint = selfPoints[i];
                endpoint = selfPoints[(i + 1) % 4];
                endpointNext = selfPoints[(i + 2) % 4];
                dir = Utils.getDir(endpoint.minus(startpoint));

                assert(Utils.isRightAngle (dir),
                       'AREdgeList.addEdges: Utils.isRightAngle (dir) FAILED!');

                if (Utils.isHorizontal (dir) === this.ishorizontal) {
                    edge = new AutoRouterEdge();

                    edge.owner = graph;
                    edge.setStartAndEndPoint(startpoint, endpoint);
                    edge.startpointPrev = startpointPrev;
                    edge.endpointNext = endpointNext;

                    edge.edgeFixed = true;

                    this._positionLoadY(edge);
                    this.insert(edge);
                }
            }

        }
    };

    AutoRouterEdgeList.prototype.deleteEdges = function (object) {
        var edge = this.orderFirst,
            next;

        while( edge !== null) {
            if (edge.owner === object) {
                next = edge.orderNext;
                this.remove(edge);
                edge = next;
            } else {
                edge = edge.orderNext;
            }
        }

    };

    AutoRouterEdgeList.prototype.deleteAllEdges = function() {
        while(this.orderFirst) {
            this.remove(this.orderFirst);
        }
    };

    AutoRouterEdgeList.prototype.getEdge = function(path, startpoint) {
        var edge = this.orderFirst;
        while(edge !== null) {

            if ( edge.isSameStartPoint(startpoint)) {
                break;
            }

            edge = edge.orderNext;
        }

        assert(edge !== null,
               'AREdgeList.getEdge: edge !== null FAILED!');
        return edge;
    };

    AutoRouterEdgeList.prototype.getEdgeByPointer = function(startpoint) {
        var edge = this.orderFirst;
        while(edge !== null) {
            if (edge.isSameStartPoint(startpoint)) {
                break;
            }

            edge = edge.orderNext;
        }

        assert(edge !== null,
               'AREdgeList.getEdgeByPointer: edge !== null FAILED!');
        return edge;
    };

    AutoRouterEdgeList.prototype.setEdgeByPointer = function(pEdge, newEdge) {
        assert(newEdge instanceof AutoRouterEdge,
               'AREdgeList.setEdgeByPointer: newEdge instanceof AutoRouterEdge FAILED!');
        var edge = this.sectionFirst;
        while(edge !== null) {
            if (pEdge === edge) {
                break;
            }

            edge = edge.getSectionDown();
        }

        assert(edge !== null,
               'AREdgeList.setEdgeByPointer: edge !== null FAILED!');
        edge = newEdge;
    };

    AutoRouterEdgeList.prototype.getEdgeAt = function(point, nearness) {
        var edge = this.orderFirst;
        while(edge) {

            if (Utils.isPointNearLine(point, edge.startpoint, edge.endpoint, nearness)) {
                return edge;
            }

            edge = edge.orderNext;
        }

        return null;
    };        

    AutoRouterEdgeList.prototype.dumpEdges = function(msg, logger) {
        var edge = this.orderFirst,
            log = logger || _logger.debug,
            total = 1;

        log(msg);

        while(edge !== null) {
            log('\t' + edge.startpoint.x + ', ' + edge.startpoint.y + '\t\t' + edge.endpoint.x + ', ' + edge.endpoint.y + '\t\t\t(' + (edge.edgeFixed ? 'FIXED' : 'MOVEABLE' ) + ')\t\t' + (edge.bracketClosing ? 'Bracket Closing' : (edge.bracketOpening ? 'Bracket Opening' : '')));
            edge = edge.orderNext;
            total++;
        }

        log('Total Edges: ' + total);
    };

    AutoRouterEdgeList.prototype.getEdgeCount = function() {
        var edge = this.orderFirst,
            total = 1;
        while(edge !== null) {
            edge = edge.orderNext;
            total++;
        }
        return total;
    };

    //--Private Functions
    AutoRouterEdgeList.prototype._positionGetRealY = function (edge, y) {
        if (y === undefined) {
            if (this.ishorizontal) {
                assert(edge.startpoint.y === edge.endpoint.y,
                       'AREdgeList.position_GetRealY: edge.startpoint.y === edge.endpoint.y FAILED!');
                return edge.startpoint.y;
            }

            assert(edge.startpoint.x === edge.endpoint.x,
                   'AREdgeList.position_GetRealY: edge.startpoint.x === edge.endpoint.x FAILED!');
            return edge.startpoint.x;
        } else {

            assert(edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull(),
                   'AREdgeList.position_GetRealY: edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull() FAILED!');

            if ( this.ishorizontal) {
                assert(edge.startpoint.y === edge.endpoint.y,
                       'AREdgeList.position_GetRealY: edge.startpoint.y === edge.endpoint.y FAILED!');
                edge.setStartPointY(y);
                edge.setEndPointY(y);
            } else {
                assert(edge.startpoint.x === edge.endpoint.x,
                       'AREdgeList.position_GetRealY: edge.startpoint.x === edge.endpoint.x FAILED');

                edge.setStartPointX(y);
                edge.setEndPointX(y);
            }
        }
    };

    AutoRouterEdgeList.prototype._positionSetRealY = function (edge, y) {
        if (edge instanceof Array) { 
            edge = edge[0];
        }

        assert(edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull(),
               'AREdgeList.position_SetRealY: edge != null && !edge.isStartPointNull() && !edge.isEndPointNull() FAILED');

        if (this.ishorizontal) {
            assert(edge.startpoint.y === edge.endpoint.y,
                   'AREdgeList.position_SetRealY: edge.startpoint.y === edge.endpoint.y FAILED');
            edge.setStartPointY(y);
            edge.setEndPointY(y);
        } else {
            assert(edge.startpoint.x === edge.endpoint.x,
                   'AREdgeList.position_SetRealY: edge.startpoint.x === edge.endpoint.x FAILED');
            edge.setStartPointX(y);
            edge.setEndPointX(y);
        }
    };

    /**
     * Normalize the edge endpoints so x1 < x2
     */
    AutoRouterEdgeList.prototype._positionGetRealX = function (edge) {
        assert(edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull(),'AREdgeList.position_GetRealX: edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull() FAILED');
        var x1, x2;

        if (this.ishorizontal) {
            assert(edge.startpoint.y === edge.endpoint.y,
                   'AREdgeList.position_GetRealX: edge.startpoint.y === edge.endpoint.y FAILED');

            if (edge.startpoint.x < edge.endpoint.x) {

                x1 = edge.startpoint.x;
                x2 = edge.endpoint.x;
            } else {

                x1 = edge.endpoint.x;
                x2 = edge.startpoint.x;
            }
        } else {
            assert(edge.startpoint.x === edge.endpoint.x,
                   'AREdgeList.position_GetRealX: edge.startpoint.x === edge.endpoint.x FAILED');
            if (edge.startpoint.y < edge.endpoint.y) {

                x1 = edge.startpoint.y;
                x2 = edge.endpoint.y;
            } else {

                x1 = edge.endpoint.y;
                x2 = edge.startpoint.y;
            }
        }

        return [x1, x2];
    };

    AutoRouterEdgeList.prototype._positionGetRealO = function (edge) {
        assert(edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull(),
               'AREdgeList.position_GetRealO: edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull() FAILED');
        var o1, o2;

        if (this.ishorizontal) {
            assert(edge.startpoint.y === edge.endpoint.y,
                   'AREdgeList.position_GetRealO: edge.startpoint.y === edge.endpoint.y FAILED');
            if (edge.startpoint.x < edge.endpoint.x) {

                o1 = edge.isStartPointPrevNull() ? 0 : edge.startpointPrev.y - edge.startpoint.y;
                o2 = edge.isEndPointNextNull() ? 0 : edge.endpointNext.y - edge.endpoint.y;
            } else {

                o1 = edge.isEndPointNextNull() ? 0 : edge.endpointNext.y - edge.endpoint.y;
                o2 = edge.isStartPointPrevNull() ? 0 : edge.startpointPrev.y - edge.startpoint.y;
            }
        }
        else{
            assert(edge.startpoint.x === edge.endpoint.x ,
                   'AREdgeList.position_GetRealO: edge.startpoint.x === edge.endpoint.x FAILED');
            if (edge.startpoint.y < edge.endpoint.y) {

                o1 = edge.isStartPointPrevNull() ? 0 : edge.startpointPrev.x - edge.startpoint.x;
                o2 = edge.isEndPointNextNull() ? 0 : edge.endpointNext.x - edge.endpoint.x;
            } else {

                o1 = edge.isEndPointNextNull() ? 0 : edge.endpointNext.x - edge.endpoint.x;
                o2 = edge.isStartPointPrevNull() ? 0 : edge.startpointPrev.x - edge.startpoint.x;
            }
        }

        return [o1, o2];
    };

    AutoRouterEdgeList.prototype._positionLoadY = function (edge) {
        assert(edge !== null && edge.orderNext === null && edge.orderPrev === null,
               'AREdgeList.position_LoadY: edge !== null && edge.orderNext === null && edge.orderPrev === null FAILED');

        edge.positionY =  this._positionGetRealY(edge);
    };

    AutoRouterEdgeList.prototype._positionLoadB = function (edge) {
        assert(edge !== null,
               'AREdgeList.position_LoadB: edge !== null FAILED');

        edge.bracketOpening = !edge.edgeFixed && this._bracketIsOpening(edge);
        edge.bracketClosing = !edge.edgeFixed && this._bracketIsClosing(edge);
    };

    AutoRouterEdgeList.prototype._positionAllStoreY = function () {
        var edge = this.orderFirst;
        while(edge) {
            this._positionSetRealY(edge, edge.positionY);
            edge = edge.orderNext;
        }

    };

    AutoRouterEdgeList.prototype._positionAllLoadX = function () {
        var edge = this.orderFirst,
            pts;
        while(edge) {
            pts = this._positionGetRealX(edge);
            edge.positionX1 = pts[0];
            edge.positionX2 = pts[1];

            edge = edge.orderNext;
        }
    };

    AutoRouterEdgeList.prototype._initOrder = function () {
        this.orderFirst = null;
        this.orderLast = null;
    };

    AutoRouterEdgeList.prototype._checkOrder = function () {
        assert(this.orderFirst === null && this.orderLast === null,
               'AREdgeList.checkOrder: this.orderFirst === null && this.orderLast === null FAILED');
    };

    //---Order

    AutoRouterEdgeList.prototype.insertBefore = function(edge, before) {
        assert(edge !== null && before !== null && edge !== before,
               'AREdgeList.insertBefore: edge !== null && before !== null && edge !== before FAILED');
               assert(edge.orderNext === null && edge.orderPrev === null,
                      'AREdgeList.insertBefore: edge.orderNext === null && edge.orderPrev === null FAILED');

        edge.orderPrev = before.orderPrev;
        edge.orderNext = before;

        if (before.orderPrev) {
            assert(before.orderPrev.orderNext === before, 'AREdgeList.insertBefore: before.orderPrev.orderNext === before FAILED\nbefore.orderPrev.orderNext is ' + before.orderPrev.orderNext + ' and before is ' + before);
            before.orderPrev.orderNext = edge;

            assert(this.orderFirst !== before,
                   'AREdgeList.insertBefore: this.orderFirst !== before FAILED');
        } else {

            assert(this.orderFirst === before,
                   'AREdgeList.insertBefore: this.orderFirst === before FAILED');
            this.orderFirst = edge;
        }

        before.orderPrev = edge;
    };

    AutoRouterEdgeList.prototype.insertAfter = function(edge, after) {
        assert(edge !== null && after !== null && !edge.equals(after),
               'AREdgeList.insertAfter:  edge !== null && after !== null && !edge.equals(after) FAILED'); 
               assert(edge.orderNext === null && edge.orderPrev === null,
                      'AREdgeList.insertAfter: edge.orderNext === null && edge.orderPrev === null FAILED ');

        edge.orderNext = after.orderNext;
        edge.orderPrev = after;

        if (after.orderNext) {
            assert(after.orderNext.orderPrev.equals(after),
                   'AREdgeList.insertAfter:  after.orderNext.orderPrev.equals(after) FAILED');
            after.orderNext.orderPrev = edge;

            assert(!this.orderLast.equals(after), 'AREdgeList.insertAfter: !orderLast.equals(after) FAILED');
        }
        else
        {
            assert(this.orderLast.equals(after), 'AREdgeList.insertAfter: this.orderLast.equals(after) FAILED');
            this.orderLast = edge;
        }

        after.orderNext = edge;
    };

    AutoRouterEdgeList.prototype.insertLast = function(edge) {
        assert(edge !== null, 
            'AREdgeList.insertLast: edge !== null FAILED');
        assert(edge.orderPrev === null && edge.orderNext === null,
            'AREdgeList.insertLast: edge.orderPrev === null && edge.orderNext === null FAILED');

        edge.orderPrev = this.orderLast;

        if (this.orderLast) {
            assert(this.orderLast.orderNext === null,
                'AREdgeList.insertLast: this.orderLast.orderNext === null FAILED');
            assert(this.orderFirst !== null, 
                'AREdgeList.insertLast: this.orderFirst != null FAILED');

            this.orderLast.orderNext = edge;
            this.orderLast = edge;
        } else {
            assert(this.orderFirst === null,
                'AREdgeList.insertLast:  this.orderFirst === null FAILED');

            this.orderFirst = edge;
            this.orderLast = edge;
        }
    };

    AutoRouterEdgeList.prototype.insert = function(edge) {
        assert(edge !== null,
            'AREdgeList.insert:  edge !== null FAILED');
        assert(edge.orderPrev === null && edge.orderNext === null, 
            'AREdgeList.insert: edge.orderPrev === null && edge.orderNext === null FAILED');

        var y = edge.positionY;

        assert(CONSTANTS.ED_MINCOORD <= y && y <= CONSTANTS.ED_MAXCOORD,
            'AREdgeList.insert: CONSTANTS.ED_MINCOORD <= y && y <= CONSTANTS.ED_MAXCOORD FAILED (y is ' + y + ')');

        var insert = this.orderFirst;

        while (insert && insert.positionY < y) {
            insert = insert.orderNext;
        }

        if (insert) {
            this.insertBefore(edge, insert);
        } else {
            this.insertLast(edge);
        }
    };

    AutoRouterEdgeList.prototype.remove = function(edge) {
        assert(edge !== null,
               'AREdgeList.remove:  edge !== null FAILED');

        if (this.orderFirst === edge) {
            this.orderFirst = edge.orderNext;
        }

        if (edge.orderNext) {
            edge.orderNext.orderPrev = edge.orderPrev;
        }

        if (this.orderLast === edge) {
            this.orderLast = edge.orderPrev;
        }

        if (edge.orderPrev) {
            edge.orderPrev.orderNext = edge.orderNext;
        }

        edge.orderNext = null;
        edge.orderPrev = null;
    };

    //-- Private

    AutoRouterEdgeList.prototype._slideButNotPassEdges = function (edge, y) {
        assert(edge !== null, 'AREdgeList.slideButNotPassEdges: edge != null FAILED');
        assert(CONSTANTS.ED_MINCOORD < y && y < CONSTANTS.ED_MAXCOORD,  'AREdgeList.slideButNotPassEdges: CONSTANTS.ED_MINCOORD < y && y < CONSTANTS.ED_MAXCOORD FAILED');

        var oldy = edge.positionY;
        assert(CONSTANTS.ED_MINCOORD < oldy && oldy < CONSTANTS.ED_MAXCOORD,
               'AREdgeList.slideButNotPassEdges: CONSTANTS.ED_MINCOORD < oldy && oldy < CONSTANTS.ED_MAXCOORD FAILED');

        if (oldy === y) {
            return null;
        }

        var x1 = edge.positionX1,
            x2 = edge.positionX2,
            ret = null,
            insert = edge;

        //If we are trying to slide down

        if (oldy < y) {
            while(insert.orderNext) {
                insert = insert.orderNext;

                if (y < insert.positionY) {
                    //Then we won't be shifting past the new edge (insert)
                    break;
                }

                //If you can't pass the edge (but want to) and the lines will overlap x values...
                if (!insert.getEdgeCanpassed() && Utils.intersect (x1, x2, insert.positionX1, insert.positionX2 )) {
                    ret = insert;
                    y = insert.positionY;
                    break;
                }
            }

            if (edge !== insert && insert.orderPrev !== edge) {
                this.remove(edge); 
                this.insertBefore(edge, insert);
            }

        } else { // If we are trying to slide up
            while (insert.orderPrev) {
                insert = insert.orderPrev;

                if (y > insert.positionY) {
                    break;
                }

                //If insert cannot be passed and it is in the way of the edge (if the edge were to slide up).
                if (!insert.getEdgeCanpassed() && Utils.intersect(x1, x2, insert.positionX1, insert.positionX2)) {
                    ret = insert;
                    y = insert.positionY;
                    break;
                }
            }

            if (edge !== insert && insert.orderNext !== edge) {
                this.remove(edge);//This is where I believe the error could lie!
                this.insertAfter(edge, insert);
            }

        }

        edge.positionY = y;

        return ret;
    };

    //------Section

    // private

    AutoRouterEdgeList.prototype._initSection = function () {
        this.sectionFirst = null;
        this.sectionBlocker = null;
        this.sectionPtr2Blocked = null;
    };

    AutoRouterEdgeList.prototype.checkSection = function () {
        if (!(this.sectionBlocker === null && this.sectionPtr2Blocked === null)) {
            // This used to be contained in an assert. Generally this fails when the router does not have a clean exit then is asked to reroute.
            this._logger.warning('sectionBlocker and this.sectionPtr2Blocked are not null. Assuming last run did not exit cleanly. Fixing...');
            this.sectionBlocker = null;
            this.sectionPtr2Blocked = null;
        }
    };

    AutoRouterEdgeList.prototype.sectionReset = function () {
        this.checkSection();

        this.sectionFirst = null;
    };

    /**
     * Initialize the section data structure.
     *
     * @param blocker
     * @return {undefined}
     */
    AutoRouterEdgeList.prototype._sectionBeginScan = function (blocker) {
        this.checkSection();

        this.sectionBlocker = blocker;

        this.sectionBlocker.sectionX1 = this.sectionBlocker.positionX1;
        this.sectionBlocker.sectionX2 = this.sectionBlocker.positionX2;

        this.sectionBlocker.setSectionNext(null);
        this.sectionBlocker.setSectionDown(null);
    };

    AutoRouterEdgeList.prototype._sectionIsImmediate  = function () {
        assert(this.sectionBlocker !== null && this.sectionPtr2Blocked !== null && this.sectionPtr2Blocked !== null,
               'AREdgeList._sectionIsImmediate: this.sectionBlocker != null && this.sectionPtr2Blocked != null && *sectionPtr2Blocked != null FAILED');

        var sectionBlocked = this.sectionPtr2Blocked[0],
            e = sectionBlocked.getSectionDown(),
            a1 = sectionBlocked.sectionX1,
            a2 = sectionBlocked.sectionX2,
            p1 = sectionBlocked.positionX1,
            p2 = sectionBlocked.positionX2,
            b1 = this.sectionBlocker.sectionX1,
            b2 = this.sectionBlocker.sectionX2;

        if (e !== null) {
            e = (e.startpoint === null || e.sectionX1 === undefined ? null : e);
        }

        assert(b1 <= a2 && a1 <= b2,
               'AREdgeList._sectionIsImmediate: b1 <= a2 && a1 <= b2 FAILED');// not case 1 or 6

        // NOTE WE CHANGED THE CONDITIONS (A1<=B1 AND B2<=A2)
        // BECAUSE HERE WE NEED THIS!

        if (a1 <= b1) {
            while(!(e === null || e.startpoint === null) && e.sectionX2 < b1) {
                e = e.getSectionNext();
            }

            if (b2 <= a2) {
                return (e === null || e.startpoint === null)|| b2 < e.sectionX1;				// case 3
            }

            return (e === null || e.startpoint === null) && a2 === p2;								// case 2
        }

        if (b2 <= a2) {
            return a1 === p1 && ((e === null || e.startpoint === null) || b2 < e.sectionX1);	// case 5
        }

        return (e === null || e.startpoint === null) && a1 === p1 && a2 === p2;						// case 4
    };


    // The following methods are convenience methods for adjusting the 'section' 
    // of an edge.
    /**
     * Get either min+1 or a value between min and max. Technically, 
     * we are looking for [min, max).
     *
     * @param {Number} min
     * @param {Number} max
     * @return {Number} result
     */
    var getLargerEndpoint = function(min, max) {
        var result;
        assert(min < max);

        result = Math.min(min+1, (min+max)/2);
        if (result === max) {
            result = min;
        }
        assert(result < max);
        return result;
    };

    /**
     * Get either max-1 or a value between min and max. Technically, 
     * we are looking for (min, max].
     *
     * @param {Number} min
     * @param {Number} max
     * @return {Number} result
     */
    var getSmallerEndpoint = function(min, max) {
        var result;
        assert(min < max);

        // If min is so small that 
        // 
        //      (min+max)/2 === min
        //
        // then we will simply use max value for the result
        result = Math.max(max-1, (min+max)/2);
        if (result === min) {
            result = max;
        }

        assert(result > min);
        return result;
    };

    AutoRouterEdgeList.prototype._sectionHasBlockedEdge = function () {
        assert(this.sectionBlocker !== null,
               'AREdgeList._sectionHasBlockedEdge: this.sectionBlocker != null FAILED');

        var newSectionX1,
            newSectionX2,
            e,
            blockerX1 = this.sectionBlocker.sectionX1,
            blockerX2 = this.sectionBlocker.sectionX2;

        assert(blockerX1 <= blockerX2,
               'AREdgeList._sectionHasBlockedEdge: blockerX1 <= blockerX2 FAILED');

        // Setting this.sectionPtr2Blocked
        if (this.sectionPtr2Blocked === null) {  // initialize sectionPtr2Blocked

            this.sectionFirst = this.sectionFirst === null ? [new AutoRouterEdge()] : this.sectionFirst;
            this.sectionPtr2Blocked = this.sectionFirst;
        } else {   // get next sectionPtr2Blocked
            var currentEdge = this.sectionPtr2Blocked[0];

            assert(currentEdge.startpoint !== null, 
                   'AREdgeList._sectionHasBlockedEdge: currentEdge.startpoint === null');

            var o = null;

            e = currentEdge.getSectionDownPtr()[0];
            newSectionX1 = currentEdge.sectionX1;
            newSectionX2 = currentEdge.sectionX2;

            assert(newSectionX1 <= newSectionX2,
                   'AREdgeList._sectionHasBlockedEdge: newSectionX1 <= newSectionX2 FAILED (' + newSectionX1 + ' <= ' + newSectionX2 + ')'+
                   '\nedge is ');

           assert(blockerX1 <= newSectionX2 &&  newSectionX1 <= blockerX2,
                  'AREdgeList._sectionHasBlockedEdge: blockerX1 <= newSectionX2 &&  newSectionX1 <= blockerX2 FAILED');
            // not case 1 or 6
            if (newSectionX1 < blockerX1 && blockerX2 < newSectionX2)	{								// case 3
                this.sectionPtr2Blocked = currentEdge.getSectionDownPtr();

            } else if (blockerX1 <= newSectionX1 && newSectionX2 <= blockerX2) {								// case 4

                if (e && e.startpoint !== null) {
                    while( e.getSectionNext() && e.getSectionNext().startpoint !== null) {
                        e = e.getSectionNext();
                    }

                    e.setSectionNext(currentEdge.getSectionNext());
                    this.sectionPtr2Blocked[0] = currentEdge.getSectionDown();
                } else {

                    this.sectionPtr2Blocked[0] = (currentEdge.getSectionNext()); 

                }
            } else if (blockerX1 <= newSectionX1 && blockerX2 < newSectionX2)	{							// case 5

                assert(newSectionX1 <= blockerX2,
                       'AREdgeList._sectionHasBlockedEdge: newSectionX1 <= blockerX2 FAILED');

                // Move newSectionX1 such that blockerX2 < newSectionX1 < newSectionX2
                newSectionX1 = getLargerEndpoint(blockerX2, newSectionX2);

                while ((e && e.startpoint !== null) && e.sectionX1 <= newSectionX1) {	
                    assert(e.sectionX1 <= e.sectionX2,
                           'AREdgeList._sectionHasBlockedEdge: e.sectionX1 <= e.sectionX2 FAILED');

                    if (newSectionX1 <= e.sectionX2) {
                        newSectionX1 = getLargerEndpoint(e.sectionX2, newSectionX2);
                    }

                    o = e;
                    e = e.getSectionNext();
                }

                if (o) {  
                    // Insert currentEdge to be sectionNext of the given edge in the list 
                    // of sectionDown (basically, collapsing currentEdge into the sectionDown 
                    // list. The values in the list following currentEdge will then be set to 
                    // be sectionDown of the currentEdge.)
                    this.sectionPtr2Blocked[0] = currentEdge.getSectionDownPtr()[0];
                    o.setSectionNext(currentEdge);
                    currentEdge.setSectionDown(e);
                }

                assert(blockerX2 < newSectionX1,
                    'AREdgeList._sectionHasBlockedEdge: blockerX2 < newSectionX1 FAILED ('+
                    blockerX2+' < '+newSectionX1+') '+
                    currentEdge.sectionX2 +' is '+newSectionX2+')');
                // Shifting the front of the p2b so it no longer overlaps this.sectionBlocker

                currentEdge.sectionX1 = newSectionX1;

                assert(currentEdge.sectionX1 < currentEdge.sectionX2, 
                       'currentEdge.sectionX1 < currentEdge.sectionX2 ('+
                       currentEdge.sectionX1 + ' < ' +currentEdge.sectionX2+')' );
            } else {														// case 2
                assert(newSectionX1 < blockerX1 && blockerX1 <= newSectionX2 && newSectionX2 <= blockerX2,  'AREdgeList._sectionHasBlockedEdge:  newSectionX1 < blockerX1 && blockerX1 <= newSectionX2 && newSectionX2 <= blockerX2 FAILED');

                this.sectionPtr2Blocked = currentEdge.getSectionDownPtr();

                while( e && e.startpoint !== null) {
                    o = e;
                    e = e.getSectionNext();

                    if (o.sectionX2 + 1 < blockerX1 && (e === null || e.startpoint === null || o.sectionX2 + 1 < e.sectionX1)) {
                        this.sectionPtr2Blocked = o.getSectionNextPtr();
                    }
                }

                if (this.sectionPtr2Blocked[0].startpoint !== null) {
                    assert(o !== null,
                           'AREdgeList._sectionHasBlockedEdge: o != null FAILED');
                    o.setSectionNext(currentEdge.getSectionNext());

                    var larger = blockerX1;

                    if (this.sectionPtr2Blocked[0].sectionX1 < blockerX1) {
                        larger = this.sectionPtr2Blocked[0].sectionX1;
                    }

                    currentEdge.sectionX2 = getSmallerEndpoint(newSectionX1, larger);

                    currentEdge.setSectionNext(this.sectionPtr2Blocked[0]);
                    this.sectionPtr2Blocked[0] = new AutoRouterEdge(); //This seems odd
                    this.sectionPtr2Blocked = null;

                } else {
                    currentEdge.sectionX2 = getSmallerEndpoint(newSectionX1, blockerX1);
                }

                assert(currentEdge.sectionX1 < currentEdge.sectionX2, 
                    'Expected sectionX1 < sectionX2 but '+currentEdge.sectionX1+
                    ' is not < '+currentEdge.sectionX2);

                this.sectionPtr2Blocked = currentEdge.getSectionNextPtr();
            }
        }

        assert(this.sectionPtr2Blocked !== null,
               'AREdgeList._sectionHasBlockedEdge: this.sectionPtr2Blocked != null FAILED');
        while (this.sectionPtr2Blocked[0] !== null && this.sectionPtr2Blocked[0].startpoint !== null) {
            newSectionX1 = this.sectionPtr2Blocked[0].sectionX1;
            newSectionX2 = this.sectionPtr2Blocked[0].sectionX2;

            //If this.sectionPtr2Blocked is completely to the left (or above) this.sectionBlocker
            if (newSectionX2 < blockerX1)												// case 1
            {
                this.sectionPtr2Blocked = this.sectionPtr2Blocked[0].getSectionNextPtr();

                assert(this.sectionPtr2Blocked !== null,
                       'AREdgeList._sectionHasBlockedEdge: this.sectionPtr2Blocked != null FAILED');
                continue;
            }
            //If this.sectionBlocker is completely to the right (or below) this.sectionPtr2Blocked 
            else if (blockerX2 < newSectionX1) {											// case 6
                break;
            }

            if (newSectionX1 < blockerX1 && blockerX2 < newSectionX2)									// case 3
                //If this.sectionPtr2Blocked starts before and ends after this.sectionBlocker
            {
                var x = blockerX1;
                e = this.sectionPtr2Blocked[0].getSectionDown();

                for(;;) {

                    if (e === null || e.startpoint === null || x < e.sectionX1) { 
                        return true;
                    } else if (x <= e.sectionX2) {
                        x = e.sectionX2 + 1;
                        if (blockerX2 < x) {
                            break;
                        }
                    }

                    e = e.getSectionNext();
                }

                this.sectionPtr2Blocked = this.sectionPtr2Blocked[0].getSectionDownPtr(); 
                continue;
            }
            //This leaves the regular partial overlap possibility. They also include this.sectionBlocker starting before and ending after this.sectionPtr2Blocked.

            return true;
        }

        assert(this.sectionBlocker.getSectionNext() === null && 
               (this.sectionBlocker.getSectionDown() === null || 
                this.sectionBlocker.getSectionDown().startpoint === null) , 
            'AREdgeList._sectionHasBlockedEdge: this.sectionBlocker.getSectionNext() === null && this.sectionBlocker.getSectionDown() === null FAILED');

        this.sectionBlocker.setSectionNext(this.sectionPtr2Blocked[0]);
        this.sectionPtr2Blocked[0] = this.sectionBlocker; // Set anything pointing to this.sectionPtr2Blocked to point to this.sectionBlocker (eg, sectionDown)

        this.sectionBlocker = null;
        this.sectionPtr2Blocked = null;

        return false;
    };

    AutoRouterEdgeList.prototype._sectionGetBlockedEdge = function () {
        assert(this.sectionBlocker !== null && this.sectionPtr2Blocked !== null, 'AREdgeList.sectionGetBlockedEdge: this.sectionBlocker !== null && this.sectionPtr2Blocked !== null FAILED');

        return this.sectionPtr2Blocked[0];
    };

    //----Bracket

    AutoRouterEdgeList.prototype._bracketIsClosing = function (edge) {
        assert(edge !== null, 'AREdgeList._bracketIsClosing: edge !== null FAILED');
        assert(!edge.isStartPointNull() && !edge.isEndPointNull(),
               'AREdgeList._bracketIsClosing: !edge.isStartPointNull() && !edge.isEndPointNull() FAILED');

        var start = edge.startpoint,
            end = edge.endpoint;

        if (edge.isStartPointPrevNull() || edge.isEndPointNextNull()) {
            return false;
        }

        return this.ishorizontal ?
            (edge.startpointPrev.y < start.y && edge.endpointNext.y < end.y ) :
            (edge.startpointPrev.x < start.x && edge.endpointNext.x < end.x );
    };

    AutoRouterEdgeList.prototype._bracketIsOpening = function (edge) {
        assert(edge !== null, 'AREdgeList._bracketIsOpening: edge !== null FAILED' );
        assert(!edge.isStartPointNull() && !edge.isEndPointNull(),
               'AREdgeList._bracketIsOpening: !edge.isStartPointNull() && !edge.isEndPointNull() FAILED');

        var start = edge.startpoint || edge.startpoint,
            end = edge.endpoint || edge.endpoint,
            prev, 
            next;

        if (edge.isStartPointPrevNull() || edge.isEndPointNextNull()) {
            return false;
        }

        next = edge.endpointNext || edge.endpointNext;
        prev = edge.startpointPrev || edge.startpointPrev;

        return this.ishorizontal ?
            (prev.y > start.y && next.y > end.y ) :
            (prev.x > start.x && next.x > end.x );
    };

    AutoRouterEdgeList.prototype._bracketShouldBeSwitched = function (edge, next) {
        assert(edge !== null && next !== null,
               'AREdgeList._bracketShouldBeSwitched: edge !== null && next !== null FAILED');

        var ex = this._positionGetRealX(edge),
            ex1 = ex[0], 
            ex2 = ex[1], 
            eo = this._positionGetRealO(edge),
            eo1 = eo[0], 
            eo2 = eo[1],
            nx = this._positionGetRealX(next),
            nx1 = nx[0], 
            nx2 = nx[1], 
            no = this._positionGetRealO(next),
            no1 = no[0], 
            no2 = no[1];

        var c1, c2;

        if ((nx1 < ex1 && ex1 < nx2 && eo1 > 0 ) || (ex1 < nx1 && nx1 < ex2 && no1 < 0)) {
            c1 = +1;
        } else if (ex1 === nx1 && eo1 === 0 && no1 === 0) {
            c1 = 0;
        } else {
            c1 = -9;
        }

        if ((nx1 < ex2 && ex2 < nx2 && eo2 > 0 ) || (ex1 < nx2 && nx2 < ex2 && no2 < 0)) {
            c2 = +1;
        } else if (ex2 === nx2 && eo2 === 0 && no2 === 0) {
            c2 = 0;
        } else {
            c2 = -9;
        }

        return (c1 + c2) > 0;
    };

    //---Block

    AutoRouterEdgeList.prototype._blockGetF = function (d, b, s) {
        var f = d/(b+s), //f is the total distance between edges divided by the total number of edges
            S = CONSTANTS.EDLS_S, //This is 'SMALLGAP'
            R = CONSTANTS.EDLS_R,//This is 'SMALLGAP + 1'
            D = CONSTANTS.EDLS_D; //This is the total distance of the graph

        //If f is greater than the SMALLGAP, then make some checks/edits
        if (b === 0 && R <= f) { //If every comparison resulted in an overlap AND SMALLGAP + 1 is less than the distance between each edge (in the given range)
            f += (D-R);
        } else if (S < f && s > 0) {
            f = ((D-S)*d - S*(D-R)*s) / ((D-S)*b + (R-S)*s);
        }

        return f;
    };

    AutoRouterEdgeList.prototype._blockGetG = function (d, b, s) {
        var g = d/(b+s),
            S = CONSTANTS.EDLS_S,
            R = CONSTANTS.EDLS_R,
            D = CONSTANTS.EDLS_D;

        if (S < g && b > 0) {
            g = ((R-S)*d + S*(D-R)*b) / ((D-S)*b + (R-S)*s);
        }

        return g;
    };

   AutoRouterEdgeList.prototype._blockPushBackward = function(blocked, blocker) {
        var modified = false;

        assert(blocked !== null && blocker !== null,
               'AREdgeList._blockPushBackward: blocked !== null && blocker !== null FAILED');
               assert(blocked.positionY <= blocker.positionY,
                      'AREdgeList._blockPushBackward: blocked.positionY <= blocker.positionY FAILED');
                      assert(blocked.getBlockPrev() !== null,
                             'AREdgeList._blockPushBackward: blocked.getBlockPrev() !== null FAILED'); 

        var f = 0,
            g = 0,
            edge = blocked,
            trace = blocker,
            d = trace.positionY - edge.positionY;

            assert(d >= 0,
                   'AREdgeList._blockPushBackward: d >= 0 FAILED');

        var s = (edge.bracketOpening || trace.bracketClosing),
            b = 1 - s,
            d2;

        for(;;) {
            edge.setBlockTrace(trace);
            trace = edge;
            edge = edge.getBlockPrev();

            if (edge === null) {
                break;
            }

            d2 = trace.positionY - edge.positionY;
            assert(d2 >= 0,
                   'AREdgeList._blockPushBackward:  d2 >= 0 FAILED');

            if (edge.bracketOpening || trace.bracketClosing) {
                g = this._blockGetG(d,b,s);
                if (d2 <= g) {
                    f = this._blockGetF(d,b,s);
                    break;
                }
                s++;
            }
            else
            {
                f = this._blockGetF(d,b,s);
                if (d2 <= f) {
                    g = this._blockGetG(d,b,s);
                    break;
                }
                b++;
            }

            d += d2;
        }

        if (b+s > 1) {
            if (edge === null) {
                f = this._blockGetF(d,b,s);
                g = this._blockGetG(d,b,s);
            }

            assert(Utils.floatEquals(d, f*b + g*s),
                   'AREdgeList._blockPushBackward: floatEquals(d, f*b + g*s) FAILED');

            edge = trace;
            assert(edge !== null && edge !== blocked,
                   'AREdgeList._blockPushBackward: edge !== null && edge !== blocked FAILED');

            var y = edge.positionY;

            do
            {
                assert(edge !== null && edge.getBlockTrace() !== null,'AREdgeList._blockPushBackward: edge !== null && edge.getBlockTrace() !== null FAILED');
                trace = edge.getBlockTrace();

                y += (edge.bracketOpening || trace.bracketClosing) ? g : f;
                y = Utils.roundTrunc(y, 10);  // Fix any floating point errors

                if (y + 0.001 < trace.positionY) {
                    modified = true;
                    if (this._slideButNotPassEdges(trace, y)) {
                        trace.setBlockPrev(null);
                    }
                }

                edge = trace;
            } while(edge !== blocked);

            if (CONSTANTS.DEBUG) {
                //y += (edge.bracketOpening || blocker.bracketClosing) ? g : f;
                assert(Utils.floatEquals(y, blocker.positionY),
                       'AREdgeList._blockPushBackward: floatEquals(y, blocker.positionY) FAILED');
            }
        }

        return modified;
    };

    AutoRouterEdgeList.prototype._blockPushForward = function(blocked, blocker) {
        var modified = false;

        assert(blocked !== null && blocker !== null,
               'AREdgeList._blockPushForward: blocked !== null && blocker !== null FAILED');
        assert(blocked.positionY >= blocker.positionY,
              'AREdgeList._blockPushForward: blocked.positionY >= blocker.positionY FAILED');
        assert(blocked.getBlockNext() !== null,
              'AREdgeList._blockPushForward: blocked.getBlockNext() !== null FAILED');

        var f = 0,
            g = 0,
            edge = blocked,
            trace = blocker,
            d = edge.positionY - trace.positionY;

            assert(d >= 0,
                   'AREdgeList._blockPushForward:  d >= 0 FAILED');

        var s = (trace.bracketOpening || edge.bracketClosing),
            b = 1 - s,
            d2;

        for(;;) {
            edge.setBlockTrace(trace);
            trace = edge;
            edge = edge.getBlockNext();

            if (edge === null) {
                break;
            }

            d2 = edge.positionY - trace.positionY;
            assert(d2 >= 0,
                   'AREdgeList._blockPushForward: d2 >= 0 FAILED');

            if (trace.bracketOpening || edge.bracketClosing) {
                g = this._blockGetG(d,b,s);
                if (d2 <= g) {
                    f = this._blockGetF(d,b,s);
                    break;
                }
                s++;
            }
            else
            {
                f = this._blockGetF(d,b,s);
                if (d2 <= f) {
                    g = this._blockGetG(d,b,s);
                    break;
                }
                b++;
            }

            d += d2;
        }

        if (b+s > 1) { //Looking at more than one edge (or edge/trace comparison) {
            if (edge === null) {
                f = this._blockGetF(d,b,s);
                g = this._blockGetG(d,b,s);
            }

            assert(Utils.floatEquals(d, f*b + g*s),
                   'AREdgeList._blockPushForward: floatEquals(d, f*b + g*s) FAILED');

            edge = trace;
            assert(edge !== null && !edge.equals(blocked),
                   'AREdgeList._blockPushForward: edge != null && !edge.equals(blocked) FAILED');

            var y = edge.positionY;

            do {
                assert(edge !== null && edge.getBlockTrace() !== null,
                       'AREdgeList._blockPushForward: edge !== null && edge.getBlockTrace() !== null FAILED');
                trace = edge.getBlockTrace();

                y -= (trace.bracketOpening || edge.bracketClosing) ? g : f;

                if (trace.positionY < y - 0.001) {
                    modified = true;

                    if (this._slideButNotPassEdges(trace, y)) {
                        trace.setBlockNext(null);
                    }
                }

                edge = trace;
            } while(edge !== blocked);
        }


        return modified;
    };

    AutoRouterEdgeList.prototype.blockScanForward = function() {
        this._positionAllLoadX();

        var modified = false;

        this.sectionReset();

        var blocker = this.orderFirst,
blocked,
            bmin,
            smin,
            bMinF,
            sMinF;

        while (blocker) {
            bmin = null; //block min?
            smin = null; //section min?
            bMinF = CONSTANTS.ED_MINCOORD - 1;
            sMinF = CONSTANTS.ED_MINCOORD - 1;

            this._sectionBeginScan(blocker);
            while (this._sectionHasBlockedEdge()) {
                if (this._sectionIsImmediate()) {
                    blocked = this._sectionGetBlockedEdge();
                    assert(blocked !== null,
                           'AREdgeList._blockPushForward: blocked !== null FAILED');

                    if (blocked.getBlockPrev() !== null) {
                        modified = this._blockPushBackward(blocked, blocker) || modified;
                    }

                    if (!blocker.edgeFixed) {
                        if (blocked.bracketOpening || blocker.bracketClosing) {
                            if (sMinF < blocked.positionY) {
                                sMinF = blocked.positionY;
                                smin = blocked;
                            }
                        }
                        else
                        {
                            if (bMinF < blocked.positionY) {
                                bMinF = blocked.positionY;
                                bmin = blocked;
                            }
                        }
                    }
                }

            }

            if (bmin) {
                if (smin) {
                    blocker.setClosestPrev(sMinF > bMinF ? smin : bmin);

                    bMinF = blocker.positionY - bMinF;
                    sMinF = this._blockGetF(blocker.positionY - sMinF, 0, 1);

                    blocker.setBlockPrev(sMinF < bMinF ? smin : bmin);
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


            blocker = blocker.orderNext;
        }

        this._positionAllStoreY();

        return modified;
    };

    AutoRouterEdgeList.prototype.blockScanBackward = function() {
        this._positionAllLoadX();

        var modified = false;

        this.sectionReset();
        var blocker = this.orderLast,
            blocked,
            bmin,
            smin,
            bMinF,
            sMinF;
             
        while(blocker) {
            bmin = null;
            smin = null;
            bMinF = CONSTANTS.ED_MAXCOORD + 1;
            sMinF = CONSTANTS.ED_MAXCOORD + 1;

            this._sectionBeginScan(blocker);

            while(this._sectionHasBlockedEdge()) {
                if (this._sectionIsImmediate()) {
                    blocked = this._sectionGetBlockedEdge();

                    assert(blocked !== null,
                           'AREdgeList.blockScanBackward: blocked !== null FAILED');

                    if (blocked.getBlockNext() !== null) {
                        modified = this._blockPushForward(blocked, blocker) || modified;
                    }

                    if (!blocker.edgeFixed) {
                        if (blocker.bracketOpening || blocked.bracketClosing) {
                            if (sMinF > blocked.positionY) {
                                sMinF = blocked.positionY;
                                smin = blocked;
                            }
                        }
                        else
                        {
                            if (bMinF > blocked.positionY) {
                                bMinF = blocked.positionY;
                                bmin = blocked;
                            }
                        }
                    }
                }
            }

            if (bmin) {
                if (smin) {
                    blocker.setClosestNext(sMinF < bMinF ? smin : bmin);

                    bMinF = bMinF - blocker.positionY;
                    sMinF = this._blockGetF(sMinF - blocker.positionY, 0, 1);

                    blocker.setBlockNext(sMinF < bMinF ? smin : bmin);
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

            blocker = blocker.orderPrev;
        }

        this._positionAllStoreY();

        return modified;
    };

    AutoRouterEdgeList.prototype.blockSwitchWrongs = function() {
        var was = false;

        this._positionAllLoadX(); 
        var second = this.orderFirst,
            edge,
            next,
            ey,
            ny,
            a;

        while(second !== null) {
            if ( second.getClosestPrev() !== null && second.getClosestPrev().getClosestNext() !== (second) && //Check if it references itself
                    second.getClosestNext() !== null && second.getClosestNext().getClosestPrev() === (second) ) {
                assert(!second.edgeFixed,
                       'AREdgeList.blockSwitchWrongs: !second.edgeFixed FAILED');

                edge = second;
                next = edge.getClosestNext();

                while (next !== null && edge === next.getClosestPrev()) {
                    assert(edge !== null && !edge.edgeFixed,
                           'AREdgeList.blockSwitchWrongs: edge != null && !edge.edgeFixed FAILED');
                    assert(next !== null && !next.edgeFixed,
                           'AREdgeList.blockSwitchWrongs: next != null && !next.edgeFixed FAILED');

                    ey = edge.positionY;
                    ny = next.positionY;

                    assert(ey <= ny,
                           'AREdgeList.blockSwitchWrongs: ey <= ny FAILED');

                    if (ey + 1 <= ny && this._bracketShouldBeSwitched(edge, next)) {
                        was = true;

                        assert(!edge.getEdgeCanpassed() && !next.getEdgeCanpassed(),
                               'AREdgeList.blockSwitchWrongs: !edge.getEdgeCanpassed() && !next.getEdgeCanpassed() FAILED');
                        edge.setEdgeCanpassed(true);
                        next.setEdgeCanpassed(true);

                        a = this._slideButNotPassEdges(edge, (ny+ey)/2 + 0.001) !== null;
                        a = this._slideButNotPassEdges(next, (ny+ey)/2 - 0.001) !== null || a;

                        if (a) {
                            edge.setClosestPrev(null);
                            edge.setClosestNext(null);
                            next.setClosestPrev(null);
                            next.setClosestNext(null);

                            edge.setEdgeCanpassed(false);
                            next.setEdgeCanpassed(false);
                            break;
                        }

                        if (edge.getClosestPrev() !== null && edge.getClosestPrev().getClosestNext() === edge) {
                            edge.getClosestPrev().setClosestNext(next);
                        }

                        if ( next.getClosestNext() !== null && next.getClosestNext().getClosestPrev() === next) {
                            next.getClosestNext().setClosestPrev(edge);
                        }

                        edge.setClosestNext(next.getClosestNext());
                        next.setClosestNext(edge);
                        next.setClosestPrev(edge.getClosestPrev());
                        edge.setClosestPrev(next);

                        edge.setEdgeCanpassed(false);
                        next.setEdgeCanpassed(false);

                        assert(!this._bracketShouldBeSwitched(next, edge),
                               'AREdgeList.blockSwitchWrongs: !bracketShouldBeSwitched(next, edge) FAILED');

                        if (next.getClosestPrev() !== null && next.getClosestPrev().getClosestNext() === next) {
                            edge = next.getClosestPrev();
                        } else {
                            next = edge.getClosestNext();
                        }
                    } else {
                        edge = next;
                        next = next.getClosestNext();
                    }
                }
            }

            second = second.orderNext;
        }

        if (was) {
            this._positionAllStoreY();
        }

        return was;
    };

    AutoRouterEdgeList.prototype.assertValid = function() {
        // Check that all edges have start/end points
        var edge = this.orderFirst;
        while (edge) {
            assert(edge.startpoint.x !== undefined, 'Edge has unrecognized startpoint: '+edge.startpoint);
            assert(edge.endpoint.x !== undefined, 'Edge has unrecognized endpoint: '+edge.endpoint);
            edge = edge.orderNext;
        }
    };

    return AutoRouterEdgeList;
});
