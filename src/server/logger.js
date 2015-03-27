/*jshint node:true*/
/**
 * example usage
 * create('moduleName', gmeConfig.server.log);
 *
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var winston = require('winston');

function createLogger(name, options) {
    var winstonOptions = {transports: []},
        i,
        transport,

        j,
        len,
        patterns,
        pattern,
        shouldSkip,
        shouldInclude;

    if (!options) {
        throw new Error('options is a mandatory parameter.');
    }

    if (!options.transports) {
        throw new Error('options.transports is a mandatory parameter.');
    }


    for (i = 0; i < options.transports.length; i += 1) {

        patterns = options.transports[i].patterns || ['*']; // log everything by default
        len = patterns.length;

        shouldSkip = false;
        shouldInclude = false;
        for (j = 0; j < len; j += 1) {
            if (patterns[j] === '') {
                // ignore empty strings
                continue;
            }
            pattern = patterns[j].replace(/\*/g, '.*?');
            if (pattern[0] === '-') {
                shouldSkip = shouldSkip || (new RegExp('^' + pattern.substr(1) + '$')).test(name);
            } else {
                shouldInclude = shouldInclude || (new RegExp('^' + pattern + '$')).test(name);
            }
        }

        if (shouldInclude && shouldSkip === false) {
            // add the transport
            options.transports[i].options.label = name;
            transport = new (winston.transports[options.transports[i].transportType])(options.transports[i].options);
            winstonOptions.transports.push(transport);
        }
    }

    return winston.loggers.add(name, winstonOptions);
}

function createWithGmeConfig(name, gmeConfig) {
    return createLogger(name, gmeConfig.server.log);
}

module.exports = {
    create: createLogger,
    createWithGmeConfig: createWithGmeConfig
};