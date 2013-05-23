/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
var requirejs = require('requirejs');
requirejs.config({
    nodeRequire: require,
    baseUrl: __dirname+'/..'
});
var cache = requirejs(__dirname+'/../storage/cache.js'),
    commit = requirejs(__dirname+'/../storage/commit.js'),
    failsafe = requirejs(__dirname+'/../storage/failsafe.js'),
    local = requirejs(__dirname+'/../storage/local.js'),
    log = requirejs(__dirname+'/../storage/log.js'),
    mongo = requirejs(__dirname+'/../storage/mongo.js'),
    socketioclient = requirejs(__dirname+'/../storage/socketioclient.js'),
    socketioserver = requirejs(__dirname+'/../storage/socketioserver.js'),
    core = requirejs(__dirname+'/../core/core.js'),
    setcore = requirejs(__dirname+'/../core/setcore.js');

module.exports = {
    storage : {
        cache : cache,
        commit : commit,
        failsafe : failsafe,
        local : local,
        log : log,
        mongo : mongo,
        socketioclient : socketioclient,
        socketioserver : socketioserver
    },
    core : {
        core : core,
        setcore : setcore
    }
};
