/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/Controls/iCheckBox',
        './ToolbarItemBase'], function (iCheckBox,
                                        ToolbarItemBase) {

    var ToolbarCheckBox;

    ToolbarCheckBox = function (params) {

        iCheckBox.apply(this, [params]);

        this.el.addClass("toolbar-checkbox");
    };

    _.extend(ToolbarCheckBox.prototype, iCheckBox.prototype);
    _.extend(ToolbarCheckBox.prototype, ToolbarItemBase.prototype);

    return ToolbarCheckBox;
});