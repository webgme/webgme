/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/logger',
    'js/Controls/iCheckBox'
], function (Logger, ICheckBox) {

    'use strict';

    var KeyboardManagerWidget;

    KeyboardManagerWidget = function (containerEl) {
        this._logger = Logger.create('gme:Widgets:KeyboardManager:KeyboardManagerWidget',
            WebGMEGlobal.gmeConfig.client.log);

        this._el = containerEl;

        //initialize UI
        this._initializeUI();

        this._logger.debug('Created');
    };

    KeyboardManagerWidget.prototype._initializeUI = function () {
        this.__checkbox = new ICheckBox({
            checkedText: 'ON',
            uncheckedText: 'OFF',
            icon: 'gme icon-gme_keyboard',
            checkChangedFn: function (data, isChecked) {
                WebGMEGlobal.KeyboardManager.setEnabled(isChecked);
            }
        });

        //this.__checkbox.setChecked(false);

        this._el.append(this.__checkbox.el);

    };


    return KeyboardManagerWidget;
});