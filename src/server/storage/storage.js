/*globals requireJS*/
/*jshint node:true, newcap:false*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Q = require('Q'),

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
        .then(function () {
            self.dispatchEvent(CONSTANTS.PROJECT_DELETED, data);
        })
        .nodeify(callback);
};

Storage.prototype.createProject = function (data, callback) {
    var self = this;
    return this.mongo.createProject(data.projectName)
        .then(function (project) {
            // FIXME: At this point the project is not a valid gme-project.
            self.dispatchEvent(CONSTANTS.PROJECT_CREATED, data);
            return Q(project);
        })
        .nodeify(callback);
    // if data option is fork from existing
    //      this.mongo.forkProject - reuse Kevin's implementation
    //
    // else if data option is seed
    //      send job to worker and dispatchEvent from here when it has finished.
    //
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
                                            var eventData = {
                                                    projectName: data.projectName,
                                                    branchName: data.branchName,
                                                    commitObject: data.commitObject,
                                                    coreObjects: [data.coreObjects[data.commitObject.root]]
                                                },
                                                hashEventData = {
                                                    projectName: data.projectName,
                                                    branchName: data.branchName,
                                                    newHash: newHash,
                                                    oldHash: oldHash
                                                };
                                            if (data.hasOwnProperty('socket')) {
                                                eventData.socket = data.socket;
                                                hashEventData.socket = data.socket;
                                            }
                                            result.status = CONSTANTS.SYNCH;
                                            self.dispatchEvent(CONSTANTS.BRANCH_HASH_UPDATED, hashEventData);
                                            self.dispatchEvent(CONSTANTS.BRANCH_UPDATED, eventData);
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
    return this.mongo.openProject(data.projectName)
        .then(function (project) {
            return project.getCommits(data.before, data.number);
        })
        .nodeify(callback);
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
                    };

                    if (data.hasOwnProperty('socket')) {
                        eventData.socket = data.socket;
                    }
                    if (data.oldHash === '' && data.newHash !== '') {
                        self.dispatchEvent(CONSTANTS.BRANCH_CREATED, eventData);
                    } else if (data.newHash === '' && data.oldHash !== '') {
                        self.dispatchEvent(CONSTANTS.BRANCH_DELETED, eventData);
                    } else if (data.newHash !== '' && data.oldHash !== '') {
                        self.dispatchEvent(CONSTANTS.BRANCH_HASH_UPDATED, eventData);
                        // TODO: This should dispatch a BRANCH_UPDATED event too with the necessary data.
                        // TODO: However this case should only happen when a plugin created a branch and
                        // TODO: saves to it more than once.
                    }
                    deferred.resolve({status: CONSTANTS.SYNCH});
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