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
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    'text!./default.svg'], function (CONSTANTS,
                         nodePropertyNames,
                         REGISTRY_KEYS,
                         displayFormat,
                         DiagramDesignerWidgetConstants,
                         DefaultSvgTemplate) {

    var SVGDecoratorCore,
        ABSTRACT_CLASS = 'abstract',
        SVG_DIR = '/decorators/SVGDecorator/SVG/',
        CONNECTION_AREA_CLASS = 'connection-area',
        DATA_LEN = 'len',
        DATA_ANGLE = 'angle',
        DATA_ANGLE1 = 'angle1',
        DATA_ANGLE2 = 'angle2',
        DEFAULT_STEM_LENGTH = 20,
        FILL_COLOR_CLASS = "fill-color",
        BORDER_COLOR_CLASS = "border-color",
        TEXT_COLOR_CLASS = "text-color";


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
        this._updateSVGFile();
        this._updateColors();
        this._updateName();
        this._updateAbstract();
    };

    SVGDecoratorCore.prototype._updateColors = function () {
        var svg = this.$svgContent.find('svg'),
            fillColorElements = svg.find('.' + FILL_COLOR_CLASS),
            borderColorElements = svg.find('.' + BORDER_COLOR_CLASS),
            textColorElements = svg.find('.' + TEXT_COLOR_CLASS);

        this._getNodeColorsFromRegistry();

        if (this.fillColor) {
            fillColorElements.css({'fill': this.fillColor});
        } else {
            this.$el.css({'fill': ''});
        }

        if (this.borderColor) {
            borderColorElements.css({'stroke': this.borderColor});
        } else {
            borderColorElements.css({'stroke': ''});
        }

        if (this.textColor) {
            this.$el.css({'color': this.textColor});
            textColorElements.css({'fill': this.textColor});
        } else {
            this.$el.css({'color': ''});
            textColorElements.css({'fill': ''});
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

        if (this._SVGFile !== svgFile) {
            if (svgFile) {
                if (svgCache[svgFile]) {
                    this._updateSVGContent(svgFile);
                } else {
                    // get the svg from the server in SYNC mode, may take some time
                    svgURL = SVG_DIR + svgFile;
                    $.ajax(svgURL, {'async': false})
                        .done(function ( data ) {
                            // downloaded successfully
                            // cache the content if valid
                            var svgElements = $(data).find('svg');
                            if (svgElements.length > 0) {
                                svgCache[svgFile] = svgElements.first();
                                self._updateSVGContent(svgFile);
                            } else {
                                self._updateSVGContent(undefined);
                            }
                        })
                        .fail(function () {
                            // download failed for this type
                            logger.error('Failed to download SVG file: ' + svgFile);
                            self._updateSVGContent(svgFile);
                        });
                }
            } else {
                logger.error('Invalid SVG file: "' + svgFile + '"');
                this._updateSVGContent(undefined);
            }
            this._SVGFile = svgFile;
        }
    };

    SVGDecoratorCore.prototype._updateSVGContent = function (svg) {
        var svgIcon;
        //set new content
        this.$svgContent.empty();

        //remove existing connectors (if any)
        this.$el.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS).remove();

        if (svgCache[svg]) {
            svgIcon = svgCache[svg].clone();
        } else {
            svgIcon = defaultSVG.clone();
            $(svgIcon.find('text')).html('!!! ' + svg + ' !!!');
        }

        this.$svgContent.append(svgIcon);

        this._discoverConnectionAreas();
        this._generateConnectors();
    };

    SVGDecoratorCore.prototype._discoverConnectionAreas = function () {
        var svgElement = this.$svgContent.find('svg'),
            connAreas = svgElement.find('.' + CONNECTION_AREA_CLASS),
            len = connAreas.length,
            line,
            connA,
            lineData,
            dx,
            dy,
            alpha,
            svgWidth,
            viewBox,
            ratio = 1;

        svgWidth = parseInt(svgElement.attr('width'), 10);
        viewBox = svgElement[0].getAttribute('viewBox');
        if (viewBox) {
            var vb0 = parseInt(viewBox.split(' ')[0], 10);
            var vb1 = parseInt(viewBox.split(' ')[2], 10);
            ratio = svgWidth / (vb1 - vb0);
        }

        delete this._customConnectionAreas;

        if (len > 0) {
            this._customConnectionAreas = [];

            while (len--) {
                line = $(connAreas[len]);
                connA = {"id": line.attr('id'),
                    "x1": parseInt(line.attr('x1'), 10) * ratio,
                    "y1": parseInt(line.attr('y1'), 10) * ratio,
                    "x2": parseInt(line.attr('x2'), 10) * ratio,
                    "y2": parseInt(line.attr('y2'), 10) * ratio,
                    "angle1": 0,
                    "angle2": 0,
                    "len": DEFAULT_STEM_LENGTH};

                //try to figure out meta info from the embedded SVG
                lineData = line.data();

                if (lineData.hasOwnProperty(DATA_LEN)) {
                    connA.len = parseInt(lineData[DATA_LEN], 10) * ratio;
                }

                if (lineData.hasOwnProperty(DATA_ANGLE)) {
                    connA.angle1 = parseInt(lineData[DATA_ANGLE], 10);
                    connA.angle2 = parseInt(lineData[DATA_ANGLE], 10);
                }

                if (lineData.hasOwnProperty(DATA_ANGLE1)) {
                    connA.angle1 = parseInt(lineData[DATA_ANGLE1], 10);
                }

                if (lineData.hasOwnProperty(DATA_ANGLE2)) {
                    connA.angle2 = parseInt(lineData[DATA_ANGLE2], 10);
                }

                if (!lineData.hasOwnProperty(DATA_ANGLE) &&
                    !(lineData.hasOwnProperty(DATA_ANGLE1) && lineData.hasOwnProperty(DATA_ANGLE2))) {
                    dx = connA.x2 - connA.x1;
                    dy = connA.y2 - connA.y1;
                    if (dx !== 0 && dy !== 0) {
                        alpha = Math.atan(dy / dx) * (180/Math.PI);
                        if (dx > 0) {
                            alpha = 270 + alpha;
                        } else if (dx < 0) {
                            alpha = 90 + alpha;
                        }
                    } else if (dx === 0 && dy !== 0) {
                        //conn area is vertical
                        alpha = dy > 0 ? 0 : 180;
                    } else if (dx !== 0 && dy === 0) {
                        //conn area is horizontal
                        alpha = dx > 0 ? 270 : 90;
                    }

                    connA.angle1 = alpha;
                    connA.angle2 = alpha;
                }

                this._customConnectionAreas.push(connA);

                //finally remove the placeholder from the SVG
                line.remove();
            }
        }

    };

    SVGDecoratorCore.prototype._generateConnectors = function () {
        var connectors = this.$svgContent.find('svg').find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS),
            c,
            svg = this.$svgContent.find('svg'),
            svgWidth = parseInt(svg.attr('width'), 10),
            svgHeight = parseInt(svg.attr('height'), 10);

        if (this._displayConnectors === true) {
            //check if there are any connectors defined in the SVG itself
            if (connectors.length === 0) {
                //no dedicated connectors
                //by default generate four: N, S, E, W

                //NORTH
                c = $('<div/>', { class: 'connector' });
                c.css({'top': 0,
                       'left': svgWidth / 2});
                this.$el.append(c);

                //SOUTH
                c = $('<div/>', { class: 'connector' });
                c.css({'top': svgHeight,
                       'left': svgWidth / 2});
                this.$el.append(c);

                //EAST
                c = $('<div/>', { class: 'connector' });
                c.css({'top': svgHeight / 2,
                       'left': svgWidth});
                this.$el.append(c);

                //WEST
                c = $('<div/>', { class: 'connector' });
                c.css({'top': svgHeight / 2,
                    'left': 0});
                this.$el.append(c);
            }

            this.initializeConnectors();
        } else {
            connectors.remove();
        }
    };

    return SVGDecoratorCore;
});