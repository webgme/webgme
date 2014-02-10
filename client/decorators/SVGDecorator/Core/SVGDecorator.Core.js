/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/Constants',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    'js/Utils/DisplayFormat',
    'text!./default.svg'], function (CONSTANTS,
                         nodePropertyNames,
                         REGISTRY_KEYS,
                         displayFormat,
                         DefaultSvgTemplate) {

    var SVGDecoratorCore,
        ABSTRACT_CLASS = 'abstract',
        SVG_DIR = '/decorators/SVGDecorator/SVG/';


    /**
     * Contains downloaded svg elements from the server.
     * @type {{}}
     * @private
     */
    var svgCache = {};

    /**
     * Svg element that can be used as a placeholder for the icon if the icon does not exist on the server.
     * @type {*|jQuery|HTMLElement}
     * @private
     */
    var defaultSVG = $(DefaultSvgTemplate);


    SVGDecoratorCore = function () {
    };


    SVGDecoratorCore.prototype._initializeVariables = function (params) {
        this.name = "";
        this.formattedName = "";
        this.$name = undefined;

		this._displayConnectors = false;			
		if (params && params.connectors) {
			this._displayConnectors = params.connectors;			
		}
    };


    /**** Override from *.WidgetDecoratorBase ****/
    SVGDecoratorCore.prototype.doSearch = function (searchDesc) {
        var searchText = searchDesc.toString().toLowerCase();

        return (this.formattedName && this.formattedName.toLowerCase().indexOf(searchText) !== -1);
    };

    SVGDecoratorCore.prototype._renderContent = function () {
        //render GME-ID in the DOM, for debugging
        this.$el.attr({"data-id": this._metaInfo[CONSTANTS.GME_ID]});

        /* BUILD UI*/
        //find placeholders
        this.$name = this.$el.find(".name");
        this.$svgContent = this.$el.find(".svg-content");

		this._update();
    };
	
	SVGDecoratorCore.prototype._update = function () {
        this._updateColors();
        this._updateName();
        this._updateAbstract();
        this._updateSVGFile();
    };

    SVGDecoratorCore.prototype._updateColors = function () {
        this._getNodeColorsFromRegistry();

        if (this.fillColor) {
            this.$el.css({'background-color': this.fillColor});
        } else {
            this.$el.css({'background-color': ''});
        }

        if (this.borderColor) {
            this.$el.css({'border-color': this.borderColor,
                          'box-shadow': '0px 0px 7px 0px ' + this.borderColor + ' inset'});
            this.$name.css({'border-color': this.borderColor});
        } else {
            this.$el.css({'border-color': '',
                'box-shadow': ''});
            this.$name.css({'border-color': ''});
        }

        if (this.textColor) {
            this.$el.css({'color': this.textColor});
        } else {
            this.$el.css({'color': ''});
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
            noName = "(N/A)";

        if (nodeObj) {
            this.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name);
            this.formattedName = displayFormat.resolve(nodeObj);
        } else {
            this.name = "";
            this.formattedName = noName;
        }

        this.$name.text(this.formattedName);
        this.$name.attr("title", this.formattedName);
    };


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

    SVGDecoratorCore.prototype._updateSVGFile = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            svgFile = "",
            svgURL,
            self = this,
            logger = this.logger;

        if (nodeObj) {
            svgFile = nodeObj.getAttribute('svg');
        }

        var updateSVGContent = function (svg) {
            self.$svgContent.empty();
            self.$svgContent.append(self._getSVGContent(svg));
        };

        if (svgFile) {
            if (svgCache[svgFile]) {
                updateSVGContent(svgFile);
            } else {
                // get the svg from the server in SYNC mode, may take some time
                svgURL = SVG_DIR + svgFile;
                $.ajax(svgURL, {'async': false})
                    .done(function ( data ) {
                        // downloaded successfully
                        // cache the content
                        svgCache[svgFile] = $(data.childNodes[0]);
                        updateSVGContent(svgFile);
                    })
                    .fail(function () {
                        // download failed for this type
                        logger.error('Failed to download SVG file: ' + svgFile);
                        updateSVGContent(svgFile);
                    });
            }
        } else {
            updateSVGContent(undefined);
        }

    };

    SVGDecoratorCore.prototype._getSVGContent = function (svgFile) {
        if (svgCache[svgFile]) {
            return svgCache[svgFile].clone();
        } else {
            return defaultSVG.clone();
        }
    };

    return SVGDecoratorCore;
});