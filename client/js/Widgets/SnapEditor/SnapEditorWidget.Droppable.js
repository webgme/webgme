/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/DragDrop/DropTarget',
        './SnapEditorWidget.Constants'], function (dropTarget,
                                                   SnapEditorWidgetConstants) {

    var SnapEditorWidgetDroppable,
        DROP_REGION_MARGIN = 0,
        CLICKABLE_CLASS = "clickable";

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
            tolerance: "touch",//May switch to "touch" 
            over: function(event, ui) {
                var dragged = self.items[ui.draggable[0].id],
                    pos = ui.helper.find("#" + dragged.id).position();

                pos.left += event.pageX - ui.draggable.parent().offset().left;
                pos.top += event.pageY - ui.draggable.parent().offset().top;

                if(item.updateHighlight(dragged, pos)){
                    self.dropFocus = SnapEditorWidgetConstants.ITEM;
                }
                //ui.draggable.data("current-clickable", $this);
            },
            out: function(event, ui) {
                item.deactivateConnectionAreas();
                self.dropFocus = SnapEditorWidgetConstants.BACKGROUND;
            },
            drop: function(event, ui) {
                //connect the items (with the controller)
                var dragged = self.items[ui.draggable[0].id];
                dragged.connectToActive(item);
                //TODO FIXME

                //hide the conn areas
                item.deactivateConnectionAreas();

                //var $this = $(this);
                //cleanupHighlight(ui, $this);
                //var $new = $this.clone().children("td:first")
            //.html(ui.draggable.html()).end();
            /*
        if (isInUpperHalf(ui, $this)) {
            $new.insertBefore(this);
        } else {
            $new.insertAfter(this);
        }
        initDroppable($new);
        */
            }
        });
    };

    SnapEditorWidgetDroppable.prototype.updateConnectionAreaHighlight = function (droppable, dragging) {
        //Get the items and find the appropriate areas to highlight on "droppable"
        //TODO
        var highlightItem = this.items[droppable.id],
            draggedItem = this.items[dragging.helper.id],
            draggedPosition = { x: dragging.left, y: dragging.top };
    };

    return SnapEditorWidgetDroppable;
});
