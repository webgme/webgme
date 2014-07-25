/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['./ButtonBase',
        './ToolbarItemBase'], function (buttonBase,
                                        ToolbarItemBase) {

    var ToolbarToggleButton,
        EL_BASE = $('<div class="toolbar-button"></div>');

    ToolbarToggleButton = function (params) {
        var oClickFn = params.clickFn,
            toggleClickFn,
            btn;

        toggleClickFn = function (data) {
            btn.toggleClass('active');
            if (oClickFn) {
                oClickFn.call(this, data, btn.hasClass('active'));
            }
        };

        params.clickFn = toggleClickFn;
        btn = this._btn = buttonBase.createButton(params);

        this.el = EL_BASE.clone();
        this.el.append(this._btn);
    };

    _.extend(ToolbarToggleButton.prototype, ToolbarItemBase.prototype);

    ToolbarToggleButton.prototype.setToggled = function (toggled) {
        this._btn.removeClass('active');
        if (toggled === true) {
            this._btn.addClass('active');
        }
    };

    return ToolbarToggleButton;
});