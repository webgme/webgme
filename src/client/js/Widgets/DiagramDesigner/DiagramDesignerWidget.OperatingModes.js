/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */

"use strict";

define([], function () {

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
