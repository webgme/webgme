"use strict";

define([], function () {

    return {
        getPathDef : function (src, tgt, segmentPoints) {
            var result = [],
                i;

            //start point
            if (src.x === tgt.x && src.y === tgt.y) {
                switch (src.dir) {
                case "N":
                case "S":
                    result.push("M", src.x - 20, src.y);
                    break;
                case "E":
                case "W":
                    result.push("M", src.x, src.y - 20);
                    break;
                default:
                    result.push("M", src.x, src.y);
                    break;
                }
            } else {
                result.push("M", src.x, src.y);
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
                        result.push("L", src.x - 20, src.y - 20);
                        result.push("L", src.x + 20, src.y - 20);
                        break;
                    case "S":
                        result.push("L", src.x - 20, src.y + 20);
                        result.push("L", src.x + 20, src.y + 20);
                        break;
                    case "E":
                        result.push("L", src.x + 20, src.y - 20);
                        result.push("L", src.x + 20, src.y + 20);
                        break;
                    case "W":
                        result.push("L", src.x - 20, src.y - 20);
                        result.push("L", src.x - 20, src.y + 20);
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
                    result.push("L", tgt.x + 20, tgt.y);
                    break;
                case "E":
                case "W":
                    result.push("L", tgt.x, tgt.y + 20);
                    break;
                default:
                    result.push("L", tgt.x, tgt.y);
                    break;
                }
            } else {
                result.push("L", tgt.x, tgt.y);
            }


            return result.join(",");
        }
    };
});