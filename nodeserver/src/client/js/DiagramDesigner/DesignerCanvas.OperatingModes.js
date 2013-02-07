"use strict";

define([], function () {

    var DesignerCanvasOperatingModes;

    DesignerCanvasOperatingModes = function () {
    };

    DesignerCanvasOperatingModes.prototype.OPERATING_MODES = {
        READ_ONLY: 0,
        NORMAL: 1,
        RUBBERBAND_SELECTION: 2,
        MOVE_ITEMS: 3,
        COPY_ITEMS: 4,
        CREATE_CONNECTION: 5,
        RECONNECT_CONNECTION: 6,
        EDIT_SET: 7
    };

    DesignerCanvasOperatingModes.prototype.beginMode = function (mode) {
        if (this.mode !== mode) {
            this._omode = this.mode;
            this.mode = mode;
            this._callBeginModeDelegate();
        }
    };

    DesignerCanvasOperatingModes.prototype.endMode = function (mode) {
        if (this.mode === mode) {
            if (this._omode) {
                this.mode = this._omode;
                delete this._omode;
            }
        }
    };

    DesignerCanvasOperatingModes.prototype.addBeginModeHandler = function (mode, fn) {
        this._operatingModeCallBackHandlers = this._operatingModeCallBackHandlers || {};

        this._operatingModeCallBackHandlers[mode] = fn;
    };

    DesignerCanvasOperatingModes.prototype.removeBeginModeHandler = function (mode) {
        this._operatingModeCallBackHandlers = this._operatingModeCallBackHandlers || {};

        delete this._operatingModeCallBackHandlers[mode];
    };

    DesignerCanvasOperatingModes.prototype._callBeginModeDelegate = function () {
        var fn = this._operatingModeCallBackHandlers ? this._operatingModeCallBackHandlers[this.mode] : undefined;

        if (fn) {
            fn.call(this);
        }
    };

    return DesignerCanvasOperatingModes;
});
