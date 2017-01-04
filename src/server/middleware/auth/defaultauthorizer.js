/*globals*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var AuthorizerBase = require('./authorizerbase'),
    GME_AUTH_CONSTANTS = require('./constants'),
    Q = require('q');

function DefaultAuthorizer(mainLogger, gmeConfig) {
    var self = this;

    self.collection = null;

    AuthorizerBase.call(self, mainLogger, gmeConfig);

    function _getProjection(/*args*/) {
        var ret = {},
            i;
        for (i = 0; i < arguments.length; i += 1) {
            ret[arguments[i]] = 1;
        }
        return ret;
    }

    function getProjectAuthorizationByUserOrOrgId(userId, projectId, callback) {
        var ops = ['read', 'write', 'delete'];
        return self.collection.findOne({
            _id: userId,
            disabled: {$ne: true}
        }, _getProjection('siteAdmin', 'orgs', 'projects.' + projectId))
            .then(function (userData) {
                if (!userData) {
                    return Q.reject(new Error('no such user [' + userId + ']'));
                }
                userData.orgs = userData.orgs || [];

                if (userData.siteAdmin) {
                    return [{}, [true, true, true]];
                } else {
                    return [userData.projects[projectId] || {},
                        Q.all(ops.map(function (op) {
                            var query;
                            if ((userData.projects[projectId] || {})[op]) {
                                return 1;
                            }
                            query = {_id: {$in: userData.orgs}, disabled: {$ne: true}};
                            query['projects.' + projectId + '.' + op] = true;
                            return self.collection.findOne(query, {_id: 1});
                        }))];
                }
            }).spread(function (user, rwd) {
                var ret = {};
                ops.forEach(function (op, i) {
                    ret[op] = (user[op] || rwd[i]) ? true : false;
                });
                return ret;
            })
            .nodeify(callback);
    }

    function removeProjectRightsForAll(projectId, callback) {
        var update = {$unset: {}};
        update.$unset['projects.' + projectId] = '';
        return self.collection.updateMany({}, update)
            .nodeify(callback);
    }

    /**
     *
     * @param userId {string}
     * @param callback
     * @returns {*}
     */
    function getUser(userId, callback) {
        return self.collection.findOne({
            _id: userId,
            type: {$ne: GME_AUTH_CONSTANTS.ORGANIZATION},
            disabled: {$ne: true}
        })
            .then(function (userData) {
                if (!userData) {
                    return Q.reject(new Error('no such user [' + userId + ']'));
                }

                delete userData.passwordHash;
                userData.data = userData.data || {};
                userData.settings = userData.settings || {};

                return userData;
            })
            .nodeify(callback);
    }

    function getAdminsInOrganization(orgId, callback) {
        return self.collection.findOne({_id: orgId, type: GME_AUTH_CONSTANTS.ORGANIZATION, disabled: {$ne: true}},
            {admins: 1})
            .then(function (org) {
                if (!org) {
                    return Q.reject(new Error('no such organization [' + orgId + ']'));
                }
                return org.admins;
            })
            .nodeify(callback);
    }

    /**
     *
     * @param userOrOrgId {string}
     * @param projectId {string}
     * @param type {string} 'set', 'delete'
     * @param rights {object} {read: true, write: true, delete: true}
     * @param callback
     * @returns {*}
     */
    function authorizeByUserOrOrgId(userOrOrgId, projectId, type, rights, callback) {
        var update;

        if (type === 'set') {
            update = {$set: {}};
            update.$set['projects.' + projectId] = rights;
        } else if (type === 'delete') {
            update = {$unset: {}};
            update.$unset['projects.' + projectId] = '';
        } else {
            return Q.reject(new Error('unknown type ' + type))
                .nodeify(callback);
        }

        return self.collection.updateOne({_id: userOrOrgId, disabled: {$ne: true}}, update)
            .then(function (result) {
                if (result.matchedCount !== 1) {
                    return Q.reject(new Error('no such user or org [' + userOrOrgId + ']'));
                }
            })
            .nodeify(callback);
    }

    this.getAccessRights = function (userId, entityId, params, callback) {
        if (params.entityType === AuthorizerBase.ENTITY_TYPES.PROJECT) {
            return getProjectAuthorizationByUserOrOrgId(userId, entityId)
                .nodeify(callback);
        } else if (params.entityType === AuthorizerBase.ENTITY_TYPES.USER) {
            return getUser(userId)
                .then(function (user) {
                    var rights = {
                        read: true,
                        write: false,
                        delete: false
                    };

                    if (user.siteAdmin) {
                        rights.write = true;
                        rights.delete = true;
                        return rights;
                    } else if (!user.canCreate) {
                        return rights;
                    } else if (userId === entityId) {
                        rights.write = true;
                        return rights;
                    } else {
                        return getAdminsInOrganization(entityId)
                            .then(function (admins) {
                                if (admins.indexOf(userId) > -1) {
                                    rights.write = true;
                                }

                                return rights;
                            });
                    }
                })
                .nodeify(callback);
        }
    };

    this.setAccessRights = function (userId, entityId, rights, params, callback) {
        var revoke = rights.read === false && rights.write === false && rights.delete === false,
            promise;
        if (params.entityType === AuthorizerBase.ENTITY_TYPES.PROJECT) {
            if (userId === true) {
                promise = removeProjectRightsForAll(entityId);
            } else if (revoke) {
                promise = authorizeByUserOrOrgId(userId, entityId, 'delete');
            } else {
                promise = authorizeByUserOrOrgId(userId, entityId, 'set', rights);
            }
        } else {
            throw new Error('Only ENTITY_TYPES.PROJECT allowed when setting access rights!');
        }

        return promise.nodeify(callback);
    };

    this.start = function (params, callback) {
        var deferred = Q.defer();

        self.collection = params.collection;

        deferred.resolve();

        return deferred.promise.nodeify(callback);
    };
}

DefaultAuthorizer.prototype = Object.create(AuthorizerBase.prototype);
DefaultAuthorizer.prototype.constructor = DefaultAuthorizer;

module.exports = DefaultAuthorizer;