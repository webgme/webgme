"use strict";

define(['logManager', './AutoRouter'], function (logManager, AutoRouter) {

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

        this.logger.debug("ConnectionRouteManager3 ctor finished");
    };

    ConnectionRouteManager3.prototype.initialize = function () {
    };

    ConnectionRouteManager3.prototype.destroy = function () {
    };

    ConnectionRouteManager3.prototype.redrawConnections = function (idList) {
        var i;

        this.logger.debug('Redraw connection request: ' + idList.length);

        //no matter what, we want to reroute all the connections
        //not just the ones that explicitly needs rerouting
        idList = this.diagramDesigner.connectionIds.slice(0);

        //Define container that will map obj+subID -> box
        this._autorouterBoxes = {};
        this._autorouterPath = {};

        i = idList.length;

        //0 - clear out autorouter
        this.autorouter.clear();

        //1 - update all the connection endpoint connectable area information
        this._updateEndpointInfo(idList);

        //2 - we have each connection end connectability info
        //find the closest areas for each connection
        while (i--) {
            this._updateConnectionCoordinates(idList[i]);
        }


        //3 autoroute
        this.autorouter.autoroute();

        //4 - Get the path points and redraw
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

        //console.log("Time between redrawing connections: " + ((new Date()).getTime() - this._lastRedraw)/1000);

        //need to return the IDs of the connections that was really
        //redrawn or any other visual property chenged (width, etc)
        this._lastRedraw = (new Date()).getTime();
        return idList;
    };

    ConnectionRouteManager3.prototype._updateEndpointInfo = function (idList) {
        var i = idList.length,
            connId,
            canvas = this.diagramDesigner,
            srcObjId,
            srcSubCompId,
            dstObjId,
            dstSubCompId,
            connectionMetaInfo;

        this.endpointConnectionAreaInfo = {};

        //first update the available connection endpoint coordinates
        while(i--) {
            connId = idList[i];
            srcObjId = canvas.connectionEndIDs[connId].srcObjId;
            srcSubCompId = canvas.connectionEndIDs[connId].srcSubCompId;
            dstObjId = canvas.connectionEndIDs[connId].dstObjId;
            dstSubCompId = canvas.connectionEndIDs[connId].dstSubCompId;

            connectionMetaInfo = canvas.items[connId].getMetaInfo();

            this._getEndpointConnectionAreas(srcObjId, srcSubCompId, false, connectionMetaInfo);
            this._getEndpointConnectionAreas(dstObjId, dstSubCompId, true, connectionMetaInfo);
        }
    };

    ConnectionRouteManager3.prototype._getEndpointConnectionAreas = function (objId, subCompId, isEnd, connectionMetaInfo) {
        var longid = subCompId ? objId + DESIGNERITEM_SUBCOMPONENT_SEPARATOR + subCompId : objId,
            res,
            canvas = this.diagramDesigner,
            j,
            designerItem,
            boxdefinition = {};

        if (this.endpointConnectionAreaInfo.hasOwnProperty(longid) === false) {

            this.endpointConnectionAreaInfo[longid] = [];

            if (subCompId === undefined ||
                (subCompId !== undefined && this.diagramDesigner._itemSubcomponentsMap[objId] && this.diagramDesigner._itemSubcomponentsMap[objId].indexOf(subCompId) !== -1)) {

                designerItem = canvas.items[objId];
                res = designerItem.getConnectionAreas(subCompId, isEnd, connectionMetaInfo) || [];
//Autorouter here
                var bBox = canvas.items[objId].getBoundingBox();
                boxdefinition = {
                                //BOX
                                    "x1": bBox.x,
                                    "y1": bBox.y,
                                    "x2": bBox.x2,
                                    "y2": bBox.y2,

                                //PORTS
                                    "ConnectionAreas": []
                                        };

                j = res.length;
                while (j--) {
                    //Building up the ConnectionAreas object
                    boxdefinition.ConnectionAreas.push([ [ res[j].x1, res[j].y1 ], [ res[j].x2, res[j].y2 ] ]);
                }

                //Box def built
                this._autorouterBoxes[longid] = this.autorouter.addBox(boxdefinition);


            }
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
        this._autorouterPath[connectionId] = this.autorouter.addPath({ "src": this._autorouterBoxes[sId].ports[sIndex],
                                                                       "dst": this._autorouterBoxes[tId].ports[tIndex] });

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
