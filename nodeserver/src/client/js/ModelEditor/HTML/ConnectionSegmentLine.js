"use strict";

define([], function () {

    return {
        getPathDef : function (src, tgt, segmentPoints) {
            var result = [],
                i,
                selfConnectionPathLength = 15;

            //start point
            if (src.x === tgt.x && src.y === tgt.y) {
                switch (src.dir) {
                case "N":
                case "S":
                    result.push("M", src.x - selfConnectionPathLength, src.y);
                    break;
                case "E":
                case "W":
                    result.push("M", src.x, src.y - selfConnectionPathLength);
                    break;
                default:
                    result.push("M", src.x, src.y);
                    break;
                }
            } else {
                result.push("M", src.x, src.y);

                if (src.hasOwnProperty("connectorLength")) {
                    switch (src.dir) {
                    case "N":
                        result.push("L", src.x, src.y - src.connectorLength);
                        break;
                    case "S":
                        result.push("L", src.x, src.y + src.connectorLength);
                        break;
                    case "E":
                        result.push("L", src.x + src.connectorLength, src.y);
                        break;
                    case "W":
                        result.push("L", src.x - src.connectorLength, src.y);
                        break;
                    default:
                        break;
                    }
                }
            }


            //include all the mid-points
            if (segmentPoints && segmentPoints.length > 0) {
                for (i = 0; i <  segmentPoints.length; i += 1) {
                    result.push("L", segmentPoints[i].x, segmentPoints[i].y);
                }
            } else {
                if (src.x === tgt.x && src.y === tgt.y) {
                    switch (src.dir) {
                    case "N":
                        result.push("L", src.x - selfConnectionPathLength, src.y - selfConnectionPathLength);
                        result.push("L", src.x + selfConnectionPathLength, src.y - selfConnectionPathLength);
                        break;
                    case "S":
                        result.push("L", src.x - selfConnectionPathLength, src.y + selfConnectionPathLength);
                        result.push("L", src.x + selfConnectionPathLength, src.y + selfConnectionPathLength);
                        break;
                    case "E":
                        result.push("L", src.x + selfConnectionPathLength, src.y - selfConnectionPathLength);
                        result.push("L", src.x + selfConnectionPathLength, src.y + selfConnectionPathLength);
                        break;
                    case "W":
                        result.push("L", src.x - selfConnectionPathLength, src.y - selfConnectionPathLength);
                        result.push("L", src.x - selfConnectionPathLength, src.y + selfConnectionPathLength);
                        break;
                    default:
                        break;
                    }
                }
            }

            //final segment to destination
            if (src.x === tgt.x && src.y === tgt.y) {
                switch (src.dir) {
                case "N":
                case "S":
                    result.push("L", tgt.x + selfConnectionPathLength, tgt.y);
                    break;
                case "E":
                case "W":
                    result.push("L", tgt.x, tgt.y + selfConnectionPathLength);
                    break;
                default:
                    result.push("L", tgt.x, tgt.y);
                    break;
                }
            } else {
                if (tgt.hasOwnProperty("connectorLength")) {
                    switch (tgt.dir) {
                    case "N":
                        result.push("L", tgt.x, tgt.y - tgt.connectorLength);
                        break;
                    case "S":
                        result.push("L", tgt.x, tgt.y + tgt.connectorLength);
                        break;
                    case "E":
                        result.push("L", tgt.x + tgt.connectorLength, tgt.y);
                        break;
                    case "W":
                        result.push("L", tgt.x - tgt.connectorLength, tgt.y);
                        break;
                    default:
                        break;
                    }
                }

                result.push("L", tgt.x, tgt.y);
            }


            return result.join(",");
        }
    };
});