/*globals define, $, _*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/Decorators/WidgetDecoratorBase',
    './DiagramDesignerWidget.Constants',
    './DiagramDesignerWidget.DecoratorBase.ConnectionArea'
], function (WidgetDecoratorBase,
             DiagramDesignerWidgetConstants,
             DiagramDesignerWidgetDecoratorBaseConnectionArea) {

    'use strict';

    var DiagramDesignerWidgetDecoratorBase,
        DECORATOR_ID = 'DiagramDesignerWidgetDecoratorBase';

    DiagramDesignerWidgetDecoratorBase = function (params) {
        WidgetDecoratorBase.call(this, params);

        this.hostDesignerItem = params.host;

        this.skinParts = {};
        this.$sourceConnectors = null;
        this.$endConnectors = null;

        this._initialize();

        this.logger.debug('Created');
    };

    _.extend(DiagramDesignerWidgetDecoratorBase.prototype, WidgetDecoratorBase.prototype);
    _.extend(DiagramDesignerWidgetDecoratorBase.prototype, DiagramDesignerWidgetDecoratorBaseConnectionArea.prototype);

    DiagramDesignerWidgetDecoratorBase.prototype.DECORATORID = DECORATOR_ID;

    DiagramDesignerWidgetDecoratorBase.prototype.setControl = function (control) {
        this._control = control;
    };

    DiagramDesignerWidgetDecoratorBase.prototype.getControl = function () {
        return this._control;
    };

    DiagramDesignerWidgetDecoratorBase.prototype.setMetaInfo = function (params) {
        this._metaInfo = params;
    };

    DiagramDesignerWidgetDecoratorBase.prototype.getMetaInfo = function () {
        return this._metaInfo;
    };

    //NOTE - CAN BE OVERRIDDEN TO SPECIFY CUSTOM TEMPLATE FOR THE DECORATOR
    DiagramDesignerWidgetDecoratorBase.prototype.$DOMBase = $('');

    //initialization code for the decorator
    //this.$el will be created as the top-level container for the decorator's DOM
    //this.$el will be used later in the DesignerItem's code, it must exist
    //NOTE - SHOULD NOT BE OVERRIDDEN
    DiagramDesignerWidgetDecoratorBase.prototype._initialize = function () {
        this.$el = this.$DOMBase.clone();

        //extra default initializations
        this.initializeConnectors();

        this._initializeConnectionAreaUserSelection();
    };

    // As a common default functionality, DiagramDesignerWidgetDecoratorBase provides solution
    // for taking care of the connectors.
    // DiagramDesignerWidgetDecoratorBase will handle DOM elements with class CONNECTOR_CLASS as connectors
    // these will be queried and detached from the decorator's DOM by default.
    // NODE - CAN BE OVERRIDDEN WHEN NEEDED
    DiagramDesignerWidgetDecoratorBase.prototype.initializeConnectors = function () {
        //find connectors
        this.$sourceConnectors = this.$el.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS);
        this.$endConnectors = this.$sourceConnectors;

        if (this.hostDesignerItem) {
            this.hostDesignerItem.registerConnectors(this.$sourceConnectors);
        } else {
            this.logger.error('Decorator\'s hostDesignerItem is not set');
        }

        this.hideSourceConnectors();
    };

    // Shows the 'connectors' - appends them to the DOM.
    // Called when a connection drawing starts from a source point and the decorator is notified.
    // to highlight the connectors for its subcomponents with the given IDs.
    // params:
    //  - srcItemMetaInfo: metaInfo of the connection source's host item
    //  - srcSubCompMetaInfo: metaInfo of the connection source's subcomponent (if present)
    //  - connectors: the IDs of the connectors the decorator should highlight
    //            these IDs were defined by the decorator itself
    //            NOTE: if the value is undefined, the connectors for the host item should be highlighted
    //                  if the value is not undefined, the connector for the corresponding subcomponent
    //                  should be highlighted
    DiagramDesignerWidgetDecoratorBase.prototype.showSourceConnectors = function (params) {
        this.logger.debug('showSourceConnectors: ' + JSON.stringify(params));
        this.$sourceConnectors.appendTo(this.$el);
    };

    //Hides the 'connectors' - detaches them from the DOM
    DiagramDesignerWidgetDecoratorBase.prototype.hideSourceConnectors = function () {
        this.$sourceConnectors.detach();
    };

    //Called when a connection drawing starts from a source point and the decorator is notified
    //to highlight the connectors for its subcomponents with the given IDs
    //params:
    //  - srcItemMetaInfo: metaInfo of the connection source's host item
    //  - srcSubCompMetaInfo: metaInfo of the connection source's subcomponent (if present)
    //  - connectors: the IDs of the connectors the decorator should highlight
    //            these IDs were defined by the decorator itself
    //            NOTE: if the value is undefined, the connectors for the host item should be highlighted
    //                  if the value is not undefined, the connector for the corresponding
    //                  subcomponent should be highlighted.
    DiagramDesignerWidgetDecoratorBase.prototype.showEndConnectors = function (params) {
        this.logger.debug('showEndConnectors: ' + JSON.stringify(params));
        this.$endConnectors.appendTo(this.$el);
    };

    //Hides the 'connectors' - detaches them from the DOM
    DiagramDesignerWidgetDecoratorBase.prototype.hideEndConnectors = function () {
        this.$endConnectors.detach();
    };

    //jshint camelcase: false
    //Called before the host designer item is added to the canvas DOM (DocumentFragment more precisely)
    //At this point the decorator should create its DOM representation
    //At this point no dimension information is available since the content exist only in memory, not yet rendered
    //NOTE - DO NOT ACCESS ANY LAYOUT OR DIMENSION INFORMATION FOR PERFORMANCE REASONS
    //NOTE - ALL LAYOUT INFORMATION SHOULD BE QUERIED IN onRenderGetLayoutInfo
    //NOTE - SHALL BE OVERRIDDEN WHEN NEEDED
    DiagramDesignerWidgetDecoratorBase.prototype.on_addTo = function () {
    };
    //jshint camelcase: true

    //All DOM queries that causes reflow (position / width / height / etc) should be done here
    //Use helper object 'this.renderLayoutInfo' to store info needed
    //NOTE - But DO NOT SET ANY SUCH SETTING HERE, THAT SHOULD HAPPEN IN 'onRenderGetLayoutInfo'
    //NOTE - DO NOT TOUCH THE DOM FOR WRITE
    //NOTE - CAN BE OVERRIDDEN WHEN NEEDED
    //NOTE - More info on this: http://www.phpied.com/rendering-repaint-reflowrelayout-restyle/
    DiagramDesignerWidgetDecoratorBase.prototype.onRenderGetLayoutInfo = function () {
        this.calculateDimension();

        this.renderLayoutInfo = {};
    };

    //Do anything needs to be done to adjust look, write all width, height, position, etc infomration
    //Use values stored in helper object 'this.renderLayoutInfo'
    //NOTE - But DO NOT READ ANY SUCH INFORMATION, DO NOT TOUCH THE DOM FOR READ
    //NOTE - CAN BE OVERRIDDEN WHEN NEEDED
    DiagramDesignerWidgetDecoratorBase.prototype.onRenderSetLayoutInfo = function () {
        delete this.renderLayoutInfo;
    };

    //Override to set the
    // - 'this.hostDesignerItem._width' and
    // - 'this.hostDesignerItem._height' attributes with the correct dimensions of this decorator
    //The dimension information is used for many different reasons in the canvas (line routing, etc...),
    //Please set it correctly
    //NOTE - SHALL BE OVERRIDDEN
    DiagramDesignerWidgetDecoratorBase.prototype.calculateDimension = function () {
        if (this.hostDesignerItem) {
            this.hostDesignerItem.setSize(this.$el.outerWidth(true), this.$el.outerHeight(true));
        }
    };

    //Should return the connection areas for the component with the given 'id'
    //Canvas will draw the connection to / from this coordinate
    //'id' might be the id of this DesignerItem itself (or undefined), or the
    //'id' can be the ID of one of the SubComponents contained in this component
    //isEnd if true, this is the destination end of the connection
    //isEnd if false, this is the source end of the connection
    //connectionMetaInfo object is the metaInfo of the connection component (if any)
    //result should be an array of the area descriptors
    //NOTE - SHALL BE OVERRIDDEN WHEN NEEDED
    DiagramDesignerWidgetDecoratorBase.prototype.getConnectionAreas = function (/*id, isEnd, connectionMetaInfo*/) {
        var result = [];

        //by default return the center point of the item
        //canvas will draw the connection to / from this coordinate
        result.push({
            id: '0',
            x1: this.hostDesignerItem.getWidth() / 2,
            y1: this.hostDesignerItem.getHeight() / 2,
            x2: this.hostDesignerItem.getWidth() / 2,
            y2: this.hostDesignerItem.getHeight() / 2,
            angle1: 270,
            angle2: 270,
            len: 10
        });

        return result;
    };

    //Called when the decorator of the DesignerItem needs to be destroyed
    //There is no need to touch the DOM, it will be taken care of in the DesignerItem's code
    //Remove any additional business logic, free up resources, territory, etc...
    //NOTE - CAN BE OVERRIDDEN WHEN NEEDED
    DiagramDesignerWidgetDecoratorBase.prototype.destroy = function () {
        this.logger.debug('DiagramDesignerWidgetDecoratorBase.destroyed');
    };

    /******************** EVENT HANDLERS ************************/

        //called when the mouse enters the DesignerItem's main container
        //return TRUE if decorator code handled the event
        //when returned FALSE, DesignerItem's event handler will be executed
    DiagramDesignerWidgetDecoratorBase.prototype.onMouseEnter = function (/*event*/) {
        return false;
    };

    //called when the mouse leaves the DesignerItem's main container
    //return TRUE if decorator code handled the event
    //when returned FALSE, DesignerItem's event handler will be executed
    DiagramDesignerWidgetDecoratorBase.prototype.onMouseLeave = function (/*event*/) {
        return false;
    };

    //called when the mouse leaves the DesignerItem's receives mousedown
    //return TRUE if decorator code handled the event
    //when returned FALSE, DesignerItem's event handler will be executed
    DiagramDesignerWidgetDecoratorBase.prototype.onMouseDown = function (/*event*/) {
        return false;
    };

    //called when the mouse leaves the DesignerItem's receives mouseup
    //return TRUE if decorator code handled the event
    //when returned FALSE, DesignerItem's event handler will be executed
    DiagramDesignerWidgetDecoratorBase.prototype.onMouseUp = function (/*event*/) {
        return false;
    };

    //called when the designer items becomes selected
    //return TRUE if decorator code handled the event
    //when returned FALSE, DesignerItem's event handler will be executed
    DiagramDesignerWidgetDecoratorBase.prototype.onSelect = function () {
        return false;
    };

    //called when the designer items becomes deselected
    //return TRUE if decorator code handled the event
    //when returned FALSE, DesignerItem's event handler will be executed
    DiagramDesignerWidgetDecoratorBase.prototype.onDeselect = function () {
        return false;
    };

    //called when double click happens on the DesignerItem
    //return TRUE if decorator code handled the event
    //when returned FALSE, DesignerItem's event handler will be executed
    DiagramDesignerWidgetDecoratorBase.prototype.onDoubleClick = function (/*event*/) {
        return false;
    };

    /******************** END OF - EVENT HANDLERS ************************/


    /************* ADDITIONAL METHODS ***************************/
        //called when the designer item should be updated
    DiagramDesignerWidgetDecoratorBase.prototype.update = function () {
    };

    //called when the designer item's subcomponent should be updated
    DiagramDesignerWidgetDecoratorBase.prototype.updateSubcomponent = function (/*subComponentId*/) {
    };

    DiagramDesignerWidgetDecoratorBase.prototype.readOnlyMode = function (/*readOnlyMode*/) {
    };

    //Called when connection is being drawn from this item's or one of its subcomponents' connector
    //need to return an object that will be passed to other decorators along with showEndConnector() so
    //other decorators will be able to decide what connectors to display as 'endpoint' for the connection being drawn
    //same applies for reconnection an endpoint of an existing connection
    //paramters:
    //  - id: if undefined, need to return the metainfo descriptor for the decorated object
    //  -     if has a value, need to return the metainfo of the subcomponent with the given id
    DiagramDesignerWidgetDecoratorBase.prototype.getConnectorMetaInfo = function (/*id*/) {
        return undefined;
    };

    //Search support for DiagramDesignerWidget
    //return true if this item matches the search criteria described in searchDesc
    //otherwise return false
    DiagramDesignerWidgetDecoratorBase.prototype.doSearch = function (/*searchDesc*/) {
        return false;
    };

    //Called when a connection drawing starts from this item (or one of it's subcomponent)
    //can return visual properties for the connection being drawn
    //{'width': 2,
    // 'color': '#FF0000',
    // 'start-arrow': 'diamond',
    // 'end-arrow': 'block',
    // 'pattern': '.'}
    // for more information see DiagramDesignerWidget.Constants.js
    DiagramDesignerWidgetDecoratorBase.prototype.getDrawnConnectionVisualStyle = function (/*subComponentId*/) {
        return null;
    };


    //called by the controller and the decorator can specify the territory rule for itself
    //must return an object of id - rule pairs, like
    //{'id': {'children': 0, ...}}
    DiagramDesignerWidgetDecoratorBase.prototype.getTerritoryQuery = function () {
        return undefined;
    };

    //called by the controller when an event arrives about registered component ID
    DiagramDesignerWidgetDecoratorBase.prototype.notifyComponentEvent = function (componentList) {
        this.logger.warn('notifyComponentEvent not overridden in decorator' + JSON.stringify(componentList));
    };

    return DiagramDesignerWidgetDecoratorBase;
});
