/*globals requirejs, define*/
/*jshint node:true, newcap:false, browser: true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'common/core/coreQ',
    'plugin/PluginResult',
    'plugin/PluginMessage',
    'plugin/util',
    'common/storage/project/interface',
    'common/storage/util',
    'common/util/tarjan',
    'q',
], function (Core,
             PluginResult,
             PluginMessage,
             pluginUtil,
             ProjectInterface,
             storageUtil,
             Tarjan,
             Q) {

    'use strict';

    /**
     *
     * @param blobClient
     * @param [project]
     * @param mainLogger
     * @param gmeConfig
     * @constructor
     */
    function PluginManagerBase(blobClient, project, mainLogger, gmeConfig) {
        var self = this;

        this.logger = mainLogger.fork('PluginManagerBase');
        this.notificationHandlers = [];

        function getPluginInstance(pluginId, callback) {
            var deferred = Q.defer(),
                rejected = false,
                pluginPath = 'plugin/' + pluginId + '/' + pluginId + '/' + pluginId;

            if (rejected === false) {
                requirejs([pluginPath],
                    function (PluginClass) {
                        var plugin = new PluginClass();
                        self.logger.debug('requirejs plugin from path: ' + pluginPath);
                        if (self.serverSide && plugin.pluginMetadata.disableServerSideExecution) {
                            deferred.reject(new Error(pluginId + ' cannot be invoked on server.'));
                        } else if (self.browserSide && plugin.pluginMetadata.disableBrowserSideExecution) {
                            deferred.reject(new Error(pluginId + ' cannot be invoked in browser.'));
                        } else {
                            deferred.resolve(plugin);
                        }
                    },
                    function (err) {
                        deferred.reject(err);
                    }
                );
            }

            return deferred.promise.nodeify(callback);
        }

        function checkDependencies(plugin, tarjan, callback) {
            return Q.all(plugin.getPluginDependencies()
                .map(function (pluginId) {
                    if (tarjan.addVertex(pluginId) === false) {
                        // Dependency already added, just account for the connection
                        tarjan.connectVertices(plugin.getId(), pluginId);
                        return Q.resolve();
                    } else {
                        tarjan.connectVertices(plugin.getId(), pluginId);
                        return getPluginInstance(pluginId)
                            .then(function (depPluginInstance) {
                                return checkDependencies(depPluginInstance, tarjan);
                            });
                    }
                }))
                .nodeify(callback);
        }

        /**
         * These are used to determine if the user is allowed to execute a plugin based on
         * the project access level. It also determines if the user is allowed to modify certain config
         * parameters of the plugin.
         * N.B. When reading or writing to the project from the plugin the access level is always checked
         * by the storage.
         * @type {{read: boolean, write: boolean, delete: boolean}}
         */
        this.projectAccess = {
            read: true,
            write: true,
            delete: true
        };

        /**
         *
         */
        this.blobClient = blobClient;

        /**
         *
         * @param {string} pluginId
         * @param {object} pluginConfig - configuration for the plugin.
         * @param {object} context
         * @param {string} [context.branchName] - name of branch that should be updated
         * @param {string} [context.commitHash=<%brashHash%>] - commit from which to start the plugin.
         * @param {ProjectInterface} [context.project=project] - project instance if different from the one passed in.
         * @param {string} [context.activeNode=''] - path to active node
         * @param {string[]} [context.activeSelection=[]] - paths to selected nodes.
         * @param {string} [context.namespace=''] - used namespace during execution ('' represents all namespaces).
         * @param {function} callback
         */
        this.executePlugin = function (pluginId, pluginConfig, context, callback) {
            var plugin;
            self.initializePlugin(pluginId)
                .then(function (plugin_) {
                    plugin = plugin_;
                    return self.configurePlugin(plugin, pluginConfig, context);
                })
                .then(function () {
                    self.runPluginMain(plugin, callback);
                })
                .catch(function (err) {
                    var pluginResult = self.getPluginErrorResult(pluginId, pluginId, 'Exception was raised, err: ' + err.stack,
                        plugin && plugin.projectId);
                    self.logger.error(err.stack);
                    callback(err.message, pluginResult);
                });
        };

        /**
         * Retrieves plugin script files and creates instance.
         * @param {string} - pluginId
         * @param {function} callback
         * @returns {promise}
         */
        this.initializePlugin = function (pluginId, callback) {
            var plugin,
                tarjan;

            if (!self.serverSide && !self.browserSide) {
                self.logger.debug('Running as CLI - does not respect gmeConfig.plugin.allowServerExecution..');
            } else {
                if (self.serverSide && !gmeConfig.plugin.allowServerExecution) {
                    throw new Error('Plugin execution on server side is disabled from gmeConfig.');
                } else if (self.browserSide && !gmeConfig.plugin.allowBrowserExecution) {
                    throw new Error('Plugin execution on server side is disabled from gmeConfig.');
                }
            }

            return getPluginInstance(pluginId)
                .then(function (plugin_) {
                    tarjan = new Tarjan();
                    plugin = plugin_;

                    tarjan.addVertex(pluginId);
                    return checkDependencies(plugin, tarjan);
                })
                .then(function () {
                    if (tarjan.hasLoops()) {
                        throw new Error('The dependencies of ' + pluginId + ' forms a circular loop..');
                    }

                    var pluginLogger = self.logger.fork('plugin:' + pluginId);

                    plugin.initialize(pluginLogger, self.blobClient, gmeConfig);

                    return plugin;
                })
                .nodeify(callback);
        };

        /**
         *
         * @param {object} plugin
         * @param {object} pluginConfig - configuration for the plugin.
         * @param {object} context
         * @param {string} context.branchName - name of branch that should be updated
         * @param {string} [context.commitHash=<%brashHash%>] - commit from which to start the plugin.
         * @param {ProjectInterface} [context.project=project] - project instance if different from the one passed in.
         * @param {string} [context.activeNode=''] - path to active node
         * @param {string[]} [context.activeSelection=[]] - paths to selected nodes.
         * @param {string} [context.namespace=''] - used namespace during execution ('' represents all namespaces).
         * @param {function} callback
         * @returns {promise}
         */
        this.configurePlugin = function (plugin, pluginConfig, context, callback) {
            var deferred = Q.defer(),
                self = this,
                defaultConfig = plugin.getDefaultConfig(),
                writeAccessKeys = {},
                readOnlyKeys = {},
                faultyKeys = [],
                key;

            context.project = context.project || project;

            if (context.project instanceof ProjectInterface === false) {
                deferred.reject(new Error('project is not an instance of ProjectInterface, ' +
                    'pass it via context or set it in the constructor of PluginManagerBase.'));
            } else if (plugin.pluginMetadata.writeAccessRequired === true && self.projectAccess.write === false) {
                deferred.reject(new Error('Plugin requires write access to the project for execution!'));
            } else {
                plugin.pluginMetadata.configStructure.forEach(function (configStructure) {
                    if (configStructure.writeAccessRequired === true && self.projectAccess.write === false) {
                        writeAccessKeys[configStructure.name] = true;
                    }
                    if (configStructure.readOnly === true) {
                        readOnlyKeys[configStructure.name] = true;
                    }
                });

                pluginConfig = pluginConfig || {};

                for (key in pluginConfig) {

                    if (readOnlyKeys[key] || writeAccessKeys[key]) {
                        // Parameter is not allowed to be modified, check if it was.
                        if (pluginConfig.hasOwnProperty(key) &&
                            pluginConfig[key] !== defaultConfig[key]) {
                            faultyKeys.push(key);
                        }
                    }

                    // We do allow extra config-parameters that aren't specified in the default config.
                    defaultConfig[key] = pluginConfig[key];
                }

                if (faultyKeys.length > 0) {
                    deferred.reject(new Error('User not allowed to modify configuration parameter(s): "' +
                        faultyKeys + '".'));
                } else {

                    plugin.setCurrentConfig(defaultConfig);

                    self.loadContext(context)
                        .then(function (pluginContext) {
                            plugin.configure(pluginContext);
                            deferred.resolve();
                        })
                        .catch(deferred.reject);
                }
            }

            return deferred.promise.nodeify(callback);
        };

        /**
         *
         * @param plugin
         * @param callback
         */
        this.runPluginMain = function (plugin, callback) {
            var startTime = (new Date()).toISOString(),
                mainCallbackCalls = 0,
                multiCallbackHandled = false;

            self.logger.debug('plugin configured, invoking main');

            if (plugin.isConfigured === false) {
                callback('Plugin is not configured.', self.getPluginErrorResult(plugin.getId(), plugin.getName(),
                    'Plugin is not configured.', project && project.projectId));
                return;
            }

            plugin.notificationHandlers = self.notificationHandlers;

            plugin.main(function (err, result) {
                var stackTrace;
                if (result) {
                    self.logger.debug('plugin main callback called', {result: result.serialize()});
                }
                mainCallbackCalls += 1;
                // set common information (meta info) about the plugin and measured execution times
                result.setFinishTime((new Date()).toISOString());
                result.setStartTime(startTime);

                result.setPluginName(plugin.getName());
                result.setPluginId(plugin.getId());

                if (mainCallbackCalls > 1) {
                    stackTrace = new Error().stack;
                    self.logger.error('The main callback is being called more than once!', {metadata: stackTrace});
                    result.setError('The main callback is being called more than once!');
                    if (multiCallbackHandled === true) {
                        plugin.createMessage(null, stackTrace);
                        return;
                    }
                    multiCallbackHandled = true;
                    result.setSuccess(false);
                    plugin.createMessage(null, 'The main callback is being called more than once.');
                    plugin.createMessage(null, stackTrace);
                    callback('The main callback is being called more than once!', result);
                } else {
                    result.setError(err);
                    plugin.notificationHandlers = [];
                    callback(err, result);
                }
            });
        };

        this.getPluginErrorResult = function (pluginId, pluginName, message, projectId) {
            var pluginResult = new PluginResult(),
                pluginMessage = new PluginMessage();
            pluginMessage.severity = 'error';
            pluginMessage.message = message;
            pluginResult.setSuccess(false);
            pluginResult.setPluginName(pluginName);
            pluginResult.setPluginId(pluginId);
            pluginResult.setProjectId(projectId || 'N/A');
            pluginResult.addMessage(pluginMessage);
            pluginResult.setStartTime((new Date()).toISOString());
            pluginResult.setFinishTime((new Date()).toISOString());
            pluginResult.setError(pluginMessage.message);

            return pluginResult;
        };

        function getBranchHash(project, branchName) {
            if (branchName) {
                return project.getBranchHash(branchName);
            } else {
                return Q(null);
            }
        }

        /**
         *
         * @param {object} context
         * @param {object} context.project - project form where to load the context.
         * @param {string} [context.branchName] - name of branch that should be updated
         * @param {string} [context.commitHash=<%branchHash%>] - commit from which to start the plugin.
         * @param {string} [context.activeNode=''] - path to active node
         * @param {string[]} [context.activeSelection=[]] - paths to selected nodes.
         * @param {string} [context.namespace=''] - used namespace during execution ('' represents all namespaces).
         * @param {object} pluginLogger - logger for the plugin.
         */
        this.loadContext = function (context) {
            var deferred = Q.defer(),
                pluginContext = {
                    branchName: context.branchName,
                    commitHash: context.commitHash || context.commit,

                    rootNode: null,
                    activeNode: null,
                    activeSelection: null,
                    META: {},
                    namespace: context.namespace || '',

                    project: context.project,
                    projectId: context.project.projectId,
                    projectName: storageUtil.getProjectNameFromProjectId(context.project.projectId),
                    core: new Core(context.project, {
                        globConf: gmeConfig,
                        logger: self.logger.fork('core')
                    })
                };

            self.logger.debug('loading context');
            getBranchHash(pluginContext.project, pluginContext.branchName)
                .then(function (branchHash) {
                    pluginContext.commitHash = context.commitHash || branchHash;
                    if (!pluginContext.commitHash) {
                        throw new Error('Neither commitHash nor branchHash from branch was obtained, branchName: [' +
                            context.branchName + ']');
                    }

                    return pluginUtil.loadNodesAtCommitHash(
                        pluginContext.project,
                        pluginContext.core,
                        pluginContext.commitHash,
                        self.logger,
                        context);
                })
                .then(function (result) {
                    pluginContext.rootNode = result.rootNode;
                    pluginContext.activeNode = result.activeNode;
                    pluginContext.activeSelection = result.activeSelection;
                    pluginContext.META = result.META;

                    deferred.resolve(pluginContext);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });

            return deferred.promise;
        };
    }

    return PluginManagerBase;
});