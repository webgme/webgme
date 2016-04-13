/*globals define, WebGMEGlobal*/
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

    function getPluginErrorResult(pluginName, message, startTime, projectId) {
        var pluginResult = new PluginResult(),
            pluginMessage = new PluginMessage();
        pluginMessage.severity = 'error';
        pluginMessage.message = message;
        pluginResult.setSuccess(false);
        pluginResult.setPluginName(pluginName);
        pluginResult.setProjectId(projectId || this._client.getActiveProjectId() || 'N/A');
        pluginResult.addMessage(pluginMessage);
        pluginResult.setStartTime(startTime);
        pluginResult.setFinishTime((new Date()).toISOString());
        pluginResult.setError(pluginMessage.message);

        return pluginResult;
    }

    /**
     *
     * @param {object} metadata - metadata of plugin to be executed.
     * @param {function(PluginResult|boolean)} callback - If canceled from dialog returns with false.
     */
    InterpreterManager.prototype.configureAndRun = function (metadata, callback) {
        var self = this,
            configDialog = new PluginConfigDialog(),
            globalOptions = this.getGlobalOptions(metadata);

        if (globalOptions instanceof PluginResult) {
            callback(globalOptions);
            return;
        }

        configDialog.show(globalOptions, metadata, this.getStoredConfiguration(metadata),
            function (globalConfig, pluginConfig, storeInUser) {
                var context,
                    startTime = (new Date()).toISOString();

                function execCallback(err, result) {
                    if (err) {
                        self.logger.error(err);
                        if (result) {
                            callback(new PluginResult(result));
                        } else {
                            callback(getPluginErrorResult(metadata.id, err.message, startTime, context.project.projectId));
                        }
                    } else {
                        callback(new PluginResult(result));
                    }
                }

                if (globalConfig === false) {
                    // Canceled from dialog..
                    callback(false);
                }

                // Store the config in memory for this session.
                self._savedConfigs[metadata.id] = pluginConfig;

                if (storeInUser === true) {
                    self.saveSettingsInUser(metadata, pluginConfig);
                }

                context = self._client.getCurrentPluginContext();
                context.pluginConfig = pluginConfig;

                // Before executing the plugin - make sure the client is in SYNC.
                // (If not plugin could be executed on the server on a commitHash that does not exist).
                if (self._client.getBranchStatus() &&
                    self._client.getBranchStatus() !== self._client.CONSTANTS.BRANCH_STATUS.SYNC) {
                    callback(getPluginErrorResult(metadata.id, 'Not allowed to invoke plugin while local branch' +
                        ' is AHEAD or PULLING changes from server.', startTime));
                    return;
                }

                if (globalConfig.runOnServer === true) {
                    self._client.runServerPlugin(metadata.id, context, execCallback);
                } else {
                    self._client.runBrowserPlugin(metadata.id, context, execCallback);
                }
            }
        );
    };

    InterpreterManager.prototype.getGlobalOptions = function (pluginMetadata) {
        var runOption = {
                name: 'runOnServer',
                displayName: 'Execute on Server',
                description: '',
                value: false,
                valueType: 'boolean',
                readOnly: false
            },
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
            return getPluginErrorResult(pluginMetadata.id, errorMessage, (new Date()).toISOString());
        } else {
            return [runOption];
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
