/*globals define*/
/*jshint node:true, browser:true*/

if (typeof define === 'undefined') {

} else {
    define([
        'plugin/PluginConfig',
        'plugin/PluginBase',
        'text!./metadata.json'
    ], function (PluginConfig,
                 PluginBase,
                 pluginMetadata) {
        'use strict';

        pluginMetadata = JSON.parse(pluginMetadata);
        var InvalidActiveNode = function () {
            // Call base class' constructor.
            PluginBase.call(this);
            this.pluginMetadata = pluginMetadata;
        };

        InvalidActiveNode.metadata = pluginMetadata;

        InvalidActiveNode.prototype = Object.create(PluginBase.prototype);
        InvalidActiveNode.prototype.constructor = InvalidActiveNode;

        InvalidActiveNode.prototype.main = function (callback) {
            var self = this,
                isInvalidActiveNode = self.isInvalidActiveNode('InvalidActiveNode');

            if (isInvalidActiveNode) {
                callback(isInvalidActiveNode, self.result);
            } else {
                self.result.setSuccess(true);
                callback(null, self.result);
            }
        };

        return InvalidActiveNode;
    });
}