/*jshint node:true*/
/**
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';
var validator = require('webgme-engine/config/validator');

function validateConfig(configOrFileName) {
    var config = validator.validateConfig(configOrFileName);

    validator.warnDeprecated('config.client.defaultContext', config.client.defaultContext,
        'Use component settings for "GenericUIWebGMEStart"');
    validator.assertEnum('config.client.defaultConnectionRouter', config.client.defaultConnectionRouter,
        'basic', 'basic2', 'basic3');
    validator.assertObject('config.client.errorReporting', config.client.errorReporting);
    validator.assertBoolean('config.client.errorReporting.enable', config.client.errorReporting.enable);
    validator.assertString('config.client.errorReporting.DSN', config.client.errorReporting.DSN);
    validator.assertObject('config.client.errorReporting.ravenOptions', config.client.errorReporting.ravenOptions, true);
    validator.assertBoolean('config.client.allowUserDefinedSVG', config.client.allowUserDefinedSVG);

    validator.warnDeprecated('config.visualization.layout.default', config.visualization.layout.default,
        'Since v2.11.0 this is a component setting of GenericUIWebGMEStart.layout and can be configured for projects ' +
        'based on kind, name and ID. The value in gmeConfig.visualization.layout.default will right now be used for ' +
        'non-specified projects.');
}

module.exports = validateConfig;

