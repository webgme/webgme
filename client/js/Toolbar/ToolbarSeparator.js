/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

define(['./ButtonBase'], function (buttonBase) {

    var ToolbarSeparator;

    ToolbarSeparator = function () {
        this.el = $('<div class="separator"></div>');
    };

    return ToolbarSeparator;
});