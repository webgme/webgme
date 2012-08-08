"use strict";

define([], function () {

    var ConnectionPointManager;

    ConnectionPointManager = function () {
        this._connEndAreaCounter = 0;

        this._connections = {};

        this._connectionEndAreas = {};
    };

    ConnectionPointManager.prototype.registerConnectionArea = function (el) {
        var areaId = el.data("connAreaID"),
            w = el.width(),
            h = el.height(),
            offset = el.offset(),
            orientation = el.attr("data-or").split(",")[0].substring(0, 1),
            connectorLength = parseInt(el.attr("data-or").split(",")[0].substring(1), 10);

        if (areaId === undefined) {
            el.data("connAreaID", this._connEndAreaCounter);
            this._connEndAreaCounter += 1;

            areaId = el.data("connAreaID");

            this._connectionEndAreas[areaId] = { "el": el,
                                                "connections": [],
                                                "props": {} };
        }

        this._connectionEndAreas[areaId].props = {"w": w,
                                                         "h": h,
                                                         "offset": offset,
                                                         "orientation": orientation,
                                                         "connectorLength": connectorLength};


        return areaId;
    };

    ConnectionPointManager.prototype.registerConnection = function (connId, srcAreaId, tgtAreaId) {
        var oldSrcAreaId = this._connections[connId] ? this._connections[connId].srcAreaId : -1,
            oldTgtAreaId = this._connections[connId] ? this._connections[connId].tgtAreaId : -1,
            result = {},
            oldIdx;

        this._connections[connId] = { "srcAreaId": srcAreaId,
                                      "tgtAreaId": tgtAreaId };

        if (oldSrcAreaId !== srcAreaId) {
            if (oldSrcAreaId !== -1) {
                //remove the connection from the old place
                //update all remaining connection's endpoint of the old area
                oldIdx = this._connectionEndAreas[oldSrcAreaId].connections.indexOf(connId);
                this._connectionEndAreas[oldSrcAreaId].connections.splice(oldIdx, 1);

                $.extend(true, result, this._getConnectionCoordinatesOfArea(oldSrcAreaId));
            }

            //insert into the new place
            //update all the connections in the new place
            if (this._connectionEndAreas[srcAreaId].connections.indexOf(connId) === -1) {
                this._connectionEndAreas[srcAreaId].connections.push(connId);
            }
        }

        if (oldSrcAreaId === srcAreaId) {
            $.extend(true, result, this._getConnectionCoordinatesOfArea(srcAreaId, connId));
        } else {
            $.extend(true, result, this._getConnectionCoordinatesOfArea(srcAreaId));
        }

        if (oldTgtAreaId !== tgtAreaId) {
            if (oldTgtAreaId !== -1) {
                //remove the connection from the old place
                //update all remaining connection's endpoint of the old area
                oldIdx = this._connectionEndAreas[oldTgtAreaId].connections.indexOf(connId);
                this._connectionEndAreas[oldTgtAreaId].connections.splice(oldIdx, 1);

                $.extend(true, result, this._getConnectionCoordinatesOfArea(oldTgtAreaId));
            }

            //insert into the new place
            //update all the connections in the new place
            if (this._connectionEndAreas[tgtAreaId].connections.indexOf(connId) === -1) {
                this._connectionEndAreas[tgtAreaId].connections.push(connId);
            }
        }

        if (oldTgtAreaId === tgtAreaId) {
            $.extend(true, result, this._getConnectionCoordinatesOfArea(tgtAreaId, connId));
        } else {
            $.extend(true, result, this._getConnectionCoordinatesOfArea(tgtAreaId));
        }

        return result;
    };

    ConnectionPointManager.prototype.unregisterConnection = function (connId) {
        var oldSrcAreaId = this._connections[connId] ? this._connections[connId].srcAreaId : -1,
            oldTgtAreaId = this._connections[connId] ? this._connections[connId].tgtAreaId : -1,
            result = {},
            oldIdx;

        //remove the connection info from the list
        delete this._connections[connId];
        result[connId] = { "src": null, "tgt": null };

        if (oldSrcAreaId !== -1) {
            //remove the connection from the old place
            //update all remaining connection's endpoint of the old area
            oldIdx = this._connectionEndAreas[oldSrcAreaId].connections.indexOf(connId);
            this._connectionEndAreas[oldSrcAreaId].connections.splice(oldIdx, 1);

            $.extend(true, result, this._getConnectionCoordinatesOfArea(oldSrcAreaId));
        }

        if (oldTgtAreaId !== -1) {
            //remove the connection from the old place
            //update all remaining connection's endpoint of the old area
            oldIdx = this._connectionEndAreas[oldTgtAreaId].connections.indexOf(connId);
            this._connectionEndAreas[oldTgtAreaId].connections.splice(oldIdx, 1);

            $.extend(true, result, this._getConnectionCoordinatesOfArea(oldTgtAreaId));
        }

        return result;
    };

    ConnectionPointManager.prototype._getConnectionCoordinatesOfArea = function (areaId, connId) {
        var result = {},
            areaProps = this._connectionEndAreas[areaId].props,
            areaConns = this._connectionEndAreas[areaId].connections,
            buckets = areaConns.length + 1,
            dx,
            dy,
            horizontalAlignment = true,
            i,
            cid,
            endPointStr;

        if (areaProps.orientation === "N" || areaProps.orientation === "S") {
            dx = areaProps.w / buckets;
            dy = areaProps.h / 2;
            horizontalAlignment = true;
        } else {
            dy = areaProps.h / buckets;
            dx = areaProps.w / 2;
            horizontalAlignment = false;
        }

        if (connId) {
            cid =  connId;
            i = areaConns.indexOf(connId);

            result[cid] = result[cid] || {};

            if (this._connections[cid].srcAreaId === areaId) {
                endPointStr = "src";
            } else {
                endPointStr = "tgt";
            }

            result[cid][endPointStr] = {"x": areaProps.offset.left + (horizontalAlignment === true ? (i + 1) * dx : dx),
                "y": areaProps.offset.top + (horizontalAlignment === false ? (i + 1) * dy : dy),
                "dir": areaProps.orientation,
                "connectorLength": areaProps.connectorLength + i * 10,
                "id": areaId};
        } else {
            for (i = 0; i < areaConns.length; i += 1) {
                cid =  areaConns[i];

                result[cid] = result[cid] || {};

                if (this._connections[cid].srcAreaId === areaId) {
                    endPointStr = "src";
                } else {
                    endPointStr = "tgt";
                }

                result[cid][endPointStr] = {"x": areaProps.offset.left + (horizontalAlignment === true ? (i + 1) * dx : dx),
                    "y": areaProps.offset.top + (horizontalAlignment === false ? (i + 1) * dy : dy),
                    "dir": areaProps.orientation,
                    "connectorLength": areaProps.connectorLength + i * 10,
                    "id": areaId};
            }
        }

        return result;
    };

    return ConnectionPointManager;
});