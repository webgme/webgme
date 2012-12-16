"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'js/DiagramDesigner/SelectionManager',
    'js/DiagramDesigner/DragManager',
    'js/DiagramDesigner/DesignerItem',
    'raphaeljs',
    'js/DiagramDesigner/DesignerCanvas.DEBUG',
    'js/DiagramDesigner/DesignerCanvas.Connections',
    'js/DiagramDesigner/SimpleConnectionManager',
    'css!DiagramDesignerCSS/DesignerCanvas'], function (logManager,
                                                      util,
                                                      commonUtil,
                                                      SelectionManager,
                                                      DragManager,
                                                      DesignerItem,
                                                      raphaeljs,
                                                      DesignerCanvasDEBUG,
                                                      DesignerCanvasConnections,
                                                      SimpleConnectionManager) {

    var DesignerCanvas,
        DEFAULT_GRID_SIZE = 10,
        DEFAULT_DECORATOR_NAME = "DefaultDecorator";

    DesignerCanvas = function (options) {
        //set properties from options
        this.containerElementId = typeof options === "string" ? options : options.containerElement;
        this.logger = options.logger || logManager.create((options.loggerName || "DesignerCanvas") + '_' + this.containerElementId);

        this._readOnlyMode = options.readOnlyMode || true;
        this.logger.warning("DesignerCanvas.ctro _readOnlyMode is set to TRUE by default");

        this.gridSize = options.gridSize || DEFAULT_GRID_SIZE;

        //define properties of its own
        this._defaultSize = { "w": 10, "h": 10 };
        this._actualSize = { "w": 0, "h": 0 };
        this._title = "";

        this._initializeCollections();

        //initialize UI
        this.initializeUI();

        this._updating = false;

        this.selectionManager = options.selectionManager || new SelectionManager({"canvas": this});
        this.selectionManager.initialize(this.skinParts.$itemsContainer);

        this.dragManager = options.dragManager || new DragManager({"canvas": this});
        this.dragManager.initialize();

        this.connectionManager = options.connectionManager || new SimpleConnectionManager({"canvas": this});
        this.connectionManager.initialize();

        this._documentFragment = document.createDocumentFragment();

        //in DEBUG mode add additional content to canvas
        if (DEBUG) {
            this._addDebugModeExtensions();
        }

        this.logger.debug("DesignerCanvas ctor finished");
    };

    DesignerCanvas.prototype._initializeCollections = function () {
        //all the designeritems and connections
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
        this._waitingForDesignerItemAck = null;
    };

    DesignerCanvas.prototype.getIsReadOnlyMode = function () {
        return this._readOnlyMode;
    };

    DesignerCanvas.prototype.setIsReadOnlyMode = function (readOnly) {
        if (this._readOnlyMode !== readOnly) {
            this._readOnlyMode = readOnly;

            //TODO: UPDATE EVERYTHING
        }
    };

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

        this.skinParts.$progressBar = $('<div class="btn-group inline"><a class="btn disabled" href="#" title="Refreshing..."><i class="icon-progress"></i></a></div>');
        this.skinParts.$designerCanvasHeader.append(this.skinParts.$progressBar);
        this.skinParts.$progressBar.hide();

        this.skinParts.$progressText = $('<div/>', {
            "class": "inline"
        });
        this.skinParts.$designerCanvasHeader.append(this.skinParts.$progressText);

        //'ONE LEVEL UP' in HEADER BAR
        this.skinParts.$btnOneLevelUp = $('<div class="btn-group inline"><a class="btn btnOneLevelUp" href="#" title="One level up" data-num="1"><i class="icon-circle-arrow-up"></i></a></div>');
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

        this._actualSize.w = Math.max(this._actualSize.w, width);
        this._actualSize.h = Math.max(this._actualSize.h, bodyHeight);

        this.skinParts.$itemsContainer.css({"width": this._actualSize.w,
                                            "height": this._actualSize.h});

        this.skinParts.SVGPaper.setSize(this._actualSize.w, this._actualSize.h);
        this.skinParts.SVGPaper.setViewBox(0, 0, this._actualSize.w, this._actualSize.h, false);

        this.designerCanvasBodyOffset = this.skinParts.$designerCanvasBody.offset();
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

        this.skinParts.$progressBar.hide();

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

    DesignerCanvas.prototype._onBtnOneLevelUpClick = function () {
        this.logger.warning("DesignerCanvas.prototype._onBtnOneLevelUpClick NOT YET IMPLEMENTED");
    };



    /*********************************/

    DesignerCanvas.prototype.beginUpdate = function () {
        this.skinParts.$progressBar.show();
        this.logger.error("beginUpdate");

        this._updating = true;

        /*designer item acocunting*/
        this._insertedDesignerItemIDs = this._insertedDesignerItemIDs || [];
        this._insertedDesignerItemAcks = this._insertedDesignerItemAcks || [];

        this._updatedDesignerItemIDs = this._updatedDesignerItemIDs || [];
        this._updatedDesignerItemAcks = this._updatedDesignerItemAcks || [];

        this._deletedDesignerItemIDs = this._deletedDesignerItemIDs || [];

        /*connection accounting*/
        this._insertedConnectionIDs = this._insertedConnectionIDs || [];
    };

    DesignerCanvas.prototype.endUpdate = function () {
        this.logger.error("endUpdate");

        this._updating = false;
        this.tryRefreshScreen();
    };

    DesignerCanvas.prototype.decoratorAdded = function (itemId, decoratorFullReady) {
        var idx = this._insertedDesignerItemAcks.indexOf(itemId),
            len = this._insertedDesignerItemAcks.length;

        if (idx !== -1) {
            this._insertedDesignerItemAcks.splice(idx, 1);
            len -= 1;

            this.logger.error("decoratorAdded: '" + itemId + "'");

            //if the decorator signaled it is half ready at this point
            //we put it into the update-ack-waiting-list
            //and this way we know it is still working
            if (decoratorFullReady === false) {
                this._updatedDesignerItemAcks.push(itemId);
            }

            if (len === 0) {
                this.tryRefreshScreen();
            }
        } else {
            this.logger.error("DecoratorAdded called with unexpected id: '" + itemId + "'");
        }
    };

    DesignerCanvas.prototype.decoratorUpdated = function (itemID) {
        var idx = this._updatedDesignerItemAcks ? this._updatedDesignerItemAcks.indexOf(itemID) : -1,
            len = this._updatedDesignerItemAcks ? this._updatedDesignerItemAcks.length : 0;

        if (idx !== -1) {
            this._updatedDesignerItemAcks.splice(idx, 1);
            len -= 1;

            this.logger.error("DecoratorUpdated: '" + itemID + "'");
        } else {
            this.logger.error("DecoratorUpdated called with unexpected id: '" + itemID + "'");
        }

        this.logger.error("_updatedDesignerItemAcks length is : " + len);

        this.tryRefreshScreen();
    };

    DesignerCanvas.prototype.tryRefreshScreen = function () {
        var insertedLen = this._insertedDesignerItemIDs ? this._insertedDesignerItemIDs.length : 0,
            insertedWaitingAckLen = this._insertedDesignerItemAcks ? this._insertedDesignerItemAcks.length : 0,
            updatedLen = this._updatedDesignerItemIDs ? this._updatedDesignerItemIDs.length : 0,
            updatedWaitingAckLen = this._updatedDesignerItemAcks ? this._updatedDesignerItemAcks.length : 0,
            listLen,
            msg = "";

        //check whether controller update finished or not
        if (this._updating !== true) {

            msg += "Added: " + (insertedLen - insertedWaitingAckLen) + "/" + insertedLen;
            msg += " Updated: " + (updatedLen - updatedWaitingAckLen) + "/" + updatedLen;

            this.logger.error(msg);

            this.skinParts.$progressText.text(msg);

            if (insertedWaitingAckLen > 0) {
                listLen = insertedWaitingAckLen > 5 ? 5 : insertedWaitingAckLen;
                msg = "tryRefreshScreen is still waiting for [";
                while (listLen--) {
                    msg += this._insertedDesignerItemAcks[listLen] + ", ";
                }

                msg += insertedWaitingAckLen > 5 ? "... and " + (insertedWaitingAckLen - 5) + " more items to ack ]" : "]";
                this.logger.error(msg);
            } else {
                this.logger.error("insertedWaitingAckLen is empty, ready to do the thing");
                this._refreshScreen();
            }
        }
    };

    DesignerCanvas.prototype._refreshScreen = function () {
        var i,
            connectionIDsToUpdate = [];

//        this.skinParts.$progressBar.show();

        this.logger.error("_refreshScreen START");

        //TODO: updated items probably touched the DOM for modification
        //hopefully none of them forced a reflow by reading values, only setting values
        //browsers will optimize this
        //http://www.phpied.com/rendering-repaint-reflowrelayout-restyle/ --- BROWSER ARE SMART

        /* DESIGNER ITEMS */
        //add all the inserted items, they are still on a document Fragment
        this.skinParts.$itemsContainer[0].appendChild(this._documentFragment);
        this._documentFragment = document.createDocumentFragment();

        //call each inserted and updated item's render phase1
        i = this._insertedDesignerItemIDs.length;
        while (i--) {
            this.items[this._insertedDesignerItemIDs[i]].renderPhase1();
        }

        i = this._updatedDesignerItemIDs.length;
        while (i--) {
            this.items[this._updatedDesignerItemIDs[i]].renderPhase1();
        }

        //call each inserted and updated item's render phase2
        i = this._insertedDesignerItemIDs.length;
        while (i--) {
            this.items[this._insertedDesignerItemIDs[i]].renderPhase2();
        }

        i = this._updatedDesignerItemIDs.length;
        while (i--) {
            this.items[this._updatedDesignerItemIDs[i]].renderPhase2();
        }

        /* CONNECTIONS */

        //get all the connections that needs to be updated
        // - inserted connections
        // - updated connections
        // - connections that are affected because of
        //      - endpoint appearance
        //      - endpoint remove
        //      - endpoint updated
        //TODO: fix this, but right now we call refresh on all of the connections
        connectionIDsToUpdate = this.connectionIds.slice(0);
        this.connectionManager.redrawConnections(connectionIDsToUpdate);

        /* clear collections */
        this._insertedDesignerItemIDs = [];
        this._updatedDesignerItemIDs = [];

        this._insertedConnectionIDs = [];

        this.skinParts.$progressBar.hide();
        this.logger.error("_refreshScreen END");
    };

    /*************** MODEL CREATE / UPDATE / DELETE ***********************/

    DesignerCanvas.prototype.createModelComponent = function (objDescriptor) {
        var componentId = objDescriptor.id,
            newComponent,
            alignedPosition = this._alignPositionToGrid(objDescriptor.position.x, objDescriptor.position.y),
            self = this;

        this.logger.debug("Creating model component with parameters: " + objDescriptor);

        objDescriptor.designerCanvas = this;
        objDescriptor.position.x = alignedPosition.x;
        objDescriptor.position.y = alignedPosition.y;

        //make sure it has a specified decorator
        objDescriptor.decorator = objDescriptor.decorator || DEFAULT_DECORATOR_NAME;

        this._checkPositionOverlap(objDescriptor);

        this.itemIds.push(componentId);

        //add to accounting queues for performance optimization
        this._insertedDesignerItemIDs.push(componentId);
        this._insertedDesignerItemAcks.push(componentId);

        this.logger.error("createModelComponent_waitingForDesignerItemAck: '" + objDescriptor.id + "', len: " + this._insertedDesignerItemAcks.length);

        newComponent = this.items[componentId] = new DesignerItem(objDescriptor.id);
        newComponent._initialize(objDescriptor, function () {
            newComponent.addToDocFragment(self._documentFragment);
        });

        return newComponent;
    };

    DesignerCanvas.prototype.updateModelComponent = function (componentId, objDescriptor) {
        var alignedPosition;

        if (this.itemIds.indexOf(componentId) !== -1) {
            this.logger.debug("Updating model component with parameters: " + objDescriptor);

            //adjust its position to this canvas
            alignedPosition = this._alignPositionToGrid(objDescriptor.position.x, objDescriptor.position.y);

            objDescriptor.position.x = alignedPosition.x;
            objDescriptor.position.y = alignedPosition.y;

            //make sure it has a specified decorator
            objDescriptor.decorator = objDescriptor.decorator || DEFAULT_DECORATOR_NAME;

            this._checkPositionOverlap(objDescriptor);

            //add to accounting queus for performance optimization
            this._updatedDesignerItemIDs.push(componentId);
            this._waitingForDesignerItemAck.push(componentId);

            objDescriptor.name += "hillybilly";

            this.items[componentId].update(objDescriptor);
        }
    };

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

    DesignerCanvas.prototype._checkPositionOverlap = function (objDescriptor) {
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

                if (itemID !== objDescriptor.id) {
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

        event.stopPropagation();
        event.preventDefault();
    };

    DesignerCanvas.prototype.showSelectionOutline = function () {

    };

    //additional code pieces for DesignerCanvas
    _.extend(DesignerCanvas.prototype, DesignerCanvasConnections.prototype);

    //in DEBUG mode add additional content to canvas
    if (DEBUG) {
        _.extend(DesignerCanvas.prototype, DesignerCanvasDEBUG.prototype);
    }


    return DesignerCanvas;
});
