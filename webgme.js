/*
 * Copyright (C) 2013-2014 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
//This is the only module which doesn't checks for requirejs, and this is the only which defines the baseUrl!!!
var PATH = require('path'),
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

    //merge decorator base paths
    if(configObject.decoratorpaths && configObject.decoratorpaths.length){
        __CONFIG.decoratorpaths = configObject.decoratorpaths.concat(__CONFIG.decoratorpaths);
    }

    //merge visualizer descriptor paths
    if(configObject.visualizerDescriptors && configObject.visualizerDescriptors.length){
        __CONFIG.visualizerDescriptors = __CONFIG.visualizerDescriptors.concat(configObject.visualizerDescriptors);
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
