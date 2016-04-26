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
    Core = requireJS('common/core/coreQ'),
    NodeStorage = requireJS('../src/common/storage/nodestorage'),
    storageUtil = requireJS('common/storage/util'),

    Logger = require('../src/server/logger'),

    logger = Logger.create('gme:test', {
        //patterns: ['gme:test:*cache'],
        transports: [{
            transportType: 'Console',
            options: {
                level: 'error',
                colorize: true,
                timestamp: true,
                prettyPrint: true,
                //handleExceptions: true, // ignored by default when you create the logger, see the logger.create
                //exitOnError: false,
                depth: 4,
                debugStdout: true
            }
        }]
    }, false),
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
    generateKey = requireJS('common/util/key'),

    GMEAuth = require('../src/server/middleware/auth/gmeauth'),

    ExecutorClient = requireJS('common/executor/ExecutorClient'),
    BlobClient = requireJS('blob/BlobClient'),
    Project = require('../src/server/storage/userproject'),
    STORAGE_CONSTANTS = requireJS('common/storage/constants'),

    should = require('chai').should(),
    expect = require('chai').expect,

    superagent = require('superagent'),
    mongodb = require('mongodb'),
    Q = require('q'),
    fs = require('fs'),
    path = require('path'),
    rimraf = require('rimraf'),
    childProcess = require('child_process');

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

    Q.ninvoke(mongodb.MongoClient, 'connect', gmeConfigParameter.mongo.uri, gmeConfigParameter.mongo.options)
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

    gmeAuth = new GMEAuth(null, gmeConfigParameter);
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

        clearDB = clearDatabase(gmeConfigParameter),
        guestAccount = gmeConfigParameter.authentication.guestAccount;

    clearDB
        .then(function () {
            return getGMEAuth(gmeConfigParameter);
        })
        .then(function (gmeAuth_) {
            gmeAuth = gmeAuth_;
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
                projectId = guestAccount + STORAGE_CONSTANTS.PROJECT_ID_SEP + projectName;
                projectsToAuthorize.push(
                    gmeAuth.authorizeByUserId(guestAccount, projectId, 'create', {
                        read: true,
                        write: true,
                        delete: true
                    })
                );
            } else if (projectNameOrNames instanceof Array) {
                for (i = 0; i < projectNameOrNames.length; i += 1) {
                    projectId = guestAccount + STORAGE_CONSTANTS.PROJECT_ID_SEP + projectNameOrNames[i];
                    projectsToAuthorize.push(
                        gmeAuth.authorizeByUserId(guestAccount, projectId, 'create', {
                            read: true,
                            write: true,
                            delete: true
                        })
                    );
                }
            } else {
                logger.warn('No projects to authorize...', projectNameOrNames);
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
    return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function importProject(storage, parameters, callback) {
    var deferred = Q.defer(),
        extractDeferred = Q.defer(),
        BC,
        WR,
        blobClient,
        wr,
        storageUtils,
        cliImport,
        isV2 = false,
        projectJson,
        branchName,
        data = {};

    // Parameters check.
    expect(typeof storage).to.equal('object');
    expect(typeof parameters).to.equal('object');
    expect(typeof parameters.projectName).to.equal('string');
    expect(typeof parameters.gmeConfig).to.equal('object');
    expect(typeof parameters.logger).to.equal('object');

    if (parameters.hasOwnProperty('username')) {
        expect(typeof parameters.username).to.equal('string');
        data.username = parameters.username;
    }

    if (typeof parameters.projectSeed === 'string') {
        if (parameters.projectSeed.toLowerCase().indexOf('.zip') > -1) {
            BC = require('../src/server/middleware/blob/BlobClientWithFSBackend');
            WR = require('../src/server/worker/workerrequests');
            blobClient = new BC(parameters.gmeConfig, parameters.logger);
            wr = new WR(parameters.logger, parameters.gmeConfig);
            wr._addZippedExportToBlob(parameters.projectSeed, blobClient)
                .then(function (projectStr) {
                    var projectJson = JSON.parse(projectStr);
                    extractDeferred.resolve(projectJson);
                })
                .catch(extractDeferred.reject);
        } else if (parameters.projectSeed.toLowerCase().indexOf('.webgmex') > -1) {
            isV2 = true;
            BC = require('../src/server/middleware/blob/BlobClientWithFSBackend');
            blobClient = new BC(parameters.gmeConfig, parameters.logger);
            cliImport = require('../src/bin/import');
            cliImport._addProjectPackageToBlob(blobClient, parameters.projectSeed)
                .then(function (projectJson) {
                    extractDeferred.resolve(projectJson);
                })
                .catch(extractDeferred.reject);
        } else {
            try {
                extractDeferred.resolve(loadJsonFile(parameters.projectSeed));
            } catch (e) {
                extractDeferred.reject(e);
            }
        }
    } else if (typeof parameters.projectSeed === 'object') {
        extractDeferred.resolve(parameters.projectSeed);
    } else {
        extractDeferred.reject('parameters.projectSeed must be filePath or object!');
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
            var core = new Core(project, {
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
                    blobClient: blobClient //Undefined unless importing from zip/webgmex.
                },
                rootNode;

            project.setUser(data.username);

            if (isV2) {
                storageUtils = requireJS('common/storage/util');
                storageUtils.insertProjectJson(project, projectJson, {
                    commitMessage: 'project imported'
                })
                    .then(function (commitHash) {
                        result.commitHash = commitHash;
                        result.rootHash = projectJson.rootHash;
                        return project.createBranch(branchName, commitHash);
                    })
                    .then(function (result_) {
                        result.status = result_.status;
                        return core.loadRoot(result.rootHash);
                    })
                    .then(function (rootNode) {
                        result.rootNode = rootNode;
                        deferred.resolve(result);
                    })
                    .catch(deferred.reject);
            } else {

                rootNode = core.createNode({parent: null, base: null});
                WebGME.serializer.import(core, rootNode, projectJson, function (err) {
                    var persisted;
                    if (err) {
                        deferred.reject(err);
                        return;
                    }
                    persisted = core.persist(rootNode);


                    project.makeCommit(branchName, [''], persisted.rootHash, persisted.objects, 'project imported')
                        .then(function (result_) {
                            result.status = result_.status;
                            result.commitHash = result_.hash;
                            result.rootNode = rootNode;
                            result.rootHash = persisted.rootHash;

                            deferred.resolve(result);
                        })
                        .catch(function (err) {
                            deferred.reject(err);
                        });
                });
            }
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
    return storageUtil.getProjectIdFromOwnerIdAndProjectName(userId, projectName);
}

function logIn(server, agent, userName, password) {
    var serverBaseUrl = server.getUrl(),
        deferred = Q.defer();

    agent.post(serverBaseUrl + '/login?redirect=%2F')
        .type('form')
        .send({username: userName})
        .send({password: password})
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
        socket,
        socketReq = {url: serverBaseUrl},
        webgmeToken;

    logIn(server, agent, userName, password)
        .then(function (/*res*/) {
            var split,
                options = {
                    multiplex: false
                };

            agent.attachCookies(socketReq);
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
                logger.error(err);
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

WebGME.addToRequireJsPaths(gmeConfig);

// This is for the client side test-cases (only add paths here!)
requireJS.config({
    paths: {
        js: 'client/js',
        ' /socket.io/socket.io.js': 'socketio-client',
        underscore: 'client/bower_components/underscore/underscore-min'
    }
});

module.exports = {
    getGmeConfig: getGmeConfig,

    WebGME: WebGME,
    NodeStorage: NodeStorage,
    getMongoStorage: getMongoStorage,
    getMemoryStorage: getMemoryStorage,
    getRedisStorage: getRedisStorage,
    getBlobTestClient: function () {
        return require('../src/server/middleware/blob/BlobClientWithFSBackend');
    },
    Project: Project,
    Logger: Logger,
    Core: Core,
    // test logger instance, used by all tests and only tests
    logger: logger,
    generateKey: generateKey,

    GMEAuth: GMEAuth,

    ExecutorClient: ExecutorClient,
    BlobClient: BlobClient,

    requirejs: requireJS,
    Q: Q,
    fs: fs,
    path: path,
    superagent: superagent,
    mongodb: mongodb,
    rimraf: rimraf,
    childProcess: childProcess,

    should: should,
    expect: expect,

    clearDatabase: clearDatabase,
    getGMEAuth: getGMEAuth,
    clearDBAndGetGMEAuth: clearDBAndGetGMEAuth,

    loadJsonFile: loadJsonFile,
    importProject: importProject,
    projectName2Id: projectName2Id,
    logIn: logIn,
    openSocketIo: openSocketIo,
    loadRootNodeFromCommit: loadRootNodeFromCommit,
    loadNode: loadNode,

    storageUtil: storageUtil,
    SEED_DIR: path.join(__dirname, '../seeds/'),
    STORAGE_CONSTANTS: STORAGE_CONSTANTS
};
