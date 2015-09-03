/*globals requireJS*/
/*jshint node:true*/

/**
 * @module Server.SimpleWorker
 * @author kecso / https://github.com/kecso
 */

'use strict';

var WEBGME = require(__dirname + '/../../../webgme'),
    Core = requireJS('common/core/core'),
    Storage = requireJS('common/storage/nodestorage'),
    Serialization = requireJS('common/core/users/serialization'),
    PluginResult = requireJS('plugin/PluginResult'),
    PluginMessage = requireJS('plugin/PluginMessage'),
    STORAGE_CONSTANTS = requireJS('common/storage/constants'),
    merger = requireJS('common/core/users/merge'),
    BlobClient = requireJS('common/blob/BlobClient'),

    FS = require('fs'),

    PluginNodeManager = require('../../plugin/nodemanager'),
    CONSTANT = require('./constants'),
    Logger = require('../logger'),

//core = null,
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

// Helper functions
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

function getConnectedStorage(webGMESessionId) {
    var host = '127.0.0.1', //TODO: this should come from gmeConfig
        storage = Storage.createStorage(host, webGMESessionId, logger, gmeConfig);

    return storage;
}

// Export functionality
function _serializeToBlob(webGMESessionId, project, rootHash, libraryRootPath, fileName, callback) {
    var core = new Core(project, {
            globConf: gmeConfig,
            logger: logger.fork('core')
        }),
        blobClient = new BlobClient({
            serverPort: gmeConfig.server.port,
            httpsecure: gmeConfig.server.https.enable,
            server: '127.0.0.1',
            webgmeclientsession: webGMESessionId
        }),
        artie;

    core.loadRoot(rootHash, function (err, rootNode) {
        if (err) {
            callback(new Error(err));
            return;
        }

        core.loadByPath(rootNode, libraryRootPath, function (err, libraryRoot) {
            if (err) {
                callback(new Error(err));
                return;
            }
            Serialization.export(core, libraryRoot, function (err, projectJson) {
                if (err) {
                    callback(new Error(err));
                    return;
                }

                artie = blobClient.createArtifact('exported');
                artie.addFile(fileName, JSON.stringify(projectJson, null, 4), function (err, fileHash) {
                    if (err) {
                        callback(new Error(err));
                        return;
                    }
                    artie.save(function (err, artifactHash) {
                        var result;
                        if (err) {
                            callback(new Error(err));
                            return;
                        }

                        result = {
                            file: {
                                hash: fileHash,
                                url: blobClient.getDownloadURL(fileHash)
                            },
                            artifact: {
                                hash: artifactHash,
                                url: blobClient.getDownloadURL(artifactHash)
                            }
                        };

                        callback(null, result);
                    });
                });
            });
        });
    });
}

/**
 *
 * @param {string} webGMESessionId
 * @param {string} projectId
 * @param {string} libraryRootPath
 * @param {object} parameters - Specify one from where to export. If more than one given the precedence order is:
 * hash, commit, branchName.
 * @param {string} [parameters.hash] - Root hash to export from.
 * @param {string} [parameters.commit] - Commit hash to export from.
 * @param {string} [parameters.branchName] - Branch to export from.
 * @param {function} callback
 */
function exportLibrary(webGMESessionId, projectId, libraryRootPath, parameters, callback) {
    var storage = getConnectedStorage(webGMESessionId),
        finish = function (err, result) {
            if (err) {
                err = err instanceof Error ? err : new Error(err);
                logger.error('exportLibrary [' + projectId + '] failed with error', {metadata: err});
            } else {
                logger.info('exportLibrary [' + projectId + '] completed fileUrl:', result.file.url);
            }
            storage.close(function (closeErr) {
                callback(err || closeErr, result);
            });
        };

    logger.info('exportLibrary', projectId);

    storage.open(function (networkState) {
        if (networkState === STORAGE_CONSTANTS.CONNECTED) {

            storage.openProject(projectId, function (err, project, branches) {
                var commitHash,
                    fileName = projectId + '_',
                    fileEnd = libraryRootPath === '' ? '.json' : '_lib.json';
                if (err) {
                    finish(err);
                    return;
                }

                if (parameters.hash) {
                    fileName += parameters.hash.substring(1, 7) + fileEnd;
                    logger.debug('RootHash was given fileName:', fileName);
                    _serializeToBlob(webGMESessionId, project, parameters.hash, libraryRootPath, fileName, finish);
                    return;
                }

                if (parameters.commit) {
                    fileName += parameters.commit.substring(1, 7) + fileEnd;
                    commitHash = parameters.commit;
                    logger.debug('CommitHash was given fileName:', fileName);
                } else {
                    commitHash = branches[parameters.branchName];
                    if (!commitHash) {
                        logger.error('Branches: ', {metadata: branches});
                        finish(new Error('Branch not found, projectId: "' + projectId + '", branchName: "' +
                            parameters.branchName + '".'));
                        return;
                    }
                    fileName += parameters.branchName + fileEnd;
                    logger.debug('BranchName was given', fileName);
                }

                project.loadObject(commitHash, function (err, commitObject) {
                    if (err) {
                        finish(new Error('Failed loading commitHash: ' + err));
                        return;
                    }

                    _serializeToBlob(webGMESessionId, project, commitObject.root, libraryRootPath, fileName, finish);
                });
            });
        } else {
            finish(new Error('Problems connecting to the webgme server, network state: ' + networkState));
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
        startTime = (new Date()).toISOString(),
        finish = function (err, result) {
            var pluginMessage;
            if (err) {
                err = err instanceof Error ? err : new Error(err);
                logger.error('plugin [' + pluginName + '] failed with error', {metadata: err});
                if (!result) {
                    result = new PluginResult();
                    pluginMessage = new PluginMessage();
                    pluginMessage.severity = 'error';
                    pluginMessage.message = err.message;
                    result.setSuccess(false);
                    result.pluginName = pluginName;
                    result.addMessage(pluginMessage);
                    result.setStartTime(startTime);
                    result.setFinishTime((new Date()).toISOString());
                    result.setError(pluginMessage.message);
                }
            } else {
                logger.info('plugin [' + pluginName + '] completed');
            }
            storage.close(function (closeErr) {
                callback(err || closeErr, result.serialize());
            });
        };


    logger.info('executePlugin', userId, pluginName);

    logger.debug('executePlugin context', {metadata: context});
    storage.open(function (networkState) {
        logger.debug('storage is open');
        if (networkState === STORAGE_CONSTANTS.CONNECTED) {
            storage.openProject(context.managerConfig.project, function (err, project, branches) {
                var pluginManager,
                    pluginContext;
                if (err) {
                    finish(err);
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

                pluginManager.executePlugin(pluginName, context.pluginConfig, pluginContext, finish);
            });
        } else {
            finish(new Error('Problems connecting to the webgme server, network state: ' + networkState));
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
            callback(err);
            return;
        }
        if (branches.hasOwnProperty(branchName) === false) {
            callback(new Error('Branch did not exist [' + branchName + ']'));
            return;
        }
        project.loadObject(branches[branchName], function (err, commit) {
            if (err) {
                callback(new Error(err));
                return;
            }

            var core = new Core(project, {
                globConf: gmeConfig,
                logger: logger.fork('core')
            });

            core.loadRoot(commit.root, function (err, root) {
                if (err) {
                    callback(new Error(err));
                    return;
                }

                Serialization.export(core, root, function (err, jsonExport) {
                    if (err) {
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
            callback(err);
            return;
        }
        storage.openProject(projectId, function (err, project) {
            var core,
                rootNode;
            if (err) {
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
                    callback(new Error(err));
                    return;
                }
                var persisted = core.persist(rootNode);

                project.makeCommit(null, [], persisted.rootHash, persisted.objects, 'seeding project[' + seedName + ']')
                    .then(function (commitResult) {
                        logger.debug('seeding project, commitResult:', {metadata: commitResult});
                        return project.createBranch('master', commitResult.hash);
                    })
                    .then(function () {
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
 * @param {string} [ownerId] - Owner of new project, if not given falls back to user associated with the session.
 * @param {object} parameters
 * @param {string} parameters.seedName - Name of seed, file or projectId.
 * @param {string} parameters.type - 'db' or 'file'
 * @param {string} [parameters.seedBranch='master'] - If db - optional name of branch.
 * @param [function} callback
 */
function seedProject(webGMESessionId, projectName, ownerId, parameters, callback) {
    var storage = getConnectedStorage(webGMESessionId),
        finish = function (err, result) {
            if (err) {
                err = err instanceof Error ? err : new Error(err);
                logger.error('seeding [' + parameters.seedName + '] failed with error', {metadata: err});
            } else {
                logger.info('seeding [' + parameters.seedName + '] to [' + result.projectId + '] completed');
            }
            storage.close(function (closeErr) {
                callback(err || closeErr, result);
            });
        };

    logger.info('seedProject');

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
                        finish(err);
                    } else {
                        _createProjectFromSeed(storage, projectName, ownerId, jsonSeed_, parameters.seedName, finish);
                    }
                });
            } else {
                finish(new Error('Unknown seeding type [' + parameters.type + ']'));
            }
        } else {
            finish(new Error('Problems connecting to the webgme server, network state: ' + networkState));
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

/**
 *
 * @param {string} webGMESessionId
 * @param {string} projectId
 * @param {string} mine - CommitHash or branchName merge into 'theirs'.
 * @param {string} theirs - CommitHash or branchName that 'mine' will be merged into.
 * @param {function} callback
 */
function autoMerge(webGMESessionId, projectId, mine, theirs, callback) {
    var storage = getConnectedStorage(webGMESessionId),
        finish = function (err, result) {
            if (err) {
                err = err instanceof Error ? err : new Error(err);
                logger.error('autoMerge [' + projectId + '] failed with error', {metadata: err});
            } else {
                logger.info('autoMerge [' + projectId + '] completed');
            }
            storage.close(function (closeErr) {
                callback(err || closeErr, result);
            });
        };

    logger.info('autoMerge ' + projectId + ' ' + mine + ' -> ' + theirs);

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
                    .nodeify(finish);
            });
        } else {
            finish(new Error('Problems connecting to the webgme server, network state: ' + networkState));
        }
    });
}

/**
 *
 * @param {string} webGMESessionId
 * @param {object} partial
 * @param {function} callback
 */
function resolve(webGMESessionId, partial, callback) {
    var storage = getConnectedStorage(webGMESessionId),
        finish = function (err, result) {
            if (err) {
                err = err instanceof Error ? err : new Error(err);
                logger.error('resolve [' + partial.projectId + '] failed with error', {metadata: err});
            } else {
                logger.info('resolve [' + partial.projectId + '] completed');
            }
            storage.close(function (closeErr) {
                callback(err || closeErr, result);
            });
        };

    logger.info('resolve ' + partial.projectId + ' ' + partial.baseCommitHash + ' -> ' + partial.branchName);

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
                    .nodeify(finish);
            });
        } else {
            finish(new Error('Problems connecting to the webgme server, network state: ' + networkState));
        }
    });
}

//main message processing loop
process.on('message', function (parameters) {
    parameters = parameters || {};
    parameters.command = parameters.command;

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
    if (parameters.command === CONSTANT.workerCommands.executePlugin) {
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
                safeSend({
                    pid: process.pid,
                    type: CONSTANT.msgTypes.result,
                    error: 'invalid parameters: ' + JSON.stringify(parameters),
                    result: {}
                });
            }
        } else {
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
            //safeSend({pid: process.pid, type: CONSTANT.msgTypes.request, error: null, resid: resultId});
            exportLibrary(parameters.webGMESessionId, parameters.projectId, parameters.path, parameters,
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
            safeSend({
                pid: process.pid,
                type: CONSTANT.msgTypes.result,
                error: 'invalid parameters: ' + JSON.stringify(parameters)
            });
        }
    } else if (parameters.command === CONSTANT.workerCommands.seedProject) {
        if (typeof parameters.projectName === 'string' && parameters.ownerId) {
            parameters.type = parameters.type || 'db';
            seedProject(parameters.webGMESessionId, parameters.projectName, parameters.ownerId, parameters,
                function (err, result) {
                    safeSend({
                        pid: process.pid,
                        type: CONSTANT.msgTypes.result,
                        error: err ? err.message : null,
                        result: result
                    });
                });
        } else {
            safeSend({
                pid: process.pid,
                type: CONSTANT.msgTypes.result,
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
        autoMerge(parameters.webGMESessionId, parameters.projectId, parameters.mine, parameters.theirs,
            function (err, result) {
                safeSend({
                    pid: process.pid,
                    type: CONSTANT.msgTypes.result,
                    error: err ? err.message : null,
                    result: result
                });
            });
    } else if (parameters.command === CONSTANT.workerCommands.resolve) {
        resolve(parameters.webGMESessionId, parameters.partial, function (err, result) {
            safeSend({
                pid: process.pid,
                type: CONSTANT.msgTypes.result,
                error: err ? err.message : null,
                result: result
            });
        });
    } else {
        safeSend({
            pid: process.pid,
            type: CONSTANT.msgTypes.result,
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
