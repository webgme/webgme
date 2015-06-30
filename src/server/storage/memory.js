/*globals requireJS*/
/*jshint node:true, newcap:false*/
/**
 * @author lattmann / https://github.com/lattmann
 */
'use strict';

var Q = require('q'),

    ASSERT = requireJS('common/util/assert'),
//CANON = requireJS('common/util/canon'),
    REGEXP = requireJS('common/regexp'),

    SEPARATOR = '$'; // MAGIC CONSTANT
//STATUS_UNREACHABLE = 'storage unreachable', // MAGIC CONSTANT
//STATUS_CONNECTED = 'connected', // MAGIC CONSTANT
//PROJECT_INFO_ID = '*info*'; // MAGIC CONSTANT

/**
 * An in-memory implementation of backing the data for webgme.
 *
 * @param mainLogger
 * @constructor
 */
function Memory(mainLogger, gmeConfig) {
    var logger = mainLogger.fork('memory'),
        database = 'memory', // is this constant or coming from the GME config?
        storage = {
            length: 0,
            keys: [],
            data: {},
            connected: false,
            connect: function () {
                this.connected = true;
            },
            close: function () {
                this.connected = false;
            },
            getItem: function (key) {
                ASSERT(typeof key === 'string');
                return this.data[key];
            },
            setItem: function (key, object) {
                ASSERT(typeof key === 'string');
                this.data[key] = object;
                if (this.keys.indexOf(key) === -1) {
                    this.keys.push(key);
                    this.length = this.keys.length;
                }
            },
            removeItem: function (key) {
                ASSERT(typeof key === 'string');
                delete this.data[key];
                var index = this.keys.indexOf(key);
                if (index > -1) {
                    this.keys.splice(index, 1);
                    this.length = this.keys.length;
                }
            },
            key: function (index) {
                return this.keys[index];
            }
        };

    this.gmeConfig = gmeConfig;

    function Project(projectId) {
        var self = this;

        this.projectId = projectId;


        if (storage.connected) {
            storage.setItem(database + SEPARATOR + projectId + SEPARATOR, this);
        }
        //else {
        // TODO: error handling
        //}

        this.closeProject = function (callback) {
            var deferred = Q.defer();
            deferred.resolve();
            return deferred.promise.nodeify(callback);
        };

        this.loadObject = function (hash, callback) {
            ASSERT(typeof hash === 'string' && REGEXP.HASH.test(hash));

            var deferred = Q.defer(),
                object = storage.getItem(database + SEPARATOR + projectId + SEPARATOR + hash);

            if (object) {
                object = JSON.parse(object);
                deferred.resolve(object);
            } else {
                deferred.reject('object does not exist ' + hash);
            }

            return deferred.promise.nodeify(callback);
        };

        this.insertObject = function (object, callback) {
            ASSERT(object !== null && typeof object === 'object');
            ASSERT(typeof object._id === 'string' && REGEXP.HASH.test(object._id));

            var deferred = Q.defer();

            try {
                storage.setItem(database + SEPARATOR + projectId + SEPARATOR + object._id, JSON.stringify(object));
                deferred.resolve();
            } catch (e) {
                deferred.reject(e);
            }

            return deferred.promise.nodeify(callback);
        };

        this.getBranches = function (callback) {
            var deferred = Q.defer(),
                branchNames = {},
                pending = 0,
                updateBranchEntry = function (branchName) {
                    self.getBranchHash(branchName, function (err, hash) {
                        pending -= 1;
                        branchNames[branchName] = hash;
                        done();
                    });
                },
                done = function () {
                    if (i === storage.length && pending === 0) {
                        deferred.resolve(branchNames);
                    }
                };

            for (var i = 0; i < storage.length; i += 1) {
                var keyArray = storage.key(i).split(SEPARATOR);
                ASSERT(keyArray.length === 3);
                if (REGEXP.RAW_BRANCH.test(keyArray[2])) {
                    if (keyArray[0] === database && keyArray[1] === projectId) {
                        // TODO:  double check this line, *master => master, and return with an object of branches
                        var branchName = keyArray[2].slice(1);
                        pending += 1;
                        updateBranchEntry(branchName);
                    }
                }
            }

            done();

            return deferred.promise.nodeify(callback);
        };

        this.getBranchHash = function (branch, callback) {
            ASSERT(typeof branch === 'string' && REGEXP.RAW_BRANCH.test('*' + branch));
            //ASSERT(typeof oldhash === 'string' && (oldhash === '' || REGEXP.HASH.test(oldhash)));

            var deferred = Q.defer(),
                hash = storage.getItem(database + SEPARATOR + projectId + SEPARATOR + '*' + branch);

            if (hash) {
                hash = JSON.parse(hash);
            }

            hash = (hash && hash.hash) || '';

            //if (hash !== oldhash) {
            //    deferred.resolve(hash, null);
            //} else {
            //    hash = storage.getItem(database + SEPARATOR + projectId + SEPARATOR + '*' + branch);
            //    if (hash) {
            //        hash = JSON.parse(hash);
            //    }
            //    hash = (hash && hash.hash) || '';
            //
            //    deferred.resolve(hash, null);
            //}
            deferred.resolve(hash);
            return deferred.promise.nodeify(callback);
        };

        this.setBranchHash = function (branch, oldhash, newhash, callback) {
            ASSERT(typeof branch === 'string' && REGEXP.RAW_BRANCH.test('*' + branch));
            ASSERT(typeof oldhash === 'string' && (oldhash === '' || REGEXP.HASH.test(oldhash)));
            ASSERT(typeof newhash === 'string' && (newhash === '' || REGEXP.HASH.test(newhash)));

            var deferred = Q.defer(),
                hash = storage.getItem(database + SEPARATOR + projectId + SEPARATOR + '*' + branch);

            if (hash) {
                hash = JSON.parse(hash);
            }

            hash = (hash && hash.hash) || '';

            if (oldhash === newhash) {
                if (oldhash === hash) {
                    deferred.resolve();
                } else {
                    deferred.reject(new Error('branch has mismatch'));
                }
            } else {
                if (oldhash === hash) {
                    if (newhash === '') {
                        storage.removeItem(database + SEPARATOR + projectId + SEPARATOR + '*' + branch);
                    } else {
                        storage.setItem(database + SEPARATOR + projectId + SEPARATOR + '*' + branch, JSON.stringify({
                            _id: branch,
                            hash: newhash
                        }));
                    }
                    deferred.resolve();
                } else {
                    deferred.reject(new Error('branch has mismatch'));
                }
            }

            return deferred.promise.nodeify(callback);
        };

        this.getCommits = function (before, number, callback) {
            var deferred = Q.defer(),
                finds = [],
                i,
                item,
                object;

            for (i = 0; i < storage.length; i += 1) {
                if (storage.key(i).indexOf(database + SEPARATOR + projectId + SEPARATOR) === 0) {
                    item = storage.getItem(storage.key(i));
                    if (typeof item === 'string') {
                        object = JSON.parse(item);
                        if (object.type === 'commit' && object.time < before) {
                            finds.push(object);
                            if (finds.length === number) {
                                break;
                            }
                        }
                    }
                }
            }

            deferred.resolve(finds);

            return deferred.promise.nodeify(callback);
        };

        this.getCommonAncestorCommit = function (commitA, commitB, callback) {
            var deferred = Q.defer(),
                ancestorsA = {},
                ancestorsB = {},
                newAncestorsA = [],
                newAncestorsB = [],
                getAncestors = function (commits, ancestorsSoFar, next) {
                    var i, j,
                        newCommits = [],
                        commit;
                    for (i = 0; i < commits.length; i++) {
                        commit = storage.getItem(database + SEPARATOR + projectId + SEPARATOR + commits[i]);
                        if (commit && typeof commit === 'string') {
                            commit = JSON.parse(commit);
                            for (j = 0; j < commit.parents.length; j++) {
                                if (newCommits.indexOf(commit.parents[j]) === -1) {
                                    newCommits.push(commit.parents[j]);
                                }
                                ancestorsSoFar[commit.parents[j]] = true;
                            }
                        }
                    }
                    next(newCommits);
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
                                deferred.reject(new Error('unable to find common ancestor commit'));
                            }
                        };
                    if (candidate) {
                        deferred.resolve(candidate);
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

        if (storage.connected) {
            logger.debug('Reusing in-memory database connection.');
            // we are already connected
            deferred.resolve();
        } else {
            logger.debug('Connecting to in-memory database...');
            storage.connect();

            logger.debug('Connected.');
            deferred.resolve();
        }

        return deferred.promise.nodeify(callback);
    }

    function closeDatabase(callback) {
        var deferred = Q.defer();
        logger.debug('closeDatabase');

        if (storage.connected) {
            logger.debug('Closing in-memory database and cleaning up...');
            storage.close();
            logger.debug('Closed.');
            deferred.resolve();
        } else {
            logger.debug('No in-memory database connection was established.');
            deferred.resolve();
        }

        return deferred.promise.nodeify(callback);
    }

    function getProjectIds(callback) {
        var deferred = Q.defer();

        if (storage.connected) {
            var projectIds = [];
            for (var i = 0; i < storage.length; i += 1) {
                var key = storage.key(i);
                var keyArray = key.split(SEPARATOR);
                ASSERT(keyArray.length === 3);
                if (keyArray[0] === database) {
                    if (projectIds.indexOf(keyArray[1]) === -1) {
                        ASSERT(REGEXP.PROJECT.test(keyArray[1]));
                        projectIds.push(keyArray[1]);
                    }
                }
            }
            deferred.resolve(projectIds);
        } else {
            deferred.reject(new Error('In-memory database has to be initialized. Call openDatabase first.'));
        }

        return deferred.promise.nodeify(callback);
    }

    function createProject(projectId, callback) {
        var deferred = Q.defer(),
            project;

        logger.debug('createProject', projectId);


        if (storage.connected) {

            project = storage.getItem(database + SEPARATOR + projectId + SEPARATOR);
            if (project) {
                deferred.reject(new Error('Project already exists ' + projectId));
            } else {
                deferred.resolve(new Project(projectId));
            }

        } else {
            deferred.reject(new Error('In-memory database has to be initialized. Call openDatabase first.'));
        }


        return deferred.promise.nodeify(callback);
    }

    function deleteProject(projectId, callback) {
        var deferred = Q.defer(),
            key,
            keyArray,
            i,
            namesToRemove = [],
            existed = false;

        if (storage.connected) {
            for (i = 0; i < storage.length; i += 1) {
                key = storage.key(i);
                keyArray = key.split(SEPARATOR);
                ASSERT(keyArray.length === 3);
                if (keyArray[0] === database) {
                    if (keyArray[1] === projectId) {
                        namesToRemove.push(key);
                    }
                }
            }

            for (i = 0; i < namesToRemove.length; i += 1) {
                storage.removeItem(namesToRemove[i]);
            }

            existed = namesToRemove.length > 0;

            deferred.resolve(existed);
        } else {
            deferred.reject(new Error('In-memory database has to be initialized. Call openDatabase first.'));
        }

        return deferred.promise.nodeify(callback);
    }

    function openProject(projectId, callback) {
        var deferred = Q.defer(),
            project;

        logger.debug('openProject', projectId);


        if (storage.connected) {

            project = storage.getItem(database + SEPARATOR + projectId + SEPARATOR);
            if (project) {
                deferred.resolve(project);
            } else {
                deferred.reject(new Error('Project does not exist ' + projectId));
            }

        } else {
            deferred.reject(new Error('In-memory database has to be initialized. Call openDatabase first.'));
        }


        return deferred.promise.nodeify(callback);
    }


    this.openDatabase = openDatabase;
    this.closeDatabase = closeDatabase;

    this.getProjectIds = getProjectIds;

    this.createProject = createProject;
    this.deleteProject = deleteProject;
    this.openProject = openProject;
}

module.exports = Memory;