/*globals requireJS*/
/*jshint node:true, newcap:false*/

/**
 * @module Server:Storage:Mongo
 * @author mmaroti / https://github.com/mmaroti
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var mongodb = require('mongodb'),
    Q = require('q'),

    CONSTANTS = requireJS('common/storage/constants'),
    CANON = requireJS('common/util/canon'),
    REGEXP = requireJS('common/regexp');

function Mongo(mainLogger, gmeConfig) {
    var mongo = null,
        connectionCnt = 0,
        connectDeferred,
        disconnectDeferred,
        logger = mainLogger.fork('mongo');

    /**
     * Provides methods related to a specific project.
     *
     * @param {string} projectId - identifier of the project (ownerId + '.' + projectName).
     * @param {object} collection - Mongo collection connected to database.
     * @constructor
     * @private
     */
    function Project(projectId, collection) {
        var self = this;

        this.projectId = projectId;

        this.closeProject = function (callback) {
            var deferred = Q.defer();
            //TODO: Does this really do something?
            collection = null;
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
                logger.debug('loadObject ' + hash);
                collection.findOne({_id: hash}, function (err, obj) {
                    if (err) {
                        logger.error(err);
                        deferred.reject(err);
                    } else if (obj) {
                        deferred.resolve(obj);
                    } else {
                        logger.error('object does not exist ' + hash);
                        deferred.reject(new Error('object does not exist ' + hash));
                    }
                });
            }

            return deferred.promise.nodeify(callback);
        };

        this.loadPaths = function (rootHash, paths, excludes, callback) {

            function loadPath(path) {
                var pathDeferred = Q.defer(),
                    hashes = {},
                    pathArray = path.split('/'),
                    hash = rootHash,
                    key,
                    loadNext = function () {
                        self.loadObject(hash)
                            .then(function (object) {
                                hashes[hash] = object;
                                if (key) {
                                    hash = object[key];
                                    key = pathArray.shift();
                                    loadNext();
                                } else {
                                    //if there is no key, than there is no more to do
                                    pathDeferred.resolve(hashes);
                                }
                            })
                            .catch(function (err) {
                                //we ignore the errors at this point as we will fall back
                                pathDeferred.resolve(hashes);
                            });
                    };

                if(pathArray.length > 1){
                    pathArray.shift();
                }
                key = pathArray.shift();
                loadNext();
                return pathDeferred.promise;
            }

            var deferred = Q.defer(),
                objects = {},
                keys, i, j;

            Q.allSettled(paths.map(loadPath))
                .then(function (results) {
                    for (i = 0; i < results.length; i += 1) {
                        if (results[i].state === 'fulfilled') {
                            keys = Object.keys(results[i].value);
                            for (j = 0; j < keys.length; j += 1) {
                                if (excludes.indexOf(keys[j]) === -1 && !objects[keys[j]]) {
                                    objects[keys[j]] = results[i].value[keys[j]];
                                }
                            }
                        }
                    }
                    return deferred.resolve(objects);
                })
                .catch(function (err) {
                    logger.warn('loading paths failed:', err);
                    return deferred.resolve(objects);
                });
            return deferred.promise.nodeify(callback);
        };

        this.insertObject = function (object, callback) {
            var deferred = Q.defer(),
                rejected = false;
            if (object === null || typeof object !== 'object') {
                deferred.reject(new Error('object is not an object'));
                rejected = true;
            } else if (typeof object._id !== 'string' || !REGEXP.HASH.test(object._id)) {
                deferred.reject(new Error('object._id is not a valid hash.'));
                rejected = true;
            }
            if (rejected === false) {
                collection.insert(object, function (err) {
                    // manually check duplicate keys
                    if (err && err.code === 11000) {
                        collection.findOne({
                            _id: object._id
                        }, function (err2, data) {
                            if (err2) {
                                deferred.reject(err2);
                            } else {
                                if (CANON.stringify(object) === CANON.stringify(data)) {
                                    logger.info('tried to insert existing hash - the two objects were equal',
                                        object._id);
                                    deferred.resolve();
                                } else {
                                    logger.error('tried to insert existing hash - the two objects were NOT equal:',
                                        {newObject: CANON.stringify(object), oldObject: CANON.stringify(data)});
                                    deferred.reject(err);
                                }
                            }
                        });
                    } else if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve();
                    }
                });
            }

            return deferred.promise.nodeify(callback);
        };

        this.getBranches = function (callback) {
            var mongoFind = collection.find({
                _id: {
                    $regex: REGEXP.RAW_BRANCH.source
                }
            });

            return Q.ninvoke(mongoFind, 'toArray')
                .then(function (docs) {
                    var branches = {};
                    for (var i = 0; i < docs.length; ++i) {
                        branches[docs[i]._id.slice(1)] = docs[i].hash;
                    }
                    return Q(branches);
                })
                .nodeify(callback);
        };

        this.getBranchHash = function (branch, callback) {
            branch = '*' + branch;

            return Q.ninvoke(collection, 'findOne', {_id: branch})
                .then(function (branchObj) {
                    // FIXME: This behaviour of return empty string rather than an error is the same as before.
                    // FIXME: Consider returning with an error in style with 'Branch does not exist'.
                    return Q((branchObj && branchObj.hash) || '');
                }).nodeify(callback);
        };

        this.setBranchHash = function (branch, oldhash, newhash, callback) {
            var deferred = Q.defer();
            branch = '*' + branch;

            //TODO: Refactor this to a more promise like function (for now keep it close to the original function).
            //TODO: These error messages need to be more to the point.
            if (oldhash === newhash) {
                collection.findOne({
                    _id: branch
                }, function (err, obj) {
                    if (!err && oldhash !== ((obj && obj.hash) || '')) {
                        err = new Error('branch hash mismatch');
                    }
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve();
                    }
                });
            } else if (newhash === '') {
                collection.remove({
                    _id: branch,
                    hash: oldhash
                }, function (err, num) {
                    if (!err && num !== 1) {
                        err = new Error('branch hash mismatch');
                    }
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve();
                    }
                });
            } else if (oldhash === '') {
                collection.insert({
                    _id: branch,
                    hash: newhash
                }, function (err) {
                    if (err) {
                        if (err.code === 11000) { // insertDocument :: caused by :: 11000 E11000 duplicate key error...
                            deferred.reject(new Error('branch hash mismatch'));
                        } else {
                            deferred.reject(err);
                        }
                    } else {
                        deferred.resolve();
                    }
                });
            } else {
                collection.update({
                    _id: branch,
                    hash: oldhash
                }, {
                    $set: {
                        hash: newhash
                    }
                }, function (err, num) {
                    if (!err && num !== 1) {
                        err = new Error('branch hash mismatch');
                    }
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve();
                    }
                });
            }

            return deferred.promise.nodeify(callback);
        };

        this.getCommits = function (before, number, callback) {
            var mongoFind = collection.find({
                type: 'commit',
                time: {
                    $lt: before
                }
            }).limit(number).sort({
                time: -1
            });

            return Q.ninvoke(mongoFind, 'toArray')
                .then(function (docs) {
                    return Q(docs);
                })
                .nodeify(callback);
        };

        this.getCommonAncestorCommit = function (commitA, commitB, callback) {
            var deferred = Q.defer(),
                ancestorsA = {},
                ancestorsB = {},
                newAncestorsA = [],
                newAncestorsB = [],
                getAncestors = function (commits, ancestorsSoFar, next) {
                    var needed = commits.length,
                        i, newCommits = [],
                        commitLoaded = function (err, commit) {
                            var j;
                            if (!err && commit) {
                                for (j = 0; j < commit.parents.length; j++) {
                                    if (newCommits.indexOf(commit.parents[j]) === -1) {
                                        newCommits.push(commit.parents[j]);
                                    }
                                    ancestorsSoFar[commit.parents[j]] = true;
                                }
                            }
                            if (--needed === 0) {
                                next(newCommits);
                            }
                        };

                    if (needed === 0) {
                        next(newCommits);
                    } else {
                        for (i = 0; i < commits.length; i++) {
                            collection.findOne({
                                _id: commits[i]
                            }, commitLoaded);
                        }
                    }
                },
                checkForCommon = function () {
                    var i;
                    for (i = 0; i < newAncestorsA.length; i++) {
                        if (ancestorsB[newAncestorsA[i]]) {
                            //we got a common parent so let's go with it
                            return newAncestorsA[i];
                        }
                    }
                    for (i = 0; i < newAncestorsB.length; i++) {
                        if (ancestorsA[newAncestorsB[i]]) {
                            //we got a common parent so let's go with it
                            return newAncestorsB[i];
                        }
                    }
                    return null;
                },
                loadStep = function () {
                    var candidate = checkForCommon(),
                        needed = 2,
                        bothLoaded = function () {
                            if (newAncestorsA.length > 0 || newAncestorsB.length > 0) {
                                loadStep();
                            } else {
                                deferred.reject('unable to find common ancestor commit');
                            }
                        };
                    if (candidate) {
                        deferred.resolve(candidate);
                        return;
                    }
                    getAncestors(newAncestorsA, ancestorsA, function (nCommits) {
                        newAncestorsA = nCommits || [];
                        if (--needed === 0) {
                            bothLoaded();
                        }
                    });
                    getAncestors(newAncestorsB, ancestorsB, function (nCommits) {
                        newAncestorsB = nCommits || [];
                        if (--needed === 0) {
                            bothLoaded();
                        }
                    });
                };

            //initializing
            ancestorsA[commitA] = true;
            newAncestorsA = [commitA];
            ancestorsB[commitB] = true;
            newAncestorsB = [commitB];
            collection.findOne({
                _id: commitA,
                type: 'commit'
            }, function (err, commit) {
                if (err || !commit) {
                    deferred.reject(new Error('Commit object does not exist [' + commitA + ']'));
                    return;
                }
                collection.findOne({
                    _id: commitB,
                    type: 'commit'
                }, function (err, commit) {
                    if (err || !commit) {
                        deferred.reject(new Error('Commit object does not exist [' + commitB + ']'));
                        return;
                    }
                    loadStep();
                });
            });

            return deferred.promise.nodeify(callback);
        };
    }

    function openDatabase(callback) {
        connectionCnt += 1;
        logger.debug('openDatabase, connection counter:', connectionCnt);

        if (connectionCnt === 1) {
            if (mongo === null) {
                logger.debug('Connecting to mongo...');
                connectDeferred = Q.defer();
                // connect to mongo
                mongodb.MongoClient.connect(gmeConfig.mongo.uri, gmeConfig.mongo.options, function (err, db) {
                    if (!err && db) {
                        mongo = db;
                        logger.debug('Connected.');
                        connectDeferred.resolve();
                    } else {
                        mongo = null;
                        connectionCnt -= 1;
                        logger.error('Failed to connect.', {metadata: err});
                        connectDeferred.reject(err);
                    }
                });
            } else {
                logger.debug('Count is 1 but mongo is not null');
            }
        } else {
            logger.debug('Reusing mongo connection.');
            // we are already connected
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
            if (mongo) {
                logger.debug('Closing connection to mongo...');
                mongo.close(function () {
                    mongo = null;
                    logger.debug('Closed.');
                    disconnectDeferred.resolve();
                });
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

        if (mongo) {
            Q.ninvoke(mongo, 'dropCollection', projectId)
                .then(function () {
                    deferred.resolve(true);
                })
                .catch(function (err) {
                    if (err.ok === 0) { // http://docs.mongodb.org/manual/reference/method/db.collection.drop/
                        logger.debug('deleteProject, project does not exist', projectId);
                        deferred.resolve(false);
                    } else {
                        deferred.reject(err);
                    }
                });
        } else {
            deferred.reject(new Error('Database is not open.'));
        }

        return deferred.promise.nodeify(callback);
    }

    function openProject(projectId, callback) {
        var collection,
            deferred = Q.defer();

        logger.debug('openProject', projectId);

        if (mongo) {
            Q.ninvoke(mongo, 'collection', projectId)
                .then(function (result) {
                    collection = result;
                    return Q.ninvoke(result, 'findOne', {}, {_id: 1});
                })
                .then(function (something) {
                    if (!something) {
                        deferred.reject(new Error('Project does not exist ' + projectId));
                    } else {
                        deferred.resolve(new Project(projectId, collection));
                    }
                })
                .catch(deferred.reject);

        } else {
            deferred.reject(new Error('Database is not open.'));
        }

        return deferred.promise.nodeify(callback);
    }

    function createProject(projectId, callback) {
        var collection,
            deferred = Q.defer();

        logger.debug('createProject', projectId);

        if (mongo) {
            Q.ninvoke(mongo, 'collection', projectId)
                .then(function (result) {
                    collection = result;
                    return Q.ninvoke(result, 'findOne', {}, {_id: 1});
                })
                .then(function (something) {
                    if (something) {
                        deferred.reject(new Error('Project already exists ' + projectId));
                    } else {
                        return Q.ninvoke(collection, 'insert', {_id: CONSTANTS.EMPTY_PROJECT_DATA});
                    }
                })
                .then(function () {
                    deferred.resolve(new Project(projectId, collection));
                })
                .catch(deferred.reject);

        } else {
            deferred.reject(new Error('Database is not open.'));
        }

        return deferred.promise.nodeify(callback);
    }

    function renameProject(projectId, newProjectId, callback) {
        var deferred = Q.defer();

        if (mongo) {
            Q.ninvoke(mongo, 'renameCollection', projectId, newProjectId)
                .then(function () {
                    deferred.resolve();
                })
                .catch(deferred.reject);
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

module.exports = Mongo;
