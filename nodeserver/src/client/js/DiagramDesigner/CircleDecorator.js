"use strict";

define(['logManager',
    'clientUtil',
    'js/DiagramDesigner/DefaultDecorator',
    'text!js/DiagramDesigner/CircleDecoratorTemplate.html',
    'css!DiagramDesignerCSS/CircleDecorator'], function (logManager,
                                                          util,
                                                          DefaultDecorator,
                                                          circleDecoratorTemplate) {

    var CircleDecorator,
        __parent__ = DefaultDecorator,
        __parent_proto__ = DefaultDecorator.prototype,
        CANVAS_SIZE = 40;

    CircleDecorator = function (options) {
        var opts = _.extend( {}, options);

        opts.loggerName = opts.loggerName || "CircleDecorator";

        __parent__.apply(this, [opts]);

        this.logger.debug("CircleDecorator ctor");
    };

    _.extend(CircleDecorator.prototype, __parent_proto__);

    /*********************** OVERRIDE DECORATORBASE MEMBERS **************************/

    CircleDecorator.prototype._DOMBase = $(circleDecoratorTemplate);

    //Called right after on_addTo and before the host designer item is added to the canvas DOM
    CircleDecorator.prototype.on_render = function () {
        //let the parent decorator class do its job first
        __parent_proto__.on_render.apply(this, arguments);

        //find additional CircleDecorator specific UI components
        this.skinParts.$arrowCanvas = this.$el.find('[id="circleCanvas"]');
        this.skinParts.$arrowCanvas[0].height = CANVAS_SIZE;
        this.skinParts.$arrowCanvas[0].width = CANVAS_SIZE;
        var ctx = this.skinParts.$arrowCanvas[0].getContext('2d');
        if(ctx) {
            ctx.circle(20,20,19, true);
        }
    };

    //Called after the host designer item is added to the canvas DOM and rendered
    CircleDecorator.prototype.on_afterAdded = function () {
        var nameWidth = this.skinParts.$name.outerWidth(),
            shift = (40 - nameWidth) / 2;

        this.skinParts.$name.css({"top": 45,
                                   "left": shift });
    };

    return CircleDecorator;
});