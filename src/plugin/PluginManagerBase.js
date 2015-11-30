/*globals define*/
/*jshint browser: true, node:true*/

/**
 * @author lattmann / https://github.com/lattmann
 */

// TODO: Use PluginManagerConfiguration
// TODO: Load ActiveSelection objects and pass it correctly
// TODO: Add more statistics to the result object
// TODO: Result object rename name -> pluginName, time -> finishTime)
// TODO: Make this class testable
// TODO: PluginManager should download the plugins


define(['plugin/PluginBase', 'plugin/PluginContext', 'common/storage/util'],
    function (PluginBase, PluginContext, storageUtil) {
        'use strict';

        var PluginManagerBase = function (storage, Core, logger, plugins, gmeConfig) {
            this.gmeConfig = gmeConfig; // global configuration of webgme
            this.logger = logger.fork('PluginManager');
            this._Core = Core;       // webgme core class is used to operate on objects
            this._storage = storage; // webgme storage (project)
            this._plugins = plugins; // key value pair of pluginName: pluginType - plugins are already loaded/downloaded
            this._pluginConfigs = {}; // keeps track of the current configuration for each plugins by name
            this.notificationHandlers = [];

            if (!this.gmeConfig) {
                // TODO: this error check is temporary
                throw new Error('PluginManagerBase takes gmeConfig as parameter!');
            }

            var pluginNames = Object.keys(this._plugins);
            for (var i = 0; i < pluginNames.length; i += 1) {
                var p = new this._plugins[pluginNames[i]]();
                this._pluginConfigs[pluginNames[i]] = p.getDefaultConfig();
            }
        };

        PluginManagerBase.prototype.initialize = function (managerConfiguration, configCallback, callbackContext) {
            var self = this,
                pluginName,
                plugins = this._plugins;

            //#1: PluginManagerBase should load the plugins

            //#2: PluginManagerBase iterates through each plugin and collects the config data
            var pluginConfigs = {};

            for (pluginName in plugins) {
                if (plugins.hasOwnProperty(pluginName)) {
                    var plugin = new plugins[pluginName]();
                    pluginConfigs[pluginName] = plugin.getConfigStructure();
                }
            }

            if (configCallback) {
                configCallback.call(callbackContext, pluginConfigs, function (updatedPluginConfig) {
                    for (pluginName in updatedPluginConfig) {
                        if (updatedPluginConfig.hasOwnProperty(pluginName)) {
                            //save it back to the plugin
                            self._pluginConfigs[pluginName] = updatedPluginConfig[pluginName];
                        }
                    }
                });
            }
        };

        /**
         * Gets a new instance of a plugin by name.
         *
         * @param {string} name
         * @returns {plugin.PluginBase}
         */
        PluginManagerBase.prototype.getPluginByName = function (name) {
            return this._plugins[name];
        };

        PluginManagerBase.prototype.loadMetaNodes = function (pluginContext, callback) {
            var self = this;

            this.logger.debug('Loading meta nodes');

            // get meta members
            var metaIDs = pluginContext.core.getMemberPaths(pluginContext.rootNode, 'MetaAspectSet');

            var len = metaIDs.length;

            var nodeObjs = [];


            var allObjectsLoadedHandler = function () {
                var len2 = nodeObjs.length;

                var nameObjMap = {};

                while (len2--) {
                    var nodeObj = nodeObjs[len2];

                    nameObjMap[pluginContext.core.getAttribute(nodeObj, 'name')] = nodeObj;
                }

                pluginContext.META = nameObjMap;

                self.logger.debug('Meta nodes are loaded');

                callback(null, pluginContext);
            };

            var loadedMetaObjectHandler = function (err, nodeObj) {
                nodeObjs.push(nodeObj);

                if (nodeObjs.length === metaIDs.length) {
                    allObjectsLoadedHandler();
                }
            };

            while (len--) {
                pluginContext.core.loadByPath(pluginContext.rootNode, metaIDs[len], loadedMetaObjectHandler);
            }
        };

        /**
         *
         * @param {plugin.PluginManagerConfiguration} managerConfiguration
         * @param {function} callback
         */
        PluginManagerBase.prototype.getPluginContext = function (managerConfiguration, callback) {
            var self = this,
                pluginContext = new PluginContext();

            // TODO: check if callback is a function
            // based on the string values get the node objects
            // 1) Open project
            // 2) Load branch OR commit hash
            // 3) Load rootNode
            // 4) Load active object
            // 5) Load active selection
            // 6) Update context
            // 7) return

            pluginContext.project = this._storage;
            pluginContext.projectName = storageUtil.getProjectNameFromProjectId(managerConfiguration.project);
            pluginContext.projectId = managerConfiguration.project;
            pluginContext.branchName = managerConfiguration.branchName;

            pluginContext.core = new self._Core(pluginContext.project, {
                globConf: self.gmeConfig,
                logger: self.logger.fork('core') //TODO: This logger should probably fork from the plugin logger
            });
            pluginContext.commitHash = managerConfiguration.commit;
            pluginContext.activeNode = null;    // active object
            pluginContext.activeSelection = []; // selected objects


            // add activeSelection
            function loadActiveSelectionAndMetaNodes() {
                var remaining = managerConfiguration.activeSelection.length,
                    i;
                function loadNodeByNode(selectedNodePath) {
                    pluginContext.core.loadByPath(pluginContext.rootNode, selectedNodePath,
                        function (err, selectedNode) {
                            remaining -= 1;

                            if (err) {
                                self.logger.warn('unable to load active selection: ' + selectedNodePath);
                            } else {
                                pluginContext.activeSelection.push(selectedNode);
                            }

                            if (remaining === 0) {
                                // all nodes from active selection are loaded
                                self.loadMetaNodes(pluginContext, callback);
                            }
                        }
                    );
                }
                if (managerConfiguration.activeSelection.length === 0) {
                    self.loadMetaNodes(pluginContext, callback);
                } else {
                    for (i = 0; i < managerConfiguration.activeSelection.length; i += 1) {
                        loadNodeByNode(managerConfiguration.activeSelection[i]);
                    }
                }
            }

            // add activeNode
            function loadCommitHashAndRun(commitHash) {
                self.logger.info('Loading commit ' + commitHash);
                pluginContext.project.getCommits(commitHash, 1, function (err, commitObjects) {
                    var commitObj;
                    if (err || commitObjects.length !== 1) {
                        if (err) {
                            callback(err, pluginContext);
                        } else {
                            self.logger.error('commitObjects', commitObjects);
                            callback('getCommits did not return with one commit', pluginContext);
                        }
                        return;
                    }

                    commitObj = commitObjects[0];

                    if (typeof commitObj === 'undefined' || commitObj === null) {
                        callback('cannot find commit', pluginContext);
                        return;
                    }

                    if (managerConfiguration.rootHash && commitObj.root !== managerConfiguration.rootHash) {
                        // This is a sanity check for the client state handling..
                        self.logger.error('Root hash for commit-object, is not the same as passed from the client.' +
                        'commitHash, rootHash, given rootHash:',
                            commitHash, commitObj.root, managerConfiguration.rootHash);
                    }

                    pluginContext.core.loadRoot(commitObj.root, function (err, rootNode) {
                        if (err) {
                            callback('unable to load root', pluginContext);
                            return;
                        }

                        pluginContext.rootNode = rootNode;
                        if (typeof managerConfiguration.activeNode === 'string') {
                            pluginContext.core.loadByPath(pluginContext.rootNode, managerConfiguration.activeNode,
                                function (err, activeNode) {
                                    if (err) {
                                        callback('unable to load selected object', pluginContext);
                                        return;
                                    }

                                    pluginContext.activeNode = activeNode;
                                    loadActiveSelectionAndMetaNodes();
                                }
                            );
                        } else {
                            pluginContext.activeNode = null;
                            loadActiveSelectionAndMetaNodes();
                        }
                    });
                });
            }

            // load commit hash and run based on branch name or commit hash
            //if (managerConfiguration.branchName) {
            pluginContext.project.getBranches(function (err, branches) {
                if (err) {
                    callback(err);
                    return;
                }
                self.logger.debug(branches);
                if (managerConfiguration.branchName && !branches.hasOwnProperty(managerConfiguration.branchName)) {
                    //pluginContext.commitHash = branches[managerConfiguration.branchName];
                    callback('cannot find branch "' + managerConfiguration.branchName + '"', pluginContext);
                } else {
                    loadCommitHashAndRun(pluginContext.commitHash);
                }
            });
            //} else {
            //    loadCommitHashAndRun(pluginContext.commitHash);
            //}

        };

        PluginManagerBase.prototype.executePlugin = function (name, managerConfiguration, callback) {
            // TODO: check if name is a string
            // TODO: check if managerConfiguration is an instance of PluginManagerConfiguration
            // TODO: check if callback is a function
            var self = this,
                mainCallbackCalls = 0,
                multiCallbackHandled = false;

            var PluginClass = this.getPluginByName(name);

            var plugin = new PluginClass();

            var pluginLogger = this.logger.fork('gme:plugin:' + name, true);

            plugin.initialize(pluginLogger, managerConfiguration.blobClient, self.gmeConfig);

            plugin.setCurrentConfig(this._pluginConfigs[name]);
            for (var key in managerConfiguration.pluginConfig) {
                if (managerConfiguration.pluginConfig.hasOwnProperty(key) &&
                    plugin._currentConfig.hasOwnProperty(key)) {

                    plugin._currentConfig[key] = managerConfiguration.pluginConfig[key];
                }
            }
            self.getPluginContext(managerConfiguration, function (err, pluginContext) {
                if (err) {
                    // TODO: this has to return with an empty PluginResult object and NOT with null.
                    callback(err, null);
                    return;

                }

                plugin.configure(pluginContext);

                var startTime = (new Date()).toISOString();

                plugin.notificationHandlers = self.notificationHandlers;

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
                        plugin.notificationHandlers = [];
                        callback(err, result);
                    }
                });

            });

        };


        return PluginManagerBase;
    });