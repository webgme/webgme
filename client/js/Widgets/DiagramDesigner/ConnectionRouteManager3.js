"use strict";

define(['logManager', './AutoRouter', './Profiler'], function (logManager, AutoRouter, Profiler) {

    var ConnectionRouteManager3,
        DESIGNERITEM_SUBCOMPONENT_SEPARATOR = "_x_";

    ConnectionRouteManager3 = function (options) {
        this.logger = (options && options.logger) || logManager.create(((options && options.loggerName) || "ConnectionRouteManager3"));

        this.diagramDesigner = options ? options.diagramDesigner : null;

        if (this.diagramDesigner === undefined || this.diagramDesigner === null) {
            this.logger.error("Trying to initialize a ConnectionRouteManager3 without a canvas...");
            throw ("ConnectionRouteManager3 can not be created");
        }

        this.autorouter = new AutoRouter();

        this.profiler = new Profiler('AutoRouter');

        this.logger.debug("ConnectionRouteManager3 ctor finished");
    };

    ConnectionRouteManager3.prototype.initialize = function () {
        this._clearGraph();

        //Adding event listeners
        var self = this;

/*
        this._onComponentUpdate = function(_canvas, ID) {//Boxes and lines
            //this.diagramDesigner.itemIds
            //this.diagramDesigner.connectionIds
            self.logger.warning("ON_COMPONENT_UPDATE: " + ID);
            //self.autorouter.setBox();
        };
        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ON_COMPONENT_UPDATE, this._onComponentUpdate);
*/

        this._onComponentCreate = function(_canvas, ID) {//Boxes and lines
            self.insertItem( ID );
        };
        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ON_COMPONENT_CREATE, this._onComponentCreate);

        this._onComponentResize = function(_canvas, ID) {//Boxes and lines
            if( self._autorouterBoxes[ID.ID] )
                self._resizeItem( ID.ID );
            else
                self.insertItem( ID.ID );
        };
        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ITEM_SIZE_CHANGED, this._onComponentResize);

        this._onComponentDelete = function(_canvas, ID) {//Boxes and lines
            self.deleteItem( ID );
        };
        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ON_COMPONENT_DELETE, this._onComponentDelete);
        //ON_UNREGISTER_SUBCOMPONENT

        this._onItemPositionChanged = function(_canvas, eventArgs) {
            if( self._autorouterBoxes[eventArgs.ID] )
                self.autorouter.move(self._autorouterBoxes[eventArgs.ID].box, { "x": eventArgs.x, "y": eventArgs.y });
        };
        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ITEM_POSITION_CHANGED, this._onItemPositionChanged);

        this._onClear = function(_canvas, eventArgs) {
            self.logger.warning("Clearing Screen");
            self._clearGraph();
        };
        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ON_CLEAR, this._onClear);

    };

    ConnectionRouteManager3.prototype.destroy = function () {
        //removeEventListener(eventName, handler);
        this.diagramDesigner.removeEventListener(this.diagramDesigner.events.ON_COMPONENT_CREATE, this._onComponentCreate);
        this.diagramDesigner.removeEventListener(this.diagramDesigner.events.ITEM_SIZE_CHANGED, this._onComponentResize);
        this.diagramDesigner.removeEventListener(this.diagramDesigner.events.ON_COMPONENT_DELETE, this._onComponentDelete);
        this.diagramDesigner.removeEventListener(this.diagramDesigner.events.ITEM_POSITION_CHANGED, this._onItemPositionChanged);
        this.diagramDesigner.removeEventListener(this.diagramDesigner.events.ON_CLEAR, this._onClear);
    };

    ConnectionRouteManager3.prototype.redrawConnections = function (idList) {
        var i;

        if( !this._initialized )
            this._initializeGraph();

        console.log('About to REDRAW');

        this.profiler.clear();
        this.profiler.startProfile('redrawConnections');


        //no matter what, we want the id's of all the connections
        //not just the ones that explicitly needs rerouting
        idList = this.diagramDesigner.connectionIds.slice(0);

        i = idList.length;

        this.profiler.startProfile('_updateConnectionCoordinates');
        //1 - we have each connection end connectability info
        //find the closest areas for each connection
        while (i--) {
            this._updateConnectionCoordinates(idList[i]);
        }
        this.profiler.endProfile('_updateConnectionCoordinates');


        //2 - autoroute
        this.profiler.startProfile('autoroute');
        this.autorouter.autoroute();
        this.profiler.endProfile('autoroute');

        //3 - Get the path points and redraw
        this.profiler.startProfile('setConnectionRenderData');
        var pathPoints,
            realPathPoints;
        for (i = 0; i < idList.length; i += 1) {
            pathPoints = this.autorouter.getPathPoints(this._autorouterPaths[idList[i]]);
            realPathPoints = [];
            for(var j = 0; j < pathPoints.length; j++){
                realPathPoints.push({'x': pathPoints[j][0], 'y': pathPoints[j][1] });
            }

            this.diagramDesigner.items[idList[i]].setConnectionRenderData(realPathPoints);
        }
        this.profiler.endProfile('setConnectionRenderData');

        //need to return the IDs of the connections that was really
        //redrawn or any other visual property changed (width, etc)

        this.profiler.endProfile('redrawConnections');
        this.profiler.dump();

        return idList;
    };

    ConnectionRouteManager3.prototype._clearGraph = function () {
        this.autorouter.clear();
        this._autorouterBoxes = {};//Define container that will map obj+subID -> box
        this._autorouterPorts = {};//Maps boxIds to an array of port ids that have been mapped
        this._autorouterPaths = {};
        this.endpointConnectionAreaInfo = {};

        this._initialized = false;
    };

    ConnectionRouteManager3.prototype._initializeGraph = function () {
        /*
         * In this method, we will update the boxes using the canvas.itemIds list and
         * add any ports as needed (from the canvas.connectionIds)
         */
        this.logger.warning("Initializing Screen");
        
        var canvas = this.diagramDesigner,
            connIdList = canvas.connectionIds,
            itemIdList = canvas.itemIds,
            i = itemIdList.length,
            connId,
            srcObjId,
            srcSubCompId,
            dstObjId,
            dstSubCompId;

        while(i--){
            this.insertItem(itemIdList[i]);
        }

        //Next, I will update the ports as necessary
        i = connIdList.length;
        while(i--){
            connId = connIdList[i];
            srcObjId = canvas.connectionEndIDs[connId].srcObjId;
            srcSubCompId = canvas.connectionEndIDs[connId].srcSubCompId;
            dstObjId = canvas.connectionEndIDs[connId].dstObjId;
            dstSubCompId = canvas.connectionEndIDs[connId].dstSubCompId;

            this._updatePort(srcObjId, srcSubCompId);
            this._updatePort(dstObjId, dstSubCompId);
        }

        this._initialized = true;

    };

    ConnectionRouteManager3.prototype._updateBoxesAndPorts = function () {
        var canvas = this.diagramDesigner,
            connIdList = canvas.connectionIds,
            itemIdList = canvas.itemIds,
            i = itemIdList.length,
            connId,
            srcObjId,
            srcSubCompId,
            dstObjId,
            dstSubCompId;

        this.endpointConnectionAreaInfo = {};

        //first, I will update the boxes as needed
        while(i--){

                if(this._autorouterBoxes[itemIdList[i]] === undefined){//Shouldn't need this when the insert event is implemented
                    this.insertItem(itemIdList[i]);
                }else{
                    var currBox = canvas.items[itemIdList[i]].getBoundingBox(),
                        oldBox = this._autorouterBoxes[itemIdList[i]].box.getRect(),
                        dx = currBox.x - oldBox.left,
                        dy = currBox.y - oldBox.ceil,
                        dw = (currBox.width) - (oldBox.getWidth()),
                        dh = (currBox.height) - (oldBox.getHeight());
                
                    //if(dw !== 0 || dh !== 0){
                        //this.autorouter.setBox(this._autorouterBoxes[itemIdList[i]].box, currBox);

//                    }else 
                    if(dx !== 0 || dy !== 0){
                        this.autorouter.router.shiftBoxBy(this._autorouterBoxes[itemIdList[i]].box, { "cx": dx, "cy": dy });
                    }
                }


        }

        //Next, I will update the ports as necessary
        i = connIdList.length;
        while(i--){
            connId = connIdList[i];
            srcObjId = canvas.connectionEndIDs[connId].srcObjId;
            srcSubCompId = canvas.connectionEndIDs[connId].srcSubCompId;
            dstObjId = canvas.connectionEndIDs[connId].dstObjId;
            dstSubCompId = canvas.connectionEndIDs[connId].dstSubCompId;

            this._updatePort(srcObjId, srcSubCompId);
            this._updatePort(dstObjId, dstSubCompId);
        }

    };

    ConnectionRouteManager3.prototype.insertItem = function (objId) {
        var canvas = this.diagramDesigner,
            designerItem,
            areas, //TODO change to create incoming and outgoing ports
            bBox,//TODO incorporate angle1, angle2
            boxdefinition,
            connectionMetaInfo,
            isEnd,
            j;

        designerItem = canvas.items[objId];
        bBox = designerItem.getBoundingBox();
        areas = designerItem.getConnectionAreas(objId, isEnd, connectionMetaInfo) || [];

        boxdefinition = {
            //BOX
            "x1": bBox.x,
            "y1": bBox.y,
            "x2": bBox.x2,
            "y2": bBox.y2,

            //PORTS
            "ConnectionAreas": []
        };

        j = areas.length;
        while (j--) {
            //Building up the ConnectionAreas object
            boxdefinition.ConnectionAreas.push([ [ areas[j].x1, areas[j].y1 ], [ areas[j].x2, areas[j].y2 ] ]);
        }

        this._autorouterBoxes[objId] = this.autorouter.addBox(boxdefinition);
    };

    ConnectionRouteManager3.prototype.deleteItem = function (objId) {//TODO Check if it is a Box or Connection
        //If I can query them from the objId, I can clear the entries with that info
        var item = this.diagramDesigner.items[objId],
            connIds = this.diagramDesigner.connectionIds,
            itemIds = this.diagramDesigner.itemIds;
        if(itemIds.indexOf(objId) !== -1){
            item = this._autorouterBoxes[objId];

            var i = this._autorouterPorts[objId] ? this._autorouterPorts[objId].length : 0;
            while( i-- ){
                var id = objId + DESIGNERITEM_SUBCOMPONENT_SEPARATOR + this._autorouterPorts[objId][i]; //ID of child port
                this._autorouterBoxes[id] = undefined;
            }

            this._autorouterBoxes[objId] = undefined;
        }else if(connIds.indexOf(objId) !== -1){
            //If objId is a connection
            item = this._autorouterPaths[objId];

        }
            this.autorouter.remove(item);

    };

    ConnectionRouteManager3.prototype._resizeItem = function (objId) {
        var canvas = this.diagramDesigner,
            isEnd = true, //TODO
            connectionMetaInfo,
            designerItem = canvas.items[objId],
            newCoord = designerItem.getBoundingBox(),
            newBox = { 'x1': newCoord.x, 
                       'x2': newCoord.x2, 
                       'y1': newCoord.y, 
                       'y2': newCoord.y2,
          'ConnectionAreas': [] },
            connAreas = designerItem.getConnectionAreas(objId, isEnd, connectionMetaInfo),
            portIds = this._autorouterPorts[objId],
            i;

        //Create the new box connection areas
        i = connAreas.length;
        while (i--) {
            //Building up the ConnectionAreas obiect
            newBox.ConnectionAreas.push([ [ connAreas[i].x1, connAreas[i].y1 ], [ connAreas[i].x2, connAreas[i].y2 ] ]);
        }

        //Update Box 
        this.autorouter.setBox(this._autorouterBoxes[objId], newBox);

        //Resize Ports Based on Connections
        i = portIds !== undefined ? portIds.length : 0;
        while( i-- ){
            this._updatePort( objId, portIds[i] );
        }

    };

    ConnectionRouteManager3.prototype._updatePort = function (objId, subCompId) {
        var longid = objId + DESIGNERITEM_SUBCOMPONENT_SEPARATOR + subCompId,
            canvas = this.diagramDesigner,
            connectionMetaInfo = null;

        this._autorouterPorts[objId] = this._autorouterPorts[objId] === undefined ? [] : this._autorouterPorts[objId];
        

        if( subCompId !== undefined && this._autorouterBoxes[longid] === undefined ){
        //Add ports to our list of _autorouterBoxes and add the port to the respective box (if undefined, of course)
            var parentBox = this._autorouterBoxes[objId].box,
                portdefinition = [],
                res = canvas.items[objId].getConnectionAreas(subCompId, true, connectionMetaInfo) || [],
                j = res.length;

        while (j--) {
            portdefinition.push([ [ res[j].x1, res[j].y1 ], [ res[j].x2, res[j].y2 ] ]);
        }
            this._autorouterBoxes[longid] = { "ports": this.autorouter.addPort(parentBox, portdefinition) };
            this._autorouterPorts[objId].push(subCompId);
        }
     };

    ConnectionRouteManager3.prototype._updateConnectionCoordinates = function (connectionId) {
        var canvas = this.diagramDesigner,
            srcObjId = canvas.connectionEndIDs[connectionId].srcObjId,
            srcSubCompId = canvas.connectionEndIDs[connectionId].srcSubCompId,
            dstObjId = canvas.connectionEndIDs[connectionId].dstObjId,
            dstSubCompId = canvas.connectionEndIDs[connectionId].dstSubCompId,
            sId = srcSubCompId ? srcObjId + DESIGNERITEM_SUBCOMPONENT_SEPARATOR + srcSubCompId : srcObjId,
            tId = dstSubCompId ? dstObjId + DESIGNERITEM_SUBCOMPONENT_SEPARATOR + dstSubCompId : dstObjId,
            segmentPoints = canvas.items[connectionId].segmentPoints,
            sourceConnectionPoints = [], //this._autorouterBoxes[sId].ports, //this.endpointConnectionAreaInfo[sId] || [],
            targetConnectionPoints = [], //this._autorouterBoxes[tId].ports, //this.endpointConnectionAreaInfo[tId] || [],
            sourceCoordinates = null,
            targetCoordinates = null,
            closestConnPoints,
            connectionPathPoints = [],
            len,
            i,
            sIndex,
            tIndex;

            for(i = 0; i < this._autorouterBoxes[sId].ports.length; i++){
                sourceConnectionPoints.push(this._autorouterBoxes[sId].ports[i].getRect().getCenter());
            }
            for(i = 0; i < this._autorouterBoxes[tId].ports.length; i++){
                targetConnectionPoints.push(this._autorouterBoxes[tId].ports[i].getRect().getCenter());
            }




        if (sourceConnectionPoints.length > 0 && targetConnectionPoints.length > 0) {

            if (srcObjId === dstObjId && srcSubCompId === dstSubCompId) {
                //connection's source and destination is the same object/port
                sIndex = 0;
                tIndex = targetConnectionPoints.length > 1 ? 1 : 0;

            } else {
                closestConnPoints = this._getClosestPoints(sourceConnectionPoints, targetConnectionPoints, segmentPoints);
                sIndex = closestConnPoints[0];
                tIndex = closestConnPoints[1];
            }

        }


        //Create the path
        if(this._autorouterPaths[connectionId] === undefined){
            this._autorouterPaths[connectionId] = this.autorouter.addPath({ "src": this._autorouterBoxes[sId].ports[sIndex],
                                                                           "dst": this._autorouterBoxes[tId].ports[tIndex] });
        }

    };

    //figure out the shortest side to choose between the two
    ConnectionRouteManager3.prototype._getClosestPoints = function (srcConnectionPoints, tgtConnectionPoints, segmentPoints) {
        var i,
            j,
            dx,
            dy,
            srcP,
            tgtP,
            minLength = -1,
            cLength;

        if (segmentPoints && segmentPoints.length > 0) {
            for (i = 0; i < srcConnectionPoints.length; i += 1) {
                for (j = 0; j < tgtConnectionPoints.length; j += 1) {
                    dx = { "src": Math.abs(srcConnectionPoints[i].x - segmentPoints[0][1]),
                        "tgt": Math.abs(tgtConnectionPoints[j].x - segmentPoints[segmentPoints.length - 1][0])};

                    dy =  { "src": Math.abs(srcConnectionPoints[i].y - segmentPoints[0][1]),
                        "tgt": Math.abs(tgtConnectionPoints[j].y - segmentPoints[segmentPoints.length - 1][1])};

                    cLength = Math.sqrt(dx.src * dx.src + dy.src * dy.src) + Math.sqrt(dx.tgt * dx.tgt + dy.tgt * dy.tgt);

                    if (minLength === -1 || minLength > cLength) {
                        minLength = cLength;
                        srcP = i;
                        tgtP = j;
                    }
                }
            }
        } else {
            for (i = 0; i < srcConnectionPoints.length; i += 1) {
                for (j = 0; j < tgtConnectionPoints.length; j += 1) {
                    dx = Math.abs(srcConnectionPoints[i].x - tgtConnectionPoints[j].x);
                    dy = Math.abs(srcConnectionPoints[i].y - tgtConnectionPoints[j].y);

                    cLength = Math.sqrt(dx * dx + dy * dy);

                    if (minLength === -1 || minLength > cLength) {
                        minLength = cLength;
                        srcP = i;
                        tgtP = j;
                    }
                }
            }
        }

        return [srcP, tgtP];
    };

    return ConnectionRouteManager3;
});
