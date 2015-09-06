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
        storage,

        projectName = 'StorageProject',
        importResult,
        originalHash,
        commitHash1,
        commitHash2;

    before(function (done) {
        var safeStorage;
        server = WebGME.standaloneServer(gmeConfig);
        testFixture.clearDBAndGetGMEAuth(gmeConfig, [projectName])
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                safeStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                return safeStorage.openDatabase();
            })
            .then(function () {
                return Q.allDone([
                    testFixture.importProject(safeStorage, {
                        projectSeed: 'seeds/EmptyProject.json',
                        projectName: projectName,
                        gmeConfig: gmeConfig,
                        logger: logger
                    })
                ]);
            })
            .then(function (results) {
                importResult = results[0];
                originalHash = importResult.commitHash;

                return importResult.project.makeCommit(null, [originalHash], importResult.rootHash, {},
                    'commit msg 1');
            })
            .then(function (result) {
                commitHash1 = result.hash;

                return importResult.project.makeCommit(null, [originalHash], importResult.rootHash, {},
                    'commit msg 2');
            })
            .then(function (result) {
                commitHash2 = result.hash;

                return safeStorage.closeDatabase();
            })
            .then(function () {
                return Q.ninvoke(server, 'start');
            })
            .nodeify(done);
    });

    after(function (done) {
        server.stop(function (err) {
            if (err) {
                done(new Error(err));
                return;
            }

            Q.allDone([
                gmeAuth.unload()
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

    it('should openProject', function (done) {
        var project,
            branches,
            access;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];
                expect(project instanceof ProjectInterface).to.equal(true);
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

                return project.getBranches();
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

                return project.getCommits((new Date()).getTime(), 100);
            })
            .then(function (commits) {
                expect(commits.length).to.equal(3);
                expect(commits[0]).to.have.property('message');
            })
            .nodeify(done);
    });

    it('should makeCommit to branch without branch open', function (done) {
        var project,
            branches,
            access,

            numCommitsBefore;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                return project.getCommits((new Date()).getTime(), 100);
            })
            .then(function (commits) {
                numCommitsBefore = commits.length;
                return project.createBranch('makeCommit_name', originalHash);
            })
            .then(function (result) {
                expect(result.status).to.equal('SYNCED');
                return project.makeCommit('makeCommit_name', [originalHash], importResult.rootHash, [], 'new commit');
            })
            .then(function () {
                return project.getCommits((new Date()).getTime(), 100);
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

                return project.getCommonAncestorCommit(commitHash1, commitHash2);
            })
            .then(function (commit) {
                expect(commit).to.equal(originalHash);
            })
            .nodeify(done);
    });

    it('should fail getCommonAncestorCommit when hash does not exist', function (done) {
        var project,
            branches,
            access;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                return project.getCommonAncestorCommit(commitHash1, '#doesNotExist');
            })
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('Commit object does not exist');
                done();
            })
            .done();
    });

    it('should setBranchHash without branch open', function (done) {
        var project,
            branches,
            access;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                return project.setBranchHash('setBranchHash_name', originalHash, '');
            })
            .then(function (result) {
                expect(result.status).to.equal('SYNCED');
                expect(result.hash).to.equal(originalHash);
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

                return project.setBranchHash('getBranchHash_name', originalHash, '');
            })
            .then(function (result) {
                expect(result.status).to.equal('SYNCED');
                return project.getBranchHash('getBranchHash_name');
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

                return project.createBranch('createBranch_name', originalHash);
            })
            .then(function (result) {
                expect(result.status).to.equal('SYNCED');
                expect(result.hash).to.equal(originalHash);
            })
            .nodeify(done);
    });

    it('should deleteBranch', function (done) {
        var project,
            branches,
            access;

        Q.nfcall(storage.openProject, projectName2Id(projectName))
            .then(function (result) {
                project = result[0];
                branches = result[1];
                access = result[2];

                return project.createBranch('removeBranch_name', originalHash);
            })
            .then(function (result) {
                expect(result.status).to.equal('SYNCED');
                return project.deleteBranch('removeBranch_name', originalHash);
            })
            .then(function (result) {
                expect(result.status).to.equal('SYNCED');
            })
            .nodeify(done);
    });


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

                    return project.createBranch(branchName, originalHash);
                })
                .then(function (result) {
                    expect(result.status).to.equal('SYNCED');
                    return Q.nfcall(storage.openBranch, project.projectId, branchName,
                        hashUpdateHandler, branchStatusHandler);
                })
                .then(function (latestCommitData) {
                    expect(latestCommitData).to.include.keys('projectId', 'branchName', 'commitObject', 'coreObjects');
                    branch = project.branches['cleanUp_name'];
                    expect(typeof branch).to.equal('object');
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

                    return project.createBranch(branchName, originalHash);
                })
                .then(function (result) {
                    expect(result.status).to.equal('SYNCED');
                    return Q.nfcall(storage.openBranch, project.projectId, branchName,
                        hashUpdateHandler, branchStatusHandler);
                })
                .then(function (latestCommitData) {
                    expect(latestCommitData).to.include.keys('projectId', 'branchName', 'commitObject', 'coreObjects');
                    branch = project.branches[branchName];
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

                    return project.createBranch('updateHashes_name', originalHash);
                })
                .then(function (result) {
                    expect(result.status).to.equal('SYNCED');
                    return Q.nfcall(storage.openBranch, project.projectId, 'updateHashes_name',
                        hashUpdateHandler, branchStatusHandler);
                })
                .then(function (result) {
                    branch = project.branches['updateHashes_name'];

                    branch.updateHashes(originalHash, originalHash);
                    expect(branch.getOriginHash()).to.equal(originalHash);
                    expect(branch.getLocalHash()).to.equal(originalHash);

                    branch.updateHashes(null, null); // setting both to null should not change the values
                    expect(branch.getOriginHash()).to.equal(originalHash);
                    expect(branch.getLocalHash()).to.equal(originalHash);

                    branch.updateHashes(); // setting both to undefined should change the values
                    expect(branch.getOriginHash()).to.equal(undefined);
                    expect(branch.getLocalHash()).to.equal(undefined);
                    return Q.nfcall(storage.closeBranch, project.projectId, 'updateHashes_name');
                })
                .nodeify(done);
        });

        it('should queueCommit, getCommitQueue, and getFirstCommit', function (done) {
            var project,
                branches,
                access,
                hashUpdateHandler = function (data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                },
                branchStatusHandler = function (/*branchStatus, commitQueue, updateQueue*/) {

                },
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

                    return project.createBranch('queueCommit_name', originalHash);
                })
                .then(function (result) {
                    expect(result.status).to.equal('SYNCED');
                    return Q.nfcall(storage.openBranch, project.projectId, 'queueCommit_name',
                        hashUpdateHandler, branchStatusHandler);
                })
                .then(function (result) {
                    branch = project.branches['queueCommit_name'];
                    branch.queueCommit(commitData, function () {});
                    expect(branch.getCommitQueue().length).to.equal(1);
                    expect(branch.getFirstCommit()).to.equal(commitData);
                    expect(branch.getCommitQueue().length).to.equal(1);
                    expect(branch.getFirstCommit(true)).to.equal(commitData);
                    expect(branch.getCommitQueue().length).to.equal(0);
                    expect(branch.getFirstCommit(true)).to.equal(undefined);
                    return Q.nfcall(storage.closeBranch, project.projectId, 'queueCommit_name');
                })
                .nodeify(done);
        });


        it('should getCommitsForNewFork', function (done) {
            var project,
                branches,
                access,
                hashUpdateHandler = function (data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                },
                branchStatusHandler = function (/*branchStatus, commitQueue, updateQueue*/) {

                },
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

                    return project.createBranch('getCommitsForNewFork_name', originalHash);
                })
                .then(function (result) {
                    expect(result.status).to.equal('SYNCED');
                    return Q.nfcall(storage.openBranch, project.projectId, 'getCommitsForNewFork_name',
                        hashUpdateHandler, branchStatusHandler);
                })
                .then(function (result) {
                    branch = project.branches['getCommitsForNewFork_name'];
                    branch.updateHashes('hash', 'hash');
                    expect(branch.getCommitsForNewFork('hash_different')).to.equal(false);
                    expect(branch.getCommitsForNewFork()).to.deep.equal({commitHash: 'hash', queue: []});
                    branch.queueCommit(commitData, function () {});
                    branch.queueCommit(commitData2, function () {});
                    expect(branch.getCommitQueue().length).to.equal(2);
                    expect(branch.getCommitQueue()[0]).to.equal(commitData);
                    expect(branch.getCommitsForNewFork('asd2').queue.length).to.equal(1);
                    expect(branch.getCommitsForNewFork('asd2').queue[0]).to.equal(commitData2);
                    expect(branch.getCommitsForNewFork().queue[0]).to.equal(commitData2);
                    return Q.nfcall(storage.closeBranch, project.projectId, 'queueCommit_name');
                })
                .nodeify(done);
        });


        it('should queueUpdate, getUpdateQueue, and getFirstUpdate', function (done) {
            var project,
                branches,
                access,
                hashUpdateHandler = function (data, commitQueue, updateQueue, callback) {
                    callback(null, true);
                },
                branchStatusHandler = function (/*branchStatus, commitQueue, updateQueue*/) {

                },
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

                    return project.createBranch('queueUpdate_name', originalHash);
                })
                .then(function (result) {
                    expect(result.status).to.equal('SYNCED');
                    return Q.nfcall(storage.openBranch, project.projectId, 'queueUpdate_name',
                        hashUpdateHandler, branchStatusHandler);
                })
                .then(function (result) {
                    branch = project.branches['queueUpdate_name'];
                    expect(branch.getUpdateQueue().length).to.equal(0);
                    branch.queueUpdate(commitData);
                    branch.queueUpdate(commitData2);
                    expect(branch.getUpdateQueue().length).to.equal(2);
                    expect(branch.getUpdateQueue()[0]).to.equal(commitData);
                    expect(branch.getFirstUpdate()).to.equal(commitData);
                    expect(branch.getFirstUpdate(true)).to.equal(commitData);
                    expect(branch.getFirstUpdate(true)).to.equal(commitData2);
                    expect(branch.getFirstUpdate(true)).to.equal(undefined);
                    return Q.nfcall(storage.closeBranch, project.projectId, 'queueCommit_name');
                })
                .nodeify(done);
        });
    });

    describe('interface', function () {

        it('should throw not implemented exceptions', function () {
            var projectInterface = new ProjectInterface(projectName2Id(projectName), storage, logger, gmeConfig);

            expect(projectInterface.makeCommit).to.throw(Error, /must be overridden in derived class/);
            expect(projectInterface.setBranchHash).to.throw(Error, /must be overridden in derived class/);
            expect(projectInterface.getBranchHash).to.throw(Error, /must be overridden in derived class/);
            expect(projectInterface.createBranch).to.throw(Error, /must be overridden in derived class/);
            expect(projectInterface.deleteBranch).to.throw(Error, /must be overridden in derived class/);
            expect(projectInterface.getBranches).to.throw(Error, /must be overridden in derived class/);
            expect(projectInterface.getCommits).to.throw(Error, /must be overridden in derived class/);
            expect(projectInterface.getCommonAncestorCommit).to.throw(Error, /must be overridden in derived class/);
        });

    });
});