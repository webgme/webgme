"use strict";
/*
 * CONFIG FILE
 */

define(['underscore',
    'config/local.config'], function (_underscore,
                                      localConfig ) {

    var WebGME_CONFIG = {
        host            : 'http://kecskes.isis.vanderbilt.edu',
        port            : 80,
        project         : "test",
        autorecconnect  : true,
        reconndelay     : 1000,
        reconnamount    : 1000,
        autostart       : false,


        //used by the server
        loglevel        : 2, // 5 = ALL, 4 = DEBUG, 3 = INFO, 2 = WARNING, 1 = ERROR, 0 = OFF
        logfile         : 'server.log',
        mongoip         : "129.59.105.239",
        mongoport       : 27017,
        mongodatabase   : "multi"
    };

    _.extend(WebGME_CONFIG, localConfig);

    return WebGME_CONFIG;
});