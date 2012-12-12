"use strict";

define(['logManager',
    'clientUtil',
    'js/DiagramDesigner/DecoratorBase',
    'text!js/DiagramDesigner/DefaultDecoratorTemplate.html',
    'css!DiagramDesignerCSS/DefaultDecorator'], function (logManager,
                                                       util,
                                                       DecoratorBase,
                                                       defaultDecoratorTemplate) {

    var DefaultDecorator,
        __parent__ = DecoratorBase,
        __parent_proto__ = DecoratorBase.prototype;

    DefaultDecorator = function (options) {

        var opts = _.extend( {}, options);

        opts.loggerName = opts.loggerName || "DefaultDecorator";

        __parent__.apply(this, [opts]);

        this.logger.debug("DefaultDecorator ctor");
    };

    _.extend(DefaultDecorator.prototype, __parent_proto__);

    /*********************** OVERRIDE DECORATORBASE MEMBERS **************************/

    DefaultDecorator.prototype._DOMBase = $(defaultDecoratorTemplate);

    DefaultDecorator.prototype.on_render = function () {
        __parent_proto__.on_render.apply(this, arguments);

        //find additional components
        this.skinParts.$name = this.$el.find(".name");
        this.skinParts.$name.text(this.name);
    };

    return DefaultDecorator;
});