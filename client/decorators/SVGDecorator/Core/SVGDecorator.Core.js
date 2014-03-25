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
    'js/Decorators/DecoratorWithPorts.Base',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    './SVGPort',
    'text!./default.svg'], function (CONSTANTS,
                         nodePropertyNames,
                         REGISTRY_KEYS,
                         displayFormat,
                         DecoratorWithPortsBase,
                         DiagramDesignerWidgetConstants,
                         SVGPort,
                         DefaultSvgTemplate) {

    var SVGDecoratorCore,
        ABSTRACT_CLASS = 'abstract',
        SVG_DIR = CONSTANTS.ASSETS_DECORATOR_SVG_FOLDER,
        CONNECTION_AREA_CLASS = 'connection-area',
        DATA_LEN = 'len',
        DATA_ANGLE = 'angle',
        DATA_ANGLE1 = 'angle1',
        DATA_ANGLE2 = 'angle2',
        DEFAULT_STEM_LENGTH = 20,
        FILL_COLOR_CLASS = "fill-color",
        BORDER_COLOR_CLASS = "border-color",
        TEXT_COLOR_CLASS = "text-color",
        PORT_HEIGHT = 13,   //must be same as SVGDecorator.scss 's $port-height
        DEFAULT_SVG_DEFAULT_HEIGHT = 50,
        CONNECTOR_BASE = $('<div class="' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS + '"/>');


    /**
     * Contains downloaded svg elements from the server.
     * @type {{}}
     * @private
     */
    var svgCache = {};

    /**
     * Svg element that can be used as a placeholder for the icon if the icon does not exist on the server.
     * @type {*|jQuery}
     * @private
     */
    var defaultSVG = $(DefaultSvgTemplate);


    SVGDecoratorCore = function () {
        DecoratorWithPortsBase.apply(this, []);
    };

    _.extend(SVGDecoratorCore.prototype, DecoratorWithPortsBase.prototype);

    SVGDecoratorCore.prototype._initializeVariables = function (params) {
        this.name = "";
        this.formattedName = "";
        this.$name = undefined;
        this._PORT_HEIGHT = PORT_HEIGHT;

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
        this._updatePorts();
    };

    SVGDecoratorCore.prototype._updateColors = function () {
        var svg = this.$svgElement,
            fillColorElements = svg.find('.' + FILL_COLOR_CLASS),
            borderColorElements = svg.find('.' + BORDER_COLOR_CLASS),
            textColorElements = svg.find('.' + TEXT_COLOR_CLASS);

        this._getNodeColorsFromRegistry();

        if (this.fillColor) {
            fillColorElements.css({'fill': this.fillColor});
        } else {
            fillColorElements.css({'fill': ''});
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
            svgFile = nodeObj.getRegistry(REGISTRY_KEYS.SVG_ICON);
        }

        if (svgFile) {
            if (this._SVGFile !== svgFile) {
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
                                svgCache[svgFile] = { 'el': svgElements.first(),
                                                      'customConnectionAreas': undefined};
                                self._discoverCustomConnectionAreas(svgFile);
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
                this._SVGFile = svgFile;
            }
        } else {
            if (svgFile !== "") {
                logger.error('Invalid SVG file: "' + svgFile + '"');
                this._updateSVGContent(undefined);
            } else {
                this._updateSVGContent('');
            }
        }
    };

    SVGDecoratorCore.prototype._updateSVGContent = function (svg) {
        var svgIcon;
        //set new content
        this.$svgContent.empty();

        //remove existing connectors (if any)
        this.$el.find('> .' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS).remove();

        this._defaultSVGUsed = false;

        if (svgCache[svg]) {
            svgIcon = svgCache[svg].el.clone();
        } else {
            svgIcon = defaultSVG.clone();
            if (svg !== '') {
                $(svgIcon.find('text')).html('!!! ' + svg + ' !!!');
            } else {
                this._defaultSVGUsed = true;
            }

        }

        this.$svgElement = svgIcon;
        this._getCustomConnectionAreas(svg);
        this._generateConnectors();

        this.$svgContent.append(svgIcon);
    };

    SVGDecoratorCore.prototype._discoverCustomConnectionAreas = function (svgFile) {
        var svgElement = svgCache[svgFile].el,
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
            ratio = 1,
            customConnectionAreas;

        if (len > 0) {
            svgWidth = parseInt(svgElement.attr('width'), 10);
            viewBox = svgElement[0].getAttribute('viewBox');
            if (viewBox) {
                var vb0 = parseInt(viewBox.split(' ')[0], 10);
                var vb1 = parseInt(viewBox.split(' ')[2], 10);
                ratio = svgWidth / (vb1 - vb0);
            }

            svgCache[svgFile].customConnectionAreas = [];
            customConnectionAreas = svgCache[svgFile].customConnectionAreas;

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

                customConnectionAreas.push(connA);

                //finally remove the placeholder from the SVG
                line.remove();
            }
        }
    };

    SVGDecoratorCore.prototype._getCustomConnectionAreas = function (svgFile) {
        var connAreas = svgCache[svgFile].customConnectionAreas,
            len = connAreas ? connAreas.length : 0,
            connA;

        delete this._customConnectionAreas;

        if (len > 0) {
            this._customConnectionAreas = [];

            while (len--) {
                connA = {};

                _.extend(connA, connAreas[len]);

                this._customConnectionAreas.push(connA);
            }
        }
    };

    SVGDecoratorCore.prototype._generateConnectors = function () {
        var svg = this.$svgElement,
            connectors = svg.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS),
            c,
            svgWidth = parseInt(svg.attr('width'), 10),
            svgHeight = parseInt(svg.attr('height'), 10);

        if (this._displayConnectors === true) {
            //check if there are any connectors defined in the SVG itself
            if (connectors.length === 0) {
                //no dedicated connectors
                //by default generate four: N, S, E, W

                //NORTH
                c = CONNECTOR_BASE.clone();
                c.addClass('cn');
                c.css({'top': 0,
                       'left': svgWidth / 2});
                this.$el.append(c);

                //SOUTH
                c = CONNECTOR_BASE.clone();
                c.addClass('cs');
                c.css({'top': svgHeight,
                       'left': svgWidth / 2});
                this.$el.append(c);

                //EAST
                c = CONNECTOR_BASE.clone();
                c.addClass('ce');
                c.css({'top': svgHeight / 2,
                       'left': svgWidth});
                this.$el.append(c);

                //WEST
                c = CONNECTOR_BASE.clone();
                c.addClass('cw');
                c.css({'top': svgHeight / 2,
                    'left': 0});
                this.$el.append(c);
            }

            this.initializeConnectors();
        } else {
            connectors.remove();
        }
    };


    /***** UPDATE THE PORTS OF THE NODE *****/
    SVGDecoratorCore.prototype._updatePorts = function () {
        var svg = this.$svgElement,
            svgWidth = parseInt(svg.attr('width'), 10),
            halfW = svgWidth / 2;

        this._portContainerWidth = halfW;

        if (!this.$leftPorts) {
            this.$leftPorts = $('<div/>', {'class': 'ports ports-l'});
            this.$leftPorts.insertAfter(this.$svgContent);
        }
        this.$leftPorts.css({'width': halfW});

        if (!this.$rightPorts) {
            this.$rightPorts = $('<div/>', {'class': 'ports ports-r'});
            this.$rightPorts.insertAfter(this.$svgContent);
        }
        this.$rightPorts.css({'width': halfW,
                              'left': halfW});

        this.updatePortIDList();

        for (var i = 0; i < this.portIDs.length; i += 1) {
            this.ports[this.portIDs[i]].update();
        }

        this._updatePortPositions();
    };

    SVGDecoratorCore.prototype._fixPortContainerPosition = function (xShift) {
        this._portContainerXShift = xShift;
        this.$leftPorts.css('transform', 'translateX(' + xShift + 'px)');
        this.$rightPorts.css('transform', 'translateX(' + xShift + 'px)');
    };


    SVGDecoratorCore.prototype.renderPort = function (portId) {
        return new SVGPort({'id': portId,
            'logger': this.logger,
            'client': this._control._client,
            'decorator': this});
    };

    SVGDecoratorCore.prototype._updatePortPositions = function () {
        var leftPorts = [],
            rightPorts = [],
            i,
            RIGHT_POS_X = 300,
            TITLE_PADDING = 2,
            PORT_TOP_PADDING = 1,
            ports = this.ports,
            portSorter,
            portInstance;

        for (i = 0; i < this.portIDs.length; i += 1) {
            if (this.ports[this.portIDs[i]].positionX > RIGHT_POS_X) {
                rightPorts.push(this.portIDs[i]);
            } else {
                leftPorts.push(this.portIDs[i]);
            }
        }

        portSorter = function (a, b) {
            var portAY = ports[a].positionY,
                portBY = ports[b].positionY;

            return portAY - portBY;
        };

        //sort the left and right ports based on their Y position
        leftPorts.sort(portSorter);
        rightPorts.sort(portSorter);

        for (i = 0; i < leftPorts.length; i += 1) {
            portInstance = ports[leftPorts[i]];
            this.$leftPorts.append(portInstance.$el);
            portInstance.updateOrientation(true);
            portInstance.updateTop(PORT_TOP_PADDING + i * PORT_HEIGHT);
        }
        this.$leftPorts.css('height', leftPorts.length * PORT_HEIGHT);
        this.$leftPorts.find('.port > .title').css('left', TITLE_PADDING);
        this.$leftPorts.find('.port > .title').css('width', this._portContainerWidth - TITLE_PADDING);
        this.$leftPorts.find('.port > .icon').css('left', -PORT_HEIGHT);
        this.$leftPorts.find('.port > .' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS).css('left', -PORT_HEIGHT + 1);

        for (i = 0; i < rightPorts.length; i += 1) {
            portInstance = ports[rightPorts[i]];
            this.$rightPorts.append(portInstance.$el);
            portInstance.updateOrientation(false);
            portInstance.updateTop(PORT_TOP_PADDING + i * PORT_HEIGHT);
        }
        this.$rightPorts.css('height', rightPorts.length * PORT_HEIGHT);
        this.$rightPorts.find('.port > .title').css('right', -this._portContainerWidth + TITLE_PADDING);
        this.$rightPorts.find('.port > .title').css('width', this._portContainerWidth - TITLE_PADDING);
        this.$rightPorts.find('.port > .icon').css('left', this._portContainerWidth);
        this.$rightPorts.find('.port > .' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS).css('left', this._portContainerWidth);

        //store if we have ports on the left/right
        this._leftPorts = leftPorts.length > 0;
        this._rightPorts = rightPorts.length > 0;

        //fix default SVG's dimensions to sorround the ports
        //defaultSVG only, nothing else
        if (this._defaultSVGUsed === true) {
            var svg = this.$svgElement;
            var svgRect = svg.find('rect');
            var height = Math.max(leftPorts.length * PORT_HEIGHT, rightPorts.length * PORT_HEIGHT, DEFAULT_SVG_DEFAULT_HEIGHT);
            svg.attr('height', height);
            svgRect.attr('height', height - 1);

            var connectorSouth = this.$el.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS + '.cs');
            connectorSouth.css('top', height);
        }

        //remove left side connector if there is port there
        if (this._leftPorts) {
            var connectorWest = this.$el.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS + '.cw');
            connectorWest.css('top', height / 2);
            connectorWest.remove();
        }

        //remove right side connector if there is port there
        if (this._rightPorts) {
            var connectorEast = this.$el.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS + '.ce');
            connectorEast.css('top', height / 2);
            connectorEast.remove();
        }
    };


    SVGDecoratorCore.prototype._updatePort = function (portId) {
        var isPort = this.isPort(portId);

        if (this.ports[portId]) {
            //port already, should it stay?
            if (isPort === true) {
                this.ports[portId].update();
            } else {
                this.removePort(portId);
            }
        } else {
            this.addPort(portId);
            //if it became a port, update it
            if (this.ports[portId]) {
                this.ports[portId].update();
            }
        }

        this._updatePortPositions();
    };

    return SVGDecoratorCore;
});