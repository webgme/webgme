/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Core = requireJS('common/core/coreQ'),
    Storage = requireJS('common/storage/nodestorage'),
    Serialization = requireJS('common/core/users/serialization'),
    STORAGE_CONSTANTS = requireJS('common/storage/constants'),
    CORE_CONSTANTS = requireJS('common/core/constants'),
    merger = requireJS('common/core/users/merge'),
    BlobClientClass = requireJS('common/blob/BlobClient'),
    blobUtil = requireJS('common/blob/util'),
    constraint = requireJS('common/core/users/constraintchecker'),
    UINT = requireJS('common/util/uint'),
    GUID = requireJS('common/util/guid'),
    REGEXP = requireJS('common/regexp'),
    BlobConfig = requireJS('common/blob/BlobConfig'),
    webgmeUtils = require('../../utils'),

// JsZip can't for some reason extract the exported files..
    AdmZip = require('adm-zip'),

    FS = require('fs'),
    Q = require('q'),

    PluginNodeManager = require('../../plugin/nodemanager');

/**
 *
 * @param {GmeLogger} mainLogger
 * @param {GmeConfig} gmeConfig
 * @constructor
 */
function WorkerRequests(mainLogger, gmeConfig) {
    var logger = mainLogger.fork('WorkerFunctions');

    function getConnectedStorage(webgmeToken, callback) {
        var deferred = Q.defer(),
            host = '127.0.0.1', //TODO: this should come from gmeConfig
            storage = Storage.createStorage(host, webgmeToken, logger, gmeConfig);

        storage.open(function (networkState) {
            if (networkState === STORAGE_CONSTANTS.CONNECTED) {
                deferred.resolve(storage);
            } else {
                deferred.reject(new Error('Problems connecting to the webgme server, network state: ' + networkState));
            }
        });

        return deferred.promise.nodeify(callback);
    }

    function _getCoreAndRootNode(storage, projectId, commitHash, branchName, callback) {
        var deferred = Q.defer();

        storage.openProject(projectId, function (err, project, branches) {
            if (err) {
                deferred.reject(err);
                return;
            }

            if (branchName) {
                if (branches.hasOwnProperty(branchName) === false) {
                    deferred.reject(new Error('Branch did not exist [' + branchName + ']'));
                    return;
                }
                commitHash = branches[branchName];
            }

            project.loadObject(commitHash, function (err, commitObject) {
                if (err) {
                    deferred.reject(new Error(err));
                    return;
                }

                var core = new Core(project, {
                    globConf: gmeConfig,
                    logger: logger.fork('core')
                });

                core.loadRoot(commitObject.root, function (err, rootNode) {
                    if (err) {
                        deferred.reject(new Error(err));
                        return;
                    }
                    deferred.resolve({
                        project: project,
                        core: core,
                        rootNode: rootNode,
                        commitObject: commitObject
                    });
                });
            });
        });

        return deferred.promise.nodeify(callback);
    }

    function _checkNodeForGuidCollision(core, node, guidsSoFar) {
        var guid = core.getGuid(node),
            newGuid;

        if (guidsSoFar[guid]) {
            newGuid = GUID().replace(/-/g, ''); //TODO should we need global utility for this??
            logger.info('new guid [' + newGuid + '] has been generated for node [' + core.getPath(node) + ']');
            core.setAttribute(node, CORE_CONSTANTS.OWN_GUID, newGuid);
            guidsSoFar[core.getGuid(node)] = true;
        } else {
            guidsSoFar[guid] = true;
        }
    }

    function _checkGuidsNodeByNode(core, root) {
        var taskQueue = [''],
            working = false,
            timerId,
            deferred = Q.defer(),
            guids = {};

        timerId = setInterval(function () {
            var task;
            if (!working) {
                task = taskQueue.shift();

                if (typeof task !== 'string') {
                    //we are done
                    clearInterval(timerId);
                    deferred.resolve();
                    return;
                }

                working = true;
                core.loadByPath(root, task, function (err, node) {
                    if (!err && node) {
                        _checkNodeForGuidCollision(core, node, guids);
                        taskQueue = taskQueue.concat(core.getOwnChildrenPaths(node));
                    } else {
                        logger.error('[' + task + '] cannot be loaded and will be skipped during check');
                    }
                    working = false;
                });
            }
        }, 1);

        return deferred.promise;
    }

    // Export functionality
    function _serializeToBlob(webgmeToken, project, rootHash, libraryRootPath, fileName, callback) {
        var core = new Core(project, {
                globConf: gmeConfig,
                logger: logger.fork('core')
            }),
            blobClient = new BlobClientClass({
                serverPort: gmeConfig.server.port,
                httpsecure: false,
                server: '127.0.0.1',
                webgmeToken: webgmeToken,
                logger: logger.fork('BlobClient')
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
                Serialization.export(core, libraryRoot, function (error, projectJson) {
                    if (!projectJson) {
                        callback(new Error(error || 'no output have been generated as a result of export!'));
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

                            // We keep the original errors of export.
                            if (error) {
                                callback(new Error(error), result);
                            } else {
                                callback(null, result);
                            }
                        });
                    });
                });
            });
        });
    }

    /**
     *
     * @param {string} webgmeToken
     * @param {string} projectId
     * @param {string} libraryRootPath
     * @param {object} parameters - Specify one from where to export. If more than one given the precedence order is:
     * hash, commit, branchName.
     * @param {string} [parameters.hash] - Root hash to export from.
     * @param {string} [parameters.commit] - Commit hash to export from.
     * @param {string} [parameters.branchName] - Branch to export from.
     * @param {function} callback
     */
    function exportLibrary(webgmeToken, projectId, libraryRootPath, parameters, callback) {
        var storage,
            finish = function (err, result) {
                if (err) {
                    err = err instanceof Error ? err : new Error(err);
                    logger.error('exportLibrary [' + projectId + '] failed with error', err);
                } else {
                    logger.debug('exportLibrary [' + projectId + '] completed fileUrl:', result.file.url);
                }
                storage.close(function (closeErr) {
                    callback(err || closeErr, result);
                });
            };

        logger.debug('exportLibrary', projectId);

        if (typeof projectId !== 'string' ||
            typeof libraryRootPath !== 'string' || !(typeof parameters.hash === 'string' ||
            typeof parameters.branchName === 'string' ||
            typeof parameters.commit === 'string')
        ) {
            callback(new Error('invalid parameters: ' + JSON.stringify(parameters)));
            return;
        }

        getConnectedStorage(webgmeToken)
            .then(function (storage_) {
                storage = storage_;

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
                        _serializeToBlob(webgmeToken, project, parameters.hash, libraryRootPath, fileName, finish);
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

                        _serializeToBlob(webgmeToken, project, commitObject.root, libraryRootPath, fileName,
                            finish);
                    });
                });
            })
            .catch(finish);
    }

    /**
     * Executes a plugin.
     *
     * @param {string} webgmeToken
     * @param {string} [socketId] - Id of socket that send the request (used for notifications).
     * @param {string} pluginName
     * @param {object} context.managerConfig - where the plugin should execute.
     * @param {string} context.managerConfig.project - id of project.
     * @param {string} context.managerConfig.activeNode - path to activeNode.
     * @param {string} [context.managerConfig.activeSelection=[]] - paths to selected nodes.
     * @param {string} [context.managerConfig.commit] - commit hash to start the plugin from (if falsy will use HEAD of branchName)
     * @param {string} context.managerConfig.branchName - branch which to save to.
     * @param {object} [context.pluginConfig=%defaultForPlugin%] - specific configuration for the plugin.
     * @param {function} callback
     */
    function executePlugin(webgmeToken, socketId, pluginName, context, callback) {
        var storage,
            errResult,
            pluginManager = new PluginNodeManager(webgmeToken, null, logger, gmeConfig),
            finish = function (err, result) {
                if (err) {
                    err = err instanceof Error ? err : new Error(err);
                    logger.error('plugin [' + pluginName + '] failed with error', err);
                    if (!result) {
                        result = pluginManager.getPluginErrorResult(pluginName, err.message,
                            context && context.managerConfig && context.managerConfig.project);
                    } else if (!result.error) {
                        result.error = err.message;
                    }
                } else {
                    logger.debug('plugin [' + pluginName + '] completed');
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

        logger.debug('executePlugin', pluginName, socketId);

        logger.debug('executePlugin context', {metadata: context});

        getConnectedStorage(webgmeToken)
            .then(function (storage_) {
                storage = storage_;
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
                    if (typeof socketId === 'string') {
                        logger.debug('socketId provided for plugin execution - notifications available.');
                        pluginManager.notificationHandlers = [function (data, callback) {
                            data.socketId = socketId;
                            storage.webSocket.sendNotification(data, callback);
                        }];
                    } else {
                        logger.warn('No socketId provided for plugin execution - notifications NOT available.');
                    }

                    pluginManager.executePlugin(pluginName, context.pluginConfig, pluginContext, finish);
                });
            })
            .catch(finish);
    }

    // Seeding functionality
    function _findSeedFilename(name) {
        var deferred = Q.defer(),
            seedDictionary = webgmeUtils.getSeedDictionary(gmeConfig),
            i,
            filename,
            names;

        // TODO: maybe read the dirs async.
        // It uses a promise here to avoid extra try-catch in _getSeedFromFile..

        if (gmeConfig.seedProjects.enable !== true) {
            deferred.reject(new Error('seeding is disabled'));
        } else {
            filename = seedDictionary[name];
            if (filename) {
                deferred.resolve(filename);
            } else {
                deferred.reject(new Error('unknown file seed [' + name + ']'));
            }
        }

        return deferred.promise;
    }

    /**
     * Extracts the exported zip file and adds the contained files to the blob using
     * the import-part of ExportImport Plugin.
     * @param {string} filename
     * @param {BlobClient} blobClient
     * @param function [callback]
     * @returns {string} - The project json as a string
     * @private
     */
    function _addZippedExportToBlob(filename, blobClient, callback) {
        var zip = new AdmZip(filename),
            artifact = blobClient.createArtifact('files'),
            projectStr;

        return Q.all(zip.getEntries().map(function (entry) {
                var entryName = entry.entryName;
                if (entryName === 'project.json') {
                    projectStr = zip.readAsText(entry);
                } else {
                    return Q.ninvoke(artifact, 'addFileAsSoftLink', entryName, zip.readFile(entry));
                }
            })
            )
            .then(function () {
                var metadata = artifact.descriptor;
                return blobUtil.addAssetsFromExportedProject(logger, blobClient, metadata);
            })
            .then(function () {
                return projectStr;
            })
            .nodeify(callback);
    }

    function _getSeedFromFile(name, webgmeToken) {
        return _findSeedFilename(name)
            .then(function (filename) {
                var blobClient,
                    legacy = true,
                    deferred;

                if (filename.toLowerCase().indexOf('.json') > -1) {
                    logger.debug('Found .json seed at:', filename);
                    logger.warn('Seeding from an exported json-file is deprecated and will be removed in v2.0.0. ' +
                        'Export your libraries as webgmex files instead.');
                    return Q.ninvoke(FS, 'readFile', filename);
                } else if (filename.toLowerCase().indexOf('.zip') > -1 ||
                    filename.toLowerCase().indexOf('.webgmex') > -1) {
                    deferred = Q.defer();

                    if (filename.toLowerCase().indexOf('.webgmex') > -1) {
                        logger.debug('Found .webgmex seed at:', filename);
                        legacy = false;
                    } else {
                        logger.debug('Found .zip seed at:', filename);
                        logger.warn('Seeding from an exported zip-file is deprecated and will be removed in v2.0.0. ' +
                            'Export your libraries as webgmex files instead.');
                    }

                    blobClient = new BlobClientClass({
                        serverPort: gmeConfig.server.port,
                        httpsecure: false,
                        server: '127.0.0.1',
                        webgmeToken: webgmeToken,
                        logger: logger.fork('BlobClient')
                    });

                    _addZippedExportToBlob(filename, blobClient)
                        .then(function (jsonProject) {
                            if (legacy) {
                                deferred.resolve(jsonProject);
                            } else {
                                deferred.resolve(JSON.stringify({
                                    seed: JSON.parse(jsonProject),
                                    isLegacy: false
                                }));
                            }
                        })
                        .catch(deferred.reject);

                    return deferred.promise;
                } else {
                    throw new Error('Unexpected file');
                }
            })
            .then(function (jsonStr) {
                return JSON.parse(jsonStr);
            });
    }

    function _getSeedFromProject(storage, projectId, branchName, callback) {
        var deferred = Q.defer();
        branchName = branchName || 'master';

        _getCoreAndRootNode(storage, projectId, null, branchName)
            .then(function (res) {
                Serialization.export(res.core, res.rootNode, function (err, jsonExport) {
                    if (err) {
                        deferred.reject(new Error(err));
                    } else {
                        deferred.resolve(jsonExport);
                    }
                });
            })
            .catch(deferred.reject);

        return deferred.promise.nodeify(callback);
    }

    function _getSeedFromBlob(hash, webgmeToken) {
        var blobClient = new BlobClientClass({
            serverPort: gmeConfig.server.port,
            httpsecure: false,
            server: '127.0.0.1',
            webgmeToken: webgmeToken,
            logger: logger.fork('BlobClient')
        });

        return Q.ninvoke(blobClient, 'getMetadata', hash)
            .then(function (metadata) {
                if (metadata.mime !== 'application/json') {
                    throw new Error('Wrong file type of blob seed: ' + JSON.stringify(metadata));
                }

                return Q.ninvoke(blobClient, 'getObject', hash);
            })
            .then(function (buffer) {
                var jsonProj = JSON.parse(UINT.uint8ArrayToString(new Uint8Array(buffer)));

                if (jsonProj.root && jsonProj.root.path === '') {
                    return jsonProj;
                } else {
                    throw new Error('Provided blob-seed json was not an exported project');
                }
            });
    }

    function _createProjectFromSeed(storage, projectName, ownerId, jsonSeed, seedName, callback) {
        logger.debug('_createProject');
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
     * @param {string} webgmeToken
     * @param {string} projectName - Name of new project.
     * @param {string} [ownerId] - Owner of new project, if not given falls back to user associated with the token.
     * @param {object} parameters
     * @param {string} parameters.seedName - Name of seed, file or projectId.
     * @param {string} parameters.type - 'db' or 'file'
     * @param {string} [parameters.seedBranch='master'] - If db - optional name of branch.
     * @param [function} callback
     */
    function seedProject(webgmeToken, projectName, ownerId, parameters, callback) {
        var storage,
            legacy = true,
            finish = function (err, result) {
                if (legacy === false) {
                    result = {
                        projectId: result
                    };
                }
                if (err) {
                    err = err instanceof Error ? err : new Error(err);
                    logger.error('seeding [' + parameters.seedName + '] failed with error', err);
                } else {
                    logger.debug('seeding [' + parameters.seedName + '] to [' + result.projectId + '] completed');
                }
                storage.close(function (closeErr) {
                    callback(err || closeErr, result);
                });
            };

        logger.debug('seedProject');

        if (typeof projectName !== 'string' || parameters === null || typeof parameters !== 'object' ||
            typeof parameters.seedName !== 'string' || typeof parameters.type !== 'string') {
            callback(new Error('Invalid parameters'));
            return;
        }

        getConnectedStorage(webgmeToken)
            .then(function (storage_) {
                storage = storage_;
                logger.debug('seedProject - storage is connected');

                if (parameters.type === 'file') {
                    logger.debug('seedProject - seeding from file:', parameters.seedName);
                    return _getSeedFromFile(parameters.seedName, webgmeToken);
                } else if (parameters.type === 'db') {
                    logger.debug('seedProject - seeding from existing project:', parameters.seedName);
                    return _getSeedFromProject(storage, parameters.seedName, parameters.seedBranch);
                } else if (parameters.type === 'blob') {
                    logger.warn('Seeding from an exported json is deprecated and will be removed in v2.0.0. ' +
                        'Export your libraries as webgmex files and use importProjectFromFile.');
                    return _getSeedFromBlob(parameters.seedName, webgmeToken);
                } else {
                    throw new Error('Unknown seeding type [' + parameters.type + ']');
                }
            })
            .then(function (jsonSeed) {
                if (jsonSeed && jsonSeed.seed && jsonSeed.isLegacy === false) {
                    legacy = false;
                    //TODO it should be changed so that all functions above returns with the new format of project
                    _createProjectFromRawJson(storage, projectName, ownerId,
                        parameters.branchName || 'master', jsonSeed.seed, finish);
                } else {
                    _createProjectFromSeed(storage, projectName, ownerId, jsonSeed, parameters.seedName, finish);
                }
            })
            .catch(finish);
    }

    /**
     *
     * @param {string} webgmeToken
     * @param {string} projectId
     * @param {string} mine - CommitHash or branchName merge into 'theirs'.
     * @param {string} theirs - CommitHash or branchName that 'mine' will be merged into.
     * @param {function} callback
     */
    function autoMerge(webgmeToken, projectId, mine, theirs, callback) {
        var storage,
            finish = function (err, result) {
                if (err) {
                    err = err instanceof Error ? err : new Error(err);
                    logger.error('autoMerge [' + projectId + '] failed with error', err);
                } else {
                    logger.debug('autoMerge [' + projectId + '] completed');
                }
                storage.close(function (closeErr) {
                    callback(err || closeErr, result);
                });
            };

        logger.debug('autoMerge ' + projectId + ' ' + mine + ' -> ' + theirs);

        getConnectedStorage(webgmeToken)
            .then(function (storage_) {
                storage = storage_;

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
            })
            .catch(finish);
    }

    /**
     *
     * @param {string} webgmeToken
     * @param {object} partial
     * @param {function} callback
     */
    function resolve(webgmeToken, partial, callback) {
        var storage,
            finish = function (err, result) {
                if (err) {
                    err = err instanceof Error ? err : new Error(err);
                    logger.error('resolve [' + partial.projectId + '] failed with error', err);
                } else {
                    logger.debug('resolve [' + partial.projectId + '] completed');
                }
                storage.close(function (closeErr) {
                    callback(err || closeErr, result);
                });
            };

        logger.debug('resolve ' + partial.projectId + ' ' + partial.baseCommitHash + ' -> ' + partial.branchName);

        getConnectedStorage(webgmeToken)
            .then(function (storage_) {
                storage = storage_;
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
            })
            .catch(finish);
    }

    /**
     *
     * @param {string} webgmeToken
     * @param {string} projectId
     * @param {object} parameters
     * @param {string} parameters.commitHash - State of project to check.
     * @param {string[]} parameters.nodePaths - Paths to nodes to be check.
     * @param {boolean} parameters.includeChildren - If truthy - will recursively check all the children of the nodes.
     * @param {string} [parameters.checkType='META'] - 'META', 'CUSTOM' or 'BOTH'.
     * @param {function} callback
     */
    function checkConstraints(webgmeToken, projectId, parameters, callback) {
        var storage,
            checkType,
            finish = function (err, result) {
                if (err) {
                    err = err instanceof Error ? err : new Error(err);
                    logger.error('checkConstraints [' + projectId + '] failed with error', err);
                } else {
                    logger.debug('checkConstraints [' + projectId + '] completed');
                }
                storage.close(function (closeErr) {
                    callback(err || closeErr, result);
                });
            };

        logger.debug('checkConstraints ' + projectId);

        if (typeof projectId !== 'string' || typeof parameters.commitHash !== 'string' ||
            typeof parameters.nodePaths !== 'object' || parameters.nodePaths instanceof Array !== true) {
            callback(new Error('invalid parameters: ' + JSON.stringify(parameters)));
            return;
        }

        if (parameters.checkType === constraint.TYPES.CUSTOM || parameters.checkType === constraint.TYPES.BOTH) {
            checkType = parameters.checkType;
            if (gmeConfig.core.enableCustomConstraints !== true) {
                callback(new Error('Custom constraints is not enabled!'));
                return;
            }
        } else {
            checkType = constraint.TYPES.META;
        }

        getConnectedStorage(webgmeToken)
            .then(function (storage_) {
                storage = storage_;
                return _getCoreAndRootNode(storage, projectId, parameters.commitHash);
            })
            .then(function (res) {
                var constraintChecker = new constraint.Checker(res.core, logger);

                function checkFromPath(nodePath) {
                    if (parameters.includeChildren) {
                        return constraintChecker.checkModel(nodePath);
                    } else {
                        return constraintChecker.checkNode(nodePath);
                    }
                }

                constraintChecker.initialize(res.rootNode, parameters.commitHash, checkType);

                return Q.all(parameters.nodePaths.map(checkFromPath));
            })
            .nodeify(finish);
    }

    /**
     *
     * @param {string} webgmeToken
     * @param {string} projectId
     * @param {object} commitHash - Starting state of the project
     * @param {function} callback
     */
    function reassignGuids(webgmeToken, projectId, commitHash, callback) {
        var storage,
            checkType,
            context,
            result,
            finish = function (err) {
                if (err) {
                    err = err instanceof Error ? err : new Error(err);
                    logger.error('reassignGuids [' + projectId + '] failed with error', err);
                } else {
                    logger.info('reassignGuids [' + projectId + '] completed');
                }
                storage.close(function (closeErr) {
                    callback(err || closeErr, result);
                });
            };

        logger.info('reassignGuids ' + projectId);

        getConnectedStorage(webgmeToken)
            .then(function (storage_) {
                storage = storage_;
                return _getCoreAndRootNode(storage, projectId, commitHash);
            })
            .then(function (res) {
                context = res;
                return _checkGuidsNodeByNode(res.core, res.rootNode);
            })
            .then(function () {
                var persisted = context.core.persist(context.rootNode);

                return context.project.makeCommit(null, [commitHash], persisted.rootHash, persisted.objects,
                    'Guid reallocation');
            })
            .then(function (commitResult) {
                var branchName = 'guid_' + (new Date()).getTime();

                result = branchName;
                logger.debug('put guid reassign result into branch[' + branchName + ']');
                return context.project.createBranch(branchName, commitResult.hash);
            })
            .nodeify(finish);
    }

    function _collectObjects(project, objectHashArray) {
        var deferred = Q.defer(),
            promises = [],
            objects = [],
            i;

        for (i = 0; i < objectHashArray.length; i += 1) {
            promises.push(Q.ninvoke(project, 'loadObject', objectHashArray[i]));
        }

        Q.allSettled(promises)
            .then(function (results) {
                var error = null,
                    i;
                for (i = 0; i < results.length; i += 1) {
                    if (results[i].state === 'fulfilled') {
                        objects.push(results[i].value);
                    } else {
                        error = error || results[i].reason || new Error('unable to load');
                    }
                }

                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve(objects);
                }
            });
        return deferred.promise;
    }

    function _collectObjectAndAssetHashes(project, rootHash) {
        var deferred = Q.defer(),
            objects = {},
            assets = {},
            queue = [rootHash],
            task,
            error = null,
            working = false,
            timerId;

        timerId = setInterval(function () {
            if (!working) {
                task = queue.shift();
                if (task === undefined) {
                    clearInterval(timerId);
                    if (error) {
                        deferred.reject(error);
                    } else {
                        deferred.resolve({objects: Object.keys(objects), assets: Object.keys(assets)});
                    }
                    return;
                }

                if (!objects[task]) {
                    working = true;
                    project.loadObject(task, function (err, object) {
                        var key;

                        error = error || err;
                        if (!err && object) {
                            objects[task] = true;
                            if (object) {
                                //now put every sub-object on top of the queue
                                for (key in object) {
                                    if (typeof object[key] === 'string' && REGEXP.HASH.test(object[key])) {
                                        queue.push(object[key]);
                                    }
                                }

                                //looking for assets
                                if (object.atr) {
                                    for (key in object.atr) {
                                        if (typeof object.atr[key] === 'string' &&
                                            BlobConfig.hashRegex.test(object.atr[key])) {
                                            assets[object.atr[key]] = true;
                                        }
                                    }
                                }
                            }
                        }
                        working = false;
                    });
                }

            }
        }, 1);

        return deferred.promise;
    }

    function _getRawJsonProject(webgmeToken, projectId, branchName, commitHash, rootHash) {
        var project,
            rawJson = {},
            deferred = Q.defer();

        getConnectedStorage(webgmeToken)
            .then(function (storage) {
                var deferred = Q.defer();

                storage.openProject(projectId, function (err, project_, branches) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        project = project_;
                        deferred.resolve(branches);
                    }
                });
                return deferred.promise;
            })
            .then(function (branches) {
                var deferred = Q.defer();

                if (rootHash) {
                    deferred.resolve(rootHash);
                } else if (commitHash) {
                    project.loadObject(commitHash, function (err, commitObj) {
                        if (!err && commitObj) {
                            deferred.resolve(commitObj.root);
                        } else {
                            deferred.reject(err || new Error('no commit was found!'));
                        }
                    });
                } else if (branchName && branches[branchName]) {
                    commitHash = branches[branchName];
                    project.loadObject(commitHash, function (err, commitObj) {
                        if (!err && commitObj) {
                            deferred.resolve(commitObj.root);
                        } else {
                            deferred.reject(err || new Error('no commit was found!'));
                        }
                    });
                } else {
                    deferred.reject(new Error('bad parameters, cannot figure out rootHash'));
                }
                return deferred.promise;
            })
            .then(function (rootHash_) {
                rootHash = rootHash_;
                return _collectObjectAndAssetHashes(project, rootHash);
            })
            .then(function (hashes) {
                rawJson = {
                    rootHash: rootHash,
                    projectId: projectId,
                    branchName: branchName,
                    commitHash: commitHash,
                    hashes: hashes
                };
                return _collectObjects(project, hashes.objects);
            })
            .then(function (objects) {
                rawJson.objects = objects;
                deferred.resolve(rawJson);
            })
            .catch(deferred.reject);

        return deferred.promise;
    }

    /**
     *
     * @param {string} webgmeToken
     * @param {object} parameters
     * @param {function} callback
     */
    function saveProjectIntoFile(webgmeToken, parameters, callback) {
        var output = {};

        _getRawJsonProject(webgmeToken,
            parameters.projectId,
            parameters.branchName,
            parameters.commitHash,
            parameters.rootHash)
            .then(function (rawJson) {
                output = rawJson;
                var blobClient = new BlobClientClass({
                        serverPort: gmeConfig.server.port,
                        httpsecure: false,
                        server: '127.0.0.1',
                        webgmeToken: webgmeToken,
                        logger: logger.fork('BlobClient')
                    }),
                    deferred = Q.defer();

                blobUtil.buildProjectPackage(logger.fork('blobUtil'),
                    blobClient,
                    output,
                    parameters.withAssets,
                    function (err, hash) {
                        if (err) {
                            deferred.reject(err);
                        } else {
                            deferred.resolve(blobClient.getRelativeDownloadURL(hash));
                        }
                    }
                );

                return deferred.promise;
            })
            .nodeify(callback);
    }

    function _putRawObjectsIntoDb(project, objects, rootHash, message) {
        var deferred = Q.defer(),
            toPersist = {},
            i;

        for (i = 0; i < objects.length; i += 1) {
            toPersist[objects[i]._id] = objects[i];
        }

        project.makeCommit(null, [], rootHash, toPersist, message)
            .then(function (commitResult) {
                deferred.resolve(commitResult);
            })
            .catch(deferred.reject);

        return deferred.promise;
    }

    function _importProjectPackage(blobClient, packageHash) {
        var zip = new AdmZip(),
            artifact = blobClient.createArtifact('files'),
            projectStr,
            deferred = Q.defer();

        Q.ninvoke(blobClient, 'getObject', packageHash)
            .then(function (buffer) {
                if (buffer instanceof Buffer !== true) {
                    throw new Error('invalid package received');
                }

                zip = new AdmZip(buffer);
                return Q.all(zip.getEntries().map(function (entry) {
                        var entryName = entry.entryName;
                        if (entryName === 'project.json') {
                            projectStr = zip.readAsText(entry);
                        } else {
                            return Q.ninvoke(artifact, 'addFileAsSoftLink', entryName, zip.readFile(entry));
                        }
                    })
                );
            })
            .then(function () {
                if (!projectStr) {
                    throw new Error('given package missing project data!');
                }
                var metadata = artifact.descriptor;
                return blobUtil.addAssetsFromExportedProject(logger, blobClient, metadata);
            })
            .then(function () {
                deferred.resolve(JSON.parse(projectStr));
            })
            .catch(deferred.reject);

        return deferred.promise;
    }

    function _getFreshestLibrary(webgmeToken, projectId, branchName, libraryName) {
        var deferred = Q.defer(),
            storage;

        getConnectedStorage(webgmeToken)
            .then(function (storage_) {
                storage = storage_;
                if (!branchName) {
                    throw new Error('getting freshest library can be done only by branch!');
                }
                return _getCoreAndRootNode(storage, projectId, null, branchName);
            })
            .then(function (context) {
                var libraryInfo = context.core.getLibraryInfo(context.rootNode, libraryName);
                if (libraryInfo && libraryInfo.projectId && libraryInfo.branchName) {
                    return _getRawJsonProject(webgmeToken, libraryInfo.projectId, libraryInfo.branchName, null);
                } else {
                    throw new Error('only libraries that follows branch can be refreshed!');
                }
            })
            .then(function (jsonProject) {
                deferred.resolve(jsonProject);
            })
            .catch(deferred.reject);

        return deferred.promise;
    }

    function _createProjectFromRawJson(storage, projectName, ownerId, branchName, jsonProject, callback) {
        var projectId,
            project;

        Q.ninvoke(storage, 'createProject', projectName, ownerId)
            .then(function (projectId_) {
                var deferred = Q.defer();

                projectId = projectId_;
                storage.openProject(projectId, function (err, project_/*, branches*/) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        project = project_;
                        deferred.resolve();
                    }
                });
                return deferred.promise;
            })
            .then(function () {
                return _putRawObjectsIntoDb(project,
                    jsonProject.objects,
                    jsonProject.rootHash,
                    'loading project from package');
            })
            .then(function (commitResult) {
                return project.createBranch(branchName, commitResult.hash);
            })
            .then(function () {
                return (projectId);
            })
            .nodeify(callback);
    }

    /**
     *
     * @param {string} webgmeToken
     * @param {object} parameters
     * @param {function} callback
     */
    function importProjectFromFile(webgmeToken, parameters, callback) {
        var storage,
            blobClient = new BlobClientClass({
                serverPort: gmeConfig.server.port,
                httpsecure: false,
                server: '127.0.0.1',
                webgmeToken: webgmeToken,
                logger: logger.fork('BlobClient')
            });

        getConnectedStorage(webgmeToken)
            .then(function (storage_) {
                storage = storage_;
                return _importProjectPackage(blobClient, parameters.blobHash);
            })
            .then(function (jsonProject) {
                return Q.nfcall(_createProjectFromRawJson,
                    storage, parameters.projectName, parameters.ownerId, parameters.branchName, jsonProject);
            })
            .nodeify(callback);
    }

    function addLibrary(webgmeToken, parameters, callback) {
        var projectId = parameters.projectId,
            jsonProject,
            context,
            storage,
            blobClient = new BlobClientClass({
                serverPort: gmeConfig.server.port,
                httpsecure: false,
                server: '127.0.0.1',
                webgmeToken: webgmeToken,
                logger: logger.fork('BlobClient')
            });

        getConnectedStorage(webgmeToken)
            .then(function (storage_) {
                storage = storage_;
                if (parameters.blobHash) {
                    return _importProjectPackage(blobClient, parameters.blobHash);
                } else {
                    return _getRawJsonProject(webgmeToken,
                        parameters.libraryInfo.projectId,
                        parameters.libraryInfo.branchName,
                        parameters.libraryInfo.commitHash,
                        null);
                }
            })
            .then(function (jsonProject_) {
                jsonProject = jsonProject_;
                return _getCoreAndRootNode(storage, projectId, null, parameters.branchName);
            })
            .then(function (context_) {
                context = context_;
                return _putRawObjectsIntoDb(context.project,
                    jsonProject.objects,
                    jsonProject.rootHash,
                    'commit that represents the library to be imported');
            })
            .then(function (/*commitResult*/) {

                return Q.nfcall(context.core.addLibrary,
                    context.rootNode,
                    parameters.libraryName,
                    jsonProject.rootHash, {
                        projectId: jsonProject.projectId,
                        branchName: jsonProject.branchName,
                        commitHash: jsonProject.commitHash
                    });
            })
            .then(function () {
                var persisted = context.core.persist(context.rootNode),
                    info = context.core.getLibraryInfo(context.rootNode, parameters.libraryName),
                    deferred = Q.defer(),
                    message = 'adds library [';

                if (info.projectId) {
                    message += info.projectId;
                    if (info.branchName) {
                        message += ':' + info.branchName;
                        if (info.commitHash) {
                            message += '@' + info.commitHash;
                        }
                    } else if (info.commitHash) {
                        message += ':' + info.commitHash;
                    }
                } else {
                    message += '_no_info_';
                }
                message += ']';

                context.project.makeCommit(
                    parameters.branchName,
                    [context.commitObject._id],
                    persisted.rootHash,
                    persisted.objects,
                    message, function (err, saveResult) {
                        if (err) {
                            deferred.reject(err);
                            return;
                        }

                        deferred.resolve();
                    });

                return deferred.promise;
            })
            .nodeify(callback);
    }

    function updateLibrary(webgmeToken, parameters, callback) {
        var projectId = parameters.projectId,
            jsonProject,
            context,
            storage,
            blobClient = new BlobClientClass({
                serverPort: gmeConfig.server.port,
                httpsecure: false,
                server: '127.0.0.1',
                webgmeToken: webgmeToken,
                logger: logger.fork('BlobClient')
            });

        getConnectedStorage(webgmeToken)
            .then(function (storage_) {
                storage = storage_;
                if (parameters.blobHash) {
                    return _importProjectPackage(blobClient, parameters.blobHash);
                } else if (parameters.libraryInfo) {
                    return _getRawJsonProject(webgmeToken,
                        parameters.libraryInfo.projectId,
                        parameters.libraryInfo.branchName,
                        parameters.libraryInfo.commitHash,
                        null);
                } else {
                    return _getFreshestLibrary(webgmeToken, projectId, parameters.branchName, parameters.libraryName);
                }
            })
            .then(function (jsonProject_) {
                jsonProject = jsonProject_;

                return _getCoreAndRootNode(storage, projectId, null, parameters.branchName);
            })
            .then(function (context_) {
                context = context_;
                return _putRawObjectsIntoDb(context.project,
                    jsonProject.objects,
                    jsonProject.rootHash,
                    'commit that represents the library to be updated');
            })
            .then(function (/*commitResult*/) {

                return Q.nfcall(context.core.updateLibrary,
                    context.rootNode,
                    parameters.libraryName,
                    jsonProject.rootHash, {
                        projectId: jsonProject.projectId,
                        branchName: jsonProject.branchName,
                        commitHash: jsonProject.commitHash
                    }, null/*placeholder for instructions*/);
            })
            .then(function () {
                var persisted = context.core.persist(context.rootNode),
                    info = context.core.getLibraryInfo(context.rootNode, parameters.libraryName),
                    deferred = Q.defer(),
                    message = 'updates library [';

                if (info.projectId) {
                    message += info.projectId;
                    if (info.branchName) {
                        message += ':' + info.branchName;
                        if (info.commitHash) {
                            message += '@' + info.commitHash;
                        }
                    } else if (info.commitHash) {
                        message += ':' + info.commitHash;
                    }
                } else {
                    message += '_no_info_';
                }
                message += ']';

                context.project.makeCommit(
                    parameters.branchName,
                    [context.commitObject._id],
                    persisted.rootHash,
                    persisted.objects,
                    message, function (err, saveResult) {
                        if (err) {
                            deferred.reject(err);
                            return;
                        }

                        deferred.resolve();
                    });

                return deferred.promise;
            })
            .nodeify(callback);
    }

    return {
        exportLibrary: exportLibrary,
        executePlugin: executePlugin,
        seedProject: seedProject,
        autoMerge: autoMerge,
        resolve: resolve,
        checkConstraints: checkConstraints,
        // This is exposed for unit tests..
        _addZippedExportToBlob: _addZippedExportToBlob,
        reassignGuids: reassignGuids,
        saveProjectIntoFile: saveProjectIntoFile,
        importProjectFromFile: importProjectFromFile,
        addLibrary: addLibrary,
        updateLibrary: updateLibrary
    };
}

module.exports = WorkerRequests;
