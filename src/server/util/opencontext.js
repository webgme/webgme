/*globals requireJS*/
/*jshint node:true*/
/**
 * @author kecso / https://github.com/kecso
 */

var ASSERT = requireJS('common/util/assert'),
    Core = requireJS('common/core/core'),
    Q = require('Q'),
    REGEXP = requireJS('common/regexp'),
    CONSTANTS = requireJS('common/storage/constants'),
    Project = require('../storage/userproject');
/**
 * Opens the context specified by the parameters and returns a result object.
 * If no error is returned the database and the project are kept open, otherwise they are closed.
 * @param {object} storage - client-storage, server-user-storage or local-storage
 * @param {object} gmeConfig - global webgme configuration
 * @param {object} parameters
 * @param {string} [parameters.projectName] - name of project to open -> result.project
 * @param {string} [parameters.userName] - name of the user
 * @param {boolean} [parameters.createProject] - if not found will create a project
 *                                              -> result.rootNode, result.commitHash
 * @param {boolean} [parameters.overwriteProject] - if found will overwrite the existing project
 *                                              -> result.rootNode, result.commitHash
 * @param {string} [parameters.branchName] - name of branch to load root from or name of branch to create when
 *                                           creating a project. -> result.rootNode, result.commitHash
 *
 * The following group is only valid when not creating a new project:
 * @param {string} [parameters.commitHash] - if branchName given commitHash will be loaded. -> result.rootNode
 * @param {string} [parameters.branchOrCommit] - REGEXPs will determine if branch or commit -> result.rootNode
 * @param {[string]} [parameters.nodePaths] -loads all specified node paths. -> result.nodes
 * @param {boolean} [parameters.meta] - loads all META-nodes. -> result.META
 *
 * @param {object} [parameters.core] - Used if branchName or commitHash is specified (a new Core will be created
 *                                     if needed and not provided). -> result.core
 * @param {function} callback
 */

function openContext(storage, gmeConfig, _logger, parameters, callback) {
    var result = {},
        contextDeferred = Q.defer(),
        dataForStorageCalls = {},
        emptyProject = false,
        logger = _logger.fork('openContext'),
        closeOnError = function (err) {
            logger.error(err);
            storage.closeDatabase(function () {
                contextDeferred.reject(err);
            });
            /*if (result.project) {
             result.project.closeProject(function () {
             storage.closeDatabase(function () {
             contextDeferred.reject(err);
             });
             });
             } else {
             storage.closeDatabase(function () {
             contextDeferred.reject(err);
             });
             }*/
        };

    if (parameters.userName) {
        dataForStorageCalls.username = parameters.userName;
    }

    storage.openDatabase()
        .then(function () {
            if (!parameters.projectName) {
                contextDeferred.resolve(result);
            }

            dataForStorageCalls.projectName = parameters.projectName;
            return storage.getProjectNames(dataForStorageCalls);
        })
        .then(function (projectNames) {
            if (projectNames.indexOf(parameters.projectName) === -1) {
                if (parameters.createProject) {
                    emptyProject = true;
                    return storage.createProject(dataForStorageCalls);
                } else {
                    closeOnError('"' + parameters.projectName + '" does not exists among: ' +
                        projectNames.toString() + '. Set flag "createProject" to create a new project.');
                    return;
                }
            } else {
                if (parameters.createProject && !parameters.overwriteProject) {
                    closeOnError('"' + parameters.projectName + '" already exists: ' +
                        projectNames.toString() + '. Set flag "overwriteProject" to overwrite project.');
                    return;
                }

                if (parameters.overwriteProject) {
                    var deferred = Q.defer();
                    storage.deleteProject(dataForStorageCalls)
                        .then(function () {
                            storage.createProject(dataForStorageCalls)
                                .then(function (dbProject) {
                                    emptyProject = true;
                                    deferred.resolve(dbProject);
                                })
                                .catch(function (err) {
                                    deferred.reject(err);
                                });
                        })
                        .catch(function (err) {
                            deferred.reject(err);
                        });

                    return deferred.promise;
                } else {
                    return storage.openProject(dataForStorageCalls);
                }
            }
        })
        .then(function (dbProject) {
            var deferred = Q.defer();
            result.project = new Project(dbProject, storage, logger.fork('project'), gmeConfig);
            result.core = new Core(result.project, {
                globConf: gmeConfig,
                logger: logger.fork('core')
            });


            if (!parameters.branchName) {
                if (parameters.branchOrCommit && REGEXP.BRANCH.test(parameters.branchOrCommit)) {
                    parameters.branchName = parameters.branchOrCommit;
                } else {
                    parameters.branchName = 'master';
                }
            }

            if (emptyProject) {
                var root = result.core.createNode({parent: null, base: null}),
                    persisted = result.core.persist(root);

                result.branchName = parameters.branchName;

                result.project.makeCommit(null,
                    [],
                    persisted.rootHash,
                    persisted.objects,
                    'create empty project',
                    function (err, commitResult) {
                        var setParams = {
                            branchName: parameters.branchName,
                            projectName: parameters.projectName,
                            oldHash: ''
                        };
                        if (err) {
                            logger.error('project.makeCommit failed.');
                            closeOnError(err);
                        }

                        setParams.newHash = commitResult.hash;
                        result.commitHash = commitResult.hash;
                        result.rootNode = root;

                        if (parameters.userName) {
                            setParams.username = parameters.userName;
                        }
                        storage.setBranchHash(setParams, function (err, updateResult) {
                                if (err) {
                                    logger.error('setBranchHash failed with error.');
                                    closeOnError('project imported to commit: ' + commitResult.hash + ', but branch "' +
                                        parameters.branchName + '" could not be updated.', commitResult.hash);
                                }
                                deferred.resolve(null);
                                return;
                            }
                        );
                    }
                );
            } else {
                if (parameters.commitHash || (parameters.branchOrCommit && REGEXP.HASH.test(parameters.branchOrCommit))) {
                    //we have a commit, so we have to load it
                    Q.ninvoke(result.project, 'loadObject', parameters.commitHash || parameters.branchOrCommit)
                        .then(function (commitObject) {
                            result.commitHash = commitObject[CONSTANTS.MONGO_ID];
                            logger.debug('commitObject loaded', {metadata: commitObject});
                            result.core.loadRoot(commitObject.root, function (err, rootNode) {
                                if (err) {
                                    deferred.reject(err);
                                } else {
                                    logger.debug('rootNode loaded');
                                    deferred.resolve(rootNode);
                                }
                            });
                        })
                        .catch(function (err) {
                            closeOnError('No such commitHash "' + result.commitHash + '", in project "' +
                                parameters.projectName + '".');
                        });
                } else {
                    //we work with a branch
                    result.branchName = parameters.branchName;
                    result.project.getBranches()
                        .then(function (branches) {
                            if (branches[parameters.branchName]) {
                                result.commitHash = branches[parameters.branchName];
                                Q.ninvoke(result.project, 'loadObject', result.commitHash)
                                    .then(function (commitObject) {
                                        logger.debug('commitObject loaded', {metadata: commitObject});
                                        result.core.loadRoot(commitObject.root, function (err, rootNode) {
                                            if (err) {
                                                deferred.reject(err);
                                            } else {
                                                logger.debug('rootNode loaded');
                                                deferred.resolve(rootNode);
                                            }
                                        });
                                    })
                                    .catch(function (err) {
                                        closeOnError('No such commitHash "' + result.commitHash + '", in project "' +
                                            parameters.projectName + '".');
                                    });
                            } else {
                                closeOnError('"' + parameters.branchName + '" not in project: "' +
                                    parameters.projectName + '".');
                            }
                        })
                        .catch(function (err) {
                            deferred.reject(err);
                            return;
                        });
                }
            }
            return deferred.promise;
        })
        .then(function (rootObject) {

            if (rootObject === null) {
                //we have just created an empty project so we should be fine
                contextDeferred.resolve(result);
            }

            result.rootNode = rootObject;
            loadNodes(storage, result, parameters.nodePaths || [], false)
                .then(function (nodes) {
                    if (parameters.nodePaths) {
                        result.nodes = nodes;
                    }

                    if (parameters.meta) {
                        var metaIds = result.core.getMemberPaths(result.rootNode, 'MetaAspectSet');
                        loadNodes(storage, result, metaIds, true)
                            .then(function (nodes) {
                                result.META = nodes;
                                contextDeferred.resolve(result);
                            })
                            .catch(function (err) {
                                contextDeferred.reject(err);
                            });
                    } else {
                        contextDeferred.resolve(result);
                    }
                })
                .catch(function (err) {
                    closeOnError(err);
                });
        })
        .catch(function (err) {
            closeOnError(err);
        });

    return contextDeferred.promise.nodeify(callback);
}

function loadNodes(storage, result, paths, storeByName, callback) {
    var deferred = Q.defer(),
        nodes = {},
        counter = 0,
        loadedNodeHandler = function (err, nodeObj) {
            counter += 1;
            if (err) {
                error += err;
            }

            if (nodeObj) {
                if (storeByName) {
                    nodes[result.core.getAttribute(nodeObj, 'name')] = nodeObj;
                } else {
                    nodes[result.core.getPath(nodeObj)] = nodeObj;
                }
            }

            if (counter === paths.length) {
                allNodesLoadedHandler();
            }
        },
        allNodesLoadedHandler = function () {
            if (error) {
                deferred.reject(error);
            }

            deferred.resolve(nodes);
        },
        error,
        len;

    len = paths.length || 0;

    if (len === 0) {
        allNodesLoadedHandler();
    }
    while (len--) {
        result.core.loadByPath(result.rootNode, paths[len], loadedNodeHandler);
    }
    return deferred.promise.nodeify(callback);
}
module.exports.openContext = openContext;
