/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger'], function (Logger) {

    'use strict';

    var ConnectionRouteManagerBasic,
        DESIGNERITEM_SUBCOMPONENT_SEPARATOR = '_x_';

    ConnectionRouteManagerBasic = function (options) {
        var loggerName = (options && options.loggerName) || 'gme:Widgets:DiagramDesigner:ConnectionRouteManagerBasic';
        this.logger = (options && options.logger) || Logger.create(loggerName, WebGMEGlobal.gmeConfig.client.log);

        this.diagramDesigner = options ? options.diagramDesigner : null;

        if (this.diagramDesigner === undefined || this.diagramDesigner === null) {
            this.logger.error('Trying to initialize a ConnectionRouteManagerBasic without a canvas...');
            throw ('ConnectionRouteManagerBasic can not be created');
        }

        this.logger.debug('ConnectionRouteManagerBasic ctor finished');
    };

    ConnectionRouteManagerBasic.prototype.initialize = function () {
    };

    ConnectionRouteManagerBasic.prototype.destroy = function () {
    };

    ConnectionRouteManagerBasic.prototype.redrawConnections = function (idList) {
        var i;

        this.logger.debug('Redraw connection request: ' + idList.length);

        //NOTE: here it is not enough to update the connections the canvas asked for
        //because updating one connections' endpoint (connection area switch) can cause
        //other connections to be redrawn that was originally not requested to do so
        idList = this.diagramDesigner.connectionIds.slice(0);

        //1 - update all the connection endpoint connectable area information
        this._updateEndpointInfo(idList);

        //2 - we have each connection end connectability info
        //find the closest areas for each connection
        for (i = 0; i < idList.length; i += 1) {
            this._updateConnectionCoordinates(idList[i]);
        }

        //need to return the IDs of the connections that was really
        //redrawn or any other visual property chenged (width, etc)
        return idList;
    };

    ConnectionRouteManagerBasic.prototype._updateEndpointInfo = function (idList) {
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
        while (i--) {
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

    ConnectionRouteManagerBasic.prototype._getEndpointConnectionAreas = function (objId, subCompId, isEnd,
                                                                                  connectionMetaInfo) {
        var longid = subCompId ? objId + DESIGNERITEM_SUBCOMPONENT_SEPARATOR + subCompId : objId,
            res,
            canvas = this.diagramDesigner,
            j,
            designerItem;

        if (this.endpointConnectionAreaInfo.hasOwnProperty(longid) === false) {

            this.endpointConnectionAreaInfo[longid] = [];

            if (subCompId === undefined ||
                (subCompId !== undefined && this.diagramDesigner._itemSubcomponentsMap[objId] &&
                this.diagramDesigner._itemSubcomponentsMap[objId].indexOf(subCompId) !== -1)) {

                designerItem = canvas.items[objId];
                res = designerItem.getConnectionAreas(subCompId, isEnd, connectionMetaInfo) || [];

                j = res.length;
                while (j--) {
                    this.endpointConnectionAreaInfo[longid].push({
                        x: res[j].x1 + (res[j].x2 - res[j].x1) / 2,
                        y: res[j].y1 + (res[j].y2 - res[j].y1) / 2
                    });
                }

            }
        }
    };

    ConnectionRouteManagerBasic.prototype._updateConnectionCoordinates = function (connectionId) {
        var canvas = this.diagramDesigner,
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
            closestConnPoints,
            connectionPathPoints = [],
            len,
            i;

        if (sourceConnectionPoints.length > 0 && targetConnectionPoints.length > 0) {

            if (srcObjId === dstObjId && srcSubCompId === dstSubCompId) {
                //connection's source and destination is the same object/port
                sourceCoordinates = sourceConnectionPoints[0];
                targetCoordinates = targetConnectionPoints.length > 1 ?
                    targetConnectionPoints[1] : targetConnectionPoints[0];
            } else {
                closestConnPoints = this._getClosestPoints(sourceConnectionPoints, targetConnectionPoints,
                    segmentPoints);
                sourceCoordinates = sourceConnectionPoints[closestConnPoints[0]];
                targetCoordinates = targetConnectionPoints[closestConnPoints[1]];
            }

            //source point
            connectionPathPoints.push(sourceCoordinates);

            //segment points
            if (segmentPoints && segmentPoints.length > 0) {
                len = segmentPoints.length;
                for (i = 0; i < len; i += 1) {
                    connectionPathPoints.push({
                        x: segmentPoints[i][0],
                        y: segmentPoints[i][1]
                    });
                }
            } else {
                if (srcObjId === dstObjId && srcSubCompId === dstSubCompId) {
                    //self connection, insert fake points
                    connectionPathPoints.push({
                        x: sourceCoordinates.x + 100,
                        y: sourceCoordinates.y - 100
                    });

                    connectionPathPoints.push({
                        x: sourceCoordinates.x + 200,
                        y: sourceCoordinates.y
                    });

                    connectionPathPoints.push({
                        x: sourceCoordinates.x + 100,
                        y: sourceCoordinates.y + 100
                    });
                }
            }

            //end point
            connectionPathPoints.push(targetCoordinates);
        }

        canvas.items[connectionId].setConnectionRenderData(connectionPathPoints);
    };

    //figure out the shortest side to choose between the two
    ConnectionRouteManagerBasic.prototype._getClosestPoints = function (srcConnectionPoints, tgtConnectionPoints,
                                                                        segmentPoints) {
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
                    dx = {
                        src: Math.abs(srcConnectionPoints[i].x - segmentPoints[0][1]),
                        tgt: Math.abs(tgtConnectionPoints[j].x - segmentPoints[segmentPoints.length - 1][0])
                    };

                    dy = {
                        src: Math.abs(srcConnectionPoints[i].y - segmentPoints[0][1]),
                        tgt: Math.abs(tgtConnectionPoints[j].y - segmentPoints[segmentPoints.length - 1][1])
                    };

                    cLength = Math.sqrt(dx.src * dx.src + dy.src * dy.src) +
                    Math.sqrt(dx.tgt * dx.tgt + dy.tgt * dy.tgt);

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
