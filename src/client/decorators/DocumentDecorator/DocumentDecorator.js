/*globals define, _*/
/*jshint browser: true, camelcase: false*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author Qishen Zhang  https://github.com/VictorCoder123
 */

define([
    'js/Decorators/DecoratorBase',
    './DiagramDesigner/DocumentDecorator.DiagramDesignerWidget',
    './PartBrowser/DocumentDecorator.PartBrowserWidget'
], function (DecoratorBase, DocumentDecoratorDiagramDesignerWidget, DocumentDecoratorPartBrowserWidget) {

    'use strict';

    var DocumentDecorator,
        __parent__ = DecoratorBase,
        __parent_proto__ = DecoratorBase.prototype,
        DECORATOR_ID = 'DocumentDecorator';

    DocumentDecorator = function (params) {
        var opts = _.extend({loggerName: this.DECORATORID}, params);

        __parent__.apply(this, [opts]);

        this.logger.debug('DocumentDecorator ctor');
    };

    _.extend(DocumentDecorator.prototype, __parent_proto__);
    DocumentDecorator.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DecoratorBase MEMBERS **************************/

    DocumentDecorator.prototype.initializeSupportedWidgetMap = function () {
        this.supportedWidgetMap = {
            DiagramDesigner: DocumentDecoratorDiagramDesignerWidget,
            PartBrowser: DocumentDecoratorPartBrowserWidget
        };
    };

    return DocumentDecorator;
});