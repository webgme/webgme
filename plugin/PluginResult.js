/**
 * Created by zsolt on 3/20/14.
 */

'use strict';
define([], function () {

    // result object that is serializable.
    var PluginResult = function () {
        this.success = false;
        this.messages = []; // array of PluginMessages

    };

    PluginResult.prototype.getSuccess = function() {
        return this.success;
    };

    /**
     *
     * @returns {PluginMessage[]}
     */
    PluginResult.prototype.getMessages = function() {
        return this.messages;
    };

    /**
     *
     * @param {PluginMessage} pluginMessage
     */
    PluginResult.prototype.addMessage = function(pluginMessage) {
        this.messages.push(pluginMessage);
    };

    return PluginResult;
});