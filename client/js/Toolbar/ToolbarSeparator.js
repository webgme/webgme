/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

define(['./ButtonBase',
        './ToolbarItemBase'], function (buttonBase,
                                        ToolbarItemBase) {

    var ToolbarSeparator;

    ToolbarSeparator = function () {
        this.el = $('<div class="separator"></div>');
    };

    _.extend(ToolbarSeparator.prototype, ToolbarItemBase.prototype);

    return ToolbarSeparator;
});