/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['util/assert', 'common/core/core'], function (ASSERT, Core) {

    /**
     * Opens the context specified by the parameters and returns a result object containing
     * data.
     * @param {object} storage - clientstorage, serveruserstorage or localstorage
     * @param {object} gmeConfig - global webgme configuration
     * @param {object} parameters
     * @param {string} [parameters.projectName] - name of project to open -> result.project
     * @param {string} [parameters.branchName] - name of branch to load root from. -> result.rootNode, result.commitHash
     * @param {string} [parameters.commitHash] - if branchName not given commitHash will be loaded. -> result.rootNode
     * @param {string} [parameters.nodeIds] - //TODO: will load all specified node ids. -> result.nodes
     * @param {boolean} [parameters.meta] - //TODO: will load all META-nodes. -> result.META
     * @param {object} [parameters.core] - Used if branchName or commitHash is specified (a new Core will be created
     *                                     if needed and not provided here). -> result.core
     * @param {function} callback
     */
    var openContext = function (storage, gmeConfig, parameters, callback) {
        var result = {},
            core,
            closeOnError = function (err) {
                if (result.project) {
                    result.project.closeProject(function () {
                        storage.closeDatabase(function () {
                            callback(err);
                        });
                    });
                } else {
                    storage.closeDatabase(function () {
                        callback(err);
                    });
                }
            };

        ASSERT(typeof storage !== 'undefined' && storage.hasOwnProperty('openDatabase'), 'storage must be given');
        ASSERT(typeof callback === 'function', 'a callback must be given');

        storage.openDatabase(function (err) {
            if (err) {
                closeOnError(err);
                return;
            }
            if (parameters.projectName) {
                storage.getProjectNames(function (err, projectNames) {
                    if (err) {
                        closeOnError(err);
                        return;
                    }
                    if (projectNames.indexOf(parameters.projectName) === -1) {
                        closeOnError('"' + parameters.projectName + '" does not exists among: ' +
                        projectNames.toString());
                        return;
                    }
                    storage.openProject(parameters.projectName, function (err, project) {
                        if (err) {
                            closeOnError(err);
                            return;
                        }
                        result.project = project;
                        if (parameters.branchName || parameters.commitHash) {
                            _getCommitHash(result.project, gmeConfig, parameters, function (err, commitHash) {
                                if (err) {
                                    closeOnError(err);
                                    return;
                                }
                                result.commitHash = commitHash;
                                _loadRoot(project, gmeConfig, commitHash, parameters, function (err, rootNode, core) {
                                    if (err) {
                                        closeOnError(err);
                                        return;
                                    }
                                    result.rootNode = rootNode;
                                    result.core = core;
                                    callback(null, result);
                                });
                            });
                        } else {
                            callback(null, result);
                        }
                    });
                });
            } else {
                callback(null, result);
            }
        });
    };

    function _getCommitHash(project, gmeConfig, parameters, callback) {
        if (parameters.branchName) {
            project.getBranchNames(function (err, names) {
                if (err) {
                    callback(err);
                } else if (names.hasOwnProperty(parameters.branchName) === false) {
                    callback('"' + parameters.branchName + '" not in project: "' +
                    parameters.projectName + '".');
                } else {
                    callback(null, names[parameters.branchName]);
                }
            });
        } else {
            callback(null, parameters.commitHash);
        }
    }

    function _loadRoot(project, gmeConfig, commitHash, parameters, callback) {
        var core;
        project.loadObject(commitHash, function (err, commitObj) {
            if (err) {
                callback(err);
                return;
            }
            core = parameters.core || new Core(project, {globConf: gmeConfig});
            core.loadRoot(commitObj.root, function (err, rootNode) {
                if (err) {
                    callback(err);
                    return;
                }
                callback(null, rootNode, core);
            });
        });
    }

    return openContext;
});
