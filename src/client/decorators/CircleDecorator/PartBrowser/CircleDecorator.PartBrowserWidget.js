/*globals define, _, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/PartBrowser/PartBrowserWidget.DecoratorBase',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    '../Core/CircleDecorator.Core',
    'text!../Core/CircleDecorator.html',
    'css!./CircleDecorator.PartBrowserWidget.css'
], function (CONSTANTS,
             nodePropertyNames,
             PartBrowserWidgetDecoratorBase,
             DiagramDesignerWidgetConstants,
             CircleDecoratorCore,
             circleDecoratorTemplate) {

    'use strict';
    var CircleDecoratorPartBrowserWidget,
        DECORATOR_ID = 'CircleDecoratorPartBrowserWidget';

    CircleDecoratorPartBrowserWidget = function (options) {
        var opts = _.extend({}, options);

        PartBrowserWidgetDecoratorBase.apply(this, [opts]);
        CircleDecoratorCore.apply(this, [opts]);

        this._initializeVariables({connectors: false});

        this.logger.debug('CircleDecoratorPartBrowserWidget ctor');
    };

    /************************ INHERITANCE *********************/
    _.extend(CircleDecoratorPartBrowserWidget.prototype, PartBrowserWidgetDecoratorBase.prototype);
    _.extend(CircleDecoratorPartBrowserWidget.prototype, CircleDecoratorCore.prototype);

    /**************** OVERRIDE INHERITED / EXTEND ****************/

    /**** Override from PartBrowserWidgetDecoratorBase ****/
    CircleDecoratorPartBrowserWidget.prototype.DECORATORID = DECORATOR_ID;

    /**** Override from PartBrowserWidgetDecoratorBase ****/
    CircleDecoratorPartBrowserWidget.prototype.$DOMBase = (function () {
        var el = $(circleDecoratorTemplate);
        //but remove the connector DOM elements since they are not needed in the PartBrowser
        el.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS).remove();
        el.find('.circle-shadow').remove();
        return el;
    })();

    CircleDecoratorPartBrowserWidget.prototype.beforeAppend = function () {
        this.$el = this.$DOMBase.clone();

        this._renderContent();
    };

    /**** Override from PartBrowserWidgetDecoratorBase ****/
    CircleDecoratorPartBrowserWidget.prototype.afterAppend = function () {
        this._update();
    };

    /**** Override from PartBrowserWidgetDecoratorBase ****/
    CircleDecoratorPartBrowserWidget.prototype.update = function () {
        this._update();
    };

    /***** UPDATE THE NAME OF THE NODE *****/
    CircleDecoratorPartBrowserWidget.prototype._updateName = function () {
        CircleDecoratorCore.prototype._updateName.call(this);

        if (this.skinParts.$name) {
            var nameWidth = this.skinParts.$name.outerWidth();

            var shift = (this.circleSize - nameWidth) / 2;

            this.skinParts.$name.css({left: shift});
        }
    };

    return CircleDecoratorPartBrowserWidget;
});