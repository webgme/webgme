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
    openContext = require('../src/server/util/opencontext'),
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

function clearDatabase(gmeConfigParameter, callback) {
    var deferred = Q.defer(),
        db;

    Q.ninvoke(mongodb.MongoClient, 'connect', gmeConfigParameter.mongo.uri, gmeConfigParameter.mongo.options)
        .then(function (db_) {
            db = db_;
            return Q.all([
                Q.ninvoke(db, 'collection', '_users')
                    .then(function (collection_) {
                        return Q.ninvoke(collection_, 'remove');
                    }),
                Q.ninvoke(db, 'collection', '_organizations')
                    .then(function (orgs_) {
                        return Q.ninvoke(orgs_, 'remove');
                    }),
                Q.ninvoke(db, 'collection', '_projects')
                    .then(function (projects_) {
                        return Q.ninvoke(projects_, 'remove');
                    })
            ]);
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
            return Q.all([
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

            return Q.all(projectsToAuthorize);
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
        .then(function (dbProject) {
            var project = new Project(dbProject, storage, parameters.logger, parameters.gmeConfig),
                core = new Core(project, {
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

                var commitObject = project.createCommitObject([''], persisted.rootHash, 'test', 'project imported'),
                    commitData = {
                        projectId: project.projectId,
                        branchName: branchName,
                        commitObject: commitObject,
                        coreObjects: persisted.objects
                    };
                storage.makeCommit(commitData)
                    .then(function (result) {
                        deferred.resolve({
                            status: result.status,
                            branchName: branchName,
                            commitHash: commitObject._id,
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

function checkWholeProject(/*parameters, done*/) {
    //TODO this should export the given project and check against a file or a jsonObject to be deeply equal
}

function exportProject(/*parameters, done*/) {
    //TODO gives back a jsonObject which is the export of the project
    //should work with project object, or mongoUri as well
    //in case of mongoUri it should open the connection before and close after - or just simply use the exportCLI
}

function deleteProject(parameters, done) {
    /*
     parameters:
     storage - a storage object, where the project should be created (if not given and mongoUri is not defined we
     create a new local one and use it
     projectName - the name of the project
     */

    if (!parameters.storage) {
        return done(new Error('cannot delete project without database'));
    }

    if (!parameters.projectName) {
        return done(new Error('no project name was given'));
    }

    parameters.storage.openDatabase(function (err) {
        if (err) {
            return done(err);
        }

        parameters.storage.deleteProject({projectName:parameters.projectName}, done);
    });
}

/**
 * This uses the guest account.
 * @param projectName
 * @returns {string}
 */
function projectName2Id(projectName) {
    return gmeConfig.authentication.guestAccount + STORAGE_CONSTANTS.PROJECT_ID_SEP + projectName;
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
    checkWholeProject: checkWholeProject,
    exportProject: exportProject,
    deleteProject: deleteProject,
    saveChanges: saveChanges,
    projectName2Id: projectName2Id,


    STORAGE_CONSTANTS: STORAGE_CONSTANTS,
    openContext: openContext.openContext
};
