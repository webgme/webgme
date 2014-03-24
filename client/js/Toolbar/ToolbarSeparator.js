/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

define(['./ButtonBase',
        './ToolbarItemBase'], function (buttonBase,
                                        ToolbarItemBase) {

    var ToolbarSeparator,
        EL_BASE = $('<div class="separator"></div>');

    ToolbarSeparator = function () {
        this.el = EL_BASE.clone();
    };

    _.extend(ToolbarSeparator.prototype, ToolbarItemBase.prototype);

    return ToolbarSeparator;
});