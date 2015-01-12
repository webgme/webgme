/*globals define*/
/*
 * @author brollb / https://github/brollb
 */
//This is the connection highlight updater
define([
    './BlockEditorWidget.Constants.js',
    './BlockEditorWidget.Utils.js'
], function (
    BLOCK_CONSTANTS,
    Utils
) {

    "use strict";

    var BlockEditorWidgetHighlightUpdater,
        ROOT = 'root',
        LEAVES = 'leaves',
        ITEM_TAG = 'current_droppable_item';

    BlockEditorWidgetHighlightUpdater = function () {
    };

    BlockEditorWidgetHighlightUpdater.prototype.registerDraggingItem = function (ui) {
        var i,
            draggedItemContainer = ui.children()[0];

        this._ui = ui;
        this._underItems = {};
        this._underItemCount = 0;
        this._draggedIds = {};
        this._draggedTree = {};
        this._draggedTree[LEAVES] = [];

        for (i = draggedItemContainer.children.length-1; i >= 0; i--){
            this._draggedIds[ draggedItemContainer.children[i].id ] = true;
        }

        // BFS from the root taking all sibling ptr paths
        var current,
            root = this.items[this._ui[0].id],
            isLeaf,
            areas,
            ptr,
            incomingRootArea = root.getConnectionArea({role: BLOCK_CONSTANTS.CONN_INCOMING}),
            next = [];

        // Set up the valid connection areas
        this._draggedConnAreas = root.getRelativeFreeConnectionAreas();

        // Add incoming connection area of root (as it will be disconnected on any move)
        if (this._draggedConnAreas.indexOf(incomingRootArea) === -1) {
            this._draggedConnAreas.push(incomingRootArea);
        }
        
        this._draggedTree[ROOT] = root;
        current = [root];

        // Add all open sibling ptrs conn areas
        while (current.length) {
            for (i = current.length-1; i >= 0; i--) {
                isLeaf = false;
                areas = current[i].getRelativeFreeConnectionAreas();
                for (var j = areas.length-1; j >= 0; j--) {
                    ptr = areas[j].ptr;
                    if (BLOCK_CONSTANTS.SIBLING_PTRS.indexOf(ptr) !== -1) {
                        if (current[i].ptrs[ptr]) {
                            next.push(current[i].ptrs[ptr]);
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
            validPtrsToDragged = this.getValidPointerTypes({src: underItem, 
                                              dst: this._draggedTree[ROOT]});
            validPtrsFromDragged = [];
            for (i = this._draggedTree[LEAVES].length-1; i >= 0; i--){
                ptrs = this.getValidPointerTypes({src: this._draggedTree[LEAVES][i], 
                                                  dst: underItem});

                validPtrsFromDragged = validPtrsFromDragged.concat(ptrs);
            }

            connAreas = Utils.filterAreasByPtrs({areas: connAreas, 
                                                 to: validPtrsToDragged, 
                                                 from: validPtrsFromDragged});
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
                this.dropFocus = BLOCK_CONSTANTS.BACKGROUND;

                //Remove data from dragged ui
                this._ui.removeData(ITEM_TAG);
                this._ui.removeData(BLOCK_CONSTANTS.DRAGGED_PTR_TAG);
            }
        }
    };

    BlockEditorWidgetHighlightUpdater.prototype._updateHighlights = function (self) { 
        var underConnAreas,
            draggedConnAreas,
            pos,
            ids,
            closestItem,
            otherItemId,
            closest,
            i;

        if (self._underItemCount){

            // Get connection areas under dragged stuff
            var underConnAreas = [];
            ids = Object.keys(self._underItems);
            for (i = ids.length-1; i >= 0; i--) {
                underConnAreas = underConnAreas.concat(self._underItems[ids[i]]);
            }

            // Duplicate and shift all dragged connection areas 
            pos = self._ui.position();
            pos.left += BLOCK_CONSTANTS.DRAG_HELPER_BUFFER - 
                            self._draggedTree[ROOT].$el.parent().offset().left;
            pos.top += BLOCK_CONSTANTS.DRAG_HELPER_BUFFER - 
                            self._draggedTree[ROOT].$el.parent().offset().top;

            // Shift the position...
            draggedConnAreas = [];

            var connArea;
            for (i = self._draggedConnAreas.length-1; i >= 0; i--) {
                connArea = _.extend({}, self._draggedConnAreas[i]);
                connArea = Utils.shiftConnArea({area: connArea, dx: pos.left, dy: pos.top});

                draggedConnAreas.push(connArea);
            }

            closest = Utils.getClosestCompatibleConn(draggedConnAreas, underConnAreas);

            // Update the highlight
            if (closest.area){
                closestItem = self.items[closest.area.parentId];
                // Deactivate the previous connection area
                if (self._ui.data(ITEM_TAG)){
                    otherItemId = self._ui.data(ITEM_TAG);
                    self.items[otherItemId].deactivateConnectionAreas();
                }

                // highlight the new conn area
                closestItem.setActiveConnectionArea(closest.area);
                self.dropFocus = BLOCK_CONSTANTS.ITEM;

                // Store the data in the dragged object
                self._ui.data(ITEM_TAG, closestItem.id);
                self._ui.data(BLOCK_CONSTANTS.DRAGGED_PTR_TAG, closest.ptr);
                self._ui.data(BLOCK_CONSTANTS.DRAGGED_ACTIVE_ITEM_TAG, closest.activeItem);
                self._ui.data(BLOCK_CONSTANTS.DRAGGED_POSITION_TAG, [pos.left, pos.top]);
            }

            setTimeout(self._updateHighlights, 100, self);
        }
    };

    return BlockEditorWidgetHighlightUpdater;
});
