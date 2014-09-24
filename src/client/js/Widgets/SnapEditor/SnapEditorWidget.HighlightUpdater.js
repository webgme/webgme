/*globals define*/
/*
 * @author brollb / https://github/brollb
 */
//This is the connection highlight updater
define(['./SnapEditorWidget.Constants.js'], function (SNAP_CONSTANTS) {

    "use strict";

    var SnapEditorWidgetHighlightUpdater,
        ITEM_TAG = "current_droppable_item";

    SnapEditorWidgetHighlightUpdater = function () {
    };

    SnapEditorWidgetHighlightUpdater.prototype.registerDraggingItem = function (ui) {
        var i;

        this._ui = ui;
        this._underItems = [];
        this._draggedIds = [];

        i = this._ui.children().length;
        while (i--){
            this._draggedIds.push(this._ui.children()[i].id);
        }
    };

    SnapEditorWidgetHighlightUpdater.prototype.unregisterDraggingItem = function () {
        this._ui = null;
        this._underItems = null;
        this._draggedIds = null;
    };

    SnapEditorWidgetHighlightUpdater.prototype.registerUnderItem = function (underItem) {
        //Only register if the item is not in the list of dragged items
        if (this._underItems !== null && this._draggedIds.indexOf(underItem.id) === -1){
            this._underItems.push(underItem);

            if (this._underItems.length === 1){
                this._updateHighlights(this);
            }
        }
    };

    SnapEditorWidgetHighlightUpdater.prototype.unregisterUnderItem = function (item) {
        var i,
            ui;

        if (this._underItems){
            i = this._underItems.indexOf(item);
            ui = this._ui;
            if (i !== -1){
                this._underItems.splice(i,1);
                if (ui.data(ITEM_TAG) === item.id){
                    item.deactivateConnectionAreas();
                    this.dropFocus = SNAP_CONSTANTS.BACKGROUND;

                    //Remove data from dragged ui
                    ui.removeData(ITEM_TAG);
                }
            }
        }
    };

    SnapEditorWidgetHighlightUpdater.prototype._updateHighlights = function (self) {
        var items,
            closestArea,
            closestItem,
            connectionDistance,
            connectionInfo,
            draggedUI,
            draggedId,
            dragged,
            draggedIds,
            pos,
            otherItemId,
            minDistance,
            selector,
            j;

        if (self._underItems && self._underItems.length){

            items = self._underItems.slice();
            draggedUI = self._ui;
            selector = '#' + draggedUI.attr('id') + '.' + draggedUI.attr('class');
            draggedId = draggedUI.attr('id');
            dragged = self.items[draggedId];//from the canvas
            draggedIds = [];
            minDistance = null;
            closestItem = null;
            closestArea = null;

            pos = $(selector).position();
            pos.left -= items[0].$el.parent().offset().left;
            pos.top -= items[0].$el.parent().offset().top;

            //Update the highlight
            for (j = items.length-1; j >= 0; j--){
                if(draggedIds.indexOf(items[j].id) === -1){//If it isn't hovering over itself
                    connectionInfo = items[j].getClosestConnectionArea(dragged, pos);
                    connectionDistance = connectionInfo.distance;

                    if (connectionInfo.area && //there is a compatible match
                        (minDistance === null || connectionDistance < minDistance)){

                        closestItem = items[j];
                        closestArea = connectionInfo.area;
                        minDistance = closestArea;
                    }

                }
            }
            self.logger.debug("Hovering over " + items.join(","));

            if (closestItem){
                //Deactivate the previous connection area
                if (draggedUI.data(ITEM_TAG)){
                    otherItemId = draggedUI.data(ITEM_TAG);
                    self.items[otherItemId].deactivateConnectionAreas();
                }

                //set the closest item
                closestItem.setActiveConnectionArea(closestArea);
                self.dropFocus = SNAP_CONSTANTS.ITEM;

                //Store the data in the dragged object
                draggedUI.data(ITEM_TAG, closestItem.id);
            }

            if (self._ui !== null){
                setTimeout(self._updateHighlights, 100, self);
            }
        }
    };

    return SnapEditorWidgetHighlightUpdater;
});
