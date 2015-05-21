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
        newProjectName = 'newProject';

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
                    return memoryStorage.createProject({projectName: newProjectName});
                })
                .then(function () {
                    return memoryStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([newProjectName]);
                    done();
                })
                .catch(done);
        });

        it('should create and delete a project', function (done) {
            var memoryStorage = getMemoryStorage(logger);

            memoryStorage.openDatabase()
                .then(function () {
                    return memoryStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                    return memoryStorage.createProject({projectName: newProjectName});
                })
                .then(function () {
                    return memoryStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([newProjectName]);
                    return memoryStorage.deleteProject({projectName: newProjectName});
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
                    return memoryStorage.createProject({projectName: newProjectName});
                })
                .then(function () {
                    return memoryStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([newProjectName]);
                    return memoryStorage.getBranches({projectName: newProjectName});
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
                    return memoryStorage.createProject({projectName: newProjectName});
                })
                .then(function () {
                    return memoryStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([newProjectName]);
                    return memoryStorage.openProject({projectName: newProjectName});
                })
                .then(function (project) {
                    
                    expect(project.name).equal(newProjectName);

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

    });

});