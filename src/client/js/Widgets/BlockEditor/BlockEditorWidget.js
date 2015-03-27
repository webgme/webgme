/*globals define,_,Raphael,DEBUG*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * @author brollb / https:// github/brollb
 */

define(['js/logger',
        'raphaeljs',
        './BlockEditorWidget.Zoom',
        './BlockEditorWidget.Mouse',
        './BlockEditorWidget.LinkableItem',
        'js/Widgets/BlockEditor/BlockEditorWidget.EventDispatcher',
        './BlockEditorWidget.OperatingModes',
        './BlockEditorWidget.Keyboard',
        './BlockEditorWidget.Draggable',
        './BlockEditorWidget.Droppable',
        './BlockEditorWidget.HighlightUpdater',
        './BlockEditorWidget.ContextMenu',
        './SearchManager',
        './SelectionManager',
        './HighlightManager',
        'common/util/assert',
        'js/Loader/LoaderCircles',
        'css!./styles/BlockEditorWidget.css',
        'css!./styles/BlockEditorWidget.DecoratorBase.ConnectionArea.css'
], function (Logger,
             raphaeljs,
             BlockEditorWidgetZoom,
             BlockEditorWidgetMouse,
             BlockEditorWidgetLinkableItem,
             BlockEditorWidgetEventDispatcher,
             BlockEditorWidgetOperatingModes,
             BlockEditorWidgetKeyboard,
             BlockEditorWidgetDraggable,
             BlockEditorWidgetDroppable,
             BlockEditorWidgetHighlightUpdater,
             BlockEditorWidgetContextMenu,
             SearchManager,
             SelectionManager,
             HighlightManager,
             assert,
             LoaderCircles) {

    "use strict";

    var BlockEditorWidget,
        CANVAS_EDGE = 100,
        GUID_DIGITS = 6,
        WIDGET_CLASS = 'block-editor',  
        BACKGROUND_TEXT_COLOR = '#DEDEDE',  
        BACKGROUND_TEXT_SIZE = 30;

    var defaultParams = {'loggerName': 'BlockEditorWidget',
                         'gridSize': 10,
                         'droppable': true,
                         'zoomValues': [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5, 10],
                         'zoomUIControls': true };

    BlockEditorWidget = function (container, params) {
        params = params || {};
        params.loggerName = 'gme:Widgets:BlockEditor:BlockEditorWidget';

        // merge default values with the given parameters
        _.extend(params, defaultParams);

        this._addEventDispatcherExtensions();

        /* * * * * * * * * * * ITEMS * * * * * * * * * * */
        this.items = {};
        this.itemIds = [];
        this._itemIDCounter = 0;

        /*linkable item accounting*/
        this._insertedLinkableItemIDs = [];
        this._updatedLinkableItemIDs = [];
        this._deletedLinkableItemIDs = [];

 
        /* * * * * * * * * * UI Components * * * * * * * * * */

        // Default Size values
        this._actualSize = { "w": 0, "h": 0 };
        this._containerSize = { "w": 0, "h": 0 };
        this._itemIDCounter = 0;
        this._documentFragment = document.createDocumentFragment();

        this._backgroundText = "Block Editor";
        this._zoomRatio = 1;

        // if the widget has to support drop feature at all
        this.logger = Logger.create(params.loggerName, WebGMEGlobal.gmeConfig.client.log);
        this._droppable = params.droppable;

        this._init(container, params);

        // init zoom related UI and handlers
        this._initZoom(params);

        // Scroll and view info
        this._offset = { "left": 0, "top": 0 };
        this._scrollPos = { "left": 0, "top": 0 };

        this.gridSize = params.gridSize;

       // initiate Highlight Manager
        var self = this;
        this.highlightManager = new HighlightManager({"widget": this});
        this.highlightManager.initialize(this.skinParts.$itemsContainer);
        this.highlightManager.onHighlight = function (idList) {
            self.onHighlight(idList);
        };

        this.highlightManager.onUnhighlight = function (idList) {
            self.onUnhighlight(idList);
        };

        // initiate Selection Manager (if needed)
        this.selectionManager = params.selectionManager || new SelectionManager({"blockEditor": this});
        this.selectionManager.initialize(this.skinParts.$itemsContainer);
        this.selectionManager.onSelectionCommandClicked = function (command, selectedIds, event) {
            self._onSelectionCommandClicked(command, selectedIds, event);
        };

        this.selectionManager.onSelectionChanged = function (selectedIds) {
            self._onSelectionChanged(selectedIds);
        };

        // initiate Search Manager
        this.searchManager = new SearchManager({"widget": this});
        this.searchManager.initialize(this.skinParts.$itemsContainer);

        this.setOperatingMode(BlockEditorWidgetOperatingModes.prototype.OPERATING_MODES.DESIGN);
        this._activateMouseListeners();

        this.logger.debug("BlockEditorWidget ctor");
    };

    BlockEditorWidget.prototype._init = function (container, params){// Container is the div element
                                                                    // Params is the extra stuff (ie, the toolbar)
        this.$el = container; // Everything goes inside this.$el

        this._initializeUI();
    };

    BlockEditorWidget.prototype._initializeUI = function(){
        var self = this;

        this.logger.debug("BlockWidget._initializeUI");

        // clear content
        this.$el.empty();

        // add own class
        this.$el.addClass(WIDGET_CLASS);

        this._attachScrollHandler(this.$el);

        // DESIGNER CANVAS HEADER
        this.skinParts = {};

        this.skinParts.$blockWidgetBody = this.$el;

        // CHILDREN container
        this.skinParts.$itemsContainer = $('<div/>', {
            "class" : "items"
        });
        this.skinParts.$blockWidgetBody.append(this.skinParts.$itemsContainer);

        // initialize Raphael paper from children container and set it to be full size of the HTML container
        this.skinParts.SVGPaper = Raphael(this.skinParts.$itemsContainer[0]);
        this.skinParts.SVGPaper.canvas.style.pointerEvents = "visiblePainted";

        // finally resize the whole content according to available space
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

    BlockEditorWidget.prototype._resizeItemContainer = function () {
        var zoomedWidth = this._containerSize.w / this._zoomRatio,
            zoomedHeight = this._containerSize.h / this._zoomRatio,
            offset,
            paddingTop,
            paddingLeft;

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

        offset = this.skinParts.$blockWidgetBody.offset();

        paddingTop = parseInt( this.skinParts.$blockWidgetBody.css('padding-top').replace("px", "") );
        paddingLeft = parseInt( this.skinParts.$blockWidgetBody.css('padding-left').replace("px", "") );

        offset.left += paddingLeft;
        offset.top += paddingTop;

        this._offset = offset;

        // jQuery does not take into account the css "transform" 
        // property correctly. Therefore, we will 
        // adjust each item's container width/height to allow droppable
        for (var i = this.itemIds.length-1; i >= 0; i--) {
            if (this.items[this.itemIds[i]].updateZoom(this._zoomRatio)) {
                this.items[this.itemIds[i]].applySizeContainerInfo();
            }
        }
    };

    BlockEditorWidget.prototype._attachScrollHandler = function (el) {
        var self = this;

        el.on('scroll', function (event) {
            self._scrollPos.left = el.scrollLeft();
            self._scrollPos.top = el.scrollTop();
        });
    };

    /************** WAITPROGRESS *********************/
    BlockEditorWidget.prototype.showProgressbar = function (){
        this.__loader.start();
    };

    BlockEditorWidget.prototype.hideProgressbar = function (){
        this.__loader.stop();
    };

    /************** END WAITPROGRESS *********************/

    BlockEditorWidget.prototype.onActivate = function (){
        // This function is required
    };

    BlockEditorWidget.prototype.onDeactivate = function (){
        this.__loader.destroy();
        // this._hideToolbarItems();
    };
    /**************************** READ-ONLY MODE HANDLERS ************************/

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    BlockEditorWidget.prototype.setReadOnly = function (isReadOnly) {
        this._setReadOnlyMode(isReadOnly);
        if (this.toolbarItems && this.toolbarItems.radioButtonGroupOperatingMode) {
            this.toolbarItems.radioButtonGroupOperatingMode.enabled(!isReadOnly);
        }
    };

    BlockEditorWidget.prototype.getIsReadOnlyMode = function () {
        // return this.mode === this.OPERATING_MODES.READ_ONLY;
        return this.mode !== this.OPERATING_MODES.DESIGN;
    };

    BlockEditorWidget.prototype._setReadOnlyMode = function (readOnly) {
        if (readOnly === true && this.mode !== this.OPERATING_MODES.READ_ONLY) {
            // enter READ-ONLY mode
            this.setOperatingMode(this.OPERATING_MODES.READ_ONLY);
        } else if (readOnly === false && this.mode === this.OPERATING_MODES.READ_ONLY) {
            // enter normal mode from read-only
            this.setOperatingMode(this.OPERATING_MODES.DESIGN);
        }
    };
    /**************************** END READ-ONLY MODE HANDLERS ************************/

    /****************** PUBLIC FUNCTIONS ***********************************/

    // Called when the widget's container size changed
    BlockEditorWidget.prototype.setSize = function (width, height) {
        this._containerSize.w = width;
        this._containerSize.h = height;

        // call our own resize handler
        this._resizeItemContainer();

        // this._refreshTabTabsScrollOnResize();
    };

    BlockEditorWidget.prototype.destroy = function () {
        this.__loader.destroy();
        // this._removeToolbarItems();
    };

    BlockEditorWidget.prototype.getAdjustedMousePos = function (e) {
        var childrenContainerOffset = this._offset,
            childrenContainerScroll = this._scrollPos,
            pX = e.pageX - childrenContainerOffset.left + childrenContainerScroll.left,
            pY = e.pageY - childrenContainerOffset.top + childrenContainerScroll.top;

        pX /= this._zoomRatio;
        pY /= this._zoomRatio;

        return { "mX": pX > 0 ? pX : 0,
            "mY": pY > 0 ? pY : 0 };
    };

    BlockEditorWidget.prototype._triggerUIActivity = function () {
        this.logger.info("MOUSE CLICK DETECTED");
        this.onUIActivity();
    };

    BlockEditorWidget.prototype._getGuid = function () {
        var guid = this._itemIDCounter.toString();

        this._itemIDCounter++;

        while(guid.length < GUID_DIGITS){
            guid = "0" + guid;
        }
        guid = "S_" + guid; // S => Blockping Object

        return guid;
    };
    /* * * * * * * * * * * * * * SELECTION API * * * * * * * * * * * * * */

    BlockEditorWidget.prototype.selectAll = function () {
        this.selectionManager.clear();
        this.selectionManager.setSelection(this.itemIds.concat(this.connectionIds), false);
    };

    BlockEditorWidget.prototype.selectNone = function () {
        this.selectionManager.clear();
    };

    BlockEditorWidget.prototype.select = function (selectionList) {
        this.selectionManager.clear();
        this.selectionManager.setSelection(selectionList, false);
    };

    /* * * * * * * * * * * * * * END SELECTION API * * * * * * * * * * * * * */

    BlockEditorWidget.prototype._checkPositionOverlap = function (itemId, objDescriptor) {
        var i,
            posChanged = true,
            itemID,
            item;

        // check if position has to be adjusted to not to put it on some other model
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


    /************************** SELECTION DELETE CLICK HANDLER ****************************/

    BlockEditorWidget.prototype._onSelectionCommandClicked = function (command, id, event) {
        var idList;

        // Get the list of siblings of the item
        idList = this.items[id].getDependentsByType().siblings;
        idList.push(id);

        switch(command) {
            case 'delete':
                this.onSelectionDelete(idList);
                break;
                /*
            case 'contextmenu':
                this.onSelectionContextMenu(idList, this.getAdjustedMousePos(event));
                break;
               */
        }
    };

    BlockEditorWidget.prototype.onSelectionDelete = function (selectedIds) {
        this.logger.warn("BlockEditorWidget.onSelectionDelete IS NOT OVERRIDDEN IN A CONTROLLER. ID: '" + selectedIds + "'");
    };

    BlockEditorWidget.prototype.onSelectionContextMenu = function (selectedIds, mousePos) {
        this.logger.warn("BlockEditorWidget.onSelectionContextMenu IS NOT OVERRIDDEN IN A CONTROLLER. ID: '" + selectedIds + "', mousePos: " + JSON.stringify(mousePos));
    };

    /************************** SELECTION DELETE CLICK HANDLER ****************************/

    /************************** SELECTION CHANGED HANDLER ****************************/

    BlockEditorWidget.prototype._onSelectionChanged = function (selectedIds) {
        this.onSelectionChanged(selectedIds);
    };

    BlockEditorWidget.prototype.onSelectionChanged = function (selectedIds) {
        this.logger.debug("BlockEditorWidget.onSelectionChanged IS NOT OVERRIDDEN IN A CONTROLLER...");
    };


    /************************** SELECTION CHANGED HANDLER ****************************/


    /* * * * * * * * * * * * * * COPY PASTE API * * * * * * * * * * * * * */
    BlockEditorWidget.prototype.onClipboardCopy = function (selectedIds) {
        this.logger.warn("BlockEditorWidget.prototype.onClipboardCopy not overridden in controller!!! selectedIds: '" + selectedIds + "'");
    };

    BlockEditorWidget.prototype.onClipboardPaste = function () {
        this.logger.warn("BlockEditorWidget.prototype.onClipboardPaste not overridden in controller!!!");
    };
    /* * * * * * * * * * * * * * END COPY PASTE API * * * * * * * * * * * * * */

    /************************* DESIGNER ITEM DRAGGABLE & COPYABLE CHECK ON DRAG START ************************/
    BlockEditorWidget.prototype.onDragStartLinkableItemDraggable = function (itemID) {
        this.logger.warn("BlockEditorWidget.prototype.onLinkableItemDraggable not overridden in controller. itemID: " + itemID);

        return true;
    };


    BlockEditorWidget.prototype.onDragStartLinkableItemCopyable = function (itemID) {
        this.logger.warn("BlockEditorWidget.prototype.onDragStartLinkableItemCopyable not overridden in controller. itemID: " + itemID);

        return true;
    };


    BlockEditorWidget.prototype.onDragStartDesignerConnectionCopyable = function (connectionID) {
        this.logger.warn("BlockEditorWidget.prototype.onDragStartDesignerConnectionCopyable not overridden in controller. connectionID: " + connectionID);

        return true;
    };
    /************************* END OF --- DESIGNER ITEM DRAGGABLE & COPYABLE CHECK ON DRAG START ************************/

    /************************** DRAG ITEM ***************************/
    BlockEditorWidget.prototype.onLinkableItemDragStart = function (draggedItemId, allDraggedItemIDs) {
        this.selectionManager.hideSelectionOutline();

        this._preDragActualSize = {"w": this._actualSize.w,
                                    "h": this._actualSize.h};

        var len = allDraggedItemIDs.length;
        while (len--) {
            this.items[allDraggedItemIDs[len]].hideSourceConnectors();
        }
    };

    BlockEditorWidget.prototype.onLinkableItemDrag = function (draggedItemId, allDraggedItemIDs) {
        var i = allDraggedItemIDs.length,
            connectionIDsToUpdate,
            redrawnConnectionIDs,
            maxWidth = 0,
            maxHeight = 0,
            itemBBox,
            items = this.items;

        // get the position and size of all dragged guy and temporarily resize canvas to fit them
        while (i--) {
            itemBBox =  items[allDraggedItemIDs[i]].getBoundingBox();
            maxWidth = Math.max(maxWidth, itemBBox.x2);
            maxHeight = Math.max(maxHeight, itemBBox.y2);
        }

        this._actualSize.w = Math.max(this._preDragActualSize.w, maxWidth);
        this._actualSize.h = Math.max(this._preDragActualSize.h, maxHeight);

        this._resizeItemContainer();

        // refresh only the connections that are really needed
        connectionIDsToUpdate = this._getAssociatedConnectionsForItems(allDraggedItemIDs).sort();
        
        this.logger.debug('Redraw connection request: ' + connectionIDsToUpdate.length + '/' + this.connectionIds.length);

        redrawnConnectionIDs = this._redrawConnections(connectionIDsToUpdate) || [];

        this.logger.debug('Redrawn/Requested: ' + redrawnConnectionIDs.length + '/' + connectionIDsToUpdate.length);

        i = redrawnConnectionIDs.len;
    };

    BlockEditorWidget.prototype.onLinkableItemDragStop = function (draggedItemId, allDraggedItemIDs) {
        this.selectionManager.showSelectionOutline();

        delete this._preDragActualSize;
    };

    /************************** END - DRAG ITEM ***************************/



    /* * * * * * * * * * * * * * BACKGROUND TEXT * * * * * * * * * * * * * */
    BlockEditorWidget.prototype.setBackgroundText = function (text, params) {
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
            params.color = params.color || BACKGROUND_TEXT_COLOR;

            if (params) {
                setSvgAttrFromParams([['color', 'fill'],
                                 ['font-size', 'font-size']]);
            }
            
            this._backGroundText.attr(svgParams);
        }
    };


    BlockEditorWidget.prototype._centerBackgroundText = function () {
        if (this._backGroundText) {
            this._backGroundText.attr({"x" : this._svgPaperSize.w / 2,
                                       "y" : this._svgPaperSize.h / 2});
        }
    };
    /* * * * * * * * * * * * * * END BACKGROUND TEXT * * * * * * * * * * * * * */

    /* * * * * * * * * * * * * * UPDATE VIEW * * * * * * * * * * * * * */

    BlockEditorWidget.prototype.beginUpdate = function () {
        this.logger.debug("beginUpdate");

        this._updating = true;

        /*designer item accounting*/
        this._insertedLinkableItemIDs = [];
        this._updatedLinkableItemIDs = [];
        this._deletedLinkableItemIDs = [];

        /*linkable item stuff*/
        this._linkableItems2Update = {};
    };

    BlockEditorWidget.prototype.endUpdate = function () {
        this.logger.debug("endUpdate");

        this._updating = false;
        this._tryRefreshScreen();
    };

    BlockEditorWidget.prototype._tryRefreshScreen = function () {
        var insertedLen = 0,
            updatedLen = 0,
            deletedLen = 0,
            msg = "";

        // check whether controller update finished or not
        if (this._updating !== true) {

            insertedLen += this._insertedLinkableItemIDs.length;
            updatedLen += this._updatedLinkableItemIDs.length;
            deletedLen += this._deletedLinkableItemIDs.length;

            msg += "I: " + insertedLen;
            msg += " U: " + updatedLen;
            msg += " D: " + deletedLen;

            this.logger.debug(msg);
            if (DEBUG === true && this.toolbarItems && this.toolbarItems.progressText) {
                this.toolbarItems.progressText.text(msg, true);
            }

            this._refreshScreen();
        }
    };

    BlockEditorWidget.prototype._refreshScreen = function () {
        var i,
            maxWidth = 0,
            maxHeight = 0,
            itemBBox,
            doRenderGetLayout,
            doRenderSetText,
            doRenderSetLayout,
            items = this.items,
            affectedItems = [],
            dispatchEvents,
            self = this;

        this.logger.debug("_refreshScreen START");

        /***************** FIRST HANDLE THE DESIGNER ITEMS *****************/
        // add all the inserted items, they are still on a document Fragment
        this.skinParts.$itemsContainer[0].appendChild(this._documentFragment);
        this._documentFragment = document.createDocumentFragment();

        // STEP 1: call the inserted and updated items' getRenderLayout
        // I need to get the widths, heights, etc, so I can calculate the new sizes
        // after the transforms...
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
        doRenderGetLayout(this._insertedLinkableItemIDs);
        doRenderGetLayout(this._updatedLinkableItemIDs);

        // Update the text fields of all linkable items
        doRenderSetText = function (itemIDList) {
            for (var i = itemIDList.length-1; i >= 0; i--){
                items[itemIDList[i]].renderSetTextInfo();
            }
        };
        doRenderSetText(this._insertedLinkableItemIDs);
        doRenderSetText(this._updatedLinkableItemIDs);
        
        // Update all linkable items that need updating
        this._updateLinkableItems();

        // STEP 2: call the inserted and updated items' setRenderLayout
        doRenderSetLayout = function (itemIDList) {
            var i = itemIDList.length,
                cItem;

            for (var i = itemIDList.length-1; i >= 0; i--){
                items[itemIDList[i]].renderSetLayoutInfo();
            }
        };
        
        doRenderSetLayout(this._insertedLinkableItemIDs);
        doRenderSetLayout(this._updatedLinkableItemIDs);


        /*********** SEND CREATE / UPDATE EVENTS about created/updated items **********/
        dispatchEvents = function (itemIDList, eventType) {
            var i = itemIDList.length;

            while (i--) {
                self.dispatchEvent(eventType, itemIDList[i]);
            }
        };
        dispatchEvents(this._insertedLinkableItemIDs, this.events.ON_COMPONENT_CREATE);
        dispatchEvents(this._updatedLinkableItemIDs, this.events.ON_COMPONENT_UPDATE);
        /*********************/


        affectedItems = this._insertedLinkableItemIDs.concat(this._updatedLinkableItemIDs, this._deletedLinkableItemIDs);

        // adjust the canvas size to the new 'grown' are that the inserted / updated require
        // TODO: canvas size decrease not handled yet
        this._actualSize.w = Math.max(this._actualSize.w, maxWidth + CANVAS_EDGE);
        this._actualSize.h = Math.max(this._actualSize.h, maxHeight + CANVAS_EDGE);
        this._resizeItemContainer();

        /* clear collections */
        this._insertedLinkableItemIDs = [];
        this._updatedLinkableItemIDs = [];
        this._deletedLinkableItemIDs = [];

        if (this.mode === this.OPERATING_MODES.DESIGN ||
            this.mode === this.OPERATING_MODES.READ_ONLY) {
            this.selectionManager.showSelectionOutline();    
        }

        this.logger.debug("_refreshScreen END");
    };

    // This next method will find the scope of items that could be affected by
    // the updates and update their size and position.
    //
    // That is, we have a tree of the dependents for a given item. A 
    // dependent is an item on the screen that is being pointed to by
    // the item; that is, a dependent item is dependent on the item
    // for it's position. 
    //
    // This tree contains two different types of dependents: "siblings" 
    // and "children". Children are items that are contained inside of
    // the item (eg, command block inside of an "if" statement - these
    // are usually rendered on top of the given item). Siblings are 
    // items that are stored in the same node in the database - they
    // are hierarchical siblings (eg, a command block connected to 
    // another command block).
    //
    // Although both children and siblings are dependent on the given
    // item for their position, the item's size is dependent on it's
    // children's sizes (as it may need to graphically contain them).
    //
    // That being said, we will first follow the nodes that need to 
    // be updated up their dependency tree to find the items possibly
    // affected by any resize of the children. We will then remove any
    // redundant items in the list that needs updating.
    //
    // Finally, we will update the items by first resizing them then moving. 
    // We will create a list of items to resize by starting with the given
    // item and recursively... 
    //
    //              - resize the children
    //              - resize the siblings
    //              - resize the item
    //
    // After resizing these items, we will iterate over the items in 
    // the opposite order and move the items to their correct location.
    
    /**
     * Update the size and position of the items affected by last update.
     *
     * @return {undefined}
     */
    BlockEditorWidget.prototype._updateLinkableItems = function () {
        // First, finding the highest node in the dependency tree that could
        // affected by the change
        
        var items = Object.keys(this._linkableItems2Update),
            item,
            params,
            i = -1;

        while (++i < items.length){
            delete this._linkableItems2Update[items[i]];
            item = items[i];

            // get the "highest" item possibly affected
            while (this.items[item].parent !== null){
                item = this.items[item].parent.id;
            }

            // Add item if not already there
            this._linkableItems2Update[item] = true;
        }

        // For each of the items left:
        //    + resize children dependents
        //    + resize sibling dependents
        //    + resize self
        var resizeQueue,
            moveQueue = [], 
            dependents,
            visited = {},
            self = this,
            sortByDependency = function(children){
                // Sort the children by dependency on one another
                // Make sure that this works if we start on a child that is halfway through the list
                var childMap = {},
                    visited = {},
                    sorted = [],
                    depList = [],
                    child,
                    index,
                    i;

                // Create a map of children from array
                for (i = children.length -1; i >= 0; i--){
                    childMap[children[i]] = true;
                }

                i = 0;
                while (i < children.length){

                    depList = [];
                    child = self.items[children[i]];
                    
                    // While we haven't visited child and it is in our set
                    while(!visited[child.id] && childMap[child.id]){
                        // add the child to the depList
                        depList.unshift(child.id);
                        visited[child.id] = true;
                        child = child.parent;
                    }

                    // Add depList to sorted as appropriate
                    if (visited[child.id]){
                        sorted = sorted.concat(depList);
                    } else {
                        sorted = depList.concat(sorted);
                    }

                    while (visited[children[i]]){
                        i++;
                    }

                }

                return sorted;
            };

        items = Object.keys(this._linkableItems2Update);
        params = {propogate: false, resize: false};
        while (items.length) {
            item = items.pop();

            resizeQueue = [item];
            while(resizeQueue.length){
                dependents = this.items[resizeQueue[0]].getDependentsByType();
                // Try to follow children
                while(dependents.children && !visited[resizeQueue[0]]){
                    visited[resizeQueue[0]] = true;
                    // Sort children by dependency
                    dependents.children = sortByDependency(dependents.children);
                    resizeQueue = dependents.children.concat(dependents.siblings, resizeQueue);
                    dependents = this.items[resizeQueue[0]].getDependentsByType();
                }
                moveQueue.push(resizeQueue.splice(0,1).pop());
                this.items[moveQueue[moveQueue.length-1]].updateSize();
                this.items[moveQueue[moveQueue.length-1]].updateDependents(params);  // positions all dependents
            }
        }

        this._linkableItems2Update = {};
    };

    BlockEditorWidget.prototype.clear = function () {

        this.setTitle('');

        this.selectionManager.clear(); 

        var keys = this.itemIds,
            key;

        while(keys.length){
            key = keys.pop();
            this.items[key].destroy();
            delete this.items[key];
        }

        assert(Object.keys(this.items).length === 0, "Items have not been fully removed from previous screen");

        // initialize all the required collections with empty value
        this._initializeCollections();

        this._actualSize = { "w": 0, "h": 0 };

        this._resizeItemContainer();

        // this.dispatchEvent(this.events.ON_CLEAR);
    };

    BlockEditorWidget.prototype._initializeCollections = function() {
        this._itemIDCounter = 0;
        this.updating = false;

        this.items = {};

        this._insertedLinkableItemIDs = [];
        this._updatedLinkableItemIDs = [];
        this._deletedLinkableItemIDs = [];
    };
    

    BlockEditorWidget.prototype.deleteComponent = function (componentId) {
        // let the selection manager / drag-manager / connection drawing manager / etc know about the deletion
        this.dispatchEvent(this.events.ON_COMPONENT_DELETE, componentId);

        this.deleteLinkableItem(componentId);
    };


    /* * * * * * * * * * * * * * END UPDATE VIEW * * * * * * * * * * * * * */

    /* * * * * * * * * * * * * * OPERATING MODES * * * * * * * * * * * * * */
    BlockEditorWidget.prototype.setOperatingMode = function (mode) {
        if (this.mode !== mode) {
            this.highlightManager.deactivate();
            this.selectionManager.deactivate();
            this.searchManager.deactivate();
            this._setComponentsReadOnly(true);
            switch (mode) {
                case BlockEditorWidgetOperatingModes.prototype.OPERATING_MODES.READ_ONLY:
                    this.mode = this.OPERATING_MODES.READ_ONLY;
                    this.selectionManager.activate();
                    this.searchManager.activate();
                    break;
                case BlockEditorWidgetOperatingModes.prototype.OPERATING_MODES.DESIGN:
                    this.mode = this.OPERATING_MODES.DESIGN;
                    this.selectionManager.activate();
                    this.searchManager.activate();
                    this._setComponentsReadOnly(false);
                    break;
                case BlockEditorWidgetOperatingModes.prototype.OPERATING_MODES.HIGHLIGHT:
                    this.mode = this.OPERATING_MODES.HIGHLIGHT;
                    this.highlightManager.activate();
                    break;
                default:
                    this.mode = this.OPERATING_MODES.READ_ONLY;
                    this.selectionManager.activate();
                    this.searchManager.activate();
                    break;
            }
        }
    };

    BlockEditorWidget.prototype._setComponentsReadOnly = function (readOnly) {
        var i = this.itemIds.length;
        while (i--) {
            this.items[this.itemIds[i]].readOnlyMode(readOnly);
        }

        i = this.itemIds.length;
        while (i--) {
            this.items[this.itemIds[i]].renderGetLayoutInfo();
        }
        i = this.itemIds.length;
        while (i--) {
            this.items[this.itemIds[i]].renderSetLayoutInfo();
        }

    };


    /* * * * * * * * * * * * * * END OPERATING MODES * * * * * * * * * * * * * */

    /************************* HIGHLIGHTED / UNHIGHLIGHTED EVENT *****************************/
    BlockEditorWidget.prototype.onHighlight = function (idList) {
        this.logger.warn("BlockEditorWidget.prototype.onHighlight not overridden in controller. idList: " + idList);
    };

    BlockEditorWidget.prototype.onUnhighlight = function (idList) {
        this.logger.warn("BlockEditorWidget.prototype.onUnhighlight not overridden in controller. idList: " + idList);
    };
    /************************* HIGHLIGHTED / UNHIGHLIGHTED EVENT *****************************/


    /* * * * * * * * * * * * * * Additional Functionality * * * * * * * * * * * * * */
    _.extend(BlockEditorWidget.prototype, BlockEditorWidgetZoom.prototype);
    _.extend(BlockEditorWidget.prototype, BlockEditorWidgetMouse.prototype);
    _.extend(BlockEditorWidget.prototype, BlockEditorWidgetKeyboard.prototype);
    _.extend(BlockEditorWidget.prototype, BlockEditorWidgetOperatingModes.prototype);
    _.extend(BlockEditorWidget.prototype, BlockEditorWidgetLinkableItem.prototype);
    _.extend(BlockEditorWidget.prototype, BlockEditorWidgetEventDispatcher.prototype);
    _.extend(BlockEditorWidget.prototype, BlockEditorWidgetDraggable.prototype);
    _.extend(BlockEditorWidget.prototype, BlockEditorWidgetDroppable.prototype);
    _.extend(BlockEditorWidget.prototype, BlockEditorWidgetHighlightUpdater.prototype);
    _.extend(BlockEditorWidget.prototype, BlockEditorWidgetContextMenu.prototype);

    return BlockEditorWidget;
});
