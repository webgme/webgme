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
        DROP_REGION_MARGIN = 0;

    SnapEditorWidgetDroppable = function () {
    };


    SnapEditorWidgetDroppable.prototype._initDroppable = function () {
        var self = this;

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
                self._onBackgroundDrop(event, dragInfo);
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


    return SnapEditorWidgetDroppable;
});
