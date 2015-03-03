/* globals define, require, console */
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define(['mongodb', 'q', 'util/guid', 'bcrypt'], function (Mongodb, Q, GUID, bcrypt) {
    function GMEAuth(_options) {
        var _collectionName = _options.collection || '_users',
            _organizationCollectionName = '_organizations',
            _session = _options.session,
            _userField = _options.user || 'username',
            _passwordField = _options.password || 'password',
            _tokenExpiration = _options.tokenTime || 0,
            db,
            collectionDeferred = Q.defer(),
            collection = collectionDeferred.promise,
            organizationCollectionDeferred = Q.defer(),
            organizationCollection = organizationCollectionDeferred.promise;

        /**
         * 'users' collection has these fields:
         * _id: username
         * email:
         * password:
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
        function addMongoOpsToPromize(collection) {
            collection.findOne = function () {
                var args = arguments;
                return collection.then(function (c) {
                    return Q.npost(c, 'findOne', args);
                });
            };
            collection.find = function (query, projection) {
                var args = arguments;
                return collection.then(function (c) {
                    return Q.npost(c, 'find', args);
                });
            };
            collection.update = function (query, update, options) {
                var args = arguments;
                return collection.then(function (c) {
                    return Q.npost(c, 'update', args);
                });
            };
            collection.insert = function (data, options) {
                var args = arguments;
                return collection.then(function (c) {
                    return Q.npost(c, 'insert', args);
                });
            };
            collection.remove = function (query, options) {
                var args = arguments;
                return collection.then(function (c) {
                    return Q.npost(c, 'remove', args)
                        .then(function (num) {
                            // depending on mongodb hasWriteCommands, remove calls back with (num) or (num, backWardsCompatibiltyResults)
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

        (function connect() {
            var userString = '';
            if(_options.user && _options.pwd){
                userString = _options.user + ':' + _options.pwd + '@';
            }
            Q.ninvoke(Mongodb.MongoClient, 'connect', 'mongodb://' + userString + _options.host + ':' + _options.port + '/' + _options.database, {
                'w': 1,
                'native-parser': true,
                'auto_reconnect': true,
                'poolSize': 20,
                socketOptions: {keepAlive: 1}
            }).then(function (db_) {
                db = db_;
                return Q.ninvoke(db, 'collection', _collectionName);
            }).then(function (collection_) {
                collectionDeferred.resolve(collection_);
                if (_options.guest) {
                    collection.findOne({_id: 'anonymous'})
                        .then(function (userData) {
                            if (!userData) {
                                console.error('User "anonymous" not found. Create it with src/bin/usermanager.js or anonymous access will not work. ' +
                                'Disable anonymous access by setting config.guest = false');
                            }
                        });
                }
                return Q.ninvoke(db, 'collection', _organizationCollectionName);
            }).then(function (organizationCollection_) {
                organizationCollectionDeferred.resolve(organizationCollection_);
            })
            .catch(function (err) {
                // TODO better logging
                console.error(err);
                collectionDeferred.reject(err);
            });
        })();

        function unload(callback) {
            return collection
                .finally(function () {
                    return Q.ninvoke(db, 'close');
                })
                .nodeify(callback);
        }

        function getUserProject(id, projectName, callback) {
            return collection.findOne({_id: id})
                .then(function (userData) {
                    return userData.projects[projectName];
                })
                .nodeify(callback);
        }

        function authenticate(req, res, next) {
            var userId = req.body[_userField],
                password = req.body[_passwordField],
                gmail = false,
                returnUrl = req.__gmeAuthFailUrl__ || '/';
            delete req.__gmeAuthFailUrl__;
            //gmail based authentication - no authentication just user search
            if (userId === null || userId === undefined) {
                userId = req.query['openid.ext1.value.email'];
                password = null;
                gmail = true;
                if (userId === null || userId === undefined) {
                    res.redirect(returnUrl);
                    return;
                }
            }

            var query = {};
            if (userId.indexOf('@') > 0) {
                query.email = userId;
            } else {
                query._id = userId;
            }
            collection.findOne(query)
                .then(function (userData) {
                    if (!userData) {
                        return Q.reject('no such user');
                    }
                    if (gmail) {
                        req.session.udmId = userData._id;
                        req.session.authenticated = true;
                        req.session.userType = 'GME';
                        next(null);
                    } else {
                        return Q.ninvoke(bcrypt, 'compare', password, userData.passwordHash)
                            .then(function(hash_res) {
                                if (!hash_res) {
                                    return Q.reject('incorrect password');
                                } else {
                                    req.session.udmId = userData._id;
                                    req.session.authenticated = true;
                                    req.session.userType = 'GME';
                                    next(null);
                                }
                            });
                    }
                })
                .catch(function (err) {
                    res.redirect(returnUrl);
                });
        }

        // type: 'create' 'delete'
        // rights: {read: true, write: true, delete: true}
        function authorizeByUserId(userId, projectName, type, rights, callback) {
            if (type === 'create' || type === 'set') {
                var update = { $set: {} };
                update['$set']['projects.' + projectName] = rights;
                return collection.update({_id: userId}, update)
                    .spread(function(numUpdated) {
                        return numUpdated === 1;
                    })
                    .nodeify(callback);
            } else if (type === 'delete') {
                var update = { $unset: {} };
                update['$unset']['projects.' + projectName] = '';
                return collection.update({_id: userId}, update)
                    .spread(function(numUpdated) {
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
            Q.ninvoke(_session, 'getSessionUser', sessionId)
                .then(function (userId) {
                    if (!userId) {
                        throw 'invalid session';
                    }
                    return authorizeByUserId(userId, projectName, type, {read: true, write: true, delete: true}, callback);
                })
                .catch(callback);
        }

        function getAuthorizationInfoByUserId(userId, projectName, callback) {
            var projection = {};
            projection['projects.' + projectName] = 1;
            return collection.findOne({_id: userId}, projection)
                .then(function (userData) {
                    return userData.projects[projectName] || {read: false, write: false, delete: false};
                })
                .nodeify(callback);
        }

        function _getProjection(/*args*/) {
            var ret = {};
            for (var i = 0; i < arguments.length; i += 1) {
                ret[arguments[i]] = 1;
            }
            return ret;
        }

        function getProjectAuthorizationByUserId(userId, projectName, callback) {
            var ops = ['read', 'write', 'delete'];
            return collection.findOne({_id: userId}, _getProjection('orgs', 'projects.' + projectName))
                .then(function (userData) {
                    if (!userData) {
                        return Q.reject('No such user');
                    }
                    userData.orgs = userData.orgs || [];
                    return [userData.projects[projectName] || {},
                        Q.all(ops.map(function (op) {
                            if ((userData.projects[projectName] || {})[op]) {
                                return 1;
                            }
                            var query = { _id: { $in: userData.orgs } };
                            query['projects.' + projectName + '.' + op] = true;
                            return organizationCollection.findOne(query, {_id: 1});
                        }))];
                }).spread(function(user, rwd) {
                    var ret = {};
                    ops.forEach(function (op, i) {
                        ret[op] = (user[op] || rwd[i]) ? true : false;
                    });
                    return ret;
                })
                .nodeify(callback);
        }

        function getProjectAuthorizationBySession(sessionId, projectName, callback) {
            Q.ninvoke(_session, 'getSessionUser', sessionId)
                .then(function (userId) {
                    return getProjectAuthorizationByUserId(userId, projectName, callback);
                })
                .catch(callback);
        }

        function tokenAuthorization(tokenId, projectName, callback) { //TODO currently we expect only reads via token usage
            var query = { tokenId: tokenId };
            query['projects.' + projectName + '.read'] = true;
            return collection.findOne(query)
                .then(function (userData) {
                    return Q(userData ? userData.projects[projectName].read : false);
                })
                .nodeify(callback);
        }

        function generateTokenByUserId(userId, callback) {
            var token = GUID() + 'token';
            return collection.update({_id: userId}, { $set: { tokenId: token, tokenCreated: (new Date()).getDate()} } )
                .spread(function () { return token; })
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
                .spread()
                .nodeify(callback);
        }

        function getUserAuthInfo(userId, callback) {
            return collection.findOne({_id: userId})
                .then(function (userData) {
                    if (!userData) {
                        return Q.reject('no such user');
                    }
                    return userData.projects;
                })
                .nodeify(callback);
        }

        function getAllUserAuthInfo(userId, callback) {
            return collection.findOne({_id: userId})
                .then(function (userData) {
                    if (!userData) {
                        return Q.reject('no such user');
                    }
                    return userData;
                })
                .nodeify(callback);
        }

        function deleteProject(projectName, callback) {
            var update = { $unset: {} };
            update['$unset']['projects.' + projectName] = '';
            return collection.update({}, update, { multi: true })
                .then(function () {
                    return organizationCollection.update({}, update, { multi: true });
                })
                .spread(function(/*numUpdated*/) {
                    return true;
                })
                .nodeify(callback);
        }

        function removeUserByUserId(userId, callback) {
            return collection.remove({_id: userId})
                .nodeify(callback);
        }

        function addUser(userId, email, password, canCreate, options, callback) {
            var data = {_id: userId, email: email, canCreate: canCreate, projects: {}, orgs: [] };
            return Q.ninvoke(bcrypt, 'hash', password, 10 /* TODO: make this configurable */)
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
            return collection.then(function() {
                return Q.ninvoke(db, 'getCollectionNames');
            }).nodeify(callback);
        }

        function addOrganization(orgId, callback) {
            return organizationCollection.insert({ _id: orgId, projects: {} })
                .nodeify(callback);
        }

        function getOrganization(orgId, callback) {
            return organizationCollection.findOne({ _id: orgId })
                .then(function (org) {
                    if (!org) {
                        return Q.reject('No such organization');
                    }
                    return [org, collection.find({ orgs: orgId }, { _id: 1 })];
                })
                .spread(function (org, users) {
                    return [org, Q.ninvoke(users, 'toArray')];
                })
                .spread(function (org, users) {
                    org.users = users.map(function (user) { return user._id; });
                    return org;
                })
                .nodeify(callback);
        }

        function removeOrganizationByOrgId(orgId, callback) {
            return organizationCollection.remove({ _id: orgId })
                .then(function (count) {
                    if (count === 0) {
                        return Q.reject('No such organization');
                    }
                    return collection.update({ orgs: orgId }, { $pull: { orgs: orgId } }, { multi: true });
                })
                .nodeify(callback);
        }

        function addUserToOrganization(userId, orgId, callback) {
            return organizationCollection.findOne({ _id: orgId })
                .then(function (org) {
                    if (!org) {
                        return Q.reject('No such organization');
                    }
                })
                .then(function () {
                    return collection.update({ _id: userId }, { $addToSet: { orgs: orgId } })
                        .spread(function (count) {
                            if (count === 0) {
                                return Q.reject('No such user');
                            }
                        });
                })
                .nodeify(callback);
        }

        function removeUserFromOrganization(userId, orgId, callback) {
            return organizationCollection.findOne({ _id: orgId })
                .then(function (org) {
                    if (!org) {
                        return Q.reject('No such organization');
                    }
                })
                .then(function () {
                    collection.update({ _id: userId }, { orgs: { $pull: orgId } });
                })
                .nodeify(callback);
        }

        // type: 'create' 'delete' or 'read'
        // rights: {read: true, write: true, delete: true}
        function authorizeOrganization(orgId, projectName, type, rights, callback) {
            if (type === 'create' || type === 'set') {
                var update = { $set: {} };
                update['$set']['projects.' + projectName] = rights;
                return organizationCollection.update({_id: orgId}, update)
                    .spread(function(numUpdated) {
                        if (numUpdated !== 1) {
                            return Q.reject('No such organization \'' + orgId + '\'');
                        }
                        return numUpdated === 1;
                    })
                    .nodeify(callback);
            } else if (type === 'delete') {
                var update = { $unset: {} };
                update['$unset']['projects.' + projectName] = '';
                return organizationCollection.update({_id: orgId}, update)
                    .spread(function(numUpdated) {
                        // FIXME this is always true. Try findAndUpdate instead
                        return numUpdated === 1;
                    })
                    .nodeify(callback);
            } else {
                return Q.reject('invalid type ' + type);
            }
        }

        function getAuthorizationInfoByOrgId(orgId, projectName, callback) {
            var projection = {};
            projection['projects.' + projectName] = 1;
            return organizationCollection.findOne({_id: orgId}, projection)
                .then(function (userData) {
                    if (!userData) {
                        return Q.reject('No such organization');
                    }
                    return userData.projects[projectName] || {};
                })
                .nodeify(callback);
        }


        return {
            authenticate: authenticate,
            authorize: authorizeBySession,
            deleteProject: deleteProject,
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
            authorizeByUserId: authorizeByUserId,
            removeUserByUserId: removeUserByUserId,
            getAuthorizationInfoByUserId: getAuthorizationInfoByUserId,
            addUser: addUser,
            unload: unload,
            _getProjectNames: _getProjectNames,

            addOrganization: addOrganization,
            getOrganization: getOrganization,
            removeOrganizationByOrgId: removeOrganizationByOrgId,
            addUserToOrganization: addUserToOrganization,
            removeUserFromOrganization: removeUserFromOrganization,
            authorizeOrganization: authorizeOrganization,
            getAuthorizationInfoByOrgId: getAuthorizationInfoByOrgId
        };
    }

    return GMEAuth;
});
