/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

var requirejs = require("requirejs");

requirejs.config({
    nodeRequire: require,
    baseUrl: "../..",
    paths: {
    }
});

requirejs([ "util/assert","storage/socketioserver","storage/mongo" ],function(ASSERT,SERVER,STORAGE){
    var server = new SERVER(new STORAGE({
        host: "localhost",
        port: 27017,
        database: "multi",
        timeout: 10000
    }),{port:888});

    server.open();
});

