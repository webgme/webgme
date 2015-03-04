/*globals require, $, console, angular, __dirname*/

/**
 * @author kecso / https://github.com/kecso
 * @author nabana / https://github.com/nabana
 */

(function( global ){

"use strict";

//This is the only module which doesn't check for requirejs, and this is the only which defines the baseUrl
var PATH = require('path'),
    FS = require('fs'),
    requirejs = require('requirejs'),
    baseDir = __dirname+'/src/',
    paths = {
        "logManager": "common/LogManager",
        "storage": "common/storage",
        "core": "common/core",
        "server": "server",
        "auth": "server/auth",
        "util": "common/util",
        "baseConfig" : "bin/getconfig",
        "webgme": "webgme",
        "plugin": "plugin",
        "worker": "server/worker",
        "coreclient": "common/core/users",
        "blob": "middleware/blob",
        "executor": "middleware/executor",
    };
//All other modules should only configure new path in respect with this base URL
requirejs.config({
    nodeRequire: require,
    baseUrl: baseDir,
    paths:paths
});

var __CONFIG = requirejs('baseConfig' ),
    WebGMEGlobal;

var getConfig = function(){
    return JSON.parse(JSON.stringify(__CONFIG));
};
var setConfig = function(configObject){
    var keys, i, j,
        isGoodExtraAsset = function(name,filePath){
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
        },
        getPluginNames = function(basePaths){
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
        },
        addPluginPathsToRequirejs = function(basepaths){
            var requirejsBase = WebGMEGlobal.baseDir,
                pluginNames = getPluginNames(basepaths),
                i,j;

            //we go through every plugin and we check where we are able to find the main part of it so we can set the plugin/pluginName path according that in requirejs
            var pluginPaths = {};
            for(i in pluginNames) {
                var found = false;
                for (j = 0; j < basepaths.length; j++) {
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
        },
        addAddOnPathsToRequirejs = function(basepaths){
            var requirejsBase = WebGMEGlobal.baseDir,
                pluginNames,
                i,j;

            for(i=0;i<basepaths.length;i++){
                if(basepaths[i].indexOf(requirejsBase) === -1){
                    basepaths[i] = PATH.join(requirejsBase,basepaths[i]);
                }
            }
            pluginNames = getPluginNames(basepaths);

            //we go through every plugin and we check where we are able to find the main part of it so we can set the plugin/pluginName path according that in requirejs
            var pluginPaths = {};
            for(i in pluginNames) {
                var found = false;
                for (j = 0; j < basepaths.length; j++) {
                    if (!found) {
                        try {
                            var items = FS.readdirSync(basepaths[j]);
                            if(items.indexOf(pluginNames[i]) !== -1){
                                pluginPaths['addon/' + pluginNames[i]] = PATH.relative(requirejsBase,PATH.resolve(basepaths[j]));
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
        },
        addToRequireJSPath = function (requireJSPaths) {
            if (!requireJSPaths) {
                return;
            }

            var requirejsBase = WebGMEGlobal.baseDir,
                configPaths = {};

            var keys = Object.keys(requireJSPaths);

            for (var i = 0; i < keys.length; i += 1) {
                configPaths[keys[i]] = PATH.relative(requirejsBase,PATH.resolve(requireJSPaths[keys[i]]));
            }

            requirejs.config({
                paths: configPaths
            });
        };

    //setting simple values
    keys = Object.keys(configObject);
    for(i=0;i<keys.length;i++){
        if (typeof configObject[keys[i]] === "number" ||
            typeof configObject[keys[i]] === "boolean" ||
            typeof configObject[keys[i]] === "string") {

            __CONFIG[keys[i]] = configObject[keys[i]];
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

    if(configObject.addonBasePaths && configObject.addonBasePaths.length){
        __CONFIG.addonBasePaths = configObject.addonBasePaths.concat(__CONFIG.addonBasePaths);
    }
    if(__CONFIG.addonBasePaths) {
        addAddOnPathsToRequirejs(__CONFIG.addonBasePaths);
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

    //merge rextrast moduls - keeping the older ones
    if(configObject.rextrast){
        keys = Object.keys(configObject.rextrast);
        for(i=0;i<keys.length;i++){
            __CONFIG.rextrast = __CONFIG.rextrast || {};
            if(!__CONFIG.rextrast[keys[i]]){
                __CONFIG.rextrast[keys[i]] = PATH.relative(WebGMEGlobal.baseDir,PATH.resolve(configObject.rextrast[keys[i]]));
            }
        }
    }
};

//creating a global variable
WebGMEGlobal = {
    baseDir : PATH.resolve(baseDir),
    getConfig : getConfig,
    setConfig : setConfig,
    requirejs : requirejs
};
WebGMEGlobal.TESTING = global.TESTING;

//setting the default array elements
//TODO this should be done already in getconfig !!!
WebGMEGlobal.setConfig({
    decoratorpaths : [PATH.join(PATH.join(baseDir,'/client'),"/decorators")],
    pluginBasePaths : [PATH.join(baseDir,"/plugin/coreplugins")],
    visualizerDescriptors : [PATH.join(baseDir,"/client/js/Visualizers.json")]/*,
    rextrast : {
        'example' : PATH.join(baseDir,"/middlewares/exampleRExtraST")
    }*/
});

global.WebGMEGlobal = WebGMEGlobal;


module.exports = {
    clientStorage: requirejs('storage/clientstorage'),
    serverStorage: requirejs('storage/serverstorage'),
    serverUserStorage: requirejs('storage/serveruserstorage'),
    core: requirejs('core/core'),
    standaloneServer: requirejs('server/standalone'),
    logManager: requirejs('logManager'),
    runPlugin: requirejs('server/runplugin'),
    serializer: requirejs('core/users/serialization'),
    canon: requirejs('common/util/canon')
};

})( global );