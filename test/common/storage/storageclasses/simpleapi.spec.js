/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */


var testFixture = require('../../../_globals.js');

describe('storage storageclasses simpleapi', function () {
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
        logger = testFixture.logger.fork('simpleapi.spec'),

        guestAccount = gmeConfig.authentication.guestAccount,
        server,
        gmeAuth,
        safeStorage,
        storage,
        webGMESessionId,

        projectName = 'SimpleAPIProject',
        projectNameCreate = 'SimpleAPICreateProject',
        projectNameCreate2 = 'SimpleAPICreateProject2',
        projectNameDelete = 'SimpleAPIDeleteProject',
        projectNameTransfer = 'SimpleAPIProjectNameTransfer',
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

            testFixture.clearDBAndGetGMEAuth(gmeConfig, [projectName, projectNameCreate, projectNameCreate2, projectNameDelete])
                .then(function (gmeAuth_) {
                    gmeAuth = gmeAuth_;
                    return gmeAuth.addOrganization('orgId');
                })
                .then(function () {
                    return gmeAuth.addUserToOrganization(gmeConfig.authentication.guestAccount, 'orgId');
                })
                .then(function () {
                    return gmeAuth.setAdminForUserInOrganization(gmeConfig.authentication.guestAccount, 'orgId', true);
                })
                .then(function () {
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


    it('should getProjects', function (done) {
        Q.ninvoke(storage, 'getProjects', {})
            .then(function (projects) {
                expect(projects.length).to.equal(1);
                expect(projects[0]._id).to.equal(projectName2Id(projectName));
            })
            .nodeify(done);
    });

    it('should getBranches', function (done) {
        Q.ninvoke(storage, 'getBranches', projectName2Id(projectName))
            .then(function (branches) {
                expect(Object.keys(branches).length).to.equal(1);
                expect(branches.master).to.equal(importResult.commitHash);

            })
            .nodeify(done);
    });

    it('should getCommits', function (done) {
        Q.ninvoke(storage, 'getCommits', projectName2Id(projectName), (new Date()).getTime(), 100)
            .then(function (commits) {
                expect(commits.length).to.equal(3);
            })
            .nodeify(done);
    });

    it('should getBranchHash', function (done) {
        Q.ninvoke(storage, 'getBranchHash', projectName2Id(projectName), 'master')
            .then(function (hash) {
                expect(hash).to.equal(importResult.commitHash);
            })
            .nodeify(done);
    });

    it('should getLatestCommitData', function (done) {
        Q.ninvoke(storage, 'getLatestCommitData', projectName2Id(projectName), 'master')
            .then(function (commitData) {
                expect(commitData.branchName).to.equal('master');
                expect(commitData.commitObject._id).to.equal(importResult.commitHash);
            })
            .nodeify(done);
    });

    it('should getCommonAncestorCommit', function (done) {
        Q.ninvoke(storage, 'getCommonAncestorCommit', projectName2Id(projectName), commitHash1, commitHash2)
            .then(function (commitHash) {
                expect(commitHash).to.equal(importResult.commitHash);
            })
            .nodeify(done);
    });

    it('should createProject', function (done) {
        Q.ninvoke(storage, 'createProject', projectNameCreate)
            .then(function (projectId) {
                expect(projectId).to.equal(projectName2Id(projectNameCreate));
            })
            .nodeify(done);
    });

    it('should fail to call createProject if project already exists', function (done) {
        Q.ninvoke(storage, 'createProject', projectNameCreate2)
            .then(function (projectId) {
                expect(projectId).to.equal(projectName2Id(projectNameCreate2));
                return Q.ninvoke(storage, 'createProject', projectNameCreate2);
            })
            .then(function () {
                done(new Error('should have failed to create the project twice.'));
            })
            .catch(function (err) {
                expect(err).to.match(/Project already exists/);
            })
            .nodeify(done);
    });

    it('should createProject and deleteProject', function (done) {
        Q.ninvoke(storage, 'createProject', projectNameDelete)
            .then(function (projectId) {
                return Q.ninvoke(storage, 'deleteProject', projectId);
            })
            .then(function (existed) {
                expect(existed).to.equal(true);
            })
            .nodeify(done);
    });

    it('should createProject and transferProject', function (done) {
        var newOwner = 'orgId';
        Q.ninvoke(storage, 'createProject', projectNameTransfer)
            .then(function (projectId) {
                return Q.ninvoke(storage, 'transferProject', projectId, newOwner);
            })
            .then(function (newProjectId) {
                expect(newProjectId).to.equal(testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(newOwner,
                    projectNameTransfer));
            })
            .nodeify(done);
    });

    it('should fail to transferProject when it does not exist', function (done) {
        Q.ninvoke(storage, 'transferProject', 'doesNotExist', 'someOwnerId')
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.contain('Not authorized to delete project: doesNotExist');
            })
            .nodeify(done);
    });

    it('should setBranchHash', function (done) {
        Q.ninvoke(storage, 'setBranchHash', projectName2Id(projectName), 'newBranch', importResult.commitHash, '')
            .then(function (result) {
                expect(result.status).to.equal('SYNCED');
            })
            .nodeify(done);
    });

    it('should setBranchHash and deleteBranch', function (done) {
        Q.ninvoke(storage, 'setBranchHash', projectName2Id(projectName), 'newBranchToDelete', importResult.commitHash, '')
            .then(function (result) {
                expect(result.status).to.equal('SYNCED');
                return Q.ninvoke(storage, 'deleteBranch', projectName2Id(projectName), 'newBranchToDelete', importResult.commitHash);
            })
            .then(function (result) {
                expect(result.status).to.equal('SYNCED'); // FIXME: deleteBranch returns with this data???
            })
            .nodeify(done);
    });


    it('should exportProject as library using simple request', function (done) {
        var command = {
            command: 'exportLibrary',
            projectId: projectName2Id(projectName),
            branchName: 'master',
            path: '' // ROOT_PATH
        };

        Q.ninvoke(storage, 'simpleRequest', command)
            .then(function (resultId) {
                expect(typeof resultId).to.equal('string');
                expect(resultId).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
                    'should be an id');
                return Q.ninvoke(storage, 'simpleResult', resultId);
            })
            .then(function (result) {
                expect(result).to.have.property('root');
                done();
            })
            .catch(function (err) {
                done(new Error(err));
            });
    });

    it('should fail to execute simpleQuery without addOn configured', function (done) {
        Q.ninvoke(storage, 'simpleQuery', 'someWorkerId', {})
            .then(function () {
                done(new Error('missing error handling'));
            })
            .catch(function (err) {
                expect(err.message).to.include('wrong request');
                done();
            })
            .done();
    });
});