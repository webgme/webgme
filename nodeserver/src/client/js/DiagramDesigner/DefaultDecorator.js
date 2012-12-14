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

        this.name = options.name || "";

        this.logger.debug("DefaultDecorator ctor");
    };

    _.extend(DefaultDecorator.prototype, __parent_proto__);

    /*********************** OVERRIDE DECORATORBASE MEMBERS **************************/

    DefaultDecorator.prototype.$_DOMBase = $(defaultDecoratorTemplate);

    DefaultDecorator.prototype.on_addTo = function () {
        //find name placeholder
        this.skinParts.$name = this.$el.find(".name");
        this.skinParts.$name.text(this.name);

        //let the parent decorator class do its job first
        return __parent_proto__.on_addTo.apply(this, arguments);
    };

    DefaultDecorator.prototype.calculateDimension = function () {
        this.hostDesignerItem.width = this.$el.outerWidth(true);
        this.hostDesignerItem.height = this.$el.outerHeight(true);
    };

    DefaultDecorator.prototype.update = function (objDescriptor, silent) {
        var newName = objDescriptor.name || "";

        if (this.name !== newName) {
            this.name = newName;
            this.skinParts.$name.text(this.name);
        }

        this.hostDesignerItem.decoratorUpdated();
    };

    return DefaultDecorator;
});