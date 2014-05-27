/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Brian Broll
 *
 *
 * This file contains the connection relevant functions for the SVGDecorator.
 */

"use strict";

define(['js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants'], 
        function (DiagramDesignerWidgetConstants) {

    var SVGDecoratorConnections,
        CONNECTION_AREA_CLASS = 'connection-area',
        DATA_LEN = 'len',
        DATA_ANGLE = 'angle',
        DATA_ANGLE1 = 'angle1',
        DATA_ANGLE2 = 'angle2',
        DEFAULT_STEM_LENGTH = 20,
        CONNECTOR_BASE = $('<div class="' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS + '"/>');

    SVGDecoratorConnections = function(){
    };

    SVGDecoratorConnections.prototype._initializeConnVariables = function (params) {
        //Figure out how to name this nicely
        //TODO

		this._displayConnectors = false;			
		if (params && params.connectors) {
			this._displayConnectors = params.connectors;			
		}
    };

    SVGDecoratorConnections.prototype._generateConnectors = function () {
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

    SVGDecoratorConnections.prototype._getCustomConnectionAreas = function (svgFile) {
        var connAreas = this.svgCache[svgFile].customConnectionAreas,
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

    SVGDecoratorConnections.prototype._discoverCustomConnectionAreas = function (svgFile) {
        var svgElement = this.svgCache[svgFile].el,
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

            this.svgCache[svgFile].customConnectionAreas = [];
            customConnectionAreas = this.svgCache[svgFile].customConnectionAreas;

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

    return SVGDecoratorConnections;
});


