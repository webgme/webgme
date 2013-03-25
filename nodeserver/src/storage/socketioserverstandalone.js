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

requirejs([ "util/assert","storage/socketioserver","storage/cache","storage/mongo" ],function(ASSERT,SERVER,CACHE,LOCAL){
    var server = new SERVER(new CACHE(new LOCAL({
            host: "129.59.105.239",
            port: 27017,
            database: "multi",
            timeout: 10000,
            local: "memory"
            }),{}),{port:888});

    server.open();
});
