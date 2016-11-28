/*globals define*/
/*jshint browser: true, node:true*/

/**
 * This is the base class that plugins should inherit from.
 * (Using the PluginGenerator - the generated plugin will do that.)
 *
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'plugin/PluginConfig',
    'plugin/PluginResult',
    'plugin/PluginMessage',
    'plugin/PluginNodeDescription',
    'plugin/util',
    'common/storage/constants'
], function (PluginConfig, PluginResult, PluginMessage, PluginNodeDescription, pluginUtil, STORAGE_CONSTANTS) {
    'use strict';

    /**
     * Initializes a new instance of a plugin object, which should be a derived class.
     *
     * @constructor
     * @alias PluginBase
     */
    var PluginBase = function () {
        // set by initialize

        /**
         * @type {PluginMetadata}
         */
        this.pluginMetadata = null;

        /**
         * @type {GmeConfig}
         */
        this.gmeConfig = null;

        /**
         * @type {GmeLogger}
         */
        this.logger = null;

        /**
         * @type {BlobClient}
         */
        this.blobClient = null;

        this._currentConfig = null;

        // set by configure

        /**
         * @type {Core}
         */
        this.core = null;

        /**
         * @type {ProjectInterface}
         */
        this.project = null;

        this.projectName = null;
        this.projectId = null;
        this.branchName = null;

        this.branchHash = null;
        this.commitHash = null;
        this.currentHash = null;

        /**
         * @type {module:Core~Node}
         */
        this.rootNode = null;

        /**
         * @type {module:Core~Node}
         */
        this.activeNode = null;

        /**
         * @type {module:Core~Node[]}
         */
        this.activeSelection = [];

        /**
         * The namespace the META nodes are coming from (set by invoker).
         * The default is the full meta, i.e. the empty string namespace.
         * For example, if a project has a library A with a library B. The possible namespaces are:
         * '', 'A' and 'A.B'.
         * @type {string}
         */
        this.namespace = '';

        /**
         * The resolved META nodes based on the active namespace. Index by the fully qualified meta node names
         * with the namespace stripped off at the start.
         *
         * For example, if a project has a library A with a library B. If the project and the libraries all have
         * two meta nodes named a and b. Depending on the namespace the META will have the following keys:
         *
         * 1) namespace = '' -> ['a', 'b', 'A.a', 'A.b', 'A.B.a', 'A.B.b']
         * 2) namespace = 'A' -> ['a', 'b', 'B.a', 'B.b']
         * 3) namespace = 'A.B' -> ['a', 'b']
         *
         * (N.B. 'a' and 'b' in example 3) are pointing to the meta nodes defined in A.B.)
         *
         * @type {Object<string, module:Core~Node>}
         */
        this.META = null;

        /**
         * @type {PluginResult}
         */
        this.result = null;

        this.isConfigured = false;

        this.notificationHandlers = [];
    };

    //<editor-fold desc="Methods must be overridden by the derived classes">

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * <br>- Do NOT use console.log use this.logger.[error,warning,info,debug] instead.
     * <br>- Do NOT put any user interaction logic UI, etc. inside this function.
     * <br>- callback always have to be called even if error happened.
     *
     * @param {function(string|Error, PluginResult)} callback - the result callback
     */
    PluginBase.prototype.main = function (/*callback*/) {
        throw new Error('implement this function in the derived class');
    };

    /**
     * Readable name of this plugin that can contain spaces.
     *
     * @returns {string}
     */
    PluginBase.prototype.getName = function () {
        if (this.pluginMetadata) {
            return this.pluginMetadata.name;
        } else {
            throw new Error('If pluginMetadata is not defined - implement this function in the derived class');
        }
    };

    //</editor-fold>
    //<editor-fold desc="Methods could be overridden by the derived classes">

    /**
     * Current version of this plugin using semantic versioning.
     * @returns {string}
     */
    PluginBase.prototype.getVersion = function () {
        return this.pluginMetadata ? this.pluginMetadata.version : '0.1.0';
    };

    /**
     * A detailed description of this plugin and its purpose. It can be one or more sentences.
     *
     * @returns {string}
     */
    PluginBase.prototype.getDescription = function () {
        return this.pluginMetadata ? this.pluginMetadata.description : '';
    };

    /**
     * Configuration structure with names, descriptions, minimum, maximum values, default values and
     * type definitions.
     *
     * Example:
     *
     * [{
         *    "name": "logChildrenNames",
         *    "displayName": "Log Children Names",
         *    "description": '',
         *    "value": true, // this is the 'default config'
         *    "valueType": "boolean",
         *    "readOnly": false
         * },{
         *    "name": "logLevel",
         *    "displayName": "Logger level",
         *    "description": '',
         *    "value": "info",
         *    "valueType": "string",
         *    "valueItems": [
         *          "debug",
         *          "info",
         *          "warn",
         *          "error"
         *      ],
         *    "readOnly": false
         * },{
         *    "name": "maxChildrenToLog",
         *    "displayName": "Maximum children to log",
         *    "description": 'Set this parameter to blabla',
         *    "value": 4,
         *    "minValue": 1,
         *    "valueType": "number",
         *    "readOnly": false
         * }]
     *
     * @returns {object[]}
     */
    PluginBase.prototype.getConfigStructure = function () {
        return this.pluginMetadata ? this.pluginMetadata.configStructure : [];
    };
    //</editor-fold>
    //<editor-fold desc="Methods that can be used by the derived classes">

    /**
     * Updates the current success flag with a new value.
     *
     * NewValue = OldValue && Value
     *
     * @param {boolean} value - apply this flag on current success value
     * @param {string|null} message - optional detailed message
     */
    PluginBase.prototype.updateSuccess = function (value, message) {
        var prevSuccess = this.result.getSuccess();
        var newSuccessValue = prevSuccess && value;

        this.result.setSuccess(newSuccessValue);
        var msg = '';
        if (message) {
            msg = ' - ' + message;
        }

        this.logger.debug('Success was updated from ' + prevSuccess + ' to ' + newSuccessValue + msg);
    };

    /**
     * WebGME can export the META types as path and this method updates the generated domain specific types with
     * webgme node objects. These can be used to define the base class of new objects created through the webgme API.
     *
     * @param {object} generatedMETA
     */
    PluginBase.prototype.updateMETA = function (generatedMETA) {
        var name;
        for (name in this.META) {
            if (this.META.hasOwnProperty(name)) {
                generatedMETA[name] = this.META[name];
            }
        }

        // TODO: check if names are not the same
        // TODO: log if META is out of date
    };

    /**
     * Checks if the given node is of the given meta-type.
     * Usage: <tt>self.isMetaTypeOf(aNode, self.META['FCO']);</tt>
     * @param {module:Core~Node} node - Node to be checked for type.
     * @param {module:Core~Node} metaNode - Node object defining the meta type.
     * @returns {boolean} - True if the given object was of the META type.
     */
    PluginBase.prototype.isMetaTypeOf = function (node, metaNode) {
        // This includes mixins.
        return this.core.isTypeOf(node, metaNode);
    };

    /**
     * Finds and returns the node object defining the meta type for the given node.
     * @param {module:Core~Node} node - Node to be checked for type.
     * @returns {module:Core~Node} - Node object defining the meta type of node.
     */
    PluginBase.prototype.getMetaType = function (node) {
        var self = this,
            namespace,
            name;

        while (node) {
            name = self.core.getAttribute(node, 'name');
            namespace = self.core.getNamespace(node).substr(self.namespace.length);

            if (namespace) {
                name = namespace + '.' + name;
            }

            if (self.META.hasOwnProperty(name) && self.core.getGuid(node) === self.core.getGuid(self.META[name])) {
                break;
            }
            node = self.core.getBase(node);
        }
        return node;
    };

    /**
     * Returns true if node is a direct instance of a meta-type node (or a meta-type node itself).
     * @param {module:Core~Node} node - Node to be checked.
     * @returns {boolean}
     */
    PluginBase.prototype.baseIsMeta = function (node) {
        var self = this,
            baseName,
            namespace,
            baseNode = self.core.getBase(node);
        if (!baseNode) {
            // FCO does not have a base node, by definition function returns true.
            return true;
        }

        baseName = self.core.getAttribute(baseNode, 'name');
        namespace = self.core.getNamespace(baseNode).substr(self.namespace.length);

        if (namespace) {
            baseName = namespace + '.' + baseName;
        }

        return self.META.hasOwnProperty(baseName) &&
            self.core.getGuid(self.META[baseName]) === self.core.getGuid(baseNode);
    };

    /**
     * Gets the current configuration of the plugin that was set by the user and plugin manager.
     *
     * @returns {PluginConfig}
     */
    PluginBase.prototype.getCurrentConfig = function () {
        return this._currentConfig;
    };

    /**
     * Creates a new message for the user and adds it to the result.
     *
     * @param {module:Core~Node|object} node - webgme object which is related to the message
     * @param {string} message - feedback to the user
     * @param {string} severity - severity level of the message: 'debug', 'info' (default), 'warning', 'error'.
     */
    PluginBase.prototype.createMessage = function (node, message, severity) {
        var severityLevel = severity || 'info',
            nodeDescriptor = {
                name: '',
                id: ''
            };

        //FIXME: Use a proper check for determining if it is a Core node or not.
        if (node && node.hasOwnProperty('parent') && node.hasOwnProperty('relid')) {
            nodeDescriptor.name = this.core.getAttribute(node, 'name');
            nodeDescriptor.id = this.core.getPath(node);
        }
        //this occurrence of the function will always handle a single node

        var descriptor = new PluginNodeDescription({
            name: node ? this.core.getAttribute(node, 'name') : '',
            id: node ? this.core.getPath(node) : ''
        });
        var pluginMessage = new PluginMessage({
            commitHash: this.currentHash,
            activeNode: descriptor,
            message: message,
            severity: severityLevel
        });

        this.result.addMessage(pluginMessage);
    };

    /**
     * Sends a notification back to the invoker of the plugin, can be used to notify about progress.
     * @param {string|object} message - Message string or object containing message.
     * @param {string} message.message - If object it must contain a message.
     * @param {number} [message.progress] - Approximate progress (in %) of the plugin at time of sending.
     * @param {string} [message.severity='info'] - Severity level ('success', 'info', 'warn', 'error')
     * @param {boolean} [message.toBranch=false] - If true, and the plugin is running on the server on a branch -
     * will broadcast to all sockets in the branch room.
     * @param {string} [callback] - optional callback invoked when message has been emitted from server.
     */
    PluginBase.prototype.sendNotification = function (message, callback) {
        var self = this,
            cnt = self.notificationHandlers.length,
            data = {
                type: STORAGE_CONSTANTS.PLUGIN_NOTIFICATION,
                notification: typeof message === 'string' ? {message: message} : message,
                projectId: self.projectId,
                branchName: self.branchName,
                pluginName: self.getName(),
                pluginVersion: self.getVersion()
            };

        callback = callback || function (err) {
                if (err) {
                    self.logger.error(err);
                }
            };

        function emitToHandlers() {
            if (cnt === 0) {
                callback(null);
                return;
            }
            cnt -= 1;
            self.notificationHandlers[cnt](data, function (err) {
                if (err) {
                    callback(err);
                } else {
                    emitToHandlers();
                }
            });
        }

        emitToHandlers();
    };

    /**
     * Saves all current changes if there is any to a new commit.
     * If the commit result is either 'FORKED' or 'CANCELED', it creates a new branch.
     *
     * N.B. This is a utility function for saving/persisting data. The plugin has access to the project and core
     * instances and may persist and make the commit as define its own behavior for e.g. 'FORKED' commits.
     * To report the commits in the PluginResult make sure to invoke this.addCommitToResult with the given status.
     *
     * @param {string|null} message - commit message
     * @param {function(Error|string, module:Storage~commitResult)} callback
     */
    PluginBase.prototype.save = function (message, callback) {
        var self = this,
            persisted,
            commitMessage = '[Plugin] ' + self.getName() + ' (v' + self.getVersion() + ') updated the model.';

        commitMessage = message ? commitMessage + ' - ' + message : commitMessage;

        self.logger.debug('Saving project');
        persisted = self.core.persist(self.rootNode);
        if (Object.keys(persisted.objects).length === 0) {
            self.logger.warn('save invoked with no changes, will still proceed');
        }

        return self.project.makeCommit(self.branchName,
            [self.currentHash],
            persisted.rootHash,
            persisted.objects,
            commitMessage)
            .then(function (commitResult) {
                if (commitResult.status === STORAGE_CONSTANTS.SYNCED) {
                    self.currentHash = commitResult.hash;
                    self.logger.info('"' + self.branchName + '" was updated to the new commit.');
                    self.addCommitToResult(STORAGE_CONSTANTS.SYNCED);
                    return commitResult;
                } else if (commitResult.status === STORAGE_CONSTANTS.FORKED) {
                    self.currentHash = commitResult.hash;
                    return self._createFork();
                } else if (commitResult.status === STORAGE_CONSTANTS.CANCELED) {
                    // Plugin running in the browser and the client has made changes since plugin was invoked.
                    // Since the commitData was never sent to the server, a commit w/o branch is made before forking.
                    return self.project.makeCommit(null,
                        [self.currentHash],
                        persisted.rootHash,
                        persisted.objects,
                        commitMessage)
                        .then(function (commitResult) {
                            self.currentHash = commitResult.hash; // This is needed in case hash is randomly generated.
                            return self._createFork();
                        });
                } else if (commitResult.status === STORAGE_CONSTANTS.MERGED) {
                    self.currentHash = commitResult.mergeHash;
                    self.addCommitToResult(STORAGE_CONSTANTS.MERGED);
                    // N.B. If the plugin makes multiple saves, it should fast-forward after a merged commit.
                    // Otherwise each new commit will have to be merge as well.
                    return commitResult;
                } else if (!self.branchName) {
                    self.currentHash = commitResult.hash;
                    self.addCommitToResult(null);
                } else {
                    throw new Error('setBranchHash returned unexpected status' + commitResult.status);
                }
            })
            .nodeify(callback);
    };

    PluginBase.prototype._createFork = function (callback) {
        // User can set self.forkName, but must make sure it is unique.
        var self = this,
            oldBranchName = self.branchName,
            forkName = self.forkName || self.branchName + '_' + (new Date()).getTime();
        self.logger.warn('Plugin got forked from "' + self.branchName + '". ' +
            'Trying to create a new branch "' + forkName + '".');

        return self.project.createBranch(forkName, self.currentHash)
            .then(function (forkResult) {
                if (forkResult.status === STORAGE_CONSTANTS.SYNCED) {
                    self.branchName = forkName;
                    self.logger.info('"' + self.branchName + '" was updated to the new commit.' +
                        '(Successive saves will try to save to this new branch.)');
                    self.addCommitToResult(STORAGE_CONSTANTS.FORKED);

                    return {status: STORAGE_CONSTANTS.FORKED, forkName: forkName, hash: forkResult.hash};
                } else if (forkResult.status === STORAGE_CONSTANTS.FORKED) {
                    self.branchName = null;
                    self.addCommitToResult(STORAGE_CONSTANTS.FORKED);

                    throw new Error('Plugin got forked from "' + oldBranchName + '". ' +
                        'And got forked from "' + forkName + '" too.');
                } else {
                    throw new Error('createBranch returned unexpected status' + forkResult.status);
                }
            })
            .nodeify(callback);
    };

    /**
     * If plugin is started from a branch - it will reload the instance's nodes and update the currentHash to
     * the current hash of the branch.
     *
     * N.B. Use this with caution, for instance manually referenced nodes in a plugin will still be part of the
     * previous commit. Additionally if the namespaces have changed between commits - the this.META might end up
     * being empty.
     *
     * @param {function(Error, boolean)} callback - Resolved with true if branch had moved forward.
     */
    PluginBase.prototype.fastForward = function (callback) {
        var self = this,
            options;

        return self.project.getBranchHash(self.branchName)
            .then(function (branchHash) {
                if (branchHash === '') {
                    throw new Error('Branch does not exist [' + self.branchName + ']');
                } else if (branchHash === self.currentHash) {
                    return false;
                } else {
                    options = {
                        activeNode: self.core.getPath(self.activeNode),
                        activeSelection: self.activeSelection.forEach(function (node) {
                            return self.core.getPath(node);
                        }),
                        namespace: self.namespace
                    };

                    return pluginUtil.loadNodesAtCommitHash(
                        self.project,
                        self.core,
                        branchHash,
                        self.logger,
                        options
                    );
                }
            })
            .then(function (result) {
                var didUpdate;

                if (result === false) {
                    didUpdate = false;
                } else {
                    self.currentHash = result.commitHash;
                    self.rootNode = result.rootNode;
                    self.activeNode = result.activeNode;
                    self.activeSelection = result.activeSelection;
                    self.META = result.META;
                    didUpdate = true;
                }

                return didUpdate;
            })
            .nodeify(callback);
    };

    /**
     * Adds the commit to the results. N.B. if you're using your own save method - make sure to update
     * this.currentHash and this.branchName accordingly before adding the commit.
     *
     * @param {string} status - Status of the commit 'SYNCED', 'FORKED', 'CANCELED', null.
     */
    PluginBase.prototype.addCommitToResult = function (status) {
        var newCommit = {
            commitHash: this.currentHash,
            branchName: this.branchName,
            status: status
        };

        this.result.addCommit(newCommit);
        this.logger.debug('newCommit added', newCommit);
    };

    /**
     * Checks if the activeNode has registered the plugin.
     *
     * @param {string} pluginId - Id of plugin
     * @returns {Error} - returns undefined if valid and an Error if not.
     */
    PluginBase.prototype.isInvalidActiveNode = function (pluginId) {
        var validPlugins = this.core.getRegistry(this.activeNode, 'validPlugins') || '';
        this.logger.debug('validPlugins for activeNode', validPlugins);

        if (validPlugins.split(' ').indexOf(pluginId) === -1) {
            return new Error('Plugin not registered as validPlugin for active node, validPlugins "' +
                validPlugins + '"');
        }
    };

    /**
     * Loads all the nodes starting from node and returns a map from paths to nodes.
     * @param {module:Core~Node} [node=self.rootNode] - Optional node to preload nodes from,
     * by default all will be loaded.
     * @param {function} [callback] - if defined no promise will be returned
     * @return {external:Promise} - If successful will resolve with object where keys are paths and values nodes.
     */
    PluginBase.prototype.loadNodeMap = function (node, callback) {
        var self = this;
        return self.core.loadSubTree(node || self.rootNode)
            .then(function (nodeArr) {
                var nodes = {},
                    i;

                for (i = 0; i < nodeArr.length; i += 1) {
                    nodes[self.core.getPath(nodeArr[i])] = nodeArr[i];
                }

                return nodes;
            })
            .nodeify(callback);
    };
    //</editor-fold>
    //<editor-fold desc="Methods that are used by the Plugin Manager. Derived classes should not use these methods">

    /**
     * Initializes the plugin with objects that can be reused within the same plugin instance.
     *
     * @param {GmeLogger} logger - logging capability to console (or file) based on PluginManager configuration
     * @param {BlobClient} blobClient - virtual file system where files can be generated then saved as a zip file.
     * @param {GmeConfig} gmeConfig - global configuration for webGME.
     */
    PluginBase.prototype.initialize = function (logger, blobClient, gmeConfig) {
        if (logger) {
            this.logger = logger;
        } else {
            this.logger = console;
        }

        if (!gmeConfig) {
            // TODO: Remove this check at some point
            throw new Error('gmeConfig was not provided to Plugin.initialize!');
        }

        this.blobClient = blobClient;
        this.gmeConfig = gmeConfig;

        this._currentConfig = null;
        // initialize default configuration
        this.setCurrentConfig(this.getDefaultConfig());

        this.isConfigured = false;
    };

    /**
     * Configures this instance of the plugin for a specific execution. This function is called before the main by
     * the PluginManager.
     * Initializes the result with a new object.
     *
     * @param {PluginContext} config - specific context: project, branch, core, active object and active selection.
     */
    PluginBase.prototype.configure = function (config) {
        this.core = config.core;
        this.project = config.project;
        this.branch = config.branch;  // This is only for client side.
        this.projectName = config.projectName;
        this.projectId = config.projectId;
        this.branchName = config.branchName;
        this.branchHash = config.branchName ? config.commitHash : null;

        this.commitHash = config.commitHash;
        this.currentHash = config.commitHash;

        this.rootNode = config.rootNode;
        this.activeNode = config.activeNode;
        this.activeSelection = config.activeSelection;

        this.namespace = config.namespace || '';

        this.META = this.META = config.META;

        this.result = new PluginResult();
        this.result.setProjectId(this.projectId);

        this.addCommitToResult(STORAGE_CONSTANTS.SYNCED);

        this.isConfigured = true;
    };

    /**
     * Gets the default configuration based on the configuration structure for this plugin.
     *
     * @returns {PluginConfig}
     */
    PluginBase.prototype.getDefaultConfig = function () {
        var configStructure = this.getConfigStructure(),
            defaultConfig = new PluginConfig();

        for (var i = 0; i < configStructure.length; i += 1) {
            defaultConfig[configStructure[i].name] = configStructure[i].value;
        }

        return defaultConfig;
    };

    /**
     * Sets the current configuration of the plugin.
     *
     * @param {PluginConfig} newConfig - this is the actual configuration and NOT the configuration structure.
     */
    PluginBase.prototype.setCurrentConfig = function (newConfig) {
        this._currentConfig = newConfig;
    };

    /**
     * Gets the metadata for the plugin.
     *
     * @returns {PluginMetaData}
     */
    PluginBase.prototype.getMetadata = function () {
        return this.pluginMetadata;
    };
    //</editor-fold>

    return PluginBase;
});
