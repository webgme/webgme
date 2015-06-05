/*globals requireJS*/
/*jshint node:true*/

'use strict';

// graceful ending of the child process
process.on('SIGINT', function () {
    //FIXME: AUTH.unload
    if (logger) {
        logger.debug('stopping child process');
        //if (storage) {
        //    storage.closeDatabase(function (err) {
        //        if (err) {
        //            logger.error(err);
        //            process.exit(1);
        //        } else {
        //            logger.debug('child process finished');
        //            process.exit(0);
        //        }
        //    });
        //}
    } else {
        console.error('child was killed without initialization');
        process.exit(1);
    }
});

var WEBGME = require(__dirname + '/../../../webgme'),
    openContext = WEBGME.openContext,
    Core = requireJS('common/core/core'),
    GUID = requireJS('common/util/guid'),
    DUMP = requireJS('common/core/users/dumpmore'),
    Storage = requireJS('common/storage/nodestorage'),
    Serialization = requireJS('common/core/users/serialization'),
    BlobClient = requireJS('common/blob/BlobClient'),
    PluginResult = requireJS('plugin/PluginResult'),
    PluginMessage = requireJS('plugin/PluginMessage'),
    STORAGE_CONSTANTS = requireJS('common/storage/constants'),

    FS = require('fs'),

    PluginNodeManager = require('../../plugin/nodemanager'),
    CONSTANT = require('./constants'),
    Logger = require('../logger'),

    core = null,
    result = null,
    resultReady = false,
    resultRequested = false,
    resultId = null,
    error = null,
    initialized = false,
    AUTH = null,
    _addOn = null,
    gmeConfig,
    logger,
    sessionIdToStorage = {},

    safeSend = function (msg) {
        if (initialized) {
            logger.debug('sending message', {metadata: msg});
        } else {
            //console.log('sending message', {metadata: msg});
        }
        try {
            process.send(msg);
        } catch (e) {
            if (initialized) {
                logger.error('sending message failed', {metadata: msg, e: e});
            } else {
                console.error('sending message failed', {metadata: msg, e: e});
            }
            //TODO check if we should separate some case
            process.exit(0);
        }
    },

    initResult = function () {
        core = null;
        result = null;
        resultReady = false;
        resultRequested = false;
        resultId = null;
        error = null;
    },

    initialize = function (parameters) {
        if (initialized !== true) {
            initialized = true;
            gmeConfig = parameters.gmeConfig;
            WEBGME.addToRequireJsPaths(gmeConfig);
            logger = Logger.create('gme:server:worker:simpleworker:pid_' + process.pid, gmeConfig.server.log, true);
            logger.debug('initializing');

            safeSend({pid: process.pid, type: CONSTANT.msgTypes.initialized});
        } else {
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.initialized});
        }
    },

    getWorkerProcessInfo = function (callback) {
        var processInfo = {
            pid: process.pid,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage()
        };
        callback(null, processInfo);
    },

// Helper functions
    getConnectedStorage = function (webGMESessionId) {
        var host = '127.0.0.1', //TODO: this should come from gmeConfig
            storage = Storage.createStorage(host, webGMESessionId, logger, gmeConfig);

        return storage;
    },

    getProject = function (projectName, webGMESessionId, callback) {
        getConnectedStorage(webGMESessionId, function (err, storage) {
            if (err) {
                return callback(err);
            }
            storage.getProjectNames(function (err, names) {
                if (err) {
                    return callback(err);
                }
                if (names.indexOf(projectName) === -1) {
                    return callback(new Error('nonexistent project: ' + projectName));
                }
                storage.openProject(projectName, callback);
            });
        });
    },

// Export and node-dumping functions
    exportLibrary = function (webGMESessionId, name, hash, branch, commit, libraryRootPath, callback) {

        var storage = getConnectedStorage(webGMESessionId),
            project,
            finish = function (err, data) {
                storage.close();
                callback(err, data);
            },
            gotHash = function () {
                var core = new Core(project, {
                    globConf: gmeConfig,
                    logger: logger.fork('core')
                });

                core.loadRoot(hash, function (err, root) {
                    if (err) {
                        finish(err);
                        return;
                    }

                    core.loadByPath(root, libraryRootPath, function (err, libraryRoot) {
                        if (err) {
                            finish(err);
                        }
                        Serialization.export(core, libraryRoot, finish);
                    });
                });
            }

        storage.open(function (networkState) {
            if (networkState === STORAGE_CONSTANTS.CONNECTED) {

                storage.openProject(name, function (err, project__, branches) {
                    if (err) {
                        finish(err);
                        return;
                    }

                    project = project__;

                    if (hash) {
                        gotHash(project);
                        return;
                    }

                    commit = commit || branches[branch];

                    if (!commit) {
                        finish('no such branch found in the project');
                        return;
                    }

                    project.loadObject(commit, function (err, commitObject) {
                        if (err) {
                            finish(err);
                            return;
                        }

                        hash = commitObject.root;
                        gotHash();
                    });
                });
            } else {
                finish('having error with the webgme server connection');
            }
        });
    },

    dumpMoreNodes = function (webGMESessionId, name, hash, nodePaths, callback) {

        getProject(name, webGMESessionId, function (err, project) {
            if (err) {
                callback(err);
                return;
            }
            var core = new Core(project, {globConf: gmeConfig, logger: logger.fork('dumpMoreNodes:core')});
            core.loadRoot(hash, function (err, root) {
                if (err) {
                    callback(err);
                } else {
                    var nodes = [],
                        needed = nodePaths.length || 0,
                        loadError = null,
                        objectLoaded = function (err, node) {
                            loadError = loadError || err;
                            if (node !== undefined && node !== null) {
                                nodes.push(node);
                            }
                            if (--needed === 0) {
                                if (loadError) {
                                    callback(loadError);
                                } else {
                                    DUMP(core, nodes, '', 'guid', callback);
                                }
                            }
                        };
                    if (needed > 0) {
                        for (var i = 0; i < nodePaths.length; i++) {
                            core.loadByPath(root, nodePaths[i], objectLoaded);
                        }
                    } else {
                        callback(null, null);
                    }
                }
            });

        });
    },

// Plugin functions
    getPlugin = function (name) {
        return requireJS('plugin/' + name + '/' + name + '/' + name);
    },

    executePlugin = function (webGMESessionId, userId, name, context, callback) {
        var storage = getConnectedStorage(webGMESessionId);
        //context.managerConfig: {
        //    project: self._client.getActiveProjectName(),
        //    token: '',
        //    activeNode: activeNode, // active object in the editor
        //    activeSelection: activeSelection || [],
        //    commit: self._client.getActualCommit(), //#668b3babcdf2ddcd7ba38b51acb62d63da859d90,
        //
        //    branchName: self._client.getActualBranch()
        //};
        // context.pluginConfig
        storage.open(function (status) {
            logger.debug('storage is open');
            if (status === STORAGE_CONSTANTS.CONNECTED) {
                storage.openProject(context.managerConfig.project, function (err, project, branches) {
                    var pluginManager,
                        pluginContext;
                    if (err) {
                        throw new Error(err);
                    }
                    logger.debug('Opened project, got branches:', context.managerConfig.project, branches);
                    pluginManager = new PluginNodeManager(webGMESessionId, project, logger, gmeConfig);

                    pluginContext = {
                        activeNode: context.managerConfig.activeNode,
                        activeSelection: context.managerConfig.activeSelection,
                        commitHash: context.managerConfig.commit,
                        branchName: context.managerConfig.branchName
                    };

                    pluginManager.executePlugin(name, context.pluginConfig, pluginContext, function (err, result) {
                        callback(err, result.serialize());
                        //FIXME: We should not have to wait for this disconnect
                        storage.closeProject(context.managerConfig.project, function (err) {
                            if (err) {
                                logger.error('Closing project after plugin execution returned error', err);
                            }
                            logger.debug('Closed project after plugin execution.');
                        });
                    });
                });
            } else if (status === STORAGE_CONSTANTS.RECONNECTED) {
                //TODO: handle
            } else if (status === STORAGE_CONSTANTS.DISCONNECTED) {
                //TODO: handle
            } else if (status === STORAGE_CONSTANTS.ERROR) {
                //TODO: handle
                throw new Error('Could not connect');
            }
        });
    },

// Project/Branch info functions
//    getAllProjectsInfo = function (webGMESessionId, userId, callback) {
//        // TODO: if authentication is turned on,
//        // just query the users database for the list of projects for which the user is authorized
//        var projectNames,
//            userAuthInfo = null,
//            completeInfo = {},
//            needed,
//            i;
//
//        function filterProjectList(cb) {
//            if (AUTH === null) {
//                return cb(null);
//            }
//
//            if (typeof userId === 'string') {
//                AUTH.getUserAuthInfo(userId, function (err, userData) {
//                    if (err) {
//                        projectNames = [];
//                        return cb(err);
//                    }
//
//                    userAuthInfo = userData;
//
//                    //the actual filtering
//                    var i, filtered = [];
//                    for (i = 0; i < projectNames.length; i++) {
//                        if (userAuthInfo[projectNames[i]]) {
//                            filtered.push(projectNames[i]);
//                        }
//                    }
//                    projectNames = filtered;
//                    cb(null);
//                });
//            } else {
//                projectNames = []; //we have authentication yet doesn't get valid user name...
//                return cb(new Error('invalid user'));
//
//            }
//        }
//
//        function addUserAuthInfo(projectName) {
//            if (userAuthInfo === null) {
//                completeInfo[projectName].rights = {read: true, write: true, delete: true};
//            } else {
//                completeInfo[projectName].rights = userAuthInfo[projectName] || {
//                    read: false,
//                    write: false,
//                    delete: false
//                };
//            }
//        }
//
//        function getProjectInfo(storage, name, cb) {
//            storage.openProject(name, function (err, project) {
//                var needed = 2,
//                    info = {info: null, branches: {}},
//                    error = null;
//
//                if (err) {
//                    return cb(err);
//                }
//
//                project.getBranchNames(function (err, branches) {
//                    error = error || err;
//                    if (!err && branches) {
//                        info.branches = branches;
//                    }
//
//                    if (--needed === 0) {
//                        return cb(error, name, info);
//                    }
//                });
//                project.getInfo(function (err, i) {
//                    error = error || err;
//
//                    if (!err && i) {
//                        info.info = i;
//                    }
//
//                    if (--needed === 0) {
//                        return cb(error, name, info);
//                    }
//                });
//            });
//        }
//
//        function projectInfoReceived(err, name, info) {
//            if (!err) {
//                completeInfo[name] = {info: info.info, branches: info.branches};
//                addUserAuthInfo(name);
//            }
//
//            if (--needed === 0) {
//                //TODO here we first should go and add the user right info
//                callback(null, completeInfo);
//            }
//        }
//
//        getConnectedStorage(webGMESessionId, function (err, storage) {
//            if (err) {
//                callback(err);
//                return;
//            }
//
//            storage.getProjectNames({}, function (err, projectlist) {
//                if (err) {
//                    return callback(new Error('cannot get project name list'));
//                }
//                projectNames = projectlist;
//                filterProjectList(function (err) {
//                    if (err) {
//                        callback(err);
//                    }
//                    needed = projectNames.length;
//                    if (needed > 0) {
//                        for (i = 0; i < projectNames.length; i++) {
//                            getProjectInfo(storage, projectNames[i], projectInfoReceived);
//                        }
//                    } else {
//                        return callback(new Error('there is no project on server'));
//                    }
//                });
//            });
//        });
//    },
//
//    setProjectInfo = function (webGMESessionId, projectId, info, callback) {
//        getProject(projectId, webGMESessionId, function (err, project) {
//            if (err) {
//                callback(err);
//                return;
//            }
//            project.setInfo(info, callback);
//        });
//    },
//
//    getProjectInfo = function (webGMESessionId, projectId, callback) {
//        getProject(projectId, webGMESessionId, function (err, project) {
//            if (err) {
//                callback(err);
//                return;
//            }
//            project.getInfo(callback);
//        });
//    },
//
//    getAllInfoTags = function (webGMESessionId, callback) {
//        var i,
//            tags = {},
//            needed;
//
//        function projectLoaded(err, project) {
//            if (!err && project) {
//                project.getInfo(infoArrived);
//            } else {
//                if (--needed === 0) {
//                    callback(null, tags);
//                }
//            }
//        }
//
//        function infoArrived(err, info) {
//            //TODO now this function wires the info.tags structure...
//            var keys, i;
//            if (!err && info) {
//                keys = Object.keys(info.tags || {});
//                for (i = 0; i < keys.length; i++) {
//                    tags[keys[i]] = info.tags[keys[i]];
//                }
//            }
//
//            if (--needed === 0) {
//                callback(null, tags);
//            }
//        }
//
//        getConnectedStorage(webGMESessionId, function (err, storage) {
//            if (err) {
//                callback(err);
//                return;
//            }
//            storage.getProjectNames(function (err, projectlist) {
//                if (err) {
//                    callback(err);
//                    return;
//                }
//
//                needed = projectlist.length;
//                for (i = 0; i < projectlist.length; i++) {
//                    getProject(projectlist[i], webGMESessionId, projectLoaded);
//                }
//            });
//        });
//    },

// Seeding and Project/Branch creation functions
    createProject = function (webGMESessionId, name, jsonProject, callback) {
        getConnectedStorage(webGMESessionId, function (err, storage) {
            if (err) {
                return callback('' + err);
            }

            storage.openProject(name, function (err, project) {
                if (err) {
                    return callback('' + err);
                }

                var core = new Core(project, {globConf: gmeConfig, logger: logger.fork('createProject:core')}),
                    root = core.createNode({parent: null, base: null});
                Serialization.import(core, root, jsonProject, function (err) {
                    if (err) {
                        return storage.deleteProject(name, function () {
                            callback('' + err);
                        });
                    }

                    core.persist(root, function (/*err*/) {
                    });
                    var rhash = core.getHash(root),
                        chash = project.makeCommit([], rhash, 'project imported', function (/*err*/) {
                        });
                    project.getBranchHash('master', '#hack', function (err, oldhash) {
                        if (err) {
                            return callback('' + err);
                        }
                        project.setBranchHash('master', oldhash, chash, callback);
                    });
                });
            });
        });
    },

    setBranch = function (webGMESessionId, projectName, branchName, oldHash, newHash, callback) {
        getProject(projectName, webGMESessionId, function (err, project) {
            if (err) {
                callback(err);
                return;
            }
            project.setBranchHash(branchName, oldHash, newHash, callback);
        });
    },

    getAvailableSeedNames = function () {
        var result = [],
            i, names, j;
        if (gmeConfig.seedProjects.enable !== true) {
            return result;
        }

        try {
            for (i = 0; i < gmeConfig.seedProjects.basePaths.length; i++) {
                names = FS.readdirSync(gmeConfig.seedProjects.basePaths[i]);
                for (j = 0; j < names.length; j++) {
                    if (names[j].slice(-5) === '.json' && result.indexOf(names[j].slice(0, -5)) === -1) {
                        result.push(names[j].slice(0, -5));
                    }
                }
            }
        } catch (e) {
            return result;
        }

        return result;
    },

    getSeedInfo = function (webGMESessionId, userId, callback) {
        var result = {},
            createChecked = function () {
                getAllProjectsInfo(webGMESessionId, userId, function (err, fullProjectInfo) {
                    result.db = Object.keys(fullProjectInfo || {});

                    callback(null, result);
                });
            };

        result.db = [];
        result.file = getAvailableSeedNames();
        if (AUTH) {
            AUTH.getAllUserAuthInfo(userId, function (err, userData) {
                if (err) {
                    return callback(err);
                }

                if (!userData.canCreate) {
                    callback(null, result);
                }

                createChecked();
            });
        } else {
            createChecked();
        }
    },

    getSeedFromFile = function (name) {
        var i, names;
        if (gmeConfig.seedProjects.enable !== true) {
            return null;
        }

        try {
            for (i = 0; i < gmeConfig.seedProjects.basePaths.length; i++) {
                names = FS.readdirSync(gmeConfig.seedProjects.basePaths[i]);
                if (names.indexOf(name + '.json') !== -1) {
                    return JSON.parse(
                        FS.readFileSync(gmeConfig.seedProjects.basePaths[i] + '/' + name + '.json', 'utf8')
                    );
                }
            }
            return null;
        } catch (e) {
            return null;
        }
    },

    seedProject = function (parameters, callback) {
        var storage = getConnectedStorage(parameters.webGMESessionId),
            finish = function (err, data) {
                storage.close();
                callback(err);
            };

        storage.open(function (networkState) {

            var jsonSeed,
                seedReady = function () {
                    //console.log('seed',jsonSeed);
                    storage.createProject(parameters.projectName,
                        function (err, project) {
                            if (err) {
                                logger.error('empty project creation failed');
                                fininsh(err);
                                return;
                            }
                            var core = new Core(project, {
                                    globConf: gmeConfig,
                                    logger: logger.fork('core')
                                }),
                                root = core.createNode({parent: null, base: null});

                            Serialization.import(core, root, jsonSeed, function (err) {
                                if (err) {
                                    logger.error('import of seed failed');
                                    finish(err);
                                    return;
                                }

                                var persisted = core.persist(root);
                                storage.makeCommit(parameters.projectName,
                                    null,
                                    [],
                                    persisted.rootHash,
                                    persisted.objects,
                                    'seeding project[' + parameters.seedName + ']',
                                    function (err, commitResult) {
                                        if (err) {
                                            logger.error('makeCommit failed.');
                                            finish(err);
                                            return;
                                        }

                                        project.createBranch('master', commitResult.hash, function (err) {
                                            if (err) {
                                                logger.error('setting branch failed');
                                                callback(err);
                                            }
                                            storage.close();
                                            logger.info('seeding [' + parameters.seedName +
                                                '] to [' + parameters.projectName + '] completed');
                                            finish(null);
                                        });
                                    }
                                );

                            });

                        });
                };

            if (networkState = STORAGE_CONSTANTS.CONNECTED) {
                if (parameters.type === 'file') {
                    jsonSeed = getSeedFromFile(parameters.seedName);
                    seedReady();
                    return;
                } else {
                    parameters.seedBranch = parameters.seedBranch || 'master';
                    storage.openProject(parameters.seedName, function (err, project, branches) {
                        if (err) {
                            finish(err);
                            return;
                        }

                        project.loadObject(branches[parameters.seedBranch], function (err, commit) {
                            if (err) {
                                finish(err);
                                return;
                            }

                            var core = new Core(project, {
                                globConf: gmeConfig,
                                logger: logger.fork('core')
                            });

                            core.loadRoot(commit.root, function (err, root) {
                                if (err) {
                                    finish(err);
                                    return;
                                }
                                Serialization.export(core, root, function (err, jsonExport) {
                                    if (err) {
                                        finish(err);
                                        return;
                                    }
                                    jsonSeed = jsonExport;
                                    seedReady();
                                });
                            });
                        });
                    });
                }
            } else {
                finish('problems connecting to the webgme server');
            }
        });
    },

//addOn functions
    getAddOn = function (name) {
        return requireJS('addon/' + name + '/' + name + '/' + name);
    },

    initConnectedWorker = function (webGMESessionId, name, projectName, branchName, callback) {
        if (!name || (AUTH && !webGMESessionId) || !projectName || !branchName) {
            return setImmediate(callback, 'Required parameter was not provided');
        }
        var AddOn = getAddOn(name);
        //for instance creation we need the Core class and the Storage object
        getConnectedStorage(webGMESessionId, function (err, storage) {
            if (err) {
                callback('unable to connect user\'s storage: ' + err);
                return;
            }
            _addOn = new AddOn(Core, storage, gmeConfig);
            //for the initialization we need the project as well
            getProject(projectName, webGMESessionId, function (err, project) {
                if (err) {
                    callback(err);
                    return;
                }
                logger.debug('starting addon', {metadata: name});
                _addOn.start({
                    projectName: projectName,
                    branchName: branchName,
                    project: project,
                    logger: logger.fork(name)
                }, callback);
            });
        });
    },

    connectedWorkerQuery = function (parameters, callback) {
        if (_addOn) {
            _addOn.query(parameters, callback);
        } else {
            callback('the addon is not running');
        }
    },

    connectedworkerStop = function (callback) {
        if (_addOn) {
            logger.debug('stopping addon', {metadata: _addOn.getName()});
            _addOn.stop(function (err) {
                if (err) {
                    return callback(err);
                }
                _addOn = null;
                callback(null);
            });
        } else {
            callback(null);
        }
    };


//main message processing loop
process.on('message', function (parameters) {
    var resultHandling = function (err, r) {
        r = r || null;
        if (resultRequested === true) {
            initResult();
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.result, error: err, result: r});
        } else {
            resultReady = true;
            error = err;
            result = r;
        }
    };

    parameters = parameters || {};
    parameters.command = parameters.command || CONSTANT.workerCommands.getResult; //default command

    if (!initialized && parameters.command !== CONSTANT.workerCommands.initialize) {
        return safeSend({
            pid: process.pid,
            type: CONSTANT.msgTypes.request,
            error: 'worker has not been initialized yet',
            resid: null
        });
    }

    if (parameters.command === CONSTANT.workerCommands.initialize) {
        return initialize(parameters);
    }


    resultId = GUID();
    if (parameters.command === CONSTANT.workerCommands.getWorkerProcessInfo) {
        safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
        getWorkerProcessInfo(resultHandling);
    } else if (parameters.command === CONSTANT.workerCommands.dumpMoreNodes) {
        if (typeof parameters.name === 'string' &&
            typeof parameters.hash === 'string' &&
            parameters.nodes && parameters.nodes.length) {
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
            dumpMoreNodes(parameters.webGMESessionId, parameters.name, parameters.hash, parameters.nodes,
                resultHandling);
        } else {
            initResult();
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: 'invalid parameters'});
        }
    } else if (parameters.command === CONSTANT.workerCommands.generateJsonURL) {
        safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
        resultHandling(null, parameters.object);
    } else if (parameters.command === CONSTANT.workerCommands.getResult) {
        if (resultReady === true) {
            var e = error,
                r = result;

            initResult();
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.result, error: e, result: r});
        } else {
            resultRequested = true;
        }
    } else if (parameters.command === CONSTANT.workerCommands.executePlugin) {
        if (gmeConfig.plugin.allowServerExecution) {
            if (typeof parameters.name === 'string' && typeof parameters.context === 'object') {
                executePlugin(parameters.webGMESessionId, parameters.userId, parameters.name, parameters.context,
                    function (err, result) {
                        safeSend({pid: process.pid, type: CONSTANT.msgTypes.result, error: err, result: result});
                    }
                );
            } else {
                initResult();
                safeSend({
                    pid: process.pid,
                    type: CONSTANT.msgTypes.result,
                    error: 'invalid parameters',
                    result: {}
                });
            }
        } else {
            initResult();
            var pluginResult = new PluginResult(),
                pluginMessage = new PluginMessage();
            pluginMessage.severity = 'error';
            pluginMessage.message = 'plugin execution on server side is disabled';
            pluginResult.setSuccess(false);
            pluginResult.pluginName = parameters.name;
            pluginResult.addMessage(pluginMessage);
            pluginResult.setStartTime((new Date()).toISOString());
            pluginResult.setFinishTime((new Date()).toISOString());
            pluginResult.setError(pluginMessage.message);
            safeSend({
                pid: process.pid,
                type: CONSTANT.msgTypes.result,
                error: null,
                result: pluginResult.serialize()
            });
        }
    } else if (parameters.command === CONSTANT.workerCommands.exportLibrary) {
        console.log(parameters);
        if (typeof parameters.name === 'string' &&
            (typeof parameters.hash === 'string' ||
            typeof parameters.branch === 'string' ||
            typeof parameters.commit === 'string') &&
            typeof parameters.path === 'string') {
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
            exportLibrary(parameters.webGMESessionId, parameters.name, parameters.hash,
                parameters.branch, parameters.commit, parameters.path, resultHandling);
        } else {
            initResult();
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: 'invalid parameters'});
        }
    } else if (parameters.command === CONSTANT.workerCommands.createProjectFromFile) {
        if (typeof parameters.name === 'string' && typeof parameters.json === 'object') {
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
            createProject(parameters.webGMESessionId, parameters.name, parameters.json, resultHandling);
        } else {
            initResult();
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: 'invalid parameters'});
        }
    } else if (parameters.command === CONSTANT.workerCommands.getAllProjectsInfo) {
        safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
        getAllProjectsInfo(parameters.webGMESessionId, parameters.userId, resultHandling);
    } else if (parameters.command === CONSTANT.workerCommands.setProjectInfo) {
        safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
        setProjectInfo(parameters.webGMESessionId, parameters.projectId, parameters.info || {}, resultHandling);
    } else if (parameters.command === CONSTANT.workerCommands.getProjectInfo) {
        safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
        getProjectInfo(parameters.webGMESessionId, parameters.projectId, resultHandling);
    } else if (parameters.command === CONSTANT.workerCommands.getAllInfoTags) {
        safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
        getAllInfoTags(parameters.webGMESessionId, resultHandling);
    } else if (parameters.command === CONSTANT.workerCommands.setBranch) {
        safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
        setBranch(parameters.webGMESessionId,
            parameters.project,
            parameters.branch,
            parameters.old,
            parameters.new,
            resultHandling);
    } else if (parameters.command === CONSTANT.workerCommands.getSeedInfo) {
        safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
        getSeedInfo(parameters.webGMESessionId, parameters.userId, resultHandling);
    } else if (parameters.command === CONSTANT.workerCommands.seedProject) {
        safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
        seedProject(parameters, resultHandling);
    } else if (parameters.command === CONSTANT.workerCommands.connectedWorkerStart) {
        if (gmeConfig.addOn.enable === true) {
            initConnectedWorker(parameters.webGMESessionId, parameters.workerName, parameters.project,
                parameters.branch,
                function (err) {
                    if (err) {
                        safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: err, resid: null});
                    } else {
                        safeSend({
                            pid: process.pid,
                            type: CONSTANT.msgTypes.request,
                            error: null,
                            resid: process.pid
                        });
                    }
                }
            );
        } else {
            safeSend({
                pid: process.pid,
                type: CONSTANT.msgTypes.request,
                error: 'addOn functionality not enabled',
                resid: null
            });
        }
    } else if (parameters.command === CONSTANT.workerCommands.connectedWorkerQuery) {
        if (gmeConfig.addOn.enable === true) {
            connectedWorkerQuery(parameters, function (err, result) {
                safeSend({pid: process.pid, type: CONSTANT.msgTypes.query, error: err, result: result});
            });
        } else {
            safeSend({
                pid: process.pid,
                type: CONSTANT.msgTypes.request,
                error: 'addOn functionality not enabled',
                resid: null
            });
        }
    } else if (parameters.command === CONSTANT.workerCommands.connectedWorkerStop) {
        if (gmeConfig.addOn.enable === true) {
            connectedworkerStop(function (err) {
                safeSend({pid: process.pid, type: CONSTANT.msgTypes.result, error: err, result: null});
            });
        } else {
            safeSend({
                pid: process.pid,
                type: CONSTANT.msgTypes.request,
                error: 'addOn functionality not enabled',
                resid: null
            });
        }
    } else {
        safeSend({
            pid: process.pid,
            type: CONSTANT.msgTypes.request,
            error: 'unknown command',
            resid: null
        });
    }
});

safeSend({pid: process.pid, type: CONSTANT.msgTypes.initialize});