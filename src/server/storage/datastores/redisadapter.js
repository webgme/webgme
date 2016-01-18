/*jshint node:true, newcap:false*/

/**
 * @module Server:Storage:Redis
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var redis = require('redis'),
    Q = require('q'),
    RedisProject = require('./redisproject');

// Data structure (for projectId guest+test):
// guest+test = hashMap(objectHash, objectStr)
// guest+test:branches = hashMap(branchName, branchHash)
// guest+test:commits = hashMap(objectHash, timestamp)
// guest+test:tags = hashMap(objectHash, commitHash)

/**
 * @param mainLogger
 * @param gmeConfig
 * @constructor
 * @ignore
 */
function RedisAdapter(mainLogger, gmeConfig) {
    var self = this,
        connectionCnt = 0,
        connectDeferred,
        disconnectDeferred,
        logger = mainLogger.fork('redisAdapter');

    this.client = null;
    this.logger = logger;
    this.CONSTANTS = {
        BRANCHES: ':branches',
        COMMITS: ':commits',
        TAGS: ':tags'
    };

    function openDatabase(callback) {
        var client;
        connectionCnt += 1;
        logger.debug('openDatabase, connection counter:', connectionCnt);

        if (connectionCnt === 1) {
            if (self.client === null) {
                logger.debug('Connecting to database...');
                connectDeferred = Q.defer();
                client = redis.createClient(gmeConfig.storage.database.options);
                client.on('error', function (err) {
                    self.client = null;
                    logger.error('Redis client: ', err);
                });
                client.on('ready', function () {
                    self.client = client;
                    disconnectDeferred = null;
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
            Q.ninvoke(self.client, 'del', projectId,
                projectId + self.CONSTANTS.BRANCHES,
                projectId + self.CONSTANTS.TAGS,
                projectId + self.CONSTANTS.COMMITS)
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
                        deferred.resolve(new RedisProject(projectId, self));
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
                        deferred.resolve(new RedisProject(projectId, self));
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
                            Q.ninvoke(self.client, 'rename',
                                projectId + self.CONSTANTS.BRANCHES, newProjectId + self.CONSTANTS.BRANCHES),
                            Q.ninvoke(self.client, 'rename',
                                projectId + self.CONSTANTS.COMMITS, newProjectId + self.CONSTANTS.COMMITS),
                            Q.ninvoke(self.client, 'rename',
                                projectId + self.CONSTANTS.TAGS, newProjectId + self.CONSTANTS.TAGS)
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

    function duplicateProject(projectId, newProjectId, callback) {
        var project,
            newProject;

        logger.warn('duplicateProject can use a lot of memory for redis', projectId);

        return self.openProject(projectId)
            .then(function (project_) {
                project = project_;
                return self.createProject(newProjectId);
            })
            .then(function (newProject_) {
                newProject = newProject_;
                // TODO: Is there a more efficient way of doing this?
                return Q.all([
                    Q.ninvoke(self.client, 'hgetall', projectId),
                    Q.ninvoke(self.client, 'hgetall', projectId  + self.CONSTANTS.BRANCHES),
                    Q.ninvoke(self.client, 'hgetall', projectId  + self.CONSTANTS.COMMITS),
                    Q.ninvoke(self.client, 'hgetall', projectId  + self.CONSTANTS.TAGS),
                ]);
            })
            .then(function (result) {
                var promises = [Q.ninvoke(self.client, 'hmset', newProjectId, result[0])];

                // Branches and Commits might not have been created for the source project
                if (result[1]) {
                    promises.push(Q.ninvoke(self.client, 'hmset', newProjectId  + self.CONSTANTS.BRANCHES, result[1]));
                }

                if (result[2]) {
                    promises.push(Q.ninvoke(self.client, 'hmset', newProjectId  + self.CONSTANTS.COMMITS, result[2]));
                }

                if (result[3]) {
                    promises.push(Q.ninvoke(self.client, 'hmset', newProjectId  + self.CONSTANTS.TAGS, result[3]));
                }

                return Q.all(promises);
            })
            .then(function () {
                return newProject;
            })
            .nodeify(callback);
    }

    this.openDatabase = openDatabase;
    this.closeDatabase = closeDatabase;

    this.openProject = openProject;
    this.deleteProject = deleteProject;
    this.createProject = createProject;
    this.renameProject = renameProject;
    this.duplicateProject = duplicateProject;
}

module.exports = RedisAdapter;
