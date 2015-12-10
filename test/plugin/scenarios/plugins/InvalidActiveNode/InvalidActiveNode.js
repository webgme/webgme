/*globals define*/
/*jshint node:true, browser:true*/

if (typeof define === 'undefined') {

} else {
    define([
        'plugin/PluginConfig',
        'plugin/PluginBase'
    ], function (PluginConfig,
                 PluginBase) {
        'use strict';
        var InvalidActiveNode = function () {
            // Call base class' constructor.
            PluginBase.call(this);
        };

        InvalidActiveNode.prototype = Object.create(PluginBase.prototype);
        InvalidActiveNode.prototype.constructor = InvalidActiveNode;

        InvalidActiveNode.prototype.getName = function () {
            return 'Invalid Active Node';
        };

        InvalidActiveNode.prototype.getVersion = function () {
            return '0.1.0';
        };

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