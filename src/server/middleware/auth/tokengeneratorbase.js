/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var Q = require('q');

/**
 *
 * @param {GmeLogger} mainLogger
 * @param {GmeConfig} gmeConfig
 * @param {JsonWebTokenModule} jwt - this is passed in here by webgme in order to keep the versions in sync.
 * @constructor
 */
function TokenGeneratorBase(mainLogger, gmeConfig, jwt) {

    this.jwt = jwt;

    this.jwtOptions = {
        algorithm: gmeConfig.authentication.jwt.algorithm,
        expiresIn: gmeConfig.authentication.jwt.expiresIn
    };

    /**
     * @type {GmeConfig}
     */
    this.logger = mainLogger.fork('TokenGenerator');

    /**
     * @type {GmeLogger}
     */
    this.gmeConfig = gmeConfig;
}


/**
 *
 * @param {object} params
 * @param {function} [callback] - if provided no promise will be returned.
 *
 * @return {external:Promise}  On success the promise will be resolved.
 * On error the promise will be rejected with {@link Error} <b>error</b>.
 */
TokenGeneratorBase.prototype.start = function (params, callback) {
    var deferred = Q.defer();
    deferred.resolve();
    return deferred.promise.nodeify(callback);
};

/**
 *
 * @param {function} [callback] - if provided no promise will be returned.
 *
 * @return {external:Promise}  On success the promise will be resolved.
 * On error the promise will be rejected with {@link Error} <b>error</b>.
 */
TokenGeneratorBase.prototype.stop = function (callback) {
    var deferred = Q.defer();
    deferred.resolve();
    return deferred.promise.nodeify(callback);
};

TokenGeneratorBase.prototype.getToken = function (userId, callback) {
    var deferred = Q.defer();
    deferred.reject(new Error('TokenGeneratorBase.getToken is not implemented!'));
    return deferred.promise.nodeify(callback);
};



module.exports = TokenGeneratorBase;