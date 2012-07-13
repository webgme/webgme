"use strict";

define(['bezierHelper'], function (bezierHelper) {

    return {
        getPathDef : function (src, tgt, segmentPoints) {
            var result = [],
                i,
                bezierControlPoints,
                controlPointBefore,
                controlPointAfter,
                segmentPoint;

            if (segmentPoints && segmentPoints.length > 0) {
                //FIRST SEGMENT - from src point to 1st segment point
                result = ["M", src.x, src.y];

                controlPointBefore = segmentPoints[0].getBeforeControlPoint();
                segmentPoint = { "x": segmentPoints[0].x,
                    "y": segmentPoints[0].y,
                    "dir" : controlPointBefore.dir };

                bezierControlPoints = bezierHelper.getBezierControlPoints2(src, segmentPoint);

                result.push("C", bezierControlPoints[1].x, bezierControlPoints[1].y, controlPointBefore.x, controlPointBefore.y, bezierControlPoints[3].x, bezierControlPoints[3].y);

                //MIDDLE SEGMENTS - from 1st segment point to last segment point
                for (i = 0; i < segmentPoints.length - 1; i += 1) {
                    controlPointAfter = segmentPoints[i].getAfterControlPoint();
                    controlPointBefore = segmentPoints[i + 1].getBeforeControlPoint();

                    result.push("C", controlPointAfter.x, controlPointAfter.y, controlPointBefore.x, controlPointBefore.y, segmentPoints[i + 1].x, segmentPoints[i + 1].y);
                }

                //LAST SEGMENT - from last segment point to tgt
                controlPointAfter = segmentPoints[i].getAfterControlPoint();
                segmentPoint = { "x": segmentPoints[i].x,
                    "y": segmentPoints[i].y,
                    "dir" : controlPointAfter.dir };

                bezierControlPoints = bezierHelper.getBezierControlPoints2(segmentPoint, tgt);

                result.push("C", controlPointAfter.x, controlPointAfter.y, bezierControlPoints[2].x, bezierControlPoints[2].y, tgt.x, tgt.y);

            } else {
                bezierControlPoints = bezierHelper.getBezierControlPoints2(src, tgt);
                result = ["M", bezierControlPoints[0].x, bezierControlPoints[0].y, "C", bezierControlPoints[1].x, bezierControlPoints[1].y, bezierControlPoints[2].x, bezierControlPoints[2].y, bezierControlPoints[3].x, bezierControlPoints[3].y];
            }

            return result.join(",");
        }
    };
});