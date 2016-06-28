/*globals requireJS*/
/*jshint node:true*/

/**
 * @module Server:Storage
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Q = require('q'),

    REGEXP = requireJS('common/regexp'),
    storageHelpers = require('./storagehelpers'),
    EventDispatcher = requireJS('common/EventDispatcher'),
    CONSTANTS = requireJS('common/storage/constants'),
    UTIL = requireJS('common/storage/util');

function Storage(database, logger, gmeConfig) {
    EventDispatcher.call(this);
    this.database = database;
    this.logger = logger.fork('storage');
    this.gmeConfig = gmeConfig;
}

// Inherit from EventDispatcher
Storage.prototype = Object.create(EventDispatcher.prototype);
Storage.prototype.constructor = Storage;

Storage.prototype.openDatabase = function (callback) {
    return this.database.openDatabase()
        .nodeify(callback);
};

Storage.prototype.closeDatabase = function (callback) {
    this.clearAllEvents();
    return this.database.closeDatabase()
        .nodeify(callback);
};

Storage.prototype.deleteProject = function (data, callback) {
    var self = this;
    return this.database.deleteProject(data.projectId)
        .then(function (didExist) {
            var eventData = {
                projectId: data.projectId,
                userId: data.username
            };

            self.logger.debug('deleteProject, didExist?', didExist);
            if (didExist) {
                self.logger.debug('Project deleted will dispatch', data.projectId);
                if (self.gmeConfig.storage.broadcastProjectEvents) {
                    eventData.socket = data.socket;
                }

                self.dispatchEvent(CONSTANTS.PROJECT_DELETED, eventData);
            }

            return didExist;
        })
        .nodeify(callback);
};

Storage.prototype.createProject = function (data, callback) {
    var self = this;
    return this.database.createProject(data.projectId)
        .then(function (project) {
            var eventData = {
                projectId: data.projectId,
                userId: data.username
            };

            self.logger.debug('Project created will dispatch', data.projectId);
            if (self.gmeConfig.storage.broadcastProjectEvents) {
                eventData.socket = data.socket;
            }

            self.dispatchEvent(CONSTANTS.PROJECT_CREATED, eventData);
            return project;
        })
        .nodeify(callback);
};

Storage.prototype.renameProject = function (data, callback) {
    var self = this;
    return this.database.renameProject(data.projectId, data.newProjectId)
        .then(function () {
            var eventDataDeleted = {
                    projectId: data.projectId,
                    userId: data.username
                },
                eventDataCreated = {
                    projectId: data.newProjectId,
                    userId: data.username
                };

            self.logger.debug('Project transferred will dispatch', data.projectId, data.newProjectId);
            if (self.gmeConfig.storage.broadcastProjectEvents) {
                eventDataCreated.socket = data.socket;
                eventDataDeleted.socket = data.socket;
            }

            self.dispatchEvent(CONSTANTS.PROJECT_CREATED, eventDataCreated);
            self.dispatchEvent(CONSTANTS.PROJECT_DELETED, eventDataDeleted);

            return data.newProjectId;
        })
        .nodeify(callback);
};

Storage.prototype.duplicateProject = function (data, callback) {
    var self = this;
    return this.database.duplicateProject(data.projectId, data.newProjectId)
        .then(function (project) {
            var eventData = {
                projectId: data.projectId,
                userId: data.username
            };

            self.logger.debug('Project created will dispatch', data.projectId);
            if (self.gmeConfig.storage.broadcastProjectEvents) {
                eventData.socket = data.socket;
            }

            self.dispatchEvent(CONSTANTS.PROJECT_CREATED, eventData);
            return project;
        })
        .nodeify(callback);
};

Storage.prototype.getBranches = function (data, callback) {
    return this.database.openProject(data.projectId)
        .then(function (project) {
            return project.getBranches();
        })
        .nodeify(callback);
};

Storage.prototype.getLatestCommitData = function (data, callback) {
    var project,
        result = {
            projectId: data.projectId,
            branchName: data.branchName,
            commitObject: null,
            coreObjects: []
        };

    return this.database.openProject(data.projectId)
        .then(function (project_) {
            project = project_;
            return project.getBranchHash(data.branchName);
        })
        .then(function (branchHash) {
            if (branchHash === '') {
                throw new Error('Branch "' + data.branchName + '" does not exist in project "' +
                    data.projectId + '"');
            }

            return project.loadObject(branchHash);
        })
        .then(function (commitObject) {
            result.commitObject = commitObject;
            return project.loadObject(commitObject.root);
        })
        .then(function (rootObject) {
            result.coreObjects.push(rootObject);
            return result;
        })
        .nodeify(callback);
};

Storage.prototype.makeCommit = function (data, callback) {
    var self = this,
        deferred = Q.defer();

    this.database.openProject(data.projectId)
        .then(function (project) {
            var objectHashes = Object.keys(data.coreObjects),
                newObjCnt = 0,
                emitObjects = [];

            function insertObj(hash) {
                if (data.coreObjects[hash].type === 'patch') {
                    emitObjects.push(data.coreObjects[hash]);

                    return project.loadObject(data.coreObjects[hash].base)
                        .then(function (base) {
                            var patchResult = UTIL.applyPatch(base, data.coreObjects[hash].patch);

                            if (patchResult.status === 'success') {
                                // Overwrite the id of the generated result
                                patchResult.result[CONSTANTS.MONGO_ID] = hash;
                                return project.insertObject(patchResult.result);
                            } else {
                                self.logger.error('failed patching', patchResult);
                                throw new Error('error during patch application', hash);
                            }
                        });
                } else if (data.coreObjects[hash][CONSTANTS.MONGO_ID]) {
                    // A new object was sent.

                    if (self.gmeConfig.storage.maxEmittedCoreObjects === -1 ||
                        newObjCnt < self.gmeConfig.storage.maxEmittedCoreObjects) {
                        // We are still under the limit and can add the coreObject to the emitted data.
                        emitObjects.push(data.coreObjects[hash]);
                    }

                    newObjCnt += 1;

                    return project.insertObject(data.coreObjects[hash]);
                } else {
                    throw new Error('Unexpected core object type received', Object.keys(data.coreObjects[hash]));
                }
            }

            Q.allSettled(objectHashes.map(insertObj))
                .then(function (insertResults) {
                    var failedInserts = [];
                    insertResults.forEach(function (res) {
                        if (res.state === 'rejected') {
                            self.logger.error(res.reason);
                            failedInserts.push(res);
                        }
                    });

                    if (failedInserts.length > 0) {
                        // TODO: How to add meta data to error and decide on error codes.
                        deferred.reject(failedInserts[0].reason);
                    } else {
                        project.insertObject(data.commitObject)
                            .then(function () {
                                var newHash = data.commitObject[CONSTANTS.MONGO_ID],
                                    oldHash = data.oldHash || data.commitObject.parents[0],
                                    result = {
                                        status: null, // SYNCED, FORKED, (MERGED)
                                        hash: newHash
                                    },
                                    commitEventData = {
                                        projectId: data.projectId,
                                        commitHash: newHash,
                                        userId: data.username
                                    };

                                self.dispatchEvent(CONSTANTS.COMMIT, commitEventData);

                                if (data.hasOwnProperty('socket') && self.gmeConfig.storage.broadcastProjectEvents) {
                                    commitEventData.socket = data.socket;
                                }

                                if (!data.branchName) {
                                    deferred.resolve({hash: data.commitObject[CONSTANTS.MONGO_ID]});
                                    return;
                                }

                                project.setBranchHash(data.branchName, oldHash, newHash)
                                    .then(function () {
                                        var fullEventData = {
                                                projectId: data.projectId,
                                                branchName: data.branchName,
                                                commitObject: data.commitObject,
                                                coreObjects: emitObjects,
                                                changedNodes: data.changedNodes, // TODO: This doesn't need to passed
                                                userId: data.username
                                            },
                                            eventData = {
                                                projectId: data.projectId,
                                                branchName: data.branchName,
                                                newHash: newHash,
                                                oldHash: oldHash,
                                                userId: data.username
                                            };

                                        if (data.hasOwnProperty('socket')) {
                                            fullEventData.socket = data.socket;
                                            if (self.gmeConfig.storage.broadcastProjectEvents) {
                                                eventData.socket = data.socket;
                                            }
                                        }

                                        result.status = CONSTANTS.SYNCED;
                                        self.dispatchEvent(CONSTANTS.BRANCH_HASH_UPDATED, eventData);
                                        self.dispatchEvent(CONSTANTS.BRANCH_UPDATED, fullEventData);
                                        self.logger.debug('Branch update succeeded.');
                                        deferred.resolve(result);
                                    })
                                    .catch(function (err) {
                                        if (err.message === 'branch hash mismatch') {
                                            // TODO: Need to check error better here..
                                            self.logger.debug('user got forked');
                                            result.status = CONSTANTS.FORKED;
                                            deferred.resolve(result);
                                        } else {
                                            self.logger.error('Failed updating hash', err);
                                            // TODO: How to add meta data to error and decide on error codes
                                            deferred.reject(err);
                                        }
                                    });
                            })
                            .catch(function (err) {
                                // TODO: How to add meta data to error and decide on error codes.
                                self.logger.error(err);
                                deferred.reject(new Error('Failed inserting commitObject'));
                            });
                    }
                })
                .catch(deferred.reject);
        })
        .catch(function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
};

Storage.prototype.loadObjects = function (data, callback) {
    var self = this,
        deferred = Q.defer();

    this.database.openProject(data.projectId)
        .then(function (project) {

            function loadObject(hash) {
                return project.loadObject(hash);
            }

            Q.allSettled(data.hashes.map(loadObject))
                .then(function (loadResults) {
                    var i,
                        result = {};

                    for (i = 0; i < loadResults.length; i += 1) {
                        if (loadResults[i].state === 'rejected') {
                            self.logger.error('failed loadingObject', {metadata: loadResults[i]});
                            result[data.hashes[i]] = loadResults[i].reason.message;
                        } else {
                            result[data.hashes[i]] = loadResults[i].value;
                        }
                    }
                    deferred.resolve(result);
                });
        })
        .catch(function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
};

Storage.prototype.loadPaths = function (data, callback) {
    var self = this,
        deferred = Q.defer();

    this.database.openProject(data.projectId)
        .then(function (dbProject) {
            var loadedObjects = {},
                throttleDeferred = Q.defer(),
                counter = data.pathsInfo.length;

            function throttleLoad() {
                var pathInfo;

                if (counter === 0) {
                    throttleDeferred.resolve();
                } else {
                    counter -= 1;
                    pathInfo = data.pathsInfo[counter];
                    storageHelpers.loadPath(dbProject, pathInfo.parentHash, loadedObjects, pathInfo.path,
                        data.excludeParents)
                        .then(function () {
                            throttleLoad();
                        })
                        .catch(function (err) {
                            self.logger.warn('loadPaths failed, ignoring', pathInfo.path, {
                                metadata: err,
                            });
                            throttleLoad();
                        });
                }

                return throttleDeferred.promise;
            }

            //Q.allSettled(data.pathsInfo.map(function (pathInfo) {
            //    return loadPath(dbProject, pathInfo.parentHash, loadedObjects, pathInfo.path, data.excludeParents);
            //}))
            throttleLoad()
                .then(function () {
                    var keys = Object.keys(loadedObjects),
                        i;
                    if (data.excludes) {
                        for (i = 0; i < keys.length; i += 1) {
                            if (data.excludes.indexOf(keys[i]) > -1) {
                                // https://jsperf.com/delete-vs-setting-undefined-vs-new-object
                                // When sending the data these keys will be removed after JSON.stringify.
                                loadedObjects[keys[i]] = undefined;
                            }
                        }
                    }

                    deferred.resolve(loadedObjects);
                })
                .catch(deferred.reject);
        })
        .catch(function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
};

Storage.prototype.getCommits = function (data, callback) {
    var self = this,
        deferred = Q.defer(),
        loadCommit = typeof data.before === 'string';

    self.logger.debug('getCommits input:', {metadata: data});

    this.database.openProject(data.projectId)
        .then(function (project) {
            if (loadCommit) {
                self.logger.debug('commitHash was given will load commit', data.before);
                project.loadObject(data.before)
                    .then(function (commitObject) {
                        if (commitObject.type !== 'commit') {
                            throw new Error('Commit object does not exist ' + data.before);
                        }
                        if (data.number === 1) {
                            return [commitObject];
                        } else {
                            return project.getCommits(commitObject.time + 1, data.number);
                        }
                    })
                    .then(function (commits) {
                        deferred.resolve(commits);
                    })
                    .catch(function (err) {
                        deferred.reject(err);
                    });
            } else {
                self.logger.debug('timestamp was given will call project.getCommits', data.before);
                project.getCommits(data.before, data.number)
                    .then(function (commits) {
                        deferred.resolve(commits);
                    })
                    .catch(function (err) {
                        deferred.reject(err);
                    });
            }
        })
        .catch(function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
};

Storage.prototype.getHistory = function (data, callback) {
    var project,
        start = data.start instanceof Array ? data.start : [data.start];

    return this.database.openProject(data.projectId)
        .then(function (project_) {
            project = project_;

            return Q.all(start.map(function (commitOrBranch) {
                if (REGEXP.HASH.test(commitOrBranch)) {
                    return project.loadObject(commitOrBranch);
                } else {
                    return project.getBranchHash(commitOrBranch)
                        .then(function (branchHash) {
                            if (branchHash) {
                                return project.loadObject(branchHash);
                            }
                        });
                }
            }));
        })
        .then(function (heads) {
            return storageHelpers.loadHistory(project, data.number, storageHelpers.filterArray(heads));
        })
        .nodeify(callback);
};

Storage.prototype.getBranchHash = function (data, callback) {
    return this.database.openProject(data.projectId)
        .then(function (project) {
            return project.getBranchHash(data.branchName);
        })
        .nodeify(callback);
};

Storage.prototype.setBranchHash = function (data, callback) {
    var self = this,
        deferred = Q.defer(),
        eventData = {
            projectId: data.projectId,
            branchName: data.branchName,
            newHash: data.newHash,
            oldHash: data.oldHash,
            userId: data.username
        },
        fullEventData = {
            projectId: data.projectId,
            branchName: data.branchName,
            commitObject: null,
            userId: data.username,
            coreObjects: []
        };

    // This will also ensure that the new commit does indeed point to a commitObject with an existing root.
    function loadRootAndCommitObject(project) {
        var deferred = Q.defer();
        if (data.newHash !== '') {
            project.loadObject(data.newHash)
                .then(function (commitObject) {
                    fullEventData.commitObject = commitObject;
                    return project.loadObject(commitObject.root);
                })
                .then(function (rootObject) {
                    fullEventData.coreObjects.push(rootObject);
                    deferred.resolve(project);
                })
                .catch(function (err) {
                    self.logger.error(err.message);
                    deferred.reject(new Error('Tried to setBranchHash to invalid or non-existing commit, err: ' +
                        err.message));
                });
        } else {
            // When deleting a branch there no need to ensure this.
            deferred.resolve(project);
        }

        return deferred.promise;
    }

    this.database.openProject(data.projectId)
        .then(function (project) {
            return loadRootAndCommitObject(project);
        })
        .then(function (project) {
            return project.setBranchHash(data.branchName, data.oldHash, data.newHash);
        })
        .then(function () {
            if (data.hasOwnProperty('socket')) {
                fullEventData.socket = data.socket;
                if (self.gmeConfig.storage.broadcastProjectEvents) {
                    eventData.socket = data.socket;
                }
            }

            if (data.oldHash === '' && data.newHash !== '') {
                self.dispatchEvent(CONSTANTS.BRANCH_CREATED, eventData);
                deferred.resolve({status: CONSTANTS.SYNCED, hash: data.newHash});
            } else if (data.newHash === '' && data.oldHash !== '') {
                self.dispatchEvent(CONSTANTS.BRANCH_DELETED, eventData);
                deferred.resolve({status: CONSTANTS.SYNCED, hash: data.newHash});
            } else if (data.newHash !== '' && data.oldHash !== '') {
                self.dispatchEvent(CONSTANTS.BRANCH_HASH_UPDATED, eventData);
                self.dispatchEvent(CONSTANTS.BRANCH_UPDATED, fullEventData);
                deferred.resolve({status: CONSTANTS.SYNCED, hash: data.newHash});
            } else {
                //setting empty branch to empty
                deferred.resolve({status: CONSTANTS.SYNCED, hash: ''});
            }
        })
        .catch(function (err) {
            if (err.message === 'branch hash mismatch') {
                self.logger.debug('user got forked');
                deferred.resolve({status: CONSTANTS.FORKED, hash: data.newHash});
            } else {
                self.logger.error('setBranchHash failed', err.stack);
                deferred.reject(err);
            }
        });

    return deferred.promise.nodeify(callback);
};

Storage.prototype.getCommonAncestorCommit = function (data, callback) {
    var deferred = Q.defer(),
        ancestorsA = {},
        ancestorsB = {},
        dbProject,
        newAncestorsA = [],
        newAncestorsB = [];

    function checkForCommonAncestor() {
        var i;
        for (i = 0; i < newAncestorsA.length; i += 1) {
            if (ancestorsB[newAncestorsA[i]]) {
                //we got a common parent so let's go with it
                return newAncestorsA[i];
            }
        }

        for (i = 0; i < newAncestorsB.length; i += 1) {
            if (ancestorsA[newAncestorsB[i]]) {
                //we got a common parent so let's go with it
                return newAncestorsB[i];
            }
        }

        return null;
    }

    function loadParentsRec(project) {
        var candidate = checkForCommonAncestor();

        if (candidate) {
            deferred.resolve(candidate);
        } else {
            Q.all([
                    loadAncestorsAndGetParents(project, newAncestorsA, ancestorsA),
                    loadAncestorsAndGetParents(project, newAncestorsB, ancestorsB)
                ])
                .then(function (results) {
                    newAncestorsA = results[0] || [];
                    newAncestorsB = results[1] || [];
                    if (newAncestorsA.length > 0 || newAncestorsB.length > 0) {
                        loadParentsRec(project);
                    } else {
                        deferred.reject(new Error('unable to find common ancestor commit'));
                    }
                })
                .catch(function (err) {
                    deferred.reject(err);
                });
        }
    }

    function loadAncestorsAndGetParents(project, commits, ancestorsSoFar) {
        return Q.all(commits.map(function (commitHash) {
                return project.loadObject(commitHash);
            }))
            .then(function (loadedCommits) {
                var newCommits = [],
                    i,
                    j;
                for (i = 0; i < loadedCommits.length; i += 1) {
                    for (j = 0; j < loadedCommits[i].parents.length; j += 1) {
                        if (loadedCommits[i].parents[j] !== '') {
                            if (newCommits.indexOf(loadedCommits[i].parents[j]) === -1) {
                                newCommits.push(loadedCommits[i].parents[j]);
                            }
                            ancestorsSoFar[loadedCommits[i].parents[j]] = true;
                        }
                    }
                }
                return newCommits;
            });
    }

    this.database.openProject(data.projectId)
        .then(function (dbProject_) {
            dbProject = dbProject_;
            return Q.allSettled([
                dbProject.loadObject(data.commitA),
                dbProject.loadObject(data.commitB)
            ]);
        })
        .then(function (result) {
            // Make sure the supplied hashes were truly commit-hashes.
            if (result[0].state === 'rejected' || result[0].value.type !== 'commit') {
                throw new Error('Commit object does not exist [' + data.commitA + ']');
            } else if (result[1].state === 'rejected' || result[1].value.type !== 'commit') {
                throw new Error('Commit object does not exist [' + data.commitB + ']');
            }

            // Initializing
            ancestorsA[data.commitA] = true;
            newAncestorsA = [data.commitA];
            ancestorsB[data.commitB] = true;
            newAncestorsB = [data.commitB];

            loadParentsRec(dbProject);
        })
        .catch(function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
};

Storage.prototype.createTag = function (data, callback) {
    var self = this;
    return self.database.openProject(data.projectId)
        .then(function (project) {
            return project.createTag(data.tagName, data.commitHash);
        })
        .then(function () {
            var eventData = {
                projectId: data.projectId,
                tagName: data.tagName,
                commitHash: data.commitHash,
                userId: data.username
            };

            if (self.gmeConfig.storage.broadcastProjectEvents) {
                eventData.socket = data.socket;
            }

            self.dispatchEvent(CONSTANTS.TAG_CREATED, eventData);
        })
        .nodeify(callback);
};

Storage.prototype.deleteTag = function (data, callback) {
    var self = this;

    return self.database.openProject(data.projectId)
        .then(function (project) {
            return project.deleteTag(data.tagName);
        })
        .then(function () {
            var eventData = {
                projectId: data.projectId,
                tagName: data.tagName,
                userId: data.username
            };

            if (self.gmeConfig.storage.broadcastProjectEvents) {
                eventData.socket = data.socket;
            }

            self.dispatchEvent(CONSTANTS.TAG_DELETED, eventData);
        })
        .nodeify(callback);
};

Storage.prototype.getTags = function (data, callback) {
    return this.database.openProject(data.projectId)
        .then(function (project) {
            return project.getTags();
        })
        .nodeify(callback);
};

Storage.prototype.openProject = function (data, callback) {
    return this.database.openProject(data.projectId).nodeify(callback);
};

module.exports = Storage;