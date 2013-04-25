"use strict";

define(['logManager',
        'js/DiagramDesigner/DragScroll'], function (logManager,
                                                    DragScroll) {

    var DragManager,
        MOVE_CURSOR = "move",
        COPY_CURSOR = "copy",
        DESIGNER_ITEM_CLASS = "designer-item";

    DragManager = function (options) {
        this.logger = (options && options.logger) || logManager.create(((options && options.loggerName) || "DragManager"));

        this.canvas = options ? options.canvas : null;

        if (this.canvas === undefined || this.canvas === null) {
            this.logger.error("Trying to initialize a DragManager without a canvas...");
            throw ("DragManager can not be created");
        }

        this.logger.debug("DragManager ctor finished");
    };

    DragManager.prototype.DRAGMODE_COPY = "copy";
    DragManager.prototype.DRAGMODE_MOVE = "move";

    DragManager.prototype.initialize = function (el) {
        var self = this;

        this._dragModes = {};

        this.$el = el;

        this._dragModes[this.DRAGMODE_COPY] = true;
        this._dragModes[this.DRAGMODE_MOVE] = true;

        this.canvas.addEventListener(this.canvas.events.ITEM_POSITION_CHANGED, function (_canvas, event) {
            self._canvasItemPositionChanged(event);
        });

        this.$el.on('mousedown.DragManager', 'div.' + DESIGNER_ITEM_CLASS,  function (event) {
            self._onItemMouseDown(event);
        });

        this._dragScroll = new DragScroll(this.$el.parent());
    };

    DragManager.prototype.enableMode = function (mode, enabled) {
        if (this._dragModes[mode]) {
            this._dragModes[mode] = enabled;
        }
    };

    //TODO: here because of DesignerItem calls this - obsolete with this version
    DragManager.prototype.detachDraggable = function (designerItem) {
    };

    //TODO: here because of DesignerItem calls this - obsolete with this version
    DragManager.prototype.attachDraggable = function (designerItem) {
    };

    DragManager.prototype._onDraggableStart = function (event) {
        var selectedItemIDs = this.canvas.selectionManager.selectedItemIdList,
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
        this._dragOptions = { "draggedElements": {},
            "allDraggedItemIDs" : [],
            "delta": { "x": 0, "y": 0 },
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
            this.$el.css("cursor", MOVE_CURSOR);

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

                    //fix the DesignerCanvas' 'try-to-avoid-overlapping-auto-shift' feature
                    copiedItem.moveTo(srcItem.positionX, srcItem.positionY);

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
            this.$el.css("cursor", COPY_CURSOR);

            this.canvas.beginMode(this.canvas.OPERATING_MODES.COPY_ITEMS);
        }

        //call canvas to do its own job when item dragging happens
        //hide connectors, selection outline, etc...
        this.canvas.onDesignerItemDragStart(undefined, this._dragOptions.allDraggedItemIDs);

        this.logger.debug("DragManager.prototype._onDraggableStart, mode: '" + this._dragOptions.mode + "'");
    };

    DragManager.prototype._moveDraggedComponentsBy = function (dX, dY) {
        var i = this._dragOptions.allDraggedItemIDs.length,
            id,
            posX,
            posY,
            newPositions = {};

        this._movingDraggedComponents = true;

        //move all the dragged items
        while(i--) {
            id = this._dragOptions.allDraggedItemIDs[i];

            newPositions[id] = {};

            posX = this._dragOptions.originalPositions[id].x + dX;

            posY = this._dragOptions.originalPositions[id].y + dY;

            this.canvas.items[id].moveTo(posX, posY);

            newPositions[id] = { "x": posX, "y": posY };
        }

        this._movingDraggedComponents = false;

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

    /***************** COMPONENT DELETED FROM CANVAS *****************/

    DragManager.prototype.componentDelete = function (componentId) {
        var idx,
            copiedComponentId;

        if (this._dragOptions) {
            //handle COPY / MOVE mode
            switch(this._dragOptions.mode) {
                case this.DRAGMODE_MOVE:
                    if (this._dragOptions.allDraggedItemIDs.indexOf(componentId) !== -1) {
                        //one of the dragged items has been deleted
                        this.logger.warning('One of the currently moved items is being deleted: ' + componentId);

                        //remove the component's information from the drag list
                        delete this._dragOptions.originalPositions[componentId];

                        idx = this._dragOptions.allDraggedItemIDs.indexOf(componentId);
                        this._dragOptions.allDraggedItemIDs.splice(idx, 1);
                    }
                    break;
                case this.DRAGMODE_COPY:
                    if (this._dragOptions.copyData.hasOwnProperty(componentId)) {
                        //one of the dragged items has been deleted
                        this.logger.warning('One of the currently copied items is being deleted: ' + componentId);

                        copiedComponentId = this._dragOptions.copyData[componentId].copiedItemId ||
                                            this._dragOptions.copyData[componentId].copiedConnectionId;

                        //clean up
                        delete this._dragOptions.copyData[componentId];

                        idx = this._dragOptions.allDraggedItemIDs.indexOf(copiedComponentId);
                        if (idx !== -1) {
                            this._dragOptions.allDraggedItemIDs.splice(idx, 1);
                        }
                        delete this._dragOptions.originalPositions[copiedComponentId];

                        this.canvas.deleteComponent(copiedComponentId);
                    }
                    break;
                default:
                    break;
            }

            if (this._dragOptions.allDraggedItemIDs.length === 0) {
                this._cancelDrag();
            }
            
        }
    };

    DragManager.prototype._cancelDrag = function () {
        this.logger.warning('Cancelling drag artificially...');
        this.$el.trigger('mouseup');
    };

    /************** END OF - COMPONENT DELETED FROM CANVAS ***********/


    /************** EVENT HANDLER - CANVAS ITEM POSITION CHANGED *****/
    DragManager.prototype._canvasItemPositionChanged = function (event) {
        var id = event.ID,
            pX = event.x,
            pY = event.y;

        if (this._movingDraggedComponents === true) {
            return;
        }

        if (this._dragOptions && this._dragOptions.allDraggedItemIDs && this._dragOptions.allDraggedItemIDs.indexOf(id) !== -1) {
            if (pX !== this._dragOptions.originalPositions[id].x + this._dragOptions.delta.x ||
                pY !== this._dragOptions.originalPositions[id].y + this._dragOptions.delta.y) {
                //moved outside of dragging, update original position info
                this._dragOptions.originalPositions[id].x = pX;
                this._dragOptions.originalPositions[id].y = pY;

                pX = this._dragOptions.originalPositions[id].x + this._dragOptions.delta.x;

                pY = this._dragOptions.originalPositions[id].y + this._dragOptions.delta.y;

                this.canvas.items[id].moveTo(pX, pY);
            }
        }
    };
    /******END OF - EVENT HANDLER - CANVAS ITEM POSITION CHANGED *****/


    DragManager.prototype._onItemMouseDown = function (event) {
        var mousePos = this.canvas.getAdjustedMousePos(event),
            self = this,
            leftButton = event.which === 1,
            dragEnabled = !this.canvas.getIsReadOnlyMode();

        if (dragEnabled && leftButton) {
            this.logger.debug("DragManager._onItemMouseDown at: " + JSON.stringify(mousePos));

            if (this.canvas.mode === this.canvas.OPERATING_MODES.NORMAL) {

                //hook up MouseMove and MouseUp
                this._onBackgroundMouseMoveCallBack = function (event) {
                    self._onBackgroundMouseMove(event);
                };

                this._onBackgroundMouseUpCallBack = function (event) {
                    self._onBackgroundMouseUp(event);
                };

                $(document).on('mousemove.DragManager', this._onBackgroundMouseMoveCallBack);
                $(document).on('mouseup.DragManager', this._onBackgroundMouseUpCallBack);

                /* HANDLE DRAG-START */

                this._dragDesc = { "startX": mousePos.mX,
                    "startY": mousePos.mY,
                    "dX": 0,
                    "dY": 0};

                this._onDraggableStart(event);

                this._dragScroll.start();
            }

            event.stopPropagation();
            event.preventDefault();
        }
    };

    DragManager.prototype._griddedMouseMove = function (dx, dy) {
        var gridSize = this.canvas.gridSize,
            dX = dx - dx % gridSize,
            dY = dy - dy % gridSize;

        return {"dX": dX,
                "dY": dY };
    };

    DragManager.prototype._onBackgroundMouseMove = function (event) {
        var mousePos = this.canvas.getAdjustedMousePos(event),
            dx = mousePos.mX - this._dragDesc.startX,
            dy = mousePos.mY - this._dragDesc.startY,
            griddedMouseMove = this._griddedMouseMove(dx, dy),
            dX = griddedMouseMove.dX,
            dY = griddedMouseMove.dY;

        //touch device fix
        //not sure why but sometime during dragging negative coordinates are passed here
        if (mousePos.mX < 0 && mousePos.mX < 0) {
            return;
        }

        if (dX !== this._dragDesc.dX ||
            dY !== this._dragDesc.dY) {

            this._dragDesc.dX = dX;
            this._dragDesc.dY = dY;

            this.logger.debug("DragManager._onBackgroundMouseMove [dx,dy]: " + dX + "," + dY );

            if (this.canvas.mode === this.canvas.OPERATING_MODES.MOVE_ITEMS ||
                this.canvas.mode === this.canvas.OPERATING_MODES.COPY_ITEMS) {

                if ((dX !== this._dragOptions.delta.x) || (dY !== this._dragOptions.delta.y)) {

                    if (this._dragOptions.minCoordinates.x + dX < 0) {
                        dX = -this._dragOptions.minCoordinates.x;
                    }

                    if (this._dragOptions.minCoordinates.y + dY < 0) {
                        dY = -this._dragOptions.minCoordinates.y;
                    }

                    this._moveDraggedComponentsBy(dX, dY);

                    this._dragOptions.delta = {"x": dX, "y": dY};

                    this.canvas.onDesignerItemDrag(undefined, this._dragOptions.allDraggedItemIDs);
                }
            } else {
                this.logger.warning("Something wrong here...DragManager.prototype._onBackgroundMouseMove");
            }
        }
    };

    DragManager.prototype._onBackgroundMouseUp = function (event) {
        //unbind mousemove and mouseup handlers
        $(document).off('mousemove.DragManager', this._onBackgroundMouseMoveCallBack);
        $(document).off('mouseup.DragManager', this._onBackgroundMouseUpCallBack);

        //delete unnecessary instance members
        delete this._onBackgroundMouseMoveCallBack;
        delete this._onBackgroundMouseUpCallBack;

        this.logger.debug("DragManager._onBackgroundMouseUp");

        //one more position update if necessary
        this._onBackgroundMouseMove(event);

        if (this.canvas.mode === this.canvas.OPERATING_MODES.MOVE_ITEMS ||
            this.canvas.mode === this.canvas.OPERATING_MODES.COPY_ITEMS) {

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
            this.canvas.onDesignerItemDragStop(undefined, this._dragOptions.allDraggedItemIDs);

            this.$el.css("cursor", "");
            this._dragOptions = {};
        } else {
            this.logger.warning("Something wrong here...DragManager.prototype._onBackgroundMouseUp");
        }
    };

    return DragManager;
});
