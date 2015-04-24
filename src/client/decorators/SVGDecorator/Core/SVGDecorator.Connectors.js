/*globals define, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author brollb / https://github.com/brollb
 */

define(['js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants'], function (DiagramDesignerWidgetConstants) {

    'use strict';

    var SVGDecoratorConnectors,
        CONNECTOR_BASE = $('<div class="' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS + '"/>');

    SVGDecoratorConnectors = function () {
    };

    SVGDecoratorConnectors.prototype._generateConnectors = function () {
        var svg = this.$svgElement,
            connectors = svg.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS),
            c,
            svgWidth = parseInt(svg.attr('width'), 10),
            svgHeight = parseInt(svg.attr('height'), 10);

        //check if there are any connectors defined in the SVG itself
        if (connectors.length === 0) {
            //no dedicated connectors
            //by default generate four: N, S, E, W

            //NORTH
            c = CONNECTOR_BASE.clone();
            c.addClass('cn');
            c.css({
                top: 0,
                left: svgWidth / 2
            });
            this.$el.append(c);

            //SOUTH
            c = CONNECTOR_BASE.clone();
            c.addClass('cs');
            c.css({
                top: svgHeight,
                left: svgWidth / 2
            });
            this.$el.append(c);

            //EAST
            c = CONNECTOR_BASE.clone();
            c.addClass('ce');
            c.css({
                top: svgHeight / 2,
                left: svgWidth
            });
            this.$el.append(c);

            //WEST
            c = CONNECTOR_BASE.clone();
            c.addClass('cw');
            c.css({
                top: svgHeight / 2,
                left: 0
            });
            this.$el.append(c);
        }

        this.initializeConnectors();
    };

    return SVGDecoratorConnectors;
});


