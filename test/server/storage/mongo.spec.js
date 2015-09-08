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
        projectId = gmeConfig.authentication.guestAccount + testFixture.STORAGE_CONSTANTS.PROJECT_ID_SEP + projectName,
        projectDoesNotHaveAccessName = projectName + '_does_not_have_access',
        projectDoesNotHaveAccessId = gmeConfig.authentication.guestAccount +
            testFixture.STORAGE_CONSTANTS.PROJECT_ID_SEP + projectDoesNotHaveAccessName,

        gmeAuth,

        guestAccount = gmeConfig.authentication.guestAccount;


    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, [projectName, projectDoesNotHaveAccessName])
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                return Q.allDone([
                    gmeAuth.authorizeByUserId(guestAccount, projectDoesNotHaveAccessId, 'create',
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
        Q.allDone([
            gmeAuth.unload()
        ])
            .nodeify(done);
    });

    it('should create an instance of getMongoStorage', function () {
        var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

        expect(mongoStorage).to.have.property('openDatabase');
        expect(mongoStorage).to.have.property('closeDatabase');
        expect(mongoStorage).to.have.property('getProjects');
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

    it('should allow multiple open calls with same instance', function (done) {
        var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

        mongoStorage.openDatabase()
            .then(function () {
                return mongoStorage.openDatabase();
            })
            .then(function () {
                return mongoStorage.createProject({projectName: 'someProject'});
            })
            .then(function (project) {
                return project.getBranches();
            })
            .then(function () {
                return Q.allDone([
                    mongoStorage.closeDatabase(),
                    mongoStorage.closeDatabase()
                ]);
            })
            .then(function () {
                mongoStorage.createProject({projectName: 'someOtherProject'})
                    .then(function () {
                        throw new Error('should have failed to create project when db closed!');
                    })
                    .catch(function (err) {
                        expect(err.message).to.contain('Database is not open');
                        done();
                    })
                    .done();
            })
            .done();
    });

    it('should allow multiple concurrent open calls with same instance', function (done) {
        var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

        Q.allDone([
            mongoStorage.openDatabase(),
            mongoStorage.openDatabase()
        ])
            .then(function () {
                return mongoStorage.createProject({projectName: 'someConProject'});
            })
            .then(function (project) {
                return project.getBranches();
            })
            .then(function () {
                return Q.allDone([
                    mongoStorage.closeDatabase(),
                    mongoStorage.closeDatabase()
                ]);
            })
            .then(function () {
                mongoStorage.createProject({projectName: 'someOtherConProject'})
                    .then(function () {
                        throw new Error('should have failed to create project when db closed!');
                    })
                    .catch(function (err) {
                        expect(err.message).to.contain('Database is not open');
                        done();
                    })
                    .done();
            })
            .done();
    });

    it('should allow multiple open and close with same instances', function (done) {
        var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth),
            cnt = 2;

        mongoStorage.openDatabase()
            .then(function () {
                return mongoStorage.openDatabase();
            })
            .then(function () {
                mongoStorage.closeDatabase()
                    .then(function () {
                        // This will not resolve until the second closeDatabase has finished.
                        cnt -= 1;
                        if (cnt === 0) {
                            done();
                        }
                    });
                return mongoStorage.createProject({projectName: 'someProj'});
            })
            .then(function (project) {
                return project.getBranches();
            })
            .then(function () {
                return mongoStorage.closeDatabase();
            })
            .then(function () {
                mongoStorage.createProject({projectName: 'someOtherProj'})
                    .then(function () {
                        throw new Error('should have failed to create project when db closed!');
                    })
                    .catch(function (err) {
                        expect(err.message).to.contain('Database is not open');
                        cnt -= 1;
                        if (cnt === 0) {
                            done();
                        }
                    })
                    .done();
            })
            .done();
    });

    it('should allow multiple open and close with same instances 2', function (done) {
        var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth),
            cnt = 2;

        mongoStorage.openDatabase()
            .then(function () {
                return mongoStorage.openDatabase();
            })
            .then(function () {
                mongoStorage.closeDatabase()
                    .then(function () {
                        // This will not resolve until the second closeDatabase has finished.
                        cnt -= 1;
                        if (cnt === 0) {
                            done();
                        }
                    });
                return mongoStorage.createProject({projectName: 'someProj2'});
            })
            .then(function (project) {
                return project.getBranches();
            })
            .then(function () {
                return mongoStorage.closeDatabase();
            })
            .then(function () {
                mongoStorage.createProject({projectName: 'someOtherProj2'})
                    .then(function () {
                        throw new Error('should have failed to create project when db closed!');
                    })
                    .catch(function (err) {
                        expect(err.message).to.contain('Database is not open');
                        cnt -= 1;
                        if (cnt === 0) {
                            done();
                        }
                    })
                    .done();
            })
            .done();
    });

    it('should allow multiple open calls with different instances', function (done) {
        var mongoStorage1 = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth),
            mongoStorage2 = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

        mongoStorage1.openDatabase()
            .then(function () {
                return mongoStorage2.openDatabase();
            })
            .then(function () {
                return mongoStorage1.createProject({projectName: 'someProject1'});
            })
            .then(function (project) {
                return project.getBranches();
            })
            .then(function () {
                return Q.allDone([
                    mongoStorage1.closeDatabase(),
                    mongoStorage2.closeDatabase()
                ]);
            })
            .then(function () {
                mongoStorage1.createProject({projectName: 'someOtherProject1'})
                    .then(function () {
                        throw new Error('should have failed to create project when db closed!');
                    })
                    .catch(function (err) {
                        expect(err.message).to.contain('Database is not open');
                        done();
                    })
                    .done();
            })
            .done();
    });

    it('should allow multiple concurrent open calls with different instances', function (done) {
        var mongoStorage1 = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth),
            mongoStorage2 = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

        Q.allDone([
            mongoStorage1.openDatabase(),
            mongoStorage2.openDatabase()
        ])
            .then(function () {
                return mongoStorage2.createProject({projectName: 'someConProject1'});
            })
            .then(function (project) {
                return project.getBranches();
            })
            .then(function () {
                return Q.allDone([
                    mongoStorage1.closeDatabase(),
                    mongoStorage2.closeDatabase()
                ]);
            })
            .then(function () {
                mongoStorage1.createProject({projectName: 'someOtherConProject1'})
                    .then(function () {
                        throw new Error('should have failed to create project when db closed!');
                    })
                    .catch(function (err) {
                        expect(err.message).to.contain('Database is not open');
                        done();
                    })
                    .done();
            })
            .done();
    });

    it('should allow multiple open and close with different instances', function (done) {
        var mongoStorage1 = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth),
            mongoStorage2 = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);


        mongoStorage1.openDatabase()
            .then(function () {
                return mongoStorage2.openDatabase();
            })
            .then(function () {
                return mongoStorage1.closeDatabase();
            })
            .then(function () {
                return mongoStorage2.createProject({projectName: 'someProj1'});
            })
            .then(function (project) {
                return project.getBranches();
            })
            .then(function () {
                return Q.allDone([
                    mongoStorage2.closeDatabase()
                ]);
            })
            .then(function () {
                mongoStorage1.createProject({projectName: 'someOtherProj1'})
                    .then(function () {
                        throw new Error('should have failed to create project when db closed!');
                    })
                    .catch(function (err) {
                        expect(err.message).to.contain('Database is not open');
                        done();
                    })
                    .done();
            })
            .done();
    });

    it('should allow open then multiple close calls when open', function (done) {
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
            .then(function () {
                return mongoStorage.openDatabase();
            })
            .then(function () {
                return mongoStorage.closeDatabase();
            })
            .then(done)
            .catch(done);
    });

    it('should allow open then multiple close calls although not open', function (done) {
        var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

        mongoStorage.closeDatabase()
            .then(function () {
                return mongoStorage.closeDatabase();
            })
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

    it('should allow open then multiple concurrent close calls although not open', function (done) {
        var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

        Q.allDone([
                mongoStorage.closeDatabase(),
                mongoStorage.closeDatabase(),
                mongoStorage.closeDatabase()
            ])
            .then(function () {
                return mongoStorage.openDatabase();
            })
            .then(function () {
                return mongoStorage.closeDatabase();
            })
            .then(done)
            .catch(done);
    });

    it('should not connect twice although counter is 0', function (done) {
        var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

        mongoStorage.openDatabase()
            .then(function () {
                return Q.allDone([
                    mongoStorage.closeDatabase(),
                    mongoStorage.openDatabase(),
                    mongoStorage.closeDatabase()
                    ]);
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

    it('should not connect twice although counter is 0 case 2', function (done) {
        var mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

        mongoStorage.openDatabase()
            .then(function () {
                return Q.allDone([
                    mongoStorage.closeDatabase(),
                    mongoStorage.closeDatabase(),
                    mongoStorage.openDatabase(),
                    mongoStorage.closeDatabase()
                ]);
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

    describe('project operations', function () {
        var mongoStorage;

        afterEach(function (done) {
            if (mongoStorage) {
                mongoStorage.closeDatabase(function (err) {
                    mongoStorage = null;
                    done(err);
                });
            } else {
                done();
            }
        });

        it('should fail to open a project if not connected to database', function (done) {
            mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
            gmeAuth.authorizeByUserId(guestAccount, projectId, 'create',
                {
                    read: true,
                    write: true,
                    delete: true
                })
                .then(function () {
                    return mongoStorage.openProject({projectId: projectId});
                })
                .then(function () {
                    done(new Error('should have failed to openProject'));
                })
                .catch(function (err) {
                    expect(err instanceof Error).to.equal(true);
                    expect(err.message).to.contain('Database is not open.');
                    done();
                })
                .done();
        });

        it('should fail to delete a project if not connected to database', function (done) {
            mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
            gmeAuth.authorizeByUserId(guestAccount, projectId, 'create',
                {
                    read: true,
                    write: true,
                    delete: true
                })
                .then(function () {
                    return mongoStorage.deleteProject({projectId: projectId});
                })
                .then(function () {
                    done(new Error('should have failed to deleteProject'));
                })
                .catch(function (err) {
                    expect(err instanceof Error).to.equal(true);
                    expect(err.message).to.contain('Database is not open.');
                    done();
                })
                .done();
        });

        it('should fail to create a project if not connected to database', function (done) {
            mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
            mongoStorage.createProject({projectName: 'something'})
                .then(function () {
                    done(new Error('should have failed to createProject'));
                })
                .catch(function (err) {
                    expect(err instanceof Error).to.equal(true);
                    expect(err.message).to.contain('Database is not open.');
                    done();
                })
                .done();
        });

        it('should fail to get project ids if not connected to database', function (done) {
            mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
            gmeAuth.authorizeByUserId(guestAccount, testFixture.projectName2Id('something1'),
                'create',
                {
                    read: true,
                    write: true,
                    delete: true
                })
                .then(function () {
                    return gmeAuth.addProject(guestAccount, 'something1', null);
                })
                .then(function () {
                    return mongoStorage.getProjects({branches: true});
                })
                .then(function () {
                    done(new Error('should have failed to getProjects'));
                })
                .catch(function (err) {
                    expect(err instanceof Error).to.equal(true);
                    expect(err.message).to.contain('Database is not open.');
                    done();
                })
                .done();
        });

        it('should get projects', function (done) {
            mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.openDatabase()
                .then(function () {
                    return mongoStorage.getProjects({branches: true});
                })
                .then(function (projects) {
                    expect(projects instanceof Array).to.equal(true);
                    done();
                })
                .catch(done);
        });

        it('should create a project', function (done) {
            var nbrOfProjectsStart;
            mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.openDatabase()
                .then(function () {
                    return mongoStorage.getProjects({branches: true});
                })
                .then(function (projects) {
                    nbrOfProjectsStart = projects.length;
                    return mongoStorage.createProject({projectName: projectName});
                })
                .then(function () {
                    return mongoStorage.getProjects({branches: true});
                })
                .then(function (projects) {
                    expect(projects.length > nbrOfProjectsStart).to.equal(true);
                    done();
                })
                .catch(done);
        });

        it('should not have access to project', function (done) {
            var startProjects;
            mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.openDatabase()
                .then(function () {
                    return mongoStorage.getProjects({username: 'admin', branches: true});
                })
                .then(function (projects) {
                    startProjects = projects;
                    return mongoStorage.createProject({
                        username: guestAccount,
                        projectName: projectDoesNotHaveAccessName
                    });
                })
                .then(function () {
                    return mongoStorage.getProjects({username: 'admin', branches: true});
                })
                .then(function (projects) {
                    expect(projects).deep.equal(startProjects);
                })
                .nodeify(done);
        });

        it('should fail to create a project if it already exists', function (done) {
            var projectName = 'createdTwice',
                projectId = testFixture.projectName2Id(projectName);

            mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.openDatabase()
                .then(function () {
                    return mongoStorage.createProject({projectName: projectName});
                })
                .then(function () {
                    return mongoStorage.createProject({projectName: projectName});
                })
                .then(function () {
                    done(new Error('should have failed to createProject'));
                })
                .catch(function (err) {
                    expect(err instanceof Error).to.equal(true);
                    expect(err.message).to.include('Error: Project already exists ' + projectId);
                    done();
                })
                .done();
        });

        it('should create and delete a project', function (done) {
            var projectName = 'createAndDelete',
                projectId = testFixture.projectName2Id(projectName);
            mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.openDatabase()
                .then(function () {
                    return mongoStorage.createProject({projectName: projectName});
                })
                .then(function () {
                    return mongoStorage.deleteProject({projectId: projectId});
                })
                .nodeify(done);
        });

        it('should open an existing project', function (done) {
            var projectName = 'toBeOpened',
                projectId = testFixture.projectName2Id(projectName);

            mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.openDatabase()
                .then(function () {
                    return mongoStorage.createProject({projectName: projectName});
                })
                .then(function () {
                    return mongoStorage.openProject({projectId: projectId});
                })
                .then(function (project) {
                    return project.getBranches();
                })
                .then(function (branches) {
                    // expect names of branches
                    expect(branches).deep.equal({});
                    done();
                })
                .catch(done);
        });

        it('should get an existing project', function (done) {
            var projectName = 'toGet',
                projectId = testFixture.projectName2Id(projectName);

            mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.openDatabase()
                .then(function () {
                    return mongoStorage.createProject({projectName: projectName});
                })
                .then(function (/*project_*/) {
                    return mongoStorage._getProject({projectId: projectId});
                })
                .then(function (dbProject) {

                    expect(dbProject.projectId).equal(projectId);

                    expect(dbProject).to.have.property('closeProject');
                    expect(dbProject).to.have.property('loadObject');
                    expect(dbProject).to.have.property('insertObject');
                    expect(dbProject).to.have.property('getBranches');
                    expect(dbProject).to.have.property('getBranchHash');
                    expect(dbProject).to.have.property('setBranchHash');
                    expect(dbProject).to.have.property('getCommits');
                    expect(dbProject).to.have.property('getCommonAncestorCommit');

                    done();
                })
                .catch(done);
        });

        it('should fail to open a non-existing project', function (done) {
            mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.openDatabase()
                .then(function () {
                    return gmeAuth.authorizeByUserId(guestAccount, testFixture.projectName2Id('project_does_not_exist'),
                        'create',
                        {
                            read: true,
                            write: true,
                            delete: true
                        });
                })
                .then(function () {
                    return gmeAuth.addProject(guestAccount, 'project_does_not_exist', null);
                })
                .then(function () {
                    return mongoStorage.openProject({projectId: testFixture.projectName2Id('project_does_not_exist')});
                })
                .then(function () {
                    done(new Error('expected to fail'));
                })
                .catch(function (err) {
                    expect(err instanceof Error).to.equal(true);
                    expect(err.message).to.include('Project does not exist');
                    done();
                })
                .done();
        });

        it('should import, open, and close a project', function (done) {
            mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);

            mongoStorage.openDatabase()
                .then(function () {
                    return testFixture.importProject(mongoStorage, {
                        projectSeed: 'seeds/EmptyProject.json',
                        projectName: 'importedAndGet',
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
                })
                .then(function (/*result*/) {
                    //console.log(result);
                    return mongoStorage._getProject({projectId: projectId});
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
            projectId,
            mongoStorage;

        before(function (done) {
            mongoStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
            mongoStorage.openDatabase(done);
        });

        beforeEach(function (done) {
            testFixture.importProject(mongoStorage, {
                projectSeed: 'seeds/EmptyProject.json',
                projectName: 'projectSpecific',
                gmeConfig: gmeConfig,
                logger: logger
            })
                .then(function (result) {
                    projectId = result.projectId;
                    return mongoStorage._getProject({projectId: projectId});
                })
                .then(function (p) {
                    project = p;
                })
                .nodeify(done);
        });

        afterEach(function (done) {
            mongoStorage.deleteProject({projectId: projectId})
                .finally(function () {
                    done(); // Don't care if we can't delete the project or it doesn't exist
                });
        });

        after(function (done) {
            mongoStorage.closeDatabase(done);
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

        it('should fail to load object if hash is not given', function (done) {
            project.loadObject()
                .then(function (/* node */) {
                    done(new Error('should have failed to loadObject'));
                })
                .catch(function (err) {
                    expect(err.message).to.contain('loadObject - given hash is not a string : undefined');
                    done();
                })
                .done();
        });

        it('should fail to load object if hash is an object', function (done) {
            project.loadObject({})
                .then(function (/* node */) {
                    done(new Error('should have failed to loadObject'));
                })
                .catch(function (err) {
                    expect(err.message).to.contain('loadObject - given hash is not a string : object');
                    done();
                })
                .done();
        });

        it('should fail to load object if hash is invalid', function (done) {
            project.loadObject('invalid')
                .then(function (/* node */) {
                    done(new Error('should have failed to loadObject'));
                })
                .catch(function (err) {
                    expect(err.message).to.contain('loadObject - invalid hash :invalid');
                    done();
                })
                .done();
        });

        it('should fail to load object if hash is not found', function (done) {
            project.loadObject('#123')
                .then(function (/* node */) {
                    done(new Error('should have failed to loadObject'));
                })
                .catch(function (err) {
                    expect(err.message).to.contain('object does not exist #123');
                    done();
                })
                .done();
        });

        it('should fail to insert object if argument is not an object', function (done) {
            project.insertObject('blabla')
                .then(function (/* node */) {
                    done(new Error('should have failed to insertObject'));
                })
                .catch(function (err) {
                    expect(err.message).to.contain('object is not an object');
                    done();
                })
                .done();
        });

        it('should fail to insert object if argument\'s _id is not a valid hash', function (done) {
            project.insertObject({_id: 'blabla'})
                .then(function (/* node */) {
                    done(new Error('should have failed to insertObject'));
                })
                .catch(function (err) {
                    expect(err.message).to.contain('object._id is not a valid hash.');
                    done();
                })
                .done();
        });

        it('should insert object', function (done) {
            project.insertObject({_id: '#blabla', num: 42, str: '35', arr: ['', 'ss']})
                .then(done)
                .catch(done);
        });

        it('should insert object multiple times if the content is the same', function (done) {
            project.insertObject({_id: '#blabla22', num: 42, str: '35', arr: ['', 'ss']})
                .then(function () {
                    return project.insertObject({_id: '#blabla22', num: 42, str: '35', arr: ['', 'ss']});
                })
                .then(function () {
                    done();
                })
                .catch(done);
        });

        it('should fail to insert object multiple times if the content is different', function (done) {
            project.insertObject({_id: '#blabla223', num: 42, str: '35', arr: ['', 'ss']})
                .then(function () {
                    return project.insertObject({_id: '#blabla223', num: 4200, str: 'different', arr: ['', 'ss']});
                })
                .then(function () {
                    done(new Error('should have failed to insertObject'));
                })
                .catch(function (err) {
                    if (err && err.code === 11000) {
                        // TODO: check error message
                        done();
                    } else {
                        done(new Error('should have failed to insertObject'));
                    }
                });
        });

        it('should getBranchHash', function (done) {
            project.getBranchHash('master')
                .then(function (hash) {
                    return project.setBranchHash('master', hash, hash);
                })
                .then(function () {
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
                    expect(err.message).to.contain('branch hash mismatch');
                    done();
                })
                .done();
        });

        it('should fail to set new branch hash if oldhash does not match', function (done) {
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
                    return project.setBranchHash('dummy', '', '#0123456789012345678901234567890123456789');
                })
                .then(function () {
                    done(new Error('should have failed'));
                })
                .catch(function (err) {
                    expect(err.message).to.contain('branch hash mismatch');
                    done();
                })
                .done();
        });
    });

    describe('complex chain', function () {
        var project,
            projectName = 'complexChainTest',
            projectId = gmeConfig.authentication.guestAccount + testFixture.STORAGE_CONSTANTS.PROJECT_ID_SEP +
                projectName,
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
                        return mongoStorage.makeCommit(commitData);
                    }

                    return Q.allDone(commitDatas.map(makeCommit));
                })
                .then(function (/*commitResults*/) {
                    done();
                })
                .catch(done);
        });

        after(function (done) {
            mongoStorage.deleteProject({projectId: projectId})
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