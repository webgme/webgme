/*globals define*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([], function () {

    'use strict';

    var DiagramDesignerWidgetOperatingModes;

    DiagramDesignerWidgetOperatingModes = function () {
    };

    DiagramDesignerWidgetOperatingModes.prototype.OPERATING_MODES = {
        READ_ONLY: 0,
        DESIGN: 1,
        HIGHLIGHT: 2
    };


    return DiagramDesignerWidgetOperatingModes;
});
