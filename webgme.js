/*
 * Copyright (C) 2013-2014 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
//This is the only module which doesn't checks for requirejs, and this is the only which defines the baseUrl!!!
var PATH = require('path'),
    FS = require('fs'),
    requirejs = require('requirejs'),
    baseDir = __dirname,
    paths = {
        "logManager": "common/LogManager",
        "storage": "storage",
        "core": "core",
        "server": "server",
        "auth": "auth",
        "util": "util",
        "baseConfig" : "bin/getconfig",
        "webgme": "webgme",
        "plugin": "plugin"
    };

//All other modules should only configure new path in respect with this base URL!!!
requirejs.config({
    nodeRequire: require,
    baseUrl: baseDir,
    paths:paths
});

var __CONFIG = requirejs('baseConfig');

var getConfig = function(){
    return JSON.parse(JSON.stringify(__CONFIG));
};
var setConfig = function(configObject){
    var i;
    var isGoodExtraAsset = function(name,filePath){
        try{
            var file = FS.readFileSync(filePath+'/'+name+'.js','utf-8');
            if(file === undefined || file === null){
                return false;
            } else {
                return true;
            }
        } catch(e){
            return false;
        }
    };
    var getPluginNames = function(basePaths){
        var names = []; //we add only the "*.js" files from the directories
        basePaths = basePaths || [];
        for(var i=0;i<basePaths.length;i++){
            var additional = FS.readdirSync(basePaths[i]);
            for(var j=0;j<additional.length;j++){
                if(names.indexOf(additional[j]) === -1){
                    if(isGoodExtraAsset(additional[j],PATH.join(basePaths[i],additional[j]))){
                        names.push(additional[j]);
                    }
                }
            }
        }
        return names;
    };

    var addPluginPathsToRequirejs = function(basepaths){
        var requirejsBase = webGMEGlobal.baseDir,
            pluginNames = getPluginNames(basepaths);

        //we go through every plugin and we check where we are able to find the main part of it so we can set the plugin/pluginName path according that in requirejs
        var pluginPaths = {};
        for(var i in pluginNames) {
            var found = false;
            for (var j = 0; j < basepaths.length; j++) {
                if (!found) {
                    try {
                        var items = FS.readdirSync(basepaths[j]);
                        if(items.indexOf(pluginNames[i]) !== -1){
                            pluginPaths['plugin/' + pluginNames[i]] = PATH.relative(requirejsBase,PATH.resolve(basepaths[j]));
                            found = true;
                        }
                    } catch (e) {
                        //do nothing as we will go on anyway
                        //console.error(e);
                    }
                } else {
                    break;
                }
            }
        }


        requirejs.config({
            paths: pluginPaths
        });
    };

    var addToRequireJSPath = function (requireJSPaths) {
        if (!requireJSPaths) {
            return;
        }

        var requirejsBase = webGMEGlobal.baseDir,
            configPaths = {};

        var keys = Object.keys(requireJSPaths);

        for (var i = 0; i < keys.length; i += 1) {
            configPaths[keys[i]] = PATH.relative(requirejsBase,PATH.resolve(requireJSPaths[keys[i]]));
        }

        requirejs.config({
            paths: configPaths
        });
    };

    // updating values if defined (port/mongoip/secretkey/server log file, etc.)
    for (i in __CONFIG) {
        if (__CONFIG.hasOwnProperty(i) && configObject.hasOwnProperty(i)) {

            if (typeof __CONFIG[i] === "number" ||
                typeof __CONFIG[i] === "boolean" ||
                typeof __CONFIG[i] === "string") {

                __CONFIG[i] = configObject[i];
            }
        }
    }

    //adding the paths
    if(configObject.paths){
        for(i in configObject.paths){
            __CONFIG.paths[i] = configObject.paths[i];
        }
    }

    //merge plugin base paths
    if(configObject.pluginBasePaths && configObject.pluginBasePaths.length){
        __CONFIG.pluginBasePaths = configObject.pluginBasePaths.concat(__CONFIG.pluginBasePaths);
    }

    if (__CONFIG.pluginBasePaths) {
        addPluginPathsToRequirejs(__CONFIG.pluginBasePaths);
    }

    //merge decorator base paths
    if(configObject.decoratorpaths && configObject.decoratorpaths.length){
        __CONFIG.decoratorpaths = configObject.decoratorpaths.concat(__CONFIG.decoratorpaths);
    }

    //merge visualizer descriptor paths
    if(configObject.visualizerDescriptors && configObject.visualizerDescriptors.length){
        __CONFIG.visualizerDescriptors = __CONFIG.visualizerDescriptors.concat(configObject.visualizerDescriptors);
    }

    if (__CONFIG.paths) {
        addToRequireJSPath(__CONFIG.paths);
    }

};

//creating a global variable
webGMEGlobal = {
    baseDir : PATH.resolve(baseDir),
    getConfig : getConfig,
    setConfig : setConfig
};

//setting the default array elements
//TODO this should be done already in getconfig !!!
webGMEGlobal.setConfig({
    decoratorpaths : [PATH.join(PATH.join(baseDir,'/client'),"/decorators")],
    pluginBasePaths : [PATH.join(baseDir,"/coreplugins")],
    visualizerDescriptors : [PATH.join(baseDir,"/client/js/Visualizers.json")]
});


module.exports = {
    clientStorage: requirejs('storage/clientstorage'),
    serverStorage: requirejs('storage/serverstorage'),
    serverUserStorage: requirejs('storage/serveruserstorage'),
    core: requirejs('core/core'),
    standaloneServer: requirejs('server/standalone'),
    logManager: requirejs('logManager'),
    runPlugin: requirejs('server/runplugin')
};
