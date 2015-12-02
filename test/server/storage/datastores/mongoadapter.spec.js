/*globals*/
/*jshint node:true, newcap:false, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var testFixture = require('../../../_globals.js');

describe('MongoAdapter', function () {
    var MongoAdapter = require('../../../../src/server/storage/mongo'),
        expect = testFixture.expect,
        Q = testFixture.Q,
        gmeConfig = testFixture.getGmeConfig(),
        adapterTests = require('./testgenerators'),
        logger = testFixture.logger.fork('MongoAdapter');

    describe('open/close Database', function () {
        before(function (done) {
            testFixture.clearDatabase(gmeConfig, done);
        });

        adapterTests.genOpenCloseDatabase(MongoAdapter, logger, gmeConfig, Q, expect);
    });

    describe('create/open/delete/rename Project', function () {
        var mongoAdapter = new MongoAdapter(logger, gmeConfig);

        before(function (done) {
            testFixture.clearDatabase(gmeConfig)
                .then(function () {
                    return mongoAdapter.openDatabase();
                })
                .nodeify(done);
        });

        after(function (done) {
            mongoAdapter.closeDatabase(done);
        });

        adapterTests.genCreateOpenDeleteRenameProject(mongoAdapter, Q, expect);
    });

    describe('database closed errors', function () {
        adapterTests.genDatabaseClosedErrors(new MongoAdapter(logger, gmeConfig), Q, expect);
    });

    describe('Project: insert/load Object and getCommits', function () {
        var mongoAdapter = new MongoAdapter(logger, gmeConfig);

        before(function (done) {
            testFixture.clearDatabase(gmeConfig)
                .then(function () {
                    return mongoAdapter.openDatabase();
                })
                .nodeify(done);
        });

        after(function (done) {
            mongoAdapter.closeDatabase(done);
        });

        adapterTests.genInsertLoadAndCommits(mongoAdapter, Q, expect);
    });

    describe('Project: branch operations', function () {
        var mongoAdapter = new MongoAdapter(logger, gmeConfig);

        before(function (done) {
            testFixture.clearDatabase(gmeConfig)
                .then(function () {
                    return mongoAdapter.openDatabase();
                })
                .nodeify(done);
        });

        after(function (done) {
            mongoAdapter.closeDatabase(done);
        });

        adapterTests.genBranchOperations(mongoAdapter, Q, expect);
    });

    describe('Project: tag operations', function () {
        var mongoAdapter = new MongoAdapter(logger, gmeConfig);

        before(function (done) {
            testFixture.clearDatabase(gmeConfig)
                .then(function () {
                    return mongoAdapter.openDatabase();
                })
                .nodeify(done);
        });

        after(function (done) {
            mongoAdapter.closeDatabase(done);
        });

        adapterTests.genTagOperations(mongoAdapter, Q, expect);
    });
});