/*globals requireJS*/
/*jshint node:true, newcap:false*/

/**
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
    return this.mongo.closeDatabase()
        .nodeify(callback);
};

Storage.prototype.getProjectNames = function (data, callback) {
    return this.mongo.getProjectNames().nodeify(callback);
};

Storage.prototype.deleteProject = function (data, callback) {
    var self = this;
    return this.mongo.deleteProject(data.projectName)
        .then(function (didExist) {
            var eventData = {
                projectName: data.projectName
            };
            self.logger.debug('deleteProject, didExist?', didExist);
            if (didExist) {
                self.logger.debug('Project deleted will dispatch', data.projectName);
                if (self.gmeConfig.storage.broadcastProjectEvents) {
                    eventData.socket = data.socket;
                }
                self.dispatchEvent(CONSTANTS.PROJECT_DELETED, eventData);
            }
            return Q(didExist);
        })
        .nodeify(callback);
};

Storage.prototype.createProject = function (data, callback) {
    var self = this;
    return this.mongo.createProject(data.projectName)
        .then(function (project) {
            var eventData = {
                projectName: data.projectName
            };

            self.logger.debug('Project created will dispatch', data.projectName);
            if (self.gmeConfig.storage.broadcastProjectEvents) {
                eventData.socket = data.socket;
            }

            self.dispatchEvent(CONSTANTS.PROJECT_CREATED, eventData);
            return Q(project);
        })
        .nodeify(callback);
};

Storage.prototype.getBranches = function (data, callback) {
    return this.mongo.openProject(data.projectName)
        .then(function (project) {
            return project.getBranches();
        })
        .nodeify(callback);
};

Storage.prototype.getLatestCommitData = function (data, callback) {
    var project,
        result = {
            projectName: data.projectName,
            branchName: data.branchName,
            commitObject: null,
            coreObjects: []
        };

    return this.mongo.openProject(data.projectName)
        .then(function (project_) {
            project = project_;
            return project.getBranchHash(data.branchName);
        })
        .then(function (branchHash) {
            if (branchHash === '') {
                throw new Error('Branch "' + data.branchName + '" does not exist in project "' +
                data.projectName + '"');
            }
            return project.loadObject(branchHash);
        })
        .then(function (commitObject) {
            result.commitObject = commitObject;
            return project.loadObject(commitObject.root);
        })
        .then(function (rootObject) {
            result.coreObjects.push(rootObject);
            return Q(result);
        })
        .nodeify(callback);
};

Storage.prototype.makeCommit = function (data, callback) {
    var self = this,
        deferred = Q.defer();
    this.mongo.openProject(data.projectName)
        .then(function (project) {
            var objectHashes = Object.keys(data.coreObjects);

            function insertObj(hash) {
                return project.insertObject(data.coreObjects[hash]);
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
                        project.insertObject(data.commitObject)
                            .then(function () {
                                if (data.branchName) {
                                    var newHash = data.commitObject[CONSTANTS.MONGO_ID],
                                        oldHash = data.commitObject.parents[0],
                                        result = {
                                            status: null, // SYNCH, FORKED, (MERGED)
                                            hash: newHash
                                        };
                                    project.setBranchHash(data.branchName, oldHash, newHash)
                                        .then(function () {
                                            var fullEventData = {
                                                    projectName: data.projectName,
                                                    branchName: data.branchName,
                                                    commitObject: data.commitObject,
                                                    coreObjects: [data.coreObjects[data.commitObject.root]]
                                                },
                                                eventData = {
                                                    projectName: data.projectName,
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
                                            result.status = CONSTANTS.SYNCH;
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
                                                // TODO: How to add meta data to error and decide on error codes.
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

    this.mongo.openProject(data.projectName)
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

    this.mongo.openProject(data.projectName)
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
    return this.mongo.openProject(data.projectName)
        .then(function (project) {
            return project.getBranchHash(data.branchName);
        })
        .nodeify(callback);
};

Storage.prototype.setBranchHash = function (data, callback) {
    var self = this,
        deferred = Q.defer();
    this.mongo.openProject(data.projectName)
        .then(function (project) {
            return project.setBranchHash(data.branchName, data.oldHash, data.newHash)
                .then(function () {
                    var eventData = {
                            projectName: data.projectName,
                            branchName: data.branchName,
                            newHash: data.newHash,
                            oldHash: data.oldHash
                        },
                        fullEventData = {
                            projectName: data.projectName,
                            branchName: data.branchName,
                            commitObject: null,
                            coreObjects: []
                        };

                    if (data.hasOwnProperty('socket')) {
                        fullEventData.socket = data.socket;
                        if (self.gmeConfig.storage.broadcastProjectEvents) {
                            eventData.socket = data.socket;
                        }
                    }

                    if (data.oldHash === '' && data.newHash !== '') {
                        self.dispatchEvent(CONSTANTS.BRANCH_CREATED, eventData);
                        deferred.resolve({status: CONSTANTS.SYNCH});
                    } else if (data.newHash === '' && data.oldHash !== '') {
                        self.dispatchEvent(CONSTANTS.BRANCH_DELETED, eventData);
                        deferred.resolve({status: CONSTANTS.SYNCH});
                    } else if (data.newHash !== '' && data.oldHash !== '') {
                        // Load the necessary objects for BRANCH_UPDATED event.
                        project.loadObject(data.newHash)
                            .then(function (commitObject) {
                                fullEventData.commitObject = commitObject;
                                return project.loadObject(commitObject.root);
                            })
                            .then(function (rootObject) {
                                fullEventData.coreObjects.push(rootObject);
                                self.dispatchEvent(CONSTANTS.BRANCH_HASH_UPDATED, eventData);
                                self.dispatchEvent(CONSTANTS.BRANCH_UPDATED, fullEventData);
                                deferred.resolve({status: CONSTANTS.SYNCH});
                            })
                            .catch(function (err) {
                                deferred.reject(new Error('Failed loading objects for events' + err));
                            });
                    }
                })
                .catch(function (err) {
                    if (err === 'branch hash mismatch' || err.message === 'branch has mismatch') {
                        // TODO: Need to check error better here..
                        self.logger.debug('user got forked');
                        deferred.resolve({status: CONSTANTS.FORKED});
                    } else {
                        self.logger.error('Failed updating hash', err);
                        // TODO: How to add meta data to error and decide on error codes.
                        deferred.reject(new Error(err));
                    }
                });
        });

    return deferred.promise.nodeify(callback);
};

Storage.prototype.getCommonAncestorCommit = function (data, callback) {
    return this.mongo.openProject(data.projectName)
        .then(function (project) {
            return project.getCommonAncestorCommit(data.commitA, data.commitB);
        }).nodeify(callback);
};

Storage.prototype.openProject = function (data, callback) {
    return this.mongo.openProject(data.projectName).nodeify(callback);
};

module.exports = Storage;