/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/Controls/ColorPicker',
        './ToolbarButton'], function (ColorPicker,
                                      ToolbarButton) {

    var ToolbarColorPicker;

    ToolbarColorPicker = function (params) {
        var self = this;

        params = params || {};
        params.clickFn = function (/*data*/) {
            var _colorPicker = new ColorPicker({'el': self.el});
            _colorPicker.onColorChanged = function (color) {
                if (params && params.colorChangedFn) {
                    params.colorChangedFn.call(self, color);
                }
            };
        };

        ToolbarButton.apply(this, [params]);
    };

    _.extend(ToolbarColorPicker.prototype, ToolbarButton.prototype);

    return ToolbarColorPicker;
});