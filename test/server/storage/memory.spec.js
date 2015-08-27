/*globals*/
/*jshint node:true, newcap:false, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../_globals.js');

describe('Memory storage', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect,
        logger = testFixture.logger.fork('memory'),
        Q = testFixture.Q,

        gmeAuth,
        guestAccount = gmeConfig.authentication.guestAccount;


    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, null)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                return Q();
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
            gmeAuth.unload()
        ])
            .nodeify(done);
    });

    it('should create an instance of getMemoryStorage', function () {
        var memoryStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);

        expect(memoryStorage).to.have.property('openDatabase');
        expect(memoryStorage).to.have.property('closeDatabase');
        expect(memoryStorage).to.have.property('getProjects');
        expect(memoryStorage).to.have.property('openProject');
        expect(memoryStorage).to.have.property('deleteProject');
        expect(memoryStorage).to.have.property('createProject');

    });

    it('should open and close', function (done) {
        var memoryStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);

        memoryStorage.openDatabase()
            .then(function () {
                return memoryStorage.closeDatabase();
            })
            .then(done)
            .catch(done);
    });

    it('should open, close, open, and close', function (done) {
        var memoryStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);

        memoryStorage.openDatabase()
            .then(function () {
                return memoryStorage.closeDatabase();
            })
            .then(function () {
                return memoryStorage.openDatabase();
            })
            .then(function () {
                return memoryStorage.closeDatabase();
            })
            .then(done)
            .catch(done);
    });


    it('should allow multiple open calls', function (done) {
        var memoryStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);

        memoryStorage.openDatabase()
            .then(function () {
                return memoryStorage.openDatabase();
            })
            .then(function () {
                return memoryStorage.openDatabase();
            })
            .then(function () {
                return memoryStorage.openDatabase();
            })
            .then(done)
            .catch(done);
    });


    it('should allow multiple close calls', function (done) {
        var memoryStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);

        memoryStorage.closeDatabase()
            .then(function () {
                return memoryStorage.closeDatabase();
            })
            .then(function () {
                return memoryStorage.closeDatabase();
            })
            .then(function () {
                return memoryStorage.closeDatabase();
            })
            .then(done)
            .catch(done);
    });


    describe('project operations', function () {

        function importProjectAndClose(storage, projectName) {
            var deferred = Q.defer(),
                projectId;
            storage.openDatabase()
                .then(function () {
                    return testFixture.importProject(storage, {
                        projectSeed: 'seeds/EmptyProject.json',
                        projectName: projectName,
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (result) {
                    projectId = result.projectId;
                    return storage.closeDatabase();
                })
                .then(function () {
                    deferred.resolve(projectId);
                })
                .catch(deferred.reject);

            return deferred.promise;
        }

        it('should fail to open a project if not connected to database', function (done) {
            var memoryStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth),
                projectName = 'something';

            importProjectAndClose(memoryStorage, projectName)
                .then(function (projectId) {
                    return memoryStorage.openProject({projectId: projectId});
                })
                .then(function () {
                    done(new Error('should have failed to openProject'));
                })
                .catch(function (err) {
                    expect(err instanceof Error).to.equal(true);
                    expect(err.message).to.include('In-memory database has to be initialized.');
                    done();
                })
                .done();
        });

        it('should fail to open a project if project does not exist', function (done) {
            var memoryStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth),
                projectName = 'doesNotExist',
                projectId = testFixture.projectName2Id(projectName);

            memoryStorage.openDatabase()
                .then(function () {
                    return gmeAuth.authorizeByUserId(guestAccount, projectId, 'create',
                        {
                            read: true,
                            write: true,
                            delete: true
                        });
                })
                .then(function () {
                    return memoryStorage.openProject({projectId: projectId});
                })
                .then(function () {
                    done(new Error('should have failed to openProject'));
                })
                .catch(function (err) {
                    expect(err instanceof Error).to.equal(true);
                    expect(err.message).to.include('Project does not exist');
                    done();
                })
                .done();
        });

        it('should fail to delete a project if not connected to database', function (done) {
            var memoryStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth),
                projectName = 'willNotBeDeleted';

            importProjectAndClose(memoryStorage, projectName)
                .then(function (projectId) {
                    return memoryStorage.deleteProject({projectId: projectId});
                })
                .then(function () {
                    done(new Error('should have failed to deleteProject'));
                })
                .catch(function (err) {
                    expect(err instanceof Error).to.equal(true);
                    expect(err.message).to.include('In-memory database has to be initialized.');
                    done();
                })
                .done();
        });

        it('should fail to create a project if not connected to database', function (done) {
            var memoryStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth),
                projectName = 'somethingElse';

            memoryStorage.createProject({projectName: projectName})
                .then(function () {
                    done(new Error('should have failed to createProject'));
                })
                .catch(function (err) {
                    expect(err instanceof Error).to.equal(true);
                    expect(err.message).to.include('In-memory database has to be initialized.');
                    done();
                })
                .done();
        });

        it('should fail to get projects and branches if not connected to database', function (done) {
            var memoryStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth),
                projectName = 'something1';

            importProjectAndClose(memoryStorage, projectName)
                .then(function (/*projectId*/) {
                    return memoryStorage.getProjects({branches: true});
                })
                .then(function () {
                    done(new Error('should have failed to getProjects'));
                })
                .catch(function (err) {
                    expect(err instanceof Error).to.equal(true);
                    expect(err.message).to.include('In-memory database has to be initialized.');
                    done();
                })
                .done();
        });

        it('should get project and branches', function (done) {
            var memoryStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);

            memoryStorage.openDatabase()
                .then(function () {
                    return memoryStorage.getProjects({branches: true});
                })
                .then(function (projects) {
                    expect(projects).deep.equal([]);
                    done();
                })
                .catch(done);
        });

        it('should create a project', function (done) {
            var memoryStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth),
                projectName = 'something2',
                projectId = testFixture.projectName2Id(projectName);

            memoryStorage.openDatabase()
                .then(function () {
                    return memoryStorage.getProjects({branches: true});
                })
                .then(function (projects) {
                    expect(projects).deep.equal([]);
                    return memoryStorage.createProject({projectName: projectName});
                })
                .then(function (dbProject) {
                    projectId = dbProject.projectId;
                    return memoryStorage.getProjects({branches: true});
                })
                .then(function (projects) {
                    expect(projects[0]._id).to.equal(projectId);
                    done();
                })
                .catch(done);
        });

        it('should not have access to project', function (done) {
            var memoryStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth),
                projectName = 'something';

            memoryStorage.openDatabase()
                .then(function () {
                    return memoryStorage.getProjects({username: guestAccount, branches: true});
                })
                .then(function (projects) {
                    expect(projects).deep.equal([]);
                    return memoryStorage.createProject({
                        username: guestAccount,
                        projectName: projectName + '_does_not_have_access'
                    });
                })
                .then(function () {
                    return memoryStorage.getProjects({username: 'admin', branches: true});
                })
                .then(function (projects) {
                    expect(projects).deep.equal([]);
                    done();
                })
                .catch(done);
        });

        it('should fail to create a project if it already exists', function (done) {
            var memoryStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth),
                projectName = 'something';

            memoryStorage.openDatabase()
                .then(function () {
                    return memoryStorage.getProjects({branches: true});
                })
                .then(function (projects) {
                    expect(projects).deep.equal([]);
                    return memoryStorage.createProject({projectName: projectName});
                })
                .then(function () {
                    return memoryStorage.getProjects({branches: true});
                })
                .then(function (projects) {
                    expect(projects.length).to.equal(1, 'getProject should have returned with one.');
                    return memoryStorage.createProject({projectName: projectName});
                })
                .then(function () {
                    done(new Error('should have failed to createProject'));
                })
                .catch(function (err) {
                    expect(err instanceof Error).to.equal(true);
                    expect(err.message).to.include('Project already exists');
                    done();
                })
                .done();
        });

        it('should create and delete a project', function (done) {
            var memoryStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth),
                projectName = 'something3',
                projectId = testFixture.projectName2Id(projectName);

            memoryStorage.openDatabase()
                .then(function () {
                    return memoryStorage.getProjects({branches: true});
                })
                .then(function (projects) {
                    expect(projects).deep.equal([]);
                    return memoryStorage.createProject({projectName: projectName});
                })
                .then(function (dbProject) {
                    projectId = dbProject.projectId;
                    return memoryStorage.getProjects({branches: true});
                })
                .then(function (projects) {
                    expect(projects.length).to.equal(1, 'getProject should have returned with one.');
                    expect(projects[0]._id).to.equal(projectId);
                    return memoryStorage.deleteProject({projectId: projectId});
                })
                .then(function (result) {
                    expect(result).to.equal(true);
                    return memoryStorage.getProjects({branches: true});
                })
                .then(function (projects) {
                    expect(projects).deep.equal([]);
                    done();
                })
                .catch(done);
        });

        it('should delete a non-existent project', function (done) {
            var memoryStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);

            gmeAuth.authorizeByUserId(guestAccount, 'something', 'create',
                {
                    read: true,
                    write: true,
                    delete: true
                })
                .then(function () {
                    return memoryStorage.openDatabase();
                })
                .then(function () {
                    return memoryStorage.getProjects({branches: true});
                })
                .then(function (projects) {
                    expect(projects).deep.equal([]);
                    return memoryStorage.deleteProject({projectId: 'something'});
                })
                .then(function (result) {
                    expect(result).to.equal(false);
                    return memoryStorage.getProjects({branches: true});
                })
                .then(function (projects) {
                    expect(projects).deep.equal([]);
                    done();
                })
                .catch(done);
        });

        it('should open an existing project', function (done) {
            var memoryStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth),
                projectId,
                projectName = 'createdAndExisting';

            memoryStorage.openDatabase()
                .then(function () {
                    return memoryStorage.getProjects({branches: true});
                })
                .then(function (projects) {
                    expect(projects).deep.equal([]);
                    return memoryStorage.createProject({projectName: projectName});
                })
                .then(function (dbProject) {
                    projectId = dbProject.projectId;
                    return memoryStorage.getProjects({branches: true});
                })
                .then(function (projects) {
                    expect(projects.length).to.equal(1, 'getProject should have returned with one.');
                    expect(projects[0]._id).deep.equal(projectId);
                    return memoryStorage.getBranches({projectId: projectId});
                })
                .then(function (branches) {
                    // expect names of branches
                    expect(branches).deep.equal({});
                    done();
                })
                .catch(done);
        });

        it('should get an existing project', function (done) {
            var memoryStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth),
                projectId,
                projectName = 'createdAndGettable';

            memoryStorage.openDatabase()
                .then(function () {
                    return memoryStorage.getProjects({branches: true});
                })
                .then(function (projects) {
                    expect(projects).deep.equal([]);
                    return memoryStorage.createProject({projectName: projectName});
                })
                .then(function (project) {
                    projectId = project.projectId;
                    return memoryStorage.getProjects({branches: true});
                })
                .then(function (projects) {
                    expect(projects.length).to.equal(1, 'getProject should have returned with one.');
                    expect(projects[0]._id).to.equal(projectId);
                    return memoryStorage._getProject({projectId: projectId});
                })
                .then(function (project) {

                    expect(project.projectId).equal(projectId);

                    expect(project).to.have.property('closeProject');
                    expect(project).to.have.property('loadObject');
                    expect(project).to.have.property('insertObject');
                    expect(project).to.have.property('getBranches');
                    expect(project).to.have.property('getBranchHash');
                    expect(project).to.have.property('setBranchHash');
                    expect(project).to.have.property('getCommits');
                    expect(project).to.have.property('getCommonAncestorCommit');

                    done();
                })
                .catch(done);
        });

        it('should fail to insert object with circular references to an existing project', function (done) {
            var memoryStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth),
                projectId,
                projectName = 'circularReference';

            memoryStorage.openDatabase()
                .then(function () {
                    return memoryStorage.getProjects({branches: true});
                })
                .then(function (projects) {
                    expect(projects).deep.equal([]);
                    return memoryStorage.createProject({projectName: projectName});
                })
                .then(function (project) {
                    projectId = project.projectId;
                    return memoryStorage.getProjects({branches: true});
                })
                .then(function (projects) {
                    expect(projects.length).to.equal(1, 'getProject should have returned with one.');
                    expect(projects[0]._id).to.equal(projectId);
                    return memoryStorage._getProject({projectId: projectId});
                })
                .then(function (project) {
                    var data = {
                        _id: '#123',
                        a: {
                            b: 42
                        }
                    };

                    data.a.p = data; // create circular reference

                    expect(project.projectId).equal(projectId);

                    return project.insertObject(data);
                })
                .then(function () {
                    done(new Error('should have failed'));
                })
                .catch(function (err) {
                    expect(err instanceof Error).to.equal(true);
                    expect(err.message).to.include('circular structure');
                    done();
                })
                .done();
        });

        it('should import, open, and close a project', function (done) {
            var storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth),
                projectName = 'imported';

            storage.openDatabase()
                .then(function () {
                    return testFixture.importProject(storage, {
                        projectSeed: 'seeds/EmptyProject.json',
                        projectName: projectName,
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (result) {
                    expect(result.projectId).to.equal(testFixture.projectName2Id(projectName));
                    return storage._getProject({projectId: result.projectId});
                })
                .then(function (project) {
                    return project.closeProject();
                })
                .then(done)
                .catch(done);
        });
    });

    describe('project specific functions', function () {
        var project,
            projectName = 'MemoryProjectSpecificFunctions',
            projectId = testFixture.projectName2Id(projectName);

        before(function (done) {
            var storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);

            storage.openDatabase()
                .then(function () {
                    return testFixture.importProject(storage, {
                        projectSeed: 'seeds/EmptyProject.json',
                        projectName: projectName,
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (result) {
                    expect(result.projectId).to.equal(projectId);
                    return storage._getProject({projectId: projectId});
                })
                .then(function (p) {
                    project = p;
                })
                .then(done)
                .catch(done);
        });

        it('should getBranches', function (done) {
            project.getBranches()
                .then(function (branches) {
                    expect(branches).to.have.property('master');
                    done();
                })
                .catch(done);
        });


        it('should getCommits', function (done) {
            project.getCommits((new Date()).getTime() + 1, 10)
                .then(function (commits) {
                    expect(commits.length).equal(1);
                    done();
                })
                .catch(done);
        });

        it('should get one commit', function (done) {
            project.getCommits((new Date()).getTime() + 1, 1)
                .then(function (commits) {
                    expect(commits.length).equal(1);
                    done();
                })
                .catch(done);
        });

        it('should load root object', function (done) {
            var commit;
            project.getCommits((new Date()).getTime() + 1, 1)
                .then(function (commits) {
                    expect(commits.length).equal(1);
                    commit = commits[0];
                    return project.loadObject(commit.root);
                })
                .then(function (rootNode) {
                    expect(rootNode._id).deep.equal(commit.root);
                    done();
                })
                .catch(done);
        });

        it('should getBranchHash', function (done) {
            project.getBranchHash('master')
                .then(function (hash) {
                    return project.getBranchHash('master', hash);
                })
                .then(function (/*hash*/) {
                    done();
                })
                .catch(done);
        });

        it('should setBranchHash - create a new branch', function (done) {
            project.getBranchHash('master')
                .then(function (hash) {
                    return project.setBranchHash('new_branch', '', hash);
                })
                .then(function () {
                    return project.getBranches();
                })
                .then(function (branches) {
                    expect(branches).to.have.property('master');
                    expect(branches).to.have.property('new_branch');
                    done();
                })
                .catch(done);
        });

        it('should setBranchHash - delete a branch', function (done) {
            project.getBranchHash('master')
                .then(function (hash) {
                    return project.setBranchHash('toBeDeletedBranch', '', hash);
                })
                .then(function () {
                    return project.getBranches();
                })
                .then(function (branches) {
                    expect(branches).to.have.property('master');
                    expect(branches).to.have.property('toBeDeletedBranch');
                    return project.setBranchHash('toBeDeletedBranch', branches.toBeDeletedBranch, '');
                })
                .then(function () {
                    return project.getBranches();
                })
                .then(function (branches) {
                    expect(branches).to.have.property('master');
                    expect(branches).to.not.have.property('toBeDeletedBranch');
                    done();
                })
                .catch(done);
        });


        it('should not change branch hash if old hash is the same as new hash', function (done) {
            project.getBranchHash('master')
                .then(function (hash) {
                    return project.setBranchHash('stable', '', hash);
                })
                .then(function () {
                    return project.getBranches();
                })
                .then(function (branches) {
                    expect(branches).to.have.property('master');
                    expect(branches).to.have.property('stable');
                    return project.setBranchHash('stable', branches.stable, branches.stable);
                })
                .then(function () {
                    return project.getBranches();
                })
                .then(function (branches) {
                    expect(branches).to.have.property('master');
                    expect(branches).to.have.property('stable');
                    expect(branches.master).deep.equal(branches.stable);
                    done();
                })
                .catch(done);
        });

        it('should fail to set branch hash if oldhash does not match', function (done) {
            project.getBranchHash('master')
                .then(function (hash) {
                    return project.setBranchHash('dummy', '', hash);
                })
                .then(function () {
                    return project.getBranches();
                })
                .then(function (branches) {
                    expect(branches).to.have.property('master');
                    expect(branches).to.have.property('dummy');
                    return project.setBranchHash('dummy', '', '');
                })
                .then(function () {
                    done(new Error('should have failed'));
                })
                .catch(function (err) {
                    if (err.message === 'branch hash mismatch') {
                        done();
                    } else {
                        done(new Error('should have failed to set branch hash'));
                    }
                });
        });

        it('should fail to to set branch hash if oldhash does not match', function (done) {
            project.getBranchHash('master', '')
                .then(function (hash) {
                    return project.setBranchHash('dummy', '', hash);
                })
                .then(function () {
                    return project.getBranches();
                })
                .then(function (branches) {
                    expect(branches).to.have.property('master');
                    expect(branches).to.have.property('dummy');
                    return project.setBranchHash('dummy', '', '#0123456789012345678901234567890123456789');
                })
                .then(function () {
                    done(new Error('should have failed'));
                })
                .catch(function (err) {
                    if (err.message === 'branch hash mismatch') {
                        done();
                    } else {
                        done(new Error('should have failed to to set branch hash'));
                    }
                });
        });
    });

    describe('complex chain', function () {
        var project,
            projectName = 'MemoryComplexChainTest',
            projectId = testFixture.projectName2Id(projectName),
            storage,
            commitChain = [];

        before(function (done) {
            storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
            storage.openDatabase()
                .then(function () {
                    return testFixture.importProject(storage, {
                        projectSeed: 'seeds/EmptyProject.json',
                        projectName: projectName,
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (importResult) {
                    expect(importResult.projectId).to.equal(projectId);
                    var commitDatas = [],
                        id = 0;
                    //finally we create the commit chain
                    //           o -- o           8,9
                    //          /      \
                    //         o        o         7,12
                    //        / \      /
                    //       /   o -- o           10,11
                    // o -- o -- o -- o -- o -- o 1,2,3,4,5,6
                    project = importResult.project;
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
            storage.deleteProject({projectId: projectId})
                .then(function () {
                    storage.closeDatabase(done);
                })
                .catch(function (err) {
                    logger.error(err);
                    storage.closeDatabase(done);
                });
        });

        it('12 vs 6 -> 2', function (done) {
            project.getCommonAncestorCommit(commitChain[12], commitChain[6], function (err, c) {
                if (err) {
                    done(err);
                    return;
                }
                c.should.be.equal(commitChain[2]);
                done();
            });
        });
        it('9 vs 11 -> 7', function (done) {
            project.getCommonAncestorCommit(commitChain[9], commitChain[11], function (err, c) {
                if (err) {
                    done(err);
                    return;
                }
                c.should.be.equal(commitChain[7]);
                done();
            });
        });
        it('10 vs 4 -> 2', function (done) {
            project.getCommonAncestorCommit(commitChain[10], commitChain[4], function (err, c) {
                if (err) {
                    done(err);
                    return;
                }
                c.should.be.equal(commitChain[2]);
                done();
            });
        });
        it('12 vs 8 -> 8', function (done) {
            project.getCommonAncestorCommit(commitChain[12], commitChain[8], function (err, c) {
                if (err) {
                    done(err);
                    return;
                }
                c.should.be.equal(commitChain[8]);
                done();
            });
        });
        it('9 vs 5 -> 2', function (done) {
            project.getCommonAncestorCommit(commitChain[9], commitChain[5], function (err, c) {
                if (err) {
                    done(err);
                    return;
                }
                c.should.be.equal(commitChain[2]);
                done();
            });
        });
        it('5 vs 5 -> 5', function (done) {
            project.getCommonAncestorCommit(commitChain[5], commitChain[5], function (err, c) {
                if (err) {
                    done(err);
                    return;
                }
                c.should.be.equal(commitChain[5]);
                done();
            });
        });
        it('first commit does not exist', function (done) {
            project.getCommonAncestorCommit('#doesNotExist', commitChain[5], function (err) {
                expect(err.message).to.include('Commit object does not exist [#doesNotExist]');
                done();
            });
        });
        it('second commit does not exist', function (done) {
            project.getCommonAncestorCommit(commitChain[5], '#doesNotExist', function (err) {
                expect(err.message).to.include('Commit object does not exist [#doesNotExist]');
                done();
            });
        });
        it('both commits does not exist', function (done) {
            project.getCommonAncestorCommit('#doesNotExist1', '#doesNotExist2', function (err) {
                expect(err.message).to.include('Commit object does not exist [#doesNotExist1]');
                done();
            });
        });
    });
});
