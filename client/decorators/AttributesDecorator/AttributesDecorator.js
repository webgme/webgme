"use strict";

define(['js/Decorators/DecoratorBase',
    './DiagramDesigner/AttributesDecorator.DiagramDesignerWidget'], function (
                                                           DecoratorBase,
                                                           AttributesDecoratorDiagramDesignerWidget) {

    var AttributesDecorator,
        __parent__ = DecoratorBase,
        __parent_proto__ = DecoratorBase.prototype,
        DECORATOR_ID = "AttributesDecorator";

    AttributesDecorator = function (params) {
        var opts = _.extend( {"loggerName": this.DECORATORID}, params);

        __parent__.apply(this, [opts]);

        this.logger.debug("AttributesDecorator ctor");
    };

    _.extend(AttributesDecorator.prototype, __parent_proto__);
    AttributesDecorator.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DecoratorBase MEMBERS **************************/

    AttributesDecorator.prototype.initializeSupportedWidgetMap = function () {
        this.supportedWidgetMap = {'DiagramDesigner': AttributesDecoratorDiagramDesignerWidget/*,
            'PartBrowser': AttributesDecoratorDiagramDesignerWidget*/};
    };

    return AttributesDecorator;
});