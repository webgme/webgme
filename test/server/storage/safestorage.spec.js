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
                        expect(err.message).to.contain('Error: Tried to setBranchHash to invalid or non-existing' +
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
            commitHash;

        before(function (done) {
            safeStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);

            safeStorage.openDatabase()
                .then(function () {
                    return testFixture.importProject(safeStorage, {
                        projectSeed: 'seeds/EmptyProject.json',
                        projectName: 'getCommits',
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (result) {
                    projectId = result.project.projectId;
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
                    expect(err.message).to.include('object does not exist ' + dummyHash);
                    done();
                })
                .done();
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
                        projectSeed: 'seeds/EmptyProject.json',
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

        it('should emit BRANCH_UPDATED when makeCommit and include root when root was provided', function (done) {
            var eventHandler = function (_storage, eventData) {
                    expect(eventData.branchName).to.equal('branchUpdatedCommitWithNodes');
                    expect(eventData.commitObject._id).to.not.equal(importResult.commitHash);
                    expect(eventData.commitObject.root).to.equal(newRootHash);
                    expect(eventData.coreObjects instanceof Array).to.equal(true);
                    expect(eventData.coreObjects.length).to.equal(1);
                    expect(eventData.coreObjects[0]._id).to.equal(newRootHash);
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
        });

        it('should emit BRANCH_UPDATED when makeCommit and include root when root was not provided', function (done) {
            var eventHandler = function (_storage, eventData) {
                expect(eventData.branchName).to.equal('branchUpdatedCommitWithOutNodes');
                expect(eventData.commitObject._id).to.not.equal(importResult.commitHash);
                expect(eventData.commitObject.root).to.equal(importResult.rootHash);
                expect(eventData.coreObjects instanceof Array).to.equal(true);
                expect(eventData.coreObjects.length).to.equal(1);
                expect(eventData.coreObjects[0]._id).to.equal(importResult.rootHash);
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
    });

    describe('gmeConfig.storage.emitCommittedCoreObjects', function () {
        var safeStorage,
            project,
            projectId,
            gmeConfigEmit = testFixture.getGmeConfig(),
            importResult;

        before(function (done) {
            gmeConfigEmit.storage.emitCommittedCoreObjects = true;
            safeStorage = testFixture.getMemoryStorage(logger, gmeConfigEmit, gmeAuth);

            safeStorage.openDatabase()
                .then(function () {
                    return testFixture.importProject(safeStorage, {
                        projectSeed: 'seeds/EmptyProject.json',
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
                        project.createBranch('emitAllNoNodes', importResult.commitHash)
                    ]);
                })
                .nodeify(done);
        });

        after(function (done) {
            safeStorage.closeDatabase(done);
        });

        it('should emit BRANCH_UPDATED when makeCommit and include all object provided', function (done) {
            var eventHandler = function (_storage, eventData) {
                    expect(eventData.branchName).to.equal('emitAllWithNodes');
                    expect(eventData.commitObject._id).to.not.equal(importResult.commitHash);
                    expect(eventData.commitObject.root).to.equal(newRootHash);
                    expect(eventData.coreObjects instanceof Array).to.equal(true);
                    expect(eventData.coreObjects.length).to.equal(2);
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

        it('should emit BRANCH_UPDATED when makeCommit and include root when root was not provided', function (done) {
            var eventHandler = function (_storage, eventData) {
                expect(eventData.branchName).to.equal('emitAllNoNodes');
                expect(eventData.commitObject._id).to.not.equal(importResult.commitHash);
                expect(eventData.commitObject.root).to.equal(importResult.rootHash);
                expect(eventData.coreObjects instanceof Array).to.equal(true);
                expect(eventData.coreObjects.length).to.equal(1);
                expect(eventData.coreObjects[0]._id).to.equal(importResult.rootHash);
                safeStorage.clearAllEvents();
                done();
            };

            safeStorage.addEventListener(project.CONSTANTS.BRANCH_UPDATED, eventHandler);

            project.makeCommit(
                'emitAllNoNodes',
                [importResult.commitHash],
                importResult.rootHash,
                {},
                'emitAllNoNodes'
            )
                .catch(done);
        });
    });

    describe('Project Creation/Transfer', function () {
        var safeStorage,
            notInOrgCanNotCreate = 'notInOrgCanNotCreate',
            notInOrgCanCreate = 'notInOrgCanCreate',
            inOrgCanCreateNotAdmin = 'inOrgCanCreateNotAdmin',
            inOrgCanCreateAdmin = 'inOrgCanCreateAdmin';

        before(function (done) {
            Q.allDone([
                gmeAuth.addUser(notInOrgCanNotCreate, '@', 'p', false, {}),
                gmeAuth.addUser(notInOrgCanCreate, '@', 'p', true, {}),
                gmeAuth.addUser(inOrgCanCreateNotAdmin, '@', 'p', true, {}),
                gmeAuth.addUser(inOrgCanCreateAdmin, '@', 'p', true, {}),
                gmeAuth.addOrganization('theOrg')
            ])
                .then(function () {
                    return Q.allDone([
                        gmeAuth.addUserToOrganization(inOrgCanCreateNotAdmin, 'theOrg'),
                        gmeAuth.addUserToOrganization(inOrgCanCreateAdmin, 'theOrg'),
                        gmeAuth.setAdminForUserInOrganization(inOrgCanCreateAdmin, 'theOrg', true)
                    ]);
                })
                .then(function () {
                    safeStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                    return safeStorage.openDatabase();
                })
                .nodeify(done);
        });

        after(function (done) {
            safeStorage.closeDatabase(done);
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
                    expect(err.message).to.contain('Not authorized to create a new project');
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
                    expect(err.message).to.contain('Not authorized to create a new project');
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
                    return safeStorage.getProjects(data);
                })
                .then(function (projects) {
                    expect(projects.hasOwnProperty(projectId));
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
                    expect(err.message).to.contain('Not authorized to create project in organization theOrg');
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
                    expect(err.message).to.contain('Not authorized to create project in organization theOrg');
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
                    return safeStorage.getProjects(data);
                })
                .then(function (projects) {
                    expect(projects.hasOwnProperty(projectId));
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
                    expect(err.message).to.contain('No such organization [inOrgCanCreateNotAdmin]');
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
                    expect(err.message).to.contain('Not authorized to transfer project to organization theOrg');
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
                    expect(err.message).to.contain('Error: Not authorized to delete project: doesNotExistTransfer');
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
                    expect(err.message).to.contain('Not authorized to transfer projects to other users');
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
                    expect(err.message).to.contain('no such user or org [doesNotExist]');
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
    });
});