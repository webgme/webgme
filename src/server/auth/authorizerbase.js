/*globals*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var Q = require('q'),
    ACCESS_TYPES = {
        PROJECT_ACCESS: 'PROJECT',
        USER: 'USER'
};

function AuthorizerBase() {

    this.ACCESS_TYPES = ACCESS_TYPES;

    /**
     *
     * @param {string} userId
     * @param {string} entityId
     * @param {ACCESS_TYPE} entityType
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise}  On success the promise will be resolved with
     * Object.<string, {@link module:Storage~CommitHash}> <b>result</b>.<br>
     * On error the promise will be rejected with {@link Error} <b>error</b>.
     */
    this.getAccessRights = function(userId, entityId, entityType, callback) {
        var deferred = Q.defer();
        deferred.reject(new Error('Not Implemented!'));
        return deferred.promise;
    };
}

module.exports AuthorizerBase;