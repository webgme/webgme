/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Authors:
 * Zsolt Lattmann
 * Robert Kereskenyi
 */

"use strict";

define(['js/Decorators/DecoratorBase',
    './DiagramDesigner/ModelicaDecorator.DiagramDesignerWidget',
    './PartBrowser/ModelicaDecorator.PartBrowserWidget'], function (
                                                           DecoratorBase,
                                                           ModelicaDecoratorDiagramDesignerWidget,
                                                           ModelicaDecoratorPartBrowserWidget) {

    var ModelicaDecorator,
        __parent__ = DecoratorBase,
        __parent_proto__ = DecoratorBase.prototype,
        DECORATOR_ID = "ModelicaDecorator";

    ModelicaDecorator = function (params) {
        var opts = _.extend( {"loggerName": this.DECORATORID}, params);

        __parent__.apply(this, [opts]);

        this.logger.debug("ModelicaDecorator ctor");
    };

    _.extend(ModelicaDecorator.prototype, __parent_proto__);
    ModelicaDecorator.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DecoratorBase MEMBERS **************************/

    ModelicaDecorator.prototype.initializeSupportedWidgetMap = function () {
        this.supportedWidgetMap = {'DiagramDesigner': ModelicaDecoratorDiagramDesignerWidget,
                                   'PartBrowser': ModelicaDecoratorPartBrowserWidget};
    };

    return ModelicaDecorator;
});