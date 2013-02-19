/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

var requirejs = require("requirejs");

requirejs.config({
    nodeRequire: require,
    baseUrl: "..",
    paths: {
        basestoragelayer : "storage/local",
    }
});

requirejs([ "util/assert","storage/socketioserver" ],function(ASSERT,SERVER){
    var socketioServer = new SERVER({
        socketioport:888,
        host: "129.59.105.239",
        port: 27017,
        database: "newtest",
        timeout: 10000,
        local: "memory"
    });
});
