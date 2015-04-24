/*globals define, _ */
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/Controls/ColorPicker', './ToolbarButton'], function (ColorPicker, ToolbarButton) {

    'use strict';

    var ToolbarColorPicker;

    ToolbarColorPicker = function (params) {
        var self = this;

        params = params || {};
        params.clickFn = function (/*data*/) {
            var colorPicker = new ColorPicker({'el': self.el});
            colorPicker.onColorChanged = function (color) {
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