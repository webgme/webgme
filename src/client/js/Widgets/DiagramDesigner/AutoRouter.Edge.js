/*globals define*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * @author brollb / https://github/brollb
 */

define(['common/LogManager',
           'common/util/assert',
           './AutoRouter.Constants',
           './AutoRouter.Utils',
           './AutoRouter.Point'], function ( logManager, assert, CONSTANTS, Utils, ArPoint ) {

    'use strict'; 

    var AutoRouterEdge = function (){
        /*
           In this section every comment refer to the horizontal case, that is, each	edge is
           horizontal.
         */

        /*
         * TODO Update this comment
         *
           Every CAutoRouterEdge belongs to an edge of a CAutoRouterPath, CAutoRouterBox or CAutoRouterPort. This edge is
           Represented by a CAutoRouterPoint with its next point. The variable 'point' will refer
           to this CAutoRouterPoint.

           The coordinates of an edge are 'x1', 'x2' and 'y' where x1/x2 is the x-coordinate
           of the left/right point, and y is the common y-coordinate of the points.

           The edges are ordered according to their y-coordinates. The first edge has
           the least y-coordinate (topmost), and its pointer is in 'orderFirst'.
           We use the 'order' prefix in the variable names to refer to this order.

           We will walk from top to bottom (from the 'orderFirst' along the 'this.orderNext').
           We keep track a 'section' of some edges. If we have an infinite horizontal line,
           then the section consists of those edges that are above the line and not blocked
           by another edge which is closer to the line. Each edge in the section has
           a viewable portion from the line (the not blocked portion). The coordinates
           of this portion are 'this.sectionX1' and 'this.sectionX2'. We have an order of the edges
           belonging to the current section. The 'section_first' refers to the leftmost
           edge in the section, while the 'this.sectionNext' to the next from left to right.

           We say that the CAutoRouterEdge E1 'precede' the CAutoRouterEdge E2 if there is no other CAutoRouterEdge which
           totally	blocks S1 from S2. So a section consists of the preceding edges of an
           infinite edge. We say that E1 is 'adjacent' to E2, if E1 is the nearest edge
           to E2 which precede it. Clearly, every edge has at most one adjacent precedence.

           The edges of any CAutoRouterBox or CAutoRouterPort are fixed. We will continually fix the edges
           of the CAutoRouterPaths. But first we need some definition.

           We call a set of edges as a 'block' if the topmost (first) and bottommost (last)
           edges of it are fixed while the edges between them are not. Furthermore, every
           edge is adjacent to	the next one in the order. Every edge in the block has an
           'index'. The index of the first one (topmost) is 0, of the second is 1, and so on.
           We call the index of the last edge (# of edges - 1) as the index of the entire box.
           The 'depth' of a block is the difference of the y-coordinates of the first and last
           edges of it. The 'goal gap' of the block is the quotient of the depth and index
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
        this.startpointPrev = null;
        this.startpoint = null;
        this.endpoint = null;
        this.endpointNext = null;

        this.positionY = 0;
        this.positionX1 = 0;
        this.positionX2 = 0;
        this.bracketClosing = false;
        this.bracketOpening = false;

        this.orderPrev = null;
        this.orderNext = null;

        this.sectionX1 = null;
        this.sectionX2 = null;
        this.sectionNext = null;
        this.sectionDown = null;

        this.edgeFixed = false;
        this.edgeCustomFixed = false;
        this.edgeCanPassed = false;
        this.edgeDirection = null;

        this.blockPrev = null;
        this.blockNext = null;
        this.blockTrace = null;

        this.closestPrev = null;
        this.closestNext = null;

    };


    AutoRouterEdge.prototype.assign = function(otherEdge){

        if(otherEdge !== null){
            this.owner = otherEdge.owner;
            this.setStartPoint(otherEdge.startpoint, false );
            this.setEndPoint(otherEdge.endpoint, otherEdge.endpoint !== null); //Only calculateDirection if this.endpoint is not null

            this.startpointPrev = otherEdge.startpointPrev;
            this.endpointNext = otherEdge.endpointNext;

            this.positionY = otherEdge.positionY;
            this.positionX1 = otherEdge.positionX1;
            this.positionX2 = otherEdge.positionX2;
            this.bracketClosing = otherEdge.bracketClosing;
            this.bracketOpening = otherEdge.bracketOpening;

            this.orderNext = otherEdge.orderNext;
            this.orderPrev = otherEdge.orderPrev;

            this.sectionX1 = otherEdge.sectionX1;
            this.sectionX2 = otherEdge.sectionX2;
            this.setSectionNext(otherEdge.getSectionNext(true));
            this.setSectionDown(otherEdge.getSectionDown(true));

            this.edgeFixed = otherEdge.edgeFixed;
            this.edgeCustomFixed = otherEdge.edgeCustomFixed;
            this.setEdgeCanpassed(otherEdge.getEdgeCanpassed());
            this.setDirection(otherEdge.getDirection());

            this.setBlockPrev(otherEdge.getBlockPrev());
            this.setBlockNext(otherEdge.getBlockNext());
            this.setBlockTrace(otherEdge.getBlockTrace());

            this.setClosestPrev(otherEdge.getClosestPrev());
            this.setClosestNext(otherEdge.getClosestNext());

            return this;
        }

        return null;
    };

    AutoRouterEdge.prototype.equals = function(otherEdge){
        return this === otherEdge; // This checks if they reference the same object
    };

    AutoRouterEdge.prototype.getStartPointPrev = function (){
        return this.startpointPrev !== null ? this.startpointPrev || this.startpointPrev : null;
    };

    AutoRouterEdge.prototype.isStartPointPrevNull = function () {
        return !this.startpointPrev;
    };

    AutoRouterEdge.prototype.getStartPoint = function (){
        return this.startpoint !== null ?
            (this.startpoint instanceof Array ? new ArPoint(this.startpoint) : new ArPoint(this.startpoint)) : CONSTANTS.EMPTY_POINT;  // returning copy of this.startpoint
    };

    AutoRouterEdge.prototype.isSameStartPoint = function(point){
        return this.startpoint === point;
    };

    AutoRouterEdge.prototype.isStartPointNull = function (){
        return this.startpoint === null;
    };

    AutoRouterEdge.prototype.setStartPoint = function (point, b){
        this.startpoint = point;

        if(b !== false){
            this.recalculateDirection();
        }
    };

    AutoRouterEdge.prototype.setStartPointX = function(_x){
        this.startpoint.x = _x;
    };

    AutoRouterEdge.prototype.setStartPointY = function(_y){
        this.startpoint.y = _y;
    };

    AutoRouterEdge.prototype.getEndPoint = function(){
        return this.endpoint !== null ? 
            (this.endpoint instanceof Array ? 
             new ArPoint(this.endpoint) : 
             new ArPoint(this.endpoint)): 
             CONSTANTS.EMPTY_POINT;
    };

    AutoRouterEdge.prototype.isEndPointNull = function(){
        return this.endpoint === null;
    };

    AutoRouterEdge.prototype.setEndPoint = function(point, b){
        this.endpoint = point;

        if(b !== false){
            this.recalculateDirection();
        }
    };

    AutoRouterEdge.prototype.setStartAndEndPoint = function(startPoint, endPoint){
        this.setStartPoint(startPoint, false); //wait until setting the this.endpoint to recalculateDirection
        this.setEndPoint(endPoint);
    };

    AutoRouterEdge.prototype.setEndPointX = function (_x){
        this.endpoint.x = _x;
    };

    AutoRouterEdge.prototype.setEndPointY = function (_y){
        this.endpoint.y = _y;
    };

    AutoRouterEdge.prototype.isEndPointNextNull = function(){
        return !this.endpointNext;
    };

    AutoRouterEdge.prototype.getSectionNext = function(){

        return this.sectionNext !== undefined ? this.sectionNext[0] : null;
    };

    AutoRouterEdge.prototype.getSectionNextPtr = function(){
        if(!this.sectionNext || !this.sectionNext[0]){
            this.sectionNext = [ new AutoRouterEdge() ];
        }
        return this.sectionNext;
    };

    AutoRouterEdge.prototype.setSectionNext = function(nextSection){
        nextSection = nextSection instanceof Array ? nextSection[0] : nextSection;
        if(this.sectionNext instanceof Array){
            this.sectionNext[0] = nextSection;
        } else {
            this.sectionNext = [nextSection];
        }
    };

    AutoRouterEdge.prototype.getSectionDown = function(){ //Returns pointer - if not null

        return this.sectionDown !== undefined ? this.sectionDown[0] : null;

    };

    AutoRouterEdge.prototype.getSectionDownPtr = function(){
        if(!this.sectionDown || !this.sectionDown[0]){
            this.sectionDown = [ new AutoRouterEdge() ];
        }
        return this.sectionDown;
    };

    AutoRouterEdge.prototype.setSectionDown = function(downSection){
        downSection = downSection instanceof Array ? downSection[0] : downSection;
        if(this.sectionDown instanceof Array){
            this.sectionDown[0] = downSection;
        } else {
            this.sectionDown = [downSection];
        }
    };

    AutoRouterEdge.prototype.getEdgeCanpassed =  function(){
        return this.edgeCanPassed;
    };

    AutoRouterEdge.prototype.setEdgeCanpassed =  function(ecp){
        this.edgeCanPassed = ecp;
    };

    AutoRouterEdge.prototype.getDirection = function(){
        return this.edgeDirection;
    };

    AutoRouterEdge.prototype.setDirection = function(dir){
        this.edgeDirection = dir;
    };

    AutoRouterEdge.prototype.recalculateDirection = function(){
        assert(this.startpoint !== null && this.endpoint !== null, 
            'AREdge.recalculateDirection: this.startpoint !== null && this.endpoint !== null FAILED!');
        this.edgeDirection = Utils.getDir(this.endpoint.minus(this.startpoint));
    };

    AutoRouterEdge.prototype.getBlockPrev = function(){
        return this.blockPrev;
    };

    AutoRouterEdge.prototype.setBlockPrev = function(prevBlock){
        this.blockPrev = prevBlock;
    };

    AutoRouterEdge.prototype.getBlockNext = function(){
        return this.blockNext;
    };

    AutoRouterEdge.prototype.setBlockNext = function(nextBlock){
        this.blockNext = nextBlock;
    };

    AutoRouterEdge.prototype.getBlockTrace = function(){
        return this.blockTrace;
    };

    AutoRouterEdge.prototype.setBlockTrace = function(traceBlock){
        this.blockTrace = traceBlock;
    };

    AutoRouterEdge.prototype.getClosestPrev = function(){
        return this.closestPrev;
    };

    AutoRouterEdge.prototype.setClosestPrev = function(cp){
        this.closestPrev = cp;
    };

    AutoRouterEdge.prototype.getClosestNext = function(){
        return this.closestNext;
    };

    AutoRouterEdge.prototype.setClosestNext = function(cp){
        this.closestNext = cp;
    };

    return AutoRouterEdge;

});
