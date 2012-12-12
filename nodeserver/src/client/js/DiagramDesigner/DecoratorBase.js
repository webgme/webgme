"use strict";

define(['logManager'], function (logManager) {

    var DecoratorBase;

    DecoratorBase = function (options) {
        this.id = options.id;
        this.hostDesignerItem = options.designerItem;
        this.name = options.name || "";

        this.skinParts = {};

        this.connectors = null;

        this.logger = options.logger || logManager.create((options.loggerName || "DecoratorBase") + '_' + this.id);
        this.logger.debug("Created");
    };

    DecoratorBase.prototype._DOMBase = $("");

    //Called before the host designer item is added to the canvas DOM
    DecoratorBase.prototype.on_addTo = function () {

    };

    //Called right after on_addTo and before the host designer item is added to the canvas DOM
    DecoratorBase.prototype.on_render = function () {
        this.$el = this._DOMBase.clone();
        this.$hostEl = this.hostDesignerItem.$el;

        //find connectors
        this.connectors = this.$el.find(".connector");
        this.connectors.hide();
    };

    //Called after the host designer item is added to the canvas DOM and rendered
    DecoratorBase.prototype.on_afterAdded = function () {

    };

    //in the destroy there is no need to touch the UI, it will be cleared out
    DecoratorBase.prototype.destroy = function () {
        this.logger.debug("Destroyed");
    };

    //called when the mouse enters the DesignerItem's main container
    //TODO: figure out if return TRUE / FALSE really needed and used for anything
    //TODO: can be used to signal that decorator handled the event, DesignerItem does not need to
    DecoratorBase.prototype.onMouseEnter = function (event) {
        this.logger.debug("DecoratorBase_onMouseEnter");

        this.showConnectors();

        return true;
    };

    //called when the mouse leaves the DesignerItem's main container
    //TODO: figure out if return TRUE / FALSE really needed and used for anything
    //TODO: can be used to signal that decorator handled the event, DesignerItem does not need to
    DecoratorBase.prototype.onMouseLeave = function (event) {
        this.logger.debug("DecoratorBase_onMouseLeave");

        this.hideConnectors();

        return true;
    };

    //set the 'connectors' DISPLAY property to TRUE
    DecoratorBase.prototype.showConnectors = function () {
        this.connectors.show();
    };

    //set the 'connectors' DISPLAY property to FALSE
    DecoratorBase.prototype.hideConnectors = function () {
        this.connectors.hide();
    };

    return DecoratorBase;
});