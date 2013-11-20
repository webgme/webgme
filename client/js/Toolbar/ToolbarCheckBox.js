/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/Controls/iCheckBox'], function (iCheckBox) {

    var ToolbarCheckBox;

    ToolbarCheckBox = function (params) {

        iCheckBox.apply(this, [params]);

        this.el.addClass("toolbar-checkbox");
    };

    _.extend(ToolbarCheckBox.prototype, iCheckBox.prototype);

    return ToolbarCheckBox;
});