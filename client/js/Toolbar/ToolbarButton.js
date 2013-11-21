/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['./ButtonBase',
        './ToolbarItemBase'], function (buttonBase,
                                        ToolbarItemBase) {

    var ToolbarButton;

    ToolbarButton = function (params) {
        this.el = $('<div class="toolbar-button"></div>');

        this._btn = buttonBase.createButton(params);

        this.el.append(this._btn);
    };

    _.extend(ToolbarButton.prototype, ToolbarItemBase.prototype);

    ToolbarButton.prototype.enabled = function (enabled) {
        this._btn.enabled(enabled);
    };

    return ToolbarButton;
});