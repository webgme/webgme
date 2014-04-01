/**
 * Created by zsolt on 3/20/14.
 */

'use strict';
define(['./PluginConfig'], function (PluginConfig) {

    var PluginBase = function () {
        this.logger = null;
        this.fs = null;
        this._currentConfig = null;
    };


    PluginBase.prototype.initialize = function (logger, fs) {
        if (logger) {
            this.logger = logger;
        } else {
            this.logger = console;
        }

        this.fs = fs;

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