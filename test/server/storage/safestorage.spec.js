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
        logger,
        Q = testFixture.Q,
        __should = testFixture.should,
        jsonPatcher = testFixture.requirejs('common/util/jsonPatcher'),
        CONSTANTS = testFixture.requirejs('common/storage/constants'),
        GENKEY = testFixture.requirejs('common/util/key'),
        gmeAuth,
        projectName = 'newProject',
        projectId = gmeConfig.authentication.guestAccount + testFixture.STORAGE_CONSTANTS.PROJECT_ID_SEP + projectName;

    before(function (done) {
        logger = testFixture.logger.fork('memory');
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
                        projectSeed: 'seeds/EmptyProject.webgmex',
                        projectName: projectName,
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (result) {
                    expect(result.projectId).to.equal(projectId);
                    commitHash = result.commitHash;
                    importResult = result;
                    return result.project.createBranch('setFail', commitHash);
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
                        //fullName: 'guest/newProject',
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
                        //fullName: 'guest/newProject',
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
                        //fullName: 'guest/newProject',
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
                        //fullName: 'guest/newProject',
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
                    expect(err.message).to.include('Branch "hurdyGurdy" does not exist in project');
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

        it('should setBranchHash should fail if commitObject does not exist for given hash and not update branch',
            function (done) {
                var data = {
                    projectId: projectId,
                    branchName: 'setFail',
                    oldHash: '',
                    newHash: '#Does_not_exist'
                };

                safeStorage.setBranchHash(data)
                    .then(function () {
                        throw new Error('setBranchHash should have failed');
                    })
                    .catch(function (err) {
                        expect(err.message).to.contain('Tried to setBranchHash to invalid or non-existing' +
                            ' commit, err: object does not exist #Does_not_exist');
                        return importResult.project.getBranchHash('setFail');
                    })
                    .then(function (hashAfterFail) {
                        expect(hashAfterFail).to.equal(commitHash);
                    })
                    .nodeify(done);
            }
        );

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
            projectId,
            rootHash,
            commitHash;

        before(function (done) {
            safeStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);

            safeStorage.openDatabase()
                .then(function () {
                    return testFixture.importProject(safeStorage, {
                        projectSeed: 'seeds/EmptyProject.webgmex',
                        projectName: 'getCommits',
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (result) {
                    projectId = result.project.projectId;
                    commitHash = result.commitHash;
                    rootHash = result.rootHash;
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

        it('should getCommits and get the one specified', function (done) {
            var data = {
                projectId: projectId,
                number: 1,
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
                    expect(err.message).to.include('object does not exist ' + dummyHash);
                    done();
                })
                .done();
        });

        it('should fail getCommits using commitHash if hash points to non commit object', function (done) {
            var data = {
                projectId: projectId,
                number: 1,
                before: rootHash
            };

            safeStorage.getCommits(data)
                .then(function () {
                    done(new Error('should have failed with error'));
                })
                .catch(function (err) {
                    expect(err).to.not.equal(null);
                    expect(typeof err).to.equal('object');
                    expect(err.message).to.include('Commit object does not exist ' + rootHash);
                    done();
                })
                .done();
        });
    });

    describe('getHistory', function () {
        var safeStorage,
            projectId,
            rootHash,
            project,
            commitHash,
            commitHash1;

        // N.B. This mainly tests the error handling and the different start points.
        // storagehelpers.spec.js tests the ordering of the commits.

        before(function (done) {
            safeStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);

            safeStorage.openDatabase()
                .then(function () {
                    return testFixture.importProject(safeStorage, {
                        projectSeed: 'seeds/EmptyProject.webgmex',
                        projectName: 'getHistory',
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (result) {
                    projectId = result.project.projectId;
                    commitHash = result.commitHash;
                    rootHash = result.rootHash;
                    project = result.project;

                    return project.makeCommit(null, [commitHash], rootHash, [], '1a');
                })
                .then(function (result) {
                    commitHash1 = result.hash;
                    return Q.allDone([
                        project.setBranchHash('b', commitHash, ''),
                        project.setBranchHash('b1', commitHash1, ''),
                    ]);
                })
                .nodeify(done);
        });

        after(function (done) {
            safeStorage.closeDatabase(done);
        });

        it('should getHistory using commitHash', function (done) {
            var data = {
                projectId: projectId,
                number: 10,
                start: commitHash
            };

            safeStorage.getHistory(data)
                .then(function (commits) {
                    expect(commits.length).to.equal(1);
                    expect(commits[0]._id).to.equal(commitHash);
                })
                .nodeify(done);
        });

        it('should getHistory using commitHash1', function (done) {
            var data = {
                projectId: projectId,
                number: 10,
                start: commitHash1
            };

            safeStorage.getHistory(data)
                .then(function (commits) {
                    expect(commits.length).to.equal(2);
                    expect(commits[0]._id).to.equal(commitHash1);
                    expect(commits[1]._id).to.equal(commitHash);
                })
                .nodeify(done);
        });

        it('should getHistory using [commitHash, commitHash1]', function (done) {
            var data = {
                projectId: projectId,
                number: 10,
                start: [commitHash1, commitHash]
            };

            safeStorage.getHistory(data)
                .then(function (commits) {
                    expect(commits.length).to.equal(2);
                    expect(commits[0]._id).to.equal(commitHash1);
                    expect(commits[1]._id).to.equal(commitHash);
                })
                .nodeify(done);
        });

        it('should getHistory using [commitHash, commitHash1] number=1', function (done) {
            var data = {
                projectId: projectId,
                number: 1,
                start: [commitHash1, commitHash]
            };

            safeStorage.getHistory(data)
                .then(function (commits) {
                    expect(commits.length).to.equal(1);
                    expect(commits[0]._id).to.equal(commitHash1);
                })
                .nodeify(done);
        });

        it('should getHistory using b', function (done) {
            var data = {
                projectId: projectId,
                number: 10,
                start: 'b'
            };

            safeStorage.getHistory(data)
                .then(function (commits) {
                    expect(commits.length).to.equal(1);
                    expect(commits[0]._id).to.equal(commitHash);
                })
                .nodeify(done);
        });

        it('should getHistory using b1', function (done) {
            var data = {
                projectId: projectId,
                number: 10,
                start: 'b1'
            };

            safeStorage.getHistory(data)
                .then(function (commits) {
                    expect(commits.length).to.equal(2);
                    expect(commits[0]._id).to.equal(commitHash1);
                    expect(commits[1]._id).to.equal(commitHash);
                })
                .nodeify(done);
        });

        it('should getHistory using [b, b1]', function (done) {
            var data = {
                projectId: projectId,
                number: 10,
                start: ['b', 'b1']
            };

            safeStorage.getHistory(data)
                .then(function (commits) {
                    expect(commits.length).to.equal(2);
                    expect(commits[0]._id).to.equal(commitHash1);
                    expect(commits[1]._id).to.equal(commitHash);
                })
                .nodeify(done);
        });

        it('should getHistory using [b, commitHash1]', function (done) {
            var data = {
                projectId: projectId,
                number: 10,
                start: ['b', commitHash1]
            };

            safeStorage.getHistory(data)
                .then(function (commits) {
                    expect(commits.length).to.equal(2);
                    expect(commits[0]._id).to.equal(commitHash1);
                    expect(commits[1]._id).to.equal(commitHash);
                })
                .nodeify(done);
        });

        it('should getHistory using [b, commitHash]', function (done) {
            var data = {
                projectId: projectId,
                number: 10,
                start: ['b', commitHash]
            };

            safeStorage.getHistory(data)
                .then(function (commits) {
                    expect(commits.length).to.equal(1);
                    expect(commits[0]._id).to.equal(commitHash);
                })
                .nodeify(done);
        });

        it('should getHistory empty with non-existing branch', function (done) {
            var data = {
                projectId: projectId,
                number: 10,
                start: ['doesNotExist']
            };

            safeStorage.getHistory(data)
                .then(function (commits) {
                    expect(commits.length).to.equal(0);
                })
                .nodeify(done);
        });

        it('should fail getHistory using non-existing commitHash', function (done) {
            var data = {
                projectId: projectId,
                number: 10,
                start: '#doesNotExist'
            };

            safeStorage.getHistory(data)
                .then(function () {
                    throw new Error('should have failed with error');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('object does not exist #doesNotExist');
                })
                .nodeify(done);
        });
    });

    describe('create/delete/getTags', function () {
        var safeStorage,
            projectId,
            rootHash,
            project,
            commitHash,
            commitHash1;

        before(function (done) {
            safeStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);

            safeStorage.openDatabase()
                .then(function () {
                    return testFixture.importProject(safeStorage, {
                        projectSeed: 'seeds/EmptyProject.webgmex',
                        projectName: 'safestorageTags',
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (result) {
                    projectId = result.project.projectId;
                    commitHash = result.commitHash;
                    rootHash = result.rootHash;
                    project = result.project;

                    return project.makeCommit(null, [commitHash], rootHash, [], '1a');
                })
                .then(function (result) {
                    commitHash1 = result.hash;
                })
                .nodeify(done);
        });

        after(function (done) {
            safeStorage.closeDatabase(done);
        });

        it('should getTags and return empty', function (done) {
            var data = {
                projectId: projectId
            };

            safeStorage.getTags(data)
                .then(function (tags) {
                    expect(tags).to.deep.equal({});
                })
                .nodeify(done);
        });

        it('should createTag', function (done) {
            var data = {
                projectId: projectId,
                tagName: 'taggen',
                commitHash: commitHash
            };

            safeStorage.createTag(data)
                .then(function () {
                    return safeStorage.getTags({projectId: projectId});
                })
                .then(function (result) {
                    expect(result.taggen).to.equal(commitHash);
                })
                .nodeify(done);
        });

        it('should create and delete a tag', function (done) {
            var data = {
                projectId: projectId,
                tagName: 'taggen2',
                commitHash: commitHash
            };

            safeStorage.createTag(data)
                .then(function () {
                    return safeStorage.getTags({projectId: projectId});
                })
                .then(function (result) {
                    expect(result.taggen2).to.equal(commitHash);
                })
                .nodeify(done);
        });

        it('should emit TAG_CREATED on create', function (done) {
            var tagName = 'TAG_CREATED_tag',
                eventHandler = function (_storage, eventData) {
                    safeStorage.clearAllEvents();
                    try {
                        expect(eventData).to.deep.equal({
                            tagName: tagName,
                            commitHash: commitHash,
                            projectId: projectId,
                            userId: 'guest'
                        });
                        done();
                    } catch (err) {
                        done(err);
                    }
                };

            safeStorage.addEventListener(project.CONSTANTS.TAG_CREATED, eventHandler);
            project.createTag(tagName, commitHash).catch(done);
        });

        it('should emit TAG_DELETED on delete tag', function (done) {
            var tagName = 'TAG_DELETED_tag',
                eventHandler = function (_storage, eventData) {
                    safeStorage.clearAllEvents();

                    try {
                        expect(eventData).to.deep.equal({
                            projectId: projectId,
                            tagName: tagName,
                            userId: 'guest'
                        });
                        done();
                    } catch (err) {
                        done(err);
                    }
                };

            safeStorage.addEventListener(project.CONSTANTS.TAG_DELETED, eventHandler);
            project.createTag(tagName, commitHash)
                .then(function () {
                    project.deleteTag(tagName);
                })
                .catch(done);
        });
    });

    describe('BRANCH events', function () {
        var safeStorage,
            project,
            projectId,
            newBranchHash,
            importResult;

        before(function (done) {
            safeStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);

            safeStorage.openDatabase()
                .then(function () {
                    return testFixture.importProject(safeStorage, {
                        projectSeed: 'seeds/EmptyProject.webgmex',
                        projectName: 'BRANCH_events',
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (result) {
                    importResult = result;
                    project = importResult.project;
                    projectId = project.projectId;
                    return Q.allDone([
                        project.makeCommit(null, [importResult.commitHash], importResult.rootHash, {}, 'aCommit'),
                        project.createBranch('toBeDeleted', importResult.commitHash),
                        project.createBranch('branchHashUpdated', importResult.commitHash),
                        project.createBranch('branchUpdated', importResult.commitHash),
                        project.createBranch('branchUpdatedCommitWithNodes', importResult.commitHash),
                        project.createBranch('branchUpdatedCommitWithOutNodes', importResult.commitHash),
                        project.createBranch('newNodeEmitted', importResult.commitHash)
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

        it('should emit BRANCH_UPDATED when setBranchHash and include root', function (done) {
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

        it('should emit BRANCH_UPDATED when makeCommit and include two patches when nodes were provided',
            function (done) {
                var eventHandler = function (_storage, eventData) {
                        expect(eventData.branchName).to.equal('branchUpdatedCommitWithNodes');
                        expect(eventData.commitObject._id).to.not.equal(importResult.commitHash);
                        expect(eventData.commitObject.root).to.equal(newRootHash);
                        expect(eventData.coreObjects instanceof Array).to.equal(true);
                        expect(eventData.coreObjects.length).to.equal(2);
                        expect(eventData.coreObjects[0].hasOwnProperty('patch')).to.equal(true);
                        expect(eventData.coreObjects[1].hasOwnProperty('patch')).to.equal(true);
                        expect(eventData.changedNodes !== null && typeof eventData.changedNodes === 'object')
                            .to.equal(true);
                        safeStorage.clearAllEvents();
                        done();
                    },
                    rootNode,
                    newRootHash;

                safeStorage.addEventListener(project.CONSTANTS.BRANCH_UPDATED, eventHandler);
                Q.ninvoke(importResult.core, 'loadRoot', importResult.rootHash)
                    .then(function (rootNode_) {
                        rootNode = rootNode_;
                        return Q.ninvoke(importResult.core, 'loadByPath', rootNode, '/1');
                    })
                    .then(function (fcoNode) {
                        var persisted;
                        importResult.core.setAttribute(fcoNode, 'name', 'branchUpdatedCommitWithNodes');
                        persisted = importResult.core.persist(rootNode);
                        expect(Object.keys(persisted.objects).length).to.equal(2);
                        newRootHash = persisted.rootHash;
                        return project.makeCommit(
                            'branchUpdatedCommitWithNodes',
                            [importResult.commitHash],
                            persisted.rootHash,
                            persisted.objects,
                            'branchUpdatedCommitWithNodes'
                        );
                    })
                    .catch(function (err) {
                        err = err instanceof Error ? err : new Error(err);
                        done(err);
                    });
            }
        );

        it('should emit BRANCH_UPDATED when makeCommit and include no nodes when none were included', function (done) {
            var eventHandler = function (_storage, eventData) {
                expect(eventData.branchName).to.equal('branchUpdatedCommitWithOutNodes');
                expect(eventData.commitObject._id).to.not.equal(importResult.commitHash);
                expect(eventData.commitObject.root).to.equal(importResult.rootHash);
                expect(eventData.coreObjects instanceof Array).to.equal(true);
                expect(eventData.coreObjects.length).to.equal(0);
                expect(eventData.changedNodes).to.equal(null);
                safeStorage.clearAllEvents();
                done();
            };

            safeStorage.addEventListener(project.CONSTANTS.BRANCH_UPDATED, eventHandler);

            project.makeCommit(
                'branchUpdatedCommitWithOutNodes',
                [importResult.commitHash],
                importResult.rootHash,
                {},
                'branchUpdatedCommitWithOutNodes'
            )
                .catch(done);
        });

        it('should emit COMMIT when makeCommit', function (done) {
            var eventHandler = function (_storage, eventData) {
                try {
                    expect(eventData.projectId).to.equal(project.projectId);
                    expect(eventData.userId).to.equal(project.userName);
                    expect(typeof eventData.commitHash).to.equal('string');
                    expect(eventData.commitHash[0]).to.equal('#');
                    safeStorage.clearAllEvents();
                    done();
                } catch (err) {
                    done(err);
                }
            };

            safeStorage.addEventListener(project.CONSTANTS.COMMIT, eventHandler);

            project.makeCommit(
                null,
                [importResult.commitHash],
                importResult.rootHash,
                {},
                'COMMIT EVENT COMMIT'
            )
                .catch(done);
        });

        it('should emit BRANCH_UPDATED when makeCommit with new nodes and include all new node-data', function (done) {
            var eventHandler = function (_storage, eventData) {
                    expect(eventData.branchName).to.equal('newNodeEmitted');
                    expect(eventData.commitObject._id).to.not.equal(importResult.commitHash);
                    expect(eventData.commitObject.root).to.equal(newRootHash);
                    expect(eventData.coreObjects instanceof Array).to.equal(true);
                    expect(eventData.coreObjects.length).to.equal(3);
                    if (eventData.coreObjects[0].hasOwnProperty('patch')) {
                        expect(eventData.coreObjects[1].hasOwnProperty('patch')).to.equal(false);
                        expect(eventData.coreObjects[2].hasOwnProperty('patch')).to.equal(false);
                    } else if (eventData.coreObjects[1].hasOwnProperty('patch')) {
                        expect(eventData.coreObjects[0].hasOwnProperty('patch')).to.equal(false);
                        expect(eventData.coreObjects[2].hasOwnProperty('patch')).to.equal(false);
                    } else if (eventData.coreObjects[2].hasOwnProperty('patch')) {
                        expect(eventData.coreObjects[0].hasOwnProperty('patch')).to.equal(false);
                        expect(eventData.coreObjects[1].hasOwnProperty('patch')).to.equal(false);
                    } else {
                        done(new Error('no patch provided for root!'));
                        return;
                    }

                    expect(eventData.changedNodes !== null && typeof eventData.changedNodes === 'object')
                        .to.equal(true);
                    safeStorage.clearAllEvents();
                    done();
                },
                rootNode,
                newRootHash;

            safeStorage.addEventListener(project.CONSTANTS.BRANCH_UPDATED, eventHandler);
            Q.ninvoke(importResult.core, 'loadRoot', importResult.rootHash)
                .then(function (rootNode_) {
                    rootNode = rootNode_;
                    return Q.ninvoke(importResult.core, 'loadByPath', rootNode, '/1');
                })
                .then(function (fcoNode) {
                    var persisted;
                    importResult.core.createNode({
                        parent: rootNode,
                        base: fcoNode
                    });
                    importResult.core.createNode({
                        parent: rootNode,
                        base: fcoNode
                    });
                    persisted = importResult.core.persist(rootNode);
                    expect(Object.keys(persisted.objects).length).to.equal(3);
                    newRootHash = persisted.rootHash;
                    return project.makeCommit(
                        'newNodeEmitted',
                        [importResult.commitHash],
                        persisted.rootHash,
                        persisted.objects,
                        'newNodeEmitted'
                    );
                })
                .catch(function (err) {
                    err = err instanceof Error ? err : new Error(err);
                    done(err);
                });
        });
    });

    describe('gmeConfig.storage.maxEmittedCoreObjects=0', function () {
        var safeStorage,
            project,
            projectId,
            gmeConfigEmit = testFixture.getGmeConfig(),
            importResult;

        before(function (done) {
            gmeConfigEmit.storage.maxEmittedCoreObjects = 1;
            safeStorage = testFixture.getMemoryStorage(logger, gmeConfigEmit, gmeAuth);

            safeStorage.openDatabase()
                .then(function () {
                    return testFixture.importProject(safeStorage, {
                        projectSeed: 'seeds/EmptyProject.webgmex',
                        projectName: 'emitCommittedCoreObjects',
                        gmeConfig: gmeConfigEmit,
                        logger: logger
                    });
                })
                .then(function (result) {
                    importResult = result;
                    project = importResult.project;
                    projectId = project.projectId;
                    return Q.allDone([
                        project.createBranch('emitAllWithNodes', importResult.commitHash),
                        project.createBranch('emitAllNoNodes', importResult.commitHash),
                        project.createBranch('newNodesNotEmitted', importResult.commitHash),
                        project.createBranch('newNodesNotEmitted2', importResult.commitHash)
                    ]);
                })
                .nodeify(done);
        });

        after(function (done) {
            safeStorage.closeDatabase(done);
        });

        it('should emit BRANCH_UPDATED when makeCommit and include patches for all objects provided', function (done) {
            var eventHandler = function (_storage, eventData) {
                    expect(eventData.branchName).to.equal('emitAllWithNodes');
                    expect(eventData.commitObject._id).to.not.equal(importResult.commitHash);
                    expect(eventData.commitObject.root).to.equal(newRootHash);
                    expect(eventData.coreObjects instanceof Array).to.equal(true);
                    expect(eventData.coreObjects.length).to.equal(2);
                    expect(eventData.coreObjects[0].hasOwnProperty('patch')).to.equal(true);
                    expect(eventData.coreObjects[1].hasOwnProperty('patch')).to.equal(true);
                    safeStorage.clearAllEvents();
                    done();
                },
                rootNode,
                newRootHash;

            safeStorage.addEventListener(project.CONSTANTS.BRANCH_UPDATED, eventHandler);
            Q.ninvoke(importResult.core, 'loadRoot', importResult.rootHash)
                .then(function (rootNode_) {
                    rootNode = rootNode_;
                    return Q.ninvoke(importResult.core, 'loadByPath', rootNode, '/1');
                })
                .then(function (fcoNode) {
                    var persisted;
                    importResult.core.setAttribute(fcoNode, 'name', 'emitAllWithNodes');
                    persisted = importResult.core.persist(rootNode);
                    expect(Object.keys(persisted.objects).length).to.equal(2);
                    newRootHash = persisted.rootHash;
                    return project.makeCommit(
                        'emitAllWithNodes',
                        [importResult.commitHash],
                        persisted.rootHash,
                        persisted.objects,
                        'emitAllWithNodes'
                    );
                })
                .catch(function (err) {
                    err = err instanceof Error ? err : new Error(err);
                    done(err);
                });
        });

        it('should emit BRANCH_UPDATED when makeCommit with new node and include the one new node-data',
            function (done) {
                var eventHandler = function (_storage, eventData) {
                        expect(eventData.branchName).to.equal('newNodesNotEmitted');
                        expect(eventData.commitObject._id).to.not.equal(importResult.commitHash);
                        expect(eventData.commitObject.root).to.equal(newRootHash);
                        expect(eventData.coreObjects instanceof Array).to.equal(true);
                        expect(eventData.coreObjects.length).to.equal(2);

                        if (eventData.coreObjects[0].hasOwnProperty('patch')) {
                            expect(eventData.coreObjects[1].hasOwnProperty('patch')).to.equal(false);
                        } else if (eventData.coreObjects[1].hasOwnProperty('patch')) {
                            expect(eventData.coreObjects[0].hasOwnProperty('patch')).to.equal(false);
                        } else {
                            done(new Error('no patch provided for root!'));
                            return;
                        }

                        expect(eventData.changedNodes !== null && typeof eventData.changedNodes === 'object')
                            .to.equal(true);
                        safeStorage.clearAllEvents();
                        done();
                    },
                    rootNode,
                    newRootHash;

                safeStorage.addEventListener(project.CONSTANTS.BRANCH_UPDATED, eventHandler);
                Q.ninvoke(importResult.core, 'loadRoot', importResult.rootHash)
                    .then(function (rootNode_) {
                        rootNode = rootNode_;
                        return Q.ninvoke(importResult.core, 'loadByPath', rootNode, '/1');
                    })
                    .then(function (fcoNode) {
                        var persisted;
                        importResult.core.createNode({
                            parent: rootNode,
                            base: fcoNode
                        });
                        persisted = importResult.core.persist(rootNode);
                        expect(Object.keys(persisted.objects).length).to.equal(2);
                        newRootHash = persisted.rootHash;
                        return project.makeCommit(
                            'newNodesNotEmitted',
                            [importResult.commitHash],
                            persisted.rootHash,
                            persisted.objects,
                            'newNodesNotEmitted'
                        );
                    })
                    .catch(function (err) {
                        err = err instanceof Error ? err : new Error(err);
                        done(err);
                    });
            }
        );

        it('should emit BRANCH_UPDATED when makeCommit with new nodes and include only one new node-data',
            function (done) {
                var eventHandler = function (_storage, eventData) {
                        expect(eventData.branchName).to.equal('newNodesNotEmitted2');
                        expect(eventData.commitObject._id).to.not.equal(importResult.commitHash);
                        expect(eventData.commitObject.root).to.equal(newRootHash);
                        expect(eventData.coreObjects instanceof Array).to.equal(true);
                        expect(eventData.coreObjects.length).to.equal(2);

                        if (eventData.coreObjects[0].hasOwnProperty('patch')) {
                            expect(eventData.coreObjects[1].hasOwnProperty('patch')).to.equal(false);
                        } else if (eventData.coreObjects[1].hasOwnProperty('patch')) {
                            expect(eventData.coreObjects[0].hasOwnProperty('patch')).to.equal(false);
                        } else {
                            done(new Error('no patch provided for root!'));
                            return;
                        }

                        expect(eventData.changedNodes !== null && typeof eventData.changedNodes === 'object')
                            .to.equal(true);
                        safeStorage.clearAllEvents();
                        done();
                    },
                    rootNode,
                    newRootHash;

                safeStorage.addEventListener(project.CONSTANTS.BRANCH_UPDATED, eventHandler);
                Q.ninvoke(importResult.core, 'loadRoot', importResult.rootHash)
                    .then(function (rootNode_) {
                        rootNode = rootNode_;
                        return Q.ninvoke(importResult.core, 'loadByPath', rootNode, '/1');
                    })
                    .then(function (fcoNode) {
                        var persisted;
                        importResult.core.createNode({
                            parent: rootNode,
                            base: fcoNode
                        });
                        importResult.core.createNode({
                            parent: rootNode,
                            base: fcoNode
                        });
                        persisted = importResult.core.persist(rootNode);
                        expect(Object.keys(persisted.objects).length).to.equal(3);
                        newRootHash = persisted.rootHash;
                        return project.makeCommit(
                            'newNodesNotEmitted2',
                            [importResult.commitHash],
                            persisted.rootHash,
                            persisted.objects,
                            'newNodesNotEmitted2'
                        );
                    })
                    .catch(function (err) {
                        err = err instanceof Error ? err : new Error(err);
                        done(err);
                    });
            }
        );
    });

    describe('Patch-objects Communication', function () {

        var storages = [],
            initTest = function (parameters) {
                var deferred = Q.defer();
                parameters.storage = testFixture.getMemoryStorage(logger, parameters.gmeConfig, gmeAuth);
                parameters.storage.openDatabase()
                    .then(function () {
                        return testFixture.importProject(parameters.storage, {
                            projectSeed: 'seeds/EmptyProject.webgmex',
                            projectName: parameters.projectName,
                            gmeConfig: parameters.gmeConfig,
                            logger: logger
                        });
                    })
                    .then(function (result) {
                        parameters.result = result;
                        parameters.project = result.project;
                        parameters.projectId = parameters.project.projectId;
                        return Q.nfcall(parameters.project.createBranch,
                            parameters.branchName,
                            result.commitHash);
                    })
                    .then(function () {
                        storages.push(parameters.storage);
                        deferred.resolve();
                    })
                    .catch(deferred.reject);
                return deferred.promise;
            };

        after(function (done) {
            var promises = [],
                i;

            for (i = 0; i < storages.length; i += 1) {
                promises.push(storages[i].closeDatabase);
            }

            Q.allDone(promises)
                .nodeify(done);
        });

        it.skip('should patch when the commit contains a patch root', function (done) {
            var parameters = {
                    projectName: 'patchOff',
                    branchName: 'patchOffBranch',
                    gmeConfig: testFixture.getGmeConfig()
                },
                eventHandler = function (_storage, eventData) {
                    expect(eventData.branchName).to.equal(parameters.branchName);
                    expect(eventData.commitObject[CONSTANTS.MONGO_ID]).to.not.equal(parameters.result.commitHash);
                    expect(eventData.commitObject.root).to.equal(newRoot[CONSTANTS.MONGO_ID]);
                    expect(eventData.coreObjects instanceof Array).to.equal(true);
                    expect(eventData.coreObjects.length).to.equal(1);
                    expect(eventData.coreObjects[0][CONSTANTS.MONGO_ID]).to.equal(newRoot[CONSTANTS.MONGO_ID]);
                    expect(eventData.coreObjects[0]).to.eql(patchRoot);
                    parameters.storage.clearAllEvents();
                    done();
                },
                patchRoot,
                patching,
                newRoot,
                coreObjects = {};

            initTest(parameters)
                .then(function () {
                    var commitData = {};
                    patchRoot = {
                        type: 'patch',
                        base: parameters.result.rootHash,
                        patch: [{op: 'add', path: '/atr/new', value: 'value'}]
                    };
                    patching = jsonPatcher.apply(parameters.result.rootNode.data, patchRoot.patch);
                    expect(patching.status).to.equal('success');
                    patching.result[CONSTANTS.MONGO_ID] = '';
                    newRoot = patching.result;
                    newRoot[CONSTANTS.MONGO_ID] = '#' + GENKEY(newRoot, parameters.gmeConfig);
                    patchRoot[CONSTANTS.MONGO_ID] = newRoot[CONSTANTS.MONGO_ID];

                    expect(newRoot[CONSTANTS.MONGO_ID].indexOf('#')).to.equal(0);
                    expect(newRoot[CONSTANTS.MONGO_ID].length).to.above(1);
                    expect(newRoot.atr.new).to.equal('value');

                    coreObjects[newRoot[CONSTANTS.MONGO_ID]] = patchRoot;

                    parameters.storage.addEventListener(parameters.project.CONSTANTS.BRANCH_UPDATED, eventHandler);
                    commitData.projectId = parameters.project.projectId;
                    commitData.branchName = parameters.branchName;
                    commitData.coreObjects = coreObjects;
                    commitData.username = parameters.project.userName;
                    commitData.commitObject = parameters.project.createCommitObject([parameters.result.commitHash],
                        newRoot[CONSTANTS.MONGO_ID], commitData.username, 'patchRootSent');
                    parameters.storage.makeCommit(commitData)
                        .catch(done);
                })
                .catch(done);
        });

        it.skip('should broadcast patch root when function is enabled', function (done) {
            var parameters = {
                    projectName: 'patchOn',
                    branchName: 'patchOnBranch',
                    gmeConfig: testFixture.getGmeConfig()
                },
                eventHandler = function (_storage, eventData) {
                    expect(eventData.branchName).to.equal(parameters.branchName);
                    expect(eventData.commitObject[CONSTANTS.MONGO_ID]).to.not.equal(parameters.result.commitHash);
                    expect(eventData.commitObject.root).to.equal(newRoot[CONSTANTS.MONGO_ID]);
                    expect(eventData.coreObjects instanceof Array).to.equal(true);
                    expect(eventData.coreObjects.length).to.equal(1);
                    expect(eventData.coreObjects[0][CONSTANTS.MONGO_ID]).to.equal(patchRoot[CONSTANTS.MONGO_ID]);
                    expect(eventData.coreObjects[0]).to.eql(patchRoot);
                    parameters.storage.clearAllEvents();
                    done();
                },
                patchRoot,
                patching,
                newRoot,
                coreObjects = {};

            initTest(parameters)
                .then(function () {
                    patchRoot = {
                        type: 'patch',
                        base: parameters.result.rootHash,
                        patch: [{op: 'add', path: '/atr/new', value: 'value'}]
                    };
                    patching = jsonPatcher.apply(parameters.result.rootNode.data, patchRoot.patch);
                    expect(patching.status).to.equal('success');
                    patching.result[CONSTANTS.MONGO_ID] = '';
                    newRoot = patching.result;
                    newRoot[CONSTANTS.MONGO_ID] = '#' + GENKEY(newRoot, parameters.gmeConfig);
                    patchRoot[CONSTANTS.MONGO_ID] = newRoot[CONSTANTS.MONGO_ID];

                    expect(newRoot[CONSTANTS.MONGO_ID].indexOf('#')).to.equal(0);
                    expect(newRoot[CONSTANTS.MONGO_ID].length).to.above(1);
                    expect(newRoot.atr.new).to.equal('value');

                    coreObjects[newRoot[CONSTANTS.MONGO_ID]] = patchRoot;

                    parameters.storage.addEventListener(parameters.project.CONSTANTS.BRANCH_UPDATED, eventHandler);

                    parameters.project.makeCommit(
                        parameters.branchName,
                        [parameters.result.commitHash],
                        newRoot[CONSTANTS.MONGO_ID],
                        coreObjects,
                        'patchRootSent'
                    )
                        .catch(done);
                })
                .catch(done);
        });

        it.skip('should broadcast patch root when function is enabled and only root is sent', function (done) {
            var parameters = {
                    projectName: 'patchOnOnlyRoot',
                    branchName: 'patchOnBranch',
                    gmeConfig: testFixture.getGmeConfig()
                },
                eventHandler = function (_storage, eventData) {
                    expect(eventData.branchName).to.equal(parameters.branchName);
                    expect(eventData.commitObject[CONSTANTS.MONGO_ID]).to.not.equal(parameters.result.commitHash);
                    expect(eventData.commitObject.root).to.equal(newRoot[CONSTANTS.MONGO_ID]);
                    expect(eventData.coreObjects instanceof Array).to.equal(true);
                    expect(eventData.coreObjects.length).to.equal(1);
                    expect(eventData.coreObjects[0][CONSTANTS.MONGO_ID]).to.equal(patchRoot[CONSTANTS.MONGO_ID]);
                    expect(eventData.coreObjects[0]).to.eql(patchRoot);
                    parameters.storage.clearAllEvents();
                    done();
                },
                patchRoot,
                patching,
                newRoot,
                coreObjects = {};

            parameters.gmeConfig.storage.patchRootCommunicationEnabled = true;
            parameters.gmeConfig.storage.emitCommittedCoreObjects = false;
            initTest(parameters)
                .then(function () {
                    patchRoot = {
                        type: 'patch',
                        base: parameters.result.rootHash,
                        patch: [{op: 'add', path: '/atr/new', value: 'value'}]
                    };
                    patching = jsonPatcher.apply(parameters.result.rootNode.data, patchRoot.patch);
                    expect(patching.status).to.equal('success');
                    patching.result[CONSTANTS.MONGO_ID] = '';
                    newRoot = patching.result;
                    newRoot[CONSTANTS.MONGO_ID] = '#' + GENKEY(newRoot, parameters.gmeConfig);
                    patchRoot[CONSTANTS.MONGO_ID] = newRoot[CONSTANTS.MONGO_ID];

                    expect(newRoot[CONSTANTS.MONGO_ID].indexOf('#')).to.equal(0);
                    expect(newRoot[CONSTANTS.MONGO_ID].length).to.above(1);
                    expect(newRoot.atr.new).to.equal('value');

                    coreObjects[newRoot[CONSTANTS.MONGO_ID]] = patchRoot;

                    parameters.storage.addEventListener(parameters.project.CONSTANTS.BRANCH_UPDATED, eventHandler);

                    parameters.project.makeCommit(
                        parameters.branchName,
                        [parameters.result.commitHash],
                        newRoot[CONSTANTS.MONGO_ID],
                        coreObjects,
                        'patchRootSent'
                    )
                        .catch(done);
                })
                .catch(done);
        });

        it('should fail to handle faulty patch root object', function (done) {
            var parameters = {
                    projectName: 'patchOnFaultyPatch',
                    branchName: 'patchOnBranch',
                    gmeConfig: testFixture.getGmeConfig()
                },
                eventHandler = function (/*_storage, eventData*/) {
                    parameters.storage.clearAllEvents();
                    done(new Error('missing fault handling'));
                },
                patchRoot,
                patching,
                newRoot,
                coreObjects = {};

            initTest(parameters)
                .then(function () {
                    var commitData = {};
                    patchRoot = {
                        type: 'patch',
                        base: parameters.result.rootHash,
                        patch: [{op: 'add', path: '/atr/new', value: 'value'}]
                    };
                    patching = jsonPatcher.apply(parameters.result.rootNode.data, patchRoot.patch);
                    expect(patching.status).to.equal('success');
                    patching.result[CONSTANTS.MONGO_ID] = '';
                    newRoot = patching.result;
                    newRoot[CONSTANTS.MONGO_ID] = '#' + GENKEY(newRoot, parameters.gmeConfig);
                    patchRoot[CONSTANTS.MONGO_ID] = newRoot[CONSTANTS.MONGO_ID];

                    patchRoot.patch[0].op = 'badOperation';
                    expect(newRoot[CONSTANTS.MONGO_ID].indexOf('#')).to.equal(0);
                    expect(newRoot[CONSTANTS.MONGO_ID].length).to.above(1);
                    expect(newRoot.atr.new).to.equal('value');

                    coreObjects[newRoot[CONSTANTS.MONGO_ID]] = patchRoot;

                    parameters.storage.addEventListener(parameters.project.CONSTANTS.BRANCH_UPDATED, eventHandler);

                    commitData.projectId = parameters.project.projectId;
                    commitData.branchName = parameters.branchName;
                    commitData.coreObjects = coreObjects;
                    commitData.username = parameters.project.userName;
                    commitData.commitObject = parameters.project.createCommitObject([parameters.result.commitHash],
                        newRoot[CONSTANTS.MONGO_ID], commitData.username, 'patchRootSent');
                    parameters.storage.makeCommit(commitData)
                        .catch(function (err) {
                            expect(err.message).to.contain('error during patch application');
                            done();
                        })
                        .done();
                })
                .catch(done);
        });

        it('should fail to handle patch root object with faulty base', function (done) {
            var parameters = {
                    projectName: 'patchOnFaultyBase',
                    branchName: 'patchOnBranch',
                    gmeConfig: testFixture.getGmeConfig()
                },
                eventHandler = function (/*_storage, eventData*/) {
                    parameters.storage.clearAllEvents();
                    done(new Error('missing fault handling'));
                },
                patchRoot,
                patching,
                newRoot,
                coreObjects = {};

            initTest(parameters)
                .then(function () {
                    patchRoot = {
                        type: 'patch',
                        base: parameters.result.rootHash,
                        patch: [{op: 'add', path: '/atr/new', value: 'value'}]
                    };
                    patching = jsonPatcher.apply(parameters.result.rootNode.data, patchRoot.patch);
                    expect(patching.status).to.equal('success');
                    patching.result[CONSTANTS.MONGO_ID] = '';
                    newRoot = patching.result;
                    newRoot[CONSTANTS.MONGO_ID] = '#' + GENKEY(newRoot, parameters.gmeConfig);
                    patchRoot[CONSTANTS.MONGO_ID] = newRoot[CONSTANTS.MONGO_ID];

                    patchRoot.base = patchRoot[CONSTANTS.MONGO_ID];
                    expect(newRoot[CONSTANTS.MONGO_ID].indexOf('#')).to.equal(0);
                    expect(newRoot[CONSTANTS.MONGO_ID].length).to.above(1);
                    expect(newRoot.atr.new).to.equal('value');

                    coreObjects[newRoot[CONSTANTS.MONGO_ID]] = patchRoot;

                    parameters.storage.addEventListener(parameters.project.CONSTANTS.BRANCH_UPDATED, eventHandler);

                    parameters.project.makeCommit(
                        parameters.branchName,
                        [parameters.result.commitHash],
                        newRoot[CONSTANTS.MONGO_ID],
                        coreObjects,
                        'patchRootSent'
                    )
                        .catch(function (err) {
                            expect(err.message).to.contain('object does not exist ' + newRoot[CONSTANTS.MONGO_ID]);
                            done();
                        })
                        .done();
                })
                .catch(done);
        });
    });

    describe('Project Creation/Transfer', function () {
        var safeStorage,
            notInOrgCanNotCreate = 'notInOrgCanNotCreate',
            notInOrgCanCreate = 'notInOrgCanCreate',
            inOrgCanCreateNotAdmin = 'inOrgCanCreateNotAdmin',
            inOrgCanCreateAdmin = 'inOrgCanCreateAdmin',
            deletedOrg = 'deletedOrg',
            userInDeletedOrg = 'userInDeletedOrg',
            deletedUser = 'deletedUser',
            pName = 'project_creation_transfer',
            orgProject,
            userProject,
            pId;

        function getProjectData(projects, projectId) {
            var res;
            projects.forEach(function (projectData) {
                if (projectData._id === projectId) {
                    res = projectData;
                }
            });

            return res;
        }

        before(function (done) {
            Q.allDone([
                gmeAuth.addUser(notInOrgCanNotCreate, '@', 'p', false, {}),
                gmeAuth.addUser(notInOrgCanCreate, '@', 'p', true, {}),
                gmeAuth.addUser(inOrgCanCreateNotAdmin, '@', 'p', true, {}),
                gmeAuth.addUser(inOrgCanCreateAdmin, '@', 'p', true, {}),
                gmeAuth.addUser(userInDeletedOrg, '@', 'p', true, {}),
                gmeAuth.addUser(deletedUser, '@', 'p', true, {}),
                gmeAuth.addOrganization('theOrg'),
                gmeAuth.addOrganization(deletedOrg),
            ])
                .then(function () {
                    return Q.allDone([
                        gmeAuth.addUserToOrganization(inOrgCanCreateNotAdmin, 'theOrg'),
                        gmeAuth.addUserToOrganization(inOrgCanCreateAdmin, 'theOrg'),
                        gmeAuth.addUserToOrganization(userInDeletedOrg, deletedOrg),
                        gmeAuth.setAdminForUserInOrganization(inOrgCanCreateAdmin, 'theOrg', true)
                    ]);
                })
                .then(function () {
                    safeStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                    return safeStorage.openDatabase();
                })
                .then(function () {
                    return testFixture.importProject(safeStorage, {
                        projectSeed: 'seeds/EmptyProject.webgmex',
                        projectName: pName,
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (res) {
                    pId = res.project.projectId;
                    return gmeAuth.authorizer.setAccessRights(notInOrgCanNotCreate, pId, {
                        read: true,
                        write: true,
                        delete: true
                    }, {
                        entityType: gmeAuth.authorizer.ENTITY_TYPES.PROJECT
                    });
                })
                .then(function () {
                    return testFixture.importProject(safeStorage, {
                        projectSeed: 'seeds/EmptyProject.webgmex',
                        projectName: 'orgProject',
                        ownerId: deletedOrg,
                        username: 'admin',
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (res) {
                    orgProject = res.project;
                })
                .then(function () {
                    return testFixture.importProject(safeStorage, {
                        projectSeed: 'seeds/EmptyProject.webgmex',
                        projectName: 'orgProject',
                        username: deletedUser,
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (res) {
                    userProject = res.project;
                })
                .nodeify(done);
        });

        after(function (done) {
            safeStorage.closeDatabase(done);
        });

        it('should fail to create if projectName contains +', function (done) {
            var projectName = 'contains+plus',
                username = notInOrgCanCreate,
                ownerId = notInOrgCanCreate,
                data = {
                    projectName: projectName,
                    username: username,
                    ownerId: ownerId
                };
            safeStorage.createProject(data)
                .then(function () {
                    throw new Error('Should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('Invalid argument, data.projectName failed regexp: contains+plus');
                    done();
                })
                .done();
        });

        it('should fail to create if projectName empty string', function (done) {
            var projectName = '',
                username = notInOrgCanCreate,
                ownerId = notInOrgCanCreate,
                data = {
                    projectName: projectName,
                    username: username,
                    ownerId: ownerId
                };
            safeStorage.createProject(data)
                .then(function () {
                    throw new Error('Should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('Invalid argument, data.projectName failed regexp: ');
                    done();
                })
                .done();
        });

        it('should fail notInOrgCanNotCreate1', function (done) {
            var projectName = 'notInOrgCanNotCreate1',
                username = notInOrgCanNotCreate,
                ownerId = notInOrgCanNotCreate,
                data = {
                    projectName: projectName,
                    username: username,
                    ownerId: ownerId
                };
            safeStorage.createProject(data)
                .then(function () {
                    throw new Error('Should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('Not authorized to create new project');
                    done();
                })
                .done();
        });

        it('should fail notInOrgCanNotCreate2', function (done) {
            var projectName = 'notInOrgCanNotCreate2',
                username = notInOrgCanNotCreate,
                data = {
                    projectName: projectName,
                    username: username
                };
            safeStorage.createProject(data)
                .then(function () {
                    throw new Error('Should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('Not authorized to create new project');
                    done();
                })
                .done();
        });

        it('should create for user notInOrgCanCreate', function (done) {
            var projectName = 'notInOrgCanCreate1',
                username = notInOrgCanCreate,
                data = {
                    projectName: projectName,
                    username: username
                },
                projectId;
            safeStorage.createProject(data)
                .then(function (project) {
                    projectId = project.projectId;
                    data.rights = true;
                    return safeStorage.getProjects(data);
                })
                .then(function (projects) {
                    var pData = getProjectData(projects, projectId);
                    expect(pData.rights).to.deep.equal({read: true, write: true, delete: true});
                })
                .nodeify(done);
        });

        it('should fail to create for organization notInOrgCanCreate', function (done) {
            var projectName = 'notInOrgCanCreate2',
                username = notInOrgCanCreate,
                ownerId = 'theOrg',
                data = {
                    projectName: projectName,
                    username: username,
                    ownerId: ownerId
                };

            safeStorage.createProject(data)
                .then(function () {
                    throw new Error('Should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('Not authorized to create new project for');
                    done();
                })
                .done();
        });

        it('should fail to create for organization inOrgCanCreateNotAdmin', function (done) {
            var projectName = 'inOrgCanCreateNotAdmin1',
                username = inOrgCanCreateNotAdmin,
                ownerId = 'theOrg',
                data = {
                    projectName: projectName,
                    username: username,
                    ownerId: ownerId
                };

            safeStorage.createProject(data)
                .then(function () {
                    throw new Error('Should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('Not authorized to create new project for');
                    done();
                })
                .done();
        });

        it('should create for user inOrgCanCreateAdmin', function (done) {
            var projectName = 'inOrgCanCreateAdmin',
                username = inOrgCanCreateAdmin,
                ownerId = 'theOrg',
                data = {
                    projectName: projectName,
                    username: username,
                    ownerId: ownerId
                },
                projectId;
            safeStorage.createProject(data)
                .then(function (project) {
                    projectId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(ownerId, projectName);
                    expect(project.projectId).to.equal(projectId);
                    data.rights = true;
                    return safeStorage.getProjects(data);
                })
                .then(function (projects) {
                    var pData = getProjectData(projects, projectId);
                    expect(pData.rights).to.deep.equal({read: true, write: true, delete: true});
                })
                .nodeify(done);
        });

        it('should fail to create for non-existing organization', function (done) {
            var projectName = 'nonExistingOrganization',
                username = inOrgCanCreateAdmin,
                ownerId = inOrgCanCreateNotAdmin,
                data = {
                    projectName: projectName,
                    username: username,
                    ownerId: ownerId
                };

            safeStorage.createProject(data)
                .then(function () {
                    throw new Error('Should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('no such organization [inOrgCanCreateNotAdmin]');
                    done();
                })
                .done();
        });

        it('should transfer a project to an organization where user is admin', function (done) {
            var projectName = 'inOrgAsAdminTransfer',
                username = inOrgCanCreateAdmin,
                ownerId = 'theOrg',
                createData = {
                    projectName: projectName,
                    username: username
                },
                transferData = {
                    username: username,
                    newOwnerId: ownerId,
                    projectId: null
                },
                newProjectId = testFixture.storageUtil.getProjectIdFromOwnerIdAndProjectName(ownerId, projectName);

            safeStorage.createProject(createData)
                .then(function (project) {
                    transferData.projectId = project.projectId;
                    return safeStorage.transferProject(transferData);
                })
                .then(function (newProjectId_) {
                    expect(newProjectId_).to.equal(newProjectId);
                    return safeStorage.openProject({projectId: newProjectId, username: username});
                })
                .then(function (project) {
                    expect(project.projectId).to.equal(newProjectId);
                })
                .nodeify(done);
        });

        it('should not transfer project to an organization where user is not admin', function (done) {
            var projectName = 'inOrgNotAdminTransfer',
                username = inOrgCanCreateNotAdmin,
                ownerId = 'theOrg',
                createData = {
                    projectName: projectName,
                    username: username
                },
                transferData = {
                    username: username,
                    newOwnerId: ownerId,
                    projectId: null
                };

            safeStorage.createProject(createData)
                .then(function (project) {
                    transferData.projectId = project.projectId;
                    return safeStorage.transferProject(transferData);
                })
                .then(function () {
                    throw new Error('Should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('Not authorized to transfer project');
                    done();
                })
                .done();
        });

        it('should not transfer a non-existing project', function (done) {
            var projectId = 'doesNotExistTransfer',
                username = inOrgCanCreateNotAdmin,
                transferData = {
                    username: username,
                    projectId: projectId,
                    newOwnerId: 'someOwner'
                };

            safeStorage.transferProject(transferData)
                .then(function () {
                    throw new Error('Should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('Not authorized to delete project');
                    done();
                })
                .done();
        });

        it('should not transfer a project to another user', function (done) {
            var projectName = 'notBeTransferredToOtherUser',
                username = inOrgCanCreateAdmin,
                ownerId = inOrgCanCreateNotAdmin,
                createData = {
                    projectName: projectName,
                    username: username
                },
                transferData = {
                    username: username,
                    newOwnerId: ownerId,
                    projectId: null
                };

            safeStorage.createProject(createData)
                .then(function (project) {
                    transferData.projectId = project.projectId;
                    return safeStorage.transferProject(transferData);
                })
                .then(function () {
                    throw new Error('Should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('no such organization');
                    done();
                })
                .done();
        });

        it('should not transfer a project to non-existing new owner', function (done) {
            var projectName = 'notBeTransferredToNonExistingOwner',
                username = inOrgCanCreateAdmin,
                ownerId = 'doesNotExist',
                createData = {
                    projectName: projectName,
                    username: username
                },
                transferData = {
                    username: username,
                    newOwnerId: ownerId,
                    projectId: null
                };

            safeStorage.createProject(createData)
                .then(function (project) {
                    transferData.projectId = project.projectId;
                    return safeStorage.transferProject(transferData);
                })
                .then(function () {
                    throw new Error('Should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('no such organization');
                    done();
                })
                .done();
        });

        it('should not transfer a project to the same owner', function (done) {
            var projectName = 'sameOwnerAfterTransfer',
                username = inOrgCanCreateAdmin,
                createData = {
                    projectName: projectName,
                    username: username
                },
                transferData = {
                    username: username,
                    newOwnerId: username,
                    projectId: null
                };

            safeStorage.createProject(createData)
                .then(function (project) {
                    transferData.projectId = project.projectId;
                    return safeStorage.transferProject(transferData);
                })
                .then(function () {
                    throw new Error('Should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('Project already exists inOrgCanCreateAdmin+sameOwnerAfterTransfer');
                    done();
                })
                .done();
        });

        it('should make a duplicate of a project', function (done) {
            var data = {
                projectName: 'dup',
                projectId: pId
            };

            safeStorage.duplicateProject(data)
                .then(function (project) {
                    expect(project.projectId).to.equal('guest+' + data.projectName);
                })
                .nodeify(done);
        });

        it('should fail to make a duplicate of a project if ownerId not string', function (done) {
            var data = {
                ownerId: {a: 10},
                projectName: 'dup',
                projectId: pId
            };

            safeStorage.duplicateProject(data)
                .then(function () {
                    throw new Error('Should have failed');
                })
                .catch(function (err) {
                    expect(err.message).to.include('Invalid argument, data.ownerId is not a string');
                })
                .nodeify(done);
        });

        it('should fail to make a duplicate of a project if already exists', function (done) {
            var data = {
                username: 'guest',
                projectName: pName,
                projectId: pId
            };

            safeStorage.duplicateProject(data)
                .then(function () {
                    throw new Error('Should have failed');
                })
                .catch(function (err) {
                    expect(err.message).to.include('Project already exists');
                })
                .nodeify(done);
        });

        it('should fail to make a duplicate of a project that does not exist', function (done) {
            var data = {
                username: 'guest',
                projectName: 'willNotBeCreated',
                projectId: 'guest+DoesNotExist'
            };

            safeStorage.duplicateProject(data)
                .then(function () {
                    throw new Error('Should have failed');
                })
                .catch(function (err) {
                    expect(err.message).to.include('Not authorized to read project');
                })
                .nodeify(done);
        });

        it('should fail to make a duplicate of a project when it is disabled', function (done) {
            var data = {
                username: 'guest',
                projectName: 'willNotBeCreated',
                projectId: pId
            };

            safeStorage.gmeConfig.seedProjects.allowDuplication = false;

            safeStorage.duplicateProject(data)
                .then(function () {
                    throw new Error('Should have failed');
                })
                .catch(function (err) {
                    safeStorage.gmeConfig.seedProjects.allowDuplication = true;
                    expect(err.message).to.include('gmeConfig.seedProjects.allowDuplication is set to false');
                })
                .nodeify(done);
        });

        it('should fail to make a duplicate if not allowed to create', function (done) {
            var data = {
                username: notInOrgCanNotCreate,
                projectName: 'willNotBeCreated',
                projectId: pId
            };

            safeStorage.duplicateProject(data)
                .then(function () {
                    throw new Error('Should have failed');
                })
                .catch(function (err) {
                    expect(err.message).to.include('Not authorized to create project for [' + notInOrgCanNotCreate);
                })
                .nodeify(done);
        });

        it('should fail to access org project from user in deleted org but admin should still be able to', function (done) {
            var data = {
                username: userInDeletedOrg,
                projectId: orgProject.projectId
            };

            safeStorage.openProject(data)
                .then(function (project) {
                    expect(project.projectId).to.equal(orgProject.projectId);
                    return gmeAuth.removeOrganizationByOrgId(deletedOrg);
                })
                .then(function () {
                    return safeStorage.openProject(data);
                })
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.include('Not authorized to read project');
                    data.username = 'admin';
                    return safeStorage.openProject(data);
                })
                .then(function (project) {
                    expect(project.projectId).to.equal(orgProject.projectId);
                })
                .nodeify(done);
        });

        it('should fail to access user project from deleted user but admin should still be able', function (done) {
            var data = {
                username: deletedUser,
                projectId: userProject.projectId
            };

            safeStorage.openProject(data)
                .then(function (project) {
                    expect(project.projectId).to.equal(userProject.projectId);
                    return gmeAuth.deleteUser(deletedUser);
                })
                .then(function () {
                    return safeStorage.openProject(data);
                })
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.include('no such user');
                    data.username = 'admin';
                    return safeStorage.openProject(data);
                })
                .then(function (project) {
                    expect(project.projectId).to.equal(userProject.projectId);
                })
                .nodeify(done);
        });

    });

    describe('CommonAncestorCommit', function () {
        describe('straight line', function () {
            var projectName = 'straightLineTest',
                projectId,
                storage,
                commitChain = [],
                chainLength = 50;

            before(function (done) {

                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                storage.openDatabase()
                    .then(function () {
                        return testFixture.importProject(storage, {
                            projectSeed: 'seeds/EmptyProject.webgmex',
                            projectName: projectName,
                            gmeConfig: gmeConfig,
                            logger: logger
                        });
                    })
                    .then(function (importResult) {
                        //finally we create the commit chain
                        var project,
                            needed = chainLength,
                            nextCommit = function (err, commitResult) {
                                if (err) {
                                    done(err);
                                    return;
                                }
                                needed -= 1;
                                commitChain.push(commitResult.hash);
                                if (needed === 0) {
                                    done();
                                } else {
                                    project.makeCommit(null,
                                        [commitResult.hash],
                                        importResult.rootHash,
                                        [], // no core-objects
                                        '_' + (chainLength - needed).toString() + '_',
                                        nextCommit);
                                }
                            };

                        project = importResult.project;
                        projectId = project.projectId;
                        project.makeCommit(null,
                            [importResult.commitHash],
                            importResult.rootHash,
                            [],
                            '_' + 0 + '_',
                            nextCommit);
                    })
                    .catch(done);
            });

            after(function (done) {
                Q.allDone([
                    storage.closeDatabase()
                ])
                    .nodeify(done);
            });

            it('single chain 0 vs 1', function (done) {
                var data = {
                    projectId: projectId,
                    commitA: commitChain[0],
                    commitB: commitChain[1],
                };

                storage.getCommonAncestorCommit(data)
                    .then(function (commonHash) {
                        expect(commonHash).to.equal(commitChain[0]);
                        done();
                    })
                    .catch(done);
            });

            it('single chain 1 vs 0', function (done) {
                var data = {
                    projectId: projectId,
                    commitA: commitChain[1],
                    commitB: commitChain[0],
                };

                storage.getCommonAncestorCommit(data)
                    .then(function (commonHash) {
                        expect(commonHash).to.equal(commitChain[0]);
                        done();
                    })
                    .catch(done);
            });

            it('single chain 1 vs 1', function (done) {
                var data = {
                    projectId: projectId,
                    commitA: commitChain[1],
                    commitB: commitChain[1]
                };

                storage.getCommonAncestorCommit(data)
                    .then(function (commonHash) {
                        expect(commonHash).to.equal(commitChain[1]);
                        done();
                    })
                    .catch(done);
            });

            it('single chain 0 vs 49', function (done) {
                var data = {
                    projectId: projectId,
                    commitA: commitChain[0],
                    commitB: commitChain[49],
                };

                storage.getCommonAncestorCommit(data)
                    .then(function (commonHash) {
                        expect(commonHash).to.equal(commitChain[0]);
                        done();
                    })
                    .catch(done);
            });
        });

        describe('complex chain', function () {
            var projectId,
                storage,
                projectName = 'complexChainTest',
                commitChain = [];

            before(function (done) {
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                storage.openDatabase()
                    .then(function () {
                        return testFixture.importProject(storage, {
                            projectSeed: 'seeds/EmptyProject.webgmex',
                            projectName: projectName,
                            gmeConfig: gmeConfig,
                            logger: logger
                        });
                    })
                    .then(function (importResult) {
                        var commitDatas = [],
                            id = 0,
                            project;
                        //finally we create the commit chain
                        //           o -- o           8,9
                        //          /      \
                        //         o        o         7,12
                        //        / \      /
                        //       /   o -- o           10,11
                        // o -- o -- o -- o -- o -- o 1,2,3,4,5,6
                        project = importResult.project;
                        projectId = project.projectId;

                        function addCommitObject(parents) {
                            var commitObject = project.createCommitObject(parents,
                                importResult.rootHash,
                                'tester',
                                id.toString());

                            commitDatas.push({
                                projectId: projectId,
                                commitObject: commitObject,
                                coreObjects: []
                            });

                            id += 1;
                            commitChain.push(commitObject._id);
                        }

                        addCommitObject([importResult.commitHash]);
                        addCommitObject([commitChain[0]]);
                        addCommitObject([commitChain[1]]);
                        addCommitObject([commitChain[2]]);
                        addCommitObject([commitChain[3]]);
                        addCommitObject([commitChain[4]]);
                        addCommitObject([commitChain[5]]);
                        addCommitObject([commitChain[2]]);
                        addCommitObject([commitChain[7]]);
                        addCommitObject([commitChain[8]]);
                        addCommitObject([commitChain[7]]);
                        addCommitObject([commitChain[10]]);
                        addCommitObject([commitChain[9], commitChain[11]]);

                        function makeCommit(commitData) {
                            return storage.makeCommit(commitData);
                        }

                        return Q.allDone(commitDatas.map(makeCommit));
                    })
                    .then(function (/*commitResults*/) {
                        done();
                    })
                    .catch(done);
            });

            after(function (done) {
                storage.closeDatabase(done);
            });

            it('12 vs 6 -> 2', function (done) {
                var data = {
                    projectId: projectId,
                    commitA: commitChain[12],
                    commitB: commitChain[6],
                };

                storage.getCommonAncestorCommit(data, function (err, c) {
                    if (err) {
                        done(err);
                        return;
                    }
                    c.should.be.equal(commitChain[2]);
                    done();
                });
            });

            it('9 vs 11 -> 7', function (done) {
                var data = {
                    projectId: projectId,
                    commitA: commitChain[9],
                    commitB: commitChain[11],
                };

                storage.getCommonAncestorCommit(data, function (err, c) {
                    if (err) {
                        done(err);
                        return;
                    }
                    c.should.be.equal(commitChain[7]);
                    done();
                });
            });

            it('10 vs 4 -> 2', function (done) {
                var data = {
                    projectId: projectId,
                    commitA: commitChain[10],
                    commitB: commitChain[4],
                };

                storage.getCommonAncestorCommit(data, function (err, c) {
                    if (err) {
                        done(err);
                        return;
                    }
                    c.should.be.equal(commitChain[2]);
                    done();
                });
            });

            it('12 vs 8 -> 8', function (done) {
                var data = {
                    projectId: projectId,
                    commitA: commitChain[12],
                    commitB: commitChain[8],
                };

                storage.getCommonAncestorCommit(data, function (err, c) {
                    if (err) {
                        done(err);
                        return;
                    }
                    c.should.be.equal(commitChain[8]);
                    done();
                });
            });

            it('9 vs 5 -> 2', function (done) {
                var data = {
                    projectId: projectId,
                    commitA: commitChain[9],
                    commitB: commitChain[5],
                };

                storage.getCommonAncestorCommit(data, function (err, c) {
                    if (err) {
                        done(err);
                        return;
                    }
                    c.should.be.equal(commitChain[2]);
                    done();
                });
            });

            it('first commit does not exist', function (done) {
                var data = {
                    projectId: projectId,
                    commitA: '#doesNotExist',
                    commitB: commitChain[5],
                };

                storage.getCommonAncestorCommit(data, function (err) {
                    expect(err.message).to.include('Commit object does not exist [#doesNotExist]');
                    done();
                });
            });

            it('second commit does not exist', function (done) {
                var data = {
                    projectId: projectId,
                    commitA: commitChain[5],
                    commitB: '#doesNotExist',
                };

                storage.getCommonAncestorCommit(data, function (err) {
                    expect(err.message).to.include('Commit object does not exist [#doesNotExist]');
                    done();
                });
            });

            it('both commits does not exist', function (done) {
                var data = {
                    projectId: projectId,
                    commitA: '#doesNotExist1',
                    commitB: '#doesNotExist2',
                };

                storage.getCommonAncestorCommit(data, function (err) {
                    expect(err.message).to.include('Commit object does not exist [#doesNotExist1]');
                    done();
                });
            });
        });
    });

    describe('loadPaths', function () {
        var projectName = 'loadPathsTest',
            projectId,
            rootHash,
            storage;

        before(function (done) {

            storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
            storage.openDatabase()
                .then(function () {
                    return testFixture.importProject(storage, {
                        projectSeed: 'test/server/storage/safestorage/loadPaths.webgmex',
                        projectName: projectName,
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (importResult) {
                    var project = importResult.project;
                    projectId = project.projectId;
                    rootHash = importResult.rootHash;
                })
                .then(function () {
                    done();
                })
                .catch(done);
        });

        after(function (done) {
            Q.allDone([
                storage.closeDatabase()
            ])
                .nodeify(done);
        });

        it('should load multiple objects', function (done) {
            var data = {
                projectId: projectId,
                pathsInfo: [
                    {
                        parentHash: rootHash,
                        path: '/1946012150/584624888'
                    },
                    {
                        parentHash: rootHash,
                        path: '/1946012150/584624888/1603996771'
                    },
                    {
                        parentHash: rootHash,
                        path: '/1946012150/584624888/1603996771/1704227179'
                    }
                ]
            };

            storage.loadPaths(data)
                .then(function (objects) {
                    expect(Object.keys(objects).length).to.equal(5);
                    done();
                })
                .catch(done);

        });

        it('should load all parent-objects', function (done) {
            var data = {
                projectId: projectId,
                pathsInfo: [
                    {
                        parentHash: rootHash,
                        path: '/1946012150/584624888/1603996771/1704227179'
                    }
                ]
            };

            storage.loadPaths(data)
                .then(function (objects) {
                    expect(Object.keys(objects).length).to.equal(5);
                    done();
                })
                .catch(done);

        });

        it('should load only one object when parents excluded', function (done) {
            var data = {
                projectId: projectId,
                pathsInfo: [
                    {
                        parentHash: rootHash,
                        path: '/1946012150/584624888/1603996771/1704227179'
                    }
                ],
                excludeParents: true
            };

            storage.loadPaths(data)
                .then(function (objects) {
                    expect(Object.keys(objects).length).to.equal(1);
                    done();
                })
                .catch(done);

        });

        it('should filter out excludes', function (done) {
            var data = {
                    projectId: projectId,
                    pathsInfo: [
                        {
                            parentHash: rootHash,
                            path: '/1946012150/584624888'
                        },
                        {
                            parentHash: rootHash,
                            path: '/1946012150/584624888/1603996771'
                        },
                        {
                            parentHash: rootHash,
                            path: '/1946012150/584624888/1603996771/1704227179'
                        }
                    ],
                    excludes: []
                },
                loadedHashes;

            storage.loadPaths(data)
                .then(function (objects) {
                    loadedHashes = Object.keys(objects);
                    expect(loadedHashes.length).to.equal(5);

                    data.excludes.push(loadedHashes.pop());
                    data.excludes.push(loadedHashes.pop());
                    return storage.loadPaths(data);
                })
                .then(function (objects) {
                    var objHash;
                    for (objHash in objects) {
                        if (data.excludes.indexOf(objHash) > -1) {
                            expect(objects[objHash]).to.equal(undefined);
                        } else if (loadedHashes.indexOf(objHash) > -1) {
                            expect(typeof objects[objHash]).to.equal('object');
                            expect(objects[objHash]).to.not.equal(null);
                        } else {
                            throw new Error('Hash not in excludes nor loadedHashes!');
                        }
                    }
                    done();
                })
                .catch(done);

        });

        it('should load root path', function (done) {
            var data = {
                projectId: projectId,
                pathsInfo: [
                    {
                        parentHash: rootHash,
                        path: ''
                    }
                ]
            };

            storage.loadPaths(data)
                .then(function (objects) {
                    expect(Object.keys(objects)).to.have.members([rootHash]);
                    done();
                })
                .catch(done);
        });

        it('should load root path with additional /', function (done) {
            var data = {
                projectId: projectId,
                pathsInfo: [
                    {
                        parentHash: rootHash,
                        path: '/'
                    }
                ]
            };

            storage.loadPaths(data)
                .then(function (objects) {
                    expect(Object.keys(objects)).to.have.members([rootHash]);
                    done();
                })
                .catch(done);
        });

        it('should not return any nodes if path does not exist (with excludeParents)', function (done) {
            var data = {
                projectId: projectId,
                pathsInfo: [
                    {
                        parentHash: rootHash,
                        path: '/doesNotExist'
                    }
                ],
                excludeParents: true
            };

            storage.loadPaths(data)
                .then(function (objects) {
                    expect(objects).to.deep.equal({});
                    done();
                })
                .catch(done);
        });

        it('should not return any nodes if pathsInfo is empty array', function (done) {
            var data = {
                projectId: projectId,
                pathsInfo: []
            };

            storage.loadPaths(data)
                .then(function (objects) {
                    expect(objects).to.deep.equal({});
                    done();
                })
                .catch(done);
        });

        it('should only return (and as shown by coverage not load) the objects once', function (done) {
            var data = {
                projectId: projectId,
                pathsInfo: [
                    {
                        parentHash: rootHash,
                        path: '/1946012150/584624888'
                    },
                    {
                        parentHash: rootHash,
                        path: '/1946012150/584624888'
                    }
                ],
                excludeParents: false
            };

            storage.loadPaths(data)
                .then(function (objects) {
                    var hashes = Object.keys(objects);
                    expect(hashes.length).to.equal(3);
                    expect(hashes).to.contain(rootHash);
                    done();
                })
                .catch(done);
        });
    });

    describe('squashCommits', function () {
        var safeStorage,
            projectId,
            rootHash,
            project,
            commitHashes = [];

        /*
         * #4 - master
         * | \
         * #2#3
         * | |
         * #1|
         * | /
         * #0
         * */

        before(function (done) {
            safeStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);

            safeStorage.openDatabase()
                .then(function () {
                    return testFixture.importProject(safeStorage, {
                        projectSeed: 'seeds/EmptyProject.webgmex',
                        projectName: 'squashCommits',
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (result) {
                    projectId = result.project.projectId;
                    commitHashes.push(result.commitHash);
                    rootHash = result.rootHash;
                    project = result.project;

                    return project.makeCommit(null, [commitHashes[0]], rootHash, [], '#1');
                })
                .then(function (result) {
                    commitHashes.push(result.hash);
                    return project.makeCommit(null, [result.hash], rootHash, [], '#2');
                })
                .then(function (result) {
                    commitHashes.push(result.hash);
                    return project.makeCommit(null, [commitHashes[0]], rootHash, [], '#3');
                })
                .then(function (result) {
                    commitHashes.push(result.hash);
                    return project.makeCommit(null, [commitHashes[2], commitHashes[3]], rootHash, [], '#4');
                })
                .then(function (result) {
                    commitHashes.push(result.hash);
                    return project.setBranchHash('master', commitHashes[4], commitHashes[0]);
                })
                .nodeify(done);
        });

        after(function (done) {
            safeStorage.closeDatabase(done);
        });

        it('should squash commits 0->1', function (done) {
            var data = {
                    projectId: projectId,
                    fromCommit: commitHashes[0],
                    toCommitOrBranch: commitHashes[1]
                },
                commitHash;

            safeStorage.squashCommits(data)
                .then(function (result) {
                    expect(result).to.have.keys(['hash']);
                    commitHash = result.hash;
                    return safeStorage.loadObjects({
                        projectId: projectId,
                        hashes: [commitHash]
                    });
                })
                .then(function (commitObjects) {
                    expect(commitObjects).not.to.eql(null);
                    expect(commitObjects).to.have.keys([commitHash]);
                    expect(commitObjects[commitHash].parents).to.have.length(1);
                    expect(commitObjects[commitHash].parents[0]).to.equal(commitHashes[0]);
                    expect(commitObjects[commitHash].message).to.contain(commitHashes[1]);
                })
                .nodeify(done);
        });

        it('should squash commits 1->4', function (done) {
            var data = {
                    projectId: projectId,
                    fromCommit: commitHashes[1],
                    toCommitOrBranch: commitHashes[4]
                },
                commitHash;

            safeStorage.squashCommits(data)
                .then(function (result) {
                    expect(result).to.have.keys(['hash']);
                    commitHash = result.hash;
                    return safeStorage.loadObjects({
                        projectId: projectId,
                        hashes: [commitHash]
                    });
                })
                .then(function (commitObjects) {
                    expect(commitObjects).not.to.eql(null);
                    expect(commitObjects).to.have.keys([commitHash]);
                    expect(commitObjects[commitHash].parents).to.have.length(1);
                    expect(commitObjects[commitHash].parents[0]).to.equal(commitHashes[1]);
                    expect(commitObjects[commitHash].message).not.to.contain(commitHashes[3]);
                })
                .nodeify(done);
        });

        it('should squash commits 0->4', function (done) {
            var data = {
                    projectId: projectId,
                    fromCommit: commitHashes[0],
                    toCommitOrBranch: commitHashes[4]
                },
                commitHash;

            safeStorage.squashCommits(data)
                .then(function (result) {
                    expect(result).to.have.keys(['hash']);
                    commitHash = result.hash;
                    return safeStorage.loadObjects({
                        projectId: projectId,
                        hashes: [commitHash]
                    });
                })
                .then(function (commitObjects) {
                    expect(commitObjects).not.to.eql(null);
                    expect(commitObjects).to.have.keys([commitHash]);
                    expect(commitObjects[commitHash].parents).to.have.length(1);
                    expect(commitObjects[commitHash].parents[0]).to.equal(commitHashes[0]);
                    expect(commitObjects[commitHash].message).to.contain(commitHashes[3]);
                })
                .nodeify(done);
        });

        it('should squash commits 0->4 and update master', function (done) {
            var data = {
                    projectId: projectId,
                    fromCommit: commitHashes[0],
                    toCommitOrBranch: 'master'
                },
                commitHash;

            safeStorage.squashCommits(data)
                .then(function (result) {
                    expect(result).to.have.keys(['hash','status']);
                    expect(result.status).to.equal('SYNCED');
                    commitHash = result.hash;
                    return safeStorage.loadObjects({
                        projectId: projectId,
                        hashes: [commitHash]
                    });
                })
                .then(function (commitObjects) {
                    expect(commitObjects).not.to.eql(null);
                    expect(commitObjects).to.have.keys([commitHash]);
                    expect(commitObjects[commitHash].parents).to.have.length(1);
                    expect(commitObjects[commitHash].parents[0]).to.equal(commitHashes[0]);
                    expect(commitObjects[commitHash].message).to.contain(commitHashes[3]);
                })
                .nodeify(done);
        });
    });
})
;