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
        logger = testFixture.logger,
        Q = testFixture.Q,

        getMemoryStorage = testFixture.getMemoryStorage,
        projectName = 'newProject';

    it('should create an instance of getMemoryStorage', function () {
        var memoryStorage = getMemoryStorage(logger);

        expect(memoryStorage).to.have.property('openDatabase');
        expect(memoryStorage).to.have.property('closeDatabase');
        expect(memoryStorage).to.have.property('getProjectNames');
        expect(memoryStorage).to.have.property('openProject');
        expect(memoryStorage).to.have.property('deleteProject');
        expect(memoryStorage).to.have.property('createProject');

    });

    it('should open and close', function (done) {
        var memoryStorage = getMemoryStorage(logger);

        memoryStorage.openDatabase()
            .then(function () {
                return memoryStorage.closeDatabase();
            })
            .then(done)
            .catch(done);
    });

    it('should open, close, open, and close', function (done) {
        var memoryStorage = getMemoryStorage(logger);

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
        var memoryStorage = getMemoryStorage(logger);

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
        var memoryStorage = getMemoryStorage(logger);

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

        it('should fail to open a project if not connected to database', function (done) {
            var memoryStorage = getMemoryStorage(logger);

            memoryStorage.openProject({projectName: 'something'})
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
            var memoryStorage = getMemoryStorage(logger);

            memoryStorage.deleteProject({projectName: 'something'})
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
            var memoryStorage = getMemoryStorage(logger);

            memoryStorage.createProject({projectName: 'something'})
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
            var memoryStorage = getMemoryStorage(logger);

            memoryStorage.getProjectNames({})
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
            var memoryStorage = getMemoryStorage(logger);

            memoryStorage.openDatabase()
                .then(function () {
                    return memoryStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                    done();
                })
                .catch(done);
        });


        it('should create a project', function (done) {
            var memoryStorage = getMemoryStorage(logger);

            memoryStorage.openDatabase()
                .then(function () {
                    return memoryStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                    return memoryStorage.createProject({projectName: projectName});
                })
                .then(function () {
                    return memoryStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([projectName]);
                    done();
                })
                .catch(done);
        });

        it('should fail to create a project if it already exists', function (done) {
            var memoryStorage = getMemoryStorage(logger);

            memoryStorage.openDatabase()
                .then(function () {
                    return memoryStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                    return memoryStorage.createProject({projectName: projectName});
                })
                .then(function () {
                    return memoryStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([projectName]);
                    return memoryStorage.createProject({projectName: projectName});
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
            var memoryStorage = getMemoryStorage(logger);

            memoryStorage.openDatabase()
                .then(function () {
                    return memoryStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                    return memoryStorage.createProject({projectName: projectName});
                })
                .then(function () {
                    return memoryStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([projectName]);
                    return memoryStorage.deleteProject({projectName: projectName});
                })
                .then(function () {
                    return memoryStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                    done();
                })
                .catch(done);
        });

        it('should open an existing project', function (done) {
            var memoryStorage = getMemoryStorage(logger, gmeConfig);

            memoryStorage.openDatabase()
                .then(function () {
                    return memoryStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                    return memoryStorage.createProject({projectName: projectName});
                })
                .then(function () {
                    return memoryStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([projectName]);
                    return memoryStorage.getBranches({projectName: projectName});
                })
                .then(function (branches) {
                    // expect names of branches
                    expect(branches).deep.equal({});
                    done();
                })
                .catch(done);
        });

        it('should get an existing project', function (done) {
            var memoryStorage = getMemoryStorage(logger, gmeConfig);

            memoryStorage.openDatabase()
                .then(function () {
                    return memoryStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                    return memoryStorage.createProject({projectName: projectName});
                })
                .then(function () {
                    return memoryStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([projectName]);
                    return memoryStorage.openProject({projectName: projectName});
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
            var memoryStorage = getMemoryStorage(logger, gmeConfig);

            memoryStorage.openDatabase()
                .then(function () {
                    return memoryStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                    return memoryStorage.openProject({projectName: 'project_does_not_exist'});
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
            var storage = getMemoryStorage(logger, gmeConfig);

            storage.openDatabase()
                .then(function () {
                    return storage.deleteProject({projectName: projectName});
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
                    return storage.openProject({projectName: projectName});
                })
                .then(function (project) {
                    return project.closeProject();
                })
                .then(done)
                .catch(done);
        });
    });
});