/*globals*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var AuthorizerBase = require('./authorizerbase'),
    Q = require('q');

function DefaultAuthorizer(params, mainLogger, gmeConfig) {
    var self = this;

    AuthorizerBase.call(self, params, mainLogger, gmeConfig);

    function getProjectAuthorizationByUserId(userId, projectId, callback) {
        var ops = ['read', 'write', 'delete'];
        return collection.findOne({_id: userId}, _getProjection('orgs', 'projects.' + projectId))
            .then(function (userData) {
                if (!userData) {
                    return Q.reject(new Error('No such user [' + userId + ']'));
                }
                userData.orgs = userData.orgs || [];
                return [userData.projects[projectId] || {},
                    Q.all(ops.map(function (op) {
                        var query;
                        if ((userData.projects[projectId] || {})[op]) {
                            return 1;
                        }
                        query = {_id: {$in: userData.orgs}};
                        query['projects.' + projectId + '.' + op] = true;
                        return collection.findOne(query, {_id: 1});
                    }))];
            }).spread(function (user, rwd) {
                var ret = {};
                ops.forEach(function (op, i) {
                    ret[op] = (user[op] || rwd[i]) ? true : false;
                });
                return ret;
            })
            .nodeify(callback);
    }

    function projectDeleted(projectId, callback) {
        var update = {$unset: {}};
        update.$unset['projects.' + projectId] = '';
        return collection.update({}, update, {multi: true})
            .nodeify(callback);
    }

    /**
     *
     * @param userId {string}
     * @param callback
     * @returns {*}
     */
    function getUser(userId, callback) {
        return collection.findOne({_id: userId, type: {$ne: CONSTANTS.ORGANIZATION}})
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
        return collection.findOne({_id: orgId, type: CONSTANTS.ORGANIZATION}, {admins: 1})
            .then(function (org) {
                if (!org) {
                    return Q.reject(new Error('No such organization [' + orgId + ']'));
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
            return collection.update({_id: userOrOrgId}, update)
                .spread(function (numUpdated) {
                    if (numUpdated !== 1) {
                        return Q.reject(new Error('No such user or org [' + userOrOrgId + ']'));
                    }
                })
                .nodeify(callback);
        } else if (type === 'delete') {
            update = {$unset: {}};
            update.$unset['projects.' + projectId] = '';
            return collection.update({_id: userOrOrgId}, update)
                .spread(function (numUpdated) {
                    // FIXME this is always true. Try findAndUpdate instead
                    return numUpdated === 1;
                })
                .nodeify(callback);
        } else {
            return Q.reject(new Error('unknown type ' + type))
                .nodeify(callback);
        }
    }

    /**
     * 
     * @param userId
     * @param entityId
     * @param params
     * @param callback
     */
    this.getAccessRights = function (userId, entityId, params, callback) {
        if (params.entityType === self.ENTITY_TYPES.PROJECT) {
            return getProjectAuthorizationByUserId(userId, entityId)
                .nodeify(callback);
        } else if (params.entityType === self.ENTITY_TYPES.USER) {
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
                        return self.gmeAuth.getAdminsInOrganization(entityId)
                            .then(function (admins) {
                                if (admins.indexOf(userId) > -1) {
                                    rights.write = true;

                                    return rights;
                                } else {
                                    throw new Error('Not authorized to create project in organization ' + entityId);
                                }
                            });
                    }
                });
        }
    };

    this.setAccessRights = function (userId, entityId, rights, params, callback) {
        var revoke = rights.read === false && rights.write === false && rights.delete === false,
            promise;
        if (params.entityType === self.ENTITY_TYPES.PROJECT) {
            if (userId === true) {
                promise = projectDeleted(entityId);
            } else if (revoke) {
                promise = authorizeByUserOrOrgId(userId, entityId, 'delete');
            } else {
                promise = authorizeByUserOrOrgId(userId, entityId, 'set', rights);
            }
        } else {

        }

        return promise.nodeify(callback);
    };
}

AuthorizerBase.prototype = Object.create(AuthorizerBase.prototype);
AuthorizerBase.prototype.constructor = DefaultAuthorizer;

module.exports = DefaultAuthorizer;