/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Authors:
 * Zsolt Lattmann
 * Robert Kereskenyi
 */

"use strict";

define(['js/Constants',
    '../Core/ModelicaDecorator.Core',
    'js/NodePropertyNames',
    'js/Loader/LoaderProgressBar',
    'js/Widgets/PartBrowser/PartBrowserWidget.DecoratorBase',
    'text!../DiagramDesigner/ModelicaDecorator.DiagramDesignerWidget.html',
    'css!./ModelicaDecorator.PartBrowserWidget.css'], function (CONSTANTS,
                                                     ModelicaDecoratorCore,
                                                     nodePropertyNames,
                                                       LoaderProgressBar,
                                                       PartBrowserWidgetDecoratorBase,
                                                       modelicaDecoratorDiagramDesignerWidgetTemplate) {

    var ModelicaDecoratorPartBrowserWidget,
        __parent__ = PartBrowserWidgetDecoratorBase,
        DECORATOR_ID = "ModelicaDecoratorPartBrowserWidget",
        PART_BROWSER_ICON_WIDTH = 100;

    ModelicaDecoratorPartBrowserWidget = function (options) {
        var opts = _.extend( {}, options);

        __parent__.apply(this, [opts]);

        this._modelicaDecoratorCore = new ModelicaDecoratorCore(this.logger);

        this.logger.debug("ModelicaDecoratorPartBrowserWidget ctor");
    };

    _.extend(ModelicaDecoratorPartBrowserWidget.prototype, __parent__.prototype);
    ModelicaDecoratorPartBrowserWidget.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DiagramDesignerWidgetDecoratorBase MEMBERS **************************/

    ModelicaDecoratorPartBrowserWidget.prototype.$DOMBase = (function () {
        var el = $(modelicaDecoratorDiagramDesignerWidgetTemplate);
        //use the same HTML template as the DefaultDecorator.DiagramDesignerWidget
        //but remove the connector DOM elements since they are not needed in the PartBrowser
        el.find('.connector-container').remove();
        return el;
    })();

    ModelicaDecoratorPartBrowserWidget.prototype.beforeAppend = function () {
        this.$el = this.$DOMBase.clone();

        //find name placeholder
        this.skinParts.$name = this.$el.find(".name");

        this._renderContent();
    };

    ModelicaDecoratorPartBrowserWidget.prototype.afterAppend = function () {
    };

    ModelicaDecoratorPartBrowserWidget.prototype.getTerritoryQuery = function () {
        var territoryRule = {},
            client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            childrenIDs = nodeObj ?  nodeObj.getChildrenIds() : [],
            len = childrenIDs.length,
            partId = this._metaInfo[CONSTANTS.GME_ID];

        territoryRule[this._metaInfo[CONSTANTS.GME_ID]] = { "children": 1 };

        //at the same time in order to get notified by the controller we need to register
        //specific IDs we want to be notified about
        while (len--) {
            this._control.registerComponentIDForPartID(childrenIDs[len], partId);
        }

        return territoryRule;
    };

    ModelicaDecoratorPartBrowserWidget.prototype._renderContent = function () {
        var client = this._control._client,
            control = this._control,
            gmeID = this._metaInfo[CONSTANTS.GME_ID],
            nodeObj = client.getNode(gmeID);

        //render GME-ID in the DOM, for debugging
        if (DEBUG) {
            this.$el.attr({"data-id": gmeID});
        }

        if (nodeObj) {
            this.skinParts.$name.text(nodeObj.getAttribute(nodePropertyNames.Attributes.name) || "");
        }

        //empty out SVG container
        this.$el.find('.svg-container').empty();

        //figure out the necessary SVG based on children type
        var svg = this._modelicaDecoratorCore.getSVGByGMEId(control, gmeID);
        if (svg) {
            //local modification for PartBrowser
            //it will display the icon by size of 100x100
            this._modelicaDecoratorCore.resizeSVGToWidth(svg, PART_BROWSER_ICON_WIDTH);

            this.$el.find('.svg-container').append(svg);
            this.skinParts.$svg = $(this.$el.find('svg')[0]);

            this._modelicaDecoratorCore.removeParameterTextsFromSVG(this.skinParts.$svg);

            //finally unregister all the other children that we don't care about anymore
            var modelicaModelObject = this._modelicaDecoratorCore.getFirstChildObjectByKeyValue(control, gmeID, 'kind', 'ModelicaModel');
            if (modelicaModelObject) {
                this._unregisterChildrenOtherThen(modelicaModelObject.getId());
            }
        } else {
            //do progressbar instead
            this.__loader = new LoaderProgressBar({"containerElement": this.$el.find('.svg-container')});
            this.__loader.start();
        }
    };

    ModelicaDecoratorPartBrowserWidget.prototype.update = function () {
        this._renderContent();
    };

    ModelicaDecoratorPartBrowserWidget.prototype.notifyComponentEvent = function (/*componentList*/) {
        //here we do not really care what component got updated
        //we just simply rerender the content
        //TODO: could be optimized
        this._renderContent();
    };

    ModelicaDecoratorPartBrowserWidget.prototype._unregisterChildrenOtherThen = function (id) {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            childrenIDs = nodeObj ?  nodeObj.getChildrenIds() : [],
            len = childrenIDs.length,
            partId = this._metaInfo[CONSTANTS.GME_ID];

        while (len--) {
            if (childrenIDs[len] !== id) {
                this._control.unregisterComponentIDFromPartID(childrenIDs[len], partId);
            }
        }
    };

    return ModelicaDecoratorPartBrowserWidget;
});