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

        getMemoryStorage = testFixture.getMemoryStorage;

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
            .then(memoryStorage.closeDatabase)
            .finally(done);
    });

    it('should open, close, open, and close', function (done) {
        var memoryStorage = getMemoryStorage(logger);

        memoryStorage.openDatabase()
            .then(memoryStorage.closeDatabase)
            .then(memoryStorage.openDatabase)
            .then(memoryStorage.closeDatabase)
            .finally(done);
    });


    it('should allow multiple open calls', function (done) {
        var memoryStorage = getMemoryStorage(logger);

        memoryStorage.openDatabase()
            .then(memoryStorage.openDatabase)
            .then(memoryStorage.openDatabase)
            .then(memoryStorage.openDatabase)
            .finally(done);
    });


    it('should allow multiple close calls', function (done) {
        var memoryStorage = getMemoryStorage(logger);

        memoryStorage.closeDatabase()
            .then(memoryStorage.closeDatabase)
            .then(memoryStorage.closeDatabase)
            .then(memoryStorage.closeDatabase)
            .finally(done);
    });


    describe('project operations', function () {

        it('should get project names', function (done) {
            var memoryStorage = getMemoryStorage(logger);

            memoryStorage.getProjectNames()
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                })
                .finally(done);
        });


        it('should create a project', function (done) {
            var memoryStorage = getMemoryStorage(logger);

            memoryStorage.getProjectNames()
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                    return memoryStorage.createProject('newProject');
                })
                .then(memoryStorage.getProjectNames)
                .then(function (projectNames) {
                    expect(projectNames).deep.equal(['newProject']);
                })
                .finally(done);
        });

        it('should create and delete a project', function (done) {
            var memoryStorage = getMemoryStorage(logger);

            memoryStorage.getProjectNames()
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                    return memoryStorage.createProject('newProject');
                })
                .then(memoryStorage.getProjectNames)
                .then(function (projectNames) {
                    expect(projectNames).deep.equal(['newProject']);
                    return memoryStorage.deleteProject('newProject');
                })
                .then(memoryStorage.getProjectNames)
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                })
                .finally(done);
        });

        it('should open an existing project', function (done) {
            var memoryStorage = getMemoryStorage(logger, gmeConfig);

            memoryStorage.openDatabase()
                .then(function () {
                    return memoryStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal([]);
                    return memoryStorage.createProject({projectName: 'newProject'});
                })
                .then(function () {
                    return memoryStorage.getProjectNames({});
                })
                .then(function (projectNames) {
                    expect(projectNames).deep.equal(['newProject']);
                    return memoryStorage.openProject({projectName: 'newProject'});
                })
                .then(function (branches) {
                    expect(branches).deep.equal({});
                    done();
                })
                .catch(done);

        });
    });

});