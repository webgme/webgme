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
        '../Core/SVGDecorator.Connections'], function (SNAP_CONSTANTS,
                                                       SVGDecoratorCore,
                                                       SVGDecoratorConnections) {


    var SVGDecorator = function (options) {
        var opts = _.extend( {}, options);

        SVGDecoratorCore.apply(this, [opts]);

        this.setConnectionAreaDefaults({'role': SNAP_CONSTANTS.CONN_RECEIVING,
                                        'ptr': '' });
        
    };

    _.extend(SVGDecorator.prototype, SVGDecoratorCore.prototype);
    _.extend(SVGDecorator.prototype, SVGDecoratorConnections.prototype);

    SVGDecorator.prototype.processCustomSvgData = function () {
        //Clean the line highlight data...
        var i = this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT].length,
            line;

        while (i--){
            if (this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i].tagName === 'line'){//Only support lines for now
                line = {};
                line.x1 = this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i].x1.baseVal.value;
                line.x2 = this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i].x2.baseVal.value;
                line.y1 = this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i].y1.baseVal.value;
                line.y2 = this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i].y2.baseVal.value;
                line.id = this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i].id;
                line.class = this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i].getAttribute('class');

                this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT][i] = line;
            } else {
                this[SNAP_CONSTANTS.CONNECTION_HIGHLIGHT].splice(i,1);
            }
        }
    };

    return SVGDecorator;

});
