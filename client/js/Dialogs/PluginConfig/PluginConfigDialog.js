/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */

"use strict";

define(['text!html/Dialogs/PluginConfig/PluginConfigDialog.html',
    'css!/css/Dialogs/PluginConfig/PluginConfigDialog'], function (pluginConfigDialogTemplate) {

    var PluginConfigDialog,
        PLUGIN_DATA_KEY = 'plugin',
        ATTRIBUTE_DATA_KEY = 'attribute';

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

            if (self._fnCallback && self._updatedConfig) {
                self._fnCallback(self._updatedConfig);
            }
        });

        this._dialog.modal('show');
    };

    PluginConfigDialog.prototype._closeAndSave = function (newConfigs) {
        this._updatedConfig = newConfigs;
        this._dialog.modal('hide');
    };

    var PLUGIN_CONFIG_SECTION_BASE = $('<div><fieldset><legend></legend><div class="form-horizontal"></div><fieldset></div>');
    PluginConfigDialog.prototype._initDialog = function (pluginConfigs) {
        var self = this;
        var pluginSectionEl;

        this._dialog = $(pluginConfigDialogTemplate);

        this._btnSave = this._dialog.find('.btn-save');

        this._divContainer = this._dialog.find('.modal-body');

        //this._dialog.find('.modal-body').html(JSON.stringify(pluginConfigs, null, 2).replace(/\n/g, '<br>').replace(/  /g, '&nbsp;&nbsp;'));

        this._btnSave.on('click', function (event) {
            var pluginConfigs = self._readConfig();
            self._closeAndSave(pluginConfigs);
            event.stopPropagation();
            event.preventDefault();
        });

        for (var p in pluginConfigs) {
            if (pluginConfigs.hasOwnProperty(p)) {
                pluginSectionEl = PLUGIN_CONFIG_SECTION_BASE.clone();
                pluginSectionEl.data(PLUGIN_DATA_KEY, p);
                pluginSectionEl.find('legend').text('Plugin: ' + p);
                this._divContainer.append(pluginSectionEl);
                this._generatePluginSection(p, pluginConfigs[p], pluginSectionEl.find('.form-horizontal'));
            }
        }
    };

    var ENTRY_BASE = $('<div class="control-group"><label class="control-label" for="inputID">NAME</label><div class="controls"><input type="text" id="inputID"></div></div>');
    PluginConfigDialog.prototype._generatePluginSection = function (pluginName, pluginConfig, containerEl) {
        var len = pluginConfig.length,
            i,
            el,
            pluginConfigEntry,
            inputID;

        for (i = 0; i < len; i += 1) {
            pluginConfigEntry = pluginConfig[i];
            inputID = 'input' + pluginConfigEntry.name;

            el = ENTRY_BASE.clone();

            el.find('input').attr('id', inputID);
            el.find('input').data(PLUGIN_DATA_KEY, pluginName);
            el.find('input').data(ATTRIBUTE_DATA_KEY, pluginConfigEntry.name);
            el.find('input').val(pluginConfigEntry.value);

            el.find('label.control-label').attr('for', inputID);
            el.find('label.control-label').text(pluginConfigEntry.displayName);

            containerEl.append(el);
        }
    };

    PluginConfigDialog.prototype._readConfig = function () {
        var newConfig = {};

        this._divContainer.find('input').each(function() {
            var plugin = $(this).data(PLUGIN_DATA_KEY),
                attrName = $(this).data(ATTRIBUTE_DATA_KEY),
                attrValue = $(this).val();

            newConfig[plugin] = newConfig[plugin] || {};
            newConfig[plugin][attrName] = attrValue;
        });

        return newConfig;
    };

    return PluginConfigDialog;
});