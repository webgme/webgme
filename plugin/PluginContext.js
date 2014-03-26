/**
 * Created by zsolt on 3/20/14.
 */


'use strict';
define([], function () {

    // does not need to be JSON serializable.
    // can contain logger
    var PluginContext = function () {

        // TODO: something like this
//        context.project = project;
//        context.projectName = config.project;
//        context.core = new Core(context.project,{corerel:2});
//        context.commitHash = config.commit;
//        context.selected = config.selected;
//        context.storage = null;


        this._config = null;
    };

    PluginContext.prototype.setConfig = function (config) {
        this._config = config;
    };

    PluginContext.prototype.getConfig = function () {
        return this._config;
    };



    return PluginContext;
});