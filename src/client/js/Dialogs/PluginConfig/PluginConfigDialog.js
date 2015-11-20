/*globals define, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['js/Controls/PropertyGrid/PropertyGridWidgetManager',
    'text!./templates/PluginConfigDialog.html',
    'css!./styles/PluginConfigDialog.css'
], function (PropertyGridWidgetManager,
             pluginConfigDialogTemplate) {

    'use strict';

    var PluginConfigDialog,
        PLUGIN_DATA_KEY = 'plugin',
        ATTRIBUTE_DATA_KEY = 'attribute',
    //jscs:disable maximumLineLength
        PLUGIN_CONFIG_SECTION_BASE = $('<div><fieldset><legend></legend><form class="form-horizontal" role="form"></form><fieldset></div>'),
        ENTRY_BASE = $('<div class="form-group"><div class="row"><label class="col-sm-4 control-label">NAME</label><div class="col-sm-8 controls"></div></div><div class="row description"><div class="col-sm-4"></div></div></div>'),
    //jscs:enable maximumLineLength
        DESCRIPTION_BASE = $('<div class="desc muted col-sm-8"></div>');

    PluginConfigDialog = function () {
        this._propertyGridWidgetManager = new PropertyGridWidgetManager();
        this._propertyGridWidgetManager.registerWidgetForType('boolean', 'iCheckBox');
    };

    PluginConfigDialog.prototype.show = function (pluginConfigs, fnCallback) {
        var self = this;

        this._fnCallback = fnCallback;

        this._initDialog(pluginConfigs);

        this._dialog.on('hidden.bs.modal', function () {
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
        var invalids = this._dialog.find('input:invalid');
        if (invalids.length === 0) {
            this._updatedConfig = this._readConfig();
            this._dialog.modal('hide');
        } else {
            $(invalids[0]).focus();
        }
    };

    PluginConfigDialog.prototype._initDialog = function (pluginConfigs) {
        var self = this,
            p,
            pluginSectionEl;

        this._dialog = $(pluginConfigDialogTemplate);

        this._btnSave = this._dialog.find('.btn-save');

        this._divContainer = this._dialog.find('.modal-body');

        this._widgets = {};

        this._btnSave.on('click', function (event) {
            self._closeAndSave();
            event.stopPropagation();
            event.preventDefault();
        });

        for (p in pluginConfigs) {
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

            if (pluginName === 'Global Options' && pluginConfigEntry.name === 'runOnServer' &&
                pluginConfigEntry.readOnly === true) {
                // Do not display the boolean box #676
                descEl.css({
                    color: 'grey',
                    'padding-top': '7px',
                    'font-style': 'italic'
                });
                el.find('.controls').append(descEl);
            } else {
                el.find('.controls').append(widget.el);
                if (descEl) {
                    el.find('.description').append(descEl);
                }
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