/*globals*/
/*jshint node:true, newcap:false, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var testFixture = require('../../../_globals.js');

describe('RedisAdapter', function () {
    var RedisAdapter = require('../../../../src/server/storage/datastores/redisadapter'),
        expect = testFixture.expect,
        Q = testFixture.Q,
        gmeConfig = testFixture.getGmeConfig(),
        adapterTests = require('./testgenerators'),
        logger = testFixture.logger.fork('RedisAdapter');

    describe('open/close Database', function () {
        adapterTests.genOpenCloseDatabase(RedisAdapter, logger, gmeConfig, Q, expect);
    });

    describe('create/open/delete/rename Project', function () {
        var redisAdapter = new RedisAdapter(logger, gmeConfig);

        before(function (done) {
            redisAdapter.openDatabase()
                .then(function () {
                    return Q.ninvoke(redisAdapter.client, 'flushdb');
                })
                .nodeify(done);
        });

        after(function (done) {
            redisAdapter.closeDatabase(done);
        });

        adapterTests.genCreateOpenDeleteRenameProject(redisAdapter, Q, expect);
    });

    describe('database closed errors', function () {
        adapterTests.genDatabaseClosedErrors(new RedisAdapter(logger, gmeConfig), Q, expect);
    });

    describe('Project: insert/load Object and getCommits', function () {
        var redisAdapter = new RedisAdapter(logger, gmeConfig);

        before(function (done) {
            redisAdapter.openDatabase()
                .then(function () {
                    return Q.ninvoke(redisAdapter.client, 'flushdb');
                })
                .nodeify(done);
        });

        after(function (done) {
            redisAdapter.closeDatabase(done);
        });

        adapterTests.genInsertLoadAndCommits(redisAdapter, Q, expect);
    });

    describe('Project: branch operations', function () {
        var redisAdapter = new RedisAdapter(logger, gmeConfig);

        before(function (done) {
            redisAdapter.openDatabase()
                .then(function () {
                    return Q.ninvoke(redisAdapter.client, 'flushdb');
                })
                .nodeify(done);
        });

        after(function (done) {
            redisAdapter.closeDatabase(done);
        });

        adapterTests.genBranchOperations(redisAdapter, Q, expect);
    });

    describe('Project: tag operations', function () {
        var redisAdapter = new RedisAdapter(logger, gmeConfig);

        before(function (done) {
            redisAdapter.openDatabase()
                .then(function () {
                    return Q.ninvoke(redisAdapter.client, 'flushdb');
                })
                .nodeify(done);
        });

        after(function (done) {
            redisAdapter.closeDatabase(done);
        });

        adapterTests.genTagOperations(redisAdapter, Q, expect);
    });
});
