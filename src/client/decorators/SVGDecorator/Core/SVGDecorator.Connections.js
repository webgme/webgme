/*globals define, $, _*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author brollb / https://github.com/brollb
 */


define([], function () {

    'use strict';

    var SVGDecoratorConnections,
        CONNECTION_AREA_CLASS = 'connection-area',
        DATA_ANGLE = 'angle',
        DATA_ANGLE1 = 'angle1',
        DATA_ANGLE2 = 'angle2',
        CONN_AREA_DEFAULTS = {};

    SVGDecoratorConnections = function () {
    };

    SVGDecoratorConnections.prototype.setConnectionAreaDefaults = function (attr) {
        CONN_AREA_DEFAULTS = attr;
    };

    SVGDecoratorConnections.prototype._getCustomConnectionAreas = function (svgFile) {
        var connAreas = this.svgCache[svgFile] ? this.svgCache[svgFile].customConnectionAreas : null,
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
                connA = {
                    id: line.attr('id'),
                    x1: parseInt(line.attr('x1'), 10) * ratio,
                    y1: parseInt(line.attr('y1'), 10) * ratio,
                    x2: parseInt(line.attr('x2'), 10) * ratio,
                    y2: parseInt(line.attr('y2'), 10) * ratio
                };

                //try to figure out meta info from the embedded SVG
                lineData = line.data();

                _.extend(connA, CONN_AREA_DEFAULTS);
                _.extend(connA, lineData);

                if (!lineData.hasOwnProperty(DATA_ANGLE) && !(lineData.hasOwnProperty(DATA_ANGLE1) &&
                    lineData.hasOwnProperty(DATA_ANGLE2))) {

                    dx = connA.x2 - connA.x1;
                    dy = connA.y2 - connA.y1;
                    if (dx !== 0 && dy !== 0) {
                        alpha = Math.atan(dy / dx) * (180 / Math.PI);
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


