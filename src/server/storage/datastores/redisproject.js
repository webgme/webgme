/*globals requireJS*/
/*jshint node:true, newcap:false*/

/**
 * @module Server:Storage:Redis
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var Q = require('q'),

    CANON = requireJS('common/util/canon'),
    CONSTANTS = requireJS('common/storage/constants'),
    REGEXP = requireJS('common/regexp');

/**
 * Provides methods related to a specific project.
 *
 * @param {string} projectId - identifier of the project (ownerId + '.' + projectName).
 * @constructor
 * @private
 */
function RedisProject(projectId, adapter) {
    var logger = adapter.logger.fork(projectId);
    this.projectId = projectId;

    this.closeProject = function (callback) {
        var deferred = Q.defer();
        deferred.resolve();
        return deferred.promise.nodeify(callback);
    };

    this.loadObject = function (hash, callback) {
        var deferred = Q.defer();
        if (typeof hash !== 'string') {
            deferred.reject(new Error('loadObject - given hash is not a string : ' + typeof hash));
        } else if (!REGEXP.HASH.test(hash)) {
            deferred.reject(new Error('loadObject - invalid hash :' + hash));
        } else {
            Q.ninvoke(adapter.client, 'hget', projectId, hash)
                .then(function (result) {
                    // Bulk string reply: the value associated with field,
                    // or nil when field is not present in the hash or key does not exist.
                    if (result) {
                        deferred.resolve(JSON.parse(result));
                    } else {
                        logger.error('object does not exist ' + hash);
                        deferred.reject(new Error('object does not exist ' + hash));
                    }
                })
                .catch(deferred.reject);
        }

        return deferred.promise.nodeify(callback);
    };

    this.insertObject = function (object, callback) {
        var deferred = Q.defer();
        if (object === null || typeof object !== 'object') {
            deferred.reject(new Error('object is not an object'));
        } else if (typeof object._id !== 'string' || !REGEXP.HASH.test(object._id)) {
            deferred.reject(new Error('object._id is not a valid hash.'));
        } else {
            Q.ninvoke(adapter.client, 'hsetnx', projectId, object._id, JSON.stringify(object))
                .then(function (result) {
                    // 1 if field is a new field in the hash and value was set.
                    // 0 if field already exists in the hash and no operation was performed.
                    if (result === 0) {
                        Q.ninvoke(adapter.client, 'hget', projectId, object._id)
                            .then(function (objectStr) {
                                var errMsg;
                                if (CANON.stringify(object) === CANON.stringify(JSON.parse(objectStr))) {
                                    logger.info('tried to insert existing hash - the two objects were equal',
                                        object._id);
                                    deferred.resolve();
                                } else {
                                    errMsg = 'tried to insert existing hash - the two objects were NOT equal ';
                                    logger.error(errMsg, {
                                        metadata: {
                                            newObject: CANON.stringify(object),
                                            oldObject: CANON.stringify(JSON.parse(objectStr))
                                        }
                                    });
                                    deferred.reject(new Error(errMsg + object._id));
                                }
                            })
                            .catch(deferred.reject);
                    } else {
                        if (object.type === CONSTANTS.COMMIT_TYPE) {
                            Q.ninvoke(adapter.client, 'hset', projectId + adapter.CONSTANTS.COMMITS,
                                object._id, object.time)
                                .then(function () {
                                    deferred.resolve();
                                })
                                .catch(deferred.reject);
                        } else {
                            deferred.resolve();
                        }
                    }
                });
        }

        return deferred.promise.nodeify(callback);
    };

    this.getBranches = function (callback) {
        return Q.ninvoke(adapter.client, 'hgetall', projectId + adapter.CONSTANTS.BRANCHES)
            .then(function (result) {
                return result || {};
            })
            .nodeify(callback);
    };

    this.getBranchHash = function (branch, callback) {
        return Q.ninvoke(adapter.client, 'hget', projectId + adapter.CONSTANTS.BRANCHES, branch)
            .then(function (branchHash) {
                return branchHash || '';
            }).nodeify(callback);
    };

    this.setBranchHash = function (branch, oldhash, newhash, callback) {
        var deferred = Q.defer(),
            branchesHashMap = projectId + adapter.CONSTANTS.BRANCHES;

        if (oldhash === newhash) {
            Q.ninvoke(adapter.client, 'hget', branchesHashMap, branch)
                .then(function (branchHash) {
                    branchHash = branchHash || '';
                    if (branchHash === oldhash) {
                        deferred.resolve();
                    } else {
                        deferred.reject(new Error('branch hash mismatch'));
                    }
                })
                .catch(deferred.reject);
        } else if (newhash === '') {
            Q.ninvoke(adapter.client, 'hget', branchesHashMap, branch)
                .then(function (branchHash) {
                    if (branchHash === oldhash) {
                        Q.ninvoke(adapter.client, 'hdel', branchesHashMap, branch)
                            .then(deferred.resolve);
                    } else if (branchHash === null) {
                        deferred.resolve();
                    } else {
                        deferred.reject(new Error('branch hash mismatch'));
                    }
                })
                .catch(deferred.reject);
        } else if (oldhash === '') {
            Q.ninvoke(adapter.client, 'hsetnx', branchesHashMap, branch, newhash)
                .then(function (result) {
                    // 1 if field is a new field in the hash and value was set.
                    // 0 if field already exists in the hash and no operation was performed.
                    if (result === 1) {
                        deferred.resolve();
                    } else {
                        deferred.reject(new Error('branch hash mismatch'));
                    }
                })
                .catch(deferred.reject);
        } else {
            Q.ninvoke(adapter.client, 'hget', branchesHashMap, branch)
                .then(function (branchHash) {
                    if (branchHash === oldhash) {
                        Q.ninvoke(adapter.client, 'hset', branchesHashMap, branch, newhash)
                            .then(function () {
                                deferred.resolve();
                            })
                            .catch(deferred.reject);
                    } else {
                        deferred.reject(new Error('branch hash mismatch'));
                    }
                })
                .catch(deferred.reject);
        }

        return deferred.promise.nodeify(callback);
    };

    this.getCommits = function (before, number, callback) {
        return Q.ninvoke(adapter.client, 'hgetall', projectId + adapter.CONSTANTS.COMMITS)
            .then(function (result) {
                var i,
                    hashArray,
                    timestamp,
                    hashKeys = Object.keys(result || {}),
                    commitsInfo = [];

                // FIXME: This is not a very optimized implementation
                for (i = 0; i < hashKeys.length; i += 1) {
                    timestamp = parseInt(result[hashKeys[i]], 10);
                    if (timestamp < before) {
                        commitsInfo.push({
                            hash: hashKeys[i],
                            time: timestamp
                        });
                    }
                }

                commitsInfo.sort(function (a, b) {
                    return b.time - a.time;
                });

                hashArray = commitsInfo.slice(0, number).map(function (commitInfo) {
                    return commitInfo.hash;
                });

                if (hashArray.length > 0) {
                    hashArray.unshift(projectId);
                    return Q.ninvoke(adapter.client, 'hmget', hashArray);
                } else {
                    return [];
                }
            })
            .then(function (commitObjects) {
                return commitObjects.map(function (commitObject) {
                    return JSON.parse(commitObject);
                });
            })
            .nodeify(callback);
    };

    this.createTag = function (name, commitHash, callback) {
        var deferred = Q.defer();

        Q.ninvoke(adapter.client, 'hsetnx', projectId + adapter.CONSTANTS.TAGS, name, commitHash)
            .then(function (result) {
                // 1 if field is a new field in the hash and value was set.
                // 0 if field already exists in the hash and no operation was performed.
                if (result === 1) {
                    deferred.resolve();
                } else {
                    deferred.reject(new Error('Tag already exists [' + name + ']'));
                }
            })
            .catch(deferred.reject);

        return deferred.promise.nodeify(callback);
    };

    this.deleteTag = function (name, callback) {
        return Q.ninvoke(adapter.client, 'hdel', projectId + adapter.CONSTANTS.TAGS, name)
            .nodeify(callback);
    };

    this.getTags = function (callback) {
        return Q.ninvoke(adapter.client, 'hgetall', projectId + adapter.CONSTANTS.TAGS)
            .then(function (result) {
                return result || {};
            })
            .nodeify(callback);
    };
}

module.exports = RedisProject;
