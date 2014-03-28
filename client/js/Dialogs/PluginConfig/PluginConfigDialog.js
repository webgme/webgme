/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */

"use strict";

define(['text!html/Dialogs/PluginConfig/PluginConfigDialog.html',
    'css!/css/Dialogs/PluginConfig/PluginConfigDialog'], function (pluginConfigDialogTemplate) {

    var PluginConfigDialog;

    PluginConfigDialog = function () {
    };

    PluginConfigDialog.prototype.show = function (pluginConfigs, fnCallback) {
        var self = this;

        this._fnCallback = fnCallback;

        this._initDialog(pluginConfigs);

        this._dialog.on('hidden', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;

            if (self._fnCallback && self._updateConfig) {
                self._fnCallback(self._updateConfig);
            }
        });

        this._dialog.modal('show');
    };

    PluginConfigDialog.prototype._closeAndSave = function (newConfigs) {
        this._updateConfig = newConfigs;
        this._dialog.modal('hide');
    };

    PluginConfigDialog.prototype._initDialog = function (pluginConfigs) {
        var self = this;

        this._dialog = $(pluginConfigDialogTemplate);

        this._btnSave = this._dialog.find('.btn-save');

        this._dialog.find('.modal-body').html(JSON.stringify(pluginConfigs, null, 2).replace(/\n/g, '<br>').replace(/  /g, '&nbsp;&nbsp;'));

        this._btnSave.on('click', function (event) {
            self._closeAndSave(pluginConfigs);
            event.stopPropagation();
            event.preventDefault();
        });
    };

    return PluginConfigDialog;
});