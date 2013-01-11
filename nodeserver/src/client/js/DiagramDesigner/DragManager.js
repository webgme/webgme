"use strict";

define(['logManager'], function (logManager) {

    var DragManager,
        Z_INDEX = 100000,
        ITEMID_DATA_KEY = "itemId",
        MOVE_CURSOR = "move";

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

    DragManager.prototype.initialize = function () {
        this._dragModes = {"copy": 0,
            "move": 1};
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

        //this.logger.warning('DragManager.prototype.attachDraggable NOT YET IMPLEMENTED!');

        //dragging enabled in edit mode only
        if (dragEnabled) {
            /*el.css("cursor", "move");*/

            el.draggable({
                zIndex: Z_INDEX,
                grid: [gridSize, gridSize],
                helper: function (/*event*/) {
                    var h = self._onDraggableHelper();
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
        }
    };

    DragManager.prototype._onDraggableHelper = function () {
        return this.$_draggableHelperDOMBase.clone();
    };

    DragManager.prototype._onDraggableStart = function (event, helper) {
        var draggedItemID = helper.data(ITEMID_DATA_KEY),
            selectedItemIDs = this.canvas.selectionManager.selectedItemIdList,
            draggedItem = this.canvas.items[draggedItemID],
            i = selectedItemIDs.length,
            items = this.canvas.items,
            itemIDs = this.canvas.itemIds,
            id,
            $draggedItemDecoratorEl = this.canvas.items[draggedItemID].$el.find("> div"),
            cursor = MOVE_CURSOR;

        //simple drag means reposition
        //when CTRL key (META key on Mac) is pressed when drag starts, selected items will be copied
        this._dragOptions = { "draggedItemID": draggedItemID,
            "draggedElements": {},
            "allDraggedItemIDs" : [],
            "delta": { "x": 0, "y": 0 },
            "startPos": { "x": draggedItem.positionX, "y": draggedItem.positionY },
            "minCoordinates": { "x": this.canvas._actualSize.w, "y": this.canvas._actualSize.h },
            "originalPositions" : {},
            "mode": this._dragModes.move
        };

        //is this drag a SmartCopy????
        /*if (event.ctrlKey || event.metaKey === true) {
            this._dragOptions.mode = this._dragModes.copy;
            cursor = COPY_CURSOR;
        }*/

        //set cursor //TODO:based on operation
        $draggedItemDecoratorEl.css("cursor", cursor);

        while(i--) {
            id = selectedItemIDs[i];

            //check if the currently checked item is DesignerItem or Connection
            if (itemIDs.indexOf(id) !== -1) {
                if (items[id].positionX < this._dragOptions.minCoordinates.x) {
                    this._dragOptions.minCoordinates.x = items[id].positionX;
                }

                if (items[id].positionY < this._dragOptions.minCoordinates.y) {
                    this._dragOptions.minCoordinates.y = items[id].positionY;
                }

                //store we are dragging this guy
                this._dragOptions.allDraggedItemIDs.push(id);

                this._dragOptions.originalPositions[id] = { "x": items[id].positionX,
                                                              "y": items[id].positionY};
            }
        }

        this.canvas.beginMode(this.canvas.OPERATING_MODES.MOVE_ITEMS);

        //call canvas to do its own job when item dragging happens
        //hide connectors, selection outline, etc...
        this.canvas.onDesignerItemDragStart(draggedItemID, this._dragOptions.allDraggedItemIDs);

        this.logger.debug("DragManager.prototype._onDraggableStart, draggedItemID: '" + draggedItemID + "'");
    };

    DragManager.prototype._onDraggableDrag = function (event, helper) {
        var dragPos = { "x": parseInt(helper.css("left"), 10), "y": parseInt(helper.css("top"), 10) },
            dX = dragPos.x - this._dragOptions.startPos.x,
            dY = dragPos.y - this._dragOptions.startPos.y,
            draggedItemID = helper.data(ITEMID_DATA_KEY);


        if ((dX !== this._dragOptions.delta.x) || (dY !== this._dragOptions.delta.y)) {

            if (this._dragOptions.minCoordinates.x + dX < 0) {
                dX = -this._dragOptions.minCoordinates.x;
            }

            if (this._dragOptions.minCoordinates.y + dY < 0) {
                dY = -this._dragOptions.minCoordinates.y;
            }

            this._moveDraggedComponentsBy(dX, dY);

            this._dragOptions.delta = {"x": dX, "y": dY};

            this.canvas.onDesignerItemDrag(draggedItemID, this._dragOptions.allDraggedItemIDs);
        }
    };

    DragManager.prototype._onDraggableStop = function (event, helper) {
        var draggedItemID = helper.data(ITEMID_DATA_KEY),
            $draggedItemDecoratorEl = this.canvas.items[draggedItemID].$el.find("> div");

        $draggedItemDecoratorEl.css("cursor", "");

        switch(this._dragOptions.mode) {
            case this._dragModes.move:
                this.canvas.endMode(this.canvas.OPERATING_MODES.MOVE_ITEMS);
                this.canvas.designerItemsMove(this._dragOptions.allDraggedItemIDs);
                break;
        }

        //call canvas to do its own job when item dragging happens
        //show connectors, selection outline, etc...
        this.canvas.onDesignerItemDragStop(draggedItemID, this._dragOptions.allDraggedItemIDs);

        this.logger.debug("DragManager.prototype._onDraggableStop, draggedItemID: '" + draggedItemID + "'");
    };

    DragManager.prototype._moveDraggedComponentsBy = function (dX, dY) {
        var i = this._dragOptions.allDraggedItemIDs.length,
            id,
            posX,
            posY,
            newPositions = {};

        //move all the dragged items
        while(i--) {
            id = this._dragOptions.allDraggedItemIDs[i];

            newPositions[id] = {};

            posX = this._dragOptions.originalPositions[id].x + dX;

            posY = this._dragOptions.originalPositions[id].y + dY;

            this.canvas.items[id].moveTo(posX, posY);

            newPositions[id] = { "x": posX, "y": posY };
        }

        return newPositions;
    };


    return DragManager;
});
