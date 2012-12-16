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

    DefaultDecorator.prototype.getConnectionAreas = function (id) {
        var result = [];

        //by default return the bounding box edges midpoints

        //top left
        result.push( {"id": "0",
            "x": this.hostDesignerItem.width / 2,
            "y": 0,
            "w": 0,
            "h": 0,
            "orientation": "N"} );

        result.push( {"id": "1",
            "x": this.hostDesignerItem.width / 2,
            "y": this.hostDesignerItem.height,
            "w": 0,
            "h": 0,
            "orientation": "S"} );

        result.push( {"id": "2",
            "x": 0,
            "y": this.hostDesignerItem.height / 2,
            "w": 0,
            "h": 0,
            "orientation": "N"} );

        result.push( {"id": "3",
            "x": this.hostDesignerItem.width,
            "y": this.hostDesignerItem.height / 2,
            "w": 0,
            "h": 0,
            "orientation": "S"} );

        return result;
    };

    return DefaultDecorator;
});