"use strict";

define(['logManager',
    'clientUtil'], function (logManager,
                             clientUtil) {

    var DragManager,
        Z_INDEX = 100000,
        ITEMID_DATA_KEY = "itemId";

    DragManager = function (options) {
        this.logger = (options && options.logger) || logManager.create(((options && options.loggerName) || "DragManager"));

        this.canvas = options ? options.canvas : null;

        if (this.canvas === undefined || this.canvas === null) {
            this.logger.error("Trying to initialize a DragManager without a canvas...");
            throw ("DragManager can not be created");
        }

        this.logger.debug("DragManager ctor finished");
    };

    DragManager.prototype.$_draggableHelperDOMBase = $("<div class='drag-manager-drag-helper'></div>");

    DragManager.prototype.initialize = function (params) {
        //TODO: might pass along callbacks...
        //TODO: don't bother with it as of now
    };

    DragManager.prototype.detachDraggable = function (designerItem) {
        designerItem.$el.draggable( "destroy" );
    };

    DragManager.prototype.attachDraggable = function (designerItem) {
        var self = this,
            gridSize = this.canvas.gridSize,
            el = designerItem.$el,
            itemId = designerItem.id,
            dragEnabled = !this.canvas.getIsReadOnlyMode();

        this.logger.warning('DragManager.prototype.attachDraggable NOT YET IMPLEMENTED!');

        //dragging enabled in edit mode only
        /*if (dragEnabled) {
            el.css("cursor", "move");

            el.draggable({
                zIndex: Z_INDEX,
                grid: [gridSize, gridSize],
                helper: function (event) {
                    var h = self._onDraggableHelper(event);
                    h.data(ITEMID_DATA_KEY, itemId);
                    return h;
                },
                start: function (event, ui) {
                    return self._onDraggableStart(event, ui.helper);
                },
                stop: function (event, ui) {
                    return self._onDraggableStop(event, ui.helper);
                },
                drag: function (event, ui) {
                    return self._onDraggableDrag(event, ui.helper);
                }
            });
        }*/
    };

    DragManager.prototype._onDraggableHelper = function (event) {
        //TODO: check if a special callback has to be called
        return this.$_draggableHelperDOMBase.clone();
    };

    DragManager.prototype._onDraggableStart = function (event, helper) {
        var draggedItemID = helper.data(ITEMID_DATA_KEY);
        //TODO: check if a special callback has to be called

        this.logger.error("DragManager.prototype._onDraggableStart, draggedItemID: '" + draggedItemID + "'");
    };

    DragManager.prototype._onDraggableDrag = function (event, helper) {
        //TODO: check if a special callback has to be called
    };

    DragManager.prototype._onDraggableStop = function (event, helper) {
        //TODO: check if a special callback has to be called
    };


    return DragManager;
});
