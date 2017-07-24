/*globals define, $, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'common/util/tarjan',
    'js/Controls/PropertyGrid/PropertyGridWidgetManager',
    'text!./templates/PluginConfigDialog.html',
    'css!./styles/PluginConfigDialog.css'
], function (Tarjan,
             PropertyGridWidgetManager,
             pluginConfigDialogTemplate) {

    'use strict';

    var GLOBAL_OPTS_ID = 'Global Options',
        PLUGIN_DATA_KEY = 'plugin',
        ATTRIBUTE_DATA_KEY = 'attribute',
    //jscs:disable maximumLineLength
        PLUGIN_CONFIG_SECTION_BASE = $('<div><div class="dependency-title"></div><fieldset><form class="form-horizontal" role="form"></form><fieldset></div>'),
        ENTRY_BASE = $('<div class="form-group"><div class="row"><label class="col-sm-4 control-label">NAME</label><div class="col-sm-8 controls"></div></div><div class="row description"><div class="col-sm-4"></div></div></div>'),
    //jscs:enable maximumLineLength
        DESCRIPTION_BASE = $('<div class="desc muted col-sm-8"></div>');

    function PluginConfigDialog(params) {
        this._propertyGridWidgetManager = new PropertyGridWidgetManager();
        this._propertyGridWidgetManager.registerWidgetForType('boolean', 'iCheckBox');
        this._pluginWidgets = {};
        this._globalWidgets = {};
        this._globalConfig = null;
        this._pluginConfig = null;
        this._client = params.client;
    }

    PluginConfigDialog.prototype.show = function (globalOptions, pluginMetadata, prevConfig, callback) {
        var self = this;

        this._globalOptions = globalOptions;
        this._pluginMetadata = pluginMetadata;
        this._prevConfig = prevConfig || {};

        // In case someone was sub-classing ...
        this._prevConfg = this._prevConfig;

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
        this._title.text(this._pluginMetadata.name + ' ' + 'v' + this._pluginMetadata.version);

        // Generate the widget in the body
        this._generateSections();

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

    PluginConfigDialog.prototype._generateSections = function () {
        var self = this,
            tarjan = new Tarjan();

        this._generateConfigSection(GLOBAL_OPTS_ID, this._globalOptions);
        this._generateConfigSection(this._pluginMetadata.id, this._pluginMetadata.configStructure, self._prevConfig);

        function traverseDependencies(metadata, joinedId, prevConfig) {
            (metadata.dependencies || [])
                .forEach(function (depInfo) {
                    var depMetadata = WebGMEGlobal.allPluginsMetadata[depInfo.id],
                        newJoinedId,
                        subPreConfig;

                    if (!depMetadata) {
                        throw new Error('Plugin "' + depInfo.id + '" is a dependency but metadata for it not available!');
                    }

                    if (!joinedId) {
                        // This is the initial run checking for loops..
                        if (tarjan.addVertex(depInfo.id) === false) {
                            // Dependency already added, just account for the connection
                            tarjan.connectVertices(metadata.id, depInfo.id);
                        } else {
                            tarjan.connectVertices(metadata.id, depInfo.id);
                            traverseDependencies(depMetadata);
                        }
                    } else {
                        newJoinedId = joinedId + '.' + depInfo.id;
                        if (prevConfig &&
                            prevConfig.hasOwnProperty('_dependencies') &&
                            prevConfig._dependencies.hasOwnProperty(depInfo.id)) {

                            subPreConfig = prevConfig._dependencies[depInfo.id].pluginConfig;
                        }
                        // Here we know there are no loops so start adding the sections..
                        self._generateConfigSection(newJoinedId, depMetadata.configStructure, subPreConfig);
                        traverseDependencies(depMetadata, newJoinedId, subPreConfig);
                    }
            });
        }

        tarjan.addVertex(this._pluginMetadata.id);
        traverseDependencies(this._pluginMetadata);

        if (tarjan.hasLoops()) {
            throw new Error('The dependencies of ' + this._pluginMetadata.id + ' forms a circular loop..');
        }

        traverseDependencies(this._pluginMetadata, this._pluginMetadata.id, self._prevConfig);
    };

    PluginConfigDialog.prototype._generateConfigSection = function (id, configStructure, prevConfig) {
        var pluginSectionEl = PLUGIN_CONFIG_SECTION_BASE.clone(),
            self = this,
            callPath = id.split('.'),
            containerEl;

        if (configStructure.length === 0) {
            return;
        }

        pluginSectionEl.data(PLUGIN_DATA_KEY, id);

        if (callPath.length > 1) {
            pluginSectionEl.find('.dependency-title').text(callPath.slice(1).join(' > '));
        }

        if (id !== GLOBAL_OPTS_ID) {
            this._divContainer.append($('<hr class="global-and-plugin-divider">'));
        }

        this._divContainer.append(pluginSectionEl);

        containerEl = pluginSectionEl.find('.form-horizontal');

        configStructure.forEach(function (pluginConfigEntry) {
            var widget,
                el,
                descEl;

            // Make sure not modify the global metadata.
            pluginConfigEntry = JSON.parse(JSON.stringify(pluginConfigEntry));

            if (prevConfig && prevConfig.hasOwnProperty(pluginConfigEntry.name)) {
                pluginConfigEntry.value = prevConfig[pluginConfigEntry.name];
            }

            if (self._client.getProjectAccess().write === false && pluginConfigEntry.writeAccessRequired === true) {
                pluginConfigEntry.readOnly = true;
            }

            widget = self._propertyGridWidgetManager.getWidgetForProperty(pluginConfigEntry);

            if (id === GLOBAL_OPTS_ID) {
                self._globalWidgets[pluginConfigEntry.name] = widget;
            } else {
                self._pluginWidgets[id + '.' + pluginConfigEntry.name] = widget;
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

            if (id === GLOBAL_OPTS_ID && pluginConfigEntry.name === 'runOnServer' && pluginConfigEntry.readOnly === true) {
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
        });
    };


    PluginConfigDialog.prototype._closeAndSave = function () {
        var invalids = this._dialog.find('input:invalid'),
            self = this;

        if (invalids.length === 0) {
            self._pluginConfig = {};
            self._globalConfig = {};

            Object.keys(self._pluginWidgets).forEach(function (id) {
                var idPath = id.split('.'),
                    config = self._pluginConfig,
                    name = idPath[idPath.length - 1],
                    i;

                // Start at 1 (we don't need the name of the current plugin)
                for (i = 1; i < idPath.length - 1; i += 1) {
                    config._dependencies = config._dependencies || {};
                    config._dependencies[idPath[i]] = config._dependencies[idPath[i]] || { pluginConfig: {} } ;

                    config = config._dependencies[idPath[i]].pluginConfig;
                }

                config[name] = self._pluginWidgets[id].getValue();
            });

            Object.keys(self._globalWidgets).forEach(function (name) {
                self._globalConfig[name] = self._globalWidgets[name].getValue();
            });

            this._dialog.modal('hide');
        } else {
            $(invalids[0]).focus();
        }
    };

    return PluginConfigDialog;
});