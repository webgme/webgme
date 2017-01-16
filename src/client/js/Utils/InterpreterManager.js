/*globals define, WebGMEGlobal, requirejs*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'plugin/PluginResult',
    'plugin/PluginMessage',
    'js/Dialogs/PluginConfig/PluginConfigDialog',
    'js/logger',
    'js/Utils/ComponentSettings'
], function (PluginResult, PluginMessage, PluginConfigDialog, Logger, ComponentSettings) {

    'use strict';

    var InterpreterManager = function (client, gmeConfig) {
        this._client = client;
        //this._manager = new PluginManagerBase();
        this.gmeConfig = gmeConfig;
        this._savedConfigs = {};
        this.logger = Logger.create('gme:InterpreterManager', gmeConfig.client.log);
        this.logger.debug('InterpreterManager ctor');
    };

    InterpreterManager.prototype.GLOBAL_OPTIONS = 'Global Options';

    InterpreterManager.prototype.getPluginErrorResult = function (pluginId, pluginName, message, startTime, projectId) {
        var pluginResult = new PluginResult(),
            pluginMessage = new PluginMessage();
        pluginMessage.severity = 'error';
        pluginMessage.message = message;
        pluginResult.setSuccess(false);
        pluginResult.setPluginId(pluginId);
        pluginResult.setPluginName(pluginName);
        pluginResult.setProjectId(projectId || this._client.getActiveProjectId() || 'N/A');
        pluginResult.addMessage(pluginMessage);
        pluginResult.setStartTime(startTime);
        pluginResult.setFinishTime((new Date()).toISOString());
        pluginResult.setError(pluginMessage.message);

        return pluginResult;
    };

    InterpreterManager.prototype.loadConfigDialog = function (metadata, callback) {
        if (!metadata.configWidget) {
            callback(null, PluginConfigDialog);
        } else {
            requirejs([metadata.configWidget],
                function (CustomConfigDialog) {
                    callback(null, CustomConfigDialog);
                },
                function (err) {
                    callback(err);
                }
            );
        }
    };

    /**
     *
     * @param {object} metadata - metadata of plugin to be executed.
     * @param {function(PluginResult|boolean)} callback - If canceled from dialog returns with false.
     */
    InterpreterManager.prototype.configureAndRun = function (metadata, callback) {
        var self = this,
            context = self._client.getCurrentPluginContext(metadata.id),
            globalOptions = this.getGlobalOptions(metadata, {namespace: context.managerConfig.namespace}),
            configDialog;

        if (globalOptions instanceof PluginResult) {
            callback(globalOptions);
            return;
        }

        self.loadConfigDialog(metadata, function (err, ConfigDialog) {
            if (err || !ConfigDialog) {
                callback(self.getPluginErrorResult(metadata.id,
                    metadata.name,
                    err ? err.message : 'Could not load configuration dialog.',
                    (new Date()).toISOString(),
                    context.managerConfig.project.projectId));
                return;
            }

            configDialog = new ConfigDialog({client: self._client, logger: self.logger});

            configDialog.show(globalOptions, metadata, self.getStoredConfiguration(metadata),
                function (globalConfig, pluginConfig, storeInUser) {
                    var startTime = (new Date()).toISOString();

                    function execCallback(err, result) {
                        if (err) {
                            self.logger.error(err);
                            if (result) {
                                callback(new PluginResult(result));
                            } else {
                                callback(self.getPluginErrorResult(metadata.id, metadata.name, err.message, startTime,
                                    context.managerConfig.project.projectId));
                            }
                        } else {
                            callback(new PluginResult(result));
                        }
                    }

                    if (globalConfig === false) {
                        // Canceled from dialog..
                        callback(false);
                        return;
                    }

                    // Store the config in memory for this session.
                    self._savedConfigs[metadata.id] = pluginConfig;

                    if (storeInUser === true) {
                        self.saveSettingsInUser(metadata, pluginConfig);
                    }

                    context.pluginConfig = pluginConfig;
                    context.managerConfig.namespace = globalConfig.namespace;

                    // Before executing the plugin - make sure the client is in SYNC.
                    // This can be skipped if the plugin is read-only and executed on
                    // the client.
                    var readOnlyClient = !globalConfig.runOnServer && !metadata.writeAccessRequired,
                        isOutOfSync = self._client.getBranchStatus() &&
                            self._client.getBranchStatus() !== self._client.CONSTANTS.BRANCH_STATUS.SYNC;

                    if (!readOnlyClient && isOutOfSync) {
                        callback(self.getPluginErrorResult(metadata.id, metadata.name, 'Not allowed ' +
                            'to invoke server plugin while local branch is AHEAD or ' +
                            'PULLING changes from server.', startTime));
                        return;
                    }

                    if (globalConfig.runOnServer === true) {
                        self._client.runServerPlugin(metadata.id, context, execCallback);
                    } else {
                        self._client.runBrowserPlugin(metadata.id, context, execCallback);
                    }
                }
            );
        });
    };

    InterpreterManager.prototype.getGlobalOptions = function (pluginMetadata, defaults) {
        var runOption = {
                name: 'runOnServer',
                displayName: 'Execute on Server',
                description: '',
                value: defaults.hasOwnProperty('runOnServer') ? defaults.runOnServer : false,
                valueType: 'boolean',
                readOnly: false
            },
            namespace = {
                name: 'namespace',
                displayName: 'Used Namespace',
                description: 'The namespace the plugin should run under.',
                value: defaults.hasOwnProperty('namespace') ? defaults.namespace : '',
                valueType: 'string',
                valueItems: [],
                readOnly: false
            },
            result = [],
            serverAllowedGlobal = this.gmeConfig.plugin.allowServerExecution === true,
            serverAllowedPlugin = !(pluginMetadata.disableServerSideExecution),
            browserAllowedGlobal = this.gmeConfig.plugin.allowBrowserExecution === true,
            browserAllowedPlugin = !(pluginMetadata.disableBrowserSideExecution),
            errorMessage;

        if (serverAllowedGlobal === false && browserAllowedGlobal === false) {
            errorMessage = 'Plugin execution is disabled!';
        } else if (serverAllowedPlugin === false && browserAllowedPlugin === false) {
            errorMessage = 'This plugin cannot run on the server nor in the browser!?';
        } else if (browserAllowedGlobal) {
            if (serverAllowedGlobal) {
                if (browserAllowedPlugin) {
                    if (serverAllowedPlugin) {
                        // This is the default
                    } else {
                        runOption.readOnly = true;
                        runOption.description = 'This plugin can not run on the server.';
                    }
                } else {
                    runOption.readOnly = true;
                    runOption.value = true;
                    runOption.description = 'This plugin can not run in the browser.';
                }
            } else {
                if (browserAllowedPlugin) {
                    runOption.readOnly = true;
                    runOption.description = 'Server execution is disabled.';
                } else {
                    errorMessage = 'This plugin can only run on the server which is disabled!';
                }
            }
        } else {
            if (browserAllowedPlugin) {
                runOption.readOnly = true;
                runOption.value = true;
                runOption.description = 'Browser execution is disabled.';
            } else {
                errorMessage = 'This plugin can only run on the server which is disabled!';
            }
        }

        if (errorMessage) {
            return this.getPluginErrorResult(pluginMetadata.id, pluginMetadata.name, errorMessage,
                (new Date()).toISOString());
        } else {
            result.push(runOption);
            namespace.valueItems = this._client.getLibraryNames();

            if (namespace.valueItems.length > 0) {
                namespace.valueItems.unshift('');
                result.push(namespace);
            }

            return result;
        }
    };

    InterpreterManager.prototype.getStoredConfiguration = function (pluginMetadata) {
        var config,
            componentId = this.getPluginComponentId(pluginMetadata);

        // Always use the configuration stored from a previous run if it's available.
        if (this._savedConfigs.hasOwnProperty(pluginMetadata.id)) {
            config = this._savedConfigs[pluginMetadata.id];
        } else if (typeof WebGMEGlobal !== 'undefined') {
            config = {};
            ComponentSettings.resolveWithWebGMEGlobal(config, componentId);
        }

        return config;
    };

    InterpreterManager.prototype.saveSettingsInUser = function (pluginMetadata, pluginConfig, callback) {
        var self = this,
            componentId = this.getPluginComponentId(pluginMetadata.id);

        this.logger.debug('Saving plugin config in user', componentId, pluginConfig);

        ComponentSettings.overwriteComponentSettings(componentId, pluginConfig, function (err, newSettings) {
            if (callback) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, newSettings);
                }
            } else {
                if (err) {
                    self.logger.error(new Error('Failed storing settings for user'), err);
                } else {
                    self.logger.debug('Stored new settings for plugin at', componentId, newSettings);
                }
            }
        });
    };

    InterpreterManager.prototype.getPluginComponentId = function (pluginMetadata) {
        var componentId = 'Plugin_' + pluginMetadata.id + '__' + pluginMetadata.version.split('.').join('_');
        this.logger.debug('Resolved componentId for plugin "' + componentId + '"');
        return componentId;
    };

    //TODO: Somehow it would feel more right if we do run in async mode, but if not then we should provide getState and
    //TODO: getResult synchronous functions as well.

    return InterpreterManager;
});
