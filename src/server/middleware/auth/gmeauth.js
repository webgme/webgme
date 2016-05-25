/*globals requireJS*/
/*jshint node:true, newcap:false*/

/**
 * @module Server:GMEAuth
 * @author ksmyth / https://github.com/ksmyth
 */

var Mongodb = require('mongodb'),
    Q = require('q'),
    fs = require('fs'),
    //bcrypt = require('bcrypt'), include bcrypt and uncomment this line for faster encryption/decryption.
    bcrypt = require('bcryptjs'),
    jwt = require('jsonwebtoken'),

    storageUtil = requireJS('common/storage/util'),
    UTIL = requireJS('common/util/util'),

    Logger = require('../../logger'),

    CONSTANTS = {
        USER: 'User',
        ORGANIZATION: 'Organization'
    };

/**
 *
 * @param session
 * @param gmeConfig
 * @returns {{deleteProject: deleteProject, getProjectAuthorizationByUserId: getProjectAuthorizationByUserId, getProjectAuthorizationListByUserId: getProjectAuthorizationListByUserId, getUserAuthInfo: getUserAuthInfo, getAllUserAuthInfo: getAllUserAuthInfo, authorizeByUserId: authorizeByUserId, getAuthorizationInfoByUserId: getAuthorizationInfoByUserId, unload: unload, connect: connect, _getProjectNames: _getProjectNames, addUser: addUser, updateUser: updateUser, updateUserDataField: updateUserDataField, updateUserSettings: updateUserSettings, updateUserComponentSettings: updateUserComponentSettings, deleteUser: deleteUser, getUser: getUser, listUsers: listUsers, addOrganization: addOrganization, getOrganization: getOrganization, listOrganizations: listOrganizations, getUserOrOrg: getUserOrOrg, authorizeByUserOrOrgId: authorizeByUserOrOrgId, removeOrganizationByOrgId: removeOrganizationByOrgId, addUserToOrganization: addUserToOrganization, removeUserFromOrganization: removeUserFromOrganization, authorizeOrganization: authorizeOrganization, getAuthorizationInfoByOrgId: getAuthorizationInfoByOrgId, setAdminForUserInOrganization: setAdminForUserInOrganization, getAdminsInOrganization: getAdminsInOrganization, addProject: addProject, getProject: getProject, transferProject: transferProject, updateProjectInfo: updateProjectInfo, generateJWToken: generateJWToken, verifyJWToken: verifyJWToken, CONSTANTS: {USER: string, ORGANIZATION: string}}}
 * @constructor
 */
function GMEAuth(session, gmeConfig) {
    'use strict';
    // TODO: make sure that gmeConfig passes all config
    var logger = Logger.create('gme:server:auth:gmeauth', gmeConfig.server.log),
        _collectionName = '_users',
        _projectCollectionName = '_projects',
        db,
        collectionDeferred = Q.defer(),
        collection = collectionDeferred.promise,
        projectCollectionDeferred = Q.defer(),
        projectCollection = projectCollectionDeferred.promise,

        // JWT Keys
        PRIVATE_KEY,
        PUBLIC_KEY,
        jwtOptions = {
            algorithm: 'RS256',
            expiresIn: gmeConfig.authentication.jwt.expiresIn
        };

    if (gmeConfig.authentication.enable === true) {
        PRIVATE_KEY = fs.readFileSync(gmeConfig.authentication.jwt.privateKey, 'utf8');
        PUBLIC_KEY = fs.readFileSync(gmeConfig.authentication.jwt.publicKey, 'utf8');
    }

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
    //addMongoOpsToPromize(organizationCollection);
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
                logger.info('Guest account "' + guestAccount._id + '" canCreate:', guestAccount.canCreate === true);
                logger.debug('Guest account full-data: ', {metadata: guestAccount});
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
        logger.info('connecting', gmeConfig.mongo.uri, JSON.stringify(gmeConfig.mongo.options));
        return Q.ninvoke(Mongodb.MongoClient, 'connect', gmeConfig.mongo.uri, gmeConfig.mongo.options)
            .then(function (db_) {
                db = db_;
                return Q.ninvoke(db, 'collection', _collectionName);
            })
            .then(function (collection_) {
                collectionDeferred.resolve(collection_);
                return Q.ninvoke(db, 'collection', _projectCollectionName);
            })
            .then(function (projectCollection_) {
                projectCollectionDeferred.resolve(projectCollection_);
                return _prepareGuestAccount();
            })
            .then(function () {
                return db;
            })
            .catch(function (err) {
                logger.error(err);
                collectionDeferred.reject(err);
                projectCollectionDeferred.reject(err);
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
        return Q.all([collection, projectCollection])
            .finally(function () {
                return Q.ninvoke(db, 'close');
            })
            .nodeify(callback);
    }

    function authenticateUser(userId, password, callback) {
        var userData;
        return collection.findOne({_id: userId, type: {$ne: CONSTANTS.ORGANIZATION}})
            .then(function (userData_) {
                userData = userData_;

                if (!userData) {
                    throw new Error('no such user [' + userId + ']');
                }

                if (userId === gmeConfig.authentication.guestAccount && gmeConfig.authentication.allowGuests === true) {
                    return Q(true);
                } else {
                    return Q.ninvoke(bcrypt, 'compare', password, userData.passwordHash);
                }
            })
            .then(function (hashRes) {
                if (hashRes) {
                    return userData;
                } else {
                    throw new Error('incorrect password');
                }
            })
            .nodeify(callback);
    }

    function generateJWToken(userId, password, callback) {
        var deferred = Q.defer();
        logger.debug('Generating token for user:', userId, '..');

        authenticateUser(userId, password)
            .then(function () {
                jwt.sign({userId: userId}, PRIVATE_KEY, jwtOptions, function (token) {
                    logger.debug('Generated token!');
                    deferred.resolve(token);
                });
            })
            .catch(deferred.reject);

        return deferred.promise.nodeify(callback);
    }

    function generateJWTokenForAuthenticatedUser(userId, callback) {
        var deferred = Q.defer();
        logger.debug('Generating token for user:', userId, '..');

        collection.findOne({_id: userId, type: {$ne: CONSTANTS.ORGANIZATION}})
            .then(function (userData) {
                if (!userData) {
                    throw new Error('no such user [' + userId + ']');
                }

                jwt.sign({userId: userId}, PRIVATE_KEY, jwtOptions, function (token) {
                    logger.debug('Generated token!');
                    deferred.resolve(token);
                });
            })
            .catch(deferred.reject);

        return deferred.promise.nodeify(callback);
    }

    function regenerateJWToken(token, callback) {
        var deferred = Q.defer();
        logger.debug('Regenerate token..');
        verifyJWToken(token)
            .then(function (result) {
                jwt.sign({userId: result.content.userId}, PRIVATE_KEY, jwtOptions, function (newToken) {
                    logger.debug('Regenerated new token!');
                    deferred.resolve(newToken);
                });
            })
            .catch(deferred.reject);

        return deferred.promise.nodeify(callback);
    }

    function verifyJWToken(token, callback) {
        logger.debug('Verifying token..');
        return Q.ninvoke(jwt, 'verify', token, PUBLIC_KEY, {algorithms: ['RS256']})
            .then(function (content) {
                var result = {
                    content: content,
                    renew: false,
                };

                logger.debug('Verified token!');
                // Check if token is about to expire...
                if (gmeConfig.authentication.jwt.renewBeforeExpires > 0 &&
                    content.exp - (Date.now() / 1000) < gmeConfig.authentication.jwt.renewBeforeExpires) {
                    logger.debug('Token is about to expire');
                    result.renew = true;
                }

                return result;
            })
            .nodeify(callback);
    }

    /**
     *
     * @param userId
     * @param projectId
     * @param type
     * @param rights
     * @param callback
     * @returns {*}
     */
    function authorizeByUserId(userId, projectId, type, rights, callback) {
        return authorizeByUserOrOrgId(userId, projectId, type, rights)
            .nodeify(callback);
    }

    /**
     *
     * @param userOrOrgId {string}
     * @param projectId {string}
     * @param type {string} 'create' or 'delete'
     * @param rights {object} {read: true, write: true, delete: true}
     * @param callback
     * @returns {*}
     */
    function authorizeByUserOrOrgId(userOrOrgId, projectId, type, rights, callback) {
        var update;
        if (type === 'create' || type === 'set') {
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
     * This includes authorization from organizations userId is part of.
     * @param userId {string}
     * @param projectId {string}
     * @param callback
     * @returns {*}
     */
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

    /**
     *
     * @param userId {string}
     * @param projectId {string}
     * @param callback
     * @returns {*}
     */
    function getProjectAuthorizationListByUserId(userId, callback) {
        var res;
        return collection.findOne({_id: userId}, _getProjection('orgs', 'projects'))
            .then(function (userData) {
                if (!userData) {
                    return Q.reject(new Error('No such user [' + userId + ']'));
                }
                userData.orgs = userData.orgs || [];
                res = userData.projects;
                return Q.allSettled(userData.orgs.map(function (orgId) {
                    return collection.findOne({_id: orgId}, _getProjection('projects'));
                }));
            })
            .then(function (orgResults) {
                orgResults.map(function (orgRes) {
                    var orgProjects;
                    if (orgRes.state === 'rejected') {
                        logger.error(orgRes.reason);
                    } else {
                        orgProjects = orgRes.value.projects || {};
                        Object.keys(orgProjects).forEach(function (projectId) {
                            if (res.hasOwnProperty(projectId)) {
                                res[projectId].read = res[projectId].read || orgProjects[projectId].read;
                                res[projectId].write = res[projectId].write || orgProjects[projectId].write;
                                res[projectId].delete = res[projectId].delete || orgProjects[projectId].delete;
                            } else {
                                res[projectId] = orgProjects[projectId];
                            }
                        });
                    }
                });
                return res;
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
        return collection.findOne({_id: userId, type: {$ne: CONSTANTS.ORGANIZATION}})
            .then(function (userData) {
                if (!userData) {
                    return Q.reject(new Error('no such user [' + userId + ']'));
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

    /**
     *
     * @param userId {string}
     * @param callback
     * @returns {*}
     */
    function deleteUser(userId, callback) {
        return collection.remove({_id: userId, type: {$ne: CONSTANTS.ORGANIZATION}})
            .nodeify(callback);
    }

    /**
     * Updates/overwrites provided fields for the userData.
     * @param {string} userId
     * @param {object} userData
     * @param {function} [callback]
     * @returns {*}
     */
    function updateUser(userId, userData, callback) {
        return collection.findOne({_id: userId, type: {$ne: CONSTANTS.ORGANIZATION}})
            .then(function (oldUserData) {
                if (!oldUserData) {
                    return Q.reject(new Error('no such user [' + userId + ']'));
                }

                oldUserData.email = userData.email || oldUserData.email;


                if (userData.hasOwnProperty('data')) {
                    if (UTIL.isTrueObject(userData.data)) {
                        oldUserData.data = userData.data;
                    } else {
                        throw new Error('supplied userData.data is not an object [' + userData.data + ']');
                    }
                }

                if (userData.hasOwnProperty('settings')) {
                    if (UTIL.isTrueObject(userData.settings)) {
                        oldUserData.settings = userData.settings;
                    } else {
                        throw new Error('supplied userData.settings is not an object [' + userData.settings + ']');
                    }
                }

                if (userData.hasOwnProperty('canCreate')) {
                    oldUserData.canCreate = userData.canCreate === 'true' || userData.canCreate === true;
                }
                if (userData.hasOwnProperty('siteAdmin')) {
                    oldUserData.siteAdmin = userData.siteAdmin === 'true' || userData.siteAdmin === true;
                }

                if (userData.password) {
                    return Q.ninvoke(bcrypt, 'hash', userData.password, gmeConfig.authentication.salts)
                        .then(function (hash) {
                            oldUserData.passwordHash = hash;
                            return collection.update({_id: userId}, oldUserData, {upsert: true});
                        });
                } else {
                    return collection.update({_id: userId}, oldUserData, {upsert: true});
                }
            })
            .then(function () {
                return getUser(userId);
            })
            .nodeify(callback);
    }

    function _updateUserObjectField(userId, keys, newValue, overwrite) {
        return collection.findOne({_id: userId, type: {$ne: CONSTANTS.ORGANIZATION}})
            .then(function (userData) {
                var currentValue,
                    update = {$set: {}},
                    jointKey = keys.join('.');

                if (!userData) {
                    throw new Error('no such user [' + userId + ']');
                } else if (UTIL.isTrueObject(newValue) === false) {
                    throw new Error('supplied value is not an object [' + newValue + ']');
                }

                currentValue = userData[keys.shift()] || {};

                keys.forEach(function (key) {
                    currentValue = currentValue[key] || {};
                });

                if (overwrite) {
                    currentValue = newValue;
                } else {
                    UTIL.updateFieldsRec(currentValue, newValue);
                }

                update.$set[jointKey] = currentValue;
                return collection.update({_id: userId}, update, {upsert: true});
            })
            .then(function () {
                return getUser(userId);
            });
    }
    /**
     * Updates the provided fields in data (recursively) within userData.data.
     * @param {string} userId
     * @param {object} data
     * @param {boolean} [overwrite]  - if true the settings for the key will be overwritten.
     * @param {function} [callback]
     * @returns {*}
     */
    function updateUserDataField(userId, data, overwrite, callback) {
        return _updateUserObjectField(userId, ['data'], data, overwrite)
            .then(function (userData) {
                return userData.data;
            })
            .nodeify(callback);
    }

    /**
     * Updates the provided fields in the settings stored at given componentId.
     * @param {string} userId
     * @param {string} componentId
     * @param {object} settings
     * @param {boolean} [overwrite] - if true the settings for the key will be overwritten.
     * @param {function} [callback]
     * @returns {*}
     */
    function updateUserComponentSettings(userId, componentId, settings, overwrite, callback) {
        return _updateUserObjectField(userId, ['settings', componentId], settings, overwrite)
            .then(function (userData) {
                return userData.settings[componentId];
            })
            .nodeify(callback);
    }

    /**
     * Updates the provided fields in the settings.
     * @param {string} userId
     * @param {object} settings
     * @param {boolean} [overwrite] - if true the settings for the key will be overwritten.
     * @param {function} [callback]
     * @returns {*}
     */
    function updateUserSettings(userId, settings, overwrite, callback) {
        return _updateUserObjectField(userId, ['settings'], settings, overwrite)
            .then(function (userData) {
                return userData.settings;
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
        return collection.find({type: {$ne: CONSTANTS.ORGANIZATION}})
            .then(function (users) {
                return Q.ninvoke(users, 'toArray');
            })
            .then(function (userDataArray) {
                var i;
                for (i = 0; i < userDataArray.length; i += 1) {
                    delete userDataArray[i].passwordHash;
                    // TODO: Consider removing settings and data here.
                }
                return userDataArray;
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
        var deferred = Q.defer(),
            rejected = false,
            data = {
                _id: userId,
                email: email,
                canCreate: canCreate,
                data: {},
                settings: {},
                projects: {},
                type: CONSTANTS.USER,
                orgs: [],
                siteAdmin: options.siteAdmin
            };

        if (options.hasOwnProperty('data')) {
            if (UTIL.isTrueObject(options.data)) {
                data.data = options.data;
            } else {
                deferred.reject(new Error('supplied userData.data is not an object [' + options.data + ']'));
                rejected = true;
            }
        }

        if (options.hasOwnProperty('settings')) {
            if (UTIL.isTrueObject(options.settings)) {
                data.settings = options.settings;
            } else {
                deferred.reject(new Error('supplied userData.settings is not an object [' + options.settings + ']'));
                rejected = true;
            }
        }

        if (rejected === false) {
            Q.ninvoke(bcrypt, 'hash', password, gmeConfig.authentication.salts)
                .then(function (hash) {
                    data.passwordHash = hash;
                    if (!options.overwrite) {
                        return collection.insert(data);
                    } else {
                        return collection.update({_id: userId}, data, {upsert: true});
                    }
                })
                .then(deferred.resolve)
                .catch(deferred.reject);
        }

        return deferred.promise.nodeify(callback);
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
        var id = storageUtil.getProjectIdFromOwnerIdAndProjectName(orgOrUserId, projectName),
            data = {
                _id: id,
                owner: orgOrUserId,
                name: projectName,
                info: info || {}
            };

        return projectCollection.insert(data)
            .then(function () {
                return id;
            })
            .catch(function (err) {
                if (err.code === 11000) {
                    throw new Error('Project already exists ' + id + ' in _projects collection');
                } else {
                    throw err;
                }
            })
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

    /**
     *
     * @param projectId
     * @param {object} info
     * @param callback
     * @returns {*}
     */
    function updateProjectInfo(projectId, info, callback) {
        return projectCollection.findOne({_id: projectId})
            .then(function (projectData) {
                if (!projectData) {
                    return Q.reject(new Error('no such project [' + projectId + ']'));
                }

                projectData.info.viewedAt = info.viewedAt || projectData.info.viewedAt;
                projectData.info.viewer = info.viewer || projectData.info.viewer;

                projectData.info.modifiedAt = info.modifiedAt || projectData.info.modifiedAt;
                projectData.info.modifier = info.modifier || projectData.info.modifier;

                projectData.info.createdAt = info.createdAt || projectData.info.createdAt;
                projectData.info.creator = info.creator || projectData.info.creator;

                return projectCollection.update({_id: projectId}, projectData, {upsert: true});
            })
            .then(function () {
                return getProject(projectId);
            })
            .nodeify(callback);
    }

    /**
     *
     * All users previous access will be lost, new owner will get full access.
     *
     * @param orgOrUserId
     * @param projectId
     * @param newOrgOrUserId
     * @param callback
     * @returns {*}
     */
    function transferProject(projectId, newOrgOrUserId, callback) {
        var projectInfo,
            projectName,
            newProjectId;
        logger.debug('transferProject: projectId, newOrgOrUserId', projectId, newOrgOrUserId);

        return getProject(projectId)
            .then(function (projectData) {
                projectInfo = projectData.info;
                projectName = projectData.name;
                return addProject(newOrgOrUserId, projectName, projectInfo);
            })
            .then(function (newProjectId_) {
                newProjectId = newProjectId_;
                return authorizeByUserOrOrgId(newOrgOrUserId, newProjectId, 'set', {
                    read: true,
                    write: true,
                    delete: true
                });
            })
            .then(function () {
                return deleteProject(projectId);
            })
            .then(function () {
                return newProjectId;
            })
            .nodeify(callback);
    }

    /**
     *
     * @param orgId
     * @param callback
     * @returns {*}
     */
    function addOrganization(orgId, info, callback) {
        // TODO: check user/orgId collision
        return collection.insert({
                _id: orgId,
                projects: {},
                type: CONSTANTS.ORGANIZATION,
                admins: [],
                info: info || {}
            }
        )
            .nodeify(callback);
    }

    /**
     *
     * @param orgId
     * @param callback
     * @returns {*}
     */
    function getOrganization(orgId, callback) {
        return collection.findOne({_id: orgId, type: CONSTANTS.ORGANIZATION})
            .then(function (org) {
                if (!org) {
                    return Q.reject(new Error('No such organization [' + orgId + ']'));
                }
                return [org, collection.find({orgs: orgId, type: {$ne: CONSTANTS.ORGANIZATION}}, {_id: 1})];
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
        return collection.find({type: CONSTANTS.ORGANIZATION})
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
        return collection.remove({_id: orgId, type: CONSTANTS.ORGANIZATION})
            .then(function (count) {
                if (count === 0) {
                    return Q.reject(new Error('No such organization [' + orgId + ']'));
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
        return collection.findOne({_id: orgId, type: CONSTANTS.ORGANIZATION})
            .then(function (org) {
                if (!org) {
                    return Q.reject(new Error('No such organization [' + orgId + ']'));
                }
            })
            .then(function () {
                return collection.update({_id: userId, type: {$ne: CONSTANTS.ORGANIZATION}}, {$addToSet: {orgs: orgId}})
                    .spread(function (count) {
                        if (count === 0) {
                            return Q.reject(new Error('No such user [' + userId + ']'));
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
        return collection.findOne({_id: orgId, type: CONSTANTS.ORGANIZATION})
            .then(function (org) {
                if (!org) {
                    return Q.reject(new Error('No such organization [' + orgId + ']'));
                }
            })
            .then(function () {
                return collection.update({_id: userId, type: {$ne: CONSTANTS.ORGANIZATION}}, {$pull: {orgs: orgId}});
            })
            .nodeify(callback);
    }

    /**
     *
     * @param {string} userId
     * @param {string} orgId
     * @param {boolean} makeAdmin
     * @param callback
     * @returns {*}
     */
    function setAdminForUserInOrganization(userId, orgId, makeAdmin, callback) {
        var admins;
        return getAdminsInOrganization(orgId)
            .then(function (admins_) {
                admins = admins_;
                return collection.findOne({_id: userId, type: {$ne: CONSTANTS.ORGANIZATION}});
            })
            .then(function (user) {
                if (makeAdmin) {
                    if (!user) {
                        return Q.reject(new Error('No such user [' + userId + ']'));
                    }
                    return collection.update({_id: orgId, type: CONSTANTS.ORGANIZATION}, {$addToSet: {admins: userId}});
                } else {
                    if (admins.indexOf(userId) > -1) {
                        return collection.update({_id: orgId, type: CONSTANTS.ORGANIZATION}, {$pull: {admins: userId}});
                    }
                }
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
     * @param orgId
     * @param projectId
     * @param type {string} 'create' 'delete' or 'read'
     * @param rights {object} {read: true, write: true, delete: true}
     * @param callback
     * @returns {*}
     */
    function authorizeOrganization(orgId, projectId, type, rights, callback) {
        return authorizeByUserOrOrgId(orgId, projectId, type, rights)
            .nodeify(callback);
    }

    /**
     *
     * @param orgId
     * @param projectId
     * @param callback
     * @returns {*}
     */
    function getAuthorizationInfoByOrgId(orgId, projectId, callback) {
        var projection = {};
        projection['projects.' + projectId] = 1;
        return collection.findOne({_id: orgId, type: CONSTANTS.ORGANIZATION}, projection)
            .then(function (orgData) {
                if (!orgData) {
                    return Q.reject(new Error('No such organization [' + orgId + ']'));
                }
                return orgData.projects[projectId] || {};
            })
            .nodeify(callback);
    }

    /**
     *
     * @param userOrOrgId
     * @param callback
     * @returns {*}
     */
    function getUserOrOrg(userOrOrgId, callback) {
        return collection.findOne({_id: userOrOrgId})
            .then(function (userOrOrgData) {
                if (!userOrOrgData) {
                    return Q.reject(new Error('no such user or org [' + userOrOrgId + ']'));
                }
                if (!userOrOrgData.type || userOrOrgData.type === CONSTANTS.USER) {
                    delete userOrOrgData.passwordHash;
                    userOrOrgData.type = CONSTANTS.USER;
                }
                return userOrOrgData;
            })
            .nodeify(callback);
    }


    return {
        deleteProject: deleteProject,
        getProjectAuthorizationByUserId: getProjectAuthorizationByUserId,
        getProjectAuthorizationListByUserId: getProjectAuthorizationListByUserId,

        getUserAuthInfo: getUserAuthInfo,
        getAllUserAuthInfo: getAllUserAuthInfo,
        authorizeByUserId: authorizeByUserId,
        getAuthorizationInfoByUserId: getAuthorizationInfoByUserId,

        unload: unload,
        connect: connect,
        _getProjectNames: _getProjectNames,

        // user managerment functions
        addUser: addUser,
        updateUser: updateUser,
        updateUserDataField: updateUserDataField,
        updateUserSettings: updateUserSettings,
        updateUserComponentSettings: updateUserComponentSettings,
        deleteUser: deleteUser,
        getUser: getUser,
        listUsers: listUsers,

        addOrganization: addOrganization,
        getOrganization: getOrganization,
        listOrganizations: listOrganizations,

        getUserOrOrg: getUserOrOrg,

        authorizeByUserOrOrgId: authorizeByUserOrOrgId,

        removeOrganizationByOrgId: removeOrganizationByOrgId,
        addUserToOrganization: addUserToOrganization,
        removeUserFromOrganization: removeUserFromOrganization,
        authorizeOrganization: authorizeOrganization,
        getAuthorizationInfoByOrgId: getAuthorizationInfoByOrgId,
        setAdminForUserInOrganization: setAdminForUserInOrganization,
        getAdminsInOrganization: getAdminsInOrganization,

        addProject: addProject,
        getProject: getProject,
        transferProject: transferProject,
        updateProjectInfo: updateProjectInfo,

        authenticateUser: authenticateUser,
        generateJWToken: generateJWToken,
        generateJWTokenForAuthenticatedUser: generateJWTokenForAuthenticatedUser,
        regenerateJWToken: regenerateJWToken,
        verifyJWToken: verifyJWToken,



        CONSTANTS: CONSTANTS
    };
}

module.exports = GMEAuth;
