"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'js/DiagramDesigner/SelectionManager',
    'js/DiagramDesigner/DesignerItem',
    'raphaeljs',
    'css!DiagramDesignerCSS/DesignerCanvas'], function (logManager,
                                                      util,
                                                      commonUtil,
                                                      SelectionManager,
                                                      DesignerItem,
                                                      raphaeljs) {

    var DesignerCanvas,
        DEFAULTgridSize = 10;

    DesignerCanvas = function (options) {
        //set properties from options
        this.containerElementId = typeof options === "string" ? options : options.containerElement;
        this.logger = options.logger || logManager.create((options.loggerName || "DesignerCanvas") + '_' + this.containerElementId);
        this._readOnlyMode = options.readOnlyMode || false;
        this.gridSize = options.gridSize || DEFAULTgridSize;
        this.selectionManager = options.selectionManager || new SelectionManager({"canvas": this});

        //define properties of its own
        this._defaultSize = { "w": 10, "h": 10 };
        this._actualSize = { "w": 0, "h": 0 };
        this._title = "";
        this._redrawEnabled = true;

        this._initializeCollections();

        //initialize UI
        this.initializeUI();

        //in DEBUG mode add additional content to canvas
        if (DEBUG) {
            this._addDebugModeExtensions();
        }

        this.selectionManager.initialize(this.skinParts.$itemsContainer);

        this.logger.debug("DesignerCanvas ctor finished");
    };

    DesignerCanvas.prototype._initializeCollections = function () {
        this.items = {};
        this.itemIds = [];
        this.connectionIds = [];
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

        //'ONE LEVEL UP' in HEADER BAR
        this.skinParts.$btnOneLevelUp = $('<div class="btn-group inline"><a class="btn btnOneLevelUp" href="#" title="One level up" data-num="1"><i class="icon-circle-arrow-up"></i></a></div>');
        this.skinParts.$designerCanvasHeader.prepend(this.skinParts.$btnOneLevelUp);
        this.skinParts.$btnOneLevelUp.on("click", function (event) {
            event.stopPropagation();
            event.preventDefault();
            self._onBtnOneLevelUpClick();
        });

        //CHILDREN container
        /*this.skinParts.$connectionsContainer = $('<div/>', {
            "class" : "connections",
            "id": commonUtil.guid()
        });
        this.skinParts.$designerCanvasBody.append(this.skinParts.$connectionsContainer);*/

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

        /*DUMMY CONTENT*/
        /*this.skinParts.$itemsContainer.append($("<div style='position: absolute; top: 100px; left: 100px; width: 100px; height: 100px; border: 1px solid #000000; background-color: #FF0000'></div>"));
        var path = this.skinParts.SVGPaper.path("M10,20L300,40");
        path.attr({"stroke-width": "5"});
        var rect = this.skinParts.SVGPaper.rect(10, 10, 80, 80);
        rect.attr({"stroke-width": "5"});

        var rect2 = this.skinParts.SVGPaper.rect(410, 210, 50, 50);
        rect2.attr({"fill": "#FFFF00"});*/
        /*DUMMY CONTENT*/
    };

    DesignerCanvas.prototype._resizeCanvas = function (width, height) {
        var canvasHeaderHeight = this.skinParts.$designerCanvasHeader.outerHeight(true),
            bodyHeight = height - canvasHeaderHeight;

        this.skinParts.$designerCanvasHeader.outerWidth(width);

        this.skinParts.$designerCanvasBody.css({"width": width,
            "height": bodyHeight});

        this._actualSize.w = Math.max(this._actualSize.w, width);
        this._actualSize.h = Math.max(this._actualSize.h, bodyHeight);

        /*this._actualSize.w += 100;
        this._actualSize.h += 100;*/

        this.skinParts.$itemsContainer.css({"width": this._actualSize.w,
                                            "height": this._actualSize.h});

        /*this.skinParts.$connectionsContainer.css({"width": this._actualSize.w,
            "height": this._actualSize.h});*/

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

    DesignerCanvas.prototype._addDebugModeExtensions = function () {

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

    DesignerCanvas.prototype._onBtnOneLevelUpClick = function () {
        this.logger.warning("DesignerCanvas.prototype._onBtnOneLevelUpClick NOT YET IMPLEMENTED");
    };

    DesignerCanvas.prototype.enableScreenRefresh = function (enabled) {
        this._redrawEnabled = enabled;

        if (this._needsRedraw === true) {
            this._refreshScreen();
        }
    };

    /*************** MODEL CREATE / UPDATE / DELETE ***********************/

    DesignerCanvas.prototype.createModelComponent = function (objDescriptor) {
        var componentId = objDescriptor.id,
            newComponent,
            alignedPosition = this._alignPositionToGrid(objDescriptor.position.x, objDescriptor.position.y);

        this.logger.debug("Creating model component with parameters: " + objDescriptor);

        objDescriptor.designerCanvas = this;
        objDescriptor.position.x = alignedPosition.x;
        objDescriptor.position.y = alignedPosition.y;

        //this._checkPositionOverlap(objDescriptor);

        //objDescriptor.client = this._client;

        /*this._longUpdateQueue.push(componentId);
        this._longUpdateList.insertedModels.push(componentId);*/
        this.itemIds.push(componentId);

        newComponent = this.items[componentId] = new DesignerItem(objDescriptor.id);
        newComponent._initialize(objDescriptor);
        //newComponent.render();
        newComponent.addTo(this.skinParts.$itemsContainer);
        //newComponent.el.appendTo(this.skinParts.$itemsContainer);

        return newComponent;
    };

    DesignerCanvas.prototype._alignPositionToGrid = function (pX, pY) {
        var posXDelta,
            posYDelta;

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

    return DesignerCanvas;
});
