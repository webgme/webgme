"use strict";

define(['logManager'], function (logManager) {

    var ConnectionRouteManagerBasic,
        DESIGNERITEM_SUBCOMPONENT_SEPARATOR = "_x_";

    ConnectionRouteManagerBasic = function (options) {
        this.logger = (options && options.logger) || logManager.create(((options && options.loggerName) || "ConnectionRouteManagerBasic"));

        this.canvas = options ? options.canvas : null;

        if (this.canvas === undefined || this.canvas === null) {
            this.logger.error("Trying to initialize a ConnectionRouteManagerBasic without a canvas...");
            throw ("ConnectionRouteManagerBasic can not be created");
        }

        this.logger.debug("ConnectionRouteManagerBasic ctor finished");
    };

    ConnectionRouteManagerBasic.prototype.initialize = function () {
    };

    ConnectionRouteManagerBasic.prototype.redrawConnections = function (idList) {
        var i = idList.length;

        this.endpointConnectionAreaInfo = {};
        this.endpointConnectionAreaConnectionInfo = {};
        this.connectionEndPoints = {};

        //1 - update all the connection endpoint connectable area information
        this._updateEndpointInfo(idList);

        //2 - we have each connection end connectability info
        //figure out the exact connection endpoints for each connection
        while (i--) {
            this._calculateClosestEndpoints(idList[i]);
        }

        //3 - calculate the connection path informations
        i = idList.length;
        while (i--) {
            this._updateConnectionCoordinates(idList[i]);
        }

        //need to return the IDs of the connections that was really
        //redrawn or any other visual property chenged (width, etc)
        return idList;
    };

    ConnectionRouteManagerBasic.prototype._updateEndpointInfo = function (idList) {
        var i = idList.length,
            connId,
            canvas = this.canvas,
            srcObjId,
            srcSubCompId,
            dstObjId,
            dstSubCompId;

        //first update the available connection endpoint coordinates
        while(i--) {
            connId = idList[i];
            srcObjId = canvas.connectionEndIDs[connId].srcObjId;
            srcSubCompId = canvas.connectionEndIDs[connId].srcSubCompId;
            dstObjId = canvas.connectionEndIDs[connId].dstObjId;
            dstSubCompId = canvas.connectionEndIDs[connId].dstSubCompId;

            this._getEndpointConnectionAreas(srcObjId, srcSubCompId);
            this._getEndpointConnectionAreas(dstObjId, dstSubCompId);
        }
    };

    ConnectionRouteManagerBasic.prototype._getEndpointConnectionAreas = function (objId, subCompId) {
        var longid = subCompId ? objId + DESIGNERITEM_SUBCOMPONENT_SEPARATOR + subCompId : objId,
            res,
            canvas = this.canvas,
            j,
            designerItem;

        if (this.endpointConnectionAreaInfo.hasOwnProperty(longid) === false) {
            designerItem = canvas.items[objId];
            res = designerItem.getConnectionAreas(subCompId) || [];

            this.endpointConnectionAreaInfo[longid] = [];
            this.endpointConnectionAreaConnectionInfo[longid] = {};

            j = res.length;
            while (j--) {
                this.endpointConnectionAreaInfo[longid][res[j].id] = {"x": res[j].x + designerItem.positionX,
                    "y": res[j].y + designerItem.positionY,
                    "w": res[j].w,
                    "h": res[j].h,
                    "orientation": res[j].orientation,
                    "len": res[j].len || 0,
                    "id": res[j].id};

                this.endpointConnectionAreaConnectionInfo[longid][res[j].id] = 0;
            }
        }
    };

    ConnectionRouteManagerBasic.prototype._calculateClosestEndpoints = function (connectionId) {
        var canvas = this.canvas,
            srcObjId = canvas.connectionEndIDs[connectionId].srcObjId,
            srcSubCompId = canvas.connectionEndIDs[connectionId].srcSubCompId,
            dstObjId = canvas.connectionEndIDs[connectionId].dstObjId,
            dstSubCompId = canvas.connectionEndIDs[connectionId].dstSubCompId,
            sId = srcSubCompId ? srcObjId + DESIGNERITEM_SUBCOMPONENT_SEPARATOR + srcSubCompId : srcObjId,
            tId = dstSubCompId ? dstObjId + DESIGNERITEM_SUBCOMPONENT_SEPARATOR + dstSubCompId : dstObjId,
            segmentPoints = canvas.items[connectionId].segmentPoints,
            sourceConnectionPoints = [],
            targetConnectionPoints = [],
            sourceCoordinates = null,
            targetCoordinates = null,
            closestConnPoints,
            i,
            desc,
            newDesc;

        for (i in this.endpointConnectionAreaInfo[sId]) {
            if (this.endpointConnectionAreaInfo[sId].hasOwnProperty(i)) {
                desc = this.endpointConnectionAreaInfo[sId][i];
                newDesc = { "x": desc.x + desc.w / 2,
                    "y": desc.y + desc.h / 2,
                    "id": desc.id };

                sourceConnectionPoints.push(newDesc);
            }
        }

        for (i in this.endpointConnectionAreaInfo[tId]) {
            if (this.endpointConnectionAreaInfo[tId].hasOwnProperty(i)) {
                desc = this.endpointConnectionAreaInfo[tId][i];
                newDesc = { "x": desc.x + desc.w / 2,
                    "y": desc.y + desc.h / 2,
                    "id": desc.id };

                targetConnectionPoints.push(newDesc);
            }
        }

        if (sourceConnectionPoints.length > 0 && targetConnectionPoints.length > 0) {
            closestConnPoints = this._getClosestPoints(sourceConnectionPoints, targetConnectionPoints, segmentPoints);
            sourceCoordinates = sourceConnectionPoints[closestConnPoints[0]];
            targetCoordinates = targetConnectionPoints[closestConnPoints[1]];

            this.endpointConnectionAreaConnectionInfo[sId][sourceCoordinates.id] += 1;
            this.endpointConnectionAreaConnectionInfo[tId][targetCoordinates.id] += 1;
            this.connectionEndPoints[connectionId] = { "source": [sId, sourceCoordinates.id, this.endpointConnectionAreaConnectionInfo[sId][sourceCoordinates.id]],
                                                       "target": [tId, targetCoordinates.id, this.endpointConnectionAreaConnectionInfo[tId][targetCoordinates.id]]};
        }
    };



    ConnectionRouteManagerBasic.prototype._updateConnectionCoordinates = function (connectionId) {
        var canvas = this.canvas,
            srcObjId = canvas.connectionEndIDs[connectionId].srcObjId,
            srcSubCompId = canvas.connectionEndIDs[connectionId].srcSubCompId,
            dstObjId = canvas.connectionEndIDs[connectionId].dstObjId,
            dstSubCompId = canvas.connectionEndIDs[connectionId].dstSubCompId,
            sId = srcSubCompId ? srcObjId + DESIGNERITEM_SUBCOMPONENT_SEPARATOR + srcSubCompId : srcObjId,
            tId = dstSubCompId ? dstObjId + DESIGNERITEM_SUBCOMPONENT_SEPARATOR + dstSubCompId : dstObjId,
            segmentPoints = canvas.items[connectionId].segmentPoints,
            sourceConnectionPoint = this.connectionEndPoints[connectionId].source,
            targetConnectionPoint = this.connectionEndPoints[connectionId].target,
            sourceCoordinates = null,
            targetCoordinates = null,
            connectionPathPoints = [],
            connectionPathPointsTemp,
            i,
            len,
            dx,
            dy,
            connectorDelta,
            slicex,
            slicey,
            p1,
            p2,
            connExtender = 0;

        if (sourceConnectionPoint && targetConnectionPoint) {
            sourceCoordinates = this.endpointConnectionAreaInfo[sourceConnectionPoint[0]][sourceConnectionPoint[1]];
            targetCoordinates = this.endpointConnectionAreaInfo[targetConnectionPoint[0]][targetConnectionPoint[1]];

            /****************startpoint ***************/
            slicex = sourceCoordinates.w / (this.endpointConnectionAreaConnectionInfo[sId][sourceCoordinates.id] + 1);
            slicey = sourceCoordinates.h / (this.endpointConnectionAreaConnectionInfo[sId][sourceCoordinates.id] + 1);

            connectionPathPoints.push({ "x": sourceCoordinates.x + slicex * sourceConnectionPoint[2],
                                        "y": sourceCoordinates.y + slicey * sourceConnectionPoint[2] });

            if (sourceCoordinates.len !== 0) {
                connectorDelta = this._getConnectorDelta(sourceCoordinates);
                connectionPathPoints.push({ "x": sourceCoordinates.x + slicex * sourceConnectionPoint[2] + connectorDelta.dx + connectorDelta.dx * connExtender * (sourceConnectionPoint[2] - 1),
                    "y": sourceCoordinates.y + slicey * sourceConnectionPoint[2] + connectorDelta.dy + connectorDelta.dy * connExtender * (sourceConnectionPoint[2] - 1)});
            }

            /****************endpoint ***************/
            slicex = targetCoordinates.w / (this.endpointConnectionAreaConnectionInfo[tId][targetCoordinates.id] + 1);
            slicey = targetCoordinates.h / (this.endpointConnectionAreaConnectionInfo[tId][targetCoordinates.id] + 1);

            if (targetCoordinates.len !== 0) {
                connectorDelta = this._getConnectorDelta(targetCoordinates);
                connectionPathPoints.push({ "x": targetCoordinates.x + slicex * targetConnectionPoint[2] + connectorDelta.dx + connectorDelta.dx * connExtender * (sourceConnectionPoint[2] - 1),
                    "y": targetCoordinates.y + slicey * targetConnectionPoint[2] + connectorDelta.dy + connectorDelta.dy * connExtender * (sourceConnectionPoint[2] - 1)});
            }

            connectionPathPoints.push({ "x": targetCoordinates.x + slicex * targetConnectionPoint[2],
                "y": targetCoordinates.y + slicey * targetConnectionPoint[2]});
        }

        //only vertical or horizontal lines are allowed, so insert extra segment points if needed
        connectionPathPointsTemp = connectionPathPoints.slice(0);
        len = connectionPathPointsTemp.length;
        connectionPathPoints = [];

        if (len > 0) {
            p1 = connectionPathPointsTemp[0];
            connectionPathPoints.push(p1);

            for (i = 1; i < len; i += 1) {
                p1 = connectionPathPointsTemp[i - 1];
                p2 = connectionPathPointsTemp[i];

                //see if there is horizontal and vertical difference between p1 and p2
                dx = p2.x - p1.x;
                dy = p2.y - p1.y;

                if (dx !== 0 && dy !== 0) {
                    //insert 2 extra points in the center to fix the difference
                    connectionPathPoints.push({ "x": p1.x,
                                                "y": p1.y + dy / 2 });

                    connectionPathPoints.push({ "x": p1.x + dx,
                                                "y": p1.y + dy / 2 });
                }

                //p2 always goes to the list
                connectionPathPoints.push(p2);
            }
        }

        canvas.items[connectionId].setConnectionRenderData(connectionPathPoints);
    };

    ConnectionRouteManagerBasic.prototype._getConnectorDelta = function (coordDesc) {
        var dx = 0,
            dy = 0;

        if (coordDesc.len !== 0) {
            switch (coordDesc.orientation) {
                case "N":
                    dy = -coordDesc.len;
                    break;
                case "S":
                    dy = coordDesc.len;
                    break;
                case "E":
                    dx = coordDesc.len;
                    break;
                case "W":
                    dx = -coordDesc.len;
                    break;
            }
        }

        return { "dx": dx, "dy": dy };
    };

    //figure out the shortest side to choose between the two
    ConnectionRouteManagerBasic.prototype._getClosestPoints = function (srcConnectionPoints, tgtConnectionPoints, segmentPoints) {
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
                    dx = { "src": Math.abs(srcConnectionPoints[i].x - segmentPoints[0].x),
                        "tgt": Math.abs(tgtConnectionPoints[j].x - segmentPoints[segmentPoints.length - 1].x)};

                    dy =  { "src": Math.abs(srcConnectionPoints[i].y - segmentPoints[0].y),
                        "tgt": Math.abs(tgtConnectionPoints[j].y - segmentPoints[segmentPoints.length - 1].y)};

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

    return ConnectionRouteManagerBasic;
});
