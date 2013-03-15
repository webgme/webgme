"use strict";

define(['logManager'], function (logManager) {

    var DragManager,
        Z_INDEX = 100000,
        ITEMID_DATA_KEY = "itemId",
        MOVE_CURSOR = "move",
        COPY_CURSOR = "copy";/*,
        ALIAS_CURSOR = "alias";*/

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

    DragManager.prototype.DRAGMODE_COPY = "copy";
    DragManager.prototype.DRAGMODE_MOVE = "move";

    DragManager.prototype.initialize = function () {
        this._dragModes = {};

        this._dragModes[this.DRAGMODE_COPY] = true;
        this._dragModes[this.DRAGMODE_MOVE] = true;
    };

    DragManager.prototype.enableMode = function (mode, enabled) {
        if (this._dragModes[mode]) {
            this._dragModes[mode] = enabled;
        }
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
                    if (self.canvas.mode === self.canvas.OPERATING_MODES.NORMAL) {
                        self._onDraggableStart(event, ui.helper);
                    }
                },
                stop: function (event, ui) {
                    if (self.canvas.mode === self.canvas.OPERATING_MODES.MOVE_ITEMS ||
                        self.canvas.mode === self.canvas.OPERATING_MODES.COPY_ITEMS) {
                        self._onDraggableStop(event, ui.helper);
                    }
                },
                drag: function (event, ui) {
                    if (self.canvas.mode === self.canvas.OPERATING_MODES.MOVE_ITEMS ||
                        self.canvas.mode === self.canvas.OPERATING_MODES.COPY_ITEMS) {
                        self._onDraggableDrag(event, ui.helper);
                    }
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
            connectionIDs = this.canvas.connectionIds,
            id,
            ctrlKey = event.ctrlKey || event.metaKey,
            shiftKey = event.shiftKey,
            objDesc,
            currentDragMode = this.DRAGMODE_MOVE;  //by default drag is treated as move

        //determine based on modifier keys what mode the DRAG should work
        //check modifiers to see what kind of drag-and-drop it will be
        //is this drag a 'COPY'
        if (ctrlKey && !shiftKey) {
            //if the copy mode is enabled at all?
            if (this._dragModes[this.DRAGMODE_COPY] === true) {
                currentDragMode = this.DRAGMODE_COPY;
            }
        }

        //simple drag means reposition
        //when CTRL key (META key on Mac) is pressed when drag starts, selected items will be copied
        this._dragOptions = { "draggedItemID": draggedItemID,
            "draggedElements": {},
            "allDraggedItemIDs" : [],
            "delta": { "x": 0, "y": 0 },
            "startPos": { "x": draggedItem.positionX, "y": draggedItem.positionY },
            "minCoordinates": { "x": this.canvas._actualSize.w, "y": this.canvas._actualSize.h },
            "originalPositions" : {},
            "mode": currentDragMode
        };

        if (this._dragOptions.mode === this.DRAGMODE_MOVE) {
            /*************************************************************/
            /***********************     MOVE MODE      ******************/
            /*************************************************************/
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

            //set cursor
            this._dragOptions.$draggedItemDecoratorEl = this.canvas.items[draggedItemID].$el.find("> div");
            this._dragOptions.$draggedItemDecoratorEl.css("cursor", MOVE_CURSOR);

            this.canvas.beginMode(this.canvas.OPERATING_MODES.MOVE_ITEMS);
        } else if (this._dragOptions.mode === this.DRAGMODE_COPY) {
            /*************************************************************/
            /***********************     COPY MODE      ******************/
            /*************************************************************/

            this._dragOptions.copyData = {};

            this.canvas.beginUpdate();

            //first copy the DesignerItems
            while(i--) {
                id = selectedItemIDs[i];

                if (itemIDs.indexOf(id) !== -1) {

                    objDesc = {};
                    var srcItem = items[id];
                    objDesc.position = { "x": srcItem.positionX, "y": srcItem.positionY};

                    objDesc.decoratorClass = srcItem._decoratorClass;
                    objDesc.control = srcItem._decoratorInstance.getControl();
                    objDesc.metaInfo = srcItem._decoratorInstance.getMetaInfo();

                    var copiedItem = this.canvas.createDesignerItem(objDesc);

                    if (items[id].positionX < this._dragOptions.minCoordinates.x) {
                        this._dragOptions.minCoordinates.x = items[id].positionX;
                    }

                    if (items[id].positionY < this._dragOptions.minCoordinates.y) {
                        this._dragOptions.minCoordinates.y = items[id].positionY;
                    }

                    //store we are dragging this guy
                    this._dragOptions.allDraggedItemIDs.push(copiedItem.id);

                    this._dragOptions.originalPositions[copiedItem.id] = { "x": items[copiedItem.id].positionX,
                        "y": items[copiedItem.id].positionY};

                    this._dragOptions.copyData[id] = {"copiedItemId": copiedItem.id};
                }
            }

            i = selectedItemIDs.length;
            //then duplicate the connections that are selected
            while(i--) {
                id = selectedItemIDs[i];

                if (connectionIDs.indexOf(id) !== -1) {
                    var oConnection = items[id];

                    var srcObjId = this.canvas.connectionEndIDs[id].srcObjId;
                    var srcSubCompId = this.canvas.connectionEndIDs[id].srcSubCompId;
                    var dstObjId = this.canvas.connectionEndIDs[id].dstObjId;
                    var dstSubCompId = this.canvas.connectionEndIDs[id].dstSubCompId;

                    if (selectedItemIDs.indexOf(srcObjId) !== -1) {
                        srcObjId = this._dragOptions.copyData[srcObjId].copiedItemId;
                    }

                    if (selectedItemIDs.indexOf(dstObjId) !== -1) {
                        dstObjId = this._dragOptions.copyData[dstObjId].copiedItemId;
                    }

                    objDesc = _.extend({}, oConnection.getConnectionProps());
                    objDesc.srcObjId = srcObjId;
                    objDesc.srcSubCompId = srcSubCompId;
                    objDesc.dstObjId = dstObjId;
                    objDesc.dstSubCompId = dstSubCompId;

                    var copiedConnection = this.canvas.createConnection(objDesc);

                    this._dragOptions.copyData[id] = {"copiedConnectionId": copiedConnection.id };
                }
            }

            this.canvas.endUpdate();

            //set cursor
            this._dragOptions.$draggedItemDecoratorEl = this.canvas.items[this._dragOptions.copyData[draggedItemID].copiedItemId].$el.find("> div");
            this._dragOptions.$draggedItemDecoratorEl.css("cursor", COPY_CURSOR);

            this.canvas.beginMode(this.canvas.OPERATING_MODES.COPY_ITEMS);
        }

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

        //touch device fix
        //not sure why but sometime during dragging negative coordinates are passed here
        if (dragPos.x < 0 && dragPos.y < 0) {
            return;
        }

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
        var draggedItemID = helper.data(ITEMID_DATA_KEY);

        switch(this._dragOptions.mode) {
            case this.DRAGMODE_MOVE:
                this.canvas.endMode(this.canvas.OPERATING_MODES.MOVE_ITEMS);
                this.canvas.designerItemsMove(this._dragOptions.allDraggedItemIDs);
                break;
            case this.DRAGMODE_COPY:
                this._onCopyEnd();
                break;
        }

        //call canvas to do its own job when item dragging happens
        //show connectors, selection outline, etc...
        this.canvas.onDesignerItemDragStop(draggedItemID, this._dragOptions.allDraggedItemIDs);

        this._dragOptions.$draggedItemDecoratorEl.css("cursor", "");
        this._dragOptions = {};

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


    DragManager.prototype._onCopyEnd = function () {
        var i,
            copyDesc = { "items": {},
                         "connections": {}},
            desc;

        for (i in this._dragOptions.copyData) {
            if (this._dragOptions.copyData.hasOwnProperty(i)) {
                desc = this._dragOptions.copyData[i];
                if (desc.hasOwnProperty("copiedItemId")) {
                    //description of a box-copy
                    copyDesc.items[desc.copiedItemId] = {"oItemId": i,
                                                         "posX": this.canvas.items[desc.copiedItemId].positionX,
                                                         "posY": this.canvas.items[desc.copiedItemId].positionY};
                } else if (desc.hasOwnProperty("copiedConnectionId")) {
                    //description of a connection copy
                    copyDesc.connections[desc.copiedConnectionId] = {"oConnectionId": i};
                }
            }
        }

        this.canvas.endMode(this.canvas.OPERATING_MODES.COPY_ITEMS);
        this.canvas.designerItemsCopy(copyDesc);
    };


    return DragManager;
});
