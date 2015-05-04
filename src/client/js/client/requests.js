/*globals define*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */
define(['common/util/assert',
    'common/core/users/serialization',
    'common/core/users/dump',
    'common/core/users/copyimport',
    'common/core/users/import',
    'common/util/url'
], function (ASSERT,
             Serialization,
             dump,
             importing,
             mergeImport,
             URL) {
    'use strict';
    var ROOT_PATH = '';

    function Requests(_clientGlobal) {
        function getAvailableProjectsAsync(callback) {
            if (_clientGlobal.db) {
                _clientGlobal.db.getProjectNames(callback);
            } else {
                callback(new Error('there is no open database connection!'));
            }
        }

        function getViewableProjectsAsync(callback) {
            if (_clientGlobal.db) {
                _clientGlobal.db.getAllowedProjectNames(callback);
            } else {
                callback(new Error('there is no open database connection!'));
            }
        }

        function getProjectAuthInfoAsync(projectname, callback) {
            if (_clientGlobal.db) {
                _clientGlobal.db.getAuthorizationInfo(projectname, callback);
            } else {
                callback(new Error('there is no open database connection!'));
            }
        }

        function getFullProjectListAsync(callback) {
            _clientGlobal.db.getProjectNames(function (err, names) {
                var wait,
                    fullList = {},
                    getProjectAuthInfo,
                    i,
                    projectAuthInfoResponse = function (/*err*/) {
                        wait -= 1;
                        if (wait === 0) {
                            callback(null, fullList);
                        }
                    };

                if (!err && names) {
                    wait = names.length || 0;
                    if (wait > 0) {
                        getProjectAuthInfo = function (name, cb) {
                            _clientGlobal.db.getAuthorizationInfo(name, function (err, authObj) {
                                if (!err && authObj) {
                                    fullList[name] = authObj;
                                }
                                cb(err);
                            });
                        };

                        for (i = 0; i < names.length; i += 1) {
                            getProjectAuthInfo(names[i], projectAuthInfoResponse);
                        }
                    } else {
                        callback(null, {});
                    }
                } else {
                    callback(err, {});
                }
            });
        }

        function getFullProjectsInfoAsync(callback) {
            _clientGlobal.db.simpleRequest({command: 'getAllProjectsInfo'}, function (err, id) {
                if (err) {
                    return callback(err);
                }
                _clientGlobal.db.simpleResult(id, callback);
            });
        }

        function setProjectInfoAsync(projectId, info, callback) {
            _clientGlobal.db.simpleRequest({
                    command: 'setProjectInfo',
                    projectId: projectId,
                    info: info
                },
                function (err, rId) {
                    if (err) {
                        return callback(err);
                    }
                    _clientGlobal.db.simpleResult(rId, callback);
                });
        }

        function getProjectInfoAsync(projectId, callback) {
            _clientGlobal.db.simpleRequest({command: 'getProjectInfo', projectId: projectId}, function (err, rId) {
                if (err) {
                    return callback(err);
                }
                _clientGlobal.db.simpleResult(rId, callback);
            });
        }

        function getAllInfoTagsAsync(callback) {
            _clientGlobal.db.simpleRequest({command: 'getAllInfoTags'}, function (err, rId) {
                if (err) {
                    return callback(err);
                }
                _clientGlobal.db.simpleResult(rId, callback);
            });
        }

        function createGenericBranchAsync(project, branch, commit, callback) {
            _clientGlobal.db.simpleRequest({
                    command: 'setBranch',
                    project: project,
                    branch: branch,
                    old: '',
                    new: commit
                },
                function (err, id) {
                    if (err) {
                        return callback(err);
                    }
                    _clientGlobal.db.simpleResult(id, callback);
                });
        }

        function deleteGenericBranchAsync(project, branch, commit, callback) {
            _clientGlobal.db.simpleRequest({
                    command: 'setBranch',
                    project: project,
                    branch: branch,
                    old: commit,
                    new: ''
                },
                function (err, id) {
                    if (err) {
                        return callback(err);
                    }
                    _clientGlobal.db.simpleResult(id, callback);
                });
        }

        function getDumpURL(parameters) {
            parameters.output = parameters.output || 'dump_url.out';
            return plainUrl(parameters);
        }

        function createEmptyProject(project, callback) {
            var core = _clientGlobal.functions.getNewCore(project,
                    _clientGlobal.gmeConfig, _clientGlobal.logger.fork('createEmptyProject')),
                root = core.createNode(),
                rootHash = '',
                commitHash = '';
            core.persist(root, function (/* err */) {
                rootHash = core.getHash(root);
                commitHash = project.makeCommit([], rootHash, 'project creation commit', function (/* err */) {
                    project.setBranchHash('master', '', commitHash, function (err) {
                        callback(err, commitHash);
                    });
                });
            });

        }

        function exportItems(paths, callback) {
            var nodes = [];
            for (var i = 0; i < paths.length; i++) {
                if (_clientGlobal.nodes[paths[i]]) {
                    nodes.push(_clientGlobal.nodes[paths[i]].node);
                } else {
                    callback('invalid node');
                    return;
                }
            }

            _clientGlobal.db.simpleRequest({
                    command: 'dumpMoreNodes',
                    name: _clientGlobal.projectName,
                    hash: _clientGlobal.root.current || _clientGlobal.core.getHash(_clientGlobal.nodes[ROOT_PATH].node),
                    nodes: paths
                },
                function (err, resId) {
                    if (err) {
                        callback(err);
                    } else {
                        _clientGlobal.db.simpleResult(resId, callback);
                    }
                });
        }

        function getExportItemsUrlAsync(paths, filename, callback) {
            _clientGlobal.db.simpleRequest({
                    command: 'dumpMoreNodes',
                    name: _clientGlobal.projectName,
                    hash: _clientGlobal.root.current || _clientGlobal.core.getHash(_clientGlobal.nodes[ROOT_PATH].node),
                    nodes: paths
                },
                function (err, resId) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null,
                            window.location.protocol + '//' + window.location.host + '/worker/simpleResult/' +
                            resId + '/' + filename);
                    }
                });
        }

        function getExportLibraryUrlAsync(libraryRootPath, filename, callback) {
            var command = {};
            command.command = 'exportLibrary';
            command.name = _clientGlobal.projectName;
            command.hash = _clientGlobal.root.current ||
                _clientGlobal.core.getHash(_clientGlobal.nodes[ROOT_PATH].node);
            command.path = libraryRootPath;
            if (command.name && command.hash) {
                _clientGlobal.db.simpleRequest(command, function (err, resId) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null,
                            window.location.protocol + '//' + window.location.host + '/worker/simpleResult/' +
                            resId + '/' + filename);
                    }
                });
            } else {
                callback(new Error('there is no open project!'));
            }
        }

        function updateLibraryAsync(libraryRootPath, newLibrary, callback) {
            Serialization.import(_clientGlobal.core,
                _clientGlobal.nodes[libraryRootPath].node, newLibrary, function (err, log) {
                    if (err) {
                        return callback(err);
                    }

                    _clientGlobal.functions.saveRoot('library update done\nlogs:\n' + log, callback);
                }
            );
        }

        function addLibraryAsync(libraryParentPath, newLibrary, callback) {
            _clientGlobal.functions.startTransaction('creating library as a child of ' + libraryParentPath);
            var libraryRoot = _clientGlobal.nodeSetter.createChild({
                parentId: libraryParentPath,
                baseId: null
            }, 'library placeholder');
            Serialization.import(_clientGlobal.core,
                _clientGlobal.nodes[libraryRoot].node, newLibrary, function (err, log) {
                    if (err) {
                        return callback(err);
                    }

                    _clientGlobal.functions.completeTransaction('library update done\nlogs:\n' + log, callback);
                }
            );
        }

        function dumpNodeAsync(path, callback) {
            if (_clientGlobal.nodes[path]) {
                dump(_clientGlobal.core, _clientGlobal.nodes[path].node, '', 'guid', callback);
            } else {
                callback('unknown object', null);
            }
        }

        function importNodeAsync(parentPath, jNode, callback) {
            var node = null;
            if (_clientGlobal.nodes[parentPath]) {
                node = _clientGlobal.nodes[parentPath].node;
            }
            importing(_clientGlobal.core, _clientGlobal.nodes[parentPath].node, jNode, function (err) {
                if (err) {
                    callback(err);
                } else {
                    _clientGlobal.functions.saveRoot('importNode under ' + parentPath, callback);
                }
            });
        }

        function mergeNodeAsync(parentPath, jNode, callback) {
            var node = null;
            if (_clientGlobal.nodes[parentPath]) {
                node = _clientGlobal.nodes[parentPath].node;
            }
            mergeImport(_clientGlobal.core, _clientGlobal.nodes[parentPath].node, jNode, function (err) {
                if (err) {
                    callback(err);
                } else {
                    _clientGlobal.functions.saveRoot('importNode under ' + parentPath, callback);
                }
            });
        }

        function createProjectFromFileAsync(projectname, jProject, callback) {
            //TODO somehow the export / import should contain the INFO field
            // so the tags and description could come from it
            createProjectAsync(projectname, {}, function (/*err*/) {
                selectProjectAsync(projectname, function (/*err*/) {
                    Serialization.import(_clientGlobal.core, _clientGlobal.root.object, jProject, function (err) {
                        if (err) {
                            return callback(err);
                        }

                        _clientGlobal.functions.saveRoot('library has been updated...', callback);
                    });
                });
            });
        }

        function selectProjectAsync(projectname, callback) {
            if (_clientGlobal.db) {
                if (projectname === _clientGlobal.projectName) {
                    callback(null);
                } else {
                    _clientGlobal.functions.closeOpenedProject(function (/*err*/) {
                        //TODO what can we do with the error??
                        _clientGlobal.functions.openProject(projectname, function (err) {
                            //TODO is there a meaningful error which we should propagate towards user???
                            if (!err) {
                                _clientGlobal.functions.reLaunchUsers();
                            }
                            callback(err);
                        });
                    });
                }
            } else {
                callback(new Error('there is no open database connection!!!'));
            }
        }

        function plainUrl(parameters) {
            //setting the default values
            parameters.command = parameters.command || 'etf';
            parameters.path = parameters.path || '';
            parameters.project = parameters.project || _clientGlobal.projectName;

            if (!parameters.root && !parameters.branch && !parameters.commit) {
                if (_clientGlobal.root.current) {
                    parameters.root = _clientGlobal.root.current;
                } else if (_clientGlobal.nodes && _clientGlobal.nodes[ROOT_PATH]) {
                    parameters.root = _clientGlobal.core.getHash(_clientGlobal.nodes[ROOT_PATH].node);
                } else {
                    parameters.branch = _clientGlobal.branch || 'master';
                }
            }

            //now we compose the URL
            if (window && window.location) {
                var address = window.location.protocol + '//' + window.location.host + '/rest/' +
                    parameters.command + '?';
                address += '&project=' + URL.addSpecialChars(parameters.project);
                if (parameters.root) {
                    address += '&root=' + URL.addSpecialChars(parameters.root);
                } else {
                    if (parameters.commit) {
                        address += '&commit=' + URL.addSpecialChars(parameters.commit);
                    } else {
                        address += '&branch=' + URL.addSpecialChars(parameters.branch);
                    }
                }

                address += '&path=' + URL.addSpecialChars(parameters.path);

                if (parameters.output) {
                    address += '&output=' + URL.addSpecialChars(parameters.output);
                }

                return address;
            }

            return null;

        }

        function createProjectAsync(projectname, projectInfo, callback) {
            if (_clientGlobal.db) {
                getAvailableProjectsAsync(function (err, names) {
                    if (!err && names) {
                        if (names.indexOf(projectname) === -1) {
                            _clientGlobal.db.openProject(projectname, function (err, p) {
                                if (!err && p) {
                                    createEmptyProject(p, function (err, commit) {
                                        if (!err && commit) {
                                            //TODO currently this is just a hack
                                            p.setInfo(projectInfo || {
                                                    visibleName: projectname,
                                                    description: 'project in webGME',
                                                    tags: {}
                                                }, function (err) {
                                                callback(err);
                                            });
                                        } else {
                                            callback(err);
                                        }
                                    });
                                } else {
                                    callback(err);
                                }
                            });
                        } else {
                            //TODO maybe the selectProjectAsync could be called :)
                            callback('the project already exists!');
                        }
                    } else {
                        callback(err);
                    }
                });
            } else {
                callback(new Error('there is no open database connection!'));
            }

        }

        function deleteProjectAsync(projectname, callback) {
            if (_clientGlobal.db) {
                if (projectname === _clientGlobal.projectName) {
                    _clientGlobal.functions.closeOpenedProject();
                }
                _clientGlobal.db.deleteProject(projectname, callback);

            } else {
                callback(new Error('there is no open database connection!'));
            }
        }

        //branching functionality
        function getBranchesAsync(callback) {
            if (_clientGlobal.db) {
                if (_clientGlobal.project) {
                    _clientGlobal.project.getBranchNames(function (err, names) {
                        var missing = 0,
                            branchArray = [],
                            error = null,
                            getBranchValues,
                            i,
                            element;

                        if (!err && names) {
                            getBranchValues = function (name) {
                                _clientGlobal.project.getBranchHash(name, '#hack', function (err, newhash, forked) {
                                    if (!err && newhash) {
                                        element = {name: name, commitId: newhash};
                                        if (forked) {
                                            element.sync = false;
                                        } else {
                                            element.sync = true;
                                        }
                                        branchArray.push(element);
                                    } else {
                                        error = error || err;
                                    }

                                    missing -= 1;
                                    if (missing === 0) {
                                        callback(error, branchArray);
                                    }
                                });
                            };

                            for (i in names) {
                                missing += 1;
                            }

                            if (missing > 0) {
                                for (i in names) {
                                    getBranchValues(i);
                                }
                            } else {
                                callback(null, branchArray);
                            }
                        } else {
                            callback(err);
                        }
                    });
                } else {
                    callback(new Error('there is no open project!'));
                }
            } else {
                callback(new Error('there is no opened database connection!'));
            }
        }

        function selectCommitAsync(hash, callback) {
            //this should proxy to branch selection and viewer functions
            if (_clientGlobal.db) {
                if (_clientGlobal.project) {
                    _clientGlobal.functions.viewerCommit(hash, callback);
                } else {
                    callback(new Error('there is no open project!'));
                }
            } else {
                callback(new Error('there is no open database connection!'));
            }
        }

        function selectBranchAsync(branch, callback) {
            var waiting = 1,
                error = null,
                innerCallback = function (err) {
                    error = error || err;
                    if (--waiting === 0) {
                        callback(error);
                    }
                };

            if (_clientGlobal.db) {
                if (_clientGlobal.project) {
                    _clientGlobal.project.getBranchNames(function (err, names) {
                        if (err) {
                            return callback(err);
                        }

                        if (names[branch]) {
                            _clientGlobal.addOn.stopRunningAddOns();
                            _clientGlobal.functions.branchWatcher(branch, innerCallback);
                        } else {
                            callback(new Error('there is no such branch!'));
                        }

                    });
                } else {
                    callback(new Error('there is no open project!'));
                }
            } else {
                callback(new Error('there is no open database connection!'));
            }
        }

        function getCommitsAsync(commitHash, number, callback) {
            if (_clientGlobal.db) {
                if (_clientGlobal.project) {
                    ASSERT(_clientGlobal.commitCache);
                    if (commitHash === undefined) {
                        commitHash = null;
                    }
                    _clientGlobal.commitCache.getNCommitsFrom(commitHash, number, callback);
                } else {
                    callback(new Error('there is no open project!'));
                }
            } else {
                callback(new Error('there is no open database connection!'));
            }
        }

        function createBranchAsync(branchName, commitHash, callback) {
            //it doesn't changes anything, just creates the new branch
            if (_clientGlobal.db) {
                if (_clientGlobal.project) {
                    _clientGlobal.project.setBranchHash(branchName, '', commitHash, callback);
                } else {
                    callback(new Error('there is no open project!'));
                }
            } else {
                callback(new Error('there is no open database connection!'));
            }
        }

        function deleteBranchAsync(branchName, callback) {
            if (_clientGlobal.db) {
                if (_clientGlobal.project) {
                    _clientGlobal.project.getBranchHash(branchName, '', function (err, newhash, forkedhash) {
                        if (!err && newhash) {
                            if (forkedhash) {
                                _clientGlobal.project.setBranchHash(branchName, newhash, forkedhash, function (err) {
                                    if (!err) {
                                        _clientGlobal.functions.changeBranchState(_clientGlobal.branchStates.SYNC);
                                    }
                                    callback(err);
                                });
                            } else {
                                _clientGlobal.project.setBranchHash(branchName, newhash, '', callback);
                            }
                        } else {
                            callback(err);
                        }
                    });
                } else {
                    callback(new Error('there is no open project!'));
                }
            } else {
                callback(new Error('there is no open database connection!'));
            }
        }

        return {
            getAvailableProjectsAsync: getAvailableProjectsAsync,
            getViewableProjectsAsync: getViewableProjectsAsync,
            getFullProjectListAsync: getFullProjectListAsync,
            getProjectAuthInfoAsync: getProjectAuthInfoAsync,
            createProjectAsync: createProjectAsync,
            selectProjectAsync: selectProjectAsync,
            deleteProjectAsync: deleteProjectAsync,
            getBranchesAsync: getBranchesAsync,
            selectCommitAsync: selectCommitAsync,
            getCommitsAsync: getCommitsAsync,
            createBranchAsync: createBranchAsync,
            deleteBranchAsync: deleteBranchAsync,
            selectBranchAsync: selectBranchAsync,
//JSON functions
            exportItems: exportItems,
            getExportItemsUrlAsync: getExportItemsUrlAsync,
            //getExternalInterpreterConfigUrlAsync: getExternalInterpreterConfigUrlAsync,
            dumpNodeAsync: dumpNodeAsync,
            importNodeAsync: importNodeAsync,
            mergeNodeAsync: mergeNodeAsync,
            createProjectFromFileAsync: createProjectFromFileAsync,
            getDumpURL: getDumpURL,
            getExportLibraryUrlAsync: getExportLibraryUrlAsync,
            updateLibraryAsync: updateLibraryAsync,
            addLibraryAsync: addLibraryAsync,
            getFullProjectsInfoAsync: getFullProjectsInfoAsync,
            createGenericBranchAsync: createGenericBranchAsync,
            deleteGenericBranchAsync: deleteGenericBranchAsync,
            setProjectInfoAsync: setProjectInfoAsync,
            getProjectInfoAsync: getProjectInfoAsync,
            getAllInfoTagsAsync: getAllInfoTagsAsync
        };
    }

    return Requests;
});