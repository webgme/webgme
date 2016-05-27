/*globals*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Q = require('q'),
    ENTITY_TYPES = {
        PROJECT: 'PROJECT',
        OWNER: 'OWNER'
    };

function AuthorizerBase(params, mainLogger, gmeConfig) {

    /**
     * @type {{PROJECT: string, OWNER: string}}
     */
    this.ENTITY_TYPES = ENTITY_TYPES;

    this.params = params;

    /**
     * @type {GmeConfig}
     */
    this.logger = mainLogger.fork('AuthorizerBase');

    /**
     * @type {GmeLogger}
     */
    this.gmeConfig = gmeConfig;
}

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
    return deferred.promise;
};

/**
 *
 * @param {string} userId
 * @param {string} entityId
 * @param {object} rights
 * @param {object} params
 * @param {ACCESS_TYPE} params.accessType - PROJECT_ACCESS OR OWNERSHIP
 * @param {function} [callback] - if provided no promise will be returned.
 *
 * @return {external:Promise}  On success the promise will be resolved with
 * Object.<string, {@link module:Storage~CommitHash}> <b>result</b>.<br>
 * On error the promise will be rejected with {@link Error} <b>error</b>.
 */
AuthorizerBase.prototype.setAccessRights = function (userId, entityId, rights, params, callback) {
    var deferred = Q.defer();
    deferred.resolve();
    return deferred.promise;
};

module.exports = AuthorizerBase;