/*globals define*/
/*jshint node:true, browser: true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

define([
    'common/storage/constants',
    'common/util/jsonPatcher',
    './dataConverters',
    'q',
    'common/regexp'
], function (CONSTANTS, jsonPatcher, dataConverters, Q, REGEXP) {
    'use strict';

    function _getRootHash(project, parameters) {
        var deferred = Q.defer();

        if (parameters.branchName) {
            Q.ninvoke(project, 'getBranchHash', parameters.branchName)
                .then(function (commitHash) {
                    parameters.commitHash = commitHash;
                    return Q.ninvoke(project, 'loadObject', commitHash);
                })
                .then(function (commitObject) {
                    parameters.rootHash = commitObject.root;
                    deferred.resolve(commitObject.root);
                })
                .catch(deferred.reject);
        } else if (parameters.commitHash) {
            Q.ninvoke(project, 'loadObject', parameters.commitHash)
                .then(function (commitObject) {
                    parameters.rootHash = commitObject.root;
                    deferred.resolve(commitObject.root);
                })
                .catch(deferred.reject);
        } else if (parameters.tagName) {
            Q.ninvoke(project, 'getAllTags')
                .then(function (tags) {
                    if (tags[parameters.tagName]) {
                        parameters.commitHash = tags[parameters.tagName];
                        return Q.ninvoke(project, 'loadObject', tags[parameters.tagName]);
                    } else {
                        throw new Error('Unknown tag name [' + parameters.tagName + ']');
                    }
                })
                .then(function (commitObject) {
                    parameters.rootHash = commitObject.root;
                    deferred.resolve(commitObject.root);
                })
                .catch(deferred.reject);
        } else if (parameters.rootHash) {
            deferred.resolve(parameters.rootHash);
        } else {
            deferred.reject(new Error('No valid input was given to search for rootHash'));
        }

        return deferred.promise;
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
                                        //TODO why can't we inlcude BlobConfig???
                                        if (typeof object.atr[key] === 'string' &&
                                            REGEXP.BLOB_HASH.test(object.atr[key])) {
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

    /**
     * Patches a data object to the currently used version. The source version is stored inside the dataObject,
     * and the target version is coming from the storage constants. If no patch found,
     * nothing will happen to the object.
     *
     * @param {Object} dataObject
     */
    function patchDataObject(dataObject) {
        var dataVersion = dataObject.__v || '0.0.0',
            myVersion = CONSTANTS.VERSION || '0.0.0';

        if (dataConverters[dataVersion] && typeof dataConverters[dataVersion][myVersion] === 'function') {
            dataConverters[dataVersion][myVersion](dataObject);
        }

        dataObject.__v = myVersion;
    }

    return {
        CONSTANTS: CONSTANTS,
        getProjectFullNameFromProjectId: function (projectId) {
            if (projectId) {
                return projectId.replace(CONSTANTS.PROJECT_ID_SEP, CONSTANTS.PROJECT_DISPLAYED_NAME_SEP);
            }
        },
        getProjectDisplayedNameFromProjectId: function (projectId) {
            if (projectId) {
                return projectId.replace(CONSTANTS.PROJECT_ID_SEP, ' ' + CONSTANTS.PROJECT_DISPLAYED_NAME_SEP + ' ');
            }
        },
        getProjectIdFromProjectFullName: function (projectFullName) {
            if (projectFullName) {
                return projectFullName.replace(CONSTANTS.PROJECT_DISPLAYED_NAME_SEP, CONSTANTS.PROJECT_ID_SEP);
            }
        },
        getProjectIdFromOwnerIdAndProjectName: function (userId, projectName) {
            return userId + CONSTANTS.PROJECT_ID_SEP + projectName;
        },
        getProjectNameFromProjectId: function (projectId) {
            if (projectId) {
                return projectId.substring(projectId.indexOf(CONSTANTS.PROJECT_ID_SEP) + 1);
            }
        },
        getOwnerFromProjectId: function (projectId) {
            if (projectId) {
                return projectId.substring(0, projectId.indexOf(CONSTANTS.PROJECT_ID_SEP));
            }
        },
        getHashTaggedHash: function (hash) {
            if (typeof hash === 'string') {
                return hash[0] === '#' ? hash : '#' + hash;
            }
            return hash;
        },
        getPatchObject: function (oldData, newData) {
            var patchObject = {
                type: 'patch',
                base: oldData[CONSTANTS.MONGO_ID],
                patch: jsonPatcher.create(oldData, newData)
            };
            patchObject[CONSTANTS.MONGO_ID] = newData[CONSTANTS.MONGO_ID];

            return patchObject;
        },
        coreObjectHasOldAndNewData: function (coreObj) {
            return !!(coreObj.oldHash && coreObj.newHash && coreObj.oldData && coreObj.newData);
        },
        getChangedNodes: jsonPatcher.getChangedNodes,
        applyPatch: jsonPatcher.apply,

        /**
         * Extracts a serializable json representation of a project tree.
         * To specify starting point set one of the four options. If more than one is set the order of precedence is:
         * branchName, commitHash, tagName and rootHash.
         *
         * @param {ProjectInterface} project
         * @param {object} parameters - Specifies which project tree should be serialized:
         * @param {string} [parameters.rootHash] - The hash of the tree root.
         * @param {string} [parameters.commitHash] - The tree associated with the commitHash.
         * @param {string} [parameters.tagName] - The tree at the given tag.
         * @param {string} [parameters.branchName] - The tree at the given branch.
         * @param {function} callback
         */
        getProjectJson: function (project, parameters, callback) {
            var deferred = Q.defer(),
                rawJson;

            _getRootHash(project, parameters || {})
                .then(function (rootHash) {
                    return _collectObjectAndAssetHashes(project, rootHash);
                })
                .then(function (hashes) {
                    rawJson = {
                        rootHash: parameters.rootHash,
                        projectId: project.projectId,
                        branchName: parameters.branchName,
                        commitHash: parameters.commitHash,
                        hashes: hashes,
                        objects: null
                    };
                    return _collectObjects(project, hashes.objects);
                })
                .then(function (objects) {
                    rawJson.objects = objects;
                    deferred.resolve(rawJson);
                })
                .catch(deferred.reject);

            return deferred.promise.nodeify(callback);
        },

        /**
         * Inserts a serialized project tree into the storage and associates it with a commitHash.
         *
         * @param {ProjectInterface} project
         * @param {object} [options]
         * @param {string} [options.commitMessage=%defaultCommitMessage%] information about the insertion
         * @param {function(Error, hashes)} callback
         */
        insertProjectJson: function (project, projectJson, options, callback) {
            var deferred = Q.defer(),
                toPersist = {},
                rootHash = projectJson.rootHash,
                defaultCommitMessage = 'Importing contents of [' +
                    projectJson.projectId + '@' + rootHash + ']',
                objects = projectJson.objects,
                i;

            for (i = 0; i < objects.length; i += 1) {
                // we have to patch the object right before import, for smoother usage experience
                toPersist[objects[i]._id] = objects[i];
            }

            options = options || {};

            options.branch = options.branch || null;
            options.parentCommit = options.parentCommit || [];

            project.makeCommit(options.branch, options.parentCommit,
                rootHash, toPersist, options.commitMessage || defaultCommitMessage)
                .then(function (commitResult) {
                    deferred.resolve(commitResult);
                })
                .catch(deferred.reject);

            return deferred.promise.nodeify(callback);
        },

        patchDataObject: patchDataObject
    };
});
