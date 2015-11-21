/*globals define, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/DragDrop/DropTarget',
    './DiagramDesignerWidget.Constants'
], function (dropTarget, DiagramDesignerWidgetConstants) {
    'use strict';

    var DiagramDesignerWidgetDroppable,
        DROP_REGION_MARGIN = 0;

    DiagramDesignerWidgetDroppable = function () {
    };


    DiagramDesignerWidgetDroppable.prototype._initDroppable = function () {
        var self = this;

        this._acceptDroppable = false;

        // Used from outside (ModelDecorator) when the default drop handling needs to take place in order to
        // 'clear' event, keep the droppable enabled, but not bringing up the options for drop.
        this.acceptDropTempDisabled = false;

        this.skinParts.$dropRegion = $('<div/>', {class: DiagramDesignerWidgetConstants.DROP_REGION_CLASS});

        this.skinParts.$dropRegion.insertBefore(this.skinParts.$itemsContainer);

        dropTarget.makeDroppable(this.skinParts.$dropRegion, {
            over: function (event, dragInfo) {
                self._onDroppableOver(event, dragInfo);
            },
            out: function (/*event, dragInfo*/) {
                self._onDroppableOut(/*event, dragInfo*/);
            },
            drop: function (event, dragInfo) {
                self._onBackgroundDrop(event, dragInfo);
            },
            activate: function (/*event, dragInfo*/) {
                self._onDroppableActivate(/*event, dragInfo*/);
            },
            deactivate: function (/*event, dragInfo*/) {
                self._onDroppableDeactivate(/*event, dragInfo*/);
            }
        });
    };


    DiagramDesignerWidgetDroppable.prototype._onDroppableActivate = function (/*event, dragInfo*/) {
        if (this.mode === this.OPERATING_MODES.DESIGN) {
            this.skinParts.$dropRegion.css({
                width: '100%', //this._containerSize.w - 2 * DROP_REGION_MARGIN,
                height: '100%', //this._containerSize.h - 2 * DROP_REGION_MARGIN,
                top: this._scrollPos.top + DROP_REGION_MARGIN,
                left: this._scrollPos.left + DROP_REGION_MARGIN
            });
        }
    };


    DiagramDesignerWidgetDroppable.prototype._onDroppableDeactivate = function (/*event, dragInfo*/) {
        this.skinParts.$dropRegion.css({
            width: '0px',
            height: '0px',
            top: '0px',
            left: '0px'
        });
    };


    DiagramDesignerWidgetDroppable.prototype._onDroppableOver = function (event, dragInfo) {
        this.logger.debug('_onDroppableOver: ' + JSON.stringify(dragInfo));

        //this.selectionManager.clear();

        if (dragInfo) {
            this._doAcceptDroppable(this.onBackgroundDroppableAccept(event, dragInfo), true);
            this._savedAcceptDroppable = this._acceptDroppable;
        } else {
            this._doAcceptDroppable(false, false);
        }
    };


    DiagramDesignerWidgetDroppable.prototype._onDroppableOut = function (/*event, dragInfo*/) {
        this._doAcceptDroppable(false, false);
    };


    DiagramDesignerWidgetDroppable.prototype._onBackgroundDrop = function (event, dragInfo) {
        var mPos = this.getAdjustedMousePos(event),
            posX = mPos.mX,
            posY = mPos.mY;

        this.logger.debug('_onBackgroundDrop: ' + JSON.stringify(dragInfo));

        if (this._acceptDroppable === true) {
            if (this.acceptDropTempDisabled === true) {
                this.acceptDropTempDisabled = false;
            } else {
                this.onBackgroundDrop(event, dragInfo, {x: posX, y: posY});
            }
        }

        this._doAcceptDroppable(false, false);
    };


    DiagramDesignerWidgetDroppable.prototype._doAcceptDroppable = function (accept, uiFeedback) {
        this.skinParts.$dropRegion.removeClass(DiagramDesignerWidgetConstants.DROP_REGION_ACCEPT_DROPPABLE_CLASS);
        this.skinParts.$dropRegion.removeClass(DiagramDesignerWidgetConstants.DROP_REGION_REJECT_DROPPABLE_CLASS);

        if (accept === true) {
            this._acceptDroppable = true;
            if (uiFeedback) {
                this.skinParts.$dropRegion.addClass(DiagramDesignerWidgetConstants.DROP_REGION_ACCEPT_DROPPABLE_CLASS);
            }
        } else {
            this._acceptDroppable = false;
            if (uiFeedback) {
                this.skinParts.$dropRegion.addClass(DiagramDesignerWidgetConstants.DROP_REGION_REJECT_DROPPABLE_CLASS);
            }
        }
    };


    DiagramDesignerWidgetDroppable.prototype.onBackgroundDroppableAccept = function (event, dragInfo) {
        this.logger.warn('DiagramDesignerWidget.prototype.onBackgroundDroppableAccept(event, dragInfo) not ' +
        'overridden in controller!!! dragInfo:' + JSON.stringify(dragInfo));
        return false;
    };


    DiagramDesignerWidgetDroppable.prototype.onBackgroundDrop = function (event, dragInfo, position) {
        this.logger.warn('DiagramDesignerWidget.prototype.onBackgroundDrop(event, dragInfo) not overridden in ' +
        'controller!!! dragInfo:' + JSON.stringify(dragInfo) + ' , position: "' + JSON.stringify(position) + '"');
    };


    DiagramDesignerWidgetDroppable.prototype._enableDroppable = function (enabled) {
        if (this.skinParts.$dropRegion) {
            if (enabled === true) {
                dropTarget.enableDroppable(this.skinParts.$dropRegion, true);
                if (this._savedAcceptDroppable !== undefined) {
                    this._doAcceptDroppable(this._savedAcceptDroppable, true);
                }
            } else {
                dropTarget.enableDroppable(this.skinParts.$dropRegion, false);
                this._doAcceptDroppable(false, false);
            }
        }
    };


    return DiagramDesignerWidgetDroppable;
});
