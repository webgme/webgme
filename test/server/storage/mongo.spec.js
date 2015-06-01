/*globals*/
/*jshint node:true, newcap:false, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../_globals.js');

describe('Mongo storage', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect,
        logger = testFixture.logger.fork('mongo'),
        Q = testFixture.Q,
        projectName = 'newProject',
        projectDoesNotHaveAccessName = projectName + '_does_not_have_access',

        storage,

        gmeAuth,

        guestAccount = gmeConfig.authentication.guestAccount;


    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                return Q.all([
                    storage.openDatabase(),
                    gmeAuth.authorizeByUserId(guestAccount, projectName + '_does_not_have_access', 'create',
                        {
                            read: true,
                            write: true,
                            delete: true
                        })
                ]);
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.all([
            gmeAuth.unload()
        ])
            .nodeify(done);
    });

    it('should create an instance of getMongoStorage', function () {
        var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

        expect(mongoStorage).to.have.property('openDatabase');
        expect(mongoStorage).to.have.property('closeDatabase');
        expect(mongoStorage).to.have.property('getProjectNames');
        expect(mongoStorage).to.have.property('openProject');
        expect(mongoStorage).to.have.property('deleteProject');
        expect(mongoStorage).to.have.property('createProject');

    });

    it('should fail to open', function (done) {
        var mongoStorage,
            gmeConfigCustom = testFixture.getGmeConfig();

        this.timeout(5000);

        gmeConfigCustom.mongo.uri = 'mongodb://127.0.0.1:27016/multi';

        mongoStorage = testFixture.getMongoStorage(logger, gmeConfigCustom, gmeAuth);

        mongoStorage.openDatabase()
            .then(function () {
                done(new Error('should have failed to connect to mongo'));
            })
            .catch(function (err) {
                if (err && err instanceof Error && err.message.indexOf('failed to connect to') > -1) {
                    done();
                } else {
                    done(err || new Error('should have failed to connect to mongo'));
                }
            });
    });

    it('should open and close', function (done) {
        var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

        mongoStorage.openDatabase()
            .then(function () {
                return mongoStorage.closeDatabase();
            })
            .then(done)
            .catch(done);
    });

    it('should open, close, open, and close', function (done) {
        var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

        mongoStorage.openDatabase()
            .then(function () {
                return mongoStorage.closeDatabase();
            })
            .then(function () {
                return mongoStorage.openDatabase();
            })
            .then(function () {
                return mongoStorage.closeDatabase();
            })
            .then(done)
            .catch(done);
    });


    it('should allow multiple open calls', function (done) {
        var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

        mongoStorage.openDatabase()
            .then(function () {
                return mongoStorage.openDatabase();
            })
            .then(function () {
                return mongoStorage.openDatabase();
            })
            .then(function () {
                return mongoStorage.openDatabase();
            })
            .then(done)
            .catch(done);
    });


    it('should allow multiple close calls', function (done) {
        var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

        mongoStorage.closeDatabase()
            .then(function () {
                return mongoStorage.closeDatabase();
            })
            .then(function () {
                return mongoStorage.closeDatabase();
            })
            .then(function () {
                return mongoStorage.closeDatabase();
            })
            .then(done)
            .catch(done);
    });

    it('should allow open then multiple close calls', function (done) {
        var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

        mongoStorage.openDatabase()
            .then(function () {
                return mongoStorage.closeDatabase();
            })
            .then(function () {
                return mongoStorage.closeDatabase();
            })
            .then(function () {
                return mongoStorage.closeDatabase();
            })
            .then(done)
            .catch(done);
    });


    describe('project operations', function () {

        beforeEach(function (done) {
            Q.all([
                storage.deleteProject({projectName: projectName}),
                storage.deleteProject({projectName: projectDoesNotHaveAccessName})
            ])
                .nodeify(done);
        });

        it('should fail to open a project if not connected to database', function (done) {
            var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.openProject({projectName: 'something'})
                .then(function () {
                    done(new Error('should have failed to openProject'));
                })
                .catch(function (err) {
                    if (err instanceof Error) {
                        // TODO: check error message
                        done();
                    } else {
                        done(new Error('should have failed to openProject'));
                    }
                });
        });

        it('should fail to delete a project if not connected to database', function (done) {
            var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.deleteProject({projectName: 'something'})
                .then(function () {
                    done(new Error('should have failed to deleteProject'));
                })
                .catch(function (err) {
                    if (err instanceof Error) {
                        // TODO: check error message
                        done();
                    } else {
                        done(new Error('should have failed to deleteProject'));
                    }
                });
        });

        it('should fail to create a project if not connected to database', function (done) {
            var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.createProject({projectName: 'something'})
                .then(function () {
                    done(new Error('should have failed to createProject'));
                })
                .catch(function (err) {
                    if (err instanceof Error) {
                        // TODO: check error message
                        done();
                    } else {
                        done(new Error('should have failed to createProject'));
                    }
                });
        });

        it('should fail to get project names if not connected to database', function (done) {
            var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.getProjectNames({})
                .then(function () {
                    done(new Error('should have failed to getProjectNames'));
                })
                .catch(function (err) {
                    if (err instanceof Error) {
                        // TODO: check error message
                        done();
                    } else {
                        done(new Error('should have failed to getProjectNames'));
                    }
                });
        });

        it('should get project names', function (done) {
            var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.openDatabase()
                .then(function () {
                    return mongoStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                    done();
                })
                .catch(done);
        });


        it('should create a project', function (done) {
            var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.openDatabase()
                .then(function () {
                    return mongoStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                    return mongoStorage.createProject({projectName: projectName});
                })
                .then(function () {
                    return mongoStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([projectName]);
                    done();
                })
                .catch(done);
        });

        it('should not have access to project', function (done) {
            var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.openDatabase()
                .then(function () {
                    return mongoStorage.getProjectNames({username: guestAccount});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                    return mongoStorage.createProject({
                        username: guestAccount,
                        projectName: projectName + '_does_not_have_access'
                    });
                })
                .then(function () {
                    return mongoStorage.getProjectNames({username: 'admin'});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                })
                .nodeify(done);
        });

        it('should fail to create a project if it already exists', function (done) {
            var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.openDatabase()
                .then(function () {
                    return mongoStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                    return mongoStorage.createProject({projectName: projectName});
                })
                .then(function () {
                    return mongoStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([projectName]);
                    return mongoStorage.createProject({projectName: projectName});
                })
                .then(function () {
                    done(new Error('should have failed to createProject'));
                })
                .catch(function (err) {
                    if (err instanceof Error) {
                        // TODO: check error message
                        done();
                    } else {
                        done(new Error('should have failed to createProject'));
                    }
                });
        });

        it('should create and delete a project', function (done) {
            var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.openDatabase()
                .then(function () {
                    return mongoStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                    return mongoStorage.createProject({projectName: projectName});
                })
                .then(function () {
                    return mongoStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([projectName]);
                    return mongoStorage.deleteProject({projectName: projectName});
                })
                .then(function () {
                    return mongoStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                    done();
                })
                .catch(done);
        });

        it('should open an existing project', function (done) {
            var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.openDatabase()
                .then(function () {
                    return mongoStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                    return mongoStorage.createProject({projectName: projectName});
                })
                .then(function () {
                    return mongoStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([projectName]);
                    return mongoStorage.getBranches({projectName: projectName});
                })
                .then(function (branches) {
                    // expect names of branches
                    expect(branches).deep.equal({});
                    done();
                })
                .catch(done);
        });

        it('should get an existing project', function (done) {
            var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.openDatabase()
                .then(function () {
                    return mongoStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                    return mongoStorage.createProject({projectName: projectName});
                })
                .then(function () {
                    return mongoStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([projectName]);
                    return mongoStorage.openProject({projectName: projectName});
                })
                .then(function (project) {

                    expect(project.name).equal(projectName);

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


        it('should fail to open a non-existing project', function (done) {
            var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.openDatabase()
                .then(function () {
                    return mongoStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                    return mongoStorage.openProject({projectName: 'project_does_not_exist'});
                })
                .then(function () {
                    done(new Error('expected to fail'));
                })
                .catch(function (err) {
                    if (err instanceof Error) {
                        // TODO: check error message
                        done();
                    } else {
                        done(new Error('should have failed to openProject'));
                    }
                });
        });

        it('should import, open, and close a project', function (done) {
            var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.openDatabase()
                .then(function () {
                    return mongoStorage.deleteProject({projectName: projectName});
                })
                .then(function () {
                    return testFixture.importProject(storage, {
                        projectSeed: 'seeds/EmptyProject.json',
                        projectName: projectName,
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (result) {
                    //console.log(result);
                    return mongoStorage.openProject({projectName: projectName});
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
            mongoStorage;

        beforeEach(function (done) {
            mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.openDatabase()
                .then(function () {
                    return mongoStorage.deleteProject({projectName: projectName});
                })
                .then(function () {
                    return testFixture.importProject(mongoStorage, {
                        projectSeed: 'seeds/EmptyProject.json',
                        projectName: projectName,
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (result) {
                    return mongoStorage.openProject({projectName: projectName});
                })
                .then(function (p) {
                    project = p;
                })
                .nodeify(done);
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
            project.getBranchHash('master', '')
                .then(function (hash) {
                    return project.getBranchHash('master', hash);
                })
                .then(function (hash) {
                    done();
                })
                .catch(done);
        });

        it('should setBranchHash - create a new branch', function (done) {
            project.getBranchHash('master', '')
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
            project.getBranchHash('master', '')
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
            project.getBranchHash('master', '')
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
                    return project.setBranchHash('dummy', '', '');
                })
                .then(function () {
                    done(new Error('should have failed'));
                })
                .catch(function (err) {
                    if (err === "branch hash mismatch") {
                        // TODO: check error message
                        done();
                    } else {
                        done(new Error('should have failed to openProject'));
                    }
                });
        });

        it('should fail to set new branch hash if oldhash does not match', function (done) {
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
                    if (err === "branch hash mismatch") {
                        // TODO: check error message
                        done();
                    } else {
                        done(new Error('should have failed to openProject'));
                    }
                });
        });
    });

    describe('complex chain', function () {
        var project,
            projectName = 'complexChainTest',
            mongoStorage,
            commitChain = [];

        before(function (done) {
            mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
            mongoStorage.openDatabase()
                .then(function () {
                    return testFixture.importProject(mongoStorage, {
                        projectSeed: 'seeds/EmptyProject.json',
                        projectName: projectName,
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (importResult) {
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
                            projectName: 'complexChainTest',
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
                        return mongoStorage.makeCommit(commitData);
                    }

                    return Q.all(commitDatas.map(makeCommit));
                })
                .then(function (/*commitResults*/) {
                    done();
                })
                .catch(done);
        });

        after(function (done) {
            mongoStorage.deleteProject({projectName: projectName})
                .then(function () {
                    mongoStorage.closeDatabase(done);
                })
                .catch(function (err) {
                    logger.error(err);
                    mongoStorage.closeDatabase(done);
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
    });
});
