/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */


var testFixture = require('../../../_globals.js');

describe('storage storageclasses editorstorage', function () {
    'use strict';
    var NodeStorage = testFixture.requirejs('common/storage/nodestorage'),
        STORAGE_CONSTANTS = testFixture.requirejs('common/storage/constants'),
        gmeConfig = testFixture.getGmeConfig(),
        WebGME = testFixture.WebGME,
        openSocketIo = testFixture.openSocketIo,
        superagent = testFixture.superagent,
        Q = testFixture.Q,
        projectName2Id = testFixture.projectName2Id,

        expect = testFixture.expect,

        agent,
        socket,
        logger = testFixture.logger.fork('editorstorage.spec'),

        guestAccount = gmeConfig.authentication.guestAccount,
        server,
        gmeAuth,
        safeStorage,
        storage,
        webgmeToken,

        projectName = 'StorageProject',
        importResult,
        originalHash,
        commitHash1,
        commitHash2;

    before(function (done) {
        var commitObject,
            commitData;

        server = WebGME.standaloneServer(gmeConfig);
        server.start(function (err) {
            if (err) {
                done(new Error(err));
                return;
            }

            testFixture.clearDBAndGetGMEAuth(gmeConfig, [projectName])
                .then(function (gmeAuth_) {
                    gmeAuth = gmeAuth_;
                    safeStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                    return safeStorage.openDatabase();
                })
                .then(function () {
                    return Q.allDone([
                        testFixture.importProject(safeStorage, {
                            projectSeed: 'seeds/EmptyProject.webgmex',
                            projectName: projectName,
                            gmeConfig: gmeConfig,
                            logger: logger
                        })
                    ]);
                })
                .then(function (results) {
                    importResult = results[0]; // projectName
                    originalHash = importResult.commitHash;

                    commitObject = importResult.project.createCommitObject([originalHash],
                        importResult.rootHash,
                        'tester1',
                        'commit msg 1');
                    commitData = {
                        projectId: projectName2Id(projectName),
                        commitObject: commitObject,
                        coreObjects: []
                    };

                    return safeStorage.makeCommit(commitData);
                })
                .then(function (result) {
                    commitHash1 = result.hash;

                    commitObject = importResult.project.createCommitObject([originalHash],
                        importResult.rootHash,
                        'tester2',
                        'commit msg 2');
                    commitData = {
                        projectId: projectName2Id(projectName),
                        commitObject: commitObject,
                        coreObjects: []
                    };

                    return safeStorage.makeCommit(commitData);
                })
                .then(function (result) {
                    commitHash2 = result.hash;
                })
                .then(function () {
                    return Q.allDone([
                        importResult.project.createBranch('b1', importResult.commitHash),
                        importResult.project.createBranch('b2', importResult.commitHash),
                        importResult.project.createBranch('b3', importResult.commitHash),
                        importResult.project.createBranch('b4', importResult.commitHash),
                        importResult.project.createBranch('b5', importResult.commitHash)
                        ]);
                })
                .then(function () {
                    return Q.allDone([
                        importResult.project.setBranchHash('b1', commitHash1, importResult.commitHash),
                        importResult.project.setBranchHash('b2', commitHash1, importResult.commitHash),
                        importResult.project.setBranchHash('b3', commitHash1, importResult.commitHash),
                        importResult.project.setBranchHash('b4', commitHash1, importResult.commitHash),
                        importResult.project.setBranchHash('b5', commitHash1, importResult.commitHash)
                        ]);
                })
                .nodeify(done);
        });
    });

    after(function (done) {
        server.stop(function (err) {
            if (err) {
                done(new Error(err));
                return;
            }

            Q.allDone([
                    gmeAuth.unload(),
                    safeStorage.closeDatabase()
                ])
                .nodeify(done);
        });
    });

    beforeEach(function (done) {
        agent = superagent.agent();
        openSocketIo(server, agent, guestAccount, guestAccount)
            .then(function (result) {
                socket = result.socket;
                webgmeToken = result.webgmeToken;
                storage = NodeStorage.createStorage('127.0.0.1', /*server.getUrl()*/
                    result.webgmeToken,
                    logger,
                    gmeConfig);
                storage.open(function (networkState) {
                    if (networkState === STORAGE_CONSTANTS.CONNECTED) {
                        done();
                    } else {
                        throw new Error('Unexpected network state: ' + networkState);
                    }
                });
            })
            .catch(done);
    });

    afterEach(function (done) {
        storage.close(function (err) {
            socket.disconnect();
            done(err);
        });
    });

    function makeCommitPromise(storage, projectId, branchName, parents, rootHash, coreObjects, msg) {
        var deferred = Q.defer(),
            synchronousData; // This is not returned here...

        synchronousData = storage.makeCommit(projectId, branchName, parents, rootHash, coreObjects, msg,
            function (err, result) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(result);
                }
            }
        );

        return deferred.promise;
    }

    it('should closeBranch if it is not open', function (done) {
        var project,
            branches,
            access;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                return Q.nfcall(storage.closeBranch, projectName2Id(projectName), 'not_open');
            })
            .nodeify(done);
    });

    it('should closeBranch if project is not open', function (done) {
        Q.nfcall(storage.closeBranch, projectName2Id(projectName), 'master')
            .nodeify(done);
    });

    it('should open and close project', function (done) {
        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function () {
                return Q.nfcall(storage.closeProject, projectName2Id(projectName));
            })
            .then(function () {
                return Q.nfcall(storage.closeProject, projectName2Id(projectName));
            })
            .nodeify(done);
    });

    it('should return error if opening same project twice', function (done) {
        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function () {
                return Q.nfcall(storage.openProject, projectName2Id(projectName));
            })
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('project is already open');
            })
            .nodeify(done);
    });

    it('should return error if opening branch with no project open', function (done) {
        var projectId = projectName2Id(projectName);
        Q.nfcall(storage.openBranch, projectId, 'master', null, null)
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('project ' + projectId + ' is not opened');
            })
            .nodeify(done);
    });

    it('should return error if opening branch twice', function (done) {
        var project,
            branches,
            access;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                }

                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                }

                return Q.nfcall(storage.openBranch, projectName2Id(projectName), 'master',
                    hashUpdateHandler, branchStatusHandler);
            })
            .then(function () {
                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                }

                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                }
                return Q.nfcall(storage.openBranch, projectName2Id(projectName), 'master',
                    hashUpdateHandler, branchStatusHandler);
            })
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('Branch is already open');
            })
            .nodeify(done);
    });

    it('should forkBranch', function (done) {
        var project,
            branches,
            access;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                }

                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                }

                return Q.nfcall(storage.openBranch, projectName2Id(projectName), 'master',
                    hashUpdateHandler, branchStatusHandler);
            })
            .then(function () {
                return Q.ninvoke(storage, 'forkBranch', projectName2Id(projectName), 'master', 'forkName', null);
            })
            .then(function (hash) {
                expect(hash).to.equal(importResult.commitHash);
            })
            .nodeify(done);
    });

    it('should return error if forking branch of non open project', function (done) {
        Q.ninvoke(storage, 'forkBranch', projectName2Id(projectName), 'master', 'forkName', null)
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('project ' + projectName2Id(projectName) + ' is not opened.');
            })
            .nodeify(done);
    });

    it('should return error if forking branch this is not open', function (done) {

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function () {
                return Q.ninvoke(storage, 'forkBranch', projectName2Id(projectName), 'master', 'forkName_fail', null);
            })
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('branch is not open');
            })
            .nodeify(done);
    });

    it('should return error if forking branch with unknown commit-hash', function (done) {

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function () {

                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                }

                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                }

                return Q.nfcall(storage.openBranch, projectName2Id(projectName), 'master',
                    hashUpdateHandler, branchStatusHandler);
            })
            .then(function () {
                return Q.ninvoke(storage, 'forkBranch', projectName2Id(projectName), 'master', 'forkName_fail2', '#un');
            })
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('Could not find specified commitHash');
            })
            .nodeify(done);
    });

    it('should makeCommit and fork', function (done) {
        var project,
            branches,
            access;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                return Q.ninvoke(storage, 'makeCommit', projectName2Id(projectName), null, [importResult.commitHash],
                    importResult.rootHash, {}, 'new commit');
            })
            .then(function () {
                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                }

                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                }

                return Q.nfcall(storage.openBranch, projectName2Id(projectName), 'master',
                    hashUpdateHandler, branchStatusHandler);
            })
            .then(function () {
                return Q.ninvoke(storage, 'forkBranch', projectName2Id(projectName), 'master', 'commit_and_fork', null);
            })
            .then(function (/*result*/) {
                // TODO: check commit hash
            })
            .nodeify(done);
    });

    it('should makeCommit', function (done) {
        var project,
            branches,
            access;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                return Q.ninvoke(storage, 'makeCommit', projectName2Id(projectName), null, [importResult.commitHash],
                    importResult.rootHash, {}, 'new commit');
            })
            .then(function (result) {
                expect(typeof result.hash).to.equal('string');
            })
            .nodeify(done);
    });

    it('should setBranchHash w/o open branch', function (done) {
        var project,
            branches,
            access;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                return Q.ninvoke(storage, 'setBranchHash', projectName2Id(projectName), 'b1', commitHash2, commitHash1);
            })
            .then(function (result) {
                expect(result.status).to.equal(STORAGE_CONSTANTS.SYNCED);
            })
            .nodeify(done);
    });

    it('should setBranchHash with open branch', function (done) {
        var project,
            branches,
            access;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                }

                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                }

                return Q.nfcall(storage.openBranch, projectName2Id(projectName), 'b2',
                    hashUpdateHandler, branchStatusHandler);
            })
            .then(function () {
                return Q.ninvoke(storage, 'setBranchHash', projectName2Id(projectName), 'b2', commitHash2, commitHash1);
            })
            .then(function (result) {
                expect(result.status).to.equal(STORAGE_CONSTANTS.SYNCED);
            })
            .nodeify(done);
    });

    it('should makeCommit with no open project', function (done) {
        Q.ninvoke(storage, 'makeCommit', projectName2Id(projectName), 'b5', [commitHash1], importResult.rootHash,
            {}, 'commit to non-open project')
            .then(function (result) {
                expect(result.status).to.equal(STORAGE_CONSTANTS.SYNCED);
            })
            .nodeify(done);
    });

    it('should persist commits with no open project', function (done) {
        // jshint ignore:start
        // jscs:disable
        var projectId = projectName2Id(projectName),
            commitQueueDump = {
                "webgmeVersion": "2.10.0-beta3",
                "projectId": projectId,
                "branchName": "master",
                "branchStatus": "AHEAD_SYNC",
                "commitQueue": [
                    {
                        "rootHash": "#62d07a02c278b90e8ae7ed23ceb188405211c9e5",
                        "projectId": projectId,
                        "commitObject": {
                            "root": "#62d07a02c278b90e8ae7ed23ceb188405211c9e5",
                            "parents": [
                                "#653d24e79d36d5988d62722def123c0d8e67558c"
                            ],
                            "updater": [
                                "guest"
                            ],
                            "time": 1487021619137,
                            "message": "[\nsetAttribute(/1,name,\"FCO1\")\n]",
                            "type": "commit",
                            "__v": "1.1.0",
                            "_id": "#133dd1308018f8365cb398b5e574e9aced9aaa7d"
                        },
                        "coreObjects": {
                            "#fecc6542f9dba6a548a4e3f5f6c8ce85994b9332": {
                                "type": "patch",
                                "base": "#d51484d046f593d83a9e9663346a3c93f80d9018",
                                "patch": [
                                    {
                                        "op": "replace",
                                        "path": "/atr/name",
                                        "value": "FCO1"
                                    }
                                ],
                                "_id": "#fecc6542f9dba6a548a4e3f5f6c8ce85994b9332"
                            },
                            "#62d07a02c278b90e8ae7ed23ceb188405211c9e5": {
                                "type": "patch",
                                "base": "#4649fd96b7356499351a6e37abbc6321b95ebc5e",
                                "patch": [
                                    {
                                        "op": "replace",
                                        "path": "/1",
                                        "value": "#fecc6542f9dba6a548a4e3f5f6c8ce85994b9332"
                                    }
                                ],
                                "_id": "#62d07a02c278b90e8ae7ed23ceb188405211c9e5"
                            }
                        },
                        "changedNodes": {
                            "load": {},
                            "unload": {},
                            "update": {
                                "/1": true,
                                "": true
                            },
                            "partialUpdate": {}
                        },
                        "branchName": "master"
                    },
                    {
                        "rootHash": "#641facf9a9745dc25181bda68eed73e4b023964a",
                        "projectId": projectId,
                        "commitObject": {
                            "root": "#641facf9a9745dc25181bda68eed73e4b023964a",
                            "parents": [
                                "#133dd1308018f8365cb398b5e574e9aced9aaa7d"
                            ],
                            "updater": [
                                "guest"
                            ],
                            "time": 1487021622093,
                            "message": "[\nsetRegistry(/1,position,{\"x\":79,\"y\":149})\n]",
                            "type": "commit",
                            "__v": "1.1.0",
                            "_id": "#3fde1479876c769c39c4d545c64e797a5f9f84a5"
                        },
                        "coreObjects": {
                            "#7ac30b6b189e6396445324d4172fbed5674ecc30": {
                                "type": "patch",
                                "base": "#fecc6542f9dba6a548a4e3f5f6c8ce85994b9332",
                                "patch": [
                                    {
                                        "op": "replace",
                                        "path": "/reg/position",
                                        "value": {
                                            "x": 79,
                                            "y": 149
                                        }
                                    }
                                ],
                                "_id": "#7ac30b6b189e6396445324d4172fbed5674ecc30"
                            },
                            "#641facf9a9745dc25181bda68eed73e4b023964a": {
                                "type": "patch",
                                "base": "#62d07a02c278b90e8ae7ed23ceb188405211c9e5",
                                "patch": [
                                    {
                                        "op": "replace",
                                        "path": "/1",
                                        "value": "#7ac30b6b189e6396445324d4172fbed5674ecc30"
                                    }
                                ],
                                "_id": "#641facf9a9745dc25181bda68eed73e4b023964a"
                            }
                        },
                        "changedNodes": {
                            "load": {},
                            "unload": {},
                            "update": {
                                "/1": true,
                                "": true
                            },
                            "partialUpdate": {}
                        },
                        "branchName": "master"
                    }
                ]
            };

        Q.ninvoke(storage, 'persistCommits', commitQueueDump.commitQueue)
            .then(function (commitHash) {
                expect(commitHash).to.equal(commitQueueDump.commitQueue[1].commitObject._id);
                return Q.ninvoke(storage,'createBranch', projectName2Id(projectName), 'fromPersistCommits', commitHash);
            })
            .then(function (result) {
                expect(result.status).to.equal(STORAGE_CONSTANTS.SYNCED);
                expect(result.hash).to.equal(commitQueueDump.commitQueue[1].commitObject._id);
            })
            .nodeify(done);

        // jshint ignore:end
        // jscs:enable
    });

    it('should makeCommit with open branch and get canceled', function (done) {
        var project,
            branches,
            access;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                }

                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                }

                return Q.nfcall(storage.openBranch, projectName2Id(projectName), 'b3',
                    hashUpdateHandler, branchStatusHandler);
            })
            .then(function () {
                return importResult.project.setBranchHash('b3', commitHash2, commitHash1);
            })
            .then(function () {
                return Q.ninvoke(storage, 'makeCommit', projectName2Id(projectName), 'b3', [commitHash1],
                    importResult.rootHash, {}, 'forked commit');
            })
            .then(function (result) {
                expect(result.status).to.equal(STORAGE_CONSTANTS.FORKED);
            })
            .nodeify(done);
    });

    it('should makeCommit with open branch and get canceled if not passing same commitHash as own branch', function (done) {
        var project,
            branches,
            access;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                }

                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                }

                return Q.nfcall(storage.openBranch, projectName2Id(projectName), 'b4',
                    hashUpdateHandler, branchStatusHandler);
            })
            .then(function () {
                return Q.ninvoke(storage, 'makeCommit', projectName2Id(projectName), 'b4', [commitHash2],
                    importResult.rootHash, {}, 'forked commit');
            })
            .then(function (result) {
                expect(result.status).to.equal(STORAGE_CONSTANTS.CANCELED);
            })
            .nodeify(done);
    });

    it('should makeCommit in a branch passing a new rootObject', function (done) {
        var project,
            branches,
            access,
            forkName = 'makeCommit_fork_new_root';

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                }

                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                }

                return Q.nfcall(storage.openBranch, projectName2Id(projectName), 'master',
                    hashUpdateHandler, branchStatusHandler);
            })
            .then(function () {
                return Q.ninvoke(storage, 'forkBranch', projectName2Id(projectName), 'master', forkName, null);
            })
            .then(function () {
                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                }

                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                }

                return Q.ninvoke(storage, 'openBranch', projectName2Id(projectName), forkName,
                    hashUpdateHandler, branchStatusHandler);
            })
            .then(function () {
                var persisted;
                importResult.core.setAttribute(importResult.rootNode, 'name', 'New name');
                persisted = importResult.core.persist(importResult.rootNode);
                return makeCommitPromise(storage, projectName2Id(projectName), forkName,
                    [importResult.commitHash], importResult.rootHash, {}, 'new commit');
            })
            .then(function (result) {
                expect(typeof result.hash).to.equal('string');
                expect(result.status).to.equal(STORAGE_CONSTANTS.SYNCED);
            })
            .nodeify(done);
    });

    it('should makeCommit in a branch referring to an existing rootObject', function (done) {
        var project,
            branches,
            access,
            forkName = 'makeCommit_fork_same_root';

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                }

                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                }

                return Q.nfcall(storage.openBranch, projectName2Id(projectName), 'master',
                    hashUpdateHandler, branchStatusHandler);
            })
            .then(function () {
                return Q.ninvoke(storage, 'forkBranch', projectName2Id(projectName), 'master', forkName, null);
            })
            .then(function () {
                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                }

                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                }

                return Q.ninvoke(storage, 'openBranch', projectName2Id(projectName), forkName,
                    hashUpdateHandler, branchStatusHandler);
            })
            .then(function () {
                return makeCommitPromise(storage, projectName2Id(projectName), forkName,
                    [importResult.commitHash], importResult.rootHash, {}, 'new commit');
            })
            .then(function (result) {
                expect(typeof result.hash).to.equal('string');
                expect(result.status).to.equal(STORAGE_CONSTANTS.SYNCED);
            })
            .nodeify(done);
    });

    it.skip('makeCommit should failed in a branch referring to a non-existing rootObject', function (done) {
        // We no longer load the root node in these cases.
        var project,
            branches,
            access,
            forkName = 'makeCommit_fork_fail';

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                }

                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                }

                return Q.nfcall(storage.openBranch, projectName2Id(projectName), 'master',
                    hashUpdateHandler, branchStatusHandler);
            })
            .then(function () {
                return Q.ninvoke(storage, 'forkBranch', projectName2Id(projectName), 'master', forkName, null);
            })
            .then(function () {
                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                }

                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                }

                return Q.ninvoke(storage, 'openBranch', projectName2Id(projectName), forkName,
                    hashUpdateHandler, branchStatusHandler);
            })
            .then(function () {
                return makeCommitPromise(storage, projectName2Id(projectName), forkName,
                    [importResult.commitHash], '#doesNotExist', {}, 'new commit');
            })
            .then(function () {
                done(new Error('Should have failed when makeCommit refers to non-existing root-object.'));
            })
            .catch(function (err) {
                expect(err.message).to.include('Failed loading referred rootObject');
                done();
            })
            .done();
    });

    it('should pull changes if another client changes the branch', function (done) {
        var project,
            branches,
            access,
            storageOther,
            projectOther,
            newCommitHash,
            openingBranch = true,
            updateReceivedDeferred = Q.defer(),
            forkName = 'pullChanges_fork',
            coreOther,
            gmeConfigOther = testFixture.getGmeConfig();

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                }

                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                }

                return Q.ninvoke(storage, 'openBranch', projectName2Id(projectName), 'master',
                    hashUpdateHandler, branchStatusHandler);
            })
            .then(function () {
                return Q.ninvoke(storage, 'forkBranch', projectName2Id(projectName), 'master', forkName, null);
            })
            .then(function () {
                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                    // TRICKY: new commit hash will be set later by the storageOther user. We are waiting for the update
                    // from the original storage.
                    // return with a single commit object
                    callback(null, true);
                    if (openingBranch === false) {
                        updateReceivedDeferred.resolve(data.commitData);
                    }
                }

                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                }

                return Q.ninvoke(storage, 'openBranch', projectName2Id(projectName), forkName,
                    hashUpdateHandler, branchStatusHandler);
            })
            .then(function () {
                var deferred = Q.defer();

                openingBranch = false;

                storageOther = NodeStorage.createStorage('127.0.0.1', /*server.getUrl()*/
                    webgmeToken,
                    logger,
                    gmeConfigOther);
                storageOther.open(function (networkState) {
                    if (networkState === STORAGE_CONSTANTS.CONNECTED) {
                        deferred.resolve();
                    } else {
                        deferred.reject(new Error('Unexpected network state: ' + networkState));
                    }
                });

                return deferred.promise;
            })
            .then(function () {
                return Q.nfcall(storageOther.openProject, projectName2Id(projectName));
            })
            .then(function (project) {
                projectOther = project[0];
                coreOther = new testFixture.Core(projectOther, {
                    globConf: gmeConfigOther,
                    logger: logger
                });
                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                }

                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                }

                return Q.ninvoke(storageOther, 'openBranch', projectName2Id(projectName), forkName,
                    hashUpdateHandler, branchStatusHandler);
            })
            .then(function () {
                return coreOther.loadRoot(importResult.rootHash);
            })
            .then(function (root) {
                var persisted;
                coreOther.setAttribute(root, 'name', 'New name');
                persisted = coreOther.persist(root);

                expect(persisted.rootHash).not.to.equal(undefined);
                expect(persisted.objects[persisted.rootHash]).to.have.keys(
                    ['oldHash', 'newHash', 'oldData', 'newData']);

                return projectOther.makeCommit(forkName, [importResult.commitHash], persisted.rootHash,
                    persisted.objects, 'new commit');
            })
            .then(function (result) {
                newCommitHash = result.hash;
                return updateReceivedDeferred.promise;
            })
            .then(function (commit) {
                expect(commit.commitObject._id).to.equal(newCommitHash);
                expect(commit.changedNodes.update['']).to.equal(true);
            })
            .nodeify(done);
    });

    it('should pull changes if another client changes the branch with patchRoot', function (done) {
        var project,
            branches,
            access,
            storageOther,
            newCommitHash,
            openingBranch = true,
            updateReceivedDeferred = Q.defer(),
            forkName = 'pullChanges_fork_patchRoot';

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                }

                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                }

                return Q.ninvoke(storage, 'openBranch', projectName2Id(projectName), 'master',
                    hashUpdateHandler, branchStatusHandler);
            })
            .then(function () {
                return Q.ninvoke(storage, 'forkBranch', projectName2Id(projectName), 'master', forkName, null);
            })
            .then(function () {
                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                    // TRICKY: new commit hash will be set later by the storageOther user. We are waiting for the update
                    // from the original storage.
                    // return with a single commit object
                    callback(null, true);
                    if (openingBranch === false) {
                        updateReceivedDeferred.resolve(data.commitData);
                    }
                }

                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                }

                return Q.ninvoke(storage, 'openBranch', projectName2Id(projectName), forkName,
                    hashUpdateHandler, branchStatusHandler);
            })
            .then(function () {
                var deferred = Q.defer();
                openingBranch = false;

                storageOther = NodeStorage.createStorage('127.0.0.1', /*server.getUrl()*/
                    webgmeToken,
                    logger,
                    gmeConfig);
                storageOther.open(function (networkState) {
                    if (networkState === STORAGE_CONSTANTS.CONNECTED) {
                        deferred.resolve();
                    } else {
                        deferred.reject(new Error('Unexpected network state: ' + networkState));
                    }
                });

                return deferred.promise;
            })
            .then(function () {
                return Q.nfcall(storageOther.openProject, projectName2Id(projectName));
            })
            .then(function () {
                function hashUpdateHandler(data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                }

                function branchStatusHandler(/*branchStatus, commitQueue, updateQueue*/) {

                }

                return Q.ninvoke(storageOther, 'openBranch', projectName2Id(projectName), forkName,
                    hashUpdateHandler, branchStatusHandler);
            })
            .then(function () {
                return importResult.core.loadRoot(importResult.rootHash);

            })
            .then(function (root) {
                var persisted;
                importResult.core.setAttribute(root, 'name', 'New name'); // FIXME: Bogus modification to get makeCommit working.
                persisted = importResult.core.persist(root);

                expect(persisted.rootHash).not.to.equal(undefined);
                expect(persisted.objects[persisted.rootHash]).to.have.keys(['newHash', 'oldHash', 'newData', 'oldData']);

                return Q.ninvoke(storageOther, 'makeCommit',
                    projectName2Id(projectName),
                    forkName,
                    [importResult.commitHash],
                    persisted.rootHash,
                    persisted.objects, 'newer commit');
            })
            .then(function (result) {
                newCommitHash = result.hash;
                return updateReceivedDeferred.promise;
            })
            .then(function (commit) {
                expect(commit.commitObject._id).to.equal(newCommitHash);
            })
            .nodeify(done);
    });
});