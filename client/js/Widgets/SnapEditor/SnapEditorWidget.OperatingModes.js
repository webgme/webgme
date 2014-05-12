/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Brian Broll
 */

"use strict";

define([], function () {

    var SnapEditorWidgetOperatingModes;

    SnapEditorWidgetOperatingModes = function () {
    };

    SnapEditorWidgetOperatingModes.prototype.OPERATING_MODES = {
        READ_ONLY: 0,
        DESIGN: 1,
        HIGHLIGHT: 2
    };


    return SnapEditorWidgetOperatingModes;
});
