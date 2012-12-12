"use strict";

define(['logManager',
    'clientUtil',
    'text!js/DiagramDesigner/CircleDecoratorTemplate.html',
    'css!DiagramDesignerCSS/CircleDecorator'], function (logManager,
                                                          util,
                                                          circleDecoratorTemplate) {

    var CircleDecorator,
        CANVAS_SIZE = 40;

    CircleDecorator = function (objectDescriptor) {
        this.id = objectDescriptor.id;
        this.hostDesignerItem = objectDescriptor.designerItem;
        this.name = objectDescriptor.name || "";

        this.skinParts = {};

        this.logger = logManager.create("CircleDecorator_" + this.id);
        this.logger.debug("Created");

    };

    //Called before the host designer item is added to the canvas DOM
    CircleDecorator.prototype.on_addTo = function () {

    };

    //Called right after on_addTo and before the host designer item is added to the canvas DOM
    CircleDecorator.prototype.on_render = function () {
        this.$el = this._DOMBase.clone();
        this.$hostEl = this.hostDesignerItem.$el;

        //find components
        this.skinParts.$name = this.$el.find(".name");
        this.skinParts.$name.text(this.name);

        this.skinParts.$arrowCanvas = this.$el.find('[id="circleCanvas"]');
        this.skinParts.$arrowCanvas[0].height = CANVAS_SIZE;
        this.skinParts.$arrowCanvas[0].width = CANVAS_SIZE;
        var ctx = this.skinParts.$arrowCanvas[0].getContext('2d');
        if(ctx) {
            ctx.circle(20,20,19, true);
        }

        this.connectors = this.$el.find(".connector");
        this.connectors.hide();
    };

    //Called after the host designer item is added to the canvas DOM and rendered
    CircleDecorator.prototype.on_afterAdded = function () {
        var nameWidth = this.skinParts.$name.outerWidth(),
            shift = (40 - nameWidth) / 2;

        this.skinParts.$name.css({"top": 45,
                                   "left": shift });
    };

    CircleDecorator.prototype._DOMBase = $(circleDecoratorTemplate);

    //in the destroy there is no need to touch the UI, it will be cleared out
    //release the territory, release everything needs to be released and return
    CircleDecorator.prototype.destroy = function () {
        this.logger.debug("Destroyed");
    };

    CircleDecorator.prototype.onMouseEnter = function (event) {
        this.logger.debug("CircleDecorator_onMouseEnter: " + this.id);

        this.showConnectors();

        return true;
    };

    CircleDecorator.prototype.onMouseLeave = function (event) {
        this.logger.debug("CircleDecorator_onMouseLeave: " + this.id);

        this.hideConnectors();

        return true;
    };

    CircleDecorator.prototype.showConnectors = function () {
        this.connectors.show();
    };

    CircleDecorator.prototype.hideConnectors = function () {
        this.connectors.hide();
    };

    return CircleDecorator;
});