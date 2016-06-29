/*jshint node:true*/
/**
 * This is deprecated, use ExampleRestRouter instead.
 * TODO: Remove this class.
 * @author kecso / https://github.com/kecso
 */

'use strict';
// Here you can define global variables for your middleware
// To use any requirejs modules from webgme, use the global requireJS.
var counter = 0,
    ensureAuthenticated,
    gmeConfig, //global config is passed by server/standalone.js
    logger;

var ExampleRestComponent = function (req, res/*, next*/) {
    var handleRequest = function () {
        if (counter % 10) {
            logger.debug(counter);
        } else {
            logger.info(JSON.stringify(gmeConfig, null, 2));
        }
        counter++;

        // call next if request is not handled here.

        res.send(JSON.stringify({ExampleRestComponent: 'says hello'}));
    };

    // the request can be handled with ensureAuthenticated
    ensureAuthenticated(req, res, handleRequest);
};

var setup = function (_gmeConfig, _ensureAuthenticated, _logger) {
    gmeConfig = _gmeConfig;
    logger = _logger.fork('middleware:ExampleRestComponent');
    //logger = _logger.fork('MyApp:middle:ExampleRestComponent', true); set true to use given name directly
    ensureAuthenticated = _ensureAuthenticated;
    return ExampleRestComponent;
};

module.exports = setup;