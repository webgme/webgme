/*globals define*/
/*jshint browser: true, node:true*/

/**
 * A module representing the result from an invoked plugin.
 * @author pmeijer / https://github.com/meijer
 */

define(['plugin/PluginResultBase'], function (PluginResultBase) {
    'use strict';

    /**
     * Initializes a new instance of a plugin result object passed from an invoked plugin.
     * @constructor
     * @augments PluginResultBase
     * @alias InterPluginResult
     */
    var InterPluginResult = function (pluginInstance) {
        this.success = false;
        this.artifacts = [];
        this.messages = [];
        this.commitMessages = [];

        this.pluginInstance = pluginInstance;
        this.pluginName = pluginInstance.getName();
    };

    // Prototypical inheritance from PluginResultBase.
    InterPluginResult.prototype = Object.create(PluginResultBase.prototype);
    InterPluginResult.prototype.constructor = InterPluginResult;

    /**
     * Adds commit message to result.
     * @param {string} message
     */
    InterPluginResult.prototype.addCommitMessage = function (message) {
        this.commitMessages.push(message);
    };

    /**
     * Gets the added commitMessages.
     * @param {string[]} messages
     */
    InterPluginResult.prototype.getCommitMessages = function () {
        return this.commitMessages;
    };

    return InterPluginResult;
});