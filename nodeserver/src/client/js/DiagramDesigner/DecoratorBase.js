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

    DecoratorBase.prototype.$_DOMBase = $("");

    DecoratorBase.prototype._initialize = function () {
        this.$el = this.$_DOMBase.clone();

        //find connectors
        this.$connectors = this.$el.find(CONNECTOR_CLASS);
        this.hideConnectors();
    };

    //Called before the host designer item is added to the canvas DOM
    //TODO: here you should create the basic DOM of the decorator
    //this.$el has to be the toplevel container of the decorator, because it will be appended to a documentFragment later
    //at this point no dimension information is available since the content exist only in memory, not yet rendred
    DecoratorBase.prototype.on_addTo = function () {
        //this.hostDesignerItem.decoratorUpdated();
        return true;
    };

    //do anything needs to be done to adjust look, read all width, height, etc information
    //but do not set anything, do not touch the UI for write
    DecoratorBase.prototype.on_renderPhase1 = function () {
        this.calculateDimension();

        this.renderPhase1Cache = {};
    };

    //using the information from the _onrenderPhase1
    //do anything needs to be done to adjust look, write all width, height, etc information
    //but do not read anything, do not touch the UI for read
    DecoratorBase.prototype.on_renderPhase2 = function () {
        delete this.renderPhase1Cache;
    };

    //override to calculate and set the 'this.hostDesignerItem.width'
    //and 'this.hostDesignerItem.height' attributes with the dimensions of this decorator
    //the dimension information is used for so many different reasons in the canvas, so please set it correctly
    DecoratorBase.prototype.calculateDimension = function () {
    };

    //in the destroy there is no need to touch the UI, it will be cleared out
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

    /******************** END OF - EVENT HANDLERS ************************/

    /************* ADDITIONAL METHODS ***************************/

    //set the 'connectors' DISPLAY property to TRUE
    DecoratorBase.prototype.showConnectors = function () {
        this.$connectors.appendTo(this.$el);
    };

    //set the 'connectors' DISPLAY property to FALSE
    DecoratorBase.prototype.hideConnectors = function () {
        this.$connectors.detach();
    };

    //called when the designer items becomes selected
    DecoratorBase.prototype.onSelect = function () {
    };

    //called when the designer items becomes deselected
    DecoratorBase.prototype.onDeselect = function () {
    };

    //called when the designer items becomes deselected
    DecoratorBase.prototype.update = function (objDescriptor) {
        this.hostDesignerItem.decoratorUpdated();
    };

    return DecoratorBase;
});