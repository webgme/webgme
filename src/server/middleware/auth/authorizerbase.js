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

/**
 * @typedef {object} AccessRights
 * @prop {boolean} read
 * @prop {boolean} write
 * @prop {boolean} delete
 *
 * @example
 * {
 *   read: true,
 *   write: true,
 *   delete: false
 * }
 */


/**
 *
 * @param {GmeLogger} mainLogger
 * @param {GmeConfig} gmeConfig
 * @constructor
 */
function AuthorizerBase(mainLogger, gmeConfig) {

    /**
     * @type {{PROJECT: string, USER: string}}
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

/**
 * @type {{PROJECT: string, USER: string}}
 */
AuthorizerBase.ENTITY_TYPES = ENTITY_TYPES;

/**
 *
 * @param {object} params
 * @param {object} params.collection - Mongo collection to default database.
 * @param {function} [callback] - if provided no promise will be returned.
 *
 * @return {external:Promise}  On success the promise will be resolved.
 * On error the promise will be rejected with {@link Error} <b>error</b>.
 */
AuthorizerBase.prototype.start = function (params, callback) {
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
AuthorizerBase.prototype.stop = function (callback) {
    var deferred = Q.defer();
    deferred.resolve();
    return deferred.promise.nodeify(callback);
};

/**
 * Returns the access rights userId has for entityId.
 * @param {string} userId
 * @param {string} entityId
 * @param {object} params
 * @param {AuthorizerBase.ENTITY_TYPES} params.entityType - PROJECT, USER
 * @param {function} [callback] - if provided no promise will be returned.
 *
 * @return {external:Promise}  On success the promise will be resolved with
 * AccessRights > <b>result</b>.<br>
 * On error the promise will be rejected with {@link Error} <b>error</b>.
 */
AuthorizerBase.prototype.getAccessRights = function (userId, entityId, params, callback) {
    var deferred = Q.defer();
    deferred.reject(new Error('Not Implemented!'));
    return deferred.promise.nodeify(callback);
};

/**
 * [Optionally sets the access rights for userId on entityId.]
 * @param {string} userId
 * @param {string} entityId
 * @param {object} rights
 * @param {object} params
 * @param {AuthorizerBase.ENTITY_TYPES} params.entityType - PROJECT_ACCESS, USER
 * @param {function} [callback] - if provided no promise will be returned.
 *
 * @return {external:Promise}  On success the promise will be resolved.
 * On error the promise will be rejected with {@link Error} <b>error</b>.
 */
AuthorizerBase.prototype.setAccessRights = function (userId, entityId, rights, params, callback) {
    var deferred = Q.defer();
    deferred.resolve();
    return deferred.promise.nodeify(callback);
};

module.exports = AuthorizerBase;