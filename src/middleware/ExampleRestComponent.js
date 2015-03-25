define(['common/LogManager'], function (logManager) {
    //here you can define global variables for your middleware
    var counter = 0,
        ensureAuthenticated,
        gmeConfig, //global config is passed by server/standalone.js
        logger = logManager.create('ExampleRestComponent');
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
        ensureAuthenticated = _ensureAuthenticated;
        return ExampleRestComponent;
    };

    return setup;
});

