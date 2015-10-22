/*globals requireJS*/
/*jshint node:true, newcap:false*/

/**
 * @module Server:Storage:Redis
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var redis = require('redis'),
    Q = require('q'),

    BRANCHES = ':branches',
    COMMITS = ':commits',

    CANON = requireJS('common/util/canon'),
    REGEXP = requireJS('common/regexp');

// Data structure (for projectId guest+test):
// guest+test = hashMap(objectHash, objectStr)
// guest+test:branches = hashMap(branchName, branchHash)
// guest+test:commits = hashMap(objectHash, timestamp)

function RedisAdapter(mainLogger, gmeConfig) {
    var self = this,
        connectionCnt = 0,
        connectDeferred,
        disconnectDeferred,
        logger = mainLogger.fork('redisAdapter');

    this.client = null;
    /**
     * Provides methods related to a specific project.
     *
     * @param {string} projectId - identifier of the project (ownerId + '.' + projectName).
     * @constructor
     * @private
     */
    function RedisProject(projectId) {
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
                Q.ninvoke(self.client, 'hget', projectId, hash)
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
                Q.ninvoke(self.client, 'hsetnx', projectId, object._id, JSON.stringify(object))
                    .then(function (result) {
                        // 1 if field is a new field in the hash and value was set.
                        // 0 if field already exists in the hash and no operation was performed.
                        if (result === 0) {
                            Q.ninvoke(self.client, 'hget', projectId, object._id)
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
                            if (object.type === 'commit') {
                                Q.ninvoke(self.client, 'hset', projectId + COMMITS, object._id, object.time)
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
            return Q.ninvoke(self.client, 'hgetall', projectId + BRANCHES)
                .then(function (result) {
                    return result || {};
                })
                .nodeify(callback);
        };

        this.getBranchHash = function (branch, callback) {
            return Q.ninvoke(self.client, 'hget', projectId + BRANCHES, branch)
                .then(function (branchHash) {
                    return branchHash || '';
                }).nodeify(callback);
        };

        this.setBranchHash = function (branch, oldhash, newhash, callback) {
            var deferred = Q.defer(),
                branchesHashMap = projectId + BRANCHES;

            if (oldhash === newhash) {
                Q.ninvoke(self.client, 'hget', branchesHashMap, branch)
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
                Q.ninvoke(self.client, 'hget', branchesHashMap, branch)
                    .then(function (branchHash) {
                        if (branchHash === oldhash) {
                            Q.ninvoke(self.client, 'hdel', branchesHashMap, branch)
                                .then(deferred.resolve);
                        } else {
                            deferred.reject(new Error('branch hash mismatch'));
                        }
                    })
                    .catch(deferred.reject);
            } else if (oldhash === '') {
                Q.ninvoke(self.client, 'hsetnx', branchesHashMap, branch, newhash)
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
                Q.ninvoke(self.client, 'hget', branchesHashMap, branch)
                    .then(function (branchHash) {
                        if (branchHash === oldhash) {
                            Q.ninvoke(self.client, 'hset', branchesHashMap, branch, newhash)
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
            return Q.ninvoke(self.client, 'hgetall', projectId + COMMITS)
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
                        return Q.ninvoke(self.client, 'hmget', hashArray);
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
    }

    function openDatabase(callback) {
        connectionCnt += 1;
        logger.debug('openDatabase, connection counter:', connectionCnt);

        if (connectionCnt === 1) {
            if (self.client === null) {
                logger.debug('Connecting to redis...');
                connectDeferred = Q.defer();
                self.client = redis.createClient(gmeConfig.storage.database.options);
                self.client.on('error', function (err) {
                    logger.error('Redis client: ', err);
                });
                self.client.on('ready', function () {
                    logger.debug('Connected.');
                    connectDeferred.resolve();
                });
            } else {
                logger.debug('Count is 1 but redis is not null');
            }
        } else {
            // we are already connected
            logger.debug('Reusing redis connection.');
        }

        return connectDeferred.promise.nodeify(callback);
    }

    function closeDatabase(callback) {
        connectionCnt -= 1;
        logger.debug('closeDatabase, connection counter:', connectionCnt);

        if (connectionCnt < 0) {
            logger.error('connection counter became negative, too many closeDatabase. Setting it to 0.', connectionCnt);
            connectionCnt = 0;
        }

        if (!disconnectDeferred) {
            disconnectDeferred = Q.defer();
        }

        if (connectionCnt === 0) {
            if (self.client) {
                logger.debug('Closing connection to redis...');
                self.client.on('end', function () {
                    self.client = null;
                    logger.debug('Closed.');
                    disconnectDeferred.resolve();
                });
                self.client.quit();
            } else {
                disconnectDeferred.resolve();
            }
        } else {
            logger.debug('Connections still alive.');
        }

        return disconnectDeferred.promise.nodeify(callback);
    }

    function deleteProject(projectId, callback) {
        var deferred = Q.defer();

        if (self.client) {
            Q.ninvoke(self.client, 'del', projectId, projectId + BRANCHES, projectId + COMMITS)
                .then(function (result) {
                    if (result > 0) {
                        deferred.resolve(true);
                    } else {
                        deferred.reject(false);
                    }
                })
                .catch(deferred.reject);
        } else {
            deferred.reject(new Error('Database is not open.'));
        }

        return deferred.promise.nodeify(callback);
    }

    function openProject(projectId, callback) {
        var deferred = Q.defer();

        logger.debug('openProject', projectId);

        if (self.client) {
            Q.ninvoke(self.client, 'exists', projectId)
                .then(function (result) {
                    // 1 if the key exists.
                    // 0 if the key does not exist.
                    logger.debug('openProject, result', result);
                    if (result === 1) {
                        deferred.resolve(new RedisProject(projectId));
                    } else {
                        deferred.reject(new Error('Project does not exist ' + projectId));
                    }
                })
                .catch(deferred.reject);

        } else {
            deferred.reject(new Error('Database is not open.'));
        }

        return deferred.promise.nodeify(callback);
    }

    function createProject(projectId, callback) {
        var deferred = Q.defer();

        logger.debug('createProject', projectId);

        if (self.client) {
            Q.ninvoke(self.client, 'hsetnx', projectId, '_id', projectId)
                .then(function (result) {
                    // 1 if field is a new field in the hash and value was set.
                    // 0 if field already exists in the hash and the value was updated.
                    if (result === 1) {
                        deferred.resolve(new RedisProject(projectId));
                    } else {
                        deferred.reject(new Error('Project already exists ' + projectId));
                    }
                })
                .catch(deferred.reject);

        } else {
            deferred.reject(new Error('Database is not open.'));
        }

        return deferred.promise.nodeify(callback);
    }

    function renameProject(projectId, newProjectId, callback) {
        var deferred = Q.defer();

        if (self.client) {
            Q.ninvoke(self.client, 'renamenx', projectId, newProjectId)
                .then(function (result) {
                    // 1 if key was renamed to newkey.
                    // 0 if newkey already exists.
                    if (result === 1) {
                        // Force rename for branches and commits.
                        Q.allSettled([
                            Q.ninvoke(self.client, 'rename', projectId + BRANCHES, newProjectId + BRANCHES),
                            Q.ninvoke(self.client, 'rename', projectId + COMMITS, newProjectId + COMMITS)
                        ])
                            .then(function (/*result*/) {
                                // Result may contain errors if no branches or commits were created,
                                // these do not matter.
                                deferred.resolve();
                            });
                    } else {
                        deferred.reject(new Error('Project already exists ' + newProjectId));
                    }
                })
                .catch(function (err) {
                    if (err.message === 'ERR no such key') {
                        deferred.reject(new Error('Project does not exist ' + projectId));
                    } else {
                        deferred.reject(err);
                    }
                });
        } else {
            deferred.reject(new Error('Database is not open.'));
        }

        return deferred.promise.nodeify(callback);
    }

    this.openDatabase = openDatabase;
    this.closeDatabase = closeDatabase;

    this.openProject = openProject;
    this.deleteProject = deleteProject;
    this.createProject = createProject;
    this.renameProject = renameProject;
}

module.exports = RedisAdapter;
