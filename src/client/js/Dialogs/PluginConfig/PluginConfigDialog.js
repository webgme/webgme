/*globals define, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/Controls/PropertyGrid/PropertyGridWidgetManager',
    'text!./templates/PluginConfigDialog.html',
    'css!./styles/PluginConfigDialog.css'
], function (PropertyGridWidgetManager,
             pluginConfigDialogTemplate) {

    'use strict';

    var PluginConfigDialog,
        PLUGIN_DATA_KEY = 'plugin',
        ATTRIBUTE_DATA_KEY = 'attribute',
    //jscs:disable maximumLineLength
        PLUGIN_CONFIG_SECTION_BASE = $('<div><fieldset><form class="form-horizontal" role="form"></form><fieldset></div>'),
        ENTRY_BASE = $('<div class="form-group"><div class="row"><label class="col-sm-4 control-label">NAME</label><div class="col-sm-8 controls"></div></div><div class="row description"><div class="col-sm-4"></div></div></div>'),
    //jscs:enable maximumLineLength
        DESCRIPTION_BASE = $('<div class="desc muted col-sm-8"></div>');

    PluginConfigDialog = function (params) {
        this._propertyGridWidgetManager = new PropertyGridWidgetManager();
        this._propertyGridWidgetManager.registerWidgetForType('boolean', 'iCheckBox');
        this._pluginWidgets = {};
        this._globalWidgets = {};
        this._globalConfig = null;
        this._pluginConfig = null;
        this._client = params.client;
    };

    PluginConfigDialog.prototype.show = function (globalOptions, pluginMetadata, prevConfig, callback) {
        var self = this;

        this._globalOptions = globalOptions;
        this._pluginMetadata = pluginMetadata;
        this._prevConfg = prevConfig || {};

        this._initDialog();

        this._dialog.on('hidden.bs.modal', function () {
            var saveInUser = self._saveConfigurationCb.find('input').is(':checked');
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;

            if (callback) {
                if (self._globalConfig && self._pluginConfig) {
                    callback(self._globalConfig, self._pluginConfig, saveInUser);
                } else {
                    callback(false);
                }
            }
        });

        this._dialog.on('shown', function () {
            self._dialog.find('input').first().focus();
        });

        this._dialog.modal('show');
    };

    PluginConfigDialog.prototype._closeAndSave = function () {
        var invalids = this._dialog.find('input:invalid'),
            self = this;

        if (invalids.length === 0) {
            self._pluginConfig = {};
            self._globalConfig = {};

            Object.keys(self._pluginWidgets).forEach(function (name) {
                self._pluginConfig[name] = self._pluginWidgets[name].getValue();
            });

            Object.keys(self._globalWidgets).forEach(function (name) {
                self._globalConfig[name] = self._globalWidgets[name].getValue();
            });

            this._dialog.modal('hide');
        } else {
            $(invalids[0]).focus();
        }
    };

    PluginConfigDialog.prototype._initDialog = function () {
        var self = this,
            iconEl;

        this._dialog = $(pluginConfigDialogTemplate);

        this._btnSave = this._dialog.find('.btn-save');

        this._divContainer = this._dialog.find('.modal-body');

        this._saveConfigurationCb = this._dialog.find('.save-configuration');
        this._modalHeader = this._dialog.find('.modal-header');

        if (this._pluginMetadata.icon) {
            if (this._pluginMetadata.icon.src) {
                iconEl = $('<img>', {
                    class: this._pluginMetadata.icon.class,
                    src: ['/plugin', this._pluginMetadata.id, this._pluginMetadata.id, this._pluginMetadata.icon.src]
                        .join('/')
                });
                this._modalHeader.prepend();
            } else {
                iconEl = $('<i/>', {
                    class: this._pluginMetadata.icon.class || 'glyphicon glyphicon-cog'
                });
            }

            iconEl.addClass('plugin-icon pull-left');
        } else {
            iconEl = $('<i class="plugin-icon pull-left glyphicon glyphicon-cog"/>');
        }

        this._modalHeader.prepend(iconEl);

        this._title = this._modalHeader.find('.modal-title');
        this._title.text(this._pluginMetadata.id + ' ' + 'v' + this._pluginMetadata.version);

        // Generate the widget in the body
        this._generateConfigSection(true);
        this._divContainer.append($('<hr class="global-and-plugin-divider">'));
        this._generateConfigSection();

        this._btnSave.on('click', function (event) {
            self._closeAndSave();
            event.stopPropagation();
            event.preventDefault();
        });

        //save&run on CTRL + Enter
        this._dialog.on('keydown.PluginConfigDialog', function (e) {
            if (e.keyCode === 13 && (e.ctrlKey || e.metaKey)) {
                e.stopPropagation();
                e.preventDefault();
                self._closeAndSave();
            }
        });
    };

    PluginConfigDialog.prototype._generateConfigSection = function (isGlobal) {
        var len = isGlobal ? this._globalOptions.length : this._pluginMetadata.configStructure.length,
            i,
            el,
            pluginConfigEntry,
            widget,
            descEl,
            containerEl,
            pluginSectionEl = PLUGIN_CONFIG_SECTION_BASE.clone();

        if (isGlobal) {
            pluginSectionEl.data(PLUGIN_DATA_KEY, 'Global Options');
        } else {
            pluginSectionEl.data(PLUGIN_DATA_KEY, this._pluginMetadata.id);
        }

        this._divContainer.append(pluginSectionEl);
        containerEl = pluginSectionEl.find('.form-horizontal');

        for (i = 0; i < len; i += 1) {
            pluginConfigEntry = isGlobal ? this._globalOptions[i] : this._pluginMetadata.configStructure[i];
            descEl = undefined;

            // Make sure not modify the global metadata.
            pluginConfigEntry = JSON.parse(JSON.stringify(pluginConfigEntry));

            if (!isGlobal && this._prevConfg.hasOwnProperty(pluginConfigEntry.name)) {
                // Use stored value if available.
                pluginConfigEntry.value = this._prevConfg[pluginConfigEntry.name];
            }

            if (this._client.getProjectAccess().write === false && pluginConfigEntry.writeAccessRequired === true) {
                pluginConfigEntry.readOnly = true;
            }

            widget = this._propertyGridWidgetManager.getWidgetForProperty(pluginConfigEntry);
            if (isGlobal) {
                this._globalWidgets[pluginConfigEntry.name] = widget;
            } else {
                this._pluginWidgets[pluginConfigEntry.name] = widget;
            }

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

            if (isGlobal && pluginConfigEntry.name === 'runOnServer' && pluginConfigEntry.readOnly === true) {
                // Do not display the boolean box #676
                descEl.css({
                    color: 'grey',
                    'padding-top': '7px',
                    'padding-left': '0px',
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