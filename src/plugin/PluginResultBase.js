/*globals define*/
/*jshint browser: true, node:true*/

/**
 * A module representing the base class for PluginResult and InterPluginResult.
 * @author pmeijer / https://github.com/meijer
 */

define([], function () {
    'use strict';

    /**
     * Initializes a new instance of a plugin result object.
     * @constructor
     * @alias PluginResultBase
     * @param {string} pluginName - name of plugin.
     */
    var PluginResultBase = function (pluginName) {
        this.success = false;
        this.artifacts = [];
        this.messages = [];
        this.pluginName = pluginName;
    };

    /**
     * Gets the success flag of this result object
     *
     * @returns {boolean}
     */
    PluginResultBase.prototype.getSuccess = function () {
        return this.success;
    };

    /**
     * Sets the success flag of this result.
     *
     * @param {boolean} value
     */
    PluginResultBase.prototype.setSuccess = function (value) {
        this.success = value;
    };

    /**
     * Returns with the plugin messages.
     *
     * @returns {PluginMessage[]}
     */
    PluginResultBase.prototype.getMessages = function () {
        return this.messages;
    };

    /**
     * Adds a new plugin message to the messages list.
     *
     * @param {PluginMessage} pluginMessage
     */
    PluginResultBase.prototype.addMessage = function (pluginMessage) {
        this.messages.push(pluginMessage);
    };

    /**
     * Returns all artifacts stored.
     *
     * @returns {string[]} hashes - Hashes of the stored artifacts.
     */
    PluginResultBase.prototype.getArtifacts = function () {
        return this.artifacts;
    };

    /**
     * Adds a saved artifact to the result - linked via its hash.
     *
     * @param {string} hash - Hash of saved artifact.
     */
    PluginResultBase.prototype.addArtifact = function (hash) {
        this.artifacts.push(hash);
    };

    /**
     * Gets the name of the plugin to which the result object belongs to.
     *
     * @returns {string}
     */
    PluginResultBase.prototype.getPluginName = function () {
        return this.pluginName;
    };

    return PluginResultBase;
});