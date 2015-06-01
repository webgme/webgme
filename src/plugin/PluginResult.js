/*globals define*/
/*jshint browser: true, node:true*/

/**
 * @author lattmann / https://github.com/lattmann
 */


define(['plugin/PluginMessage'], function (PluginMessage) {
    'use strict';
    /**
     * Initializes a new instance of a plugin result object.
     *
     * Note: this object is JSON serializable see serialize method.
     *
     * @param config - deserializes an existing configuration to this object.
     * @constructor
     */
    var PluginResult = function (config) {
        var pluginMessage,
            i;
        if (config) {
            this.success = config.success;
            this.pluginName = config.pluginName;
            this.startTime = config.startTime;
            this.finishTime = config.finishTime;
            this.messages = [];
            this.artifacts = config.artifacts;
            this.error = config.error;
            this.commits = config.commits;

            for (i = 0; i < config.messages.length; i += 1) {
                if (config.messages[i] instanceof PluginMessage) {
                    pluginMessage = config.messages[i];
                } else {
                    pluginMessage = new PluginMessage(config.messages[i]);
                }
                this.messages.push(pluginMessage);
            }
        } else {
            this.success = false;
            this.messages = []; // array of PluginMessages
            this.artifacts = []; // array of hashes
            this.pluginName = 'PluginName N/A';
            this.startTime = null;
            this.finishTime = null;
            this.error = null;
            this.commits = [];
        }
    };

    /**
     * Gets the success flag of this result object
     *
     * @returns {boolean}
     */
    PluginResult.prototype.getSuccess = function () {
        return this.success;
    };

    /**
     * Sets the success flag of this result.
     *
     * @param {boolean} value
     */
    PluginResult.prototype.setSuccess = function (value) {
        this.success = value;
    };

    /**
     * Returns with the plugin messages.
     *
     * @returns {plugin.PluginMessage[]}
     */
    PluginResult.prototype.getMessages = function () {
        return this.messages;
    };

    /**
     * Adds a new plugin message to the messages list.
     *
     * @param {plugin.PluginMessage} pluginMessage
     */
    PluginResult.prototype.addMessage = function (pluginMessage) {
        this.messages.push(pluginMessage);
    };

    PluginResult.prototype.getArtifacts = function () {
        return this.artifacts;
    };

    PluginResult.prototype.addArtifact = function (hash) {
        this.artifacts.push(hash);
    };

    /**
     *
     * @param {object} commitData
     * @param {string} commitData.commitHash - hash of the commit.
     * @param {string} commitData.status - storage.constants./SYNCH/FORKED.
     * @param {string} commitData.branchName - name of branch that got updated with the commitHash.
     */
    PluginResult.prototype.addCommit = function (commitData) {
        this.commits.push(commitData);
    };

    /**
     * Gets the name of the plugin to which the result object belongs to.
     *
     * @returns {string}
     */
    PluginResult.prototype.getPluginName = function () {
        return this.pluginName;
    };

    //------------------------------------------------------------------------------------------------------------------
    //--------------- Methods used by the plugin manager

    /**
     * Sets the name of the plugin to which the result object belongs to.
     *
     * @param pluginName - name of the plugin
     */
    PluginResult.prototype.setPluginName = function (pluginName) {
        this.pluginName = pluginName;
    };

    /**
     * Gets the ISO 8601 representation of the time when the plugin started its execution.
     *
     * @returns {string}
     */
    PluginResult.prototype.getStartTime = function () {
        return this.startTime;
    };

    /**
     * Sets the ISO 8601 representation of the time when the plugin started its execution.
     *
     * @param {string} time
     */
    PluginResult.prototype.setStartTime = function (time) {
        this.startTime = time;
    };

    /**
     * Gets the ISO 8601 representation of the time when the plugin finished its execution.
     *
     * @returns {string}
     */
    PluginResult.prototype.getFinishTime = function () {
        return this.finishTime;
    };

    /**
     * Sets the ISO 8601 representation of the time when the plugin finished its execution.
     *
     * @param {string} time
     */
    PluginResult.prototype.setFinishTime = function (time) {
        this.finishTime = time;
    };

    /**
     * Gets error if any error occured during execution.
     * FIXME: should this be an Error object?
     * @returns {string}
     */
    PluginResult.prototype.getError = function () {
        return this.error;
    };

    /**
     * Sets the error string if any error occured during execution.
     * FIXME: should this be an Error object?
     * @param {string} time
     */
    PluginResult.prototype.setError = function (error) {
        this.error = error;
    };

    /**
     * Serializes this object to a JSON representation.
     *
     * @returns {{success: boolean, messages: plugin.PluginMessage[], pluginName: string, finishTime: stirng}}
     */
    PluginResult.prototype.serialize = function () {
        var result = {
            success: this.success,
            messages: [],
            commits: this.commits,
            artifacts: this.artifacts,
            pluginName: this.pluginName,
            startTime: this.startTime,
            finishTime: this.finishTime,
            error: this.error
        },
            i;

        for (i = 0; i < this.messages.length; i += 1) {
            result.messages.push(this.messages[i].serialize());
        }

        return result;
    };

    return PluginResult;
});