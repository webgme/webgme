"use strict";

define(['logManager',
    'clientUtil'], function (logManager,
                             clientUtil) {

    var SimpleConnectionManager;

    SimpleConnectionManager = function (options) {
        this.logger = (options && options.logger) || logManager.create(((options && options.loggerName) || "SimpleConnectionManager"));

        this.canvas = options ? options.canvas : null;

        if (this.canvas === undefined || this.canvas === null) {
            this.logger.error("Trying to initialize a SimpleConnectionManager without a canvas...");
            throw ("SimpleConnectionManager can not be created");
        }

        this.logger.debug("SimpleConnectionManager ctor finished");
    };

    SimpleConnectionManager.prototype.initialize = function (params) {
        //TODO: don't bother with it as of now
        //TODO: not sure if needed...
    };

    SimpleConnectionManager.prototype.redrawConnections = function (idList) {
        var i = idList.length;

        //1 - update all the connection endpoint connectable area information
        this._updateEndpointInfo(idList);

        //2 - we have each connection end connectability info
        //find the closest areas for each connection
        while (i--) {
            this._updateConnectionCoordinates(idList[i]);
        }
    };

    SimpleConnectionManager.prototype._updateEndpointInfo = function (idList) {
        var i = idList.length,
            connId,
            res,
            allConnEndpoints = [],
            canvas = this.canvas,
            endPointId,
            j,
            designerItem;

        //first update the available connection endpoint coordinates
        while(i--) {
            connId = idList[i];
            allConnEndpoints.insertUnique(canvas.connectionEndIDs[connId].source);
            allConnEndpoints.insertUnique(canvas.connectionEndIDs[connId].target);
        }

        i = allConnEndpoints.length;
        while(i--) {
            endPointId = allConnEndpoints[i];

            if (canvas.itemIds.indexOf(endPointId) !== -1) {
                designerItem = canvas.items[endPointId];
                res = designerItem.getConnectionAreas(endPointId) || [];
                j = res.length;
                while (j--) {
                    res[j].x += designerItem.positionX;
                    res[j].y += designerItem.positionY;
                }
            } else {
                //TODO: sourceId is not a known item
                //TODO: is it a subcomponent inside one of the items
                res = [];
            }
            this._updateEndpointConnectionAreaInfo(endPointId, res);
        }
    };

    SimpleConnectionManager.prototype._updateEndpointConnectionAreaInfo = function (endPointId, connAreas) {
        var i = connAreas.length,
            ca,
            canvas = this.canvas;

        this.endpointConnectionAreaInfo = this.endpointConnectionAreaInfo || {};

        this.endpointConnectionAreaInfo[endPointId] = [];

        while(i--) {
            ca = connAreas[i];

            this.endpointConnectionAreaInfo[endPointId].push(_.extend({}, ca));
        }
    };

    SimpleConnectionManager.prototype._updateConnectionCoordinates = function (connectionId) {
        var canvas = this.canvas,
            sourceId = canvas.connectionEndIDs[connectionId].source,
            targetId = canvas.connectionEndIDs[connectionId].target,
            segmentPoints = canvas.items[connectionId].segmentPoints,
            sourceConnectionPoints = this.endpointConnectionAreaInfo[sourceId] || [],
            targetConnectionPoints = this.endpointConnectionAreaInfo[targetId] || [],
            sourceCoordinates = null,
            targetCoordinates = null,
            closestConnPoints,
            connUpdateInfo,
            i;

        if (sourceConnectionPoints.length > 0 && targetConnectionPoints.length > 0) {

            closestConnPoints = this._getClosestPoints(sourceConnectionPoints, targetConnectionPoints, segmentPoints);
            sourceCoordinates = sourceConnectionPoints[closestConnPoints[0]];
            targetCoordinates = targetConnectionPoints[closestConnPoints[1]];
        };

        canvas.items[connectionId].setConnectionRenderData([ sourceCoordinates, targetCoordinates ]);
    };

    //figure out the shortest side to choose between the two
    SimpleConnectionManager.prototype._getClosestPoints = function (srcConnectionPoints, tgtConnectionPoints, segmentPoints) {
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

    return SimpleConnectionManager;
});
