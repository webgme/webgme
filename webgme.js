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
    webgmeUtils = require('./src/utils'),
    _core,
    _canon,
    _Logger,
    _REGEXP,
    _PluginCliManager,
    exports = {
        requirejs: requirejs
    };

global.requireJS = requirejs;

requirejs.config({
    nodeRequire: require,
    baseUrl: requireJsBase,
    paths: {
        text: 'client/lib/require/require-text/text',
        blob: 'common/blob',
        executor: 'common/executor'
    }
});

function addToRequireJsPaths(gmeConfig) {

    function addAssetFromBasePath(basepaths, componentName) {
        var componentNames = webgmeUtils.getComponentNames(basepaths);
        return addFromBasePath(basepaths, componentName, componentNames);
    }

    function addDirsFromBasePath(basepaths, componentName) {
        var componentNames = [],
            files,
            filePath;

        for (var i = basepaths.length; i--;) {
            files = fs.readdirSync(basepaths[i]);
            for (var j = files.length; j--;) {
                filePath = path.join(basepaths[i], files[j]);
                if (fs.statSync(filePath).isDirectory()) {
                    componentNames.push(files[j]);
                }
            }
        }
        return addFromBasePath(basepaths, componentName, componentNames);
    }

    function addFromBasePath(basepaths, componentName, componentNames) {
        //type = 'plugin'
        var componentPaths,
            componentPath,
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
                        componentPath = path.relative(requireJsBase, path.resolve(basepaths[j]));
                        componentPaths[componentName + '/' + componentNames[i]] = componentPath;
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
            j,
            i;
        for (i = 0; i < keys.length; i += 1) {
            if (typeof requireJsPaths[keys[i]] === 'string') {
                configPaths[keys[i]] = path.relative(requireJsBase, path.resolve(requireJsPaths[keys[i]]));
            } else if (requireJsPaths[keys[i]] instanceof Array) {
                configPaths[keys[i]] = [];
                for (j = 0; j < requireJsPaths[keys[i]].length; j += 1) {
                    configPaths[keys[i]].push(path.relative(requireJsBase, path.resolve(requireJsPaths[keys[i]][j])));
                }
            } else {
                throw new Error('Given requirejsPaths value is not a string nor array "' + keys[i] + '": ' +
                '"' + requireJsPaths[keys[i]] + '"');
            }
        }

        requirejs.config({
            paths: configPaths
        });
    }

    addAssetFromBasePath(gmeConfig.plugin.basePaths, 'plugin');
    addAssetFromBasePath(gmeConfig.addOn.basePaths, 'addon');
    addAssetFromBasePath(gmeConfig.visualization.layout.basePaths, 'layout');
    // Panels are structured a little differently and may not have
    // PANEL_NAME/PANEL_NAME.js like plugins, addons or layouts
    addDirsFromBasePath(gmeConfig.visualization.panelPaths, 'panel');

    addFromRequireJsPath(gmeConfig.requirejsPaths);
}

Object.defineProperties(exports, {
    core: {
        get: function () {
            if (!_core) {
                _core = requirejs('common/core/core');
            }
            return _core;
        }
    },
    canon: {
        get: function () {
            if (!_canon) {
                _canon = requirejs('common/util/canon');
            }
            return _canon;
        }
    },
    Logger: {
        get: function () {
            if (!_Logger) {
                _Logger = require('./src/server/logger');
            }
            return _Logger;
        }
    },
    REGEXP: {
        get: function () {
            if (!_REGEXP) {
                _REGEXP = requirejs('common/regexp');
            }
            return _REGEXP;
        }
    },
    PluginCliManager: {
        get: function () {
            if (!_PluginCliManager) {
                _PluginCliManager = require('./src/plugin/climanager');
            }

            return _PluginCliManager;
        }
    }
});

exports.addToRequireJsPaths = addToRequireJsPaths;
exports.standaloneServer = function (gmeConfig) {
    var Standalone = require('./src/server/standalone.js');
    return new Standalone(gmeConfig);
};

exports.getStorage = function (logger, gmeConfig, gmeAuth) {
    var Mongo = require('./src/server/storage/mongo'),
        SafeStorage = require('./src/server/storage/safestorage'),
        mongo = new Mongo(logger, gmeConfig);

    return new SafeStorage(mongo, logger, gmeConfig, gmeAuth);
};

exports.getGmeAuth = function (gmeConfig, callback) {
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
};

exports.getGmeConfig = function () {
    var gmeConfig = require(path.join(process.cwd(), 'config'));
    addToRequireJsPaths(gmeConfig);
    return gmeConfig;
};

module.exports = exports;
