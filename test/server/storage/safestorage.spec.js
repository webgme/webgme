/*globals*/
/*jshint node:true, newcap:false, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals.js');

describe('SafeStorage', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect,
        logger = testFixture.logger.fork('memory'),
        Q = testFixture.Q,
        gmeAuth,
        projectName = 'newProject',
        projectId = gmeConfig.authentication.guestAccount + testFixture.STORAGE_CONSTANTS.PROJECT_ID_SEP + projectName;


    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
            gmeAuth.unload()
        ])
            .nodeify(done);
    });


    describe('Projects', function () {
        var safeStorage,
            importResult,
            commitHash;

        before(function (done) {
            safeStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
            safeStorage.openDatabase()
                .then(function () {
                    return testFixture.importProject(safeStorage, {
                        projectSeed: 'seeds/EmptyProject.json',
                        projectName: projectName,
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (result) {
                    expect(result.projectId).to.equal(projectId);
                    commitHash = result.commitHash;
                    importResult = result;
                    return Q();
                })
                .nodeify(done);
        });

        after(function (done) {
            safeStorage.closeDatabase(done);
        });

        it('should getProjects (no rights, no info, no branches)', function (done) {
            var data = {};

            safeStorage.getProjects(data)
                .then(function (projects) {
                    expect(projects).to.have.property('length');
                    expect(projects.length).to.equal(1);
                    expect(projects[0]).to.deep.equal({
                        _id: 'guest+newProject',
                        fullName: 'guest/newProject',
                        name: 'newProject',
                        owner: 'guest'
                    });
                })
                .nodeify(done);
        });

        it('should getProjects (rights=true, no info, no branches)', function (done) {
            var data = {
                rights: true
            };

            safeStorage.getProjects(data)
                .then(function (projects) {
                    expect(projects).to.have.property('length');
                    expect(projects.length).to.equal(1);
                    expect(projects[0]).to.deep.equal({
                        _id: 'guest+newProject',
                        fullName: 'guest/newProject',
                        name: 'newProject',
                        owner: 'guest',
                        rights: {
                            delete: true,
                            read: true,
                            write: true
                        }
                    });
                })
                .nodeify(done);
        });

        it('should getProjects (rights=true, info=true, no branches)', function (done) {
            var data = {
                rights: true,
                info: true
            };

            safeStorage.getProjects(data)
                .then(function (projects) {
                    expect(projects).to.have.property('length');
                    expect(projects.length).to.equal(1);
                    expect(typeof projects[0].info).to.equal('object');
                    delete projects[0].info;
                    expect(projects[0]).to.deep.equal({
                        _id: 'guest+newProject',
                        fullName: 'guest/newProject',
                        name: 'newProject',
                        owner: 'guest',
                        rights: {
                            delete: true,
                            read: true,
                            write: true
                        }
                    });
                })
                .nodeify(done);
        });

        it('should getProjects (rights=true, info=true, branches=true)', function (done) {
            var data = {
                rights: true,
                info: true,
                branches: true
            };

            safeStorage.getProjects(data)
                .then(function (projects) {
                    expect(projects).to.have.property('length');
                    expect(projects.length).to.equal(1);
                    expect(typeof projects[0].info).to.equal('object');
                    expect(typeof projects[0].branches).to.equal('object');
                    expect(projects[0].branches).to.include.keys('master');
                    delete projects[0].info;
                    delete projects[0].branches;
                    expect(projects[0]).to.deep.equal({
                        _id: 'guest+newProject',
                        fullName: 'guest/newProject',
                        name: 'newProject',
                        owner: 'guest',
                        rights: {
                            delete: true,
                            read: true,
                            write: true
                        }
                    });
                })
                .nodeify(done);
        });

        it('should getLatestCommitData', function (done) {
            var data = {
                projectId: projectId,
                branchName: 'master'
            };

            safeStorage.getLatestCommitData(data)
                .then(function (commitData) {
                    expect(commitData).to.have.property('projectId');
                    expect(commitData).to.have.property('branchName');
                    expect(commitData).to.have.property('commitObject');
                    expect(commitData).to.have.property('coreObjects');

                    expect(commitData.projectId).to.equal(projectId);
                    expect(commitData.branchName).to.equal('master');

                    expect(commitData.commitObject).to.have.property('message');
                    expect(commitData.commitObject).to.have.property('parents');
                    expect(commitData.commitObject).to.have.property('root');
                    expect(commitData.commitObject).to.have.property('time');
                    expect(commitData.commitObject.type).to.equal('commit');
                    expect(commitData.commitObject).to.have.property('updater');
                })
                .nodeify(done);
        });

        it('should getLatestCommitData should fail when branchName does not exist', function (done) {
            var data = {
                projectId: projectId,
                branchName: 'hurdyGurdy'
            };

            safeStorage.getLatestCommitData(data)
                .then(function () {
                    throw new Error('should getLatestCommitData should fail when project does not exist');
                })
                .catch(function (err) {
                    expect(err.message).to.include('Error: Branch "hurdyGurdy" does not exist in project');
                })
                .nodeify(done);
        });

        it('should getBranchHash', function (done) {
            var data = {
                projectId: projectId,
                branchName: 'master'
            };

            safeStorage.getBranchHash(data)
                .then(function (hash) {
                    expect(hash[0]).to.equal('#');
                    expect(hash.length).to.equal(41);
                })
                .nodeify(done);
        });

        it('should setBranchHash', function (done) {
            var data = {
                    projectId: projectId,
                    branchName: 'master'
                },
                newHash;

            safeStorage.getBranchHash(data)
                .then(function (hash) {
                    expect(hash[0]).to.equal('#');
                    expect(hash.length).to.equal(41);

                    data.branchName = 'setBranchHash';
                    data.oldHash = '';
                    data.newHash = hash;
                    newHash = hash;

                    return safeStorage.setBranchHash(data);
                })
                .then(function (result) {
                    expect(result).to.deep.equal({status: 'SYNCED', hash: newHash});
                })
                .nodeify(done);
        });

        it('should createBranch', function (done) {
            var data = {
                    projectId: projectId,
                    branchName: 'master'
                },
                newHash;

            safeStorage.getBranchHash(data)
                .then(function (hash) {
                    expect(hash[0]).to.equal('#');
                    expect(hash.length).to.equal(41);

                    data.branchName = 'createBranch';
                    data.hash = hash;
                    newHash = hash;

                    return safeStorage.createBranch(data);
                })
                .then(function (result) {
                    expect(result).to.deep.equal({status: 'SYNCED', hash: newHash});
                    return safeStorage.getBranches(data);
                })
                .then(function (result) {
                    expect(result).to.have.property(data.branchName);
                })
                .nodeify(done);
        });

        it('should deleteBranch', function (done) {
            var data = {
                    projectId: projectId,
                    branchName: 'master'
                },
                newHash;

            safeStorage.getBranchHash(data)
                .then(function (hash) {
                    expect(hash[0]).to.equal('#');
                    expect(hash.length).to.equal(41);

                    data.branchName = 'deleteBranch';
                    data.hash = hash;
                    newHash = hash;

                    return safeStorage.createBranch(data);
                })
                .then(function (result) {
                    expect(result).to.deep.equal({status: 'SYNCED', hash: newHash});
                    return safeStorage.getBranches(data);
                })
                .then(function (result) {
                    expect(result).to.have.property(data.branchName);
                    return safeStorage.deleteBranch(data);
                })
                .then(function (result) {
                    expect(result).to.deep.equal({status: 'SYNCED', hash: ''});
                    return safeStorage.getBranches(data);
                })
                .then(function (result) {
                    expect(result).to.not.have.property(data.branchName);
                })
                .nodeify(done);
        });

        it('should succeed after deleteBranch when it did not exist', function (done) {
            var data = {
                projectId: projectId,
                branchName: 'doesNotExist'
            };

            safeStorage.deleteBranch(data)
                .then(function (result) {
                    expect(result.status).to.equal('SYNCED');
                    expect(result.hash).to.equal('');
                    return safeStorage.getBranches(data);
                })
                .then(function (result) {
                    expect(result).to.not.have.property(data.branchName);
                })
                .nodeify(done);
        });

        it('should loadObjects', function (done) {
            var data = {
                    projectId: projectId,
                    branchName: 'master'
                },
                commitId,
                rootId;

            safeStorage.getLatestCommitData(data)
                .then(function (commitData) {
                    commitId = commitData.commitObject._id;
                    rootId = commitData.commitObject.root;

                    expect(commitId[0]).to.equal('#');
                    expect(rootId[0]).to.equal('#');

                    data.hashes = [commitId, rootId];

                    return safeStorage.loadObjects(data);
                })
                .then(function (objects) {
                    expect(objects[commitId].type).to.equal('commit');
                    expect(objects[rootId]._id).to.equal(rootId);
                })
                .nodeify(done);
        });

        it('should return object with hashes and values as error strings when hashes invalid', function (done) {
            var data = {
                    projectId: projectId,
                    branchName: 'master',
                    hashes: ['#52896a42a5e46429f39923400ed5059f309991b9', '#52896a42a5e46429f39923400ed5059f309991b8']
                };

            safeStorage.loadObjects(data)
                .then(function (objects) {
                    expect(Object.keys(objects).length).to.equal(2);
                    expect(Object.keys(objects).length).to.equal(2);
                    expect(objects['#52896a42a5e46429f39923400ed5059f309991b8'])
                        .to.equal('object does not exist #52896a42a5e46429f39923400ed5059f309991b8');
                    expect(objects['#52896a42a5e46429f39923400ed5059f309991b9'])
                        .to.equal('object does not exist #52896a42a5e46429f39923400ed5059f309991b9');
                })
                .nodeify(done);
        });
    });

    describe('getCommits', function () {
        var safeStorage,
            commitHash;

        before(function (done) {
            safeStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);

            safeStorage.openDatabase()
                .then(function () {
                    return testFixture.importProject(safeStorage, {
                        projectSeed: 'seeds/EmptyProject.json',
                        projectName: projectName,
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (result) {
                    commitHash = result.commitHash;
                    return Q();
                })
                .nodeify(done);
        });

        after(function (done) {
            safeStorage.closeDatabase(done);
        });

        it('should getCommits using timestamp', function (done) {
            var data = {
                projectId: projectId,
                number: 10,
                before: (new Date()).getTime() + 1
            };

            safeStorage.getCommits(data)
                .then(function (commits) {
                    expect(commits.length).equal(1);
                    expect(commits[0]._id === commitHash);
                    done();
                })
                .catch(done);
        });

        it('should getCommits using commitHash', function (done) {
            var data = {
                projectId: projectId,
                number: 10,
                before: commitHash
            };

            safeStorage.getCommits(data)
                .then(function (commits) {
                    expect(commits.length).equal(1);
                    expect(commits[0]._id === commitHash);
                    done();
                })
                .catch(done);
        });

        it('should fail getCommits using commitHash if invalid hash given', function (done) {
            var data = {
                projectId: projectId,
                number: 10,
                before: 'invalidHash'
            };

            safeStorage.getCommits(data)
                .then(function () {
                    done(new Error('should have failed with error'));
                })
                .catch(function (err) {
                    expect(err).to.not.equal(null);
                    expect(typeof err).to.equal('object');
                    expect(err.message).to.equal('Invalid argument, data.before is not a number nor a valid hash.');
                    done();
                })
                .done();
        });

        it('should fail getCommits using commitHash if hash does not exist', function (done) {
            var dummyHash = '#12312312312313123',
                data = {
                    projectId: projectId,
                    number: 10,
                    before: dummyHash
                };

            safeStorage.getCommits(data)
                .then(function () {
                    done(new Error('should have failed with error'));
                })
                .catch(function (err) {
                    expect(err).to.not.equal(null);
                    expect(typeof err).to.equal('object');
                    expect(err.message).to.equal('object does not exist ' + dummyHash);
                    done();
                })
                .done();
        });
    });

    describe('BRANCH events', function () {
        var safeStorage,
            project,
            newBranchHash,
            importResult;

        before(function (done) {
            safeStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);

            safeStorage.openDatabase()
                .then(function () {
                    return testFixture.importProject(safeStorage, {
                        projectSeed: 'seeds/EmptyProject.json',
                        projectName: projectName,
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (result) {
                    importResult = result;
                    project = importResult.project;
                    return Q.allDone([
                        project.makeCommit(null, [importResult.commitHash], importResult.rootHash, {}, 'aCommit'),
                        project.createBranch('b1', importResult.commitHash),
                        project.createBranch('toBeDeleted', importResult.commitHash),
                        project.createBranch('branchHashUpdated', importResult.commitHash),
                        project.createBranch('branchUpdated', importResult.commitHash)
                    ]);
                })
                .then(function (result) {
                    expect(result[0].hash).not.to.equal(importResult.commitHash);
                    newBranchHash = result[0].hash;
                })
                .nodeify(done);
        });

        after(function (done) {
            safeStorage.closeDatabase(done);
        });

        it('should emit BRANCH_CREATED', function (done) {
            var eventHandler = function (_storage, eventData) {
                expect(eventData.branchName).to.equal('newBranch');
                expect(eventData.oldHash).to.equal('');
                expect(eventData.newHash).to.equal(importResult.commitHash);
                safeStorage.clearAllEvents();
                done();
            };

            safeStorage.addEventListener(project.CONSTANTS.BRANCH_CREATED, eventHandler);
            project.createBranch('newBranch', importResult.commitHash).catch(done);
        });

        it('should emit BRANCH_DELETED', function (done) {
            var eventHandler = function (_storage, eventData) {
                expect(eventData.branchName).to.equal('toBeDeleted');
                expect(eventData.oldHash).to.equal(importResult.commitHash);
                expect(eventData.newHash).to.equal('');
                safeStorage.clearAllEvents();
                done();
            };

            safeStorage.addEventListener(project.CONSTANTS.BRANCH_DELETED, eventHandler);
            project.deleteBranch('toBeDeleted', importResult.commitHash).catch(done);
        });

        it('should emit BRANCH_HASH_UPDATED when setBranchHash', function (done) {
            var eventHandler = function (_storage, eventData) {
                expect(eventData.branchName).to.equal('branchHashUpdated');
                expect(eventData.oldHash).to.equal(importResult.commitHash);
                expect(eventData.newHash).to.equal(newBranchHash);
                safeStorage.clearAllEvents();
                done();
            };

            safeStorage.addEventListener(project.CONSTANTS.BRANCH_HASH_UPDATED, eventHandler);
            project.setBranchHash('branchHashUpdated', newBranchHash, importResult.commitHash).catch(done);
        });

        it('should emit BRANCH_UPDATED when setBranchHash', function (done) {
            var eventHandler = function (_storage, eventData) {
                expect(eventData.branchName).to.equal('branchUpdated');
                expect(eventData.commitObject._id).to.equal(newBranchHash);
                expect(eventData.commitObject.root).to.equal(importResult.rootHash);
                expect(eventData.coreObjects instanceof Array).to.equal(true);
                expect(eventData.coreObjects.length).to.equal(1);
                expect(eventData.coreObjects[0]._id).to.equal(importResult.rootHash);
                safeStorage.clearAllEvents();
                done();
            };

            safeStorage.addEventListener(project.CONSTANTS.BRANCH_UPDATED, eventHandler);
            project.setBranchHash('branchUpdated', newBranchHash, importResult.commitHash).catch(done);
        });
    });
});