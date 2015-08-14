/*globals requireJS*/
/* jshint node:true */

/**
 * @author kecso / https://github.com/kecso
 */
'use strict';

global.TESTING = true;
global.WebGMEGlobal = {};

process.env.NODE_ENV = 'test';

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
    Core = requireJS('common/core/core'),
    NodeStorage = requireJS('../src/common/storage/nodestorage'),
    storageUtil = requireJS('common/storage/util'),
    Mongo = require('../src/server/storage/mongo'),
    Memory = require('../src/server/storage/memory'),
    SafeStorage = require('../src/server/storage/safestorage'),
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
                depth: 2,
                debugStdout: true
            }
        }]
    }, false),
    getMongoStorage = function (logger, gmeConfig, gmeAuth) {
        var mongo = new Mongo(logger, gmeConfig);
        return new SafeStorage(mongo, logger, gmeConfig, gmeAuth);
    },
    getMemoryStorage = function (logger, gmeConfig, gmeAuth) {
        var memory = new Memory(logger, gmeConfig);
        return new SafeStorage(memory, logger, gmeConfig, gmeAuth);
    },
    generateKey = requireJS('common/util/key'),

    GMEAuth = require('../src/server/middleware/auth/gmeauth'),
    SessionStore = require('../src/server/middleware/auth/sessionstore'),

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
                values = [];
            for (i = 0; i < results.length; i += 1) {
                if (results[i].state === 'rejected') {
                    deferred.reject(new Error(results[i].reason));
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
            return Q.ninvoke(db, 'dropDatabase');
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
            return Q.allSettled([
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

            return Q.allSettled(projectsToAuthorize);
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
        projectJson = loadJsonFile(parameters.projectSeed);
    } else if (typeof parameters.projectSeed === 'object') {
        projectJson = parameters.projectSeed;
    } else {
        deferred.reject('parameters.projectSeed must be filePath or object!');
    }
    branchName = parameters.branchName || 'master';
    // Parameters check end.
    data.projectName = parameters.projectName;

    storage.createProject(data)
        .then(function (project) {
            var core = new Core(project, {
                    globConf: parameters.gmeConfig,
                    logger: parameters.logger
                }),
                rootNode = core.createNode({parent: null, base: null});

            WebGME.serializer.import(core, rootNode, projectJson, function (err) {
                var persisted;
                if (err) {
                    deferred.reject(err);
                    return;
                }
                persisted = core.persist(rootNode);

                project.makeCommit(branchName, [''], persisted.rootHash, persisted.objects, 'project imported')
                    .then(function (result) {
                        deferred.resolve({
                            status: result.status,
                            branchName: branchName,
                            commitHash: result.hash,
                            project: project,
                            projectId: project.projectId,
                            core: core,
                            jsonProject: projectJson,
                            rootNode: rootNode,
                            rootHash: persisted.rootHash
                        });
                    })
                    .catch(function (err) {
                        deferred.reject(err);
                    });
            });
        })
        .catch(function (err) {
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
}

function saveChanges(parameters, done) {
    var persisted,
        newRootHash;
    expect(typeof parameters.project).to.equal('object');
    expect(typeof parameters.core).to.equal('object');
    expect(typeof parameters.rootNode).to.equal('object');

    persisted = parameters.core.persist(parameters.rootNode);

    newRootHash = parameters.core.getHash(parameters.rootNode);
    parameters.project.makeCommit([], newRootHash, 'create empty project', function (err, commitHash) {
        if (err) {
            done(err);
            return;
        }

        parameters.project.setBranchHash(parameters.branchName || 'master', '', commitHash, function (err) {
            if (err) {
                done(err);
                return;
            }
            done(null, newRootHash, commitHash);
        });
    });
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

/**
 * Forces the deletion of the given projectName (N.B. not projectId).
 * @param storage
 * @param gmeAuth
 * @param projectName
 * @param [userId=gmeConfig.authentication.guestAccount]
 * @param [callback]
 * @returns {*}
 */
function forceDeleteProject(storage, gmeAuth, projectName, userId, callback) {
    var projectId = projectName2Id(projectName, userId);

    userId = userId || gmeConfig.authentication.guestAccount;

    return gmeAuth.addProject(userId, projectName, null)
        .then(function () {
            return gmeAuth.authorizeByUserId(userId, projectId, 'create', {
                read: true,
                write: true,
                delete: true
            });
        })
        .then(function () {
            return storage.deleteProject({projectId: projectId});
        }).nodeify(callback);
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

function openSocketIo(server, agent, userName, password) {
    var io = require('socket.io-client'),
        serverBaseUrl = server.getUrl(),
        deferred = Q.defer(),
        socket,
        socketReq = {url: serverBaseUrl},
        webGMESessionId;

    logIn(server, agent, userName, password)
        .then(function (/*res*/) {
            agent.attachCookies(socketReq);
            webGMESessionId = /webgmeSid=s:([^;]+)\./.exec(decodeURIComponent(socketReq.cookies))[1];

            socket = io.connect(serverBaseUrl,
                {
                    query: 'webGMESessionId=' + webGMESessionId,
                    transports: gmeConfig.socketIO.transports,
                    multiplex: false
                });

            socket.on('error', function (err) {
                logger.error(err);
                deferred.reject(err || 'could not connect');
                socket.disconnect();
            });

            socket.on('connect', function () {
                deferred.resolve({socket: socket, webGMESessionId: webGMESessionId});
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
        underscore: 'client/lib/underscore/underscore-min'
    }
});

module.exports = {
    getGmeConfig: getGmeConfig,

    WebGME: WebGME,
    NodeStorage: NodeStorage,
    getMongoStorage: getMongoStorage,
    getMemoryStorage: getMemoryStorage,
    Project: Project,
    Logger: Logger,
    Core: Core,
    // test logger instance, used by all tests and only tests
    logger: logger,
    generateKey: generateKey,

    GMEAuth: GMEAuth,
    SessionStore: SessionStore,

    ExecutorClient: ExecutorClient,
    BlobClient: BlobClient,

    requirejs: requireJS,
    Q: Q,
    fs: fs,
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
    saveChanges: saveChanges,
    projectName2Id: projectName2Id,
    forceDeleteProject: forceDeleteProject,
    logIn: logIn,
    openSocketIo: openSocketIo,

    storageUtil: storageUtil,
    STORAGE_CONSTANTS: STORAGE_CONSTANTS
};
