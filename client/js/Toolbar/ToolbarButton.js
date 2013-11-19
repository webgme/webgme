/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['./ButtonBase'], function (buttonBase) {

    var ToolbarButton;

    ToolbarButton = function (params) {
        this.el = $('<div class="toolbar-button"></div>');

        var btn = buttonBase.createButton(params);

        this.el.append(btn);
    };

    return ToolbarButton;
});