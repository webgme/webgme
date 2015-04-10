/*globals define,_*/
/*
 * @author brollb / https://github/brollb
 */
define(['js/Decorators/WidgetDecoratorBase',
        './BlockEditorWidget.Constants'], function (WidgetDecoratorBase,
                                                   BlockEditorWidgetConstants) {

    "use strict";

    var BlockEditorWidgetDecoratorBase,
        DECORATOR_ID = "BlockEditorWidgetDecoratorBase";

    BlockEditorWidgetDecoratorBase = function (params) {
        WidgetDecoratorBase.call(this, params);

        this.hostDesignerItem = params.host;

        this.skinParts = {};

        this._initialize();

        this.logger.debug("Created");
    };

    _.extend(BlockEditorWidgetDecoratorBase.prototype, WidgetDecoratorBase.prototype);

    BlockEditorWidgetDecoratorBase.prototype.DECORATORID = DECORATOR_ID;

    BlockEditorWidgetDecoratorBase.prototype.setControl = function (control) {
        this._control = control;
    };

    BlockEditorWidgetDecoratorBase.prototype.getControl = function () {
        return this._control;
    };

    BlockEditorWidgetDecoratorBase.prototype.setMetaInfo = function (params) {
        this._metaInfo = params;
    };

    BlockEditorWidgetDecoratorBase.prototype.getMetaInfo = function () {
        return this._metaInfo;
    };

    //NOTE - CAN BE OVERRIDDEN TO SPECIFY CUSTOM TEMPLATE FOR THE DECORATOR
    BlockEditorWidgetDecoratorBase.prototype.$DOMBase = $("");

    //initialization code for the decorator
    //this.$el will be created as the top-level container for the decorator's DOM
    //this.$el will be used later in the DesignerItem's code, it must exist
    //NOTE - SHOULD NOT BE OVERRIDDEN
    BlockEditorWidgetDecoratorBase.prototype._initialize = function () {
        this.$el = this.$DOMBase.clone();

        //extra default initializations
        //this.initializeConnectors();

        //this._initializeConnectionAreaUserSelection();
    };

    //Called before the host designer item is added to the canvas DOM (DocumentFragment more precisely)
    //At this point the decorator should create its DOM representation
    //At this point no dimension information is available since the content exist only in memory, not yet rendered
    //NOTE - DO NOT ACCESS ANY LAYOUT OR DIMENSION INFORMATION FOR PERFORMANCE REASONS
    //NOTE - ALL LAYOUT INFORMATION SHOULD BE QUERIED IN onRenderGetLayoutInfo
    //NOTE - SHALL BE OVERRIDDEN WHEN NEEDED
    BlockEditorWidgetDecoratorBase.prototype.on_addTo = function () {
    };

    //All DOM queries that causes reflow (position / width / height / etc) should be done here
    //Use helper object 'this.renderLayoutInfo' to store info needed
    //NOTE - But DO NOT SET ANY SUCH SETTING HERE, THAT SHOULD HAPPEN IN 'onRenderGetLayoutInfo'
    //NOTE - DO NOT TOUCH THE DOM FOR WRITE
    //NOTE - CAN BE OVERRIDDEN WHEN NEEDED
    //NOTE - More info on this: http://www.phpied.com/rendering-repaint-reflowrelayout-restyle/
    BlockEditorWidgetDecoratorBase.prototype.onRenderGetLayoutInfo = function () {
        this.calculateDimension();

        this.renderLayoutInfo = {};
    };

    //Do anything needs to be done to adjust look, write all width, height, position, etc infomration
    //Use values stored in helper object 'this.renderLayoutInfo'
    //NOTE - But DO NOT READ ANY SUCH INFORMATION, DO NOT TOUCH THE DOM FOR READ
    //NOTE - CAN BE OVERRIDDEN WHEN NEEDED
    BlockEditorWidgetDecoratorBase.prototype.onRenderSetLayoutInfo = function () {
        delete this.renderLayoutInfo;
    };

    //Override to set the
    // - 'this.hostDesignerItem._width' and
    // - 'this.hostDesignerItem._height' attributes with the correct dimensions of this decorator
    //The dimension information is used for many different reasons in the canvas (line routing, etc...),
    //Please set it correctly
    //NOTE - SHALL BE OVERRIDDEN
    BlockEditorWidgetDecoratorBase.prototype.calculateDimension = function () {
        if (this.hostDesignerItem) {
            this.hostDesignerItem.setSize(this.$el.outerWidth(true), this.$el.outerHeight(true));
        }
    };

    //NOTE - SHALL BE OVERRIDDEN WHEN NEEDED
    BlockEditorWidgetDecoratorBase.prototype.getLinkableAreas = function (id) {
        var result = [];

        //by default return the center point of the item
        //TODO Determine a better way to represent this...
        //Only allow one "Click" per region
        result.push( {"id": "0",
            "x1": this.hostDesignerItem.getWidth() / 2,
            "y1": this.hostDesignerItem.getHeight() / 2,
            "x2": this.hostDesignerItem.getWidth() / 2,
            "y2": this.hostDesignerItem.getHeight() / 2} );

        return result;
    };

    //Called when the decorator of the DesignerItem needs to be destroyed
    //There is no need to touch the DOM, it will be taken care of in the DesignerItem's code
    //Remove any additional business logic, free up resources, territory, etc...
    //NOTE - CAN BE OVERRIDDEN WHEN NEEDED
    BlockEditorWidgetDecoratorBase.prototype.destroy = function () {
        this.logger.debug("BlockEditorWidgetDecoratorBase.destroyed");
    };

    /******************** EVENT HANDLERS ************************/

    //called when the mouse enters the DesignerItem's main container
    //return TRUE if decorator code handled the event
    //when returned FALSE, DesignerItem's event handler will be executed
    BlockEditorWidgetDecoratorBase.prototype.onMouseEnter = function (event) {
        return false;
    };

    //called when the mouse leaves the DesignerItem's main container
    //return TRUE if decorator code handled the event
    //when returned FALSE, DesignerItem's event handler will be executed
    BlockEditorWidgetDecoratorBase.prototype.onMouseLeave = function (event) {
        return false;
    };

    //called when the mouse leaves the DesignerItem's receives mousedown
    //return TRUE if decorator code handled the event
    //when returned FALSE, DesignerItem's event handler will be executed
    BlockEditorWidgetDecoratorBase.prototype.onMouseDown = function (event) {
        return false;
    };

    //called when the mouse leaves the DesignerItem's receives mouseup
    //return TRUE if decorator code handled the event
    //when returned FALSE, DesignerItem's event handler will be executed
    BlockEditorWidgetDecoratorBase.prototype.onMouseUp = function (event) {
        return false;
    };

    //called when the designer items becomes selected
    //return TRUE if decorator code handled the event
    //when returned FALSE, DesignerItem's event handler will be executed
    BlockEditorWidgetDecoratorBase.prototype.onSelect = function () {
        return false;
    };

    //called when the designer items becomes deselected
    //return TRUE if decorator code handled the event
    //when returned FALSE, DesignerItem's event handler will be executed
    BlockEditorWidgetDecoratorBase.prototype.onDeselect = function () {
        return false;
    };

    //called when double click happens on the DesignerItem
    //return TRUE if decorator code handled the event
    //when returned FALSE, DesignerItem's event handler will be executed
    BlockEditorWidgetDecoratorBase.prototype.onDoubleClick = function (event) {
        return false;
    };

    /******************** END OF - EVENT HANDLERS ************************/



    /************* ADDITIONAL METHODS ***************************/
    //called when the designer item should be updated
    BlockEditorWidgetDecoratorBase.prototype.update = function () {
    };

    //called when the designer item's subcomponent should be updated
    BlockEditorWidgetDecoratorBase.prototype.updateSubcomponent = function (subComponentId) {
    };

    BlockEditorWidgetDecoratorBase.prototype.readOnlyMode = function (readOnlyMode) {
    };

    //Search support for BlockEditorWidget
    //return true if this item matches the search criteria described in searchDesc
    //otherwise return false
    BlockEditorWidgetDecoratorBase.prototype.doSearch = function (searchDesc) {
        return false;
    };

    //called by the controller and the decorator can specify the territory rule for itself
    //must return an object of id - rule pairs, like
    //{'id': {'children': 0, ...}}
    BlockEditorWidgetDecoratorBase.prototype.getTerritoryQuery = function () {
        return undefined;
    };

    //called by the controller when an event arrives about registered component ID
    BlockEditorWidgetDecoratorBase.prototype.notifyComponentEvent = function (componentList) {
        this.logger.warn('notifyComponentEvent not overridden in decorator' + JSON.stringify(componentList));
    };

    //                            Input Fields
    
    BlockEditorWidgetDecoratorBase.prototype.getInputFieldUpdates = function () {
        this.logger.warn('getInputFieldUpdates not overridden in decorator');
        return {};
    };

    BlockEditorWidgetDecoratorBase.prototype.updateInputFields = function () {
        this.logger.warn('updateInputFields not overridden in decorator');
    };

    //                            Attribute Info
    BlockEditorWidgetDecoratorBase.prototype.updateAttributeContent = function () {
        this.logger.warn('updateAttributeContent not overridden in decorator');
    };

    BlockEditorWidgetDecoratorBase.prototype.updateAttributeText = function () {
        this.logger.warn('updateAttributeText not overridden in decorator');
    };

    //                            Stretching/Shifting
    BlockEditorWidgetDecoratorBase.prototype.stretchTo = function () {
        this.logger.warn('stretchTo not overridden in decorator');
    };

    BlockEditorWidgetDecoratorBase.prototype.updateShifts = function () {
        this.logger.warn('updateShifts not overridden in decorator');
    };


    return BlockEditorWidgetDecoratorBase;
});
