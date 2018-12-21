/*jshint node: true*/
/**
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

var env = process.env.NODE_ENV || 'default',
    configFilename = __dirname + '/config.' + env + '.js',
    config = require(configFilename),
    validateConfig = require('webgme-engine/config/validator').validateConfig,
    overrideFromEnv = require('./overridefromenv');

console.info('Using configuration from ' + configFilename);
overrideFromEnv(config);
validateConfig(config);

module.exports = config;


