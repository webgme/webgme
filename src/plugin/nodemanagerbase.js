/*globals requireJS*/
/*jshint node:true, newcap:false*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Core = requireJS('common/core/core'),
    PluginResult = requireJS('plugin/PluginResult'),
    PluginMessage = requireJS('plugin/PluginMessage'),
    Q = require('Q');

function PluginNodeManagerBase(blobClient, project, mainLogger, gmeConfig) {
    var self = this;

    this.logger = mainLogger.fork('PluginNodeManagerBase');
    this.core = null;

    /**
     *
     * @param {string} pluginName
     * @param {object} pluginConfig - configuration for the plugin.
     * @param {object} context
     * @param {string} context.activeNode - path to active node
     * @param {string[]} context.activeSelection - paths to selected nodes.
     * @param {string} context.commitHash - commit from which to start the plugin.
     * @param {string} context.branchName - name of branch that should be updated
     * @param callback
     */
    this.executePlugin = function (pluginName, pluginConfig, context, callback) {
        var plugin,
            Plugin,
            pluginLogger = self.logger.fork('plugin:' + pluginName);

        try {
            Plugin = getPlugin(pluginName);
        } catch (err) {
            callback(err.toString(), self.getPluginErrorResult(pluginName, 'Failed to load plugin.'));
            return;
        }
        plugin = new Plugin();
        plugin.initialize(pluginLogger, blobClient, gmeConfig);

        this.core = new Core(project, {
            globConf: gmeConfig,
            logger: pluginLogger.fork('core')
        });

        self.loadContext(context)
            .then(function (pluginContext) {
                var startTime = (new Date()).toISOString(),
                    mainCallbackCalls = 0,
                    multiCallbackHandled = false;

                pluginContext.project = project;
                pluginContext.branch = null; // Branch is only applicable on client side.
                pluginContext.projectName = project.name;
                pluginContext.core = self.core;

                plugin.configure(pluginContext); // (This does not modify pluginContext.)

                plugin.main(function (err, result) {
                    var stackTrace;

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
            })
            .catch(function (err) {
                var pluginResult = self.getPluginErrorResult(pluginName, 'Failed to load context.');
                callback(err.toString(), pluginResult);
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
    };

    /**
     *
     * @param {object} context
     * @param {string} context.activeNode - path to active node
     * @param {string[]} context.activeSelection - paths to selected nodes.
     * @param {string} context.commitHash - commit from which to start the plugin.
     * @param {string} context.branchName - name of branch that should be updated
     */
    this.loadContext = function (context) {
        var deferred = Q.defer(),
            pluginContext = {
                branchName: context.branchName,
                commitHash: context.commitHash,

                rootNode: null,
                activeNode: null,
                activeSelection: null,
                META: null
            };

        Q.ninvoke(project, 'loadObject', context.commitHash)
            .then(function (commitObject) {
                var rootDeferred = Q.defer();
                self.core.loadRoot(commitObject.root, function (err, rootNode) {
                    if (err) {
                        rootDeferred.reject(err);
                    } else {
                        rootDeferred.resolve(rootNode);
                    }
                });

                return rootDeferred.promise;
            })
            .then(function (rootNode) {
                pluginContext.rootNode = rootNode;
                // Load active node
                return self.loadNodeByPath(rootNode, context.activeNode || '');
            })
            .then(function (activeNode) {
                pluginContext.activeNode = activeNode;
                // Load active selection
                return self.loadNodesByPath(pluginContext.rootNode, context.activeSelection || []);
            })
            .then(function (activeSelection) {
                pluginContext.activeSelection = activeSelection;
                // Load meta nodes
                var metaIds = self.core.getMemberPaths(pluginContext.rootNode, 'MetaAspectSet');
                return self.loadNodesByPath(pluginContext.rootNode, metaIds, true);
            })
            .then(function (metaNodes) {
                pluginContext.META = metaNodes;
                deferred.resolve(pluginContext);
            });

        return deferred.promise;
    };

    this.loadNodeByPath = function (rootNode, path) {
        var deferred = Q.defer();
        self.core.loadByPath(rootNode, path, function (err, rootNode) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(rootNode);
            }
        });
        return deferred.promise;
    };

    this.loadNodesByPath = function (rootNode, nodePaths, returnNameMap) {
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
                    nameToNode[self.core.getAttribute(node, 'name')] = node;
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
            self.core.loadByPath(rootNode, nodePaths[len], loadedNodeHandler);
        }

        return deferred.promise;
    };
}

module.exports = PluginNodeManagerBase;