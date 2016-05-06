/*globals requireJS*/
/* jshint node:true, mocha: true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../../_globals');

describe('Constraint Checker', function () {
    'use strict';

    var logger = testFixture.logger.fork('ConstraintChecker'),
        gmeConfig = testFixture.getGmeConfig(),
        storage,
        expect = testFixture.expect,
        Q = testFixture.Q,
        constraint = requireJS('common/core/users/constraintchecker'),
        projectName = 'ConstraintChecker',
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
                    projectSeed: './test/common/core/users/meta/metaRules.webgmex',
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

    it('CheckModel and CheckNode should return error if not initialized', function (done) {
        var checker = new constraint.Checker(ir.core, logger);
        Q.allSettled([
            checker.checkModel('/1'),
            checker.checkNode('/1')
        ])
            .then(function (res) {
                res.forEach(function (result) {
                    expect(result.state).equal('rejected');
                    expect(result.reason instanceof Error).to.equal(true);
                    expect(result.reason.message).to.contain('ConstraintChecker was never initialized!');
                });
            })
            .nodeify(done);
    });

    it('CheckModel and CheckNode should return error if invalid constraint type', function (done) {
        var checker = new constraint.Checker(ir.core, logger);
        checker.initialize(ir.rootNode, ir.commitHash, 'INVALID_CONSTRAINT_TYPE');
        Q.allSettled([
            checker.checkModel('/1'),
            checker.checkNode('/1')
        ])
            .then(function (res) {
                res.forEach(function (result) {
                    expect(result.state).equal('rejected');
                    expect(result.reason instanceof Error).to.equal(true);
                    expect(result.reason.message).to.contain('Unknown CONSTRAINT_TYPE: INVALID_CONSTRAINT_TYPE');
                });
            })
            .nodeify(done);
    });

    it('CheckModel and CheckNode should return error if path does not exist', function (done) {
        var checker = new constraint.Checker(ir.core, logger);
        checker.initialize(ir.rootNode, ir.commitHash, constraint.TYPES.META);
        Q.allSettled([
            checker.checkModel('/11'),
            checker.checkNode('/11')
        ])
            .then(function (res) {
                res.forEach(function (result) {
                    expect(result.state).equal('rejected');
                    expect(result.reason instanceof Error).to.equal(true);
                    expect(result.reason.message).to.contain('Given nodePath does not exist');
                });
            })
            .nodeify(done);
    });

    it('FCO should pass CheckModel and CheckNode using TYPES.META', function (done) {
        var checker = new constraint.Checker(ir.core, logger);
        checker.initialize(ir.rootNode, ir.commitHash, constraint.TYPES.META);
        Q.allSettled([
            checker.checkModel('/1'),
            checker.checkNode('/1')
        ])
            .then(function (res) {
                expect(res[0].state).equal('fulfilled');
                expect(res[0].value.hasViolation).to.equal(false);
                //expect(res[0].value).to.deep.equal({});

                expect(res[1].state).equal('fulfilled');
                expect(res[1].value.hasViolation).to.equal(false);
                //expect(res[1].value).to.deep.equal({});
            })
            .nodeify(done);
    });

    it('FCO should pass CheckModel and CheckNode using TYPES.BOTH (although no custom defined)', function (done) {
        var checker = new constraint.Checker(ir.core, logger);
        checker.initialize(ir.rootNode, ir.commitHash, constraint.TYPES.BOTH);
        Q.allSettled([
            checker.checkModel('/1'),
            checker.checkNode('/1')
        ])
            .then(function (res) {
                expect(res[0].state).equal('fulfilled');
                expect(res[0].value.hasViolation).to.equal(false);
                //expect(res[0].value).to.deep.equal({});

                expect(res[1].state).equal('fulfilled');
                expect(res[1].value.hasViolation).to.equal(false);
                //expect(res[1].value).to.deep.equal({});
            })
            .nodeify(done);
    });

    it('RootNode should hasViolation=true during checkModel using TYPES.META', function (done) {
        var checker = new constraint.Checker(ir.core, logger);
        checker.initialize(ir.rootNode, ir.commitHash, constraint.TYPES.META);
        Q.allSettled([
            checker.checkModel('')
        ])
            .then(function (res) {
                expect(res[0].state).equal('fulfilled');
                expect(res[0].value.hasViolation).to.equal(true);
                //expect(res[0].value).to.deep.equal({});
            })
            .nodeify(done);
    });

    it('CustomConstraintWillSucceed should pass TYPES.CUSTOM', function (done) {
        var checker = new constraint.Checker(ir.core, logger);
        checker.initialize(ir.rootNode, ir.commitHash, constraint.TYPES.CUSTOM);
        Q.allSettled([
            checker.checkNode('/343492672')
        ])
            .then(function (res) {
                expect(res[0].state).equal('fulfilled');
                expect(res[0].value.hasViolation).to.equal(false);
                //expect(res[0].value).to.deep.equal({});
            })
            .nodeify(done);
    });

    it('CustomConstraintWillFail should hasViolation=true TYPES.CUSTOM', function (done) {
        var checker = new constraint.Checker(ir.core, logger);
        checker.initialize(ir.rootNode, ir.commitHash, constraint.TYPES.CUSTOM);
        Q.allSettled([
            checker.checkNode('/2046278624')
        ])
            .then(function (res) {
                expect(res[0].state).equal('fulfilled');
                expect(res[0].value.hasViolation).to.equal(true);
                //expect(res[0].value).to.deep.equal({});
            })
            .nodeify(done);
    });

    it('CustomConstraintError should hasViolation=true TYPES.CUSTOM', function (done) {
        var checker = new constraint.Checker(ir.core, logger);
        checker.initialize(ir.rootNode, ir.commitHash, constraint.TYPES.CUSTOM);
        Q.allSettled([
            checker.checkNode('/902005954')
        ])
            .then(function (res) {
                expect(res[0].state).equal('fulfilled');
                expect(res[0].value.hasViolation).to.equal(true);
                //expect(res[0].value).to.deep.equal({});
            })
            .nodeify(done);
    });

    it('CustomConstraintRaisesException should hasViolation=true TYPES.CUSTOM', function (done) {
        var checker = new constraint.Checker(ir.core, logger);
        checker.initialize(ir.rootNode, ir.commitHash, constraint.TYPES.CUSTOM);
        Q.allSettled([
            checker.checkNode('/132634291')
        ])
            .then(function (res) {
                expect(res[0].state).equal('fulfilled');
                expect(res[0].value.hasViolation).to.equal(true);
                //expect(res[0].value).to.deep.equal({});
            })
            .nodeify(done);
    });

    it('CustomConstraintRaisesException should hasViolation=true TYPES.BOTH', function (done) {
        var checker = new constraint.Checker(ir.core, logger);
        checker.initialize(ir.rootNode, ir.commitHash, constraint.TYPES.BOTH);
        Q.allSettled([
            checker.checkNode('/132634291')
        ])
            .then(function (res) {
                expect(res[0].state).equal('fulfilled');
                expect(res[0].value.hasViolation).to.equal(true);
                //expect(res[0].value).to.deep.equal({});
            })
            .nodeify(done);
    });

});