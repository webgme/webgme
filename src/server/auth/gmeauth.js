/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define(["mongodb", "q", "util/guid"], function (Mongodb, Q, GUID) {
    function GMEAuth(_options) {
        var _collectionName = _options.collection || '_users',
            _session = _options.session,
            _validity = _options.validity || 60000,
            _userField = _options.user || 'username',
            _passwordField = _options.password || 'password',
            _tokenExpiration = _options.tokenTime || 0,
            _guest = _options.guest === true ? true : false,
            db,
            collectionDeferred = Q.defer(),
            collection = collectionDeferred.promise;

        /**
         * 'users' collection has these fields:
         * _id: username
         * email:
         * password:
         * canCreate: authorized to create new projects
         * tokenId: token associated with account
         * tokenCreation: time of token creation (they may be configured to expire)
         * projects: map from project name to object {read:, write:, delete: }
         */
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
                return Q.npost(c, 'remove', args);
            });
        };

        (function connect() {
            var userString = "";
            if(_options.user && _options.pwd){
                userString = _options.user+":"+options.pwd+"@";
            }
            Mongodb.MongoClient.connect("mongodb://" + userString + _options.host + ":" + _options.port + "/" + _options.database, {
                'w': 1,
                'native-parser': true,
                'auto_reconnect': true,
                'poolSize': 20,
                socketOptions: {keepAlive: 1}
            }, function (err, db_) {
                if (!err && db_) {
                    db = db_;
                    db.collection(_collectionName, function (err, result) {
                        if (err) {
                            // TODO better logging
                            console.error(err);
                            collectionDeferred.reject(err);
                        } else {
                            collectionDeferred.resolve(result);
                            if (_options.guest) {
                                collection.findOne({_id: 'anonymous'})
                                    .then(function (userData) {
                                        if (!userData) {
                                            console.error('User "anonymous" not found. Create it with src/bin/usermanager.js or anonymous access will not work. ' +
                                                'Disable anonymous access by setting config.guest = false');
                                        }
                                    });
                            }
                        }
                    });
                } else {
                    // TODO better logging
                    console.error(err);
                    collectionDeferred.reject(err);
                }
            });
        })();

        function unload(callback) {
            return collection
                .finally(function () {
                    return Q.ninvoke(db, 'close')
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
                returnUrl = req.__gmeAuthFailUrl__ || "/";
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
                    if (gmail) {
                        req.session.udmId = userData._id;
                        req.session.authenticated = true;
                        req.session.userType = 'GME';
                        next(null);
                    } else {
                        if (password === userData.password) {
                            req.session.udmId = userData._id;
                            req.session.authenticated = true;
                            req.session.userType = 'GME';
                            next(null);
                        } else {
                            res.redirect(returnUrl);
                        }
                    }
                })
                .catch(function (err) {
                    res.redirect(returnUrl)
                });
        }

        // type: 'create' 'delete' or 'read'
        // rights: {read: true, write: true, delete: true}
        function authorizeByUserId(userId, projectName, type, rights, callback) {
            if (type === 'create' || type === 'set') {
                var update = { $set: {} };
                update['$set']['projects.' + projectName] = rights;
                return collection.update({_id: userId}, update)
                    .then(function(numUpdated) {
                        return numUpdated[0] === 1;
                    })
                    .nodeify(callback);
            } else if (type === 'delete') {
                var update = { $unset: {} };
                update['$unset']['projects.' + projectName] = '';
                return collection.update({_id: userId}, update)
                    .then(function(numUpdated) {
                        // FIXME this is always true. Try findAndUpdate instead
                        return numUpdated[0] === 1;
                    })
                    .nodeify(callback);
            } else {
                var projection = {};
                projection["projects." + projectName] = 1;
                return collection.findOne({_id: userId}, projection)
                    .then(function (userData) {
                        if (!userData) {
                            return Q.reject('unknown user');
                        }
                        return (userData.projects[projectName] || {})[type] === true;
                    })
                    .nodeify(callback);
            }
        }

        function authorize(sessionId, projectName, type, callback) {
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
            projection["projects." + projectName] = 1;
            return collection.findOne({_id: userId}, projection)
                .then(function (userData) {
                    return userData.projects[projectName];
                })
                .nodeify(callback);
        }

        function getAuthorizationInfoBySession(sessionId, projectName, callback) {
            Q.ninvoke(_session, 'getSessionUser', sessionId)
                .then(function (userId) {
                    return getAuthorizationInfoByUserId(userId, projectName, callback);
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
                .then(function () { return token; })
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
            return collection.update({}, update)
                .then(function(/*numUpdated*/) {
                    return true;
                })
                .nodeify(callback);
        }

        function removeUserByUserId(userId, callback) {
            return collection.remove({_id: userId})
                .nodeify(callback);
        }

        function addUser(userId, email, password, canCreate, options, callback) {
            var data = {_id: userId, email: email, password: password, canCreate: canCreate, projects: {} };
            if (!options.overwrite) {
                return collection.insert(data)
                    .nodeify(callback);
            } else {
                return collection.update({_id: userId}, data, { upsert: true })
                    .nodeify(callback);
            }
        }

        function _getProjectNames(callback) {
            return collection.then(function() {
                return Q.ninvoke(db, 'getCollectionNames');
            }).nodeify(callback);
        }

        return {
            authenticate: authenticate,
            authorize: authorize,
            deleteProject: deleteProject,
            getAuthorizationInfo: getAuthorizationInfoBySession,
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
            _getProjectNames: _getProjectNames
        };
    }

    return GMEAuth;
});
