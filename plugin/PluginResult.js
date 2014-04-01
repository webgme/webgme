/**
 * Created by zsolt on 3/20/14.
 */

'use strict';
define(['plugin/PluginMessage'], function (PluginMessage) {

    // result object that is serializable.
    var PluginResult = function () {
        this.initialize();
    };

    PluginResult.prototype.initialize = function() {
        this.success = false;
        this.messages = []; // array of PluginMessages
    };

    PluginResult.prototype.getSuccess = function() {
        return this.success;
    };

    /**
     *
     * @returns {plugin.PluginMessage[]}
     */
    PluginResult.prototype.getMessages = function() {
        return this.messages;
    };

    /**
     *
     * @param {plugin.PluginMessage} pluginMessage
     */
    PluginResult.prototype.addMessage = function(pluginMessage) {
        this.messages.push(pluginMessage);
    };



    PluginResult.prototype.serialize = function() {
        var result = {
            success: this.success,
            messages: []
        };

        for (var i = 0; i < this.messages.length; i += 1) {
            result.messages.push(this.messages[i].serialize());
        }

        return result;
    };

    PluginResult.prototype.deserialize = function (json) {
        this.initialize();

        if (json) {
            this.success = json.success;

            for (var i = 0; i < json.messages.length; i += 1) {
                var pluginMessage = new PluginMessage();
                pluginMessage.deserialize(json.messages[i]);
                this.messages.push(pluginMessage);
            }
        }
    };

    return PluginResult;
});