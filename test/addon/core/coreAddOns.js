/*globals requireJS*/
/*jshint node:true, mocha:true, expr:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals');

describe('Core AddOns', function () {
    'use strict';

    var expect,
        logger = testFixture.logger.fork('CoreAddOns.spec'),
        AddOnUpdateResult,
        BlobClient = testFixture.getBlobTestClient(),
        gmeConfig = testFixture.getGmeConfig(),
        Q,
        ir,

        addOns = [
            'TestAddOn',
            'ConstraintAddOn',
            'NotificationAddOn'
        ],
        safeStorage,
        gmeAuth;

    before(function (done) {
        AddOnUpdateResult = requireJS('addon/AddOnUpdateResult');
        Q = testFixture.Q;
        expect = testFixture.expect;

        testFixture.clearDBAndGetGMEAuth(gmeConfig)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                safeStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return safeStorage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(safeStorage, {
                    projectName: 'CoreAddOns',
                    logger: logger,
                    gmeConfig: gmeConfig,
                    branchName: 'master',
                    userName: gmeConfig.authentication.guestAccount,
                    projectSeed: './seeds/EmptyProject.webgmex'
                });
            })
            .then(function (result) {
                ir = result;
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
            safeStorage.closeDatabase(),
            gmeAuth.unload()
        ])
            .nodeify(done);
    });

    function generateTests(addOnId) {
        describe(addOnId, function () {
            var AddOnClass = testFixture.requirejs('addon/' + addOnId + '/' + addOnId + '/' + addOnId),
                addOn = new AddOnClass(logger, gmeConfig),
                blobClient = new BlobClient(gmeConfig, logger.fork('Blob'));

            it('should getName, description, version etc', function (done) {
                expect(typeof addOn.getName()).to.equal('string');
                expect(typeof addOn.getDescription()).to.equal('string');
                expect(typeof addOn.getVersion()).to.equal('string');
                done();
            });

            it('should configure, initialize and update the addOn', function (done) {
                var commitObj,
                    rootNode;

                addOn.configure({
                    core: ir.core,
                    project: ir.project,
                    branchName: 'master',
                    blobClient: blobClient
                });

                Q.allDone([
                    testFixture.loadRootNodeFromCommit(ir.project, ir.core, ir.commitHash),
                    ir.project.getCommits(ir.commitHash, 1)
                ])
                    .then(function (results) {
                        rootNode = results[0];
                        commitObj = results[1];

                        expect(addOn.initialized).to.equal(false);

                        return Q.ninvoke(addOn, '_initialize', rootNode, commitObj);
                    })
                    .then(function (updateResult) {
                        expect(addOn.initialized).to.equal(true);
                        expect(updateResult instanceof AddOnUpdateResult).to.equal(true);

                        if (updateResult.commitMessage !== '') {
                            expect(updateResult.commitMessage).to.contain(addOn.getName(), addOn.getVersion());
                        }

                        return Q.ninvoke(addOn, '_update', rootNode, commitObj);
                    })
                    .then(function (updateResult) {
                        expect(updateResult instanceof AddOnUpdateResult).to.equal(true);

                        if (updateResult.commitMessage !== '') {
                            expect(updateResult.commitMessage).to.contain(addOn.getName(), addOn.getVersion());
                        }

                        done();
                    })
                    .catch(done);
            });

            // TODO: Add query when implemented
        });
    }

    addOns.forEach(function (addOnId) {
        generateTests(addOnId);
    });

});
