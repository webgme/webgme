/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

define(['./ButtonBase'], function (buttonBase) {

    var ToolbarGroupSeparator;

    ToolbarGroupSeparator = function () {

    };


    ToolbarGroupSeparator.prototype.addSeparator = function () {
        this.$el.append($('<div class="separator"></div>'));
    };


    return ToolbarGroupSeparator;
});