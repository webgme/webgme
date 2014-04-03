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
     * @param {string} commitHash - commit in which the object IDs can be found
     * @param {string} activeNode - context in which the message should be interpreted
     * @param {string[]} activeSelection - involved objects
     * @param {string} message - textual description of the message
     * @constructor
     */
    var PluginMessage = function (commitHash, activeNode, activeSelection, message) {

        this.commitHash = commitHash || '';
        this.activeNode = activeNode || new PluginNodeDescription();
        this.activeSelection = activeSelection || [];
        this.message = message || '';
        // TODO: message type ERROR, WARNING, INFO, DEBUG
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

    /**
     * Deserializes the given serialized plugin message object.
     *
     * @param {{}} json - serialized plugin message object
     */
    PluginMessage.prototype.deserialize = function (json) {
        if (json) {
            this.commitHash = json.commitHash;

            var activeNode = new PluginNodeDescription();
            activeNode.deserialize(json.activeNode);

            this.activeNode = activeNode;
            this.activeSelection = [];
            this.message = json.message;


            for (var i = 0; i < json.activeSelection.length; i += 1) {
                var activeObj = new PluginNodeDescription();
                activeObj.deserialize(json.activeSelection[i]);

                this.activeSelection.push(activeObj);
            }
        }
    };

    return PluginMessage;
});