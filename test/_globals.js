/*globals requireJS*/
/* jshint node:true */

/**
 * @author kecso / https://github.com/kecso
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

global.TESTING = true;
global.WebGMEGlobal = {};

process.env.NODE_ENV = (process.env.NODE_ENV && process.env.NODE_ENV.indexOf('test') === 0) ?
    process.env.NODE_ENV : 'test';

//adding a local storage class to the global Namespace
var WebGME = require('../webgme'),
    gmeConfig = require('../config'),
    getGmeConfig = function () {
        // makes sure that for each request it returns with a unique object and tests will not interfere
        if (!gmeConfig) {
            // if some tests are deleting or unloading the config
            gmeConfig = require('../config');
        }
        return JSON.parse(JSON.stringify(gmeConfig));
    },
    _Core,
    _NodeStorage,
    _storageUtil,
    _Logger,
    _logger,
    getMongoStorage = function (logger, gmeConfig, gmeAuth) {
        var SafeStorage = require('../src/server/storage/safestorage'),
            Mongo = require('../src/server/storage/mongo'),
            mongo = new Mongo(logger, gmeConfig);
        return new SafeStorage(mongo, logger, gmeConfig, gmeAuth);
    },
    getMemoryStorage = function (logger, gmeConfig, gmeAuth) {
        var SafeStorage = require('../src/server/storage/safestorage'),
            Memory = require('../src/server/storage/memory'),
            memory = new Memory(logger, gmeConfig);
        return new SafeStorage(memory, logger, gmeConfig, gmeAuth);
    },
    getRedisStorage = function (logger, gmeConfig, gmeAuth) {
        var SafeStorage = require('../src/server/storage/safestorage'),
            RedisAdapter = require('../src/server/storage/datastores/redisadapter'),
            redisAdapter = new RedisAdapter(logger, gmeConfig);

        return new SafeStorage(redisAdapter, logger, gmeConfig, gmeAuth);
    },
    _generateKey,

    _GMEAuth,

    _ExecutorClient,
    _BlobClient,
    _Project,
    _STORAGE_CONSTANTS,

    _should,
    _expect,

    _REGEXP,
    _superagent,
    _mongodb,
    Q = require('q'),
    _fs,
    _path,
    _rimraf,
    _childProcess,
    _SEED_DIR,
    exports = {
        WebGME: WebGME,
        // test logger instance, used by all tests and only tests
        requirejs: requireJS,
        Q: Q
    };

Object.defineProperties(exports, {
    Project: {
        get: function () {
            if (!_Project) {
                _Project = require('../src/server/storage/userproject');
            }
            return _Project;
        }
    },
    NodeStorage: {
        get: function () {
            if (!_NodeStorage) {
                _NodeStorage = requireJS('../src/common/storage/nodestorage');
            }
            return _NodeStorage;
        }
    },
    Logger: {
        get: function () {
            if (!_Logger) {
                _Logger = require('../src/server/logger');
            }
            return _Logger;
        }
    },
    logger: {
        get: function () {
            if (!_logger) {
                _logger = exports.Logger.create('gme:test', {
                    //patterns: ['gme:test:*cache'],
                    transports: [{
                        transportType: 'Console',
                        options: {
                            level: 'error',
                            colorize: true,
                            timestamp: true,
                            prettyPrint: true,
                            //handleExceptions: true, // ignored by default
                            //exitOnError: false,
                            depth: 4,
                            debugStdout: true
                        }
                    }]
                }, false);
            }
            return _logger;
        }
    },
    BlobClient: {
        get: function () {
            if (!_BlobClient) {
                _BlobClient = requireJS('blob/BlobClient');
            }
            return _BlobClient;
        }
    },
    ExecutorClient: {
        get: function () {
            if (!_ExecutorClient) {
                _ExecutorClient = requireJS('common/executor/ExecutorClient');
            }
            return _ExecutorClient;
        }
    },
    Core: {
        get: function () {
            if (!_Core) {
                _Core = requireJS('common/core/coreQ');
            }
            return _Core;
        }
    },
    GMEAuth: {
        get: function () {
            if (!_GMEAuth) {
                _GMEAuth = require('../src/server/middleware/auth/gmeauth');
            }
            return _GMEAuth;
        }
    },
    generateKey: {
        get: function () {
            if (!_generateKey) {
                _generateKey = requireJS('common/util/key');
            }
            return _generateKey;
        }
    },
    superagent: {
        get: function () {
            if (!_superagent) {
                _superagent = require('superagent');
            }
            return _superagent;
        }
    },
    mongodb: {
        get: function () {
            if (!_mongodb) {
                _mongodb = require('mongodb');
            }
            return _mongodb;
        }
    },
    rimraf: {
        get: function () {
            if (!_rimraf) {
                _rimraf = require('rimraf');
            }
            return _rimraf;
        }
    },
    childProcess: {
        get: function () {
            if (!_childProcess) {
                _childProcess = require('child_process');
            }
            return _childProcess;
        }
    },
    path: {
        get: function () {
            if (!_path) {
                _path = require('path');
            }
            return _path;
        }
    },
    fs: {
        get: function () {
            if (!_fs) {
                _fs = require('fs');
            }
            return _fs;
        }
    },
    SEED_DIR: {
        get: function () {
            if (!_SEED_DIR) {
                _SEED_DIR = exports.path.join(__dirname, '../seeds/');
            }
            return _SEED_DIR;
        }
    },
    STORAGE_CONSTANTS: {
        get: function () {
            if (!_STORAGE_CONSTANTS) {
                _STORAGE_CONSTANTS = requireJS('common/storage/constants');
            }
            return _STORAGE_CONSTANTS;
        }
    },
    storageUtil: {
        get: function () {
            if (!_storageUtil) {
                _storageUtil = requireJS('common/storage/util');
            }
            return _storageUtil;
        }
    },
    should: {
        get: function () {
            if (!_should) {
                _should = require('chai').should();
            }
            return _should;
        }
    },
    expect: {
        get: function () {
            if (!_expect) {
                _expect = require('chai').expect;
            }
            return _expect;
        }
    },
    REGEXP: {
        get: function () {
            if (!_REGEXP) {
                _REGEXP = requireJS('common/regexp');
            }
            return _REGEXP;
        }
    }
});

/**
 * A combination of Q.allSettled and Q.all. It works like Q.allSettled in the sense that
 * the promise is not rejected until all promises have finished and like Q.all in that it
 * is rejected with the first encountered rejection and resolves with an array of "values".
 *
 * The rejection is always an Error.
 * @param promises
 * @returns {*|promise}
 */
Q.allDone = function (promises) {
    var deferred = Q.defer();
    Q.allSettled(promises)
        .then(function (results) {
            var i,
                err,
                values = [];
            for (i = 0; i < results.length; i += 1) {
                if (results[i].state === 'rejected') {
                    err = results[i].reason instanceof Error ? results[i].reason : new Error(results[i].reason);
                    deferred.reject(err);
                    break;
                } else if (results[i].state === 'fulfilled') {
                    values.push(results[i].value);
                } else {
                    deferred.reject(new Error('Unexpected promise state' + results[i].state));
                    break;
                }
            }
            deferred.resolve(values);
        });

    return deferred.promise;
};

function clearDatabase(gmeConfigParameter, callback) {
    var deferred = Q.defer(),
        db;

    Q.ninvoke(exports.mongodb.MongoClient, 'connect', gmeConfigParameter.mongo.uri, gmeConfigParameter.mongo.options)
        .then(function (db_) {
            db = db_;
            return Q.ninvoke(db, 'collectionNames');
        })
        .then(function (collectionNames) {
            var collectionPromises = [];
            collectionNames.map(function (collData) {
                if (collData.name.indexOf('system.') === -1) {
                    collectionPromises.push(Q.ninvoke(db, 'dropCollection', collData.name));
                } else {

                }
            });
            return Q.allDone(collectionPromises);
        })
        .then(function () {
            return Q.ninvoke(db, 'close');
        })
        .then(function () {
            deferred.resolve();
        })
        .catch(function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
}

function getGMEAuth(gmeConfigParameter, callback) {
    var deferred = Q.defer(),
        gmeAuth;

    gmeAuth = new exports.GMEAuth(null, gmeConfigParameter);
    gmeAuth.connect(function (err) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(gmeAuth);
        }
    });

    return deferred.promise.nodeify(callback);
}

function clearDBAndGetGMEAuth(gmeConfigParameter, projectNameOrNames, callback) {
    var deferred = Q.defer(),
        gmeAuth,
        projectAuthParams,
        clearDB = clearDatabase(gmeConfigParameter),
        guestAccount = gmeConfigParameter.authentication.guestAccount;

    clearDB
        .then(function () {
            return getGMEAuth(gmeConfigParameter);
        })
        .then(function (gmeAuth_) {
            gmeAuth = gmeAuth_;
            projectAuthParams = {
                entityType: gmeAuth.authorizer.ENTITY_TYPES.PROJECT
            };

            return Q.allDone([
                gmeAuth.addUser(guestAccount, guestAccount + '@example.com', guestAccount, true, {overwrite: true}),
                gmeAuth.addUser('admin', 'admin@example.com', 'admin', true, {overwrite: true, siteAdmin: true})
            ]);
        })
        .then(function () {
            var projectsToAuthorize = [],
                projectName,
                projectId,
                i;

            if (typeof projectNameOrNames === 'string') {
                projectName = projectNameOrNames;
                projectId = guestAccount + exports.STORAGE_CONSTANTS.PROJECT_ID_SEP + projectName;
                projectsToAuthorize.push(
                    gmeAuth.authorizer.setAccessRights(guestAccount, projectId, {
                        read: true,
                        write: true,
                        delete: true
                    }, projectAuthParams)
                );
            } else if (projectNameOrNames instanceof Array) {
                for (i = 0; i < projectNameOrNames.length; i += 1) {
                    projectId = guestAccount + exports.STORAGE_CONSTANTS.PROJECT_ID_SEP + projectNameOrNames[i];
                    projectsToAuthorize.push(
                        gmeAuth.authorizer.setAccessRights(guestAccount, projectId, {
                            read: true,
                            write: true,
                            delete: true
                        }, projectAuthParams)
                    );
                }
            } else {
                exports.logger.warn('No projects to authorize...', projectNameOrNames);
            }

            return Q.allDone(projectsToAuthorize);
        })
        .then(function () {
            deferred.resolve(gmeAuth);
        })
        .catch(deferred.reject);

    return deferred.promise.nodeify(callback);
}

//TODO globally used functions to implement
function loadJsonFile(path) {
    //TODO decide if throwing an exception is fine or we should handle it
    return JSON.parse(exports.fs.readFileSync(path, 'utf8'));
}

function importProject(storage, parameters, callback) {
    var deferred = Q.defer(),
        extractDeferred = Q.defer(),
        BC,
        blobClient,
        storageUtils,
        cliImport,
        projectJson,
        branchName,
        data = {};

    // Parameters check.
    exports.expect(typeof storage).to.equal('object');
    exports.expect(typeof parameters).to.equal('object');
    exports.expect(typeof parameters.projectName).to.equal('string');
    exports.expect(typeof parameters.gmeConfig).to.equal('object');
    exports.expect(typeof parameters.logger).to.equal('object');

    if (parameters.hasOwnProperty('username')) {
        exports.expect(typeof parameters.username).to.equal('string');
        data.username = parameters.username;
    }

    if (parameters.hasOwnProperty('ownerId')) {
        exports.expect(typeof parameters.ownerId).to.equal('string');
        data.ownerId = parameters.ownerId;
    }

    if (typeof parameters.projectSeed === 'string' && parameters.projectSeed.toLowerCase().indexOf('.webgmex')) {
        BC = require('../src/server/middleware/blob/BlobClientWithFSBackend');
        blobClient = new BC(parameters.gmeConfig, parameters.logger);
        cliImport = require('../src/bin/import');
        cliImport._addProjectPackageToBlob(blobClient, parameters.projectSeed)
            .then(function (projectJson) {
                extractDeferred.resolve(projectJson);
            })
            .catch(extractDeferred.reject);
    } else if (typeof parameters.projectSeed === 'object') {
        extractDeferred.reject(new Error('json file:', parameters.projectSeed));
        extractDeferred.resolve(parameters.projectSeed);
    } else {
        extractDeferred.reject('parameters.projectSeed must be filePath to a webgmex file');
    }
    branchName = parameters.branchName || 'master';
    // Parameters check end.
    data.projectName = parameters.projectName;

    extractDeferred.promise
        .then(function (projectJson_) {
            projectJson = projectJson_;
            return storage.createProject(data);
        })
        .then(function (project) {
            var core = new exports.Core(project, {
                    globConf: parameters.gmeConfig,
                    logger: parameters.logger
                }),
                result = {
                    status: null,
                    branchName: branchName,
                    commitHash: null,
                    project: project,
                    projectId: project.projectId,
                    core: core,
                    jsonProject: projectJson,
                    rootNode: null,
                    rootHash: null,
                    blobClient: blobClient
                };

            project.setUser(data.username);

            storageUtils = requireJS('common/storage/util');
            storageUtils.insertProjectJson(project, projectJson, {
                commitMessage: 'project imported'
            })
                .then(function (commitResult) {
                    result.commitHash = commitResult.hash;
                    result.rootHash = projectJson.rootHash;
                    return project.createBranch(branchName, commitResult.hash);
                })
                .then(function (result_) {
                    result.status = result_.status;
                    if (parameters.doNotLoad === true) {
                        return null;
                    }
                    return core.loadRoot(result.rootHash);
                })
                .then(function (rootNode) {
                    result.rootNode = rootNode;
                    deferred.resolve(result);
                })
                .catch(deferred.reject);
        })
        .catch(function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
}

/**
 *
 * @param core
 * @param rootNode
 * @param nodePath
 * @param [callback]
 * @returns {Q.Promise}
 */
function loadNode(core, rootNode, nodePath, callback) {
    var deferred = new Q.defer();

    core.loadByPath(rootNode, nodePath, function (err, node) {
        if (err) {
            deferred.reject(new Error(err));
        } else if (node === null) {
            deferred.reject(new Error('Given nodePath does not exist "' + nodePath + '"!'));
        } else {
            deferred.resolve(node);
        }
    });

    return deferred.promise.nodeify(callback);
}

/**
 *
 * @param project
 * @param core
 * @param commitHash
 * @param [callback]
 * @returns {Q.Promise}
 */
function loadRootNodeFromCommit(project, core, commitHash, callback) {
    var deferred = new Q.defer();

    project.loadObject(commitHash, function (err, commitObj) {
        if (err) {
            deferred.reject(new Error(err));
        } else {
            core.loadRoot(commitObj.root, function (err, rootNode) {
                if (err) {
                    deferred.reject(new Error(err));
                } else {
                    deferred.resolve(rootNode);
                }
            });
        }
    });

    return deferred.promise.nodeify(callback);
}

/**
 * This uses the guest account by default
 * @param {string} projectName
 * @param {string} [userId=gmeConfig.authentication.guestAccount]
 * @returns {string} projectId
 */
function projectName2Id(projectName, userId) {
    userId = userId || gmeConfig.authentication.guestAccount;
    return exports.storageUtil.getProjectIdFromOwnerIdAndProjectName(userId, projectName);
}

function logIn(server, agent, userName, password) {
    var serverBaseUrl = server.getUrl(),
        deferred = Q.defer();

    agent.post(serverBaseUrl + '/login')
        .send({
            userId: userName,
            password: password
        })
        .end(function (err, res) {
            if (err) {
                deferred.reject(new Error(err));
            } else if (res.status !== 200) {
                deferred.reject(new Error('Status code was not 200'));
            } else {
                deferred.resolve(res);
            }
        });

    return deferred.promise;
}

function openSocketIo(server, agent, userName, password, token) {
    var io = require('socket.io-client'),
        serverBaseUrl = server.getUrl(),
        deferred = Q.defer(),
        loginPromise,
        socket,
        socketReq = {url: serverBaseUrl},
        webgmeToken;

    if (server.getGmeConfig().authentication.enable === true) {
        loginPromise = logIn(server, agent, userName, password);
    } else {
        loginPromise = new Q();
    }

    loginPromise
        .then(function (/*res*/) {
            var split,
                options = {
                    multiplex: false
                };

            agent._attachCookies(socketReq);
            split = /access_token=([^;]+)/.exec(socketReq.cookies);

            if (token) {
                options.extraHeaders = {
                    Cookie: 'access_token=' + token
                };
            } else if (split && split.length === 2) {
                webgmeToken = split[1];
                options.extraHeaders = {
                    Cookie: 'access_token=' + webgmeToken
                };
            }

            socket = io.connect(serverBaseUrl, options);

            socket.on('error', function (err) {
                exports.logger.error(err);
                deferred.reject(err || 'could not connect');
                socket.disconnect();
            });

            socket.on('connect', function () {
                deferred.resolve({socket: socket, webgmeToken: webgmeToken});
            });
        })
        .catch(function (err) {
            deferred.reject(err);
        });

    return deferred.promise;
}

/**
 *
 * @param {blobHash|filePath|projectJson} file1
 * @param {blobHash|filePath|projectJson} file2
 * @param logger
 * @param gmeConfigParameter
 * @param callback
 * @returns {Q.Promise}
 */
function compareWebgmexFiles(file1, file2, logger, gmeConfigParameter, callback) {
    var BC = require('../src/server/middleware/blob/BlobClientWithFSBackend'),
        blobClient = new BC(gmeConfigParameter, logger),
        AdmZip = require('adm-zip');

    function getProjectJsonPromise(file) {
        var deferred = Q.defer();
        if (exports.REGEXP.BLOB_HASH.test(file) === true) {
            deferred.promise = blobClient.getObject(file)
                .then(function (buffer) {
                    var zip = new AdmZip(buffer);
                    return JSON.parse(zip.readAsText('project.json', 'utf8'));
                });
        } else if (typeof file === 'string') {
            deferred.promise = Q.ninvoke(exports.fs, 'readFile', file)
                .then(function (buffer) {
                    var zip = new AdmZip(buffer);
                    return JSON.parse(zip.readAsText('project.json', 'utf8'));
                });
        } else {
            deferred.resolve(file);
        }

        return deferred.promise;
    }

    return Q.allDone([getProjectJsonPromise(file1), getProjectJsonPromise(file2)])
        .then(function (projectJsons) {
            exports.expect(projectJsons[1].hashes).to.deep.equal(projectJsons[0].hashes);
            exports.expect(projectJsons[1].objects).to.deep.equal(projectJsons[0].objects);
        })
        .nodeify(callback);
}

function getChangedNodesFromPersisted(persisted, printPatches) {
    var storageUtil = requireJS('common/storage/util'),
        keys = Object.keys(persisted.objects),
        i,
        coreObjects = {};

    for (i = 0; i < keys.length; i += 1) {
        if (storageUtil.coreObjectHasOldAndNewData(persisted.objects[keys[i]])) {
            coreObjects[keys[i]] = storageUtil.getPatchObject(persisted.objects[keys[i]].oldData,
                persisted.objects[keys[i]].newData);
        } else {
            coreObjects[keys[i]] = persisted.objects[keys[i]].newData;
        }
    }

    if (printPatches) {
        keys = Object.keys(coreObjects);
        for (i = 0; i < keys.length; i += 1) {
            console.log('############## ' + keys[i].substring(0, 7) + ' ###################');
            if (coreObjects[keys[i]].type === 'patch') {
                console.log(JSON.stringify(coreObjects[keys[i]].patch, null, 2));
            } else {
                coreObjects[keys[i]] = persisted.objects[keys[i]].newData;
                console.log('New data');
            }
        }
    }

    return storageUtil.getChangedNodes(coreObjects, persisted.rootHash);
}

WebGME.addToRequireJsPaths(gmeConfig);

// This is for the client side test-cases (only add paths here!)
requireJS.config({
    paths: {
        js: 'client/js',
        ' /socket.io/socket.io.js': 'socketio-client',
        underscore: 'client/bower_components/underscore/underscore-min'
    }
});

exports.getGmeConfig = getGmeConfig;
exports.getMongoStorage = getMongoStorage;
exports.getMemoryStorage = getMemoryStorage;
exports.getRedisStorage = getRedisStorage;
exports.getBlobTestClient = function () {
    return require('../src/server/middleware/blob/BlobClientWithFSBackend');
};
exports.clearDatabase = clearDatabase;
exports.getGMEAuth = getGMEAuth;
exports.clearDBAndGetGMEAuth = clearDBAndGetGMEAuth;
exports.loadJsonFile = loadJsonFile;
exports.importProject = importProject;
exports.projectName2Id = projectName2Id;
exports.logIn = logIn;
exports.openSocketIo = openSocketIo;
exports.loadRootNodeFromCommit = loadRootNodeFromCommit;
exports.loadNode = loadNode;

exports.compareWebgmexFiles = compareWebgmexFiles;
exports.getChangedNodesFromPersisted = getChangedNodesFromPersisted;

module.exports = exports;
