"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'js/Constants',
    'js/DiagramDesigner/SelectionManager',
    'js/DiagramDesigner/DragManager',
    'raphaeljs',
    'loaderCircles',
    'js/DiagramDesigner/DesignerCanvas.OperatingModes',
    'js/DiagramDesigner/DesignerCanvas.DEBUG',
    'js/DiagramDesigner/DesignerCanvas.Toolbar',
    'js/DiagramDesigner/DesignerCanvas.DesignerItems',
    'js/DiagramDesigner/DesignerCanvas.Connections',
    'js/DiagramDesigner/DesignerCanvas.Subcomponents',
    'js/DiagramDesigner/ConnectionRouteManagerBasic',
    'js/DiagramDesigner/ConnectionRouteManager2',
    'js/DiagramDesigner/ConnectionDrawingManager',
    'js/PropertyEditor/PropertyListView',
    'css!DiagramDesignerCSS/DesignerCanvas'], function (logManager,
                                                      util,
                                                      commonUtil,
                                                      CONSTANTS,
                                                      SelectionManager,
                                                      DragManager,
                                                      raphaeljs,
                                                      LoaderCircles,
                                                      DesignerCanvasOperatingModes,
                                                      DesignerCanvasDEBUG,
                                                      DesignerCanvasToolbar,
                                                      DesignerCanvasDesignerItems,
                                                      DesignerCanvasConnections,
                                                      DesignerCanvasSubcomponents,
                                                      ConnectionRouteManagerBasic,
                                                      ConnectionRouteManager2,
                                                      ConnectionDrawingManager,
                                                      PropertyListView) {

    var DesignerCanvas,
        DEFAULT_GRID_SIZE = 10,
        CANVAS_EDGE = 100,
        DESIGNER_CANVAS_PROPERTY_DIALOG_CLASS = "designer-canvas-property-dialog",
        READ_ONLY_CLASS = "read-only",
        ITEMS_CONTAINER_ACCEPT_DROPPABLE_CLASS = "accept-droppable";

    DesignerCanvas = function (options) {
        var self = this;

        //set properties from options
        this.$el = options.containerElement;
        if (this.$el.length === 0) {
            this.logger.error("DesignerCanvas's container control does not exist");
            throw ("DesignerCanvas can not be created");
        }

        this.logger = options.logger || logManager.create((options.loggerName || "DesignerCanvas") + '_' + this.$el.attr("id"));

        this._readOnlyMode = options.readOnlyMode || false;
        this.logger.warning("DesignerCanvas.ctor _readOnlyMode is set to TRUE by default");

        this.gridSize = options.gridSize || DEFAULT_GRID_SIZE;

        this._droppable = _.isBoolean(options.droppable) ? options.droppable : true;

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
            self._onSelectionDeleteClicked(selectedIds);
        }

        this.selectionManager.onSelectionChanged = function (selectedIds) {
            self._onSelectionChanged(selectedIds);
        }

        this.dragManager = options.dragManager || new DragManager({"canvas": this});
        this.dragManager.initialize();

        this.connectionRouteManager = options.connectionRouteManager || new ConnectionRouteManagerBasic({"canvas": this});
        this.connectionRouteManager.initialize();

        this.connectionDrawingManager = options.connectionDrawingManager || new ConnectionDrawingManager({"canvas": this});
        this.connectionDrawingManager.initialize();

        this._documentFragment = document.createDocumentFragment();

        //in DEBUG mode add additional content to canvas
        if (commonUtil.DEBUG === true) {
            this._addDebugModeExtensions();
        }

        /************** ROUTING MANAGER SELECTION **************************/
        if (commonUtil.DEBUG === true) {
            this.$btnGroupConnectionRouteManager = this.addButtonGroup(function (event, data) {
                self._onConnectionRouteManagerChanged(data.type);
            });

            this.addButton({ "title": "Basic route manager",
                "text": "RM #1",
                "data": { "type": "basic"}}, this.$btnGroupConnectionRouteManager );

            this.addButton({ "title": "Basic+ route manager",
                "text": "RM #2",
                "data": { "type": "basic2"}}, this.$btnGroupConnectionRouteManager );
        }
        /************** END OF - ROUTING MANAGER SELECTION **************************/

        /************** READ ONLY MODE **************************/
        if (commonUtil.DEBUG === true) {
            this.$btnGroupReadOnly = this.addButtonGroup(function (event, data) {
                self.setReadOnlyMode(data.mode);
            });

            this.addButton({ "title": "READ-ONLY ON",
                "text": "RO: ON",
                "data": { "mode": true}}, this.$btnGroupReadOnly );

            this.addButton({ "title": "READ-ONLY OFF",
                "text": "RO: OFF",
                "data": { "mode": false}}, this.$btnGroupReadOnly );
        }

        /************** END OF - READ ONLY MODE **************************/

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

        this._itemSubcomponentsMap = {};
    };

    DesignerCanvas.prototype.getGuid = function (prefix) {
        var nextID = (prefix || "") + this._itemIDCounter + "";

        this._itemIDCounter++;

        return nextID;
    };

    DesignerCanvas.prototype.getIsReadOnlyMode = function () {
        /*return this._readOnlyMode;*/
        return this.mode === this.OPERATING_MODES.READ_ONLY;
    };

    DesignerCanvas.prototype.setReadOnlyMode = function (readOnly) {
        if (readOnly === true && this.mode !== this.OPERATING_MODES.READ_ONLY) {
            //enter READ-ONLY mode
            this.mode = this.OPERATING_MODES.READ_ONLY;
            this._readOnlyOn();
        } else if (readOnly === false && this.mode === this.OPERATING_MODES.READ_ONLY) {
            //enter normal mode from read-only
            this.mode = this.OPERATING_MODES.NORMAL;
            this._readOnlyOff();
        }
    };

    DesignerCanvas.prototype._readOnlyOn = function () {
        this.skinParts.$readOnlyMode.show();
        this.skinParts.$designerCanvasBody.addClass(READ_ONLY_CLASS);
        this._setManagersReadOnlyMode(true);
    };

    DesignerCanvas.prototype._readOnlyOff = function () {
        this.skinParts.$readOnlyMode.hide();
        this.skinParts.$designerCanvasBody.removeClass(READ_ONLY_CLASS);
        this._setManagersReadOnlyMode(false);
    };

    DesignerCanvas.prototype._setManagersReadOnlyMode = function (readOnly) {
        var i;
        this.selectionManager.readOnlyMode(readOnly);
        this.connectionDrawingManager.readOnlyMode(readOnly);

        i = this.itemIds.length;
        while (i--) {
            this.items[this.itemIds[i]].readOnlyMode(readOnly);
        }

        i = this.connectionIds.length;
        while (i--) {
            this.items[this.connectionIds[i]].readOnlyMode(readOnly);
        }
    };

    /****************** PUBLIC FUNCTIONS ***********************************/

        //Called when the browser window is resized
    DesignerCanvas.prototype.parentContainerSizeChanged = function (newWidth, newHeight) {
        this._resizeCanvas(newWidth, newHeight);
    };

    DesignerCanvas.prototype.destroy = function () {
        this.__loader.destroy();
        this.$el.empty();
        this.$el.removeClass("designer-canvas");
    };

    DesignerCanvas.prototype.initializeUI = function () {
        var _parentSize,
            self = this;

        this.logger.debug("DesignerCanvas.initializeUI");

        //clear content
        this.$el.empty();

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

        this.childrenContainerScroll = { "left": 0,
                                        "top": 0 };
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

        if (commonUtil.DEBUG === true) {
            this.skinParts.$progressText = $('<div/>', {
                "class": "inline"
            });
            this.skinParts.$designerCanvasHeader.append(this.skinParts.$progressText);
        }

        /******** ADDITIONAL BUTTON GROUP CONTAINER**************/
        this.skinParts.$toolBar = $('<div/>', {
            "class": "inline"
        });
        this.skinParts.$designerCanvasHeader.append(this.skinParts.$toolBar);

        //add extra visual piece
        this.skinParts.$btnGroupItemAutoOptions = this.addButtonGroup(function (event, data) {
            self._itemAutoLayout(data.mode);
        });

        if (commonUtil.DEBUG !== "DEMOHACK") {
            this.addButton({ "title": "Grid layout",
                "icon": "icon-th",
                "data": { "mode": "grid" }}, this.skinParts.$btnGroupItemAutoOptions );
        }

        if (commonUtil.DEBUG === true) {
            this.addButton({ "title": "Diagonal",
                "icon": "icon-signal",
                "data": { "mode": "diagonal" }}, this.skinParts.$btnGroupItemAutoOptions );
        }

        /************** PROPERTIES BUTTON ***********************/
        if (commonUtil.DEBUG !== "DEMOHACK") {
            this.skinParts.$btnGroupProperties = this.addButtonGroup(function (event, data) {
                self._showProperties();
            });

            this.addButton({ "title": "Properties",
                "icon": "icon-list-alt"}, this.skinParts.$btnGroupProperties );
        }

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

        if (this._droppable === true) {
            //hook up drop event handler on children container

            this._acceptDroppable = false;

            this.skinParts.$dropRegion = $('<div/>', { "class" :"dropRegion" });

            this.skinParts.$designerCanvasBody.append(this.skinParts.$dropRegion);

            /* SET UP DROPPABLE DROP REGION */
            this.skinParts.$dropRegion.droppable({
                over: function( event, ui ) {
                    self._onBackgroundDroppableOver(ui);
                },
                out: function( event, ui ) {
                    self._onBackgroundDroppableOut(ui);
                },
                drop: function (event, ui) {
                    self._onBackgroundDrop(ui);
                },
                activate: function( event, ui ) {
                    var m = 0;
                    if (self.mode === self.OPERATING_MODES.NORMAL) {
                        self.skinParts.$dropRegion.css({"width": self.designerCanvasBodySize.width - 2* m,
                            "height": self.designerCanvasBodySize.height - 2 * m,
                            "top": self.childrenContainerScroll.top + m,
                            "left": self.childrenContainerScroll.left + m });
                    }
                },
                deactivate: function( event, ui ) {
                    self.skinParts.$dropRegion.css({"width": "0px",
                        "height": "0px",
                        "top": "0px",
                        "left": "0px"});
                }
            });
        }

        this.__loader = new LoaderCircles({"containerElement": this.$el.parent()});
    };

    DesignerCanvas.prototype._resizeCanvas = function (width, height) {
        var canvasHeaderHeight = this.skinParts.$designerCanvasHeader.outerHeight(true),
            bodyHeight = height - canvasHeaderHeight;

        this.skinParts.$designerCanvasHeader.outerWidth(width);

        this.skinParts.$designerCanvasBody.css({"width": width,
            "height": bodyHeight});

        this.designerCanvasBodySize = {"width": width,
            "height": bodyHeight};

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
        var i,
            _parentSize;

        for (i in this.items) {
            if (this.items.hasOwnProperty(i)) {
                this.items[i].destroy();
            }
        }

        //initialize all the required collections with empty value
        this._initializeCollections();

        this._actualSize = { "w": 0, "h": 0 };

        _parentSize = { "w": parseInt(this.$el.parent().css("width"), 10),
            "h": parseInt(this.$el.parent().css("height"), 10) };

        //finally resize the whole content according to available space
        this._resizeCanvas(_parentSize.w, _parentSize.h);
    };

    DesignerCanvas.prototype.setTitle = function (newTitle) {
        //apply content to controls based on desc
        if (this._title !== newTitle) {
            this._title = newTitle;
            this.skinParts.$title.text(this._title);
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
            if (commonUtil.DEBUG === true) {
                this.skinParts.$progressText.text(msg);
            }

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

        this._refreshProperties(this.selectionManager.selectedItemIdList);

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

    /************************** SELECTION CHANGED HANDLER ****************************/

    DesignerCanvas.prototype._onSelectionChanged = function (selectedIds) {
        this._refreshProperties(selectedIds);
        this.onSelectionChanged(selectedIds);
    };

    DesignerCanvas.prototype.onSelectionChanged = function (selectedIds) {
        this.logger.debug("DesignerCanvas.onSelectionChanged IS NOT OVERRIDDEN IN A CONTROLLER...");
    };

    /************************** END OF - SELECTION CHANGED HANDLER ****************************/

    /********************** ITEM AUTO LAYOUT ****************************/

    DesignerCanvas.prototype._itemAutoLayout = function (mode) {
        var i = this.itemIds.length,
            x = 10,
            y = 10,
            dx = 20,
            dy = 20,
            w,
            h = 0;

        this.beginUpdate();

        switch (mode) {
            case "grid":
                while (i--) {
                    w = this.items[this.itemIds[i]].width;
                    h = Math.max(h, this.items[this.itemIds[i]].height);
                    this.updateDesignerItem(this.itemIds[i], {"position": {"x": x, "y": y}});
                    x += w + dx;
                    if (x >= 1000) {
                        x = 10;
                        y += h + dy;
                        h = 0;
                    }
                }
                break;
            case "diagonal":
                while (i--) {
                    w = this.items[this.itemIds[i]].width;
                    h = Math.max(h, this.items[this.itemIds[i]].height);
                    this.updateDesignerItem(this.itemIds[i], {"position": {"x": x, "y": y}});
                    x += w + dx;
                    y += h + dy;
                }
                break;
            default:
                break;
        }

        this.endUpdate();

        this.designerItemsMove(this.itemIds);
    };

    /********************************************************************/

    /********* ROUTE MANAGER CHANGE **********************/

    DesignerCanvas.prototype._onConnectionRouteManagerChanged = function (type) {
        switch(type) {
            case "basic":
                this.connectionRouteManager = new ConnectionRouteManagerBasic({"canvas": this});
                break;
            case "basic2":
                this.connectionRouteManager = new ConnectionRouteManager2({"canvas": this});
                break;
            default:
                this.connectionRouteManager = new ConnectionRouteManagerBasic({"canvas": this});
                break;
        }

        this.connectionRouteManager.initialize();

        this.connectionRouteManager.redrawConnections(this.connectionIds || []) ;
    };

    /********* ROUTE MANAGER CHANGE **********************/

    /************** PROPERTY WIDGET **********************/

    DesignerCanvas.prototype._showProperties = function () {
        var propList,
            self = this;

        if (this.propListView === null || this.propListView === undefined) {
            propList = this._getCommonPropertiesForSelection();
            if (propList && !_.isEmpty(propList)) {

                if (this.$propertyDialog === undefined) {
                    this.$propertyDialog = $("<div/>", {id : DESIGNER_CANVAS_PROPERTY_DIALOG_CLASS});
                    this.$el.append(this.$propertyDialog);
                } else {
                    this.$propertyDialog.empty();
                }


                this.$propertyDialog.dialog({"title": "Properties",
                    "dialogClass": DESIGNER_CANVAS_PROPERTY_DIALOG_CLASS,
                    "close": function (event, ui) {
                        self._hideProperties();
                    } });

                this.propListView = new PropertyListView(this.$propertyDialog);

                this.propListView.onFinishChange(function (args) {
                    self._onPropertyChanged(args);
                });

                this.propListView.setPropertyList(propList);
            }
        }
    };

    DesignerCanvas.prototype._hideProperties = function () {
        if (this.propListView) {
            this.propListView.destroy();
            this.propListView = undefined;
        }

        if (this.$propertyDialog) {
            this.$propertyDialog.dialog( "destroy" );
            this.$propertyDialog.empty();
            this.$propertyDialog.remove();
            this.$propertyDialog = undefined;
        }

    };

    DesignerCanvas.prototype._refreshProperties = function (selectedIds) {
        var propList;

        if (this.propListView) {
            if (selectedIds.length === 0) {
                this._hideProperties();
            } else {
                propList = this._getCommonPropertiesForSelection();

                this.propListView.setPropertyList(propList);
            }
        }
    };

    DesignerCanvas.prototype._getCommonPropertiesForSelection = function () {
        return this.onGetCommonPropertiesForSelection(this.selectionManager.selectedItemIdList);
    };

    DesignerCanvas.prototype.onGetCommonPropertiesForSelection = function (selectedItemIDs) {
        this.logger.warning("DesignerCanvas.onGetCommonPropertiesForSelection is not overridden!");
        return {};
    };

    DesignerCanvas.prototype._onPropertyChanged = function (args) {
        this.onPropertyChanged(this.selectionManager.selectedItemIdList, args);
    };

    DesignerCanvas.prototype.onPropertyChanged = function (selectedObjIDs, args) {
        this.logger.warning("DesignerCanvas.onPropertyChanged is not overridden!");
    };

    /************** END OF - PROPERTY WIDGET **********************/

    /************** ITEM CONTAINER DROPPABLE HANDLERS *************/

    DesignerCanvas.prototype._onBackgroundDroppableOver = function (ui) {
        var helper = ui.helper;

        if (this.onBackgroundDroppableAccept(helper) === true) {
            this._doAcceptDroppable(true);
        }
    };

    DesignerCanvas.prototype._onBackgroundDroppableOut = function (/*ui*/) {
        this._doAcceptDroppable(false);
    };

    DesignerCanvas.prototype._onBackgroundDrop = function (ui) {
        var helper = ui.helper,
            posX = ui.offset.left - this.designerCanvasBodyOffset.left,
            posY = ui.offset.top - this.designerCanvasBodyOffset.top;

        if (this._acceptDroppable === true) {
            this.onBackgroundDrop(helper, { "x": posX, "y": posY });
        }

        this._doAcceptDroppable(false);
    };

    DesignerCanvas.prototype._doAcceptDroppable = function (accept) {
        if (accept === true) {
            this._acceptDroppable = true;
            this.skinParts.$dropRegion.addClass(ITEMS_CONTAINER_ACCEPT_DROPPABLE_CLASS);
        } else {
            this._acceptDroppable = false;
            this.skinParts.$dropRegion.removeClass(ITEMS_CONTAINER_ACCEPT_DROPPABLE_CLASS);
        }
    };

    DesignerCanvas.prototype.onBackgroundDroppableAccept = function (helper) {
        this.logger.warning("DesignerCanvas.prototype.onBackgroundDroppableAccept not overridden in controller!!!");
        return false;
    };

    DesignerCanvas.prototype.onBackgroundDrop = function (helper, position) {
        this.logger.warning("DesignerCanvas.prototype.onBackgroundDrop not overridden in controller!!! position: '" + JSON.stringify(position) + "'");
    };

    /*********** END OF - ITEM CONTAINER DROPPABLE HANDLERS **********/

    /************** WAITPROGRESS *********************/
    DesignerCanvas.prototype.showPogressbar = function () {
        this.__loader.start();
    };

    DesignerCanvas.prototype.hidePogressbar = function () {
        this.__loader.stop();
    };

    /************** END OF - WAITPROGRESS *********************/

    /************** API REGARDING TO MANAGERS ***********************/

    DesignerCanvas.prototype.enableDragCopy = function (enabled) {
        this.dragManager.enableMode( this.dragManager.DRAGMODE_COPY, enabled);
    };

    /************** END OF - API REGARDING TO MANAGERS ***********************/

    //additional code pieces for DesignerCanvas
    _.extend(DesignerCanvas.prototype, DesignerCanvasOperatingModes.prototype);
    _.extend(DesignerCanvas.prototype, DesignerCanvasDesignerItems.prototype);
    _.extend(DesignerCanvas.prototype, DesignerCanvasConnections.prototype);
    _.extend(DesignerCanvas.prototype, DesignerCanvasToolbar.prototype);
    _.extend(DesignerCanvas.prototype, DesignerCanvasSubcomponents.prototype);

    //in DEBUG mode add additional content to canvas
    if (commonUtil.DEBUG === true) {
        _.extend(DesignerCanvas.prototype, DesignerCanvasDEBUG.prototype);
    }


    return DesignerCanvas;
});
