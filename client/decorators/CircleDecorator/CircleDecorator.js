"use strict";

define(['js/Decorators/DecoratorBase',
    './DiagramDesigner/CircleDecorator.DiagramDesignerWidget',
    './PartBrowser/CircleDecorator.PartBrowserWidget'], function (
                                                           DecoratorBase,
                                                           CircleDecoratorDiagramDesignerWidget,
                                                           CircleDecoratorPartBrowserWidget) {

    var CircleDecorator,
        __parent__ = DecoratorBase,
        __parent_proto__ = DecoratorBase.prototype,
        DECORATOR_ID = "CircleDecorator";

    CircleDecorator = function (params) {
        var opts = _.extend( {"loggerName": this.DECORATORID}, params);

        __parent__.apply(this, [opts]);

        this.logger.debug("CircleDecorator ctor");
    };

    _.extend(CircleDecorator.prototype, __parent_proto__);
    CircleDecorator.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DecoratorBase MEMBERS **************************/

    CircleDecorator.prototype.initializeSupportedWidgetMap = function () {
        this.supportedWidgetMap = {'DiagramDesigner': CircleDecoratorDiagramDesignerWidget,
            'PartBrowser': CircleDecoratorPartBrowserWidget};
    };

    return CircleDecorator;
});