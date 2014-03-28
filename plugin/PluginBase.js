/**
 * Created by zsolt on 3/20/14.
 */

'use strict';
define(['./PluginConfig'], function (PluginConfig) {

    var PluginBase = function (LogManager) {
        if (LogManager) {
            this.logger = LogManager.create('Plugin.PluginBase');
        } else {
            this.logger = console;
        }
    };

    PluginBase.prototype.doInteractiveConfig = function (preconfig, callback) {
        callback({});
    };


    PluginBase.prototype.main = function (config, callback) {
        throw new Error('implement this function in the derived class');
    };


    PluginBase.prototype.progress = function (percent, title, description) {
        throw new Error('implement this function');
    };


    PluginBase.prototype.checkModel = function () {
        throw new Error('implement this function');
    };

    PluginBase.getName = function () {
        throw new Error('implement this function');
    };

    PluginBase.getVersion = function () {
        throw new Error('implement this function');
    };

    PluginBase.getSupportedContexts = function () {
        throw new Error('implement this function');
    };

    PluginBase.getDefaultConfig = function () {
        return new PluginConfig();
    };

    return PluginBase;
});