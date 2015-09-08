/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Core = requireJS('common/core/core'),
    Storage = requireJS('common/storage/nodestorage'),
    Serialization = requireJS('common/core/users/serialization'),
    STORAGE_CONSTANTS = requireJS('common/storage/constants'),
    merger = requireJS('common/core/users/merge'),
    BlobClient = requireJS('common/blob/BlobClient'),

    FS = require('fs'),

    PluginNodeManager = require('../../plugin/nodemanager');


function WorkerRequests(mainLogger, gmeConfig) {
    var logger = mainLogger.fork('WorkerFunctions');

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

        if (typeof projectId !== 'string' ||
            typeof libraryRootPath !== 'string' || !(typeof parameters.hash === 'string' ||
            typeof parameters.branchName === 'string' ||
            typeof parameters.commit === 'string')
        ) {
            callback(new Error('invalid parameters: ' + JSON.stringify(parameters)));
            return;
        }

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

                        _serializeToBlob(webGMESessionId, project, commitObject.root, libraryRootPath, fileName,
                            finish);
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
    function executePlugin(webGMESessionId, pluginName, context, callback) {
        var storage = getConnectedStorage(webGMESessionId),
            errResult,
            pluginManager = new PluginNodeManager(webGMESessionId, null, logger, gmeConfig),
            finish = function (err, result) {
                if (err) {
                    err = err instanceof Error ? err : new Error(err);
                    logger.error('plugin [' + pluginName + '] failed with error', {metadata: err});
                    if (!result) {
                        result = pluginManager.getPluginErrorResult(pluginName, err.message);
                    }
                } else {
                    logger.info('plugin [' + pluginName + '] completed');
                }
                storage.close(function (closeErr) {
                    callback(err || closeErr, result.serialize());
                });
            };

        if (gmeConfig.plugin.allowServerExecution === false) {
            errResult = pluginManager.getPluginErrorResult(pluginName, 'plugin execution on server side is disabled');
            callback(null, errResult);
            return;
        }

        if (typeof pluginName !== 'string' || typeof context !== 'object') {
            errResult = pluginManager.getPluginErrorResult(pluginName, 'invalid parameters');
            callback(new Error('invalid parameters'), errResult);
            return;
        }


        logger.info('executePlugin', pluginName);

        logger.debug('executePlugin context', {metadata: context});

        storage.open(function (networkState) {
            logger.debug('storage is open');
            if (networkState === STORAGE_CONSTANTS.CONNECTED) {
                storage.openProject(context.managerConfig.project, function (err, project, branches) {
                    var pluginContext;
                    if (err) {
                        finish(err);
                        return;
                    }
                    logger.debug('Opened project, got branches:', context.managerConfig.project, branches);

                    pluginContext = {
                        project: project,
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

                    project.makeCommit(null, [], persisted.rootHash, persisted.objects,
                        'seeding project[' + seedName + ']')
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
        if (typeof projectName !== 'string' || parameters === null || typeof parameters !== 'object' ||
            typeof parameters.seedName !== 'string' || typeof parameters.type !== 'string') {
            callback(new Error('Invalid parameters'));
            return;
        }

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
                            _createProjectFromSeed(storage, projectName, ownerId, jsonSeed_, parameters.seedName,
                                finish);
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

    return {
        exportLibrary: exportLibrary,
        executePlugin: executePlugin,
        seedProject: seedProject,
        autoMerge: autoMerge,
        resolve: resolve
    };
}

module.exports = WorkerRequests;