/*globals define, _, requirejs, WebGMEGlobal*/

define(['js/Controls/ColorPicker',
        './ToolbarButton'], function (ColorPicker,
                                      ToolbarButton) {

    "use strict";

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