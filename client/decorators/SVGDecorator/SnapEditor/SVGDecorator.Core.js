/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Brian Broll
 *
 * This file simply extends the features of the SVG that the panel 
 * will support. 
 * 
 */

"use strict";

define(['js/Widgets/SnapEditor/SnapEditorWidget.Constants',
        '../Core/SVGDecorator.Core',
        '../Core/SVGDecorator.Connections'], function (CONSTANTS,
                                                       SVGDecoratorCore,
                                                       SVGDecoratorConnections) {


    var SVGDecorator = function (options) {
        var opts = _.extend( {}, options);

        SVGDecoratorCore.apply(this, [opts]);

        this.setConnectionAreaDefaults({'role': CONSTANTS.CONN_RECEIVING,
                                        'ptr': '' });
        
    };

    _.extend(SVGDecorator.prototype, SVGDecoratorCore.prototype);
    _.extend(SVGDecorator.prototype, SVGDecoratorConnections.prototype);

    return SVGDecorator;

});
