/*globals requireJS*/
/*jshint node:true*/
/**
 * @author kecso / https://github.com/kecso
 */

var ASSERT = requireJS('common/util/assert'),
    Core = requireJS('common/core/core'),
    Q = require('Q'),
    REGEXP = requireJS('common/regexp'),
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
            if (result.project) {
                result.project.closeProject(function () {
                    storage.closeDatabase(function () {
                        contextDeferred.reject(err);
                    });
                });
            } else {
                storage.closeDatabase(function () {
                    contextDeferred.reject(err);
                });
            }
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
            result.project = new Project(dbProject, storage, logger.fork('project'), gmeConfig);
            result.core = new Core(result.project, {
                globConf: gmeConfig,
                logger: logger.fork('core')
            });

            if (emptyProject) {
                var root = result.core.createNode({parent: null, base: null}),
                    persisted = result.core.persist(root);

                result.project.makeCommit(null,
                    [],
                    persisted.rootHash,
                    persisted.objects,
                    'create empty project',
                    function (err, commitResult) {
                        if (err) {
                            logger.error('project.makeCommit failed.');
                            closeOnError(err);
                            return;
                        }
                        storage.setBranchHash({
                                username: username,
                                branchName: branchName,
                                projectName: projectId,
                                oldHash: commitHash,
                                newHash: commitResult.hash
                            }, function (err, updateResult) {
                                if (err) {
                                    logger.error('setBranchHash failed with error.');
                                    closeOnError('project imported to commit: ' + commitHash + ', but branch "' +
                                        branchName + '" could not be updated.', commitHash);
                                    return;
                                }
                                contextDeferred.resolve(result);
                                return;
                            }
                        );
                    }
                );
            }

            if (parameters.branchName || parameters.commitHash || parameters.branchOrCommit) {
                var deferred = Q.defer();
                if (parameters.branchName) {
                    result.project.getBranchHash(parameters.branchName).
                        then(function (branchHash) {
                            result.commitHash = branchHash;
                            Q.ninvoke(result.project, 'loadObject', branchHash)
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
                                });
                        }).
                        catch(function (err) {
                            deferred.reject(err);
                        });
                }
                return deferred.promise;
            } else {
                contextDeferred.resolve(result);
                return;
            }
        })
        .then(function (rootObject) {
            var loadedNodeHandler = function (err, nodeObj) {
                    if (err) {
                        error += err;
                    }
                    nodes.push(nodeObj);

                    if (nodes.length === parameters.nodePaths.length) {
                        allNodesLoadedHandler();
                    }
                },
                allNodesLoadedHandler = function () {
                    var i;
                    if (error) {
                        contextDeferred.reject(error);
                        return;
                    }

                    for (i = 0; i < nodes.length; i+=1) {
                        if (insertByName) {
                            result.nodes[result.core.getAttribute(nodes[i], 'name')] = nodes[i];
                        } else {
                            result.nodes[result.core.getPath(nodes[i])] = nodes[i];
                        }
                    }
                    contextDeferred.resolve(result);
                    return;

                },
                error,
                insertByName = false,
                nodes = [],
                len = parameters.nodePaths.length || 0;

            result.rootNode = rootObject;
            if (parameters.nodePaths) {

                result.nodes = {};

                if (len === 0) {
                    allNodesLoadedHandler();
                }
                while (len--) {
                    result.core.loadByPath(result.rootNode, parameters.nodePaths[len], loadedNodeHandler);
                }

            } else {
                contextDeferred.resolve(result);
                return;
            }
        })
        .catch(function (err) {
            closeOnError(err);
            return;
        });

    return contextDeferred.promise.nodeify(callback);
}

module.exports.openContext = openContext;
