/*globals define,_*/
/*
 * @author brollb / https://github/brollb
 */
define(['js/Decorators/WidgetDecoratorBase',
        './SnapEditorWidget.Constants'], function (WidgetDecoratorBase,
                                                   SnapEditorWidgetConstants) {

    "use strict";

    var SnapEditorWidgetDecoratorBase,
        DECORATOR_ID = "SnapEditorWidgetDecoratorBase";

    SnapEditorWidgetDecoratorBase = function (params) {
        WidgetDecoratorBase.call(this, params);

        this.hostDesignerItem = params.host;

        this.skinParts = {};

        this._initialize();

        this.logger.debug("Created");
    };

    _.extend(SnapEditorWidgetDecoratorBase.prototype, WidgetDecoratorBase.prototype);

    SnapEditorWidgetDecoratorBase.prototype.DECORATORID = DECORATOR_ID;

    SnapEditorWidgetDecoratorBase.prototype.setControl = function (control) {
        this._control = control;
    };

    SnapEditorWidgetDecoratorBase.prototype.getControl = function () {
        return this._control;
    };

    SnapEditorWidgetDecoratorBase.prototype.setMetaInfo = function (params) {
        this._metaInfo = params;
    };

    SnapEditorWidgetDecoratorBase.prototype.getMetaInfo = function () {
        return this._metaInfo;
    };

    //NOTE - CAN BE OVERRIDDEN TO SPECIFY CUSTOM TEMPLATE FOR THE DECORATOR
    SnapEditorWidgetDecoratorBase.prototype.$DOMBase = $("");

    //initialization code for the decorator
    //this.$el will be created as the top-level container for the decorator's DOM
    //this.$el will be used later in the DesignerItem's code, it must exist
    //NOTE - SHOULD NOT BE OVERRIDDEN
    SnapEditorWidgetDecoratorBase.prototype._initialize = function () {
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
    SnapEditorWidgetDecoratorBase.prototype.on_addTo = function () {
    };

    //All DOM queries that causes reflow (position / width / height / etc) should be done here
    //Use helper object 'this.renderLayoutInfo' to store info needed
    //NOTE - But DO NOT SET ANY SUCH SETTING HERE, THAT SHOULD HAPPEN IN 'onRenderGetLayoutInfo'
    //NOTE - DO NOT TOUCH THE DOM FOR WRITE
    //NOTE - CAN BE OVERRIDDEN WHEN NEEDED
    //NOTE - More info on this: http://www.phpied.com/rendering-repaint-reflowrelayout-restyle/
    SnapEditorWidgetDecoratorBase.prototype.onRenderGetLayoutInfo = function () {
        this.calculateDimension();

        this.renderLayoutInfo = {};
    };

    //Do anything needs to be done to adjust look, write all width, height, position, etc infomration
    //Use values stored in helper object 'this.renderLayoutInfo'
    //NOTE - But DO NOT READ ANY SUCH INFORMATION, DO NOT TOUCH THE DOM FOR READ
    //NOTE - CAN BE OVERRIDDEN WHEN NEEDED
    SnapEditorWidgetDecoratorBase.prototype.onRenderSetLayoutInfo = function () {
        delete this.renderLayoutInfo;
    };

    //Override to set the
    // - 'this.hostDesignerItem._width' and
    // - 'this.hostDesignerItem._height' attributes with the correct dimensions of this decorator
    //The dimension information is used for many different reasons in the canvas (line routing, etc...),
    //Please set it correctly
    //NOTE - SHALL BE OVERRIDDEN
    SnapEditorWidgetDecoratorBase.prototype.calculateDimension = function () {
        if (this.hostDesignerItem) {
            this.hostDesignerItem.setSize(this.$el.outerWidth(true), this.$el.outerHeight(true));
        }
    };

    //NOTE - SHALL BE OVERRIDDEN WHEN NEEDED
    SnapEditorWidgetDecoratorBase.prototype.getLinkableAreas = function (id) {
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
    SnapEditorWidgetDecoratorBase.prototype.destroy = function () {
        this.logger.debug("SnapEditorWidgetDecoratorBase.destroyed");
    };

    /******************** EVENT HANDLERS ************************/

    //called when the mouse enters the DesignerItem's main container
    //return TRUE if decorator code handled the event
    //when returned FALSE, DesignerItem's event handler will be executed
    SnapEditorWidgetDecoratorBase.prototype.onMouseEnter = function (event) {
        return false;
    };

    //called when the mouse leaves the DesignerItem's main container
    //return TRUE if decorator code handled the event
    //when returned FALSE, DesignerItem's event handler will be executed
    SnapEditorWidgetDecoratorBase.prototype.onMouseLeave = function (event) {
        return false;
    };

    //called when the mouse leaves the DesignerItem's receives mousedown
    //return TRUE if decorator code handled the event
    //when returned FALSE, DesignerItem's event handler will be executed
    SnapEditorWidgetDecoratorBase.prototype.onMouseDown = function (event) {
        return false;
    };

    //called when the mouse leaves the DesignerItem's receives mouseup
    //return TRUE if decorator code handled the event
    //when returned FALSE, DesignerItem's event handler will be executed
    SnapEditorWidgetDecoratorBase.prototype.onMouseUp = function (event) {
        return false;
    };

    //called when the designer items becomes selected
    //return TRUE if decorator code handled the event
    //when returned FALSE, DesignerItem's event handler will be executed
    SnapEditorWidgetDecoratorBase.prototype.onSelect = function () {
        return false;
    };

    //called when the designer items becomes deselected
    //return TRUE if decorator code handled the event
    //when returned FALSE, DesignerItem's event handler will be executed
    SnapEditorWidgetDecoratorBase.prototype.onDeselect = function () {
        return false;
    };

    //called when double click happens on the DesignerItem
    //return TRUE if decorator code handled the event
    //when returned FALSE, DesignerItem's event handler will be executed
    SnapEditorWidgetDecoratorBase.prototype.onDoubleClick = function (event) {
        return false;
    };

    /******************** END OF - EVENT HANDLERS ************************/



    /************* ADDITIONAL METHODS ***************************/
    //called when the designer item should be updated
    SnapEditorWidgetDecoratorBase.prototype.update = function () {
    };

    //called when the designer item's subcomponent should be updated
    SnapEditorWidgetDecoratorBase.prototype.updateSubcomponent = function (subComponentId) {
    };

    SnapEditorWidgetDecoratorBase.prototype.readOnlyMode = function (readOnlyMode) {
    };

    //Search support for SnapEditorWidget
    //return true if this item matches the search criteria described in searchDesc
    //otherwise return false
    SnapEditorWidgetDecoratorBase.prototype.doSearch = function (searchDesc) {
        return false;
    };

    //called by the controller and the decorator can specify the territory rule for itself
    //must return an object of id - rule pairs, like
    //{'id': {'children': 0, ...}}
    SnapEditorWidgetDecoratorBase.prototype.getTerritoryQuery = function () {
        return undefined;
    };

    //called by the controller when an event arrives about registered component ID
    SnapEditorWidgetDecoratorBase.prototype.notifyComponentEvent = function (componentList) {
        this.logger.warning('notifyComponentEvent not overridden in decorator' + JSON.stringify(componentList));
    };

    //                            Input Fields
    
    SnapEditorWidgetDecoratorBase.prototype.getInputFieldUpdates = function () {
        this.logger.warning('getInputFieldUpdates not overridden in decorator');
        return {};
    };

    SnapEditorWidgetDecoratorBase.prototype.updateInputFields = function () {
        this.logger.warning('updateInputFields not overridden in decorator');
    };

    //                            Attribute Info
    SnapEditorWidgetDecoratorBase.prototype.updateAttributeContent = function () {
        this.logger.warning('updateAttributeContent not overridden in decorator');
    };

    SnapEditorWidgetDecoratorBase.prototype.updateAttributeText = function () {
        this.logger.warning('updateAttributeText not overridden in decorator');
    };

    //                            Stretching/Shifting
    SnapEditorWidgetDecoratorBase.prototype.stretchTo = function () {
        this.logger.warning('stretchTo not overridden in decorator');
    };

    SnapEditorWidgetDecoratorBase.prototype.updateShifts = function () {
        this.logger.warning('updateShifts not overridden in decorator');
    };


    return SnapEditorWidgetDecoratorBase;
});
