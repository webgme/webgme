/*globals define, _*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['js/Decorators/DecoratorBase',
    './DiagramDesigner/UMLStateMachineDecorator.DiagramDesignerWidget',
    './PartBrowser/UMLStateMachineDecorator.PartBrowserWidget'
], function (DecoratorBase,
             UMLStateMachineDecoratorDiagramDesignerWidget,
             UMLStateMachineDecoratorPartBrowserWidget) {
    'use strict';
    var UMLStateMachineDecorator,
        DECORATOR_ID = 'UMLStateMachineDecorator';

    UMLStateMachineDecorator = function (params) {
        var opts = _.extend({loggerName: this.DECORATORID}, params);

        DecoratorBase.apply(this, [opts]);

        this.logger.debug('UMLStateMachineDecorator ctor');
    };

    _.extend(UMLStateMachineDecorator.prototype, DecoratorBase.prototype);
    UMLStateMachineDecorator.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DecoratorBase MEMBERS **************************/

    UMLStateMachineDecorator.prototype.initializeSupportedWidgetMap = function () {
        this.supportedWidgetMap = {
            DiagramDesigner: UMLStateMachineDecoratorDiagramDesignerWidget,
            PartBrowser: UMLStateMachineDecoratorPartBrowserWidget
        };
    };

    return UMLStateMachineDecorator;
});