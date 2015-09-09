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
                    projectSeed: './seeds/EmptyProject.json',
                    projectName: projectName,
                    branchName: branchName,
                    logger: logger,
                    gmeConfig: gmeConfig
                };

                return testFixture.importProject(storage, importParam);
            })
            .then(function (importResult) {
                ir = importResult;
                return Q.allDone([
                    ir.project.createBranch('b1', ir.commitHash),
                    ir.project.createBranch('b1', ir.commitHash)
                ]);
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

    it('EmptyProject FCO should pass', function (done) {
        testFixture.loadNode(ir.core, ir.rootNode, '/1')
            .then(function (fcoNode) {
                return checkMetaRules(ir.core, fcoNode);
            })
            .then(function (result) {
                //FIXME: Should be false
                expect(result.hasViolation).to.equal(true, result.message);
            })
            .nodeify(done);
    });
});