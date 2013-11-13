/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/DragDrop/DragSource',
    './DiagramDesignerWidget.Constants'], function (dragSource,
                                                    DiagramDesignerWidgetConstants) {

    var DiagramDesignerWidgetDraggable,
        DRAG_HELPER_CLASS = 'diagram-designer-drag-outline';

    DiagramDesignerWidgetDraggable = function () {
    };


    DiagramDesignerWidgetDraggable.prototype._makeDraggable = function (item) {
        var self = this;

        dragSource.makeDraggable(item.$el, {
            'helper': function (event) {
                return self._dragHelper(this, event);
            },
            'dragItems': function (el) {
                return self.getDragItems(self.selectionManager.getSelectedElements());
            },
            'dragEffects': function (el) {
                return self.getDragEffects(self.selectionManager.getSelectedElements());
            },
            'dragParams': function (el, event) {
                return self.getDragParams(self.selectionManager.getSelectedElements(), event);
            },
            'start': function (event) {
                var ret = false;
                //enable drag mode only in
                //- DESIGN MODE
                //- if the mousedown is not on a connection drawing start point
                if (self.mode === self.OPERATING_MODES.DESIGN &&
                    !$(event.originalEvent.target).hasClass(DiagramDesignerWidgetConstants.CONNECTOR_CLASS)) {
                    ret = true;
                }
                return ret;
            }
        });
    };

    DiagramDesignerWidgetDraggable.prototype._destroyDraggable = function (item) {
        dragSource.destroyDraggable(item.$el);
    };

    /* OVERWRITE DragSource.prototype.dragHelper */
    DiagramDesignerWidgetDraggable.prototype._dragHelper = function (el, event) {
        var helperEl = $('<div/>', {'class': DRAG_HELPER_CLASS}),
            selectionBBox = this.selectionManager._getSelectionBoundingBox(),
            mousePos = this.getAdjustedMousePos(event);

        if (selectionBBox) {
            helperEl.css({'width': (selectionBBox.x2 - selectionBBox.x) * this._zoomRatio,
                'height': (selectionBBox.y2 - selectionBBox.y) * this._zoomRatio,
                'border': '2px dashed #666',
                'background-color': 'rgba(100, 100, 100, 0.1)',
                'margin-top': selectionBBox.y - mousePos.mY + dragSource.DEFAULT_CURSOR_AT.top,
                'margin-left': selectionBBox.x - mousePos.mX + dragSource.DEFAULT_CURSOR_AT.left});

            helperEl.html()
        }

        return helperEl;
    };


    DiagramDesignerWidgetDraggable.prototype.getDragItems = function (selectedElements) {
        this.logger.warning("DiagramDesignerWidgetDraggable.getDragItems is not overridden in the controller!!! selectedElements: " + selectedElements);
        return [];
    };

    DiagramDesignerWidgetDraggable.prototype.getDragEffects = function (selectedElements) {
        var effects = [dragSource.DRAG_EFFECTS.DRAG_MOVE];
        this.logger.debug("DiagramDesignerWidgetDraggable.getDragEffects is not overridden in the controller!!! selectedElements: " + selectedElements + ". Returning default: " + effects);
        return effects;
    };

    DiagramDesignerWidgetDraggable.prototype.getDragParams = function (selectedElements, event) {
        var params = { 'positions': {}},
            i = selectedElements.length,
            itemID,
            selectionBBox = this.selectionManager._getSelectionBoundingBox(),
            mousePos = this.getAdjustedMousePos(event);

        while (i--) {
            itemID = selectedElements[i];
            if (this.itemIds.indexOf(itemID) !== -1) {
                params.positions[itemID] = {'x': this.items[itemID].positionX - mousePos.mX,
                                     'y': this.items[itemID].positionY - mousePos.mY};
            }
        }

        return params;
    };

    DiagramDesignerWidgetDraggable.prototype.DRAG_EFFECTS = dragSource.DRAG_EFFECTS;



    return DiagramDesignerWidgetDraggable;
});
