/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['jquery',
        'jscolor',
        'js/Utils/ColorUtil',
        'css!/css/Controls/ColorPicker'], function (_jquery,
                              _jscolor,
                              colorUtil) {

    var ColorPicker,
        DISABLED_CLASS = 'disabled';

    ColorPicker = function () {
        var self = this;

        jscolor.binding = false;

        this.el = $('<input type="text" class="color-picker"/>');
        this._colorPicker = new jscolor.color(this.el[0], {'hash': true,
                                                            'pickerFace': 5});

        this.el.on('change', function (/*e*/) {
            self.onColorChanged(self.el.val());
        });

        this.el.on('blur', function(/*e*/) {
            setTimeout(function() {
                if (!jscolor.picker.owner) {
                    self.onEndColorPick();
                }
            }, 5);
        });
    };

    ColorPicker.prototype.setColor = function (color) {
        this._colorPicker.fromString(colorUtil.getHexColor(color));
    };

    ColorPicker.prototype.onColorChanged = function (color) {
    };

    ColorPicker.prototype.onEndColorPick = function () {
    };

    ColorPicker.prototype.setEnabled = function (isEnabled) {
        if (isEnabled) {
            this.el.removeClass(DISABLED_CLASS);
        } else {
            this.el.addClass(DISABLED_CLASS);
        }
    };

    return ColorPicker;
});