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
    }
});

requirejs([ "util/assert","storage/socketioserver","storage/local" ],function(ASSERT,SERVER,LOCAL){
    var server = new SERVER(new LOCAL({
            host: "129.59.105.239",
            port: 27017,
            database: "newtest",
            timeout: 10000,
            local: "memory"
            }),{port:888});

    server.open();
});
