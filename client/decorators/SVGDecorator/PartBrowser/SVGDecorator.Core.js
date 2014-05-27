/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Brian Broll
 *
 * This file simply extends the features of the SVG that the panel 
 * will support. In this case, it is supporting ports and connections.
 */

"use strict";

define(['../Core/SVGDecorator.Core',
        '../Core/SVGDecorator.Connections',
        '../Core/SVGDecorator.Ports'], function (SVGDecoratorCore,
                                                 SVGDecoratorConnections,
                                                 SVGDecoratorPorts) {

    var SVGDecorator = function (options) {
        var opts = _.extend( {}, options);

        SVGDecoratorCore.apply(this, [opts]);
        
    };

    _.extend(SVGDecorator.prototype, SVGDecoratorCore.prototype);
    _.extend(SVGDecorator.prototype, SVGDecoratorPorts.prototype);
    _.extend(SVGDecorator.prototype, SVGDecoratorConnections.prototype);

    return SVGDecorator;

});
