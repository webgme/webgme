"use strict";

define(['js/Decorators/DecoratorBase',
    './DiagramDesigner/CircleDecorator.DiagramDesignerWidget',
    './PartBrowser/CircleDecorator.PartBrowserWidget'], function (
                                                           DecoratorBase,
                                                           CircleDecoratorDiagramDesignerWidget,
                                                           CircleDecoratorPartBrowserWidget) {

    var CircleDecorator,
        DECORATOR_ID = "CircleDecorator";

    CircleDecorator = function (params) {
        var opts = _.extend( {"loggerName": this.DECORATORID}, params);

        DecoratorBase.apply(this, [opts]);

        this.logger.debug("CircleDecorator ctor");
    };

    _.extend(CircleDecorator.prototype, DecoratorBase.prototype);
    CircleDecorator.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DecoratorBase MEMBERS **************************/

    CircleDecorator.prototype.initializeSupportedWidgetMap = function () {
        this.supportedWidgetMap = {'DiagramDesigner': CircleDecoratorDiagramDesignerWidget,
            'PartBrowser': CircleDecoratorPartBrowserWidget};
    };

    return CircleDecorator;
});