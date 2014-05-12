/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Brian Broll
 */

"use strict";

define(['logManager',
        'raphaeljs',
        './SnapEditorWidget.Mouse',
        './SnapEditorWidget.ClickableItem',
        './SnapEditorWidget.OperatingModes',
        './SnapEditorWidget.Keyboard',
        'loaderCircles'], function (logManager,
                                    raphaeljs,
                                    SnapEditorWidgetMouse,
                                    SnapEditorWidgetClickableItem,
                                    SnapEditorWidgetOperatingModes,
                                    SnapEditorWidgetKeyboard,
                                    LoaderCircles) {

    var SnapEditorWidget,
        CANVAS_EDGE = 100,
        GUID_DIGITS = 6,
        BACKGROUND_TEXT_COLOR = '#DEDEDE',
        BACKGROUND_TEXT_SIZE = 30;

    SnapEditorWidget = function (container, params) {
        params = params || {};
        params.loggerName = "SnapEditorWidget";

        this._itemIDCounter = 0;

        /* * * * * * * * * * UI Components * * * * * * * * * */

        //Default Size values
        this._actualSize = { "w": 0, "h": 0 };
        this._containerSize = { "w": 0, "h": 0 };
        this._itemIDCounter = 0;
        this._documentFragment = document.createDocumentFragment();

        this._backgroundText = "Snap Editor";
        this._zoomRatio = 1;

        //Scroll and view info
        this._offset = { "left": 0, "top": 0 };
        this._scrollPos = { "left": 0, "top": 0 };

        this.gridSize = params.gridSize;

        //if the widget has to support drop feature at all
        this._droppable = params.droppable;

        this.logger = logManager.create(params.loggerName);
        this._init(container, params);
        
        /* * * * * * * * * * * ITEMS * * * * * * * * * * */
        this.items = {};

        /*clickable item accounting*/
        this._insertedClickableItemIDs = [];
        this._updatedClickableItemIDs = [];
        this._deletedClickableItemIDs = [];

        this._activateMouseListeners();

        this.logger.debug("SnapEditorWidget ctor");
    };

    SnapEditorWidget.prototype._init = function (container, params){//Container is the div element
                                                                    //Params is the extra stuff (ie, the toolbar)
        this.$el = $('<div class="snap-widget"></div>'); //Everything goes inside this.$el
        container.append(this.$el);

        this._initializeUI();
    };

    SnapEditorWidget.prototype._initializeUI = function(){
        var self = this;

        this.logger.debug("SnapWidget._initializeUI");

        //clear content
        this.$el.empty();

        //add own class
        this.$el.addClass(/*TODO*/);

        this._attachScrollHandler(this.$el);

        //DESIGNER CANVAS HEADER
        this.skinParts = {};

        this.skinParts.$snapWidgetBody = this.$el;

        //CHILDREN container
        this.skinParts.$itemsContainer = $('<div/>', {
            "class" : "items"
        });
        this.skinParts.$snapWidgetBody.append(this.skinParts.$itemsContainer);

        //initialize Raphael paper from children container and set it to be full size of the HTML container
        this.skinParts.SVGPaper = Raphael(this.skinParts.$itemsContainer[0]);
        this.skinParts.SVGPaper.canvas.style.pointerEvents = "visiblePainted";

        //finally resize the whole content according to available space
        this._containerSize.w = this.$el.width();
        this._containerSize.h = this.$el.height();
        this._resizeItemContainer();

        if (this._droppable === true) {
            this._initDroppable();
        }

        this.__loader = new LoaderCircles({"containerElement": this.$el.parent()});

        if (this._tabsEnabled === true) {
            this._initializeTabs();
        }
    };

    SnapEditorWidget.prototype._resizeItemContainer = function () {
        var zoomedWidth = this._containerSize.w / this._zoomRatio,
            zoomedHeight = this._containerSize.h / this._zoomRatio;

        this.logger.debug('MinZoomedSize: ' + zoomedWidth + ', ' + zoomedHeight);

        this.logger.debug('this._actualSize: ' + this._actualSize.w + ', ' + this._actualSize.h);

        zoomedWidth = Math.max(zoomedWidth, this._actualSize.w);
        zoomedHeight = Math.max(zoomedHeight, this._actualSize.h);

        this.skinParts.$itemsContainer.css({"width": zoomedWidth,
            "height": zoomedHeight});

        this.skinParts.SVGPaper.setSize(zoomedWidth, zoomedHeight);
        this.skinParts.SVGPaper.setViewBox(0, 0, zoomedWidth, zoomedHeight, false);

        this._svgPaperSize = {"w": zoomedWidth,
                           "h": zoomedHeight};

        this._centerBackgroundText();

        this._offset = this.skinParts.$snapWidgetBody.offset();
    };

    SnapEditorWidget.prototype._attachScrollHandler = function (el) {
        var self = this;

        el.on('scroll', function (event) {
            self._scrollPos.left = el.scrollLeft();
            self._scrollPos.top = el.scrollTop();
        });
    };

    SnapEditorWidget.prototype.setTitle = function (){
        //Receive info 
        ////TODO
    };

    SnapEditorWidget.prototype.clear = function (){
        //TODO
    };

    /************** WAITPROGRESS *********************/
    SnapEditorWidget.prototype.showProgressbar = function (){
        this.__loader.start();
    };

    SnapEditorWidget.prototype.hideProgressbar = function (){
        this.__loader.stop();
    };

    SnapEditorWidget.prototype.onActivate = function (){
        //this._displayToolbarItems();
    };
    /************** END WAITPROGRESS *********************/

    SnapEditorWidget.prototype.onDeactivate = function (){
        this.__loader.destroy();
        //this._hideToolbarItems();
    };
    /**************************** READ-ONLY MODE HANDLERS ************************/

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    SnapEditorWidget.prototype.setReadOnly = function (isReadOnly) {
        this._setReadOnlyMode(isReadOnly);
        if (this.toolbarItems && this.toolbarItems.radioButtonGroupOperatingMode) {
            this.toolbarItems.radioButtonGroupOperatingMode.enabled(!isReadOnly);
        }
    };

    SnapEditorWidget.prototype.getIsReadOnlyMode = function () {
        //return this.mode === this.OPERATING_MODES.READ_ONLY;
        return this.mode !== this.OPERATING_MODES.DESIGN;
    };

    SnapEditorWidget.prototype._setReadOnlyMode = function (readOnly) {
        if (readOnly === true && this.mode !== this.OPERATING_MODES.READ_ONLY) {
            //enter READ-ONLY mode
            this.setOperatingMode(this.OPERATING_MODES.READ_ONLY);
        } else if (readOnly === false && this.mode === this.OPERATING_MODES.READ_ONLY) {
            //enter normal mode from read-only
            this.setOperatingMode(this.OPERATING_MODES.DESIGN);
        }
    };
    /**************************** END READ-ONLY MODE HANDLERS ************************/

    SnapEditorWidget.prototype.destroy = function (){
        //TODO
    };

    SnapEditorWidget.prototype.setSize = function (){
        //TODO
    };

    SnapEditorWidget.prototype.getAdjustedMousePos = function (e) {
        var childrenContainerOffset = this._offset,
            childrenContainerScroll = this._scrollPos,
            pX = e.pageX - childrenContainerOffset.left + childrenContainerScroll.left,
            pY = e.pageY - childrenContainerOffset.top + childrenContainerScroll.top;

        pX /= this._zoomRatio;
        pY /= this._zoomRatio;

        return { "mX": pX > 0 ? pX : 0,
            "mY": pY > 0 ? pY : 0 };
    };

    SnapEditorWidget.prototype._triggerUIActivity = function () {
        logger.info("MOUSE CLICK DETECTED");
        //Have something meaningful happen
        //TODO
    };

    SnapEditorWidget.prototype._getGUID = function () {
        var guid = this._itemIDCounter.toString();

        this._itemIDCounter++;

        while(guid.length < GUID_DIGITS){
            guid = "0" + guid;
        }
        guid = "S_" + guid; //S => Snapping Object

        return guid;
    };
    /* * * * * * * * * * * * * * SELECTION API * * * * * * * * * * * * * */

    SnapEditorWidget.prototype.selectAll = function () {
        this.selectionManager.clear();
        this.selectionManager.setSelection(this.itemIds.concat(this.connectionIds), false);
    };

    SnapEditorWidget.prototype.selectNone = function () {
        this.selectionManager.clear();
    };

    SnapEditorWidget.prototype.select = function (selectionList) {
        this.selectionManager.clear();
        this.selectionManager.setSelection(selectionList, false);
    };

    /* * * * * * * * * * * * * * END SELECTION API * * * * * * * * * * * * * */

    /* * * * * * * * * * * * * * COPY PASTE API * * * * * * * * * * * * * */
    SnapEditorWidget.prototype.onClipboardCopy = function (selectedIds) {
        this.logger.warning("SnapEditorWidget.prototype.onClipboardCopy not overridden in controller!!! selectedIds: '" + selectedIds + "'");
    };

    SnapEditorWidget.prototype.onClipboardPaste = function () {
        this.logger.warning("SnapEditorWidget.prototype.onClipboardPaste not overridden in controller!!!");
    };
    /* * * * * * * * * * * * * * END COPY PASTE API * * * * * * * * * * * * * */

    /************************* DESIGNER ITEM DRAGGABLE & COPYABLE CHECK ON DRAG START ************************/
    SnapEditorWidget.prototype.onDragStartDesignerItemDraggable = function (itemID) {
        this.logger.warning("SnapEditorWidget.prototype.onDesignerItemDraggable not overridden in controller. itemID: " + itemID);

        return true;
    };


    SnapEditorWidget.prototype.onDragStartDesignerItemCopyable = function (itemID) {
        this.logger.warning("SnapEditorWidget.prototype.onDragStartDesignerItemCopyable not overridden in controller. itemID: " + itemID);

        return true;
    };


    SnapEditorWidget.prototype.onDragStartDesignerConnectionCopyable = function (connectionID) {
        this.logger.warning("SnapEditorWidget.prototype.onDragStartDesignerConnectionCopyable not overridden in controller. connectionID: " + connectionID);

        return true;
    };
    /************************* END OF --- DESIGNER ITEM DRAGGABLE & COPYABLE CHECK ON DRAG START ************************/

    /************************** DRAG ITEM ***************************/
    //TODO Update this to show "Clickable Regions"
    SnapEditorWidget.prototype.onDesignerItemDragStart = function (draggedItemId, allDraggedItemIDs) {
        this.selectionManager.hideSelectionOutline();

        this._preDragActualSize = {"w": this._actualSize.w,
                                    "h": this._actualSize.h};

        var len = allDraggedItemIDs.length;
        while (len--) {
            this.items[allDraggedItemIDs[len]].hideSourceConnectors();
        }
    };

    SnapEditorWidget.prototype.onDesignerItemDrag = function (draggedItemId, allDraggedItemIDs) {
        var i = allDraggedItemIDs.length,
            connectionIDsToUpdate,
            redrawnConnectionIDs,
            maxWidth = 0,
            maxHeight = 0,
            itemBBox,
            items = this.items;

        //get the position and size of all dragged guy and temporarily resize canvas to fit them
        while (i--) {
            itemBBox =  items[allDraggedItemIDs[i]].getBoundingBox();
            maxWidth = Math.max(maxWidth, itemBBox.x2);
            maxHeight = Math.max(maxHeight, itemBBox.y2);
        }

        this._actualSize.w = Math.max(this._preDragActualSize.w, maxWidth);
        this._actualSize.h = Math.max(this._preDragActualSize.h, maxHeight);

        this._resizeItemContainer();

        //refresh only the connections that are really needed
        connectionIDsToUpdate = this._getAssociatedConnectionsForItems(allDraggedItemIDs).sort();
        
        this.logger.debug('Redraw connection request: ' + connectionIDsToUpdate.length + '/' + this.connectionIds.length);

        redrawnConnectionIDs = this._redrawConnections(connectionIDsToUpdate) || [];

        this.logger.debug('Redrawn/Requested: ' + redrawnConnectionIDs.length + '/' + connectionIDsToUpdate.length);

        i = redrawnConnectionIDs.len;
    };

    SnapEditorWidget.prototype.onDesignerItemDragStop = function (draggedItemId, allDraggedItemIDs) {
        this.selectionManager.showSelectionOutline();

        delete this._preDragActualSize;
    };

    /************************** END - DRAG ITEM ***************************/



    /* * * * * * * * * * * * * * BACKGROUND TEXT * * * * * * * * * * * * * */
    SnapEditorWidget.prototype.setBackgroundText = function (text, params) {
        var svgParams = {},
            setSvgAttrFromParams;

        if (!this._backGroundText ) {
            if (!text) {
                this.logger.error("Invalid parameter 'text' for method 'setBackgroundText'");
            } else {
                this._backGroundText = this.skinParts.SVGPaper.text(this._svgPaperSize.w / 2, this._svgPaperSize.h / 2, text);
            }
        } else {
            svgParams.text = text;
            svgParams.x = this._svgPaperSize.w / 2;
            svgParams.y = this._svgPaperSize.h / 2;
        }

        if (this._backGroundText) {

            setSvgAttrFromParams = function (attrs) {
                var len = attrs.length;
                while (len--) {
                    if (params.hasOwnProperty(attrs[len][0])) {
                        svgParams[attrs[len][1]] = params[attrs[len][0]];
                    }
                }
            };

            params = params || {};
            params['font-size'] = params['font-size'] || BACKGROUND_TEXT_SIZE;
            params['color'] = params['color'] || BACKGROUND_TEXT_COLOR;

            if (params) {
                setSvgAttrFromParams([['color', 'fill'],
                                 ['font-size', 'font-size']]);
            }
            
            this._backGroundText.attr(svgParams);
        }
    };


    SnapEditorWidget.prototype._centerBackgroundText = function () {
        if (this._backGroundText) {
            this._backGroundText.attr({"x" : this._svgPaperSize.w / 2,
                                       "y" : this._svgPaperSize.h / 2});
        }
    };
    /* * * * * * * * * * * * * * END BACKGROUND TEXT * * * * * * * * * * * * * */

    /* * * * * * * * * * * * * * Additional Functionality * * * * * * * * * * * * * */
    _.extend(SnapEditorWidget.prototype, SnapEditorWidgetMouse.prototype);
    _.extend(SnapEditorWidget.prototype, SnapEditorWidgetKeyboard.prototype);
    _.extend(SnapEditorWidget.prototype, SnapEditorWidgetOperatingModes.prototype);

    return SnapEditorWidget;
});
