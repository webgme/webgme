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
                    return gmeAuth.metadataStorage.addProject(guestAccount, 'something1', null);
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
                    return mongoStorage.getProjects({username: 'guest', branches: true});
                })
                .then(function (projects) {
                    startProjects = projects;
                    return mongoStorage.createProject({
                        username: 'admin',
                        projectName: projectDoesNotHaveAccessName
                    });
                })
                .then(function () {
                    return mongoStorage.getProjects({username: 'guest', branches: true});
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
                    expect(err.message).to.include('Project already exists ' + projectId);
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
                    return gmeAuth.metadataStorage.addProject(guestAccount, 'project_does_not_exist', null);
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
                        projectSeed: 'seeds/EmptyProject.webgmex',
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
                projectSeed: 'seeds/EmptyProject.webgmex',
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
                    expect(err.message).to.contain('tried to insert existing hash - the two objects were NOT equal');
                    done();
                })
                .done();
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
});