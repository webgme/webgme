/**
 * Created by zsolt on 3/20/14.
 */

'use strict';
define(['plugin/PluginConfig',
        'plugin/PluginResult',
        'plugin/PluginMessage',
        'plugin/PluginNodeDescription'],
    function (PluginConfig,
              PluginResult,
              PluginMessage,
              PluginNodeDescription) {

    var PluginBase = function () {
        // set by initialize
        this.logger = null;
        this.fs = null;
        this._currentConfig = null;

        // set by configure
        this.core = null;
        this.project = null;
        this.projectName = null;
        this.branchName = null;
        this.commitHash = null;
        this.currentHash = null;
        this.rootNode = null;
        this.activeNode = null;
        this.activeSelection = [];
        this.META = null;

        this.result = null;
        this.isConfigured = false;
    };


    PluginBase.prototype.initialize = function (logger, fs) {
        if (logger) {
            this.logger = logger;
        } else {
            this.logger = console;
        }

        this.fs = fs;

        this._currentConfig = null;
        // initialize default configuration
        this.setCurrentConfig(this.getDefaultConfig());

        this.isConfigured = false;
    };

    PluginBase.prototype.configure = function (config) {
        this.core = config.core;
        this.project = config.project;
        this.projectName = config.projectName;
        this.branchName = config.branchName;
        this.commitHash = config.commitHash;
        this.currentHash = config.commitHash;
        this.rootNode = config.rootNode;
        this.activeNode = config.activeNode;
        this.activeSelection = config.activeSelection;
        this.META = config.META;

        this.result = new PluginResult();


        this.isConfigured = true;
    };

    PluginBase.prototype.updateMETA = function (generatedMETA) {
        var name;
        for (name in config.META) {
            if (config.META.hasOwnProperty(name)) {
                generatedMETA[name] = config.META[name];
            }
        }

        // TODO: check if names are not the same
        // TODO: log if META is out of date
    };

    PluginBase.prototype.createMessage = function (node, message) {
        // TODO: node can be an object or objects within the same parent
        // FIXME: assume for now that node is not an array

        // FIXME: is the parent always loaded?
        var parentNode = this.core.getParent(node);
        var parentDescriptor = new PluginNodeDescription(this.core.getAttribute(parentNode, 'name'), this.core.getPath(parentNode));
        var activeDescriptor = [new PluginNodeDescription(this.core.getAttribute(node, 'name'), this.core.getPath(node))];
        var pluginMessage = new PluginMessage(this.currentHash, parentDescriptor, activeDescriptor, message);

        this.result.addMessage(pluginMessage);
    };

    PluginBase.prototype.save = function (message, callback) {
        var self = this;

        this.logger.debug('Saving project');

        // Commit changes.
        this.core.persist(this.rootNode, function (err) {
            // TODO: any error here?
            if (err) {
                self.logger.error(err);
            }
        });

        var newRootHash = this.core.getHash(this.rootNode);

        var commitMessage = '[Plugin] ' + this.getName() + ' (v' + this.getVersion() + ') updated the model.';
        if (message) {
            commitMessage += ' - ' + message;
        }

        this.currentHash = this.project.makeCommit([this.currentHash], newRootHash, commitMessage, function (err) {
            // TODO: any error handling here?
            if (err) {
                self.logger.error(err);
            }
        });

        if (this.branchName) {
            // try to fast forward branch if there was a branch name defined

            // FIXME: what if master branch is already in a different state?
            // FIXME: is this call async??
            // FIXME: we are not tracking all commits that we make
            this.project.setBranchHash(this.branchName, this.commitHash, this.currentHash, function(err) {
                //TODO now what??? - could we screw up?
                if (err) {
                    self.logger.error(err);
                    self.logger.info('"' + self.branchName + '" was NOT updated');
                } else {
                    self.logger.info('"' + self.branchName + '" was updated to the new commit.');
                    // roll starting point on success
                    self.commitHash = self.currentHash;
                }
                callback(err);
            });
        } else {
            this.logger.info('Project was saved to ' + this.currentHash + ' commit.');
            callback();
        }
    };

    PluginBase.prototype.main = function (callback) {
        throw new Error('implement this function in the derived class');
    };

    PluginBase.prototype.getName = function () {
        throw new Error('implement this function in the derived class - getting type automatically is a bad idea, when the js scripts are minified names are useless.');
    };

    PluginBase.prototype.getVersion = function () {
        return '0.1.0';
    };

    PluginBase.prototype.getDescription = function () {
        return '';
    };

    PluginBase.prototype.getDefaultConfig = function () {
        var configStructure = this.getConfigStructure();

        var defaultConfig = new PluginConfig();

        for (var i = 0; i < configStructure.length; i += 1) {
            defaultConfig[configStructure[i].name] = configStructure[i].value;
        }

        return defaultConfig;
    };

    PluginBase.prototype.getConfigStructure = function () {
        return [];
    };

    PluginBase.prototype.getCurrentConfig = function () {
        return this._currentConfig;
    };

    PluginBase.prototype.setCurrentConfig = function (newConfig) {
        this._currentConfig = newConfig;
    };

    return PluginBase;
});