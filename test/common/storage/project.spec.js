/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */


var testFixture = require('../../_globals.js');

describe('storage project', function () {
    'use strict';
    var NodeStorage = testFixture.requirejs('common/storage/nodestorage'),
        STORAGE_CONSTANTS = testFixture.requirejs('common/storage/constants'),
        ProjectInterface = testFixture.requirejs('common/storage/project/interface'),
        gmeConfig = testFixture.getGmeConfig(),
        WebGME = testFixture.WebGME,
        openSocketIo = testFixture.openSocketIo,
        superagent = testFixture.superagent,
        Q = testFixture.Q,
        projectName2Id = testFixture.projectName2Id,

        expect = testFixture.expect,

        agent,
        logger = testFixture.logger.fork('nodestorage'),

        guestAccount = gmeConfig.authentication.guestAccount,
        server,
        gmeAuth,
        safeStorage,
        storage,

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

    function makeCommitPromise(project, branchName, parents, rootHash, coreObjects, msg) {
        var deferred = Q.defer(),
            synchronousData; // This is not returned here...

        synchronousData = project.makeCommit(branchName, parents, rootHash, coreObjects, msg, function (err, result) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(result);
            }
        });

        return deferred.promise;
    }

    it('should openProject', function (done) {
        var project,
            branches,
            access;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                expect(project.projectId).to.equal(projectName2Id(projectName));
                expect(branches.hasOwnProperty('master')).to.equal(true);
                expect(access).to.deep.equal({read: true, write: true, delete: true});
            })
            .nodeify(done);
    });

    it('should getBranches', function (done) {
        var project,
            branches,
            access;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                return Q.nfcall(project.getBranches);
            })
            .then(function (branches_) {
                expect(branches_.hasOwnProperty('master')).to.equal(true);
            })
            .nodeify(done);
    });


    it('should getCommits', function (done) {
        var project,
            branches,
            access;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                return Q.nfcall(project.getCommits, (new Date()).getTime(), 100);
            })
            .then(function (commits) {
                expect(commits.length).to.equal(3);
                expect(commits[0]).to.have.property('message');
            })
            .nodeify(done);
    });


    it('should makeCommit', function (done) {
        var project,
            branches,
            access,

            numCommitsBefore,
            branch;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                return Q.nfcall(project.getCommits, (new Date()).getTime(), 100);
            })
            .then(function (commits) {
                numCommitsBefore = commits.length;
                return Q.nfcall(project.setBranchHash, 'makeCommit_name', originalHash, '');
            })
            .then(function (result) {
                expect(result.status).to.equal('SYNCED');
                branch = project.getBranch('makeCommit_name', false);
                expect(branch).to.have.property('name');
                // Passing null as branchName since we don't have a registered commitHandler.
                // To update the branch too w/o such, setBranchHash can be invoked.
                return makeCommitPromise(project, null, [originalHash], importResult.rootHash, [], 'new commit');
            })
            .then(function () {
                return Q.nfcall(project.getCommits, (new Date()).getTime(), 100);
            })
            .then(function (commits) {
                numCommitsBefore = commits.length - 1;
            })
            .nodeify(done);
    });

    it('should getCommonAncestorCommit', function (done) {
        var project,
            branches,
            access;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                return Q.nfcall(project.getCommonAncestorCommit, commitHash1, commitHash2);
            })
            .then(function (commit) {
                expect(commit).to.equal(originalHash);
            })
            .nodeify(done);
    });

    it('should setBranchHash', function (done) {
        var project,
            branches,
            access;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                return Q.nfcall(project.setBranchHash, 'setBranchHash_name', originalHash, '');
            })
            .then(function (result) {
                expect(result.status).to.equal('SYNCED');
            })
            .nodeify(done);
    });

    it('should getBranchHash', function (done) {
        var project,
            branches,
            access;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                return Q.nfcall(project.setBranchHash, 'getBranchHash_name', originalHash, '');
            })
            .then(function (result) {
                expect(result.status).to.equal('SYNCED');
                return Q.nfcall(project.getBranchHash, 'getBranchHash_name');
            })
            .then(function (hash) {
                expect(hash).to.equal(originalHash);
            })
            .nodeify(done);
    });

    it('should createBranch', function (done) {
        var project,
            branches,
            access;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                return Q.nfcall(project.createBranch, 'createBranch_name', originalHash);
            })
            .then(function (result) {
                expect(result.status).to.equal('SYNCED');
            })
            .nodeify(done);
    });

    //it('should removeBranch', function (done) {
    //    var project,
    //        branches,
    //        access;
    //
    //    Q.nfcall(storage.openProject, projectName2Id(projectName))
    //        .then(function (result) {
    //            project = result[0];
    //            branches = result[1];
    //            access = result[2];
    //
    //            return Q.nfcall(project.createBranch, 'removeBranch_name', originalHash);
    //        })
    //        .then(function (result) {
    //            expect(result.status).to.equal('SYNCED');
    //            expect(project.removeBranch('removeBranch_name')).to.equal(false);
    //        })
    //        .nodeify(done);
    //});


    //it('should getBranch and removeBranch', function (done) {
    //    var project,
    //        branches,
    //        access,
    //
    //        branch,
    //        branch2;
    //
    //    Q.nfcall(storage.openProject, projectName2Id(projectName))
    //        .then(function (result) {
    //            project = result[0];
    //            branches = result[1];
    //            access = result[2];
    //
    //            return Q.nfcall(project.createBranch, 'getBranch_name', originalHash);
    //        })
    //        .then(function (result) {
    //            expect(result.status).to.equal('SYNCED');
    //            branch = project.getBranch('getBranch_name', false);
    //            expect(branch).to.have.property('name');
    //            branch2 = project.getBranch('getBranch_name', true);
    //            expect(branch).to.equal(branch2);
    //            expect(project.removeBranch('getBranch_name')).to.equal(true);
    //        })
    //        .nodeify(done);
    //});


    describe('branch', function () {

        it('should cleanUp', function (done) {
            var project,
                branches,
                branchName = 'cleanUp_name',
                access,
                hashUpdateHandler = function (data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                },
                branchStatusHandler = function (/*branchStatus, commitQueue, updateQueue*/) {

                },
                branch;

            Q.nfcall(storage.openProject, projectName2Id(projectName))
                .then(function (result) {
                    project = result[0];
                    branches = result[1];
                    access = result[2];

                    return Q.nfcall(project.createBranch, branchName, originalHash);
                })
                .then(function (result) {
                    expect(result.status).to.equal('SYNCED');
                    return Q.nfcall(storage.openBranch, project.projectId, branchName,
                        hashUpdateHandler, branchStatusHandler);
                })
                .then(function (latestCommitData) {
                    expect(latestCommitData).to.include.keys('projectId', 'branchName', 'commitObject', 'coreObjects');
                    branch = project.getBranch('cleanUp_name', true);
                    //expect(branch.commitHandler).to.equal(branchStatusHandler);
                    //expect(branch.localUpdateHandler).to.equal(hashUpdateHandler);
                    //expect(typeof branch.updateHandler).to.equal('function');
                    expect(branch.isOpen).to.equal(true);
                    return Q.nfcall(storage.closeBranch, project.projectId, branchName);
                })
                .then(function () {
                    expect(branch.isOpen).to.equal(false);
                    //expect(branch.commitHandler).to.equal(null);
                    //expect(branch.localUpdateHandler).to.equal(null);
                    //expect(branch.updateHandler).to.equal(null);
                })
                .nodeify(done);
        });

        it('should getLocalHash and getOriginHash', function (done) {
            var project,
                branches,
                branchName = 'getLocalHash_name',
                access,
                hashUpdateHandler = function (data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                },
                branchStatusHandler = function (/*branchStatus, commitQueue, updateQueue*/) {

                },
                branch;

            Q.nfcall(storage.openProject, projectName2Id(projectName))
                .then(function (result) {
                    project = result[0];
                    branches = result[1];
                    access = result[2];

                    return Q.nfcall(project.createBranch, branchName, originalHash);
                })
                .then(function (result) {
                    expect(result.status).to.equal('SYNCED');
                    return Q.nfcall(storage.openBranch, project.projectId, branchName,
                        hashUpdateHandler, branchStatusHandler);
                })
                .then(function (latestCommitData) {
                    expect(latestCommitData).to.include.keys('projectId', 'branchName', 'commitObject', 'coreObjects');
                    branch = project.getBranch(branchName, true);
                    expect(branch.getLocalHash()).to.equal(originalHash);
                    expect(branch.getOriginHash()).to.equal(originalHash);
                    return Q.nfcall(storage.closeBranch, project.projectId, branchName);
                })
                .nodeify(done);
        });

        it('should updateHashes', function (done) {
            var project,
                branches,
                access,

                branch;

            Q.nfcall(storage.openProject, projectName2Id(projectName))
                .then(function (result) {
                    project = result[0];
                    branches = result[1];
                    access = result[2];

                    return Q.nfcall(project.createBranch, 'updateHashes_name', originalHash);
                })
                .then(function (result) {
                    expect(result.status).to.equal('SYNCED');
                    branch = project.getBranch('updateHashes_name', false);

                    branch.updateHashes(originalHash, originalHash);
                    expect(branch.getOriginHash()).to.equal(originalHash);
                    expect(branch.getLocalHash()).to.equal(originalHash);

                    branch.updateHashes(null, null); // setting both to null should not change the values
                    expect(branch.getOriginHash()).to.equal(originalHash);
                    expect(branch.getLocalHash()).to.equal(originalHash);

                    branch.updateHashes(); // setting both to undefined should change the values
                    expect(branch.getOriginHash()).to.equal(undefined);
                    expect(branch.getLocalHash()).to.equal(undefined);
                })
                .nodeify(done);
        });

        it('should queueCommit, getCommitQueue, and getFirstCommit', function (done) {
            var project,
                branches,
                access,

                branch,
                commitData = {
                    a: 42,
                    b: 'bogus'
                };

            Q.nfcall(storage.openProject, projectName2Id(projectName))
                .then(function (result) {
                    project = result[0];
                    branches = result[1];
                    access = result[2];

                    return Q.nfcall(project.createBranch, 'queueCommit_name', originalHash);
                })
                .then(function (result) {
                    expect(result.status).to.equal('SYNCED');
                    branch = project.getBranch('queueCommit_name', false);
                    branch.queueCommit(commitData);
                    expect(branch.getCommitQueue().length).to.equal(1);
                    expect(branch.getFirstCommit()).to.equal(commitData);
                    expect(branch.getCommitQueue().length).to.equal(1);
                    expect(branch.getFirstCommit(true)).to.equal(commitData);
                    expect(branch.getCommitQueue().length).to.equal(0);
                    expect(branch.getFirstCommit(true)).to.equal(undefined);
                })
                .nodeify(done);
        });


        it('should getCommitsForNewFork', function (done) {
            var project,
                branches,
                access,

                branch,
                commitData = {
                    commitObject: {_id: 'asd'},
                    a: 42,
                    b: 'bogus'
                },
                commitData2 = {
                    commitObject: {_id: 'asd2'},
                    a: 42,
                    b: 'bogus'
                };

            Q.nfcall(storage.openProject, projectName2Id(projectName))
                .then(function (result) {
                    project = result[0];
                    branches = result[1];
                    access = result[2];

                    return Q.nfcall(project.createBranch, 'getCommitsForNewFork_name', originalHash);
                })
                .then(function (result) {
                    expect(result.status).to.equal('SYNCED');
                    branch = project.getBranch('getCommitsForNewFork_name', false);
                    branch.updateHashes('hash', 'hash');
                    expect(branch.getCommitsForNewFork('hash_different')).to.equal(false);
                    expect(branch.getCommitsForNewFork()).to.deep.equal({commitHash: 'hash', queue: []});
                    branch.queueCommit(commitData);
                    branch.queueCommit(commitData2);
                    expect(branch.getCommitQueue().length).to.equal(2);
                    expect(branch.getCommitQueue()[0]).to.equal(commitData);
                    expect(branch.getCommitsForNewFork('asd2').queue.length).to.equal(1);
                    expect(branch.getCommitsForNewFork('asd2').queue[0]).to.equal(commitData2);
                    expect(branch.getCommitsForNewFork().queue[0]).to.equal(commitData2);
                })
                .nodeify(done);
        });


        it('should queueUpdate, getUpdateQueue, and getFirstUpdate', function (done) {
            var project,
                branches,
                access,

                branch,
                commitData = {
                    commitObject: {_id: 'asd'},
                    a: 42,
                    b: 'bogus'
                },
                commitData2 = {
                    commitObject: {_id: 'asd2'},
                    a: 42,
                    b: 'bogus'
                };

            Q.nfcall(storage.openProject, projectName2Id(projectName))
                .then(function (result) {
                    project = result[0];
                    branches = result[1];
                    access = result[2];

                    return Q.nfcall(project.createBranch, 'queueUpdate_name', originalHash);
                })
                .then(function (result) {
                    expect(result.status).to.equal('SYNCED');
                    branch = project.getBranch('queueUpdate_name', false);
                    expect(branch.getUpdateQueue().length).to.equal(0);
                    branch.queueUpdate(commitData);
                    branch.queueUpdate(commitData2);
                    expect(branch.getUpdateQueue().length).to.equal(2);
                    expect(branch.getUpdateQueue()[0]).to.equal(commitData);
                    expect(branch.getFirstUpdate()).to.equal(commitData);
                    expect(branch.getFirstUpdate(true)).to.equal(commitData);
                    expect(branch.getFirstUpdate(true)).to.equal(commitData2);
                    expect(branch.getFirstUpdate(true)).to.equal(undefined);
                })
                .nodeify(done);
        });
    });

    describe('interface', function () {

        it('should throw not implemented exceptions', function () {
            var projectInterface = new ProjectInterface(projectName2Id(projectName), storage, logger, gmeConfig);

            expect(projectInterface.getBranch).to.throw(Error, /must be overridden in derived class/);
            expect(projectInterface.makeCommit).to.throw(Error, /must be overridden in derived class/);
            expect(projectInterface.setBranchHash).to.throw(Error, /must be overridden in derived class/);
            expect(projectInterface.getBranchHash).to.throw(Error, /must be overridden in derived class/);
            expect(projectInterface.createBranch).to.throw(Error, /must be overridden in derived class/);
            expect(projectInterface.getBranches).to.throw(Error, /must be overridden in derived class/);
            expect(projectInterface.getCommits).to.throw(Error, /must be overridden in derived class/);
            expect(projectInterface.getCommonAncestorCommit).to.throw(Error, /must be overridden in derived class/);
        });

    });
});