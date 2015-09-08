/*globals define, WebGMEGlobal, requirejs*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'common/core/core',
    'plugin/PluginManagerBase',
    'plugin/PluginResult',
    'plugin/PluginMessage',
    'blob/BlobClient',
    'js/Dialogs/PluginConfig/PluginConfigDialog',
    'js/logger'
], function (Core, PluginManagerBase, PluginResult, PluginMessage, BlobClient, PluginConfigDialog, Logger) {

    'use strict';

    var InterpreterManager = function (client, gmeConfig) {
        this._client = client;
        //this._manager = new PluginManagerBase();
        this.gmeConfig = gmeConfig;
        this._savedConfigs = {};
        this.logger = Logger.create('gme:InterpreterManager', gmeConfig.client.log);
        this.logger.debug('InterpreterManager ctor');
    };

    var getPlugin = function (name, callback) {
        if (WebGMEGlobal && WebGMEGlobal.plugins && WebGMEGlobal.plugins.hasOwnProperty(name)) {
            callback(null, WebGMEGlobal.plugins[name]);
        } else {
            requirejs(['/plugin/' + name + '/' + name + '/' + name],
                function (InterpreterClass) {
                    callback(null, InterpreterClass);
                },
                function (err) {
                    callback(err, null);
                }
            );
        }
    };

    function getPluginErrorResult(pluginName, message, startTime) {
        var pluginResult = new PluginResult(),
            pluginMessage = new PluginMessage();
        pluginMessage.severity = 'error';
        pluginMessage.message = message;
        pluginResult.setSuccess(false);
        pluginResult.pluginName = pluginName;
        pluginResult.addMessage(pluginMessage);
        pluginResult.setStartTime(startTime);
        pluginResult.setFinishTime((new Date()).toISOString());
        pluginResult.setError(pluginMessage.message);

        return pluginResult;
    }

    /**
     *
     * @param {string} name - name of plugin to be executed.
     * @param {object} silentPluginCfg - if falsy dialog window will be shown.
     * @param {object.string} silentPluginCfg.activeNode - Path to activeNode.
     * @param {object.Array.<string>} silentPluginCfg.activeSelection - Paths to nodes in activeSelection.
     * @param {object.boolean} silentPluginCfg.runOnServer - Whether to run the plugin on the server or not.
     * @param {object.object} silentPluginCfg.pluginConfig - Plugin specific options.
     * @param callback
     */
    InterpreterManager.prototype.run = function (name, silentPluginCfg, callback) {
        var self = this,
            startTime = (new Date()).toISOString();
        getPlugin(name, function (err, plugin) {
            self.logger.debug('Getting getPlugin in run.');
            if (!err && plugin) {
                var plugins = {},
                    runWithConfiguration;
                plugins[name] = plugin;
                var pluginManager = new PluginManagerBase(self._client.getProjectObject(), Core, self.logger, plugins,
                    self.gmeConfig);
                pluginManager.initialize(null, function (pluginConfigs, configSaveCallback) {
                    //#1: display config to user
                    var noServerExecution = self.gmeConfig.plugin.allowServerExecution === false,
                        hackedConfig = {
                            'Global Options': [
                                {
                                    name: 'runOnServer',
                                    displayName: 'Execute on Server',
                                    description: noServerExecution ? 'Server side execution is disabled.' : '',
                                    value: false, // this is the 'default config'
                                    valueType: 'boolean',
                                    readOnly: noServerExecution
                                }
                            ]
                        },
                        i, j, d, len;

                    for (i in pluginConfigs) {
                        if (pluginConfigs.hasOwnProperty(i)) {
                            hackedConfig[i] = pluginConfigs[i];

                            // retrieve user settings from previous run
                            if (self._savedConfigs.hasOwnProperty(i)) {
                                var iConfig = self._savedConfigs[i];
                                len = hackedConfig[i].length;

                                while (len--) {
                                    if (iConfig.hasOwnProperty(hackedConfig[i][len].name)) {
                                        hackedConfig[i][len].value = iConfig[hackedConfig[i][len].name];
                                    }
                                }

                            }
                        }
                    }

                    runWithConfiguration = function (updatedConfig) {
                        //when Save&Run is clicked in the dialog (or silentPluginCfg was passed)
                        var globalconfig = updatedConfig['Global Options'],
                            activeNode,
                            errMessage,
                            activeSelection;
                        delete updatedConfig['Global Options'];

                        activeNode = silentPluginCfg.activeNode;
                        if (!activeNode && WebGMEGlobal && WebGMEGlobal.State) {
                            activeNode = WebGMEGlobal.State.getActiveObject();
                        }
                        activeSelection = silentPluginCfg.activeSelection;
                        if (!activeSelection && WebGMEGlobal && WebGMEGlobal.State) {
                            activeSelection = WebGMEGlobal.State.getActiveSelection();
                        }
                        // save config from user
                        for (i in updatedConfig) {
                            self._savedConfigs[i] = updatedConfig[i];
                        }

                        //#2: save it back and run the plugin
                        if (configSaveCallback) {
                            configSaveCallback(updatedConfig);

                            if (self._client.getBranchStatus() !== self._client.CONSTANTS.BRANCH_STATUS.SYNC) {
                                errMessage = 'Not allowed to invoke plugin ';
                                if (self._client.isProjectReadOnly) {
                                    errMessage += 'when in readOnly state.';
                                } else {
                                    errMessage += 'while local branch is AHEAD or PULLING changes from server.';
                                }
                                self.logger.error(errMessage);
                                callback(getPluginErrorResult(name, errMessage, startTime));
                                return;
                            }

                            // TODO: If global config says try to merge branch then we
                            // TODO: should pass the name of the branch.
                            var config = {
                                project: self._client.getActiveProjectId(),
                                token: '',
                                activeNode: activeNode, // active object in the editor
                                activeSelection: activeSelection || [],
                                commit: self._client.getActiveCommitHash(), //#668b3babcdf2ddcd7ba38b51acb62d63da859d90,
                                // This will get loaded too which will provide a sanity check on the client state.
                                rootHash: self._client.getActiveRootHash(),
                                branchName: self._client.getActiveBranchName()
                            };

                            if (globalconfig.runOnServer === true || silentPluginCfg.runOnServer === true) {
                                var context = {
                                    managerConfig: config,
                                    pluginConfig: updatedConfig[name]
                                };
                                self._client.runServerPlugin(name, context, function (err, result) {
                                    if (err) {
                                        self.logger.error(err);
                                        if (result) {
                                            callback(new PluginResult(result));
                                        } else {
                                            errMessage = 'Plugin execution resulted in error, err: ' + err;
                                            callback(getPluginErrorResult(name, errMessage, startTime));
                                        }
                                    } else {
                                        var resultObject = new PluginResult(result);
                                        callback(resultObject);
                                    }
                                });
                            } else {
                                config.blobClient = new BlobClient();

                                pluginManager.executePlugin(name, config, function (err, result) {
                                    if (err) {
                                        self.logger.error(err);
                                    }
                                    callback(result);
                                });
                            }
                        }
                    };

                    if (silentPluginCfg) {
                        var updatedConfig = {};
                        for (i in hackedConfig) {
                            updatedConfig[i] = {};
                            len = hackedConfig[i].length;
                            while (len--) {
                                updatedConfig[i][hackedConfig[i][len].name] = hackedConfig[i][len].value;
                            }

                            if (silentPluginCfg && silentPluginCfg.pluginConfig) {
                                for (j in silentPluginCfg.pluginConfig) {
                                    updatedConfig[i][j] = silentPluginCfg.pluginConfig[j];
                                }
                            }
                        }
                        runWithConfiguration(updatedConfig);
                    } else {
                        d = new PluginConfigDialog();
                        silentPluginCfg = {};
                        d.show(hackedConfig, runWithConfiguration);
                    }
                });
            } else {
                self.logger.error(err);
                self.logger.error('Unable to load plugin');
                callback(getPluginErrorResult(name, 'Unable to load plugin, err:' + err, startTime));
            }
        });
    };

    //TODO: Somehow it would feel more right if we do run in async mode, but if not then we should provide getState and
    //TODO: getResult synchronous functions as well.

    return InterpreterManager;
});
