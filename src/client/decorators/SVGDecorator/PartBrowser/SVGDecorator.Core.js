/*globals define, _*/
/*jshint browser: true*/

/**
 * This file simply extends the features of the SVG that the panel
 * will support. In this case, it is supporting ports and connections.
 *
 * @author brollb / https://github/brollb
 */


define([
    '../Core/SVGDecorator.Core',
    '../Core/SVGDecorator.Connections',
    '../Core/SVGDecorator.Connectors',
    '../Core/SVGDecorator.Ports'
], function (SVGDecoratorCore, SVGDecoratorConnections, SVGDecoratorConnectors, SVGDecoratorPorts) {

    'use strict';
    var SVGDecorator = function (options) {
        var opts = _.extend({}, options);

        SVGDecoratorCore.apply(this, [opts]);

        this.setConnectionAreaDefaults({
            angle1: 0,
            angle2: 0,
            len: 20
        });

    };

    _.extend(SVGDecorator.prototype, SVGDecoratorCore.prototype);
    _.extend(SVGDecorator.prototype, SVGDecoratorPorts.prototype);
    _.extend(SVGDecorator.prototype, SVGDecoratorConnections.prototype);

    return SVGDecorator;

});
