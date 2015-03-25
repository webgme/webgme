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
        transport;

    if (!options) {
        throw new Error('options is a mandatory parameter.');
    }

    if (!options.transports) {
        throw new Error('options.transports is a mandatory parameter.');
    }

    for (i = 0; i < options.transports.length; i += 1) {
        options.transports[i].options.label = name;
        transport = new (winston.transports[options.transports[i].transportType])(options.transports[i].options);
        winstonOptions.transports.push(transport);
    }

    return winston.loggers.add(name, winstonOptions);
}

module.exports = {
    create: createLogger
}