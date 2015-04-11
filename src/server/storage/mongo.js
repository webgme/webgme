/*globals requireJS*/
/*jshint node:true*/

/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Miklos Maroti
 */

'use strict';

var MONGODB = require('mongodb'),

    ASSERT = requireJS('common/util/assert'),
    CANON = requireJS('common/util/canon'),
    REGEXP = requireJS('common/regexp');

var STATUS_CLOSED = 'mongodb closed';
var STATUS_UNREACHABLE = 'mongodb unreachable';
var STATUS_CONNECTED = 'connected';

var PROJECT_INFO_ID = '*info*';
var ID_NAME = '_id';

function Database(options) {
    ASSERT(typeof options === 'object');
    ASSERT(typeof options.logger === 'object');
    var mongo = null,
        gmeConfig = options.globConf,
        logger = options.logger.fork('mongo');

    function openDatabase(callback) {
        ASSERT(typeof callback === 'function');

        if (mongo === null) {
            logger.debug('connecting to mongo');
            // connect to mongo
            MONGODB.MongoClient.connect(gmeConfig.mongo.uri, gmeConfig.mongo.options, function (err, db) {
                if (!err && db) {
                    mongo = db;
                    callback(null);
                } else {
                    mongo = null;
                    callback(err);
                }
            });
        } else {
            logger.debug('reusing mongo connection');
            // we are already connected
            callback(null);
        }
    }

    function closeDatabase(callback) {
        logger.debug('closeDatabase');
        if (mongo !== null) {
            logger.debug('closing mongo calling fsyncDatabase');
            fsyncDatabase(function () {
                logger.debug('closing mongo calling close');
                mongo.close(function () {
                    mongo = null;
                    logger.debug('closed');
                    if (typeof callback === 'function') {
                        callback(null);
                    }
                });
            });
        } else if (typeof callback === 'function') {
            callback(null);
        }
    }

    function fsyncDatabase(callback) {
        ASSERT(typeof callback === 'function');

        logger.debug('fsyncDatabase');

        var error = null;
        var synced = 0;

        function fsyncConnection(conn, i) {
            logger.debug('fsyncConnection ' + conn.id);

            mongo.command({getLastError: 1, fsync: true}, {connection: conn},
                function (err /*, result*/) {
                    //TODO we ignore the result right now
                    error = error || err;
                    logger.debug('fsyncConnection done for ' + i);

                    if (++synced === conns.length) {
                        logger.debug('fsyncConnection done');
                        if (error) {
                            logger.error(error);
                        }
                        callback(error);
                    }
                });
        }

        var conns = mongo.serverConfig.allRawConnections();
        if (conns instanceof Array && conns.length >= 1) {
            logger.debug('fsyncConnection for connections: ' + conns.length);
            for (var i = 0; i < conns.length; ++i) {
                fsyncConnection(conns[i], i);
            }
        } else {
            callback('not connected');
        }
    }

    function getDatabaseStatus(oldstatus, callback) {
        ASSERT(oldstatus === null || typeof oldstatus === 'string');
        ASSERT(typeof callback === 'function');

        if (mongo === null) {
            reportStatus(oldstatus, STATUS_CLOSED, callback);
        } else {
            mongo.command({
                ping: 1
            }, function (err) {
                reportStatus(oldstatus, err ? STATUS_UNREACHABLE : STATUS_CONNECTED, callback);
            });
        }
    }

    function reportStatus(oldstatus, newstatus, callback) {
        if (oldstatus !== newstatus) {
            callback(null, newstatus);
        } else {
            setTimeout(function () {
                if (mongo === null) {
                    newstatus = STATUS_CLOSED;
                }
                callback(null, newstatus);
            }, gmeConfig.storage.timeout);
        }
    }

    function getProjectNames(callback) {
        ASSERT(typeof callback === 'function');

        mongo.collectionNames(function (err, collections) {
            if (err) {
                callback(err);
            } else {
                var names = [];
                for (var i = 0; i < collections.length; i++) {
                    var p = collections[i].name.indexOf('.');
                    var n = collections[i].name.substring(p + 1);
                    if (n.indexOf('system') === -1 && n.indexOf('.') === -1 && n.indexOf('_') !== 0) {
                        names.push(n);
                    }
                }
                callback(null, names);
            }
        });
    }

    function deleteProject(name, callback) {
        ASSERT(typeof name === 'string' && REGEXP.PROJECT.test(name));
        ASSERT(typeof callback === 'function');

        mongo.dropCollection(name, function (err) {
            if (err) {
                logger.debug('Error in dropCollection (not handled)', err);
            }
            callback(null);
        });
    }

    function openProject(name, callback) {
        ASSERT(mongo !== null && typeof callback === 'function');
        ASSERT(typeof name === 'string' && REGEXP.PROJECT.test(name));

        var collection = null;

        mongo.collection(name, function (err, result) {
            if (err) {
                callback(err);
            } else {
                collection = result;
                callback(null, {
                    fsyncDatabase: fsyncDatabase,
                    getDatabaseStatus: getDatabaseStatus,
                    closeProject: closeProject,
                    loadObject: loadObject,
                    insertObject: insertObject,
                    getInfo: getInfo,
                    setInfo: setInfo,
                    findHash: findHash,
                    dumpObjects: dumpObjects,
                    getBranchNames: getBranchNames,
                    getBranchHash: getBranchHash,
                    setBranchHash: setBranchHash,
                    getCommits: getCommits,
                    getCommonAncestorCommit: getCommonAncestorCommit,
                    ID_NAME: ID_NAME
                });
            }
        });

        function closeProject(callback) {
            collection = null;
            if (typeof callback === 'function') {
                callback(null);
            }
        }

        function loadObject(hash, callback) {
            ASSERT(typeof hash === 'string' && REGEXP.HASH.test(hash));

            collection.findOne({
                _id: hash
            }, callback);
        }

        function insertObject(object, callback) {
            ASSERT(object !== null && typeof object === 'object');
            ASSERT(typeof object._id === 'string' && REGEXP.HASH.test(object._id));

            collection.insert(object, function (err) {
                // manually check duplicate keys
                if (err && err.code === 11000) {
                    collection.findOne({
                        _id: object._id
                    }, function (err2, data) {
                        if (!err2 && CANON.stringify(object) === CANON.stringify(data)) {
                            callback(null);
                        } else {
                            callback(err);
                        }
                    });
                } else {
                    callback(err);
                }
            });
        }

        function getInfo(callback) {
            ASSERT(typeof callback === 'function');
            collection.findOne({
                _id: PROJECT_INFO_ID
            }, function (err, info) {
                if (info) {
                    delete info._id;
                }
                callback(err, info);
            });
        }

        function setInfo(info, callback) {
            ASSERT(typeof info === 'object' && typeof callback === 'function');
            collection.update({_id: PROJECT_INFO_ID}, info, {upsert: true}, callback);
        }

        function findHash(beginning, callback) {
            ASSERT(typeof beginning === 'string' && typeof callback === 'function');

            if (!REGEXP.HASH.test(beginning)) {
                callback('hash ' + beginning + ' not valid');
            } else {
                collection.find({
                    _id: {
                        $regex: '^' + beginning
                    }
                }, {
                    limit: 2
                }).toArray(function (err, docs) {
                    if (err) {
                        callback(err);
                    } else if (docs.length === 0) {
                        callback('hash ' + beginning + ' not found');
                    } else if (docs.length !== 1) {
                        callback('hash ' + beginning + ' not unique');
                    } else {
                        callback(null, docs[0]._id);
                    }
                });
            }
        }

        function dumpObjects(callback) {
            ASSERT(typeof callback === 'function');

            collection.find().each(function (err, item) {
                if (err || item === null) {
                    callback(err);
                } else {
                    logger.debug(item);
                }
            });
        }

        function getBranchNames(callback) {
            ASSERT(typeof callback === 'function');

            collection.find({
                _id: {
                    $regex: REGEXP.RAW_BRANCH.source
                }
            }).toArray(function (err, docs) {
                if (err) {
                    callback(err);
                } else {
                    var branches = {};
                    for (var i = 0; i < docs.length; ++i) {
                        branches[docs[i]._id.slice(1)] = docs[i].hash;
                    }
                    callback(null, branches);
                }
            });
        }

        function getBranchHash(branch, oldhash, callback) {
            branch = '*' + branch;
            ASSERT(typeof branch === 'string' && REGEXP.RAW_BRANCH.test(branch));
            ASSERT(oldhash === null || (typeof oldhash === 'string' && (oldhash === '' || REGEXP.HASH.test(oldhash))));
            ASSERT(typeof callback === 'function');

            collection.findOne({
                _id: branch
            }, function (err, obj) {
                if (err) {
                    callback(err);
                } else {
                    var newhash = (obj && obj.hash) || '';
                    if (oldhash === null || oldhash !== newhash) {
                        callback(null, newhash, null);
                    } else {
                        setTimeout(callback, gmeConfig.storage.timeout, null, newhash, null);
                    }
                }
            });
        }

        function setBranchHash(branch, oldhash, newhash, callback) {
            branch = '*' + branch;
            ASSERT(typeof branch === 'string' && REGEXP.RAW_BRANCH.test(branch));
            ASSERT(typeof oldhash === 'string' && (oldhash === '' || REGEXP.HASH.test(oldhash)));
            ASSERT(typeof newhash === 'string' && (newhash === '' || REGEXP.HASH.test(newhash)));
            ASSERT(typeof callback === 'function');

            if (oldhash === newhash) {
                collection.findOne({
                    _id: branch
                }, function (err, obj) {
                    if (!err && oldhash !== ((obj && obj.hash) || '')) {
                        err = 'branch hash mismatch';
                    }
                    callback(err);
                });
            } else if (newhash === '') {
                collection.remove({
                    _id: branch,
                    hash: oldhash
                }, function (err, num) {
                    if (!err && num !== 1) {
                        err = 'branch hash mismatch';
                    }
                    callback(err);
                });
            } else if (oldhash === '') {
                collection.insert({
                    _id: branch,
                    hash: newhash
                }, function (err) {
                    callback(err);
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
                    callback(err);
                });
            }
        }

        function getCommits(before, number, callback) {
            //TODO we should think whether this needs options or not
            ASSERT(typeof callback === 'function');

            collection.find({
                type: 'commit',
                time: {
                    $lt: before
                }
            }).limit(number).sort({
                $natural: -1
            }).toArray(callback);
        }

        function getCommonAncestorCommit(commitA, commitB, callback) {
            var ancestorsA = {},
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
                                callback('unable to find common ancestor commit', null);
                            }
                        };
                    if (candidate) {
                        return callback(null, candidate);
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

        }
    }

    return {
        openDatabase: openDatabase,
        closeDatabase: closeDatabase,
        fsyncDatabase: fsyncDatabase,
        getDatabaseStatus: getDatabaseStatus,
        getProjectNames: getProjectNames,
        openProject: openProject,
        deleteProject: deleteProject,
        simpleRequest: function () {
        }, //placeholder as this function doesn't reach this level
        simpleResult: function () {
        }, //placeholder
        simpleQuery: function () {
        }, //placeholder
        getToken: function () {
        } //placeholder
    };
}

module.exports = Database;
