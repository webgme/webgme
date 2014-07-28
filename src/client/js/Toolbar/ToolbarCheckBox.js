/*globals define, _, requirejs, WebGMEGlobal*/

define(['js/Controls/iCheckBox',
        './ToolbarItemBase'], function (iCheckBox,
                                        ToolbarItemBase) {
    "use strict";

    var ToolbarCheckBox;

    ToolbarCheckBox = function (params) {

        iCheckBox.apply(this, [params]);

        this.el.addClass("toolbar-checkbox");
    };

    _.extend(ToolbarCheckBox.prototype, iCheckBox.prototype);
    _.extend(ToolbarCheckBox.prototype, ToolbarItemBase.prototype);

    return ToolbarCheckBox;
});