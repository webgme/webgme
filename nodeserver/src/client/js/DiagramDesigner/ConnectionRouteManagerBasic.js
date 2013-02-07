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

        //1 - update all the connection endpoint connectable area information
        this._updateEndpointInfo(idList);

        //2 - we have each connection end connectability info
        //find the closest areas for each connection
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

        this.endpointConnectionAreaInfo = {};

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

            j = res.length;
            while (j--) {
                this.endpointConnectionAreaInfo[longid].push({"x": res[j].x + res[j].w / 2 + designerItem.positionX,
                    "y": res[j].y + res[j].h / 2 + designerItem.positionY});
            }
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
            sourceConnectionPoints = this.endpointConnectionAreaInfo[sId] || [],
            targetConnectionPoints = this.endpointConnectionAreaInfo[tId] || [],
            sourceCoordinates = null,
            targetCoordinates = null,
            closestConnPoints;

        if (sourceConnectionPoints.length > 0 && targetConnectionPoints.length > 0) {

            closestConnPoints = this._getClosestPoints(sourceConnectionPoints, targetConnectionPoints, segmentPoints);
            sourceCoordinates = sourceConnectionPoints[closestConnPoints[0]];
            targetCoordinates = targetConnectionPoints[closestConnPoints[1]];
        }

        canvas.items[connectionId].setConnectionRenderData([ sourceCoordinates, targetCoordinates ]);
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
