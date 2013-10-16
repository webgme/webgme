"use strict";

define(['js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/PartBrowser/PartBrowserWidget.DecoratorBase',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    'text!../DiagramDesigner/DecoratorWithPorts.DiagramDesignerWidget.html',
    '../Core/DecoratorWithPorts.Core',
    'css!../DiagramDesigner/DecoratorWithPorts.DiagramDesignerWidget'], function (CONSTANTS,
                                                       nodePropertyNames,
                                                       PartBrowserWidgetDecoratorBase,
                                                       DiagramDesignerWidgetConstants,
                                                       decoratorWithPortsDiagramDesignerWidgetTemplate,
                                                       DecoratorWithPortsCore) {

    var DecoratorWidthPortsPartBrowserWidget,
        __parent__ = PartBrowserWidgetDecoratorBase,
        DECORATOR_ID = "DecoratorWidthPortsPartBrowserWidget";

    DecoratorWidthPortsPartBrowserWidget = function (options) {
        var opts = _.extend( {}, options);

        __parent__.apply(this, [opts]);

        this._initializeVariables();
        this._displayConnectors = false;

        this.logger.debug("DecoratorWidthPortsPartBrowserWidget ctor");
    };

    _.extend(DecoratorWidthPortsPartBrowserWidget.prototype, __parent__.prototype);
    _.extend(DecoratorWidthPortsPartBrowserWidget.prototype, DecoratorWithPortsCore.prototype);
    DecoratorWidthPortsPartBrowserWidget.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DiagramDesignerWidgetDecoratorBase MEMBERS **************************/

    DecoratorWidthPortsPartBrowserWidget.prototype.$DOMBase = (function () {
        var el = $(decoratorWithPortsDiagramDesignerWidgetTemplate);
        //use the same HTML template as the DefaultDecorator.DiagramDesignerWidget
        //but remove the connector DOM elements since they are not needed in the PartBrowser
        el.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS).remove();
        return el;
    })();

    DecoratorWidthPortsPartBrowserWidget.prototype.beforeAppend = function () {
        this.$el = this.$DOMBase.clone();

        this._renderContent();
    };

    DecoratorWidthPortsPartBrowserWidget.prototype.afterAppend = function () {
    };

    DecoratorWidthPortsPartBrowserWidget.prototype.getTerritoryQuery = function () {
        var territoryRule = {};

        territoryRule[this._metaInfo[CONSTANTS.GME_ID]] = { "children": 1 };

        return territoryRule;
    };


    DecoratorWidthPortsPartBrowserWidget.prototype.update = function () {
         this._updateName();
         this._updatePorts();
    };

    DecoratorWidthPortsPartBrowserWidget.prototype.notifyComponentEvent = function (componentList) {
        var len = componentList.length;
        while (len--) {
            this.updatePort(componentList[len]);
        }
        this._checkTerritoryReady();
    };

    DecoratorWidthPortsPartBrowserWidget.prototype._registerForNotification = function(portId) {
        var partId = this._metaInfo[CONSTANTS.GME_ID];

        this._control.registerComponentIDForPartID(portId, partId);
    };

    DecoratorWidthPortsPartBrowserWidget.prototype._unregisterForNotification = function(portId) {
        var partId = this._metaInfo[CONSTANTS.GME_ID];

        this._control.unregisterComponentIDFromPartID(portId, partId);
    };

    return DecoratorWidthPortsPartBrowserWidget;
});