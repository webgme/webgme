/*globals requireJS*/
/*jshint node:true*/

/**
 * @module Server.SimpleWorker
 * @author kecso / https://github.com/kecso
 */

'use strict';

var WEBGME = require(__dirname + '/../../../webgme'),
    Q = require('q'),
    Core = requireJS('common/core/core'),
    GUID = requireJS('common/util/guid'),
    DUMP = requireJS('common/core/users/dumpmore'),
    Storage = requireJS('common/storage/nodestorage'),
    Serialization = requireJS('common/core/users/serialization'),
    PluginResult = requireJS('plugin/PluginResult'),
    PluginMessage = requireJS('plugin/PluginMessage'),
    STORAGE_CONSTANTS = requireJS('common/storage/constants'),
    merger = requireJS('common/core/users/merge'),

    FS = require('fs'),

    PluginNodeManager = require('../../plugin/nodemanager'),
    CONSTANT = require('./constants'),
    Logger = require('../logger'),

    //core = null,
    result = null,
    resultReady = false,
    resultRequested = false,
    resultId = null,
    error = null,
    initialized = false,
    _addOn = null,
    gmeConfig,
    logger;

function safeSend(msg) {
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
}

function initResult() {
    result = null;
    resultReady = false;
    resultRequested = false;
    resultId = null;
    error = null;
}

function initialize(parameters) {
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
}

// Helper functions
function getConnectedStorage(webGMESessionId) {
    var host = '127.0.0.1', //TODO: this should come from gmeConfig
        storage = Storage.createStorage(host, webGMESessionId, logger, gmeConfig);

    return storage;
}

// Export and node-dumping functions
function exportLibrary(webGMESessionId, projectId, hash, branchName, commit, libraryRootPath, callback) {

    var storage = getConnectedStorage(webGMESessionId),
        project,
        finish = function (err, data) {
            if (err) {
                logger.error('exportLibrary: ', err);
            }
            storage.close(function (closeErr) {
                if (closeErr) {
                    logger.error('storage close returned error', closeErr);
                } else {
                    logger.debug('storage was closed with no errors');
                }

                callback(err || closeErr, data);
            });
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
                        return;
                    }
                    Serialization.export(core, libraryRoot, finish);
                });
            });
        };

    storage.open(function (networkState) {
        if (networkState === STORAGE_CONSTANTS.CONNECTED) {

            storage.openProject(projectId, function (err, project__, branches) {
                if (err) {
                    logger.error('openProject failed', projectId, err);
                    finish(err);
                    return;
                }

                project = project__;

                if (hash) {
                    gotHash();
                    return;
                }

                commit = commit || branches[branchName];

                if (!commit) {
                    finish(new Error('Branch not found, projectId: "' + projectId + '", branchName: "' +
                        branchName + '".'));
                    return;
                }

                project.loadObject(commit, function (err, commitObject) {
                    if (err) {
                        finish(new Error('Failed loading commitHash: ' + err));
                        return;
                    }

                    hash = commitObject.root;
                    gotHash();
                });
            });
        } else {
            finish(new Error('having error with the webgme server connection'));
        }
    });
}

function loadNodes(root, core, paths, callback) {
    var deferred = Q.defer(),
        nodes = {},
        counter = 0,
        error = '',
        loadedNodeHandler = function (err, nodeObj) {
            counter += 1;
            if (err) {
                error += err;
            }

            if (nodeObj) {
                nodes[core.getPath(nodeObj)] = nodeObj;
            }

            if (counter === paths.length) {
                allNodesLoadedHandler();
            }
        },
        allNodesLoadedHandler = function () {
            if (error) {
                deferred.reject(error);
            }

            var result = [],
                i;

            for (i = 0; i < paths.length; i += 1) {
                result.push(nodes[paths[i]] || null);
            }
            deferred.resolve(result);
        },
        len;

    len = paths.length || 0;

    if (len === 0) {
        allNodesLoadedHandler();
    }
    while (len--) {
        core.loadByPath(root, paths[len], loadedNodeHandler);
    }
    return deferred.promise.nodeify(callback);
}

function dumpMoreNodes(webGMESessionId, projectId, hash, nodePaths, callback) {

    var storage = getConnectedStorage(webGMESessionId),
        finish = function (err, data) {
            storage.close(function (closeErr) {
                callback(err || closeErr, data);
            });
        };

    storage.open(function (networkStatus) {
        if (networkStatus === STORAGE_CONSTANTS.CONNECTED) {
            storage.openProject(projectId, function (err, project/*, branches*/) {

                if (err) {
                    finish(err);
                    return;
                }

                var core = new Core(project, {
                    globConf: gmeConfig,
                    logger: logger.fork('core')
                });

                core.loadRoot(hash, function (err, root) {
                    if (err) {
                        finish(err);
                        return;
                    }

                    loadNodes(root, core, nodePaths, function (err, nodes) {
                        if (err) {
                            finish(err);
                            return;
                        }
                        DUMP(core, nodes, '', 'guid', finish);
                    });
                });
            });
        } else {
            finish(new Error('problems during connection to webgme'));
        }
    });
}

/**
 * Executes a plugin.
 *
 * @param {string} webGMESessionId
 * @param {string} userId
 * @param {string} pluginName
 * @param {object} context - where the plugin should execute.
 * @param {string} context.project - id of project.
 * @param {string} context.activeNode - path to activeNode.
 * @param {string} [context.activeSelection=[]] - paths to selected nodes.
 * @param {string} context.commit - commit hash to start the plugin from.
 * @param {string} context.branchName - branch which to save to.
 * @param {object} [context.pluginConfig=%defaultForPlugin%] - specific configuration for the plugin.
 * @param {function} callback
 */
function executePlugin(webGMESessionId, userId, pluginName, context, callback) {
    var storage = getConnectedStorage(webGMESessionId),
        errMessage;
    logger.debug('executePlugin', userId, pluginName);
    logger.debug('executePlugin context', {metadata: context});
    storage.open(function (status) {
        logger.debug('storage is open');
        if (status === STORAGE_CONSTANTS.CONNECTED) {
            storage.openProject(context.managerConfig.project, function (err, project, branches) {
                var pluginManager,
                    pluginContext;
                if (err) {
                    callback(err, null);
                    return;
                }
                logger.debug('Opened project, got branches:', context.managerConfig.project, branches);
                pluginManager = new PluginNodeManager(webGMESessionId, project, logger, gmeConfig);

                pluginContext = {
                    activeNode: context.managerConfig.activeNode,
                    activeSelection: context.managerConfig.activeSelection,
                    commitHash: context.managerConfig.commit,
                    branchName: context.managerConfig.branchName
                };

                pluginManager.executePlugin(pluginName, context.pluginConfig, pluginContext,
                    function (err, result) {
                        if (err) {
                            logger.error('Plugin failed', pluginName, err);
                            err = err instanceof Error ? err : new Error(err);
                        }
                        storage.close(function (closeErr) {
                            if (closeErr) {
                                logger.error('error closing storage', closeErr);
                            }
                            callback(err, result ? result.serialize() : null);
                        });
                    }
                );
            });
        } else {
            errMessage = 'Storage ' + status + ' during plugin execution..';
            logger.error(errMessage);
            storage.close(function (closeErr) {
                if (closeErr) {
                    logger.error('Problems closing storage', closeErr);
                }
                callback(new Error(errMessage)); //TODO: create pluginResult
            });

        }
    });
}

// Seeding functionality
function _getSeedFromFile(name) {
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
}

function _getSeedFromProject(storage, projectId, branchName, callback) {
    branchName = branchName || 'master';

    storage.openProject(projectId, function (err, project, branches) {
        if (err) {
            logger.error('seedProject - failed to open the existing project', projectId, err);
            callback(err);
            return;
        }
        if (branches.hasOwnProperty(branchName) === false) {
            callback(new Error('Branch did not exist [' + branchName + ']'));
            return;
        }
        project.loadObject(branches[branchName], function (err, commit) {
            if (err) {
                logger.error('seedProject - failed loading commitObject for branch', branchName, err);
                callback(new Error(err));
                return;
            }

            var core = new Core(project, {
                globConf: gmeConfig,
                logger: logger.fork('core')
            });

            core.loadRoot(commit.root, function (err, root) {
                if (err) {
                    logger.error('seedProject - failed loading root for commit', branchName, err);
                    callback(new Error(err));
                    return;
                }

                Serialization.export(core, root, function (err, jsonExport) {
                    if (err) {
                        logger.error('seedProject - failed loading root for commit', branchName, err);
                        callback(new Error(err));
                        return;
                    }
                    callback(null, jsonExport);
                });
            });
        });
    });
}

function _createProjectFromSeed(storage, projectName, ownerId, jsonSeed, seedName, callback) {
    logger.debug('_createProjectFromSeed');
    storage.createProject(projectName, ownerId, function (err, projectId) {
        if (err) {
            logger.error('empty project creation failed', err);
            callback(err);
            return;
        }
        storage.openProject(projectId, function (err, project) {
            var core,
                rootNode;
            if (err) {
                logger.error('Failed to open createdProject', err);
                callback(err);
                return;
            }

            core = new Core(project, {
                globConf: gmeConfig,
                logger: logger.fork('core')
            });
            rootNode = core.createNode({parent: null, base: null});

            Serialization.import(core, rootNode, jsonSeed, function (err) {
                if (err) {
                    callback(err);
                    return;
                }
                var persisted = core.persist(rootNode);

                project.makeCommit(null, [], persisted.rootHash, persisted.objects, 'seeding project[' + seedName + ']')
                    .then(function (commitResult) {
                        logger.debug('seeding project, commitResult:', {metadata: commitResult});
                        return project.createBranch('master', commitResult.hash);
                    })
                    .then(function () {
                        logger.info('seeding [' + seedName + '] to [' + project.projectId + '] completed');
                        callback(null, {projectId: projectId});
                    })
                    .catch(callback);
            });
        });
    });
}

/**
 *
 * @param {string} webGMESessionId
 * @param {string} projectName - Name of new project.
 * @param {string} ownerId - Owner of new project.
 * @param {object} parameters
 * @param {string} parameters.seedName - Name of seed, file or projectId.
 * @param {string} parameters.type - 'db' or 'file'
 * @param {string} [parameters.seedBranch='master'] - If db - optional name of branch.
 * @param [function} callback
 */
function seedProject(webGMESessionId, projectName, ownerId, parameters, callback) {
    var storage = getConnectedStorage(webGMESessionId),
        finish = function (err, result) {
            storage.close(function (closeErr) {
                callback(err || closeErr, result);
            });
        };

    logger.debug('seedProject');

    storage.open(function (networkState) {
        var jsonSeed;
        if (networkState === STORAGE_CONSTANTS.CONNECTED) {
            logger.debug('seedProject - storage is connected');

            if (parameters.type === 'file') {
                logger.debug('seedProject - seeding from file:', parameters.seedName);
                jsonSeed = _getSeedFromFile(parameters.seedName);
                if (jsonSeed === null) {
                    finish(new Error('unknown file seed [' + parameters.seedName + ']'));
                } else {
                    _createProjectFromSeed(storage, projectName, ownerId, jsonSeed, parameters.seedName, finish);
                }
            } else if (parameters.type === 'db') {
                logger.debug('seedProject - seeding from existing project:', parameters.seedName);
                _getSeedFromProject(storage, parameters.seedName, parameters.seedBranch, function (err, jsonSeed_) {
                    if (err) {
                        logger.error('Failed to get seed from existing project', {metadata: err});
                        finish(err);
                    } else {
                        _createProjectFromSeed(storage, projectName, ownerId, jsonSeed_, parameters.seedName, finish);
                    }
                });
            } else {
                logger.error('Unknown seeding type', parameters.type);
                finish(new Error('Unknown seeding type' + parameters.type));
            }
        } else {
            finish(new Error('problems connecting to the webgme server'));
        }
    });
}

// AddOn functionality
function getAddOn(name) {
    return requireJS('addon/' + name + '/' + name + '/' + name);
}

function initConnectedWorker(webGMESessionId, userId, addOnName, projectId, branchName, callback) {
    if (!addOnName || !projectId || !branchName) {
        return setImmediate(callback, 'Required parameter was not provided');
    }
    var AddOn = getAddOn(addOnName),
        storage = getConnectedStorage(webGMESessionId);

    _addOn = new AddOn(Core, storage, gmeConfig, logger.fork('addOn_' + addOnName), userId);
    //for the initialization we need the project as well
    storage.open(function (networkStatus) {
        if (networkStatus === STORAGE_CONSTANTS.CONNECTED) {
            logger.debug('starting addon', {metadata: addOnName});
            _addOn.start({
                projectId: projectId,
                branchName: branchName,
                logger: logger.fork(addOnName)
            }, function (err) {
                var myCallback = callback;
                callback = function () {
                };
                myCallback(err);
            });
        } else {
            storage.close(function (closeErr) {
                if (closeErr) {
                    logger.error('error closing storage', closeErr);
                }
                callback('unable to connect to webgme server');
            });
        }
    });
}

function connectedWorkerQuery(parameters, callback) {
    if (_addOn) {
        _addOn.query(parameters, callback);
    } else {
        callback('the addon is not running');
    }
}

function connectedworkerStop(callback) {
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
}

// Merging functionality
function autoMerge(webGMESessionId, userName, projectId, mine, theirs, callback) {
    var storage = getConnectedStorage(webGMESessionId),
        mergeResult = {},
        finish = function (err) {
            storage.close(function (closeErr) {
                callback(err || closeErr, mergeResult);
            });
        };
    logger.debug('autoMerge ' + projectId + ' ' + mine + ' -> ' + theirs);

    storage.open(function (networkState) {
        if (networkState === STORAGE_CONSTANTS.CONNECTED) {
            storage.openProject(projectId, function (err, project /*, branches*/) {
                if (err) {
                    finish(err);
                    return;
                }

                merger.merge({
                    project: project,
                    gmeConfig: gmeConfig,
                    logger: logger.fork('merge'),
                    myBranchOrCommit: mine,
                    theirBranchOrCommit: theirs,
                    auto: true
                })
                    .then(function (result) {
                        mergeResult = result;
                        finish(null);
                    })
                    .catch(finish);
            });
        } else {
            finish('unable to establish connection to webgme');
        }
    });
}

function resolve(webGMESessionId, userName, partial, callback) {
    var storage = getConnectedStorage(webGMESessionId),
        result = {},
        finish = function (err) {
            storage.close(function (closeErr) {
                callback(err || closeErr, result);
            });
        };
    logger.debug('resolve ' + partial.projectId + ' ' + partial.baseCommitHash + ' -> ' + partial.branchName);
    storage.open(function (networkState) {
        if (networkState === STORAGE_CONSTANTS.CONNECTED) {
            storage.openProject(partial.projectId, function (err, project /*, branches*/) {
                if (err) {
                    finish(err);
                    return;
                }

                merger.resolve({
                    project: project,
                    gmeConfig: gmeConfig,
                    logger: logger.fork('merge'),
                    partial: partial
                })
                    .then(function (resolve) {
                        result = resolve;
                        finish(null);
                    })
                    .catch(finish);
            });
        } else {
            finish('unable to establish connection to webgme');
        }
    });
}

//main message processing loop
process.on('message', function (parameters) {
    var resultHandling = function (err, r) {
        r = r || null;
        logger.debug('resultHandling invoked');

        if (err) {
            logger.error('resultHandling called with error', {metadata: err});
            err = err instanceof Error ? err : new Error(err);
        }

        if (resultRequested === true) {
            logger.debug('result was requested, result:', {metadata: r});
            initResult();
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.result, error: err ? err.message : null, result: r});
        } else {
            logger.debug('result was NOT requested, result:', {metadata: r});
            resultReady = true;
            error = err ? err.message : null;
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

    logger.debug('Incoming message:', {metadata: parameters});
    if (parameters.command !== CONSTANT.workerCommands.getResult) {
        resultId = GUID();
    }
    if (parameters.command === CONSTANT.workerCommands.dumpMoreNodes) {
        if (typeof parameters.projectId === 'string' &&
            typeof parameters.hash === 'string' &&
            parameters.nodes && parameters.nodes.length) {
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
            dumpMoreNodes(parameters.webGMESessionId, parameters.projectId, parameters.hash, parameters.nodes,
                resultHandling);
        } else {
            initResult();
            safeSend({
                pid: process.pid,
                type: CONSTANT.msgTypes.request,
                error: 'invalid parameters: ' + JSON.stringify(parameters)
            });
        }
    } else if (parameters.command === CONSTANT.workerCommands.getResult) {
        if (resultId) {
            if (resultReady === true) {
                var e = error,
                    r = result;

                initResult();
                safeSend({pid: process.pid, type: CONSTANT.msgTypes.result, error: e, result: r});
            } else {
                resultRequested = true;
            }
        } else {
            safeSend({
                pid: process.pid,
                type: CONSTANT.msgTypes.request,
                error: 'no work was started yet',
                resid: null
            });
        }
    } else if (parameters.command === CONSTANT.workerCommands.executePlugin) {
        if (gmeConfig.plugin.allowServerExecution) {
            if (typeof parameters.name === 'string' && typeof parameters.context === 'object') {
                executePlugin(parameters.webGMESessionId, parameters.userId, parameters.name, parameters.context,
                    function (err, result) {
                        safeSend({
                            pid: process.pid,
                            type: CONSTANT.msgTypes.result,
                            error: err ? err.message : null,
                            result: result
                        });
                    }
                );
            } else {
                initResult();
                safeSend({
                    pid: process.pid,
                    type: CONSTANT.msgTypes.result,
                    error: 'invalid parameters: ' + JSON.stringify(parameters),
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
        if (typeof parameters.projectId === 'string' &&
            (typeof parameters.hash === 'string' ||
            typeof parameters.branchName === 'string' ||
            typeof parameters.commit === 'string') &&
            typeof parameters.path === 'string') {
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
            exportLibrary(parameters.webGMESessionId, parameters.projectId, parameters.hash,
                parameters.branchName, parameters.commit, parameters.path, resultHandling);
        } else {
            initResult();
            safeSend({
                pid: process.pid,
                type: CONSTANT.msgTypes.request,
                error: 'invalid parameters: ' + JSON.stringify(parameters)
            });
        }
    } else if (parameters.command === CONSTANT.workerCommands.seedProject) {
        if (typeof parameters.projectName === 'string') {
            safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
            parameters.type = parameters.type || 'db';
            seedProject(parameters.webGMESessionId, parameters.projectName, parameters.ownerId, parameters,
                resultHandling);
        } else {
            initResult();
            safeSend({
                pid: process.pid,
                type: CONSTANT.msgTypes.request,
                error: 'invalid parameters: ' + JSON.stringify(parameters)
            });
        }
    } else if (parameters.command === CONSTANT.workerCommands.connectedWorkerStart) {
        if (gmeConfig.addOn.enable === true) {
            initConnectedWorker(parameters.webGMESessionId, parameters.userId, parameters.workerName,
                parameters.projectId, parameters.branch,
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
    } else if (parameters.command === CONSTANT.workerCommands.autoMerge) {
        safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
        autoMerge(parameters.webGMESessionId,
            parameters.userId,
            parameters.projectId,
            parameters.mine,
            parameters.theirs,
            resultHandling);
    } else if (parameters.command === CONSTANT.workerCommands.resolve) {
        safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
        resolve(parameters.webGMESessionId,
            parameters.userId,
            parameters.partial,
            resultHandling);
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

// graceful ending of the child process
process.on('SIGINT', function () {
    if (logger) {
        logger.debug('stopping child process');
    } else {
        //console.error('child was killed without initialization');
        process.exit(1);
    }
});
