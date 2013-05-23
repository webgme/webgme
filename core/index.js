/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
var requirejs = require('requirejs');
var cache = requirejs(__dirname+'/../storage/cache'),
    commit = requirejs(__dirname+'/../storage/commit'),
    failsafe = requirejs(__dirname+'/../storage/failsafe'),
    local = requirejs(__dirname+'/../storage/local'),
    log = requirejs(__dirname+'/../storage/log'),
    mongo = requirejs(__dirname+'/../storage/mongo'),
    socketioclient = requirejs(__dirname+'/../storage/socketioclient'),
    socketioserver = requirejs(__dirname+'/../storage/socketioserver'),
    core = requirejs(__dirname+'/../core/core'),
    setcore = requirejs(__dirname+'/../core/setcore');

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
