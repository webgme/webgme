/*jshint node:true, mocha:true, expr:true*/
/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('./../_globals.js');

describe('issue436 testing', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        Q = testFixture.Q,
        expect = testFixture.expect,
        logger = testFixture.logger.fork('issue436.spec'),
        storage = null,

        projectName = 'issue36test',
        projectId = testFixture.projectName2Id(projectName),
        gmeAuth,
        context;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return storage.deleteProject({projectId: projectId});
            })
            .then(function () {
                return testFixture.importProject(storage,
                    {
                        projectSeed: './test/issue/436/base.webgmex',
                        projectName: projectName,
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
            })
            .then(function (result) {
                context = result;
            })
            .nodeify(done);
    });

    after(function (done) {
        storage.deleteProject({projectId: projectId})
            .then(function () {
                return Q.allDone([
                    storage.closeDatabase(),
                    gmeAuth.unload()
                ]);
            })
            .nodeify(done);
    });

    it('should remove overlays of deleted paths', function (done) {
        //the test uses the data structure of the core nodes!!!
        var targetContainer,
            source;

        //pre-checks
        expect(context.rootNode).to.not.equal(null);
        expect(context.rootNode).to.include.keys('data');
        expect(context.rootNode.data).to.include.keys('ovr');
        expect(context.rootNode.data.ovr).to.include.keys('/441671358/1916673620');
        expect(context.rootNode.data.ovr).not.to.include.keys('/299756971/1916673620');

        Q.nfcall(context.core.loadByPath, context.rootNode, '/299756971')
            .then(function (node) {
                targetContainer = node;
                return Q.nfcall(context.core.loadByPath, context.rootNode, '/441671358/1916673620');
            })
            .then(function (node) {
                source = node;

                //move
                source = context.core.moveNode(source, targetContainer);
                expect(context.rootNode.data.ovr).not.to.include.keys('/441671358/1916673620');
                expect(context.rootNode.data.ovr).to.include.keys('/299756971/1916673620');

                //delete
                context.core.deleteNode(source);
                expect(context.rootNode.data.ovr).not.to.include.keys('/441671358/1916673620');
                expect(context.rootNode.data.ovr).not.to.include.keys('/299756971/1916673620');

                done();
            })
            .catch(done);
    });
});
