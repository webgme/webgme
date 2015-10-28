/*globals requireJS*/
/*jshint node:true, newcap:false*/

/**
 * @module Server:Storage:Neo4j
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var Q = require('q'),

    CANON = requireJS('common/util/canon'),
    REGEXP = requireJS('common/regexp');

/**
 * Provides methods related to a specific project.
 *
 * @param {string} projectId - identifier of the project (ownerId + '.' + projectName).
 * @param {Neo4jAdapter} adapter - identifier of the project (ownerId + '.' + projectName).
 * @param {string} projectId - identifier of the project (ownerId + '.' + projectName).
 * @constructor
 * @private
 */
function Neo4jProject(projectId, adapter, projectNodeId) {
    var logger = adapter.logger.fork(projectId);
    this.projectId = projectId;

    this.closeProject = function (callback) {
        var deferred = Q.defer();
        deferred.resolve();
        return deferred.promise.nodeify(callback);
    };

    this.loadObject = function (hash, callback) {
        var deferred = Q.defer(),
            query;
        if (typeof hash !== 'string') {
            deferred.reject(new Error('loadObject - given hash is not a string : ' + typeof hash));
        } else if (!REGEXP.HASH.test(hash)) {
            deferred.reject(new Error('loadObject - invalid hash :' + hash));
        } else {
            query = 'MATCH (project:' + adapter.CONSTANTS.PROJECT_LABEL + ' {_id:' + projectNodeId + '}) - [r:' +
                adapter.CONSTANTS.PART_OF_PROJECT + ' {' + adapter.CONSTANTS.DATA_OBJECT_ID + ':"' + hash + '"}] -> ' +
                '(n:' + adapter.CONSTANTS.DATA_OBJECT_LABEL + ') RETURN n';
            logger.debug('loadObject query:', query);
            Q.ninvoke(adapter.client, 'cypherQuery', query)
                .then(function (result) {
                    logger.debug('loadObject result:', result);
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
        var deferred = Q.defer(),
            objectStr,
            labels,
            query;
        if (object === null || typeof object !== 'object') {
            deferred.reject(new Error('object is not an object'));
        } else if (typeof object._id !== 'string' || !REGEXP.HASH.test(object._id)) {
            deferred.reject(new Error('object._id is not a valid hash.'));
        } else {
            labels = adapter.CONSTANTS.DATA_OBJECT_LABEL;
            if (object.type === 'commit') {
                labels += ':' + adapter.CONSTANTS.COMMIT_OBJECT_LABEL;
            }
            labels += ' ';
            objectStr = JSON.stringify(object).replace(/"/g, "'");
            query = 'MATCH (project:' + adapter.CONSTANTS.PROJECT_LABEL + ' {projectId:"' + projectId + '"}) ' +
                'CREATE UNIQUE (project)-[r:' + adapter.CONSTANTS.PART_OF_PROJECT +
                ' {' + adapter.CONSTANTS.DATA_OBJECT_ID + ':"' + object._id + '"}]->(n:' + labels + '{data: "' +
                objectStr + '"}) RETURN n';
            logger.debug('insertObject query:', query);
            Q.ninvoke(adapter.client, 'cypherQuery', query)
                .then(function (result) {
                    logger.debug('insertObject result', result);
                    deferred.resolve();
                    //var errMsg;
                    //if (CANON.stringify(object) === CANON.stringify(JSON.parse(objectStr))) {
                    //    logger.info('tried to insert existing hash - the two objects were equal',
                    //        object._id);
                    //    deferred.resolve();
                    //} else {
                    //    errMsg = 'tried to insert existing hash - the two objects were NOT equal ';
                    //    logger.error(errMsg, {
                    //        metadata: {
                    //            newObject: CANON.stringify(object),
                    //            oldObject: CANON.stringify(JSON.parse(objectStr))
                    //        }
                    //    });
                    //    deferred.reject(new Error(errMsg + object._id));
                    //}
                })
                .catch(deferred.reject);
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
}

module.exports = Neo4jProject;
