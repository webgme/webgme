/*globals requireJS*/
/*jshint node:true, camelcase:false*/

/**
 * @module Server:API
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 * @author kecso / https://github.com/kecso
 */

'use strict';

/**
 * Mounts the API functions to a given express app.
 *
 * @param app Express application
 * @param mountPath {string} mount point e.g. /api
 * @param middlewareOpts
 */
function createAPI(app, mountPath, middlewareOpts) {
    var express = require('express'),
        router = express.Router(),

        Q = require('q'),
        path = require('path'),
        fs = require('fs'),
        apiDocumentationMountPoint = '/developer/api',

        logger = middlewareOpts.logger.fork('api'),
        gmeAuth = middlewareOpts.gmeAuth,
        metadataStorage = gmeAuth.metadataStorage,
        authorizer = gmeAuth.authorizer,
        safeStorage = middlewareOpts.safeStorage,
        ensureAuthenticated = middlewareOpts.ensureAuthenticated,
        gmeConfig = middlewareOpts.gmeConfig,
        getUserId = middlewareOpts.getUserId,
        webgme = require('../../../webgme'),
        merge = webgme.requirejs('common/core/users/merge'),
        StorageUtil = webgme.requirejs('common/storage/util'),
        webgmeUtils = require('../../utils'),

        versionedAPIPath = mountPath + '/v1',
        latestAPIPath = mountPath;

    app.get(apiDocumentationMountPoint, function (req, res) {
        res.sendFile(path.join(__dirname, '..', '..', '..', 'docs', 'REST', 'index.html'));
    });

    function getFullUrl(req, name) {
        return req.protocol + '://' + req.headers.host + req.baseUrl + name;
    }

    function getNewJWToken(userId, callback) {
        var deferred = Q.defer();

        if (gmeConfig.authentication.enable === true) {
            gmeAuth.generateJWTokenForAuthenticatedUser(userId)
                .then(deferred.resolve)
                .catch(deferred.reject);
        } else {
            deferred.resolve();
        }

        return deferred.promise.nodeify(callback);
    }

    // ensure authenticated can be used only after this rule
    router.use('*', function (req, res, next) {
        // TODO: set all headers, check rate limit, etc.
        res.setHeader('X-WebGME-Media-Type', 'webgme.v1');
        next();
    });

    router.post('/register', function (req, res) {
        var receivedData = req.body;
        if (gmeConfig.authentication.enable === false) {
            res.sendStatus(404);
            return;
        }

        if (gmeConfig.authentication.allowUserRegistration === false) {
            res.sendStatus(404);
            return;
        }

        // TODO: Add regex for userId and check other data too.
        if (typeof receivedData.password !== 'string' || receivedData.password.length === 0 ||
            typeof receivedData.userId !== 'string' || receivedData.userId.length === 0) {
            res.status(400);
            res.json({message: 'allowUserRegistration is set to false'});
            return;
        }

        gmeAuth.addUser(receivedData.userId,
            receivedData.email,
            receivedData.password,
            true,
            {overwrite: false},
            function (err/*, updateData*/) {
                if (err) {
                    res.sendStatus(400);
                    return;
                }

                gmeAuth.getUser(receivedData.userId, function (err, data) {
                    if (err) {
                        res.sendStatus(500);
                        return;
                    }

                    res.json(data);
                });
            });
    });

    // modifications are allowed only if the user is authenticated
    // all get rules by default do NOT require authentication, if the get rule has to be protected add inline
    // the ensureAuthenticated function middleware
    router.post('*', ensureAuthenticated);
    router.put('*', ensureAuthenticated);
    router.patch('*', ensureAuthenticated);
    router.delete('*', ensureAuthenticated);

    router.get('/', function (req, res/*, next*/) {
        res.json({
            current_user_url: getFullUrl(req, '/user'), //jshint ignore: line
            organization_url: getFullUrl(req, '/orgs/{org}'), //jshint ignore: line
            project_url: getFullUrl(req, '/projects/{owner}/{project}'), //jshint ignore: line
            user_url: getFullUrl(req, '/users/{user}'), //jshint ignore: line
            api_documentation_url: req.protocol + '://' + req.headers.host + apiDocumentationMountPoint, //jshint ignore: line
            source_code_documentation_url: req.protocol + '://' + req.headers.host + '/docs/source/index.html'//jshint ignore: line
        });
    });

    function putUser(receivedData, req, res, next) {
        var userId = getUserId(req);

        gmeAuth.getUser(userId, function (err, data) {
            if (err) {
                res.status(404);
                res.json({
                    message: 'Requested resource was not found',
                    error: err
                });
                return;
            }

            if (!data.siteAdmin) {
                res.status(403);
                return next(new Error('site admin role is required for this operation'));
            }

            // we may need to check if this user can create other ones.
            gmeAuth.addUser(receivedData.userId,
                receivedData.email,
                receivedData.password,
                receivedData.canCreate === 'true' || receivedData.canCreate === true,
                {overwrite: false},
                function (err/*, updateData*/) {
                    if (err) {
                        res.status(400);
                        return next(new Error(err));
                    }

                    gmeAuth.getUser(receivedData.userId, function (err, data) {
                        if (err) {
                            res.status(404);
                            res.json({
                                message: 'Requested resource was not found',
                                error: err
                            });
                            return;
                        }

                        res.json(data);
                    });
                });
        });
    }

    function ensureSameUserOrSiteAdmin(req, res) {
        var userId = getUserId(req);

        return gmeAuth.getUser(userId)
            .then(function (userData) {
                if (userData.siteAdmin || userId === req.params.username) {
                    return userData;
                } else {
                    res.status(403);
                    throw new Error('site admin role is required for this operation');
                }
            });
    }

    /**
     * Should be called when user is already authenticated but does not exist in the gmeAuth db.
     * Used mainly to store the settings of the user.
     * @param userId
     * @param callback
     * @returns {*}
     */
    function getOrAddUser(userId, callback) {
        var deferred = Q.defer();
        gmeAuth.getUser(userId)
            .then(function (userData) {
                deferred.resolve(userData);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such user') === 0) {
                    logger.info('Authenticated user did not exist in db, adding:', userId);
                    gmeAuth.addUser(userId, 'em@il', 'wordpass', false, {overwrite: false})
                        .then(function (userData) {
                            return gmeAuth.getUser(userId);
                        })
                        .then(deferred.resolve)
                        .catch(deferred.reject);
                } else {
                    deferred.reject(err);
                }
            });

        return deferred.promise.nodeify(callback);
    }

    // AUTHENTICATED
    router.get('/user', ensureAuthenticated, function (req, res) {
        var userId = getUserId(req);

        getOrAddUser(userId, function (err, data) {
            if (err) {
                res.status(404);
                res.json({
                    message: 'Requested resource was not found',
                    error: err
                });
                return;
            }

            res.json(data);
        });

    });

    // Example: curl -i -H "Content-Type: application/json" -X PATCH
    //  -d "{\"email\":\"asdf@alkfm.com\",\"canCreate\":false}" http://demo:demo@127.0.0.1:8888/api/v1/user
    router.patch('/user', function (req, res, next) {
        var userId = getUserId(req);

        gmeAuth.getUser(userId, function (err, data) {
            var receivedData;
            if (err) {
                res.status(404);
                res.json({
                    message: 'Requested resource was not found',
                    error: err
                });
                return;
            }

            receivedData = req.body;

            if (receivedData.hasOwnProperty('siteAdmin') && !data.siteAdmin) {
                res.status(403);
                return next(new Error('setting siteAdmin property requires site admin role'));
            }

            gmeAuth.updateUser(userId, receivedData, function (err, userData) {
                if (err) {
                    res.status(404);
                    res.json({
                        message: 'Requested resource was not found',
                        error: err
                    });
                    return;
                }

                res.json(userData);
            });
        });
    });

    router.delete('/user', function (req, res/*, next*/) {
        var userId = getUserId(req);

        gmeAuth.deleteUser(userId, false, function (err) {
            if (err) {
                res.status(404);
                res.json({
                    message: 'Requested resource was not found',
                    error: err
                });
                return;
            }

            res.sendStatus(204);
        });
    });

    router.get('/user/data', ensureAuthenticated, function (req, res, next) {
        var userId = getUserId(req);

        gmeAuth.getUser(userId)
            .then(function (userData) {
                res.json(userData.data);
            })
            .catch(next);
    });

    router.put('/user/data', function (req, res, next) {
        var userId = getUserId(req);

        gmeAuth.updateUserDataField(userId, req.body, true)
            .then(function (data) {
                res.json(data);
            })
            .catch(next);
    });

    router.patch('/user/data', function (req, res, next) {
        var userId = getUserId(req);

        gmeAuth.updateUserDataField(userId, req.body)
            .then(function (data) {
                res.json(data);
            })
            .catch(next);
    });

    router.delete('/user/data', function (req, res, next) {
        var userId = getUserId(req);

        gmeAuth.updateUserDataField(userId, {}, true)
            .then(function (/*data*/) {
                res.sendStatus(204);
            })
            .catch(next);
    });

    router.get('/user/token', ensureAuthenticated, function (req, res, next) {
        var userId = getUserId(req);

        if (gmeConfig.authentication.enable === false) {
            res.status(404);
            res.json({
                message: 'Authentication is turned off',
            });
            return;
        }

        if (req.userData.token && req.userData.newToken === true) {
            res.status(200);
            res.json({
                webgmeToken: req.userData.token
            });
        } else {
            getNewJWToken(userId)
                .then(function (token) {
                    res.status(200);
                    res.json({webgmeToken: token});
                })
                .catch(function (err) {
                    next(err);
                });
        }
    });

    router.get('/componentSettings', ensureAuthenticated, function (req, res, next) {
        var componentsPath = path.join(process.cwd(), 'config', 'components.json');
        logger.debug('Reading in default componentSettings at:', componentsPath);
        // TODO: Consider using a file watcher and cache the file between updates..

        Q.nfcall(fs.readFile, componentsPath, 'utf8')
            .then(function (content) {
                res.json(JSON.parse(content));
            })
            .catch(function (err) {
                if (err.code === 'ENOENT') {
                    logger.debug('File did not exist returning empty obj', componentsPath);
                    res.json({});
                } else {
                    logger.error('Errors reading in: ', componentsPath, err);
                    next(err);
                }
            });
    });

    router.get('/componentSettings/:componentId', ensureAuthenticated, function (req, res, next) {
        var componentsPath = path.join(process.cwd(), 'config', 'components.json');
        logger.debug('Reading in default componentSettings at:', componentsPath);
        // TODO: Consider using a file watcher and cache the file between updates..

        Q.nfcall(fs.readFile, componentsPath, 'utf8')
            .then(function (content) {
                var contentObj = JSON.parse(content);
                res.json(contentObj[req.params.componentId] || {});
            })
            .catch(function (err) {
                if (err.code === 'ENOENT') {
                    logger.debug('File did not exist returning empty obj', componentsPath);
                    res.json({});
                } else {
                    logger.error('Errors reading in: ', componentsPath, err);
                    next(err);
                }
            });
    });

    router.get('/user/settings', ensureAuthenticated, function (req, res, next) {
        var userId = getUserId(req);

        getOrAddUser(userId)
            .then(function (userData) {
                res.json(userData.settings || {});
            })
            .catch(next);
    });

    router.put('/user/settings', function (req, res, next) {
        var userId = getUserId(req);

        getOrAddUser(userId)
            .then(function (/*userData*/) {
                return gmeAuth.updateUserSettings(userId, req.body, true);
            })
            .then(function (settings) {
                res.json(settings);
            })
            .catch(next);
    });

    router.patch('/user/settings', function (req, res, next) {
        var userId = getUserId(req);

        getOrAddUser(userId)
            .then(function (/*userData*/) {
                return gmeAuth.updateUserSettings(userId, req.body);
            })
            .then(function (settings) {
                res.json(settings);
            })
            .catch(next);
    });

    router.delete('/user/settings', function (req, res, next) {
        var userId = getUserId(req);

        getOrAddUser(userId)
            .then(function (/*userData*/) {
                return gmeAuth.updateUserSettings(userId, {}, true);
            })
            .then(function (settings) {
                res.sendStatus(204);
            })
            .catch(next);
    });

    router.get('/user/settings/:componentId', ensureAuthenticated, function (req, res, next) {
        var userId = getUserId(req);

        getOrAddUser(userId)
            .then(function (userData) {
                res.json(userData.settings[req.params.componentId] || {});
            })
            .catch(next);
    });

    router.put('/user/settings/:componentId', function (req, res, next) {
        var userId = getUserId(req);
        getOrAddUser(userId)
            .then(function (/*userData*/) {
                return gmeAuth.updateUserComponentSettings(userId, req.params.componentId, req.body, true);
            })
            .then(function (settings) {
                res.json(settings);
            })
            .catch(next);
    });

    router.patch('/user/settings/:componentId', function (req, res, next) {
        var userId = getUserId(req);
        getOrAddUser(userId)
            .then(function (/*userData*/) {
                return gmeAuth.updateUserComponentSettings(userId, req.params.componentId, req.body);
            })
            .then(function (settings) {
                res.json(settings);
            })
            .catch(next);
    });

    router.delete('/user/settings/:componentId', function (req, res, next) {
        var userId = getUserId(req);
        getOrAddUser(userId)
            .then(function (/*userData*/) {
                return gmeAuth.updateUserComponentSettings(userId, req.params.componentId, {}, true);
            })
            .then(function (/*settings*/) {
                res.sendStatus(204);
            })
            .catch(next);
    });

    router.get('/users', function (req, res) {

        gmeAuth.listUsers(null, function (err, data) {
            if (err) {
                res.status(404);
                res.json({
                    message: 'Requested resource was not found',
                    error: err
                });
                return;
            }

            res.json(data);
        });
    });

    router.put('/users', function (req, res, next) {
        //"userId"
        //"email": "user@example.com",
        //"password": "pass",
        //"canCreate": null,

        putUser(req.body, req, res, next);
    });

    router.get('/users/:username', function (req, res) {

        gmeAuth.getUser(req.params.username, function (err, data) {
            if (err || !data) {
                res.status(404);
                res.json({
                    message: 'Requested resource was not found',
                    error: err
                });
                return;
            }

            res.json(data);
        });
    });

    router.put('/users/:username', function (req, res, next) {
        var receivedData = {
            userId: req.params.username,
            email: req.body.email,
            password: req.body.password,
            canCreate: req.body.canCreate || false,
            data: req.body.data || {}
        };

        putUser(receivedData, req, res, next);
    });

    router.patch('/users/:username', function (req, res, next) {
        // body params
        //"email": "user@example.com",
        //"password": "pass",
        //"canCreate": null,
        //"siteAdmin": false,
        //"data": {}
        ensureSameUserOrSiteAdmin(req, res)
            .then(function (userData) {
                if (req.body.hasOwnProperty('siteAdmin') && userData.siteAdmin !== true) {
                    res.status(403);
                    throw new Error('setting siteAdmin property requires site admin role');
                }

                return gmeAuth.updateUser(req.params.username, req.body);
            })
            .then(function (userData) {
                res.json(userData);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such user [' + req.params.username) === 0) {
                    //TODO: why is this 400 and not 404?
                    res.status(400);
                }

                next(err);
            });
    });

    router.delete('/users/:username', function (req, res, next) {
        ensureSameUserOrSiteAdmin(req, res)
            .then(function () {
                return gmeAuth.deleteUser(req.params.username);
            })
            .then(function () {
                res.sendStatus(204);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such user') > -1) {
                    res.status(404);
                }

                next(err);
            });
    });

    router.get('/users/:username/data', function (req, res) {
        // TODO: Should data be hidden from other (non-siteAdmin) users?
        gmeAuth.getUser(req.params.username, function (err, userData) {
            if (err) {
                res.status(404);
                res.json({
                    message: 'Requested resource was not found',
                    error: err
                });
                return;
            }

            res.json(userData.data);
        });
    });

    router.put('/users/:username/data', function (req, res, next) {
        ensureSameUserOrSiteAdmin(req, res)
            .then(function () {
                return gmeAuth.updateUserDataField(req.params.username, req.body, true);
            })
            .then(function (data) {
                res.json(data);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such user [' + req.params.username) === 0) {
                    res.status(404);
                }

                next(err);
            });
    });

    router.patch('/users/:username/data', function (req, res, next) {
        ensureSameUserOrSiteAdmin(req, res)
            .then(function () {
                return gmeAuth.updateUserDataField(req.params.username, req.body);
            })
            .then(function (data) {
                res.json(data);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such user [' + req.params.username) === 0) {
                    res.status(404);
                }

                next(err);
            });
    });

    router.delete('/users/:username/data', function (req, res, next) {
        ensureSameUserOrSiteAdmin(req, res)
            .then(function () {
                return gmeAuth.updateUserDataField(req.params.username, {}, true);
            })
            .then(function (/*userData*/) {
                res.sendStatus(204);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such user [' + req.params.username) === 0) {
                    res.status(404);
                }

                next(err);
            });
    });

    router.get('/users/:username/settings', function (req, res) {
        // TODO: Should settings be hidden from other (non-siteAdmin) users?
        gmeAuth.getUser(req.params.username, function (err, userData) {
            if (err) {
                res.status(404);
                res.json({
                    message: 'Requested resource was not found',
                    error: err
                });
                return;
            }

            res.json(userData.settings || {});
        });
    });

    router.put('/users/:username/settings', function (req, res, next) {
        ensureSameUserOrSiteAdmin(req, res)
            .then(function () {
                return gmeAuth.updateUserSettings(req.params.username, req.body, true);
            })
            .then(function (settings) {
                res.json(settings);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such user [' + req.params.username) === 0) {
                    res.status(404);
                }

                next(err);
            });
    });

    router.patch('/users/:username/settings', function (req, res, next) {
        ensureSameUserOrSiteAdmin(req, res)
            .then(function () {
                return gmeAuth.updateUserSettings(req.params.username, req.body);
            })
            .then(function (settings) {
                res.json(settings);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such user [' + req.params.username) === 0) {
                    res.status(404);
                }

                next(err);
            });
    });

    router.delete('/users/:username/settings', function (req, res, next) {
        ensureSameUserOrSiteAdmin(req, res)
            .then(function () {
                return gmeAuth.updateUserSettings(req.params.username, {}, true);
            })
            .then(function (/*settings*/) {
                res.sendStatus(204);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such user [' + req.params.username) === 0) {
                    res.status(404);
                }

                next(err);
            });
    });

    router.get('/users/:username/settings/:componentId', function (req, res) {
        // TODO: Should settings be hidden from other (non-siteAdmin) users?
        gmeAuth.getUser(req.params.username, function (err, userData) {
            if (err) {
                res.status(404);
                res.json({
                    message: 'Requested resource was not found',
                    error: err
                });
                return;
            }

            res.json(userData.settings[req.params.componentId] || {});
        });
    });

    router.put('/users/:username/settings/:componentId', function (req, res, next) {
        ensureSameUserOrSiteAdmin(req, res)
            .then(function () {
                return gmeAuth.updateUserComponentSettings(req.params.username, req.params.componentId, req.body, true);
            })
            .then(function (settings) {
                res.json(settings);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such user [' + req.params.username) === 0) {
                    res.status(404);
                }

                next(err);
            });
    });

    router.patch('/users/:username/settings/:componentId', function (req, res, next) {
        ensureSameUserOrSiteAdmin(req, res)
            .then(function () {
                return gmeAuth.updateUserComponentSettings(req.params.username, req.params.componentId, req.body);
            })
            .then(function (settings) {
                res.json(settings);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such user [' + req.params.username) === 0) {
                    res.status(404);
                }

                next(err);
            });
    });

    router.delete('/users/:username/settings/:componentId', function (req, res, next) {
        ensureSameUserOrSiteAdmin(req, res)
            .then(function () {
                return gmeAuth.updateUserComponentSettings(req.params.username, req.params.componentId, {}, true);
            })
            .then(function (/*settings*/) {
                res.sendStatus(204);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such user [' + req.params.username) === 0) {
                    res.status(404);
                }

                next(err);
            });
    });

    //ORGANIZATIONS
    function ensureOrgOrSiteAdmin(req, res) {
        //TODO: Could this be handled like ensureAuthenticated?
        var userId = getUserId(req),
            userData;

        return gmeAuth.getUser(userId)
            .then(function (data) {
                userData = data;
                return gmeAuth.getAdminsInOrganization(req.params.orgId);
            })
            .then(function (admins) {
                if (!userData.siteAdmin && admins.indexOf(userId) === -1) {
                    res.status(403);
                    throw new Error('site admin role or organization admin is required for this operation');
                }
            });
    }

    router.get('/orgs', function (req, res, next) {
        gmeAuth.listOrganizations(null)
            .then(function (data) {
                res.json(data);
            })
            .catch(function (err) {
                next(err);
            });
    });

    router.put('/orgs/:orgId', function (req, res, next) {

        var userId = getUserId(req);

        gmeAuth.getUser(userId)
            .then(function (data) {
                if (!(data.siteAdmin || data.canCreate)) {
                    res.status(403);
                    throw new Error('site admin role or can create is required for this operation');
                }

                return gmeAuth.addOrganization(req.params.orgId, req.body.info);
            })
            .then(function () {
                return gmeAuth.setAdminForUserInOrganization(userId, req.params.orgId, true);
            })
            .then(function () {
                return gmeAuth.addUserToOrganization(userId, req.params.orgId);
            })
            .then(function () {
                return gmeAuth.getOrganization(req.params.orgId);
            })
            .then(function (orgData) {
                res.json(orgData);
            })
            .catch(function (err) {
                if (err.message.indexOf('user or org already exists') > -1) {
                    res.status(400);
                }

                next(err);
            });
    });

    router.get('/orgs/:orgId', function (req, res, next) {
        gmeAuth.getOrganization(req.params.orgId)
            .then(function (data) {
                res.json(data);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such organization [') > -1) {
                    res.status(404);
                }
                next(err);
            });
    });

    router.delete('/orgs/:orgId', function (req, res, next) {
        ensureOrgOrSiteAdmin(req, res)
            .then(function () {
                return gmeAuth.removeOrganizationByOrgId(req.params.orgId);
            })
            .then(function () {
                res.sendStatus(204);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such organization [') > -1) {
                    res.status(404);
                }
                next(err);
            });
    });

    router.put('/orgs/:orgId/users/:username', function (req, res, next) {
        ensureOrgOrSiteAdmin(req, res)
            .then(function () {
                return gmeAuth.addUserToOrganization(req.params.username, req.params.orgId);
            })
            .then(function () {
                res.sendStatus(204);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such organization [') > -1 ||
                    err.message.indexOf('no such user [') > -1) {
                    res.status(404);
                }
                next(err);
            });
    });

    router.delete('/orgs/:orgId/users/:username', function (req, res, next) {
        ensureOrgOrSiteAdmin(req, res)
            .then(function () {
                return gmeAuth.removeUserFromOrganization(req.params.username, req.params.orgId);
            })
            .then(function () {
                res.sendStatus(204);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such organization [') > -1) {
                    res.status(404);
                }
                next(err);
            });
    });

    router.put('/orgs/:orgId/admins/:username', function (req, res, next) {
        ensureOrgOrSiteAdmin(req, res)
            .then(function () {
                return gmeAuth.setAdminForUserInOrganization(req.params.username, req.params.orgId, true);
            })
            .then(function () {
                res.sendStatus(204);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such organization [') > -1 ||
                    err.message.indexOf('no such user [') > -1) {
                    res.status(404);
                }
                next(err);
            });
    });

    router.delete('/orgs/:orgId/admins/:username', function (req, res, next) {
        ensureOrgOrSiteAdmin(req, res)
            .then(function () {
                return gmeAuth.setAdminForUserInOrganization(req.params.username, req.params.orgId, false);
            })
            .then(function () {
                res.sendStatus(204);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such organization [') > -1 ||
                    err.message.indexOf('no such user [') > -1) {
                    res.status(404);
                }
                next(err);
            });
    });

    // PROJECTS

    function loadNodePathByCommitHash(userId, projectId, commitHash, path) {
        var getCommitParams = {
            username: userId,
            projectId: projectId,
            number: 1,
            before: commitHash
        };

        return safeStorage.getCommits(getCommitParams)
            .then(function (commits) {
                var loadPathsParams = {
                    projectId: projectId,
                    username: userId,
                    pathsInfo: [
                        {
                            parentHash: commits[0].root,
                            path: path
                        }
                    ],
                    excludeParents: true
                };

                return safeStorage.loadPaths(loadPathsParams);
            })
            .then(function (dataObjects) {
                var hashes = Object.keys(dataObjects);
                if (hashes.length === 1) {
                    return dataObjects[hashes[0]];
                } else if (hashes.length === 0) {
                    throw new Error('Path does not exist ' + path);
                } else {
                    // This should never happen..
                    throw new Error('safeStorage.loadPaths returned with more than one object');
                }
            });
    }

    function canUserAuthorizeProject(req) {
        var userId = getUserId(req);

        return gmeAuth.getUser(userId)
            .then(function (userData) {
                // Make sure user is authorized (owner, admin in owner Org or siteAdmin).
                if (userId === req.params.ownerId || userData.siteAdmin === true) {
                    return true;
                } else {
                    return gmeAuth.getOrganization(req.params.ownerId)
                        .then(function (orgData) {
                            if (orgData.admins.indexOf(userId) > -1) {
                                return true;
                            }

                            return false;
                        })
                        .catch(function (err) {
                            logger.debug(err);
                            return false;
                        });
                }
            });
    }

    router.get('/projects', ensureAuthenticated, function (req, res, next) {
        var userId = getUserId(req);
        safeStorage.getProjects({username: userId, info: true})
            .then(function (result) {
                res.json(result);
            })
            .catch(function (err) {
                next(err);
            });
    });

    router.get('/projects/:ownerId/:projectName', ensureAuthenticated, function (req, res, next) {
        var userId = getUserId(req),
            projectId = StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId, req.params.projectName),
            data = {
                username: userId,
                projectId: projectId
            },
            branches;

        safeStorage.getBranches(data)
            .then(function (branches_) {
                branches = branches_;
                return metadataStorage.getProject(projectId);
            })
            .then(function (projectData) {
                projectData.branches = branches;
                res.json(projectData);
            })
            .catch(function (err) {
                next(err);
            });
    });

    router.patch('/projects/:ownerId/:projectName', function (req, res, next) {
        var userId = getUserId(req),
            projectAuthParams = {
                entityType: authorizer.ENTITY_TYPES.PROJECT
            },
            projectId = StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId, req.params.projectName);

        authorizer.getAccessRights(userId, projectId, projectAuthParams)
            .then(function (projectAccess) {
                if (projectAccess && projectAccess.write) {
                    return;
                } else {
                    res.status(403);
                    throw new Error('Not authorized to modify project');
                }
            })
            .then(function () {
                return metadataStorage.updateProjectInfo(projectId, req.body);
            })
            .then(function (projectData) {
                res.json(projectData);
            })
            .catch(function (err) {
                next(err);
            });
    });
    /**
     * Creating project by seed
     *
     * @param {string} req.body.type - sets if the seed is coming from file (==='file') source or from some
     *  existing project(==='db').
     * @param {string} req.body.seedName - the name or rather id of the seed
     *          db - projectId
     *          seed - name of the seed-file (no extension - matches json file)
     * @param {string} [req.body.seedBranch='master'] - for 'db' optional branch name to seed from.
     * @param {string} [req.body.seedCommit] - for 'db' optional commit-hash to seed from
     * (if given seedBranch is not used).
     *
     * @example {type:'file', seedName:'EmptyProject'}
     * @example {type:'db', seedName:'me+myOldProject', seedBranch:'release'}
     */
    router.put('/projects/:ownerId/:projectName', function (req, res, next) {
        var userId = getUserId(req),
            command = req.body;

        command.command = 'seedProject';
        command.userId = userId;
        command.ownerId = req.params.ownerId;
        command.projectName = req.params.projectName;

        getNewJWToken(userId)
            .then(function (token) {
                command.webgmeToken = token;
                return Q.nfcall(middlewareOpts.workerManager.request, command);
            })
            .then(function () {
                res.sendStatus(204);
            })
            .catch(function (err) {
                next(new Error(err));
            }); //TODO do we need special error handling???
    });

    router.delete('/projects/:ownerId/:projectName', function (req, res, next) {
        var userId = getUserId(req),
            data = {
                username: userId,
                projectId: StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId, req.params.projectName)
            };

        safeStorage.deleteProject(data)
            .then(function () {
                res.sendStatus(204);
            })
            .catch(function (err) {
                next(err);
            });
    });

    router.put('/projects/:ownerId/:projectName/authorize/:userOrOrgId/:rights', function (req, res, next) {
        var projectId = StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId, req.params.projectName),
            projectAuthParams = {
                entityType: authorizer.ENTITY_TYPES.PROJECT
            };

        canUserAuthorizeProject(req)
            .then(function (isAuthorized) {
                if (isAuthorized === false) {
                    res.status(403);
                    throw new Error('Not allowed to authorize users/organizations for project');
                }
                // ensure project exists
                return metadataStorage.getProject(projectId);
            })
            .then(function (/*projectData*/) {
                var rights = {
                    read: req.params.rights.indexOf('r') !== -1,
                    write: req.params.rights.indexOf('w') !== -1,
                    delete: req.params.rights.indexOf('d') !== -1
                };

                return authorizer.setAccessRights(req.params.userOrOrgId, projectId, rights, projectAuthParams);
            })
            .then(function () {
                res.sendStatus(204);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such user or org') > -1 || err.message.indexOf('no such project') > -1) {
                    res.status(404);
                }
                next(err);
            });
    });

    router.delete('/projects/:ownerId/:projectName/authorize/:userOrOrgId', function (req, res, next) {
        var projectId = StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId, req.params.projectName),
            projectAuthParams = {
                entityType: authorizer.ENTITY_TYPES.PROJECT
            };

        canUserAuthorizeProject(req)
            .then(function (isAuthorized) {
                if (isAuthorized === false) {
                    res.status(403);
                    throw new Error('Not allowed to authorize users/organizations for project');
                }
                // ensure project exists
                return metadataStorage.getProject(projectId);
            })
            .then(function (/*projectData*/) {
                return authorizer.setAccessRights(req.params.userOrOrgId, projectId,
                    {read: false, write: false, delete: false}, projectAuthParams);
            })
            .then(function () {
                res.sendStatus(204);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such user or org') > -1 || err.message.indexOf('no such project') > -1) {
                    res.status(404);
                }
                next(err);
            });
    });

    router.post('/projects/:ownerId/:projectName/transfer/:userOrOrgId', function (req, res, next) {
        var newOwnerId = req.params.userOrOrgId,
            projectId = StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId, req.params.projectName),
            userId = getUserId(req),
            data = {
                newOwnerId: newOwnerId,
                projectId: projectId,
                username: userId
            };

        safeStorage.transferProject(data)
            .then(function (newProjectId) {
                return metadataStorage.getProject(newProjectId);
            })
            .then(function (projectData) {
                res.json(projectData);
            })
            .catch(function (err) {
                if (err.message.toLowerCase().indexOf('no such') > -1) {
                    res.status(404);
                } else if (err.message.toLowerCase().indexOf('not authorized') > -1) {
                    res.status(403);
                }
                next(err);
            });
    });

    router.get('/projects/:ownerId/:projectName/commits', ensureAuthenticated, function (req, res, next) {
        var userId = getUserId(req),
            data = {
                username: userId,
                projectId: StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId,
                    req.params.projectName),
                before: (new Date()).getTime(), // current time
                number: parseInt(req.query.n, 10) || 100 // asks for the last 100 commits from the time specified above
            };

        safeStorage.getCommits(data)
            .then(function (result) {
                res.json(result);
            })
            .catch(function (err) {
                next(err);
            });
    });

    router.get('/projects/:ownerId/:projectName/commits/:commitHash', ensureAuthenticated, function (req, res, next) {
        var userId = getUserId(req),
            commitHash = StorageUtil.getHashTaggedHash(req.params.commitHash),
            data = {
                username: userId,
                projectId: StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId,
                    req.params.projectName),
                before: commitHash,
                number: 1
            };

        safeStorage.getCommits(data)
            .then(function (result) {
                res.json(result[0]);
            })
            .catch(function (err) {
                if (err.message.indexOf('not exist') > -1 || err.message.indexOf('Not authorized to read') > -1) {
                    err.status = 404;
                }
                next(err);
            });
    });

    router.get('/projects/:ownerId/:projectName/commits/:commitHash/tree/*', ensureAuthenticated,
        function (req, res, next) {
            var userId = getUserId(req),
                projectId = StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId,
                    req.params.projectName),
                commitHash = StorageUtil.getHashTaggedHash(req.params.commitHash);

            loadNodePathByCommitHash(userId, projectId, commitHash, '/' + req.params[0])
                .then(function (nodeObj) {
                    res.json(nodeObj);
                })
                .catch(function (err) {
                    if (err.message.indexOf('not exist') > -1 || err.message.indexOf('Not authorized to read') > -1) {
                        err.status = 404;
                    }
                    next(err);
                });
        }
    );

    router.get('/projects/:ownerId/:projectName/compare/:branchOrCommitA...:branchOrCommitB',
        ensureAuthenticated,
        function (req, res, next) {
            var userId = getUserId(req),
                loggerCompare = logger.fork('compare'),
                data = {
                    username: userId,
                    projectId: StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId,
                        req.params.projectName)
                };

            safeStorage.openProject(data)
                .then(function (project) {

                    return merge.diff({
                        project: project,
                        branchOrCommitA: req.params.branchOrCommitA,
                        branchOrCommitB: req.params.branchOrCommitB,
                        logger: loggerCompare,
                        gmeConfig: gmeConfig

                    });

                })
                .then(function (diff) {
                    res.json(diff);
                })
                .catch(function (err) {
                    next(err);
                });
        });

    router.get('/projects/:ownerId/:projectName/branches', ensureAuthenticated, function (req, res, next) {
        var userId = getUserId(req),
            data = {
                username: userId,
                projectId: StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId, req.params.projectName)
            };

        safeStorage.getBranches(data)
            .then(function (result) {
                res.json(result);
            })
            .catch(function (err) {
                next(err);
            });
    });

    router.get('/projects/:ownerId/:projectName/branches/:branchId', ensureAuthenticated, function (req, res, next) {
        var userId = getUserId(req),
            data = {
                username: userId,
                projectId: StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId,
                    req.params.projectName),
                branchName: req.params.branchId
            };

        safeStorage.getLatestCommitData(data)
            .then(function (result) {
                res.json(result);
            })
            .catch(function (err) {
                if (err.message.indexOf('not exist') > -1) {
                    err.status = 404;
                }
                next(err);
            });
    });

    router.patch('/projects/:ownerId/:projectName/branches/:branchId', function (req, res, next) {
        var userId = getUserId(req),
            data = {
                username: userId,
                projectId: StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId,
                    req.params.projectName),
                branchName: req.params.branchId,
                oldHash: req.body.oldHash,
                newHash: req.body.newHash
            };

        safeStorage.setBranchHash(data)
            .then(function () {
                res.sendStatus(200);
            })
            .catch(function (err) {
                next(err);
            });
    });

    router.put('/projects/:ownerId/:projectName/branches/:branchId', function (req, res, next) {
        var userId = getUserId(req),
            data = {
                username: userId,
                projectId: StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId,
                    req.params.projectName),
                branchName: req.params.branchId,
                hash: req.body.hash
            };

        safeStorage.createBranch(data)
            .then(function () {
                res.sendStatus(201);
            })
            .catch(function (err) {
                next(err);
            });
    });

    router.delete('/projects/:ownerId/:projectName/branches/:branchId', function (req, res, next) {
        var userId = getUserId(req),
            data = {
                username: userId,
                projectId: StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId,
                    req.params.projectName),
                branchName: req.params.branchId
            };

        safeStorage.deleteBranch(data)
            .then(function () {
                res.sendStatus(204);
            })
            .catch(function (err) {
                next(err);
            });
    });

    router.get('/projects/:ownerId/:projectName/branches/:branchId/commits', ensureAuthenticated,
        function (req, res, next) {
            var userId = getUserId(req),
                data = {
                    username: userId,
                    projectId: StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId,
                        req.params.projectName),
                    start: req.params.branchId,
                    number: parseInt(req.query.n, 10) || 100
                };

            safeStorage.getHistory(data)
                .then(function (result) {
                    res.json(result);
                })
                .catch(function (err) {
                    if (err.message.indexOf('not exist') > -1) {
                        err.status = 404;
                    }
                    next(err);
                });
        }
    );

    router.get('/projects/:ownerId/:projectName/branches/:branchId/tree/*', ensureAuthenticated,
        function (req, res, next) {
            var userId = getUserId(req),
                projectId = StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId,
                    req.params.projectName),
                data = {
                    username: userId,
                    projectId: projectId,
                    branchName: req.params.branchId
                };

            safeStorage.getBranchHash(data)
                .then(function (branchHash) {
                    if (!branchHash) {
                        throw new Error('Branch does not exist ' + req.params.branchId);
                    }
                    return loadNodePathByCommitHash(userId, projectId, branchHash, '/' + req.params[0]);
                })
                .then(function (dataObj) {
                    res.json(dataObj);
                })
                .catch(function (err) {
                    if (err.message.indexOf('not exist') > -1 || err.message.indexOf('Not authorized to read') > -1) {
                        err.status = 404;
                    }
                    next(err);
                });
        }
    );

    router.get('/projects/:ownerId/:projectName/tags', ensureAuthenticated, function (req, res, next) {
        var userId = getUserId(req),
            data = {
                username: userId,
                projectId: StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId, req.params.projectName)
            };

        safeStorage.getTags(data)
            .then(function (result) {
                res.json(result);
            })
            .catch(function (err) {
                next(err);
            });
    });

    router.get('/projects/:ownerId/:projectName/tags/:tagId', ensureAuthenticated, function (req, res, next) {
        var userId = getUserId(req),
            data = {
                username: userId,
                projectId: StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId, req.params.projectName)
            };

        safeStorage.getTags(data)
            .then(function (result) {
                if (result.hasOwnProperty(req.params.tagId) === true) {
                    res.redirect(req.baseUrl + '/projects/' + req.params.ownerId + '/' + req.params.projectName +
                        '/commits/' + result[req.params.tagId].substring(1));
                } else {
                    res.sendStatus(404);
                }
            })
            .catch(function (err) {
                next(err);
            });
    });

    router.put('/projects/:ownerId/:projectName/tags/:tagId', function (req, res, next) {
        var userId = getUserId(req),
            data = {
                username: userId,
                projectId: StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId,
                    req.params.projectName),
                tagName: req.params.tagId,
                commitHash: req.body.hash
            };

        safeStorage.createTag(data)
            .then(function () {
                res.sendStatus(201);
            })
            .catch(function (err) {
                next(err);
            });
    });

    router.patch('/projects/:ownerId/:projectName/tags/:tagId', function (req, res, next) {
        var userId = getUserId(req),
            data = {
                username: userId,
                projectId: StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId,
                    req.params.projectName),
                tagName: req.params.tagId,
                commitHash: req.body.hash
            };

        safeStorage.deleteTag(data)
            .then(function () {
                return safeStorage.createTag(data);
            })
            .then(function () {
                res.sendStatus(200);
            })
            .catch(function (err) {
                next(err);
            });
    });

    router.delete('/projects/:ownerId/:projectName/tags/:tagId', function (req, res, next) {
        var userId = getUserId(req),
            data = {
                username: userId,
                projectId: StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId,
                    req.params.projectName),
                tagName: req.params.tagId
            };

        safeStorage.deleteTag(data)
            .then(function () {
                res.sendStatus(204);
            })
            .catch(function (err) {
                next(err);
            });
    });

    // webHooks
    router.get('/projects/:ownerId/:projectName/hooks', ensureAuthenticated, function (req, res, next) {
        var projectId = StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId, req.params.projectName),
            userId = getUserId(req),
            projectAuthParams = {
                entityType: authorizer.ENTITY_TYPES.PROJECT
            };

        authorizer.getAccessRights(userId, projectId, projectAuthParams)
            .then(function (projectAccess) {

                if (projectAccess && projectAccess.read) {
                    return metadataStorage.getProject(projectId);
                }

                res.status(403);
                throw new Error('Not authorized to read project [' + projectId + ']');
            })
            .then(function (projectData) {
                res.json(projectData.hooks || {});
            })
            .catch(function (err) {
                if (err.message.indexOf('no such project') > -1) {
                    res.status(404);
                }

                next(err);
            });
    });

    router.get('/projects/:ownerId/:projectName/hooks/:hookId', ensureAuthenticated, function (req, res, next) {
        var projectId = StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId, req.params.projectName),
            userId = getUserId(req),
            projectAuthParams = {
                entityType: authorizer.ENTITY_TYPES.PROJECT
            };

        authorizer.getAccessRights(userId, projectId, projectAuthParams)
            .then(function (projectAccess) {

                if (projectAccess && projectAccess.read) {
                    return metadataStorage.getProject(projectId);
                }

                res.status(403);
                throw new Error('Not authorized to read project [' + projectId + ']');
            })
            .then(function (projectData) {
                if (projectData.hooks && projectData.hooks[req.params.hookId]) {
                    res.json(projectData.hooks[req.params.hookId]);
                } else {
                    res.sendStatus(404);
                }
            })
            .catch(function (err) {
                if (err.message.indexOf('no such project') > -1) {
                    res.status(404);
                }

                next(err);
            });
    });

    router.put('/projects/:ownerId/:projectName/hooks/:hookId', ensureAuthenticated, function (req, res, next) {
        var projectId = StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId, req.params.projectName),
            projectData,
            userId = getUserId(req),
            projectAuthParams = {
                entityType: authorizer.ENTITY_TYPES.PROJECT
            };

        authorizer.getAccessRights(userId, projectId, projectAuthParams)
            .then(function (projectAccess) {
                if (projectAccess && projectAccess.write) {
                    return metadataStorage.getProject(projectId);
                }

                res.status(403);
                throw new Error('Not authorized to modify project [' + projectId + ']');
            })
            .then(function (projectData_) {
                var now = (new Date()).toISOString();

                projectData = projectData_;
                if (projectData.hooks && projectData.hooks[req.params.hookId]) {
                    res.status(403);
                    throw new Error('Hook \'' + req.params.hookId + '\' already exists for this project!');
                } else {
                    projectData.hooks = projectData.hooks || {};

                    //fill out default information:
                    // TODO do we need some checking for a minimal syntax???
                    if (req.body.active !== false) {
                        req.body.active = true;
                    }
                    req.body.createdAt = now;
                    req.body.updatedAt = now;
                    projectData.hooks[req.params.hookId] = req.body;

                    return metadataStorage.updateProjectHooks(projectId, projectData.hooks);
                }
            })
            .then(function () {
                res.json(projectData.hooks[req.params.hookId]);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such project') > -1) {
                    res.status(404);
                }
                next(err);
            });
    });

    router.patch('/projects/:ownerId/:projectName/hooks/:hookId', ensureAuthenticated, function (req, res, next) {
        var projectId = StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId, req.params.projectName),
            projectData,
            userId = getUserId(req),
            projectAuthParams = {
                entityType: authorizer.ENTITY_TYPES.PROJECT
            };

        authorizer.getAccessRights(userId, projectId, projectAuthParams)
            .then(function (projectAccess) {

                if (projectAccess && projectAccess.write) {
                    return metadataStorage.getProject(projectId);
                }

                res.status(403);
                throw new Error('Not authorized to modify project [' + projectId + ']');
            })
            .then(function (projectData_) {
                var now = (new Date()).toISOString(),
                    hook;

                projectData = projectData_;
                if (projectData.hooks && projectData.hooks[req.params.hookId]) {
                    hook = projectData.hooks[req.params.hookId];

                    hook.events = req.body.events || hook.events;
                    hook.description = req.body.description || hook.description;
                    hook.url = req.body.url || hook.url;
                    if (req.body.active === true || req.body.active === false) {
                        hook.active = req.body.active;
                    }
                    req.body.updatedAt = now;

                    return metadataStorage.updateProjectHooks(projectId, projectData.hooks);
                } else {
                    res.status(404);
                    throw new Error('Cannot updated unknown [' + req.params.hookId + '] hook!');
                }
            })
            .then(function () {
                res.json(projectData.hooks[req.params.hookId]);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such project') > -1) {
                    res.status(404);
                }
                next(err);
            });
    });

    router.delete('/projects/:ownerId/:projectName/hooks/:hookId', ensureAuthenticated, function (req, res, next) {
        var projectId = StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId, req.params.projectName),
            projectData,
            userId = getUserId(req),
            projectAuthParams = {
                entityType: authorizer.ENTITY_TYPES.PROJECT
            };

        authorizer.getAccessRights(userId, projectId, projectAuthParams)
            .then(function (projectAccess) {

                if (projectAccess && projectAccess.write) {
                    return metadataStorage.getProject(projectId);
                }

                res.status(403);
                throw new Error('Not authorized to modify project [' + projectId + ']');
            })
            .then(function (projectData_) {
                projectData = projectData_;
                if (projectData.hooks && projectData.hooks[req.params.hookId]) {
                    delete projectData.hooks[req.params.hookId];

                    return metadataStorage.updateProjectHooks(projectId, projectData.hooks);
                } else {
                    res.status(404);
                    throw new Error('Cannot delete unknown [' + req.params.hookId + '] hook!');
                }
            })
            .then(function () {
                res.json(projectData.hooks);
            })
            .catch(function (err) {
                if (err.message.indexOf('no such project') > -1) {
                    res.status(404);
                }
                next(err);
            });
    });

    // squash
    router.put('/projects/:ownerId/:projectName/squash', ensureAuthenticated, function (req, res, next) {
        var userId = getUserId(req),
            data = {
                username: userId,
                projectId: StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId,
                    req.params.projectName),
                fromCommit: req.body.fromCommit,
                toCommitOrBranch: req.body.toCommitOrBranch,
                message: req.body.message
            };

        safeStorage.squashCommits(data)
            .then(function () {
                res.sendStatus(201);
            })
            .catch(function (err) {
                next(err);
            });
    });

    logger.debug('creating list asset rules');

    router.get('/decorators', ensureAuthenticated, function (req, res) {
        var result = webgmeUtils.getComponentNames(gmeConfig.visualization.decoratorPaths);
        logger.debug('/decorators', {metadata: result});
        res.send(result);
    });

    // Plugins
    // TODO: These variables should not be defined here.
    // TODO: runningPlugins should be stored in a database.
    var runningPlugins = {};
    var GUID = requireJS('common/util/guid');
    var PLUGIN_CONSTANTS = {
        RUNNING: 'RUNNING',
        FINISHED: 'FINISHED', // Could still be that result.success=false.
        ERROR: 'ERROR'
    };

    function getPlugin(name) {
        var pluginPath = 'plugin/' + name + '/' + name + '/' + name,
            Plugin,
            error,
            plugin;

        logger.debug('Configuration requested for plugin at', pluginPath);
        try {
            Plugin = requireJS(pluginPath);
        } catch (err) {
            error = err;
        }

        // This is weird, the second time requirejs simply returns with undefined.
        if (Plugin) {
            plugin = new Plugin();
            return plugin;
        } else {
            return error || new Error('Plugin is not available from: ' + pluginPath);
        }

    }

    router.get('/plugins', ensureAuthenticated, function (req, res) {
        var result = webgmeUtils.getComponentNames(gmeConfig.plugin.basePaths);
        logger.debug('/plugins', {metadata: result});
        res.send(result);
    });

    router.get('/plugins/metadata', ensureAuthenticated, function (req, res, next) {
        var pluginNames = webgmeUtils.getComponentNames(gmeConfig.plugin.basePaths),
            result = {},
            promises = [],
            basePath,
            i;

        for (i = 0; i < pluginNames.length; i += 1) {
            basePath = webgmeUtils.getBasePathByName(pluginNames[i], gmeConfig.plugin.basePaths);
            promises.push(Q.nfcall(fs.readFile, path.join(basePath, pluginNames[i], 'metadata.json'), 'utf8'));
        }

        Q.allSettled(promises)
            .then(function (fileRes) {
                for (i = 0; i < fileRes.length; i += 1) {
                    if (fileRes[i].state === 'fulfilled') {
                        try {
                            result[pluginNames[i]] = JSON.parse(fileRes[i].value);
                        } catch (e) {
                            logger.error(e);
                        }
                    } else if (fileRes[i].state === 'rejected') {
                        if (fileRes[i].reason.code === 'ENOENT') {
                            logger.warn('Plugin does not have a metadata.json', pluginNames[i]);
                        } else {
                            logger.error(fileRes[i].reason);
                        }
                    } else {
                        logger.error(new Error('Unknown q promise state'));
                    }

                    result[pluginNames[i]] = result[pluginNames[i]] || null;
                }

                res.json(result);
            })
            .catch(next);
    });

    router.get('/plugin/:pluginId/metadata', ensureAuthenticated, function (req, res, next) {
        var basePath = webgmeUtils.getBasePathByName(req.params.pluginId, gmeConfig.plugin.basePaths);

        if (!basePath) {
            res.sendStatus(404);
            return;
        }

        Q.nfcall(fs.readFile, path.join(basePath, req.params.pluginId, 'metadata.json'), 'utf8')
            .then(function (content) {
                res.json(JSON.parse(content));
            })
            .catch(function (err) {
                if (err.code === 'ENOENT') {
                    res.sendStatus(404);
                } else {
                    next(err);
                }
            });
    });

    router.get('/plugin/:pluginId/config', ensureAuthenticated, function (req, res) {
        var plugin = getPlugin(req.params.pluginId);
        // TODO: In next release this should use metadata
        if (plugin instanceof Error) {
            logger.error(plugin);
            res.sendStatus(404);
        } else {
            res.send(plugin.getDefaultConfig());
        }
    });

    router.get('/plugin/:pluginId/configStructure', ensureAuthenticated, function (req, res) {
        var plugin = getPlugin(req.params.pluginId);
        // TODO: In next release this should use metadata
        if (plugin instanceof Error) {
            logger.error(plugin);
            res.sendStatus(404);
        } else {
            res.send(plugin.getConfigStructure());
        }
    });

    router.post('/plugin/:pluginId/execute', function (req, res, next) {
        var resultId = GUID(),
            userId = getUserId(req),
            pluginContext = {
                managerConfig: {
                    project: req.body.projectId,
                    branchName: req.body.branchName,
                    commit: req.body.commitHash,
                    activeNode: req.body.activeNode,
                    activeSelection: req.body.activeSelection,
                },
                pluginConfig: req.body.pluginConfig
            },
            workerParameters = {
                command: middlewareOpts.workerManager.CONSTANTS.workerCommands.executePlugin,
                name: req.params.pluginId,
                context: pluginContext
            };

        getNewJWToken(userId)
            .then(function (token) {
                workerParameters.webgmeToken = token;

                middlewareOpts.workerManager.request(workerParameters, function (err, result) {
                    if (err) {
                        runningPlugins[resultId].status = PLUGIN_CONSTANTS.ERROR;
                        runningPlugins[resultId].err = err;
                    } else {
                        runningPlugins[resultId].status = PLUGIN_CONSTANTS.FINISHED;
                    }

                    runningPlugins[resultId].result = result;
                    runningPlugins[resultId].timeoutId = setTimeout(function () {
                        logger.warn('Plugin result timed out: ' + gmeConfig.plugin.serverResultTimeout + '[ms]',
                            resultId);
                        delete runningPlugins[resultId];
                    }, gmeConfig.plugin.serverResultTimeout);
                });

                runningPlugins[resultId] = {
                    status: PLUGIN_CONSTANTS.RUNNING,
                    //timeoutId: will be added after plugin finished
                    //result: null,
                    //error: null
                };

                res.send({resultId: resultId});
            })
            .catch(next);
    });

    router.get('/plugin/:pluginId/results/:resultId', ensureAuthenticated, function (req, res) {
        var pluginExecution = runningPlugins[req.params.resultId];
        logger.debug('Plugin-result request for ', req.params.pluginId, req.params.resultId);
        if (pluginExecution) {
            if (pluginExecution.status === PLUGIN_CONSTANTS.RUNNING) {
                res.send(pluginExecution);
            } else {
                // Remove the pluginExecution when it has finished or an error occurred.
                clearTimeout(pluginExecution.timeoutId);
                pluginExecution.timeoutId = undefined;
                delete runningPlugins[req.params.resultId];

                res.send(pluginExecution);
            }
        } else {
            res.sendStatus(404);
        }
    });

    // AddOns
    router.get('/addOns', ensureAuthenticated, function (req, res) {
        var result = webgmeUtils.getComponentNames(gmeConfig.addOn.basePaths);
        logger.debug('/addOns', {metadata: result});
        res.send(result);
    });

    // TODO: router.get('/addOns/:addOnId/queryParams', ensureAuthenticated, function (req, res) {});
    // TODO:router.get('/addOns/:addOnId/queryParamsStructure', ensureAuthenticated, function (req, res) {});
    // TODO:router.post('/addOns/:addOnId/query', ensureAuthenticated, function (req, res) {});

    router.get('/seeds', ensureAuthenticated, function (req, res) {
        var seedDictionary = webgmeUtils.getSeedDictionary(gmeConfig);

        logger.debug('/seeds', {metadata: seedDictionary});
        res.send(Object.keys(seedDictionary));
    });

    function getVisualizersDescriptor() {
        //we merge the contents of the CONFIG.visualizerDescriptors by id
        var indexById = function (objectArray, id) {
                var i,
                    index = -1;
                for (i = 0; i < objectArray.length; i++) {
                    if (objectArray[i].id === id) {
                        index = i;
                        break;
                    }
                }

                return index;
            },
            getVisualizerDescriptor = function (path) {
                try {
                    var descriptor = fs.readFileSync(path, 'utf-8');
                    descriptor = JSON.parse(descriptor);
                    return descriptor;
                } catch (e) {
                    //we do not care much of the error just give back an empty array
                    logger.error(e);
                    return [];
                }
            },
            allVisualizersDescriptor = [],
            i, j;

        for (i = 0; i < gmeConfig.visualization.visualizerDescriptors.length; i++) {
            var descriptor = getVisualizerDescriptor(gmeConfig.visualization.visualizerDescriptors[i]);
            if (descriptor.length) {
                for (j = 0; j < descriptor.length; j++) {
                    var index = indexById(allVisualizersDescriptor, descriptor[j].id);
                    if (index !== -1) {
                        allVisualizersDescriptor[index] = descriptor[j];
                    } else {
                        allVisualizersDescriptor.push(descriptor[j]);
                    }
                }
            }
        }
        return allVisualizersDescriptor.sort(function (a, b) {
            if (a.id < b.id) {
                return -1;
            }
            if (a.id > b.id) {
                return 1;
            }
            return 0;
        });
    }

    // FIXME: this should be JSON
    router.get('/visualizers', ensureAuthenticated, function (req, res) {
        var result = getVisualizersDescriptor();
        logger.debug('/visualizers', {metadata: result});
        res.send(result);
    });

    router.use('*', function (req, res, next) {
        res.status(404);
        next(new Error());
    });

    // error handling (NOTE: it is important to have this function signature with 4 arguments!)
    router.use(function (err, req, res, next) { //jshint ignore:line
        var errorMessage = {
                401: 'Authentication required',
                403: 'Forbidden',
                404: 'Not found'
            },
            message = err.message ? err.message : err;

        if (res.statusCode === 200) {
            if (err.message.indexOf('Not authorized') > -1) {
                err.status = err.status || 403;
            }
            res.status(err.status || 500);
        }

        if (errorMessage.hasOwnProperty(res.statusCode)) {
            message = errorMessage[res.statusCode];
        }

        res.json({
            message: message,
            documentation_url: '', //jshint ignore: line
            error: err.message ? err.message : err // FIXME: only in dev mode
        });
    });

    // attach the api to the requested path
    logger.debug('Supported api path: ' + versionedAPIPath);
    app.use(versionedAPIPath, router);

    logger.debug('Latest api path: ' + latestAPIPath);
    app.use(latestAPIPath, router);

    return Q();
}

module.exports = {
    createAPI: createAPI
};