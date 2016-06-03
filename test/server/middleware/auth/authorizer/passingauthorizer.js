/*globals*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Q = require('q'),
    AuthorizerBase = require('../../../../../src/server/middleware/auth/defaultauthorizer');


/**
 * Simple test class for AuthorizerBase. This implementation simply return full access for each call.
 * @param {GmeLogger} mainLogger
 * @param {GmeConfig} gmeConfig
 * @constructor
 */
function PassingAuthorizer(mainLogger, gmeConfig) {

    AuthorizerBase.call(this, mainLogger, gmeConfig);

    this.getAccessRights = function (userId, entityId, params, callback) {
        var deferred = Q.defer();
        deferred.resolve({
            read: true,
            write: true,
            delete: true
        });
        return deferred.promise.nodeify(callback);
    }
}

PassingAuthorizer.prototype = Object.create(AuthorizerBase.prototype);
PassingAuthorizer.constructor = PassingAuthorizer;

module.exports = PassingAuthorizer;