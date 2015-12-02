/*globals requireJS*/
/*jshint node:true, newcap:false*/
/**
 * @module Server:Storage:Memory
 * @author lattmann / https://github.com/lattmann
 */
'use strict';

var Q = require('q'),
    REGEXP = requireJS('common/regexp'),
    CANON = requireJS('common/util/canon'),
    TAGS = 'TAGS',
    SEPARATOR = '$';

/**
 * An in-memory implementation of backing the data for webgme.
 *
 * memory$newProject13$ = MemoryProject
 * memory$newProject13$#commitHash1 = "{"_id":"#commitHash1","time":1,"type":"commit"}"
 * memory$newProject13$#coreDataObjectHash = "{"_id":"#coreDataObjectHash", ...}"
 * memory$newProject13$*b1 = "{"_id":"b1","hash":"#newHash1"}"
 * memory$newProject13$TAGS = "{ "tag1": "#commitHash1", "tag2": "#commitHash2"}
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
                return this.data[key];
            },
            setItem: function (key, object) {
                this.data[key] = object;
                if (this.keys.indexOf(key) === -1) {
                    this.keys.push(key);
                    this.length = this.keys.length;
                }
            },
            removeItem: function (key) {
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

    function MemoryProject(projectId) {
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
            var deferred = Q.defer(),
                object;
            if (typeof hash !== 'string') {
                deferred.reject(new Error('loadObject - given hash is not a string : ' + typeof hash));
            } else if (!REGEXP.HASH.test(hash)) {
                deferred.reject(new Error('loadObject - invalid hash :' + hash));
            } else {
                object = storage.getItem(database + SEPARATOR + projectId + SEPARATOR + hash);

                if (object) {
                    object = JSON.parse(object);
                    deferred.resolve(object);
                } else {
                    deferred.reject(new Error('object does not exist ' + hash));
                }
            }
            return deferred.promise.nodeify(callback);
        };

        this.insertObject = function (object, callback) {
            var deferred = Q.defer(),
                errMsg,
                objectStr;
            if (object === null || typeof object !== 'object') {
                deferred.reject(new Error('object is not an object'));
            } else if (typeof object._id !== 'string' || !REGEXP.HASH.test(object._id)) {
                deferred.reject(new Error('object._id is not a valid hash.'));
            } else {
                objectStr = storage.getItem(database + SEPARATOR + projectId + SEPARATOR + object._id);
                if (objectStr) {
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
                } else {
                    try {
                        storage.setItem(database + SEPARATOR + projectId + SEPARATOR + object._id,
                            JSON.stringify(object));
                        deferred.resolve();
                    } catch (e) {
                        deferred.reject(e);
                    }
                }
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
            var deferred = Q.defer(),
                hash = storage.getItem(database + SEPARATOR + projectId + SEPARATOR + '*' + branch);

            if (hash) {
                hash = JSON.parse(hash);
            }

            hash = (hash && hash.hash) || '';

            deferred.resolve(hash);
            return deferred.promise.nodeify(callback);
        };

        this.setBranchHash = function (branch, oldhash, newhash, callback) {

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
                    deferred.reject(new Error('branch hash mismatch'));
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
                } else if (hash === '' && newhash === '') {
                    deferred.resolve();
                } else {
                    deferred.reject(new Error('branch hash mismatch'));
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

            finds.sort(function (a, b) {
                return b.time - a.time;
            });

            deferred.resolve(finds);

            return deferred.promise.nodeify(callback);
        };

        this.createTag = function (name, commitHash, callback) {
            var deferred = Q.defer(),
                tags = storage.getItem(database + SEPARATOR + projectId + SEPARATOR + TAGS);

            if (tags.hasOwnProperty(name) === true) {
                deferred.reject(new Error('Tag already exists [' + name + ']'));
            } else {
                tags[name] = commitHash;
                deferred.resolve();
            }

            return deferred.promise.nodeify(callback);
        };

        this.deleteTag = function (name, callback) {
            var deferred = Q.defer(),
                tags = storage.getItem(database + SEPARATOR + projectId + SEPARATOR + TAGS);

            delete tags[name];
            deferred.resolve();

            return deferred.promise.nodeify(callback);
        };

        this.getTags = function (callback) {
            var deferred = Q.defer();

            deferred.resolve(JSON.parse(JSON.stringify(
                storage.getItem(database + SEPARATOR + projectId + SEPARATOR + TAGS)
            )));

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

    function createProject(projectId, callback) {
        var deferred = Q.defer(),
            project;

        logger.debug('createProject', projectId);


        if (storage.connected) {

            project = storage.getItem(database + SEPARATOR + projectId + SEPARATOR);
            if (project) {
                deferred.reject(new Error('Project already exists ' + projectId));
            } else {
                storage.setItem(database + SEPARATOR + projectId + SEPARATOR, '{}');
                storage.setItem(database + SEPARATOR + projectId + SEPARATOR + TAGS, {});
                deferred.resolve(new MemoryProject(projectId));
            }

        } else {
            deferred.reject(new Error('Database is not open.'));
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
            deferred.reject(new Error('Database is not open.'));
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
                deferred.resolve(new MemoryProject(projectId));
            } else {
                deferred.reject(new Error('Project does not exist ' + projectId));
            }

        } else {
            deferred.reject(new Error('Database is not open.'));
        }


        return deferred.promise.nodeify(callback);
    }

    function _moveProject(projectId, newProjectId, remove, callback) {
        var deferred = Q.defer(),
            key,
            keyArray,
            i,
            namesToRemove = [],
            oldProjectKey,
            newProject,
            oldProject,
            namesToAdd = [];

        if (storage.connected) {
            newProject = storage.getItem(database + SEPARATOR + newProjectId + SEPARATOR);
            oldProject = storage.getItem(database + SEPARATOR + projectId + SEPARATOR);
            if (newProject) {
                deferred.reject(new Error('Project already exists ' + newProjectId));
            } else if (!oldProject) {
                deferred.reject(new Error('Project does not exist ' + projectId));
            } else {
                storage.setItem(database + SEPARATOR + newProjectId + SEPARATOR, '{}');

                for (i = 0; i < storage.length; i += 1) {
                    key = storage.key(i);
                    keyArray = key.split(SEPARATOR);
                    if (keyArray[0] === database) {
                        if (keyArray[1] === projectId) {
                            if (keyArray[2]) {
                                namesToRemove.push(key);
                                namesToAdd.push(keyArray[0] + SEPARATOR + newProjectId + SEPARATOR + keyArray[2]);
                            } else {
                                oldProjectKey = keyArray[0] + SEPARATOR + projectId + SEPARATOR;
                            }
                        }
                    }
                }

                for (i = 0; i < namesToRemove.length; i += 1) {
                    storage.setItem(namesToAdd[i], storage.getItem(namesToRemove[i]));
                    if (remove) {
                        storage.removeItem(namesToRemove[i]);
                    }
                }
                if (remove) {
                    storage.removeItem(oldProjectKey);
                }

                deferred.resolve();
            }
        } else {
            deferred.reject(new Error('Database is not open.'));
        }

        return deferred.promise.nodeify(callback);
    }

    function renameProject(projectId, newProjectId, callback) {
        return _moveProject(projectId, newProjectId, true)
            .nodeify(callback);
    }

    function duplicateProject(projectId, newProjectId, callback) {
        return _moveProject(projectId, newProjectId, false)
            .nodeify(callback);
    }

    this.openDatabase = openDatabase;
    this.closeDatabase = closeDatabase;

    this.createProject = createProject;
    this.deleteProject = deleteProject;
    this.openProject = openProject;
    this.renameProject = renameProject;
    this.duplicateProject = duplicateProject;
}

module.exports = Memory;