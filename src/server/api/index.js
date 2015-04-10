/*jshint node:true*/

/**
 * @author lattmann / https://github.com/lattmann
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
        aglio = require('aglio'),// used to generate API docs from blue print Readme.md
        htmlDoc,
        htmlDocDeferred = Q.defer(),
        fs = require('fs'),
        blueprint = fs.readFileSync(__dirname + '/Readme.md', {encoding: 'utf8'}),
        template = 'default',
        apiDocumentationMountPoint = '/developer/api',

        logger = middlewareOpts.logger.fork('api'),
        gmeConfig = middlewareOpts.gmeConfig,
        gmeAuth = middlewareOpts.gmeAuth,
        ensureAuthenticated = middlewareOpts.ensureAuthenticated,

        versionedAPIPath = mountPath + '/v1',
        latestAPIPath = mountPath;

    if (global.TESTING) {
        htmlDocDeferred.resolve();
    } else {
        // FIXME: this does not work with tests well.
        // generate api documentation based on blueprint when server starts
        aglio.render(blueprint, template, function (err, html, warnings) {
            if (err) {
                logger.error(err);
                htmlDocDeferred.reject(err);
                return;
            }
            if (warnings && warnings.length) {
                logger.warn('aglio', {metadata: warnings});
            }

            htmlDoc = html;
            logger.debug('html doc is ready: ' + apiDocumentationMountPoint);
            htmlDocDeferred.resolve();
        });
    }

    // attach api documentation to the specified path. N.B: this is NOT on the router, it is on the app.
    app.get(apiDocumentationMountPoint, function (req, res) {
        res.status(200);
        res.send(htmlDoc);
    });

    function getFullUrl(req, name) {
        return req.protocol + '://' + req.headers.host + req.baseUrl + name;
    }

    function getUserId(req) {
        return req.session.hasOwnProperty('udmId') ? req.session.udmId : null;
    }

    // ensure authenticated can be used only after this rule
    router.use('*', function (req, res, next) {
        // TODO: set all headers, check rate limit, etc.
        res.setHeader('X-WebGME-Media-Type', 'webgme.v1');
        next();
    });

    // modifications are allowed only if the user is authenticated
    // all get rules by default do NOT require authentication, if the get rule has to be protected add inline
    // the ensureAuthenticated function middleware
    router.post('*', ensureAuthenticated);
    router.put('*', ensureAuthenticated);
    router.patch('*', ensureAuthenticated);
    router.delete('*', ensureAuthenticated);

    router.get('/', function (req, res, next) {
        res.json({
            current_user_url: getFullUrl(req, '/user'),
            organization_url: getFullUrl(req, '/orgs/{org}'),
            project_url: getFullUrl(req, '/projects/{owner}/{project}'),
            user_url: getFullUrl(req, '/users/{user}'),
            documentation_url: req.protocol + '://' + req.headers.host + apiDocumentationMountPoint
        });
    });


    // AUTHENTICATED
    router.get('/user', ensureAuthenticated, function (req, res) {
        var userId = getUserId(req);

        if (userId) {
            gmeAuth.getUser(userId, function (err, data) {
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
        } else {
            res.status(401);
            res.json({
                message: 'Authentication required',
                error: ''
            });
        }
    });

    // Example: curl -i -H "Content-Type: application/json" -X PATCH -d "{\"email\":\"asdf@alkfm.com\",\"canCreate\":false}" http://demo:demo@127.0.0.1:8888/api/v1/user
    router.patch('/user', function (req, res, next) {
        var userId = getUserId(req);

        if (userId) {
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
        } else {
            res.status(401);
            res.json({
                message: 'Authentication required',
                error: ''
            });
        }
    });

    router.delete('/user', function (req, res, next) {
        var userId = getUserId(req);

        gmeAuth.deleteUser(userId, function (err) {
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

        var userId = getUserId(req);

        if (userId) {
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

                if (!data.siteAdmin) {
                    res.status(403);
                    return next(new Error('site admin role is required for  this operation'));
                }

                //try {
                receivedData = req.body;
                // TODO: verify request
                // "userId"
                //"email": "user@example.com",
                //"password": "pass",
                //"canCreate": null,
                //"siteAdmin": false,

                // we may need to check if this user can create other ones.

                gmeAuth.addUser(receivedData.userId,
                    receivedData.email,
                    receivedData.password,
                    receivedData.canCreate === 'true' || receivedData.canCreate === true,
                    {overwrite: false},
                    function (err, updateData) {
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
        } else {
            res.status(401);
            res.json({
                message: 'Authentication required',
                error: ''
            });
        }
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

    router.patch('/users/:username', function (req, res, next) {

        var userId = getUserId(req);

        if (userId) {
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

                //try {
                receivedData = req.body;
                // TODO: verify request
                // "userId"
                //"email": "user@example.com",
                //"password": "pass",
                //"canCreate": null,
                //"siteAdmin": false,

                // we may need to check if this user can create other ones.

                if (data.siteAdmin || data._id === req.params.username) {

                    if (receivedData.hasOwnProperty('siteAdmin') && !data.siteAdmin) {
                        res.status(403);
                        return next(new Error('setting siteAdmin property requires site admin role'));
                    }

                    gmeAuth.updateUser(req.params.username, receivedData, function (err, updated) {
                        if (err) {
                            res.status(400);
                            return next(new Error(err));
                        }

                        gmeAuth.getUser(req.params.username, function (err, data) {
                            if (err) {
                                res.status(404);
                                res.json({
                                    message: 'Requested resource was not found',
                                    error: err
                                });
                                return;
                            }

                            res.status(200);
                            res.json(data);
                        });
                    });

                } else {
                    res.status(403);
                    return next(new Error('site admin role is required for this operation'));
                }
            });
        } else {
            res.status(401);
            res.json({
                message: 'Authentication required',
                error: ''
            });
        }
    });

    router.delete('/users/:username', function (req, res, next) {
        var userId = getUserId(req);

        if (userId) {
            gmeAuth.getUser(userId, function (err, data) {
                if (err) {
                    res.status(404);
                    res.json({
                        message: 'Requested resource was not found',
                        error: err
                    });
                    return;
                }

                if (data.siteAdmin || data._id === req.params.username) {
                    gmeAuth.deleteUser(req.params.username, function (err, mongoResult) {
                        if (err || mongoResult !== 1) {
                            res.status(404);
                            res.json({
                                message: 'Requested resource was not found',
                                error: err
                            });
                            return;
                        }

                        res.sendStatus(204);
                    });
                } else {
                    res.status(403);
                    return next(new Error('site admin role is required for this operation'));
                }
            });
        } else {
            res.status(401);
            res.json({
                message: 'Authentication required',
                error: ''
            });
        }
    });

    // AUTHENTICATED
    //router.get('/user/orgs', ensureAuthenticated, function (req, res) {
    //
    //    res.json({
    //        message: 'Not implemented yet'
    //    });
    //});
    //
    //router.post('/user/projects', function (req, res) {
    //
    //    res.json({
    //        message: 'Not implemented yet'
    //    });
    //});
    //
    //router.post('/orgs/:org/projects', function (req, res) {
    //
    //    res.json({
    //        message: 'Not implemented yet'
    //    });
    //});

    // USERS
    //router.put('/users/:username/site_admin', function (req, res) {
    //
    //    res.json({
    //        message: 'Not implemented yet'
    //    });
    //});
    //
    //router.delete('/users/:username/site_admin', function (req, res) {
    //
    //    res.json({
    //        message: 'Not implemented yet'
    //    });
    //});


// ORGANIZATIONS
//    router.get('/organizations', function (req, res) {
//
//        gmeAuth.listOrganizations(null, function (err, data) {
//            if (err) {
//                res.status(404);
//                res.json({
//                    message: 'Requested resource was not found',
//                    error: err
//                });
//                return;
//            }
//
//            res.json(data);
//        });
//    });
//
//    router.get('/orgs/:org', function (req, res) {
//
//        res.json({
//            message: 'Not implemented yet'
//        });
//    });
//
//    router.patch('/orgs/:org', function (req, res) {
//
//        res.json({
//            message: 'Not implemented yet'
//        });
//    });


// PROJECTS

    //router.get('/projects', function (req, res) {
    //
    //    res.json({
    //        message: 'Not implemented yet ' + req.params.owner
    //    });
    //});
    //
    //router.get('/projects/:owner/:project', function (req, res) {
    //
    //    res.json({
    //        message: 'Not implemented yet ' + req.params.owner
    //    });
    //});
    //
    //router.patch('/projects/:owner/:project', function (req, res) {
    //
    //    res.json({
    //        message: 'Not implemented yet ' + req.params.owner
    //    });
    //});
    //
    //router.delete('/projects/:owner/:project', function (req, res) {
    //
    //    res.json({
    //        message: 'Not implemented yet ' + req.params.owner
    //    });
    //});

//// FIXME: requires auth
//    router.get('/projects/:owner/:project/collaborators', function (req, res) {
//        // array of users with permissions
//
//        res.json({
//            message: 'Not implemented yet'
//        });
//    });
//
//
//    router.patch('/projects/:owner/:project/collaborators', function (req, res) {
//
//
//        res.json({
//            message: 'Not implemented yet'
//        });
//    });
//
//// FIXME: requires auth
//    router.get('/projects/:owner/:project/collaborators/:username', function (req, res) {
//
//        res.json({
//            message: 'Not implemented yet'
//        });
//    });
//
//
//    router.put('/projects/:owner/:project/collaborators/:username', function (req, res) {
//
//        res.json({
//            message: 'Not implemented yet'
//        });
//    });
//
//
//    router.delete('/projects/:owner/:project/collaborators/:username', function (req, res) {
//
//        res.json({
//            message: 'Not implemented yet'
//        });
//    });

    router.use('*', function (req, res, next) {
        res.status(404);
        next(new Error());
    });

    // error handling
    router.use(function (err, req, res, next) {
        var errorMessage = {
                401: 'Authentication required',
                403: 'No sufficient role',
                404: 'Not found'
            },
            message = err.message ? err.message : err;

        if (res.statusCode === 200) {
            res.status(err.status || 500);
        }
        res.json({
            message: errorMessage.hasOwnProperty(res.statusCode) ? errorMessage[res.statusCode] : message,
            documentation_url: '',
            error: err.message ? err.message : err // FIXME: only in dev mode
        });
    });

    // attach the api to the requested path
    logger.debug('Supported api path: ' + versionedAPIPath);
    app.use(versionedAPIPath, router);

    logger.debug('Latest api path: ' + latestAPIPath);
    app.use(latestAPIPath, router);


    return Q.all([htmlDocDeferred.promise]);
}


module.exports = {
    createAPI: createAPI
};