/*globals define, Raphael, window, WebGMEGlobal, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */


define([
    'js/logger',
    'js/Constants',
    'raphaeljs',
    'js/Loader/LoaderCircles',
    'js/Widgets/DiagramDesigner/SelectionManager',
    'js/Widgets/DiagramDesigner/DragManager.Native',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.OperatingModes',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.DesignerItems',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Connections',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Subcomponents',
    'js/Widgets/DiagramDesigner/ConnectionRouteManagerBasic',
    'js/Widgets/DiagramDesigner/ConnectionRouteManager2',
    'js/Widgets/DiagramDesigner/ConnectionRouteManager3',
    'js/Widgets/DiagramDesigner/ConnectionDrawingManager',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.EventDispatcher',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Zoom',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Keyboard',
    'js/Widgets/DiagramDesigner/HighlightManager',
    'js/Widgets/DiagramDesigner/SearchManager',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.ContextMenu',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Droppable',
    './DiagramDesignerWidget.Draggable',
    './DiagramDesignerWidget.Clipboard',
    './DiagramDesignerWidget.Toolbar',
    './DiagramDesignerWidget.Mouse',
    './DiagramDesignerWidget.Tabs',
    'js/Utils/ComponentSettings',
    'css!./styles/DiagramDesignerWidget.css'
], function (Logger,
             CONSTANTS,
             raphaeljs,
             LoaderCircles,
             SelectionManager,
             DragManager,
             DiagramDesignerWidgetConstants,
             DiagramDesignerWidgetOperatingModes,
             DiagramDesignerWidgetDesignerItems,
             DiagramDesignerWidgetConnections,
             DiagramDesignerWidgetSubcomponents,
             ConnectionRouteManagerBasic,
             ConnectionRouteManager2,
             ConnectionRouteManager3,
             ConnectionDrawingManager,
             DiagramDesignerWidgetEventDispatcher,
             DiagramDesignerWidgetZoom,
             DiagramDesignerWidgetKeyboard,
             HighlightManager,
             SearchManager,
             DiagramDesignerWidgetContextMenu,
             DiagramDesignerWidgetDroppable,
             DiagramDesignerWidgetDraggable,
             DiagramDesignerWidgetClipboard,
             DiagramDesignerWidgetToolbar,
             DiagramDesignerWidgetMouse,
             DiagramDesignerWidgetTabs,
             ComponentSettings) {

    'use strict';

    var DiagramDesignerWidget,
        CANVAS_EDGE = 100,
        WIDGET_CLASS = 'diagram-designer',  // must be same as scss/Widgets/DiagramDesignerWidget.scss
        GUID_DIGITS = 6,
        BACKGROUND_TEXT_COLOR = '#DEDEDE',
        BACKGROUND_TEXT_SIZE = 30,

        DEBUG = window.DEBUG,
        _ = window._;

    var defaultParams = {
        loggerName: 'gme:Widgets:DiagramDesigner:DiagramDesignerWidget',
        gridSize: 10,
        droppable: true,
        zoomUIControls: true,
        defaultConnectionRouteManagerType: WebGMEGlobal.gmeConfig.client.defaultConnectionRouter
    };

    DiagramDesignerWidget = function (container, par) {
        var self = this,
            config = DiagramDesignerWidget.getDefaultConfig(),
            params = {};

        this.CONSTANTS = DiagramDesignerWidgetConstants;

        ComponentSettings.resolveWithWebGMEGlobal(config, DiagramDesignerWidget.getComponentId());
        //merge dfault values with the given parameters
        _.extend(params, defaultParams, par);

        params.zoomValues = params.zoomValues || config.zoomValues;

        this.gmeConfig = WebGMEGlobal.gmeConfig;
        //create logger instance with specified name
        this.logger = Logger.create(params.loggerName, this.gmeConfig.client.log);

        //save DOM container
        this.$el = container;

        //transform this instance into EventDispatcher
        this._addEventDispatcherExtensions();

        //Get DiagramDesignerWidget parameters from options

        //grid size for item positioning granularity
        this.gridSize = params.gridSize;

        //if the widget has to support drop feature at all
        this._droppable = params.droppable;

        //if the widget supports search functionality
        this._defaultSearchUI = true;
        if (params.hasOwnProperty('defaultSearchUI')) {
            this._defaultSearchUI = params.defaultSearchUI;
        }

        //if the widget needs lineStyleControls
        this._lineStyleControls = true;
        if (params.hasOwnProperty('lineStyleControls')) {
            this._lineStyleControls = params.lineStyleControls;
        }

        this._disableConnectionRendering = params.disableConnectionRendering;
        this._disableAutoRouterOption = params.disableAutoRouterOption;

        //by default tabs are not enabled
        this._tabsEnabled = false;
        this._addTabs = false;
        this._deleteTabs = false;
        this._reorderTabs = false;

        if (params && params.hasOwnProperty('tabsEnabled')) {
            this._tabsEnabled = params.tabsEnabled && true;
        }

        if (params && params.hasOwnProperty('addTabs')) {
            this._addTabs = params.addTabs && true;
        }

        if (params && params.hasOwnProperty('deleteTabs')) {
            this._deleteTabs = params.deleteTabs && true;
        }

        if (params && params.hasOwnProperty('reorderTabs')) {
            this._reorderTabs = params.reorderTabs && true;
        }

        this._enableConnectionDrawing = true;

        if (params && params.hasOwnProperty('enableConnectionDrawing')) {
            this._enableConnectionDrawing = params.enableConnectionDrawing && true;
        }


        //END OF --- Get DiagramDesignerWidget parameters from options

        //define properties of its own
        this._actualSize = {w: 0, h: 0};
        this._containerSize = {w: 0, h: 0};
        this._itemIDCounter = 0;
        this._documentFragment = document.createDocumentFragment();

        this._offset = {left: 0, top: 0};
        this._scrollPos = {left: 0, top: 0};

        //set default mode to NORMAL
        this.mode = this.OPERATING_MODES.READ_ONLY;

        //currently not updating anything
        this._updating = false;

        //initialize all the local arrays and maps for the widget
        this._initializeCollections();

        //zoom ratio variable
        this._zoomRatio = 1.0;

        //by default connection item to connections are enabled
        this._connectToConnection = true;

        //by default connections do not jump on crossings
        this._connectionJumpXing = false;

        //initialize UI
        this._initializeUI();

        //init zoom related UI and handlers
        this._initZoom(params);

        //initiate Selection Manager (if needed)
        this.selectionManager = params.selectionManager || new SelectionManager({diagramDesigner: this});
        this.selectionManager.initialize(this.skinParts.$itemsContainer);
        this.selectionManager.onSelectionCommandClicked = function (command, selectedIds, event) {
            self._onSelectionCommandClicked(command, selectedIds, event);
        };

        this.selectionManager.onSelectionRotated = function (deg, selectedIds) {
            self.onSelectionRotated(deg, selectedIds);
        };

        this.selectionManager.onSelectionChanged = function (selectedIds) {
            self._onSelectionChanged(selectedIds);
        };

        //initiate Drag Manager (if needed)
        this.dragManager = new DragManager({diagramDesigner: this});
        this.dragManager.initialize(this.skinParts.$itemsContainer);

        /*********** CONNECTION DRAWING COMPONENT *************/
        this._defaultConnectionRouteManagerType = params.defaultConnectionRouteManagerType;
        //initiate Connection Router (if needed)
        if (params.connectionRouteManager) {
            this.connectionRouteManager = params.connectionRouteManager;
        } else if (params.defaultConnectionRouteManagerType === 'basic') {
            this.connectionRouteManager = new ConnectionRouteManagerBasic({diagramDesigner: this});
        } else if (params.defaultConnectionRouteManagerType === 'basic2') {
            this.connectionRouteManager = new ConnectionRouteManager2({diagramDesigner: this});
        } else if (params.defaultConnectionRouteManagerType === 'basic3') {
            this.connectionRouteManager = new ConnectionRouteManager3({diagramDesigner: this});
        }

        this.connectionRouteManager.initialize();

        //initiate connection drawing component and hook up event callbacks
        this.connectionDrawingManager = new ConnectionDrawingManager({diagramDesigner: this});
        this.connectionDrawingManager.initialize(this.skinParts.$itemsContainer);
        this.connectionDrawingManager.onStartConnectionCreate = function (params) {
            self._onStartConnectionCreate(params);
        };
        this.connectionDrawingManager.onStartConnectionReconnect = function (params) {
            self._onStartConnectionReconnect(params);
        };
        this.connectionDrawingManager.onEndConnectionDraw = function () {
            self._onEndConnectionDraw();
        };
        this.connectionDrawingManager.onCreateNewConnection = function (params) {
            self.onCreateNewConnection(params);
        };
        this.connectionDrawingManager.onModifyConnectionEnd = function (params) {
            self._onModifyConnectionEnd(params);
        };

        /*********** END OF --- CONNECTION DRAWING COMPONENT *************/

            //initiate Highlight Manager
        this.highlightManager = new HighlightManager({diagramDesigner: this});
        this.highlightManager.initialize(this.skinParts.$itemsContainer);
        this.highlightManager.onHighlight = function (idList) {
            self.onHighlight(idList);
        };

        this.highlightManager.onUnhighlight = function (idList) {
            self.onUnhighlight(idList);
        };

        //initiate Search Manager
        this.searchManager = new SearchManager({diagramDesigner: this});
        this.searchManager.initialize(this.skinParts.$itemsContainer);

        this._afterManagersInitialized();

        this.setOperatingMode(DiagramDesignerWidgetOperatingModes.prototype.OPERATING_MODES.DESIGN);

        this._activateMouseListeners();


        this.logger.debug('DiagramDesignerWidget ctor finished');
    };

    DiagramDesignerWidget.prototype._afterManagersInitialized = function () {
        //DEFAULT IMPLEMENTATION - NOOP
    };

    DiagramDesignerWidget.prototype._initializeCollections = function () {
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

        /*designer item accounting*/
        this._insertedDesignerItemIDs = [];
        this._updatedDesignerItemIDs = [];
        this._deletedDesignerItemIDs = [];

        /*connection accounting*/
        this._insertedConnectionIDs = [];
        this._updatedConnectionIDs = [];
        this._deletedConnectionIDs = [];

        /*subcomponent accounting*/
        this._itemSubcomponentsMap = {};

        //reset item counter
        this._itemIDCounter = 0;
    };

    /*
     * Generated a new ID for the box/line (internal use only)
     */
    DiagramDesignerWidget.prototype._getGuid = function (prefix) {
        var nextID = (this._itemIDCounter++) + '',
            len;

        //padding 0s
        len = GUID_DIGITS - nextID.length;
        while (len--) {
            nextID = '0' + nextID;
        }

        if (prefix) {
            nextID = prefix + nextID;
        }

        return nextID;
    };

    /**************************** READ-ONLY MODE HANDLERS ************************/

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    DiagramDesignerWidget.prototype.setReadOnly = function (isReadOnly) {
        this._setReadOnlyMode(isReadOnly);
        if (this.toolbarItems) {
            if (this.toolbarItems.radioButtonGroupOperatingMode) {
                this.toolbarItems.radioButtonGroupOperatingMode.enabled(!isReadOnly);
            }

            if (this.toolbarItems.btnGridLayout) {
                this.toolbarItems.btnGridLayout.enabled(!isReadOnly);
            }

            if (this.toolbarItems.btnCozyGridLayout) {
                this.toolbarItems.btnCozyGridLayout.enabled(!isReadOnly);
            }
        }
    };

    DiagramDesignerWidget.prototype.getIsReadOnlyMode = function () {
        //return this.mode === this.OPERATING_MODES.READ_ONLY;
        return this.mode !== this.OPERATING_MODES.DESIGN;
    };

    DiagramDesignerWidget.prototype._setReadOnlyMode = function (readOnly) {
        if (readOnly === true && this.mode !== this.OPERATING_MODES.READ_ONLY) {
            //enter READ-ONLY mode
            this.setOperatingMode(this.OPERATING_MODES.READ_ONLY);
        } else if (readOnly === false && this.mode === this.OPERATING_MODES.READ_ONLY) {
            //enter normal mode from read-only
            this.setOperatingMode(this.OPERATING_MODES.DESIGN);
        }
    };

    /**************************** END OF --- READ-ONLY MODE HANDLERS ************************/


    /****************** PUBLIC FUNCTIONS ***********************************/

    //Called when the widget's container size changed
    DiagramDesignerWidget.prototype.onWidgetContainerResize = function (width, height) {
        this._containerSize.w = width;
        this._containerSize.h = height;

        //call our own resize handler
        this._resizeItemContainer();

        this._refreshTabTabsScrollOnResize();
    };

    DiagramDesignerWidget.prototype.destroy = function () {
        this.__loader.destroy();
        this._removeToolbarItems();
        this.connectionRouteManager.destroy();
        //TODO: what about item and connection destroys????
    };

    DiagramDesignerWidget.prototype._initializeUI = function () {

        this.logger.debug('DiagramDesignerWidget._initializeUI');

        //clear content
        this.$el.empty();

        //add own class
        this.$el.addClass(WIDGET_CLASS);

        this._attachScrollHandler(this.$el);

        //DESIGNER CANVAS HEADER
        this.skinParts = {};

        //TODO: $diagramDesignerWidgetBody --> this.$el;
        this.skinParts.$diagramDesignerWidgetBody = this.$el;

        //CHILDREN container
        this.skinParts.$itemsContainer = $('<div/>', {
            class: 'items'
        });
        this.skinParts.$diagramDesignerWidgetBody.append(this.skinParts.$itemsContainer);

        //jshint newcap:false
        //initialize Raphael paper from children container and set it to be full size of the HTML container
        this.skinParts.SVGPaper = Raphael(this.skinParts.$itemsContainer[0]);
        this.skinParts.SVGPaper.canvas.style.pointerEvents = 'visiblePainted';
        this.skinParts.SVGPaper.canvas.className.baseVal =
            DiagramDesignerWidgetConstants.CONNECTION_CONTAINER_SVG_CLASS;

        //finally resize the whole content according to available space
        this._containerSize.w = this.$el.width();
        this._containerSize.h = this.$el.height();
        this._resizeItemContainer();

        if (this._droppable === true) {
            this._initDroppable();
        }

        this.__loader = new LoaderCircles({containerElement: this.$el.parent()});

        if (this._tabsEnabled === true) {
            this._initializeTabs();
        }
    };

    DiagramDesignerWidget.prototype._createLineStyleMenuItem = function (width, color, pattern, startArrow,
                                                                         endArrow, type, label) {
        //jshint newcap:false
        var el = $('<div/>'),
            path,
            hSize = 50,
            vSize = 20,
            bbox,
            xLabel,
            paper = Raphael(el[0], hSize, vSize),
            bezierControlOffset = 10;


        width = width || 1;
        color = color || '#000000';
        pattern = pattern || DiagramDesignerWidgetConstants.LINE_PATTERNS.SOLID;
        startArrow = startArrow || DiagramDesignerWidgetConstants.LINE_ARROWS.NONE;
        endArrow = endArrow || DiagramDesignerWidgetConstants.LINE_ARROWS.NONE;
        type = (type || DiagramDesignerWidgetConstants.LINE_TYPES.NONE).toLowerCase();

        el.attr({style: 'height: ' + vSize + 'px; width: ' + hSize + 'px;'});

        if (type === DiagramDesignerWidgetConstants.LINE_TYPES.BEZIER) {
            path = paper.path('M 5,' + (Math.round(vSize / 2) + 0.5) + ' C' + (5 + bezierControlOffset) + ',' +
                (Math.round(vSize / 2) + 0.5 - bezierControlOffset * 2) + ' ' + (hSize - bezierControlOffset) + ',' +
                (Math.round(vSize / 2) + 0.5 + bezierControlOffset * 2) + ' ' + (hSize - 5) + ',' +
                (Math.round(vSize / 2) + 0.5));
        } else {
            path = paper.path('M 5,' + (Math.round(vSize / 2) + 0.5) + ' L' + (hSize - 5) + ',' +
                (Math.round(vSize / 2) + 0.5));
        }

        if (label) {
            bbox = path.getBBox();

            if (label === DiagramDesignerWidgetConstants.LINE_LABEL_PLACEMENTS.SRC) {
                xLabel = bbox.x + 2;
            } else if (label === DiagramDesignerWidgetConstants.LINE_LABEL_PLACEMENTS.DST) {
                xLabel = bbox.x + bbox.width - 2;
            } else {
                xLabel = bbox.x + bbox.width / 2;
            }

            paper.text(xLabel, bbox.y - 1.5, '$').attr({
                'font-size': 8,
                fill: color
            });
        }

        path.attr({
            'arrow-start': startArrow,
            'arrow-end': endArrow,
            stroke: color,
            'stroke-width': width,
            'stroke-dasharray': pattern
        });

        return el;
    };

    DiagramDesignerWidget.prototype._attachScrollHandler = function (el) {
        var self = this;

        el.on('scroll', function (/*event*/) {
            self._scrollPos.left = el.scrollLeft();
            self._scrollPos.top = el.scrollTop();
        });
    };

    DiagramDesignerWidget.prototype._resizeItemContainer = function () {
        var zoomedWidth = this._containerSize.w / this._zoomRatio,
            zoomedHeight = this._containerSize.h / this._zoomRatio,

            paddingLeft,
            paddingTop,

            offset;

        this.logger.debug('MinZoomedSize: ' + zoomedWidth + ', ' + zoomedHeight);

        this.logger.debug('this._actualSize: ' + this._actualSize.w + ', ' + this._actualSize.h);

        zoomedWidth = Math.max(zoomedWidth, this._actualSize.w);
        zoomedHeight = Math.max(zoomedHeight, this._actualSize.h);

        this.skinParts.$itemsContainer.css({
            width: zoomedWidth,
            height: zoomedHeight
        });

        this.skinParts.SVGPaper.setSize(zoomedWidth, zoomedHeight);
        this.skinParts.SVGPaper.setViewBox(0, 0, zoomedWidth, zoomedHeight, false);

        this._svgPaperSize = {
            w: zoomedWidth,
            h: zoomedHeight
        };

        this._centerBackgroundText();

        offset = this.skinParts.$diagramDesignerWidgetBody.offset();

        paddingTop = parseInt(this.skinParts.$diagramDesignerWidgetBody.css('padding-top').replace('px', ''));
        paddingLeft = parseInt(this.skinParts.$diagramDesignerWidgetBody.css('padding-left').replace('px', ''));

        offset.left += paddingLeft;
        offset.top += paddingTop;

        this._offset = offset;

    };

    DiagramDesignerWidget.prototype.getAdjustedMousePos = function (e) {
        var childrenContainerOffset = this._offset,
            childrenContainerScroll = this._scrollPos,
            pX = e.pageX - childrenContainerOffset.left + childrenContainerScroll.left,
            pY = e.pageY - childrenContainerOffset.top + childrenContainerScroll.top,
            position;

        pX /= this._zoomRatio;
        pY /= this._zoomRatio;

        position = {
            mX: pX > 0 ? pX : 0,
            mY: pY > 0 ? pY : 0
        };

        return position;
    };

    DiagramDesignerWidget.prototype.getAdjustedOffset = function (offset) {
        var childrenContainerOffset = this._offset,
            left = (offset.left - childrenContainerOffset.left) / this._zoomRatio + childrenContainerOffset.left,
            top = (offset.top - childrenContainerOffset.top) / this._zoomRatio + childrenContainerOffset.top;

        return {
            left: left,
            top: top
        };
    };

    DiagramDesignerWidget.prototype.posToPageXY = function (x, y) {
        var childrenContainerOffset = this._offset,
            childrenContainerScroll = this._scrollPos,
            pX = x * this._zoomRatio,
            pY = y * this._zoomRatio;

        pX += childrenContainerOffset.left - childrenContainerScroll.left;
        pY += childrenContainerOffset.top - childrenContainerScroll.top;

        return {
            x: pX > 0 ? pX : 0,
            y: pY > 0 ? pY : 0
        };
    };

    DiagramDesignerWidget.prototype.clear = function () {
        var i;

        this.setTitle('');

        this.selectionManager.setSelection([]);

        for (i in this.items) {
            if (this.items.hasOwnProperty(i)) {
                this.items[i].destroy();
            }
        }

        //initialize all the required collections with empty value
        this._initializeCollections();

        this._actualSize = {w: 0, h: 0};

        this._resizeItemContainer();

        this.dispatchEvent(this.events.ON_CLEAR);
    };

    DiagramDesignerWidget.prototype.deleteComponent = function (componentId) {
        //let the selection manager / drag-manager / connection drawing manager / etc know about the deletion
        this.dispatchEvent(this.events.ON_COMPONENT_DELETE, componentId);

        //finally delete the component
        if (this.itemIds.indexOf(componentId) !== -1) {
            this.deleteDesignerItem(componentId);
        } else if (this.connectionIds.indexOf(componentId) !== -1) {
            this.deleteConnection(componentId);
        }
    };

    /*********************************/

    DiagramDesignerWidget.prototype.beginUpdate = function () {
        this.logger.debug('beginUpdate');

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

    DiagramDesignerWidget.prototype.endUpdate = function () {
        this.logger.debug('endUpdate');

        this._updating = false;
        this._tryRefreshScreen();

        this.searchManager.applyLastSearch();
    };

    DiagramDesignerWidget.prototype._tryRefreshScreen = function () {
        var insertedLen = 0,
            updatedLen = 0,
            deletedLen = 0,
            msg = '';

        //check whether controller update finished or not
        if (this._updating !== true) {

            insertedLen += this._insertedDesignerItemIDs ? this._insertedDesignerItemIDs.length : 0;
            insertedLen += this._insertedConnectionIDs ? this._insertedConnectionIDs.length : 0;

            updatedLen += this._updatedDesignerItemIDs ? this._updatedDesignerItemIDs.length : 0;
            updatedLen += this._updatedConnectionIDs ? this._updatedConnectionIDs.length : 0;

            deletedLen += this._deletedDesignerItemIDs ? this._deletedDesignerItemIDs.length : 0;
            deletedLen += this._deletedConnectionIDs ? this._deletedConnectionIDs.length : 0;

            msg += 'I: ' + insertedLen;
            msg += ' U: ' + updatedLen;
            msg += ' D: ' + deletedLen;

            this.logger.debug(msg);
            if (DEBUG === true && this.toolbarItems && this.toolbarItems.progressText) {
                this.toolbarItems.progressText.text(msg, true);
            }

            this._refreshScreen();
        }
    };

    DiagramDesignerWidget.prototype._refreshScreen = function () {
        var i,
            connectionIDsToUpdate,
            maxWidth = 0,
            maxHeight = 0,
            itemBBox,
            redrawnConnectionIDs,
            doRenderGetLayout,
            doRenderSetLayout,
            items = this.items,
            affectedItems = [],
            dispatchEvents,
            self = this;

        this.logger.debug('_refreshScreen START');

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

        /*********** SEND CREATE / UPDATE EVENTS about created/updated items **********/
        dispatchEvents = function (itemIDList, eventType) {
            var i = itemIDList.length;

            while (i--) {
                self.dispatchEvent(eventType, itemIDList[i]);
            }
        };
        dispatchEvents(this._insertedDesignerItemIDs, this.events.ON_COMPONENT_CREATE);
        dispatchEvents(this._insertedConnectionIDs, this.events.ON_COMPONENT_CREATE);
        dispatchEvents(this._updatedDesignerItemIDs, this.events.ON_COMPONENT_UPDATE);
        dispatchEvents(this._updatedConnectionIDs, this.events.ON_COMPONENT_UPDATE);
        /*********************/


        /***************** THEN HANDLE THE CONNECTIONS *****************/

            //get all the connections that needs to be updated
            // - inserted connections
            // - updated connections
            // - connections that are affected because of
            //      - endpoint appearance
            //      - endpoint remove
            //      - endpoint updated
            //TODO: fix this, but right now we call refresh on all of the connections
        affectedItems = this._insertedDesignerItemIDs.concat(this._updatedDesignerItemIDs,
            this._deletedDesignerItemIDs);

        connectionIDsToUpdate = this._insertedConnectionIDs.concat(this._updatedConnectionIDs,
            this._getAssociatedConnectionsForItems(affectedItems));

        connectionIDsToUpdate = _.uniq(connectionIDsToUpdate).sort();

        this.logger.debug('Redraw connection request: ' + connectionIDsToUpdate.length + '/' +
            this.connectionIds.length);

        redrawnConnectionIDs = this._redrawConnections(connectionIDsToUpdate);

        this.logger.debug('Redrawn/Requested: ' + redrawnConnectionIDs.length + '/' + connectionIDsToUpdate.length);

        i = redrawnConnectionIDs.length;

        while (i--) {
            itemBBox = items[redrawnConnectionIDs[i]].getBoundingBox();
            maxWidth = Math.max(maxWidth, itemBBox.x2);
            maxHeight = Math.max(maxHeight, itemBBox.y2);
        }

        //adjust the canvas size to the new 'grown' are that the inserted / updated require
        //TODO: canvas size decrease not handled yet
        this._actualSize.w = Math.max(this._actualSize.w, maxWidth + CANVAS_EDGE);
        this._actualSize.h = Math.max(this._actualSize.h, maxHeight + CANVAS_EDGE);
        this._resizeItemContainer();

        //let the selection manager know about deleted items and connections
        /*i = this._deletedDesignerItemIDs.length;
         while (i--) {
         this.dispatchEvent(this.events.ON_COMPONENT_DELETE, this._deletedDesignerItemIDs[i]);
         }

         i = this._deletedConnectionIDs.length;
         while (i--) {
         this.dispatchEvent(this.events.ON_COMPONENT_DELETE, this._deletedConnectionIDs[i]);
         }*/

        /* clear collections */
        this._insertedDesignerItemIDs = [];
        this._updatedDesignerItemIDs = [];
        this._deletedDesignerItemIDs = [];

        this._insertedConnectionIDs = [];
        this._updatedConnectionIDs = [];
        this._deletedConnectionIDs = [];

        if (this.mode === this.OPERATING_MODES.DESIGN ||
            this.mode === this.OPERATING_MODES.READ_ONLY) {
            this.selectionManager.showSelectionOutline();
        }

        this.logger.debug('_refreshScreen END');
    };

    /*************** MODEL CREATE / UPDATE / DELETE ***********************/

    DiagramDesignerWidget.prototype._alignPositionToGrid = function (pX, pY) {
        var posXDelta,
            posYDelta;

        if (pX < this.gridSize) {
            pX = this.gridSize;
        }

        if (pY < this.gridSize) {
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

        return {
            x: pX,
            y: pY
        };
    };

    DiagramDesignerWidget.prototype._checkPositionOverlap = function (itemId, objDescriptor) {
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

    /************************** DRAG ITEM ***************************/
    DiagramDesignerWidget.prototype.onDesignerItemDragStart = function (draggedItemId, allDraggedItemIDs) {
        this.selectionManager.hideSelectionOutline();

        this._preDragActualSize = {
            w: this._actualSize.w,
            h: this._actualSize.h
        };

        var len = allDraggedItemIDs.length;
        while (len--) {
            this.items[allDraggedItemIDs[len]].hideSourceConnectors();
        }
    };

    DiagramDesignerWidget.prototype.onDesignerItemDrag = function (draggedItemId, allDraggedItemIDs) {
        var i = allDraggedItemIDs.length,
            connectionIDsToUpdate,
            redrawnConnectionIDs,
            maxWidth = 0,
            maxHeight = 0,
            itemBBox,
            items = this.items;

        //get the position and size of all dragged guy and temporarily resize canvas to fit them
        while (i--) {
            itemBBox = items[allDraggedItemIDs[i]].getBoundingBox();
            maxWidth = Math.max(maxWidth, itemBBox.x2);
            maxHeight = Math.max(maxHeight, itemBBox.y2);
        }

        this._actualSize.w = Math.max(this._preDragActualSize.w, maxWidth);
        this._actualSize.h = Math.max(this._preDragActualSize.h, maxHeight);

        this._resizeItemContainer();

        //refresh only the connections that are really needed
        connectionIDsToUpdate = this._getAssociatedConnectionsForItems(allDraggedItemIDs).sort();

        this.logger.debug('Redraw connection request: ' + connectionIDsToUpdate.length + '/' +
            this.connectionIds.length);

        redrawnConnectionIDs = this._redrawConnections(connectionIDsToUpdate) || [];

        this.logger.debug('Redrawn/Requested: ' + redrawnConnectionIDs.length + '/' + connectionIDsToUpdate.length);

        i = redrawnConnectionIDs.len;
    };

    DiagramDesignerWidget.prototype.onDesignerItemDragStop = function (/*draggedItemId, allDraggedItemIDs*/) {
        this.selectionManager.showSelectionOutline();

        delete this._preDragActualSize;
    };

    /************************** END - DRAG ITEM ***************************/

    /************************** SELECTION DELETE CLICK HANDLER ****************************/

    DiagramDesignerWidget.prototype._onSelectionCommandClicked = function (command, selectedIds, event) {
        switch (command) {
            case 'delete':
                this.onSelectionDelete(selectedIds);
                break;
            case 'contextmenu':
                this.onSelectionContextMenu(selectedIds, this.getAdjustedMousePos(event));
                break;
            case 'align':
                this.onSelectionAlignMenu(selectedIds, this.getAdjustedMousePos(event));
                break;
            case 'open':
                this.onDesignerItemDoubleClick(selectedIds[0]);
                break;
        }
    };

    DiagramDesignerWidget.prototype.onSelectionDelete = function (selectedIds) {
        this.logger.warn('DiagramDesignerWidget.onSelectionDelete IS NOT OVERRIDDEN IN A CONTROLLER. ID: "' +
            selectedIds + '"');
    };

    DiagramDesignerWidget.prototype.onSelectionContextMenu = function (selectedIds, mousePos) {
        this.logger.warn('DiagramDesignerWidget.onSelectionContextMenu IS NOT OVERRIDDEN IN A CONTROLLER. ID: "' +
            selectedIds + '", mousePos: ' + JSON.stringify(mousePos));
    };

    DiagramDesignerWidget.prototype.onSelectionAlignMenu = function (selectedIds, mousePos) {
        this.logger.warn('DiagramDesignerWidget.onSelectionAlignMenu IS NOT OVERRIDDEN IN A CONTROLLER. ID: "' +
            selectedIds + '", mousePos: ' + JSON.stringify(mousePos));
    };

    /************************** END - SELECTION DELETE CLICK HANDLER ****************************/

    /************************** ALIGN SHORT CUTS HANDLERS ****************************/
    DiagramDesignerWidget.prototype.onAlignSelection = function (selectedIds, type) {
        this.logger.warn('DiagramDesignerWidget.onAlignSelection IS NOT OVERRIDDEN IN A CONTROLLER. ID: "' +
            selectedIds + '", type: "' + type + '".');
    };

    /************************** END - ALIGN SHORT CUTS HANDLERS ****************************/

    /************************** SELECTION CHANGED HANDLER ****************************/

    DiagramDesignerWidget.prototype._onSelectionChanged = function (selectedIds) {
        //check if there is at least any connection selected
        //if so enable the connection visual style buttons, otherwise
        //disable it
        var len = selectedIds.length,
            connectionSelected = false;

        while (len--) {
            if (this.connectionIds.indexOf(selectedIds[len]) !== -1) {
                connectionSelected = true;
                break;
            }
        }

        if (this.toolbarItems && this.getIsReadOnlyMode() === false) {
            if (selectedIds.length > 0) {
                if (this.toolbarItems.cpFillColor) {
                    this.toolbarItems.cpFillColor.enabled(true);
                }
                if (this.toolbarItems.cpBorderColor) {
                    this.toolbarItems.cpBorderColor.enabled(!connectionSelected);
                }
                if (this.toolbarItems.cpTextColor) {
                    this.toolbarItems.cpTextColor.enabled(true);
                }
            } else {
                if (this.toolbarItems.cpFillColor) {
                    this.toolbarItems.cpFillColor.enabled(false);
                }
                if (this.toolbarItems.cpBorderColor) {
                    this.toolbarItems.cpBorderColor.enabled(false);
                }
                if (this.toolbarItems.cpTextColor) {
                    this.toolbarItems.cpTextColor.enabled(false);
                }
            }
        }

        this.onSelectionChanged(selectedIds);
    };

    DiagramDesignerWidget.prototype.onSelectionChanged = function (/*selectedIds*/) {
        this.logger.debug('DiagramDesignerWidget.onSelectionChanged IS NOT OVERRIDDEN IN A CONTROLLER...');
    };

    /************************** END OF - SELECTION CHANGED HANDLER ****************************/

    /********************** ITEM AUTO LAYOUT ****************************/

    DiagramDesignerWidget.prototype.itemAutoLayout = function (mode) {
        var i = this.itemIds.length,
            x = 40,
            y = 80,
            dx = 20,
            dy = 20,
            w,
            h = 0,
            newPositions = {};

        this.beginUpdate();

        switch (mode) {
            case 'diagonal':
                while (i--) {
                    w = this.items[this.itemIds[i]].getWidth();
                    h = Math.max(h, this.items[this.itemIds[i]].getHeight());
                    this.updateDesignerItem(this.itemIds[i], {position: {x: x, y: y}});
                    newPositions[this.itemIds[i]] = {
                        x: this.items[this.itemIds[i]].positionX,
                        y: this.items[this.itemIds[i]].positionY
                    };
                    x += w + dx;
                    y += h + dy;
                }
                break;
            //case 'cozygrid':
            //case 'grid':
            default:
                dx = 20;
                dy = 20;
                if (mode === 'cozygrid') {
                    dx = 100;
                    dy = 100;
                }
                while (i--) {
                    w = this.items[this.itemIds[i]].getWidth();
                    h = Math.max(h, this.items[this.itemIds[i]].getHeight());
                    this.updateDesignerItem(this.itemIds[i], {position: {x: x, y: y}});
                    newPositions[this.itemIds[i]] = {
                        x: this.items[this.itemIds[i]].positionX,
                        y: this.items[this.itemIds[i]].positionY
                    };
                    x += w + dx;
                    if (x >= 1000) {
                        x = 40;
                        y += h + dy;
                        h = 0;
                    }
                }
                break;
        }

        this.endUpdate();

        this.onDesignerItemsMove(newPositions);
    };

    /********************************************************************/

    /********* ROUTE MANAGER CHANGE **********************/

    DiagramDesignerWidget.prototype._onConnectionRouteManagerChanged = function (type) {
        if (this.connectionRouteManager) {
            this.connectionRouteManager.destroy();
        }

        switch (type) {
            case 'basic':
                this.connectionRouteManager = new ConnectionRouteManagerBasic({diagramDesigner: this});
                break;
            case 'basic2':
                this.connectionRouteManager = new ConnectionRouteManager2({diagramDesigner: this});
                break;
            case 'basic3':
                this.connectionRouteManager = new ConnectionRouteManager3({diagramDesigner: this});
                break;
            default:
                this.connectionRouteManager = new ConnectionRouteManagerBasic({diagramDesigner: this});
                break;
        }

        this.connectionRouteManager.initialize();

        this._redrawConnections(this.connectionIds.slice(0).sort() || []);

        this.selectionManager.showSelectionOutline();
    };

    /********* ROUTE MANAGER CHANGE **********************/

    /********** GET THE CONNECTIONS THAT GO IN / OUT OF ITEMS ********/

    DiagramDesignerWidget.prototype._getAssociatedConnectionsForItems = function (itemIdList) {
        var connList = [],
            len = itemIdList.length;

        while (len--) {
            connList = connList.concat(this._getConnectionsForItem(itemIdList[len]));
        }

        connList = _.uniq(connList);

        return connList;
    };

    DiagramDesignerWidget.prototype._getConnectionsForItem = function (itemId) {
        var connList = [],
            subCompId;

        //get all the item's connection and all its subcomponents' connections
        for (subCompId in this.connectionIDbyEndID[itemId]) {
            if (this.connectionIDbyEndID[itemId].hasOwnProperty(subCompId)) {
                connList = connList.concat(this.connectionIDbyEndID[itemId][subCompId]);
            }
        }

        connList = _.uniq(connList);

        return connList;
    };

    /***** END OF - GET THE CONNECTIONS THAT GO IN / OUT OF ITEMS ****/

    /**************** GET ITEMS FOR CONNECTION ******************************/
    DiagramDesignerWidget.prototype._getItemsForConnection = function (connectionId) {
        var items = [];

        if (this.connectionEndIDs[connectionId]) {
            items.push(this.connectionEndIDs[connectionId].srcObjId);
            items.push(this.connectionEndIDs[connectionId].dstObjId);
        }

        return items;
    };
    /**************** END OF --- GET ITEMS FOR CONNECTION ******************************/

    /************** WAITPROGRESS *********************/
    DiagramDesignerWidget.prototype.showProgressbar = function () {
        this.__loader.start();
    };

    DiagramDesignerWidget.prototype.hideProgressbar = function () {
        this.__loader.stop();
    };

    /************** END OF - WAITPROGRESS *********************/


    /*************       BACKGROUND TEXT      *****************/

    DiagramDesignerWidget.prototype.setBackgroundText = function (text, params) {
        var svgParams = {},
            setSvgAttrFromParams;

        if (!this._backGroundText) {
            if (!text) {
                this.logger.error('Invalid parameter "text" for method "setBackgroundText"');
            } else {
                this._backGroundText = this.skinParts.SVGPaper.text(this._svgPaperSize.w / 2, this._svgPaperSize.h / 2,
                    text);
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

    DiagramDesignerWidget.prototype._centerBackgroundText = function () {
        if (this._backGroundText) {
            this._backGroundText.attr({
                x: this._svgPaperSize.w / 2,
                y: this._svgPaperSize.h / 2
            });
        }
    };

    /*************   END OF - BACKGROUND TEXT      *****************/

    DiagramDesignerWidget.prototype.setTitle = function () {
        //no place for title in the widget
        //but could be overriden in the host component
    };

    /************** API REGARDING TO MANAGERS ***********************/

    DiagramDesignerWidget.prototype.enableDragCopy = function (/*enabled*/) {
        //this.dragManager.enableMode( this.dragManager.DRAGMODE_COPY, enabled);
    };

    DiagramDesignerWidget.prototype.enableRotate = function (enabled) {
        this.selectionManager.enableRotation(enabled);
    };

    DiagramDesignerWidget.prototype.enableAlign = function (enabled) {
        this.selectionManager.enableAlign(enabled);
    };

    DiagramDesignerWidget.prototype.enableOpenButton = function (enabled) {
        this.selectionManager.enableOpenButton(enabled);
    };

    /*************** SELECTION API ******************************************/

    DiagramDesignerWidget.prototype.selectAll = function () {
        this.selectionManager.setSelection(this.itemIds.concat(this.connectionIds), false);
    };

    DiagramDesignerWidget.prototype.selectNone = function () {
        this.selectionManager.clear();
    };

    DiagramDesignerWidget.prototype.selectInvert = function () {
        var invertList = _.difference(this.itemIds.concat(this.connectionIds),
            this.selectionManager.getSelectedElements());

        this.selectionManager.setSelection(invertList, false);
    };

    DiagramDesignerWidget.prototype.selectItems = function () {
        this.selectionManager.setSelection(this.itemIds, false);
    };

    DiagramDesignerWidget.prototype.selectConnections = function () {
        this.selectionManager.setSelection(this.connectionIds, false);
    };

    DiagramDesignerWidget.prototype.select = function (selectionList) {
        this.selectionManager.setSelection(selectionList, false);
    };

    /*************** END OF --- SELECTION API ******************************************/


    /************ COPY PASTE API **********************/

    DiagramDesignerWidget.prototype.onClipboardCopy = function (selectedIds) {
        this.logger.warn('DiagramDesignerWidget.prototype.onClipboardCopy not overridden in controller!!!' +
            'selectedIds: "' + selectedIds + '"');
    };

    DiagramDesignerWidget.prototype.onClipboardPaste = function () {
        this.logger.warn('DiagramDesignerWidget.prototype.onClipboardPaste not overridden in controller!!!');
    };

    /************ END OF --- COPY PASTE API **********************/

    /************************* CONNECTION SEGMENT POINTS CHANGE ************************/
    DiagramDesignerWidget.prototype.onConnectionSegmentPointsChange = function (params) {
        this.logger.warn('DiagramDesignerWidget.prototype.onConnectionSegmentPointsChange not overridden in ' +
            'controller. params: ' + JSON.stringify(params));
    };
    /************************* END OF --- CONNECTION SEGMENT POINTS CHANGE ************************/

    DiagramDesignerWidget.prototype.setOperatingMode = function (mode) {
        if (this.mode !== mode) {
            this.highlightManager.deactivate();
            this.selectionManager.deactivate();
            //this.dragManager.deactivate();
            this.connectionDrawingManager.deactivate();
            this.searchManager.deactivate();
            this._setComponentsReadOnly(true);
            this._addTabsButtonEnabled(false);
            this._destroyTabsSortable();
            switch (mode) {
                case DiagramDesignerWidgetOperatingModes.prototype.OPERATING_MODES.READ_ONLY:
                    this.mode = this.OPERATING_MODES.READ_ONLY;
                    this.selectionManager.activate();
                    this.searchManager.activate();
                    break;
                case DiagramDesignerWidgetOperatingModes.prototype.OPERATING_MODES.DESIGN:
                    this.mode = this.OPERATING_MODES.DESIGN;
                    this.selectionManager.activate();
                    //this.dragManager.activate();
                    this.connectionDrawingManager.activate();
                    this.searchManager.activate();
                    this._setComponentsReadOnly(false);
                    this._addTabsButtonEnabled(true);
                    this._makeTabsSortable();
                    break;
                case DiagramDesignerWidgetOperatingModes.prototype.OPERATING_MODES.HIGHLIGHT:
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

    DiagramDesignerWidget.prototype._setComponentsReadOnly = function (readOnly) {
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

        this._redrawConnections(this.connectionIds.slice(0).sort() || []);

        i = this.connectionIds.length;
        while (i--) {
            this.items[this.connectionIds[i]].readOnlyMode(readOnly);
        }
    };

    /************************* DESIGNER ITEM DRAGGABLE & COPYABLE CHECK ON DRAG START ************************/
    DiagramDesignerWidget.prototype.onDragStartDesignerItemDraggable = function (itemID) {
        this.logger.warn('DiagramDesignerWidget.prototype.onDesignerItemDraggable not overridden in controller. ' +
            'itemID: ' + itemID);

        return true;
    };


    DiagramDesignerWidget.prototype.onDragStartDesignerItemCopyable = function (itemID) {
        this.logger.warn('DiagramDesignerWidget.prototype.onDragStartDesignerItemCopyable not overridden in ' +
            'controller. itemID: ' + itemID);

        return true;
    };


    DiagramDesignerWidget.prototype.onDragStartDesignerConnectionCopyable = function (connectionID) {
        this.logger.warn('DiagramDesignerWidget.prototype.onDragStartDesignerConnectionCopyable not overridden in ' +
            'controller. connectionID: ' + connectionID);

        return true;
    };
    /************************ END OF --- DESIGNER ITEM DRAGGABLE & COPYABLE CHECK ON DRAG START **********************/

    /************************* HIGHLIGHTED / UNHIGHLIGHTED EVENT *****************************/
    DiagramDesignerWidget.prototype.onHighlight = function (idList) {
        this.logger.warn('DiagramDesignerWidget.prototype.onHighlight not overridden in controller. idList: ' + idList);
    };

    DiagramDesignerWidget.prototype.onUnhighlight = function (idList) {
        this.logger.warn('DiagramDesignerWidget.prototype.onUnhighlight not overridden in controller. idList: ' +
            idList);
    };
    /************************* HIGHLIGHTED / UNHIGHLIGHTED EVENT *****************************/


    DiagramDesignerWidget.prototype.onSelectionRotated = function (deg, selectedIds) {
        this.logger.warn('DiagramDesignerWidget.prototype.onSelectionRotated IS NOT OVERRIDDEN IN CONTROLLER. deg: "' +
            deg + '", selectedIds: ' + selectedIds);
    };

    /*********************** CONNECTION TEXT CHANGED HANDLERS **************************/

    DiagramDesignerWidget.prototype.onConnectionNameChanged = function (connId, oldValue, newValue) {
        this.logger.warn('DiagramDesignerWidget.prototype.onConnectionNameChanged IS NOT OVERRIDDEN IN CONTROLLER.' +
            ' connId: "' + connId + '", oldValue: "' + oldValue + '", newValue: "' + newValue + '"');
    };

    DiagramDesignerWidget.prototype.onConnectionSrcTextChanged = function (connId, oldValue, newValue) {
        this.logger.warn('DiagramDesignerWidget.prototype.onConnectionSrcTextChanged IS NOT OVERRIDDEN IN CONTROLLER.' +
            'connId: "' + connId + '", oldValue: "' + oldValue + '", newValue: "' + newValue + '"');
    };

    DiagramDesignerWidget.prototype.onConnectionDstTextChanged = function (connId, oldValue, newValue) {
        this.logger.warn('DiagramDesignerWidget.prototype.onConnectionDstTextChanged IS NOT OVERRIDDEN IN ' +
            'CONTROLLER. ' + 'connId: "' + connId + '", oldValue: "' + oldValue + '", newValue: "' + newValue + '"');
    };

    /*********************** END OF CONNECTION TEXT CHANGED HANDLERS **************************/

    /*********************** CONNECT TO CONNECTION ENABLE / DISABLE *****************************/
    DiagramDesignerWidget.prototype.connectToConnectionEnabled = function (enabled) {
        this._connectToConnection = enabled;
    };
    /*********************** END OF --- CONNECT TO CONNECTION ENABLE / DISABLE *****************************/


    /*********************** CONNECTION CROSSING JUMP ENABLE / DISABLE *****************************/
    DiagramDesignerWidget.prototype._setConnectionXingJumpMode = function (enabled) {
        if (this._connectionJumpXing !== enabled) {
            this._connectionJumpXing = enabled;

            this._redrawConnections(this.connectionIds.slice(0).sort() || []);
        }
    };
    /*********************** END OF --- CONNECTION CROSSING JUMP ENABLE / DISABLE *****************************/


    /*********************** SET CONNECTION VISUAL PROPERTIES *****************************/
    DiagramDesignerWidget.prototype._setConnectionProperty = function (params) {
        var selectedIds = this.selectionManager.getSelectedElements();

        if (selectedIds.length > 0) {
            this.onSetConnectionProperty({
                items: selectedIds,
                params: params
            });
        }
    };

    DiagramDesignerWidget.prototype.onSetConnectionProperty = function (params) {
        this.logger.warn('DiagramDesignerWidget.prototype.onSetConnectionProperty IS NOT OVERRIDDEN IN CONTROLLER.' +
            'params: ' + JSON.stringify(params));
    };
    /*********************** ENBD OF --- SET CONNECTION VISUAL PROPERTIES *****************************/

    DiagramDesignerWidget.prototype._triggerUIActivity = function () {
        this.onUIActivity();
    };

    DiagramDesignerWidget.prototype.onUIActivity = function () {
        this.logger.warn('DiagramDesignerWidget.prototype.onUIActivity IS NOT OVERRIDDEN...');
    };

    DiagramDesignerWidget.prototype._redrawConnections = function (connIDs) {
        var res;
        /*var startTime;
         var endTime;*/
        try {
            //startTime = new Date();
            res = this.connectionRouteManager.redrawConnections(connIDs) || [];
            //endTime = new Date();
            //this.logger.debug('_redrawConnections: ' + (endTime - startTime));
        } catch (exp) {
            res = [];
            this.logger.error('connectionRouteManager.redrawConnections failed with error: ' + exp.stack);
        }
        return res;
    };

    DiagramDesignerWidget.prototype.onActivate = function () {
        this._displayToolbarItems();
    };

    DiagramDesignerWidget.prototype.onDeactivate = function () {
        this._hideToolbarItems();
    };

    DiagramDesignerWidget.prototype.onSelectionFillColorChanged = function (selectedElements, color) {
        this.logger.warn('DiagramDesignerWidget.prototype.onSelectionFillColorChanged(selectedElements, color) ' +
            'IS NOT OVERRIDDEN IN CONTROLLER. color: ' + color);
    };

    DiagramDesignerWidget.prototype.onSelectionBorderColorChanged = function (selectedElements, color) {
        this.logger.warn('DiagramDesignerWidget.prototype.onSelectionBorderColorChanged(selectedElements, color) ' +
            'IS NOT OVERRIDDEN IN CONTROLLER. color: ' + color);
    };

    DiagramDesignerWidget.prototype.onSelectionTextColorChanged = function (selectedElements, color) {
        this.logger.warn('DiagramDesignerWidget.prototype.onSelectionTextColorChanged(selectedElements, color) ' +
            'IS NOT OVERRIDDEN IN CONTROLLER. color: ' + color);
    };

    /************** END OF - API REGARDING TO MANAGERS ***********************/

        //additional code pieces for DiagramDesignerWidget
    _.extend(DiagramDesignerWidget.prototype, DiagramDesignerWidgetOperatingModes.prototype);
    _.extend(DiagramDesignerWidget.prototype, DiagramDesignerWidgetDesignerItems.prototype);
    _.extend(DiagramDesignerWidget.prototype, DiagramDesignerWidgetConnections.prototype);
    _.extend(DiagramDesignerWidget.prototype, DiagramDesignerWidgetSubcomponents.prototype);
    _.extend(DiagramDesignerWidget.prototype, DiagramDesignerWidgetEventDispatcher.prototype);
    _.extend(DiagramDesignerWidget.prototype, DiagramDesignerWidgetZoom.prototype);
    _.extend(DiagramDesignerWidget.prototype, DiagramDesignerWidgetKeyboard.prototype);
    _.extend(DiagramDesignerWidget.prototype, DiagramDesignerWidgetContextMenu.prototype);
    _.extend(DiagramDesignerWidget.prototype, DiagramDesignerWidgetDroppable.prototype);
    _.extend(DiagramDesignerWidget.prototype, DiagramDesignerWidgetClipboard.prototype);
    _.extend(DiagramDesignerWidget.prototype, DiagramDesignerWidgetDraggable.prototype);
    _.extend(DiagramDesignerWidget.prototype, DiagramDesignerWidgetToolbar.prototype);
    _.extend(DiagramDesignerWidget.prototype, DiagramDesignerWidgetMouse.prototype);
    _.extend(DiagramDesignerWidget.prototype, DiagramDesignerWidgetTabs.prototype);

    DiagramDesignerWidget.getDefaultConfig = function () {
        return {
           zoomValues: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.2, 1.4, 1.6, 1.8, 2.0, 2.5, 3.0, 3.5, 4.0]
        };
    };

    DiagramDesignerWidget.getComponentId = function () {
        return 'GenericUIDiagramDesignerWidget';
    };

    return DiagramDesignerWidget;
});
