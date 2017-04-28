/*jshint node:true, mocha:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../_globals');

describe.only('addon_handler bin', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect,
        AddOnHandler = require('../../src/bin/addon_handler'),
        logger = testFixture.logger.fork('addon_handler_spec'),
        Q = testFixture.Q,
        core,
        project,
        addOnHandler,
        gmeAuth,
        storage,
        ir,
        projectName = 'addon_handler_bin_test',
        cnt = 0;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig)
            .then(function (gmeAuth__) {
                gmeAuth = gmeAuth__;
                storage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectName: projectName,
                    logger: logger,
                    gmeConfig: gmeConfig,
                    projectSeed: './seeds/EmptyProject.webgmex'
                });
            })
            .then(function (ir_) {
                ir = ir_;
                core = ir.core;
                project = ir.project;
            })
            .nodeify(done);
    });

    after(function (done) {
        addOnHandler.stop()
            .finally(function () {
                return storage.closeDatabase();
            })
            .finally(function () {
                gmeAuth.unload(done);
            });
    });

    function prepBranch(branchName, addOnReg) {
        var newRootHash;

        return core.loadRoot(ir.rootHash)
            .then(function (rootNode) {
                var persisted;

                core.setRegistry(core.getFCO(rootNode), 'usedAddOns', addOnReg);
                persisted = core.persist(rootNode);

                newRootHash = persisted.rootHash;

                return project.makeCommit(branchName, [''], persisted.rootHash, persisted.objects, 'msg' + cnt++);
            })
            .then(function (result) {
                expect(result.status).to.equal(project.CONSTANTS.SYNCED);

                return core.loadRoot(ir.rootHash);
            })
            .then(function (rootNode) {

                return {
                    fco: core.getFCO(rootNode),
                    rootNode: rootNode
                };
            });
    }

    it('should build context', function (done) {
        prepBranch('b1', 'NotificationAddOn')
            .then(function () {
                addOnHandler = new AddOnHandler({});

            })
            .nodeify(done);
    });
});