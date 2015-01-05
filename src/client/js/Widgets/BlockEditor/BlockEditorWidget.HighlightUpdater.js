/*globals define*/
/*
 * @author brollb / https://github/brollb
 */
//This is the connection highlight updater
define([
    './BlockEditorWidget.Constants.js'
], function (
    SNAP_CONSTANTS
) {

    "use strict";

    var BlockEditorWidgetHighlightUpdater,
        ROOT = 'root',
        LEAVES = 'leaves',
        ITEM_TAG = "current_droppable_item";

    /* Helper functions for finding best connection area */
    var getCenter = function(connArea) {
        return [(connArea.x1+connArea.x2)/2, (connArea.y1+connArea.y2)/2];
    };

    var getDistance = function(src, dst) {
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
    var getClosestDestinations = function(srcs, dsts) {
        var minDistance = getDistance(srcs[0], dsts[0]),
            connArea = dsts[0],
            distance;

        for(var i = srcs.length-1; i >= 0; i--) {
            for(var j = dsts.length-1; j >= 0; j--) {
                distance = getDistance(srcs[i], dsts[j]);
                if (distance < minDistance) {
                    minDistance = distance;
                    connArea = dsts[j];
                }
            }
        }

        return connArea;
    };

    BlockEditorWidgetHighlightUpdater = function () {
    };

    BlockEditorWidgetHighlightUpdater.prototype.registerDraggingItem = function (ui) {
        var i;

        this._ui = ui;
        this._underItems = {};
        this._underItemCount = 0;
        this._draggedIds = {};
        this._draggedTree = {};
        this._draggedTree[LEAVES] = [];

        i = this._ui.children().length;
        while (i--){
            this._draggedIds[ this._ui.children()[i].id ] = true;
        }

        // BFS from the root taking all sibling ptr paths
        var current,
            root = this.items[this._ui[0].id],
            isLeaf,
            areas,
            ptr,
            next = [];

        // Set up the valid connection areas
        this._draggedConnAreas = root.getRelativeConnectionAreas();
        this._draggedTree[ROOT] = root;
        current = [root];

        // Add all open sibling ptrs conn areas
        while (current.length) {
            for (i = current.length-1; i >= 0; i--) {
                isLeaf = false;
                areas = current[i].getRelativeConnectionAreas();
                for (var j = areas.length-1; j >= 0; j--) {
                    ptr = areas[j].ptr;
                    if (SNAP_CONSTANTS.SIBLING_PTRS.indexOf(ptr) !== -1) {
                        if (current[i].ptrs[SNAP_CONSTANTS.CONN_OUTGOING][ptr]) {
                            next.push(current[i].ptrs[SNAP_CONSTANTS.CONN_OUTGOING][ptr]);
                        } else {
                            this._draggedConnAreas.push(areas[j]);
                            isLeaf = true;
                        }
                    }
                }

                if (isLeaf) {
                    this._draggedTree[LEAVES].push(current[i]);
                }
            }

            current = next;
            next = [];
        }

    };

    BlockEditorWidgetHighlightUpdater.prototype.unregisterDraggingItem = function () {
        this._ui = null;
        this._underItems = null;
        this._underItemCount = 0;
        this._draggedIds = null;
        this._draggedTree = null;
    };

    BlockEditorWidgetHighlightUpdater.prototype.registerUnderItem = function (underItem) {
        var connAreas = [],
            i,
            j,
            validPtrsToDragged,
            validPtrsFromDragged,
            hasSiblingPtr,
            ptrs;

        // Filter the connAreas by META definition
        if (this._underItems !== null && !this._draggedIds[underItem.id]){
            connAreas = underItem.getConnectionAreas();

            // Get valid pointer types
            validPtrsToDragged = {};
            ptrs = this.getValidPointerTypes(underItem, this._draggedTree[ROOT]);
            for (i = ptrs.length-1; i>=0; i--) {
                validPtrsToDragged[ptrs[i]] = true;
            }

            validPtrsFromDragged = {};
            for (i = this._draggedTree[LEAVES].length-1; i >= 0; i--){
                ptrs = this.getValidPointerTypes(this._draggedTree[LEAVES][i], underItem);
                for (j = ptrs.length-1; j>=0; j--) {
                    validPtrsFromDragged[ptrs[j]] = true;
                }
            }

            for (i = connAreas.length-1; i >= 0; i--) {
                switch (connAreas[i].role) {
                    case SNAP_CONSTANTS.CONN_INCOMING:
                        // Check to make sure validPtrsFromDragged contains a sibling ptr
                        // Also check for containment if not sibling ptr TODO
                        hasSiblingPtr = false;
                        j = SNAP_CONSTANTS.SIBLING_PTRS.length;
                        while (j-- && !hasSiblingPtr) {
                            hasSiblingPtr = validPtrsFromDragged[SNAP_CONSTANTS.SIBLING_PTRS[j]] !== undefined;
                        }

                        if (!hasSiblingPtr) {
                          connAreas.splice(i,1);
                        }
                        break;
                    
                    case SNAP_CONSTANTS.CONN_OUTGOING:
                        if (!validPtrsToDragged[connAreas[i].ptr]) {
                          connAreas.splice(i,1);
                        }
                        break;
                }
            }
        }

        if (connAreas.length) {
            this._underItemCount++;
            this._underItems[underItem.id] = connAreas;
        
            if (this._underItemCount === 1){
                this._updateHighlights(this);
            }
        }
    };

    BlockEditorWidgetHighlightUpdater.prototype.unregisterUnderItem = function (item) {

        if (this._underItems && this._underItems[item.id]){
            this._underItemCount--;
            delete this._underItems[item.id];
            if (this._ui.data(ITEM_TAG) === item.id){
                item.deactivateConnectionAreas();
                this.dropFocus = SNAP_CONSTANTS.BACKGROUND;

                //Remove data from dragged ui
                this._ui.removeData(ITEM_TAG);
            }
        }
    };

    BlockEditorWidgetHighlightUpdater.prototype._updateHighlights = function (self) { 
        var underConnAreas,
            draggedConnAreas,
            pos,
            selector,
            ids,
            closestItem,
            otherItemId,
            closestArea,
            i;

        if (self._underItemCount){

            // Get connection areas under dragged stuff
            underConnAreas = [];
            ids = Object.keys(self._underItems);
            for (i = ids.length-1; i >= 0; i--) {
                underConnAreas = underConnAreas.concat(self._underItems[ids[i]]);
            }

            selector = '#' + self._ui.attr('id') + '.' + self._ui.attr('class');
            pos = $(selector).position();
            pos.left -= self._draggedTree[ROOT].$el.parent().offset().left;
            pos.top -= self._draggedTree[ROOT].$el.parent().offset().top;

            // Duplicate and shift all dragged connection areas 
            draggedConnAreas = [];

            var connArea;
            for (i = self._draggedConnAreas.length-1; i >= 0; i--) {
                connArea = _.extend({}, self._draggedConnAreas[i]);
                connArea.x1 += pos.left;
                connArea.x2 += pos.left;
                connArea.y1 += pos.top;
                connArea.y2 += pos.top;

                draggedConnAreas.push(connArea);
            }

            closestArea = getClosestDestinations(draggedConnAreas, underConnAreas);

            // Update the highlight
            if (closestArea){
                closestItem = self.items[closestArea.parentId];
                // Deactivate the previous connection area
                if (self._ui.data(ITEM_TAG)){
                    otherItemId = self._ui.data(ITEM_TAG);
                    self.items[otherItemId].deactivateConnectionAreas();
                }

                // highlight the new conn area
                closestItem.setActiveConnectionArea(closestArea);
                self.dropFocus = SNAP_CONSTANTS.ITEM;

                // Store the data in the dragged object
                self._ui.data(ITEM_TAG, closestItem.id);
            }

            setTimeout(self._updateHighlights, 100, self);
        }
    };

    return BlockEditorWidgetHighlightUpdater;
});
