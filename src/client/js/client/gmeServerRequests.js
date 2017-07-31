/*globals define*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */

define(['js/Constants'], function (CONSTANTS) {
    'use strict';

    function gmeServerRequest(client, logger, state, storage) {

        function importProjectFromFile(projectName, branchName, blobHash, ownerId, url, callback) {
            var parameters = {
                command: CONSTANTS.SERVER_WORKER_REQUESTS.IMPORT_PROJECT_FROM_FILE,
                projectName: projectName,
                blobHash: blobHash,
                branchName: branchName,
                ownerId: ownerId,
                url: url
            };

            logger.debug('creating project from package', parameters);

            storage.simpleRequest(parameters, function (err, result) {
                if (err) {
                    logger.error(err);
                }
                callback(err, result);
            });
        }

        function updateProjectFromFile(projectId, branchName, blobHash, callback) {
            var parameters = {
                command: CONSTANTS.SERVER_WORKER_REQUESTS.UPDATE_PROJECT_FROM_FILE,
                blobHash: blobHash,
                projectId: projectId,
                branchName: branchName
            };

            logger.debug('updating project from package', parameters);

            storage.simpleRequest(parameters, function (err, result) {
                if (err) {
                    logger.error(err);
                }
                callback(err, result);
            });
        }

        function addLibrary(name, blobHashOrLibraryInfo, callback) {
            var parameters = {
                command: CONSTANTS.SERVER_WORKER_REQUESTS.ADD_LIBRARY,
                projectId: state.project.projectId,
                libraryName: name,
                branchName: state.branchName
            };

            if (typeof blobHashOrLibraryInfo === 'string') {
                parameters.blobHash = blobHashOrLibraryInfo;
            } else {
                parameters.libraryInfo = blobHashOrLibraryInfo;
            }

            storage.simpleRequest(parameters, function (err, result) {
                if (err) {
                    logger.error(err);
                }
                callback(err, result);
            });
        }

        function updateLibrary(name, blobHashOrLibraryInfo, callback) {
            var parameters = {
                command: CONSTANTS.SERVER_WORKER_REQUESTS.UPDATE_LIBRARY,
                projectId: state.project.projectId,
                libraryName: name,
                branchName: state.branchName
            };

            if (typeof blobHashOrLibraryInfo === 'string') {
                parameters.blobHash = blobHashOrLibraryInfo;
            } else if (blobHashOrLibraryInfo) {
                parameters.libraryInfo = blobHashOrLibraryInfo;
            }

            storage.simpleRequest(parameters, function (err, result) {
                if (err) {
                    logger.error(err);
                }
                callback(err, result);
            });
        }

        function renameConcept(nodePath, type, oldName, newName, callback) {
            var parameters = {
                command: CONSTANTS.SERVER_WORKER_REQUESTS.RENAME_CONCEPT,
                projectId: state.project.projectId,
                nodePath: nodePath,
                type: type,
                oldName: oldName,
                newName: newName,
                branchName: state.branchName
            };

            storage.simpleRequest(parameters, function (err, result) {
                if (err) {
                    logger.error(err);
                }
                callback(err, result);
            });
        }

        function renameAttributeDefinition(nodePath, meta, oldName, newName, callback) {
            var parameters = {
                command: CONSTANTS.SERVER_WORKER_REQUESTS.CHANGE_ATTRIBUTE_META,
                projectId: state.project.projectId,
                nodePath: nodePath,
                meta: meta,
                oldName: oldName,
                newName: newName,
                branchName: state.branchName
            };

            storage.simpleRequest(parameters, function (err, result) {
                if (err) {
                    logger.error(err);
                }
                callback(err, result);
            });
        }

        function renamePointerTargetDefinition(nodePath, targetPath, oldName, newName, isSet, callback) {
            var parameters = {
                command: CONSTANTS.SERVER_WORKER_REQUESTS.RENAME_META_POINTER_TARGET,
                projectId: state.project.projectId,
                nodePath: nodePath,
                targetPath: targetPath,
                type: isSet ? 'set' : 'pointer',
                oldName: oldName,
                newName: newName,
                branchName: state.branchName
            };

            storage.simpleRequest(parameters, function (err, result) {
                if (err) {
                    logger.error(err);
                }
                callback(err, result);
            });
        }

        function renameAspectDefinition(nodePath, meta, oldName, newName, callback) {
            var parameters = {
                command: CONSTANTS.SERVER_WORKER_REQUESTS.CHANGE_ASPECT_META,
                projectId: state.project.projectId,
                nodePath: nodePath,
                meta: meta,
                type: 'aspect',
                oldName: oldName,
                newName: newName,
                branchName: state.branchName
            };

            storage.simpleRequest(parameters, function (err, result) {
                if (err) {
                    logger.error(err);
                }
                callback(err, result);
            });
        }

        //meta rules checking
        /**
         *
         * @param {string[]} nodePaths - Paths to nodes of which to check.
         * @param includeChildren
         * @param callback
         */
        function checkMetaRules(nodePaths, includeChildren, callback) {
            var parameters = {
                command: CONSTANTS.SERVER_WORKER_REQUESTS.CHECK_CONSTRAINTS,
                checkType: 'META', //TODO this should come from a constant
                includeChildren: includeChildren,
                nodePaths: nodePaths,
                commitHash: state.commitHash,
                projectId: state.project.projectId
            };

            storage.simpleRequest(parameters, function (err, result) {
                if (err) {
                    logger.error(err);
                }

                if (result) {
                    client.dispatchEvent(CONSTANTS.CLIENT.META_RULES_RESULT, result);
                } else {
                    client.notifyUser({
                        severity: 'error',
                        message: 'Evaluating Meta rules failed with error.'
                    });
                }

                if (callback) {
                    callback(err, result);
                }
            });
        }

        /**
         *
         * @param {string[]} nodePaths - Paths to nodes of which to check.
         * @param {boolean} includeChildren - If true will recursively check the children of the nodes to check.
         * @param {function(Error, Object)} callback
         */
        function checkCustomConstraints(nodePaths, includeChildren, callback) {
            var parameters = {
                command: CONSTANTS.SERVER_WORKER_REQUESTS.CHECK_CONSTRAINTS,
                checkType: 'CUSTOM', //TODO this should come from a constant
                includeChildren: includeChildren,
                nodePaths: nodePaths,
                commitHash: state.commitHash,
                projectId: state.project.projectId
            };

            storage.simpleRequest(parameters, function (err, result) {
                if (err) {
                    logger.error(err);
                }

                if (result) {
                    client.dispatchEvent(CONSTANTS.CLIENT.CONSTRAINT_RESULT, result);
                } else {
                    client.notifyUser({
                        severity: 'error',
                        message: 'Evaluating custom constraints failed with error.'
                    });
                }

                if (callback) {
                    callback(err, result);
                }
            });
        }

        //seed
        function seedProject(parameters, callback) {
            logger.debug('seeding project', parameters);
            parameters.command = CONSTANTS.SERVER_WORKER_REQUESTS.SEED_PROJECT;
            storage.simpleRequest(parameters, function (err, result) {
                if (err) {
                    logger.error(err);
                }
                callback(err, result);
            });
        }

        //automerge
        function autoMerge(projectId, mine, theirs, callback) {
            var parameters = {
                command: CONSTANTS.SERVER_WORKER_REQUESTS.AUTO_MERGE,
                projectId: projectId,
                mine: mine,
                theirs: theirs
            };

            storage.simpleRequest(parameters, function (err, result) {
                if (err) {
                    logger.error('autoMerge failed with error', err);
                    callback(err);
                } else {
                    callback(null, result);
                }
            });
        }

        function resolve(mergeResult, callback) {
            var command = {
                command: CONSTANTS.SERVER_WORKER_REQUESTS.RESOLVE,
                partial: mergeResult
            };

            storage.simpleRequest(command, function (err, result) {
                if (err) {
                    logger.error('resolve failed with error', err);
                    callback(err);
                } else {
                    callback(null, result);
                }
            });
        }

        //package save
        function exportProjectToFile(projectId, branchName, commitHash, withAssets, callback) {
            var parameters = {
                command: CONSTANTS.SERVER_WORKER_REQUESTS.EXPORT_PROJECT_TO_FILE,
                projectId: projectId,
                branchName: branchName,
                commitHash: commitHash,
                withAssets: withAssets
            };

            logger.debug('exportProjectToFile, parameters', parameters);
            if (parameters.projectId && (parameters.branchName || commitHash)) {
                storage.simpleRequest(parameters, function (err, result) {
                    if (err && !result) {
                        logger.error('exportProjectToFile failed with error', err);
                        callback(err);
                    } else {
                        callback(err, result);
                    }
                });
            } else {
                callback(new Error('invalid parameters!'));
            }
        }

        function exportSelectionToFile(projectId, commitHash, selectedIds, withAssets, callback) {
            var parameters = {
                command: CONSTANTS.SERVER_WORKER_REQUESTS.EXPORT_SELECTION_TO_FILE,
                projectId: projectId,
                commitHash: commitHash,
                withAssets: withAssets,
                paths: selectedIds
            };

            logger.debug('exportSelectionToFile, parameters', parameters);
            if (parameters.projectId && commitHash && selectedIds && selectedIds.length > 0) {
                storage.simpleRequest(parameters, function (err, result) {
                    if (err && !result) {
                        logger.error('exportSelectionToFile failed with error', err);
                        callback(err);
                    } else {
                        callback(err, result);
                    }
                });
            } else {
                callback(new Error('invalid parameters!'));
            }
        }

        function importSelectionFromFile(projectId, branchName, parentId, blobHash, callback) {
            var parameters = {
                command: CONSTANTS.SERVER_WORKER_REQUESTS.IMPORT_SELECTION_FROM_FILE,
                projectId: projectId,
                blobHash: blobHash,
                parentPath: parentId,
                branchName: branchName
            };

            logger.debug('import selection from package', parameters);

            storage.simpleRequest(parameters, function (err, result) {
                if (err) {
                    logger.error(err);
                }
                callback(err, result);
            });
        }

        return {
            workerRequests:{
                importProjectFromFile: importProjectFromFile,
                updateProjectFromFile: updateProjectFromFile,
                addLibrary: addLibrary,
                updateLibrary: updateLibrary,
                renameConcept: renameConcept,
                renameAttributeDefinition: renameAttributeDefinition,
                renamePointerTargetDefinition: renamePointerTargetDefinition,
                renameAspectDefinition: renameAspectDefinition,
                checkMetaRules: checkMetaRules,
                checkCustomConstraints: checkCustomConstraints,
                seedProject: seedProject,
                autoMerge: autoMerge,
                resolve: resolve,
                exportProjectToFile: exportProjectToFile,
                exportSelectionToFile: exportSelectionToFile,
                importSelectionFromFile: importSelectionFromFile
            },
            // To keep the client API intact we still provide the old functions directly as well
            importProjectFromFile: importProjectFromFile,
            updateProjectFromFile: updateProjectFromFile,
            addLibrary: addLibrary,
            updateLibrary: updateLibrary,
            checkMetaRules: checkMetaRules,
            checkCustomConstraints: checkCustomConstraints,
            seedProject: seedProject,
            autoMerge: autoMerge,
            resolve: resolve,
            exportProjectToFile: exportProjectToFile,
            exportSelectionToFile: exportSelectionToFile,
            importSelectionFromFile: importSelectionFromFile
        };
    }

    return gmeServerRequest;
});