/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
define([], function () {
    "use strict";

    return {
        core           : require('core/core.js'),
        mongo          : require('storage/mongo.js'),
        log            : require('storage/log.js'),
        cache          : require('storage/cache.js'),
        commit         : require('storage/commit.js'),
        socketioclient : require('storage/socketioclient.js'),
        socketioserver : require('storage/socketioserver.js'),
        local : require('storage/local.js'),
        failsafe : require('storage/failsafe.js')
    };
});
