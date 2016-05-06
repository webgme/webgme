/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Core = requireJS('common/core/coreQ'),
    Storage = requireJS('common/storage/nodestorage'),
    STORAGE_CONSTANTS = requireJS('common/storage/constants'),
    merger = requireJS('common/core/users/merge'),
    BlobClientClass = requireJS('blob/BlobClient'),
    blobUtil = requireJS('blob/util'),
    constraint = requireJS('common/core/users/constraintchecker'),
    webgmeUtils = require('../../utils'),
    storageUtils = requireJS('common/storage/util'),

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
     * @param {string} [context.managerConfig.commit] - commit hash to start the plugin from
     * (if falsy will use HEAD of branchName)
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
                storage.openProject(context.managerConfig.project, function (err, project, branches, access) {
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

                    blobClient = new BlobClientClass({
                        serverPort: gmeConfig.server.port,
                        httpsecure: false,
                        server: '127.0.0.1',
                        webgmeToken: webgmeToken,
                        logger: logger.fork('BlobClient')
                    });

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

    function _getSeedFromProject(storage, projectId, branchName, callback) {
        var deferred = Q.defer();

        branchName = branchName || 'master';
        storage.openProject(projectId, function (err, project, branches/*, access*/) {
            if (err) {
                deferred.reject(err);
                return;
            }

            if (!branches[branchName]) {
                deferred.reject(new Error('unknown branch: ' + branchName));
                return;
            }

            storageUtils.getProjectJson(project, {branchName: branchName})
                .then(function (rawJson) {
                    deferred.resolve({seed: rawJson, isLegacy: false});
                })
                .catch(deferred.reject);
        });

        return deferred.promise.nodeify(callback);
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
                    return _getSeedFromProject(storage, parameters.seedName, parameters.seedBranch);
                //} else if (parameters.type === 'blob') {
                //    return _getSeedFromBlob(parameters.seedName, webgmeToken);
                } else {
                    throw new Error('Unknown seeding type [' + parameters.type + ']');
                }
            })
            .then(function (jsonSeed) {
                _createProjectFromRawJson(storage, projectName, ownerId,
                    parameters.branchName || 'master', jsonSeed.seed, finish);
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
     * @param {object} parameters TODO: parameters...
     * @param {function} callback
     */
    function exportProjectToFile(webgmeToken, parameters, callback) {
        getConnectedStorage(webgmeToken)
            .then(function (storage) {
                var deferred = Q.defer();
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
                    blobClient = new BlobClientClass({
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
                            deferred.resolve({
                                downloadUrl: blobClient.getRelativeDownloadURL(hash),
                                hash: hash
                            });
                        }
                    }
                );

                return deferred.promise;
            })
            .nodeify(callback);
    }

    function _importProjectPackage(blobClient, packageHash) {
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
                return storageUtils.insertProjectJson(project, jsonProject, {
                    commitMessage: 'loading project from package'
                });
            })
            .then(function (commitHash) {
                return project.createBranch(branchName, commitHash);
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
            .catch(function (err) {
                logger.error('importProjectFromFile failed with error', err);
                throw err;
            })
            .nodeify(callback);
    }

    /**
     *
     * @param webgmeToken
     * @param parameters
     * @param callback
     */
    function addLibrary(webgmeToken, parameters, callback) {
        var jsonProject,
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
                    _importProjectPackage(blobClient, parameters.blobHash)
                        .then(deferred.resolve)
                        .catch(deferred.reject);
                } else if (parameters.libraryInfo) {
                    if (parameters.libraryInfo.projectId === parameters.projectId) {
                        deferred.reject(new Error('It is unsafe to add self as a library!'));
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
            .then(function (/*commitHash*/) {

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
                    message, function (err/*, saveResult*/) {
                        if (err) {
                            deferred.reject(err);
                            return;
                        }

                        deferred.resolve();
                    });

                return deferred.promise;
            })
            .catch(function (err) {
                logger.error('addLibrary failed with error', err);
                throw err;
            })
            .nodeify(callback);
    }

    /**
     *
     * @param webgmeToken
     * @param parameters
     * @param callback
     */
    function updateLibrary(webgmeToken, parameters, callback) {
        var projectId = parameters.projectId,
            context,
            storage,
            jsonProject,
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
                return _getCoreAndRootNode(storage, projectId, null, parameters.branchName);
            })
            .then(function (context_) {
                var deferred = Q.defer(),
                    libraryInfo;
                context = context_;
                if (parameters.blobHash) {
                    _importProjectPackage(blobClient, parameters.blobHash)
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
                    message, function (err/*, saveResult*/) {
                        if (err) {
                            deferred.reject(err);
                            return;
                        }

                        deferred.resolve();
                    });

                return deferred.promise;
            })
            .catch(function (err) {
                logger.error('updateLibrary failed with error', err);
                throw err;
            })
            .nodeify(callback);
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
        addLibrary: addLibrary,
        updateLibrary: updateLibrary
    };
}

module.exports = WorkerRequests;
