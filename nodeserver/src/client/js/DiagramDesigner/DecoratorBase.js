"use strict";

define(['logManager'], function (logManager) {

    var DecoratorBase,
        CONNECTOR_CLASS = ".connector";

    DecoratorBase = function (options) {
        this.id = options.id;
        this.hostDesignerItem = options.designerItem;

        this.logger = options.logger || logManager.create((options.loggerName || "DecoratorBase") + '_' + this.id);

        this.skinParts = {};
        this.$connectors = null;

        this._initialize();

        this.logger.debug("Created");
    };

    //TODO - CAN BE OVERRIDDEN TO SPECIFY CUSTOM TEMPLATE FOR THE DECORATOR
    DecoratorBase.prototype.$DOMBase = $("");

    //initialization code for the decorator
    //this.$el will be created as the top-level container for the decorator's DOM
    //this.$el will be used later in the DesignerItem's code, it must exist
    //TODO - SHOULD NOT BE OVERRIDDEN
    DecoratorBase.prototype._initialize = function () {
        this.$el = this.$DOMBase.clone();

        //extra default initializations
        this.initializeConnectors();
    };

    //as a common default functionality, DecoratorBase provides solution for taking care of the connectors
    //DecoratorBase will handle DOM elements with class CONNECTOR_CLASS as connectors
    //these will be queried and detached from the decorator's DOM by default
    //TODO - CAN BE OVERRIDDEN WHEN NEEDED
    DecoratorBase.prototype.initializeConnectors = function () {
        //find connectors
        this.$connectors = this.$el.find(CONNECTOR_CLASS);
        this.hideConnectors();
    };

    //Shows the 'connectors' - appends them to the DOM
    DecoratorBase.prototype.showConnectors = function () {
        this.$connectors.appendTo(this.$el);
    };

    //Hides the 'connectors' - detaches them from the DOM
    DecoratorBase.prototype.hideConnectors = function () {
        this.$connectors.detach();
    };

    //Called before the host designer item is added to the canvas DOM (DocumentFragment more precisely)
    //At this point the decorator should create its DOM representation
    //At this point no dimension information is available since the content exist only in memory, not yet rendered
    //TODO - NOTE - DO NOT ACCESS ANY LAYOUT OR DIMENSION INFORMATION FOR PERFORMANCE REASONS
    //TODO - NOTE - ALL LAYOUT INFORMATION SHOULD BE QUERIED IN ON_RENDERGETLAYOUTINFO
    //TODO - SHALL BE OVERRIDDEN WHEN NEEDED
    DecoratorBase.prototype.on_addTo = function () {
    };

    //All DOM queries that causes reflow (position / width / height / etc) should be done here
    //Use helper object 'this.renderLayoutInfo' to store info needed
    //TODO - NOTE - But DO NOT SET ANY SUCH SETTING HERE, THAT SHOULD HAPPEN IN 'ON_RENDERGETLAYOUTINFO'
    //TODO - NOTE - DO NOT TOUCH THE DOM FOR WRITE
    //TODO - CAN BE OVERRIDDEN WHEN NEEDED
    //NOTE - More info on this: http://www.phpied.com/rendering-repaint-reflowrelayout-restyle/
    DecoratorBase.prototype.on_renderGetLayoutInfo = function () {
        this.calculateDimension();

        this.renderLayoutInfo = {};
    };

    //Do anything needs to be done to adjust look, write all width, height, position, etc infomration
    //Use values stored in helper object 'this.renderLayoutInfo'
    //TODO - NOTE - But DO NOT READ ANY SUCH INFORMATION, DO NOT TOUCH THE DOM FOR READ
    //TODO - CAN BE OVERRIDDEN WHEN NEEDED
    DecoratorBase.prototype.on_renderSetLayoutInfo = function () {
        delete this.renderLayoutInfo;
    };

    //Override to set the
    // - 'this.hostDesignerItem.width' and
    // - 'this.hostDesignerItem.height' attributes with the correct dimensions of this decorator
    //The dimension information is used for many different reasons in the canvas (line routing, etc...),
    //Please set it correctly
    //TODO - SHALL BE OVERRIDDEN
    DecoratorBase.prototype.calculateDimension = function () {
    };

    //Should return the connection areas for the component with the given 'id'
    //Canvas will draw the connection to / from this coordinate
    //'id' might be the id of this DesignerItem itself, or the
    //'id' can be the ID of one of the SubComponents contained in this component
    //result should be an array of the area descriptors
    //TODO - SHALL BE OVERRIDDEN WHEN NEEDED
    DecoratorBase.prototype.getConnectionAreas = function (id) {
        var result = [];

        //by default return the center point of the item
        //canvas will draw the connection to / from this coordinate
        result.push( {"id": "0",
            "x": this.hostDesignerItem.width / 2,
            "y": this.hostDesignerItem.height / 2,
            "w": 0,
            "h": 0,
            "orientation": "N"} );

        return result;
    };

    //Called when the decorator of the DesignerItem needs to be destroyed
    //There is no need to touch the DOM, it will be taken care of in the DesignerItem's code
    //Remove any additional business logic, free up resources, territory, etc...
    //TODO - CAN BE OVERRIDDEN WHEN NEEDED
    DecoratorBase.prototype.destroy = function () {
        this.logger.debug("DecoratorBase.destroyed");
    };

    /******************** EVENT HANDLERS ************************/

    //called when the mouse enters the DesignerItem's main container
    //TODO: figure out if return TRUE / FALSE really needed and used for anything
    //TODO: can be used to signal that decorator handled the event, DesignerItem does not need to
    DecoratorBase.prototype.onMouseEnter = function (event) {
        return true;
    };

    //called when the mouse leaves the DesignerItem's main container
    //TODO: figure out if return TRUE / FALSE really needed and used for anything
    //TODO: can be used to signal that decorator handled the event, DesignerItem does not need to
    DecoratorBase.prototype.onMouseLeave = function (event) {
        return true;
    };

    //called when the mouse leaves the DesignerItem's receives mousedown
    //TODO: figure out if return TRUE / FALSE really needed and used for anything
    //TODO: can be used to signal that decorator handled the event, DesignerItem does not need to
    DecoratorBase.prototype.onMouseDown = function (event) {
        return true;
    };

    //called when the mouse leaves the DesignerItem's receives mouseup
    //TODO: figure out if return TRUE / FALSE really needed and used for anything
    //TODO: can be used to signal that decorator handled the event, DesignerItem does not need to
    DecoratorBase.prototype.onMouseUp = function (event) {
        return true;
    };

    //called when the designer items becomes selected
    //TODO: figure out if return TRUE / FALSE really needed and used for anything
    //TODO: can be used to signal that decorator handled the event, DesignerItem does not need to
    DecoratorBase.prototype.onSelect = function () {
        return true;
    };

    //called when the designer items becomes deselected
    //TODO: figure out if return TRUE / FALSE really needed and used for anything
    //TODO: can be used to signal that decorator handled the event, DesignerItem does not need to
    DecoratorBase.prototype.onDeselect = function () {
        return true;
    };

    /******************** END OF - EVENT HANDLERS ************************/



    /************* ADDITIONAL METHODS ***************************/
    //called when the designer items becomes deselected
    DecoratorBase.prototype.update = function (objDescriptor) {
    };



    return DecoratorBase;
});