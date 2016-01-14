/**
 * A promise object provided by the q promise library.
 * @example
 *  aPromise
 *      .then(function (result) {
 *          //process result
 *      })
 *      .catch(function (error) {
 *          //process error
 *      });
 * @external Promise
 * @see {@link https://github.com/kriskowal/q/wiki/API-Reference}
 */

/**
 * JavaScript Error class.
 * @typedef {object} Error
 * @prop {string} message - Message typically set in the constructor.
 * @prop {stack} stack - Detailed stack trace.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error}
 */

/**
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
 * @see {@link https://github.com/webgme/webgme/tree/master/config/README.md}
 */

/**
 * @typedef {object} GmeLogger
 * Describes common API for loggers on both client and server side.
 * @prop {function} debug - Logs debug message.
 * @prop {function} info - Logs info message.
 * @prop {function} warn - Logs warn message.
 * @prop {function} error - Logs error message.
 * @prop {function(string, boolean)} fork - Creates a new logger with the same settings
 * and a name that is an augmentation of this logger and the provided string. If the second argument is true -
 * the provided name will be used as is.
 */
