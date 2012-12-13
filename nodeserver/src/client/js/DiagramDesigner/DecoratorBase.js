"use strict";

define(['logManager'], function (logManager) {

    var DecoratorBase,
        CONNECTOR_CLASS = ".connector";

    DecoratorBase = function (options) {
        this.id = options.id;
        this.hostDesignerItem = options.designerItem;

        this.skinParts = {};

        this.$connectors = null;

        this.logger = options.logger || logManager.create((options.loggerName || "DecoratorBase") + '_' + this.id);
        this.logger.debug("Created");
    };

    DecoratorBase.prototype.$_DOMBase = $("");

    //Called before the host designer item is added to the canvas DOM
    DecoratorBase.prototype.on_addTo = function () {
    };

    //Called right after on_addTo and before the host designer item is added to the canvas DOM
    DecoratorBase.prototype.on_render = function () {
        this.$el = this.$_DOMBase.clone();
        this.$hostEl = this.hostDesignerItem.$el;

        //find connectors
        this.$connectors = this.$el.find(CONNECTOR_CLASS);
        this.hideConnectors();
    };

    //Called after the host designer item is added to the canvas DOM and rendered
    DecoratorBase.prototype.on_afterAdded = function () {
        this.calculateDimension();
    };

    DecoratorBase.prototype.calculateDimension = function () {
        this.hostDesignerItem.width = this.$el.outerWidth(true);
        this.hostDesignerItem.height = this.$el.outerHeight(true);
    };

    //in the destroy there is no need to touch the UI, it will be cleared out
    DecoratorBase.prototype.destroy = function () {
        this.logger.debug("Destroyed");
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
    };

    DecoratorBase.prototype.renderComplete = function () {
        //calculate new dimension after update

        //TODO: this will cause performance issues because of REFLOW
        //TODO: calculateDimension should be called when all the DesignerItems have finished updating/rendering
        //TODO: that way it would not cause extra REFLOWs
        this.calculateDimension();

        //TODO:let the hostDesignerItem know about decorator render finished
    };

    return DecoratorBase;
});