/*globals define, $*/
/*jshint browser: true*/

/**
 * @author brollb / https://github/brollb
 */

define([
    'js/DragDrop/DropTarget',
    './BlockEditorWidget.Constants'
], function (dropTarget, BLOCK_CONSTANTS) {

    'use strict';

    var BlockEditorWidgetDroppable,
        DROP_REGION_MARGIN = 0,
        ITEM_TAG = 'current_droppable_item';

    BlockEditorWidgetDroppable = function () {
    };


    BlockEditorWidgetDroppable.prototype._initDroppable = function () {
        var self = this;
        this.dropFocus = BLOCK_CONSTANTS.BACKGROUND;

        this._acceptDroppable = false;

        this.skinParts.$dropRegion = $('<div/>', {class: BLOCK_CONSTANTS.DROP_REGION_CLASS});

        this.skinParts.$dropRegion.insertBefore(this.skinParts.$itemsContainer);

        dropTarget.makeDroppable(this.skinParts.$dropRegion, {
            over: function (event, dragInfo) {
                self._onDroppableOver(event, dragInfo);
            },
            out: function (/*event, dragInfo*/) {
                self._onDroppableOut(/*event, dragInfo*/);
            },
            drop: function (event, dragInfo) {
                if (self.dropFocus === BLOCK_CONSTANTS.BACKGROUND) {
                    self._onBackgroundDrop(event, dragInfo);
                }
            },
            activate: function (/*event, dragInfo*/) {
                self._onDroppableActivate(/*event, dragInfo*/);
            },
            deactivate: function (/*event, dragInfo*/) {
                self._onDroppableDeactivate(/*event, dragInfo*/);
            }
        });
    };


    BlockEditorWidgetDroppable.prototype._onDroppableActivate = function (/*event, dragInfo*/) {
        if (this.mode === this.OPERATING_MODES.DESIGN) {
            this.skinParts.$dropRegion.css({
                width: this._containerSize.w - 2 * DROP_REGION_MARGIN,
                height: this._containerSize.h - 2 * DROP_REGION_MARGIN,
                top: this._scrollPos.top + DROP_REGION_MARGIN,
                left: this._scrollPos.left + DROP_REGION_MARGIN
            });
        }
    };


    BlockEditorWidgetDroppable.prototype._onDroppableDeactivate = function (/*event, dragInfo*/) {
        this.skinParts.$dropRegion.css({
            width: '0px',
            height: '0px',
            top: '0px',
            left: '0px'
        });
    };


    BlockEditorWidgetDroppable.prototype._onDroppableOver = function (event, dragInfo) {
        this.logger.debug('_onDroppableOver: ' + JSON.stringify(dragInfo));

        //this.selectionManager.clear();

        if (dragInfo) {
            this._doAcceptDroppable(this.onBackgroundDroppableAccept(event, dragInfo), true);
        } else {
            this._doAcceptDroppable(false, false);
        }
    };


    BlockEditorWidgetDroppable.prototype._onDroppableOut = function (/*event, dragInfo*/) {
        this._doAcceptDroppable(false, false);
    };


    BlockEditorWidgetDroppable.prototype._onBackgroundDrop = function (event, dragInfo) {
        var mPos = this.getAdjustedMousePos(event),
            posX = mPos.mX,
            posY = mPos.mY;

        this.logger.debug('_onBackgroundDrop: ' + JSON.stringify(dragInfo));

        if (this._acceptDroppable === true) {
            this.onBackgroundDrop(event, dragInfo, {x: posX, y: posY});
        }

        this._doAcceptDroppable(false, false);
    };


    BlockEditorWidgetDroppable.prototype._doAcceptDroppable = function (accept, uiFeedback) {
        this.skinParts.$dropRegion.removeClass(BLOCK_CONSTANTS.DROP_REGION_ACCEPT_DROPPABLE_CLASS);
        this.skinParts.$dropRegion.removeClass(BLOCK_CONSTANTS.DROP_REGION_REJECT_DROPPABLE_CLASS);

        if (accept === true) {
            this._acceptDroppable = true;
            if (uiFeedback) {
                this.skinParts.$dropRegion.addClass(BLOCK_CONSTANTS.DROP_REGION_ACCEPT_DROPPABLE_CLASS);
            }
        } else {
            this._acceptDroppable = false;
            if (uiFeedback) {
                this.skinParts.$dropRegion.addClass(BLOCK_CONSTANTS.DROP_REGION_REJECT_DROPPABLE_CLASS);
            }
        }
    };


    BlockEditorWidgetDroppable.prototype.onBackgroundDroppableAccept = function (event, dragInfo) {
        this.logger.warn('BlockEditorWidget.prototype.onBackgroundDroppableAccept(event, dragInfo) not overridden in ' +
        'controller!!! dragInfo:' + JSON.stringify(dragInfo));
        return false;
    };


    BlockEditorWidgetDroppable.prototype.onBackgroundDrop = function (event, dragInfo, position) {
        this.logger.warn('BlockEditorWidget.prototype.onBackgroundDrop(event, dragInfo) not overridden in ' +
        'controller!!! dragInfo:' + JSON.stringify(dragInfo) + ' , position: "' + JSON.stringify(position) + '"');
    };


    BlockEditorWidgetDroppable.prototype._enableDroppable = function (enabled) {
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

    /* * * * * * * * * * * * * Dropping on Linkable Item* * * * * * * * * * * * */

    BlockEditorWidgetDroppable.prototype.setLinkable = function (item) {
        var self = this;
        //Set the item to droppable
        //item.$el.addClass(CLICKABLE_CLASS);
        item.$el.droppable({
            tolerance: 'touch',
            over: function (event, ui) {
                var draggedId = ui.draggable[0].id,
                    dragged = self.items[draggedId];

                if (dragged === undefined) {
                    //Need to find the appropriate connection areas for a non-existent item...
                    //Not sure how to do this yet...
                    //TODO 
                    self.logger.warn('Dragging item from outside panel is not supported yet!');
                } else {
                    //item has been created

                    self.registerUnderItem(item);
                }
            },
            out: function () {

                self.unregisterUnderItem(item);
            },
            drop: function (event, ui) {
                if (self.dropFocus === BLOCK_CONSTANTS.ITEM && ui.helper.data(ITEM_TAG) === item.id) {
                    self._onItemDrop(item, event, ui);
                    self.unregisterDraggingItem();
                }
            }
        });
    };

    BlockEditorWidgetDroppable.prototype._onItemDrop = function (item, event, ui) {
        if (item.activeConnectionArea) {
            var draggedId = ui.helper[0].id,
                itemId = item.id,
                ptr = ui.helper.data(BLOCK_CONSTANTS.DRAGGED_PTR_TAG),
                activeItem = ui.helper.data(BLOCK_CONSTANTS.DRAGGED_ACTIVE_ITEM_TAG),
                position = ui.helper.data(BLOCK_CONSTANTS.DRAGGED_POSITION_TAG);

            //Make sure they aren't already connected
            if (!item.getItemAtConnId(item.activeConnectionArea.id) ||
                draggedId !== item.getItemAtConnId(item.activeConnectionArea.id).id) {
                this.onItemDrop({
                    firstItem: draggedId,
                    receiver: itemId,
                    activeItem: this.items[activeItem],
                    ptr: ptr,
                    offset: position,
                    role: item.activeConnectionArea.role
                });
            }

            //hide the conn areas
            item.deactivateConnectionAreas();

        }

        this.selectionManager.clear();
        this.dropFocus = BLOCK_CONSTANTS.BACKGROUND;
    };

    BlockEditorWidgetDroppable.prototype.onItemDrop = function (droppedItems, receiver) {
        this.logger.warn('BlockEditorWidget.prototype.onItemDrop(event, droppedItems) not overridden in controller!!!' +
        ' droppedItems:' + JSON.stringify(droppedItems) + ' , position: "' + JSON.stringify(receiver) + '"');
    };

    return BlockEditorWidgetDroppable;
});
