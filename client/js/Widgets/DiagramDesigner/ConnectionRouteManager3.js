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
        //Define container that will map obj+subID -> box
        this._autorouterBoxes = {};
        this._autorouterPorts = {}; //Maps boxIds to an array of port ids that have been mapped
        this._autorouterPath = {};
        this.autorouter.clear();

        //Adding event listeners
        var self = this;
        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ON_COMPONENT_UPDATE, function(_canvas, ID) {
            self.logger.warning("ON_COMPONENT_UPDATE: " + ID);
            //self.autorouter.setBox();
        });

        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ON_COMPONENT_CREATE, function(_canvas, ID) {
            self.logger.warning("Added Component: " + ID);
            self.insertItem( ID );
        });

        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ITEM_POSITION_CHANGED, function(_canvas, eventArgs) {
            if( !self._autorouterBoxes[eventArgs.ID] )
                self.insertItem( eventArgs.ID );
            self.autorouter.move(self._autorouterBoxes[eventArgs.ID].box, { "dx": eventArgs.x, "dy": eventArgs.y });
        });

        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ON_CLEAR, function(_canvas) {
            self.logger.warning("Clearing...");
            self._initializeGraph();
        });

    };

    ConnectionRouteManager3.prototype.redrawConnections = function (idList) {
        var i;

        this.logger.debug('Redraw connection request: ' + idList.length);

        this.profiler.clear();
        this.profiler.startProfile('redrawConnections');


        //no matter what, we want the id's of all the connections
        //not just the ones that explicitly needs rerouting
        idList = this.diagramDesigner.connectionIds.slice(0);

        i = idList.length;

        //0 - clear out autorouter
        //this.autorouter.clear();

        this.profiler.startProfile('_updateBoxesAndPorts');
        //1 - update all box information the connection endpoint connectable area information
        this._updateBoxesAndPorts(idList);
        this.profiler.endProfile('_updateBoxesAndPorts');

        this.profiler.startProfile('_updateConnectionCoordinates');
        //2 - we have each connection end connectability info
        //find the closest areas for each connection
        while (i--) {
            this._updateConnectionCoordinates(idList[i]);
        }
        this.profiler.endProfile('_updateConnectionCoordinates');


        //3 autoroute
        this.profiler.startProfile('autoroute');
        this.autorouter.autoroute();
        this.profiler.endProfile('autoroute');

        //4 - Get the path points and redraw
        this.profiler.startProfile('setConnectionRenderData');
        var pathPoints,
            realPathPoints;
        for (i = 0; i < idList.length; i += 1) {
            pathPoints = this.autorouter.getPathPoints(this._autorouterPath[idList[i]]);
            realPathPoints = [];
            for(var j = 0; j < pathPoints.length; j++){
                realPathPoints.push({'x': pathPoints[j][0], 'y': pathPoints[j][1] });
            }

            this.diagramDesigner.items[idList[i]].setConnectionRenderData(realPathPoints);
        }
        this.profiler.endProfile('setConnectionRenderData');

        //need to return the IDs of the connections that was really
        //redrawn or any other visual property chenged (width, etc)

        this.profiler.endProfile('redrawConnections');
        this.profiler.dump();

        return idList;
    };

    ConnectionRouteManager3.prototype._initializeGraph = function () {
        /*
         * In this method, we will update the boxes using the canvas.itemIds list and
         * add any ports as needed (from the canvas.connectionIds)
         */
        var canvas = this.diagramDesigner,
            connIdList = canvas.connectionIds,
            itemIdList = canvas.itemIds,
            i = itemIdList.length,
            connId,
            srcObjId,
            srcSubCompId,
            dstObjId,
            dstSubCompId;

        this.autorouter.clear();
        this._autorouterBoxes = {};
        this._autorouterPorts = {};
        this._autorouterPath = {};

        this.endpointConnectionAreaInfo = {};

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

    ConnectionRouteManager3.prototype.deleteItem = function (objId) {
        //TODO find a way to delete all the ports from the dictionary. 
        //If I can query them from the objId, I can clear the entries with that info
        var box = this._autorouterBoxes[objId],
            i = this._autorouterPorts[objId].length;

        while( i-- ){
            var id = objId + DESIGNERITEM_SUBCOMPONENT_SEPARATOR + this._autorouterPorts[objId][i]; //ID of child port
            this._autorouterBoxes[id] = undefined;
        }

        this.autorouter.remove(box);
        this._autorouterBoxes[objId] = undefined;

        this._autorouterBoxes[itemIdList[i]] = this.autorouter.addBox(boxdefinition);
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
        if(this._autorouterPath[connectionId] === undefined){
            this._autorouterPath[connectionId] = this.autorouter.addPath({ "src": this._autorouterBoxes[sId].ports[sIndex],
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
