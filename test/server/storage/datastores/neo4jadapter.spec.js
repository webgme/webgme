/*globals*/
/*jshint node:true, newcap:false, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var testFixture = require('../../../_globals.js');

describe.skip('Neo4jAdapter', function () {
    var Neo4jAdapter = require('../../../../src/server/storage/datastores/neo4jadapter'),
        expect = testFixture.expect,
        Q = testFixture.Q,
        gmeConfig = testFixture.getGmeConfig(),
        adapterTests = require('./testgenerators'),
        logger = testFixture.logger.fork('Neo4jAdapter');

    describe.skip('open/close Database', function () {
        adapterTests.genOpenCloseDatabase(Neo4jAdapter, logger, gmeConfig, Q, expect);
    });

    describe('create/open/delete/rename Project', function () {
        var adapter = new Neo4jAdapter(logger, gmeConfig);

        before(function (done) {
            adapter.openDatabase()
                .then(function () {
                    return Q.ninvoke(adapter.client, 'cypherQuery', 'MATCH (n) DELETE n');
                })
                .nodeify(done);
        });

        after(function (done) {
            adapter.closeDatabase(done);
        });

        adapterTests.genCreateOpenDeleteRenameProject(adapter, Q, expect);
    });

    describe.skip('database closed errors', function () {
        adapterTests.genDatabaseClosedErrors(new Neo4jAdapter(logger, gmeConfig), Q, expect);
    });

    describe('Project: insert/load Object and getCommits', function () {
        var adapter = new Neo4jAdapter(logger, gmeConfig);

        before(function (done) {
            adapter.openDatabase()
                .then(function () {
                    return Q.ninvoke(adapter.client, 'cypherQuery', 'MATCH (n) DELETE n');
                })
                .nodeify(done);
        });

        after(function (done) {
            adapter.closeDatabase(done);
        });

        adapterTests.genInsertLoadAndCommits(adapter, Q, expect);
    });

    describe.skip('Project: branch operations', function () {
        var adapter = new Neo4jAdapter(logger, gmeConfig);

        before(function (done) {
            adapter.openDatabase()
                .then(function () {
                    return Q.ninvoke(adapter.client, 'flushdb');
                })
                .nodeify(done);
        });

        after(function (done) {
            adapter.closeDatabase(done);
        });

        adapterTests.genBranchOperations(adapter, Q, expect);
    });
});