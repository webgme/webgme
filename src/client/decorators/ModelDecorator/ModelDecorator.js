/*globals define, _*/
/*jshint browser: true, camelcase: false*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/Decorators/DecoratorBase',
    './DiagramDesigner/ModelDecorator.DiagramDesignerWidget',
    './PartBrowser/ModelDecorator.PartBrowserWidget'
], function (DecoratorBase, ModelDecoratorDiagramDesignerWidget, ModelDecoratorPartBrowserWidget) {

    'use strict';

    var ModelDecorator,
        __parent__ = DecoratorBase,
        __parent_proto__ = DecoratorBase.prototype,
        DECORATOR_ID = 'ModelDecorator';

    ModelDecorator = function (params) {
        var opts = _.extend({loggerName: this.DECORATORID}, params);

        __parent__.apply(this, [opts]);

        this.logger.debug('ModelDecorator ctor');
    };

    _.extend(ModelDecorator.prototype, __parent_proto__);
    ModelDecorator.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DecoratorBase MEMBERS **************************/

    ModelDecorator.prototype.initializeSupportedWidgetMap = function () {
        this.supportedWidgetMap = {
            DiagramDesigner: ModelDecoratorDiagramDesignerWidget,
            PartBrowser: ModelDecoratorPartBrowserWidget
        };
    };

    return ModelDecorator;
});