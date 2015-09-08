/*globals requireJS*/
/*jshint node:true, newcap:false*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Core = requireJS('common/core/core'),
    PluginResult = requireJS('plugin/PluginResult'),
    PluginMessage = requireJS('plugin/PluginMessage'),
    ProjectInterface = requireJS('common/storage/project/interface'),
    storageUtil = requireJS('common/storage/util'),
    Q = require('q');

/**
 *
 * @param blobClient
 * @param [project]
 * @param mainLogger
 * @param gmeConfig
 * @constructor
 */
function PluginNodeManagerBase(blobClient, project, mainLogger, gmeConfig) {
    var self = this;

    this.logger = mainLogger.fork('PluginNodeManagerBase');

    /**
     *
     * @param {string} pluginName
     * @param {object} pluginConfig - configuration for the plugin.
     * @param {object} context
     * @param {string} context.branchName - name of branch that should be updated
     * @param {string} [context.commitHash] - commit from which to start the plugin, defaults to latest for branchName.
     * @param {ProjectInterface} [context.project=project] - project instance if different from the one passed in ctor.
     * @param {string} [context.activeNode=''] - path to active node
     * @param {string[]} [context.activeSelection=[]] - paths to selected nodes.
     * @param {function} callback
     */
    this.executePlugin = function (pluginName, pluginConfig, context, callback) {
        var plugin;

        try {
            plugin = self.initializePlugin(pluginName);
        } catch (err) {
            callback(err.toString(), self.getPluginErrorResult(pluginName, 'Failed to load plugin.'));
            return;
        }

        self.configurePlugin(plugin, pluginConfig, context)
            .then(function () {
                self.runPluginMain(plugin, callback);
            })
            .catch(function (err) {
                var pluginResult = self.getPluginErrorResult(pluginName, 'Exception was raised, err: ' + err.stack);
                self.logger.error(err.stack);
                callback(err.message, pluginResult);
            });
    };

    /**
     *
     * @param {string} - pluginName
     * @returns {object} the initialized plugin.
     */
    this.initializePlugin = function (pluginName) {
        var plugin,
            Plugin,
            pluginLogger = self.logger.fork('plugin:' + pluginName);

        Plugin = getPlugin(pluginName);
        plugin = new Plugin();
        plugin.initialize(pluginLogger, blobClient, gmeConfig);

        return plugin;
    };

    /**
     *
     * @param {object} plugin
     * @param {object} pluginConfig - configuration for the plugin.
     * @param {object} context
     * @param {string} context.branchName - name of branch that should be updated
     * @param {string} [context.commitHash] - commit from which to start the plugin, defaults to latest for branchName.
     * @param {ProjectInterface} [context.project=project] - project instance if different from the one passed in ctor.
     * @param {string} [context.activeNode=''] - path to active node
     * @param {string[]} [context.activeSelection=[]] - paths to selected nodes.
     * @param {function} callback
     * @returns {promise}
     */
    this.configurePlugin = function (plugin, pluginConfig, context, callback) {
        var deferred = Q.defer(),
            pluginConfiguration = plugin.getDefaultConfig(),
            key;

        if (pluginConfig) {
            for (key in pluginConfig) {
                if (pluginConfig.hasOwnProperty(key)) {
                    pluginConfiguration[key] = pluginConfig[key];
                }
            }
        }

        //TODO: Check that a passed config is consistent with the structure..
        plugin.setCurrentConfig(pluginConfiguration);

        context.project = context.project || project;

        if (context.project instanceof ProjectInterface === false) {
            deferred.reject(new Error('project is not an instance of ProjectInterface, pass it via context or set it ' +
                'in the constructor of NodeManagerBase.'));
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
                'Plugin is not configured.'));
            return;
        }

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
                callback(err, result);
            }
        });
    };

    function getPlugin(name) {
        var pluginPath = 'plugin/' + name + '/' + name + '/' + name;
        self.logger.debug('requireJS plugin from path: ' + pluginPath);
        return requireJS('plugin/' + name + '/' + name + '/' + name);
    }

    this.getPluginErrorResult = function (pluginName, message) {
        var pluginResult = new PluginResult(),
            pluginMessage = new PluginMessage();
        pluginMessage.severity = 'error';
        pluginMessage.message = message;
        pluginResult.setSuccess(false);
        pluginResult.pluginName = pluginName;
        pluginResult.addMessage(pluginMessage);
        pluginResult.setStartTime((new Date()).toISOString());
        pluginResult.setFinishTime((new Date()).toISOString());
        pluginResult.setError(pluginMessage.message);

        return pluginResult;
    };

    /**
     *
     * @param {object} context
     * @param {object} context.project - project form where to load the context.
     * @param {string} context.branchName - name of branch that should be updated
     * @param {string} [context.commitHash] - commit from which to start the plugin, defaults to latest for branchName.
     * @param {string} [context.activeNode=''] - path to active node
     * @param {string[]} [context.activeSelection=[]] - paths to selected nodes.
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
                META: null,

                project: context.project,
                projectId: context.project.projectId,
                projectName: storageUtil.getProjectNameFromProjectId(context.project.projectId),
                core: new Core(context.project, {
                    globConf: gmeConfig,
                    logger: self.logger.fork('core')
                })
            };

        self.logger.debug('loading context');

        pluginContext.project.getBranchHash(pluginContext.branchName)
            .then(function (commitHash) {
                pluginContext.commitHash = context.commitHash || commitHash;
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
                return self.loadNodesByPath(pluginContext, metaIds, true);
            })
            .then(function (metaNodes) {
                pluginContext.META = metaNodes;
                self.logger.debug('metaNodes loaded');
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
                    //TODO: what if the names are equal?
                    nameToNode[pluginContext.core.getAttribute(node, 'name')] = node;
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

module.exports = PluginNodeManagerBase;