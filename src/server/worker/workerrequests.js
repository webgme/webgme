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
    constraint = requireJS('common/core/users/constraintchecker'),
    UINT = requireJS('common/util/uint'),
    GUID = requireJS('common/util/guid'),

// JsZip can't for some reason extract the exported files..
    AdmZip = require('adm-zip'),

    blobUtil = requireJS('blob/util'),

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
            i,
            filename,
            names;

        // TODO: maybe read the dirs async.
        // It uses a promise here to avoid extra try-catch in _getSeedFromFile..

        if (gmeConfig.seedProjects.enable !== true) {
            deferred.reject(new Error('seeding is disabled'));
        } else {
            for (i = 0; i < gmeConfig.seedProjects.basePaths.length; i++) {
                names = FS.readdirSync(gmeConfig.seedProjects.basePaths[i]);
                if (names.indexOf(name + '.json') !== -1) {
                    filename = gmeConfig.seedProjects.basePaths[i] + '/' + name + '.json';
                    break;
                } else if (names.indexOf(name + '.zip') !== -1) {
                    filename = gmeConfig.seedProjects.basePaths[i] + '/' + name + '.zip';
                    break;
                }
            }

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
                var blobClient;

                if (filename.indexOf('.json') > -1) {
                    logger.debug('Found .json seed at:', filename);
                    return Q.ninvoke(FS, 'readFile', filename);
                } else if (filename.indexOf('.zip') > -1) {

                    logger.debug('Found .zip seed at:', filename);
                    blobClient = new BlobClientClass({
                        serverPort: gmeConfig.server.port,
                        httpsecure: false,
                        server: '127.0.0.1',
                        webgmeToken: webgmeToken,
                        logger: logger.fork('BlobClient')
                    });

                    return _addZippedExportToBlob(filename, blobClient);
                } else {
                    throw new Error('Unexpected file');
                }
            })
            .then(function (projectStr) {
                return JSON.parse(projectStr);
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
            finish = function (err, result) {
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
                    return _getSeedFromBlob(parameters.seedName, webgmeToken);
                } else {
                    throw new Error('Unknown seeding type [' + parameters.type + ']');
                }
            })
            .then(function (jsonSeed) {
                _createProjectFromSeed(storage, projectName, ownerId, jsonSeed, parameters.seedName, finish);
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

    return {
        exportLibrary: exportLibrary,
        executePlugin: executePlugin,
        seedProject: seedProject,
        autoMerge: autoMerge,
        resolve: resolve,
        checkConstraints: checkConstraints,
        // This is exposed for unit tests..
        _addZippedExportToBlob: _addZippedExportToBlob,
        reassignGuids: reassignGuids
    };
}

module.exports = WorkerRequests;
