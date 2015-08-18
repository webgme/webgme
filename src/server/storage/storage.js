/*globals requireJS*/
/*jshint node:true*/

/**
 * @module Server:Storage
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Q = require('q'),

    EventDispatcher = requireJS('common/EventDispatcher'),
    CONSTANTS = requireJS('common/storage/constants');

function Storage(mongo, logger, gmeConfig) {
    EventDispatcher.call(this);
    this.mongo = mongo;
    this.logger = logger.fork('storage');
    this.gmeConfig = gmeConfig;
}

// Inherit from EventDispatcher
Storage.prototype = Object.create(EventDispatcher.prototype);
Storage.prototype.constructor = Storage;

Storage.prototype.openDatabase = function (callback) {
    return this.mongo.openDatabase()
        .nodeify(callback);
};

Storage.prototype.closeDatabase = function (callback) {
    this.clearAllEvents();
    return this.mongo.closeDatabase()
        .nodeify(callback);
};

Storage.prototype.deleteProject = function (data, callback) {
    var self = this;
    return this.mongo.deleteProject(data.projectId)
        .then(function (didExist) {
            var eventData = {
                projectId: data.projectId
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
    return this.mongo.createProject(data.projectId)
        .then(function (project) {
            var eventData = {
                projectId: data.projectId
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
    return this.mongo.renameProject(data.projectId, data.newProjectId)
        .then(function (project) {
            var eventDataCreated = {
                    projectId: data.projectId
                },
                eventDataDeleted = {
                    projectId: data.newProjectId
                };

            self.logger.debug('Project transferred will dispatch', data.projectId, data.newProjectId);
            if (self.gmeConfig.storage.broadcastProjectEvents) {
                eventDataCreated.socket = data.socket;
                eventDataDeleted.socket = data.socket;
            }

            self.dispatchEvent(CONSTANTS.PROJECT_CREATED, eventDataCreated);
            self.dispatchEvent(CONSTANTS.PROJECT_DELETED, eventDataDeleted);
            return project;
        })
        .nodeify(callback);
};

Storage.prototype.getBranches = function (data, callback) {
    return this.mongo.openProject(data.projectId)
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

    return this.mongo.openProject(data.projectId)
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
    this.mongo.openProject(data.projectId)
        .then(function (project) {
            var objectHashes = Object.keys(data.coreObjects),
                rootProvided;

            function insertObj(hash) {
                return project.insertObject(data.coreObjects[hash]);
            }

            function loadRootObject() {
                var rootDeferred = Q.defer(),
                    rootObject = data.coreObjects[data.commitObject.root];

                if (rootObject) {
                    rootProvided = true;
                    rootDeferred.resolve(rootObject);
                } else {
                    rootProvided = false;
                    project.loadObject(data.commitObject.root)
                        .then(rootDeferred.resolve)
                        .catch(rootDeferred.reject);
                }

                return rootDeferred.promise;
            }

            Q.allSettled(objectHashes.map(insertObj))
                .then(function (insertResults) {
                    var failedInserts = [];
                    insertResults.map(function (res) {
                        if (res.state === 'rejected') {
                            failedInserts.push(res);
                        }
                    });
                    if (failedInserts.length > 0) {
                        // TODO: How to add meta data to error and decide on error codes.
                        deferred.reject(new Error('Failed inserting coreObjects'));
                    } else {
                        loadRootObject()
                            .then(function (rootObject) {
                                project.insertObject(data.commitObject)
                                    .then(function () {
                                        if (data.branchName) {
                                            var newHash = data.commitObject[CONSTANTS.MONGO_ID],
                                                oldHash = data.oldHash || data.commitObject.parents[0],
                                                result = {
                                                    status: null, // SYNCED, FORKED, (MERGED)
                                                    hash: newHash
                                                };
                                            project.setBranchHash(data.branchName, oldHash, newHash)
                                                .then(function () {
                                                    var fullEventData = {
                                                            projectId: data.projectId,
                                                            branchName: data.branchName,
                                                            commitObject: data.commitObject,
                                                            coreObjects: []
                                                        },
                                                        eventData = {
                                                            projectId: data.projectId,
                                                            branchName: data.branchName,
                                                            newHash: newHash,
                                                            oldHash: oldHash
                                                        };

                                                    if (data.hasOwnProperty('socket')) {
                                                        fullEventData.socket = data.socket;
                                                        if (self.gmeConfig.storage.broadcastProjectEvents) {
                                                            eventData.socket = data.socket;
                                                        }
                                                    }

                                                    if (self.gmeConfig.storage.emitCommittedCoreObjects &&
                                                        rootProvided) {
                                                        //https://github.com/webgme/webgme/issues/474
                                                        Object.keys(data.coreObjects).map(function (obj) {
                                                            fullEventData.coreObjects.push(data.coreObjects[obj]);
                                                        });
                                                        self.logger.debug('Will emit committed core objects');
                                                    } else {
                                                        fullEventData.coreObjects.push(rootObject);
                                                    }

                                                    result.status = CONSTANTS.SYNCED;
                                                    self.dispatchEvent(CONSTANTS.BRANCH_HASH_UPDATED, eventData);
                                                    self.dispatchEvent(CONSTANTS.BRANCH_UPDATED, fullEventData);
                                                    self.logger.debug('Branch update succeeded.');
                                                    deferred.resolve(result);
                                                })
                                                .catch(function (err) {
                                                    if (err === 'branch hash mismatch') {
                                                        // TODO: Need to check error better here..
                                                        self.logger.debug('user got forked');
                                                        result.status = CONSTANTS.FORKED;
                                                        deferred.resolve(result);
                                                    } else {
                                                        self.logger.error('Failed updating hash', err);
                                                        // TODO: How to add meta data to error and decide on error codes
                                                        deferred.reject(new Error(err));
                                                    }
                                                });
                                        } else {
                                            deferred.resolve({hash: data.commitObject[CONSTANTS.MONGO_ID]});
                                        }
                                    })
                                    .catch(function (err) {
                                        // TODO: How to add meta data to error and decide on error codes.
                                        self.logger.error(err);
                                        deferred.reject(new Error('Failed inserting commitObject'));
                                    });
                            })
                            .catch(function (err) {
                                // TODO: How to add meta data to error and decide on error codes.
                                self.logger.error(err);
                                deferred.reject(new Error('Failed loading referred rootObject'));
                            });

                    }
                });
        })
        .catch(function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
};

Storage.prototype.loadObjects = function (data, callback) {
    var self = this,
        deferred = Q.defer();

    this.mongo.openProject(data.projectId)
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
                            result[data.hashes[i]] = loadResults[i].reason;
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

Storage.prototype.getCommits = function (data, callback) {
    var self = this,
        deferred = Q.defer(),
        loadCommit = typeof data.before === 'string';

    self.logger.debug('getCommits input:', {metadata: data});

    this.mongo.openProject(data.projectId)
        .then(function (project) {
            if (loadCommit) {
                self.logger.debug('commitHash was given will load commit', data.before);
                project.loadObject(data.before)
                    .then(function (commitObject) {
                        return project.getCommits(commitObject.time + 1, data.number);
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

Storage.prototype.getBranchHash = function (data, callback) {
    return this.mongo.openProject(data.projectId)
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
            oldHash: data.oldHash
        },
        fullEventData = {
            projectId: data.projectId,
            branchName: data.branchName,
            commitObject: null,
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
                    err = err instanceof Error ? err : new Error(err);
                    err.message = 'Tried to setBranchHash to invalid or non-existing commit, err: ' + err.message;
                    deferred.reject(err);
                });
        } else {
            // When deleting a branch there no need to ensure this.
            deferred.resolve(project);
        }

        return deferred.promise;
    }

    this.mongo.openProject(data.projectId)
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
            err = err instanceof Error ? err : new Error(err);
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
    return this.mongo.openProject(data.projectId)
        .then(function (project) {
            return project.getCommonAncestorCommit(data.commitA, data.commitB);
        }).nodeify(callback);
};

Storage.prototype.openProject = function (data, callback) {
    return this.mongo.openProject(data.projectId).nodeify(callback);
};

module.exports = Storage;