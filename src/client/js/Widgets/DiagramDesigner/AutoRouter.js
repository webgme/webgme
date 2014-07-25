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
           './AutoRouter.Rect',
           './AutoRouter.Graph',
           './AutoRouter.Box',
           './AutoRouter.Port',
           './AutoRouter.Path',
           './AutoRouter.PathMap',
           './AutoRouter.CustomPathData'],
       function ( logManager, assert, CONSTANTS, UTILS, ArPoint, ArRect, AutoRouterGraph, AutoRouterBox, AutoRouterPort,
                                           AutoRouterPath,
                                           ArPathMap,
                                           CustomPathData) {

    "use strict"; 

    var _logger = logManager.create("AutoRouter");

    var AutoRouter = function(graphDetails){
       this.paths = {};
       this.pCount = 0;//A not decrementing count of paths for unique path id's
       this.boxId2Path = {};
       this.portCount = 0;//A not decrementing count of ports for unique path id's

       //CONSTANTS.ED_MAXCOORD = (graphDetails && graphDetails.coordMax !== undefined ? graphDetails.coordMax : false) || CONSTANTS.ED_MAXCOORD;
       //CONSTANTS.ED_MINCOORD = (graphDetails && graphDetails.coordMin !== undefined ? graphDetails.coordMin : false) || CONSTANTS.ED_MINCOORD;
       //BUFFER = (graphDetails && graphDetails.minGap !== undefined ? Math.floor( graphDetails.minGap/2 ) : false) || BUFFER;
       //EDLS_D = CONSTANTS.ED_MAXCOORD - CONSTANTS.ED_MINCOORD,
 
       this.router = new AutoRouterGraph();
    };

    var ArBoxObject = function(b, p){
        //Stores a box with ports used to connect to the box
        this.box = b;
        this.ports = p;
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
                !((size.y1 !== undefined && size.y2 !== undefined) || (size.height !== undefined && (size.y1 !== undefined || size.y2 !== undefined)))){
            throw "AutoRouter:addBox missing required size details to determine x1,x2,y1,y2 ("  + x1 + "," + x2 + "," + y1 + "," + y2 + ")";
        }

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

            port.setAttributes(CONSTANTS.ARPORT_ConnectOnAll);

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

            if(!(connAreas instanceof Array)){
                connAreas = [connAreas];
            }

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

                    attr = (arx1  - 1 === x1 ? CONSTANTS.ARPORT_EndOnLeft * isStart : 0) +
                        (arx2 + 1 === x2 ? CONSTANTS.ARPORT_EndOnRight * isStart : 0) +
                        (ary1 - 1 === y1 ? CONSTANTS.ARPORT_EndOnTop * isStart : 0) +
                        (ary2 + 1 === y2 ? CONSTANTS.ARPORT_EndOnBottom * isStart : 0);

                }else if(connArea[j].length === 2 && connArea[j][0][0] !== connArea[j][1][0] && connArea[j][0][1] !== connArea[j][1][1]) {
                    //connection RECTANGLE
                    //[ [x1, y1], [x2, y2] ]
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

                    if( min === dceil ){
                        attr = CONSTANTS.ARPORT_StartOnTop + CONSTANTS.ARPORT_EndOnTop;
                    }
                    if( min === dfloor ){
                        attr = CONSTANTS.ARPORT_StartOnBottom + CONSTANTS.ARPORT_EndOnBottom;
                    }
                    if( min === dleft ){
                        attr = CONSTANTS.ARPORT_StartOnLeft + CONSTANTS.ARPORT_EndOnLeft;
                    }
                    if( min === dright ){
                        attr = CONSTANTS.ARPORT_StartOnRight + CONSTANTS.ARPORT_EndOnRight;
                    }


                    //attr = (arx1  - 1 === x1 ? CONSTANTS.ARPORT_EndOnLeft * isStart : 0) +
                    //   (arx2 + 1 === x2 ? CONSTANTS.ARPORT_EndOnRight * isStart : 0) +
                    //  (ary1 - 1 === y1 ? CONSTANTS.ARPORT_EndOnTop * isStart : 0) +
                    // (ary2 + 1 === y2 ? CONSTANTS.ARPORT_EndOnBottom * isStart : 0);

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
                            attr = CONSTANTS.ARPORT_StartOnTop + CONSTANTS.ARPORT_EndOnTop;
                        }else{ //Closer to the top (horizontal)
                            ary1 = _y1 - 5;
                            ary2 = _y1 - 1;
                            attr = CONSTANTS.ARPORT_StartOnBottom + CONSTANTS.ARPORT_EndOnBottom;
                        }


                    }else{
                        if(Math.abs(_x1 - x1) < Math.abs(_x1 - x2)){//Closer to the left (vertical)
                            arx1 += 1;
                            arx2 += 5;
                            attr = CONSTANTS.ARPORT_StartOnLeft + CONSTANTS.ARPORT_EndOnLeft;
                        }else {//Closer to the right (vertical)
                            arx1 -= 5;
                            arx2 -= 1;
                            attr = CONSTANTS.ARPORT_StartOnRight + CONSTANTS.ARPORT_EndOnRight;
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

                    if( rightAngle >= a1 && rightAngle <= a2 ){
                        attr += CONSTANTS.ARPORT_StartOnRight + CONSTANTS.ARPORT_EndOnRight;
                    }

                    if( topAngle >= a1 && topAngle <= a2 ){
                        attr += CONSTANTS.ARPORT_StartOnTop + CONSTANTS.ARPORT_EndOnTop;
                    }

                    if( leftAngle >= a1 && leftAngle <= a2 ){
                        attr += CONSTANTS.ARPORT_StartOnLeft + CONSTANTS.ARPORT_EndOnLeft;
                    }

                    if( bottomAngle >= a1 && bottomAngle <= a2 ){
                        attr += CONSTANTS.ARPORT_StartOnBottom + CONSTANTS.ARPORT_EndOnBottom;
                    }
                }

            }else if(typeof connArea[j] === "string") //Using words to designate connection area
            {
                r = new ArRect(x1 + 1, y1 + 1, x2 - 1, y2 - 1);
                //connArea[j] = connArea[j].toLowerCase();
                attr = (connArea[j].indexOf("top") !== -1 ?
                        //Connection area is on top
                        (( j % 2 === 0 ? CONSTANTS.ARPORT_StartOnTop : 0) + (j < 2 ? CONSTANTS.ARPORT_EndOnTop : 0)) : 0) +
                    //Connection area is on bottom
                    (connArea[j].indexOf("bottom") !== -1 ?
                     (( j % 2 === 0 ? CONSTANTS.ARPORT_StartOnBottom : 0) + (j < 2 ? CONSTANTS.ARPORT_EndOnBottom : 0)) : 0) +
                    //Connection area is on left
                    (connArea[j].indexOf("left") !== -1 ?
                     (( j % 2 === 0 ? CONSTANTS.ARPORT_StartOnLeft : 0) + (j < 2 ? CONSTANTS.ARPORT_EndOnLeft : 0)) : 0) +
                    //Connection area is on right
                    (connArea[j].indexOf("right") !== -1 ?
                     (( j % 2 === 0 ? CONSTANTS.ARPORT_StartOnRight : 0) + (j < 2 ? CONSTANTS.ARPORT_EndOnRight : 0)) : 0) ||
                    (connArea[j].indexOf("all") !== -1 ? CONSTANTS.ARPORT_ConnectOnAll : 0) ;

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
        if( !a.src || !a.dst){
            throw "AutoRouter:_createPath missing source or destination";
        }

        var id = a.id,
            autoroute = a.autoroute || true,
            startDir = a.startDirection || a.start,
            endDir = a.endDirection || a.end,
            src = [], 
            dst = [],
            path,
            i;

        for(i in a.src){
            if(a.src.hasOwnProperty(i)){
                src.push(a.src[i]);
            }
        }
        for(i in a.dst){
            if(a.dst.hasOwnProperty(i)){
                dst.push(a.dst[i]);
            }
        }

        assert(src instanceof AutoRouterPort || src instanceof Array || src.ports[0] instanceof AutoRouterPort, "AutoRouter:_createPath: src is not recognized as an AutoRouterPort");
        assert(dst instanceof AutoRouterPort || dst instanceof Array || dst.ports[0] instanceof AutoRouterPort, "AutoRouter:_createPath: dst is not recognized as an AutoRouterPort");
        path = this.router.addPath(autoroute, src, dst);

        if(startDir || endDir){ 
            var start = startDir !== undefined ? (startDir.indexOf("top") !== -1 ? CONSTANTS.ARPATH_StartOnTop : 0) +
                (startDir.indexOf("bottom") !== -1 ? CONSTANTS.ARPATH_StartOnBottom : 0) +
                (startDir.indexOf("left") !== -1 ? CONSTANTS.ARPATH_StartOnLeft : 0) +
                (startDir.indexOf("right") !== -1 ? CONSTANTS.ARPATH_StartOnRight : 0) ||
                (startDir.indexOf("all") !== -1 ? CONSTANTS.ARPATH_Default : 0) : CONSTANTS.ARPATH_Default ;
            var end = endDir !== undefined ? (endDir.indexOf("top") !== -1 ? CONSTANTS.ARPATH_EndOnTop : 0) +
                (endDir.indexOf("bottom") !== -1 ? CONSTANTS.ARPATH_EndOnBottom : 0) +
                (endDir.indexOf("left") !== -1 ? CONSTANTS.ARPATH_EndOnLeft : 0) +
                (endDir.indexOf("right") !== -1 ? CONSTANTS.ARPATH_EndOnRight : 0) ||
                (endDir.indexOf("all") !== -1 ? CONSTANTS.ARPATH_Default : 0) : CONSTANTS.ARPATH_Default;

            path.setStartDir(start); 
            path.setEndDir(end);
        }else{
            path.setStartDir(CONSTANTS.ARPATH_Default); //CONSTANTS.ARPATH_StartOnLeft);
            path.setEndDir(CONSTANTS.ARPATH_Default);
        }

        var pathData = new ArPathMap(id, path, a.src, a.dst);
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

        }else{
            throw "AutoRouter:remove Unrecognized item type. Must be an AutoRouterBox or an AutoRouterPath ID";
        }
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
        if( path === undefined ){
            throw "AutoRouter: Need to have an AutoRouterPath type to set custom path points";
        }

        if( args.points.length > 0 ){
            path.setAutoRouting( false );
        } else {
            path.setAutoRouting( true );
        }

        //Convert args.points to array of [ArPoint] 's
        while ( i < args.points.length ){
            points.push(new CustomPathData( args.points[i][0], args.points[i][1] ));
            ++i;
        }

        path.setCustomPathData( points );

    };

    return AutoRouter;

});
