/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 */

'use strict';
define(['plugin/PluginNodeDescription'], function (PluginNodeDescription) {

    /**
     * Initializes a new instance of plugin message.
     *
     * Note: this object is JSON serializable see serialize method.
     *
     * @param config - deserializes an existing configuration to this object.
     * @constructor
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
            this.activeSelection = [];

            for (var i = 0; i < config.activeSelection.length; i += 1) {
                var activeObj;
                if (config.activeSelection[i] instanceof PluginNodeDescription) {
                    activeObj = config.activeSelection[i];
                } else {
                    activeObj = new PluginNodeDescription(config.activeSelection[i]);
                }
                this.activeSelection.push(activeObj);
            }
            // TODO: message type ERROR, WARNING, INFO, DEBUG
        } else {
            this.commitHash = '';
            this.activeNode = new PluginNodeDescription();
            this.activeSelection = [];
            this.message = '';
            // TODO: message type ERROR, WARNING, INFO, DEBUG
        }
    };

    /**
     * Serializes this object to a JSON representation.
     *
     * @returns {{}}
     */
    PluginMessage.prototype.serialize = function () {
        var result = {
            commitHash: this.commitHash,
            activeNode: this.activeNode.serialize(),
            activeSelection: [],
            message: this.message
        };

        for (var i = 0; i < this.activeSelection.length; i += 1) {
            result.activeSelection.push(this.activeSelection[i].serialize());
        }

        return result;
    };

    return PluginMessage;
});