/*globals requireJS*/
/*jshint node:true*/

/**
 * @module Server:API
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
        htmlDoc,
        htmlDocDeferred = Q.defer(),
        path = require('path'),
        fs = require('fs'),
        apiDocumentationMountPoint = '/developer/api',

        logger = middlewareOpts.logger.fork('api'),
        gmeAuth = middlewareOpts.gmeAuth,
        safeStorage = middlewareOpts.safeStorage,
        ensureAuthenticated = middlewareOpts.ensureAuthenticated,
        gmeConfig = middlewareOpts.gmeConfig,
        webgme = require('../../../webgme'),
        merge = webgme.requirejs('common/core/users/merge'),
        StorageUtil = webgme.requirejs('common/storage/util'),
        webgmeUtils = require('../../utils'),

        versionedAPIPath = mountPath + '/v1',
        latestAPIPath = mountPath,

        raml2html,
        configWithDefaultTemplates;

    if (global.TESTING) {
        htmlDocDeferred.resolve();
    } else {
        // FIXME: this does not work with tests well.
        // generate api documentation based on raml file when server starts
        raml2html = require('raml2html');
        configWithDefaultTemplates = raml2html.getDefaultConfig();
        //var configWithCustomTemplates = raml2html.getDefaultConfig('my-custom-template.nunjucks', __dirname);

        // source can either be a filename, url, file contents (string) or parsed RAML object
        raml2html.render(path.join(__dirname, 'webgme-api.raml'), configWithDefaultTemplates).then(function (result) {
            // Save the result to a file or do something else with the result
            htmlDoc = result;
            htmlDocDeferred.resolve();
        }, function (error) {
            // Output error
            htmlDocDeferred.reject(error);
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
        return req.session.udmId;
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

    router.get('/', function (req, res/*, next*/) {
        res.json({
            current_user_url: getFullUrl(req, '/user'), //jshint ignore: line
            organization_url: getFullUrl(req, '/orgs/{org}'), //jshint ignore: line
            project_url: getFullUrl(req, '/projects/{owner}/{project}'), //jshint ignore: line
            user_url: getFullUrl(req, '/users/{user}'), //jshint ignore: line
            documentation_url: req.protocol + '://' + req.headers.host + apiDocumentationMountPoint//jshint ignore: line
        });
    });

    // AUTHENTICATED
    router.get('/user', ensureAuthenticated, function (req, res) {
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

                gmeAuth.updateUser(req.params.username, receivedData, function (err/*, updated*/) {
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

    });

    router.delete('/users/:username', function (req, res, next) {
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
                next(err);
            });
    });

    router.get('/orgs/:orgId', function (req, res, next) {
        gmeAuth.getOrganization(req.params.orgId)
            .then(function (data) {
                res.json(data);
            })
            .catch(function (err) {
                err = new Error(err);
                if (err.message.indexOf('No such organization [') > -1) {
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
                err = new Error(err);
                if (err.message.indexOf('No such organization [') > -1) {
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
                err = new Error(err);
                if (err.message.indexOf('No such organization [') > -1 ||
                    err.message.indexOf('No such user [') > -1) {
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
                err = new Error(err);
                if (err.message.indexOf('No such organization [') > -1) {
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
                err = new Error(err);
                if (err.message.indexOf('No such organization [') > -1 ||
                    err.message.indexOf('No such user [') > -1) {
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
                err = new Error(err);
                if (err.message.indexOf('No such organization [') > -1 ||
                    err.message.indexOf('No such user [') > -1) {
                    res.status(404);
                }
                next(err);
            });
    });


    // PROJECTS

    router.get('/projects', ensureAuthenticated, function (req, res, next) {
        var userId = getUserId(req);
        safeStorage.getProjects({username: userId})
            .then(function (result) {
                res.json(result);
            })
            .catch(function (err) {
                next(err);
            });
    });


    /**
     * Creating project by seed
     * Available body parameters:
     * type {string} - sets if the seed is coming from file (==='file') source or from some existing project(==='db') [mandatory]
     * seedName {string} - the name of the seed (in case of db, it has to be the complete id of the project) [mandatory]
     * seedBranch {string} - in case of db seed, it is possible to give the name of the source branch [default=master]
     *
     * @example {type:'file',seedName:'EmptyProject'}
     * @example {type:'db',seedName:'me+myOldProject',seedBranch:'release'}
     */
    router.put('/projects/:ownerId/:projectName', function (req, res, next) {
        var userId = getUserId(req),
            command = req.body;
        command.command = 'seedProject';
        command.userId = userId;
        command.webGMESessionId = req.session.id;
        command.ownerId = req.params.ownerId;
        command.projectName = req.params.projectName;

        req.session.save(); //TODO why do we have to save manually

        Q.nfcall(middlewareOpts.workerManager.request, command)
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

    router.get('/projects/:ownerId/:projectName/commits', ensureAuthenticated, function (req, res, next) {
        var userId = getUserId(req),
            data = {
                username: userId,
                projectId: StorageUtil.getProjectIdFromOwnerIdAndProjectName(req.params.ownerId,
                    req.params.projectName),
                before: (new Date()).getTime(), // current time
                number: 100 // asks for the last 100 commits from the time specified above
            };

        safeStorage.getCommits(data)
            .then(function (result) {
                res.json(result);
            })
            .catch(function (err) {
                next(err);
            });
    });


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

    router.get('/plugins/:pluginId/config', ensureAuthenticated, function (req, res) {
        var plugin = getPlugin(req.params.pluginId);

        if (plugin instanceof Error) {
            logger.error(plugin);
            res.sendStatus(404);
        } else {
            res.send(plugin.getDefaultConfig());
        }
    });

    router.get('/plugins/:pluginId/configStructure', ensureAuthenticated, function (req, res) {
        var plugin = getPlugin(req.params.pluginId);

        if (plugin instanceof Error) {
            logger.error(plugin);
            res.sendStatus(404);
        } else {
            res.send(plugin.getConfigStructure());
        }
    });

    router.post('/plugins/:pluginId/execute', ensureAuthenticated, function (req, res) {
        var resultId = GUID(),
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
                webGMESessionId: req.session.id,
                name: req.params.pluginId,
                context: pluginContext
            };

        req.session.save();

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
    });

    router.get('/plugins/:pluginId/results/:resultId', ensureAuthenticated, function (req, res) {
        var pluginExecution = runningPlugins[req.params.resultId];
        logger.debug('Plugin-result request for ', req.params.pluginId, req.params.resultId);
        if (pluginExecution) {
            if (pluginExecution.status ===  PLUGIN_CONSTANTS.RUNNING) {
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
        var names = [],
            result = [],
            seedName,
            i,
            j;
        if (gmeConfig.seedProjects.enable === true) {
            for (i = 0; i < gmeConfig.seedProjects.basePaths.length; i++) {
                names = fs.readdirSync(gmeConfig.seedProjects.basePaths[i]);
                for (j = 0; j < names.length; j++) {
                    seedName = path.basename(names[j], '.json');
                    if (result.indexOf(seedName) === -1) {
                        result.push(seedName);
                    }
                }
            }
        }
        logger.debug('/seeds', {metadata: result});
        res.send(result);
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
    router.get('/visualizers', ensureAuthenticated, function (req, res, next) {
        var result = getVisualizersDescriptor();
        logger.debug('/visualizers', {metadata: result});
        res.send(result);
    });

    router.use('*', function (req, res, next) {
        res.status(404);
        next(new Error());
    });

    // error handling
    router.use(function (err, req, res, next) { // NOTE: it is important to have this function signature with 4 arguments!
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


    return Q.all([htmlDocDeferred.promise]);
}


module.exports = {
    createAPI: createAPI
};