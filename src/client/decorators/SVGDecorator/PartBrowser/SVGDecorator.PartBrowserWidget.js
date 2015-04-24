/*globals define, _, $*/
/*jshint browser: true*/

/**
 * @author brollb / https://github/brollb
 */

define([
    'js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/PartBrowser/PartBrowserWidget.DecoratorBase',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    'text!../Core/SVGDecorator.html',
    './SVGDecorator.Core',
    'css!./SVGDecorator.PartBrowserWidget'
], function (CONSTANTS,
             nodePropertyNames,
             PartBrowserWidgetDecoratorBase,
             DiagramDesignerWidgetConstants,
             SVGDecoratorTemplate,
             SVGDecoratorCore) {

    'use strict';

    var SVGDecoratorPartBrowserWidget,
        DECORATOR_ID = 'SVGDecoratorPartBrowserWidget';


    SVGDecoratorPartBrowserWidget = function (options) {
        var opts = _.extend({}, options);

        PartBrowserWidgetDecoratorBase.apply(this, [opts]);
        SVGDecoratorCore.apply(this, [opts]);

        this._initializeVariables({connectors: false});

        this.logger.debug('SVGDecoratorPartBrowserWidget ctor');
    };


    /************************ INHERITANCE *********************/
    _.extend(SVGDecoratorPartBrowserWidget.prototype, PartBrowserWidgetDecoratorBase.prototype);
    _.extend(SVGDecoratorPartBrowserWidget.prototype, SVGDecoratorCore.prototype);


    /**************** OVERRIDE INHERITED / EXTEND ****************/

    /**** Override from PartBrowserWidgetDecoratorBase ****/
    SVGDecoratorPartBrowserWidget.prototype.DECORATORID = DECORATOR_ID;


    /**** Override from PartBrowserWidgetDecoratorBase ****/
    SVGDecoratorPartBrowserWidget.prototype.$DOMBase = (function () {
        var el = $(SVGDecoratorTemplate);
        //use the same HTML template as the DefaultDecorator.DiagramDesignerWidget
        //but remove the connector DOM elements since they are not needed in the PartBrowser
        el.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS).remove();
        return el;
    })();


    /**** Override from PartBrowserWidgetDecoratorBase ****/
    SVGDecoratorPartBrowserWidget.prototype.beforeAppend = function () {
        this.$el = this.$DOMBase.clone();

        this._renderContent();
    };


    /**** Override from PartBrowserWidgetDecoratorBase ****/
    SVGDecoratorPartBrowserWidget.prototype.afterAppend = function () {
    };


    /**** Override from PartBrowserWidgetDecoratorBase ****/
    SVGDecoratorPartBrowserWidget.prototype.update = function () {
        this._update();
    };

    SVGDecoratorPartBrowserWidget.prototype.afterAppend = function () {
        this.svgContainerWidth = this.$svgContent.outerWidth(true);
        this.svgWidth = this.$svgContent.find('svg').outerWidth(true);
        this.svgHeight = this.$svgContent.find('svg').outerHeight(true);

        var xShift = (this.svgContainerWidth - this.svgWidth) / 2;

        this._fixPortContainerPosition(xShift);
    };

    /**** Override from PartBrowserWidgetDecoratorBase ****/
    SVGDecoratorPartBrowserWidget.prototype.notifyComponentEvent = function (componentList) {
        var len = componentList.length;
        while (len--) {
            this._updatePort(componentList[len]);
        }
    };


    return SVGDecoratorPartBrowserWidget;
});
