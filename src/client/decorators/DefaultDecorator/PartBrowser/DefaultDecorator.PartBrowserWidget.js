/*globals define, _, DEBUG, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


define([
    'js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/PartBrowser/PartBrowserWidget.DecoratorBase',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    'text!../DiagramDesigner/DefaultDecorator.DiagramDesignerWidget.html',
    'css!../DiagramDesigner/DefaultDecorator.DiagramDesignerWidget.css',
    'css!./DefaultDecorator.PartBrowserWidget.css'
], function (CONSTANTS,
             nodePropertyNames,
             PartBrowserWidgetDecoratorBase,
             DiagramDesignerWidgetConstants,
             defaultDecoratorDiagramDesignerWidgetTemplate) {

    'use strict';

    var DefaultDecoratorPartBrowserWidget,
        __parent__ = PartBrowserWidgetDecoratorBase,
        DECORATOR_ID = 'DefaultDecoratorPartBrowserWidget';

    DefaultDecoratorPartBrowserWidget = function (options) {
        var opts = _.extend({}, options);

        __parent__.apply(this, [opts]);

        this.logger.debug('DefaultDecoratorPartBrowserWidget ctor');
    };

    _.extend(DefaultDecoratorPartBrowserWidget.prototype, __parent__.prototype);
    DefaultDecoratorPartBrowserWidget.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DiagramDesignerWidgetDecoratorBase MEMBERS **************************/

    DefaultDecoratorPartBrowserWidget.prototype.$DOMBase = (function () {
        var el = $(defaultDecoratorDiagramDesignerWidgetTemplate);
        //use the same HTML template as the DefaultDecorator.DiagramDesignerWidget
        //but remove the connector DOM elements since they are not needed in the PartBrowser
        el.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS).remove();
        return el;
    })();

    DefaultDecoratorPartBrowserWidget.prototype.beforeAppend = function () {
        this.$el = this.$DOMBase.clone();

        //find name placeholder
        this.skinParts.$name = this.$el.find('.name');

        this._renderContent();
    };

    DefaultDecoratorPartBrowserWidget.prototype.afterAppend = function () {
    };

    DefaultDecoratorPartBrowserWidget.prototype._renderContent = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]);

        //render GME-ID in the DOM, for debugging
        if (DEBUG) {
            this.$el.attr({'data-id': this._metaInfo[CONSTANTS.GME_ID]});
        }

        if (nodeObj) {
            //this.skinParts.$name.text(nodeObj.getAttribute(nodePropertyNames.Attributes.name) || '');
            this.skinParts.$name.text(nodeObj.getFullyQualifiedName());
        }
    };

    DefaultDecoratorPartBrowserWidget.prototype.update = function () {
        this._renderContent();
    };

    return DefaultDecoratorPartBrowserWidget;
});