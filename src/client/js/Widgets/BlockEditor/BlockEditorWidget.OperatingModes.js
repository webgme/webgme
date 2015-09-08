/*globals define*/
/*jshint browser: true*/

/**
 * @author brollb / https://github/brollb
 */

define([], function () {

    'use strict';

    var BlockEditorWidgetOperatingModes;

    BlockEditorWidgetOperatingModes = function () {
    };

    BlockEditorWidgetOperatingModes.prototype.OPERATING_MODES = {
        READ_ONLY: 0,
        DESIGN: 1,
        HIGHLIGHT: 2
    };


    return BlockEditorWidgetOperatingModes;
});
