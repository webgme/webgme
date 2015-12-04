/*globals*/
/*jshint node:true, newcap:false, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var testFixture = require('../../../_globals.js');

describe('MemoryAdapter', function () {
    var MemoryAdapter = require('../../../../src/server/storage/memory'),
        expect = testFixture.expect,
        Q = testFixture.Q,
        gmeConfig = testFixture.getGmeConfig(),
        adapterTests = require('./testgenerators'),
        logger = testFixture.logger.fork('MemoryAdapter');

    describe('open/close Database', function () {
        it('should create a new instance', function () {
            var databaseAdapter = new MemoryAdapter(logger, gmeConfig);
            expect(databaseAdapter).to.have.property('openDatabase');
            expect(databaseAdapter).to.have.property('closeDatabase');
            expect(databaseAdapter).to.have.property('createProject');
            expect(databaseAdapter).to.have.property('deleteProject');
            expect(databaseAdapter).to.have.property('openProject');
            expect(databaseAdapter).to.have.property('renameProject');
        });

        it('should open and close', function (done) {
            var databaseAdapter = new MemoryAdapter(logger, gmeConfig);
            databaseAdapter.openDatabase()
                .then(function () {
                    return databaseAdapter.closeDatabase();
                })
                .nodeify(done);
        });
    });

    describe('create/open/delete/rename Project', function () {
        var memoryAdapter = new MemoryAdapter(logger, gmeConfig);

        before(function (done) {
            memoryAdapter.openDatabase(done);
        });

        after(function (done) {
            memoryAdapter.closeDatabase(done);
        });

        adapterTests.genCreateOpenDeleteRenameProject(memoryAdapter, Q, expect);
    });

    describe('database closed errors', function () {
        adapterTests.genDatabaseClosedErrors(new MemoryAdapter(logger, gmeConfig), Q, expect);
    });

    describe('Project: insert/load Object and getCommits', function () {
        var memoryAdapter = new MemoryAdapter(logger, gmeConfig);

        before(function (done) {
            memoryAdapter.openDatabase(done);
        });

        after(function (done) {
            memoryAdapter.closeDatabase(done);
        });

        adapterTests.genInsertLoadAndCommits(memoryAdapter, Q, expect);
    });

    describe('Project: branch operations', function () {
        var memoryAdapter = new MemoryAdapter(logger, gmeConfig);

        before(function (done) {
            memoryAdapter.openDatabase(done);
        });

        after(function (done) {
            memoryAdapter.closeDatabase(done);
        });

        adapterTests.genBranchOperations(memoryAdapter, Q, expect);
    });

    describe('Project: tag operations', function () {
        var memoryAdapter = new MemoryAdapter(logger, gmeConfig);

        before(function (done) {
            memoryAdapter.openDatabase(done);
        });

        after(function (done) {
            memoryAdapter.closeDatabase(done);
        });

        adapterTests.genTagOperations(memoryAdapter, Q, expect);
    });
});