/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/Controls/ColorPicker',
        './ToolbarItemBase'], function (ColorPicker,
                                        ToolbarItemBase) {

    var ToolbarColorPicker;

    ToolbarColorPicker = function (params) {
        var self = this;

        this.el = $('<div/>', {
            "class": "toolbar-colorpicker"
        });

        this._colorPicker = new ColorPicker();
        this._colorPicker.onColorChanged = function (color) {
            if (params && params.colorChangedFn) {
                params.colorChangedFn.call(self, color);
            }
        };

        this._colorPicker.el.addClass('input-mini');
        this.el.append(this._colorPicker.el);
    };

    _.extend(ToolbarColorPicker.prototype, ToolbarItemBase.prototype);

    ToolbarColorPicker.prototype.enabled = function (enabled) {
        if (enabled === true) {
            this._colorPicker.el.removeAttr('disabled');
        } else {
            this._colorPicker.el.attr('disabled', 'disabled')
        }
    };

    return ToolbarColorPicker;
});