"use strict";

define(['js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/PartBrowser/PartBrowserWidget.DecoratorBase',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    'text!../Core/ModelDecorator.html',
    '../Core/ModelDecorator.Core',
    'css!./ModelDecorator.PartBrowserWidget'], function (CONSTANTS,
                                                       nodePropertyNames,
                                                       PartBrowserWidgetDecoratorBase,
                                                       DiagramDesignerWidgetConstants,
                                                       modelDecoratorTemplate,
                                                       ModelDecoratorCore) {

    var ModelDecoratorPartBrowserWidget,
        DECORATOR_ID = "ModelDecoratorPartBrowserWidget";


    ModelDecoratorPartBrowserWidget = function (options) {
        var opts = _.extend( {}, options);

        PartBrowserWidgetDecoratorBase.apply(this, [opts]);
        ModelDecoratorCore.apply(this, [opts]);

        this._initializeVariables({"connectors": false});

        this.logger.debug("ModelDecoratorPartBrowserWidget ctor");
    };


    /************************ INHERITANCE *********************/
    _.extend(ModelDecoratorPartBrowserWidget.prototype, PartBrowserWidgetDecoratorBase.prototype);
    _.extend(ModelDecoratorPartBrowserWidget.prototype, ModelDecoratorCore.prototype);


    /**************** OVERRIDE INHERITED / EXTEND ****************/

    /**** Override from PartBrowserWidgetDecoratorBase ****/
    ModelDecoratorPartBrowserWidget.prototype.DECORATORID = DECORATOR_ID;


    /**** Override from PartBrowserWidgetDecoratorBase ****/
    ModelDecoratorPartBrowserWidget.prototype.$DOMBase = (function () {
        var el = $(modelDecoratorTemplate);
        //use the same HTML template as the DefaultDecorator.DiagramDesignerWidget
        //but remove the connector DOM elements since they are not needed in the PartBrowser
        el.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS).remove();
        return el;
    })();


    /**** Override from PartBrowserWidgetDecoratorBase ****/
    ModelDecoratorPartBrowserWidget.prototype.beforeAppend = function () {
        this.$el = this.$DOMBase.clone();

        this._renderContent();
    };


    /**** Override from PartBrowserWidgetDecoratorBase ****/
    ModelDecoratorPartBrowserWidget.prototype.afterAppend = function () {
    };


    /**** Override from PartBrowserWidgetDecoratorBase ****/
    ModelDecoratorPartBrowserWidget.prototype.update = function () {
        this._update();
    };


    /**** Override from PartBrowserWidgetDecoratorBase ****/
    ModelDecoratorPartBrowserWidget.prototype.notifyComponentEvent = function (componentList) {
        var len = componentList.length;
        while (len--) {
            this._updatePort(componentList[len]);
        }
        this._checkTerritoryReady();
    };


    return ModelDecoratorPartBrowserWidget;
});