define([], function () {
    //here you can define global variables for your middleware
    var counter = 0,
        ensureAuthenticated,
        gmeConfig, //global config is passed by server/standalone.js
        Logger = require(require('path').join(requirejs.s.contexts._.config.baseUrl, 'server/logger')),
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
        logger = Logger.create('gme:server:middleware:ExampleRestComponent', gmeConfig.server.log)
        ensureAuthenticated = _ensureAuthenticated;
        return ExampleRestComponent;
    };

    return setup;
});

