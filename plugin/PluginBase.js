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

        this._currentConfig = null;
        // initialize default configuration
        this.setCurrentConfig(this.getDefaultConfig());
    };


    PluginBase.prototype.main = function (config, callback) {
        throw new Error('implement this function in the derived class');
    };


    PluginBase.prototype.getDefaultConfig = function () {
        var configStructure = this.getConfigStructure();

        var defaultConfig = new PluginConfig();

        for (var i = 0; i < configStructure.length; i += 1) {
            defaultConfig[configStructure[i].name] = configStructure[i].value;
        }

        return defaultConfig;
    };

    PluginBase.prototype.getConfigStructure = function () {
        return [];
    };

    PluginBase.prototype.getCurrentConfig = function () {
        return this._currentConfig;
    };

    PluginBase.prototype.setCurrentConfig = function (newConfig) {
        this._currentConfig = newConfig;
    };

    return PluginBase;
});