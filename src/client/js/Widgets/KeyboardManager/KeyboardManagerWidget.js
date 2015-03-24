/*globals define, _, requirejs, WebGMEGlobal*/

define(['common/LogManager',
    'js/Controls/iCheckBox'], function (logManager,
                                        iCheckBox) {

    "use strict";

    var KeyboardManagerWidget;

    KeyboardManagerWidget = function (containerEl) {
        this._logger = logManager.create("KeyboardManagerWidget");

        this._el = containerEl;

        //initialize UI
        this._initializeUI();

        this._logger.debug("Created");
    };

    KeyboardManagerWidget.prototype._initializeUI = function () {
        this.__checkbox = new iCheckBox({
            "checkedText": 'ON',
            "uncheckedText": 'OFF',
            "icon": "gme icon-gme_keyboard",
            "checkChangedFn": function (data, isChecked) {
                WebGMEGlobal.KeyboardManager.setEnabled(isChecked);
            }});

        //this.__checkbox.setChecked(false);

        this._el.append(this.__checkbox.el);

    };



    return KeyboardManagerWidget;
});