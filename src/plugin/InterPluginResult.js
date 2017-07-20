/*globals define*/
/*jshint browser: true, node:true*/

/**
 * A module representing the result from an invoked plugin.
 * @author pmeijer / https://github.com/meijer
 */

define([], function () {
    'use strict';

    /**
     * Initializes a new instance of a plugin result object passed from an invoked plugin.
     * @constructor
     * @alias InterPluginResult
     */
    var InterPluginResult = function (pluginResult, pluginInstance) {
        this.pluginResult = pluginResult;
        this.success = false;
        this.artifacts = [];
        this.commitMessages = [];

        this.pluginInstance = pluginInstance;
    };

    /**
     * Gets the success flag of this result object
     *
     * @returns {boolean}
     */
    InterPluginResult.prototype.getSuccess = function () {
        return this.success;
    };

    /**
     * Sets the success flag of this result.
     *
     * @param {boolean} value
     */
    InterPluginResult.prototype.setSuccess = function (value) {
        this.success = value;
    };

    /**
     * Adds a new plugin message to the messages list.
     *
     * @param {PluginMessage} pluginMessage
     */
    InterPluginResult.prototype.addMessage = function (pluginMessage) {
        this.pluginResult.addMessage(pluginMessage);
    };

    InterPluginResult.prototype.getArtifacts = function () {
        return this.artifacts;
    };

    /**
     * Adds a saved artifact to the result - linked via its hash.
     *
     * @param {string} hash - Hash of saved artifact.
     */
    InterPluginResult.prototype.addArtifact = function (hash) {
        this.artifacts.push(hash);
    };

    /**
     *
     * @param {string} message
     */
    InterPluginResult.prototype.addCommit = function (message) {
        if (typeof message === 'string') {
            this.commitMessages.push(message);
        } else {
            // In order to be called from other plugin via PluginBase.invokePlugin
            // the plugin must use PluginBase.save instead of persisting/committing on its own.
            throw new Error('Plugin is being called from other plugin - addCommit takes string.');
        }
    };

    InterPluginResult.prototype.getCommitMessages = function () {
        return this.commitMessages;
    };

    return InterPluginResult;
});