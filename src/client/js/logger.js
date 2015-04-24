/*globals define, debug*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['debug'], function (_debug) {
    'use strict';
    // Separate namespaces using ',' a leading '-' will disable the namespace.
    // Each part takes a regex.
    //      ex: localStorage.debug = '*,-socket\.io*,-engine\.io*'
    //      will log all but socket.io and engine.io
    function createLogger(name, options) {
        var log = typeof debug === 'undefined' ? _debug(name) : debug(name),
            level,
            levels = {
                silly: 0,
                input: 1,
                verbose: 2,
                prompt: 3,
                debug: 4,
                info: 5,
                data: 6,
                help: 7,
                warn: 8,
                error: 9
            };
        if (!options) {
            throw new Error('options required in logger');
        }
        if (options.hasOwnProperty('level') === false) {
            throw new Error('options.level required in logger');
        }
        level = levels[options.level];
        if (typeof level === 'undefined') {
            level = levels.info;
        }

        log.debug = function () {
            if (log.enabled && level <= levels.debug) {
                if (console.debug) {
                    log.log = console.debug.bind(console);
                } else {
                    log.log = console.log.bind(console);
                }
                log.apply(this, arguments);
            }
        };
        log.info = function () {
            if (log.enabled && level <= levels.info) {
                log.log = console.info.bind(console);
                log.apply(this, arguments);
            }
        };
        log.warn = function () {
            if (log.enabled && level <= levels.warn) {
                log.log = console.warn.bind(console);
                log.apply(this, arguments);
            }
        };
        log.error = function () {
            if (log.enabled && level <= levels.error) {
                log.log = console.error.bind(console);
                log.apply(this, arguments);
            } else {
                console.error.apply(console, arguments);
            }
        };

        log.fork = function (forkName, useForkName) {
            forkName = useForkName ? forkName : name + ':' + forkName;
            return createLogger(forkName, options);
        };

        log.forkWithOptions = function (_name, _options) {
            return createLogger(_name, _options);
        };

        return log;
    }

    function createWithGmeConfig(name, gmeConfig) {
        return createLogger(name, gmeConfig.client.log);
    }

    return {
        create: createLogger,
        createWithGmeConfig: createWithGmeConfig
    };
});