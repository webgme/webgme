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
        this.pluginName = 'PluginName N/A';
        this.finishTime = null;
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

    PluginResult.prototype.getName = function() {
        return this.pluginName;
    };

    PluginResult.prototype.setName = function(name) {
        this.pluginName = name;
    };

    PluginResult.prototype.getTime = function() {
        return this.finishTime;
    };

    PluginResult.prototype.setTime = function(time) {
        this.finishTime = time;
    };


    PluginResult.prototype.serialize = function() {
        var result = {
            success: this.success,
            messages: [],
            pluginName: this.pluginName,
            finishTime: this.finishTime
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
            this.pluginName = json.pluginName;
            this.finishTime = json.finishTime;

            for (var i = 0; i < json.messages.length; i += 1) {
                var pluginMessage = new PluginMessage();
                pluginMessage.deserialize(json.messages[i]);
                this.messages.push(pluginMessage);
            }
        }
    };

    return PluginResult;
});