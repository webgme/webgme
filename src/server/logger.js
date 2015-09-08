/*jshint node:true*/
/**
 * example usage
 * create('moduleName', gmeConfig.server.log);
 *
 * Log debug messages to the console
 * Notes:
 *  - it overwrites only the winston console transport log level to info
 *  - debug patterns are not applied to any additional transports file or database
 *  - logger.debug() logs to all transports except the console and uses the 'debug' library instead of console transport
 *  - all other transports and log levels are logged according to the configuration
 *
 * *nix
 * $ DEBUG=gme:*:worker* npm start
 * Windows
 * > set DEBUG=gme:*:worker* & npm start
 *
 * @module Server:Logger
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var winston = require('winston'),
    d = require('debug'),

    Logger,

    mainLogger,
    logger,
    loggers = {},

    debugPatterns = process.env.DEBUG ? process.env.DEBUG.split(',') : null,
    globalPatterns = ['*']; // log everything by default

function generateName() {
    return Math.random().toString(36).slice(2, 15);
}

function isEnabled(name, patterns) {
    var len = patterns.length,
        shouldSkip = false,
        shouldInclude = false,
        pattern,
        j;

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

    return shouldInclude && shouldSkip === false;
}

function createLogger(name, options) {
    var winstonOptions = {transports: []},
        transport,
        i,

        newLogger,

        debugPatterns;

    if (!mainLogger) {
        if (!options) {
            throw new Error('options is a mandatory parameter.');
        }

        if (!options.transports) {
            throw new Error('options.transports is a mandatory parameter.');
        }

        globalPatterns = options.patterns || globalPatterns;

        // FIXME: transport specific patterns
        for (i = 0; i < options.transports.length; i += 1) {
            transport = new (winston.transports[options.transports[i].transportType])(options.transports[i].options);
            if (debugPatterns && options.transports[i].transportType.toLocaleLowerCase() === 'console') {
                transport.level = 'info';
            }
            winstonOptions.transports.push(transport);
        }

        // create a single logger if it does not exist
        mainLogger = winston.loggers.add('gme', winstonOptions);
        logger = createLogger('gme:logger');
    }

    if (loggers.hasOwnProperty(name)) {
        return loggers[name];
    }

    newLogger = new Logger(name);
    newLogger.enable(isEnabled(name, globalPatterns));
    loggers[name] = newLogger;

    if (logger) {
        logger.debug('Created new logger ' + name);
    }

    return newLogger;
}

function createWithGmeConfig(name, gmeConfig, useHandleExceptions) {
    return createLogger(name, gmeConfig.server.log, useHandleExceptions);
}


Logger = function (name) {
    this.name = name || generateName();
    this.enabled = true;

    if (debugPatterns) {
        this.d = d(this.name);
    }
};

Logger.prototype.debug = function () {
    var args;
    if (this.enabled) {
        args = this._addNameToLogMessage.apply(this, arguments);
        mainLogger.debug.apply(this, args);
    }

    if (debugPatterns) {
        this.d.apply(this, arguments);
    }
};

Logger.prototype.info = function () {
    var args;
    if (this.enabled) {
        args = this._addNameToLogMessage.apply(this, arguments);
        mainLogger.info.apply(this, args);
    }
};

Logger.prototype.log = function () {
    throw new Error('Call debug, info, warn or error functions.');
};

Logger.prototype.warn = function () {
    var args;
    if (this.enabled) {
        args = this._addNameToLogMessage.apply(this, arguments);
        mainLogger.warn.apply(this, args);
    }
};

Logger.prototype.error = function () {
    var args;
    if (this.enabled) {
        args = this._addNameToLogMessage.apply(this, arguments);
        mainLogger.error.apply(this, args);
    }
};

Logger.prototype.enable = function (enable) {
    this.enabled = enable === true;
};

Logger.prototype.fork = function (forkName, useForkName) {
    forkName = useForkName ? forkName : this.name + ':' + forkName;
    return createLogger(forkName);
};

// TODO: add close function

Logger.prototype._addNameToLogMessage = function () {
    if (arguments[0]) {
        arguments[0] = '[' + this.name + '] ' + arguments[0];
    } else {
        arguments[0] = '[' + this.name + ']';
    }
    return arguments;
};


module.exports = {
    create: createLogger,
    createWithGmeConfig: createWithGmeConfig
};