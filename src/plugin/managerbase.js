/*globals requirejs, define*/
/*jshint node:true, newcap:false, browser: true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'common/core/coreQ',
    'plugin/PluginResult',
    'plugin/PluginMessage',
    'common/storage/project/interface',
    'common/storage/util',
    'q',
], function (Core,
             PluginResult,
             PluginMessage,
             ProjectInterface,
             storageUtil,
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
         * @param {string} [context.namespace=''] - used namespace during execution ('' is the root).
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
                    var pluginResult = self.getPluginErrorResult(pluginId, 'Exception was raised, err: ' + err.stack,
                        plugin && plugin.projectId);
                    self.logger.error(err.stack);
                    callback(err.message, pluginResult);
                });
        };

        /**
         * Retrives plugin script files and creates instance.
         * @param {string} - pluginId
         * @param {function} callback
         * @returns {promise}
         */
        this.initializePlugin = function (pluginId, callback) {
            return getPlugin(pluginId)
                .then(function (PluginClass) {
                    var pluginLogger = self.logger.fork('plugin:' + pluginId),
                        plugin;

                    plugin = new PluginClass();
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
         * @param {string} [context.namespace=''] - used namespace during execution ('' is the root).
         * @param {function} callback
         * @returns {promise}
         */
        this.configurePlugin = function (plugin, pluginConfig, context, callback) {
            var deferred = Q.defer(),
                pluginConfiguration = plugin.getDefaultConfig(),
                key;

            if (pluginConfig) {
                for (key in pluginConfig) {
                    // We do allow extra config-parameters that aren't specified in the default config.
                    pluginConfiguration[key] = pluginConfig[key];
                }
            }

            plugin.setCurrentConfig(pluginConfiguration);

            context.project = context.project || project;

            if (context.project instanceof ProjectInterface === false) {
                deferred.reject(new Error('project is not an instance of ProjectInterface, ' +
                    'pass it via context or set it in the constructor of PluginManagerBase.'));
            } else {
                self.loadContext(context)
                    .then(function (pluginContext) {
                        plugin.configure(pluginContext);
                        deferred.resolve();
                    })
                    .catch(deferred.reject);
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
                callback('Plugin is not configured.', self.getPluginErrorResult(plugin.getName(),
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

        function getPlugin(pluginId, callback) {
            var deferred = Q.defer(),
                rejected = false,
                pluginPath = 'plugin/' + pluginId + '/' + pluginId + '/' + pluginId;

            if (self.serverSide && !gmeConfig.plugin.allowServerExecution) {
                deferred.reject(new Error('Plugin execution on server side is disabled from gmeConfig.'));
                rejected = true;
            } else if (self.browserSide && !gmeConfig.plugin.allowBrowserExecution) {
                deferred.reject(new Error('Plugin execution in browser is disabled from gmeConfig.'));
                rejected = true;
            } else {
                self.logger.debug('Running as CLI - does not respect gmeConfig.plugin.allowServerExecution..');
            }

            if (rejected === false) {
                requirejs([pluginPath],
                    function (PluginClass) {
                        self.logger.debug('requirejs plugin from path: ' + pluginPath);
                        deferred.resolve(PluginClass);
                    },
                    function (err) {
                        deferred.reject(err);
                    }
                );
            }

            return deferred.promise.nodeify(callback);
        }

        this.getPluginErrorResult = function (pluginName, message, projectId) {
            var pluginResult = new PluginResult(),
                pluginMessage = new PluginMessage();
            pluginMessage.severity = 'error';
            pluginMessage.message = message;
            pluginResult.setSuccess(false);
            pluginResult.setPluginName(pluginName);
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
         * @param {string} [context.namespace=''] - used namespace during execution ('' is the root).
         * @param {object} pluginLogger - logger for the plugin.
         */
        this.loadContext = function (context) {
            var deferred = Q.defer(),
                pluginContext = {
                    branchName: context.branchName,
                    commitHash: context.commitHash,

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
                    return Q.ninvoke(pluginContext.project, 'loadObject', pluginContext.commitHash);
                })
                .then(function (commitObject) {
                    var rootDeferred = Q.defer();
                    self.logger.debug('commitObject loaded', {metadata: commitObject});
                    pluginContext.core.loadRoot(commitObject.root, function (err, rootNode) {
                        if (err) {
                            rootDeferred.reject(err);
                        } else {
                            self.logger.debug('rootNode loaded');
                            rootDeferred.resolve(rootNode);
                        }
                    });

                    return rootDeferred.promise;
                })
                .then(function (rootNode) {
                    pluginContext.rootNode = rootNode;
                    // Load active node
                    return self.loadNodeByPath(pluginContext, context.activeNode || '');
                })
                .then(function (activeNode) {
                    pluginContext.activeNode = activeNode;
                    self.logger.debug('activeNode loaded');
                    // Load active selection
                    return self.loadNodesByPath(pluginContext, context.activeSelection || []);
                })
                .then(function (activeSelection) {
                    pluginContext.activeSelection = activeSelection;
                    self.logger.debug('activeSelection loaded');
                    // Load meta nodes
                    var metaIds = pluginContext.core.getMemberPaths(pluginContext.rootNode, 'MetaAspectSet');
                    return self.loadNodesByPath(pluginContext, metaIds, !context.namespace);
                })
                .then(function (metaNodes) {
                    var libraryNames = pluginContext.core.getLibraryNames(pluginContext.rootNode),
                        metaNodeName,
                        nodeNamespace,
                        i;

                    function startsWith(str, pattern) {
                        return str.indexOf(pattern) === 0;
                    }

                    if (context.namespace) {
                        if (libraryNames.indexOf(context.namespace) === -1) {
                            throw new Error('Given namespace does not exist among the available: "' +
                                libraryNames + '".');
                        }

                        for (i = 0; i < metaNodes.length; i += 1) {
                            nodeNamespace = pluginContext.core.getNamespace(metaNodes[i]);
                            metaNodeName = pluginContext.core.getAttribute(metaNodes[i], 'name');

                            if (startsWith(nodeNamespace, context.namespace)) {
                                // Trim the based on the chosen namespace (+1 is to remove any dot).
                                nodeNamespace = nodeNamespace.substring(context.namespace.length + 1);
                                if (nodeNamespace) {
                                    pluginContext.META[nodeNamespace + '.' + metaNodeName] = metaNodes[i];
                                } else {
                                    pluginContext.META[metaNodeName] = metaNodes[i];
                                }
                            } else {
                                // Meta node is not within the given namespace and will not be added to META.
                            }
                        }
                    } else {
                        pluginContext.META = metaNodes;
                    }

                    deferred.resolve(pluginContext);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });

            return deferred.promise;
        };

        this.loadNodeByPath = function (pluginContext, path) {
            var deferred = Q.defer();
            pluginContext.core.loadByPath(pluginContext.rootNode, path, function (err, node) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(node);
                }
            });
            return deferred.promise;
        };

        this.loadNodesByPath = function (pluginContext, nodePaths, returnNameMap) {
            var deferred = Q.defer(),
                len = nodePaths.length,
                error = '',
                nodes = [];

            var allNodesLoadedHandler = function () {
                var nameToNode = {};

                if (error) {
                    deferred.reject(error);
                    return;
                }

                if (returnNameMap) {
                    nodes.map(function (node) {
                        if (nameToNode[pluginContext.core.getFullyQualifiedName(node)]) {
                            self.logger.error('Meta-nodes share the same full name. Will still proceed..',
                                pluginContext.core.getFullyQualifiedName(node));
                        }
                        nameToNode[pluginContext.core.getFullyQualifiedName(node)] = node;
                    });
                    deferred.resolve(nameToNode);
                } else {
                    deferred.resolve(nodes);
                }
            };

            var loadedNodeHandler = function (err, nodeObj) {
                if (err) {
                    error += err;
                }
                nodes.push(nodeObj);

                if (nodes.length === nodePaths.length) {
                    allNodesLoadedHandler();
                }
            };

            if (len === 0) {
                allNodesLoadedHandler();
            }
            while (len--) {
                pluginContext.core.loadByPath(pluginContext.rootNode, nodePaths[len], loadedNodeHandler);
            }

            return deferred.promise;
        };
    }

    return PluginManagerBase;
});