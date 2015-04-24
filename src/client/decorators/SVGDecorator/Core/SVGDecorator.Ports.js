/*globals define, _, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github/rkereskenyi
 * @author brollb / https://github/brollb
 */

define([
    'js/Decorators/DecoratorWithPorts.Base',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    './SVGPort'
], function (DecoratorWithPortsBase, DiagramDesignerWidgetConstants, SVGPort) {

    'use strict';

    var SVGDecoratorPorts,
        PORT_HEIGHT = 13,   //must be same as SVGDecorator.scss 's $port-height
        DEFAULT_SVG_DEFAULT_HEIGHT = 50;

    SVGDecoratorPorts = function () {
        DecoratorWithPortsBase.apply(this, []);
    };

    _.extend(SVGDecoratorPorts.prototype, DecoratorWithPortsBase.prototype);

    SVGDecoratorPorts.prototype._initializePortVariables = function (/*params*/) {
        this._PORT_HEIGHT = PORT_HEIGHT;
    };

    SVGDecoratorPorts.prototype._updatePorts = function () {
        var svg = this.$svgElement,
            svgWidth = parseInt(svg.attr('width'), 10),
            halfW = svgWidth / 2;

        this._portContainerWidth = halfW;

        if (!this.$leftPorts) {
            this.$leftPorts = $('<div/>', {class: 'ports ports-l'});
            this.$leftPorts.insertAfter(this.$svgContent);
        }
        this.$leftPorts.css({width: halfW});

        if (!this.$rightPorts) {
            this.$rightPorts = $('<div/>', {class: 'ports ports-r'});
            this.$rightPorts.insertAfter(this.$svgContent);
        }
        this.$rightPorts.css({
            width: halfW,
            left: halfW
        });

        this.updatePortIDList();

        for (var i = 0; i < this.portIDs.length; i += 1) {
            this.ports[this.portIDs[i]].update();
        }

        this._updatePortPositions();
    };

    SVGDecoratorPorts.prototype._fixPortContainerPosition = function (xShift) {
        this._portContainerXShift = xShift;
        this.$leftPorts.css('transform', 'translateX(' + xShift + 'px)');
        this.$rightPorts.css('transform', 'translateX(' + xShift + 'px)');
    };


    SVGDecoratorPorts.prototype.renderPort = function (portId) {
        return new SVGPort({
            id: portId,
            logger: this.logger,
            client: this._control._client,
            decorator: this
        });
    };

    SVGDecoratorPorts.prototype._updatePortPositions = function () {
        var leftPorts = [],
            rightPorts = [],
            i,
            RIGHT_POS_X = 300,
            TITLE_PADDING = 2,
            PORT_TOP_PADDING = 1,
            ports = this.ports,
            portSorter,
            portInstance,

            svg,
            svgRect,
            height,

            connectorSouth,
            connectorWest,
            connectorEast;

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

        this.$leftPorts.find('.port > .' +
        DiagramDesignerWidgetConstants.CONNECTOR_CLASS).css('left', -PORT_HEIGHT + 1);

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

        this.$rightPorts.find('.port > .' +
        DiagramDesignerWidgetConstants.CONNECTOR_CLASS).css('left', this._portContainerWidth);

        //store if we have ports on the left/right
        this._leftPorts = leftPorts.length > 0;
        this._rightPorts = rightPorts.length > 0;
        height = Math.max(leftPorts.length * PORT_HEIGHT, rightPorts.length * PORT_HEIGHT, DEFAULT_SVG_DEFAULT_HEIGHT);

        height = Math.max(leftPorts.length * PORT_HEIGHT, rightPorts.length * PORT_HEIGHT, DEFAULT_SVG_DEFAULT_HEIGHT);

        //fix default SVG's dimensions to sorround the ports
        //defaultSVG only, nothing else

        if (this._defaultSVGUsed === true) {
            svg = this.$svgElement;
            svgRect = svg.find('rect');
            svg.attr('height', height);
            svgRect.attr('height', height - 1);

            connectorSouth = this.$el.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS + '.cs');
            connectorSouth.css('top', height);
        }

        //remove left side connector if there is port there
        if (this._leftPorts) {
            connectorWest = this.$el.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS + '.cw');
            connectorWest.css('top', height / 2);
            connectorWest.remove();
        }

        //remove right side connector if there is port there
        if (this._rightPorts) {
            connectorEast = this.$el.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS + '.ce');
            connectorEast.css('top', height / 2);
            connectorEast.remove();
        }
    };


    SVGDecoratorPorts.prototype._updatePort = function (portId) {
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

    return SVGDecoratorPorts;
});

