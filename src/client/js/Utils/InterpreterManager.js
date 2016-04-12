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

    function getPluginErrorResult(pluginName, message, startTime, projectId) {
        var pluginResult = new PluginResult(),
            pluginMessage = new PluginMessage();
        pluginMessage.severity = 'error';
        pluginMessage.message = message;
        pluginResult.setSuccess(false);
        pluginResult.setPluginName(pluginName);
        pluginResult.setProjectId(projectId || 'N/A');
        pluginResult.addMessage(pluginMessage);
        pluginResult.setStartTime(startTime);
        pluginResult.setFinishTime((new Date()).toISOString());
        pluginResult.setError(pluginMessage.message);

        return pluginResult;
    }

    /**
     *
     * @param {object} metadata - metadata of plugin to be executed.
     * @param callback
     */
    InterpreterManager.prototype.configureAndRun = function (metadata, callback) {
        var self = this,
            configDialog = new PluginConfigDialog(metadata),
            dialogConfig = {},
            globalOptions = this.getGlobalOptions(metadata);

        if (globalOptions instanceof PluginResult) {
            callback(globalOptions);
            return;
        }

        dialogConfig[metadata.id] = metadata.configStructure;
        dialogConfig[this.GLOBAL_OPTIONS] = globalOptions;

        configDialog.show(dialogConfig, plugin, function (userConfig, save) {
            console.log(userConfig);
            if (save === true) {
                self.saveSettingsInUser(metadata.id, plugin, userConfig);
            }

            callback(getPluginErrorResult(metadata.id, 'PSSS', (new Date()).toISOString()), self._client.getActiveProjectId());
        });

        //            runWithConfiguration = function (updatedConfig) {
        //                //when Save&Run is clicked in the dialog (or silentPluginCfg was passed)
        //                var globalconfig = updatedConfig['Global Options'],
        //                    activeNode,
        //                    errMessage,
        //                    activeSelection;
        //                delete updatedConfig['Global Options'];
        //
        //                activeNode = silentPluginCfg.activeNode;
        //                if (!activeNode && WebGMEGlobal && WebGMEGlobal.State) {
        //                    activeNode = WebGMEGlobal.State.getActiveObject();
        //                }
        //                activeSelection = silentPluginCfg.activeSelection;
        //                if (!activeSelection && WebGMEGlobal && WebGMEGlobal.State) {
        //                    activeSelection = WebGMEGlobal.State.getActiveSelection();
        //                }
        //                // save config from user
        //                for (i in updatedConfig) {
        //                    self._savedConfigs[i] = updatedConfig[i];
        //                }
        //
        //                //#2: save it back and run the plugin
        //                if (configSaveCallback) {
        //                    configSaveCallback(updatedConfig);
        //
        //                    if (self._client.getBranchStatus() &&
        //                        self._client.getBranchStatus() !== self._client.CONSTANTS.BRANCH_STATUS.SYNC) {
        //                        errMessage = 'Not allowed to invoke plugin while local branch is AHEAD or ' +
        //                            'PULLING changes from server.';
        //                        self.logger.error(errMessage);
        //                        callback(getPluginErrorResult(params.id, errMessage, startTime, projectId));
        //                        return;
        //                    }
        //
        //                    // TODO: If global config says try to merge branch then we
        //                    // TODO: should pass the name of the branch.
        //                    var config = {
        //                        project: self._client.getActiveProjectId(),
        //                        token: '',
        //                        activeNode: activeNode, // active object in the editor
        //                        activeSelection: activeSelection || [],
        //                        commit: self._client.getActiveCommitHash(), //#668b3babcdf2ddcd7ba38b51acb62d63da859d90,
        //                        // This will get loaded too which will provide a sanity check on the client state.
        //                        rootHash: self._client.getActiveRootHash(),
        //                        branchName: self._client.getActiveBranchName()
        //                    };
        //
        //                    if (globalconfig.runOnServer === true || silentPluginCfg.runOnServer === true) {
        //                        var context = {
        //                            managerConfig: config,
        //                            pluginConfig: updatedConfig[params.id]
        //                        };
        //                        self._client.runServerPlugin(params.id, context, function (err, result) {
        //                            if (err) {
        //                                self.logger.error(err);
        //                                if (result) {
        //                                    callback(new PluginResult(result));
        //                                } else {
        //                                    errMessage = 'Plugin execution resulted in error, err: ' + err;
        //                                    callback(getPluginErrorResult(params.id, errMessage, startTime, projectId));
        //                                }
        //                            } else {
        //                                var resultObject = new PluginResult(result);
        //                                callback(resultObject);
        //                            }
        //                        });
        //                    } else {
        //                        config.blobClient = new BlobClient({logger: self.logger.fork('BlobClient')});
        //
        //                        pluginManager.executePlugin(params.id, config, function (err, result) {
        //                            if (err) {
        //                                self.logger.error(err);
        //                            }
        //                            callback(result);
        //                        });
        //                    }
        //                }
        //            };
        //});
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
                        runOptions.readOnly = true;
                        runOptions.description = 'This plugin can not run on the server.';
                    }
                } else {
                    runOptions.readOnly = true;
                    runOptions.value = true;
                    runOptions.description = 'This plugin can not run in the browser.';
                }
            } else {
                if (browserAllowedPlugin) {
                    runOptions.readOnly = true;
                    runOptions.description = 'Server execution is disabled.';
                } else {
                    errorMessage = 'This plugin can only run on the server which is disabled!';
                }
            }
        } else {
            if (browserAllowedPlugin) {
                runOptions.readOnly = true;
                runOptions.value = true;
                runOptions.description = 'Browser execution is disabled.';
            } else {
                errorMessage = 'This plugin can only run on the server which is disabled!';
            }
        }

        if (errorMessage) {
            return getPluginErrorResult(pluginMetadata.id, errorMessage, (new Date()).toISOString(), 'kuk');
        } else {
            return [runOption];
        }

    }

    InterpreterManager.prototype.getStoredConfiguration = function (pluginId, plugin) {
        var config,
            componentId = this.getPluginComponentId(pluginId, plugin);

        // Always use the configuration stored from a previous run if it's available.
        if (this._savedConfigs.hasOwnProperty(pluginId)) {
            config = this._savedConfigs[pluginId];
        } else if (typeof WebGMEGlobal !== 'undefined') {
            config = {};
            ComponentSettings.resolveWithWebGMEGlobal(config, componentId);
        }

        return config;
    };

    InterpreterManager.prototype.saveSettingsInUser = function (pluginId, plugin, pluginConfig, callback) {
        var self = this,
            componentId = this.getPluginComponentId(pluginId, plugin);

        this.logger.debug('Saving plugin config in user', componentId, pluginConfig);

        ComponentSettings.overwriteComponentSettings(componentId, pluginConfig[pluginId], function (err, newSettings) {
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

    InterpreterManager.prototype.getPluginComponentId = function (pluginId, plugin) {
        var componentId = 'Plugin_' + pluginId + '__' + plugin.prototype.getVersion().split('.').join('_');
        this.logger.debug('Resolved componentId for plugin "' + componentId + '"');
        return componentId;
    };

    //TODO: Somehow it would feel more right if we do run in async mode, but if not then we should provide getState and
    //TODO: getResult synchronous functions as well.

    return InterpreterManager;
});
