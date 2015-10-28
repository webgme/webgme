/*globals*/
/*jshint node:true, newcap:false, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var testFixture = require('../../../_globals.js');

describe.skip('DynamoAdapter', function () {
    var DynamoAdapter = require('../../../../src/server/storage/datastores/dynamoadapter'),
        expect = testFixture.expect,
        Q = testFixture.Q,
        gmeConfig = testFixture.getGmeConfig(),
        adapterTests = require('./testgenerators'),
        logger = testFixture.logger.fork('DynamoAdapter'),
        dynalite = require('dynalite'),
        dynaliteServer = dynalite({createTableMs: 1});

    describe('open/close Database', function () {
        before(function (done) {
            dynaliteServer.listen(4567, done);
        });
        after(function (done) {
            dynaliteServer.close(done);
        });
        adapterTests.genOpenCloseDatabase(DynamoAdapter, logger, gmeConfig, Q, expect);
    });

    describe('create/open/delete/rename Project', function () {
        var dynamoAdapter = new DynamoAdapter(logger, gmeConfig);

        before(function (done) {
            Q.ninvoke(dynaliteServer, 'listen', 4567)
                .then(function () {
                    return dynamoAdapter.openDatabase();
                })
                .nodeify(done);
        });

        after(function (done) {
            Q.ninvoke(dynaliteServer, 'close')
                .then(function () {
                    return dynamoAdapter.closeDatabase();
                })
                .nodeify(done);
        });

        adapterTests.genCreateOpenDeleteRenameProject(dynamoAdapter, Q, expect);
    });

    describe.skip('database closed errors', function () {
        adapterTests.genDatabaseClosedErrors(new DynamoAdapter(logger, gmeConfig), Q, expect);
    });

    describe('Project: insert/load Object and getCommits', function () {
        var dynamoAdapter = new DynamoAdapter(logger, gmeConfig);

        before(function (done) {
            Q.ninvoke(dynaliteServer, 'listen', 4567)
                .then(function () {
                    return dynamoAdapter.openDatabase();
                })
                .nodeify(done);
        });

        after(function (done) {
            Q.ninvoke(dynaliteServer, 'close')
                .then(function () {
                    return dynamoAdapter.closeDatabase();
                })
                .nodeify(done);
        });

        adapterTests.genInsertLoadAndCommits(dynamoAdapter, Q, expect);
    });

    describe('Project: branch operations', function () {
        var dynamoAdapter = new DynamoAdapter(logger, gmeConfig);

        before(function (done) {
            Q.ninvoke(dynaliteServer, 'listen', 4567)
                .then(function () {
                    return dynamoAdapter.openDatabase();
                })
                .nodeify(done);
        });

        after(function (done) {
            Q.ninvoke(dynaliteServer, 'close')
                .then(function () {
                    return dynamoAdapter.closeDatabase();
                })
                .nodeify(done);
        });

        adapterTests.genBranchOperations(dynamoAdapter, Q, expect);
    });
});