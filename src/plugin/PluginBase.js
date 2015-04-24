/*globals define*/
/*jshint browser: true, node:true*/

/**
 * This is the base class that plugins should inherit from.
 * (Using the plugin-generator - the generated plugin will do that.)
 *
 * @author lattmann / https://github.com/lattmann
 */

define([
    'plugin/PluginConfig',
    'plugin/PluginResult',
    'plugin/PluginMessage',
    'plugin/PluginNodeDescription'
], function (PluginConfig, PluginResult, PluginMessage, PluginNodeDescription) {
    'use strict';

    /**
     * Initializes a new instance of a plugin object, which should be a derived class.
     *
     * @constructor
     */
    var PluginBase = function () {
        // set by initialize
        this.logger = null;
        this.blobClient = null;
        this._currentConfig = null;

        // set by configure
        this.core = null;
        this.project = null;
        this.projectName = null;
        this.branchName = null;
        this.branchHash = null;
        this.commitHash = null;
        this.currentHash = null;
        this.rootNode = null;
        this.activeNode = null;
        this.activeSelection = [];
        this.META = null;

        this.result = null;
        this.isConfigured = false;
        this.gmeConfig = null;
    };

    //--------------------------------------------------------------------------------------------------------------
    //---------- Methods must be overridden by the derived classes

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - do NOT use console.log use this.logger.[error,warning,info,debug] instead
     * - do NOT put any user interaction logic UI, etc. inside this function
     * - callback always have to be called even if error happened
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
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
        throw new Error('implement this function in the derived class - getting type automatically is a bad idea,' +
        'when the js scripts are minified names are useless.');
    };

    //--------------------------------------------------------------------------------------------------------------
    //---------- Methods could be overridden by the derived classes

    /**
     * Current version of this plugin using semantic versioning.
     * @returns {string}
     */
    PluginBase.prototype.getVersion = function () {
        return '0.1.0';
    };

    /**
     * A detailed description of this plugin and its purpose. It can be one or more sentences.
     *
     * @returns {string}
     */
    PluginBase.prototype.getDescription = function () {
        return '';
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
        return [];
    };

    //--------------------------------------------------------------------------------------------------------------
    //---------- Methods that can be used by the derived classes

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
     * @param node - Node to be checked for type.
     * @param metaNode - Node object defining the meta type.
     * @returns {boolean} - True if the given object was of the META type.
     */
    PluginBase.prototype.isMetaTypeOf = function (node, metaNode) {
        var self = this;
        while (node) {
            if (self.core.getGuid(node) === self.core.getGuid(metaNode)) {
                return true;
            }
            node = self.core.getBase(node);
        }
        return false;
    };

    /**
     * Finds and returns the node object defining the meta type for the given node.
     * @param node - Node to be checked for type.
     * @returns {Object} - Node object defining the meta type of node.
     */
    PluginBase.prototype.getMetaType = function (node) {
        var self = this,
            name;
        while (node) {
            name = self.core.getAttribute(node, 'name');
            if (self.META.hasOwnProperty(name) && self.core.getGuid(node) === self.core.getGuid(self.META[name])) {
                break;
            }
            node = self.core.getBase(node);
        }
        return node;
    };

    /**
     * Returns true if node is a direct instance of a meta-type node (or a meta-type node itself).
     * @param node - Node to be checked.
     * @returns {boolean}
     */
    PluginBase.prototype.baseIsMeta = function (node) {
        var self = this,
            baseName,
            baseNode = self.core.getBase(node);
        if (!baseNode) {
            // FCO does not have a base node, by definition function returns true.
            return true;
        }
        baseName = self.core.getAttribute(baseNode, 'name');
        return self.META.hasOwnProperty(baseName) &&
            self.core.getGuid(self.META[baseName]) === self.core.getGuid(baseNode);
    };

    /**
     * Gets the current configuration of the plugin that was set by the user and plugin manager.
     *
     * @returns {object}
     */
    PluginBase.prototype.getCurrentConfig = function () {
        return this._currentConfig;
    };

    /**
     * Creates a new message for the user and adds it to the result.
     *
     * @param {object} node - webgme object which is related to the message
     * @param {string} message - feedback to the user
     * @param {string} severity - severity level of the message: 'debug', 'info' (default), 'warning', 'error'.
     */
    PluginBase.prototype.createMessage = function (node, message, severity) {
        var severityLevel = severity || 'info';
        //this occurence of the function will always handle a single node

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
     * Saves all current changes if there is any to a new commit.
     * If the changes were started from a branch, then tries to fast forward the branch to the new commit.
     * Note: Does NOT handle any merges at this point.
     *
     * @param {string|null} message - commit message
     * @param callback
     */
    PluginBase.prototype.save = function (message, callback) {
        var self = this;

        this.logger.debug('Saving project');

        this.core.persist(this.rootNode, function (err) {
            if (err) {
                self.logger.error(err);
            }
        });
        var newRootHash = self.core.getHash(self.rootNode);

        var commitMessage = '[Plugin] ' + self.getName() + ' (v' + self.getVersion() + ') updated the model.';
        if (message) {
            commitMessage += ' - ' + message;
        }
        self.currentHash = self.project.makeCommit([self.currentHash], newRootHash, commitMessage, function (err) {
            if (err) {
                self.logger.error(err);
            }
        });

        if (self.branchName) {
            // try to fast forward branch if there was a branch name defined

            // FIXME: what if master branch is already in a different state?

            // try to fast forward branch to the current commit
            self.project.setBranchHash(self.branchName, self.branchHash, self.currentHash, function (err) {
                if (err) {
                    // fast forward failed
                    // TODO: try auto-merge

                    self.logger.error(err);
                    self.logger.info('"' + self.branchName + '" was NOT updated');
                    self.logger.info('Project was saved to ' + self.currentHash + ' commit.');
                } else {
                    // successful fast forward of branch to the new commit
                    self.logger.info('"' + self.branchName + '" was updated to the new commit.');
                    // roll starting point on success
                    self.branchHash = self.currentHash;
                }
                callback(err);
            });

            // FIXME: is this call async??
            // FIXME: we are not tracking all commits that we make

        } else {
            // making commits, we have not started from a branch
            self.logger.info('Project was saved to ' + self.currentHash + ' commit.');
            callback(null);
        }

        // Commit changes.
        /*            this.core.persist(this.rootNode, function (err) {
         // TODO: any error here?
         if (err) {
         self.logger.error(err);
         }

         var newRootHash = self.core.getHash(self.rootNode);

         var commitMessage = '[Plugin] ' + self.getName() + ' (v' + self.getVersion() + ') updated the model.';
         if (message) {
         commitMessage += ' - ' + message;
         }

         self.currentHash = self.project.makeCommit([self.currentHash], newRootHash, commitMessage, function (err) {
         // TODO: any error handling here?
         if (err) {
         self.logger.error(err);
         }

         if (self.branchName) {
         // try to fast forward branch if there was a branch name defined

         // FIXME: what if master branch is already in a different state?

         self.project.getBranchNames(function (err, branchNames) {
         if (branchNames.hasOwnProperty(self.branchName)) {
         var branchHash = branchNames[self.branchName];
         if (branchHash === self.branchHash) {
         // the branch does not have any new commits
         // try to fast forward branch to the current commit
         self.project.setBranchHash(self.branchName, self.branchHash, self.currentHash, function (err) {
         if (err) {
         // fast forward failed
         self.logger.error(err);
         self.logger.info('"' + self.branchName + '" was NOT updated');
         self.logger.info('Project was saved to ' + self.currentHash + ' commit.');
         } else {
         // successful fast forward of branch to the new commit
         self.logger.info('"' + self.branchName + '" was updated to the new commit.');
         // roll starting point on success
         self.branchHash = self.currentHash;
         }
         callback(err);
         });
         } else {
         // branch has changes a merge is required
         // TODO: try auto-merge, if fails ...
         self.logger.warn('Cannot fast forward "' + self.branchName + '" branch.
         Merge is required but not supported yet.');
         self.logger.info('Project was saved to ' + self.currentHash + ' commit.');
         callback(null);
         }
         } else {
         // branch was deleted or not found, do nothing
         self.logger.info('Project was saved to ' + self.currentHash + ' commit.');
         callback(null);
         }
         });
         // FIXME: is this call async??
         // FIXME: we are not tracking all commits that we make

         } else {
         // making commits, we have not started from a branch
         self.logger.info('Project was saved to ' + self.currentHash + ' commit.');
         callback(null);
         }
         });

         });*/
    };

    //--------------------------------------------------------------------------------------------------------------
    //---------- Methods that are used by the Plugin Manager. Derived classes should not use these methods

    /**
     * Initializes the plugin with objects that can be reused within the same plugin instance.
     *
     * @param {logManager} logger - logging capability to console (or file) based on PluginManager configuration
     * @param {blob.BlobClient} blobClient - virtual file system where files can be generated then saved as a zip file.
     * @param {object} gmeConfig - global configuration for webGME.
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
        this.projectName = config.projectName;
        this.branchName = config.branchName;
        this.branchHash = config.branchName ? config.commitHash : null;
        this.commitHash = config.commitHash;
        this.currentHash = config.commitHash;
        this.rootNode = config.rootNode;
        this.activeNode = config.activeNode;
        this.activeSelection = config.activeSelection;
        this.META = config.META;

        this.result = new PluginResult();


        this.isConfigured = true;
    };

    /**
     * Gets the default configuration based on the configuration structure for this plugin.
     *
     * @returns {plugin.PluginConfig}
     */
    PluginBase.prototype.getDefaultConfig = function () {
        var configStructure = this.getConfigStructure();

        var defaultConfig = new PluginConfig();

        for (var i = 0; i < configStructure.length; i += 1) {
            defaultConfig[configStructure[i].name] = configStructure[i].value;
        }

        return defaultConfig;
    };

    /**
     * Sets the current configuration of the plugin.
     *
     * @param {object} newConfig - this is the actual configuration and NOT the configuration structure.
     */
    PluginBase.prototype.setCurrentConfig = function (newConfig) {
        this._currentConfig = newConfig;
    };

    return PluginBase;
});
