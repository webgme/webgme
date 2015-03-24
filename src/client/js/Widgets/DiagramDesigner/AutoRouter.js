/*globals define*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * @author brollb / https:// github/brollb
 */

define(['common/LogManager',
           'common/util/assert',
           './AutoRouter.Constants',
           './AutoRouter.Utils',
           './AutoRouter.Point',
           './AutoRouter.Rect',
           './AutoRouter.Graph',
           './AutoRouter.Box',
           './AutoRouter.Port',
           './AutoRouter.Path',
           './AutoRouter.CustomPathData'],
       function (logManager, 
                 assert, 
                 CONSTANTS, 
                 Utils, 
                 ArPoint, 
                 ArRect, 
                 AutoRouterGraph, 
                 AutoRouterBox, 
                 AutoRouterPort,
                 AutoRouterPath,
                 CustomPathData) {

    'use strict'; 

    var _logger = logManager.create('AutoRouter');

    var AutoRouter = function() {
       this.paths = {};
       this.ports = {};
       this.pCount = 0;  // A not decrementing count of paths for unique path id's
       this.portId2Path = {};
       this.portId2Box = {};

       this.graph = new AutoRouterGraph();
    };

    var ArBoxObject = function(b, p) {
        // Stores a box with ports used to connect to the box
        this.box = b;
        this.ports = p || {};
    };

    AutoRouter.prototype.clear = function() {
        this.graph.deleteAll(true);
        this.paths = {};
        this.portId2Path = {};
        this.ports = {};
    };

    AutoRouter.prototype.destroy = function() {
        this.graph.destroy();
        this.graph = null;
    };

    AutoRouter.prototype._createBox = function(size) {
        var x1 = size.x1 !== undefined ? size.x1 : (size.x2 - size.width),
            x2 = size.x2 !== undefined ? size.x2 : (size.x1 + size.width),
            y1 = size.y1 !== undefined ? size.y1 : (size.y2 - size.height),
            y2 = size.y2 !== undefined ? size.y2 : (size.y1 + size.height),
            box = this.graph.createBox(),
            rect = new ArRect(x1, y1, x2, y2);

        assert(x1 !== undefined && x2 !== undefined && y1 !== undefined && y2 !== undefined,
            'Missing size info for box');

        // Make sure the rect is at least 3x3
        var height = rect.getHeight(), 
            width = rect.getWidth(),
            dx = Math.max((3-width)/2, 0),
            dy = Math.max((3-height)/2, 0);

        rect.inflateRect(dx, dy);

        box.setRect(rect);
        return box;
    };

    AutoRouter.prototype.addBox = function(size) {
        var box = this._createBox(size),
            portsInfo = size.ports || {},
            boxObject;

        boxObject = new ArBoxObject(box);
        this.graph.addBox(box);

        // Adding each port
        var portIds = Object.keys(portsInfo);
        for (var i = portIds.length; i--;) {
            this.addPort(boxObject, portsInfo[portIds[i]]);
        }

        this.portId2Path[box.id] = {in: [], out: []};

        return boxObject;
    };

    AutoRouter.prototype.addPort = function(boxObject, portInfo) {
        // Adding a port to an already existing box (also called in addBox method)
        // Default is no connection ports (more relevant when creating a box)
        var box = boxObject.box,
            port,
            container,
            rect;

        // A connection area is specified
        /*
         *  Multiple connections specified
         *    [ [ [x1, y1], [x2, y2] ], ... ]
         *
         * I will make them all 'multiple' connections
         *  then handle them the same
         *
         */

        port = this._createPort(portInfo, box);

        // Add port entry to portId2Path dictionary
        var id = this.getPortId(portInfo.id, boxObject);
        port.id = id;
        this.portId2Path[id] = {in: [], out: []};
        this.ports[id] = port;

        // Create child box
        rect = new ArRect(port.rect);
        rect.inflateRect(3);
        container = this._createBox({x1: rect.left,
                                     x2: rect.right,
                                     y1: rect.ceil,
                                     y2: rect.floor});
        box.addChild(container);

        // add port to child box
        container.addPort(port);

        boxObject.ports[port.id] = port;

        // Record the port2box mapping
        this.portId2Box[port.id] = boxObject;
        this.graph.addBox(container);

        return port;
    };

    AutoRouter.prototype.getPortId = function(id, box) {
        var SPLITTER = '__',
            boxObject = this.portId2Box[id] || box,
            boxObjectId = boxObject.box.id,
            uniqueId = boxObjectId + SPLITTER + id;

        assert(id.toString, 'Invalid Port Id! (' + id +')');
        id = id.toString();
        if (id.indexOf(boxObjectId+SPLITTER) !== -1) {  // Assume id is already absolute id
            return id;
        }

        return uniqueId;
    };

    AutoRouter.prototype._createPort = function (connData, box) {
        var angles = connData.angles || [], // Incoming angles. If defined, it will set attr at the end
            attr = 0, // Set by angles. Defaults to guessing by location if angles undefined
            type = 'any', // Specify start, end, or any
            port = box.createPort(),
            rect = box.rect,
            connArea = connData.area;

        var isStart = 17,
            arx1,
            arx2,
            ary1,
            ary2;

        var _x1,
            _x2,
            _y1,
            _y2,
            horizontal;

        var r;

        var a1, // min angle
            a2, // max angle
            rightAngle = 0,
            bottomAngle = 90,
            leftAngle = 180,
            topAngle = 270;

        if(connArea instanceof Array) {
            isStart = 17;

            // This gives us a coefficient to multiply our attributes by to govern incoming
            // or outgoing connection. Now, the port needs only to determine the direction
            if(type !== 'any') {
                isStart -= (type === 'start' ? 1 : 16);
            }

            // using points to designate the connection area: [ [x1, y1], [x2, y2] ]
            _x1 = Math.min(connArea[0][0], connArea[1][0]);
            _x2 = Math.max(connArea[0][0], connArea[1][0]);
            _y1 = Math.min(connArea[0][1], connArea[1][1]);
            _y2 = Math.max(connArea[0][1], connArea[1][1]);
            horizontal = _y1 === _y2;

            // If it is a single point of connection, we will expand it to a rect
            // We will determine that it is horizontal by if it is closer to a horizontal edges
            // or the vertical edges
            if (_y1 === _y2 && _x1 === _x2) {
                horizontal =  Math.min(Math.abs(rect.ceil - _y1), Math.abs(rect.floor - _y2)) <
                    Math.min(Math.abs(rect.left - _x1), Math.abs(rect.right - _x2)) ;
                if(horizontal) {
                    _x1 -= 1;
                    _x2 += 1;
                } else {
                    _y1 -= 1;
                    _y2 += 1;
                }
            }

            assert(horizontal || _x1 === _x2, 
                   'AutoRouter:addBox Connection Area for box must be either horizontal or vertical');

            arx1 = _x1;
            arx2 = _x2;
            ary1 = _y1;
            ary2 = _y2;

            if (horizontal) {
                if(Math.abs(_y1 - rect.ceil) < Math.abs(_y1 - rect.floor)) { // Closer to the top (horizontal)
                    ary1 = _y1 + 1;
                    ary2 = _y1 + 5;
                    attr = CONSTANTS.PortStartOnTop + CONSTANTS.PortEndOnTop;
                } else { // Closer to the top (horizontal)
                    ary1 = _y1 - 5;
                    ary2 = _y1 - 1;
                    attr = CONSTANTS.PortStartOnBottom + CONSTANTS.PortEndOnBottom;
                }

            } else {
                if(Math.abs(_x1 - rect.left) < Math.abs(_x1 - rect.right)) {// Closer to the left (vertical)
                    arx1 += 1;
                    arx2 += 5;
                    attr = CONSTANTS.PortStartOnLeft + CONSTANTS.PortEndOnLeft;
                } else {// Closer to the right (vertical)
                    arx1 -= 5;
                    arx2 -= 1;
                    attr = CONSTANTS.PortStartOnRight + CONSTANTS.PortEndOnRight;
                }
            }

        }
        // Check to make sure the width/height is at least 3 -> otherwise assert will fail in ARPort.setRect
        if (arx2 - arx1 < 3) {
            arx1 -= 2;
            arx2 += 2;
        }
        // Check to make sure the width/height is at least 3 -> otherwise assert will fail in ARPort.setRect
        if (ary2 - ary1 < 3) {
            ary1 -= 2;
            ary2 += 2;
        }

        r = new ArRect(arx1, ary1, arx2, ary2);

        // If 'angles' is defined, I will use it to set attr
        if (angles[0] !== undefined && angles[1] !== undefined) {
            a1 = angles[0]; // min angle
            a2 = angles[1]; // max angle

            attr = 0; // Throw away our guess of attr

            if (rightAngle >= a1 && rightAngle <= a2) {
                attr += CONSTANTS.PortStartOnRight + CONSTANTS.PortEndOnRight;
            }

            if(topAngle >= a1 && topAngle <= a2) {
                attr += CONSTANTS.PortStartOnTop + CONSTANTS.PortEndOnTop;
            }

            if(leftAngle >= a1 && leftAngle <= a2) {
                attr += CONSTANTS.PortStartOnLeft + CONSTANTS.PortEndOnLeft;
            }

            if(bottomAngle >= a1 && bottomAngle <= a2) {
                attr += CONSTANTS.PortStartOnBottom + CONSTANTS.PortEndOnBottom;
            }
        }

        port.setLimitedDirs(false);
        port.attributes = attr;
        port.setRect(r);

        return port;
    };

    /**
     * Convenience method to modify port in paths (as both start and end port)
     *
     * @param port
     * @param action
     * @return {undefined}
     */
    AutoRouter.prototype._removePortsMatching = function(port) {
        var id = port.id,
            startPaths = this.portId2Path[id].out,
            endPaths = this.portId2Path[id].in,
            i;

        var paths = '';
        for (i = startPaths.length; i--;) {
            assert(Utils.removeFromArrays(port, startPaths[i].startports),
                   'Port '+port.id+' not removed from startports');
            paths += startPaths[i].id + ', ';
        }

        paths = '';
        for (i = endPaths.length; i--;) {
            assert(Utils.removeFromArrays(port, endPaths[i].endports),
                   'Port '+port.id+' not removed from endports');
            paths += endPaths[i].id + ', ';
        }

        // Check every path to see that it has no port with tmpId
        for (i = this.graph.paths.length; i--;) {
            assert(this.graph.paths[i].startports.indexOf(port) === -1, 
                   'port not removed from path startports! ('+this.graph.paths[i].id+')');
            assert(this.graph.paths[i].endports.indexOf(port) === -1, 
                   'port not removed from path endports!');
        }

    };

    AutoRouter.prototype.removePort = function(port) {
        // Remove port and parent box!
        var container = port.owner,
            id = port.id;

        assert(container.parent, 'Port container should have a parent box!');
        this.graph.deleteBox(container);

        // update the paths
        this._removePortsMatching(port);

        // remove port from ArBoxObject
        var boxObject = this.portId2Box[id];

        assert(boxObject !== undefined, 'Box Object not found for port ('+id+')!');
        delete boxObject.ports[id];

        // Clean up the port records
        this.ports[id] = undefined;
        this.portId2Path[id] = undefined;
        this.portId2Box[id] = undefined;

    };

    AutoRouter.prototype.addPath = function(params) {
        // Assign a pathId to the path (return this id).
        // If there is only one possible path connection, create the path.
        // if not, store the path info in the pathsToResolve array
        var pathId = (this.pCount++).toString();

        // Generate pathId
        while(pathId.length < 6) {
            pathId = '0' + pathId;
        }
        pathId = 'PATH_' + pathId;

        params.id = pathId;
        this._createPath(params);

        return pathId;
    };

    /**
     * Convert either a port or Hashmap of ports to an
     * array of AutoRouterPorts
     *
     * @param port
     * @return {Array} Array of AutoRouterPorts
     */
    var unpackPortInfo = function(port) {
        var ports = [];

        if (port instanceof AutoRouterPort) {
            ports.push(port);
        } else {
            var ids = Object.keys(port);
            for(var i = ids.length; i--;) {
                assert(port[ids[i]] instanceof AutoRouterPort, 'Invalid port option: ' + port[i]);
                ports.push(port[ids[i]]);
            }
        }

        assert(ports.length > 0, 'Did not receive valid start or end ports');
        return ports;
    };

    AutoRouter.prototype._createPath = function(params) {
        if(!params.src || !params.dst) {
            throw 'AutoRouter:_createPath missing source or destination ports';
        }

        var id = params.id,
            autoroute = params.autoroute || true,
            startDir = params.startDirection || params.start,
            endDir = params.endDirection || params.end,
            srcPorts, 
            dstPorts,
            path,
            i;

        srcPorts = unpackPortInfo(params.src);
        dstPorts = unpackPortInfo(params.dst);

        path = this.graph.addPath(autoroute, srcPorts, dstPorts);

        if (startDir || endDir) { 
            var start = startDir !== undefined ? (startDir.indexOf('top') !== -1 ? CONSTANTS.PathStartOnTop : 0) +
                (startDir.indexOf('bottom') !== -1 ? CONSTANTS.PathStartOnBottom : 0) +
                (startDir.indexOf('left') !== -1 ? CONSTANTS.PathStartOnLeft : 0) +
                (startDir.indexOf('right') !== -1 ? CONSTANTS.PathStartOnRight : 0) ||
                (startDir.indexOf('all') !== -1 ? CONSTANTS.PathDefault : 0) : CONSTANTS.PathDefault ;
            var end = endDir !== undefined ? (endDir.indexOf('top') !== -1 ? CONSTANTS.PathEndOnTop : 0) +
                (endDir.indexOf('bottom') !== -1 ? CONSTANTS.PathEndOnBottom : 0) +
                (endDir.indexOf('left') !== -1 ? CONSTANTS.PathEndOnLeft : 0) +
                (endDir.indexOf('right') !== -1 ? CONSTANTS.PathEndOnRight : 0) ||
                (endDir.indexOf('all') !== -1 ? CONSTANTS.PathDefault : 0) : CONSTANTS.PathDefault;

            path.setStartDir(start); 
            path.setEndDir(end);
        }else{
            path.setStartDir(CONSTANTS.PathDefault);
            path.setEndDir(CONSTANTS.PathDefault);
        }

        path.id = id;
        this.paths[id] = path;

        // Register the path under box id
        // Id the ports and register the paths with each port...
        for (i = srcPorts.length; i--;) {
            this.portId2Path[srcPorts[i].id].out.push(path);
        }
        for (i = dstPorts.length; i--;) {
            this.portId2Path[dstPorts[i].id].in.push(path);
        }
        return path;
    };

    AutoRouter.prototype.routeSync = function() { 
        this.graph.routeSync();
    };

    AutoRouter.prototype.routeAsync = function(options) { 
        this.graph.routeAsync(options);
    };

    AutoRouter.prototype.getPathPoints = function(pathId) {
        assert(this.paths[pathId] !== undefined, 
               'AutoRouter:getPath requested path does not match any current paths');
        var path = this.paths[pathId],
            points = path.getPointList(),
            i = -1,
            res = [],
            pt;

        while(++i < points.length) {
            pt = [points[i].x, points[i].y];
            res.push(pt);
        }

        return res;
    };

    AutoRouter.prototype.setBoxRect = function(boxObject, size) {
        var box = boxObject.box,
            x1 = size.x1 !== undefined ? size.x1 : (size.x2 - size.width),
            x2 = size.x2 !== undefined ? size.x2 : (size.x1 + size.width),
            y1 = size.y1 !== undefined ? size.y1 : (size.y2 - size.height),
            y2 = size.y2 !== undefined ? size.y2 : (size.y1 + size.height),
            rect = new ArRect(x1, y1, x2, y2);

        this.graph.setBoxRect(box, rect);

    };

    AutoRouter.prototype._changePortId = function(oldId, newId) {
        this.ports[newId] = this.ports[oldId];
        this.portId2Path[newId] = this.portId2Path[oldId];
        this.portId2Box[newId] = this.portId2Box[oldId];
        this.ports[newId].id = newId;

        this.ports[oldId] = undefined;
        this.portId2Path[oldId] = undefined;
        this.portId2Box[oldId] = undefined;
    };

    /**
     * Updates the port with the given id to 
     * match the parameters in portInfo
     *
     * @param {Object} portInfo
     * @return {undefined}
     */
    AutoRouter.prototype.updatePort = function(boxObject, portInfo) {
        // Remove owner box from graph
        var portId = this.getPortId(portInfo.id, boxObject),
            oldPort = this.ports[portId],
            tmpId = '##TEMP_ID##',
            incomingPaths = this.portId2Path[portId].in,
            outgoingPaths = this.portId2Path[portId].out,
            newPort;

        this._changePortId(portId, tmpId);
        newPort = this.addPort(boxObject, portInfo);

        // For all paths using this port, add the new port
        var path,
            i;

        for (i = outgoingPaths.length; i--;) {
            path = outgoingPaths[i];
            path.startports.push(newPort);
            this.graph.disconnect(path);
            this.portId2Path[portId].out.push(path);
        }

        for (i = incomingPaths.length; i--;) {
            path = incomingPaths[i];
            path.endports.push(newPort);
            this.graph.disconnect(path);
            this.portId2Path[portId].in.push(path);
        }

        this.removePort(oldPort);

        // update the boxObject
        boxObject.ports[portId] = newPort;

        return newPort;
    };

    AutoRouter.prototype.remove = function(item) {
        assert(item !== undefined, 'AutoRouter:remove Cannot remove undefined object');
        var i;

        if(item.box instanceof AutoRouterBox) {
            var ports = Object.keys(item.ports);
            for (i = ports.length; i--;) {
                this.portId2Path[ports[i]] = undefined;
            }

            this.graph.deleteBox(item.box);

        }else if(this.paths[item] !== undefined) {
            if(this.paths[item] instanceof AutoRouterPath) {
                var path,
                    srcId,
                    dstId,
                    index;

                // Remove path from all portId2Path entries
                path = this.paths[item];
                for (i = path.startports.length; i--;) {
                    srcId = path.startports[i].id;
                    index = this.portId2Path[srcId].out.indexOf(path);
                    this.portId2Path[srcId].out.splice(index, 1);
                }

                for (i = path.endports.length; i--;) {
                    dstId = path.endports[i].id;
                    index = this.portId2Path[dstId].in.indexOf(path);
                    this.portId2Path[dstId].in.splice(index, 1);
                }

                this.graph.deletePath(path); 
            }
            delete this.paths[item];  // Remove dictionary entry

        }else{
            throw 'AutoRouter:remove Unrecognized item type. Must be an AutoRouterBox or an AutoRouterPath ID';
        }
    };

    AutoRouter.prototype.move = function(box, details) {
        // Make sure details are in terms of dx, dy
        box = box instanceof AutoRouterBox ? box : box.box;
        var dx = details.dx !== undefined ? details.dx : Math.round(details.x - box.rect.left),
            dy = details.dy !== undefined ? details.dy : Math.round(details.y - box.rect.ceil);

        assert(box instanceof AutoRouterBox, 'AutoRouter:move First argument must be an AutoRouterBox or ArBoxObject');

        this.graph.shiftBoxBy(box, { 'cx': dx, 'cy': dy });
    };

    AutoRouter.prototype.setMinimumGap = function(min) {
        this.graph.setBuffer(Math.floor(min/2));
    };

    AutoRouter.prototype.setComponent = function(pBoxObj, chBoxObj) {
        var parent = pBoxObj.box,
            child = chBoxObj.box;

        parent.addChild(child);
    };

    AutoRouter.prototype.setPathCustomPoints = function(args) { // args.points = [ [x, y], [x2, y2], ... ]
        var path = this.paths[args.path],
            points = [],
            i = 0;
        if(path === undefined) {
            throw 'AutoRouter: Need to have an AutoRouterPath type to set custom path points';
        }

        if(args.points.length > 0) {
            path.setAutoRouting(false);
        } else {
            path.setAutoRouting(true);
        }

        // Convert args.points to array of [ArPoint] 's
        while (i < args.points.length) {
            points.push(new CustomPathData(args.points[i], args.points[i]));
            ++i;
        }

        path.setCustomPathData(points);

    };

    /**
     * Check that each path is registered under portId2Path for each start/end port.
     *
     * @return {undefined}
     */
    AutoRouter.prototype._assertPortId2PathIsValid = function() {
        var id,
            path,
            j;
        for (var i = this.graph.paths.length; i--;) {
            path = this.graph.paths[i];
            for (j = path.startports.length; j--;) {
                id = path.startports[j].id;
                assert(this.portId2Path[id].out.indexOf(path) !== -1,
                    'Port '+id+' is missing registered startport for ' + path.id);
            }

            for (j = path.endports.length; j--;) {
                id = path.endports[j].id;
                assert(this.portId2Path[id].in.indexOf(path) !== -1,
                    'Port '+id+' is missing registered endport for ' + path.id);
            }
        }
    };

    return AutoRouter;

});
