/**
 * A promise object provided by the [q]{@link https://github.com/kriskowal/q/wiki/API-Reference} promise library.
 * @example
 *  aPromise
 *      .then(function (result) {
 *          //process result
 *      })
 *      .catch(function (error) {
 *          //process error
 *      });
 * @external Promise
 */

/**
 * @description JavaScript Error class. For more information, look up the
 * [reference]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error}.
 * @typedef {object} Error
 * @prop {string} message - Message typically set in the constructor.
 * @prop {stack} stack - Detailed stack trace.
 */

/**
 * @description Javascript Object class. For more information, look up the
 * [reference]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object}.
 * @typedef {object} object
 */

/**
 * @description Javascript String class. For more information, look up the
 * [reference]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String}.
 * @typedef {string} string
 */

/**
 * @description Javascript null literal. For more information, look up the
 * [reference]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/null}.
 * @typedef {null} null
 */

/**
 * @description Javascript undefined literal. For more information, look up the
 * [reference]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/undefined}.
 * @typedef {undefined} undefined
 */

/**
 * @description Javascript Boolean class. For more information, look up the
 * [reference]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean}
 * @typedef {boolean} boolean
 */

/**
 * @description Javascript Array class. For more information, look up the
 * [reference]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array}.
 * @typedef {Array} Array
 */

/**
 * @description Javascript function class. For more information, look up the
 * [reference]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function}.
 * @typedef {function} function
 */

/**
 * @description The main configuration object of the WebGME. For detailed information about the individual
 * options, look up the [wiki]{@link https://github.com/webgme/webgme/tree/master/config/README.md} pages.
 * @typedef {object} GmeConfig
 * @prop {object} addOn - Add-on related settings.
 * @prop {object} authentication - Authentication related settings.
 * @prop {object} bin - Bin script related settings.
 * @prop {object} blob - Blob related settings.
 * @prop {object} client - Client related settings.
 * @prop {object} core - Client related settings.
 * @prop {boolean} debug - Enables debug mode.
 * @prop {object} executor - Executor related settings.
 * @prop {object} mongo - Mongo database related settings.
 * @prop {object} plugin - Plugin related settings.
 * @prop {object} requirejsPaths - Additional paths to for requirejs.
 * @prop {object} rest - REST related settings.
 * @prop {object} seedProjects - Seed related settings.
 * @prop {object} server - Server related settings.
 * @prop {object} socketIO - Socket IO related settings.
 * @prop {object} storage - Storage related settings.
 * @prop {object} visualization - Visualization related settings.
 */

/**
 * @description Describes common API for loggers on both client and server side.
 * @class GmeLogger
 */

/**
 * @description Logs debug message.
 * @function debug
 * @memberOf GmeLogger
 * @instance
 *
 * @param {string} message - The message of the log.
 */

/**
 * @description Logs info message
 * @function info
 * @memberOf GmeLogger
 * @instance
 *
 * @param {string} message - The message of the log.
 */

/**
 * @description Logs warning message
 * @function warn
 * @memberOf GmeLogger
 * @instance
 *
 * @param {string} message - The message of the log.
 */

/**
 * @description Logs error message
 * @function error
 * @memberOf GmeLogger
 * @instance
 *
 * @param {string} message - The message of the log.
 */

/**
 * @description Creates a new logger with the same settings
 * and a name that is an augmentation of this logger and the provided string. If the second argument is true -
 * the provided name will be used as is.
 * @function fork
 * @memberOf GmeLogger
 * @instance
 *
 * @param {string} name - The augmentation of the initial namespace of the logger.
 * @param {boolean} asIs - If true it will be a replacement of the original namespace.
 *
 * @return {GmeLogger} The resulting logger.
 */
