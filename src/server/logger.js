/*jshint node:true*/
/**
 * example usage
 * create('moduleName', gmeConfig.server.log);
 *
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var winston = require('winston');

function createLogger(name, options, useHandleExceptions) {
    var winstonOptions = {transports: []},
        i,
        transport,
        transportOptions,

        j,
        len,
        patterns,
        pattern,
        shouldSkip,
        shouldInclude,

        logger;

    if (!options) {
        throw new Error('options is a mandatory parameter.');
    }

    if (!options.transports) {
        throw new Error('options.transports is a mandatory parameter.');
    }


    if (winston.loggers.has(name)) {
        logger = winston.loggers.get(name);
        logger.warn('tried to create this logger with the same name again.');
        return logger;
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
            transportOptions = JSON.parse(JSON.stringify(options.transports[i].options));
            // add the transport
            transportOptions.label = name;
            if (useHandleExceptions) {
                // empty on purpose
            } else {
                transportOptions.handleExceptions = false;
            }

            //console.log(name, winston.loggers.get(name));
            transport = new (winston.transports[options.transports[i].transportType])(transportOptions);
            winstonOptions.transports.push(transport);
        }
    }

    return winston.loggers.add(name, winstonOptions);
}

function createWithGmeConfig(name, gmeConfig, useHandleExceptions) {
    return createLogger(name, gmeConfig.server.log, useHandleExceptions);
}

module.exports = {
    create: createLogger,
    createWithGmeConfig: createWithGmeConfig
};