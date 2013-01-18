"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'js/DiagramDesigner/SelectionManager',
    'js/DiagramDesigner/DragManager',
    'raphaeljs',
    'js/DiagramDesigner/DesignerCanvas.OperatingModes',
    'js/DiagramDesigner/DesignerCanvas.DEBUG',
    'js/DiagramDesigner/DesignerCanvas.Toolbar',
    'js/DiagramDesigner/DesignerCanvas.DesignerItems',
    'js/DiagramDesigner/DesignerCanvas.Connections',
    'js/DiagramDesigner/ConnectionRouteManagerBasic',
    'js/DiagramDesigner/ConnectionDrawingManager',
    'css!DiagramDesignerCSS/DesignerCanvas'], function (logManager,
                                                      util,
                                                      commonUtil,
                                                      SelectionManager,
                                                      DragManager,
                                                      raphaeljs,
                                                      DesignerCanvasOperatingModes,
                                                      DesignerCanvasDEBUG,
                                                      DesignerCanvasToolbar,
                                                      DesignerCanvasDesignerItems,
                                                      DesignerCanvasConnections,
                                                      ConnectionRouteManagerBasic,
                                                      ConnectionDrawingManager) {

    var DesignerCanvas,
        DEFAULT_GRID_SIZE = 10,
        CANVAS_EDGE = 100;

    DesignerCanvas = function (options) {
        var self = this;

        //set properties from options
        this.containerElementId = typeof options === "string" ? options : options.containerElement;
        this.logger = options.logger || logManager.create((options.loggerName || "DesignerCanvas") + '_' + this.containerElementId);

        this._readOnlyMode = options.readOnlyMode || false;
        this.logger.warning("DesignerCanvas.ctor _readOnlyMode is set to TRUE by default");

        this.gridSize = options.gridSize || DEFAULT_GRID_SIZE;

        //define properties of its own
        this._defaultSize = { "w": 10, "h": 10 };
        this._actualSize = { "w": 0, "h": 0 };
        this._title = "";
        this._itemIDCounter = 0;

        this.mode = this.OPERATING_MODES.NORMAL;

        this._initializeCollections();

        //initialize UI
        this.initializeUI();

        this._updating = false;

        this.selectionManager = options.selectionManager || new SelectionManager({"canvas": this});
        this.selectionManager.initialize(this.skinParts.$itemsContainer);
        this.selectionManager.onSelectionDeleteClicked = function (selectedIds) {
            self._onSelectionDeleteClicked.call(self, selectedIds);
        }

        this.dragManager = options.dragManager || new DragManager({"canvas": this});
        this.dragManager.initialize();

        this.connectionRouteManager = options.connectionRouteManager || new ConnectionRouteManagerBasic({"canvas": this});
        this.connectionRouteManager.initialize();

        this.connectionDrawingManager = options.connectionDrawingManager || new ConnectionDrawingManager({"canvas": this});
        this.connectionDrawingManager.initialize();

        this._documentFragment = document.createDocumentFragment();

        //in DEBUG mode add additional content to canvas
        if (DEBUG) {
            this._addDebugModeExtensions();
        }

        this.logger.debug("DesignerCanvas ctor finished");
    };

    DesignerCanvas.prototype._initializeCollections = function () {
        //all the designer items and connections
        this.items = {};

        //IDs of items
        this.itemIds = [];

        //IDs of connections
        this.connectionIds = [];

        //additional helpers for connection accounting
        this.connectionEndIDs = {};
        this.connectionIDbyEndID = {};

        this._updating = false;
        this._insertedDesignerItemIDs = null;
        this._updatedDesignerItemIDs = null;
        this._deletedDesignerItemIDs = null;
    };

    DesignerCanvas.prototype.getIsReadOnlyMode = function () {
        return this._readOnlyMode;
    };

    DesignerCanvas.prototype.getGuid = function (prefix) {
        var nextID = (prefix || "") + this._itemIDCounter + "";

        this._itemIDCounter++;

        return nextID;
    };

    //TODO: IMPLEMENT SET READONLY MODE
    /*DesignerCanvas.prototype.setIsReadOnlyMode = function (readOnly) {
        if (this._readOnlyMode !== readOnly) {
            this._readOnlyMode = readOnly;

            //TODO: UPDATE EVERYTHING

        }
    };*/

    /****************** PUBLIC FUNCTIONS ***********************************/

        //Called when the browser window is resized
    DesignerCanvas.prototype.parentContainerSizeChanged = function (newWidth, newHeight) {
        this._resizeCanvas(newWidth, newHeight);
    };

    DesignerCanvas.prototype.destroy = function () {
        this.$el.empty();
        this.$el.attr("style", "");
    };

    DesignerCanvas.prototype.initializeUI = function () {
        var _parentSize,
            self = this;

        this.logger.debug("DesignerCanvas.initializeUI");

        //try to get container first
        this.$el = $("#" + this.containerElementId);
        if (this.$el.length === 0) {
            this.logger.error("DesignerCanvas's container control with id:'" + this.containerElementId + "' could not be found");
            throw ("DesignerCanvas can not be created");
        }

        //clear content
        this.$el.empty();
        this.$el.attr("style", "");

        //add own class
        this.$el.addClass("designer-canvas");

        //DESIGNER CANVAS HEADER
        this.skinParts = {};
        this.skinParts.$designerCanvasHeader = $('<div/>', {
            "class" : "designer-canvas-header"
        });
        this.$el.append(this.skinParts.$designerCanvasHeader);

        //DESIGNER CANVAS BODY
        this.skinParts.$designerCanvasBody = $('<div/>', {
            "class" : "designer-canvas-body"
        });
        this.$el.append(this.skinParts.$designerCanvasBody);

        this.skinParts.$designerCanvasBody.on("scroll", function (event) {
            self.childrenContainerScroll = { "left": self.skinParts.$designerCanvasBody.scrollLeft(),
                "top": self.skinParts.$designerCanvasBody.scrollTop() };
        });

        //TITLE IN HEADER BAR
        this.skinParts.$title = $('<div/>', {
            "class" : "designer-canvas-header-title"
        });
        this.skinParts.$designerCanvasHeader.append(this.skinParts.$title);

        //READ-ONLY IN HEADER BAR
        this.skinParts.$readOnlyMode = $('<div/>', {
            "class" : "designer-canvas-read-only-mode"
        });
        this.skinParts.$readOnlyMode.text("[READ-ONLY]");
        this.skinParts.$designerCanvasHeader.append(this.skinParts.$readOnlyMode);
        if (this._readOnlyMode === false) {
            this.skinParts.$readOnlyMode.hide();
        }

        /*this.skinParts.$progressBar = $('<div class="btn-group inline"><a class="btn disabled" href="#" title="Refreshing..."><i class="icon-progress"></i></a></div>');
        this.skinParts.$designerCanvasHeader.append(this.skinParts.$progressBar);
        this.skinParts.$progressBar.hide();*/

        this.skinParts.$progressText = $('<div/>', {
            "class": "inline"
        });
        this.skinParts.$designerCanvasHeader.append(this.skinParts.$progressText);

        /******** ADDITIONAL BUTTON GROUP CONTAINER**************/
        this.skinParts.$toolBar = $('<div/>', {
            "class": "inline"
        });
        this.skinParts.$designerCanvasHeader.append(this.skinParts.$toolBar);

        //'ONE LEVEL UP' in HEADER BAR
        this.skinParts.$btnOneLevelUp = $('<div class="btn-group inline no-margin"><a class="btn btnOneLevelUp" href="#" title="One level up" data-num="1"><i class="icon-circle-arrow-up"></i></a></div>');
        this.skinParts.$designerCanvasHeader.prepend(this.skinParts.$btnOneLevelUp);
        this.skinParts.$btnOneLevelUp.on("click", function (event) {
            event.stopPropagation();
            event.preventDefault();
            self._onBtnOneLevelUpClick();
        });

        //CHILDREN container
        this.skinParts.$itemsContainer = $('<div/>', {
            "class" : "items",
            "id": commonUtil.guid(),
            "tabindex": 0
        });
        this.skinParts.$designerCanvasBody.append(this.skinParts.$itemsContainer);

        //initialize Raphael paper from children container and set it to be full size of the HTML container
        this.skinParts.SVGPaper = Raphael(this.skinParts.$itemsContainer.attr("id"));
        this.skinParts.SVGPaper.canvas.style.pointerEvents = "visiblePainted";

        _parentSize = { "w": parseInt(this.$el.parent().css("width"), 10),
                        "h": parseInt(this.$el.parent().css("height"), 10) };

        //finally resize the whole content according to available space
        this._resizeCanvas(_parentSize.w, _parentSize.h);
    };

    DesignerCanvas.prototype._resizeCanvas = function (width, height) {
        var canvasHeaderHeight = this.skinParts.$designerCanvasHeader.outerHeight(true),
            bodyHeight = height - canvasHeaderHeight;

        this.skinParts.$designerCanvasHeader.outerWidth(width);

        this.skinParts.$designerCanvasBody.css({"width": width,
            "height": bodyHeight});

        this._resizeItemContainer(width, bodyHeight);

        this.designerCanvasBodyOffset = this.skinParts.$designerCanvasBody.offset();
    };

    DesignerCanvas.prototype._resizeItemContainer = function (width, height) {
        this._actualSize.w = Math.max(this._actualSize.w, width);
        this._actualSize.h = Math.max(this._actualSize.h, height);

        this.skinParts.$itemsContainer.css({"width": this._actualSize.w,
            "height": this._actualSize.h});

        this.skinParts.SVGPaper.setSize(this._actualSize.w, this._actualSize.h);
        this.skinParts.SVGPaper.setViewBox(0, 0, this._actualSize.w, this._actualSize.h, false);
    };

    DesignerCanvas.prototype.getAdjustedMousePos = function (e) {
        var childrenContainerOffset = this.designerCanvasBodyOffset || { "left": 0, "top": 0 },
            childrenContainerScroll = this.childrenContainerScroll || { "left": 0, "top": 0 },
            pX = e.pageX - childrenContainerOffset.left + childrenContainerScroll.left,
            pY = e.pageY - childrenContainerOffset.top + childrenContainerScroll.top;

        return { "mX": pX > 0 ? pX : 0,
            "mY": pY > 0 ? pY : 0 };
    };

    DesignerCanvas.prototype.clear = function () {
        var i;

        for (i in this.items) {
            if (this.items.hasOwnProperty(i)) {
                this.items[i].destroy();
            }
        }

        //initialize all the required collections with empty value
        this._initializeCollections();
    };

    DesignerCanvas.prototype.updateCanvas = function (desc) {
        //apply content to controls based on desc
        if (this._title !== desc.name) {
            this._title = desc.name;
            this.skinParts.$title.text(this._title);
        }

        if (desc.parentId) {
            this.skinParts.$btnOneLevelUp.show();
        } else {
            this.skinParts.$btnOneLevelUp.hide();
        }
    };

    DesignerCanvas.prototype.deleteComponent = function (componentId) {
        //TODO: fix --> if there is dragging and the item-to-be-deleted is part of the current selection

        if (this.itemIds.indexOf(componentId) !== -1) {
            this.deleteDesignerItem(componentId);
        } else if (this.connectionIds.indexOf(componentId) !== -1) {
            this.deleteConnection(componentId);
        }
    };

    DesignerCanvas.prototype._onBtnOneLevelUpClick = function () {
        this.logger.warning("DesignerCanvas.prototype._onBtnOneLevelUpClick NOT YET IMPLEMENTED");
    };

    /*********************************/

    DesignerCanvas.prototype.beginUpdate = function () {
        this.logger.debug("beginUpdate");

        this._updating = true;

        /*designer item accounting*/
        this._insertedDesignerItemIDs = [];
        this._updatedDesignerItemIDs = [];
        this._deletedDesignerItemIDs = [];

        /*connection accounting*/
        this._insertedConnectionIDs = [];
        this._updatedConnectionIDs = [];
        this._deletedConnectionIDs = [];
    };

    DesignerCanvas.prototype.endUpdate = function () {
        this.logger.debug("endUpdate");

        this._updating = false;
        this.tryRefreshScreen();
    };

    DesignerCanvas.prototype.decoratorUpdated = function (itemID) {
        this.logger.error("DecoratorUpdated: '" + itemID + "'");

        this.tryRefreshScreen();
    };

    DesignerCanvas.prototype.tryRefreshScreen = function () {
        var insertedLen = 0,
            updatedLen = 0,
            deletedLen = 0,
            msg = "";

        //check whether controller update finished or not
        if (this._updating !== true) {

            insertedLen += this._insertedDesignerItemIDs ? this._insertedDesignerItemIDs.length : 0 ;
            insertedLen += this._insertedConnectionIDs ? this._insertedConnectionIDs.length : 0 ;

            updatedLen += this._updatedDesignerItemIDs ? this._updatedDesignerItemIDs.length : 0 ;
            updatedLen += this._updatedConnectionIDs ? this._updatedConnectionIDs.length : 0 ;

            deletedLen += this._deletedDesignerItemIDs ? this._deletedDesignerItemIDs.length : 0 ;
            deletedLen += this._deletedConnectionIDs ? this._deletedConnectionIDs.length : 0 ;

            msg += "Added: " + insertedLen;
            msg += " Updated: " + updatedLen;
            msg += " Deleted: " + deletedLen;

            this.logger.debug(msg);

            this.skinParts.$progressText.text(msg);

            this._refreshScreen();
        }
    };

    DesignerCanvas.prototype._refreshScreen = function () {
        var i,
            connectionIDsToUpdate,
            maxWidth = 0,
            maxHeight = 0,
            itemBBox,
            redrawnConnectionIDs,
            doRenderGetLayout,
            doRenderSetLayout,
            items = this.items;

        this.logger.debug("_refreshScreen START");

        //TODO: updated items probably touched the DOM for modification
        //hopefully none of them forced a reflow by reading values, only setting values
        //browsers will optimize this
        //http://www.phpied.com/rendering-repaint-reflowrelayout-restyle/ --- BROWSER ARE SMART

        /***************** FIRST HANDLE THE DESIGNER ITEMS *****************/
        //add all the inserted items, they are still on a document Fragment
        this.skinParts.$itemsContainer[0].appendChild(this._documentFragment);
        this._documentFragment = document.createDocumentFragment();

        //STEP 1: call the inserted and updated items' getRenderLayout
        doRenderGetLayout = function (itemIDList) {
            var i = itemIDList.length,
                itemBBox,
                cItem;

            while (i--) {
                cItem = items[itemIDList[i]];
                cItem.renderGetLayoutInfo();

                itemBBox = cItem.getBoundingBox();
                maxWidth = Math.max(maxWidth, itemBBox.x2);
                maxHeight = Math.max(maxHeight, itemBBox.y2);
            }
        };
        doRenderGetLayout(this._insertedDesignerItemIDs);
        doRenderGetLayout(this._updatedDesignerItemIDs);

        //STEP 2: call the inserted and updated items' setRenderLayout
        doRenderSetLayout = function (itemIDList) {
            var i = itemIDList.length,
                cItem;

            while (i--) {
                cItem = items[itemIDList[i]];
                cItem.renderSetLayoutInfo();
            }
        };
        doRenderSetLayout(this._insertedDesignerItemIDs);
        doRenderSetLayout(this._updatedDesignerItemIDs);


        /***************** THEN HANDLE THE CONNECTIONS *****************/

        //get all the connections that needs to be updated
        // - inserted connections
        // - updated connections
        // - connections that are affected because of
        //      - endpoint appearance
        //      - endpoint remove
        //      - endpoint updated
        //TODO: fix this, but right now we call refresh on all of the connections
        connectionIDsToUpdate = this.connectionIds.slice(0);
        redrawnConnectionIDs = this.connectionRouteManager.redrawConnections(connectionIDsToUpdate) || [];

        i = redrawnConnectionIDs.len;

        while(i--) {
            itemBBox = items[i].getBoundingBox();
            maxWidth = Math.max(maxWidth, itemBBox.x2);
            maxHeight = Math.max(maxHeight, itemBBox.y2);
        }

        //adjust the canvas size to the new 'grown' are that the inserted / updated require
        //TODO: canvas size decrease not handled yet
        this._resizeItemContainer(maxWidth + CANVAS_EDGE, maxHeight + CANVAS_EDGE);

        //let the selection manager know about deleted items and connections
        this.selectionManager.componentsDeleted(this._deletedDesignerItemIDs.concat(this._deletedConnectionIDs));

        /* clear collections */
        this._insertedDesignerItemIDs = [];
        this._updatedDesignerItemIDs = [];
        this._insertedConnectionIDs = [];
        this._deletedDesignerItemIDs = [];
        this._deletedConnectionIDs = [];

        this.selectionManager.showSelectionOutline();

        this.logger.debug("_refreshScreen END");
    };

    /*************** MODEL CREATE / UPDATE / DELETE ***********************/

    DesignerCanvas.prototype._alignPositionToGrid = function (pX, pY) {
        var posXDelta,
            posYDelta;

        if (pX < 0) {
            pX = this.gridSize;
        }

        if (pY < 0) {
            pY = this.gridSize;
        }

        if (this.gridSize > 1) {
            posXDelta = pX % this.gridSize;
            posYDelta = pY % this.gridSize;

            if ((posXDelta !== 0) || (posYDelta !== 0)) {
                pX += (posXDelta < Math.floor(this.gridSize / 2) + 1 ? -1 * posXDelta : this.gridSize - posXDelta);
                pY += (posYDelta < Math.floor(this.gridSize / 2) + 1 ? -1 * posYDelta : this.gridSize - posYDelta);
            }
        }

        return { "x": pX,
            "y": pY };
    };

    DesignerCanvas.prototype._checkPositionOverlap = function (itemId, objDescriptor) {
        var i,
            posChanged = true,
            itemID,
            item;

        //check if position has to be adjusted to not to put it on some other model
        while (posChanged === true) {
            posChanged = false;
            i = this.itemIds.length;

            while (i--) {
                itemID = this.itemIds[i];

                if (itemID !== itemId) {
                    item = this.items[itemID];

                    if (objDescriptor.position.x === item.positionX &&
                        objDescriptor.position.y === item.positionY) {
                        objDescriptor.position.x += this.gridSize * 2;
                        objDescriptor.position.y += this.gridSize * 2;
                        posChanged = true;
                    }
                }
            }
        }
    };

    DesignerCanvas.prototype.onItemMouseDown = function (event, itemId) {
        this.logger.debug("onItemMouseDown: " + itemId);

        //mousedown initiates a component selection
        this.selectionManager.setSelection([itemId], event);
    };

    DesignerCanvas.prototype.onConnectionMouseDown = function (event, connId) {
        this.logger.debug("onConnectionMouseDown: " + connId);

        //mousedown initiates a connection selection
        this.selectionManager.setSelection([connId], event);
    };

    /************************** DRAG ITEM ***************************/
    DesignerCanvas.prototype.onDesignerItemDragStart = function (draggedItemId, allDraggedItemIDs) {
        this.selectionManager.hideSelectionOutline();
        this.items[draggedItemId].hideConnectors();
    };

    DesignerCanvas.prototype.onDesignerItemDrag = function (draggedItemId, allDraggedItemIDs) {
        var i = allDraggedItemIDs.length,
            connectionIDsToUpdate,
            redrawnConnectionIDs;

        //TODO: refresh only the connections that are really needed
        connectionIDsToUpdate = this.connectionIds.slice(0);
        redrawnConnectionIDs = this.connectionRouteManager.redrawConnections(connectionIDsToUpdate) || [];

        i = redrawnConnectionIDs.len;
    };

    DesignerCanvas.prototype.onDesignerItemDragStop = function (draggedItemId, allDraggedItemIDs) {
        this.selectionManager.showSelectionOutline();
    };

    DesignerCanvas.prototype.designerItemsMove = function (itemIDs) {
        var i = itemIDs.length,
            newPositions = {},
            id,
            item;

        while (i--) {
            id = itemIDs[i];
            item = this.items[id];

            newPositions[id] = { "x": item.positionX, "y": item.positionY };
        }

        this.onDesignerItemsMove(newPositions);
    };

    DesignerCanvas.prototype.designerItemsCopy = function (copyDesc) {
        var newSelectionIDs = [],
            i;

        for (i in copyDesc.items) {
            if (copyDesc.items.hasOwnProperty(i)) {
                newSelectionIDs.push(i);
            }
        }

        for (i in copyDesc.connections) {
            if (copyDesc.connections.hasOwnProperty(i)) {
                newSelectionIDs.push(i);
            }
        }

        this.selectionManager._clearSelection();
        this.selectionManager.setSelection(newSelectionIDs);

        this.onDesignerItemsCopy(copyDesc);
    };
    /************************** END - DRAG ITEM ***************************/

    /************************** SELECTION DELETE CLICK HANDLER ****************************/

    DesignerCanvas.prototype._onSelectionDeleteClicked = function (selectedIds) {
        this.onSelectionDelete(selectedIds);
    };

    DesignerCanvas.prototype.onSelectionDelete = function (selectedIds) {
        this.logger.warning("DesignerCanvas.onSelectionDelete IS NOT OVERRIDDEN IN A CONTROLLER. ID: '" + selectedIds + "'");
    };

    /************************** SELECTION DELETE CLICK HANDLER ****************************/

    //additional code pieces for DesignerCanvas
    _.extend(DesignerCanvas.prototype, DesignerCanvasOperatingModes.prototype);
    _.extend(DesignerCanvas.prototype, DesignerCanvasDesignerItems.prototype);
    _.extend(DesignerCanvas.prototype, DesignerCanvasConnections.prototype);
    _.extend(DesignerCanvas.prototype, DesignerCanvasToolbar.prototype);

    //in DEBUG mode add additional content to canvas
    if (DEBUG) {
        _.extend(DesignerCanvas.prototype, DesignerCanvasDEBUG.prototype);
    }


    return DesignerCanvas;
});
