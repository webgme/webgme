/*globals define, _, DEBUG, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


define([
    'js/Constants',
    'js/RegistryKeys',
    'js/NodePropertyNames',
    'js/Widgets/PartBrowser/PartBrowserWidget.DecoratorBase',
    '../Core/DocumentDecorator.Core',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    'text!../DiagramDesigner/DocumentDecorator.DiagramDesignerWidget.html',
    'css!../DiagramDesigner/DocumentDecorator.DiagramDesignerWidget.css',
    'css!./DocumentDecorator.PartBrowserWidget.css'
], function (CONSTANTS,
             REGISTRY_KEYS,
             nodePropertyNames,
             PartBrowserWidgetDecoratorBase,
             DocumentDecoratorCore,
             DiagramDesignerWidgetConstants,
             DocumentDecoratorDiagramDesignerWidgetTemplate) {

    'use strict';

    var DocumentDecoratorPartBrowserWidget,
        DECORATOR_ID = 'DocumentDecoratorPartBrowserWidget',
        EMBEDDED_SVG_IMG_BASE = $('<img>', {class: 'embeddedsvg'});

    DocumentDecoratorPartBrowserWidget = function (options) {
        var opts = _.extend({}, options);

        PartBrowserWidgetDecoratorBase.apply(this, [opts]);
        DocumentDecoratorCore.apply(this, [opts]);

        this.logger.debug('DocumentDecoratorPartBrowserWidget ctor');
    };

    _.extend(DocumentDecoratorPartBrowserWidget.prototype, PartBrowserWidgetDecoratorBase.prototype);
    _.extend(DocumentDecoratorPartBrowserWidget.prototype, DocumentDecoratorCore.prototype);

    DocumentDecoratorPartBrowserWidget.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DiagramDesignerWidgetDecoratorBase MEMBERS **************************/

    DocumentDecoratorPartBrowserWidget.prototype.$DOMBase = (function () {
        var el = $(DocumentDecoratorDiagramDesignerWidgetTemplate);
        //use the same HTML template as the DocumentDecorator.DiagramDesignerWidget
        //but remove the connector DOM elements since they are not needed in the PartBrowser
        el.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS).remove();
        return el;
    })();

    // Public API
    DocumentDecoratorPartBrowserWidget.prototype.beforeAppend = function () {
        this.$el = this.$DOMBase.clone();

        //find name placeholder
        this.skinParts.$name = this.$el.find('.name');

        this._renderContent();
    };

    DocumentDecoratorPartBrowserWidget.prototype.afterAppend = function () {
    };

    DocumentDecoratorPartBrowserWidget.prototype.update = function () {
        this._renderContent();
    };

    // Helper methods

    DocumentDecoratorPartBrowserWidget.prototype._renderContent = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]);

        //render GME-ID in the DOM, for debugging
        if (DEBUG) {
            this.$el.attr({'data-id': this._metaInfo[CONSTANTS.GME_ID]});
        }

        if (nodeObj) {
            this.skinParts.$name.text(nodeObj.getAttribute(nodePropertyNames.Attributes.name) || '');
        }

        this._updateColors(true);
        this._updateSVG();
    };

    DocumentDecoratorPartBrowserWidget.prototype._updateSVG = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            svgFile = '',
            svgURL,
            self = this;

        if (nodeObj) {
            svgFile = nodeObj.getRegistry(REGISTRY_KEYS.SVG_ICON);
        }

        if (svgFile) {
            // get the svg from the server in SYNC mode, may take some time
            svgURL = CONSTANTS.ASSETS_DECORATOR_SVG_FOLDER + svgFile;
            if (!this.skinParts.$imgSVG) {
                this.skinParts.$imgSVG = EMBEDDED_SVG_IMG_BASE.clone();
                this.$el.append(this.skinParts.$imgSVG);
            }
            if (this.skinParts.$imgSVG.attr('src') !== svgURL) {
                this.skinParts.$imgSVG.on('load', function (/*event*/) {
                    self.skinParts.$imgSVG.css('margin-top', '5px');
                    self.skinParts.$imgSVG.off('load');
                    self.skinParts.$imgSVG.off('error');
                });
                this.skinParts.$imgSVG.on('error', function (/*event*/) {
                    self.skinParts.$imgSVG.css('margin-top', '5px');
                    self.skinParts.$imgSVG.off('load');
                    self.skinParts.$imgSVG.off('error');
                });
                this.skinParts.$imgSVG.attr('src', svgURL);
            }
        } else {
            if (this.skinParts.$imgSVG) {
                this.skinParts.$imgSVG.remove();
                this.skinParts.$imgSVG = undefined;
            }
        }
    };

    return DocumentDecoratorPartBrowserWidget;
});