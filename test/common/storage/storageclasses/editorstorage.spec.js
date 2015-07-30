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
        logger = testFixture.logger.fork('editorstorage.spec'),

        guestAccount = gmeConfig.authentication.guestAccount,
        server,
        gmeAuth,
        safeStorage,
        storage,
        webGMESessionId,

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
                    return Q.allSettled([
                        safeStorage.deleteProject({projectId: projectName2Id(projectName)})
                    ]);
                })
                .then(function () {
                    return Q.allSettled([
                        testFixture.importProject(safeStorage, {
                            projectSeed: 'seeds/EmptyProject.json',
                            projectName: projectName,
                            gmeConfig: gmeConfig,
                            logger: logger
                        })
                    ]);
                })
                .then(function (results) {
                    importResult = results[0].value; // projectName
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
                .nodeify(done);
        });
    });

    after(function (done) {
        server.stop(function (err) {
            if (err) {
                done(new Error(err));
                return;
            }

            Q.allSettled([
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
                webGMESessionId = result.webGMESessionId;
                storage = NodeStorage.createStorage('127.0.0.1', /*server.getUrl()*/
                    result.webGMESessionId,
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
        storage.close(done);
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

                return Q.nfcall(storage.closeBranch, projectName2Id(projectName));
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
            .then(function (result) {
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

    it('makeCommit should failed in a branch referring to a non-existing rootObject', function (done) {
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
                expect(typeof err).to.equal('string');
                expect(err).to.include('Failed loading referred rootObject');
                done();
            })
            .done();
    });

    it('should pull changes if another client changes the branch', function (done) {
        var project,
            branches,
            access,
            storageOther,
            newCommitHash,
            openingBranch = true,
            updateReceivedDeferred = Q.defer(),
            forkName = 'pullChanges_fork';

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
                    webGMESessionId,
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
                var persisted;
                importResult.core.setAttribute(importResult.rootNode, 'name', 'New name'); // FIXME: Bogus modification to get makeCommit working.
                persisted = importResult.core.persist(importResult.rootNode);
                return Q.ninvoke(storageOther, 'makeCommit', projectName2Id(projectName), forkName,
                    [importResult.commitHash], persisted.rootHash, persisted.objects, 'new commit');
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