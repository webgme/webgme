/*globals requireJS*/
/*jshint node:true, newcap:false*/

/**
 * @module Server:GMEAuth
 * @author ksmyth / https://github.com/ksmyth
 * @author pmeijer / https://github.com/pmeijer
 *
 * http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html
 */

var Mongodb = require('mongodb'),
    Q = require('q'),
    fs = require('fs'),
//bcrypt = require('bcrypt'), include bcrypt and uncomment this line for faster encryption/decryption.
    bcrypt = require('bcryptjs'),
    jwt = require('jsonwebtoken'),
    MetadataStorage = require('../../storage/metadatastorage'),
    UTIL = requireJS('common/util/util'),
    EventDispatcher = requireJS('common/EventDispatcher'),
    Logger = require('../../logger'),

    CONSTANTS = require('./constants');

/**
 *
 * @param session
 * @param gmeConfig
 * @returns {{unload: unload, connect: connect, addUser: addUser, updateUser: updateUser, updateUserDataField: updateUserDataField, updateUserSettings: updateUserSettings, updateUserComponentSettings: updateUserComponentSettings, deleteUser: deleteUser, getUser: getUser, listUsers: listUsers, addOrganization: addOrganization, getOrganization: getOrganization, listOrganizations: listOrganizations, removeOrganizationByOrgId: removeOrganizationByOrgId, addUserToOrganization: addUserToOrganization, removeUserFromOrganization: removeUserFromOrganization, setAdminForUserInOrganization: setAdminForUserInOrganization, getAdminsInOrganization: getAdminsInOrganization, authenticateUser: authenticateUser, generateJWToken: generateJWToken, generateJWTokenForAuthenticatedUser: generateJWTokenForAuthenticatedUser, regenerateJWToken: regenerateJWToken, verifyJWToken: verifyJWToken, metadataStorage: MetadataStorage, authorizer: *, CONSTANTS: {USER: string, ORGANIZATION: string}}}
 * @constructor
 */
function GMEAuth(session, gmeConfig) {
    'use strict';
    var self = this,
        logger = Logger.create('gme:server:auth:gmeauth', gmeConfig.server.log),
        _collectionName = '_users',
        _projectCollectionName = '_projects',
        db,
        collection,
        projectCollection,
        metadataStorage = new MetadataStorage(logger, gmeConfig),
        TokenGenerator = require(gmeConfig.authentication.jwt.tokenGenerator),
        tokenGenerator = new TokenGenerator(logger, gmeConfig, jwt),
        Authorizer = require(gmeConfig.authentication.authorizer.path),
        authorizer = new Authorizer(logger, gmeConfig),
    // JWT Keys
        PUBLIC_KEY;

    EventDispatcher.call(this);

    if (gmeConfig.authentication.enable === true) {
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
        collection_.updateOne = function (/*query, update, options*/) {
            var args = arguments;
            return collection_.then(function (c) {
                return Q.npost(c, 'updateOne', args);
            });
        };
        collection_.updateMany = function (/*query, update, options*/) {
            var args = arguments;
            return collection_.then(function (c) {
                return Q.npost(c, 'updateMany', args);
            });
        };
        collection_.insertOne = function (/*data, options*/) {
            var args = arguments;
            return collection_.then(function (c) {
                return Q.npost(c, 'insertOne', args);
            });
        };
        collection_.insertMany = function (/*data, options*/) {
            var args = arguments;
            return collection_.then(function (c) {
                return Q.npost(c, 'insertMany', args);
            });
        };
        collection_.deleteOne = function (/*query, options*/) {
            var args = arguments;
            return collection_.then(function (c) {
                return Q.npost(c, 'deleteOne', args);
            });
        };
        collection_.deleteMany = function (/*query, options*/) {
            var args = arguments;
            return collection_.then(function (c) {
                return Q.npost(c, 'deleteMany', args);
            });
        };
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
                    logger.debug('Guest access can be disabled by setting' +
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
                logger.debug('Guest account "' + guestAccount._id + '" canCreate:', guestAccount.canCreate === true);
                logger.debug('Guest account full-data: ', {metadata: guestAccount});
                return Q.resolve(guestAccount);
            })
            .nodeify(callback);
    }

    /**
     *
     * @param {function} [callback]
     * @returns {*}
     */
    function connect(callback) {
        var collectionDeferred = Q.defer(),
            projectCollectionDeferred = Q.defer();

        projectCollection = projectCollectionDeferred.promise;
        collection = collectionDeferred.promise;

        addMongoOpsToPromize(collection);
        addMongoOpsToPromize(projectCollection);

        logger.info('connecting to:', gmeConfig.mongo.uri);
        logger.debug('mongdb options', gmeConfig.mongo.uri, JSON.stringify(gmeConfig.mongo.options));
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
                return Q.all([
                    authorizer.start({collection: collection}),
                    metadataStorage.start({projectCollection: projectCollection}),
                    tokenGenerator.start({})
                ]);
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
     * @param {function} [callback]
     * @returns {*}
     */
    function unload(callback) {
        return Q.all([collection, projectCollection, authorizer.stop(), metadataStorage.stop(), tokenGenerator.stop()])
            .finally(function () {
                return Q.ninvoke(db, 'close');
            })
            .nodeify(callback);
    }

    function authenticateUser(userId, password, callback) {
        var userData;
        return collection.findOne({_id: userId, type: {$ne: CONSTANTS.ORGANIZATION}, disabled: {$ne: true}})
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
        logger.debug('Generating token for user:', userId, '..');

        return authenticateUser(userId, password)
            .then(function () {
                return tokenGenerator.getToken(userId);
            })
            .nodeify(callback);
    }

    function generateJWTokenForAuthenticatedUser(userId, callback) {
        logger.debug('Generating token for user:', userId, '..');

        return collection.findOne({_id: userId, type: {$ne: CONSTANTS.ORGANIZATION}, disabled: {$ne: true}})
            .then(function (userData) {
                if (!userData) {
                    throw new Error('no such user [' + userId + ']');
                }

                return tokenGenerator.getToken(userId);
            })
            .nodeify(callback);
    }

    function regenerateJWToken(token, callback) {
        logger.debug('Regenerate token..');
        return verifyJWToken(token)
            .then(function (result) {
                return tokenGenerator.getToken(result.content.userId);
            })
            .nodeify(callback);
    }

    function verifyJWToken(token, callback) {
        logger.debug('Verifying token..');
        return Q.ninvoke(jwt, 'verify', token, PUBLIC_KEY, {algorithms: [gmeConfig.authentication.jwt.algorithm]})
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

    function _resolveQuery(query, extraQuery) {
        Object.keys(extraQuery || {}).forEach(function (key) {
            if (typeof extraQuery[key] === 'undefined') {
                delete query[key];
            } else {
                query[key] = extraQuery[key];
            }
        });
    }

    /**
     *
     * @param {string} userId
     * @param {object] [query]
     * @param {function} [callback]
     * @returns {*}
     */
    function getUser(userId, query, callback) {
        var query_ = {_id: userId, type: {$ne: CONSTANTS.ORGANIZATION}, disabled: {$ne: true}};

        if (typeof query === 'function') {
            callback = query;
            query = null;
        }

        _resolveQuery(query_, query);

        return collection.findOne(query_)
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
     * @param {string} userId
     * @param {boolean} force - removes the user from the db completely
     * @param {function} [callback]
     * @returns {*}
     */
    function deleteUser(userId, force, callback) {
        if (force) {
            return collection.deleteOne({_id: userId, type: {$ne: CONSTANTS.ORGANIZATION}})
                .then(function () {
                    return collection.updateMany({admins: userId}, {$pull: {admins: userId}});
                })
                .then(function (res) {
                    self.dispatchEvent(CONSTANTS.USER_DELETED, {userId: userId});
                    return res;
                })
                .nodeify(callback);
        } else {
            return collection.updateOne({_id: userId, type: {$ne: CONSTANTS.ORGANIZATION}}, {
                $set: {disabled: true}
            })
                .then(function (result) {
                    if (result.modifiedCount === 0) {
                        return Q.reject(new Error('no such user [' + userId + ']'));
                    }

                    return collection.updateMany({admins: userId}, {$pull: {admins: userId}});
                })
                .then(function (res) {
                    self.dispatchEvent(CONSTANTS.USER_DELETED, {userId: userId});
                    return res;
                })
                .nodeify(callback);
        }
    }

    /**
     * Updates/overwrites provided fields for the userData.
     * @param {string} userId
     * @param {object} userData
     * @param {function} [callback]
     * @returns {*}
     */
    function updateUser(userId, userData, callback) {
        return collection.findOne({_id: userId, type: {$ne: CONSTANTS.ORGANIZATION}, disabled: {$ne: true}})
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
                            return collection.updateOne({_id: userId}, oldUserData, {upsert: true});
                        });
                } else {
                    return collection.updateOne({_id: userId}, oldUserData, {upsert: true});
                }
            })
            .then(function () {
                return getUser(userId);
            })
            .nodeify(callback);
    }

    function _updateUserObjectField(userId, keys, newValue, overwrite) {
        return collection.findOne({_id: userId, type: {$ne: CONSTANTS.ORGANIZATION}, disabled: {$ne: true}})
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
                return collection.updateOne({_id: userId}, update, {upsert: true});
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
     * @param {object} [query]
     * @param {function} [callback]
     * @returns {*}
     */
    function listUsers(query, callback) {
        var query_ = {type: {$ne: CONSTANTS.ORGANIZATION}, disabled: {$ne: true}};

        _resolveQuery(query_, query);

        return collection.find(query_)
            .then(function (users) {
                return Q.ninvoke(users, 'toArray');
            })
            .then(function (userDataArray) {
                var i;
                for (i = 0; i < userDataArray.length; i += 1) {
                    delete userDataArray[i].passwordHash;
                    userDataArray[i].data = userDataArray[i].data || {};
                    userDataArray[i].settings = userDataArray[i].settings || {};
                }
                return userDataArray;
            })
            .nodeify(callback);
    }

    /**
     *
     * @param {string} userId
     * @param {string} email
     * @param {string} password
     * @param {boolean} [canCreate=false]
     * @param {object} options
     * @param {function} [callback]
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

        if (typeof options.disabled === 'boolean') {
            data.disabled = options.disabled;
        }

        if (rejected === false) {
            Q.ninvoke(bcrypt, 'hash', password, gmeConfig.authentication.salts)
                .then(function (hash) {
                    data.passwordHash = hash;
                    if (!options.overwrite) {
                        return collection.insertOne(data);
                    } else {
                        return collection.updateOne({_id: userId}, data, {upsert: true});
                    }
                })
                .then(function (res) {
                    self.dispatchEvent(CONSTANTS.USER_CREATED, {userId: userId});
                    deferred.resolve(res);
                })
                .catch(function (err) {
                    if (err.code === 11000) {
                        deferred.reject(new Error('user already exists [' + userId + ']'));
                    } else {
                        deferred.reject(err);
                    }
                });
        }

        return deferred.promise.nodeify(callback);
    }

    function reEnableUser(userId, callback) {
        return collection.updateOne({_id: userId, type: {$ne: CONSTANTS.ORGANIZATION}}, {
            $set: {disabled: false}
        })
            .then(function (result) {
                if (result.modifiedCount === 0) {
                    return Q.reject(new Error('no such user [' + userId + ']'));
                }

                self.dispatchEvent(CONSTANTS.USER_ADDED, {userId: userId});

                return getUser(userId);
            })
            .nodeify(callback);
    }

    /**
     *
     * @param {string} orgId
     * @param {function} [callback]
     * @returns {*}
     */
    function addOrganization(orgId, info, callback) {
        return collection.insertOne({
                _id: orgId,
                projects: {},
                type: CONSTANTS.ORGANIZATION,
                admins: [],
                info: info || {}
            }
        )
            .then(function (res) {
                self.dispatchEvent(CONSTANTS.ORGANIZATION_CREATED, {orgId: orgId});
                return res;
            })
            .catch(function (err) {
                if (err.code === 11000) {
                    throw new Error('user or org already exists [' + orgId + ']');
                } else {
                    throw err;
                }
            })
            .nodeify(callback);
    }

    function reEnableOrganization(orgId, callback) {
        return collection.updateOne({_id: orgId, type: CONSTANTS.ORGANIZATION}, {
            $set: {disabled: false}
        })
            .then(function (result) {
                if (result.modifiedCount === 0) {
                    return Q.reject(new Error('no such organization [' + orgId + ']'));
                }

                self.dispatchEvent(CONSTANTS.ORGANIZATION_CREATED, {orgId: orgId});

                return getOrganization(orgId);
            })
            .nodeify(callback);
    }

    /**
     *
     * @param {string} orgId
     * @param {object] info
     * @param {function} [callback]
     * @returns {*}
     */
    function updateOrganizationInfo(orgId, info, callback) {

        if (!UTIL.isTrueObject(info)) {
            throw new Error('supplied info is not an object [' + info + ']');
        }

        return collection.updateOne({_id: orgId, type: CONSTANTS.ORGANIZATION, disabled: {$ne: true}},
            {
                $set: {info: info}
            })
            .then(function (res) {
                if (res.modifiedCount === 0) {
                    return Q.reject(new Error('no such organization [' + orgId + ']'));
                }

                return getOrganization(orgId);
            })
            .nodeify(callback);
    }

    /**
     *
     * @param {string} orgId
     * @param {object] [query]
     * @param {function} [callback]
     * @returns {*}
     */
    function getOrganization(orgId, query, callback) {
        var query_ = {_id: orgId, type: CONSTANTS.ORGANIZATION, disabled: {$ne: true}};

        if (typeof query === 'function') {
            callback = query;
            query = null;
        }

        _resolveQuery(query_, query);

        return collection.findOne(query_)
            .then(function (org) {
                if (!org) {
                    return Q.reject(new Error('no such organization [' + orgId + ']'));
                }
                return [org, collection.find({orgs: orgId, type: {$ne: CONSTANTS.ORGANIZATION}, disabled: {$ne: true}},
                    {_id: 1})];
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
     * @param {object} [query]
     * @param {function} [callback]
     * @returns {*}
     */
    function listOrganizations(query, callback) {
        var query_ = {type: CONSTANTS.ORGANIZATION, disabled: {$ne: true}};

        _resolveQuery(query_, query);

        return collection.find(query_)
            .then(function (orgs) {
                return Q.ninvoke(orgs, 'toArray');
            })
            .then(function (organizationArray) {
                //TODO: See if there is a smarter query here (this sends one for each org).
                return Q.all(organizationArray.map(function (org) {
                    return collection.find({orgs: org._id, type: {$ne: CONSTANTS.ORGANIZATION}, disabled: {$ne: true}},
                        {_id: 1})
                        .then(function (users) {
                            return Q.ninvoke(users, 'toArray');
                        })
                        .then(function (users) {
                            org.users = users.map(function (user) {
                                return user._id;
                            });

                            return org;
                        });
                }));
            })
            .nodeify(callback);
    }

    /**
     *
     * @param {string} orgId
     * @param {boolean} [force=false] - delete organization from db.
     * @param {function} [callback]
     * @returns {*}
     */
    function removeOrganizationByOrgId(orgId, force, callback) {
        if (force) {
            return collection.deleteOne({_id: orgId, type: CONSTANTS.ORGANIZATION})
                .then(function () {
                    return collection.updateMany({orgs: orgId}, {$pull: {orgs: orgId}});
                })
                .then(function (res) {
                    self.dispatchEvent(CONSTANTS.ORGANIZATION_DELETED, {orgId: orgId});
                    return res;
                })
                .nodeify(callback);
        } else {
            return collection.updateOne({_id: orgId, type: CONSTANTS.ORGANIZATION},
                {$set: {disabled: true}})
                .then(function (result) {
                    if (result.modifiedCount === 0) {
                        return Q.reject(new Error('no such organization [' + orgId + ']'));
                    }

                    return collection.updateMany({orgs: orgId}, {$pull: {orgs: orgId}});
                })
                .then(function (res) {
                    self.dispatchEvent(CONSTANTS.ORGANIZATION_DELETED, {orgId: orgId});
                    return res;
                })
                .nodeify(callback);
        }
    }

    /**
     *
     * @param userId
     * @param {string} orgId
     * @param {function} [callback]
     * @returns {*}
     */
    function addUserToOrganization(userId, orgId, callback) {
        return collection.findOne({_id: orgId, type: CONSTANTS.ORGANIZATION, disabled: {$ne: true}})
            .then(function (org) {
                if (!org) {
                    return Q.reject(new Error('no such organization [' + orgId + ']'));
                }
            })
            .then(function () {
                return collection.updateOne({_id: userId, type: {$ne: CONSTANTS.ORGANIZATION}, disabled: {$ne: true}},
                    {$addToSet: {orgs: orgId}})
                    .then(function (result) {
                        if (result.matchedCount === 0) {
                            return Q.reject(new Error('no such user [' + userId + ']'));
                        }
                    });
            })
            .nodeify(callback);
    }

    /**
     *
     * @param userId
     * @param orgId
     * @param {function} [callback]
     * @returns {*}
     */
    function removeUserFromOrganization(userId, orgId, callback) {
        return collection.findOne({_id: orgId, type: CONSTANTS.ORGANIZATION, disabled: {$ne: true}})
            .then(function (org) {
                if (!org) {
                    return Q.reject(new Error('no such organization [' + orgId + ']'));
                }
            })
            .then(function () {
                return collection.updateOne({_id: userId, type: {$ne: CONSTANTS.ORGANIZATION}, disabled: {$ne: true}},
                    {$pull: {orgs: orgId}});
            })
            .nodeify(callback);
    }

    /**
     *
     * @param {string} userId
     * @param {string} orgId
     * @param {boolean} makeAdmin
     * @param {function} [callback]
     * @returns {*}
     */
    function setAdminForUserInOrganization(userId, orgId, makeAdmin, callback) {
        var admins;
        return getAdminsInOrganization(orgId)
            .then(function (admins_) {
                admins = admins_;
                return collection.findOne({_id: userId, type: {$ne: CONSTANTS.ORGANIZATION}, disabled: {$ne: true}});
            })
            .then(function (user) {
                if (makeAdmin) {
                    if (!user) {
                        return Q.reject(new Error('no such user [' + userId + ']'));
                    }
                    return collection.updateOne({_id: orgId, type: CONSTANTS.ORGANIZATION, disabled: {$ne: true}},
                        {$addToSet: {admins: userId}});
                } else {
                    if (admins.indexOf(userId) > -1) {
                        return collection.updateOne({_id: orgId, type: CONSTANTS.ORGANIZATION, disabled: {$ne: true}},
                            {$pull: {admins: userId}});
                    }
                }
            })
            .nodeify(callback);
    }

    function getAdminsInOrganization(orgId, callback) {
        return collection.findOne({_id: orgId, type: CONSTANTS.ORGANIZATION, disabled: {$ne: true}}, {admins: 1})
            .then(function (org) {
                if (!org) {
                    return Q.reject(new Error('no such organization [' + orgId + ']'));
                }
                return org.admins;
            })
            .nodeify(callback);
    }

    function authorizeByUserId(userId, projectId, type, rights, callback) {
        var projectAuthParams = {
            entityType: authorizer.ENTITY_TYPES.PROJECT
        };

        logger.warn('authorizeByUserId/authorizeByUserOrOrgId are deprecated use authorizer.setAccessRights instead!');

        return authorizer.setAccessRights(userId, projectId, rights, projectAuthParams).nodeify(callback);
    }

    this.unload = unload;
    this.connect = connect;

    this.listUsers = listUsers;
    this.getUser = getUser;
    this.addUser = addUser;
    this.updateUser = updateUser;
    this.updateUserDataField = updateUserDataField;
    this.updateUserSettings = updateUserSettings;
    this.updateUserComponentSettings = updateUserComponentSettings;
    this.deleteUser = deleteUser;
    this.reEnableUser = reEnableUser;

    this.listOrganizations = listOrganizations;
    this.getOrganization = getOrganization;
    this.addOrganization = addOrganization;
    this.updateOrganizationInfo = updateOrganizationInfo;
    this.deleteOrganization = this.removeOrganizationByOrgId = removeOrganizationByOrgId;
    this.reEnableOrganization = reEnableOrganization;

    this.getAdminsInOrganization = getAdminsInOrganization;
    this.addUserToOrganization = addUserToOrganization;
    this.removeUserFromOrganization = removeUserFromOrganization;
    this.setAdminForUserInOrganization = setAdminForUserInOrganization;

    this.authenticateUser = authenticateUser;
    this.generateJWToken = generateJWToken;
    this.generateJWTokenForAuthenticatedUser = generateJWTokenForAuthenticatedUser;
    this.regenerateJWToken = regenerateJWToken;
    this.verifyJWToken = verifyJWToken;

    this.metadataStorage = metadataStorage;
    this.authorizer = authorizer;

    this.CONSTANTS = CONSTANTS;

    // These are left in order to not break all tests.
    this.authorizeByUserId = authorizeByUserId;
    this.authorizeByUserOrOrgId = authorizeByUserId;
}

// Inherit from EventDispatcher
GMEAuth.prototype = Object.create(EventDispatcher.prototype);
GMEAuth.prototype.constructor = GMEAuth;

module.exports = GMEAuth;
