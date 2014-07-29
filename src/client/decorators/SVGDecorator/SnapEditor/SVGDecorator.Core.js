/*globals define,_*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * @author brollb / https://github/brollb
 *
 * This file simply extends the features of the SVG that the panel 
 * will support. 
 * 
 */

define(['js/Widgets/SnapEditor/SnapEditorWidget.Constants',
        '../Core/SVGDecorator.Core',
        '../Core/SVGDecorator.Connections'], function (SNAP_CONSTANTS,
                                                       SVGDecoratorCore,
                                                       SVGDecoratorConnections) {


    "use strict";

    /**
     * SVGDecorator constructor
     *
     * @constructor
     * @param {Object} options
     */
    var SVGDecorator = function (options) {
        var opts = _.extend( {}, options);

        SVGDecoratorCore.apply(this, [opts]);

        this.setConnectionAreaDefaults({'role': SNAP_CONSTANTS.CONN_RECEIVING,
                                        'ptr': '' });
        
    };

    _.extend(SVGDecorator.prototype, SVGDecoratorCore.prototype);
    _.extend(SVGDecorator.prototype, SVGDecoratorConnections.prototype);

    /**
     * Process the custom data retrieved from the svg.
     *
     * @return {undefined}
     */
    SVGDecorator.prototype.processCustomSvgData = function () {
        var customDataElement;

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
        
        //Record the default measurements for various stretch areas by ptrName
        var w = 0,
            h = 0;

        i = this[SNAP_CONSTANTS.INITIAL_MEASURE].length;
        while (i--){
            if (this[SNAP_CONSTANTS.INITIAL_MEASURE][i].tagName === 'line'){
                //get line values
                line = {};
                line.x1 = this[SNAP_CONSTANTS.INITIAL_MEASURE][i].x1.baseVal.value;
                line.x2 = this[SNAP_CONSTANTS.INITIAL_MEASURE][i].x2.baseVal.value;
                line.y1 = this[SNAP_CONSTANTS.INITIAL_MEASURE][i].y1.baseVal.value;
                line.y2 = this[SNAP_CONSTANTS.INITIAL_MEASURE][i].y2.baseVal.value;

                //Record the measurements
                w = line.x2 - line.x1;
                h = line.y2 - line.y1;
            } else if (this[SNAP_CONSTANTS.INITIAL_MEASURE][i].tagName === 'rect'){
                w = this[SNAP_CONSTANTS.INITIAL_MEASURE][i].width.baseVal.value;
                h = this[SNAP_CONSTANTS.INITIAL_MEASURE][i].height.baseVal.value;
            }

            this.svgInitialStretch[this[SNAP_CONSTANTS.INITIAL_MEASURE][i].getAttribute('data-ptr')] = { x: w, y: h };

        }

        //Find the input areas and store them
        var type,
            attribute,
            content,
            target,
            input,
            x,
            y;

        //DOM section for input fields
        this.inputFieldUpdates = {};//input field updates to receive
        this.inputFields = {};
        this._inputFields2Update = {};

        for (i = this[SNAP_CONSTANTS.INPUT_FIELDS].length-1; i >=0; i--){
            customDataElement = this[SNAP_CONSTANTS.INPUT_FIELDS][i];
            //Populate input fields
            type = customDataElement.getAttribute('data-type');
            attribute = customDataElement.getAttribute('data-attribute');

            //Get location and size of the inputField
            x = parseFloat(customDataElement.getAttribute('x'));
            y = parseFloat(customDataElement.getAttribute('y'));
            w = parseFloat(customDataElement.getAttribute('width'));
            h = parseFloat(customDataElement.getAttribute('height'));
 
            //Get the content
            switch (type) {
                case SNAP_CONSTANTS.TEXT_FIELD.NAME:
                    input = $('<input type="text"/>');
                    content = SNAP_CONSTANTS.TEXT_FIELD.CONTENT.TEXT;
                    break;

                case SNAP_CONSTANTS.DROPDOWN.NAME:
                    input = $('<select/>');
                    content = customDataElement.getAttribute('data-content');
                    target = customDataElement.getAttribute('data-target');
                    break;
                
                default:
                this.logger.warn("Will not be able to populate dropdown menu for " + attribute);
            }

            //Create the record the update
            this.inputFieldUpdates[attribute] = { content: content, type: type };

            if (target){
                this.inputFieldUpdates[attribute].target = target;
            }

            //Create the data record
            this.inputFields[attribute] = { x: x, y: y, width: w, height: h, type: type, visible: true};

            //Add item to list of items to update
            this._inputFields2Update[attribute] = true;
        }
    };

    return SVGDecorator;

});
