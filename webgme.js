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

module.exports = {
    clientStorage: requirejs('storage/clientstorage'),
    serverStorage: requirejs('storage/serverstorage'),
    serverUserStorage: requirejs('storage/serveruserstorage'),
    core: requirejs('core/core'),
    standaloneServer: requirejs('server/standalone'),
    logManager: requirejs('logManager'),
    runPlugin: requirejs('server/runplugin'),
    BaseConfig : requirejs('baseConfig')
};
