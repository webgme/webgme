/*jshint node:true*/
/**
 * @author kecso / https://github.com/kecso
 * @author nabana / https://github.com/nabana
 */

'use strict';
//This is is the only which defines the baseUrl for requirejs and adds it to the global.requireJS
var requirejs = require('requirejs'),
    path = require('path'),
    requireJsBase = path.join(__dirname, 'src'),
    fs = require('fs'),
    webgmeUtils = require('./src/utils');

global.requireJS = requirejs;

requirejs.config({
    nodeRequire: require,
    baseUrl: requireJsBase,
    paths: {
        blob: 'common/blob',
        executor: 'common/executor'
    }
});

function addToRequireJsPaths(gmeConfig) {

    function addFromBasePath(basepaths, componentName) {
        //type = 'plugin'
        var componentNames = webgmeUtils.getComponentNames(basepaths),
            componentPaths,
            found,
            items,
            i,
            j;

        // We go through every plugin and we check where we are able to find the main part of it
        // so we can set the plugin/pluginName path according that in requirejs.
        componentPaths = {};
        for (i in componentNames) {
            found = false;
            for (j = 0; j < basepaths.length; j++) {
                if (found) {
                    break;
                }
                try {
                    items = fs.readdirSync(basepaths[j]);
                    if (items.indexOf(componentNames[i]) !== -1) {
                        componentPaths[componentName + '/' + componentNames[i]] = path.relative(requireJsBase,
                            path.resolve(basepaths[j]));
                        found = true;
                    }
                } catch (e) {
                    //do nothing as we will go on anyway
                    //console.error(e);
                }
            }
        }

        requirejs.config({
            paths: componentPaths
        });
    }

    function addFromRequireJsPath(requireJsPaths) {
        var configPaths = {},
            keys = Object.keys(requireJsPaths),
            i;

        for (i = 0; i < keys.length; i += 1) {
            configPaths[keys[i]] = path.relative(requireJsBase, path.resolve(requireJsPaths[keys[i]]));
        }

        requirejs.config({
            paths: configPaths
        });
    }

    addFromBasePath(gmeConfig.plugin.basePaths, 'plugin');
    addFromBasePath(gmeConfig.addOn.basePaths, 'addon');
    addFromRequireJsPath(gmeConfig.requirejsPaths);
}

var sa = require('./src/server/standalone.js');
module.exports = {
    standaloneServer: function (gmeConfig) {
        var Standalone = require('./src/server/standalone.js');
        return new Standalone(gmeConfig);
    },

    requirejs: requirejs,
    addToRequireJsPaths: addToRequireJsPaths,
    getStorage: function (logger, gmeConfig, gmeAuth) {
        var Mongo = require('./src/server/storage/mongo'),
            SafeStorage = require('./src/server/storage/safestorage'),
            mongo = new Mongo(logger, gmeConfig);

        return new SafeStorage(mongo, logger, gmeConfig, gmeAuth);
    },
    getGmeAuth: function (gmeConfig, callback) {
        var Q = require('q'),
            GMEAuth = require('./src/server/middleware/auth/gmeauth'),
            deferred = Q.defer(),
            gmeAuth;

        gmeAuth = new GMEAuth(null, gmeConfig);
        gmeAuth.connect(function (err) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(gmeAuth);
            }
        });

        return deferred.promise.nodeify(callback);
    },
    core: requirejs('common/core/core'),
    serializer: requirejs('common/core/users/serialization'),
    canon: requirejs('common/util/canon'),
    Logger: require('./src/server/logger'),
    REGEXP: requirejs('common/regexp'),
    PluginCliManager: require('./src/plugin/climanager')
};