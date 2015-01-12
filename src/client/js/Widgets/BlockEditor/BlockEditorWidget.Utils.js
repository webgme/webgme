/*globals define*/
define([
    './BlockEditorWidget.Constants.js'
], function (
    BLOCK_CONSTANTS
) {
    'use strict';

    var getCenter = function(connArea) {
        return [(connArea.x1+connArea.x2)/2, (connArea.y1+connArea.y2)/2];
    };

    var getDistance = function(src, dst) {
        if (!src || !dst) {
            return Infinity;
        }
        var c1 = getCenter(src),
            c2 = getCenter(dst);

        return Math.sqrt(Math.pow(c1[0]-c2[0],2)+Math.pow(c1[1]-c2[1],2));
    };

    /**
     * Calculate the closest connection area from destination
     * set given the sources set.
     *
     * @param {Array[ConnectionAreas]} srcs
     * @param {Array[ConnectionAreas]} dsts
     * @return {ConnectionArea} closest connection area from set dsts
     */
    var getClosestConnAreas = function(srcs, dsts) {
        var minDistance = getDistance(srcs[0], dsts[0]),
            closestDst,
            ptr,
            item,
            distance;

        for(var i = srcs.length-1; i >= 0; i--) {
            for(var j = dsts.length-1; j >= 0; j--) {
                distance = getDistance(srcs[i], dsts[j]);
                if (distance <= minDistance) {
                    minDistance = distance;
                    closestDst = dsts[j];
                    ptr = srcs[i].ptr || dsts[j].ptr;
                    item = srcs[i].parentId;
                }
            }
        }

        return {ptr: ptr, activeItem: item, area: closestDst, distance: minDistance};
    };

    var sortByRole = function(areas) {
        var result = {};

        result[BLOCK_CONSTANTS.CONN_INCOMING] = [];
        result[BLOCK_CONSTANTS.CONN_OUTGOING] = [];
        for (var i = areas.length-1; i >= 0; i--) {
            result[areas[i].role].push(areas[i]);
        }

        return result;
    };

    /**
     * Check the valid connection areas from the dragged item to under areas 
     * and vice versa. Then return the closer solution.
     *
     * @param draggedAreas
     * @param underAreas
     * @return {undefined}
     */
    var getClosestCompatible = function(srcAreas, dstAreas) {
        var draggedAreas,
            underAreas,
            fromDraggedItem,
            toDraggedItem,
            d1,
            d2;

        draggedAreas = sortByRole(srcAreas);
        underAreas = sortByRole(dstAreas);
        fromDraggedItem = getClosestConnAreas(draggedAreas[BLOCK_CONSTANTS.CONN_INCOMING],
                                              underAreas[BLOCK_CONSTANTS.CONN_OUTGOING]);
        toDraggedItem = getClosestConnAreas(draggedAreas[BLOCK_CONSTANTS.CONN_OUTGOING],
                                            underAreas[BLOCK_CONSTANTS.CONN_INCOMING]);
        d1 = fromDraggedItem.distance;
        d2 = toDraggedItem.distance;

        return d1 < d2 ? fromDraggedItem : toDraggedItem;
    };

    var convertArrayToHash = function (array) {
        var result = {};

        for (var i = array.length-1; i>=0; i--) {
            result[array[i]] = true;
        }

        return result;
    };

    var filterAreasByPtrs = function(params) {
        var areas = params.areas.slice(),
            ptrsToTarget = params.to ? convertArrayToHash(params.to) : {},
            ptrsFromTarget = params.from ? convertArrayToHash(params.from) : {},
            hasSiblingPtr,
            j;

        for (var i = areas.length-1; i >= 0; i--) {
            switch (areas[i].role) {
                case BLOCK_CONSTANTS.CONN_INCOMING:
                    // Check to make sure ptrsFromTarget contains a sibling ptr
                    // Also check for containment if not sibling ptr TODO
                    hasSiblingPtr = false;
                    j = BLOCK_CONSTANTS.SIBLING_PTRS.length;
                    while (j-- && !hasSiblingPtr) {
                        hasSiblingPtr = ptrsFromTarget[BLOCK_CONSTANTS.SIBLING_PTRS[j]] !== undefined;
                    }

                    if (!hasSiblingPtr) {
                        areas.splice(i,1);
                    }
                    break;

                case BLOCK_CONSTANTS.CONN_OUTGOING:
                    if (!ptrsToTarget[areas[i].ptr]) {
                        areas.splice(i,1);
                    }
                    break;
            }
        }

        return areas;
    };

    var shiftConnArea = function (params) {
        var area = params.area,
            dx = params.dx || 0,
            dy = params.dy || 0;

        area.x1 += dx;
        area.x2 += dx;
        area.y1 += dy;
        area.y2 += dy;

        return area;
    };

    var shiftConnAreas = function (params) {
        var areas = params.areas || [],
            dx = params.dx || 0,
            dy = params.dy || 0;

        for (var i = areas.length-1; i >= 0; i--) {
            areas[i] = shiftConnArea({area: areas[i], dx: dx, dy: dy});
        }

        return areas;
    };

    return {
        getClosestCompatibleConn: getClosestCompatible,
        filterAreasByPtrs: filterAreasByPtrs,
        shiftConnAreas: shiftConnAreas,
        shiftConnArea: shiftConnArea
    };

});
