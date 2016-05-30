/*globals*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Q = require('q'),
    ENTITY_TYPES = {
        PROJECT: 'PROJECT',
        USER: 'USER'
    };

function AuthorizerBase(mainLogger, gmeConfig) {

    /**
     * @type {{PROJECT: string, OWNER: string}}
     */
    this.ENTITY_TYPES = ENTITY_TYPES;

    /**
     * @type {GmeConfig}
     */
    this.logger = mainLogger.fork('AuthorizerBase');

    /**
     * @type {GmeLogger}
     */
    this.gmeConfig = gmeConfig;
}

AuthorizerBase.prototype.start = function (params, callback) {
    var deferred = Q.defer();
    deferred.resolve();
    return deferred.promise.nodeify(callback);
};

AuthorizerBase.prototype.stop = function (callback) {
    var deferred = Q.defer();
    deferred.resolve();
    return deferred.promise.nodeify(callback);
};

/**
 *
 * @param {string} userId
 * @param {string} entityId
 * @param {object} params
 * @param {ENTITY_TYPE} params.entityType - PROJECT
 * @param {function} [callback] - if provided no promise will be returned.
 *
 * @return {external:Promise}  On success the promise will be resolved with
 * Object.<string, {@link module:Storage~CommitHash}> <b>result</b>.<br>
 * On error the promise will be rejected with {@link Error} <b>error</b>.
 */
AuthorizerBase.prototype.getAccessRights = function (userId, entityId, params, callback) {
    var deferred = Q.defer();
    deferred.reject(new Error('Not Implemented!'));
    return deferred.promise.nodeify(callback);
};

/**
 *
 * @param {string} userId
 * @param {string} entityId
 * @param {object} rights
 * @param {object} params
 * @param {ENTITY_TYPE} params.entityType - PROJECT_ACCESS, USER
 * @param {function} [callback] - if provided no promise will be returned.
 *
 * @return {external:Promise}  On success the promise will be resolved with
 * Object.<string, {@link module:Storage~CommitHash}> <b>result</b>.<br>
 * On error the promise will be rejected with {@link Error} <b>error</b>.
 */
AuthorizerBase.prototype.setAccessRights = function (userId, entityId, rights, params, callback) {
    var deferred = Q.defer();
    deferred.resolve();
    return deferred.promise.nodeify(callback);
};

module.exports = AuthorizerBase;