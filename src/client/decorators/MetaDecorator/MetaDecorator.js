/*globals define, _*/
/*jshint browser: true, camelcase: false*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/Decorators/DecoratorBase',
    './DiagramDesigner/MetaDecorator.DiagramDesignerWidget'
], function (DecoratorBase, MetaDecoratorDiagramDesignerWidget) {

    'use strict';
    var MetaDecorator,
        __parent__ = DecoratorBase,
        __parent_proto__ = DecoratorBase.prototype,
        DECORATOR_ID = 'MetaDecorator';

    MetaDecorator = function (params) {
        var opts = _.extend({loggerName: this.DECORATORID}, params);

        __parent__.apply(this, [opts]);

        this.logger.debug('MetaDecorator ctor');
    };

    _.extend(MetaDecorator.prototype, __parent_proto__);
    MetaDecorator.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DecoratorBase MEMBERS **************************/

    MetaDecorator.prototype.initializeSupportedWidgetMap = function () {
        this.supportedWidgetMap = {
            DiagramDesigner: MetaDecoratorDiagramDesignerWidget/*,
             PartBrowser: MetaDecoratorDiagramDesignerWidget*/
        };
    };

    return MetaDecorator;
});