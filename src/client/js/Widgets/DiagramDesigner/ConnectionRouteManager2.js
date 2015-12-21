/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger'], function (Logger) {

    'use strict';

    var ConnectionRouteManager2,
        DESIGNERITEM_SUBCOMPONENT_SEPARATOR = '_x_';

    ConnectionRouteManager2 = function (options) {
        var loggerName = (options && options.loggerName) || 'gme:Widgets:DiagramDesigner:ConnectionRouteManager2';
        this.logger = (options && options.logger) || Logger.create(loggerName, WebGMEGlobal.gmeConfig.client.log);

        this.diagramDesigner = options ? options.diagramDesigner : null;

        if (this.diagramDesigner === undefined || this.diagramDesigner === null) {
            this.logger.error('Trying to initialize a ConnectionRouteManagerBasic without a canvas...');
            throw ('ConnectionRouteManagerBasic can not be created');
        }

        this.logger.debug('ConnectionRouteManagerBasic ctor finished');
    };

    ConnectionRouteManager2.prototype.initialize = function () {
    };

    ConnectionRouteManager2.prototype.destroy = function () {
    };

    ConnectionRouteManager2.prototype.redrawConnections = function (reqIdList) {
        var idList,
            i,
            notReady;

        this.logger.debug('Redraw connection request: ' + reqIdList.length);

        //NOTE: here it is not enough to update the connections the canvas asked for
        //because updating one connections' endpoint (connection area switch) can cause
        //other connections to be redrawn that was originally not requested to do so
        idList = this.diagramDesigner.connectionIds.slice(0);
        while (idList.length > 0) {


            this.endpointConnectionAreaInfo = {};
            this.endpointConnectionAreaConnectionInfo = {};
            this.connectionEndPoints = {};

            //1 - update all the connection endpoint connectable area information
            notReady = this._updateEndpointInfo(idList);

            //2 - we have each connection end connectability info
            //figure out the exact connection endpoints for each connection
            i = idList.length;
            while (i--) {
                this._calculateClosestEndpoints(idList[i]);
            }

            //3 - calculate the connection path informations
            /*i = idList.length;
             while (i--) {*/
            for (i = 0; i < idList.length; i += 1) {
                this._updateConnectionCoordinates(idList[i]);
            }

            idList = notReady;
        }


        //need to return the IDs of the connections that was really
        //redrawn or any other visual property chenged (width, etc)
        idList = this.diagramDesigner.connectionIds.slice(0);
        return idList;
    };

    ConnectionRouteManager2.prototype._updateEndpointInfo = function (idList) {
        var i = idList.length,
            connId,
            canvas = this.diagramDesigner,
            srcObjId,
            srcSubCompId,
            dstObjId,
            dstSubCompId,
            dependantNotReadyYet = [],
            connectionMetaInfo;

        //first update the available connection endpoint coordinates
        while (i--) {
            connId = idList[i];
            srcObjId = canvas.connectionEndIDs[connId].srcObjId;
            srcSubCompId = canvas.connectionEndIDs[connId].srcSubCompId;
            dstObjId = canvas.connectionEndIDs[connId].dstObjId;
            dstSubCompId = canvas.connectionEndIDs[connId].dstSubCompId;

            connectionMetaInfo = canvas.items[connId].getMetaInfo();

            if (!this._getEndpointConnectionAreas(connId, srcObjId, srcSubCompId, false, connectionMetaInfo)) {
                if (canvas.connectionIds.indexOf(srcObjId) !== -1) {
                    dependantNotReadyYet.push(connId);
                }

            }
            if (!this._getEndpointConnectionAreas(connId, dstObjId, dstSubCompId, true, connectionMetaInfo)) {
                if (canvas.connectionIds.indexOf(dstObjId) !== -1) {
                    dependantNotReadyYet.push(connId);
                }
            }
        }

        return dependantNotReadyYet;
    };

    ConnectionRouteManager2.prototype._getEndPointID = function (connId, objId, subCompId) {
        var res = '';

        if (connId) {
            res += connId + DESIGNERITEM_SUBCOMPONENT_SEPARATOR;
        }

        res += objId;

        if (subCompId) {
            res += DESIGNERITEM_SUBCOMPONENT_SEPARATOR + subCompId;
        }

        return res;
    };

    ConnectionRouteManager2.prototype._getEndpointConnectionAreas = function (connId, objId, subCompId, isEnd,
                                                                              connectionMetaInfo) {
        var longid = this._getEndPointID(connId, objId, subCompId),
            eID = this._getEndPointID(undefined, objId, subCompId),
            res = [],
            canvas = this.diagramDesigner,
            j,
            designerItem;

        //if (this.endpointConnectionAreaInfo.hasOwnProperty(longid) === false) {
        this.endpointConnectionAreaInfo[longid] = this.endpointConnectionAreaInfo[longid] || [];
        this.endpointConnectionAreaConnectionInfo[eID] = this.endpointConnectionAreaConnectionInfo[eID] || {};

        if (subCompId === undefined ||
            (subCompId !== undefined && this.diagramDesigner._itemSubcomponentsMap[objId] &&
            this.diagramDesigner._itemSubcomponentsMap[objId].indexOf(subCompId) !== -1)) {

            designerItem = canvas.items[objId];
            res = designerItem.getConnectionAreas(subCompId, isEnd, connectionMetaInfo) || [];

            j = res.length;
            while (j--) {
                this.endpointConnectionAreaInfo[longid][res[j].id] = {
                    x: res[j].x1,
                    y: res[j].y1,
                    angle1: res[j].angle1,
                    angle2: res[j].angle2,
                    len: res[j].len || 10,
                    id: res[j].id,
                    w: res[j].x2 - res[j].x1,
                    h: res[j].y2 - res[j].y1
                };

                if (!this.endpointConnectionAreaConnectionInfo[eID].hasOwnProperty(res[j].id)) {
                    this.endpointConnectionAreaConnectionInfo[eID][res[j].id] = 0;
                }
            }
        }
        //}

        return res.length > 0;
    };

    ConnectionRouteManager2.prototype._calculateClosestEndpoints = function (connectionId) {
        var canvas = this.diagramDesigner,
            srcObjId = canvas.connectionEndIDs[connectionId].srcObjId,
            srcSubCompId = canvas.connectionEndIDs[connectionId].srcSubCompId,
            dstObjId = canvas.connectionEndIDs[connectionId].dstObjId,
            dstSubCompId = canvas.connectionEndIDs[connectionId].dstSubCompId,
            sId = this._getEndPointID(connectionId, srcObjId, srcSubCompId),
            tId = this._getEndPointID(connectionId, dstObjId, dstSubCompId),
            sEId = this._getEndPointID(undefined, srcObjId, srcSubCompId),
            tEId = this._getEndPointID(undefined, dstObjId, dstSubCompId),
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
                newDesc = {
                    x: desc.x + desc.w / 2,
                    y: desc.y + desc.h / 2,
                    id: desc.id
                };

                sourceConnectionPoints.push(newDesc);
            }
        }

        for (i in this.endpointConnectionAreaInfo[tId]) {
            if (this.endpointConnectionAreaInfo[tId].hasOwnProperty(i)) {
                desc = this.endpointConnectionAreaInfo[tId][i];
                newDesc = {
                    x: desc.x + desc.w / 2,
                    y: desc.y + desc.h / 2,
                    id: desc.id
                };

                targetConnectionPoints.push(newDesc);
            }
        }

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

            this.endpointConnectionAreaConnectionInfo[sEId][sourceCoordinates.id] += 1;
            this.endpointConnectionAreaConnectionInfo[tEId][targetCoordinates.id] += 1;
            this.connectionEndPoints[connectionId] = {
                source: [
                    sId,
                    sourceCoordinates.id,
                    this.endpointConnectionAreaConnectionInfo[sEId][sourceCoordinates.id]
                ],
                target: [
                    tId,
                    targetCoordinates.id,
                    this.endpointConnectionAreaConnectionInfo[tEId][targetCoordinates.id]
                ]
            };
        }
    };


    ConnectionRouteManager2.prototype._updateConnectionCoordinates = function (connectionId) {
        var canvas = this.diagramDesigner,
            srcObjId = canvas.connectionEndIDs[connectionId].srcObjId,
            srcSubCompId = canvas.connectionEndIDs[connectionId].srcSubCompId,
            dstObjId = canvas.connectionEndIDs[connectionId].dstObjId,
            dstSubCompId = canvas.connectionEndIDs[connectionId].dstSubCompId,
            sEId = this._getEndPointID(undefined, srcObjId, srcSubCompId),
            tEId = this._getEndPointID(undefined, dstObjId, dstSubCompId),
            segmentPoints = canvas.items[connectionId].segmentPoints,
            sourceConnectionPoint = this.connectionEndPoints[connectionId] ?
                this.connectionEndPoints[connectionId].source : undefined,
            targetConnectionPoint = this.connectionEndPoints[connectionId] ?
                this.connectionEndPoints[connectionId].target : undefined,
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
            bbbox,
            connExtender = 0;

        if (sourceConnectionPoint && targetConnectionPoint) {
            sourceCoordinates = this.endpointConnectionAreaInfo[sourceConnectionPoint[0]][sourceConnectionPoint[1]];
            targetCoordinates = this.endpointConnectionAreaInfo[targetConnectionPoint[0]][targetConnectionPoint[1]];

            /****************startpoint ***************/
            slicex = sourceCoordinates.w / (this.endpointConnectionAreaConnectionInfo[sEId][sourceCoordinates.id] + 1);
            slicey = sourceCoordinates.h / (this.endpointConnectionAreaConnectionInfo[sEId][sourceCoordinates.id] + 1);

            /***************startpoint's coordinates*********************/
            connectionPathPoints.push({
                x: sourceCoordinates.x + slicex * sourceConnectionPoint[2],
                y: sourceCoordinates.y + slicey * sourceConnectionPoint[2]
            });

            /***************startpoint's defined connector length*********************/
            if (sourceCoordinates.len !== 0) {
                connectorDelta = this._getConnectorDelta(sourceCoordinates,
                    this.endpointConnectionAreaConnectionInfo[sEId][sourceCoordinates.id] + 1,
                    sourceConnectionPoint[2]);
                connectionPathPoints.push({
                    x: sourceCoordinates.x + slicex * sourceConnectionPoint[2] + connectorDelta.dx +
                    connectorDelta.dx * connExtender * (sourceConnectionPoint[2] - 1),
                    y: sourceCoordinates.y + slicey * sourceConnectionPoint[2] + connectorDelta.dy +
                    connectorDelta.dy * connExtender * (sourceConnectionPoint[2] - 1)
                });
            }

            /*************** segment points *****************************/
            if (segmentPoints && segmentPoints.length > 0) {
                len = segmentPoints.length;
                for (i = 0; i < len; i += 1) {
                    connectionPathPoints.push({
                        x: segmentPoints[i][0],
                        y: segmentPoints[i][1]
                    });
                }
            }

            /****************endpoint ***************/
            slicex = targetCoordinates.w / (this.endpointConnectionAreaConnectionInfo[tEId][targetCoordinates.id] + 1);
            slicey = targetCoordinates.h / (this.endpointConnectionAreaConnectionInfo[tEId][targetCoordinates.id] + 1);

            /***************endpoint's defined connector length*********************/
            if (targetCoordinates.len !== 0) {
                connectorDelta = this._getConnectorDelta(targetCoordinates,
                    this.endpointConnectionAreaConnectionInfo[tEId][targetCoordinates.id] + 1,
                    targetConnectionPoint[2]);
                connectionPathPoints.push({
                    x: targetCoordinates.x + slicex * targetConnectionPoint[2] + connectorDelta.dx +
                    connectorDelta.dx * connExtender * (targetConnectionPoint[2] - 1),
                    y: targetCoordinates.y + slicey * targetConnectionPoint[2] + connectorDelta.dy +
                    connectorDelta.dy * connExtender * (targetConnectionPoint[2] - 1)
                });
            }

            /***************endpoint's coordinates*********************/
            connectionPathPoints.push({
                x: targetCoordinates.x + slicex * targetConnectionPoint[2],
                y: targetCoordinates.y + slicey * targetConnectionPoint[2]
            });
        }

        len = connectionPathPoints.length;
        while (len-- > 1) {
            if ((connectionPathPoints[len].x === connectionPathPoints[len - 1].x) &&
                (connectionPathPoints[len].y === connectionPathPoints[len - 1].y)) {
                connectionPathPoints.splice(len, 1);
            }
        }

        //when no segment points are defined route with horizontal and vertical lines
        if (segmentPoints.length === 0) {
            //no segment points
            if (srcObjId === dstObjId && srcSubCompId === dstSubCompId) {
                //self connection
                //insert 2 extra points
                var lastIdx = connectionPathPoints.length - 1;
                if (connectionPathPoints[0].x === connectionPathPoints[lastIdx].x) {
                    if (connectionPathPoints[0].y === connectionPathPoints[lastIdx].y) {
                        //x coordinates are the same
                        //y coordinates are the same
                        if (sourceCoordinates.angle1 >= 0 && sourceCoordinates.angle2 < 90) {
                            //EAST
                            connectionPathPoints.splice(2, 0,
                                {x: connectionPathPoints[1].x + 20, y: connectionPathPoints[1].y - 20},
                                {x: connectionPathPoints[1].x + 40, y: connectionPathPoints[1].y},
                                {x: connectionPathPoints[1].x + 20, y: connectionPathPoints[1].y + 20},
                                {x: connectionPathPoints[1].x, y: connectionPathPoints[1].y});
                        } else if (sourceCoordinates.angle1 >= 90 && sourceCoordinates.angle2 < 180) {
                            //SOUTH
                            connectionPathPoints.splice(2, 0,
                                {x: connectionPathPoints[1].x + 20, y: connectionPathPoints[1].y + 20},
                                {x: connectionPathPoints[1].x, y: connectionPathPoints[1].y + 40},
                                {x: connectionPathPoints[1].x - 20, y: connectionPathPoints[1].y + 20},
                                {x: connectionPathPoints[1].x, y: connectionPathPoints[1].y});
                        } else if (sourceCoordinates.angle1 >= 180 && sourceCoordinates.angle2 < 270) {
                            //WEST
                            connectionPathPoints.splice(2, 0,
                                {x: connectionPathPoints[1].x - 20, y: connectionPathPoints[1].y - 20},
                                {x: connectionPathPoints[1].x - 40, y: connectionPathPoints[1].y},
                                {x: connectionPathPoints[1].x - 20, y: connectionPathPoints[1].y + 20},
                                {x: connectionPathPoints[1].x, y: connectionPathPoints[1].y});
                        } else if (sourceCoordinates.angle1 >= 270 && sourceCoordinates.angle2 < 360) {
                            //NORTH
                            connectionPathPoints.splice(2, 0,
                                {x: connectionPathPoints[1].x - 20, y: connectionPathPoints[1].y - 20},
                                {x: connectionPathPoints[1].x, y: connectionPathPoints[1].y - 40},
                                {x: connectionPathPoints[1].x + 20, y: connectionPathPoints[1].y - 20},
                                {x: connectionPathPoints[1].x, y: connectionPathPoints[1].y});
                        }

                    } else {
                        //x coordinates are the same
                        //y coordinates are different
                        bbbox = canvas.items[srcObjId].getBoundingBox();
                        connectionPathPoints.splice(2, 0, {
                            x: connectionPathPoints[1].x + bbbox.width / 2 + 20,
                            y: connectionPathPoints[1].y
                        }, {
                            x: connectionPathPoints[2].x + bbbox.width / 2 + 20,
                            y: connectionPathPoints[2].y
                        });
                    }
                } else {
                    if (connectionPathPoints[0].y === connectionPathPoints[lastIdx].y) {
                        //x coordinates are different
                        //y coordinates are the same
                        bbbox = canvas.items[srcObjId].getBoundingBox();
                        connectionPathPoints.splice(2, 0, {
                            x: connectionPathPoints[1].x,
                            y: connectionPathPoints[1].y + bbbox.height / 2 + 20
                        }, {
                            x: connectionPathPoints[2].x,
                            y: connectionPathPoints[2].y + bbbox.height / 2 + 20
                        });
                    } else {
                        //x coordinates are different
                        //y coordinates are different
                        connectionPathPoints.splice(2, 0, {
                            x: connectionPathPoints[2].x,
                            y: connectionPathPoints[1].y
                        });
                    }
                }
            } else {
                //only vertical or horizontal lines are allowed, so insert extra segment points if needed
                connectionPathPointsTemp = connectionPathPoints.slice(0);
                len = connectionPathPointsTemp.length;
                connectionPathPoints = [];

                if (len > 0) {
                    //source point and the rotated connector stays as they are
                    p1 = connectionPathPointsTemp[0];
                    connectionPathPoints.push(p1);

                    p1 = connectionPathPointsTemp[1];
                    connectionPathPoints.push(p1);

                    //but in between them use horizontal and vertical lines only
                    for (i = 2; i < len - 1; i += 1) {
                        p1 = connectionPathPointsTemp[i - 1];
                        p2 = connectionPathPointsTemp[i];

                        //see if there is horizontal and vertical difference between p1 and p2
                        dx = p2.x - p1.x;
                        dy = p2.y - p1.y;

                        if (dx !== 0 && dy !== 0) {
                            //insert 2 extra points in the center to fix the difference
                            connectionPathPoints.push({
                                x: p1.x,
                                y: p1.y + dy / 2
                            });

                            connectionPathPoints.push({
                                x: p1.x + dx,
                                y: p1.y + dy / 2
                            });
                        }

                        //p2 always goes to the list
                        connectionPathPoints.push(p2);
                    }

                    //end point point and the rotated connector stays as they are
                    p1 = connectionPathPointsTemp[len - 2];
                    connectionPathPoints.push(p1);

                    p1 = connectionPathPointsTemp[len - 1];
                    connectionPathPoints.push(p1);
                }
            }
        }

        canvas.items[connectionId].setConnectionRenderData(connectionPathPoints);
    };

    ConnectionRouteManager2.prototype._getConnectorDelta = function (coordDesc, slices, connOrderNum) {
        var dx = 0,
            dy = 0,
            angle = (coordDesc.angle1 + ((coordDesc.angle2 - coordDesc.angle1) / slices * connOrderNum )) *
                (Math.PI / 180),
            result = {dx: dx, dy: dy};

        if (coordDesc.len !== 0) {
            var s = Math.sin(angle);
            var c = Math.cos(angle);

            var fx = coordDesc.len;
            var fy = 0;

            var rx = fx * c - fy * s;
            var ry = fx * s + fy * c;

            result.dx = rx;
            result.dy = ry;
        }

        return result;
    };

    //figure out the shortest side to choose between the two
    ConnectionRouteManager2.prototype._getClosestPoints = function (srcConnectionPoints, tgtConnectionPoints,
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
                        src: Math.abs(srcConnectionPoints[i].x - segmentPoints[0][0]),
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

    return ConnectionRouteManager2;
});
