/*globals define*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * @author brollb / https://github/brollb
 */

define(['js/DragDrop/DropTarget',
        './SnapEditorWidget.Constants'], function (dropTarget,
                                                   SnapEditorWidgetConstants) {

    "use strict";

    var SnapEditorWidgetDroppable,
        DROP_REGION_MARGIN = 0,
        CLICKABLE_CLASS = "clickable",
        ITEM_TAG = "current_droppable_item",
        DISTANCE_TAG = "connection_distance";

    SnapEditorWidgetDroppable = function () {
    };


    SnapEditorWidgetDroppable.prototype._initDroppable = function () {
        var self = this;
        this.dropFocus = SnapEditorWidgetConstants.BACKGROUND;

        this._acceptDroppable = false;

        this.skinParts.$dropRegion = $('<div/>', { "class" : SnapEditorWidgetConstants.DROP_REGION_CLASS });

        this.skinParts.$dropRegion.insertBefore(this.skinParts.$itemsContainer);

        dropTarget.makeDroppable(this.skinParts.$dropRegion, {
            'over': function( event, dragInfo ) {
                self._onDroppableOver(event, dragInfo);
            },
            'out': function(/*event, dragInfo*/) {
                self._onDroppableOut(/*event, dragInfo*/);
            },
            'drop': function( event, dragInfo ) {
                if (self.dropFocus === SnapEditorWidgetConstants.BACKGROUND){
                    self._onBackgroundDrop(event, dragInfo);
                }
            },
            'activate': function(/*event, dragInfo*/) {
                self._onDroppableActivate(/*event, dragInfo*/);
            },
            'deactivate': function(/*event, dragInfo*/) {
                self._onDroppableDeactivate(/*event, dragInfo*/);
            }
        });
    };


    SnapEditorWidgetDroppable.prototype._onDroppableActivate = function (/*event, dragInfo*/) {
        if (this.mode === this.OPERATING_MODES.DESIGN) {
            this.skinParts.$dropRegion.css({"width": this._containerSize.w - 2 * DROP_REGION_MARGIN,
                "height": this._containerSize.h - 2 * DROP_REGION_MARGIN,
                "top": this._scrollPos.top + DROP_REGION_MARGIN,
                "left": this._scrollPos.left + DROP_REGION_MARGIN });
        }
    };


    SnapEditorWidgetDroppable.prototype._onDroppableDeactivate = function (/*event, dragInfo*/) {
        this.skinParts.$dropRegion.css({"width": "0px",
            "height": "0px",
            "top": "0px",
            "left": "0px"});
    };


    SnapEditorWidgetDroppable.prototype._onDroppableOver = function (event, dragInfo) {
        this.logger.debug('_onDroppableOver: ' + JSON.stringify(dragInfo));

        //this.selectionManager.clear();

        if (dragInfo) {
            this._doAcceptDroppable(this.onBackgroundDroppableAccept(event, dragInfo), true);
        } else {
            this._doAcceptDroppable(false, false);
        }
    };


    SnapEditorWidgetDroppable.prototype._onDroppableOut = function (/*event, dragInfo*/) {
        this._doAcceptDroppable(false, false);
    };


    SnapEditorWidgetDroppable.prototype._onBackgroundDrop = function (event, dragInfo) {
        var mPos = this.getAdjustedMousePos(event),
            posX = mPos.mX,
            posY = mPos.mY;

        this.logger.debug('_onBackgroundDrop: ' + JSON.stringify(dragInfo));

        if (this._acceptDroppable === true) {
            this.onBackgroundDrop(event, dragInfo, { "x": posX, "y": posY });
        }

        this._doAcceptDroppable(false, false);
    };


    SnapEditorWidgetDroppable.prototype._doAcceptDroppable = function (accept, uiFeedback) {
        this.skinParts.$dropRegion.removeClass(SnapEditorWidgetConstants.DROP_REGION_ACCEPT_DROPPABLE_CLASS);
        this.skinParts.$dropRegion.removeClass(SnapEditorWidgetConstants.DROP_REGION_REJECT_DROPPABLE_CLASS);

        if (accept === true) {
            this._acceptDroppable = true;
            if (uiFeedback) {
                this.skinParts.$dropRegion.addClass(SnapEditorWidgetConstants.DROP_REGION_ACCEPT_DROPPABLE_CLASS);
            }
        } else {
            this._acceptDroppable = false;
            if (uiFeedback) {
                this.skinParts.$dropRegion.addClass(SnapEditorWidgetConstants.DROP_REGION_REJECT_DROPPABLE_CLASS);
            }
        }
    };


    SnapEditorWidgetDroppable.prototype.onBackgroundDroppableAccept = function (event, dragInfo) {
        this.logger.warning("SnapEditorWidget.prototype.onBackgroundDroppableAccept(event, dragInfo) not overridden in controller!!! dragInfo:" + JSON.stringify(dragInfo));
        return false;
    };


    SnapEditorWidgetDroppable.prototype.onBackgroundDrop = function (event, dragInfo, position) {
        this.logger.warning("SnapEditorWidget.prototype.onBackgroundDrop(event, dragInfo) not overridden in controller!!! dragInfo:" + JSON.stringify(dragInfo) + " , position: '" + JSON.stringify(position) + "'");
    };


    SnapEditorWidgetDroppable.prototype._enableDroppable = function (enabled) {
        if (this.skinParts.$dropRegion) {
            if (enabled === true) {
                dropTarget.enableDroppable(this.skinParts.$dropRegion, true);
                if (this._savedAcceptDroppable !== undefined) {
                    this._doAcceptDroppable(this._savedAcceptDroppable, true);
                    this._savedAcceptDroppable = undefined;
                }
            } else {
                dropTarget.enableDroppable(this.skinParts.$dropRegion, false);
                this._savedAcceptDroppable = this._acceptDroppable;
                this._doAcceptDroppable(false, false);
            }
        }
    };

    /* * * * * * * * * * * * * Dropping on Clickable Item* * * * * * * * * * * * */

    SnapEditorWidgetDroppable.prototype.setClickable = function (item) {
        var self = this;
        //Set the item to droppable
        //item.$el.addClass(CLICKABLE_CLASS);
        item.$el.droppable({
            tolerance: "touch",
            over: function(event, ui) {
                var draggedUI = ui.helper,
                    draggedId = ui.draggable[0].id,
                    dragged = self.items[draggedId],
                    pos;

                if (dragged === undefined){
                    //Need to find the appropriate connection areas for a non-existent item...
                    //Not sure how to do this yet...
                    //TODO 
                    self.logger.warn("Dragging item from outside panel is not supported yet!");
                }else{
                    //item has been created

                    var draggedIds = [],
                        i = ui.helper.children().length;

                    while (i--){
                        draggedIds.push(ui.helper.children()[i].id);
                    }

                    pos = ui.helper.find("#" + dragged.id).position();
                    pos.left += event.pageX - ui.draggable.parent().offset().left;
                    pos.top += event.pageY - ui.draggable.parent().offset().top;

                    if(draggedIds.indexOf(item.id) === -1){//If it isn't hovering over itself
                        //if the ITEM_TAG is the item's id (or null) 
                        //OR the connection distance is closer
                        //THEN setActiveConnectionArea
                        var connectionInfo = item.getClosestConnectionArea(dragged, pos),
                            connectionDistance = connectionInfo.distance;

                        if (connectionInfo.area && 
                                (!draggedUI.data(ITEM_TAG) || draggedUI.data(ITEM_TAG) === item.id || draggedUI.data(DISTANCE_TAG) > connectionDistance)){

                            //This connection area is the best choice
                            item.setActiveConnectionArea(connectionInfo.area);
                            self.dropFocus = SnapEditorWidgetConstants.ITEM;

                            //Deactivate the previous connection area
                            if (draggedUI.data(ITEM_TAG)){
                                var otherItemId = draggedUI.data(ITEM_TAG);
                                self.items[otherItemId].deactivateConnectionAreas();
                            }

                            //Store the data in the dragged object
                            draggedUI.data(ITEM_TAG, item.id);
                            draggedUI.data(DISTANCE_TAG, connectionDistance);
                        }

                    }
                }
            },
            out: function(event, ui) {

                if (ui.helper.data(ITEM_TAG) === item.id){
                    item.deactivateConnectionAreas();
                    self.dropFocus = SnapEditorWidgetConstants.BACKGROUND;

                    //Remove data from dragged ui
                    ui.helper.removeData(ITEM_TAG);
                }
            },
            drop: function(event, ui) {
                if (self.dropFocus === SnapEditorWidgetConstants.ITEM && ui.helper.data(ITEM_TAG) === item.id){
                    self._onItemDrop(item, event, ui);
                }
            }
        });
    };

    SnapEditorWidgetDroppable.prototype._onItemDrop = function (item, event, ui) {
        //connect the items (with the controller)
        if (item.activeConnectionArea){
            var i = ui.helper.children().length,
                draggedId = ui.helper[0].id;

            //dragged.connectToActive(item);
            var itemId = item.id,
                ptr = item.activeConnectionArea.ptr;

            //If multiple ptrs, select the closest compatible
            if(ptr instanceof Array){//Find the closest compatible area
                var ptrs = ptr,
                    shortestDistance,
                    connArea,
                    draggedItem = this.items[draggedId],
                    role = item.activeConnectionArea.role === SnapEditorWidgetConstants.CONN_ACCEPTING ?
                        SnapEditorWidgetConstants.CONN_PASSING : SnapEditorWidgetConstants.CONN_ACCEPTING;

                i = ptrs.length;

                while (i--){
                    connArea = draggedItem.getConnectionArea(ptrs[i], role);

                    if (connArea && (!shortestDistance || draggedItem.__getDistanceBetweenConnections(connArea, 
                                    item.activeConnectionArea) < shortestDistance)){
                                        shortestDistance = draggedItem.__getDistanceBetweenConnections(connArea, 
                                                item.activeConnectionArea);
                                        ptr = ptrs[i];
                                    }
                }

            }


            this.onItemDrop(draggedId, itemId, ptr, item.activeConnectionArea.role);

            //hide the conn areas
            item.deactivateConnectionAreas();

        }//else{//drop to background
        //  this._onBackgroundDrop(event, dragInfo);
        //}

        this.selectionManager.clear();
        this.dropFocus = SnapEditorWidgetConstants.BACKGROUND;
    };

    SnapEditorWidgetDroppable.prototype.onItemDrop = function (droppedItems, receiver) {
        this.logger.warning("SnapEditorWidget.prototype.onItemDrop(event, droppedItems) not overridden in controller!!! droppedItems:" + JSON.stringify(droppedItems) + " , position: '" + JSON.stringify(receiver) + "'");
    };

    return SnapEditorWidgetDroppable;
});
