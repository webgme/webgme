/*globals requireJS*/
/* jshint node:true, mocha: true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../../_globals');

describe('Meta Rules', function () {
    'use strict';

    var logger = testFixture.logger.fork('MetaRules'),
        gmeConfig = testFixture.getGmeConfig(),
        storage,
        expect = testFixture.expect,
        Q = testFixture.Q,
        checkMetaRules = requireJS('common/core/users/metarules'),
        projectName = 'MetaRules',
        branchName = 'master',
        languagePath = '/822429792/',
        ir,

        gmeAuth;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                var importParam = {
                    projectSeed: './test/common/core/users/meta/metaRules2.json',
                    projectName: projectName,
                    branchName: branchName,
                    logger: logger,
                    gmeConfig: gmeConfig
                };

                return testFixture.importProject(storage, importParam);
            })
            .then(function (importResult) {
                ir = importResult;
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
            storage.closeDatabase(),
            gmeAuth.unload()
        ])
            .nodeify(done);
    });

    it('FCO should pass', function (done) {
        var nodePath = '/1';

        testFixture.loadNode(ir.core, ir.rootNode, nodePath)
            .then(function (node) {
                return checkMetaRules(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(false, result.message);
            })
            .nodeify(done);
    });

    it('SetElement should pass', function (done) {
        var nodePath = languagePath + '1578427941';
        testFixture.loadNode(ir.core, ir.rootNode, nodePath)
            .then(function (node) {
                return checkMetaRules(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(false, result.message);
            })
            .nodeify(done);
    });

    it('ModelElement should pass', function (done) {
        var nodePath = languagePath + '942380411';
        testFixture.loadNode(ir.core, ir.rootNode, nodePath)
            .then(function (node) {
                return checkMetaRules(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(false, result.message);
            })
            .nodeify(done);
    });

    it.only('ModelElementInstance should pass', function (done) {
        var nodePath = '/1936712753';
        testFixture.loadNode(ir.core, ir.rootNode, nodePath)
            .then(function (node) {
                return checkMetaRules(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(false, result.message);
            })
            .nodeify(done);
    });

    it('ConnectionElement should pass', function (done) {
        var nodePath = languagePath + '1686535233';
        testFixture.loadNode(ir.core, ir.rootNode, nodePath)
            .then(function (node) {
                return checkMetaRules(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(false, result.message);
            })
            .nodeify(done);
    });

    it('ConnectionElementInstance should pass', function (done) {
        var nodePath = '/31060956';
        testFixture.loadNode(ir.core, ir.rootNode, nodePath)
            .then(function (node) {
                return checkMetaRules(ir.core, node);
            })
            .then(function (result) {
                expect(result.hasViolation).to.equal(false, result.message);
            })
            .nodeify(done);
    });

});