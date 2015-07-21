/*globals requireJS*/
/*jshint node:true, newcap:false*/

/**
 * @module Server:GMEAuth
 * @author ksmyth / https://github.com/ksmyth
 */

var Mongodb = require('mongodb'),
    Q = require('q'),
    bcrypt = require('bcrypt'),

    GUID = requireJS('common/util/guid'),

    STORAGE_CONSTANTS = requireJS('common/storage/constants'),

    Logger = require('../../logger');

/**
 *
 * @param session
 * @param gmeConfig
 * @returns {{authenticate: authenticate, authenticateUserById: authenticateUserById, authorize: authorizeBySession, deleteProject: deleteProject, getUserIdBySession: getUserIdBySession, getProjectAuthorizationBySession: getProjectAuthorizationBySession, getProjectAuthorizationByUserId: getProjectAuthorizationByUserId, tokenAuthorization: tokenAuthorization, generateToken: generateTokenBySession, generateTokenForUserId: generateTokenByUserId, getToken: getToken, checkToken: checkToken, tokenAuth: tokenAuth, getUserAuthInfo: getUserAuthInfo, getAllUserAuthInfo: getAllUserAuthInfo, getAllUserAuthInfoBySession: getAllUserAuthInfoBySession, authorizeByUserId: authorizeByUserId, getAuthorizationInfoByUserId: getAuthorizationInfoByUserId, unload: unload, connect: connect, _getProjectNames: _getProjectNames, addUser: addUser, updateUser: updateUser, deleteUser: deleteUser, getUser: getUser, listUsers: listUsers, addOrganization: addOrganization, getOrganization: getOrganization, listOrganizations: listOrganizations, removeOrganizationByOrgId: removeOrganizationByOrgId, addUserToOrganization: addUserToOrganization, removeUserFromOrganization: removeUserFromOrganization, authorizeOrganization: authorizeOrganization, getAuthorizationInfoByOrgId: getAuthorizationInfoByOrgId, addProject: addProject, getProject: getProject, transferProject: transferProject}}
 * @constructor
 */
function GMEAuth(session, gmeConfig) {
    'use strict';
    // TODO: make sure that gmeConfig passes all config
    var logger = Logger.create('gme:server:auth:gmeauth', gmeConfig.server.log),
        _collectionName = '_users',
        _organizationCollectionName = '_organizations',
        _projectCollectionName = '_projects',
        _session = session,
        _userField = 'username',
        _passwordField = 'password',
        _tokenExpiration = 0,
        db,
        collectionDeferred = Q.defer(),
        collection = collectionDeferred.promise,
        organizationCollectionDeferred = Q.defer(),
        organizationCollection = organizationCollectionDeferred.promise,
        projectCollectionDeferred = Q.defer(),
        projectCollection = projectCollectionDeferred.promise;
    //FIXME should be taken into use or remove it
    //blacklistUserAndOrgName = [
    //    'api',
    //    'blob',
    //    'executor'
    //];

    /**
     * 'users' collection has these fields:
     * _id: username
     * email:
     * passwordHash: bcrypt hash of password
     * canCreate: authorized to create new projects
     * tokenId: token associated with account
     * tokenCreation: time of token creation (they may be configured to expire)
     * projects: map from project name to object {read:, write:, delete: }
     * orgs: array of orgIds
     */
    /**
     * '_organizations' collection has these fields:
     * _id: username
     * projects: map from project name to object {read:, write:, delete: }
     */
    function addMongoOpsToPromize(collection_) {
        collection_.findOne = function () {
            var args = arguments;
            return collection_.then(function (c) {
                return Q.npost(c, 'findOne', args);
            });
        };
        collection_.find = function (/*query, projection*/) {
            var args = arguments;
            return collection_.then(function (c) {
                return Q.npost(c, 'find', args);
            });
        };
        collection_.update = function (/*query, update, options*/) {
            var args = arguments;
            return collection_.then(function (c) {
                return Q.npost(c, 'update', args);
            });
        };
        collection_.insert = function (/*data, options*/) {
            var args = arguments;
            return collection_.then(function (c) {
                return Q.npost(c, 'insert', args);
            });
        };
        collection_.remove = function (/*query, options*/) {
            var args = arguments;
            return collection_.then(function (c) {
                return Q.npost(c, 'remove', args)
                    .then(function (num) {
                        // depending on mongodb hasWriteCommands,
                        // remove calls back with (num) or (num, backWardsCompatibiltyResults)
                        if (Array.isArray(num)) {
                            return num[0];
                        }
                        return num;
                    });
            });
        };
    }

    addMongoOpsToPromize(collection);
    addMongoOpsToPromize(organizationCollection);
    addMongoOpsToPromize(projectCollection);


    function _getProjection(/*args*/) {
        var ret = {},
            i;
        for (i = 0; i < arguments.length; i += 1) {
            ret[arguments[i]] = 1;
        }
        return ret;
    }

    function _prepareGuestAccount(callback) {
        var guestAcc = gmeConfig.authentication.guestAccount;
        return collection.findOne({_id: guestAcc})
            .then(function (userData) {
                if (userData) {
                    logger.debug('Guest user exists');
                    return Q(null);
                } else {
                    logger.warn('User "' + guestAcc + '" was not found. ' +
                                'We will attempt to create it automatically.');

                    // TODO: maybe the canCreate can come from gmeConfig
                    return addUser(guestAcc, guestAcc, guestAcc, true, {overwrite: true});
                }
            })
            .then(function () {
                if (gmeConfig.authentication.allowGuests) {
                    logger.warn('Guest access can be disabled by setting' +
                                ' gmeConfig.authentication.allowGuests = false');
                }

                // TODO: maybe guest's project authorization can come from gmeConfig
                // TODO: check if guest user has access to the default project or not.
                // TODO: grant access to guest account for default project
                return Q(null);
            })
            .then(function () {
                return getUser(guestAcc);
            })
            .then(function (guestAccount) {
                logger.info('Guest account: ', {metadata: guestAccount});
                return Q.resolve(guestAccount);
            })
            .nodeify(callback);
    }

    /**
     *
     * @param callback
     * @returns {*}
     */
    function connect(callback) {
        var self = this;
        return Q.ninvoke(Mongodb.MongoClient, 'connect', gmeConfig.mongo.uri, gmeConfig.mongo.options)
            .then(function (db_) {
                db = db_;
                return Q.ninvoke(db, 'collection', _collectionName);
            })
            .then(function (collection_) {
                collectionDeferred.resolve(collection_);
                return _prepareGuestAccount();
            })
            .then(function () {
                return Q.ninvoke(db, 'collection', _organizationCollectionName);
            })
            .then(function (organizationCollection_) {
                organizationCollectionDeferred.resolve(organizationCollection_);
                return Q.ninvoke(db, 'collection', _projectCollectionName);
            })
            .then(function (projectCollection_) {
                projectCollectionDeferred.resolve(projectCollection_);
                return self;
            })
            .catch(function (err) {
                logger.error(err);
                collectionDeferred.reject(err);
                throw err;
            })
            .nodeify(callback);
    }

    /**
     *
     * @param callback
     * @returns {*}
     */
    function unload(callback) {
        return collection
            .finally(function () {
                return Q.ninvoke(db, 'close');
            })
            .nodeify(callback);
    }

    /**
     *
     * @param userId
     * @param password
     * @param type
     * @param returnUrlFailedLogin
     * @param req
     * @param res
     * @param next
     */
    function authenticateUserById(userId, password, type, returnUrlFailedLogin, req, res, next) {
        var query = {};
        returnUrlFailedLogin = returnUrlFailedLogin || '/';
        if (userId.indexOf('@') > 0) {
            query.email = userId;
        } else {
            query._id = userId;
        }
        collection.findOne(query)
            .then(function (userData) {
                if (!userData) {
                    return Q.reject('no such user [' + userId + ']');
                }
                if (type === 'gmail') {
                    req.session.udmId = userData._id;
                    req.session.authenticated = true;
                    next();
                } else {
                    if (password) {
                        return Q.ninvoke(bcrypt, 'compare', password, userData.passwordHash)
                            .then(function (hashRes) {
                                if (hashRes) {
                                    req.session.udmId = userData._id;
                                    req.session.authenticated = true;
                                    next();
                                } else {
                                    return Q.reject('incorrect password');
                                }
                            });
                    }
                    return Q.reject('no password given');
                }
            })
            .catch(function (err) {
                if (res.getHeader('X-WebGME-Media-Type')) {
                    // do not redirect for api requests
                    res.status(401);
                    return next(new Error(err));
                } else {
                    res.redirect(returnUrlFailedLogin);
                }
            });
    }

    /**
     *
     * @param req
     * @param res
     * @param next
     */
    function authenticate(req, res, next) {
        var userId = req.body[_userField],
            password = req.body[_passwordField],
            gmail = false,
            returnUrl = req.__gmeAuthFailUrl__ || '/',
            type;
        delete req.__gmeAuthFailUrl__;
        //gmail based authentication - no authentication just user search
        // TODO: this does not work yet.
        if (userId === null || userId === undefined) {
            userId = req.query['openid.ext1.value.email'];
            password = null;
            gmail = true;
            if (userId === null || userId === undefined) {
                res.redirect(returnUrl);
                return;
            }
        }

        type = gmail ? 'gmail' : 'gme';

        authenticateUserById(userId, password, type, returnUrl, req, res, next);
    }

    /**
     *
     * @param userId {string}
     * @param projectId {string}
     * @param type {string} 'create' or 'delete'
     * @param rights {object} {read: true, write: true, delete: true}
     * @param callback
     * @returns {*}
     */
    function authorizeByUserId(userId, projectId, type, rights, callback) {
        var update;
        if (type === 'create' || type === 'set') {
            update = {$set: {}};
            update.$set['projects.' + projectId] = rights;
            return collection.update({_id: userId}, update)
                .spread(function (numUpdated) {
                    return numUpdated === 1;
                })
                .nodeify(callback);
        } else if (type === 'delete') {
            update = {$unset: {}};
            update.$unset['projects.' + projectId] = '';
            return collection.update({_id: userId}, update)
                .spread(function (numUpdated) {
                    // FIXME this is always true. Try findAndUpdate instead
                    return numUpdated === 1;
                })
                .nodeify(callback);
        } else {
            return Q.reject('unknown type ' + type)
                .nodeify(callback);
        }
    }

    function authorizeBySession(sessionId, projectName, type, callback) {
        return Q.ninvoke(_session, 'getSessionUser', sessionId)
            .then(function (userId) {
                if (!userId) {
                    throw 'invalid session';
                }
                return authorizeByUserId(userId, projectName, type, {read: true, write: true, delete: true});
            })
            .nodeify(callback);
    }

    /**
     *
     * @param userId {string}
     * @param projectName {string}
     * @param callback
     * @returns {*}
     */
    function getAuthorizationInfoByUserId(userId, projectName, callback) {
        var projection = {};
        projection['projects.' + projectName] = 1;
        return collection.findOne({_id: userId}, projection)
            .then(function (userData) {
                return userData.projects[projectName] || {read: false, write: false, delete: false};
            })
            .nodeify(callback);
    }

    /**
     *
     * @param userId {string}
     * @param projectName {string}
     * @param callback
     * @returns {*}
     */
    function getProjectAuthorizationByUserId(userId, projectName, callback) {
        var ops = ['read', 'write', 'delete'];
        return collection.findOne({_id: userId}, _getProjection('orgs', 'projects.' + projectName))
            .then(function (userData) {
                if (!userData) {
                    return Q.reject('No such user [' + userId + ']');
                }
                userData.orgs = userData.orgs || [];
                return [userData.projects[projectName] || {},
                    Q.all(ops.map(function (op) {
                        var query;
                        if ((userData.projects[projectName] || {})[op]) {
                            return 1;
                        }
                        query = {_id: {$in: userData.orgs}};
                        query['projects.' + projectName + '.' + op] = true;
                        return organizationCollection.findOne(query, {_id: 1});
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

    /**
     *
     * @param sessionId {string}
     * @param projectName {string}
     * @param callback
     * @returns {*}
     */
    function getProjectAuthorizationBySession(sessionId, projectName, callback) {
        return Q.ninvoke(_session, 'getSessionUser', sessionId)
            .then(function (userId) {
                return getProjectAuthorizationByUserId(userId, projectName);
            })
            .nodeify(callback);
    }

    function getUserIdBySession(sessionId, callback) {
        return Q.ninvoke(_session, 'getSessionUser', sessionId)
            .nodeify(callback);
    }

    function tokenAuthorization(tokenId, projectName, callback) { //TODO currently we expect only reads via token usage
        var query = {tokenId: tokenId};
        query['projects.' + projectName + '.read'] = true;
        return collection.findOne(query)
            .then(function (userData) {
                return Q(userData ? userData.projects[projectName].read : false);
            })
            .nodeify(callback);
    }

    function generateTokenByUserId(userId, callback) {
        var token = GUID() + 'token';
        return collection.update({_id: userId}, {$set: {tokenId: token, tokenCreated: (new Date()).getDate()}})
            .spread(function () {
                return token;
            })
            .nodeify(callback);
    }

    function generateTokenBySession(sessionId, callback) {
        return Q.ninvoke(_session, 'getSessionUser', sessionId)
            .then(function (userId) {
                return generateTokenByUserId(userId, callback);
            })
            .nodeify(callback);
    }

    function getToken(sessionId, callback) {
        return Q.ninvoke(_session, 'getSessionUser', sessionId)
            .then(function (userId) {
                if (!userId) {
                    return Q(null);
                }
                return collection.findOne({_id: userId})
                    .then(function (userData) {
                        if (_tokenExpiration === 0 ||
                            (new Date()).getDate() - _tokenExpiration < userData.tokenCreated) {
                            return userData.tokenId;
                        }
                        return generateTokenBySession(sessionId);
                    });
            })
            .nodeify(callback);
    }

    function checkToken(token, callback) {
        return collection.findOne({tokenId: token})
            .then(function (userData) {
                if (!userData) {
                    return false;
                }
                return true;
            })
            .nodeify(callback);
    }

    function tokenAuth(token, callback) {
        return collection.findOne({tokenId: token})
            .then(function (userData) {
                if (!userData) {
                    return [false, null];
                }
                return [true, userData._id];
            })
            .nodeify(callback);
    }

    /**
     *
     * @param userId {string}
     * @param callback
     * @returns {*}
     */
    function getUserAuthInfo(userId, callback) {
        return collection.findOne({_id: userId})
            .then(function (userData) {
                if (!userData) {
                    return Q.reject('no such user [' + userId + ']');
                }
                return userData.projects;
            })
            .nodeify(callback);
    }

    /**
     *
     * @param userId {string}
     * @param callback
     * @returns {*}
     */
    function getAllUserAuthInfo(userId, callback) {
        logger.warn('getAllUserAuthInfo is deprecated use getUser');
        return getUser(userId, callback);
    }

    /**
     *
     * @param userId {string}
     * @param callback
     * @returns {*}
     */
    function getUser(userId, callback) {
        return collection.findOne({_id: userId})
            .then(function (userData) {
                if (!userData) {
                    return Q.reject('no such user [' + userId + ']');
                }
                delete userData.passwordHash;
                return userData;
            })
            .nodeify(callback);
    }

    /**
     *
     * @param userId {string}
     * @param callback
     * @returns {*}
     */
    function deleteUser(userId, callback) {
        return collection.remove({_id: userId})
            .nodeify(callback);
    }

    /**
     *
     * @param userId {string}
     * @param data
     * @param callback
     * @returns {*}
     */
    function updateUser(userId, data, callback) {
        return collection.findOne({_id: userId})
            .then(function (userData) {
                if (!userData) {
                    return Q.reject('no such user [' + userId + ']');
                }

                userData.email = data.email || userData.email;

                if (data.hasOwnProperty('canCreate')) {
                    userData.canCreate = data.canCreate === 'true' || data.canCreate === true;
                }
                if (data.hasOwnProperty('siteAdmin')) {
                    userData.siteAdmin = data.siteAdmin === 'true' || data.siteAdmin === true;
                }

                if (data.password) {
                    return Q.ninvoke(bcrypt, 'hash', data.password, gmeConfig.authentication.salts)
                        .then(function (hash) {
                            userData.passwordHash = hash;
                            return collection.update({_id: userId}, userData, {upsert: true});
                        });
                } else {
                    return collection.update({_id: userId}, userData, {upsert: true});
                }
            })
            .then(function () {
                return getUser(userId);
            })
            .nodeify(callback);
    }

    /**
     *
     * @param query
     * @param callback
     * @returns {*}
     */
    function listUsers(query, callback) {
        // FIXME: query can paginate, or filter users
        return collection.find({})
            .then(function (users) {
                return Q.ninvoke(users, 'toArray');
            })
            .then(function (userDataArray) {
                var i;
                for (i = 0; i < userDataArray.length; i += 1) {
                    delete userDataArray[i].passwordHash;
                }
                return userDataArray;
            })
            .nodeify(callback);
    }

    /**
     *
     * @param sessionId {string}
     * @param callback
     * @returns {*}
     */
    function getAllUserAuthInfoBySession(sessionId, callback) {
        return Q.ninvoke(_session, 'getSessionUser', sessionId)
            .then(function (userId) {
                if (!userId) {
                    throw 'invalid session';
                }
                return getAllUserAuthInfo(userId);
            })
            .nodeify(callback);
    }

    /**
     *
     * @param projectId
     * @param callback
     * @returns {*}
     */
    function deleteProject(projectId, callback) {
        var update = {$unset: {}};
        update.$unset['projects.' + projectId] = '';
        return collection.update({}, update, {multi: true})
            .then(function () {
                return organizationCollection.update({}, update, {multi: true});
            })
            .spread(function (/*numUpdated*/) {
                return projectCollection.remove({_id: projectId});
            })
            .then(function () {
                return true;
            })
            .nodeify(callback);
    }

    /**
     *
     * @param userId
     * @param email
     * @param password
     * @param canCreate
     * @param options
     * @param callback
     * @returns {*}
     */
    function addUser(userId, email, password, canCreate, options, callback) {
        // TODO: check user/orgId collision
        // FIXME: this will not update the users correctly
        var data = {
            _id: userId,
            email: email,
            canCreate: canCreate,
            projects: {},
            orgs: [],
            siteAdmin: options.siteAdmin
        };

        return Q.ninvoke(bcrypt, 'hash', password, gmeConfig.authentication.salts)
            .then(function (hash) {
                data.passwordHash = hash;
                if (!options.overwrite) {
                    return collection.insert(data);
                } else {
                    return collection.update({_id: userId}, data, {upsert: true});
                }
            })
            .nodeify(callback);
    }

    function _getProjectNames(callback) {
        return Q.ninvoke(db, 'collectionNames').nodeify(callback);
    }

    /**
     *
     * @param orgOrUserId
     * @param projectName
     * @param info
     * @param callback
     * @returns {*}
     */
    function addProject(orgOrUserId, projectName, info, callback) {
        var id = orgOrUserId + STORAGE_CONSTANTS.PROJECT_ID_SEP + projectName,
            data = {
                _id: id,
                owner: orgOrUserId,
                name: projectName,
                fullName: orgOrUserId + '/' + projectName,
                info: info || {}
            };

        return projectCollection.update({_id: id}, data, {upsert: true})
            .nodeify(callback);
    }

    /**
     *
     * @param projectId
     * @param callback
     * @returns {*}
     */
    function getProject(projectId, callback) {
        return projectCollection.findOne({_id: projectId})
            .then(function (projectData) {
                if (!projectData) {
                    return Q.reject(new Error('no such project [' + projectId + ']'));
                }
                return projectData;
            })
            .nodeify(callback);
    }

    function transferProject(orgOrUserId, projectName, newOrgOrUserId, callback) {
        callback(new Error('Not implemented yet.'));
    }

    /**
     *
     * @param orgId
     * @param callback
     * @returns {*}
     */
    function addOrganization(orgId, callback) {
        // TODO: check user/orgId collision
        return organizationCollection.insert({_id: orgId, projects: {}})
            .nodeify(callback);
    }

    /**
     *
     * @param orgId
     * @param callback
     * @returns {*}
     */
    function getOrganization(orgId, callback) {
        return organizationCollection.findOne({_id: orgId})
            .then(function (org) {
                if (!org) {
                    return Q.reject('No such organization [' + orgId + ']');
                }
                return [org, collection.find({orgs: orgId}, {_id: 1})];
            })
            .spread(function (org, users) {
                return [org, Q.ninvoke(users, 'toArray')];
            })
            .spread(function (org, users) {
                org.users = users.map(function (user) {
                    return user._id;
                });
                return org;
            })
            .nodeify(callback);
    }

    /**
     *
     * @param query
     * @param callback
     * @returns {*}
     */
    function listOrganizations(query, callback) {
        return organizationCollection.find({})
            .then(function (orgs) {
                return Q.ninvoke(orgs, 'toArray');
            })
            .then(function (organizationArray) {
                // FIXME: any data manipulations here??
                return organizationArray;
            })
            .nodeify(callback);
    }

    /**
     *
     * @param orgId
     * @param callback
     * @returns {*}
     */
    function removeOrganizationByOrgId(orgId, callback) {
        return organizationCollection.remove({_id: orgId})
            .then(function (count) {
                if (count === 0) {
                    return Q.reject('No such organization [' + orgId + ']');
                }
                return collection.update({orgs: orgId}, {$pull: {orgs: orgId}}, {multi: true});
            })
            .nodeify(callback);
    }

    /**
     *
     * @param userId
     * @param orgId
     * @param callback
     * @returns {*}
     */
    function addUserToOrganization(userId, orgId, callback) {
        return organizationCollection.findOne({_id: orgId})
            .then(function (org) {
                if (!org) {
                    return Q.reject('No such organization [' + orgId + ']');
                }
            })
            .then(function () {
                return collection.update({_id: userId}, {$addToSet: {orgs: orgId}})
                    .spread(function (count) {
                        if (count === 0) {
                            return Q.reject('No such user [' + userId + ']');
                        }
                    });
            })
            .nodeify(callback);
    }

    /**
     *
     * @param userId
     * @param orgId
     * @param callback
     * @returns {*}
     */
    function removeUserFromOrganization(userId, orgId, callback) {
        return organizationCollection.findOne({_id: orgId})
            .then(function (org) {
                if (!org) {
                    return Q.reject('No such organization [' + orgId + ']');
                }
            })
            .then(function () {
                collection.update({_id: userId}, {orgs: {$pull: orgId}});
            })
            .nodeify(callback);
    }

    /**
     *
     * @param orgId
     * @param projectName
     * @param type {string} 'create' 'delete' or 'read'
     * @param rights {object} {read: true, write: true, delete: true}
     * @param callback
     * @returns {*}
     */
    function authorizeOrganization(orgId, projectName, type, rights, callback) {
        var update;
        if (type === 'create' || type === 'set') {
            update = {$set: {}};
            update.$set['projects.' + projectName] = rights;
            return organizationCollection.update({_id: orgId}, update)
                .spread(function (numUpdated) {
                    if (numUpdated !== 1) {
                        return Q.reject('No such organization [' + orgId + ']');
                    }
                    return numUpdated === 1;
                })
                .nodeify(callback);
        } else if (type === 'delete') {
            update = {$unset: {}};
            update.$unset['projects.' + projectName] = '';
            return organizationCollection.update({_id: orgId}, update)
                .spread(function (numUpdated) {
                    // FIXME this is always true. Try findAndUpdate instead
                    return numUpdated === 1;
                })
                .nodeify(callback);
        } else {
            return Q.reject('invalid type ' + type)
                .nodeify(callback);
        }
    }

    /**
     *
     * @param orgId
     * @param projectName
     * @param callback
     * @returns {*}
     */
    function getAuthorizationInfoByOrgId(orgId, projectName, callback) {
        var projection = {};
        projection['projects.' + projectName] = 1;
        return organizationCollection.findOne({_id: orgId}, projection)
            .then(function (orgData) {
                if (!orgData) {
                    return Q.reject('No such organization [' + orgId + ']');
                }
                return orgData.projects[projectName] || {};
            })
            .nodeify(callback);
    }


    return {
        authenticate: authenticate,
        authenticateUserById: authenticateUserById,
        authorize: authorizeBySession,
        deleteProject: deleteProject,
        getUserIdBySession: getUserIdBySession,
        getProjectAuthorizationBySession: getProjectAuthorizationBySession,
        getProjectAuthorizationByUserId: getProjectAuthorizationByUserId,
        tokenAuthorization: tokenAuthorization,
        generateToken: generateTokenBySession,
        generateTokenForUserId: generateTokenByUserId,
        getToken: getToken,
        checkToken: checkToken,
        tokenAuth: tokenAuth,
        getUserAuthInfo: getUserAuthInfo,
        getAllUserAuthInfo: getAllUserAuthInfo,
        getAllUserAuthInfoBySession: getAllUserAuthInfoBySession,
        authorizeByUserId: authorizeByUserId,
        getAuthorizationInfoByUserId: getAuthorizationInfoByUserId,
        unload: unload,
        connect: connect,
        _getProjectNames: _getProjectNames,

        // user managerment functions
        addUser: addUser,
        updateUser: updateUser,
        deleteUser: deleteUser,
        getUser: getUser,
        listUsers: listUsers,

        addOrganization: addOrganization,
        getOrganization: getOrganization,
        listOrganizations: listOrganizations,

        removeOrganizationByOrgId: removeOrganizationByOrgId,
        addUserToOrganization: addUserToOrganization,
        removeUserFromOrganization: removeUserFromOrganization,
        authorizeOrganization: authorizeOrganization,
        getAuthorizationInfoByOrgId: getAuthorizationInfoByOrgId,

        addProject: addProject,
        getProject: getProject,
        transferProject: transferProject
    };
}

module.exports = GMEAuth;
