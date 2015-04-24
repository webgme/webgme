/*globals define, _*/
/*jshint browser: true, camelcase: false*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/Decorators/DecoratorBase',
    './DiagramDesigner/DefaultDecorator.DiagramDesignerWidget',
    './PartBrowser/DefaultDecorator.PartBrowserWidget'
], function (DecoratorBase, DefaultDecoratorDiagramDesignerWidget, DefaultDecoratorPartBrowserWidget) {

    'use strict';

    var DefaultDecorator,
        __parent__ = DecoratorBase,
        __parent_proto__ = DecoratorBase.prototype,
        DECORATOR_ID = 'DefaultDecorator';

    DefaultDecorator = function (params) {
        var opts = _.extend({loggerName: this.DECORATORID}, params);

        __parent__.apply(this, [opts]);

        this.logger.debug('DefaultDecorator ctor');
    };

    _.extend(DefaultDecorator.prototype, __parent_proto__);
    DefaultDecorator.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DecoratorBase MEMBERS **************************/

    DefaultDecorator.prototype.initializeSupportedWidgetMap = function () {
        this.supportedWidgetMap = {
            'DiagramDesigner': DefaultDecoratorDiagramDesignerWidget,
            'PartBrowser': DefaultDecoratorPartBrowserWidget
        };
    };

    return DefaultDecorator;
});