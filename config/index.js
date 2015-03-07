/*jshint node: true*/
/**
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

var env = process.env.NODE_ENV || 'global',
    configFilename = __dirname + '/config.' + env + '.js',
    config = require(configFilename);

// implement assert here to avoid dependency on runtime
function ASSERT(condition, message) {
    'use strict';
    if (!condition) {
        message = message || 'Assertion failed';
        if (Error !== undefined) {
            throw new Error(message);
        }
        throw message; // Fallback
    }
}

// We will fail as early as possible
// TODO: add type checks
ASSERT(config !== undefined,
    configFilename + ' GME configuration must be an object. Got: ' + config);

// server configuration
ASSERT(config.server !== undefined,
    configFilename + ' GME configuration must have server object. Got: ' + config.server);
ASSERT(config.server.port !== undefined,
    configFilename + ' GME server configuration must have a port. Got: ' + config.server.port);
ASSERT(config.server.https !== undefined,
    configFilename + ' GME server configuration must have an https object');
ASSERT(config.server.https.enable !== undefined);

// mongo configuration
ASSERT(config.mongo !== undefined);
ASSERT(config.mongo.uri !== undefined);
ASSERT(config.mongo.options !== undefined);
// TODO: check all mandatory options


module.exports = config;


