/*globals define, requireJS*/
/*jshint node:true*/

    //TODO: reformat me
    'use strict';
    // Here you can define global variables for your middleware
    // To use any requirejs modules from webgme, use the global requireJS.
    var counter = 0,
        ensureAuthenticated,
        gmeConfig, //global config is passed by server/standalone.js
        Logger = require('../logger'),
        logger;
        //how to define your own logger which will use the global settings

    var ExampleRestComponent = function (req, res, next) {
        var handleRequest = function () {
            counter++;
            if (counter % 10) {
                logger.info(JSON.stringify(gmeConfig, null, 2));
            }

            // call next if request is not handled here.

            res.send(JSON.stringify({ExampleRestComponent: 'says hello'}));
        };

        // the request can be handled with ensureAuthenticated
        ensureAuthenticated(req, res, handleRequest);
    };

    var setup = function (_gmeConfig, _ensureAuthenticated) {
        gmeConfig = _gmeConfig;
        logger = Logger.create('gme:server:middleware:ExampleRestComponent', gmeConfig.server.log);
        ensureAuthenticated = _ensureAuthenticated;
        return ExampleRestComponent;
    };

    module.exports = setup;