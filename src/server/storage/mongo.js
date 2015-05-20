/*globals requireJS*/
/*jshint node:true, newcap:false*/

/**
 * @author mmaroti / https://github.com/mmaroti
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var mongodb = require('mongodb'),
    Q = require('Q'),

    CONSTANTS = requireJS('common/storage/constants'),
    CANON = requireJS('common/util/canon'),
    REGEXP = requireJS('common/regexp');

function Mongo(mainLogger, gmeConfig) {
    var mongo = null,
        logger = mainLogger.fork('mongo');

    /**
     * Provides methods related to a specific project.
     *
     * @param {string} name - Name of the project.
     * @param {object} collection - Mongo collection connected to database.
     * @constructor
     */
    function Project(name, collection) {
        this.name = name;

        this.closeProject = function (callback) {
            //TODO: Does this really do something?
            collection = null;
            if (typeof callback === 'function') {
                callback(null);
            }
        };

        this.loadObject = function (hash, callback) {
            var deferred = Q.defer();
            if (typeof hash !== 'string' || !REGEXP.HASH.test(hash)) {
                deferred.reject('loadObject - invalid hash :' + hash.toString());
            } else {
                collection.findOne({_id: hash}, function (err, obj) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve(obj);
                    }
                });
            }

            return deferred.promise.nodeify(callback);
        };

        this.insertObject = function (object, callback) {
            var deferred = Q.defer(),
                rejected = false;
            if (object === null || typeof object !== 'object') {
                deferred.reject('object is not an object');
                rejected = true;
            } else if (typeof object._id !== 'string' || !REGEXP.HASH.test(object._id)) {
                deferred.reject('object._id is not a valid hash.');
                rejected = true;
            }
            if (rejected === false) {
                collection.insert(object, function (err) {
                    // manually check duplicate keys
                    if (err && err.code === 11000) {
                        collection.findOne({
                            _id: object._id
                        }, function (err2, data) {
                            if (!err2 && CANON.stringify(object) === CANON.stringify(data)) {
                                deferred.resolve();
                            } else {
                                deferred.reject(err);
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

        //this.getInfo = function (callback) {
        //    return Q.ninvoke(collection, 'findOne', {_id: CONSTANTS.PROJECT_INFO_ID})
        //        .then(function (info) {
        //            if (info) {
        //                delete info._id;
        //            }
        //            return Q(info);
        //        })
        //        .nodeify(callback);
        //};
        //
        //this.setInfo = function (info, callback) {
        //    ASSERT(typeof info === 'object' && typeof callback === 'function');
        //    info._id = CONSTANTS.PROJECT_INFO_ID;
        //
        //    return Q.ninvoke(collection, 'update', {_id: CONSTANTS.PROJECT_INFO_ID}, info, {upsert: true})
        //        .nodeify(callback);
        //};
        //
        //this.dumpObjects = function (callback) {
        //    ASSERT(typeof callback === 'function');
        //
        //    collection.find().each(function (err, item) {
        //        if (err || item === null) {
        //            callback(err);
        //        } else {
        //            logger.debug(item);
        //        }
        //    });
        //};

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
                        err = 'branch hash mismatch';
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
                        err = 'branch hash mismatch';
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
                        deferred.reject(err);
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
                        err = 'branch hash mismatch';
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
                $natural: -1
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
                            var i;
                            if (!err && commit) {
                                for (i = 0; i < commit.parents.length; i++) {
                                    if (newCommits.indexOf(commit.parents[i]) === -1) {
                                        newCommits.push(commit.parents[i]);
                                    }
                                    ancestorsSoFar[commit.parents[i]] = true;
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
            loadStep();

            return deferred.promise.nodeify(callback);
        };
    }

    function openDatabase(callback) {
        var deferred = Q.defer();
        logger.debug('openDatabase');

        if (mongo === null) {
            logger.debug('Connecting to mongo...');
            // connect to mongo
            mongodb.MongoClient.connect(gmeConfig.mongo.uri, gmeConfig.mongo.options, function (err, db) {
                if (!err && db) {
                    mongo = db;
                    logger.debug('Connected.');
                    deferred.resolve();
                } else {
                    mongo = null;
                    deferred.reject(err);
                }
            });
        } else {
            logger.debug('Reusing mongo connection.');
            // we are already connected
            deferred.resolve();
        }

        return deferred.promise.nodeify(callback);
    }

    function closeDatabase(callback) {
        var deferred = Q.defer();
        logger.debug('closeDatabase');
        if (mongo !== null) {
            logger.debug('Closing connection to mongo...');
            mongo.close(function () {
                mongo = null;
                logger.debug('Closed.');
                deferred.resolve();
            });
        } else {
            logger.debug('No mongo connection was established.');
            deferred.resolve();
        }

        return deferred.promise.nodeify(callback);
    }

    function getProjectNames(callback) {
        return Q.ninvoke(mongo, 'collectionNames')
            .then(function (collections) {
                var names = [];
                for (var i = 0; i < collections.length; i++) {
                    if (!REGEXP.PROJECT.test(collections[i].name)) {
                        continue;
                    }
                    var p = collections[i].name.indexOf('.');
                    var n = collections[i].name.substring(p + 1);
                    if (n.indexOf('system') === -1 && n.indexOf('.') === -1 && n.indexOf('_') !== 0) {
                        names.push(n);
                    }
                }
                return Q(names);
            }).nodeify(callback);
    }

    function deleteProject(name, callback) {
        var deferred = Q.defer();
        Q.ninvoke(mongo, 'dropCollection', name)
            .then(function () {
                deferred.resolve();
            })
            .catch(function (err) {
                if (err.ok === 0) {
                    logger.debug('deleteProject, project does not exist', name);
                    // http://docs.mongodb.org/manual/reference/method/db.collection.drop/
                    deferred.resolve();
                } else {
                    deferred.reject(err);
                }
            });

        return deferred.promise.nodeify(callback);
    }

    function openProject(name, callback) {
        var collection;
        logger.debug('openProject', name);

        return Q.ninvoke(mongo, 'collection', name)
            .then(function (result) {
                collection = result;
                return Q.ninvoke(result, 'findOne', {}, {_id: 1});
            })
            .then(function (something) {
                var deferred = Q.defer();
                if (!something) {
                    deferred.reject('Project does not exist ' + name);
                } else {
                    deferred.resolve(new Project(name, collection));
                }

                return deferred.promise;
            }).nodeify(callback);
    }

    function createProject(name, callback) {
        var collection;
        logger.debug('createProject', name);

        return Q.ninvoke(mongo, 'collection', name)
            .then(function (result) {
                collection = result;
                return Q.ninvoke(result, 'findOne', {}, {_id: 1});
            })
            .then(function (something) {
                var deferred = Q.defer();
                if (something) {
                    deferred.reject('Project already exist ' + name);
                } else {
                    Q.ninvoke(collection, 'insert', {_id: CONSTANTS.EMPTY_PROJECT_DATA})
                    .then(function () {
                        deferred.resolve(new Project(name, collection));
                    })
                    .catch(function (err) {
                        deferred.reject(err);
                    });
                }

                return deferred.promise;
            }).nodeify(callback);
    }

    this.openDatabase = openDatabase;
    this.closeDatabase = closeDatabase;

    this.getProjectNames = getProjectNames;

    this.openProject = openProject;
    this.deleteProject = deleteProject;
    this.createProject = createProject;
}

module.exports = Mongo;
