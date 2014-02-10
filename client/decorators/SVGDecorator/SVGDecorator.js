"use strict";

define(['js/Decorators/DecoratorBase',
    './DiagramDesigner/SVGDecorator.DiagramDesignerWidget',
    './PartBrowser/SVGDecorator.PartBrowserWidget'], function (
                                                           DecoratorBase,
                                                           SVGDecoratorDiagramDesignerWidget,
                                                           SVGDecoratorPartBrowserWidget) {

    var SVGDecorator,
        DECORATOR_ID = "SVGDecorator";

    SVGDecorator = function (params) {
        var opts = _.extend( {"loggerName": this.DECORATORID}, params);

        DecoratorBase.apply(this, [opts]);

        this.logger.debug("SVGDecorator ctor");
    };

    _.extend(SVGDecorator.prototype, DecoratorBase.prototype);
    SVGDecorator.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DecoratorBase MEMBERS **************************/

    SVGDecorator.prototype.initializeSupportedWidgetMap = function () {
        this.supportedWidgetMap = {'DiagramDesigner': SVGDecoratorDiagramDesignerWidget,
            'PartBrowser': SVGDecoratorPartBrowserWidget};
    };

    return SVGDecorator;
});