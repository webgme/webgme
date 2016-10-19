/*jshint node:true, mocha:true */

/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../_globals');

describe('issue1133', function () {
    'use strict';
    var projectName = 'issue1133test',
        Q = testFixture.Q,
        gmeConfig = JSON.parse(JSON.stringify(testFixture.getGmeConfig())),
        logger = testFixture.logger.fork('1133.spec'),
        expect = testFixture.expect,
        NODE_ID = '/d',
        NEW_PARENT_ID = '/r',
        storage,
        context,
        gmeAuth;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth__) {
                gmeAuth = gmeAuth__;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectName: projectName,
                    logger: logger,
                    gmeConfig: gmeConfig,
                    branchName: 'master',
                    userName: gmeConfig.authentication.guestAccount,
                    projectSeed: './test/issue/1133/move.webgmex'
                });
            })
            .then(function (result) {
                context = result;
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
            storage.closeDatabase(),
            gmeAuth.unload()
        ]).nodeify(done);
    });

    it('core.isValidNewParent should return false for invalid move', function (done) {
        Q.allDone([
            context.core.loadByPath(context.rootNode, NODE_ID),
            context.core.loadByPath(context.rootNode, NEW_PARENT_ID)
        ])
            .then(function (res) {
                expect(context.core.isValidNewParent(res[0], res[1])).to.equal(false);
            })
            .nodeify(done);
    });

    it('core.moveNode should throw ASSERT for the invalid move', function (done) {
        Q.allDone([
            context.core.loadByPath(context.rootNode, NODE_ID),
            context.core.loadByPath(context.rootNode, NEW_PARENT_ID)
        ])
            .then(function (res) {
                try {
                    context.core.moveNode(res[0], res[1]);
                    throw new Error('Should have thrown!');
                } catch (err) {
                    expect(err.message).to.include('New parent would create loop in containment/inheritance tree.');
                }
            })
            .nodeify(done);
    });

});