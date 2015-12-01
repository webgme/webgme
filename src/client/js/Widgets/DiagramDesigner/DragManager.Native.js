/*globals define, _, $, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/logger',
    'js/Widgets/DiagramDesigner/DragScroll',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants'
], function (Logger,
             DragScroll,
             DiagramDesignerWidgetConstants) {
    'use strict';

    var DragManager,
        MOVE_CURSOR = 'move',
        COPY_CURSOR = 'copy',
        MIN_DELTA_TO_DRAG = 10,
        EVENT_POSTFIX = 'DragManager',
        MOUSE_DOWN = 'mousedown.' + EVENT_POSTFIX,
        MOUSE_MOVE = 'mousemove.' + EVENT_POSTFIX,
        MOUSE_UP = 'mouseup.' + EVENT_POSTFIX;

    DragManager = function (options) {
        var loggerName = (options && options.loggerName) || 'gme:Widgets:DiagramDesigner:DragManager';
        this.logger = (options && options.logger) || Logger.create(loggerName, WebGMEGlobal.gmeConfig.client.log);

        this._diagramDesigner = options ? options.diagramDesigner : null;

        if (this._diagramDesigner === undefined || this._diagramDesigner === null) {
            this.logger.error('Trying to initialize a DragManager without a canvas...');
            throw ('DragManager can not be created');
        }

        this.logger.debug('DragManager ctor finished');
    };

    DragManager.prototype.DRAGMODE_COPY = 'copy';
    DragManager.prototype.DRAGMODE_MOVE = 'move';

    DragManager.prototype.initialize = function (el) {
        var self = this;

        this._dragModes = {};

        this.$el = el;

        this._dragModes[this.DRAGMODE_COPY] = true;
        this._dragModes[this.DRAGMODE_MOVE] = true;

        this._diagramDesigner.addEventListener(this._diagramDesigner.events.ITEM_POSITION_CHANGED,
            function (_canvas, event) {
                self._canvasItemPositionChanged(event);
            }
        );

        this._dragScroll = new DragScroll(this.$el.parent());

        this._diagramDesigner.addEventListener(this._diagramDesigner.events.ON_COMPONENT_DELETE,
            function (_canvas, componentId) {
                self._onComponentDelete(componentId);
            }
        );
    };

    DragManager.prototype.activate = function () {
        this._activateMouseListeners();
    };

    DragManager.prototype.deactivate = function () {
        this._deactivateMouseListeners();
    };

    DragManager.prototype._activateMouseListeners = function () {
        var self = this;

        this.$el.on(MOUSE_DOWN, 'div.' + DiagramDesignerWidgetConstants.DESIGNER_ITEM_CLASS, function (event) {
            self._onItemMouseDown(event);
        });
    };

    DragManager.prototype._deactivateMouseListeners = function () {
        this.$el.off(MOUSE_DOWN, 'div.' + DiagramDesignerWidgetConstants.DESIGNER_ITEM_CLASS);
    };

    DragManager.prototype.enableMode = function (mode, enabled) {
        if (this._dragModes[mode]) {
            this._dragModes[mode] = enabled;
        }
    };

    /******** ITEM MOUSE DOWN EVENT HANDLER ****************/
    DragManager.prototype._onItemMouseDown = function (event) {
        var mousePos = this._diagramDesigner.getAdjustedMousePos(event),
            self = this,
            leftButton = event.which === 1,
            dragEnabled = !this._diagramDesigner.getIsReadOnlyMode();

        if (dragEnabled && leftButton) {
            this.logger.debug('DragManager._onItemMouseDown at: ' + JSON.stringify(mousePos));

            if (this._diagramDesigner.mode === this._diagramDesigner.OPERATING_MODES.DESIGN) {

                this._initDrag(mousePos.mX, mousePos.mY);

                //hook up MouseMove and MouseUp
                this._onBackgroundMouseMoveCallBack = function (event) {
                    self._onBackgroundMouseMove(event);
                };

                this._onBackgroundMouseUpCallBack = function (event) {
                    self._onBackgroundMouseUp(event);
                };

                $(document).on(MOUSE_MOVE, this._onBackgroundMouseMoveCallBack);
                $(document).on(MOUSE_UP, this._onBackgroundMouseUpCallBack);
            }

            event.stopPropagation();
            event.preventDefault();
        }
    };

    DragManager.prototype._initDrag = function (mX, mY) {
        var dragEnabled = !this._diagramDesigner.getIsReadOnlyMode();

        if (dragEnabled && this._diagramDesigner.mode === this._diagramDesigner.OPERATING_MODES.DESIGN) {
            //initialize drag descriptor
            this._dragDesc = {
                startX: mX,
                startY: mY,
                dX: 0,
                dY: 0,
                params: undefined,
                mode: undefined,
                dragging: false
            };
        }
    };

    /******** MOUSE MOVE AND MOUSE UP EVENT HANDLERS *********************/
    DragManager.prototype._onBackgroundMouseMove = function (event) {
        var mousePos = this._diagramDesigner.getAdjustedMousePos(event),
            dx = mousePos.mX - this._dragDesc.startX,
            dy = mousePos.mY - this._dragDesc.startY;

        //touch device fix: not sure why but sometime during dragging negative coordinates are passed here
        if (mousePos.mX <= 0 && mousePos.mX <= 0) {
            return;
        }

        if (this._dragDesc.dragging === true) {
            //already dragging, handle dragged item reposition
            this.logger.debug('already dragging, handle dragged item reposition');
            this._doDrag(event);
        } else {
            //not yet dragging
            //check if the mouse delta reached the minimum mouse delta at all to initiate the drag
            if (Math.abs(dx) >= MIN_DELTA_TO_DRAG || Math.abs(dy) >= MIN_DELTA_TO_DRAG) {
                //minimum delta is met, start the dragging
                this.logger.debug('Mouse delta reached the minimum to handle as a drag');
                this._startDrag(event);
                this._dragScroll.start();
            }
        }
    };

    DragManager.prototype._onBackgroundMouseUp = function (event) {
        //unbind mousemove and mouseup handlers
        $(document).off(MOUSE_MOVE, this._onBackgroundMouseMoveCallBack);
        $(document).off(MOUSE_UP, this._onBackgroundMouseUpCallBack);

        //delete unnecessary instance members
        delete this._onBackgroundMouseMoveCallBack;
        delete this._onBackgroundMouseUpCallBack;

        this.logger.debug('DragManager._onBackgroundMouseUp');

        //if dragging at all
        if (this._dragDesc.dragging === true) {
            this._endDrag(event);
        }

        //clear drag descriptor object
        this._dragDesc = undefined;
    };


    /********* START DRAGGING *******************************/
    DragManager.prototype._startDrag = function (event) {
        var ctrlKey = event && (event.ctrlKey || event.metaKey),
            shiftKey = event && event.shiftKey,
            currentDragMode = this.DRAGMODE_MOVE;  //by default drag is treated as move

        //debug log
        this.logger.debug('_startDrag called');

        //determine based on modifier keys what mode the DRAG should work
        //check modifiers to see what kind of drag-and-drop it will be

        //#1
        //when CTRL key (META key on Mac) is pressed when drag starts, selected items will be copied
        //is this drag a 'COPY'
        if (ctrlKey && !shiftKey) {
            //if the copy mode is enabled at all?
            if (this._dragModes[this.DRAGMODE_COPY] === true) {
                currentDragMode = this.DRAGMODE_COPY;
            }
        }

        //when we have the selected drag-mode, initialize the parameters
        this._dragDesc.mode = currentDragMode;

        this._dragDesc.params = {
            draggedItemIDs: [],
            draggedConnectionIDs: [],
            minStartCoordinates: {x: undefined, y: undefined},
            originalPositions: [],
            modeSpecificData: undefined
        };

        if (this._dragDesc.mode === this.DRAGMODE_MOVE) {
            this._startDragModeMove();
        } else if (this._dragDesc.mode === this.DRAGMODE_COPY) {
            this._startDragModeCopy();
        }

        this._calculateMinStartCoordinates();

        this._diagramDesigner.onDesignerItemDragStart(undefined, this._dragDesc.params.draggedItemIDs);

        //finally set the dragging initialized
        this._dragDesc.dragging = true;
    };

    //initialize the drag descriptor for 'MOVE' operation
    DragManager.prototype._startDragModeMove = function () {
        var selectedItemIDs = this._diagramDesigner.selectionManager.getSelectedElements(),
            items = this._diagramDesigner.items,
            itemIDs = this._diagramDesigner.itemIds,
            i = selectedItemIDs.length,
            id,
            item;

        while (i--) {
            id = selectedItemIDs[i];
            item = items[id];

            //check if the currently checked item is DesignerItem or Connection
            if (itemIDs.indexOf(id) !== -1) {
                //if the item is draggable at all?
                if (this._diagramDesigner.onDragStartDesignerItemDraggable(id) === true) {
                    //store we are dragging this guy
                    this._dragDesc.params.draggedItemIDs.push(id);
                    this._dragDesc.params.originalPositions.push({
                        x: item.positionX,
                        y: item.positionY
                    });
                }
            }
        }

        //set cursor
        this.$el.css('cursor', MOVE_CURSOR);
    };

    //initialize the drag descriptor for 'COPY' operation
    DragManager.prototype._startDragModeCopy = function () {
        var selectedItemIDs = this._diagramDesigner.selectionManager.getSelectedElements(),
            items = this._diagramDesigner.items,
            itemIDs = this._diagramDesigner.itemIds,
            connectionIDs = this._diagramDesigner.connectionIds,
            i = selectedItemIDs.length,
            id,
            srcItem,
            copiedItem,
            objDesc,
            copyData,
            newSelectionIDs = [];

        this._dragDesc.params.modeSpecificData = copyData = {};

        this._diagramDesigner.beginUpdate();

        //first copy the DesignerItems
        while (i--) {
            id = selectedItemIDs[i];

            if (itemIDs.indexOf(id) !== -1) {
                //if the item is copy-able at all?
                if (this._diagramDesigner.onDragStartDesignerItemCopyable(id) === true) {
                    objDesc = {};
                    srcItem = items[id];
                    objDesc.position = {x: srcItem.positionX, y: srcItem.positionY};

                    objDesc.decoratorClass = srcItem._decoratorClass;
                    objDesc.control = srcItem._decoratorInstance.getControl();
                    objDesc.metaInfo = srcItem._decoratorInstance.getMetaInfo();

                    copiedItem = this._diagramDesigner.createDesignerItem(objDesc);

                    //fix the DesignerCanvas' 'try-to-avoid-overlapping-auto-shift' feature
                    copiedItem.moveTo(srcItem.positionX, srcItem.positionY);

                    //store we are dragging this guy
                    this._dragDesc.params.draggedItemIDs.push(copiedItem.id);
                    this._dragDesc.params.originalPositions.push({
                        x: copiedItem.positionX,
                        y: copiedItem.positionY
                    });

                    copyData[id] = {copiedItemId: copiedItem.id};

                    newSelectionIDs.push(copiedItem.id);
                }
            }
        }

        i = selectedItemIDs.length;
        //then duplicate the connections that are selected
        while (i--) {
            id = selectedItemIDs[i];

            if (connectionIDs.indexOf(id) !== -1) {
                if (this._diagramDesigner.onDragStartDesignerConnectionCopyable(id) === true) {
                    var oConnection = items[id];

                    var srcObjId = this._diagramDesigner.connectionEndIDs[id].srcObjId;
                    var srcSubCompId = this._diagramDesigner.connectionEndIDs[id].srcSubCompId;
                    var dstObjId = this._diagramDesigner.connectionEndIDs[id].dstObjId;
                    var dstSubCompId = this._diagramDesigner.connectionEndIDs[id].dstSubCompId;

                    if (selectedItemIDs.indexOf(srcObjId) !== -1) {
                        srcObjId = copyData[srcObjId].copiedItemId;
                    }

                    if (selectedItemIDs.indexOf(dstObjId) !== -1) {
                        dstObjId = copyData[dstObjId].copiedItemId;
                    }

                    objDesc = _.extend({}, oConnection.getConnectionProps());
                    objDesc.srcObjId = srcObjId;
                    objDesc.srcSubCompId = srcSubCompId;
                    objDesc.dstObjId = dstObjId;
                    objDesc.dstSubCompId = dstSubCompId;

                    var copiedConnection = this._diagramDesigner.createConnection(objDesc);

                    this._dragDesc.params.draggedConnectionIDs.push(copiedConnection.id);
                    copyData[id] = {copiedConnectionId: copiedConnection.id};

                    newSelectionIDs.push(copiedConnection.id);
                }
            }
        }

        this._diagramDesigner.endUpdate();

        this._diagramDesigner.selectionManager._clearSelection();
        this._diagramDesigner.selectionManager.setSelection(newSelectionIDs, false);

        //set cursor
        this.$el.css('cursor', COPY_CURSOR);
    };

    /********* END OF --- START DRAGGING *******************************/


    /********* DO DRAGGING *******************************/
    DragManager.prototype._doDrag = function (event) {
        var mouseDelta = this._griddedMouseDelta(event);

        //position update for the dragged items
        this._updateDraggedItemPositions(mouseDelta.dX, mouseDelta.dY);
    };
    /********* END OF --- DO DRAGGING *******************************/

    /********* END DRAGGING *******************************/
    DragManager.prototype._endDrag = function (event) {
        var mouseDelta = this._griddedMouseDelta(event);

        //final position update for the dragged items
        this._updateDraggedItemPositions(mouseDelta.dX, mouseDelta.dY);

        this._endDragAction();


    };

    DragManager.prototype._endDragAction = function () {
        var dItems = this._dragDesc.params.draggedItemIDs;

        if (this._dragDesc.mode === this.DRAGMODE_MOVE) {
            this._endDragModeMove();
        } else if (this._dragDesc.mode === this.DRAGMODE_COPY) {
            this._endDragModeCopy();
        }

        this._diagramDesigner.onDesignerItemDragStop(undefined, dItems);

        this.$el.css('cursor', '');
    };

    DragManager.prototype._endDragModeMove = function () {
        var draggedItemIDs = this._dragDesc.params.draggedItemIDs,
            i = draggedItemIDs.length,
            items = this._diagramDesigner.items,
            newPositions = {},
            id,
            item;

        //if there is any displacement at all
        if (draggedItemIDs.length > 0) {
            if (this._dragDesc.dX !== 0 || this._dragDesc.dY !== 0) {
                while (i--) {
                    id = draggedItemIDs[i];
                    item = items[id];

                    newPositions[id] = {x: item.positionX, y: item.positionY};
                }

                //clear drag descriptor object
                this._dragDesc = undefined;

                this._diagramDesigner.onDesignerItemsMove(newPositions);
            }
        }
    };

    DragManager.prototype._endDragModeCopy = function () {
        var draggedItemIDs = this._dragDesc.params.draggedItemIDs,
            copyData = this._dragDesc.params.modeSpecificData,
            i,
            copyDesc = {
                items: {},
                connections: {}
            },
            desc;

        //if drag&drop ended because of no more item being dragged
        if (draggedItemIDs.length > 0) {
            //create copy descriptor
            for (i in copyData) {
                if (copyData.hasOwnProperty(i)) {
                    desc = copyData[i];
                    if (desc.hasOwnProperty('copiedItemId')) {
                        //description of a box-copy
                        copyDesc.items[desc.copiedItemId] = {
                            oItemId: i,
                            posX: this._diagramDesigner.items[desc.copiedItemId].positionX,
                            posY: this._diagramDesigner.items[desc.copiedItemId].positionY
                        };
                    } else if (desc.hasOwnProperty('copiedConnectionId')) {
                        //description of a connection copy
                        copyDesc.connections[desc.copiedConnectionId] = {oConnectionId: i};
                    }
                }
            }

            //clear drag descriptor object
            this._dragDesc = undefined;

            // FIXME: how to emit this event?
            //this._diagramDesigner.onDesignerItemsCopy(copyDesc);
        }
    };
    /********* END OF --- END DRAGGING *******************************/


    DragManager.prototype._updateDraggedItemPositions = function (dX, dY) {
        var gridSize = this._diagramDesigner.gridSize;

        if (dX !== this._dragDesc.dX ||
            dY !== this._dragDesc.dY) {

            this._dragDesc.dX = dX;
            this._dragDesc.dY = dY;

            this.logger.debug('DragManager._updateDraggedItemPositions [dx,dy]: ' + dX + ',' + dY);

            if (this._dragDesc.params.minStartCoordinates.x + dX < gridSize) {
                this.logger.debug('dX cleared out otherwise item\'s position would be negative');
                dX = gridSize - this._dragDesc.params.minStartCoordinates.x;
            }

            if (this._dragDesc.params.minStartCoordinates.y + dY < gridSize) {
                this.logger.debug('dY cleared out otherwise item\'s position would be negative');
                dY = gridSize - this._dragDesc.params.minStartCoordinates.y;
            }

            this._moveDraggedComponentsBy(dX, dY);

            this._diagramDesigner.onDesignerItemDrag(undefined, this._dragDesc.params.draggedItemIDs);
        }
    };


    DragManager.prototype._moveDraggedComponentsBy = function (dX, dY) {
        var i = this._dragDesc.params.draggedItemIDs.length,
            id,
            posX,
            posY;

        this._movingDraggedComponents = true;

        //move all the dragged items
        while (i--) {
            id = this._dragDesc.params.draggedItemIDs[i];

            posX = this._dragDesc.params.originalPositions[i].x + dX;
            posY = this._dragDesc.params.originalPositions[i].y + dY;

            this._diagramDesigner.items[id].moveTo(posX, posY);
        }

        this._movingDraggedComponents = false;
    };


    DragManager.prototype._griddedMouseDelta = function (event) {
        var mousePos = this._diagramDesigner.getAdjustedMousePos(event),
            dx = mousePos.mX - this._dragDesc.startX,
            dy = mousePos.mY - this._dragDesc.startY,
            gridSize = this._diagramDesigner.gridSize,
            dX = dx - dx % gridSize,
            dY = dy - dy % gridSize;

        return {
            dX: dX,
            dY: dY
        };
    };

    DragManager.prototype._calculateMinStartCoordinates = function () {
        var i;

        if (this._dragDesc) {
            i = this._dragDesc.params.originalPositions.length;

            this._dragDesc.params.minStartCoordinates.x = undefined;
            this._dragDesc.params.minStartCoordinates.y = undefined;

            //figure out minimum coordinates from originalPositions
            while (i--) {
                if (this._dragDesc.params.minStartCoordinates.x) {
                    this._dragDesc.params.minStartCoordinates.x = Math.min(this._dragDesc.params.minStartCoordinates.x,
                        this._dragDesc.params.originalPositions[i].x);
                } else {
                    this._dragDesc.params.minStartCoordinates.x = this._dragDesc.params.originalPositions[i].x;
                }

                if (this._dragDesc.params.minStartCoordinates.y) {
                    this._dragDesc.params.minStartCoordinates.y = Math.min(this._dragDesc.params.minStartCoordinates.y,
                        this._dragDesc.params.originalPositions[i].y);
                } else {
                    this._dragDesc.params.minStartCoordinates.y = this._dragDesc.params.originalPositions[i].y;
                }
            }
        }
    };


    /***************** COMPONENT DELETED FROM CANVAS *****************/

    DragManager.prototype._onComponentDelete = function (componentId) {
        var idx,
            copiedComponentId,
            modeSpecificData,
            itemDeleted = false;

        if (this._dragDesc) {
            modeSpecificData = this._dragDesc.params.modeSpecificData;

            //handle COPY / MOVE mode
            switch (this._dragDesc.mode) {
                case this.DRAGMODE_MOVE:
                    idx = this._dragDesc.params.draggedItemIDs.indexOf(componentId);
                    if (idx !== -1) {
                        //one of the dragged items has been deleted
                        this.logger.debug('One of the currently moved items is being deleted: ' + componentId);

                        //remove the component's information from the drag list
                        this._dragDesc.params.draggedItemIDs.splice(idx, 1);
                        this._dragDesc.params.originalPositions.splice(idx, 1);

                        itemDeleted = true;
                    }
                    break;
                case this.DRAGMODE_COPY:
                    if (modeSpecificData.hasOwnProperty(componentId)) {
                        //one of the dragged items has been deleted
                        this.logger.debug('One of the currently copied items is being deleted: ' + componentId);

                        copiedComponentId = modeSpecificData[componentId].copiedItemId ||
                        modeSpecificData[componentId].copiedConnectionId;

                        //clean up
                        delete modeSpecificData[componentId];

                        idx = this._dragDesc.params.draggedItemIDs.indexOf(copiedComponentId);
                        if (idx !== -1) {
                            this._dragDesc.params.draggedItemIDs.splice(idx, 1);
                            this._dragDesc.params.originalPositions.splice(idx, 1);
                            itemDeleted = true;
                        }

                        idx = this._dragDesc.params.draggedConnectionIDs.indexOf(copiedComponentId);
                        if (idx !== -1) {
                            this._dragDesc.params.draggedConnectionIDs.splice(idx, 1);
                        }

                        //delete from canvas
                        this._diagramDesigner.deleteComponent(copiedComponentId);
                    }
                    break;
                default:
                    break;
            }

            //after a component being deleted from the dragged group, minimal coordinates might have changed
            if (itemDeleted === true) {
                this._calculateMinStartCoordinates();
            }

            //no more item is being dragged --> cancel dragging mode
            if (this._dragDesc && this._dragDesc.params && this._dragDesc.params.draggedItemIDs.length === 0) {
                this._cancelDrag();
            }

        }
    };

    DragManager.prototype._cancelDrag = function () {
        this.logger.debug('Cancelling drag artificially...');
        this.$el.trigger('mouseup');
    };

    /************** END OF - COMPONENT DELETED FROM CANVAS ***********/


    /************** EVENT HANDLER - CANVAS ITEM POSITION CHANGED *****/
    DragManager.prototype._canvasItemPositionChanged = function (event) {
        var id = event.ID,
            pX = event.x,
            pY = event.y,
            idx,
            origPos;

        if (this._movingDraggedComponents === true) {
            return;
        }

        if (this._dragDesc && this._dragDesc.params && this._dragDesc.params.draggedItemIDs) {
            idx = this._dragDesc.params.draggedItemIDs.indexOf(id);
            if (idx !== -1) {
                origPos = this._dragDesc.params.originalPositions[idx];
                if (pX !== origPos.x + this._dragDesc.dX ||
                    pY !== origPos.y + this._dragDesc.dY) {
                    //moved outside of dragging, update original position info
                    origPos.x = pX;
                    origPos.y = pY;

                    pX = origPos.x + this._dragDesc.dX;

                    pY = origPos.y + this._dragDesc.dY;

                    this._movingDraggedComponents = true;
                    this._diagramDesigner.items[id].moveTo(pX, pY);
                    this._movingDraggedComponents = false;
                }
            }
        }
    };
    /******END OF - EVENT HANDLER - CANVAS ITEM POSITION CHANGED *****/


    return DragManager;
});
