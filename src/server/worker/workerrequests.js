/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Core = requireJS('common/core/coreQ'),
    Storage = requireJS('common/storage/nodestorage'),
    STORAGE_CONSTANTS = requireJS('common/storage/constants'),
    REGEXP = requireJS('common/regexp'),
    merger = requireJS('common/core/users/merge'),
    BlobClientClass = requireJS('blob/BlobClient'),
    blobUtil = requireJS('blob/util'),
    constraint = requireJS('common/core/users/constraintchecker'),
    webgmeUtils = require('../../utils'),
    storageUtils = requireJS('common/storage/util'),
    commonUtils = requireJS('common/util/util'),

// JsZip can't for some reason extract the exported files..
    AdmZip = require('adm-zip'),
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

    function getBlobClient(webgmeToken) {
        return new BlobClientClass({
            serverPort: gmeConfig.server.port,
            httpsecure: false,
            server: '127.0.0.1',
            webgmeToken: webgmeToken,
            logger: logger.fork('BlobClient')
        });
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
     * @param {string} [context.managerConfig.commitHash] - commit hash to start the plugin from
     * (if falsy will use HEAD of branchName)
     * @param {string} [context.managerConfig.branchName] - branch which to save to.
     * @param {string} [context.namespace=''] - used namespace during execution ('' represents all namespaces).
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
                storage.openProject(context.managerConfig.project, function (err, project, branches, access) {
                    var pluginContext;
                    if (err) {
                        finish(err);
                        return;
                    }

                    logger.debug('Opened project, got branches:', context.managerConfig.project, branches);

                    pluginContext = JSON.parse(JSON.stringify(context.managerConfig));
                    pluginContext.project = project;

                    if (typeof socketId === 'string') {
                        logger.debug('socketId provided for plugin execution - notifications available.');
                        pluginManager.notificationHandlers = [function (data, callback) {
                            data.originalSocketId = socketId;
                            storage.sendNotification(data, callback);
                        }];
                    } else {
                        logger.warn('No socketId provided for plugin execution - notifications NOT available.');
                    }

                    pluginManager.projectAccess = access;

                    pluginManager.executePlugin(pluginName, context.pluginConfig, pluginContext, finish);
                });
            })
            .catch(finish);
    }

    // Seeding functionality
    function _findSeedFilename(name) {
        var deferred = Q.defer(),
            seedDictionary = webgmeUtils.getSeedDictionary(gmeConfig),
            filename;

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
                    deferred;

                if (filename.toLowerCase().indexOf('.webgmex') > -1) {
                    deferred = Q.defer();

                    if (filename.toLowerCase().indexOf('.webgmex') > -1) {
                        logger.debug('Found .webgmex seed at:', filename);
                    }

                    blobClient = getBlobClient(webgmeToken);

                    _addZippedExportToBlob(filename, blobClient)
                        .then(function (jsonProject) {
                            deferred.resolve(JSON.stringify({
                                seed: JSON.parse(jsonProject),
                            }));
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

    function _getSeedFromProject(storage, projectId, branchName, commitHash, callback) {
        var deferred = Q.defer(),
            options = {};

        storage.openProject(projectId, function (err, project, branches/*, access*/) {
            if (err) {
                deferred.reject(err);
                return;
            }

            if (commitHash) {
                options.commitHash = commitHash;
            } else {
                branchName = branchName || 'master';
                if (!branches[branchName]) {
                    deferred.reject(new Error('unknown branch: ' + branchName));
                    return;
                }

                options.branchName = branchName;
            }

            storageUtils.getProjectJson(project, options)
                .then(function (rawJson) {
                    deferred.resolve({seed: rawJson, isLegacy: false});
                })
                .catch(deferred.reject);
        });

        return deferred.promise.nodeify(callback);
    }

    function _createProjectFromRawJson(storage, projectName, ownerId, branchName, jsonProject, callback) {
        var projectId,
            project;

        return Q.ninvoke(storage, 'createProject', projectName, ownerId)
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
                return storageUtils.insertProjectJson(project, jsonProject, {
                    commitMessage: 'loading project from package'
                });
            })
            .then(function (commitResult) {
                return project.createBranch(branchName, commitResult.hash);
            })
            .then(function () {
                return projectId;
            })
            .nodeify(callback);
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
     * @param {string} [parameters.seedCommit] - If db - optional commit-hash to seed from (if given branchName will not
     * be used).
     * @param [function} callback
     */
    function seedProject(webgmeToken, projectName, ownerId, parameters, callback) {
        var storage,
            finish = function (err, result) {
                result = {
                    projectId: result
                };
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
                    return _getSeedFromProject(storage, parameters.seedName, parameters.seedBranch,
                        parameters.seedCommit);
                    //} else if (parameters.type === 'blob') {
                    //    return _getSeedFromBlob(parameters.seedName, webgmeToken);
                } else {
                    throw new Error('Unknown seeding type [' + parameters.type + ']');
                }
            })
            .then(function (jsonSeed) {
                return _createProjectFromRawJson(storage, projectName, ownerId,
                    parameters.branchName || 'master', jsonSeed.seed);
            })
            .nodeify(finish);
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
                    var mergeLogger = logger.fork('merge');
                    if (err) {
                        finish(err);
                        return;
                    }

                    function mergeTillSyncOrConflict(currentMine) {
                        return merger.merge({
                            project: project,
                            gmeConfig: gmeConfig,
                            logger: mergeLogger,
                            myBranchOrCommit: currentMine,
                            theirBranchOrCommit: theirs,
                            auto: true
                        })
                            .then(function (result) {
                                if (result.conflict && result.conflict.items.length > 0) {
                                    return result;
                                } else if (result.targetBranchName && !result.updatedBranch) {
                                    return mergeTillSyncOrConflict(result.finalCommitHash);
                                } else {
                                    return result;
                                }
                            });
                    }

                    mergeTillSyncOrConflict(mine)
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
     * @param {object} parameters - One of rootHash, commitHash and branchName must be given.
     * @param {string} parameters.projectId
     * @param {string} [parameters.rootHash] - The hash of the tree root.
     * @param {string} [parameters.commitHash] - The tree associated with the commitHash.
     * @param {string} [parameters.branchName] - The tree at the given branch.
     * @param {string} [parameters.withAssets=false] - Bundle the encountered assets linked from attributes.
     * @param {function} callback
     */
    function exportProjectToFile(webgmeToken, parameters, callback) {
        var storage,
            finish = function (err, result) {
                if (err) {
                    err = err instanceof Error ? err : new Error(err);
                    logger.error('exportProjectToFile failed with error', err);
                } else {
                    logger.debug('exportProjectToFile completed');
                }
                storage.close(function (closeErr) {
                    callback(err || closeErr, result);
                });
            };

        logger.debug('exportProjectToFile', {metadata: parameters});

        getConnectedStorage(webgmeToken)
            .then(function (storage_) {
                var deferred = Q.defer();
                storage = storage_;
                storage.openProject(parameters.projectId, function (err, project/*, branches, access*/) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve(project);
                    }
                });

                return deferred.promise;
            })
            .then(function (project) {
                return storageUtils.getProjectJson(project, {
                    branchName: parameters.branchName,
                    commitHash: parameters.commitHash,
                    rootHash: parameters.rootHash
                });
            })
            .then(function (rawJson) {
                var output = rawJson,
                    blobClient = getBlobClient(webgmeToken),
                    deferred = Q.defer(),
                    filename = output.projectId + '_' + (output.commitHash || '').substr(1, 6) + '.webgmex';

                blobUtil.buildProjectPackage(logger.fork('blobUtil'),
                    blobClient,
                    output,
                    parameters.withAssets,
                    filename,
                    function (err, hash) {
                        if (err) {
                            deferred.reject(err);
                        } else {
                            deferred.resolve({
                                downloadUrl: blobClient.getRelativeDownloadURL(hash),
                                hash: hash,
                                fileName: filename
                            });
                        }
                    }
                );

                return deferred.promise;
            })
            .nodeify(finish);
    }

    /**
     *
     * @param {string} webgmeToken
     * @param {object} parameters
     * @param {string} parameters.projectId
     * @param {string} parameters.commitHash
     * @param {string[]} parameters.paths
     * @param {boolean} [parameters.withAssets=false]
     * @param {function} callback
     */
    function exportSelectionToFile(webgmeToken, parameters, callback) {
        var context,
            storage,
            closureInformation,
            finish = function (err, result) {
                if (err) {
                    err = err instanceof Error ? err : new Error(err);
                    logger.error('exportSelectionToFile failed with error', err);
                } else {
                    logger.debug('exportSelectionToFile completed');
                }
                storage.close(function (closeErr) {
                    callback(err || closeErr, result);
                });
            };

        logger.debug('exportSelectionToFile', {metadata: parameters});

        getConnectedStorage(webgmeToken)
            .then(function (storage_) {
                storage = storage_;
                return _getCoreAndRootNode(storage, parameters.projectId, parameters.commitHash, null);
            })
            .then(function (context_) {
                var promises = [],
                    i;
                context = context_;
                if (parameters.paths && parameters.paths.length > 0) {
                    for (i = 0; i < parameters.paths.length; i += 1) {
                        promises.push(context.core.loadByPath(context.rootNode, parameters.paths[i]));
                    }
                    return Q.all(promises);
                }

                throw new Error('No paths given to export! parameters: ' +
                    JSON.stringify(parameters));
            })
            .then(function (baseNodes) {
                var promises = [],
                    i;

                for (i = 0; i < baseNodes.length; i += 1) {
                    if (baseNodes[i] === null) {
                        throw new Error('Given path does not exist [' + parameters.paths[i] + '].');
                    }
                }

                closureInformation = context.core.getClosureInformation(baseNodes);
                if (closureInformation instanceof Error) {
                    throw closureInformation;
                }

                for (i = 0; i < baseNodes.length; i += 1) {
                    promises.push(
                        storageUtils.getProjectJson(
                            context.project,
                            {rootHash: context.core.getHash(baseNodes[i])}
                        )
                    );
                }

                return Q.all(promises);
            })
            .then(function (rawJsons) {
                var output = {
                        projectId: parameters.projectId,
                        commitHash: parameters.commitHash,
                        selectionInfo: closureInformation,
                        objects: [],
                        hashes: {objects: [], assets: []}
                    },
                    blobClient = getBlobClient(webgmeToken),
                    deferred = Q.defer(),
                    filename = output.projectId + '_' + (output.commitHash || '').substr(1, 6) + '.webgmexm',
                    i;

                for (i = 0; i < rawJsons.length; i += 1) {
                    commonUtils.extendArrayUnique(output.hashes.objects, rawJsons[i].hashes.objects);
                    commonUtils.extendArrayUnique(output.hashes.assets, rawJsons[i].hashes.assets);
                    commonUtils.extendObjectArrayUnique(
                        output.objects,
                        rawJsons[i].objects,
                        STORAGE_CONSTANTS.MONGO_ID
                    );
                }

                blobUtil.buildProjectPackage(logger.fork('blobUtil'),
                    blobClient,
                    output,
                    parameters.withAssets,
                    filename,
                    function (err, hash) {
                        if (err) {
                            deferred.reject(err);
                        } else {
                            deferred.resolve({
                                downloadUrl: blobClient.getRelativeDownloadURL(hash),
                                hash: hash,
                                // FIXME: Now this needs to be insync with the name in blobUtil..
                                fileName: filename
                            });
                        }
                    }
                );

                return deferred.promise;
            })
            .nodeify(finish);

    }

    function _importProjectPackage(blobClient, packageHash, fullProject) {
        var zip = new AdmZip(),
            artifact = blobClient.createArtifact('files'),
            projectStr,
            deferred = Q.defer();

        blobClient.getObject(packageHash)
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
                            return artifact.addFileAsSoftLink(entryName, zip.readFile(entry));
                        }
                    })
                );
            })
            .then(function () {
                var projectJson,
                    metadata;
                if (!projectStr) {
                    throw new Error('given package missing project data!');
                }
                projectJson = JSON.parse(projectStr);
                if (fullProject) {
                    if (projectJson.selectionInfo) {
                        throw new Error('given package is not a full project');
                    }
                } else {
                    if (!projectJson.selectionInfo) {
                        throw new Error('given package contains a full project and not a model');
                    }
                }
                metadata = artifact.descriptor;
                return blobUtil.addAssetsFromExportedProject(logger, blobClient, metadata);
            })
            .then(function () {
                deferred.resolve(JSON.parse(projectStr));
            })
            .catch(deferred.reject);

        return deferred.promise;
    }

    /**
     *
     * @param {string} webgmeToken
     * @param {object} parameters
     * @param {string} parameters.projectId
     * @param {string} parameters.branchName
     * @param {string} parameters.blobHash
     * @param {string} parameters.parentPath - path to node where the selection should be imported.
     * @param {function} callback
     */
    function importSelectionFromFile(webgmeToken, parameters, callback) {
        var jsonProject,
            context,
            storage,
            blobClient = getBlobClient(webgmeToken),
            finish = function (err, result) {
                if (err) {
                    err = err instanceof Error ? err : new Error(err);
                    logger.error('importSelectionFromFile failed with error', err);
                } else {
                    logger.debug('importSelectionFromFile completed');
                }
                storage.close(function (closeErr) {
                    callback(err || closeErr, result);
                });
            };

        logger.debug('importSelectionFromFile', {metadata: parameters});

        getConnectedStorage(webgmeToken)
            .then(function (storage_) {
                storage = storage_;
                if (parameters.hasOwnProperty('parentPath') === false) {
                    throw new Error('No parentPath given');
                }
                return _getCoreAndRootNode(storage, parameters.projectId, null, parameters.branchName);
            })
            .then(function (context_) {
                context = context_;

                return _importProjectPackage(blobClient, parameters.blobHash, false);
            })
            .then(function (jsonProject_) {
                var contentJson = {
                    rootHash: null,
                    objects: jsonProject_.objects
                };
                jsonProject = jsonProject_;

                return storageUtils.insertProjectJson(context.project,
                    contentJson,
                    {commitMessage: 'commit that represents the selection content'});
            })
            .then(function (commitResult) {
                logger.debug('Selection content was persisted [' + commitResult.hash + ']');
                return context.core.loadByPath(context.rootNode, parameters.parentPath);
            })
            .then(function (parent) {
                var deferred = Q.defer(),
                    persisted,
                    closureInfo;

                if (parent === null) {
                    throw new Error('Given parentPath does not exist [' + parameters.parentPath + ']');
                }

                closureInfo = context.core.importClosure(parent, jsonProject.selectionInfo);

                if (closureInfo instanceof Error) {
                    throw closureInfo;
                }

                persisted = context.core.persist(context.rootNode);

                context.project.makeCommit(
                    parameters.branchName,
                    [context.commitObject._id],
                    persisted.rootHash,
                    persisted.objects,
                    'importing models', function (err, saveResult) {
                        if (err) {
                            deferred.reject(err);
                        } else {
                            deferred.resolve(saveResult);
                        }
                    });

                return deferred.promise;
            })
            .nodeify(finish);
    }

    /**
     *
     * @param {string} webgmeToken
     * @param {object} parameters
     * @param {function} callback
     */
    function importProjectFromFile(webgmeToken, parameters, callback) {
        var storage,
            blobClient = getBlobClient(webgmeToken),
            finish = function (err, result) {
                if (err) {
                    err = err instanceof Error ? err : new Error(err);
                    logger.error('importProjectFromFile failed with error', err);
                } else {
                    logger.debug('importProjectFromFile completed');
                }
                storage.close(function (closeErr) {
                    callback(err || closeErr, result);
                });
            };

        logger.debug('importProjectFromFile', {metadata: parameters});

        getConnectedStorage(webgmeToken)
            .then(function (storage_) {
                storage = storage_;
                return _importProjectPackage(blobClient, parameters.blobHash, true);
            })
            .then(function (jsonProject) {
                return _createProjectFromRawJson(storage, parameters.projectName, parameters.ownerId,
                    parameters.branchName, jsonProject);
            })
            .nodeify(finish);
    }

    /**
     * parameters.blobHash or parameters.libraryInfo must be given.
     * @param {string} webgmeToken
     * @param {object} parameters
     * @param {string} parameters.projectId
     * @param {string} parameters.branchName
     * @param {string} parameters.libraryName
     * @param {string} [parameters.blobHash] - Add from an uploaded file.
     * @param {object} [parameters.libraryInfo] - Add from an existing project.
     * @param {string} [parameters.libraryInfo.projectId] - if libraryInfo, projectId must be given.
     * @param {string} [parameters.libraryInfo.branchName] - if libraryInfo and not commitHash, it must be given.
     * @param {string} [parameters.libraryInfo.commitHash] - if libraryInfo and not branchName, it must be given.
     * @param {function} callback
     */
    function addLibrary(webgmeToken, parameters, callback) {
        var jsonProject,
            context,
            storage,
            blobClient = getBlobClient(webgmeToken),
            finish = function (err, result) {
                if (err) {
                    err = err instanceof Error ? err : new Error(err);
                    logger.error('addLibrary failed with error', err);
                } else {
                    logger.debug('addLibrary completed');
                }
                storage.close(function (closeErr) {
                    callback(err || closeErr, result);
                });
            };

        logger.debug('addLibrary', {metadata: parameters});

        getConnectedStorage(webgmeToken)
            .then(function (storage_) {
                storage = storage_;
                return _getCoreAndRootNode(storage, parameters.projectId, null, parameters.branchName);
            })
            .then(function (context_) {
                var deferred = Q.defer();
                context = context_;

                if (typeof parameters.libraryName !== 'string' ||
                    context.core.getLibraryNames(context.rootNode).indexOf(parameters.libraryName) !== -1) {
                    deferred.reject(new Error('New library name should be unique'));
                }
                if (parameters.blobHash) {
                    _importProjectPackage(blobClient, parameters.blobHash, true)
                        .then(deferred.resolve)
                        .catch(deferred.reject);
                } else if (parameters.libraryInfo) {
                    if (parameters.libraryInfo.projectId === parameters.projectId) {
                        deferred.reject(new Error('Not allowed to add self as a library [' + parameters.projectId + ']'));
                    } else {
                        storage.openProject(parameters.libraryInfo.projectId,
                            function (err, project/*,branches,access*/) {
                                if (err) {
                                    deferred.reject(err);
                                } else {
                                    storageUtils.getProjectJson(project, {
                                        branchName: parameters.libraryInfo.branchName,
                                        commitHash: parameters.libraryInfo.commitHash
                                    })
                                        .then(deferred.resolve)
                                        .catch(deferred.reject);
                                }
                            }
                        );
                    }
                } else {
                    deferred.reject(new Error('Missing information about the library to add.'));
                }

                return deferred.promise;
            })
            .then(function (jsonProject_) {
                jsonProject = jsonProject_;

                return storageUtils.insertProjectJson(context.project,
                    jsonProject,
                    {commitMessage: 'commit that represents the library to be imported'});
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

                        deferred.resolve(saveResult);
                    });

                return deferred.promise;
            })
            .nodeify(finish);
    }

    /**
     * If blobHash nor libraryInfo is given, will attempt to "refresh" library based on the
     * libraryInfo stored at the library node.
     * @param {string} webgmeToken
     * @param {object} parameters
     * @param {string} parameters.projectId
     * @param {string} parameters.branchName
     * @param {string} parameters.libraryName
     * @param {string} [parameters.blobHash] - Update from an uploaded file.
     * @param {object} [parameters.libraryInfo] - Update from an existing project.
     * @param {string} [parameters.libraryInfo.projectId] - if libraryInfo, projectId must be given.
     * @param {string} [parameters.libraryInfo.branchName] - if libraryInfo and not commitHash, it must be given.
     * @param {string} [parameters.libraryInfo.commitHash] - if libraryInfo and not branchName, it must be given.
     * @param {function} callback
     */
    function updateLibrary(webgmeToken, parameters, callback) {
        var projectId = parameters.projectId,
            context,
            storage,
            jsonProject,
            blobClient = getBlobClient(webgmeToken),
            finish = function (err, result) {
                if (err) {
                    err = err instanceof Error ? err : new Error(err);
                    logger.error('updateLibrary failed with error', err);
                } else {
                    logger.debug('updateLibrary completed');
                }
                storage.close(function (closeErr) {
                    callback(err || closeErr, result);
                });
            };

        logger.debug('updateLibrary', {metadata: parameters});

        getConnectedStorage(webgmeToken)
            .then(function (storage_) {
                storage = storage_;
                return _getCoreAndRootNode(storage, projectId, null, parameters.branchName);
            })
            .then(function (context_) {
                var deferred = Q.defer(),
                    libraryInfo;
                context = context_;
                if (parameters.blobHash) {
                    _importProjectPackage(blobClient, parameters.blobHash, true)
                        .then(deferred.resolve)
                        .catch(deferred.reject);
                } else if (parameters.libraryInfo) {
                    storage.openProject(parameters.libraryInfo.projectId, function (err, project/*,branches,access*/) {
                        if (err) {
                            deferred.reject(err);
                        } else {
                            storageUtils.getProjectJson(project, {
                                branchName: parameters.libraryInfo.branchName,
                                commitHash: parameters.libraryInfo.commitHash
                            })
                                .then(deferred.resolve)
                                .catch(deferred.reject);
                        }
                    });
                } else {
                    // We have to dig out library info from our own project
                    libraryInfo = context.core.getLibraryInfo(context.rootNode, parameters.libraryName);
                    if (libraryInfo && libraryInfo.projectId && libraryInfo.branchName) {
                        if (projectId === libraryInfo.projectId) {
                            deferred.reject(new Error('Automatic update of self-contained libraries are not allowed!'));
                        } else {
                            storage.openProject(libraryInfo.projectId, function (err, project/*, branches, access*/) {
                                if (err) {
                                    deferred.reject(err);
                                } else {
                                    storageUtils.getProjectJson(project, {branchName: libraryInfo.branchName})
                                        .then(deferred.resolve)
                                        .catch(deferred.reject);
                                }
                            });
                        }
                    } else {
                        deferred.reject(new Error('only libraries that follows branch can be refreshed!'));
                    }
                }
                return deferred.promise;
            })
            .then(function (jsonProject_) {
                jsonProject = jsonProject_;
                return storageUtils.insertProjectJson(context.project, jsonProject, {
                    commitMessage: 'commit that represents the library to be updated'
                });
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
                    message, function (err, commitResult) {
                        if (err) {
                            deferred.reject(err);
                            return;
                        }

                        deferred.resolve(commitResult);
                    });

                return deferred.promise;
            })
            .nodeify(finish);
    }

    /**
     *
     * @param webgmeToken
     * @param parameters
     * @param callback
     */
    function updateProjectFromFile(webgmeToken, parameters, callback) {
        var jsonProject,
            context,
            storage,
            blobClient = getBlobClient(webgmeToken),
            finish = function (err, result) {
                if (err) {
                    err = err instanceof Error ? err : new Error(err);
                    logger.error('updateProjectFromFile failed with error', err);
                } else {
                    logger.debug('updateProjectFromFile completed');
                }
                storage.close(function (closeErr) {
                    callback(err || closeErr, result);
                });
            };

        logger.debug('updateProjectFromFile', {metadata: parameters});

        getConnectedStorage(webgmeToken)
            .then(function (storage_) {
                storage = storage_;
                return _getCoreAndRootNode(storage, parameters.projectId, parameters.commitHash, parameters.branchName);
            })
            .then(function (context_) {
                context = context_;
                return _importProjectPackage(blobClient, parameters.blobHash, true);
            })
            .then(function (jsonProject_) {
                jsonProject = jsonProject_;

                // This resolves with commitResult.
                return storageUtils.insertProjectJson(context.project,
                    jsonProject,
                    {
                        branch: parameters.branchName,
                        parentCommit: [context.commitObject[STORAGE_CONSTANTS.MONGO_ID]],
                        commitMessage: 'update project from file'
                    });
            })
            .nodeify(finish);
    }

    return {
        executePlugin: executePlugin,
        seedProject: seedProject,
        autoMerge: autoMerge,
        resolve: resolve,
        checkConstraints: checkConstraints,
        // This is exposed for unit tests..
        _addZippedExportToBlob: _addZippedExportToBlob,
        exportProjectToFile: exportProjectToFile,
        importProjectFromFile: importProjectFromFile,
        exportSelectionToFile: exportSelectionToFile,
        importSelectionFromFile: importSelectionFromFile,
        addLibrary: addLibrary,
        updateLibrary: updateLibrary,
        updateProjectFromFile: updateProjectFromFile
    };
}

module.exports = WorkerRequests;