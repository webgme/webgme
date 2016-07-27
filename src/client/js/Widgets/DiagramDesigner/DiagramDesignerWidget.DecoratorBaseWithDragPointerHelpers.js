/*globals define, $, _*/
/*jshint browser: true*/

/**
 * To use this class instead of DiagramDesignerWidget.DecoratorBase - the decorator must also inherit from
 * js/Decorators/DecoratorWithPortsAndPointerHelpers.Base and not only js/Decorators/DecoratorWithPorts.Base.
 *
 * Use _enableDragEvents and _disableDragEvents from the diagram designer.
 *
 * To get indication of valid drop add a css rule for accept-droppable on the main element, e.g.
 * &.accept-droppable {
 *   background-color: #00FF00 !important;
 *   cursor: alias;
 * }
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    './DiagramDesignerWidget.DecoratorBase',
    'js/Constants',
    'js/DragDrop/DragConstants',
    'js/DragDrop/DragHelper'
], function (DiagramDesignerWidgetDecoratorBase,
             CONSTANTS,
             DragConstants,
             DragHelper) {

    'use strict';

    var DiagramDesignerWidgetDecoratorBaseWithDragPointerHelpers,
        ACCEPT_DROPPABLE_CLASS = 'accept-droppable',
        DRAGGABLE_MOUSE = 'DRAGGABLE';

    DiagramDesignerWidgetDecoratorBaseWithDragPointerHelpers = function (params) {
        DiagramDesignerWidgetDecoratorBase.call(this, params);
    };

    _.extend(DiagramDesignerWidgetDecoratorBaseWithDragPointerHelpers.prototype,
        DiagramDesignerWidgetDecoratorBase.prototype);

    DiagramDesignerWidgetDecoratorBaseWithDragPointerHelpers.prototype._enableDragEvents = function () {
        var self = this;
        this.$el
            .on('mouseenter.' + DRAGGABLE_MOUSE, null, function (event) {
                self.__onMouseEnter(event);
            })
            .on('mouseleave.' + DRAGGABLE_MOUSE, null, function (event) {
                self.__onMouseLeave(event);
            })
            .on('mouseup.' + DRAGGABLE_MOUSE, null, function (event) {
                self.__onMouseUp(event);
            });
    };

    DiagramDesignerWidgetDecoratorBaseWithDragPointerHelpers.prototype._disableDragEvents = function () {
        this.$el
            .off('mouseenter.' + DRAGGABLE_MOUSE)
            .off('mouseleave.' + DRAGGABLE_MOUSE)
            .off('mouseup.' + DRAGGABLE_MOUSE);
    };

    DiagramDesignerWidgetDecoratorBaseWithDragPointerHelpers.prototype.__isPotentialDropItem =
        function (dragItems, dragEffects) {
            return dragItems.length === 1 && dragItems[0] !== this._metaInfo[CONSTANTS.GME_ID] &&
                (dragEffects.indexOf(DragHelper.DRAG_EFFECTS.DRAG_CREATE_POINTER) !== -1 ||
                dragEffects.indexOf(DragHelper.DRAG_EFFECTS.DRAG_SET_REPLACEABLE) !== -1);
        };

    DiagramDesignerWidgetDecoratorBaseWithDragPointerHelpers.prototype.__onBackgroundDroppableOver =
        function (helper) {
            if (this.__onBackgroundDroppableAccept(helper) === true) {
                this.__doAcceptDroppable(true);
            }
        };

    DiagramDesignerWidgetDecoratorBaseWithDragPointerHelpers.prototype.__onBackgroundDroppableOut = function () {
        this.__doAcceptDroppable(false);
    };

    DiagramDesignerWidgetDecoratorBaseWithDragPointerHelpers.prototype.__onBackgroundDrop = function (helper) {
        var dragInfo = helper.data(DragConstants.DRAG_INFO),
            dragItems = DragHelper.getDragItems(dragInfo),
            dragEffects = DragHelper.getDragEffects(dragInfo);

        if (this.__acceptDroppable === true) {
            if (this.__isPotentialDropItem(dragItems, dragEffects)) {
                this._setPointerTarget(dragItems[0], helper.offset());
            }
        }

        this.__doAcceptDroppable(false);
    };

    DiagramDesignerWidgetDecoratorBaseWithDragPointerHelpers.prototype.__onBackgroundDroppableAccept =
        function (helper) {
            var dragInfo = helper.data(DragConstants.DRAG_INFO),
                dragItems = DragHelper.getDragItems(dragInfo),
                dragEffects = DragHelper.getDragEffects(dragInfo),
                doAccept = false;

            //check if there is only one item being dragged, it is not self,
            //and that element can be a valid target of at least one pointer of this guy or replaceable.
            if (this.__isPotentialDropItem(dragItems, dragEffects)) {
                doAccept = this._getValidPointersForTarget(dragItems[0]).length > 0 ||
                    this._isValidReplaceableTarget(dragItems[0]);
            }

            return doAccept;
        };

    DiagramDesignerWidgetDecoratorBaseWithDragPointerHelpers.prototype.__doAcceptDroppable = function (accept) {
        if (accept === true) {
            this.__acceptDroppable = true;
            this.$el.addClass(ACCEPT_DROPPABLE_CLASS);
        } else {
            this.__acceptDroppable = false;
            this.$el.removeClass(ACCEPT_DROPPABLE_CLASS);
        }

        this.hostDesignerItem.canvas._enableDroppable(!accept);
    };

    DiagramDesignerWidgetDecoratorBaseWithDragPointerHelpers.prototype.__onMouseEnter = function (event) {
        if (this.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
            //check if it's dragging anything with jQueryUI
            if ($.ui.ddmanager.current && $.ui.ddmanager.current.helper) {
                this.__onDragOver = true;
                this.__onBackgroundDroppableOver($.ui.ddmanager.current.helper);
                event.stopPropagation();
                event.preventDefault();
            }
        }
    };

    DiagramDesignerWidgetDecoratorBaseWithDragPointerHelpers.prototype.__onMouseLeave = function (event) {
        if (this.__onDragOver) {
            this.__onBackgroundDroppableOut();
            this.__onDragOver = false;
            event.stopPropagation();
            event.preventDefault();
        }
    };

    DiagramDesignerWidgetDecoratorBaseWithDragPointerHelpers.prototype.__onMouseUp = function (/*event*/) {
        if (this.__onDragOver) {
            // TODO: this is still questionable if we should hack the jQeuryUI 's
            // TODO: draggable&droppable and use half of it only
            this.__onBackgroundDrop($.ui.ddmanager.current.helper);
            this.__onDragOver = false;

            // Temporarily suppress the drop action (i.e. the drop select menu) of the canvas.
            this.hostDesignerItem.canvas.acceptDropTempDisabled = true;
        }
    };

    return DiagramDesignerWidgetDecoratorBaseWithDragPointerHelpers;
});
