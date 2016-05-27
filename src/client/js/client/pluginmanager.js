/*globals define*/
/*jshint browser: true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */


define([
    'plugin/managerbase',
    'blob/BlobClient',
    'common/storage/project/project',
    'js/RegistryKeys'
], function (PluginManagerBase, BlobClient, Project, REG_KEYS) {
    'use strict';

    var ROOT_PATH = '';

    /**
     *
     * @param client
     * @param storage
     * @param state
     * @param mainLogger
     * @param gmeConfig
     * @constructor
     */
    function PluginManager(client, storage, state, mainLogger, gmeConfig) {

        var self = this,
            logger = mainLogger.fork('PluginManager');

        this.getCurrentPluginContext = function (pluginId, activeNodeId) {
            var activeNode,
                validPlugins,
                context =  {
                managerConfig: {
                    project: client.getProjectObject(),
                    branchName: client.getActiveBranchName(),
                    commitHash: client.getActiveCommitHash(),
                    activeNode: ROOT_PATH,
                    activeSelection: [],
                    namespace: ''
                },
                pluginConfig: null
            };

            // If executed from the Generic UI we can access the active- and selected-nodes.
            if (typeof WebGMEGlobal !== 'undefined') {
                /* jshint -W117 */
                activeNodeId = typeof activeNodeId === 'string' ? activeNodeId : WebGMEGlobal.State.getActiveObject();
                context.managerConfig.activeSelection = WebGMEGlobal.State.getActiveSelection();
                context.managerConfig.activeNode = activeNodeId;
                /* jshint +W117 */
            }

            // Given the active-node we infer the namespace (user may still select another one).
            if (activeNodeId && pluginId) {
                activeNode = client.getNode(activeNodeId);
                do {
                    validPlugins = activeNode.getOwnRegistry(REG_KEYS.VALID_PLUGINS);
                    if (validPlugins && validPlugins.indexOf(pluginId) > -1) {
                        // The plugin was defined at this particular node, we use the namespace of it.
                        context.managerConfig.namespace = activeNode.getNamespace();
                        break;
                    }

                    activeNode = activeNode.getBaseId() ? client.getNode(activeNode.getBaseId()) : null;
                } while (activeNode);
            }

            return context;
        };

        /**
         * Run the plugin in the browser.
         * @param {string} pluginId - id of plugin.
         * @param {object} context
         * @param {object} context.managerConfig - where the plugin should execute.
         * @param {Project} context.managerConfig.project - project (e.g. client.getProjectObject()).
         * @param {string} [context.managerConfig.activeNode=''] - path to activeNode.
         * @param {string} [context.managerConfig.activeSelection=[]] - paths to selected nodes.
         * @param {string} context.managerConfig.commitHash - commit hash to start the plugin from.
         * @param {string} [context.managerConfig.branchName] - branch which to save to.
         * @param {string} [context.managerConfig.namespace=''] - used namespace during execution ('' represents all namespaces).
         * @param {object} [context.pluginConfig=%defaultForPlugin%] - specific configuration for the plugin.
         * @param {function(err, PluginResult)} callback
         */
        this.runBrowserPlugin = function (pluginId, context, callback) {
            var blobClient = new BlobClient({logger: logger.fork('BlobClient')}),
                pluginManager = new PluginManagerBase(blobClient, null, mainLogger, gmeConfig);

            pluginManager.browserSide = true;

            pluginManager.notificationHandlers = [function (data, callback) {
                self.dispatchPluginNotification(data);
                callback(null);
            }];

            pluginManager.projectAccess = client.getProjectAccess();

            pluginManager.executePlugin(pluginId, context.pluginConfig, context.managerConfig, callback);
        };

        /**
         * Run the plugin on the server inside a worker process.
         * @param {string} pluginId - id of plugin.
         * @param {object} context
         * @param {object} context.managerConfig - where the plugin should execute.
         * @param {Project|string} context.managerConfig.project - id of project.
         * @param {string} [context.managerConfig.activeNode=''] - path to activeNode.
         * @param {string} [context.managerConfig.activeSelection=[]] - paths to selected nodes.
         * @param {string} context.managerConfig.commitHash - commit hash to start the plugin from.
         * @param {string} [context.managerConfig.branchName] - branch which to save to.
         * @param {string} [context.managerConfig.namespace=''] - used namespace during execution ('' represents all namespaces).
         * @param {object} [context.pluginConfig=%defaultForPlugin%] - specific configuration for the plugin.
         * @param {function} callback
         */
        this.runServerPlugin = function (pluginId, context, callback) {

            if (context.managerConfig.project instanceof Project) {
                context.managerConfig.project = context.managerConfig.project.projectId;
            }

            storage.simpleRequest({command: 'executePlugin', name: pluginId, context: context}, callback);
        };

        /**
         * @param {string[]} pluginIds - All available plugins on the server.
         * @param {string} [nodePath=''] - Node to get the validPlugins from.
         * @returns {string[]} - Filtered plugin ids.
         */
        this.filterPlugins = function (pluginIds, nodePath) {
            var filteredIds = [],
                validPlugins,
                i,
                node;

            logger.debug('filterPluginsBasedOnNode allPlugins, given nodePath', pluginIds, nodePath);
            if (!nodePath) {
                logger.debug('filterPluginsBasedOnNode nodePath not given - will fall back on root-node.');
                nodePath = ROOT_PATH;
            }

            node = state.nodes[nodePath];

            if (!node) {
                logger.warn('filterPluginsBasedOnNode node not loaded - will fall back on root-node.', nodePath);
                nodePath = ROOT_PATH;
                node = state.nodes[nodePath];
            }

            if (!node) {
                logger.warn('filterPluginsBasedOnNode root node not loaded - will return full list.');
                return pluginIds;
            }

            validPlugins = (state.core.getRegistry(node.node, 'validPlugins') || '').split(' ');
            for (i = 0; i < validPlugins.length; i += 1) {
                if (pluginIds.indexOf(validPlugins[i]) > -1) {
                    filteredIds.push(validPlugins[i]);
                } else if (validPlugins[i] === '') {
                    // Skip empty strings..
                } else {
                    logger.warn('Registered plugin for node at path "' + nodePath +
                        '" is not amongst available plugins', pluginIds);
                }
            }

            return filteredIds;
        };

        this.dispatchPluginNotification = function (data) {
            var notification = {
                severity: data.notification.severity || 'info',
                message: '[Plugin] ' + data.pluginName + ' - ' + data.notification.message
            };

            if (typeof data.notification.progress === 'number') {
                notification.message += ' [' + data.notification.progress + '%]';
            }

            logger.debug('plugin notification', data);
            client.dispatchEvent(client.CONSTANTS.NOTIFICATION, notification);
            client.dispatchEvent(client.CONSTANTS.PLUGIN_NOTIFICATION, data);
        };
    }

    return PluginManager;

});