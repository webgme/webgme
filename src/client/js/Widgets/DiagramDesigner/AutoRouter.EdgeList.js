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
           './AutoRouter.Path',
           './AutoRouter.Port',
           './AutoRouter.Box',
           './AutoRouter.Edge'], function ( logManager, assert,
                                           CONSTANTS,
                                           UTILS,
                                           AutoRouterPath,
                                           AutoRouterPort,
                                           AutoRouterBox,
                                           AutoRouterEdge) {

    "use strict"; 

    //----------------------AutoRouterEdgeList

    var AutoRouterEdgeList = function (b){
        this.owner = null;

        //--Edges
        this.ishorizontal = b;

        //--Order
        this.order_first = null;
        this.order_last = null;

        //--Section
        this.section_first = null;
        this.section_blocker = null;
        this.section_ptr2blocked = []; //This is an array to emulate the pointer to a pointer functionality in CPP. 
        // this.section_ptr2blocked[0] = this.section_ptr2blocked*

        this._initOrder();
        this._initSection();
    };

    //Public Functions
    AutoRouterEdgeList.prototype.destroy = function(){
        this.checkOrder();
        this.checkSection();
    };

    AutoRouterEdgeList.prototype.setOwner = function(newOwner){
        this.owner = newOwner;
    };

    AutoRouterEdgeList.prototype.addEdges = function(path){
        var selfPoints,
            startpoint,
            startpoint_prev,
            endpoint_next,
            endpoint,
            edge,
            dir,
            i;

        if(path instanceof AutoRouterPath){
            assert(path.getOwner() === this.owner, "AREdgeList.addEdges: path.getOwner() === owner FAILED!");

            var isPathAutoRouted = path.isAutoRouted(),
                hasCustomEdge = false,
                customizedIndexes = {},
                indexes = [];

            //path.getCustomizedEdgeIndexes(indexes);

            if(isPathAutoRouted){
                i = -1;
                while(++i < indexes.length){
                    hasCustomEdge = true;
                    customizedIndexes[indexes[i]] = 0;
                }
            }else {
                hasCustomEdge = true;
            }

            var pointList = path.getPointList(),
                ptrsObject = pointList.getTailEdgePtrs(startpoint, endpoint),
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

            while( pointList.getLength() && pos >= 0){

                dir = UTILS.getDir (endpoint[0].minus(startpoint[0]));

                skipEdge = dir === CONSTANTS.Dir_None ? true : false;
                isMoveable = path.isMoveable();

                if( !isMoveable && dir !== CONSTANTS.Dir_Skew){
                    goodAngle = UTILS.isRightAngle (dir);
                    assert( goodAngle, "AREdgeList.addEdges: UTILS.isRightAngle (dir) FAILED!");

                    if( !goodAngle){
                        skipEdge = true;
                    }

                }

                if( !skipEdge && 
                        (UTILS.isRightAngle (dir) && UTILS.isHorizontal (dir) === this.ishorizontal)){
                    edge = new AutoRouterEdge();
                    edge.setOwner(path);

                    edge.setStartAndEndPoint(startpoint, endpoint);
                    edge.setStartPointPrev(pointList.getPointBeforeEdge(pos));
                    edge.setEndPointNext(pointList.getPointAfterEdge(pos));

                    if (hasCustomEdge){
                        isEdgeCustomFixed = false;
                        if (isPathAutoRouted){
                            indItr = customizedIndexes.indexOf(currEdgeIndex);
                            isEdgeCustomFixed = (indItr !== customizedIndexes.length - 1);
                        } else {
                            isEdgeCustomFixed = true;
                        }

                        edge.setEdgeCustomFixed(isEdgeCustomFixed);

                    }else{

                        edge.setEdgeCustomFixed(dir === CONSTANTS.Dir_Skew);
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

                    if(dir !== CONSTANTS.Dir_Skew){

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
            var port = path,
                canHaveStartEndPointHorizontal;

            assert(port.getOwner().getOwner() === this.owner, "AREdgeList.addEdges: port.getOwner() === (owner) FAILED!");

            if (port.isConnectToCenter() || port.getOwner().isAtomic()){
                return;
            }

            selfPoints = port.getSelfPoints();

            for(i = 0; i < 4; i++){

                startpoint_prev = selfPoints[(i + 3) % 4];
                startpoint = selfPoints[i];
                endpoint = selfPoints[(i + 1) % 4];
                endpoint_next = selfPoints[(i + 2) % 4];
                dir = UTILS.getDir (endpoint.minus(startpoint));

                assert( UTILS.isRightAngle (dir), "AREdgeList.addEdges: UTILS.isRightAngle (dir) FAILED!");

                canHaveStartEndPointHorizontal = port.canHaveStartEndPointHorizontal(this.ishorizontal);
                if( UTILS.isHorizontal (dir) === this.ishorizontal && canHaveStartEndPointHorizontal ){
                    edge = new AutoRouterEdge();

                    edge.setOwner(port);
                    edge.setStartAndEndPoint(startpoint, endpoint);
                    edge.setStartPointPrev(startpoint_prev);
                    edge.setEndPointNext(endpoint_next);

                    edge.setEdgeFixed(true);

                    this._position_LoadY(edge);
                    this._position_LoadB(edge);

                    if( edge.getBracketClosing() ){
                        edge.addToPosition(0.999); 
                    }

                    this.insert(edge);
                }
            }
        }else if(path instanceof AutoRouterBox){
            var box = path;

            assert(box.getOwner() === this.owner, "AREdgeList.addEdges: box.getOwner() === (owner) FAILED!");


            selfPoints = box.getSelfPoints();

            for(i = 0; i < 4; i++){
                startpoint_prev = selfPoints[(i + 3) % 4];
                startpoint = selfPoints[i];
                endpoint = selfPoints[(i + 1) % 4];
                endpoint_next = selfPoints[(i + 2) % 4];
                dir = UTILS.getDir (endpoint.minus(startpoint));

                assert( UTILS.isRightAngle (dir), "AREdgeList.addEdges: UTILS.isRightAngle (dir) FAILED!");

                if( UTILS.isHorizontal (dir) === this.ishorizontal ){
                    edge = new AutoRouterEdge();

                    edge.setOwner(box);
                    edge.setStartAndEndPoint(startpoint, endpoint);
                    edge.setStartPointPrev(startpoint_prev);
                    edge.setEndPointNext(endpoint_next);

                    edge.setEdgeFixed(true);

                    this._position_LoadY(edge);
                    this._position_LoadB(edge);

                    if( edge.getBracketClosing() ){
                        edge.addToPosition(0.999); 
                    }

                    this.insert(edge);
                }
            }
        }else if(path){//path is an ARGraph
            var graph = path;
            assert(graph === this.owner, "AREdgeList.addEdges: graph === this.owner FAILED!");

            selfPoints = graph.getSelfPoints();

            for(i = 0; i < 4; i++){

                startpoint_prev = selfPoints[(i + 3) % 4];
                startpoint = selfPoints[i];
                endpoint = selfPoints[(i + 1) % 4];
                endpoint_next = selfPoints[(i + 2) % 4];
                dir = UTILS.getDir(endpoint.minus(startpoint));

                assert( UTILS.isRightAngle (dir), "AREdgeList.addEdges: UTILS.isRightAngle (dir) FAILED!");

                if( UTILS.isHorizontal (dir) === this.ishorizontal ){
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
            } else {
                edge = edge.getOrderNext();
            }
        }

    };

    AutoRouterEdgeList.prototype.deleteAllEdges = function(){
        while(this.order_first){
            this.Delete(this.order_first);
        }
    };

    AutoRouterEdgeList.prototype.isEmpty = function(){
        return this.order_first === null;
    }; 

    AutoRouterEdgeList.prototype.getEdge = function(path, startpoint, endpoint){
        var edge = this.order_first;
        while( edge !== null ){

            if( edge.isSameStartPoint(startpoint)){
                break;
            }

            edge = edge.getOrderNext();
        }

        assert( edge !== null, "AREdgeList.getEdge: edge !== null FAILED!");
        return edge;
    };

    AutoRouterEdgeList.prototype.getEdgeByPointer = function(startpoint){
        var edge = this.order_first;
        while( edge !== null ){
            if(edge.isSameStartPoint(startpoint)){
                break;
            }

            edge = edge.getOrderNext();
        }

        assert(edge !== null, "AREdgeList.getEdgeByPointer: edge !== null FAILED!");
        return edge;
    };

    AutoRouterEdgeList.prototype.setEdgeByPointer = function(pEdge, newEdge){
        assert(newEdge instanceof AutoRouterEdge, "AREdgeList.setEdgeByPointer: newEdge instanceof AutoRouterEdge FAILED!");
        var edge = this.section_first;
        while( edge !== null ){
            if(pEdge === edge){
                break;
            }

            edge = edge.getSectionDown();
        }

        assert(edge !== null, "AREdgeList.setEdgeByPointer: edge !== null FAILED!");
        edge = newEdge;
    };

    AutoRouterEdgeList.prototype.getEdgeAt = function(point, nearness){
        var edge = this.order_first;
        while(edge){

            if(UTILS.isPointNearLine(point, edge.getStartPoint(), edge.getEndPoint(), nearness)){
                return edge;
            }

            edge = edge.getOrderNext();
        }

        return null;
    };        

    AutoRouterEdgeList.prototype.dumpEdges = function(msg){
        var edge = this.order_first,
            total = 1;
        console.log(msg);

        while( edge !== null ){
            console.log('\t' + edge.getStartPoint().x + ', ' + edge.getStartPoint().y + '\t\t' + edge.getEndPoint().x + ', ' + edge.getEndPoint().y + '\t\t\t(' + (edge.getEdgeFixed() ? "FIXED" : "MOVEABLE" ) + ')\t\t' + (edge.getBracketClosing() ? "Bracket Closing" : (edge.getBracketOpening() ? "Bracket Opening" : "")));
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
        if(edge instanceof Array){ 
            edge = edge[0];
        }

        assert( edge !== null && !edge.isStartPointNull() && !edge.isEndPointNull(), "AREdgeList.position_SetRealY: edge != null && !edge.isStartPointNull() && !edge.isEndPointNull() FAILED");

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
            assert( this.order_first !== null, "AREdgeList.insertLast: this.order_first != null FAILED" );

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

        assert( CONSTANTS.ED_MINCOORD <= y && y <= CONSTANTS.ED_MAXCOORD,  "AREdgeList.insert: CONSTANTS.ED_MINCOORD <= y && y <= CONSTANTS.ED_MAXCOORD FAILED (y is " + y + ")");

        var insert = this.order_first;

        while( insert && insert.getPositionY() < y ){
            insert = insert.getOrderNext();
        }

        if( insert ){
            this.insertBefore(edge, insert);
        } else {
            this.insertLast(edge);
        }
    };

    AutoRouterEdgeList.prototype.remove = function(edge){
        assert( edge !== null, "AREdgeList.remove:  edge !== null FAILED");

        if( this.order_first === edge ){
            this.order_first = edge.getOrderNext();
        }

        if( edge.getOrderNext() ){
            edge.getOrderNext().setOrderPrev(edge.getOrderPrev());
        }

        if( this.order_last === edge ){
            this.order_last = edge.getOrderPrev();
        }

        if( edge.getOrderPrev() ){
            edge.getOrderPrev().setOrderNext(edge.getOrderNext());
        }

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
        assert( edge !== null, "AREdgeList.slideButNotPassEdges: edge != null FAILED" );
        assert( CONSTANTS.ED_MINCOORD < y && y < CONSTANTS.ED_MAXCOORD,  "AREdgeList.slideButNotPassEdges: CONSTANTS.ED_MINCOORD < y && y < CONSTANTS.ED_MAXCOORD FAILED");

        var oldy = edge.getPositionY();
        assert( CONSTANTS.ED_MINCOORD < oldy && oldy < CONSTANTS.ED_MAXCOORD, "AREdgeList.slideButNotPassEdges: CONSTANTS.ED_MINCOORD < oldy && oldy < CONSTANTS.ED_MAXCOORD FAILED");

        if( oldy === y ){
            return null;
        }

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
                if( !insert.getEdgeCanpassed() && UTILS.intersect (x1, x2, insert.getPositionX1(), insert.getPositionX2() ) )
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
                if( !insert.getEdgeCanpassed() && UTILS.intersect (x1, x2, insert.getPositionX1(), insert.getPositionX2() ) )
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
            this._logger.warning("section_blocker and this.section_ptr2blocked are not null. Assuming last run did not exit cleanly. Fixing...");
            this.section_blocker = null;
            this.section_ptr2blocked = null;
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
        assert( this.section_blocker !== null && this.section_ptr2blocked !== null && this.section_ptr2blocked !== null, "AREdgeList.section_IsImmediate: this.section_blocker != null && this.section_ptr2blocked != null && *section_ptr2blocked != null FAILED");

        var section_blocked = this.section_ptr2blocked[0],
            e = section_blocked.getSectionDown(),
            a1 = section_blocked.getSectionX1(),
            a2 = section_blocked.getSectionX2(),
            p1 = section_blocked.getPositionX1(),
            p2 = section_blocked.getPositionX2(),
            b1 = this.section_blocker.getSectionX1(),
            b2 = this.section_blocker.getSectionX2();

        if(e !== null){
            e = (e.getStartPoint().equals(CONSTANTS.EMPTY_POINT) || e.getSectionX1() === undefined ? null : e);
        }

        assert( b1 <= a2 && a1 <= b2, "AREdgeList.section_IsImmediate: b1 <= a2 && a1 <= b2 FAILED");// not case 1 or 6

        // NOTE WE CHANGED THE CONDITIONS (A1<=B1 AND B2<=A2)
        // BECAUSE HERE WE NEED THIS!

        if( a1 <= b1 )
        {
            while( !(e === null || e.getStartPoint().equals(CONSTANTS.EMPTY_POINT)) && e.getSectionX2() < b1 ){
                e = e.getSectionNext();
            }

            if( b2 <= a2 ){
                return (e === null || e.getStartPoint().equals(CONSTANTS.EMPTY_POINT))|| b2 < e.getSectionX1();				// case 3
            }

            return (e === null || e.getStartPoint().equals(CONSTANTS.EMPTY_POINT)) && a2 === p2;								// case 2
        }

        if( b2 <= a2 ){
            return a1 === p1 && ((e === null || e.getStartPoint().equals(CONSTANTS.EMPTY_POINT)) || b2 < e.getSectionX1());	// case 5
        }

        return (e === null || e.getStartPoint().equals(CONSTANTS.EMPTY_POINT)) && a1 === p1 && a2 === p2;						// case 4
    };


    AutoRouterEdgeList.prototype.section_HasBlockedEdge = function (){
        assert( this.section_blocker !== null, "AREdgeList.section_HasBlockedEdge: this.section_blocker != null FAILED");

        var a1,
            a2,
            e,
            b1 = this.section_blocker.getSectionX1(),
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

            assert( !current_edge.getStartPoint().equals(CONSTANTS.EMPTY_POINT) , "AREdgeList.section_HasBlockedEdge: !current_edge.getStartPoint().equals(CONSTANTS.EMPTY_POINT) FAILED" );

            var o = null;

            e = current_edge.getSectionDownPtr()[0];
            a1 = current_edge.getSectionX1();
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
                if( e && !e.getStartPoint().equals(CONSTANTS.EMPTY_POINT))
                {
                    while( e.getSectionNext() && !e.getSectionNext().getStartPoint().equals(CONSTANTS.EMPTY_POINT)){
                        e = e.getSectionNext();
                    }

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

                while( (e && !e.getStartPoint().equals(CONSTANTS.EMPTY_POINT)) && e.getSectionX1() <= a1 )
                {	
                    assert( e.getSectionX1() <= e.getSectionX2(), "AREdgeList.section_HasBlockedEdge: e.getSectionX1() <= e.getSectionX2() FAILED");

                    if( a1 <= e.getSectionX2() ){
                        a1 = e.getSectionX2() + 1;
                    }

                    o = e;
                    e = e.getSectionNext();
                }

                if( o )
                { //Insert current_edge to be section_next of the given edge in the list of section_down (basically, collapsing current_edge into the section_down list. The values in the list following current_edge will then be set to be section_down of the current_edge.)
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

                while( e && !e.getStartPoint().equals(CONSTANTS.EMPTY_POINT))
                {
                    o = e;
                    e = e.getSectionNext();

                    if( o.getSectionX2() + 1 < b1 && ( e === null || e.getStartPoint().equals(CONSTANTS.EMPTY_POINT) || o.getSectionX2() + 1 < e.getSectionX1() ) ){
                        this.section_ptr2blocked = o.getSectionNextPtr();
                    }
                }

                if( !this.section_ptr2blocked[0].getStartPoint().equals(CONSTANTS.EMPTY_POINT) )
                {
                    assert( o !== null, "AREdgeList.section_HasBlockedEdge: o != null FAILED");
                    o.setSectionNext(current_edge.getSectionNext());

                    current_edge.setSectionX2(
                            (this.section_ptr2blocked[0].getSectionX1() < b1 ? this.section_ptr2blocked[0].getSectionX1() : b1) - 1);

                    current_edge.setSectionNext(this.section_ptr2blocked[0]);
                    this.section_ptr2blocked[0] = new AutoRouterEdge(); //This seems odd
                    this.section_ptr2blocked = null;

                } else {
                    current_edge.setSectionX2(b1 - 1);
                }

                this.section_ptr2blocked = current_edge.getSectionNextPtr();
            }
        }

        assert( this.section_ptr2blocked !== null, "AREdgeList.section_HasBlockedEdge: this.section_ptr2blocked != null FAILED");
        while( this.section_ptr2blocked[0] !== null && !this.section_ptr2blocked[0].getStartPoint().equals(CONSTANTS.EMPTY_POINT))
        {
            a1 = this.section_ptr2blocked[0].getSectionX1();
            a2 = this.section_ptr2blocked[0].getSectionX2();

            //If this.section_ptr2blocked is completely to the left (or above) this.section_blocker
            if( a2 < b1 )												// case 1
            {
                this.section_ptr2blocked = this.section_ptr2blocked[0].getSectionNextPtr();

                assert( this.section_ptr2blocked !== null, "AREdgeList.section_HasBlockedEdge: this.section_ptr2blocked != null FAILED");
                continue;
            }
            //If this.section_blocker is completely to the right (or below) this.section_ptr2blocked 
            else if( b2 < a1 ) {											// case 6
                break;
            }

            if( a1 < b1 && b2 < a2 )									// case 3
                //If this.section_ptr2blocked starts before and ends after this.section_blocker
            {
                var x = b1;
                e = this.section_ptr2blocked[0].getSectionDown();

                for(;;)
                {

                    if( e === null || e.getStartPoint().equals(CONSTANTS.EMPTY_POINT) || x < e.getSectionX1() ){ 
                        return true;
                    }
                    else if( x <= e.getSectionX2() )
                    {
                        x = e.getSectionX2() + 1;
                        if( b2 < x ){
                            break;
                        }
                    }

                    e = e.getSectionNext();
                }

                this.section_ptr2blocked = this.section_ptr2blocked[0].getSectionDownPtr(); 
                continue;
            }
            //This leaves the regular partial overlap possibility. They also include this.section_blocker starting before and ending after this.section_ptr2blocked.

            return true;
        }

        assert( this.section_blocker.getSectionNext() === null && (this.section_blocker.getSectionDown() === null || this.section_blocker.getSectionDown().getStartPoint().equals(CONSTANTS.EMPTY_POINT)) , "AREdgeList.section_HasBlockedEdge: this.section_blocker.getSectionNext() === null && this.section_blocker.getSectionDown() === null FAILED");

        this.section_blocker.setSectionNext(this.section_ptr2blocked[0]);
        this.section_ptr2blocked[0] = this.section_blocker; //Set anything pointing to this.section_ptr2blocked to point to this.section_blocker (eg, section_down)

        this.section_blocker = null;
        this.section_ptr2blocked = null;

        return false;
    };

    AutoRouterEdgeList.prototype.section_GetBlockedEdge = function (){
        assert( this.section_blocker !== null && this.section_ptr2blocked !== null, "AREdgeList.sectionGetBlockedEdge: this.section_blocker !== null && this.section_ptr2blocked !== null FAILED" );

        return this.section_ptr2blocked[0];
    };

    //----Bracket

    AutoRouterEdgeList.prototype.bracket_IsClosing = function (edge){
        assert( edge !== null, "AREdgeList.bracket_IsClosing: edge !== null FAILED" );
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
        assert( edge !== null, "AREdgeList.bracket_IsOpening: edge !== null FAILED" );
        assert( !edge.isStartPointNull() && !edge.isEndPointNull(), "AREdgeList.bracket_IsOpening: !edge.isStartPointNull() && !edge.isEndPointNull() FAILED");

        var start = edge.getStartPoint(),
            end = edge.getEndPoint();

        if( edge.isStartPointPrevNull() || edge.isEndPointNextNull() ){
            return false;
        }

        return this.ishorizontal ?
            (edge.getStartPointPrev().y > start.y && edge.getEndPointNext().y > end.y ) :
            (edge.getStartPointPrev().x > start.x && edge.getEndPointNext().x > end.x );
    };

    AutoRouterEdgeList.prototype.bracket_IsSmallGap = function (blocked, blocker){
        return this.bracket_IsOpening(blocked) || this.bracket_IsClosing(blocker);
    };

    AutoRouterEdgeList.prototype.bracket_ShouldBeSwitched = function (edge, next){
        assert( edge !== null && next !== null, "AREdgeList.bracket_ShouldBeSwitched: edge !== null && next !== null FAILED");

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

        if( (nx1 < ex1 && ex1 < nx2 && eo1 > 0 ) || (ex1 < nx1 && nx1 < ex2 && no1 < 0) ){
            c1 = +1;
        } else if( ex1 === nx1 && eo1 === 0 && no1 === 0 ){
            c1 = 0;
        } else {
            c1 = -9;
        }

        if( (nx1 < ex2 && ex2 < nx2 && eo2 > 0 ) || (ex1 < nx2 && nx2 < ex2 && no2 < 0) ){
            c2 = +1;
        } else if( ex2 === nx2 && eo2 === 0 && no2 === 0 ){
            c2 = 0;
        } else {
            c2 = -9;
        }

        return (c1 + c2) > 0;
    };

    //---Block

    AutoRouterEdgeList.prototype._block_GetF = function (d, b, s){
        var f = d/(b+s), //f is the total distance between edges divided by the total number of edges
            S = CONSTANTS.EDLS_S, //This is 'SMALLGAP'
            R = CONSTANTS.EDLS_R,//This is 'SMALLGAP + 1'
            D = CONSTANTS.EDLS_D; //This is the total distance of the graph

        //If f is greater than the SMALLGAP, then make some checks/edits
        if( b === 0 && R <= f ){ //If every comparison resulted in an overlap AND SMALLGAP + 1 is less than the distance between each edge (in the given range)
            f += (D-R);
        } else if( S < f && s > 0 ){
            f = ((D-S)*d - S*(D-R)*s) / ((D-S)*b + (R-S)*s);
        }

        return f;
    };

    AutoRouterEdgeList.prototype._block_GetG = function (d, b, s){
        var g = d/(b+s),
            S = CONSTANTS.EDLS_S,
            R = CONSTANTS.EDLS_R,
            D = CONSTANTS.EDLS_D;

        if( S < g && b > 0 ){
            g = ((R-S)*d + S*(D-R)*b) / ((D-S)*b + (R-S)*s);
        }

        return g;
    };

    //Float equals
    AutoRouterEdgeList.prototype.flt_equ  = function (a, b){
        return ((a - 0.1) < b) && (b < (a + 0.1));
    };

    AutoRouterEdgeList.prototype.block_PushBackward = function(blocked, blocker){
        var modified = false;

        assert( blocked !== null && blocker !== null, "AREdgeList.block_PushBackward: blocked !== null && blocker !== null FAILED");
        assert( blocked.getPositionY() <= blocker.getPositionY(), "AREdgeList.block_PushBackward: blocked.getPositionY() <= blocker.getPositionY() FAILED");
        assert( blocked.getBlockPrev() !== null, "AREdgeList.block_PushBackward: blocked.getBlockPrev() !== null FAILED"); 

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

            if( edge === null ){
                break;
            }

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
            assert( edge !== null && edge !== blocked, "AREdgeList.block_PushBackward: edge !== null && edge !== blocked FAILED");

            var y = edge.getPositionY();

            do
            {
                assert( edge !== null && edge.getBlockTrace() !== null,"AREdgeList.block_PushBackward: edge !== null && edge.getBlockTrace() !== null FAILED");
                trace = edge.getBlockTrace();

                y += (edge.getBracketOpening() || trace.getBracketClosing()) ? g : f;

                if( y + 0.001 < trace.getPositionY() )
                {
                    modified = true;
                    if( this._slideButNotPassEdges(trace, y) ){
                        trace.setBlockPrev(null);
                    }
                }

                edge = trace;
            } while( edge !== blocked );

            if (CONSTANTS.DEBUG){
                //y += (edge.getBracketOpening() || blocker.getBracketClosing()) ? g : f;
                assert( this.flt_equ(y, blocker.getPositionY()), "AREdgeList.block_PushBackward: flt_equ(y, blocker.getPositionY()) FAILED");
            }
        }

        return modified;
    };

    AutoRouterEdgeList.prototype.block_PushForward = function(blocked, blocker){
        var modified = false;

        assert( blocked !== null && blocker !== null, "AREdgeList.block_PushForward: blocked !== null && blocker !== null FAILED");
        assert( blocked.getPositionY() >= blocker.getPositionY(), "AREdgeList.block_PushForward: blocked.getPositionY() >= blocker.getPositionY() FAILED");
        assert( blocked.getBlockNext() !== null, "AREdgeList.block_PushForward: blocked.getBlockNext() !== null FAILED");

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
                assert( edge !== null && edge.getBlockTrace() !== null, "AREdgeList.block_PushForward: edge !== null && edge.getBlockTrace() !== null FAILED");
                trace = edge.getBlockTrace();

                y -= (trace.getBracketOpening() || edge.getBracketClosing()) ? g : f;

                if( trace.getPositionY() < y - 0.001 )
                {
                    modified = true;

                    if( this._slideButNotPassEdges(trace, y) ) {
                        trace.setBlockNext(null);
                    }
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
            bmin_f = CONSTANTS.ED_MINCOORD - 1;
            smin_f = CONSTANTS.ED_MINCOORD - 1;

            this.section_BeginScan(blocker);
            while( this.section_HasBlockedEdge() )
            {
                if( this.section_IsImmediate() )
                {
                    blocked = this.section_GetBlockedEdge();
                    assert( blocked !== null, "AREdgeList.block_PushForward: blocked !== null FAILED");

                    if( blocked.getBlockPrev() !== null ){
                        modified = this.block_PushBackward(blocked, blocker) || modified;
                    }

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
            bmin_f = CONSTANTS.ED_MAXCOORD + 1;
            smin_f = CONSTANTS.ED_MAXCOORD + 1;

            this.section_BeginScan(blocker);

            while( this.section_HasBlockedEdge() )
            {
                if( this.section_IsImmediate() )
                {
                    blocked = this.section_GetBlockedEdge();

                    assert( blocked !== null, "AREdgeList.block_ScanBackward: blocked !== null FAILED");

                    if( blocked.getBlockNext() !== null )
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

        while( second !== null )
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

                        if( edge.getClosestPrev() !== null && edge.getClosestPrev().getClosestNext() === edge ){
                            edge.getClosestPrev().setClosestNext(next);
                        }

                        if( next.getClosestNext() !== null && next.getClosestNext().getClosestPrev() === next){
                            next.getClosestNext().setClosestPrev(edge);
                        }

                        edge.setClosestNext(next.getClosestNext());
                        next.setClosestNext(edge);
                        next.setClosestPrev(edge.getClosestPrev());
                        edge.setClosestPrev(next);

                        edge.setEdgeCanpassed(false);
                        next.setEdgeCanpassed(false);

                        assert( !this.bracket_ShouldBeSwitched(next, edge), "AREdgeList.block_SwitchWrongs: !Bracket_ShouldBeSwitched(next, edge) FAILED");

                        if( next.getClosestPrev() !== null && next.getClosestPrev().getClosestNext() === next ){
                            edge = next.getClosestPrev();
                        } else {
                            next = edge.getClosestNext();
                        }
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

        if( was ){
            this._positionAll_StoreY();
        }

        return was;
    };

    return AutoRouterEdgeList;
});
