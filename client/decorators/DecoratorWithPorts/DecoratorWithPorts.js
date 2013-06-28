"use strict";

define(['js/Decorators/DecoratorBase',
    './DiagramDesigner/DecoratorWithPorts.DiagramDesignerWidget',
    './PartBrowser/DecoratorWithPorts.PartBrowserWidget'], function (
                                                           DecoratorBase,
                                                           DecoratorWithPortsDiagramDesignerWidget,
                                                           DecoratorWithPortsPartBrowserWidget) {

    var DecoratorWithPorts,
        __parent__ = DecoratorBase,
        __parent_proto__ = DecoratorBase.prototype,
        DECORATOR_ID = "DecoratorWithPorts";

    DecoratorWithPorts = function (params) {
        var opts = _.extend( {"loggerName": this.DECORATORID}, params);

        __parent__.apply(this, [opts]);

        this.logger.debug("DecoratorWithPorts ctor");
    };

    _.extend(DecoratorWithPorts.prototype, __parent_proto__);
    DecoratorWithPorts.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DecoratorBase MEMBERS **************************/

    DecoratorWithPorts.prototype.initializeSupportedWidgetMap = function () {
        this.supportedWidgetMap = {'DiagramDesigner': DecoratorWithPortsDiagramDesignerWidget,
            'PartBrowser': DecoratorWithPortsPartBrowserWidget};
    };

    return DecoratorWithPorts;
});