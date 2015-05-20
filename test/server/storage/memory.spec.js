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

        MemoryStorage = testFixture.MemoryStorage;

    it('should create an instance', function () {
        var memoryStorage = new MemoryStorage(logger);

        expect(memoryStorage).to.have.property('openDatabase');
        expect(memoryStorage).to.have.property('closeDatabase');
        expect(memoryStorage).to.have.property('getProjectNames');
        expect(memoryStorage).to.have.property('openProject');
        expect(memoryStorage).to.have.property('deleteProject');
        expect(memoryStorage).to.have.property('createProject');

    });

    it('should open and close', function (done) {
        var memoryStorage = new MemoryStorage(logger);

        memoryStorage.openDatabase()
            .then(memoryStorage.closeDatabase)
            .finally(done);
    });

    it('should open, close, open, and close', function (done) {
        var memoryStorage = new MemoryStorage(logger);

        memoryStorage.openDatabase()
            .then(memoryStorage.closeDatabase)
            .then(memoryStorage.openDatabase)
            .then(memoryStorage.closeDatabase)
            .finally(done);
    });


    it('should allow multiple open calls', function (done) {
        var memoryStorage = new MemoryStorage(logger);

        memoryStorage.openDatabase()
            .then(memoryStorage.openDatabase)
            .then(memoryStorage.openDatabase)
            .then(memoryStorage.openDatabase)
            .finally(done);
    });


    it('should allow multiple close calls', function (done) {
        var memoryStorage = new MemoryStorage(logger);

        memoryStorage.closeDatabase()
            .then(memoryStorage.closeDatabase)
            .then(memoryStorage.closeDatabase)
            .then(memoryStorage.closeDatabase)
            .finally(done);
    });


    it('should get project names', function (done) {
        var memoryStorage = new MemoryStorage(logger);

        memoryStorage.getProjectNames()
            .then(function (projectNames) {
                expect(projectNames).deep.equal([]);
            })
            .finally(done);
    });

});