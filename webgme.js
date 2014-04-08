/*
 * Copyright (C) 2013-2014 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

var requirejs = require('requirejs');
requirejs.config({
    nodeRequire: require,
    baseUrl: __dirname,
    paths:{
        "logManager": "common/LogManager"
    }
});

module.exports = {
    clientStorage: requirejs('storage/clientstorage'),
    serverStorage: requirejs('storage/serverstorage'),
    serverUserStorage: requirejs('storage/serveruserstorage'),
    core: requirejs('core/core'),
    standaloneServer: requirejs('server/standalone'),
    logManager: requirejs('logManager'),
    runPlugin: requirejs(__dirname + '/bin/run_plugin')
};
