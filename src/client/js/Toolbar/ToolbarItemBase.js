/*globals define, _, requirejs, WebGMEGlobal*/

define([], function () {
    "use strict";

    var ToolbarItemBase;

    ToolbarItemBase = function () {
        this._toolbar = undefined;
    };

    ToolbarItemBase.prototype.show = function () {
        if (this.el) {
            this.el.show();
        }
    };

    ToolbarItemBase.prototype.hide = function () {
        if (this.el) {
            this.el.hide();
        }
    };

    ToolbarItemBase.prototype.enabled = function (enabled) {
    };

    ToolbarItemBase.prototype.destroy = function () {
        if (this.el) {
            this.el.remove();
            this.el.empty();
            this.el = undefined;
        }
    };

    return ToolbarItemBase;
});