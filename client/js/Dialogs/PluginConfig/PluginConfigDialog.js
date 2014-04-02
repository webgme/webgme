/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/Controls/PropertyGrid/PropertyGridWidgetManager',
    'text!html/Dialogs/PluginConfig/PluginConfigDialog.html',
    'css!/css/Dialogs/PluginConfig/PluginConfigDialog'], function (PropertyGridWidgetManager,
                                                                   pluginConfigDialogTemplate) {

    var PluginConfigDialog,
        PLUGIN_DATA_KEY = 'plugin',
        ATTRIBUTE_DATA_KEY = 'attribute';

    PluginConfigDialog = function () {
        this._propertyGridWidgetManager = new PropertyGridWidgetManager();
        this._propertyGridWidgetManager.registerWidgetForType('boolean', 'iCheckBox');
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

        this._dialog.on('shown', function () {
            self._dialog.find('input').first().focus();
        });

        this._dialog.modal('show');
    };

    PluginConfigDialog.prototype._closeAndSave = function () {
        this._updatedConfig = this._readConfig();
        this._dialog.modal('hide');
    };

    var PLUGIN_CONFIG_SECTION_BASE = $('<div><fieldset><legend></legend><div class="form-horizontal"></div><fieldset></div>');
    PluginConfigDialog.prototype._initDialog = function (pluginConfigs) {
        var self = this;
        var pluginSectionEl;

        this._dialog = $(pluginConfigDialogTemplate);

        this._btnSave = this._dialog.find('.btn-save');

        this._divContainer = this._dialog.find('.modal-body');

        this._widgets = {};

        this._btnSave.on('click', function (event) {
            self._closeAndSave();
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

        //save&run on CTRL + Enter
        this._dialog.on('keydown.PluginConfigDialog', function (e) {
            if (e.keyCode === 13 && (e.ctrlKey || e.metaKey)) {
                e.stopPropagation();
                e.preventDefault();
                self._closeAndSave();
            }
        });
    };

    var ENTRY_BASE = $('<div class="control-group"><label class="control-label">NAME</label><div class="controls"></div></div>');
    var DESCRIPTION_BASE = $('<div class="desc muted"></div>');
    PluginConfigDialog.prototype._generatePluginSection = function (pluginName, pluginConfig, containerEl) {
        var len = pluginConfig.length,
            i,
            el,
            pluginConfigEntry,
            widget,
            descEl;

        this._widgets[pluginName] = {};
        for (i = 0; i < len; i += 1) {
            pluginConfigEntry = pluginConfig[i];
            descEl = undefined;

            widget = this._propertyGridWidgetManager.getWidgetForProperty(pluginConfigEntry);
            this._widgets[pluginName][pluginConfigEntry.name] = widget;

            el = ENTRY_BASE.clone();
            el.data(ATTRIBUTE_DATA_KEY, pluginConfigEntry.name);
            el.find('.controls').append(widget.el);

            el.find('label.control-label').text(pluginConfigEntry.displayName);

            if (pluginConfigEntry.description && pluginConfigEntry.description !== '') {
                descEl = descEl || DESCRIPTION_BASE.clone();
                descEl.text(pluginConfigEntry.description);
            }

            if (pluginConfigEntry.minValue !== undefined &&
                pluginConfigEntry.minValue !== null &&
                pluginConfigEntry.minValue !== '') {
                descEl = descEl || DESCRIPTION_BASE.clone();
                descEl.append(' The minimum value is: ' + pluginConfigEntry.minValue + '.');
            }

            if (pluginConfigEntry.maxValue !== undefined &&
                pluginConfigEntry.maxValue !== null &&
                pluginConfigEntry.maxValue !== '') {
                descEl = descEl || DESCRIPTION_BASE.clone();
                descEl.append(' The maximum value is: ' + pluginConfigEntry.maxValue + '.');
            }

            if (descEl) {
                el.append(descEl);
            }

            containerEl.append(el);
        }
    };

    PluginConfigDialog.prototype._readConfig = function () {
        var newConfig = {},
            plugin,
            attrName;

        for (plugin in this._widgets) {
            if (this._widgets.hasOwnProperty(plugin)) {
                for (attrName in this._widgets[plugin]) {
                    if (this._widgets[plugin].hasOwnProperty(attrName)) {
                        newConfig[plugin] = newConfig[plugin] || {};
                        newConfig[plugin][attrName] = this._widgets[plugin][attrName].getValue();
                    }
                }
            }
        }

        return newConfig;
    };

    return PluginConfigDialog;
});