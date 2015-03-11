/*jshint node:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

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

function validateConfig (configOrFileName) {
    'use strict';
    var configFileName,
        config;

    if (typeof configOrFileName === 'string') {
        configFileName = configOrFileName;
        config = require(configFileName);
    } else {
        configFileName = 'unknown';
        config = configOrFileName;
    }
    ASSERT(config !== undefined,
        configFileName + ' GME configuration must be an object. Got: ' + config);

// server configuration
    ASSERT(config.server !== undefined,
        configFileName + ' GME configuration must have server object. Got: ' + config.server);
    ASSERT(config.server.port !== undefined,
        configFileName + ' GME server configuration must have a port. Got: ' + config.server.port);
    ASSERT(config.server.https !== undefined,
        configFileName + ' GME server configuration must have an https object');
    ASSERT(config.server.https.enable !== undefined);

// mongo configuration
    ASSERT(config.mongo !== undefined);
    ASSERT(config.mongo.uri !== undefined);
    ASSERT(config.mongo.options !== undefined);
// TODO: check all mandatory options
}

module.exports = validateConfig;