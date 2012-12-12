"use strict";

define(['logManager',
    'clientUtil',
    'text!js/DiagramDesigner/DefaultDecoratorTemplate.html',
    'css!DiagramDesignerCSS/DefaultDecorator'], function (logManager,
                                                       util,
                                                       defaultDecoratorTemplate) {

    var DefaultDecorator;

    DefaultDecorator = function (objectDescriptor) {
        this.id = objectDescriptor.id;
        this.hostDesignerItem = objectDescriptor.designerItem;
        this.name = objectDescriptor.name || "";

        this.skinParts = {};

        this.connectors = null;

        this.logger = logManager.create("DefaultDecorator_" + this.id);
        this.logger.debug("Created");
    };

    //Called before the host designer item is added to the canvas DOM
    DefaultDecorator.prototype.on_addTo = function () {

    };

    //Called right after on_addTo and before the host designer item is added to the canvas DOM
    DefaultDecorator.prototype.on_render = function () {
        this.$el = this._DOMBase.clone();
        this.$hostEl = this.hostDesignerItem.$el;

        //find components
        this.skinParts.name = this.$el.find(".name");
        this.skinParts.name.text(this.name);

        this.connectors = this.$el.find(".connector");
        this.connectors.hide();
    };

    //Called after the host designer item is added to the canvas DOM and rendered
    DefaultDecorator.prototype.on_afterAdded = function () {

    };

    DefaultDecorator.prototype._DOMBase = $(defaultDecoratorTemplate);

    //in the destroy there is no need to touch the UI, it will be cleared out
    DefaultDecorator.prototype.destroy = function () {
        this.logger.debug("Destroyed");
    };

    DefaultDecorator.prototype.onMouseEnter = function (event) {
        this.logger.debug("DefaultDecorator_onMouseEnter: " + this.id);

        this.showConnectors();

        return true;
    };

    DefaultDecorator.prototype.onMouseLeave = function (event) {
        this.logger.debug("DefaultDecorator_onMouseLeave: " + this.id);

        this.hideConnectors();

        return true;
    };

    DefaultDecorator.prototype.showConnectors = function () {
        this.connectors.show();
    };

    DefaultDecorator.prototype.hideConnectors = function () {
        this.connectors.hide();
    };



    return DefaultDecorator;
});