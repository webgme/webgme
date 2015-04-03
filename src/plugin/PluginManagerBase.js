/*globals define*/

/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 */

// TODO: Use PluginManagerConfiguration
// TODO: Load ActiveSelection objects and pass it correctly
// TODO: Add more statistics to the result object
// TODO: Result object rename name -> pluginName, time -> finishTime)
// TODO: Make this class testable
// TODO: PluginManager should download the plugins


define(['./PluginBase',
        './PluginContext'],
    function (PluginBase, PluginContext) {
        'use strict';

        var PluginManagerBase = function (storage, Core, Logger, plugins, gmeConfig) {
            this.gmeConfig = gmeConfig; // global configuration of webgme
            this.LoggerClass = Logger;
            this.logger = Logger.createWithGmeConfig('gme:plugin:PluginManagerBase', gmeConfig);
            this._Core = Core;       // webgme core class is used to operate on objects
            this._storage = storage; // webgme storage
            this._plugins = plugins; // key value pair of pluginName: pluginType - plugins are already loaded/downloaded
            this._pluginConfigs = {}; // keeps track of the current configuration for each plugins by name

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
                plugins = this._plugins;

            //#1: PluginManagerBase should load the plugins

            //#2: PluginManagerBase iterates through each plugin and collects the config data
            var pluginConfigs = {};

            for (var p in plugins) {
                if (plugins.hasOwnProperty(p)) {
                    var plugin = new plugins[p]();
                    pluginConfigs[p] = plugin.getConfigStructure();
                }
            }

            if (configCallback) {
                configCallback.call(callbackContext, pluginConfigs, function (updatedPluginConfig) {
                    for (var p in updatedPluginConfig) {
                        if (updatedPluginConfig.hasOwnProperty(p)) {
                            //save it back to the plugin
                            self._pluginConfigs[p] = updatedPluginConfig[p];
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

            // TODO: check if callback is a function

            var self = this;

            var pluginContext = new PluginContext();

            // based on the string values get the node objects
            // 1) Open project
            // 2) Load branch OR commit hash
            // 3) Load rootNode
            // 4) Load active object
            // 5) Load active selection
            // 6) Update context
            // 7) return

            pluginContext.project = this._storage;
            pluginContext.projectName = managerConfiguration.project;
            pluginContext.core = new self._Core(pluginContext.project, {globConf: self.gmeConfig});
            pluginContext.commitHash = managerConfiguration.commit;
            pluginContext.activeNode = null;    // active object
            pluginContext.activeSelection = []; // selected objects

            // add activeSelection
            var loadActiveSelectionAndMetaNodes = function () {
                if (managerConfiguration.activeSelection.length === 0) {
                    self.loadMetaNodes(pluginContext, callback);
                } else {
                    var remaining = managerConfiguration.activeSelection.length;

                    for (var i = 0; i < managerConfiguration.activeSelection.length; i += 1) {
                        (function (activeNodePath) {
                            pluginContext.core.loadByPath(pluginContext.rootNode, activeNodePath, function (err, activeNode) {
                                remaining -= 1;

                                if (err) {
                                    self.logger.warn('unable to load active selection: ' + activeNodePath);
                                } else {
                                    pluginContext.activeSelection.push(activeNode);
                                }

                                if (remaining === 0) {
                                    // all nodes from active selection are loaded
                                    self.loadMetaNodes(pluginContext, callback);
                                }
                            });
                        })(managerConfiguration.activeSelection[i]);
                    }
                }
            };

            // add activeNode
            var loadCommitHashAndRun = function (commitHash) {
                self.logger.info('Loading commit ' + commitHash);
                pluginContext.project.loadObject(commitHash, function (err, commitObj) {
                    if (err) {
                        callback(err, pluginContext);
                        return;
                    }

                    if (typeof commitObj === 'undefined' || commitObj === null) {
                        callback('cannot find commit', pluginContext);
                        return;
                    }

                    pluginContext.core.loadRoot(commitObj.root, function (err, rootNode) {
                        if (err) {
                            callback("unable to load root", pluginContext);
                            return;
                        }

                        pluginContext.rootNode = rootNode;
                        if (typeof managerConfiguration.activeNode === 'string') {
                            pluginContext.core.loadByPath(pluginContext.rootNode, managerConfiguration.activeNode, function (err, activeNode) {
                                if (err) {
                                    callback("unable to load selected object", pluginContext);
                                    return;
                                }

                                pluginContext.activeNode = activeNode;
                                loadActiveSelectionAndMetaNodes();
                            });
                        } else {
                            pluginContext.activeNode = null;
                            loadActiveSelectionAndMetaNodes();
                        }
                    });
                });
            };

            // load commit hash and run based on branch name or commit hash
            if (managerConfiguration.branchName) {
                pluginContext.project.getBranchNames(function (err, branchNames) {
                    self.logger.debug(branchNames);

                    if (branchNames.hasOwnProperty(managerConfiguration.branchName)) {
                        pluginContext.commitHash = branchNames[managerConfiguration.branchName];
                        pluginContext.branchName = managerConfiguration.branchName;
                        loadCommitHashAndRun(pluginContext.commitHash);
                    } else {
                        callback('cannot find branch \'' + managerConfiguration.branchName + '\'', pluginContext);
                    }
                });
            } else {
                loadCommitHashAndRun(pluginContext.commitHash);
            }

        };

        PluginManagerBase.prototype.executePlugin = function (name, managerConfiguration, callback) {
            // TODO: check if name is a string
            // TODO: check if managerConfiguration is an instance of PluginManagerConfiguration
            // TODO: check if callback is a function
            var self = this;

            var PluginClass = this.getPluginByName(name);

            var plugin = new PluginClass();

            var pluginLogger = this.LoggerClass.createWithGmeConfig('gme:plugin:' + name, this.gmeConfig);

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

                plugin.main(function (err, result) {
                    // set common information (meta info) about the plugin and measured execution times
                    result.setFinishTime((new Date()).toISOString());
                    result.setStartTime(startTime);

                    result.setPluginName(plugin.getName());
                    result.setError(err);

                    callback(err, result);
                });

            });

        };


        return PluginManagerBase;
    });