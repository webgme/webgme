/*globals define, $, _, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/Constants',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    'js/Utils/DisplayFormat',
    'js/Decorators/DecoratorWithPortsAndPointerHelpers.Base',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    'text!./default.svg'
], function (CONSTANTS,
             nodePropertyNames,
             REGISTRY_KEYS,
             displayFormat,
             DecoratorWithPortsAndPointerHelpers,
             DiagramDesignerWidgetConstants,
             DefaultSvgTemplate) {

    'use strict';

    var SVGDecoratorCore,
        ABSTRACT_CLASS = 'abstract',
        FILL_COLOR_CLASS = 'fill-color',
        BORDER_COLOR_CLASS = 'border-color',
        TEXT_COLOR_CLASS = 'text-color';

    /**
     * Contains downloaded svg elements from the server.
     * @type {{}}
     * @private
     */
    var SVG_CACHE = {};

    /**
     * Svg element that can be used as a placeholder for the icon if the icon does not exist on the server.
     * @type {*|jQuery}
     * @private
     */
    var defaultSVG = $(DefaultSvgTemplate);

    SVGDecoratorCore = function () {
        DecoratorWithPortsAndPointerHelpers.apply(this, []);
        this.svgCache = SVG_CACHE;
    };

    _.extend(SVGDecoratorCore.prototype, DecoratorWithPortsAndPointerHelpers.prototype);

    SVGDecoratorCore.prototype._initializeVariables = function (params) {
        this.name = '';
        this.formattedName = '';
        this.$name = undefined;
        this.$replaceable = undefined;

        //Get custom data from svg
        if (params.data) {
            this.customData = [];
            //list of data to retrieve
            var i = params.data.length;

            while (i--) {
                if (this[params.data[i]] === undefined) {//Don't overwrite anything meaningful
                    //add params.data to custom params.data list to retrieve from svg
                    this.customData.push(params.data[i]);
                    this[params.data[i]] = null;
                }
            }
        }

        if (params.connectors === true) {
            this._displayConnectors = true;
        }
    };

    /**** Override from *.WidgetDecoratorBase ****/
    SVGDecoratorCore.prototype.doSearch = function (searchDesc) {
        var searchText = searchDesc.toString(),
            gmeId = (this._metaInfo && this._metaInfo[CONSTANTS.GME_ID]) || '';

        return (this.formattedName && this.formattedName.toLowerCase().indexOf(searchText.toLowerCase()) !== -1) ||
            (gmeId.indexOf(searchText) > -1);
    };

    SVGDecoratorCore.prototype._renderContent = function () {
        //render GME-ID in the DOM, for debugging
        this.$el.attr({'data-id': this._metaInfo[CONSTANTS.GME_ID]});

        /* BUILD UI*/
        //find placeholders
        this.$name = this.$el.find('.name');
        this.$svgContent = this.$el.find('.svg-content');

        this._update();
    };

    SVGDecoratorCore.prototype._update = function () {
        this._updateSVGContent();
        this._updateColors();
        this._updateName();
        this._updateAbstract();
        this._updatePorts();//Will be overridden by ports class if extended
        this._updateIsReplaceable();

    };

    SVGDecoratorCore.prototype._updateColors = function () {
        var svg = this.$svgElement,
            fillColorElements = svg.find('.' + FILL_COLOR_CLASS),
            borderColorElements = svg.find('.' + BORDER_COLOR_CLASS),
            textColorElements = svg.find('.' + TEXT_COLOR_CLASS);

        this._getNodeColorsFromRegistry();

        if (this.fillColor) {
            fillColorElements.css({fill: this.fillColor});
        } else {
            fillColorElements.css({fill: ''});
        }

        if (this.borderColor) {
            borderColorElements.css({stroke: this.borderColor});
        } else {
            borderColorElements.css({stroke: ''});
        }

        if (this.textColor) {
            this.$el.css({color: this.textColor});
            textColorElements.css({fill: this.textColor});
        } else {
            this.$el.css({color: ''});
            textColorElements.css({fill: ''});
        }
    };

    SVGDecoratorCore.prototype._getNodeColorsFromRegistry = function () {
        var objID = this._metaInfo[CONSTANTS.GME_ID];
        this.fillColor = this.preferencesHelper.getRegistry(objID, REGISTRY_KEYS.COLOR, true);
        this.borderColor = this.preferencesHelper.getRegistry(objID, REGISTRY_KEYS.BORDER_COLOR, true);
        this.textColor = this.preferencesHelper.getRegistry(objID, REGISTRY_KEYS.TEXT_COLOR, true);
    };

    /***** UPDATE THE NAME OF THE NODE *****/
    SVGDecoratorCore.prototype._updateName = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            noName = '(N/A)';

        if (nodeObj) {
            //this.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name);
            this.name = nodeObj.getFullyQualifiedName();
            this.formattedName = displayFormat.resolve(nodeObj);
        } else {
            this.name = '';
            this.formattedName = noName;
        }

        this.$name.text(this.formattedName);
        this.$name.attr('title', this.formattedName);

        if(this.$svgElement.data('hidename') === true){
            this.$name.hide();
        } else {
            this.$name.show();
        }
    };

    /***** UPDATE THE ABSTRACTNESS OF THE NODE *****/
    SVGDecoratorCore.prototype._updateAbstract = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]);

        if (nodeObj) {
            if (nodeObj.getRegistry(REGISTRY_KEYS.IS_ABSTRACT) === true) {
                this.$el.addClass(ABSTRACT_CLASS);
            } else {
                this.$el.removeClass(ABSTRACT_CLASS);
            }
        } else {
            this.$el.removeClass(ABSTRACT_CLASS);
        }
    };

    /***** UPDATE THE SVG ICON OF THE NODE *****/
    SVGDecoratorCore.prototype._updateSVGContent = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            svgContent;

        if (nodeObj) {
            //set new content
            this.$svgContent.empty();
            this.$svgContent.removeClass();
            this.$svgContent.addClass('svg-content');

            //remove existing connectors (if any)
            this.$el.find('> .' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS).remove();

            svgContent = WebGMEGlobal.SvgManager.getSvgElement(nodeObj, REGISTRY_KEYS.SVG_ICON);
            if (svgContent) {
                this.$svgElement = svgContent;
                this._discoverCustomConnectionAreas(this.$svgElement);

            } else {
                delete this._customConnectionAreas;
                this.$svgElement = defaultSVG.clone();

            }
        } else {
            delete this._customConnectionAreas;
            this.$svgElement = defaultSVG.clone();
        }

        this._generateConnectors();
        this.$svgContent.append(this.$svgElement);
    };

    /***** FUNCTIONS TO OVERRIDE *****/

    SVGDecoratorCore.prototype._updateExtras = function () {
        //Can be overridden for custom functionality
    };

    /***** PORT FUNCTIONALITY *****/
    //Overridden in SVGDecorator.Ports.js
    SVGDecoratorCore.prototype._updatePorts = function () {
        //If no ports in model, does nothing
    };

    SVGDecoratorCore.prototype._fixPortContainerPosition = function () {
        //If no ports in model, does nothing
    };

    /***** CONNECTION FUNCTIONALITY *****/
    //Overridden in SVGDecorator.Connection.js
    SVGDecoratorCore.prototype._discoverCustomConnectionAreas = function () {
        //If no connections in model, does nothing
    };

    //Overridden in SVGDecorator.Connection.js
    SVGDecoratorCore.prototype._generateConnectors = function () {
        //If no connections in model, does nothing
    };

    SVGDecoratorCore.prototype._updateIsReplaceable = function () {
        if (this._isReplaceable()) {
            this.$replaceable = this.$el.find('.replaceable');
            if (this.$replaceable.length === 0) {
                this.$replaceable = $('<div class="replaceable">' +
                    '<i class="glyphicon glyphicon-transfer" title="This node is replaceable"></i></div>');
                this.$el.append(this.$replaceable);
            }
        } else {
            if (this.$replaceable) {
                this.$replaceable.remove();
                this.$replaceable = undefined;
            }
        }
    };

    return SVGDecoratorCore;
});
