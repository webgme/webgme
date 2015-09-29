/*globals define*/
/*jshint browser: true, node:true*/

/**
 * A module representing a PluginMessage.
 *
 * @author lattmann / https://github.com/lattmann
 */


define(['plugin/PluginNodeDescription'], function (PluginNodeDescription) {
    'use strict';

    /**
     * Initializes a new instance of plugin message.
     *
     * Note: this object is JSON serializable see serialize method.
     *
     * @param {object} config - deserializes an existing configuration to this object.
     * @constructor
     * @alias PluginMessage
     */
    var PluginMessage = function (config) {
        if (config) {
            this.commitHash = config.commitHash;
            if (config.activeNode instanceof PluginNodeDescription) {
                this.activeNode = config.activeNode;
            } else {
                this.activeNode = new PluginNodeDescription(config.activeNode);
            }

            this.message = config.message;
            if (config.severity) {
                this.severity = config.severity;
            } else {
                this.severity = 'info';
            }
        } else {
            this.commitHash = '';
            this.activeNode = new PluginNodeDescription();
            this.message = '';
            this.severity = 'info';
        }
    };

    /**
     * Serializes this object to a JSON representation.
     *
     * @returns {object}
     */
    PluginMessage.prototype.serialize = function () {
        var result = {
            commitHash: this.commitHash,
            activeNode: this.activeNode.serialize(),
            message: this.message,
            severity: this.severity
        };

        return result;
    };

    return PluginMessage;
});